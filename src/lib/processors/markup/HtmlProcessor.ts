/**
 * HTML File Processor
 *
 * Processes HTML files with text extraction and security analysis.
 * HTML files are processed as text content for AI analysis, with
 * extraction of plain text content (tags stripped) for easier processing.
 *
 * Features:
 * - Original HTML content preservation
 * - Text extraction (all tags stripped)
 * - Script and style tag detection
 * - Title extraction
 * - Security warnings for dangerous content
 *
 * Security: Uses OWASP-compliant HTML sanitization utilities
 *
 * @module processors/markup/HtmlProcessor
 *
 * @example
 * ```typescript
 * import { htmlProcessor, processHtml, isHtmlFile } from "./markup/HtmlProcessor.js";
 *
 * // Check if file is HTML
 * if (isHtmlFile(mimetype, filename)) {
 *   const result = await processHtml(fileInfo);
 *   if (result.success) {
 *     console.log('Text content:', result.data.textContent);
 *     console.log('Has scripts:', result.data.hasScripts);
 *     if (result.data.title) {
 *       console.log('Page title:', result.data.title);
 *     }
 *   }
 * }
 * ```
 */

import {
  containsDangerousHtml,
  stripHtmlTags,
} from "../../utils/sanitizers/html.js";
import { BaseFileProcessor } from "../base/BaseFileProcessor.js";
import type {
  FileInfo,
  FileProcessingResult,
  ProcessOptions,
} from "../base/types.js";
import { SIZE_LIMITS } from "../config/index.js";

// Re-export for consumers who import from this module
export type { ProcessedHtml } from "../base/types.js";

// Import for local use
import type { ProcessedHtml } from "../base/types.js";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Supported HTML MIME types */
const SUPPORTED_HTML_TYPES = ["text/html", "application/xhtml+xml"] as const;

/** Supported HTML file extensions */
const SUPPORTED_HTML_EXTENSIONS = [".html", ".htm", ".xhtml"] as const;

/** Default timeout for HTML processing (30 seconds) */
const HTML_TIMEOUT_MS = 30000;

// =============================================================================
// HTML PROCESSOR
// =============================================================================

/**
 * HTML Processor - processes HTML files with text extraction.
 *
 * This processor extracts both the original HTML content and a plain text
 * version with all tags stripped. It also performs security analysis to
 * detect potentially dangerous content.
 *
 * Priority: 20 (after SVG at priority 5, before generic text)
 *
 * @example
 * ```typescript
 * const processor = new HtmlProcessor();
 *
 * const result = await processor.processFile({
 *   id: 'html-123',
 *   name: 'page.html',
 *   mimetype: 'text/html',
 *   size: 8192,
 *   url: 'https://example.com/page.html',
 * });
 *
 * if (result.success) {
 *   console.log('Title:', result.data.title);
 *   console.log('Text content:', result.data.textContent);
 * }
 * ```
 */
export class HtmlProcessor extends BaseFileProcessor<ProcessedHtml> {
  constructor() {
    super({
      maxSizeMB: SIZE_LIMITS.TEXT_MAX_MB,
      timeoutMs: HTML_TIMEOUT_MS,
      supportedMimeTypes: [...SUPPORTED_HTML_TYPES],
      supportedExtensions: [...SUPPORTED_HTML_EXTENSIONS],
      fileTypeName: "HTML",
      defaultFilename: "page.html",
    });
  }

  /**
   * Validate downloaded HTML file.
   * Performs basic validation to ensure content appears to be HTML.
   *
   * @param buffer - Downloaded file content
   * @param _fileInfo - Original file information
   * @returns null if valid, error message if invalid
   */
  protected override async validateDownloadedFile(
    buffer: Buffer,
    _fileInfo: FileInfo,
  ): Promise<string | null> {
    const content = buffer.toString("utf-8").trim();

    // Check minimum size
    if (content.length === 0) {
      return "Invalid HTML - file is empty";
    }

    // Very basic HTML detection - must contain at least one tag
    // We're lenient here because HTML can be quite varied
    const hasHtmlContent =
      content.includes("<") ||
      content.toLowerCase().includes("<!doctype") ||
      content.toLowerCase().includes("<html") ||
      content.toLowerCase().includes("<body") ||
      content.toLowerCase().includes("<head");

    if (!hasHtmlContent) {
      return "Invalid HTML - no HTML content detected";
    }

    return null;
  }

