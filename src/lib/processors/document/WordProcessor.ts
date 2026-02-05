/**
 * Word Document Processing Utility
 *
 * Handles downloading, validating, and processing Word (.docx, .doc) files.
 * Uses mammoth library to extract text and HTML content from Word documents.
 *
 * Features:
 * - DOCX format validation via ZIP/PK signature check
 * - Text extraction using mammoth.extractRawText()
 * - HTML conversion using mammoth.convertToHtml()
 * - Warning collection from mammoth processing
 * - Support for both URL downloads and direct buffer input
 *
 * @module processors/document/WordProcessor
 *
 * @example
 * ```typescript
 * import { wordProcessor, processWord, isWordFile } from "./WordProcessor.js";
 *
 * // Check if file is supported
 * if (isWordFile(file.mimetype, file.name)) {
 *   const result = await processWord(fileInfo, {
 *     authHeaders: { Authorization: "Bearer token" },
 *   });
 *
 *   if (result.success) {
 *     console.log("Text:", result.data.textContent);
 *     console.log("HTML:", result.data.htmlContent);
 *     console.log("Warnings:", result.data.warnings);
 *   }
 * }
 * ```
 */

import * as mammoth from "mammoth";

import { BaseFileProcessor } from "../base/BaseFileProcessor.js";
import type {
  FileInfo,
  FileProcessingResult,
  ProcessOptions,
} from "../base/types.js";
import { SIZE_LIMITS } from "../config/index.js";
import { FileErrorCode } from "../errors/index.js";

// Re-export for consumers who import from this module
export type { ProcessedWord } from "../base/types.js";

// Import for local use
import type { ProcessedWord } from "../base/types.js";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Supported MIME types for Word documents
 */
const SUPPORTED_WORD_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

/**
 * Supported file extensions for Word documents
 */
const SUPPORTED_WORD_EXTENSIONS = [".docx", ".doc"];

/**
 * Default timeout for Word processing (60 seconds)
 * Word documents can be larger due to embedded images and complex formatting
 */
const WORD_TIMEOUT_MS = 60000;

// =============================================================================
// WORD PROCESSOR CLASS
// =============================================================================

/**
 * Word Processor - handles .docx and .doc files
 *
 * Uses mammoth library for both text and HTML extraction. The processor
 * validates DOCX files by checking for the ZIP/PK signature (since DOCX
 * files are actually ZIP archives).
 *
 * @example
 * ```typescript
 * const processor = new WordProcessor();
 *
 * // Check if file is supported
 * if (processor.isFileSupported("application/msword", "report.doc")) {
 *   const result = await processor.processFile(fileInfo);
 *   if (result.success) {
 *     console.log("Extracted text:", result.data.textContent);
 *   }
 * }
 * ```
 */
export class WordProcessor extends BaseFileProcessor<ProcessedWord> {
  constructor() {
    super({
      maxSizeMB: SIZE_LIMITS.WORD_MAX_MB,
      timeoutMs: WORD_TIMEOUT_MS,
      supportedMimeTypes: SUPPORTED_WORD_MIME_TYPES,
      supportedExtensions: SUPPORTED_WORD_EXTENSIONS,
      fileTypeName: "Word",
      defaultFilename: "document.docx",
    });
  }

  /**
   * Validate downloaded Word document has correct magic bytes.
   * DOCX files are ZIP archives starting with PK signature (0x50 0x4B).
   *
   * @param buffer - Downloaded file content
   * @param fileInfo - Original file information
   * @returns null if valid, error message if invalid
   */
  protected override async validateDownloadedFile(
    buffer: Buffer,
    _fileInfo: FileInfo,
  ): Promise<string | null> {
    // Minimum size check
    if (buffer.length < 4) {
      return "Invalid Word document - file too small";
    }

    // DOCX files are ZIP archives (PK signature: 0x50 0x4B)
    const pkSignature = buffer.subarray(0, 2).toString("ascii");

    if (pkSignature !== "PK") {
      // Log what we actually received to help debug
      const preview = buffer
        .subarray(0, 100)
        .toString("utf8")
        .substring(0, 100);
      const looksLikeHtml =
        preview.includes("<!DOCTYPE") || preview.includes("<html");

      // Provide more specific error message
      if (looksLikeHtml) {
        return "Invalid Word document - received HTML response instead of file content (possibly an error page)";
      }

      return "Invalid Word document - not a valid DOCX format (expected ZIP/PK signature)";
    }

    return null;
  }

