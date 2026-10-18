/**
 * Agent request attachments, vetted at the HTTP boundary.
 *
 * `input.images` and `input.files` reach the SDK as strings, and the SDK
 * resolves a string itself: an `http(s)` URL is fetched with redirects followed
 * and no address check, and anything else is read from the local disk. Both
 * are right for a program that names its own files. Neither is right when the
 * string came from a caller of a network server, who could name
 * `https://169.254.169.254/...`, a redirect to it, or `/etc/passwd`.
 *
 * So the route resolves every attachment itself and hands the SDK bytes:
 *   - `data:` URIs pass through, they carry their own content;
 *   - `https` URLs are downloaded with `safeDownload`: redirects are refused and
 *     the size is capped. The address is checked and the connection pinned to
 *     the checked addresses only for a direct download. Behind `HTTPS_PROXY` /
 *     `ALL_PROXY` the proxy resolves the host, so only the URL text is checked
 *     (IP literals, single-label and internal host names) and what a
 *     public-looking name resolves to is the proxy's egress policy;
 *   - local paths are read only from the operator's `allowedInputRoots`, after
 *     symlinks are resolved;
 *   - everything else is refused rather than guessed at, so this classifier
 *     can never disagree with the SDK's about what a string means.
 *
 * One request is also bounded as a whole: at most `maxInputAttachments`
 * entries, each at most `maxInputBytes`, all together at most
 * `maxInputTotalBytes`. The count and every `data:` URI are judged before
 * anything is read; the rest are resolved one at a time, each allowed only what
 * is left of the shared budget, so a transfer that would overflow it stops
 * mid-stream.
 *
 * The SDK itself is untouched: a program calling `generate()` directly keeps
 * reading the paths and URLs it names.
 *
 * @module server/utils/agentInput
 */

import fs from "node:fs";
import type { FileHandle } from "node:fs/promises";
import path from "node:path";
import type {
  ServerAgentResolvedInput,
  ServerAgentResolveOptions,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";

const DEFAULT_MAX_INPUT_BYTES = 50 * 1024 * 1024;
const DEFAULT_MAX_INPUT_TOTAL_BYTES = 100 * 1024 * 1024;
const DEFAULT_MAX_INPUT_ATTACHMENTS = 20;
const READ_CHUNK_BYTES = 64 * 1024;

/** Two or more scheme characters, so a Windows drive letter (`C:\`) is not one. */
const URL_SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]+:/;

/** An attachment the server refuses, with the HTTP status that says why. */
export class AgentInputError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "AgentInputError";
  }
}

const isUnder = (child: string, root: string): boolean =>
  child === root ||
  child.startsWith(root.endsWith(path.sep) ? root : root + path.sep);

const forbidden = (): AgentInputError =>
  new AgentInputError(
    "attachment path is outside the directories this server allows (or local paths are disabled)",
    403,
    "FORBIDDEN",
  );

const notFound = (): AgentInputError =>
  new AgentInputError("attachment path does not exist", 404, "NOT_FOUND");

const notReadable = (): AgentInputError =>
  new AgentInputError("attachment path is not readable", 403, "FORBIDDEN");

const notAFile = (): AgentInputError =>
  new AgentInputError("attachment path is not a file", 400, "VALIDATION_ERROR");

const tooLarge = (limit: number): AgentInputError =>
  new AgentInputError(
    `attachment exceeds the ${limit}-byte limit`,
    413,
    "PAYLOAD_TOO_LARGE",
  );

const budgetExceeded = (total: number): AgentInputError =>
  new AgentInputError(
    `attachments together exceed the ${total}-byte limit`,
    413,
    "PAYLOAD_TOO_LARGE",
  );

const tooMany = (max: number): AgentInputError =>
  new AgentInputError(
    `a request may carry at most ${max} attachments`,
    413,
    "PAYLOAD_TOO_LARGE",
  );

/** A configured limit, or the default when it is missing or not a number >= 0. */
const limitOr = (value: number | undefined, fallback: number): number =>
  typeof value === "number" && value >= 0 ? value : fallback;

const isDataUri = (entry: string): boolean => entry.startsWith("data:");

const fsErrorCode = (error: unknown): string | undefined =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  typeof error.code === "string"
    ? error.code
    : undefined;

