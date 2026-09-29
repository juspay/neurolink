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

/** A file over the limit is refused from `stat`, before it is read into memory. */
async function readMediaFile(
  path: string,
  label: string,
  maxBytes: number,
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
    return { status: "ok", buffer: await fs.readFile(path) };
  } catch (error) {
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
  const file = await readMediaFile(value, label, maxBytes);
  return file.status === "ok" ? encode(file.buffer, kind, label) : file;
}

/**
 * Turn the caller's images and video into `data:` URLs, or say why not.
 * Runs before any request, so every refusal costs nothing and none is retried.
 */
export async function prepareDecisionMedia(
  request: {
    images?: readonly DecisionMediaSource[];
    video?: DecisionMediaSource;
  },
  limits: DecisionMediaLimits | undefined,
  vendor: string,
  alternatives: readonly string[],
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

  const prepared: string[] = [];
  for (const [index, image] of images.entries()) {
    const converted = await toDataUrl(
      image,
      "image",
      `Image ${index + 1}`,
      limits.maxRequestBytes,
    );
    if (converted.status === "error") {
      return { status: "refused", message: converted.message };
    }
    prepared.push(converted.dataUrl);
  }
  let video: string | undefined;
  if (request.video !== undefined) {
    const converted = await toDataUrl(
      request.video,
      "video",
      "The video",
      limits.maxRequestBytes,
    );
    if (converted.status === "error") {
      return { status: "refused", message: converted.message };
    }
    video = converted.dataUrl;
  }
  const bytes = prepared.reduce(
    (sum, url) => sum + url.length,
    video?.length ?? 0,
  );
  return {
    status: "prepared",
    media: { images: prepared, ...(video ? { video } : {}), bytes },
  };
}