  /**
   * Build processed Word result with extracted text and HTML content.
   * This is a stub that returns an empty result - actual processing
   * happens in the overridden processFile method since mammoth
   * operations are asynchronous.
   *
   * @param buffer - Downloaded file content
   * @param fileInfo - Original file information
   * @returns Processed Word result (placeholder)
   */
  protected override buildProcessedResult(
    buffer: Buffer,
    fileInfo: FileInfo,
  ): ProcessedWord {
    // Note: This is a synchronous placeholder since buildProcessedResult is sync
    // The actual mammoth extraction happens in the overridden processFile method
    return {
      textContent: "",
      htmlContent: "",
      warnings: [],
      buffer,
      mimetype:
        fileInfo.mimetype ||
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: fileInfo.size,
      filename: this.getFilename(fileInfo),
    };
  }

  /**
   * Override processFile for async mammoth extraction.
   *
   * The mammoth library's extractRawText and convertToHtml methods are
   * asynchronous, so we need to override the entire processFile method
   * rather than just buildProcessedResult.
   *
   * Processing steps:
   * 1. Validate file type and size
   * 2. Get buffer (download from URL or use provided buffer)
   * 3. Validate downloaded file (check PK signature)
   * 4. Extract text with mammoth.extractRawText()
   * 5. Convert to HTML with mammoth.convertToHtml()
   * 6. Collect any warnings from mammoth
   * 7. Return structured result
   *
   * @param fileInfo - File information with URL or buffer
   * @param options - Optional processing options
   * @returns Processing result with text, HTML, and warnings
   */
  override async processFile(
    fileInfo: FileInfo,
    options?: ProcessOptions,
  ): Promise<FileProcessingResult<ProcessedWord>> {
    try {
      // Step 1: Validate file type and size
      const validationResult = this.validateFileWithResult(fileInfo);
      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error,
        };
      }

      // Step 2: Get file buffer (from direct buffer or download from URL)
      let buffer: Buffer;

      if (fileInfo.buffer) {
        // Direct buffer provided - skip download
        buffer = fileInfo.buffer;
      } else if (fileInfo.url) {
        // Download from URL
        const downloadResult = await this.downloadFileWithRetry(
          fileInfo,
          options,
        );
        if (!downloadResult.success) {
          return {
            success: false,
            error: downloadResult.error,
          };
        }
        if (!downloadResult.data) {
          return {
            success: false,
            error: this.createError(FileErrorCode.DOWNLOAD_FAILED, {
              reason: "Download succeeded but returned no data",
            }),
          };
        }
        buffer = downloadResult.data;
      } else {
        // No buffer or URL provided
        return {
          success: false,
          error: this.createError(FileErrorCode.DOWNLOAD_FAILED, {
            reason: "No buffer or URL provided for file",
          }),
        };
      }

      // Step 3: Validate downloaded file (check magic bytes)
      const postValidationError = await this.validateDownloadedFile(
        buffer,
        fileInfo,
      );
      if (postValidationError) {
        return {
          success: false,
          error: this.createError(FileErrorCode.INVALID_FORMAT, {
            reason: postValidationError,
          }),
        };
      }

      // Step 4 & 5: Extract text and HTML content using mammoth
      let textContent = "";
      let htmlContent = "";
      const warnings: string[] = [];