/**
 * Turn whatever the file system threw into the refusal the caller gets. Nothing
 * raw gets through: a Node error message carries the server's path, and an
 * unmapped code is logged for the operator (the code only) and answered like an
 * unreadable file instead of surfacing as a 500.
 */
function asAgentInputError(error: unknown): AgentInputError {
  if (error instanceof AgentInputError) {
    return error;
  }
  const code = fsErrorCode(error);
  switch (code) {
    case "ENOENT":
    case "ENOTDIR":
      return notFound();
    case "EACCES":
    case "EPERM":
    case "ELOOP":
      return notReadable();
    case "ENXIO":
    case "EOPNOTSUPP":
    case "ENOTSUP":
    case "EISDIR":
      return notAFile();
    case "ENAMETOOLONG":
    case "EINVAL":
    case "ERR_INVALID_ARG_VALUE":
      return new AgentInputError(
        "attachment path is not a usable path",
        400,
        "VALIDATION_ERROR",
      );
    default:
      logger.warn("[agentInput] unmapped file-system error on an attachment", {
        code,
        name: error instanceof Error ? error.name : typeof error,
      });
      return notReadable();
  }
}

/**
 * A file under one of the allowed roots, after symlinks are resolved.
 *
 * A path outside every root is refused before the file system is touched, so
 * the answer for `/etc/passwd` and for `/etc/nothing-here` is the same 403 and
 * the route is not an oracle for which files exist.
 */
async function readAllowedPath(
  requested: string,
  roots: string[] | undefined,
  limit: number,
): Promise<Buffer> {
  if (!roots || roots.length === 0) {
    throw forbidden();
  }
  const lexical = path.resolve(requested);
  const realRoots = (
    await Promise.all(
      roots.map(async (root) => {
        try {
          return [path.resolve(root), await fs.promises.realpath(root)];
        } catch {
          return [];
        }
      }),
    )
  ).flat();
  if (!realRoots.some((root) => isUnder(lexical, root))) {
    throw forbidden();
  }
  let real: string;
  try {
    real = await fs.promises.realpath(lexical);
  } catch (error) {
    throw asAgentInputError(error);
  }
  if (!realRoots.some((root) => isUnder(real, root))) {
    throw forbidden();
  }
  // Open once and judge the descriptor, not the path: a path can be swapped for
  // a symlink between the checks above and a later read. O_NOFOLLOW refuses a
  // symlink in the last component; a directory swapped higher up is not caught,
  // which matters only if something untrusted can write under an allowed root.
  let handle: FileHandle;
  try {
    // O_NONBLOCK: opening a FIFO for reading otherwise waits for a writer, and
    // each such request would hold a libuv worker until one appears. With it
    // the open returns at once and the stat below refuses the FIFO as not a
    // file. Regular files read the same either way. Windows has no constant.
    handle = await fs.promises.open(
      real,
      fs.constants.O_RDONLY |
        fs.constants.O_NOFOLLOW |
        (fs.constants.O_NONBLOCK ?? 0),
    );
  } catch (error) {
    throw asAgentInputError(error);
  }
  let content: Buffer;
  try {
    const stat = await handle.stat();
    if (!stat.isFile()) {
      throw notAFile();
    }
    if (stat.size > limit) {
      throw tooLarge(limit);
    }
    content = await readWithinLimit(handle, limit);
  } catch (error) {
    await handle.close().catch(() => undefined);
    throw asAgentInputError(error);
  }
  try {
    await handle.close();
  } catch (error) {
    throw asAgentInputError(error);
  }
  return content;
}

/**
 * Read the whole file, refusing one that outgrew `limit` since it was measured:
 * reads one byte past the limit, so growth is seen rather than buffered.
 */
async function readWithinLimit(
  handle: FileHandle,
  limit: number,
): Promise<Buffer> {
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
    throw tooLarge(limit);
  }
  return Buffer.concat(chunks, total);
}

