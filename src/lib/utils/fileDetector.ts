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

    if (
      options?.allowedTypes &&
      !options.allowedTypes.includes(detection.type)
    ) {
      throw new Error(
        `File type ${detection.type} not allowed. Allowed: ${options.allowedTypes.join(", ")}`,
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
          mimeType: "text/plain",
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
    const timeout = options?.timeout || 30000;

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
        headersTimeout: 5000,
        bodyTimeout: 5000,
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
    if (!Buffer.isBuffer(input)) {
      return this.unknown();
    }

    const sample = input.toString("utf-8", 0, Math.min(1000, input.length));

    if (this.looksLikeCSV(sample)) {
      return this.result("csv", "text/csv", 75);
    }

    return this.unknown();
  }

  private looksLikeCSV(text: string): boolean {
    const lines = text.split("\n").slice(0, 5);
    if (lines.length < 2) {
      return false;
    }

    const hasCommas = lines.every((line) => line.includes(","));
    if (!hasCommas) {
      return false;
    }

    const columnCounts = lines.map((line) => line.split(",").length);
    const uniqueCounts = new Set(columnCounts);

    return uniqueCounts.size === 1 && columnCounts[0] >= 2;
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