      try {
        // Extract plain text
        const textResult = await mammoth.extractRawText({ buffer });
        textContent = textResult.value;

        // Collect warnings from text extraction
        if (textResult.messages && textResult.messages.length > 0) {
          warnings.push(
            ...textResult.messages.map((m) => `[text] ${m.message}`),
          );
        }

        // Convert to HTML for richer formatting
        const htmlResult = await mammoth.convertToHtml({ buffer });
        htmlContent = htmlResult.value;

        // Collect warnings from HTML conversion
        if (htmlResult.messages && htmlResult.messages.length > 0) {
          warnings.push(
            ...htmlResult.messages.map((m) => `[html] ${m.message}`),
          );
        }
      } catch (extractError) {
        return {
          success: false,
          error: this.createError(
            FileErrorCode.PROCESSING_FAILED,
            {
              reason: "Failed to extract Word document content",
              fileType: "Word",
            },
            extractError instanceof Error ? extractError : undefined,
          ),
        };
      }

      // Step 6: Return structured result
      return {
        success: true,
        data: {
          buffer,
          mimetype:
            fileInfo.mimetype ||
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          size: fileInfo.size,
          filename: this.getFilename(fileInfo),
          textContent,
          htmlContent,
          warnings,
        },
      };
    } catch (error) {
      // Catch any unexpected errors
      return {
        success: false,
        error: this.createError(
          FileErrorCode.UNKNOWN_ERROR,
          {
            error: error instanceof Error ? error.message : String(error),
          },
          error instanceof Error ? error : undefined,
        ),
      };
    }
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Singleton Word processor instance.
 * Use this for most use cases to avoid creating multiple instances.
 */
export const wordProcessor = new WordProcessor();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a file is a Word document (.docx or .doc).
 *
 * @param mimetype - MIME type of the file
 * @param filename - Filename (for extension-based detection)
 * @returns true if the file is a supported Word document
 *
 * @example
 * ```typescript
 * if (isWordFile(file.mimetype, file.name)) {
 *   const result = await processWord(file);
 * }
 * ```
 */
export function isWordFile(mimetype: string, filename: string): boolean {
  return wordProcessor.isFileSupported(mimetype, filename);
}

/**
 * Validate Word document size against configured limit.
 *
 * @param sizeBytes - File size in bytes
 * @returns true if size is within the allowed limit
 *
 * @example
 * ```typescript
 * if (!validateWordSize(file.size)) {
 *   throw new Error(`File exceeds ${SIZE_LIMITS.WORD_MAX_MB}MB limit`);
 * }
 * ```
 */
export function validateWordSize(sizeBytes: number): boolean {
  const maxBytes = SIZE_LIMITS.WORD_MAX_MB * 1024 * 1024;
  return sizeBytes <= maxBytes;
}

/**
 * Process a single Word document.
 *
 * Convenience function that uses the singleton wordProcessor instance.
 *
 * @param fileInfo - File information with URL or buffer
 * @param options - Optional processing options (auth headers, timeout, retry config)
 * @returns Processing result with extracted text, HTML, and warnings
 *
 * @example
 * ```typescript
 * const result = await processWord({
 *   id: "doc-123",
 *   name: "report.docx",
 *   mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
 *   size: 12345,
 *   url: "https://example.com/files/report.docx",
 * }, {
 *   authHeaders: { Authorization: "Bearer token" },
 * });
 *
 * if (result.success) {
 *   console.log("Text content:", result.data.textContent);
 *   console.log("HTML content:", result.data.htmlContent);
 *   if (result.data.warnings.length > 0) {
 *     console.warn("Warnings:", result.data.warnings);
 *   }
 * } else {
 *   console.error("Failed:", result.error.userMessage);
 * }
 * ```
 */
export async function processWord(
  fileInfo: FileInfo,
  options?: ProcessOptions,
): Promise<FileProcessingResult<ProcessedWord>> {
  return wordProcessor.processFile(fileInfo, options);
}
