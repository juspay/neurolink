/**
 * File Type Detection Utility
 * Centralized file detection for all multimodal file types
 * Uses multi-strategy approach for reliable type identification
 */

import { readFile, stat } from "fs/promises";
import { getGlobalDispatcher, interceptors, request } from "undici";
import { archiveProcessor } from "../processors/archive/ArchiveProcessor.js";
import { audioProcessor } from "../processors/media/AudioProcessor.js";
import { videoProcessor } from "../processors/media/VideoProcessor.js";
import type {
  CSVProcessorOptions,
  FileDetectionResult,
  FileDetectorOptions,
  FileInput,
  FileProcessingResult,
  FileSource,
  FileType,
} from "../types/fileTypes.js";
import { CSVProcessor } from "./csvProcessor.js";
import { ImageProcessor } from "./imageProcessor.js";
import { logger } from "./logger.js";
import { PDFProcessor } from "./pdfProcessor.js";

/**
 * Default retry configuration constants
 */
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY = 1000; // milliseconds

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
 * Execute an operation with automatic retry logic on transient network errors
 *
 * @param operation - Async function to execute
 * @param options - Retry configuration options
 * @returns Promise resolving to the operation result
 * @throws Error if all retry attempts fail or error is non-retryable
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  options: { maxRetries?: number; retryDelay?: number } = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const retryDelay = options.retryDelay ?? DEFAULT_RETRY_DELAY;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const isRetryable = isRetryableNetworkError(error);
      const isLastAttempt = attempt === maxRetries;

      if (!isRetryable || isLastAttempt) {
        throw error;
      }

      // Calculate exponential backoff delay
      const delay = retryDelay * 2 ** attempt;

      logger.debug("Retrying network operation after transient error", {
        attempt: attempt + 1,
        maxRetries,
        delay,
        error: error instanceof Error ? error.message : String(error),
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // TypeScript exhaustiveness check - should never reach here
  throw new Error("Retry logic failed unexpectedly");
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
 * Detection strategy interface
 */
type DetectionStrategy = {
  detect(input: FileInput): Promise<FileDetectionResult>;
};

/**
 * Centralized file type detection and processing
 *
 * @example
 * ```typescript
 * // Auto-detect and process any file
 * const result = await FileDetector.detectAndProcess("data.csv");
 * console.log(result.type); // 'csv'
 * ```
 */
export class FileDetector {
  // FD-017: Replace hardcoded timeouts with constants.
  // These default ensure consistent timeout behavior across all file-detection logic.
  public static readonly DEFAULT_NETWORK_TIMEOUT = 30000; // 30 seconds
  public static readonly DEFAULT_HEAD_TIMEOUT = 5000; // 5 seconds
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
    const detection = await FileDetector.detect(input, options);

    // FD-018: Comprehensive fallback parsing for extension-less files
    // When file detection returns "unknown" or doesn't match allowedTypes,
    // attempt parsing for each allowed type before failing. This handles cases like Slack
    // files named "file-1", "file-2" without extensions that could be CSV, JSON, or text.
    if (
      options?.allowedTypes &&
      !options.allowedTypes.includes(detection.type)
    ) {
      // Try fallback parsing for both "unknown" types and when detection doesn't match allowed types
      const content = await FileDetector.loadContent(input, detection, options);
      const errors: string[] = [];

      // Try each allowed type in order of specificity
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

      // All fallbacks failed — fall through to processFile() which handles
      // "unknown" types gracefully by extracting binary metadata and printable
      // strings instead of throwing.
      logger.warn(
        `[FileDetector] All fallback parsing failed for type "${detection.type}". ` +
          `Attempted: ${options.allowedTypes.join(", ")}. Falling through to universal handler.`,
      );
      const csvOptions: CSVProcessorOptions | undefined = options?.csvOptions;
      return await FileDetector.processFile(
        content,
        detection,
        csvOptions,
        options?.provider,
      );
    }

    const content = await FileDetector.loadContent(input, detection, options);

    // Extract CSV-specific options from FileDetectorOptions
    const csvOptions: CSVProcessorOptions | undefined = options?.csvOptions;

    return await FileDetector.processFile(
      content,
      detection,
      csvOptions,
      options?.provider,
    );
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
        return result;
      }
    }

    logger.warn(
      `[FileDetector] Low confidence: ${best?.type ?? "unknown"} (${best?.metadata.confidence ?? 0}%)`,
    );
    return best as FileDetectionResult;
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
        return await FileDetector.processVideoFile(content, detection);
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
  ): Promise<FileProcessingResult> {
    const videoFilename = detection.metadata.filename || "video";
    try {
      const videoResult = await videoProcessor.processFile({
        id: videoFilename,
        name: videoFilename,
        mimetype: detection.mimeType || "video/mp4",
        size: content.length,
        buffer: content,
      });
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
      const audioResult = await audioProcessor.processFile({
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
      const archiveResult = await archiveProcessor.processFile({
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
        const { openDocumentProcessor } = await import(
          "../processors/document/OpenDocumentProcessor.js"
        );
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
        const { excelProcessor } = await import(
          "../processors/document/ExcelProcessor.js"
        );
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
        const { openDocumentProcessor } = await import(
          "../processors/document/OpenDocumentProcessor.js"
        );
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
        const { rtfProcessor } = await import(
          "../processors/document/RtfProcessor.js"
        );
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
        const { wordProcessor } = await import(
          "../processors/document/WordProcessor.js"
        );
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
      const { PptxProcessor } = await import(
        "../processors/document/PptxProcessor.js"
      );
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
      const { processSvg } = await import(
        "../processors/markup/SvgProcessor.js"
      );

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
    const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
    const retryDelay = options?.retryDelay ?? DEFAULT_RETRY_DELAY;

    return withRetry(
      async () => {
        const response = await request(url, {
          dispatcher: getGlobalDispatcher().compose(
            interceptors.redirect({ maxRedirections: 5 }),
          ),
          method: "GET",
          headersTimeout: timeout,
          bodyTimeout: timeout,
        });

        if (response.statusCode !== 200) {
          throw new Error(`HTTP ${response.statusCode}`);
        }

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
      },
      { maxRetries, retryDelay },
    );
  }

  /**
   * Load file from filesystem path
   */
  private static async loadFromPath(
    path: string,
    options?: FileDetectorOptions,
  ): Promise<Buffer> {
    const maxSize = options?.maxSize || 200 * 1024 * 1024; // 200MB default (matches Curator memory-safety cap)
    const statInfo = await stat(path);

    if (!statInfo.isFile()) {
      throw new Error("Not a file");
    }

    if (statInfo.size > maxSize) {
      throw new Error(
        `File too large: ${formatFileSize(statInfo.size)} (max: ${formatFileSize(maxSize)})`,
      );
    }

    return await readFile(path);
  }

  /**
   * Load file from data URI
   */
  private static loadFromDataURI(dataUri: string): Buffer {
    const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      throw new Error("Invalid data URI format");
    }
    return Buffer.from(match[2], "base64");
  }
}

/**
 * Strategy 1: Magic Bytes Detection (95% confidence)
 * Detects file type from binary file headers
 */
class MagicBytesStrategy implements DetectionStrategy {
  async detect(input: FileInput): Promise<FileDetectionResult> {
    if (!Buffer.isBuffer(input)) {
      return this.unknown();
    }

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
    if (this.isPDF(input)) {
      return this.result("pdf", "application/pdf", 95);
    }

    // MP4/MOV: "ftyp" at offset 4
    if (
      input.length >= 8 &&
      input[4] === 0x66 &&
      input[5] === 0x74 &&
      input[6] === 0x79 &&
      input[7] === 0x70
    ) {
      return this.result("video", "video/mp4", 95);
    }
    // MKV/WebM: EBML header
    if (
      input.length >= 4 &&
      input[0] === 0x1a &&
      input[1] === 0x45 &&
      input[2] === 0xdf &&
      input[3] === 0xa3
    ) {
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
    // MP3: ID3 tag
    if (
      input.length >= 3 &&
      input[0] === 0x49 &&
      input[1] === 0x44 &&
      input[2] === 0x33
    ) {
      return this.result("audio", "audio/mpeg", 95);
    }
    // MP3: sync word
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
      return this.result("audio", "audio/ogg", 90);
    }
    // ZIP: "PK\x03\x04"
    // NOTE: Many document formats (OOXML: .xlsx, .docx, .pptx; ODF: .odt, .ods)
    // are internally ZIP archives and share these magic bytes. We return a lower
    // confidence (70%) so the ExtensionStrategy (85%) can override with the correct
    // document type when a file path with extension is available. For raw buffers
    // without path info, this falls through to archive as a safe default.
    if (
      input.length >= 4 &&
      input[0] === 0x50 &&
      input[1] === 0x4b &&
      input[2] === 0x03 &&
      input[3] === 0x04
    ) {
      return this.result("archive", "application/zip", 70);
    }
    // GZIP: 1F 8B
    if (input.length >= 2 && input[0] === 0x1f && input[1] === 0x8b) {
      return this.result("archive", "application/gzip", 90);
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
      const response = await request(input, {
        dispatcher: getGlobalDispatcher().compose(
          interceptors.redirect({ maxRedirections: 5 }),
        ),
        method: "HEAD",
        headersTimeout: FileDetector.DEFAULT_HEAD_TIMEOUT,
        bodyTimeout: FileDetector.DEFAULT_HEAD_TIMEOUT,
      });
      const contentType = (response.headers["content-type"] as string) || "";
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

    const typeMap: Record<string, FileType> = {
      csv: "csv",
      tsv: "csv",
      jpg: "image",
      jpeg: "image",
      png: "image",
      gif: "image",
      webp: "image",
      bmp: "image",
      tiff: "image",
      tif: "image",
      // SVG is handled as text/markup, NOT as image
      // AI providers don't support SVG format, so we process it as sanitized text
      svg: "svg",
      avif: "image",
      pdf: "pdf",
      // Video formats
      mp4: "video",
      mkv: "video",
      mov: "video",
      avi: "video",
      webm: "video",
      wmv: "video",
      flv: "video",
      // Audio formats
      mp3: "audio",
      wav: "audio",
      ogg: "audio",
      flac: "audio",
      m4a: "audio",
      aac: "audio",
      wma: "audio",
      opus: "audio",
      // Archive formats
      zip: "archive",
      tar: "archive",
      gz: "archive",
      tgz: "archive",
      rar: "archive",
      "7z": "archive",
      jar: "archive",
      // Document formats (ZIP-based internally)
      xlsx: "xlsx",
      xls: "xlsx",
      docx: "docx",
      doc: "docx",
      pptx: "pptx",
      ppt: "pptx",
      odt: "docx", // OpenDocument text → processed like docx
      ods: "xlsx", // OpenDocument spreadsheet → processed like xlsx
      odp: "pptx", // OpenDocument presentation → processed like pptx
      rtf: "docx", // RTF → processed like docx (text extraction)
      // Text/markup formats
      txt: "text",
      md: "text",
      markdown: "text",
      json: "text",
      xml: "text",
      yaml: "text",
      yml: "text",
      html: "text",
      htm: "text",
      css: "text",
      log: "text",
      conf: "text",
      cfg: "text",
      ini: "text",
      env: "text",
      toml: "text",
      properties: "text",
      gitignore: "text",
      dockerignore: "text",
      editorconfig: "text",
      prettierrc: "text",
      eslintrc: "text",
      babelrc: "text",
      // Source code formats
      js: "text",
      mjs: "text",
      cjs: "text",
      jsx: "text",
      ts: "text",
      tsx: "text",
      py: "text",
      java: "text",
      go: "text",
      rs: "text",
      rb: "text",
      php: "text",
      c: "text",
      cpp: "text",
      cc: "text",
      h: "text",
      hpp: "text",
      cs: "text",
      swift: "text",
      kt: "text",
      kts: "text",
      scala: "text",
      sh: "text",
      bash: "text",
      zsh: "text",
      ps1: "text",
      sql: "text",
      r: "text",
      lua: "text",
      pl: "text",
      perl: "text",
      dart: "text",
      ex: "text",
      exs: "text",
      erl: "text",
      hs: "text",
      clj: "text",
      lisp: "text",
      vim: "text",
      // Additional video/image
      m4v: "video",
      ico: "image",
    };

    const type = typeMap[ext.toLowerCase()];

    return {
      type: type || "unknown",
      mimeType: this.getMimeType(ext),
      extension: ext,
      source: this.detectSource(input),
      metadata: { confidence: type ? 85 : 0 },
    };
  }

  private getExtension(input: string): string | null {
    if (this.isURL(input)) {
      const url = new URL(input);
      const match = url.pathname.match(/\.([^.]+)$/);
      return match ? match[1] : null;
    }
    const match = input.match(/\.([^.]+)$/);
    return match ? match[1] : null;
  }

  private isURL(str: string): boolean {
    return str.startsWith("http://") || str.startsWith("https://");
  }

  private detectSource(input: string): FileSource {
    if (input.startsWith("data:")) {
      return "datauri";
    }
    if (this.isURL(input)) {
      return "url";
    }
    return "path";
  }

  private getMimeType(ext: string): string {
    const mimeMap: Record<string, string> = {
      csv: "text/csv",
      tsv: "text/tab-separated-values",
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
      pdf: "application/pdf",
      // Video MIME types
      mp4: "video/mp4",
      mkv: "video/x-matroska",
      mov: "video/quicktime",
      avi: "video/x-msvideo",
      webm: "video/webm",
      wmv: "video/x-ms-wmv",
      flv: "video/x-flv",
      // Audio MIME types
      mp3: "audio/mpeg",
      wav: "audio/wav",
      ogg: "audio/ogg",
      flac: "audio/flac",
      m4a: "audio/mp4",
      aac: "audio/aac",
      wma: "audio/x-ms-wma",
      opus: "audio/opus",
      // Archive MIME types
      zip: "application/zip",
      tar: "application/x-tar",
      gz: "application/gzip",
      tgz: "application/gzip",
      rar: "application/x-rar-compressed",
      "7z": "application/x-7z-compressed",
      jar: "application/java-archive",
      // Document MIME types
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      xls: "application/vnd.ms-excel",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      doc: "application/msword",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ppt: "application/vnd.ms-powerpoint",
      odt: "application/vnd.oasis.opendocument.text",
      ods: "application/vnd.oasis.opendocument.spreadsheet",
      odp: "application/vnd.oasis.opendocument.presentation",
      rtf: "application/rtf",
      // Text/markup MIME types
      txt: "text/plain",
      md: "text/markdown",
      markdown: "text/markdown",
      json: "application/json",
      xml: "application/xml",
      yaml: "application/yaml",
      yml: "application/yaml",
      html: "text/html",
      htm: "text/html",
      css: "text/css",
      log: "text/plain",
      conf: "text/plain",
      cfg: "text/plain",
      ini: "text/plain",
      env: "text/plain",
      toml: "text/plain",
      properties: "text/plain",
      gitignore: "text/plain",
      dockerignore: "text/plain",
      editorconfig: "text/plain",
      prettierrc: "application/json",
      eslintrc: "application/json",
      babelrc: "application/json",
      // Source code MIME types
      js: "text/javascript",
      mjs: "text/javascript",
      cjs: "text/javascript",
      jsx: "text/javascript",
      ts: "text/typescript",
      tsx: "text/typescript",
      py: "text/x-python",
      java: "text/x-java-source",
      go: "text/x-go",
      rs: "text/x-rustsrc",
      rb: "text/x-ruby",
      php: "text/x-php",
      c: "text/x-c",
      cpp: "text/x-c++",
      cc: "text/x-c++",
      h: "text/x-c",
      hpp: "text/x-c++",
      cs: "text/x-csharp",
      swift: "text/x-swift",
      kt: "text/x-kotlin",
      kts: "text/x-kotlin",
      scala: "text/x-scala",
      sh: "text/x-shellscript",
      bash: "text/x-shellscript",
      zsh: "text/x-shellscript",
      ps1: "text/x-powershell",
      sql: "text/x-sql",
      r: "text/x-r",
      lua: "text/x-lua",
      pl: "text/x-perl",
      perl: "text/x-perl",
      dart: "text/x-dart",
      ex: "text/x-elixir",
      exs: "text/x-elixir",
      erl: "text/x-erlang",
      hs: "text/x-haskell",
      clj: "text/x-clojure",
      lisp: "text/x-lisp",
      vim: "text/plain",
      // Additional video/image
      m4v: "video/mp4",
      ico: "image/x-icon",
    };
    return mimeMap[ext.toLowerCase()] || "application/octet-stream";
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

    // Count delimiters per line and check consistency
    const delimRegex = delimiter === "|" ? /\|/g : new RegExp(delimiter, "g");
    const counts = lines.map((line) => (line.match(delimRegex) || []).length);
    const firstCount = counts[0];
    const consistentLines = counts.filter((c) => c === firstCount).length;

    return consistentLines / lines.length >= 0.8;
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
