/**
 * Shared snapshot bookkeeping for the JSON-file configurators.
 *
 * Every writer that edits a user's config in place has to answer one question
 * on each apply(): is the value sitting in the file right now the one *we* put
 * there, or one the user put there?
 *
 * Snapshotting only on first touch is not enough. The sentinel is persisted in
 * the user's file so a restore survives a crash, which means it also survives
 * an unclean kill where no restore ever ran. If the user then edits the block
 * by hand — reasonably, since the proxy is gone — a presence-only guard keeps
 * the stale snapshot, apply() overwrites their edit, and the next restore
 * writes the stale value back over it. For Qwen that value is a live API key.
 *
 * So each writer also records what it wrote. A current value that still matches
 * the recorded write is ours and the snapshot stands; anything else is the
 * user's and must be re-snapshotted before we overwrite it.
 */

/**
 * Structural equality, insensitive to object key order.
 *
 * Comparing serialised JSON would be simpler but wrong: `JSON.stringify` is not
 * canonical, so anything that rewrites the user's config — a formatter, an
 * editor's "sort keys", another tool round-tripping the file — reorders keys and
 * makes our own block look like the user's. The writer would then snapshot the
 * proxy block as the "original" and restore it over the real config later.
 *
 * `undefined` is only ever equal to itself: absent is not the same as present.
 */
function valuesMatch(current: unknown, written: unknown): boolean {
  if (current === undefined || written === undefined) {
    return current === written;
  }
  if (current === null || written === null) {
    return current === written;
  }
  if (typeof current !== "object" || typeof written !== "object") {
    return current === written;
  }
  if (Array.isArray(current) || Array.isArray(written)) {
    if (!Array.isArray(current) || !Array.isArray(written)) {
      return false;
    }
    return (
      current.length === written.length &&
      current.every((item, index) => valuesMatch(item, written[index]))
    );
  }
  const a = current as Record<string, unknown>;
  const b = written as Record<string, unknown>;
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) {
    return false;
  }
  return aKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(b, key) &&
      valuesMatch(a[key], b[key]),
  );
}

/**
 * Whether apply() should record `current` as the user's original value.
 *
 * - No snapshot yet: record one. This is the first touch.
 * - Snapshot present but no record of what we wrote: leave it alone. The file
 *   was written by a version that predates the write-record, so we cannot tell
 *   ours from the user's and the safe move is the old behaviour.
 * - Snapshot present and the current value is exactly what we wrote: leave it
 *   alone. This is the repeat-apply case the first-touch guard exists for.
 * - Snapshot present and the current value is *not* what we wrote: re-record.
 *   The user replaced it while the proxy was not running.
 */
export function shouldCaptureSnapshot(args: {
  hasSnapshot: boolean;
  written: unknown;
  current: unknown;
}): boolean {
  if (!args.hasSnapshot) {
    return true;
  }
  if (args.written === undefined) {
    return false;
  }
  return !valuesMatch(args.current, args.written);
}

/**
 * Whether a decoded snapshot file is structurally usable.
 *
 * A snapshot on disk is not necessarily one we wrote: it can be truncated by a
 * full disk, hand-edited, or left over from another version. `JSON.parse` is
 * happy with `{}`, `[]`, `null` and `"text"`, and every one of those then reads
 * as "a snapshot whose recorded original is absent" — which restore paths treat
 * as "the user had nothing here", and act on by deleting the user's real
 * config. Requiring the discriminating key present makes a malformed file fall
 * through to the caller's no-snapshot branch, which refuses to destroy
 * anything, instead of impersonating an empty one.
 */
export function isUsableSnapshot<K extends string>(
  value: unknown,
  requiredKey: K,
): value is Record<K, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.hasOwnProperty.call(value, requiredKey)
  );
}

/** Deep copy through JSON, so a snapshot cannot alias the object it describes. */
export function cloneForSnapshot<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Whether the value currently in the file is the one this writer put there.
 *
 * Restore uses this as its licence to act. A base-URL check alone catches a
 * user who repointed the client elsewhere, but not one who kept the proxy URL
 * and changed something beside it — a rotated key, an added field. Reverting
 * those to the snapshot destroys a deliberate edit; for Qwen it destroys a
 * credential. No record of what we wrote (a config from before this existed)
 * means we cannot prove ownership either way, so the caller keeps its previous
 * behaviour rather than refusing every restore.
 */
export function isProxyOwnedValue(args: {
  written: unknown;
  current: unknown;
}): boolean {
  if (args.written === undefined) {
    return true;
  }
  return valuesMatch(args.current, args.written);
}

/** Distinguishes concurrent writers within one process. */
let atomicWriteCounter = 0;