async function downloadAttachment(
  url: string,
  limit: number,
  signal: AbortSignal | undefined,
): Promise<Buffer> {
  // Dynamic import keeps undici off the static import graph; see
  // test/continuous-test-suite-import-cost.ts.
  const { safeDownload } = await import("../../utils/safeFetch.js");
  try {
    return await safeDownload(url, {
      maxBytes: limit,
      label: "agent attachment",
      signal,
    });
  } catch (error) {
    // A cancelled download is not a refused URL: the caller is gone, and
    // reporting it as one would put a refusal in the log that never happened.
    if (signal?.aborted) {
      throw error;
    }
    // The reason can name the address a host resolved to; the caller gets none
    // of it, the operator gets it in the log.
    const reason = error instanceof Error ? error.message : String(error);
    logger.warn("[agentInput] refused an attachment URL", {
      reason: reason.replaceAll(url, "<url>"),
    });
    throw new AgentInputError(
      "attachment URL could not be fetched (it must be a public https URL, answer without a redirect and fit the size limit)",
      400,
      "VALIDATION_ERROR",
    );
  }
}

/** The bytes of one attachment that is not a `data:` URI, read within `limit`. */
async function resolveAttachment(
  entry: string,
  roots: string[] | undefined,
  limit: number,
  signal: AbortSignal | undefined,
): Promise<Buffer> {
  if (/^https?:\/\//i.test(entry)) {
    return downloadAttachment(entry, limit, signal);
  }
  if (URL_SCHEME.test(entry)) {
    throw new AgentInputError(
      "attachment must be a data: URI, an https URL, or a path under an allowed directory",
      400,
      "VALIDATION_ERROR",
    );
  }
  return readAllowedPath(entry, roots, limit);
}

/**
 * Replace every attachment of an agent request's `input` with vetted content.
 *
 * @throws {AgentInputError} for the first attachment that is refused, or for a
 *   request that carries too many attachments or too many bytes.
 */
export async function resolveAgentInput(
  input: { text: string; images?: string[]; files?: string[] },
  options?: ServerAgentResolveOptions,
): Promise<ServerAgentResolvedInput> {
  const maxAttachments = limitOr(
    options?.maxInputAttachments,
    DEFAULT_MAX_INPUT_ATTACHMENTS,
  );
  const totalBytes = limitOr(
    options?.maxInputTotalBytes,
    DEFAULT_MAX_INPUT_TOTAL_BYTES,
  );
  const perAttachment = Math.min(
    limitOr(options?.maxInputBytes, DEFAULT_MAX_INPUT_BYTES),
    totalBytes,
  );
  const roots = options?.allowedInputRoots;
  const entries = [...(input.images ?? []), ...(input.files ?? [])];

  // Everything that needs no I/O is judged first, so a request that is already
  // too big costs the server nothing: the count, then each data: URI against
  // its own cap and against the shared budget.
  if (entries.length > maxAttachments) {
    throw tooMany(maxAttachments);
  }
  let remaining = totalBytes;
  for (const entry of entries) {
    if (!isDataUri(entry)) {
      continue;
    }
    if (entry.length > perAttachment) {
      throw tooLarge(perAttachment);
    }
    remaining -= entry.length;
    if (remaining < 0) {
      throw budgetExceeded(totalBytes);
    }
  }

  // One at a time: a request naming many URLs must not open them all at once,
  // and each entry may use only what the ones before it left of the budget.
  const resolveList = async (
    list: string[] | undefined,
  ): Promise<Array<Buffer | string> | undefined> => {
    if (list === undefined) {
      return undefined;
    }
    const resolved: Array<Buffer | string> = [];
    for (const entry of list) {
      // A caller that has gone away starts nothing further.
      options?.signal?.throwIfAborted();
      // Exactly the prefix the SDK keys on, so nothing that reaches it as a
      // string is anything but a data URI.
      if (isDataUri(entry)) {
        resolved.push(entry);
        continue;
      }
      const limit = Math.min(perAttachment, remaining);
      let bytes: Buffer;
      try {
        bytes = await resolveAttachment(entry, roots, limit, options?.signal);
      } catch (error) {
        if (
          limit < perAttachment &&
          error instanceof AgentInputError &&
          error.status === 413
        ) {
          throw budgetExceeded(totalBytes);
        }
        throw error;
      }
      remaining -= bytes.length;
      resolved.push(bytes);
    }
    return resolved;
  };

  const images = await resolveList(input.images);
  const files = await resolveList(input.files);
  return {
    text: input.text,
    ...(images ? { images } : {}),
    ...(files ? { files } : {}),
  };
}