  /**
   * Build processed HTML result with text extraction.
   *
   * Processing steps:
   * 1. Preserve original HTML content
   * 2. Extract plain text (strip all tags)
   * 3. Detect script and style tags
   * 4. Extract page title if present
   * 5. Check for dangerous content
   *
   * @param buffer - Downloaded file content
   * @param fileInfo - Original file information
   * @returns Processed HTML result
   */
  protected override buildProcessedResult(
    buffer: Buffer,
    fileInfo: FileInfo,
  ): ProcessedHtml {
    const content = buffer.toString("utf-8");
    const filename = this.getFilename(fileInfo);

    // Extract text content (strip all tags)
    const textContent = stripHtmlTags(content);

    // Check for script and style tags
    const hasScripts = /<script[\s>]/i.test(content);
    const hasStyles = /<style[\s>]/i.test(content);

    // Extract title if present
    const titleMatch = content.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : undefined;

    // Check for dangerous content (XSS vectors)
    const hasDangerousContent = containsDangerousHtml(content);

    // Build base result
    const result: ProcessedHtml = {
      content,
      textContent,
      hasScripts,
      hasStyles,
      hasDangerousContent,
      buffer,
      mimetype: fileInfo.mimetype || "text/html",
      size: fileInfo.size,
      filename,
    };

    // Only include title if it was found (avoid undefined property with exactOptionalPropertyTypes)
    if (title) {
      result.title = title;
    }

    return result;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Singleton HTML processor instance.
 * Use this for most processing needs.
 *
 * @example
 * ```typescript
 * import { htmlProcessor } from "./markup/HtmlProcessor.js";
 *
 * const result = await htmlProcessor.processFile(fileInfo);
 * ```
 */
export const htmlProcessor = new HtmlProcessor();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a file is an HTML file.
 *
 * @param mimetype - MIME type of the file
 * @param filename - Filename (for extension-based detection)
 * @returns true if the file is an HTML file
 *
 * @example
 * ```typescript
 * if (isHtmlFile('text/html', 'page.html')) {
 *   // Handle as HTML
 * }
 *
 * // Also works with just filename
 * if (isHtmlFile('', 'index.htm')) {
 *   // Handle as HTML based on extension
 * }
 * ```
 */
export function isHtmlFile(mimetype: string, filename: string): boolean {
  return htmlProcessor.isFileSupported(mimetype, filename);
}

/**
 * Validate HTML file size against configured limit.
 *
 * @param sizeBytes - File size in bytes
 * @returns true if size is within the allowed limit
 *
 * @example
 * ```typescript
 * if (!validateHtmlSize(fileInfo.size)) {
 *   console.error('HTML file is too large');
 * }
 * ```
 */
export function validateHtmlSize(sizeBytes: number): boolean {
  const maxBytes = SIZE_LIMITS.TEXT_MAX_MB * 1024 * 1024;
  return sizeBytes <= maxBytes;
}

/**
 * Process a single HTML file.
 * Convenience function that uses the singleton processor.
 *
 * @param fileInfo - File information (can include URL or buffer)
 * @param options - Optional processing options (auth headers, timeout, retry config)
 * @returns Processing result with HTML content and extracted text
 *
 * @example
 * ```typescript
 * const result = await processHtml({
 *   id: 'html-123',
 *   name: 'page.html',
 *   mimetype: 'text/html',
 *   size: 8192,
 *   buffer: htmlBuffer,
 * });
 *
 * if (result.success) {
 *   console.log('Page title:', result.data.title);
 *   console.log('Text content:', result.data.textContent);
 *   if (result.data.hasDangerousContent) {
 *     console.warn('HTML contains potentially dangerous content');
 *   }
 * } else {
 *   console.error('Processing failed:', result.error.userMessage);
 * }
 * ```
 */
export async function processHtml(
  fileInfo: FileInfo,
  options?: ProcessOptions,
): Promise<FileProcessingResult<ProcessedHtml>> {
  return htmlProcessor.processFile(fileInfo, options);
}