/**
 * Replace a file's contents without ever exposing a partial one.
 *
 * `writeFileSync` opens with `O_TRUNC`, so from the truncate until the last
 * byte lands the user's config is short — and a real config spans several
 * syscalls, not an instant. Anything reading concurrently, the CLI the config
 * belongs to included, can load a truncated file; a crash in that window leaves
 * it truncated permanently. Both Qwen and OpenCode keep live API keys there.
 *
 * Writing to a sibling temp file and renaming closes it: `rename(2)` within a
 * directory is atomic, so a reader sees either the whole old file or the whole
 * new one. The temp file must be a sibling — a rename across filesystems is a
 * copy, which reintroduces exactly the window this removes.
 *
 * PERMISSIONS ARE THE SUBTLE PART, and getting them wrong here leaks API keys.
 *
 * Writing through a temp file changes who decides the destination's mode. A
 * plain `writeFileSync` over an existing file leaves that file's mode alone, so
 * a config the user had locked to 0600 stayed 0600. A rename replaces the inode,
 * so the destination inherits the TEMP file's mode instead — and a temp file
 * created without an explicit mode lands at 0666 minus umask, i.e. 0644 on a
 * default system. Left unhandled, making the write atomic would have quietly
 * widened every credential file it touched from 0600 to 0644.
 *
 * So when the caller does not specify a mode, the destination's current mode is
 * carried over, which reproduces `writeFileSync`'s behaviour exactly; a file
 * that does not exist yet starts at 0600 rather than whatever umask allows.
 *
 * The mode is applied at CREATE time, not after. `writeFileSync` followed by
 * `chmodSync` would put the credential bytes on disk at 0644 first and tighten
 * them a moment later — a window a local reader can win. The trailing `chmod`
 * remains only to pin the exact mode, since umask masks the create mode; by
 * then the file has never been readable more widely than its final mode.
 *
 * On Windows the guarantee holds but the failure mode differs, which is worth
 * stating because the obvious worry there is the wrong one. Node's `renameSync`
 * is `MoveFileExW` with `MOVEFILE_REPLACE_EXISTING`; replacing a file on the
 * same volume is an atomic directory-entry update, so a concurrent reader still
 * sees the whole old file or the whole new one and never a torn one. What
 * Windows adds is that the rename can *fail* — `EPERM`/`EBUSY` when a reader
 * holds the destination open — where POSIX would succeed. That path is safe:
 * the catch below removes the temp file and rethrows, leaving the previous
 * config intact for the caller to report on.
 *
 * The sibling rule above is what makes that true. `MOVEFILE_COPY_ALLOWED` is
 * also set, so a cross-volume rename silently degrades to copy-then-delete and
 * is NOT atomic. Moving the temp file to `os.tmpdir()` would look like a
 * tidy-up and would quietly restore the exact window this function exists to
 * close, on Windows only, where nobody here would see it.
 */
export async function writeFileAtomic(
  filePath: string,
  contents: string,
  mode?: number,
): Promise<void> {
  const fs = await import("fs");
  const { dirname, join, basename } = await import("path");
  atomicWriteCounter += 1;
  const tempPath = join(
    dirname(filePath),
    `.${basename(filePath)}.neurolink-${process.pid}-${atomicWriteCounter}.tmp`,
  );
  // Which step failed changes what the user should do about it: a failed write
  // is usually a missing directory or a full disk and the config is untouched,
  // while a failed rename is a locked destination and the config is intact but
  // stale. The bare errno is the same shape for both, so the stage is recorded
  // as it advances and named in the rethrow.
  let stage: "write" | "chmod" | "rename" = "write";
  // Resolved before the first byte is written — see the permissions note above.
  let effectiveMode = mode;
  if (effectiveMode === undefined) {
    try {
      effectiveMode = fs.statSync(filePath).mode & 0o777;
    } catch {
      effectiveMode = 0o600;
    }
  }
  try {
    // The temp file is a sibling of the destination, so a missing parent fails
    // the write rather than the rename — the config is untouched, but the
    // caller sees an ENOENT naming a path it never asked to write. Creating
    // the directory first makes a first-run write behave like the plain
    // writeFileSync it replaced.
    fs.mkdirSync(dirname(filePath), { recursive: true });
    fs.writeFileSync(tempPath, contents, { mode: effectiveMode });
    stage = "chmod";
    fs.chmodSync(tempPath, effectiveMode);
    stage = "rename";
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    // Never leave scratch in the user's config directory.
    try {
      fs.rmSync(tempPath, { force: true });
    } catch {
      // best effort
    }
    const reason = error instanceof Error ? error.message : String(error);
    // The original is attached as `cause`, not discarded: wrapping moves the
    // errno off the thrown object, and `cause` is where anything that needs
    // ENOENT/EPERM finds it. No caller reads it today — every call site either
    // lets this propagate or swallows it — so nothing breaks, but a future one
    // should not have to re-derive the syscall from a string.
    throw new Error(
      `atomic write to ${filePath} failed at the ${stage} step: ${reason}`,
      { cause: error },
    );
  }
}
