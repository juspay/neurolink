/**
 * Shared helpers for caller-provided MIME type hints.
 *
 * A "MIME hint" is a mimetype string the SDK receives alongside a raw Buffer
 * whose original filename is missing (e.g. Slack/Curator file-uploads that
 * arrive as { buffer, filename: "Untitled", mimetype: "text/plain" }). When
 * the filename has no extension and magic-byte detection cannot identify the
 * content, the hint is the only signal we have.
 *
 * Both FileReferenceRegistry.register() and FileDetector.detect() consume
 * these helpers so the trust/normalization rules stay in one place:
 *
 *   - `application/octet-stream` is never trusted — it is the opaque
 *     "I don't know" sentinel and would let a caller hide real content
 *     behind a generic label (a PNG hinted as octet-stream would otherwise
 *     record mimeType="application/octet-stream" instead of "image/png").
 *   - Empty/undefined hints pass through as `undefined`.
 *   - A hint that cannot be classified maps to `null` so the caller falls
 *     back to magic-byte / extension detection instead of synthesising a
 *     wrong type.
 */
import type { FileType } from "../types/index.js";

const OPAQUE_MIMETYPE = "application/octet-stream";

/**
 * Normalize a caller-provided mimetype hint: strip any `;charset=...`
 * parameter, lowercase, trim. Returns undefined for empty strings or for
 * the opaque `application/octet-stream` sentinel so downstream code can
 * treat the hint as absent instead of trusting it verbatim.
 */
export function normalizeMimeHint(raw?: string): string | undefined {
  if (!raw) {
    return undefined;
  }
  const cleaned = raw.split(";")[0].trim().toLowerCase();
  if (!cleaned || cleaned === OPAQUE_MIMETYPE) {
    return undefined;
  }
  return cleaned;
}

/**
 * Map a normalized mimetype hint to a NeuroLink FileType. Returns null when
 * the mimetype is unknown or too generic to classify confidently.
 */
export function mimeHintToFileType(mimetype: string): FileType | null {
  const exact: Record<string, FileType> = {
    "text/csv": "csv",
    "application/csv": "csv",
    "image/svg+xml": "svg",
    "application/pdf": "pdf",
    "application/json": "text",
    "application/xml": "text",
    "text/xml": "text",
    "application/yaml": "text",
    "application/x-yaml": "text",
    "text/yaml": "text",
    "application/javascript": "text",
    "application/typescript": "text",
    "application/zip": "archive",
    "application/x-tar": "archive",
    "application/gzip": "archive",
    "application/x-gzip": "archive",
    "application/x-7z-compressed": "archive",
    "application/vnd.rar": "archive",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      "pptx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  };
  if (exact[mimetype]) {
    return exact[mimetype];
  }
  if (mimetype.startsWith("text/")) {
    return "text";
  }
  if (mimetype.startsWith("image/")) {
    return "image";
  }
  if (mimetype.startsWith("audio/")) {
    return "audio";
  }
  if (mimetype.startsWith("video/")) {
    return "video";
  }
  return null;
}

/**
 * Map a normalized mimetype hint to the canonical file extension (without
 * leading dot). Returns "" when the mimetype is unknown — caller should
 * then fall back to magic-byte detection.
 */
export function mimeHintToExtension(mimetype: string): string {
  const table: Record<string, string> = {
    // Text
    "text/plain": "txt",
    "text/html": "html",
    "text/css": "css",
    "text/javascript": "js",
    "application/javascript": "js",
    "application/typescript": "ts",
    "text/markdown": "md",
    "text/csv": "csv",
    "application/csv": "csv",
    "application/json": "json",
    "application/xml": "xml",
    "text/xml": "xml",
    "application/yaml": "yaml",
    "application/x-yaml": "yaml",
    "text/yaml": "yaml",
    // Documents
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      "pptx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    // Images
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/bmp": "bmp",
    "image/tiff": "tiff",
    "image/svg+xml": "svg",
    // Video
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "video/x-matroska": "mkv",
    "video/x-msvideo": "avi",
    // Audio
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
    "audio/flac": "flac",
    "audio/mp4": "m4a",
    "audio/aac": "aac",
    // Archives
    "application/zip": "zip",
    "application/x-tar": "tar",
    "application/gzip": "gz",
    "application/x-gzip": "gz",
    "application/x-7z-compressed": "7z",
    "application/vnd.rar": "rar",
  };
  return table[mimetype] || "";
}
