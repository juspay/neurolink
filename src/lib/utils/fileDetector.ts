/**
 * File Type Detection Utility
 * Centralized file detection for all multimodal file types
 * Uses multi-strategy approach for reliable type identification
 */

import { request, getGlobalDispatcher, interceptors } from "undici";
import { readFile, stat } from "fs/promises";
import type {
  FileType,
  FileInput,
  FileDetectionResult,
  FileProcessingResult,
  FileDetectorOptions,
  FileSource,
  CSVProcessorOptions,
} from "../types/fileTypes.js";
import { logger } from "./logger.js";
import { CSVProcessor } from "./csvProcessor.js";
import { ImageProcessor } from "./imageProcessor.js";
import { PDFProcessor } from "./pdfProcessor.js";

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
    const detection = await this.detect(input, options);

    // FD-018: Comprehensive fallback parsing for extension-less files
    // When file detection returns "unknown" or doesn't match allowedTypes,
    // attempt parsing for each allowed type before failing. This handles cases like Slack
    // files named "file-1", "file-2" without extensions that could be CSV, JSON, or text.
    if (
      options?.allowedTypes &&
      !options.allowedTypes.includes(detection.type)
    ) {
      // Try fallback parsing for both "unknown" types and when detection doesn't match allowed types
      const content = await this.loadContent(input, detection, options);
      const errors: string[] = [];

      // Try each allowed type in order of specificity
      for (const allowedType of options.allowedTypes) {
        try {
          const result = await this.tryFallbackParsing(
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

      // All fallbacks failed
      throw new Error(
        `File type detection failed and all fallback parsing attempts failed. Original detection: ${detection.type}. Attempted types: ${options.allowedTypes.join(", ")}. Errors: ${errors.join("; ")}`,
      );
    }

    const content = await this.loadContent(input, detection, options);

    // Extract CSV-specific options from FileDetectorOptions
    const csvOptions: CSVProcessorOptions | undefined = options?.csvOptions;

    return await this.processFile(
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
        if (this.isValidText(textContent)) {
          return {
            type: "text",
            content: textContent,
            mimeType: this.guessTextMimeType(textContent),
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
    if (this.looksLikeXMLStrict(trimmed)) {
      const isHTML =
        trimmed.includes("<!DOCTYPE html") ||
        trimmed.toLowerCase().includes("<html") ||
        trimmed.includes("<head") ||
        trimmed.includes("<body");
      return isHTML ? "text/html" : "application/xml";
    }

    // Check for YAML using robust multi-indicator detection
    if (this.looksLikeYAMLStrict(trimmed)) {
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
        return await this.loadFromURL(input as string, options);
      case "path":
        return await this.loadFromPath(input as string, options);
      case "buffer":
        return input as Buffer;
      case "datauri":
        return this.loadFromDataURI(input as string);
      default:
        throw new Error(`Unknown source: ${source}`);
    }
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
        return await CSVProcessor.process(content, options);
      case "image":
        return await ImageProcessor.process(content);
      case "pdf":
        return await PDFProcessor.process(content, { provider });
      case "text":
        return {
          type: "text",
          content: content.toString("utf-8"),
          mimeType: detection.mimeType || "text/plain",
          metadata: detection.metadata,
        };
      default:
        throw new Error(`Unsupported file type: ${detection.type}`);
    }
  }

  /**
   * Load file from URL
   */
  private static async loadFromURL(
    url: string,
    options?: FileDetectorOptions,
  ): Promise<Buffer> {
    const maxSize = options?.maxSize || 10 * 1024 * 1024;
    const timeout = options?.timeout || this.DEFAULT_NETWORK_TIMEOUT;

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
  }

  /**
   * Load file from filesystem path
   */
  private static async loadFromPath(
    path: string,
    options?: FileDetectorOptions,
  ): Promise<Buffer> {
    const maxSize = options?.maxSize || 10 * 1024 * 1024;
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
    if (mime.includes("text/csv")) {
      return "csv";
    }
    if (mime.includes("text/tab-separated-values")) {
      return "csv";
    }
    if (mime.includes("image/")) {
      return "image";
    }
    if (mime.includes("application/pdf")) {
      return "pdf";
    }
    if (mime.includes("text/plain")) {
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
      svg: "image",
      avif: "image",
      pdf: "pdf",
      txt: "text",
      md: "text",
      json: "text",
      xml: "text",
      yaml: "text",
      yml: "text",
      html: "text",
      htm: "text",
      log: "text",
      conf: "text",
      cfg: "text",
      ini: "text",
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
      txt: "text/plain",
      md: "text/markdown",
      json: "application/json",
      xml: "application/xml",
      yaml: "application/yaml",
      yml: "application/yaml",
      html: "text/html",
      htm: "text/html",
      log: "text/plain",
      conf: "text/plain",
      cfg: "text/plain",
      ini: "text/plain",
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
        lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) /
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
