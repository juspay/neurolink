/**
 * Image processing utilities for multimodal support
 * Handles format conversion for different AI providers
 */

import { logger } from "./logger.js";
import { urlDownloadRateLimiter } from "./rateLimiter.js";
import { withRetry } from "./retryHandler.js";
import { SYSTEM_LIMITS } from "../core/constants.js";
import type { ProcessedImage } from "../types/multimodal.js";
import type { FileProcessingResult } from "../types/fileTypes.js";

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
    // Validate content is non-empty before processing
    if (content.length === 0) {
      logger.error("Empty buffer provided");
      throw new Error("Invalid image processing: buffer is empty");
    }

    const mediaType = this.detectImageType(content);
    const base64 = content.toString("base64");
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
      const base64 = image.toString("base64");
      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      logger.error("Failed to process image for OpenAI:", error);
      throw new Error(
        `Image processing failed for OpenAI: ${error instanceof Error ? error.message : "Unknown error"}`,
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
        base64Data = image.toString("base64");
      }

      return {
        mimeType,
        data: base64Data, // Google wants base64 WITHOUT data URI prefix
      };
    } catch (error) {
      logger.error("Failed to process image for Google AI:", error);
      throw new Error(
        `Image processing failed for Google AI: ${error instanceof Error ? error.message : "Unknown error"}`,
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
        base64Data = image.toString("base64");
      }

      return {
        mediaType,
        data: base64Data, // Anthropic wants base64 WITHOUT data URI prefix
      };
    } catch (error) {
      logger.error("Failed to process image for Anthropic:", error);
      throw new Error(
        `Image processing failed for Anthropic: ${error instanceof Error ? error.message : "Unknown error"}`,
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
      logger.error("Failed to process image for Vertex AI:", error);
      throw new Error(
        `Image processing failed for Vertex AI: ${error instanceof Error ? error.message : "Unknown error"}`,
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

        // AVIF: check for "ftypavif" signature at bytes 4-11
        if (input.length >= 12) {
          const ftyp = input.subarray(4, 8).toString();
          const brand = input.subarray(8, 12).toString();
          if (ftyp === "ftyp" && brand === "avif") {
            return "image/avif";
          }
        }
      }

      return "image/jpeg"; // Default fallback
    } catch (error) {
      logger.warn("Failed to detect image type, using default:", error);
      return "image/jpeg";
    }
  }

  /**
   * Validate image size (default 10MB limit)
   */
  static validateImageSize(
    data: Buffer | string,
    maxSize: number = 10 * 1024 * 1024,
  ): boolean {
    try {
      const size =
        typeof data === "string"
          ? Buffer.byteLength(data, "base64")
          : data.length;
      return size <= maxSize;
    } catch (error) {
      logger.warn("Failed to validate image size:", error);
      return false;
    }
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

      // Basic JPEG dimension extraction (simplified)
      if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
        // This is a very basic implementation
        // For production, consider using a proper image library
        return null;
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
      const mediaType = ImageProcessor.detectImageType(image);
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
            data = image.toString("base64");
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
      logger.error(`Failed to process image for ${provider}:`, error);
      throw new Error(
        `Image processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}

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
   * Extract file extension from filename or URL
   */
  getFileExtension: (filename: string): string | null => {
    const match = filename.match(/\.([^.]+)$/);
    return match ? match[1].toLowerCase() : null;
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
   * Convert Buffer to base64 string
   */
  bufferToBase64: (buffer: Buffer): string => {
    return buffer.toString("base64");
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

      const base64 = buffer.toString("base64");
      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      throw new Error(
        `Failed to convert file to base64: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
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

        const len = Number(response.headers.get("content-length") || 0);
        if (len && len > maxBytes) {
          throw new Error(`Content too large: ${len} bytes`);
        }

        const buffer = await response.arrayBuffer();
        if (buffer.byteLength > maxBytes) {
          throw new Error(
            `Downloaded content too large: ${buffer.byteLength} bytes`,
          );
        }

        const base64 = Buffer.from(buffer).toString("base64");
        return `data:${contentType || "image/jpeg"};base64,${base64}`;
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
          const message =
            error instanceof Error ? error.message : String(error);
          const attemptsLeft = maxAttempts - attempt;
          logger.warn(
            `⚠️ Image download attempt ${attempt} failed for ${url}: ${message}. ${attemptsLeft} ${attemptsLeft === 1 ? "attempt" : "attempts"} remaining...`,
          );
        },
      });
    } catch (error) {
      throw new Error(
        `Failed to download and convert URL to base64: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
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
