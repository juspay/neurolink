/**
 * Plain Text File Processor
 *
 * Processes plain text files (.txt, .text, .log) with line and word counting,
 * encoding detection, and automatic truncation for large files.
 *
 * Priority: 110 (lower priority - catch-all for text files)
 *
 * @module processors/markup/TextProcessor
 *
 * @example
 * ```typescript
 * import { textProcessor, processText, isTextFile } from "./markup/TextProcessor.js";
 *
 * // Check if file is a plain text file
 * if (isTextFile(mimetype, filename)) {
 *   const result = await processText(fileInfo);
 *   if (result.success) {
 *     console.log('Content:', result.data.content);
 *     console.log('Lines:', result.data.lineCount);
 *     console.log('Words:', result.data.wordCount);
 *     if (result.data.truncated) {
 *       console.warn('File was truncated due to size');
 *     }
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
export type { ProcessedText } from "../base/types.js";

// Import for local use
import type { ProcessedText } from "../base/types.js";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Plain text MIME types */
const SUPPORTED_TEXT_TYPES = ["text/plain"] as const;

/** Plain text file extensions */
const SUPPORTED_TEXT_EXTENSIONS = [".txt", ".text", ".log"] as const;

// =============================================================================
// TEXT PROCESSOR
// =============================================================================

/**
 * Text Processor - handles plain text files.
 *
 * Features:
 * - Line and word counting
 * - Automatic truncation for large files
 * - UTF-8 encoding support
 *
 * Priority: 110 (lower priority - catch-all for text files)
 *
 * @example
 * ```typescript
 * const processor = new TextProcessor();
 *
 * const result = await processor.processFile({
 *   id: 'txt-123',
 *   name: 'readme.txt',
 *   mimetype: 'text/plain',
 *   size: 1024,
 *   url: 'https://example.com/readme.txt',
 * });
 *
 * if (result.success) {
 *   console.log('Content:', result.data.content);
 *   console.log('Lines:', result.data.lineCount);
 * }
 * ```
 */
export class TextProcessor extends BaseFileProcessor<ProcessedText> {
  constructor() {
    super({
      maxSizeMB: SIZE_LIMITS.TEXT_MAX_MB,
      timeoutMs: 30000,
      supportedMimeTypes: [...SUPPORTED_TEXT_TYPES],
      supportedExtensions: [...SUPPORTED_TEXT_EXTENSIONS],
      fileTypeName: "Text",
      defaultFilename: "document.txt",
    });
  }

  /**
   * Build processed text result with content analysis.
   * Counts lines and words, and truncates if necessary.
   *
   * @param buffer - Downloaded file content
   * @param fileInfo - Original file information
   * @returns Processed text result with content analysis
   */
  protected override buildProcessedResult(
    buffer: Buffer,
    fileInfo: FileInfo,
  ): ProcessedText {
    const content = buffer.toString("utf-8");
    const lines = content.split("\n");
    const words = content.split(/\s+/).filter((w) => w.length > 0);
    const filename = this.getFilename(fileInfo);

    // Truncate if too many lines
    let finalContent = content;
    let truncated = false;

    if (lines.length > SIZE_LIMITS.MAX_SOURCE_CODE_LINES) {
      truncated = true;
      finalContent = lines
        .slice(0, SIZE_LIMITS.MAX_SOURCE_CODE_LINES)
        .join("\n");
      finalContent += `\n\n... [Truncated: ${lines.length - SIZE_LIMITS.MAX_SOURCE_CODE_LINES} more lines]`;
    }

    return {
      content: finalContent,
      lineCount: lines.length,
      wordCount: words.length,
      encoding: "utf-8",
      truncated,
      buffer,
      mimetype: fileInfo.mimetype || "text/plain",
      size: fileInfo.size,
      filename,
    };
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Singleton text processor instance.
 * Use this for most processing needs.
 *
 * @example
 * ```typescript
 * import { textProcessor } from "./markup/TextProcessor.js";
 *
 * const result = await textProcessor.processFile(fileInfo);
 * ```
 */
export const textProcessor = new TextProcessor();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a file is a plain text file.
 *
 * @param mimetype - MIME type of the file
 * @param filename - Filename (for extension-based detection)
 * @returns true if the file is a plain text file
 *
 * @example
 * ```typescript
 * if (isTextFile('text/plain', 'readme.txt')) {
 *   // Handle as plain text
 * }
 *
 * // Also works with just filename
 * if (isTextFile('', 'debug.log')) {
 *   // Handle as text based on extension
 * }
 * ```
 */
export function isTextFile(mimetype: string, filename: string): boolean {
  return textProcessor.isFileSupported(mimetype, filename);
}

/**
 * Process a single plain text file.
 * Convenience function that uses the singleton processor.
 *
 * @param fileInfo - File information (can include URL or buffer)
 * @param options - Optional processing options (auth headers, timeout, retry config)
 * @returns Processing result with text content and analysis
 *
 * @example
 * ```typescript
 * const result = await processText({
 *   id: 'txt-123',
 *   name: 'notes.txt',
 *   mimetype: 'text/plain',
 *   size: 2048,
 *   buffer: textBuffer,
 * });
 *
 * if (result.success) {
 *   console.log('Content:', result.data.content);
 *   console.log('Lines:', result.data.lineCount);
 *   console.log('Words:', result.data.wordCount);
 *   if (result.data.truncated) {
 *     console.warn('Content was truncated');
 *   }
 * } else {
 *   console.error('Processing failed:', result.error.userMessage);
 * }
 * ```
 */
export async function processText(
  fileInfo: FileInfo,
  options?: ProcessOptions,
): Promise<FileProcessingResult<ProcessedText>> {
  return textProcessor.processFile(fileInfo, options);
}
