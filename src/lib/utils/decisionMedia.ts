import { promises as fs } from "node:fs";
import type {
  DecisionMediaFileRead,
  DecisionMediaKind,
  DecisionMediaConversion,
  DecisionMediaLimits,
  DecisionMediaResult,
  DecisionMediaSource,
} from "../types/index.js";
import { sniffImageMimeType } from "./imageDetection.js";
import { detectIsoBmffImageMimeType, hasFtypBoxSignature } from "./isoBmff.js";

const REMOTE_URL = /^https?:\/\//i;
const URL_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;
const MAX_ECHOED_PATH_CHARS = 200;
const DATA_URL: Record<DecisionMediaKind, RegExp> = {
  image: /^data:image\/[a-z0-9.+-]+;base64,/i,
  video: /^data:video\/[a-z0-9.+-]+;base64,/i,
};
const WEBM_HEADER = [0x1a, 0x45, 0xdf, 0xa3];

const NOT_RECOGNISED: Record<DecisionMediaKind, string> = {
  image: "is not a recognised image format",
  video: "is not a recognised video format (MP4, MOV or WebM)",
};

/**
 * MP4 and MOV share the ISO-BMFF box. An AVIF or HEIC image shares it too, and
 * is not a video.
 */
function sniffVideoMimeType(buffer: Buffer): string | null {
  if (
    hasFtypBoxSignature(buffer) &&
    detectIsoBmffImageMimeType(buffer) === null
  ) {
    return "video/mp4";
  }
  return WEBM_HEADER.every((byte, i) => buffer[i] === byte)
    ? "video/webm"
    : null;
}

function encode(
  buffer: Buffer,
  kind: DecisionMediaKind,
  label: string,
): DecisionMediaConversion {
  const mime =
    kind === "image" ? sniffImageMimeType(buffer) : sniffVideoMimeType(buffer);
  return mime === null
    ? { status: "error", message: `${label} ${NOT_RECOGNISED[kind]}.` }
    : {
        status: "ok",
        dataUrl: `data:${mime};base64,${buffer.toString("base64")}`,
      };
}

/**
 * A path can be echoed in an error. A stray base64 blob passed as a path cannot,
 * so past a short length only its size is shown.
 */
function describePath(path: string): string {
  return path.length <= MAX_ECHOED_PATH_CHARS
    ? `(${path})`
    : `(a ${path.length}-character string)`;
}

/**
 * Why a request is over a provider's encoded-body limit, with what to do about
 * it. `size` is the measured size ("N bytes", or "more than N bytes" when only
 * part of the body was measured). Shared with the check on the finished body,
 * so a refusal reads the same wherever it is made.
 */
export function describeRequestBytesRefusal(
  size: string,
  limit: number,
  vendor: string,
  video: boolean,
): string {
  return `The request is ${size}; ${vendor} accepts at most ${limit}. Send fewer or smaller images${video ? ", or a shorter video" : ""}.`;
}

/** A file over the limit is refused from `stat`, before it is read into memory. */
async function readMediaFile(
  path: string,
  label: string,
  maxBytes: number,
  signal: AbortSignal | undefined,
): Promise<DecisionMediaFileRead> {
  try {
    const stats = await fs.stat(path);
    if (!stats.isFile()) {
      return {
        status: "error",
        message: `${label} ${describePath(path)} is not a file.`,
      };
    }
    if (stats.size > maxBytes) {
      return {
        status: "error",
        message: `${label} ${describePath(path)} is ${stats.size} bytes; a request may carry at most ${maxBytes}.`,
      };
    }
    return { status: "ok", buffer: await fs.readFile(path, { signal }) };
  } catch (error) {
    // An abort is the caller tearing the request down, not an unreadable file.
    if (signal?.aborted) {
      throw error;
    }
    const reason =
      error instanceof Error && "code" in error
        ? String(error.code)
        : "unreadable";
    return {
      status: "error",
      message: `Could not read ${label} ${describePath(path)}: ${reason}.`,
    };
  }
}

/**
 * Nothing here echoes a `data:` URL or a remote URL: either can carry a
 * credential or megabytes of base64, and neither belongs in an error message.
 */
