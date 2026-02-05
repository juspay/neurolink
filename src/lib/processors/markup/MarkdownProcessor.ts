/**
 * Markdown File Processor
 *
 * Processes Markdown files with structure extraction and analysis.
 * Markdown files are analyzed to extract metadata about their structure
 * including headings, code blocks, and tables.
 *
 * Features:
 * - Original content preservation
 * - Line count calculation
 * - Code block detection
 * - Table detection
 * - Heading extraction (all levels)
 *
 * @module processors/markup/MarkdownProcessor
 *
 * @example
 * ```typescript
 * import { markdownProcessor, processMarkdown, isMarkdownFile } from "./markup/MarkdownProcessor.js";
 *
 * // Check if file is Markdown
 * if (isMarkdownFile(mimetype, filename)) {
 *   const result = await processMarkdown(fileInfo);
 *   if (result.success) {
 *     console.log('Line count:', result.data.lineCount);
 *     console.log('Headings:', result.data.headings);
 *     console.log('Has code blocks:', result.data.hasCodeBlocks);
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
import {
  MARKDOWN_EXTENSIONS,
  SIZE_LIMITS,
  TEXT_MIME_TYPES,
} from "../config/index.js";

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Supported Markdown MIME types.
 * Derived from the centralized TEXT_MIME_TYPES config.
 */
const SUPPORTED_MARKDOWN_TYPES = [
  TEXT_MIME_TYPES.MARKDOWN,
  TEXT_MIME_TYPES.MARKDOWN_ALT,
] as const;

/**
 * Supported Markdown file extensions.
 * Derived from the centralized MARKDOWN_EXTENSIONS config.
 */
const SUPPORTED_MARKDOWN_EXTENSIONS = MARKDOWN_EXTENSIONS;

/** Default timeout for Markdown processing (30 seconds) */
const MARKDOWN_TIMEOUT_MS = 30000;

// =============================================================================
// TYPES
// =============================================================================

export type { ProcessedMarkdown } from "../base/types.js";

// Re-import for local use within this file
import type { ProcessedMarkdown } from "../base/types.js";

// =============================================================================
// MARKDOWN PROCESSOR
// =============================================================================

/**
 * Markdown Processor - processes Markdown files with structure analysis.
 *
 * This processor analyzes Markdown documents to extract structural metadata
 * including headings, code blocks, and tables. The original content is
 * preserved for AI processing.
 *
 * Priority: 40 (before JSON at 50, before generic text at 110)
 *
 * @example
 * ```typescript
 * const processor = new MarkdownProcessor();
 *
 * const result = await processor.processFile({
 *   id: 'md-123',
 *   name: 'README.md',
 *   mimetype: 'text/markdown',
 *   size: 4096,
 *   url: 'https://example.com/README.md',
 * });
 *
 * if (result.success) {
 *   console.log('Headings:', result.data.headings);
 *   console.log('Has code blocks:', result.data.hasCodeBlocks);
 * }
 * ```
 */
export class MarkdownProcessor extends BaseFileProcessor<ProcessedMarkdown> {
  constructor() {
    super({
      maxSizeMB: SIZE_LIMITS.TEXT_MAX_MB,
      timeoutMs: MARKDOWN_TIMEOUT_MS,
      supportedMimeTypes: [...SUPPORTED_MARKDOWN_TYPES],
      supportedExtensions: [...SUPPORTED_MARKDOWN_EXTENSIONS],
      fileTypeName: "Markdown",
      defaultFilename: "document.md",
    });
  }

  /**
   * Validate downloaded Markdown file.
   * Markdown is very permissive - almost any text is valid.
   *
   * @param buffer - Downloaded file content
   * @param _fileInfo - Original file information
   * @returns null if valid, error message if invalid
   */
  protected override async validateDownloadedFile(
    buffer: Buffer,
    _fileInfo: FileInfo,
  ): Promise<string | null> {
    // Markdown is very permissive - any text is valid markdown
    // We only check for completely empty files
    if (buffer.length === 0) {
      return "Invalid Markdown - file is empty";
    }

    // Check if the content appears to be binary
    const content = buffer.toString("utf-8");
    const nullByteIndex = content.indexOf("\0");
    if (nullByteIndex !== -1 && nullByteIndex < 1000) {
      return "Invalid Markdown - appears to be binary file";
    }

    return null;
  }

