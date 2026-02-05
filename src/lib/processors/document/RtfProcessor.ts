/**
 * RTF Document Processor
 *
 * Processes Rich Text Format (.rtf) files by extracting plain text content
 * from RTF control codes. Uses a lightweight text extraction approach
 * without requiring external dependencies.
 *
 * Key features:
 * - RTF control code stripping
 * - Text content extraction
 * - Raw content preservation for debugging
 * - No external dependencies required
 *
 * Priority: ~110 (document format, processed after binary formats)
 *
 * @module processors/document/RtfProcessor
 *
 * @example
 * ```typescript
 * import { rtfProcessor, processRtf, isRtfFile } from "./document/index.js";
 *
 * // Check if a file is an RTF file
 * if (isRtfFile("application/rtf", "document.rtf")) {
 *   const result = await processRtf({
 *     id: "file-123",
 *     name: "document.rtf",
 *     mimetype: "application/rtf",
 *     size: 10240,
 *     buffer: rtfBuffer,
 *   });
 *
 *   if (result.success) {
 *     console.log(`Text content: ${result.data.textContent}`);
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
import { SIZE_LIMITS } from "../config/index.js";

// Re-export for consumers who import from this module
export type { ProcessedRtf } from "../base/types.js";

// Import for local use
import type { ProcessedRtf } from "../base/types.js";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Supported MIME types for RTF documents
 */
const SUPPORTED_RTF_MIME_TYPES = [
  "application/rtf",
  "text/rtf",
  "text/richtext",
];

/**
 * Supported file extensions for RTF documents
 */
const SUPPORTED_RTF_EXTENSIONS = [".rtf"];

/**
 * Default timeout for RTF processing (30 seconds)
 */
const RTF_TIMEOUT_MS = 30000;

// =============================================================================
// RTF PROCESSOR CLASS
// =============================================================================

/**
 * RTF Processor - handles Rich Text Format files.
 *
 * Extracts plain text from RTF documents by stripping RTF control codes.
 * This is a lightweight implementation that doesn't require external
 * RTF parsing libraries.
 *
 * Priority: ~110 (document format)
 *
 * @example
 * ```typescript
 * const processor = new RtfProcessor();
 *
 * const result = await processor.processFile({
 *   id: "file-123",
 *   name: "report.rtf",
 *   mimetype: "application/rtf",
 *   size: 5120,
 *   buffer: rtfBuffer,
 * });
 *
 * if (result.success) {
 *   console.log("Extracted text:", result.data.textContent);
 * }
 * ```
 */
export class RtfProcessor extends BaseFileProcessor<ProcessedRtf> {
  constructor() {
    super({
      maxSizeMB: SIZE_LIMITS.DOCUMENT_MAX_MB,
      timeoutMs: RTF_TIMEOUT_MS,
      supportedMimeTypes: SUPPORTED_RTF_MIME_TYPES,
      supportedExtensions: SUPPORTED_RTF_EXTENSIONS,
      fileTypeName: "RTF",
      defaultFilename: "document.rtf",
    });
  }

  /**
   * Validate downloaded RTF document.
   * Checks for RTF header signature "{\\rtf".
   *
   * @param buffer - Downloaded file content
   * @param fileInfo - Original file information
   * @returns null if valid, error message if invalid
   */
  protected override async validateDownloadedFile(
    buffer: Buffer,
    _fileInfo: FileInfo,
  ): Promise<string | null> {
    if (buffer.length < 5) {
      return "Invalid RTF document - file too small";
    }

    // RTF files should start with "{\rtf"
    const header = buffer.subarray(0, 10).toString("ascii");
    if (!header.startsWith("{\\rtf")) {
      // Check if it might be HTML error page
      const preview = buffer
        .subarray(0, 100)
        .toString("utf8")
        .substring(0, 100);
      if (preview.includes("<!DOCTYPE") || preview.includes("<html")) {
        return "Invalid RTF document - received HTML response instead of file content";
      }
      return "Invalid RTF document - missing RTF header signature";
    }

    return null;
  }

  /**
   * Build the processed RTF result.
   * Extracts plain text by stripping RTF control codes.
   *
   * @param buffer - Raw file content
   * @param fileInfo - Original file information
   * @returns Processed RTF with extracted text content
   */
  protected buildProcessedResult(
    buffer: Buffer,
    fileInfo: FileInfo,
  ): ProcessedRtf {
    const rawContent = buffer.toString("utf-8");
    const textContent = this.extractText(rawContent);

    return {
      textContent,
      rawContent,
      buffer,
      mimetype: fileInfo.mimetype || "application/rtf",
      size: fileInfo.size,
      filename: this.getFilename(fileInfo),
    };
  }

