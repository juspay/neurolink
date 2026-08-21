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