  /**
   * Build processed Markdown result with structure analysis.
   *
   * Processing steps:
   * 1. Preserve original content
   * 2. Count lines
   * 3. Detect fenced code blocks
   * 4. Detect tables
   * 5. Extract headings
   *
   * @param buffer - Downloaded file content
   * @param fileInfo - Original file information
   * @returns Processed Markdown result
   */
  protected override buildProcessedResult(
    buffer: Buffer,
    fileInfo: FileInfo,
  ): ProcessedMarkdown {
    const content = buffer.toString("utf-8");
    const filename = this.getFilename(fileInfo);

    // Split into lines for analysis
    const lines = content.split("\n");

    // Extract headings (# lines at any level 1-6)
    const headings = lines
      .filter((line) => /^#{1,6}\s+/.test(line))
      .map((line) => line.replace(/^#+\s+/, "").trim());

    // Detect fenced code blocks (```)
    const hasCodeBlocks = /```/.test(content);

    // Detect Markdown tables (pipe-delimited rows with at least 2 pipes)
    // Looking for patterns like: | col1 | col2 |
    const hasTables = /\|.*\|.*\|/.test(content);

    return {
      content,
      lineCount: lines.length,
      hasCodeBlocks,
      hasTables,
      headings,
      buffer,
      mimetype: fileInfo.mimetype || "text/markdown",
      size: fileInfo.size,
      filename,
    };
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Singleton Markdown processor instance.
 * Use this for most processing needs.
 *
 * @example
 * ```typescript
 * import { markdownProcessor } from "./markup/MarkdownProcessor.js";
 *
 * const result = await markdownProcessor.processFile(fileInfo);
 * ```
 */
export const markdownProcessor = new MarkdownProcessor();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a file is a Markdown file.
 *
 * @param mimetype - MIME type of the file
 * @param filename - Filename (for extension-based detection)
 * @returns true if the file is a Markdown file
 *
 * @example
 * ```typescript
 * if (isMarkdownFile('text/markdown', 'README.md')) {
 *   // Handle as Markdown
 * }
 *
 * // Also works with just filename
 * if (isMarkdownFile('', 'CHANGELOG.markdown')) {
 *   // Handle as Markdown based on extension
 * }
 * ```
 */
export function isMarkdownFile(mimetype: string, filename: string): boolean {
  return markdownProcessor.isFileSupported(mimetype, filename);
}

/**
 * Validate Markdown file size against configured limit.
 *
 * @param sizeBytes - File size in bytes
 * @returns true if size is within the allowed limit
 *
 * @example
 * ```typescript
 * if (!validateMarkdownSize(fileInfo.size)) {
 *   console.error('Markdown file is too large');
 * }
 * ```
 */
export function validateMarkdownSize(sizeBytes: number): boolean {
  const maxBytes = SIZE_LIMITS.TEXT_MAX_MB * 1024 * 1024;
  return sizeBytes <= maxBytes;
}

/**
 * Process a single Markdown file.
 * Convenience function that uses the singleton processor.
 *
 * @param fileInfo - File information (can include URL or buffer)
 * @param options - Optional processing options (auth headers, timeout, retry config)
 * @returns Processing result with Markdown content and structure analysis
 *
 * @example
 * ```typescript
 * const result = await processMarkdown({
 *   id: 'md-123',
 *   name: 'README.md',
 *   mimetype: 'text/markdown',
 *   size: 4096,
 *   buffer: markdownBuffer,
 * });
 *
 * if (result.success) {
 *   console.log('Line count:', result.data.lineCount);
 *   console.log('Headings:', result.data.headings);
 *   if (result.data.hasCodeBlocks) {
 *     console.log('Document contains code examples');
 *   }
 * } else {
 *   console.error('Processing failed:', result.error.userMessage);
 * }
 * ```
 */
export async function processMarkdown(
  fileInfo: FileInfo,
  options?: ProcessOptions,
): Promise<FileProcessingResult<ProcessedMarkdown>> {
  return markdownProcessor.processFile(fileInfo, options);
}