async function toDataUrl(
  source: DecisionMediaSource,
  kind: DecisionMediaKind,
  label: string,
  maxBytes: number,
  signal: AbortSignal | undefined,
): Promise<DecisionMediaConversion> {
  if (typeof source !== "string") {
    return source.length === 0
      ? { status: "error", message: `${label} is an empty Buffer.` }
      : encode(source, kind, label);
  }
  const value = source.trim();
  if (value === "") {
    return { status: "error", message: `${label} is an empty string.` };
  }
  if (REMOTE_URL.test(value)) {
    return {
      status: "error",
      message: `${label} is a remote URL. Media is not fetched for you; pass a Buffer, a file path or a data: URL.`,
    };
  }
  if (/^data:/i.test(value)) {
    return DATA_URL[kind].test(value)
      ? { status: "ok", dataUrl: value }
      : {
          status: "error",
          message: `${label} is a data: URL that is not base64 ${kind} content.`,
        };
  }
  if (URL_SCHEME.test(value)) {
    return {
      status: "error",
      message: `${label} uses an unsupported URL scheme. Pass a Buffer, a file path or a data: URL.`,
    };
  }
  const file = await readMediaFile(value, label, maxBytes, signal);
  return file.status === "ok" ? encode(file.buffer, kind, label) : file;
}

/**
 * Turn the caller's images and video into `data:` URLs, or say why not.
 * Runs before any request, so every refusal costs nothing and none is retried.
 *
 * Media whose encoded size alone is over the provider's body limit is refused
 * as soon as the running total crosses it, so the remaining files are never
 * read and no body is built just to be measured. `signal` is honoured between
 * items and while a file is read: an abort rejects with the signal's reason.
 */
export async function prepareDecisionMedia(
  request: {
    images?: readonly DecisionMediaSource[];
    video?: DecisionMediaSource;
  },
  limits: DecisionMediaLimits | undefined,
  vendor: string,
  alternatives: readonly string[],
  signal?: AbortSignal,
): Promise<DecisionMediaResult> {
  const images = request.images ?? [];
  if (images.length === 0 && request.video === undefined) {
    return { status: "prepared", media: undefined };
  }
  if (!limits) {
    const use =
      alternatives.length > 0
        ? ` Use a decision provider that does: ${alternatives.join(", ")}.`
        : "";
    return {
      status: "refused",
      message: `${vendor} does not accept images or video.${use}`,
    };
  }
  if (images.length > limits.maxImages) {
    return {
      status: "refused",
      message: `${vendor} accepts at most ${limits.maxImages} images per request; this one has ${images.length}.`,
    };
  }
  if (request.video !== undefined && !limits.video) {
    return { status: "refused", message: `${vendor} does not accept video.` };
  }

  // A data URL is ASCII, so its length is its encoded size in bytes.
  let bytes = 0;
  const overLimit = (): DecisionMediaResult => ({
    status: "refused",
    message: describeRequestBytesRefusal(
      `more than ${bytes} bytes`,
      limits.maxRequestBytes,
      vendor,
      limits.video,
    ),
  });
  const prepared: string[] = [];
  for (const [index, image] of images.entries()) {
    signal?.throwIfAborted();
    const converted = await toDataUrl(
      image,
      "image",
      `Image ${index + 1}`,
      limits.maxRequestBytes,
      signal,
    );
    if (converted.status === "error") {
      return { status: "refused", message: converted.message };
    }
    prepared.push(converted.dataUrl);
    bytes += converted.dataUrl.length;
    if (bytes > limits.maxRequestBytes) {
      return overLimit();
    }
  }
  let video: string | undefined;
  if (request.video !== undefined) {
    signal?.throwIfAborted();
    const converted = await toDataUrl(
      request.video,
      "video",
      "The video",
      limits.maxRequestBytes,
      signal,
    );
    if (converted.status === "error") {
      return { status: "refused", message: converted.message };
    }
    video = converted.dataUrl;
    bytes += video.length;
    if (bytes > limits.maxRequestBytes) {
      return overLimit();
    }
  }
  return {
    status: "prepared",
    media: { images: prepared, ...(video ? { video } : {}), bytes },
  };
}
