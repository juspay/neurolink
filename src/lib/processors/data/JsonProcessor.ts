/**
 * JSON Processing Utility
 *
 * Handles downloading, validating, and processing JSON files.
 * Provides parsed JSON content with validation and metadata extraction.
 *
 * Features:
 * - JSON syntax validation
 * - Pretty-printing for valid JSON
 * - Metadata extraction (key count, array length)
 * - Graceful error handling with detailed messages
 *
 * @module processors/data/JsonProcessor
 *
 * @example
 * ```typescript
 * import { jsonProcessor, isJsonFile, processJson } from "./JsonProcessor.js";
 *
 * // Check if file is JSON
 * if (isJsonFile("application/json", "config.json")) {
 *   // Process the file
 *   const result = await processJson(fileInfo);
 *   if (result.success && result.data) {
 *     console.log("Parsed JSON:", result.data.parsed);
 *     console.log("Pretty-printed:", result.data.content);
 *   }
 * }
 * ```
 */

import { BaseFileProcessor } from "../base/BaseFileProcessor.js";
import type {
  FileInfo,
  FileProcessingResult,
  ProcessOptions,
} from "../base/types.js";
import { SIZE_LIMITS_MB } from "../config/index.js";

// Re-export for consumers who import from this module
export type { ProcessedJson } from "../base/types.js";

// Import for local use
import type { ProcessedJson } from "../base/types.js";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Supported JSON MIME types */
const SUPPORTED_JSON_TYPES = ["application/json", "text/json"];

/** Supported JSON file extensions */
const SUPPORTED_JSON_EXTENSIONS = [".json"];

// =============================================================================
// JSON PROCESSOR CLASS
// =============================================================================

/**
 * JSON file processor.
 * Extends BaseFileProcessor with JSON-specific parsing and validation.
 *
 * @example
 * ```typescript
 * const processor = new JsonProcessor();
 *
 * const result = await processor.processFile({
 *   id: "file-123",
 *   name: "config.json",
 *   mimetype: "application/json",
 *   size: 1024,
 *   buffer: jsonBuffer,
 * });
 *
 * if (result.success && result.data?.valid) {
 *   console.log("JSON keys:", result.data.keyCount);
 * }
 * ```
 */
export class JsonProcessor extends BaseFileProcessor<ProcessedJson> {
  constructor() {
    super({
      maxSizeMB: SIZE_LIMITS_MB.JSON_MAX_MB,
      timeoutMs: 30000,
      supportedMimeTypes: SUPPORTED_JSON_TYPES,
      supportedExtensions: SUPPORTED_JSON_EXTENSIONS,
      fileTypeName: "JSON",
      defaultFilename: "data.json",
    });
  }

  /**
   * Validate downloaded JSON is parseable.
   *
   * @param buffer - Downloaded file content
   * @param _fileInfo - Original file information
   * @returns null if valid, error message if invalid
   */
  protected override async validateDownloadedFile(
    buffer: Buffer,
    _fileInfo: FileInfo,
  ): Promise<string | null> {
    try {
      const content = buffer.toString("utf-8");
      JSON.parse(content);
      return null;
    } catch (error) {
      return `Invalid JSON file: ${error instanceof Error ? error.message : "Parse error"}`;
    }
  }

  /**
   * Build processed JSON result with parsed content.
   *
   * @param buffer - Downloaded file content
   * @param fileInfo - Original file information
   * @returns Processed JSON result
   */
  protected override buildProcessedResult(
    buffer: Buffer,
    fileInfo: FileInfo,
  ): ProcessedJson {
    const rawContent = buffer.toString("utf-8");
    let parsed: unknown = null;
    let valid = true;
    let errorMessage: string | undefined;
    let keyCount: number | undefined;
    let arrayLength: number | undefined;
    let content: string;

    try {
      parsed = JSON.parse(rawContent);

      // Extract metadata based on parsed type
      if (typeof parsed === "object" && parsed !== null) {
        if (Array.isArray(parsed)) {
          arrayLength = parsed.length;
        } else {
          keyCount = Object.keys(parsed).length;
        }
      }

      // Pretty print valid JSON
      content = JSON.stringify(parsed, null, 2);
    } catch (error) {
      // This shouldn't happen since we validate, but handle gracefully
      valid = false;
      errorMessage = error instanceof Error ? error.message : "Invalid JSON";
      content = rawContent;
    }

    return {
      content,
      rawContent,
      parsed,
      valid,
      errorMessage,
      keyCount,
      arrayLength,
      truncated: false,
      buffer,
      mimetype: fileInfo.mimetype || "application/json",
      size: fileInfo.size,
      filename: this.getFilename(fileInfo),
    };
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/** Singleton JSON processor instance */
export const jsonProcessor = new JsonProcessor();

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if a file is a JSON file based on MIME type or extension.
 *
 * @param mimetype - MIME type of the file
 * @param filename - Filename (for extension-based detection)
 * @returns true if the file is a JSON file
 *
 * @example
 * ```typescript
 * if (isJsonFile("application/json", "config.json")) {
 *   // Process as JSON
 * }
 * ```
 */
export function isJsonFile(mimetype: string, filename: string): boolean {
  return jsonProcessor.isFileSupported(mimetype, filename);
}

/**
 * Validate JSON file size against configured limit.
 *
 * @param sizeBytes - File size in bytes
 * @returns true if size is within the limit
 */
export function validateJsonSize(sizeBytes: number): boolean {
  const maxBytes = SIZE_LIMITS_MB.JSON_MAX_MB * 1024 * 1024;
  return sizeBytes <= maxBytes;
}

/**
 * Process a single JSON file.
 *
 * @param fileInfo - File information (with URL or buffer)
 * @param options - Optional processing options (auth headers, timeout, retry config)
 * @returns Processing result with parsed JSON or error
 *
 * @example
 * ```typescript
 * const result = await processJson({
 *   id: "file-123",
 *   name: "data.json",
 *   mimetype: "application/json",
 *   size: 2048,
 *   url: "https://example.com/data.json",
 * }, {
 *   authHeaders: { "Authorization": "Bearer token" },
 * });
 *
 * if (result.success && result.data) {
 *   console.log("Parsed:", result.data.parsed);
 * }
 * ```
 */
export function processJson(
  fileInfo: FileInfo,
  options?: ProcessOptions,
): Promise<FileProcessingResult<ProcessedJson>> {
  return jsonProcessor.processFile(fileInfo, options);
}
