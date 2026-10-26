/**
 * Attachment policy — one answer for every SDK loader that turns a
 * caller-supplied string into bytes.
 *
 * Two primitives, both policy-aware:
 *
 *   - {@link readAttachmentFile}: realpath containment in `allowedRoots`
 *     (when configured), `O_NOFOLLOW` open on the real path, regular files
 *     only, size-capped read that notices a file growing under it.
 *   - {@link downloadAttachment}: `safeDownloadWithMeta` with the policy's
 *     URL switches — HTTPS-only and public hosts by default, redirects
 *     re-validated per hop, caller headers never replayed across one.
 *
 * The policy itself is resolved by {@link resolveAttachmentPolicy} from the
 * constructor's `attachments` config and the `NEUROLINK_ATTACHMENT_*`
 * variables, and travels on the per-call options (`attachmentPolicy`). A
 * loader that is reached without one — a host calling `WebLoader` directly, a
 * processor used on its own — falls back to the environment-derived default,
 * so the operator switches apply everywhere.
 *
 * @module utils/attachmentPolicy
 */

import { constants as fsConstants } from "node:fs";
import { open, realpath } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import {
  basename,
  delimiter as pathDelimiter,
  isAbsolute,
  relative,
  resolve as resolvePath,
  sep,
} from "node:path";
import type {
  AttachmentDownloadOptions,
  AttachmentPolicy,
  AttachmentReadOptions,
  AttachmentReadResult,
  AttachmentRefusalCode,
  AttachmentsConfig,
  SafeDownloadResult,
} from "../types/index.js";
import { logger } from "./logger.js";
import { redactUrlForError } from "./logSanitize.js";
import { defaultRedirectHops, safeDownloadWithMeta } from "./safeFetch.js";

const POLICY_KIND = "neurolink-attachment-policy" as const;

/** Bytes read per `handle.read()` while draining a file under its cap. */
const READ_CHUNK_BYTES = 1024 * 1024;

const ENV_ROOTS = "NEUROLINK_ATTACHMENT_ROOTS";
const ENV_ALLOW_INSECURE = "NEUROLINK_ATTACHMENT_ALLOW_INSECURE_URLS";
const ENV_ALLOW_PRIVATE = "NEUROLINK_ATTACHMENT_ALLOW_PRIVATE_NETWORK";
const ENV_FOLLOW_REDIRECTS = "NEUROLINK_ATTACHMENT_FOLLOW_REDIRECTS";
const ENV_MAX_BYTES = "NEUROLINK_ATTACHMENT_MAX_BYTES";

/**
 * An error the loaders throw when the policy refuses an attachment. Carries a
 * stable `code`; the message names the option that would allow the read.
 */
export class AttachmentRefusedError extends Error {
  readonly code: AttachmentRefusalCode;

  constructor(code: AttachmentRefusalCode, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "AttachmentRefusedError";
    this.code = code;
  }
}

function envFlag(name: string): boolean | undefined {
  const raw = process.env[name];
  if (raw === undefined) {
    return undefined;
  }
  const value = raw.trim().toLowerCase();
  if (value === "" || value === "0" || value === "false" || value === "no") {
    return false;
  }
  return true;
}

function envRoots(): string[] | undefined {
  const raw = process.env[ENV_ROOTS];
  if (raw === undefined || raw.trim() === "") {
    return undefined;
  }
  // `path.delimiter` is `:` on POSIX and `;` on Windows; accept both so a
  // value copied between platforms still parses.
  const roots = raw
    .split(/[;:]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (pathDelimiter === ";" && roots.length > 0) {
    // On Windows a drive letter also contains `:`; re-split on `;` only.
    return raw
      .split(";")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  }
  return roots.length > 0 ? roots : undefined;
}

function envMaxBytes(): number | undefined {
  const raw = process.env[ENV_MAX_BYTES];
  if (raw === undefined || raw.trim() === "") {
    return undefined;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
}

/**
 * Resolve the policy an instance runs under. An explicit config field wins
 * over its environment variable; the defaults are the safe ones.
 */
export function resolveAttachmentPolicy(
  config?: AttachmentsConfig,
): AttachmentPolicy {
  const roots = config?.allowedRoots ?? envRoots();
  const resolvedRoots =
    roots && roots.length > 0
      ? roots.map((root) => resolvePath(root))
      : undefined;
  const maxBytes =
    config?.maxBytes !== undefined && config.maxBytes > 0
      ? Math.floor(config.maxBytes)
      : envMaxBytes();
  return Object.freeze({
    kind: POLICY_KIND,
    allowedRoots: resolvedRoots ? Object.freeze(resolvedRoots) : undefined,
    allowInsecureUrls:
      config?.allowInsecureUrls ?? envFlag(ENV_ALLOW_INSECURE) ?? false,
    allowPrivateNetwork:
      config?.allowPrivateNetwork ?? envFlag(ENV_ALLOW_PRIVATE) ?? false,
    followRedirects:
      config?.followRedirects ?? envFlag(ENV_FOLLOW_REDIRECTS) ?? true,
    maxBytes,
  });
}

/** Runtime guard for a policy that travelled on an untyped options bag. */
export function isAttachmentPolicy(value: unknown): value is AttachmentPolicy {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { kind?: unknown }).kind === POLICY_KIND
  );
}

