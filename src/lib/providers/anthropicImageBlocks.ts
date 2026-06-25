/**
 * Pure converters from multimodal content parts into native Anthropic
 * Messages-API content blocks (image / document).
 *
 * Two input shapes reach the native Anthropic surface:
 *
 *  1. NeuroLink/V3 multimodal parts — `{ type: "image", image }` produced by
 *     the multimodal message builder (base64, data URL, https URL, or bytes).
 *
 *  2. AI-SDK LanguageModel prompt parts — `{ type: "file", mediaType, data }`.
 *     This is how `ai@6` encodes BOTH images and PDFs in the prompt that the
 *     provider's `doGenerate(options.prompt)` receives. Before this module the
 *     converter only handled `type:"image"`, so on the tool-using generate
 *     path (which always normalises images to `type:"file"`) the image part
 *     was silently dropped — the model never saw the image ("no image
 *     detected"). Gemini/Vertex are immune because they read `input.images`
 *     directly in their own builders instead of going through this conversion.
 *
 * Media type is taken from the AI-SDK-provided `mediaType` when present, then
 * sniffed from magic bytes, and only then defaulted — a hardcoded `image/png`
 * default silently corrupts JPEG/GIF/WebP uploads (the Anthropic API rejects a
 * mislabeled base64 image with HTTP 400 and the image vanishes).
 */

import type Anthropic from "@anthropic-ai/sdk";

// The base64 image media types the Anthropic Messages API accepts are exactly
// `Anthropic.Messages.Base64ImageSource["media_type"]` — referenced inline below
// rather than redeclared as a local alias (project rule: type aliases live in
// src/lib/types/, and this provider-internal shape does not warrant a barrel entry).
const SUPPORTED_IMAGE_MEDIA_TYPES: ReadonlySet<string> = new Set<string>([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

/** Map a caller-provided MIME hint onto a supported image media type (or undefined). */
const normalizeImageMediaType = (
  hint: string | undefined,
): Anthropic.Messages.Base64ImageSource["media_type"] | undefined => {
  if (!hint) {
    return undefined;
  }
  const h = hint.toLowerCase().split(";")[0].trim();
  if (h === "image/jpg") {
    return "image/jpeg";
  }
  return SUPPORTED_IMAGE_MEDIA_TYPES.has(h)
    ? (h as Anthropic.Messages.Base64ImageSource["media_type"])
    : undefined;
};

/**
 * Detect a supported image media type from a buffer's magic bytes. Returns
 * undefined when the bytes are not one of the four Anthropic-supported formats.
 */
export function sniffImageMediaType(
  bytes: Uint8Array,
): Anthropic.Messages.Base64ImageSource["media_type"] | undefined {
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  // JPEG: FF D8 FF
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  // GIF: "GIF"
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46
  ) {
    return "image/gif";
  }
  // WebP: "RIFF"...."WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return undefined;
}

/** Sniff the leading bytes of a base64 payload (best-effort, never throws). */
const sniffBase64 = (
  b64: string,
): Anthropic.Messages.Base64ImageSource["media_type"] | undefined => {
  try {
    return sniffImageMediaType(Buffer.from(b64.slice(0, 32), "base64"));
  } catch {
    return undefined;
  }
};

/**
 * Convert an image part (data URL, bare base64, https URL, byte array, or
 * ArrayBuffer) into an Anthropic image block. Honors `mediaTypeHint` (the
 * AI-SDK `mediaType`), falls back to magic-byte sniffing, then to image/png.
 * Returns undefined for unusable inputs.
 */
export function toAnthropicImageBlock(
  data: unknown,
  mediaTypeHint?: string,
): Anthropic.Messages.ImageBlockParam | undefined {
  if (data instanceof ArrayBuffer) {
    return toAnthropicImageBlock(new Uint8Array(data), mediaTypeHint);
  }
  if (data instanceof Uint8Array) {
    const media_type =
      normalizeImageMediaType(mediaTypeHint) ??
      sniffImageMediaType(data) ??
      "image/png";
    return {
      type: "image",
      source: {
        type: "base64",
        media_type,
        data: Buffer.from(data).toString("base64"),
      },
    };
  }
  if (typeof data !== "string" && !(data instanceof URL)) {
    return undefined;
  }
  const str = data instanceof URL ? data.toString() : data;
  const dataUrlMatch = str.match(/^data:(image\/[a-z0-9+.-]+);base64,(.+)$/i);
  if (dataUrlMatch) {
    const media_type =
      normalizeImageMediaType(dataUrlMatch[1]) ?? sniffBase64(dataUrlMatch[2]);
    if (!media_type) {
      return undefined;
    }
    return {
      type: "image",
      source: { type: "base64", media_type, data: dataUrlMatch[2] },
    };
  }
  if (/^https?:\/\//i.test(str)) {
    return { type: "image", source: { type: "url", url: str } };
  }
  // Bare base64 payload — prefer the hint, then sniff, then assume PNG
  // (matches the OpenAI-compat client's historical default).
  const media_type =
    normalizeImageMediaType(mediaTypeHint) ?? sniffBase64(str) ?? "image/png";
  return {
    type: "image",
    source: { type: "base64", media_type, data: str },
  };
}

/** Convert a PDF file part into an Anthropic document block. */
const toAnthropicPdfBlock = (
  data: unknown,
): Anthropic.Messages.DocumentBlockParam | undefined => {
  if (data instanceof ArrayBuffer) {
    return toAnthropicPdfBlock(new Uint8Array(data));
  }
  if (data instanceof Uint8Array) {
    return {
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: Buffer.from(data).toString("base64"),
      },
    };
  }
  if (data instanceof URL) {
    return { type: "document", source: { type: "url", url: data.toString() } };
  }
  if (typeof data === "string") {
    const m = data.match(/^data:application\/pdf;base64,(.+)$/i);
    if (m) {
      return {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: m[1] },
      };
    }
    if (/^https?:\/\//i.test(data)) {
      return { type: "document", source: { type: "url", url: data } };
    }
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data },
    };
  }
  return undefined;
};

/**
 * Convert an AI-SDK `{ type: "file", mediaType, data }` content part into the
 * matching Anthropic content block: image/* → image block (media type honored,
 * not hardcoded), application/pdf → document block. Returns undefined for
 * unsupported media types (so the caller simply omits them rather than 400ing).
 * When `mediaType` is absent, image bytes are still salvaged via sniffing.
 */
export function fileToAnthropicBlock(part: {
  mediaType?: string;
  data?: unknown;
}): Anthropic.Messages.ContentBlockParam | undefined {
  const data = part?.data;
  if (data === undefined || data === null) {
    return undefined;
  }
  const mediaType =
    typeof part.mediaType === "string"
      ? part.mediaType.toLowerCase().split(";")[0].trim()
      : "";

  if (mediaType.startsWith("image/")) {
    return toAnthropicImageBlock(data, mediaType);
  }
  if (mediaType === "application/pdf") {
    return toAnthropicPdfBlock(data);
  }
  // No / unknown media type: salvage raw image bytes if the magic bytes match.
  if (!mediaType) {
    const bytes =
      data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : data instanceof Uint8Array
          ? data
          : undefined;
    if (bytes && sniffImageMediaType(bytes)) {
      return toAnthropicImageBlock(bytes);
    }
  }
  return undefined;
}
