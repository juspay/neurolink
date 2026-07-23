/**
 * Image processing utilities for multimodal support
 * Handles format conversion for different AI providers
 */

import { basename } from "path";
import { logger } from "./logger.js";
import {
  redactPathFromMessage,
  redactUrlForError,
  redactUrlsInText,
  sanitizeErrorCause,
} from "./logSanitize.js";
import { urlDownloadRateLimiter } from "./rateLimiter.js";
import { withRetry } from "./retryHandler.js";
import { SYSTEM_LIMITS } from "../core/constants.js";
import { SIZE_LIMITS_BYTES } from "../processors/config/sizeLimits.js";
import { getImageCache } from "./imageCache.js";
import { ErrorFactory, NeuroLinkError } from "./errorHandling.js";
import { detectIsoBmffImageMimeType, hasFtypBoxSignature } from "./isoBmff.js";
import type { ProcessedImage, FileProcessingResult } from "../types/index.js";

/**
 * Minimum bytes required just to detect an image format from magic bytes (#293).
 */
export const MIN_IMAGE_SIZE = 12;

/**
 * Minimum plausible byte size for a non-empty image of each format (#293). A
 * buffer that carries a format's magic bytes but is smaller than this is
 * truncated/corrupt and would fail (or render blank) downstream — reject early
 * with a clear message instead.
 *
 * Each threshold approximates the smallest byte count that format's
 * container can structurally be while still holding the mandatory
 * header/chunk skeleton for a minimal (e.g. 1×1 pixel) image — not an exact
 * spec minimum, but close enough that anything smaller is unambiguously
 * truncated:
 *  - **PNG (67)**: 8-byte signature + IHDR chunk (4 len + 4 type + 13 data +
 *    4 CRC = 25) + a minimal IDAT chunk carrying one zlib-compressed
 *    scanline (~22 bytes) + IEND chunk (4 len + 4 type + 0 data + 4 CRC =
 *    12) — matches the commonly-cited size of the smallest possible valid
 *    PNG (a 1×1 transparent pixel).
 *  - **JPEG (125)**: SOI + APP0/JFIF marker (18) + at least one DQT
 *    quantization table (~69 for one 8-bit luma table) + SOF0 + DHT + SOS
 *    headers + a minimal entropy-coded scan + EOI — the smallest legal
 *    baseline-JPEG skeleton for a 1×1 image.
 *  - **GIF (43)**: 6-byte GIF87a/89a header + 7-byte Logical Screen
 *    Descriptor + a 2-color (6-byte) color table + 10-byte Image
 *    Descriptor + minimal LZW-coded image sub-blocks + 1-byte trailer.
 *  - **WEBP (20)**: RIFF container header ("RIFF" + size + "WEBP" = 12
 *    bytes) + the first chunk's fourCC + size (8 bytes) — enough to confirm
 *    a well-formed RIFF/WEBP container and its first chunk, before any
 *    actual VP8/VP8L bitstream payload.
 *  - **AVIF (100)**: ISOBMFF `ftyp` box plus the mandatory `meta` box
 *    skeleton (`hdlr`/`pitm`/`iloc`/`iinf` sub-boxes) — roughly the minimum
 *    to hold AVIF's required box structure before any AV1 image item data.
 */
export const MIN_VALID_IMAGE_SIZE: Record<string, number> = {
  "image/png": 67,
  "image/jpeg": 125,
  "image/gif": 43,
  "image/webp": 20,
  "image/avif": 100,
};

/**
 * Network error codes that should trigger a retry
 */
const RETRYABLE_ERROR_CODES = new Set([
  "ECONNRESET",
  "ENOTFOUND",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ERR_NETWORK",
]);

/**
 * Determines if an HTTP error is retryable based on status code
 * Only network errors and certain HTTP status codes should be retried
 * 4xx client errors like 404 (Not Found) and 403 (Forbidden) should NOT be retried
 *
 * @param error - The error to check
 * @returns true if the error is retryable, false otherwise
 */
