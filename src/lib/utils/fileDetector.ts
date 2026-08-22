/**
 * File Type Detection Utility
 * Centralized file detection for all multimodal file types
 * Uses multi-strategy approach for reliable type identification
 */

import { open, readFile, realpath } from "fs/promises";
import {
  basename,
  isAbsolute as isAbsolutePath,
  relative as relativePath,
  resolve as resolvePath,
  sep,
} from "path";
import { request } from "undici";
import { redirectFollowingDispatcher } from "./redirectDispatcher.js";
// Lazy-loaded processor singletons — avoids loading heavy media deps
// (mediabunny, fluent-ffmpeg, music-metadata, adm-zip) on every generate() call.
async function getVideoProcessor() {
  const mod = await import("../processors/media/VideoProcessor.js");
  return mod.videoProcessor;
}
async function getAudioProcessor() {
  const mod = await import("../processors/media/AudioProcessor.js");
  return mod.audioProcessor;
}
async function getArchiveProcessor() {
  const mod = await import("../processors/archive/ArchiveProcessor.js");
  return mod.archiveProcessor;
}
import type {
  CSVProcessorOptions,
  DetectionStrategy,
  FileDetectionResult,
  FileDetectorOptions,
  FileInput,
  FileProcessingResult,
  FileSource,
  FileType,
  VideoProcessorOptions,
} from "../types/index.js";
import { tracers, ATTR, withSpan } from "../telemetry/index.js";
import { CONFIG_EXTENSIONS } from "../processors/config/fileExtensions.js";
import {
  fileTypeForExtension,
  lookupByMimeType,
  normalizeExtension,
} from "../processors/config/fileTypeRegistry.js";
import { LANGUAGE_MAP } from "../processors/config/languageMap.js";
import {
  getMimeTypeForExtension,
  TEXT_EXTENSION_MIME_MAP,
} from "../processors/config/mimeConstants.js";
import { CSVProcessor } from "./csvProcessor.js";
import { withRetry } from "../core/infrastructure/retry.js";
import { ImageProcessor } from "./imageProcessor.js";
import { detectIsoBmffImageMimeType, hasFtypBoxSignature } from "./isoBmff.js";
import { logger } from "./logger.js";
import { looksLikeSvgMarkup } from "./markupSniff.js";
import { withTimeout } from "./errorHandling.js";
import {
  normalizeUrlForCache,
  redactUrlForError,
  sanitizeErrorCause,
} from "./logSanitize.js";
import {
  mimeHintToExtension,
  mimeHintToFileType,
  normalizeMimeHint,
} from "./mimeTypeHints.js";
import { PDFProcessor } from "./pdfProcessor.js";

/**
 * Short-TTL cache of URL → Content-Type (#323). A URL is commonly detected more
 * than once (repeated multimodal prompts reuse the same asset URL); caching the
 * HEAD's content-type avoids re-issuing the HEAD each time. `loadFromURL` also
 * populates it from its GET response, so once a URL's body has been fetched a
 * subsequent detection needs no network round-trip at all.
 *
 * Trade-off (round-2 review): this is a module-level cache shared by every
 * request in the process, and correctness relies solely on the 60s TTL — a
 * signed URL whose response changes at the same path within that window would
 * read stale. That is an intentional, bounded trade-off (60s of possible
 * staleness for far fewer HEAD round-trips), not a freshness guarantee.
 * Expired entries are removed lazily on their next `get()` (see
 * `getCachedUrlContentType`); `setCachedUrlContentType` additionally sweeps
 * expired entries opportunistically once the cache hits its size cap, so a
 * URL that is cached once and never looked up again doesn't linger until the
 * FIFO eviction below forces it out.
 */
const URL_CONTENT_TYPE_TTL_MS = 60_000;
const URL_CONTENT_TYPE_CACHE_MAX_SIZE = 512;
const urlContentTypeCache = new Map<
  string,
  { contentType: string; expiresAt: number }
>();

/**
 * Build the Map key for `urlContentTypeCache`. Delegates to the shared
 * {@link normalizeUrlForCache} — this is a module-level, process-lifetime
 * cache, so it must strip presigned-URL auth/signature query params (see
 * `SENSITIVE_URL_QUERY_PARAM_DENYLIST`) the same way `ImageCache.normalizeUrl`
 * does, folding a short hash of the stripped params into the key whenever any
 * were present so two different presigned URLs for the same path don't
 * collide and serve each other's cached content-type across auth contexts.
 * Also strips tracking/analytics params first, so two URLs differing only by
 * tracking noise (e.g. `utm_source`) still hit the same cache entry instead
 * of missing each other. Falls back to the raw URL if it isn't a parseable
 * absolute URL. Shared by both `getCachedUrlContentType` and
 * `setCachedUrlContentType` so lookups and writes always agree on the key.
 */
function cacheKeyForUrl(url: string): string {
  return normalizeUrlForCache(url);
}

function getCachedUrlContentType(url: string, now: number): string | undefined {
  const key = cacheKeyForUrl(url);
  const hit = urlContentTypeCache.get(key);
  if (hit && hit.expiresAt > now) {
    // Bump recency: Map iteration order follows insertion order, and the
    // eviction below deletes the *first* key, so a plain `get` on a hot
    // entry would leave it first in line for eviction despite being the
    // most recently used. Re-inserting turns the size-bounded FIFO below
    // into an actual LRU.
    urlContentTypeCache.delete(key);
    urlContentTypeCache.set(key, hit);
    return hit.contentType;
  }
  if (hit) {
    // Entry exists but its TTL has passed — treat as a miss and evict it
    // immediately rather than serving (or retaining) stale data.
    urlContentTypeCache.delete(key);
  }
  return undefined;
}

/**
 * Opportunistically remove already-expired entries. Only called once the
 * cache is at its size cap (see `setCachedUrlContentType`) so it doesn't add
 * an O(n) scan to the common-case hot path.
 */
function pruneExpiredUrlContentTypeEntries(now: number): void {
  for (const [key, entry] of urlContentTypeCache) {
    if (entry.expiresAt <= now) {
      urlContentTypeCache.delete(key);
    }
  }
}

function setCachedUrlContentType(
  url: string,
  contentType: string,
  now: number,
): void {
  if (!contentType) {
    return;
  }
  const key = cacheKeyForUrl(url);
  urlContentTypeCache.set(key, {
    contentType,
    expiresAt: now + URL_CONTENT_TYPE_TTL_MS,
  });
  // Bound the cache so a long-lived process can't grow it unbounded. Prefer
  // reclaiming already-expired entries first; only fall back to evicting the
  // oldest still-live entry (FIFO/LRU-ish, see getCachedUrlContentType) if
  // the cache is still over the cap after pruning.
  if (urlContentTypeCache.size > URL_CONTENT_TYPE_CACHE_MAX_SIZE) {
    pruneExpiredUrlContentTypeEntries(now);
  }
  if (urlContentTypeCache.size > URL_CONTENT_TYPE_CACHE_MAX_SIZE) {
    const oldest = urlContentTypeCache.keys().next().value;
    if (oldest !== undefined) {
      urlContentTypeCache.delete(oldest);
    }
  }
}

/**
 * Retryable network error codes (Node.js/undici network errors)
 */
const RETRYABLE_ERROR_CODES = [
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "ENOTFOUND",
  "ENETUNREACH",
  "EAI_AGAIN",
  "EPIPE",
  "ECONNABORTED",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
  "UND_ERR_SOCKET",
];

/**
 * Non-retryable HTTP status codes (client errors)
 */
const NON_RETRYABLE_STATUS_CODES = [400, 401, 403, 404, 405];

/**
 * Retryable HTTP status codes (server errors + rate limiting)
 */
const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];

/**
 * Check if an error is a recoverable network error that should be retried
 *
 * @param error - Error to check
 * @returns True if error is retryable (transient network issue)
 */
function isRetryableNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const errorMessage = error.message.toLowerCase();

  // Extract error code from various error shapes
  const errorWithCode = error as { code?: string; statusCode?: number };
  const errorCode = errorWithCode.code?.toUpperCase();

  // Check for retryable network error codes
  if (errorCode && RETRYABLE_ERROR_CODES.includes(errorCode)) {
    return true;
  }

  // Check HTTP status code if present in error message (e.g., "HTTP 503")
  const httpStatusMatch = errorMessage.match(/http\s*(\d{3})/);
  if (httpStatusMatch) {
    const statusCode = parseInt(httpStatusMatch[1], 10);
    if (NON_RETRYABLE_STATUS_CODES.includes(statusCode)) {
      return false;
    }
    if (RETRYABLE_STATUS_CODES.includes(statusCode)) {
      return true;
    }
  }

  // Check error message for transient issues
  const transientKeywords = [
    "timeout",
    "timed out",
    "connection reset",
    "econnreset",
    "etimedout",
    "network error",
    "socket hang up",
    "enotfound",
    "getaddrinfo",
    "unavailable",
    "service unavailable",
  ];

  return transientKeywords.some((keyword) => errorMessage.includes(keyword));
}

/**
 * Check if text has JSON markers (starts with { or [ and ends with corresponding closing bracket)
 */