/**
 * The policy stamped on a call's options, or the environment-derived default.
 * Accepts any options bag so loaders deep in the file pipeline can read it off
 * whatever reached them.
 */
export function getAttachmentPolicy(
  carrier: { attachmentPolicy?: unknown } | undefined | null,
): AttachmentPolicy {
  const stamped = carrier?.attachmentPolicy;
  return isAttachmentPolicy(stamped) ? stamped : resolveAttachmentPolicy();
}

/** The lower of a loader's own cap and the policy's global cap. */
export function effectiveAttachmentCap(
  policy: AttachmentPolicy,
  loaderCap: number,
): number {
  return policy.maxBytes !== undefined
    ? Math.min(loaderCap, policy.maxBytes)
    : loaderCap;
}

// ---------------------------------------------------------------------------
// Local files
// ---------------------------------------------------------------------------

let warnedUnrestrictedRoots = false;

/**
 * Reset the one-time "no roots configured" warning. Test hook.
 * @internal
 */
export function resetAttachmentRootsWarning(): void {
  warnedUnrestrictedRoots = false;
}

function warnUnrestrictedOnce(label: string): void {
  if (warnedUnrestrictedRoots) {
    return;
  }
  warnedUnrestrictedRoots = true;
  logger.warn(
    `[NeuroLink] Reading a local ${label} with no attachment roots configured. ` +
      "Any readable file on this host can be attached by naming its path. " +
      "If paths come from untrusted callers, set `attachments.allowedRoots` " +
      `on the NeuroLink instance or the ${ENV_ROOTS} environment variable.`,
  );
}

function isUnder(candidate: string, root: string): boolean {
  const rel = relative(root, candidate);
  return (
    rel === "" ||
    (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel))
  );
}

/**
 * Check `filePath` against the policy's roots and return the real path to
 * open. Without roots the real path is still resolved (so the later
 * `O_NOFOLLOW` open behaves identically for a symlinked input), and the
 * one-time warning fires.
 *
 * @throws {AttachmentRefusedError} `ATTACHMENT_OUTSIDE_ROOTS`
 */
export async function resolveAttachmentPath(
  filePath: string,
  policy: AttachmentPolicy,
  label: string,
): Promise<string> {
  const lexical = resolvePath(filePath);
  const roots = policy.allowedRoots;
  if (!roots || roots.length === 0) {
    warnUnrestrictedOnce(label);
    // Without roots there is no boundary whose shape a message could leak, so
    // the OS error (ENOENT, EACCES, ELOOP) surfaces unchanged for callers to map.
    return await realpath(lexical);
  }
  const denied = (): AttachmentRefusedError =>
    new AttachmentRefusedError(
      "ATTACHMENT_OUTSIDE_ROOTS",
      `Access denied: ${label} "${basename(filePath)}" is outside the configured attachment roots (attachments.allowedRoots / ${ENV_ROOTS})`,
    );
  const realRoots = (
    await Promise.all(
      roots.map(async (root) => {
        try {
          return [root, await realpath(root)];
        } catch {
          return [root];
        }
      }),
    )
  ).flat();
  // Lexical check first, so a path outside every root is refused before the
  // file system is consulted and the answer for a missing file and a
  // forbidden one is the same.
  if (!realRoots.some((root) => isUnder(lexical, root))) {
    throw denied();
  }
  let real: string;
  try {
    real = await realpath(lexical);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    if (code === "ENOENT" || code === "ENOTDIR") {
      throw error;
    }
    throw denied();
  }
  if (!realRoots.some((root) => isUnder(real, root))) {
    throw denied();
  }
  return real;
}

/**
 * Read the whole file, refusing one that outgrew `limit` since it was
 * measured: reads one byte past the limit, so growth is seen, not buffered.
 */
async function readWithinLimit(
  handle: FileHandle,
  limit: number,
): Promise<Buffer | null> {
  const chunks: Buffer[] = [];
  let total = 0;
  while (total <= limit) {
    const chunk = Buffer.allocUnsafe(
      Math.min(READ_CHUNK_BYTES, limit + 1 - total),
    );
    const { bytesRead } = await handle.read(chunk, 0, chunk.length, total);
    if (bytesRead === 0) {
      break;
    }
    chunks.push(chunk.subarray(0, bytesRead));
    total += bytesRead;
  }
  if (total > limit) {
    return null;
  }
  return Buffer.concat(chunks, total);
}