function isRetryableDownloadError(error: unknown): boolean {
  // Network-related errors should be retried
  if (error && typeof error === "object") {
    const errorCode = (error as { code?: string }).code;
    const errorName = (error as { name?: string }).name;

    if (
      RETRYABLE_ERROR_CODES.has(errorCode || "") ||
      errorName === "AbortError"
    ) {
      return true;
    }
  }

  // Check for HTTP status code in error message for retryable errors
  // Only retry on 5xx server errors, 429 (Too Many Requests), and 408 (Request Timeout)
  // Do NOT retry on 4xx client errors like 404 (Not Found) or 403 (Forbidden)
  if (error instanceof Error) {
    const message = error.message;

    // Extract HTTP status from error message like "HTTP 503: Service Unavailable"
    const statusMatch = message.match(/HTTP (\d{3}):/);
    if (statusMatch) {
      const status = parseInt(statusMatch[1], 10);
      // Retry on 5xx server errors, 429 (rate limit), 408 (timeout)
      return status >= 500 || status === 429 || status === 408;
    }

    // Check for timeout/network-related error messages
    // Use more precise matching to avoid false positives like "No timeout specified"
    if (
      /\b(request timed out|operation timed out|connection timed out|timed out)\b/i.test(
        message,
      ) ||
      /\bnetwork (error|failure|unreachable|down)\b/i.test(message)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Reject `detectImageType()`'s `application/octet-stream` sentinel — the
 * honest "no known image signature (PNG/JPEG/GIF/WebP/BMP/TIFF/ICO/SVG/AVIF/HEIC/HEIF)
 * matched" fallback (#261/#286). Packaging that sentinel into a data URI
 * hands vision providers (OpenAI/Anthropic/Google) a MIME type they reject
 * outright with an HTTP 400, so every public conversion path that turns
 * unknown bytes into image output must fail loud here first instead of
 * letting the sentinel slip through to a caller.
 *
 * @param mediaType - The MIME type returned by `detectImageType()`.
 * @throws Error if `mediaType` is the octet-stream sentinel.
 */
function assertKnownImageType(mediaType: string): void {
  if (mediaType === "application/octet-stream") {
    logger.error("Unable to detect a supported image format from file content");
    throw new Error(
      "Unsupported or corrupted image: no known image signature " +
        "(PNG/JPEG/GIF/WebP/BMP/TIFF/ICO/SVG/AVIF/HEIC/HEIF) was found in the file content.",
    );
  }
}

/**
 * Image processor class for handling provider-specific image formatting
 */
export class ImageProcessor {
  /**
   * Process image Buffer (unified interface)
   * Matches CSVProcessor.process() signature for consistency
   *
   * @param content - Image file as Buffer
   * @param options - Processing options (unused for now)
   * @returns Processed image as data URI
   */
  static async process(
    content: Buffer,
    _options?: unknown,
  ): Promise<FileProcessingResult> {
    // #293: reject empty AND small/truncated buffers (not just 0 bytes) before
    // processing; returns the detected media type.
    const mediaType = this.validateBufferNotEmpty(content);

    // #261/#286 follow-up: fail loud instead of packaging the octet-stream
    // sentinel as a "valid" image (see assertKnownImageType() above).
    assertKnownImageType(mediaType);

    const base64 = ImageProcessor.safeBase64Convert(
      content,
      "image processing",
    );
    const dataUri = `data:${mediaType};base64,${base64}`;

    // Validate output before returning
    this.validateProcessOutput(dataUri, base64, mediaType);

    return {
      type: "image",
      content: dataUri,
      mimeType: mediaType,
      metadata: {
        confidence: 100,
        size: content.length,
      },
    } satisfies FileProcessingResult;
  }

  /**
   * Strict magic-byte match: does `content` actually begin with `mediaType`'s
   * signature? `detectImageType` returns `image/jpeg` as a *fallback* for
   * unrecognized data, so a per-format minimum must only be enforced when the
   * bytes genuinely match — otherwise valid BMP/TIFF/unknown buffers would be
   * wrongly rejected as "truncated jpeg" (#293 review).
   */
  private static hasStrictImageMagic(
    content: Buffer,
    mediaType: string,
  ): boolean {
    const b = content;
    switch (mediaType) {
      case "image/png":
        return (
          b.length >= 4 &&
          b[0] === 0x89 &&
          b[1] === 0x50 &&
          b[2] === 0x4e &&
          b[3] === 0x47
        );
      case "image/jpeg":
        return b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
      case "image/gif":
        return b.length >= 3 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46;
      case "image/webp":
        return (
          b.length >= 12 &&
          b.subarray(0, 4).toString("latin1") === "RIFF" &&
          b.subarray(8, 12).toString("latin1") === "WEBP"
        );
      case "image/avif":
        return (
          b.length >= 12 &&
          b.subarray(4, 8).toString("latin1") === "ftyp" &&
          b.subarray(8, 12).toString("latin1").startsWith("avif")
        );
      default:
        return false;
    }
  }

  /**
   * Validate that a buffer is a plausibly-complete image (#293): non-empty and,
   * for a strictly-identified raster format, at least the minimum plausible byte
   * size. Returns the detected media type.
   *
   * @throws Error when the buffer is empty or a recognized format is truncated.
   */
  private static validateBufferNotEmpty(content: Buffer): string {
    if (content.length === 0) {
      logger.error("Empty buffer provided");
      throw ErrorFactory.imageBufferInvalid(
        "Invalid image processing: buffer is empty",
      );
    }
    const mediaType = this.detectImageType(content);
    // SVG is text and can be legitimately tiny (e.g. `<svg/>`), so the raster
    // size floors don't apply to it (#293 review).
    if (mediaType === "image/svg+xml") {
      return mediaType;
    }
    // A buffer too small to carry any raster header is not a usable image.
    if (content.length < MIN_IMAGE_SIZE) {
      throw ErrorFactory.imageBufferInvalid(
        `Invalid image processing: buffer too small (${content.length} bytes) — ` +
          `a minimum of ${MIN_IMAGE_SIZE} bytes is required for a valid image.`,
      );
    }
    // Only enforce a per-format minimum when the format was strictly identified
    // from magic bytes (never from detectImageType's jpeg fallback), so valid
    // BMP/TIFF/unknown buffers are not mis-rejected as "truncated jpeg".
    const minForFormat = MIN_VALID_IMAGE_SIZE[mediaType];
    if (
      minForFormat !== undefined &&
      content.length < minForFormat &&
      this.hasStrictImageMagic(content, mediaType)
    ) {
      throw ErrorFactory.imageBufferInvalid(
        `Invalid image processing: ${mediaType} buffer is truncated ` +
          `(${content.length} bytes, minimum ${minForFormat} for a valid ${mediaType}).`,
      );
    }
    return mediaType;
  }

  /**
   * Validate processed output meets required format
   * Checks:
   * - Base64 content is non-empty
   * - Data URI format is valid (data:{mimeType};base64,{content})
   * - MIME type is in the allowed list
   * @param dataUri - The complete data URI string
   * @param base64 - The base64-encoded content
   * @param mediaType - The MIME type of the image
   * @throws Error if any validation fails
   */
  private static validateProcessOutput(
    dataUri: string,
    base64: string,
    mediaType: string,
  ): void {
    // Validate base64 is non-empty (check first for better error message)
    if (base64.length === 0) {
      logger.error("Empty base64 content generated");
      throw new Error("Invalid image processing: base64 content is empty");
    }

    // Validate data URI format with proper base64 character validation
    // Base64 can only have 0, 1, or 2 padding characters at the end
    const dataUriRegex = /^data:[^;]+;base64,[A-Za-z0-9+/]*={0,2}$/;
    if (!dataUriRegex.test(dataUri)) {
      logger.error("Invalid data URI format generated", { dataUri });
      throw new Error(
        "Invalid data URI format: must be data:{mimeType};base64,{content}",
      );
    }

    // Defensive check: ensure detectImageType() returns valid MIME type
    // This validation protects against future changes to detectImageType()
    if (!this.validateImageFormat(mediaType)) {
      logger.error("Invalid MIME type generated", { mediaType });
      throw new Error(`Invalid MIME type: ${mediaType} is not in allowed list`);
    }
  }

  /**
   * Process image for OpenAI (requires data URI format)
   */
  static processImageForOpenAI(image: Buffer | string): string {
    try {
      if (typeof image === "string") {
        // Handle URLs
        if (image.startsWith("http")) {
          return image;
        }
        // Handle data URIs
        if (image.startsWith("data:")) {
          return image;
        }
        // Handle base64 - convert to data URI
        return `data:image/jpeg;base64,${image}`;
      }

      // Handle Buffer - convert to data URI
      const base64 = ImageProcessor.safeBase64Convert(
        image,
        "OpenAI image input",
      );
      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      // Preserve typed errors (e.g. IMAGE_TOO_LARGE) as-is — don't flatten
      // them into a generic Error and lose the error `code` for callers.
      if (error instanceof NeuroLinkError) {
        throw error;
      }
      logger.error("Failed to process image for OpenAI:", error);
      throw new Error(
        `Image processing failed for OpenAI: ${error instanceof Error ? error.message : "Unknown error"}`,
        { cause: error },
      );
    }
  }

  /**
   * Process image for Google AI (requires base64 without data URI prefix)
   */
  static processImageForGoogle(image: Buffer | string): {
    mimeType: string;
    data: string;
  } {
    try {
      let base64Data: string;
      let mimeType = "image/jpeg"; // Default

      if (typeof image === "string") {
        if (image.startsWith("data:")) {
          // Extract mime type and base64 from data URI
          const match = image.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            mimeType = match[1];
            base64Data = match[2];
          } else {
            base64Data = image.split(",")[1] || image;
          }
        } else {
          base64Data = image;
        }
      } else {
        base64Data = ImageProcessor.safeBase64Convert(
          image,
          "provider image input",
        );
      }

      return {
        mimeType,
        data: base64Data, // Google wants base64 WITHOUT data URI prefix
      };
    } catch (error) {
      // Preserve typed errors (e.g. IMAGE_TOO_LARGE) as-is — don't flatten
      // them into a generic Error and lose the error `code` for callers.
      if (error instanceof NeuroLinkError) {
        throw error;
      }
      logger.error("Failed to process image for Google AI:", error);
      throw new Error(
        `Image processing failed for Google AI: ${error instanceof Error ? error.message : "Unknown error"}`,
        { cause: error },
      );
    }
  }

  /**
   * Process image for Anthropic (requires base64 without data URI prefix)
   */
  static processImageForAnthropic(image: Buffer | string): {
    mediaType: string;
    data: string;
  } {
    try {
      let base64Data: string;
      let mediaType = "image/jpeg"; // Default

      if (typeof image === "string") {
        if (image.startsWith("data:")) {
          // Extract mime type and base64 from data URI
          const match = image.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            mediaType = match[1];
            base64Data = match[2];
          } else {
            base64Data = image.split(",")[1] || image;
          }
        } else {
          base64Data = image;
        }
      } else {
        base64Data = ImageProcessor.safeBase64Convert(
          image,
          "provider image input",
        );
      }

      return {
        mediaType,
        data: base64Data, // Anthropic wants base64 WITHOUT data URI prefix
      };
    } catch (error) {
      // Preserve typed errors (e.g. IMAGE_TOO_LARGE) as-is — don't flatten
      // them into a generic Error and lose the error `code` for callers.
      if (error instanceof NeuroLinkError) {
        throw error;
      }
      logger.error("Failed to process image for Anthropic:", error);
      throw new Error(
        `Image processing failed for Anthropic: ${error instanceof Error ? error.message : "Unknown error"}`,
        { cause: error },
      );
    }
  }

  /**
   * Process image for Vertex AI (model-specific routing)
   */
  static processImageForVertex(
    image: Buffer | string,
    model: string,
  ): { mimeType?: string; mediaType?: string; data: string } {
    try {
      // Route based on model type
      if (model.includes("gemini")) {
        // Use Google AI format for Gemini models
        return ImageProcessor.processImageForGoogle(image);
      } else if (model.includes("claude")) {
        // Use Anthropic format for Claude models
        return ImageProcessor.processImageForAnthropic(image);
      } else {
        // Default to Google format
        return ImageProcessor.processImageForGoogle(image);
      }
    } catch (error) {
      // Preserve typed errors bubbling up from processImageForGoogle/
      // processImageForAnthropic (e.g. IMAGE_TOO_LARGE) as-is.
      if (error instanceof NeuroLinkError) {
        throw error;
      }
      logger.error("Failed to process image for Vertex AI:", error);
      throw new Error(
        `Image processing failed for Vertex AI: ${error instanceof Error ? error.message : "Unknown error"}`,
        { cause: error },
      );
    }
  }

  /**
   * Detect image type from filename or data
   */
  static detectImageType(input: string | Buffer): string {
    try {
      if (typeof input === "string") {
        // Check if it's a data URI
        if (input.startsWith("data:")) {
          const match = input.match(/^data:([^;]+);/);
          return match ? match[1] : "image/jpeg";
        }

        // Check if it's a filename
        const extension = input.toLowerCase().split(".").pop();
        const imageTypes: Record<string, string> = {
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          png: "image/png",
          gif: "image/gif",
          webp: "image/webp",
          bmp: "image/bmp",
          tiff: "image/tiff",
          tif: "image/tiff",
          svg: "image/svg+xml",
          avif: "image/avif",
        };
        return imageTypes[extension || ""] || "image/jpeg";
      }

      // For Buffer, try to detect from magic bytes
      if (input.length >= 4) {
        const header = input.subarray(0, 4);

        // PNG: 89 50 4E 47
        if (
          header[0] === 0x89 &&
          header[1] === 0x50 &&
          header[2] === 0x4e &&
          header[3] === 0x47
        ) {
          return "image/png";
        }

        // JPEG: FF D8 FF
        if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
          return "image/jpeg";
        }

        // GIF: 47 49 46 38
        if (
          header[0] === 0x47 &&
          header[1] === 0x49 &&
          header[2] === 0x46 &&
          header[3] === 0x38
        ) {
          return "image/gif";
        }

        // WebP: check for RIFF and WEBP
        if (input.length >= 12) {
          const riff = input.subarray(0, 4);
          const webp = input.subarray(8, 12);
          if (riff.toString() === "RIFF" && webp.toString() === "WEBP") {
            return "image/webp";
          }
        }

        // SVG: check for "<svg" or "<?xml" at start (text-based)
        if (input.length >= 4) {
          const start = input.subarray(0, 4).toString();
          if (start === "<svg" || start === "<?xm") {
            return "image/svg+xml";
          }
        }

        // ISO-BMFF images: "ftyp" box at offset 4, major brand at offset 8.
        // AVIF has codec-specific major brands. HEIC uses HEVC image/sequence
        // brands, while generic HEIF structural brands (mif1/msf1) need a
        // compatible codec brand to avoid mistaking AVIF or generic MP4 data
        // for HEIF.
        const isoBmffMimeType = detectIsoBmffImageMimeType(input);
        if (isoBmffMimeType) {
          return isoBmffMimeType;
        }

        // ICO: 00 00 01 00 (icon type=1)
        if (
          input[0] === 0x00 &&
          input[1] === 0x00 &&
          input[2] === 0x01 &&
          input[3] === 0x00 &&
          !hasFtypBoxSignature(input)
        ) {
          return "image/x-icon";
        }

        // BMP: "BM" magic (0x42 0x4D)
        if (input[0] === 0x42 && input[1] === 0x4d) {
          return "image/bmp";
        }

        // TIFF: little-endian "II*\0" or big-endian "MM\0*"
        if (
          (input[0] === 0x49 &&
            input[1] === 0x49 &&
            input[2] === 0x2a &&
            input[3] === 0x00) ||
          (input[0] === 0x4d &&
            input[1] === 0x4d &&
            input[2] === 0x00 &&
            input[3] === 0x2a)
        ) {
          return "image/tiff";
        }
      }

      // No known image signature matched. Return a safe, honest sentinel
      // rather than mislabeling arbitrary bytes as JPEG (#261): a wrong
      // image/jpeg label silently corrupts the downstream provider request.
      logger.warn(
        "Could not detect image type from magic bytes; using application/octet-stream",
      );
      return "application/octet-stream";
    } catch (error) {
      logger.warn("Failed to detect image type, using default:", error);
      return "application/octet-stream";
    }
  }

  /**
   * Throwing size guard for a raw byte length. Prevents memory exhaustion by
   * rejecting an oversized input BEFORE an unbounded read/allocation happens
   * (#257) — callers that can get a size cheaply (e.g. `fs.stat`) should
   * validate it before ever reading the bytes into memory. Default limit is
   * the canonical `SIZE_LIMITS_BYTES.IMAGE_MAX` (10 MB); there is no public
   * way to raise it — `maxSize` is an internal-only override for advanced
   * callers (e.g. video image inputs use a higher limit).
   *
   * @param size - Byte length to validate
   * @param context - Short label identifying the source (unused in the
   *   thrown message today, kept for call-site readability and future use)
   * @param maxSize - Max allowed size in bytes
   * @throws NeuroLinkError (`INVALID_IMAGE_SIZE`) if `size` is not a finite,
   *   non-negative number
   * @throws NeuroLinkError (`IMAGE_TOO_LARGE`) if `size` exceeds `maxSize`
   */
  static validateSize(
    size: number,
    context: string,
    maxSize: number = SIZE_LIMITS_BYTES.IMAGE_MAX,
  ): void {
    // Reject a malformed maxSize before it's ever compared: `size > NaN` and
    // `size > Infinity` (for a negative maxSize) can both evaluate `false`,
    // which would let a corrupted/negative limit bypass the guard entirely.
    if (!Number.isFinite(maxSize) || maxSize < 0) {
      throw ErrorFactory.invalidConfiguration(
        "maxSize",
        "must be a finite, non-negative byte count",
        { maxSize, context },
      );
    }
    // Fail closed on malformed sizes first: `NaN > maxSize` and
    // `-1 > maxSize` both evaluate to `false`, which would otherwise let a
    // corrupted stat/header value silently skip the guard below.
    if (!Number.isFinite(size) || size < 0) {
      throw ErrorFactory.invalidImageSize(size);
    }
    if (size > maxSize) {
      const mb = (size / (1024 * 1024)).toFixed(1);
      const maxMb = (maxSize / (1024 * 1024)).toFixed(0);
      throw ErrorFactory.imageTooLarge(mb, maxMb);
    }
  }

  /**
   * Throwing size guard for image buffers. Prevents memory exhaustion by
   * rejecting oversized buffers with a descriptive error BEFORE an unbounded
   * `Buffer.toString("base64")` allocation (#257). Delegates to
   * `validateSize` so buffer-based and pre-read (stat-based) callers share
   * one implementation.
   *
   * @param buffer - Image buffer to validate
   * @param context - Short label identifying the source (see `validateSize`)
   * @param maxSize - Max allowed size in bytes
   * @throws NeuroLinkError (`IMAGE_TOO_LARGE`) if the buffer exceeds `maxSize`
   */
  static validateBufferSize(
    buffer: Buffer,
    context: string,
    maxSize: number = SIZE_LIMITS_BYTES.IMAGE_MAX,
  ): void {
    ImageProcessor.validateSize(buffer.length, context, maxSize);
  }

  /**
   * Size-guarded Buffer → base64. Use in place of `buffer.toString("base64")`
   * on any path that converts a caller-supplied image buffer (#257).
   */
  static safeBase64Convert(
    buffer: Buffer,
    context: string,
    maxSize: number = SIZE_LIMITS_BYTES.IMAGE_MAX,
  ): string {
    ImageProcessor.validateBufferSize(buffer, context, maxSize);
    return buffer.toString("base64");
  }

  /**
   * Validate image format
   */
  static validateImageFormat(mediaType: string): boolean {
    const supportedFormats = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/bmp",
      "image/tiff",
      "image/svg+xml",
      "image/avif",
      // Deliberately excludes "application/octet-stream": that's
      // detectImageType()'s honest sentinel for bytes matching no known
      // image signature (#261), not a real image format. Vision providers
      // (OpenAI/Anthropic/Google) reject it outright with an HTTP 400, so
      // process() must fail loud instead of packaging it as a valid image
      // (see the octet-stream guard in process() below).
    ];
    return supportedFormats.includes(mediaType.toLowerCase());
  }

  /**
   * Get image dimensions from Buffer (basic implementation)
   */
  static getImageDimensions(
    buffer: Buffer,
  ): { width: number; height: number } | null {
    try {
      // Basic PNG dimension extraction
      if (
        buffer.length >= 24 &&
        buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a"
      ) {
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        return { width, height };
      }

      // JPEG dimension extraction via SOF marker parsing
      if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
        // Search for SOF0 (0xFFC0) or SOF2 (0xFFC2) markers
        let offset = 2;
        while (offset < buffer.length - 1) {
          // Find next marker (0xFF followed by non-zero, non-0xFF byte)
          if (buffer[offset] !== 0xff) {
            offset++;
            continue;
          }

          // Skip any padding 0xFF bytes
          while (offset < buffer.length && buffer[offset] === 0xff) {
            offset++;
          }

          if (offset >= buffer.length) {
            break;
          }

          const marker = buffer[offset];
          offset++;

          // Check for SOF0 (0xC0 - baseline DCT) and SOF2 (0xC2 - progressive DCT)
          // These are the most common JPEG encoding modes
          if (marker === 0xc0 || marker === 0xc2) {
            // SOF marker found: length (2 bytes) + precision (1 byte) + height (2 bytes) + width (2 bytes)
            if (offset + 7 > buffer.length) {
              break; // Truncated file
            }
            const height = buffer.readUInt16BE(offset + 3);
            const width = buffer.readUInt16BE(offset + 5);
            return { width, height };
          }

          // Skip this marker's segment (except for markers without length)
          if (
            marker === 0xd0 ||
            marker === 0xd1 ||
            marker === 0xd2 ||
            marker === 0xd3 ||
            marker === 0xd4 ||
            marker === 0xd5 ||
            marker === 0xd6 ||
            marker === 0xd7 ||
            marker === 0xd8 ||
            marker === 0xd9 ||
            marker === 0x01
          ) {
            // RST0-RST7, SOI, EOI, TEM - no length field
            continue;
          }

          if (offset + 2 > buffer.length) {
            break; // Truncated file
          }
          const segmentLength = buffer.readUInt16BE(offset);
          offset += segmentLength;
        }

        return null; // No SOF marker found
      }

      return null;
    } catch (error) {
      logger.warn("Failed to extract image dimensions:", error);
      return null;
    }
  }

  /**
   * Convert image to ProcessedImage format
   */
  static processImage(
    image: Buffer | string,
    provider: string,
    model?: string,
  ): ProcessedImage {
    try {
      // #257: reject an oversized buffer before any format-detection or
      // conversion work runs on it — mirrors the guard every
      // `processImageForX()` branch below already applies via
      // `safeBase64Convert()`, so the typed IMAGE_TOO_LARGE error surfaces
      // here too instead of being pre-empted by the octet-stream check next.
      if (Buffer.isBuffer(image)) {
        ImageProcessor.validateBufferSize(image, "image processing");
      }
      const mediaType = ImageProcessor.detectImageType(image);
      // #261/#286 follow-up: reject the octet-stream sentinel here too — the
      // returned ProcessedImage.mediaType is what callers use to build a
      // data URI, so this is a separate public path that must not emit it.
      assertKnownImageType(mediaType);
      const size =
        typeof image === "string"
          ? Buffer.byteLength(image, "base64")
          : image.length;

      let data: string;
      let format: ProcessedImage["format"];

      switch (provider.toLowerCase()) {
        case "openai":
          data = ImageProcessor.processImageForOpenAI(image);
          format = "data_uri";
          break;

        case "google-ai":
        case "google": {
          const googleResult = ImageProcessor.processImageForGoogle(image);
          data = googleResult.data;
          format = "base64";
          break;
        }

        case "anthropic": {
          const anthropicResult =
            ImageProcessor.processImageForAnthropic(image);
          data = anthropicResult.data;
          format = "base64";
          break;
        }

        case "vertex": {
          const vertexResult = ImageProcessor.processImageForVertex(
            image,
            model || "",
          );
          data = vertexResult.data;
          format = "base64";
          break;
        }

        default:
          // Default to base64
          if (typeof image === "string") {
            data = image.startsWith("data:")
              ? image.split(",")[1] || image
              : image;
          } else {
            data = ImageProcessor.safeBase64Convert(image, "image input");
          }
          format = "base64";
      }

      return {
        data,
        mediaType,
        size,
        format,
      };
    } catch (error) {
      // Preserve typed errors (e.g. IMAGE_TOO_LARGE) bubbling up from the
      // provider-specific branches above as-is.
      if (error instanceof NeuroLinkError) {
        throw error;
      }
      logger.error(`Failed to process image for ${provider}:`, error);
      throw new Error(
        `Image processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        { cause: error },
      );
    }
  }
}

/**
 * Whitelist of valid image file extensions (lowercase, no dots).
 * Used to validate file extensions against a known set of image formats.
 */
export const VALID_IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "tiff",
  "tif",
  "svg",
  "avif",
  "ico",
  "heic",
  "heif",
];

/**
 * Set of valid image extensions for O(1) lookup.
 * @internal
 */
const VALID_IMAGE_EXTENSIONS_SET = new Set<string>(VALID_IMAGE_EXTENSIONS);

/**
 * Utility functions for image handling
 */
export const imageUtils = {
  /**
   * Check if a string is a valid data URI
   */
  isDataUri: (str: string): boolean => {
    return (
      typeof str === "string" &&
      str.startsWith("data:") &&
      str.includes("base64,")
    );
  },

  /**
   * Check if a string is a valid URL
   */
  isUrl: (str: string): boolean => {
    try {
      new URL(str);
      return str.startsWith("http://") || str.startsWith("https://");
    } catch {
      return false;
    }
  },

  /**
   * Check if a string is base64 encoded
   */
  isBase64: (str: string): boolean => imageUtils.isValidBase64(str),

  /**
   * Extract file extension from filename or URL.
   * Strips query strings and fragments before matching so that
   * "image.jpg?v=1" correctly returns "jpg".
   * Returns null if no extension is found or if the extension
   * contains non-alphanumeric characters.
   */
  getFileExtension: (filename: string): string | null => {
    const sanitized = filename.split(/[?#]/)[0];
    const match = sanitized.match(/\.([^.]+)$/);
    if (!match) {
      return null;
    }
    const extension = match[1].toLowerCase();
    if (!/^[a-z0-9]+$/.test(extension)) {
      return null;
    }
    return extension;
  },

  /**
   * Validate that an extension is a recognised image format.
   * Case-insensitive; rejects extensions with special characters.
   */
  isValidImageExtension: (extension: string): boolean => {
    if (!extension || typeof extension !== "string") {
      return false;
    }
    const normalizedExt = extension.toLowerCase();
    if (!/^[a-z0-9]+$/.test(normalizedExt)) {
      return false;
    }
    return VALID_IMAGE_EXTENSIONS_SET.has(normalizedExt);
  },

  /**
   * Extract and validate image file extension from a filename or URL.
   * Returns null if the extension is missing or not a recognised image format.
   *
   * Security note: the last extension is used, so "malware.exe.jpg" returns
   * "jpg". Callers should apply additional checks (e.g. content inspection)
   * where double-extension attacks are a concern.
   */
  getValidatedImageExtension: (filename: string): string | null => {
    const extension = imageUtils.getFileExtension(filename);
    if (!extension) {
      return null;
    }
    return imageUtils.isValidImageExtension(extension) ? extension : null;
  },

  /**
   * Convert file size to human readable format
   */
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) {
      return "0 Bytes";
    }
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  },

  /**
   * Convert Buffer to base64 string. Guarded by the same #257 size limit as
   * every other conversion site (default `SIZE_LIMITS_BYTES.IMAGE_MAX`);
   * pass `maxBytes` to override for a caller with a legitimate need for a
   * different ceiling rather than silently accepting an unbounded buffer.
   * `imageUtils`/`ImageProcessor` are internal-only — not re-exported from
   * `src/lib/index.ts` or the package's public `exports` map — so this
   * default does not change behavior for any external SDK consumer.
   */
  bufferToBase64: (
    buffer: Buffer,
    maxBytes: number = SIZE_LIMITS_BYTES.IMAGE_MAX,
  ): string => {
    return ImageProcessor.safeBase64Convert(
      buffer,
      "buffer-to-base64",
      maxBytes,
    );
  },

  /**
   * Convert base64 string to Buffer
   */
  base64ToBuffer: (base64: string): Buffer => {
    // Remove data URI prefix if present
    const cleanBase64 = base64.includes(",") ? base64.split(",")[1] : base64;
    return Buffer.from(cleanBase64, "base64");
  },

  /**
   * Redact `filePath` (both as given and its `path.resolve()`'d form) from
   * an error message. Exposed directly (not just used internally by
   * {@link fileToBase64DataUri}) so the resolved-path branch can be verified
   * by a deterministic unit test — real `fs` errors only ever embed the
   * literal path as passed, never a resolved variant, so that branch isn't
   * otherwise observable through the async file-reading API.
   */
  redactPathFromMessage,

  /**
   * Convert file path to base64 data URI
   */
  fileToBase64DataUri: async (
    filePath: string,
    maxBytes: number = 10 * 1024 * 1024,
  ): Promise<string> => {
    try {
      const fs = await import("fs/promises");

      // File existence and type validation
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) {
        throw new Error("Not a file");
      }

      // Size check before reading - prevent memory exhaustion
      if (stat.size > maxBytes) {
        throw new Error(
          `File too large: ${stat.size} bytes (max: ${maxBytes} bytes)`,
        );
      }

      const buffer = await fs.readFile(filePath);

      // Enhanced MIME detection: try buffer content first, fallback to filename
      const mimeType =
        ImageProcessor.detectImageType(buffer) ||
        ImageProcessor.detectImageType(filePath);

      // #261/#286 follow-up: reject the octet-stream sentinel here too —
      // this is a third public path (alongside process() and
      // processImage()) that can otherwise package unknown bytes into a
      // `data:application/octet-stream;base64,...` URI a vision provider
      // rejects outright.
      assertKnownImageType(mimeType);

      const base64 = buffer.toString("base64");
      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      // Full path stays in the debug log; the thrown (potentially
      // client-facing) error only gets the basename. The underlying fs
      // error's own message is scrubbed too — Node's ENOENT/EACCES text
      // embeds the full path verbatim (e.g. "no such file or directory,
      // stat '/full/path'"), which would otherwise leak the host's
      // directory layout right back through the "reason" suffix. The raw
      // `error` is never attached as `cause` either — that would leave the
      // unredacted path reachable via `error.cause.message` for anything
      // that walks the cause chain (cause-aware logging, telemetry); a
      // sanitized copy (via the shared `sanitizeErrorCause`) is attached
      // instead, mirroring `urlToBase64DataUri` below.
      logger.debug("fileToBase64DataUri failed", { filePath, error });
      const safeName = basename(filePath);
      const cause = sanitizeErrorCause(error, { filePath });
      const reason = error instanceof Error ? cause.message : "Unknown error";
      // Assigned to a variable before throwing (rather than `throw new
      // Error(...)` inline) so the sanitized `cause` — a deliberately NEW,
      // redacted Error — isn't mistaken by tooling for a dropped/altered
      // reference to the originally caught `error`; the raw error is never
      // reachable from the thrown result at all, by design.
      const wrapped = new Error(
        `Failed to convert file to base64 (${safeName}): ${reason}`,
        { cause },
      );
      throw wrapped;
    }
  },

  /**
   * Convert URL to base64 data URI by downloading the image.
   * Implements retry logic with exponential backoff for network errors.
   *
   * Retries are performed for:
   * - Network errors (ECONNRESET, ENOTFOUND, ECONNREFUSED, ETIMEDOUT, ERR_NETWORK, AbortError)
   * - Server errors (5xx status codes)
   * - Rate limiting (429 Too Many Requests)
   * - Request timeouts (408 Request Timeout)
   *
   * Retries are NOT performed for:
   * - Client errors (4xx status codes except 408, 429)
   * - Invalid content type
   * - Content size limit exceeded
   * - Unsupported protocol
   *
   * @param url - The URL of the image to download
   * @param options - Configuration options
   * @param options.timeoutMs - Timeout for each download attempt (default: 15000ms)
   * @param options.maxBytes - Maximum allowed file size (default: 10MB)
   * @param options.maxAttempts - Maximum number of total attempts including initial attempt (default: 3)
   * @returns Promise<string> - Base64 data URI of the downloaded image
   * Rate-limited to 10 downloads per second to prevent DoS
   * Uses LRU cache to avoid redundant downloads of the same URL
   */
  urlToBase64DataUri: async (
    url: string,
    {
      timeoutMs = 15000,
      maxBytes = 10 * 1024 * 1024,
      maxAttempts = 3,
    }: {
      timeoutMs?: number;
      maxBytes?: number;
      maxAttempts?: number;
    } = {},
  ): Promise<string> => {
    // Check cache first
    const cache = getImageCache();
    const cached = cache.get(url);
    if (cached) {
      logger.debug("Using cached image for URL", {
        url: redactUrlForError(url),
      });
      return cached.dataUri;
    }

    // Apply rate limiting before download
    await urlDownloadRateLimiter.acquire();

    // Basic protocol whitelist - fail fast, no retry needed
    if (!/^https?:\/\//i.test(url)) {
      throw new Error("Unsupported protocol");
    }

    // Perform the actual download with retry logic
    const performDownload = async (): Promise<string> => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get("content-type") || "";
        if (!/^image\//i.test(contentType)) {
          throw new Error(
            `Unsupported content-type: ${contentType || "unknown"}`,
          );
        }

        const contentLengthHeader = response.headers.get("content-length");
        const len = Number(contentLengthHeader || 0);

        if (contentLengthHeader !== null && len === 0) {
          throw new Error("Empty response: content-length is 0");
        }

        if (len && len > maxBytes) {
          throw new Error(`Content too large: ${len} bytes`);
        }

        const buffer = await response.arrayBuffer();
        if (buffer.byteLength > maxBytes) {
          throw new Error(
            `Downloaded content too large: ${buffer.byteLength} bytes`,
          );
        }

        const imageBuffer = Buffer.from(buffer);
        const base64 = imageBuffer.toString("base64");
        const dataUri = `data:${contentType || "image/jpeg"};base64,${base64}`;

        // Store in cache for future use
        cache.set(url, dataUri, contentType || "image/jpeg", imageBuffer);

        return dataUri;
      } finally {
        clearTimeout(t);
      }
    };

    try {
      return await withRetry(performDownload, {
        maxAttempts,
        initialDelay: SYSTEM_LIMITS.DEFAULT_INITIAL_DELAY,
        backoffMultiplier: SYSTEM_LIMITS.DEFAULT_BACKOFF_MULTIPLIER,
        maxDelay: SYSTEM_LIMITS.DEFAULT_MAX_DELAY,
        retryCondition: isRetryableDownloadError,
        onRetry: (attempt: number, error: unknown) => {
          // Some fetch/DNS/TLS errors embed the full request URL (including
          // a presigned query token) in `error.message` — redact that text
          // too, not just the explicit `url` interpolation below. The
          // non-Error branch is sanitized too: String(error) on a thrown
          // non-Error value (e.g. a raw string or object) can just as
          // easily carry the same signed URL.
          const message = redactUrlsInText(
            error instanceof Error ? error.message : String(error),
          );
          const attemptsLeft = maxAttempts - attempt;
          logger.warn(
            `⚠️ Image download attempt ${attempt} failed for ${redactUrlForError(url)}: ${message}. ${attemptsLeft} ${attemptsLeft === 1 ? "attempt" : "attempts"} remaining...`,
          );
        },
      });
    } catch (error) {
      // Query string / fragment stripped — a presigned S3/GCS URL or SAS
      // token embedded there must not be echoed into a thrown error. The
      // underlying error's own message is scrubbed too, since fetch/DNS/TLS
      // errors often embed the full URL (query string and all) themselves.
      // The raw `error` is never attached as `cause` — that would leave the
      // unredacted URL reachable via `error.cause.message` for anything
      // that walks the cause chain (cause-aware logging, telemetry); a
      // sanitized copy is attached instead.
      const sourceUrl = redactUrlForError(url);
      const cause = sanitizeErrorCause(error);
      const wrapped = new Error(
        `Failed to download and convert URL to base64 (${sourceUrl}): ${cause.message}`,
        { cause },
      );
      throw wrapped;
    }
  },

  /**
   * Extract base64 data from data URI
   */
  extractBase64FromDataUri: (dataUri: string): string => {
    if (!dataUri.includes(",")) {
      return dataUri; // Already just base64
    }
    return dataUri.split(",")[1];
  },

  /**
   * Extract MIME type from data URI
   */
  extractMimeTypeFromDataUri: (dataUri: string): string => {
    const match = dataUri.match(/^data:([^;]+);base64,/);
    return match ? match[1] : "image/jpeg";
  },

  /**
   * Create data URI from base64 and MIME type
   */
  createDataUri: (base64: string, mimeType: string = "image/jpeg"): string => {
    // Remove data URI prefix if already present
    const cleanBase64 = base64.includes(",") ? base64.split(",")[1] : base64;
    return `data:${mimeType};base64,${cleanBase64}`;
  },

  /**
   * Validate base64 string format
   * Validates format BEFORE buffer allocation to prevent memory exhaustion
   */
  isValidBase64: (str: string): boolean => {
    try {
      // Remove data URI prefix if present
      const cleanBase64 = str.includes(",") ? str.split(",")[1] : str;

      // Empty string check
      if (!cleanBase64 || cleanBase64.length === 0) {
        return false;
      }

      // 1. Validate character set FIRST (A-Z, a-z, 0-9, +, /, =)
      // This prevents memory allocation for invalid input like "hello world"
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(cleanBase64)) {
        return false;
      }

      // 2. Check length is multiple of 4
      if (cleanBase64.length % 4 !== 0) {
        return false;
      }

      // 3. Validate padding position (max 2 equals at end only)
      const paddingIndex = cleanBase64.indexOf("=");
      if (paddingIndex !== -1) {
        // Padding must be at the end
        if (paddingIndex < cleanBase64.length - 2) {
          return false;
        }
        // No characters after padding
        const afterPadding = cleanBase64.slice(paddingIndex);
        if (!/^=+$/.test(afterPadding)) {
          return false;
        }
      }

      // 4. ONLY NOW decode if format is valid
      const decoded = Buffer.from(cleanBase64, "base64");
      const reencoded = decoded.toString("base64");

      // Remove padding for comparison (base64 can have different padding)
      const normalizeBase64 = (b64: string) => b64.replace(/=+$/, "");
      return normalizeBase64(cleanBase64) === normalizeBase64(reencoded);
    } catch {
      return false;
    }
  },

  /**
   * Get base64 string size in bytes
   */
  getBase64Size: (base64: string): number => {
    // Remove data URI prefix if present
    const cleanBase64 = base64.includes(",") ? base64.split(",")[1] : base64;
    return Buffer.byteLength(cleanBase64, "base64");
  },

  /**
   * Compress base64 image by reducing quality (basic implementation)
   * Note: This is a placeholder - for production use, consider using sharp or similar
   */
  compressBase64: (base64: string, _quality: number = 0.8): string => {
    // This is a basic implementation that just returns the original
    // In a real implementation, you'd use an image processing library
    logger.warn("Base64 compression not implemented - returning original");
    return base64;
  },
};