function hasJsonMarkers(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }

  const firstChar = trimmed[0];
  const lastChar = trimmed[trimmed.length - 1];

  const hasMatchingBrackets =
    (firstChar === "{" && lastChar === "}") ||
    (firstChar === "[" && lastChar === "]");

  if (!hasMatchingBrackets) {
    return false;
  }

  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format file size in human-readable units
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} bytes`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Centralized file type detection and processing
 *
 * @example
 * ```typescript
 * // Auto-detect and process any file
 * const result = await FileDetector.detectAndProcess("data.csv");
 * logger.info(result.type); // 'csv'
 * ```
 */
export class FileDetector {
  // FD-017: Replace hardcoded timeouts with constants.
  // These default ensure consistent timeout behavior across all file-detection logic.
  public static readonly DEFAULT_NETWORK_TIMEOUT = 30000; // 30 seconds
  public static readonly DEFAULT_HEAD_TIMEOUT = 5000; // 5 seconds
  /**
   * Ceiling on an in-process document parse (unzip + XML walk). Generous
   * relative to the work, because the cost of firing early on a large but
   * legitimate file is a lost extraction, while the cost of never firing is a
   * held request.
   */
  public static readonly DEFAULT_DOCUMENT_TIMEOUT = 30000; // 30 seconds
  /**
   * Auto-detect file type and process in one call
   *
   * Runs detection strategies in priority order:
   * 1. MagicBytesStrategy (95% confidence) - Binary file headers
   * 2. MimeTypeStrategy (85% confidence) - HTTP Content-Type for URLs
   * 3. ExtensionStrategy (70% confidence) - File extension
   * 4. ContentHeuristicStrategy (75% confidence) - Content analysis
   *
   * @param input - File path, URL, Buffer, or data URI
   * @param options - Detection and processing options
   * @returns Processed file result with type and content
   */
  static async detectAndProcess(
    input: FileInput,
    options?: FileDetectorOptions,
  ): Promise<FileProcessingResult> {
    // Derive filename and size for tracing before detection runs
    const inputFilename = FileDetector.deriveInputFilename(input);
    const inputSizeBytes = FileDetector.deriveInputSize(input);

    return withSpan(
      {
        name: "neurolink.file.detect_and_process",
        tracer: tracers.file,
        attributes: {
          [ATTR.FILE_NAME]: inputFilename,
          [ATTR.FILE_SIZE_BYTES]: inputSizeBytes,
        },
      },
      async (span) => {
        const detection = await FileDetector.detect(input, options);

        span.setAttribute(ATTR.FILE_CATEGORY, detection.type);
        span.setAttribute(ATTR.FILE_MIMETYPE, detection.mimeType || "unknown");
        span.setAttribute(ATTR.FILE_CONFIDENCE, detection.metadata.confidence);

        logger.info(
          `[NEUROLINK] File detected: ${inputFilename} (${detection.mimeType || "unknown"}, ${formatFileSize(inputSizeBytes)}) → category: ${detection.type}`,
        );

        // FD-018: Comprehensive fallback parsing for extension-less files
        if (
          options?.allowedTypes &&
          !options.allowedTypes.includes(detection.type)
        ) {
          const content = await FileDetector.loadContent(
            input,
            detection,
            options,
          );
          const errors: string[] = [];

          for (const allowedType of options.allowedTypes) {
            try {
              const result = await FileDetector.tryFallbackParsing(
                content,
                allowedType,
                options,
              );
              if (result) {
                logger.info(
                  `[FileDetector] ✅ ${allowedType.toUpperCase()} fallback successful`,
                );
                const outputLength =
                  typeof result.content === "string"
                    ? result.content.length
                    : result.content?.length || 0;
                span.setAttribute(ATTR.FILE_OUTPUT_LENGTH, outputLength);
                span.setAttribute(ATTR.FILE_SUCCESS, true);
                span.setAttribute(
                  ATTR.FILE_PROCESSOR_USED,
                  `fallback:${allowedType}`,
                );
                logger.info(
                  `[NEUROLINK] File processed: ${inputFilename} → ${outputLength} bytes output (fallback: ${allowedType})`,
                );
                return result;
              }
            } catch (error) {
              const errorMsg =
                error instanceof Error ? error.message : String(error);
              errors.push(`${allowedType}: ${errorMsg}`);
              logger.debug(
                `[FileDetector] ${allowedType} fallback failed: ${errorMsg}`,
              );
            }
          }

          logger.warn(
            `[FileDetector] All fallback parsing failed for type "${detection.type}". ` +
              `Attempted: ${options.allowedTypes.join(", ")}. Falling through to universal handler.`,
          );
          const csvOptions: CSVProcessorOptions | undefined =
            options?.csvOptions;
          const result = await FileDetector.processFile(
            content,
            detection,
            csvOptions,
            options?.provider,
            options?.videoOptions,
          );
          FileDetector.setFileResultSpanAttributes(
            span,
            result,
            inputFilename,
            detection.type,
          );
          return result;
        }

        const content = await FileDetector.loadContent(
          input,
          detection,
          options,
        );
        const csvOptions: CSVProcessorOptions | undefined = options?.csvOptions;
        const result = await FileDetector.processFile(
          content,
          detection,
          csvOptions,
          options?.provider,
          options?.videoOptions,
        );
        FileDetector.setFileResultSpanAttributes(
          span,
          result,
          inputFilename,
          detection.type,
        );
        return result;
      },
    );
  }

  /**
   * Set span attributes and log after file processing completes.
   */
  private static setFileResultSpanAttributes(
    span: Parameters<Parameters<typeof withSpan>[1]>[0],
    result: FileProcessingResult,
    filename: string,
    processorType: string,
  ): void {
    const outputLength =
      typeof result.content === "string"
        ? result.content.length
        : result.content?.length || 0;
    const hasImages = Array.isArray((result as { images?: unknown[] }).images)
      ? (result as { images: unknown[] }).images.length > 0
      : false;
    const imageCount = Array.isArray((result as { images?: unknown[] }).images)
      ? (result as { images: unknown[] }).images.length
      : 0;

    span.setAttribute(ATTR.FILE_OUTPUT_LENGTH, outputLength);
    span.setAttribute(ATTR.FILE_SUCCESS, true);
    span.setAttribute(ATTR.FILE_PROCESSOR_USED, processorType);
    span.setAttribute(ATTR.FILE_HAS_IMAGES, hasImages);
    span.setAttribute(ATTR.FILE_IMAGE_COUNT, imageCount);

    logger.info(
      `[NEUROLINK] File processed: ${filename} → ${outputLength} bytes output` +
        (imageCount > 0 ? ` + ${imageCount} image(s)` : "") +
        ` (processor: ${processorType})`,
    );
  }

  /**
   * Derive a human-readable filename from FileInput for tracing.
   */
  private static deriveInputFilename(input: FileInput): string {
    if (typeof input === "string") {
      if (input.startsWith("data:")) {
        return "data-uri";
      }
      if (input.startsWith("http")) {
        try {
          return new URL(input).pathname.split("/").pop() || "url-file";
        } catch {
          return "url-file";
        }
      }
      // File path
      return input.split("/").pop() || input.split("\\").pop() || "file";
    }
    if (Buffer.isBuffer(input)) {
      return "buffer";
    }
    // Everything left is a `FileWithMetadata`, which states its own name, and
    // `withResolvedExtension` reads this to recover an extension when a
    // content-based strategy reported none. Falling straight through to
    // "unknown-input" threw that name away, so an `.odp`, `.rtf` or `.tar`
    // supplied as bytes-plus-name lost the extension its processor routes on.
    // Still defensive about the value: the type says required, callers are
    // untyped JavaScript often enough.
    return input?.filename || "unknown-input";
  }

  /**
   * Derive byte size from FileInput for tracing.
   */
  private static deriveInputSize(input: FileInput): number {
    if (Buffer.isBuffer(input)) {
      return input.length;
    }
    if (typeof input === "string") {
      if (input.startsWith("data:")) {
        // Rough estimate: base64 is ~4/3 of raw
        const base64Part = input.split(",")[1];
        return base64Part ? Math.floor((base64Part.length * 3) / 4) : 0;
      }
      return input.length; // path or URL string length (not file size)
    }
    return 0;
  }

  /**
   * Classify a FileInput into the FileSource enum used by downstream
   * loaders. Keeps the mimetype-hint short-circuit in detect() able to
   * produce a valid FileDetectionResult without re-implementing the
   * source-inference rules scattered across loadContent().
   */
  private static deriveInputSource(input: FileInput): FileSource {
    if (Buffer.isBuffer(input)) {
      return "buffer";
    }
    if (typeof input === "string") {
      if (input.startsWith("data:")) {
        return "datauri";
      }
      if (input.startsWith("http://") || input.startsWith("https://")) {
        return "url";
      }
      return "path";
    }
    return "buffer";
  }

  /**
   * Try fallback parsing for a specific file type
   * Used when file detection returns "unknown" but we want to try parsing anyway
   */
  private static async tryFallbackParsing(
    content: Buffer,
    fileType: FileType,
    options?: FileDetectorOptions,
  ): Promise<FileProcessingResult | null> {
    logger.info(
      `[FileDetector] Attempting ${fileType.toUpperCase()} fallback parsing`,
    );

    switch (fileType) {
      case "csv": {
        // Try CSV parsing
        const csvOptions: CSVProcessorOptions | undefined = options?.csvOptions;
        const result = await CSVProcessor.process(content, csvOptions);
        logger.info(
          `[FileDetector] CSV fallback: ${result.metadata?.rowCount || 0} rows, ${result.metadata?.columnCount || 0} columns`,
        );
        return result;
      }

      case "text": {
        // Try text parsing - check if content is valid UTF-8 text
        const textContent = content.toString("utf-8");
        // Validate it's actually text (no null bytes, mostly printable)
        if (FileDetector.isValidText(textContent)) {
          return {
            type: "text",
            content: textContent,
            mimeType: FileDetector.guessTextMimeType(textContent),
            metadata: {
              confidence: 70,
              size: content.length,
            },
          };
        }
        throw new Error("Content does not appear to be valid text");
      }

      case "image": {
        // Image requires magic bytes - can't fallback without detection
        throw new Error(
          "Image type requires binary detection, cannot fallback parse",
        );
      }

      case "pdf": {
        // PDF requires magic bytes - can't fallback without detection
        throw new Error(
          "PDF type requires binary detection, cannot fallback parse",
        );
      }

      case "audio": {
        // Audio requires magic bytes - can't fallback without detection
        throw new Error(
          "Audio type requires binary detection, cannot fallback parse",
        );
      }

      case "video": {
        // Video requires magic bytes - can't fallback without detection
        throw new Error(
          "Video type requires binary detection, cannot fallback parse",
        );
      }

      case "archive": {
        // Archive requires magic bytes - can't fallback without detection
        throw new Error(
          "Archive type requires binary detection, cannot fallback parse",
        );
      }

      case "xlsx": {
        // Document formats require binary detection
        throw new Error(
          "Excel type requires binary detection, cannot fallback parse",
        );
      }

      case "docx": {
        throw new Error(
          "Word type requires binary detection, cannot fallback parse",
        );
      }

      case "pptx": {
        throw new Error(
          "PowerPoint type requires binary detection, cannot fallback parse",
        );
      }

      case "svg": {
        // SVG can be detected from text content
        const svgContent = content.toString("utf-8");
        if (svgContent.includes("<svg") && svgContent.includes("</svg>")) {
          return {
            type: "svg",
            content: svgContent,
            mimeType: "image/svg+xml",
            metadata: {
              confidence: 70,
              size: content.length,
            },
          };
        }
        throw new Error("Content does not appear to be valid SVG");
      }

      default:
        return null;
    }
  }

  /**
   * Check if content is valid text (UTF-8, mostly printable)
   */
  private static isValidText(content: string): boolean {
    // Check for null bytes which indicate binary content
    if (content.includes("\0")) {
      return false;
    }

    // Check if content has reasonable amount of printable characters
    let printableCount = 0;
    for (let i = 0; i < content.length; i++) {
      const code = content.charCodeAt(i);
      if (
        (code >= 32 && code < 127) || // ASCII printable
        code === 9 || // Tab
        code === 10 || // Newline
        code === 13 || // Carriage return
        code > 127 // Unicode (non-ASCII)
      ) {
        printableCount++;
      }
    }

    // At least 90% should be printable
    return printableCount / content.length >= 0.9;
  }

  /**
   * Guess the MIME type for text content based on content patterns
   */
  private static guessTextMimeType(content: string): string {
    const trimmed = content.trim();

    // Check for JSON
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        JSON.parse(trimmed);
        return "application/json";
      } catch {
        // Not valid JSON, continue checking
      }
    }

    // Check for XML/HTML using stricter detection
    if (FileDetector.looksLikeXMLStrict(trimmed)) {
      const isHTML =
        trimmed.includes("<!DOCTYPE html") ||
        trimmed.toLowerCase().includes("<html") ||
        trimmed.includes("<head") ||
        trimmed.includes("<body");
      return isHTML ? "text/html" : "application/xml";
    }

    // Check for YAML using robust multi-indicator detection
    if (FileDetector.looksLikeYAMLStrict(trimmed)) {
      return "application/yaml";
    }

    // Default to plain text
    return "text/plain";
  }

  /**
   * Strict YAML detection for guessTextMimeType
   * Similar to ContentHeuristicStrategy but requires at least 2 indicators
   * to avoid false positives from simple key: value patterns
   */
  private static looksLikeYAMLStrict(text: string): boolean {
    if (text.length === 0) {
      return false;
    }

    const lines = text.split("\n");

    // For single-line content, only --- or ... qualify as YAML
    if (lines.length === 1) {
      return text === "---" || text === "...";
    }

    // Collect YAML indicators (requires at least 2 for positive detection)
    const indicators: boolean[] = [];

    // Indicator 1: Document start marker (---)
    indicators.push(text.startsWith("---"));

    // Indicator 2: Document end marker (...)
    indicators.push(/^\.\.\.$|[\n]\.\.\.$/.test(text));

    // Indicator 3: YAML list items (- followed by space)
    indicators.push(/^[\s]*-\s+[^-]/m.test(text));

    // Indicator 4: Multiple key-value pairs (at least 2)
    const keyValuePattern = /^[\s]*[a-zA-Z_][a-zA-Z0-9_-]*:\s*(.+)$/;
    const keyValueMatches = lines.filter((line) =>
      keyValuePattern.test(line),
    ).length;
    indicators.push(keyValueMatches >= 2);

    // Require at least 2 indicators for confident YAML detection
    const matchCount = indicators.filter(Boolean).length;
    return matchCount >= 2;
  }

  /**
   * Strict XML detection for guessTextMimeType
   * Ensures content has proper XML declaration or valid tag structure with closing tags
   * Prevents false positives from arbitrary content starting with <
   */
  private static looksLikeXMLStrict(content: string): boolean {
    // XML declaration is a definitive marker
    if (content.startsWith("<?xml")) {
      return true;
    }

    // Must start with < for XML/HTML
    if (!content.startsWith("<")) {
      return false;
    }

    // Check for HTML DOCTYPE declaration
    if (content.includes("<!DOCTYPE html")) {
      return true;
    }

    // Must have valid opening tag structure: <tagname
    // Not just any < character like "< something"
    const hasValidOpeningTag = /<[a-zA-Z][a-zA-Z0-9-]*(?:\s[^>]*)?>/;
    if (!hasValidOpeningTag.test(content)) {
      return false;
    }

    // Must have at least one closing tag or self-closing tag to be valid XML/HTML
    const hasClosingTag = /<\/[a-zA-Z][a-zA-Z0-9-]*>/.test(content);
    const hasSelfClosingTag =
      /<[a-zA-Z][a-zA-Z0-9-]*(?:\s[^>]*)?\s*\/\s*>/.test(content);

    return hasClosingTag || hasSelfClosingTag;
  }

  /**
   * Detect file type using multi-strategy approach
   * Stops at first strategy with confidence >= threshold (default: 80%)
   */
  private static async detect(
    input: FileInput,
    options?: FileDetectorOptions,
  ): Promise<FileDetectionResult> {
    // Short-circuit on a trustworthy caller-provided mimetype hint. This is
    // the eager-path counterpart to FileReferenceRegistry.register()'s hint
    // handling — necessary for tiny files (<= TINY_MAX) that skip the lazy
    // registry path. normalizeMimeHint drops "application/octet-stream" so a
    // caller cannot hide real content behind the opaque sentinel.
    const hintMime = normalizeMimeHint(options?.mimetypeHint);
    if (hintMime) {
      const type = mimeHintToFileType(hintMime);
      if (type) {
        const ext = mimeHintToExtension(hintMime);
        const result: FileDetectionResult = {
          type,
          mimeType: hintMime,
          extension: ext || null,
          source: FileDetector.deriveInputSource(input),
          metadata: {
            confidence: 95,
            filename:
              options?.filenameHint || FileDetector.deriveInputFilename(input),
            size: FileDetector.deriveInputSize(input),
          },
        };
        logger.info(
          `[FileDetector] Type: ${type} (95%, from mimetype hint: ${hintMime})`,
        );
        return result;
      }
    }

    const confidenceThreshold = options?.confidenceThreshold ?? 80;
    const strategies: DetectionStrategy[] = [
      new MagicBytesStrategy(),
      new MimeTypeStrategy(),
      new ExtensionStrategy(),
      new ContentHeuristicStrategy(),
    ];

    let best: FileDetectionResult | null = null;
    for (const strategy of strategies) {
      const result = await strategy.detect(input);
      if (!best || result.metadata.confidence > best.metadata.confidence) {
        best = result;
      }
      if (result.metadata.confidence >= confidenceThreshold) {
        logger.info(
          `[FileDetector] Type: ${result.type} (${result.metadata.confidence}%)`,
        );
        return FileDetector.withResolvedExtension(result, input, options);
      }
    }

    // Below-threshold detection is the common case for any file under the
    // ContentHeuristic ceiling — a debug detail, not a warning-worthy anomaly.
    logger.debug(
      `[FileDetector] Best-effort type below threshold: ${best?.type ?? "unknown"} (${best?.metadata.confidence ?? 0}%, threshold ${confidenceThreshold}%)`,
    );
    return FileDetector.withResolvedExtension(
      best as FileDetectionResult,
      input,
      options,
    );
  }

  /**
   * Fill in `extension` from the input's name when detection did not set it.
   *
   * Content-based strategies identify a type from magic bytes and legitimately
   * have no extension to report, so they return null. That is fine for the type
   * itself but not for routing: several processors are chosen by extension
   * *after* detection has settled the type, because one routing type covers
   * several formats — `docx` covers .docx, .odt and .rtf.
   *
   * With a null extension those branches were unreachable. An .rtf scored high
   * on its `{\\rtf1` signature, arrived as type "docx" with no extension, and
   * fell through to the Word processor, which cannot read RTF — so a file whose
   * dedicated processor extracts it perfectly reported "Could not extract
   * content". The extension was known the whole time; it was simply dropped on
   * the way through.
   *
   * Only fills a gap — a strategy that did determine an extension keeps it, so
   * content still wins over a lying filename.
   */
  private static withResolvedExtension(
    result: FileDetectionResult,
    input: FileInput,
    options?: FileDetectorOptions,
  ): FileDetectionResult {
    if (!result) {
      return result;
    }
    // The caller's hint outranks a name derived from the input, because on the
    // unified path the input has already been unwrapped to a bare Buffer and
    // derives to the literal "buffer" — carrying no extension at all.
    const filename =
      options?.filenameHint ||
      result.metadata?.filename ||
      FileDetector.deriveInputFilename(input);
    if (!filename) {
      return result;
    }
    // Split on both separators so a Windows-style path on a POSIX host still
    // yields its basename, then take the final suffix.
    const base = filename.split(/[\\/]/).pop() ?? filename;
    const dot = base.lastIndexOf(".");
    const extension =
      result.extension ??
      (dot > 0 && dot < base.length - 1
        ? base.slice(dot + 1).toLowerCase()
        : null);

    // The name is carried alongside the extension for the same reason. A
    // content strategy reports no filename, so every processor keyed on one
    // received the literal fallback "archive" — and archive format detection
    // reads the name, because TAR has no magic bytes at offset 0 (its "ustar"
    // marker sits at byte 257). A .tar therefore arrived as an unidentifiable
    // archive and reported "Could not extract content", while the same bytes
    // handed to the processor WITH their name extract perfectly.
    const metadata =
      result.metadata && !result.metadata.filename
        ? { ...result.metadata, filename: base }
        : result.metadata;

    if (extension === result.extension && metadata === result.metadata) {
      return result;
    }
    return { ...result, extension, metadata };
  }

  /**
   * Load file content from various sources
   */
  private static async loadContent(
    input: FileInput,
    detection: FileDetectionResult,
    options?: FileDetectorOptions,
  ): Promise<Buffer> {
    let source = detection.source;

    if (source === "buffer" && !Buffer.isBuffer(input)) {
      if (typeof input === "string") {
        if (input.startsWith("data:")) {
          source = "datauri";
        } else if (
          input.startsWith("http://") ||
          input.startsWith("https://")
        ) {
          source = "url";
        } else {
          source = "path";
        }
      }
    }

    switch (source) {
      case "url":
        return await FileDetector.loadFromURL(input as string, options);
      case "path":
        return await FileDetector.loadFromPath(input as string, options);
      case "buffer":
        return input as Buffer;
      case "datauri":
        return FileDetector.loadFromDataURI(input as string);
      default:
        throw new Error(`Unknown source: ${source}`);
    }
  }

  /**
   * SDK-8: Format an informative placeholder when a file processor fails.
   * Instead of bare "[Video file: name]" strings, include size, format, and
   * the reason for failure so the LLM can acknowledge the attachment.
   */
  private static formatInformativePlaceholder(
    typeName: string,
    filename: string,
    content: Buffer,
    detection: FileDetectionResult,
    error?: unknown,
  ): string {
    const sizeStr =
      content.length < 1024
        ? `${content.length} bytes`
        : content.length < 1024 * 1024
          ? `${(content.length / 1024).toFixed(1)} KB`
          : `${(content.length / (1024 * 1024)).toFixed(1)} MB`;
    const errorMsg =
      error instanceof Error
        ? error.message
        : error
          ? String(error)
          : "Processing returned no usable content";
    return (
      `[${typeName} File: "${filename}"]\n` +
      `Size: ${sizeStr}\n` +
      `Format: ${detection.mimeType || "unknown"}\n` +
      `Error: Could not extract content (${errorMsg}).\n` +
      `The file was attached but could not be fully analyzed.`
    );
  }

  /**
   * Extract metadata and printable strings from an unrecognized binary file.
   * This is the "extract what you can" path for unknown file types.
   *
   * Extracts:
   * - File size (human-readable)
   * - MIME type / detected format
   * - First N bytes as hex dump (for identification)
   * - Printable ASCII/UTF-8 strings found in the binary (like `strings` command)
   * - Known file signatures that we don't have full processors for
   *
   * @param content  Raw file buffer
   * @param detection  Detection result (may be "unknown")
   * @param filename  Original filename (if known)
   * @returns Formatted text summary suitable for LLM consumption
   */
  private static extractBinaryMetadata(
    content: Buffer,
    detection: FileDetectionResult,
    filename: string,
  ): string {
    const parts: string[] = [];

    // Header
    const ext = detection.extension
      ? `.${detection.extension}`
      : filename.includes(".")
        ? filename.slice(filename.lastIndexOf("."))
        : "";
    const typeLabel = ext
      ? `${ext.toUpperCase().slice(1)} file`
      : "Binary file";
    parts.push(`[${typeLabel}: "${filename}"]`);

    // Basic metadata
    const sizeStr = formatFileSize(content.length);
    parts.push(`Size: ${sizeStr}`);
    if (
      detection.mimeType &&
      detection.mimeType !== "application/octet-stream"
    ) {
      parts.push(`Format: ${detection.mimeType}`);
    }

    // Known binary signature identification (broader than our processing capabilities)
    const sigLabel = FileDetector.identifyBinarySignature(content);
    if (sigLabel) {
      parts.push(`Identified as: ${sigLabel}`);
    }

    // Hex dump of first 32 bytes for identification
    const hexPreview = content
      .subarray(0, Math.min(32, content.length))
      .toString("hex")
      .match(/.{1,2}/g)
      ?.join(" ");
    if (hexPreview) {
      parts.push(`Header bytes: ${hexPreview}`);
    }

    // Extract printable strings (similar to Unix `strings` command)
    const strings = FileDetector.extractPrintableStrings(content, 4, 50);
    if (strings.length > 0) {
      parts.push(
        `\nEmbedded text found (${strings.length} string${strings.length > 1 ? "s" : ""}):`,
      );
      for (const s of strings) {
        parts.push(`  "${s}"`);
      }
    }

    parts.push(
      `\nThis file was attached but its format is not fully supported for content extraction.`,
    );
    parts.push(
      `The above metadata and any embedded text have been extracted for context.`,
    );

    return parts.join("\n");
  }

  /**
   * Identify known binary file signatures beyond what we can process.
   * Returns a human-readable description, or null if unrecognized.
   */
  private static identifyBinarySignature(buf: Buffer): string | null {
    if (buf.length < 4) {
      return null;
    }

    // SQLite: "SQLite format 3\0"
    if (
      buf.length >= 16 &&
      buf.subarray(0, 15).toString("ascii") === "SQLite format 3"
    ) {
      return "SQLite database";
    }
    // WOFF: "wOFF"
    if (
      buf[0] === 0x77 &&
      buf[1] === 0x4f &&
      buf[2] === 0x46 &&
      buf[3] === 0x46
    ) {
      return "WOFF font";
    }
    // WOFF2: "wOF2"
    if (
      buf[0] === 0x77 &&
      buf[1] === 0x4f &&
      buf[2] === 0x46 &&
      buf[3] === 0x32
    ) {
      return "WOFF2 font";
    }
    // TrueType/OpenType: starts with 0x00010000 or "OTTO"
    if (
      (buf[0] === 0x00 &&
        buf[1] === 0x01 &&
        buf[2] === 0x00 &&
        buf[3] === 0x00) ||
      (buf[0] === 0x4f && buf[1] === 0x54 && buf[2] === 0x54 && buf[3] === 0x4f)
    ) {
      return "TrueType/OpenType font";
    }
    // ELF executable: \x7fELF
    if (
      buf[0] === 0x7f &&
      buf[1] === 0x45 &&
      buf[2] === 0x4c &&
      buf[3] === 0x46
    ) {
      return "ELF executable/library";
    }
    // Mach-O: 0xFEEDFACE or 0xFEEDFACF (64-bit) or 0xCAFEBABE (universal)
    if (
      (buf[0] === 0xfe &&
        buf[1] === 0xed &&
        buf[2] === 0xfa &&
        buf[3] === 0xce) ||
      (buf[0] === 0xfe &&
        buf[1] === 0xed &&
        buf[2] === 0xfa &&
        buf[3] === 0xcf) ||
      (buf[0] === 0xca && buf[1] === 0xfe && buf[2] === 0xba && buf[3] === 0xbe)
    ) {
      return "Mach-O executable/library";
    }
    // PE/Windows executable: "MZ"
    if (buf[0] === 0x4d && buf[1] === 0x5a) {
      return "Windows PE executable/DLL";
    }
    // WebAssembly: "\0asm"
    if (
      buf[0] === 0x00 &&
      buf[1] === 0x61 &&
      buf[2] === 0x73 &&
      buf[3] === 0x6d
    ) {
      return "WebAssembly binary";
    }
    // DWG (AutoCAD): starts with "AC10"
    if (
      buf[0] === 0x41 &&
      buf[1] === 0x43 &&
      buf[2] === 0x31 &&
      buf[3] === 0x30
    ) {
      return "AutoCAD DWG drawing";
    }
    // BZ2: "BZ" + 'h'
    if (buf[0] === 0x42 && buf[1] === 0x5a && buf[2] === 0x68) {
      return "BZip2 compressed archive";
    }
    // XZ: 0xFD + "7zXZ"
    if (
      buf.length >= 6 &&
      buf[0] === 0xfd &&
      buf[1] === 0x37 &&
      buf[2] === 0x7a &&
      buf[3] === 0x58 &&
      buf[4] === 0x5a &&
      buf[5] === 0x00
    ) {
      return "XZ compressed archive";
    }
    // 7z: "7z" + BC AF 27 1C
    if (
      buf.length >= 6 &&
      buf[0] === 0x37 &&
      buf[1] === 0x7a &&
      buf[2] === 0xbc &&
      buf[3] === 0xaf &&
      buf[4] === 0x27 &&
      buf[5] === 0x1c
    ) {
      return "7-Zip archive";
    }
    // ISO 9660: "CD001" at offset 32769
    if (
      buf.length > 32773 &&
      buf.subarray(32769, 32774).toString("ascii") === "CD001"
    ) {
      return "ISO 9660 disc image";
    }
    // Apache Parquet: "PAR1"
    if (
      buf[0] === 0x50 &&
      buf[1] === 0x41 &&
      buf[2] === 0x52 &&
      buf[3] === 0x31
    ) {
      return "Apache Parquet data file";
    }
    // Protocol Buffers compiled: (no fixed magic, skip)
    // TIFF (already handled as image, but including for completeness)
    if (
      (buf[0] === 0x49 &&
        buf[1] === 0x49 &&
        buf[2] === 0x2a &&
        buf[3] === 0x00) ||
      (buf[0] === 0x4d && buf[1] === 0x4d && buf[2] === 0x00 && buf[3] === 0x2a)
    ) {
      return "TIFF image";
    }
    // ICO: 00 00 01 00
    if (
      buf[0] === 0x00 &&
      buf[1] === 0x00 &&
      buf[2] === 0x01 &&
      buf[3] === 0x00
    ) {
      return "ICO icon image";
    }

    return null;
  }

  /**
   * Extract printable ASCII strings from a binary buffer.
   * Similar to the Unix `strings` utility.
   *
   * @param buf        Buffer to scan
   * @param minLength  Minimum string length to include (default 4)
   * @param maxStrings Maximum number of strings to return (default 50)
   * @returns Array of printable strings found in the binary
   */
  private static extractPrintableStrings(
    buf: Buffer,
    minLength: number = 4,
    maxStrings: number = 50,
  ): string[] {
    const strings: string[] = [];
    let current = "";

    // Only scan first 64KB to avoid huge processing time
    const scanLimit = Math.min(buf.length, 64 * 1024);

    for (let i = 0; i < scanLimit; i++) {
      const byte = buf[i];
      // Printable ASCII range (space through tilde) plus tab
      if ((byte >= 0x20 && byte <= 0x7e) || byte === 0x09) {
        current += String.fromCharCode(byte);
      } else {
        if (current.length >= minLength) {
          strings.push(current);
          if (strings.length >= maxStrings) {
            break;
          }
        }
        current = "";
      }
    }
    // Flush last string
    if (current.length >= minLength && strings.length < maxStrings) {
      strings.push(current);
    }

    return strings;
  }

  /**
   * Route to appropriate processor
   */
  private static async processFile(
    content: Buffer,
    detection: FileDetectionResult,
    options?: CSVProcessorOptions,
    provider?: string,
    videoOptions?: VideoProcessorOptions,
  ): Promise<FileProcessingResult> {
    switch (detection.type) {
      case "csv":
        // Pass original extension through to CSV processor; if detection has none,
        // fall back to any extension provided in csvOptions.
        return await CSVProcessor.process(content, {
          ...options,
          extension: detection.extension ?? options?.extension,
        });
      case "image":
        return await ImageProcessor.process(content);
      case "pdf":
        return await PDFProcessor.process(content, { provider });
      case "svg":
        // SVG is processed as text content (sanitized XML markup)
        // AI providers don't support SVG as image format, so we extract text content
        return await FileDetector.processSvgAsText(content, detection);
      case "video":
        return await FileDetector.processVideoFile(
          content,
          detection,
          videoOptions,
        );
      case "audio":
        return await FileDetector.processAudioFile(content, detection);
      case "archive":
        return await FileDetector.processArchiveFile(content, detection);
      case "xlsx":
        return await FileDetector.processXlsxFile(content, detection);
      case "docx":
        return await FileDetector.processDocxFile(content, detection);
      case "pptx":
        return await FileDetector.processPptxFile(content, detection);
      case "text":
        return {
          type: "text",
          content: content.toString("utf-8"),
          mimeType: detection.mimeType || "text/plain",
          metadata: detection.metadata,
        };
      default: {
        // Graceful degradation: try to treat unknown types as text if content is valid UTF-8
        const unknownContent = content.toString("utf-8");
        if (FileDetector.isValidText(unknownContent)) {
          logger.warn(
            `[FileDetector] Unknown type "${detection.type}", treating as text`,
          );
          return {
            type: "text",
            content: unknownContent,
            mimeType: detection.mimeType || "text/plain",
            metadata: detection.metadata,
          };
        }
        // Binary file that we can't fully process — extract what we can
        // (metadata, printable strings, signature identification)
        const filename = detection.metadata.filename || "file";
        logger.warn(
          `[FileDetector] Unknown binary type "${detection.type}", extracting metadata for "${filename}"`,
        );
        return {
          type: "unknown",
          content: FileDetector.extractBinaryMetadata(
            content,
            detection,
            filename,
          ),
          mimeType: detection.mimeType || "application/octet-stream",
          metadata: detection.metadata,
        };
      }
    }
  }

  /**
   * Process video file: extract metadata, keyframes, and subtitles via VideoProcessor
   */
  private static async processVideoFile(
    content: Buffer,
    detection: FileDetectionResult,
    videoOptions?: VideoProcessorOptions,
  ): Promise<FileProcessingResult> {
    const videoFilename = detection.metadata.filename || "video";
    try {
      const videoResult = await (
        await getVideoProcessor()
      ).processFile(
        {
          id: videoFilename,
          name: videoFilename,
          mimetype: detection.mimeType || "video/mp4",
          size: content.length,
          buffer: content,
        },
        // #478: carry the caller's keyframe budget/quality/format through to
        // the processor; previously these stopped at the CLI layer.
        videoOptions,
      );
      if (videoResult.success && videoResult.data) {
        return {
          type: "video",
          content:
            videoResult.data.textContent ||
            FileDetector.formatInformativePlaceholder(
              "Video",
              videoFilename,
              content,
              detection,
            ),
          mimeType: detection.mimeType,
          images:
            videoResult.data.keyframes && videoResult.data.keyframes.length > 0
              ? videoResult.data.keyframes
              : undefined,
          metadata: {
            ...detection.metadata,
            frameCount: videoResult.data.frameCount,
            hasKeyframes: videoResult.data.hasKeyframes,
          },
        };
      }
    } catch (videoError) {
      logger.warn(
        `[FileDetector] VideoProcessor failed for ${videoFilename}, using fallback`,
        videoError instanceof Error ? videoError.message : String(videoError),
      );
      return {
        type: "video",
        content: FileDetector.formatInformativePlaceholder(
          "Video",
          videoFilename,
          content,
          detection,
          videoError,
        ),
        mimeType: detection.mimeType,
        metadata: detection.metadata,
      };
    }
    // Fallback if processor returned no data
    return {
      type: "video",
      content: FileDetector.formatInformativePlaceholder(
        "Video",
        videoFilename,
        content,
        detection,
      ),
      mimeType: detection.mimeType,
      metadata: detection.metadata,
    };
  }

  /**
   * Process audio file: extract metadata, tags, and cover art via AudioProcessor
   */
  private static async processAudioFile(
    content: Buffer,
    detection: FileDetectionResult,
  ): Promise<FileProcessingResult> {
    const audioFilename = detection.metadata.filename || "audio";
    try {
      const audioResult = await (
        await getAudioProcessor()
      ).processFile({
        id: audioFilename,
        name: audioFilename,
        mimetype: detection.mimeType || "audio/mpeg",
        size: content.length,
        buffer: content,
      });
      if (audioResult.success && audioResult.data) {
        return {
          type: "audio",
          content:
            audioResult.data.textContent ||
            FileDetector.formatInformativePlaceholder(
              "Audio",
              audioFilename,
              content,
              detection,
            ),
          mimeType: detection.mimeType,
          // Surface embedded cover art as an image content block
          images: audioResult.data.coverArt
            ? [audioResult.data.coverArt]
            : undefined,
          metadata: detection.metadata,
        };
      }
    } catch (audioError) {
      logger.warn(
        `[FileDetector] AudioProcessor failed for ${audioFilename}, using fallback`,
        audioError instanceof Error ? audioError.message : String(audioError),
      );
      return {
        type: "audio",
        content: FileDetector.formatInformativePlaceholder(
          "Audio",
          audioFilename,
          content,
          detection,
          audioError,
        ),
        mimeType: detection.mimeType,
        metadata: detection.metadata,
      };
    }
    // Fallback if processor returned no data
    return {
      type: "audio",
      content: FileDetector.formatInformativePlaceholder(
        "Audio",
        audioFilename,
        content,
        detection,
      ),
      mimeType: detection.mimeType,
      metadata: detection.metadata,
    };
  }

  /**
   * Process archive file: list contents and extract metadata via ArchiveProcessor
   */
  private static async processArchiveFile(
    content: Buffer,
    detection: FileDetectionResult,
  ): Promise<FileProcessingResult> {
    const archiveFilename = detection.metadata.filename || "archive";
    try {
      const archiveResult = await (
        await getArchiveProcessor()
      ).processFile({
        id: archiveFilename,
        name: archiveFilename,
        mimetype: detection.mimeType || "application/zip",
        size: content.length,
        buffer: content,
      });
      if (archiveResult.success && archiveResult.data) {
        return {
          type: "archive",
          content:
            archiveResult.data.textContent ||
            FileDetector.formatInformativePlaceholder(
              "Archive",
              archiveFilename,
              content,
              detection,
            ),
          mimeType: detection.mimeType,
          metadata: detection.metadata,
        };
      }
    } catch (archiveError) {
      logger.warn(
        `[FileDetector] ArchiveProcessor failed for ${archiveFilename}, using fallback`,
        archiveError instanceof Error
          ? archiveError.message
          : String(archiveError),
      );
      return {
        type: "archive",
        content: FileDetector.formatInformativePlaceholder(
          "Archive",
          archiveFilename,
          content,
          detection,
          archiveError,
        ),
        mimeType: detection.mimeType,
        metadata: detection.metadata,
      };
    }
    // Fallback if processor returned no data
    return {
      type: "archive",
      content: FileDetector.formatInformativePlaceholder(
        "Archive",
        archiveFilename,
        content,
        detection,
      ),
      mimeType: detection.mimeType,
      metadata: detection.metadata,
    };
  }

  /**
   * Process Excel/OpenDocument spreadsheet file via ExcelProcessor or OpenDocumentProcessor
   */
  private static async processXlsxFile(
    content: Buffer,
    detection: FileDetectionResult,
  ): Promise<FileProcessingResult> {
    const xlsxFilename = detection.metadata.filename || "spreadsheet";
    try {
      const ext = detection.extension?.toLowerCase();
      if (ext === "ods") {
        const { openDocumentProcessor } =
          await import("../processors/document/OpenDocumentProcessor.js");
        const odsResult = await openDocumentProcessor.processFile({
          id: xlsxFilename,
          name: xlsxFilename,
          mimetype:
            detection.mimeType ||
            "application/vnd.oasis.opendocument.spreadsheet",
          size: content.length,
          buffer: content,
        });
        if (odsResult.success && odsResult.data) {
          return {
            type: "xlsx",
            content:
              odsResult.data.textContent ||
              FileDetector.formatInformativePlaceholder(
                "Spreadsheet",
                xlsxFilename,
                content,
                detection,
              ),
            mimeType: detection.mimeType,
            metadata: detection.metadata,
          };
        }
      } else {
        const { excelProcessor } =
          await import("../processors/document/ExcelProcessor.js");
        const xlsxResult = await excelProcessor.processFile({
          id: xlsxFilename,
          name: xlsxFilename,
          mimetype:
            detection.mimeType ||
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          size: content.length,
          buffer: content,
        });
        if (xlsxResult.success && xlsxResult.data) {
          // Build text content from worksheets
          const sheets = xlsxResult.data.worksheets || [];
          let textContent = `Spreadsheet: ${sheets.length} sheet(s), ${xlsxResult.data.totalRows} total rows\n`;
          for (const sheet of sheets) {
            textContent += `\n### Sheet: ${sheet.name}\n`;
            textContent += `Columns (${sheet.columnCount}): ${sheet.headers.join(", ")}\n`;
            textContent += `Rows: ${sheet.rowCount}\n`;
            // Include first rows as sample data
            const sampleRows = sheet.rows.slice(0, 20);
            const rowText = sampleRows
              .map((row) => row.map((c) => String(c ?? "")).join("\t"))
              .join("\n");
            if (!rowText) {
              continue;
            }
            textContent += `\nData:\n${sheet.headers.join("\t")}\n${rowText}\n`;
            const remaining = sheet.rowCount - 20;
            if (remaining > 0) {
              textContent += `... (${remaining} more rows)\n`;
            }
          }
          return {
            type: "xlsx",
            content: textContent,
            mimeType: detection.mimeType,
            metadata: detection.metadata,
          };
        }
      }
    } catch (xlsxError) {
      logger.warn(
        `[FileDetector] ExcelProcessor failed for ${xlsxFilename}, using fallback`,
        xlsxError instanceof Error ? xlsxError.message : String(xlsxError),
      );
      return {
        type: "xlsx",
        content: FileDetector.formatInformativePlaceholder(
          "Spreadsheet",
          xlsxFilename,
          content,
          detection,
          xlsxError,
        ),
        mimeType: detection.mimeType,
        metadata: detection.metadata,
      };
    }
    // Fallback if processor returned no data
    return {
      type: "xlsx",
      content: FileDetector.formatInformativePlaceholder(
        "Spreadsheet",
        xlsxFilename,
        content,
        detection,
      ),
      mimeType: detection.mimeType,
      metadata: detection.metadata,
    };
  }

  /**
   * Process Word/OpenDocument/RTF document via WordProcessor, OpenDocumentProcessor, or RtfProcessor
   */
  private static async processDocxFile(
    content: Buffer,
    detection: FileDetectionResult,
  ): Promise<FileProcessingResult> {
    const docxFilename = detection.metadata.filename || "document";
    const ext = detection.extension?.toLowerCase();
    try {
      if (ext === "odt") {
        const { openDocumentProcessor } =
          await import("../processors/document/OpenDocumentProcessor.js");
        const odtResult = await openDocumentProcessor.processFile({
          id: docxFilename,
          name: docxFilename,
          mimetype:
            detection.mimeType || "application/vnd.oasis.opendocument.text",
          size: content.length,
          buffer: content,
        });
        if (odtResult.success && odtResult.data) {
          return {
            type: "docx",
            content:
              odtResult.data.textContent ||
              FileDetector.formatInformativePlaceholder(
                "Document",
                docxFilename,
                content,
                detection,
              ),
            mimeType: detection.mimeType,
            metadata: detection.metadata,
          };
        }
      } else if (ext === "rtf") {
        const { rtfProcessor } =
          await import("../processors/document/RtfProcessor.js");
        const rtfResult = await rtfProcessor.processFile({
          id: docxFilename,
          name: docxFilename,
          mimetype: detection.mimeType || "application/rtf",
          size: content.length,
          buffer: content,
        });
        if (rtfResult.success && rtfResult.data) {
          return {
            type: "docx",
            content:
              rtfResult.data.textContent ||
              FileDetector.formatInformativePlaceholder(
                "Document",
                docxFilename,
                content,
                detection,
              ),
            mimeType: detection.mimeType,
            metadata: detection.metadata,
          };
        }
      } else {
        const { wordProcessor } =
          await import("../processors/document/WordProcessor.js");
        const docxResult = await wordProcessor.processFile({
          id: docxFilename,
          name: docxFilename,
          mimetype:
            detection.mimeType ||
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          size: content.length,
          buffer: content,
        });
        if (docxResult.success && docxResult.data) {
          return {
            type: "docx",
            content:
              docxResult.data.textContent ||
              FileDetector.formatInformativePlaceholder(
                "Document",
                docxFilename,
                content,
                detection,
              ),
            mimeType: detection.mimeType,
            metadata: detection.metadata,
          };
        }
      }
    } catch (docxError) {
      logger.warn(
        `[FileDetector] Document processor failed for ${docxFilename}, using fallback`,
        docxError instanceof Error ? docxError.message : String(docxError),
      );
      return {
        type: "docx",
        content: FileDetector.formatInformativePlaceholder(
          "Document",
          docxFilename,
          content,
          detection,
          docxError,
        ),
        mimeType: detection.mimeType,
        metadata: detection.metadata,
      };
    }
    // Fallback if processor returned no data
    return {
      type: "docx",
      content: FileDetector.formatInformativePlaceholder(
        "Document",
        docxFilename,
        content,
        detection,
      ),
      mimeType: detection.mimeType,
      metadata: detection.metadata,
    };
  }

  /**
   * Process PowerPoint/OpenDocument presentation via PptxProcessor
   */
  private static async processPptxFile(
    content: Buffer,
    detection: FileDetectionResult,
  ): Promise<FileProcessingResult> {
    const pptxFilename = detection.metadata.filename || "presentation";
    try {
      // ODP is an OpenDocument package, not OOXML — the PPTX reader finds no
      // ppt/slides parts in it and returns nothing. It reaches this branch at
      // all because one routing type ("pptx") covers every presentation
      // format, the same way "docx" covers .odt.
      if (detection.extension?.toLowerCase() === "odp") {
        const { openDocumentProcessor } =
          await import("../processors/document/OpenDocumentProcessor.js");
        // Bounded per the project's async-timeout guideline: this unzips and
        // parses attacker-supplied bytes, and a stalled parse would otherwise
        // hold the request open with no ceiling. On timeout the throw lands in
        // this block's existing catch, which degrades to the placeholder.
        const odpResult = await withTimeout(
          openDocumentProcessor.processFile({
            id: pptxFilename,
            name: pptxFilename,
            mimetype:
              detection.mimeType ||
              "application/vnd.oasis.opendocument.presentation",
            size: content.length,
            buffer: content,
          }),
          FileDetector.DEFAULT_DOCUMENT_TIMEOUT,
        );
        // Gated on success rather than on text, because a presentation of
        // nothing but images is a legitimate ODP that extracts to an empty
        // string. Requiring text sent that file on to the PPTX reader, which
        // cannot read OpenDocument at all — so a successful extraction was
        // discarded in favour of a guaranteed failure. Matches how the ODT and
        // ODS branches degrade.
        if (odpResult.success && odpResult.data) {
          return {
            type: "pptx",
            content:
              odpResult.data.textContent ||
              FileDetector.formatInformativePlaceholder(
                "Presentation",
                pptxFilename,
                content,
                detection,
              ),
            mimeType: detection.mimeType,
            metadata: detection.metadata,
          };
        }
      }
      const { PptxProcessor } =
        await import("../processors/document/PptxProcessor.js");
      const pptxResult = await PptxProcessor.extractText(content);
      if (pptxResult) {
        return {
          type: "pptx",
          content: pptxResult,
          mimeType: detection.mimeType,
          metadata: detection.metadata,
        };
      }
    } catch (pptxError) {
      logger.warn(
        `[FileDetector] PptxProcessor failed for ${pptxFilename}, using fallback`,
        pptxError instanceof Error ? pptxError.message : String(pptxError),
      );
      return {
        type: "pptx",
        content: FileDetector.formatInformativePlaceholder(
          "Presentation",
          pptxFilename,
          content,
          detection,
          pptxError,
        ),
        mimeType: detection.mimeType,
        metadata: detection.metadata,
      };
    }
    // Fallback if processor returned no content
    return {
      type: "pptx",
      content: FileDetector.formatInformativePlaceholder(
        "Presentation",
        pptxFilename,
        content,
        detection,
      ),
      mimeType: detection.mimeType,
      metadata: detection.metadata,
    };
  }

  /**
   * Process SVG file as text content
   * Uses SvgProcessor for security sanitization (removes XSS vectors)
   * Returns sanitized SVG markup as text for AI analysis
   */
  private static async processSvgAsText(
    content: Buffer,
    detection: FileDetectionResult,
  ): Promise<FileProcessingResult> {
    try {
      // Dynamic import to avoid circular dependencies
      const { processSvg } =
        await import("../processors/markup/SvgProcessor.js");

      const result = await processSvg({
        id: "svg-file",
        name: detection.metadata.filename || "image.svg",
        mimetype: "image/svg+xml",
        size: content.length,
        buffer: content,
      });

      if (result.success && result.data) {
        logger.info(
          `[FileDetector] SVG processed as text: ${detection.metadata.filename || "image.svg"}`,
        );
        return {
          type: "svg",
          content: result.data.textContent, // Sanitized SVG content
          mimeType: "image/svg+xml",
          metadata: {
            confidence: detection.metadata.confidence,
            size: content.length,
            filename: detection.metadata.filename,
            extension: detection.extension,
          },
        };
      } else {
        // Fail closed: return safe empty SVG instead of raw unsanitized content
        logger.warn(
          `[FileDetector] SVG processor failed, returning safe empty SVG: ${result.error?.userMessage}`,
        );
        return {
          type: "svg",
          content: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
          mimeType: "image/svg+xml",
          metadata: {
            confidence: detection.metadata.confidence,
            size: content.length,
            filename: detection.metadata.filename,
            extension: detection.extension,
          },
        };
      }
    } catch (error) {
      // Fail closed: return safe empty SVG instead of raw unsanitized content
      logger.warn(
        `[FileDetector] SVG processor not available, returning safe empty SVG: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        type: "svg",
        content: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
        mimeType: "image/svg+xml",
        metadata: {
          confidence: detection.metadata.confidence,
          size: content.length,
          filename: detection.metadata.filename,
          extension: detection.extension,
        },
      };
    }
  }

  /**
   * Load file from URL with automatic retry on transient network errors
   */
  private static async loadFromURL(
    url: string,
    options?: FileDetectorOptions,
  ): Promise<Buffer> {
    const maxSize = options?.maxSize || 200 * 1024 * 1024; // 200MB default (matches Curator memory-safety cap)
    const timeout = options?.timeout || FileDetector.DEFAULT_NETWORK_TIMEOUT;

    // #317: pre-flight HEAD to reject an oversized file BEFORE downloading any
    // body. content-length is advisory (chunked responses omit it), so a
    // missing/invalid header — or a server that refuses HEAD — falls through to
    // the streaming byte guard below; only a genuine oversize rejection stops
    // the GET from ever running.
    //
    // #323: skip the pre-flight entirely when this exact URL was recently seen
    // (its Content-Type is still cached, whether from a prior loadFromURL GET
    // or a MimeTypeStrategy HEAD) — issuing a fresh HEAD here would defeat the
    // whole point of that cache. The streaming byte guard in the GET below
    // still enforces maxSize even without a pre-flight, so this doesn't remove
    // the oversize protection — it only skips the redundant round-trip for a
    // URL we've already been talking to within the last 60s.
    if (getCachedUrlContentType(url, Date.now()) === undefined) {
      try {
        const head = await request(url, {
          dispatcher: redirectFollowingDispatcher(5),
          method: "HEAD",
          headersTimeout: FileDetector.DEFAULT_HEAD_TIMEOUT,
          bodyTimeout: FileDetector.DEFAULT_HEAD_TIMEOUT,
        });
        // Drain/close the (empty) HEAD body so the connection can be reused.
        await head.body.dump();
        // Only trust `content-length` on a genuine 2xx response. A non-2xx
        // HEAD (redirect the dispatcher didn't follow, 403/404/405 "HEAD not
        // allowed", 5xx, …) can still carry a stale/irrelevant
        // `content-length` header — enforcing size off of that would reject
        // (or silently pass) based on the wrong body. Treat any non-2xx HEAD
        // as if the header were missing and fall through to the streaming
        // GET guard below, which enforces maxSize independently either way.
        if (head.statusCode >= 200 && head.statusCode < 300) {
          const declaredLength = Number(head.headers["content-length"]);
          if (Number.isFinite(declaredLength) && declaredLength > maxSize) {
            throw new Error(
              `File too large: ${formatFileSize(declaredLength)} (max: ${formatFileSize(maxSize)})`,
            );
          }
        }
      } catch (error) {
        if (error instanceof Error && /File too large/.test(error.message)) {
          throw error;
        }
        logger.debug(
          `[FileDetector] HEAD pre-flight skipped for ${redactUrlForError(url)}: ${
            sanitizeErrorCause(error).message
          }`,
        );
      }
    }

    return withRetry(
      async () => {
        try {
          const response = await request(url, {
            dispatcher: redirectFollowingDispatcher(5),
            method: "GET",
            headersTimeout: timeout,
            bodyTimeout: timeout,
          });

          if (response.statusCode !== 200) {
            // Query string / fragment stripped — a presigned URL's token must
            // not be echoed into a thrown error.
            throw new Error(
              `HTTP ${response.statusCode} fetching ${redactUrlForError(url)}`,
            );
          }

          // #323: cache the Content-Type from this GET so a subsequent detection
          // of the same URL needs no HEAD.
          setCachedUrlContentType(
            url,
            (response.headers["content-type"] as string) || "",
            Date.now(),
          );

          const chunks: Buffer[] = [];
          let totalSize = 0;

          for await (const chunk of response.body) {
            totalSize += chunk.length;
            if (totalSize > maxSize) {
              throw new Error(
                `File too large: ${formatFileSize(totalSize)} (max: ${formatFileSize(maxSize)})`,
              );
            }
            chunks.push(chunk);
          }

          return Buffer.concat(chunks);
        } catch (error) {
          // Node/undici DNS, TLS, and connect-timeout errors embed the full
          // request URL (including a presigned query token) in
          // `error.message`. Redact into a NEW error instead of mutating the
          // original in place, so anything that still holds a reference to
          // the original — debug logs, telemetry spans, upstream callers —
          // keeps seeing the real message. `.code` is copied onto the new
          // error so `isRetryableNetworkError`'s retry check in the outer
          // `withRetry` catch still classifies it correctly. The raw
          // original error is NEVER attached as `cause` — that would leave
          // the unredacted URL reachable via `error.cause.message` for
          // anything that walks the cause chain (cause-aware logging,
          // telemetry). `cause` instead gets its own sanitized copy.
          // `sanitizeErrorCause` handles non-`Error` thrown values too (a raw
          // string/object can just as easily carry the full URL), so there is
          // no unconditional `throw error` fallback that would bypass
          // redaction for that case.
          const cause = sanitizeErrorCause(error);
          const redacted = new Error(cause.message, { cause });
          redacted.name = cause.name;
          const code = (cause as NodeJS.ErrnoException).code;
          if (code !== undefined) {
            (redacted as NodeJS.ErrnoException).code = code;
          }
          throw redacted;
        }
      },
      {
        maxRetries: options?.maxRetries ?? 3,
        baseDelayMs: options?.retryDelay ?? 1000,
        shouldRetry: isRetryableNetworkError,
      },
    );
  }

  /**
   * Load file from filesystem path
   */
  private static async loadFromPath(
    filePath: string,
    options?: FileDetectorOptions,
  ): Promise<Buffer> {
    const maxSize = options?.maxSize || 200 * 1024 * 1024; // 200MB default (matches Curator memory-safety cap)

    // Reject NUL-byte injection outright (a classic path-truncation vector).
    if (filePath.includes("\0")) {
      throw new Error("Invalid file path: contains a null byte");
    }

    // Optional sandbox: when a base dir is configured (servers accepting paths
    // from untrusted callers), reject anything that resolves outside it. Real
    // paths are resolved (symlinks followed) on BOTH sides so a symlink inside
    // the base dir pointing outside cannot bypass containment. The
    // path.relative check (not a string prefix) correctly handles the root dir
    // ("/") and sibling-prefix ("/app" vs "/app-evil") edge cases.
    //
    // The actual open() below MUST target this validated `real` path, not the
    // original `filePath` — otherwise a symlink swapped between the realpath()
    // check and the open() call routes the read outside the sandbox even
    // though validation passed (TOCTOU). With no sandbox configured there's no
    // boundary to defend, so the original path is used as given.
    let pathToOpen = filePath;
    if (options?.allowedBaseDir) {
      let base: string;
      let real: string;
      try {
        base = await realpath(resolvePath(options.allowedBaseDir));
        real = await realpath(filePath);
      } catch (error) {
        // Full path stays in the debug log; the thrown (potentially
        // client-facing) error only gets the basename to avoid leaking the
        // host's directory layout to an untrusted caller. The cause is
        // sanitized too — Node's realpath ENOENT/EACCES messages embed the
        // full path verbatim, which would otherwise survive on the cause
        // chain (cause-aware logging, telemetry) even though the outer
        // message is already redacted.
        logger.debug("loadFromPath: realpath resolution failed", {
          filePath,
          error,
        });
        // Assigned to a variable before the throw (rather than an inline
        // `{ cause: sanitizeErrorCause(...) }`) so the sanitized, path-redacted
        // copy is unambiguously the attached cause — the raw `error`, whose
        // message still embeds the full path, is never reachable from the
        // thrown result.
        const cause = sanitizeErrorCause(error, { filePath });
        const denied = new Error(
          `Access denied: "${basename(filePath)}" could not be resolved within the allowed base directory`,
          { cause },
        );
        throw denied;
      }
      const rel = relativePath(base, real);
      if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolutePath(rel)) {
        logger.debug("loadFromPath: path resolves outside allowed base dir", {
          filePath,
          real,
        });
        throw new Error(
          `Access denied: "${basename(filePath)}" resolves outside the allowed base directory`,
        );
      }
      pathToOpen = real;
    }

    // Open a handle and stat/read through the SAME descriptor so a symlink
    // swap between the size check and the read cannot occur (TOCTOU).
    let handle: Awaited<ReturnType<typeof open>>;
    try {
      handle = await open(pathToOpen, "r");
    } catch (error) {
      // A failed open (ENOENT/EACCES/…) embeds the opened path verbatim in
      // its message. When a sandbox is configured `pathToOpen` is the
      // realpath-resolved target (`real`), which differs from both `filePath`
      // and its resolved form — so redact `pathToOpen` specifically, or the
      // full host path would survive on both the thrown message and the cause
      // chain despite this PR's path-redaction hardening.
      const cause = sanitizeErrorCause(error, { filePath: pathToOpen });
      const failed = new Error(cause.message, { cause });
      failed.name = cause.name;
      const code = (cause as NodeJS.ErrnoException).code;
      if (code !== undefined) {
        (failed as NodeJS.ErrnoException).code = code;
      }
      throw failed;
    }
    try {
      const statInfo = await handle.stat();
      if (!statInfo.isFile()) {
        throw new Error(`Not a file: ${basename(filePath)}`);
      }
      if (statInfo.size > maxSize) {
        throw new Error(
          `File too large: ${basename(filePath)} is ${formatFileSize(statInfo.size)} (max: ${formatFileSize(maxSize)})`,
        );
      }
      return await handle.readFile();
    } finally {
      await handle.close();
    }
  }

  /**
   * Load file from data URI
   */
  private static loadFromDataURI(dataUri: string): Buffer {
    const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      throw new Error(
        `Invalid data URI format (expected "data:<mime>;base64,<data>"): "${dataUri.slice(0, 32)}…"`,
      );
    }
    return Buffer.from(match[2], "base64");
  }
}

/**
 * Resolve an extension to a routing {@link FileType}.
 *
 * Consults, in order:
 *   1. the canonical file-type registry — every image / audio / video /
 *      document / data / archive format;
 *   2. the text, markup and config MIME map;
 *   3. `LANGUAGE_MAP`, which already enumerates ~200 source-code extensions.
 *
 * (3) is why this is a function rather than a table: source code was
 * previously a third hand-written list inside the detector covering roughly a
 * quarter of the languages the code processor already knew about, so a `.zig`
 * or `.erl` file was "unknown" and fell through to content heuristics.
 *
 * Returns undefined when the extension is not recognised at all.
 */
function resolveFileTypeForExtension(ext: string): FileType | undefined {
  const registryType = fileTypeForExtension(ext);
  if (registryType) {
    return registryType;
  }
  const normalized = normalizeExtension(ext);
  if (
    TEXT_EXTENSION_MIME_MAP[normalized] ||
    LANGUAGE_MAP[normalized] ||
    (CONFIG_EXTENSIONS as readonly string[]).includes(normalized)
  ) {
    return "text";
  }
  return undefined;
}

/**
 * Bytes read from the head of a file when running magic-byte detection against
 * a path.
 *
 * 4 KB rather than a few dozen: the largest consumers are the M2TS sync check
 * (three 192-byte packets), the ASF stream-type GUID (which sits past the
 * header object), and the OOXML sniff, which looks for `xl/`, `word/` or
 * `ppt/` entry names inside a ZIP directory. Still a single small read, and
 * far cheaper than the whole-file read the content heuristics would otherwise
 * perform.
 */
const MAGIC_BYTES_HEADER_SIZE = 4096;

/**
 * ASF stream-type GUIDs, little-endian as stored in the file.
 *
 * `.wmv` and `.wma` share the same container signature, so the container alone
 * cannot say which modality a file is. These GUIDs appear in the stream
 * properties object and do.
 */
const ASF_VIDEO_MEDIA_GUID = Buffer.from(
  "c0ef19bc4d5bcf11a8fd00805f5c442b",
  "hex",
);
const ASF_AUDIO_MEDIA_GUID = Buffer.from(
  "409e69f84d5bcf11a8fd00805f5c442b",
  "hex",
);

/**
 * Identify an OOXML or OpenDocument package inside a ZIP.
 *
 * Every Office format is a ZIP, so the ZIP signature alone routes .xlsx, .docx,
 * .pptx and .odt to the archive processor whenever no filename is available —
 * which is exactly the shape of a Slack or API upload that arrives as a bare
 * Buffer. Reading the entry names recovers the real type.
 *
 * ODF is exact: the spec requires a `mimetype` entry stored first and
 * uncompressed, so the media type is literally in the bytes. OOXML has no such
 * guarantee, so its part prefixes (`xl/`, `word/`, `ppt/`) are matched instead,
 * gated on `[Content_Types].xml` being present so a plain ZIP that happens to
 * contain a folder called `word/` is not misread.
 *
 * Returns null when the ZIP is inconclusive, leaving the archive fallback and
 * the extension to decide.
 */
function detectZipPackageType(
  input: Buffer,
): { type: FileType; mimeType: string } | null {
  const head = input.toString("latin1", 0, Math.min(input.length, 4096));

  // ODF: the mimetype string follows the stored "mimetype" entry name directly.
  const odfMatch = head.match(
    /mimetype(application\/vnd\.oasis\.opendocument\.[a-z-]+)/,
  );
  if (odfMatch) {
    const mimeType = odfMatch[1];
    const entry = lookupByMimeType(mimeType);
    if (entry) {
      return { type: entry.fileType, mimeType };
    }
  }

  if (!head.includes("[Content_Types].xml")) {
    return null;
  }
  for (const [prefix, mimeType] of [
    [
      "xl/",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    [
      "word/",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    [
      "ppt/",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
  ] as const) {
    if (head.includes(prefix)) {
      const entry = lookupByMimeType(mimeType);
      if (entry) {
        return { type: entry.fileType, mimeType };
      }
    }
  }
  return null;
}

/**
 * Strategy 1: Magic Bytes Detection (95% confidence)
 * Detects file type from binary file headers
 */
class MagicBytesStrategy implements DetectionStrategy {
  async detect(input: FileInput): Promise<FileDetectionResult> {
    const buffer = await MagicBytesStrategy.resolveBuffer(input);
    if (!buffer) {
      return this.unknown();
    }
    return this.detectFromBuffer(buffer);
  }

  /**
   * Obtain the header bytes to inspect.
   *
   * Buffers are used directly. For a filesystem path we read only the first
   * {@link MAGIC_BYTES_HEADER_SIZE} bytes — this strategy previously bailed out
   * for anything that was not already a Buffer, which meant a path was
   * classified by its extension alone and any file whose extension was missing,
   * wrong or ambiguous fell through to the content heuristics. Those heuristics
   * `readFile()` the *entire* file, so detecting a 500 MB video used to read
   * 500 MB into memory to conclude nothing; now it reads
   * {@link MAGIC_BYTES_HEADER_SIZE} bytes and returns.
   *
   * URLs and data URIs are left alone: a URL would need a network round-trip
   * (the MIME strategy handles it), and a data URI already carries its type.
   */
  private static async resolveBuffer(
    input: FileInput,
  ): Promise<Buffer | undefined> {
    if (Buffer.isBuffer(input)) {
      return input;
    }
    if (
      typeof input !== "string" ||
      input.startsWith("data:") ||
      input.startsWith("http://") ||
      input.startsWith("https://")
    ) {
      return undefined;
    }
    let handle: Awaited<ReturnType<typeof open>> | undefined;
    try {
      handle = await open(input, "r");
      const header = Buffer.alloc(MAGIC_BYTES_HEADER_SIZE);
      const { bytesRead } = await handle.read(header, 0, header.length, 0);
      return bytesRead > 0 ? header.subarray(0, bytesRead) : undefined;
    } catch {
      // Not a readable path (nonexistent, a directory, permission denied).
      // Detection continues with the remaining strategies.
      return undefined;
    } finally {
      await handle?.close().catch(() => undefined);
    }
  }

  private detectFromBuffer(input: Buffer): FileDetectionResult {
    if (this.isPNG(input)) {
      return this.result("image", "image/png", 95);
    }
    if (this.isJPEG(input)) {
      return this.result("image", "image/jpeg", 95);
    }
    if (this.isGIF(input)) {
      return this.result("image", "image/gif", 95);
    }
    if (this.isWebP(input)) {
      return this.result("image", "image/webp", 95);
    }
    if (input.length >= 2 && input[0] === 0x42 && input[1] === 0x4d) {
      return this.result("image", "image/bmp", 95);
    }
    if (
      input.length >= 4 &&
      ((input[0] === 0x49 &&
        input[1] === 0x49 &&
        input[2] === 0x2a &&
        input[3] === 0x00) ||
        (input[0] === 0x4d &&
          input[1] === 0x4d &&
          input[2] === 0x00 &&
          input[3] === 0x2a))
    ) {
      return this.result("image", "image/tiff", 95);
    }
    if (
      input.length >= 4 &&
      input[0] === 0x00 &&
      input[1] === 0x00 &&
      input[2] === 0x01 &&
      input[3] === 0x00 &&
      !hasFtypBoxSignature(input)
    ) {
      return this.result("image", "image/x-icon", 95);
    }
    if (this.isPDF(input)) {
      return this.result("pdf", "application/pdf", 95);
    }

    // ISO-BMFF ("ftyp" at offset 4): MP4 video, QuickTime MOV, or M4A/M4B/M4P
    // audio all share this box — disambiguate by the major brand at offset 8-11,
    // otherwise an .m4a audio file is misrouted to the video pipeline.
    if (hasFtypBoxSignature(input)) {
      const brand = input.length >= 12 ? input.toString("latin1", 8, 12) : "";
      // AVIF images share the ISO-BMFF ftyp box with MP4/MOV; the major brand
      // ('avif' still, 'avis' sequence, 'avio' intra-only AV1 image/sequence
      // — spec-listed under compatible_brands but also emitted as
      // major_brand by real encoders) distinguishes them. Detect before the
      // audio/video branches so an AVIF buffer isn't misrouted to the video
      // pipeline (#286).
      const imageMimeType = detectIsoBmffImageMimeType(input);
      if (imageMimeType) {
        return this.result("image", imageMimeType, 95);
      }
      if (/^(M4A|M4B|M4P|F4A|F4B)/.test(brand)) {
        return this.result("audio", "audio/mp4", 95);
      }
      if (brand.startsWith("qt")) {
        return this.result("video", "video/quicktime", 95);
      }
      // 3GPP / 3GPP2 share the ftyp box. Brands are "3gp4".."3gp9", "3gr6",
      // "3gs7", "3ge6" … for 3GPP and "3g2a".."3g2c" for 3GPP2. A 3GPP file can
      // hold audio only (phone voice memos) or audio+video, and the brand does
      // not say which — so this reports video at a confidence *below* the
      // detection threshold, letting a `.3gp`/`.3g2` extension confirm it and
      // an explicit audio mimetype hint override it.
      if (brand.startsWith("3g2")) {
        return this.result("video", "video/3gpp2", 75);
      }
      if (brand.startsWith("3g")) {
        return this.result("video", "video/3gpp", 75);
      }
      return this.result("video", "video/mp4", 95);
    }
    // EBML container (MKV/WebM) — both share the 0x1A45DFA3 header; the DocType
    // string in the header disambiguates WebM from generic Matroska.
    if (
      input.length >= 4 &&
      input[0] === 0x1a &&
      input[1] === 0x45 &&
      input[2] === 0xdf &&
      input[3] === 0xa3
    ) {
      const head = input.toString("latin1", 0, Math.min(input.length, 64));
      if (head.includes("webm")) {
        return this.result("video", "video/webm", 92);
      }
      return this.result("video", "video/x-matroska", 90);
    }
    // AVI: "RIFF" + "AVI "
    if (
      input.length >= 12 &&
      input[0] === 0x52 &&
      input[1] === 0x49 &&
      input[2] === 0x46 &&
      input[3] === 0x46 &&
      input[8] === 0x41 &&
      input[9] === 0x56 &&
      input[10] === 0x49 &&
      input[11] === 0x20
    ) {
      return this.result("video", "video/x-msvideo", 95);
    }
    // WAV: "RIFF" + "WAVE"
    if (
      input.length >= 12 &&
      input[0] === 0x52 &&
      input[1] === 0x49 &&
      input[2] === 0x46 &&
      input[3] === 0x46 &&
      input[8] === 0x57 &&
      input[9] === 0x41 &&
      input[10] === 0x56 &&
      input[11] === 0x45
    ) {
      return this.result("audio", "audio/wav", 95);
    }
    // AIFF / AIFF-C: "FORM" + "AIFF" or "AIFC" at offset 8. Same IFF container
    // shape as RIFF above, big-endian.
    if (
      input.length >= 12 &&
      input.toString("latin1", 0, 4) === "FORM" &&
      (input.toString("latin1", 8, 12) === "AIFF" ||
        input.toString("latin1", 8, 12) === "AIFC")
    ) {
      return this.result("audio", "audio/aiff", 95);
    }
    // ASF container — Windows Media. The header GUID is shared by .wmv (video)
    // and .wma (audio), so the stream-type GUID inside decides. A .wma read
    // from a bare Buffer was reported as video before this lookup existed.
    if (
      input.length >= 4 &&
      input[0] === 0x30 &&
      input[1] === 0x26 &&
      input[2] === 0xb2 &&
      input[3] === 0x75
    ) {
      if (input.includes(ASF_VIDEO_MEDIA_GUID)) {
        return this.result("video", "video/x-ms-wmv", 92);
      }
      if (input.includes(ASF_AUDIO_MEDIA_GUID)) {
        return this.result("audio", "audio/x-ms-wma", 92);
      }
      // Neither GUID within the header slice — report below the detection
      // threshold so an extension, if there is one, still wins.
      return this.result("video", "video/x-ms-asf", 75);
    }
    // FLV: "FLV" + version byte.
    if (
      input.length >= 4 &&
      input.toString("latin1", 0, 3) === "FLV" &&
      input[3] === 0x01
    ) {
      return this.result("video", "video/x-flv", 95);
    }
    // Rich Text Format: "{\rtf".
    if (input.length >= 5 && input.toString("latin1", 0, 5) === "{\\rtf") {
      return this.result("docx", "application/rtf", 92);
    }
    // Core Audio Format: "caff".
    if (input.length >= 4 && input.toString("latin1", 0, 4) === "caff") {
      return this.result("audio", "audio/x-caf", 95);
    }
    // Sun/NeXT audio: ".snd".
    if (input.length >= 4 && input.toString("latin1", 0, 4) === ".snd") {
      return this.result("audio", "audio/basic", 95);
    }
    // MPEG program stream (0x000001BA) and elementary video stream (0x000001B3)
    // — .mpg/.mpeg/.vob. Without this, an MPEG-1 file reached the content
    // heuristics, whose CSV check found consistent delimiter counts in the
    // binary and classified real video as a spreadsheet.
    if (
      input.length >= 4 &&
      input[0] === 0x00 &&
      input[1] === 0x00 &&
      input[2] === 0x01 &&
      (input[3] === 0xba || input[3] === 0xb3)
    ) {
      return this.result("video", "video/mpeg", 95);
    }
    // MPEG-2 transport stream — .ts/.mts/.m2ts. There is no magic number, only
    // a 0x47 sync byte at a fixed stride; requiring three in a row keeps a
    // stray 0x47 from claiming an unrelated file. This is also what rescues
    // `.ts`, whose extension resolves to TypeScript source.
    //
    // Two strides, because BDAV/M2TS prefixes each packet with a 4-byte arrival
    // timestamp: plain TS is 188 bytes from offset 0, M2TS is 192 from offset 4.
    // Checking only the former left every .m2ts undetected from a Buffer.
    if (
      (input.length >= 377 &&
        input[0] === 0x47 &&
        input[188] === 0x47 &&
        input[376] === 0x47) ||
      (input.length >= 389 &&
        input[4] === 0x47 &&
        input[196] === 0x47 &&
        input[388] === 0x47)
    ) {
      return this.result("video", "video/mp2t", 92);
    }
    // MIDI: "MThd"
    if (input.length >= 4 && input.toString("latin1", 0, 4) === "MThd") {
      return this.result("audio", "audio/midi", 95);
    }
    // Monkey's Audio: "MAC " — the trailing space is part of the signature.
    if (input.length >= 4 && input.toString("latin1", 0, 4) === "MAC ") {
      return this.result("audio", "audio/x-ape", 95);
    }
    // WavPack: "wvpk"
    if (input.length >= 4 && input.toString("latin1", 0, 4) === "wvpk") {
      return this.result("audio", "audio/x-wavpack", 95);
    }
    // AMR narrowband ("#!AMR\n") and wideband ("#!AMR-WB\n").
    if (input.length >= 6 && input.toString("latin1", 0, 5) === "#!AMR") {
      return this.result("audio", "audio/amr", 95);
    }
    // JPEG 2000: the full 12-byte signature box, trailing 0D 0A 87 0A
    // included. Those four bytes are a deliberate line-ending probe — CR LF, a
    // high byte, LF — that any transfer which mangles newlines or strips the
    // eighth bit will visibly corrupt, so checking only the length and brand
    // accepts exactly the damaged files the signature exists to reject.
    if (
      input.length >= 12 &&
      input[0] === 0x00 &&
      input[1] === 0x00 &&
      input[2] === 0x00 &&
      input[3] === 0x0c &&
      input.toString("latin1", 4, 8) === "jP  " &&
      input[8] === 0x0d &&
      input[9] === 0x0a &&
      input[10] === 0x87 &&
      input[11] === 0x0a
    ) {
      return this.result("image", "image/jp2", 95);
    }
    // The other shape JPEG 2000 ships in: a bare codestream (.j2k/.j2c) opening
    // with the SOC + SIZ markers. `ImageProcessor.detectImageType` learned both
    // shapes; this strategy knew only the container, so a codestream uploaded
    // as bytes-plus-filename was typed "unknown" and delivered as a binary
    // blob — the codestream branch over there was unreachable from this path.
    if (
      input.length >= 4 &&
      input[0] === 0xff &&
      input[1] === 0x4f &&
      input[2] === 0xff &&
      input[3] === 0x51
    ) {
      return this.result("image", "image/jp2", 95);
    }
    // MP3: ID3 tag
    if (
      input.length >= 3 &&
      input[0] === 0x49 &&
      input[1] === 0x44 &&
      input[2] === 0x33
    ) {
      return this.result("audio", "audio/mpeg", 95);
    }
    // AAC (ADTS): 12-bit syncword 0xFFF with the 2 layer bits == 00. This must be
    // checked before the MP3 sync word below, because an ADTS header also satisfies
    // the looser 11-bit MPEG sync mask and would otherwise be mislabeled audio/mpeg.
    if (input.length >= 2 && input[0] === 0xff && (input[1] & 0xf6) === 0xf0) {
      return this.result("audio", "audio/aac", 85);
    }
    // MP3: sync word (MPEG audio — layer bits are non-zero, unlike ADTS AAC above)
    if (input.length >= 2 && input[0] === 0xff && (input[1] & 0xe0) === 0xe0) {
      return this.result("audio", "audio/mpeg", 80);
    }
    // FLAC: "fLaC"
    if (
      input.length >= 4 &&
      input[0] === 0x66 &&
      input[1] === 0x4c &&
      input[2] === 0x61 &&
      input[3] === 0x43
    ) {
      return this.result("audio", "audio/flac", 95);
    }
    // OGG: "OggS"
    if (
      input.length >= 4 &&
      input[0] === 0x4f &&
      input[1] === 0x67 &&
      input[2] === 0x67 &&
      input[3] === 0x53
    ) {
      // Ogg is a container, not a codec — .ogv (Theora/VP8 video) and .oga/.opus
      // (Vorbis/Opus/FLAC audio) all start "OggS". The codec identifier lives in
      // the first page's payload, so read it rather than assuming audio and
      // routing every Ogg video to the audio processor.
      const firstPage = input.toString(
        "latin1",
        0,
        Math.min(input.length, 128),
      );
      if (firstPage.includes("theora") || firstPage.includes("VP80")) {
        return this.result("video", "video/ogg", 92);
      }
      if (firstPage.includes("OpusHead")) {
        return this.result("audio", "audio/opus", 92);
      }
      return this.result("audio", "audio/ogg", 90);
    }
    // ZIP: "PK\x03\x04"
    // Many document formats (OOXML: .xlsx, .docx, .pptx; ODF: .odt, .ods) are
    // internally ZIP archives and share these magic bytes. Read the entry names
    // first — that identifies the real format even for a bare Buffer with no
    // filename, which previously routed every Office document to the archive
    // processor. An inconclusive ZIP still reports archive at a lower
    // confidence (70%) so the ExtensionStrategy (85%) can override it.
    if (
      input.length >= 4 &&
      input[0] === 0x50 &&
      input[1] === 0x4b &&
      input[2] === 0x03 &&
      input[3] === 0x04
    ) {
      const packaged = detectZipPackageType(input);
      if (packaged) {
        return this.result(packaged.type, packaged.mimeType, 92);
      }
      return this.result("archive", "application/zip", 70);
    }
    // GZIP: 1F 8B
    if (input.length >= 2 && input[0] === 0x1f && input[1] === 0x8b) {
      return this.result("archive", "application/gzip", 90);
    }
    // BZIP2: "BZh" + a compression-level digit.
    if (
      input.length >= 4 &&
      input.toString("latin1", 0, 3) === "BZh" &&
      input[3] >= 0x31 &&
      input[3] <= 0x39
    ) {
      return this.result("archive", "application/x-bzip2", 95);
    }
    // XZ: FD "7zXZ" 00
    if (
      input.length >= 6 &&
      input[0] === 0xfd &&
      input.toString("latin1", 1, 5) === "7zXZ" &&
      input[5] === 0x00
    ) {
      return this.result("archive", "application/x-xz", 95);
    }
    // Zstandard frame magic: 28 B5 2F FD
    if (
      input.length >= 4 &&
      input[0] === 0x28 &&
      input[1] === 0xb5 &&
      input[2] === 0x2f &&
      input[3] === 0xfd
    ) {
      return this.result("archive", "application/zstd", 95);
    }
    // TAR: "ustar" at offset 257, inside the first header block. Checked late
    // because it is a weak, deep signature — anything with its own leading
    // magic number should have matched already.
    if (input.length >= 262 && input.toString("latin1", 257, 262) === "ustar") {
      return this.result("archive", "application/x-tar", 90);
    }
    // 7z: 37 7A BC AF 27 1C
    if (
      input.length >= 6 &&
      input[0] === 0x37 &&
      input[1] === 0x7a &&
      input[2] === 0xbc &&
      input[3] === 0xaf &&
      input[4] === 0x27 &&
      input[5] === 0x1c
    ) {
      return this.result("archive", "application/x-7z-compressed", 95);
    }
    // RAR: "Rar!"
    if (
      input.length >= 4 &&
      input[0] === 0x52 &&
      input[1] === 0x61 &&
      input[2] === 0x72 &&
      input[3] === 0x21
    ) {
      return this.result("archive", "application/x-rar-compressed", 95);
    }
    // SVG is text, so it has no byte signature — but it does have an
    // unambiguous root element. Without this an SVG supplied as a Buffer was
    // classified as generic XML and inlined as raw markup instead of going
    // through the SVG sanitizer, which is the whole reason SVG has its own
    // FileType. Checked last so no binary format can be beaten to it.
    if (looksLikeSvgMarkup(input)) {
      return this.result("svg", "image/svg+xml", 90);
    }

    return this.unknown();
  }

  private isPNG(buf: Buffer): boolean {
    return (
      buf.length >= 4 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47
    );
  }

  private isJPEG(buf: Buffer): boolean {
    return (
      buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
    );
  }

  private isGIF(buf: Buffer): boolean {
    return (
      buf.length >= 4 &&
      buf[0] === 0x47 &&
      buf[1] === 0x49 &&
      buf[2] === 0x46 &&
      buf[3] === 0x38
    );
  }

  private isWebP(buf: Buffer): boolean {
    return (
      buf.length >= 12 &&
      buf.slice(0, 4).toString() === "RIFF" &&
      buf.slice(8, 12).toString() === "WEBP"
    );
  }

  private isPDF(buf: Buffer): boolean {
    return buf.length >= 5 && buf.slice(0, 5).toString() === "%PDF-";
  }

  private result(
    type: FileType,
    mime: string,
    confidence: number,
  ): FileDetectionResult {
    return {
      type,
      mimeType: mime,
      extension: null,
      source: "buffer",
      metadata: { confidence },
    };
  }

  private unknown(): FileDetectionResult {
    return {
      type: "unknown",
      mimeType: "application/octet-stream",
      extension: null,
      source: "buffer",
      metadata: { confidence: 0 },
    };
  }
}

/**
 * Strategy 2: MIME Type Detection (85% confidence)
 * Detects file type from HTTP Content-Type headers
 */
class MimeTypeStrategy implements DetectionStrategy {
  async detect(input: FileInput): Promise<FileDetectionResult> {
    if (typeof input !== "string" || !this.isURL(input)) {
      return this.unknown();
    }

    try {
      // #323: reuse a recently-seen Content-Type for this URL instead of
      // re-issuing a HEAD (populated here and by loadFromURL's GET).
      const now = Date.now();
      let contentType = getCachedUrlContentType(input, now);
      if (contentType === undefined) {
        // Wrap the whole HEAD (request + body drain) in withTimeout so a stalled
        // dump() can't hang detection, per the project's async-timeout guideline.
        contentType = await withTimeout(
          (async () => {
            const response = await request(input, {
              dispatcher: redirectFollowingDispatcher(5),
              method: "HEAD",
              headersTimeout: FileDetector.DEFAULT_HEAD_TIMEOUT,
              bodyTimeout: FileDetector.DEFAULT_HEAD_TIMEOUT,
            });
            await response.body.dump();
            return (response.headers["content-type"] as string) || "";
          })(),
          FileDetector.DEFAULT_HEAD_TIMEOUT,
        );
        setCachedUrlContentType(input, contentType, now);
      }
      const type = this.mimeToFileType(contentType);

      return {
        type,
        mimeType: contentType.split(";")[0].trim(),
        extension: null,
        source: "url",
        metadata: { confidence: type !== "unknown" ? 85 : 0 },
      };
    } catch {
      return this.unknown();
    }
  }

  private mimeToFileType(mime: string): FileType {
    const lower = mime.toLowerCase().split(";")[0].trim();

    // CSV
    if (lower === "text/csv" || lower === "text/tab-separated-values") {
      return "csv";
    }
    // SVG is processed as text/markup, NOT as image
    // Must check before generic image/ check
    if (lower === "image/svg+xml") {
      return "svg";
    }
    // Images
    if (lower.startsWith("image/")) {
      return "image";
    }
    // PDF
    if (lower === "application/pdf") {
      return "pdf";
    }
    // Video
    if (lower.startsWith("video/")) {
      return "video";
    }
    // Audio
    if (lower.startsWith("audio/")) {
      return "audio";
    }

    // Office documents — OOXML
    if (
      lower ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      lower === "application/msword"
    ) {
      return "docx";
    }
    if (
      lower ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      lower === "application/vnd.ms-excel"
    ) {
      return "xlsx";
    }
    if (
      lower ===
        "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      lower === "application/vnd.ms-powerpoint"
    ) {
      return "pptx";
    }
    // OpenDocument formats
    if (lower === "application/vnd.oasis.opendocument.text") {
      return "docx";
    }
    if (lower === "application/vnd.oasis.opendocument.spreadsheet") {
      return "xlsx";
    }
    if (lower === "application/vnd.oasis.opendocument.presentation") {
      return "pptx";
    }
    // RTF
    if (lower === "application/rtf" || lower === "text/rtf") {
      return "docx";
    }

    // Archive formats
    if (
      lower === "application/zip" ||
      lower === "application/x-zip-compressed" ||
      lower === "application/gzip" ||
      lower === "application/x-gzip" ||
      lower === "application/x-tar" ||
      lower === "application/x-compressed-tar" ||
      lower === "application/java-archive" ||
      lower === "application/x-rar-compressed" ||
      lower === "application/vnd.rar" ||
      lower === "application/x-7z-compressed"
    ) {
      return "archive";
    }

    // Text/markup/source code — broad matching
    if (
      lower === "text/plain" ||
      lower === "text/markdown" ||
      lower === "text/html" ||
      lower === "text/css" ||
      lower === "text/javascript" ||
      lower === "text/typescript" ||
      lower === "application/json" ||
      lower === "application/xml" ||
      lower === "text/xml" ||
      lower === "application/yaml" ||
      lower === "application/x-yaml"
    ) {
      return "text";
    }
    // Source code MIME types (text/x-*)
    if (lower.startsWith("text/x-")) {
      return "text";
    }
    // Generic text types we may not have listed explicitly
    if (lower.startsWith("text/")) {
      return "text";
    }

    return "unknown";
  }

  private isURL(str: string): boolean {
    return str.startsWith("http://") || str.startsWith("https://");
  }

  private unknown(): FileDetectionResult {
    return {
      type: "unknown",
      mimeType: "application/octet-stream",
      extension: null,
      source: "buffer",
      metadata: { confidence: 0 },
    };
  }
}

/**
 * Strategy 3: Extension Detection (70% confidence)
 * Detects file type from file extension
 */
class ExtensionStrategy implements DetectionStrategy {
  async detect(input: FileInput): Promise<FileDetectionResult> {
    if (typeof input !== "string") {
      return this.unknown();
    }

    const ext = this.getExtension(input);
    if (!ext) {
      return this.unknown();
    }

    const type = resolveFileTypeForExtension(ext);

    return {
      type: type ?? "unknown",
      mimeType: this.getMimeType(ext),
      extension: ext,
      source: this.detectSource(input),
      metadata: { confidence: type ? 85 : 0 },
    };
  }

  private getExtension(input: string): string | null {
    const normalizedInput = input.trim();
    let extensionSource = normalizedInput;

    if (this.isURL(normalizedInput)) {
      try {
        const url = new URL(normalizedInput);
        extensionSource = url.pathname;
        try {
          extensionSource = decodeURIComponent(extensionSource);
        } catch {
          // Keep the original pathname if the URL contains malformed escapes.
        }
      } catch {
        extensionSource = normalizedInput;
      }
    }

    const match = extensionSource.trim().match(/\.([^.]+)$/);
    if (!match) {
      return null;
    }

    const ext = match[1].split(/[?#]/)[0].toLowerCase();
    return /^[a-z0-9]+$/.test(ext) ? ext : null;
  }

  private isURL(str: string): boolean {
    const normalized = str.trim();
    return (
      normalized.startsWith("http://") || normalized.startsWith("https://")
    );
  }

  private detectSource(input: string): FileSource {
    const normalized = input.trim();
    if (normalized.startsWith("data:")) {
      return "datauri";
    }
    if (this.isURL(normalized)) {
      try {
        new URL(normalized);
        return "url";
      } catch {
        return "path";
      }
    }
    return "path";
  }

  private getMimeType(ext: string): string {
    return getMimeTypeForExtension(ext);
  }

  private unknown(): FileDetectionResult {
    return {
      type: "unknown",
      mimeType: "application/octet-stream",
      extension: null,
      source: "buffer",
      metadata: { confidence: 0 },
    };
  }
}

/**
 * Strategy 4: Content Heuristics (75% confidence)
 * Detects file type by analyzing content patterns
 */
class ContentHeuristicStrategy implements DetectionStrategy {
  async detect(input: FileInput): Promise<FileDetectionResult> {
    let buffer: Buffer;

    if (Buffer.isBuffer(input)) {
      buffer = input;
    } else if (typeof input === "string") {
      // Try to load from file path or data URI
      if (input.startsWith("data:")) {
        // Data URI
        const match = input.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) {
          return this.unknown();
        }
        buffer = Buffer.from(match[2], "base64");
      } else if (input.startsWith("http://") || input.startsWith("https://")) {
        // URL - can't analyze without making HTTP request in ContentHeuristic
        return this.unknown();
      } else {
        // File path - try to load it
        try {
          buffer = await readFile(input);
        } catch {
          return this.unknown();
        }
      }
    } else {
      return this.unknown();
    }

    // Every check below runs on a UTF-8 *decoding* of the bytes, which succeeds
    // for any input — decoding a video yields a string full of replacement
    // characters, and that string can still satisfy a text heuristic. It did:
    // MPEG-1 video decoded to "lines" with a consistent delimiter count and was
    // classified `csv`, then handed to the CSV parser. Reject binary up front so
    // no text heuristic can ever see it.
    if (ContentHeuristicStrategy.looksBinary(buffer)) {
      return this.unknown();
    }

    const sample = buffer.toString("utf-8", 0, Math.min(2000, buffer.length));

    // Check for JSON first (more specific than CSV)
    if (this.looksLikeJSON(sample)) {
      return this.result("text", "application/json", 75);
    }

    // Check CSV after JSON (CSV is more generic)
    if (this.looksLikeCSV(sample)) {
      return this.result("csv", "text/csv", 75);
    }

    // Check for XML/HTML
    if (this.looksLikeXML(sample)) {
      const isHTML =
        sample.includes("<!DOCTYPE html") || sample.includes("<html");
      return this.result("text", isHTML ? "text/html" : "application/xml", 70);
    }

    // Check for YAML
    if (this.looksLikeYAML(sample)) {
      return this.result("text", "application/yaml", 70);
    }

    // Check for plain text (if mostly printable characters)
    if (this.looksLikeText(sample)) {
      return this.result("text", "text/plain", 60);
    }

    return this.unknown();
  }

  /**
   * Whether a buffer holds binary rather than text.
   *
   * Two independent signals, both computed on the same leading sample that the
   * heuristics themselves inspect:
   *
   *   - a NUL byte, which no text encoding this detector supports emits (UTF-16
   *     would, but it is not among the formats handled here and would already
   *     have been caught by its BOM);
   *   - more than 10% control/undecodable bytes, which catches binaries that
   *     happen not to contain a NUL in their first 2 KB.
   *
   * Tab, newline and carriage return are text and excluded from the control
   * count.
   */
  private static looksBinary(buffer: Buffer): boolean {
    const sampleLength = Math.min(2000, buffer.length);
    if (sampleLength === 0) {
      return false;
    }
    let controlBytes = 0;
    for (let i = 0; i < sampleLength; i++) {
      const byte = buffer[i];
      if (byte === 0x00) {
        return true;
      }
      const isTextWhitespace = byte === 0x09 || byte === 0x0a || byte === 0x0d;
      if (!isTextWhitespace && (byte < 0x20 || byte === 0x7f)) {
        controlBytes++;
      }
    }
    return controlBytes / sampleLength > 0.1;
  }

  private looksLikeCSV(text: string): boolean {
    const lines = text.trim().split("\n");
    if (lines.length < 2) {
      return false;
    }

    // Detect delimiter from first line
    const firstLine = lines[0];
    const delimiters = [",", ";", "\t", "|"];
    const delimiter = delimiters.find((d) => firstLine.includes(d));

    // Single-column CSV check (no delimiter)
    if (!delimiter) {
      // Exclude content that looks like other structured formats
      // YAML indicators
      if (
        text.startsWith("---") ||
        /^[\s]*-\s+/m.test(text) ||
        /^[\s]*[a-zA-Z_][a-zA-Z0-9_-]*:\s*/m.test(text)
      ) {
        return false;
      }

      // XML/HTML indicators
      if (text.startsWith("<") || text.includes("<?xml")) {
        return false;
      }

      // JSON indicators
      if (
        (text.startsWith("{") && text.includes("}")) ||
        (text.startsWith("[") && text.includes("]"))
      ) {
        return false;
      }

      // Exclude prose/sentences (look for sentence patterns)
      // Check for multiple words per line (prose indicator)
      const hasProsePattern = lines.some((line) => {
        const words = line.trim().split(/\s+/);
        return words.length > 4; // More than 4 words suggests prose, not data
      });
      if (hasProsePattern) {
        return false;
      }

      // Check for consistent line structure (not binary, reasonable lengths)
      const hasReasonableLengths = lines.every(
        (l) => l.length > 0 && l.length < 1000,
      );
      const noBinaryChars = !text.includes("\0");

      // Single-column CSVs should have VERY uniform line lengths
      // (data values like IDs, codes, numbers - not varied content)
      const lengths = lines.map((l) => l.length);
      const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      const variance =
        lengths.reduce((sum, len) => sum + (len - avgLength) ** 2, 0) /
        lengths.length;
      const stdDev = Math.sqrt(variance);
      // Single-column CSVs can contain varied data (names, cities, emails, etc.)
      // but should still show some consistency compared to random text
      const hasUniformLengths = stdDev / avgLength < 0.75;

      return hasReasonableLengths && noBinaryChars && hasUniformLengths;
    }

    // Count delimiters per line and check consistency. Delimiters inside a
    // double-quoted field are field content, not column separators (RFC 4180) —
    // a naive count inflates rows with quoted delimiters (e.g. `"Smith, John"`),
    // which used to make consistency collapse and reject a valid CSV.
    const counts = lines.map((line) =>
      ContentHeuristicStrategy.countDelimitersOutsideQuotes(line, delimiter),
    );
    const firstCount = counts[0];
    const consistentLines = counts.filter((c) => c === firstCount).length;

    return consistentLines / lines.length >= 0.8;
  }

  /**
   * Count occurrences of `delimiter` in `line` that fall OUTSIDE double-quoted
   * fields, honoring RFC-4180 escaped quotes (`""`). Used by CSV detection so a
   * delimiter embedded in a quoted value is not mistaken for a column break.
   */
  private static countDelimitersOutsideQuotes(
    line: string,
    delimiter: string,
  ): number {
    let count = 0;
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          i++; // escaped quote inside a quoted field — skip the pair
          continue;
        }
        inQuotes = !inQuotes;
      } else if (ch === delimiter && !inQuotes) {
        count++;
      }
    }
    return count;
  }

  private looksLikeJSON(text: string): boolean {
    // hasJsonMarkers now does full validation including JSON.parse
    return hasJsonMarkers(text);
  }

  private looksLikeXML(text: string): boolean {
    const trimmed = text.trim();

    // XML declaration is a definitive marker
    if (trimmed.startsWith("<?xml")) {
      return true;
    }

    // Check for HTML DOCTYPE or tags
    if (
      trimmed.includes("<!DOCTYPE html") ||
      trimmed.toLowerCase().includes("<html")
    ) {
      return true;
    }

    // Strict validation for arbitrary content starting with <:
    // Must have proper tag structure with at least one closing tag
    if (!trimmed.startsWith("<")) {
      return false;
    }

    // Must have valid opening tag structure: <tagname followed by space or >
    // Not just any < character
    const hasValidOpeningTag = /<[a-zA-Z][a-zA-Z0-9-]*(?:\s[^>]*)?>/;
    if (!hasValidOpeningTag.test(trimmed)) {
      return false;
    }

    // Must have at least one closing tag or self-closing tag to be valid XML/HTML
    const hasClosingTag = /<\/[a-zA-Z][a-zA-Z0-9-]*>/.test(trimmed);
    const hasSelfClosingTag =
      /<[a-zA-Z][a-zA-Z0-9-]*(?:\s[^>]*)?\s*\/\s*>/.test(trimmed);

    return hasClosingTag || hasSelfClosingTag;
  }

  private looksLikeYAML(text: string): boolean {
    const trimmed = text.trim();

    if (trimmed.length === 0) {
      return false;
    }

    // For single-line content, be very conservative about YAML detection
    const lines = trimmed.split("\n");
    if (lines.length === 1) {
      // Single line can only be YAML if it's a document marker
      return trimmed === "---" || trimmed === "...";
    }

    // Collect YAML indicators (requires at least 2 for positive detection)
    const indicators: boolean[] = [];

    // Indicator 1: Document start marker (---)
    indicators.push(trimmed.startsWith("---"));

    // Indicator 2: Document end marker (...) or appears within content
    indicators.push(/^\.\.\.$|[\n]\.\.\.$/.test(trimmed));

    // Indicator 3: YAML list items (- followed by space at line start)
    indicators.push(/^[\s]*-\s+[^-]/m.test(trimmed));

    // Indicator 4: Multiple key-value pairs (at least 2)
    // Allow hyphens and underscores in keys, support nested keys
    const keyValuePattern = /^[\s]*[a-zA-Z_][a-zA-Z0-9_-]*:\s*(.+)$/;
    const keyValueMatches = lines.filter((line) =>
      keyValuePattern.test(line),
    ).length;
    indicators.push(keyValueMatches >= 2);

    // Indicator 5: Nested indentation pattern (common in YAML objects/lists)
    let hasNesting = false;
    const sampleLines = lines.slice(0, 10);
    for (let i = 0; i < sampleLines.length - 1; i++) {
      const currentLine = sampleLines[i].trim();
      const nextLine = sampleLines[i + 1];
      if (
        currentLine.length > 0 &&
        nextLine.length > 0 &&
        /[:-]$/.test(currentLine)
      ) {
        const currentIndent = sampleLines[i].match(/^[\s]*/)?.[0].length ?? 0;
        const nextIndent = nextLine.match(/^[\s]*/)?.[0].length ?? 0;
        if (nextIndent > currentIndent) {
          hasNesting = true;
          break;
        }
      }
    }
    indicators.push(hasNesting);

    // Indicator 6: YAML comments (# followed by space)
    indicators.push(/^\s*#\s+/m.test(trimmed));

    // Indicator 7: List continuation (multiple items with - )
    const listItemCount = lines.filter((line) =>
      /^[\s]*-[\s]/.test(line),
    ).length;
    indicators.push(listItemCount >= 2);

    // Indicator 8: Inline maps or complex structures
    indicators.push(/{\s*[a-zA-Z_]/.test(trimmed) || /\[.*\]/.test(trimmed));

    // Require at least 2 indicators for confident YAML detection
    const matchCount = indicators.filter(Boolean).length;
    return matchCount >= 2;
  }

  private looksLikeText(text: string): boolean {
    // Check if content has null bytes (binary indicator)
    if (text.includes("\0")) {
      return false;
    }

    // Count printable characters
    let printable = 0;
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (
        (code >= 32 && code < 127) || // ASCII printable
        code === 9 || // Tab
        code === 10 || // Newline
        code === 13 || // Carriage return
        code > 127 // Unicode
      ) {
        printable++;
      }
    }

    // At least 85% should be printable for text
    return printable / text.length >= 0.85;
  }

  private result(
    type: FileType,
    mime: string,
    confidence: number,
  ): FileDetectionResult {
    return {
      type,
      mimeType: mime,
      extension: null,
      source: "buffer",
      metadata: { confidence },
    };
  }

  private unknown(): FileDetectionResult {
    return {
      type: "unknown",
      mimeType: "application/octet-stream",
      extension: null,
      source: "buffer",
      metadata: { confidence: 0 },
    };
  }
}