  /**
   * Extract plain text from RTF content.
   * Strips RTF control codes, groups, and formatting commands.
   *
   * This is a basic RTF parser that handles common RTF constructs:
   * - Control groups like {\fonttbl...}
   * - Control words like \par, \b, \i
   * - Special characters like \' hex escapes
   * - Newlines from \par and \line commands
   *
   * @param rtf - Raw RTF content
   * @returns Extracted plain text
   */
  private extractText(rtf: string): string {
    const text = rtf;
    let result = "";
    let depth = 0;
    let skipGroup = false;
    let skipGroupDepth = 0;
    let i = 0;

    // Groups that should be skipped entirely (metadata, not content)
    const skipGroupNames = [
      "fonttbl",
      "colortbl",
      "stylesheet",
      "info",
      "pict",
      "object",
      "header",
      "footer",
    ];

    while (i < text.length) {
      const char = text[i];

      if (char === "{") {
        depth++;
        // Check if this is a group we should skip
        const nextChars = text.substring(i + 1, i + 20);
        const groupMatch = nextChars.match(/^\\([a-z]+)/);
        if (
          groupMatch &&
          skipGroupNames.includes(groupMatch[1]) &&
          !skipGroup
        ) {
          skipGroup = true;
          skipGroupDepth = depth;
        }
        i++;
        continue;
      }

      if (char === "}") {
        depth--;
        if (skipGroup && depth < skipGroupDepth) {
          skipGroup = false;
          skipGroupDepth = 0;
        }
        i++;
        continue;
      }

      if (skipGroup) {
        i++;
        continue;
      }

      if (char === "\\") {
        // Control word or symbol
        const remaining = text.substring(i);

        // Handle special escapes
        if (remaining.startsWith("\\\\")) {
          result += "\\";
          i += 2;
          continue;
        }
        if (remaining.startsWith("\\{")) {
          result += "{";
          i += 2;
          continue;
        }
        if (remaining.startsWith("\\}")) {
          result += "}";
          i += 2;
          continue;
        }

        // Handle hex escapes like \'e9 (é)
        const hexMatch = remaining.match(/^\\'([0-9a-f]{2})/i);
        if (hexMatch) {
          const charCode = parseInt(hexMatch[1], 16);
          result += String.fromCharCode(charCode);
          i += 4;
          continue;
        }

        // Handle Unicode escapes like \u233? (é)
        const unicodeMatch = remaining.match(/^\\u(-?\d+)\??/);
        if (unicodeMatch) {
          let charCode = parseInt(unicodeMatch[1], 10);
          if (charCode < 0) {
            charCode += 65536; // Convert negative to positive
          }
          result += String.fromCharCode(charCode);
          i += unicodeMatch[0].length;
          continue;
        }

        // Handle control words
        const controlMatch = remaining.match(/^\\([a-z]+)(-?\d*)[ ]?/i);
        if (controlMatch) {
          const controlWord = controlMatch[1].toLowerCase();

          // Convert some control words to text
          if (controlWord === "par" || controlWord === "line") {
            result += "\n";
          } else if (controlWord === "tab") {
            result += "\t";
          } else if (controlWord === "emdash") {
            result += "—";
          } else if (controlWord === "endash") {
            result += "–";
          } else if (controlWord === "bullet") {
            result += "•";
          } else if (controlWord === "lquote") {
            result += "'";
          } else if (controlWord === "rquote") {
            result += "'";
          } else if (controlWord === "ldblquote") {
            result += '"';
          } else if (controlWord === "rdblquote") {
            result += '"';
          }

          i += controlMatch[0].length;
          continue;
        }

        // Unknown control sequence, skip the backslash and control word
        i++;
        continue;
      }

      // Regular character
      if (char !== "\r" && char !== "\n") {
        result += char;
      }
      i++;
    }

    // Clean up the result
    result = result
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(/ +\n/g, "\n") // Remove trailing spaces before newlines
      .replace(/\n +/g, "\n") // Remove leading spaces after newlines
      .replace(/\n{3,}/g, "\n\n") // Collapse multiple newlines
      .trim();

    return result;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Singleton instance of the RtfProcessor.
 * Use this for all RTF document processing to share configuration.
 */
export const rtfProcessor = new RtfProcessor();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a file is an RTF document.
 *
 * @param mimetype - MIME type of the file
 * @param filename - Filename for detection
 * @returns true if the file is a supported RTF document
 *
 * @example
 * ```typescript
 * if (isRtfFile("application/rtf", "document.rtf")) {
 *   console.log("This is an RTF document");
 * }
 * ```
 */
export function isRtfFile(mimetype: string, filename: string): boolean {
  return rtfProcessor.isFileSupported(mimetype, filename);
}

/**
 * Validate RTF document size against configured limit.
 *
 * @param sizeBytes - File size in bytes
 * @returns true if size is within the allowed limit
 */
export function validateRtfSize(sizeBytes: number): boolean {
  const maxBytes = SIZE_LIMITS.DOCUMENT_MAX_MB * 1024 * 1024;
  return sizeBytes <= maxBytes;
}

/**
 * Process an RTF document.
 *
 * @param fileInfo - File information (can include URL or buffer)
 * @param options - Optional processing options
 * @returns Processing result with success flag and either data or error
 *
 * @example
 * ```typescript
 * const result = await processRtf({
 *   id: "file-123",
 *   name: "report.rtf",
 *   mimetype: "application/rtf",
 *   size: 10240,
 *   buffer: rtfBuffer,
 * });
 *
 * if (result.success) {
 *   console.log("Extracted text:", result.data.textContent);
 * }
 * ```
 */
export async function processRtf(
  fileInfo: FileInfo,
  options?: ProcessOptions,
): Promise<FileProcessingResult<ProcessedRtf>> {
  return rtfProcessor.processFile(fileInfo, options);
}