/**
 * Read a local attachment under the policy.
 *
 * Containment is judged on the real path (see {@link resolveAttachmentPath});
 * the open is `O_NOFOLLOW | O_NONBLOCK` on that real path so a symlink swapped
 * in after the check is refused by the kernel and a FIFO cannot park a worker;
 * the descriptor is then stat'd (regular files only, size under the cap) and
 * drained under the same cap.
 *
 * @throws {AttachmentRefusedError} with `ATTACHMENT_OUTSIDE_ROOTS`,
 *   `ATTACHMENT_NOT_A_FILE` or `ATTACHMENT_TOO_LARGE`; other file-system
 *   errors (ENOENT, EACCES, ELOOP, …) propagate unchanged.
 */
export async function readAttachmentFile(
  filePath: string,
  options: AttachmentReadOptions,
): Promise<AttachmentReadResult> {
  const policy = options.policy ?? resolveAttachmentPolicy();
  const limit = effectiveAttachmentCap(policy, options.maxBytes);
  const real = await resolveAttachmentPath(filePath, policy, options.label);
  const handle = await open(
    real,
    fsConstants.O_RDONLY |
      (fsConstants.O_NOFOLLOW ?? 0) |
      (fsConstants.O_NONBLOCK ?? 0),
  );
  try {
    const stat = await handle.stat();
    if (!stat.isFile()) {
      throw new AttachmentRefusedError(
        "ATTACHMENT_NOT_A_FILE",
        `Not a file: ${options.label} "${basename(filePath)}"`,
      );
    }
    if (stat.size > limit) {
      throw new AttachmentRefusedError(
        "ATTACHMENT_TOO_LARGE",
        `${options.label} "${basename(filePath)}" is ${stat.size} bytes; the limit is ${limit} bytes`,
      );
    }
    const buffer = await readWithinLimit(handle, limit);
    if (buffer === null) {
      throw new AttachmentRefusedError(
        "ATTACHMENT_TOO_LARGE",
        `${options.label} "${basename(filePath)}" grew past the ${limit}-byte limit while being read`,
      );
    }
    return { buffer, realPath: real };
  } finally {
    await handle.close().catch(() => undefined);
  }
}

// ---------------------------------------------------------------------------
// URLs
// ---------------------------------------------------------------------------

/**
 * Quick scheme check that names the switch, so a refused `http://` URL tells
 * the caller what to set rather than only that HTTPS is required.
 *
 * @throws {AttachmentRefusedError} `ATTACHMENT_URL_REFUSED`
 */
export function assertAttachmentUrlScheme(
  url: string,
  policy: AttachmentPolicy,
  label: string,
): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new AttachmentRefusedError(
      "ATTACHMENT_URL_REFUSED",
      `${label}: "${redactUrlForError(url)}" is not a valid URL`,
    );
  }
  if (parsed.protocol === "https:") {
    return;
  }
  if (parsed.protocol === "http:") {
    if (policy.allowInsecureUrls) {
      return;
    }
    throw new AttachmentRefusedError(
      "ATTACHMENT_URL_REFUSED",
      `${label}: plain http:// URLs are refused by default (${redactUrlForError(url)}). ` +
        `Set attachments.allowInsecureUrls on the NeuroLink instance or ${ENV_ALLOW_INSECURE}=1 to allow them.`,
    );
  }
  throw new AttachmentRefusedError(
    "ATTACHMENT_URL_REFUSED",
    `${label}: only http(s) URLs can be fetched; got "${parsed.protocol}//"`,
  );
}

/**
 * Download a caller-supplied URL under the policy. Builds on
 * `safeDownloadWithMeta`: DNS-pinned connection, bounded body, redirects only
 * when the policy allows and then re-validated per hop with the caller's
 * headers dropped.
 *
 * @throws {AttachmentRefusedError} `ATTACHMENT_URL_REFUSED` when the URL is
 *   refused by the policy or the SSRF guard; transport and HTTP errors
 *   propagate as plain errors from `safeDownloadWithMeta`.
 */
export async function downloadAttachment(
  url: string,
  options: AttachmentDownloadOptions,
): Promise<SafeDownloadResult> {
  const policy = options.policy ?? resolveAttachmentPolicy();
  assertAttachmentUrlScheme(url, policy, options.label);
  try {
    return await safeDownloadWithMeta(url, {
      maxBytes: effectiveAttachmentCap(policy, options.maxBytes),
      label: options.label,
      headers: options.headers,
      timeoutMs: options.timeoutMs,
      signal: options.signal,
      method: options.method,
      maxRedirects: defaultRedirectHops(policy.followRedirects),
      allowInsecure: policy.allowInsecureUrls,
      allowPrivateNetwork: policy.allowPrivateNetwork,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      /rejected:|blocked range|is permitted|internal host|single-label/.test(
        message,
      )
    ) {
      throw new AttachmentRefusedError(
        "ATTACHMENT_URL_REFUSED",
        `${options.label}: ${message}. ` +
          `Private, loopback and link-local targets need attachments.allowPrivateNetwork (${ENV_ALLOW_PRIVATE}=1); ` +
          `plain http needs attachments.allowInsecureUrls (${ENV_ALLOW_INSECURE}=1).`,
        error,
      );
    }
    throw error;
  }
}
