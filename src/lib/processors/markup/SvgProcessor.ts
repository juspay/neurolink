/**
 * SVG File Processor
 *
 * Processes SVG files as TEXT content, not as images, because:
 * 1. Most AI vision models don't support SVG format directly
 * 2. SVG is XML-based and can be analyzed as code/markup
 * 3. SVG can contain security risks (scripts, XSS vectors)
 *
 * Security: Uses OWASP-compliant allowlist-based SVG sanitization
 *
 * @module processors/markup/SvgProcessor
 *
 * @example
 * ```typescript
 * import { svgProcessor, processSvg, isSvgFile } from "./markup/SvgProcessor.js";
 *
 * // Check if file is SVG
 * if (isSvgFile(mimetype, filename)) {
 *   const result = await processSvg(fileInfo);
 *   if (result.success) {
 *     console.log('Sanitized SVG:', result.data.textContent);
 *     if (result.data.securityWarnings.length > 0) {
 *       console.warn('Security warnings:', result.data.securityWarnings);
 *     }
 *   }
 * }
 * ```
 */

import {
  isSvgContentSafe,
  sanitizeSvgContent,
} from "../../utils/sanitizers/svg.js";
import { BaseFileProcessor } from "../base/BaseFileProcessor.js";
import type {
  FileInfo,
  FileProcessingResult,
  ProcessOptions,
} from "../base/types.js";

// =============================================================================
// CONSTANTS
// =============================================================================

/** SVG MIME type */
const SUPPORTED_SVG_TYPES = ["image/svg+xml"] as const;

/** SVG file extension */
const SUPPORTED_SVG_EXTENSIONS = [".svg"] as const;

// =============================================================================
// TYPES
// =============================================================================

export type { ProcessedSvg } from "../base/types.js";

// Re-import for local use within this file
import type { ProcessedSvg } from "../base/types.js";

// =============================================================================
// SVG PROCESSOR
// =============================================================================

/**
 * SVG Processor - processes SVG as TEXT, not as image.
 *
 * Why text instead of image:
 * 1. Most AI vision models don't support SVG format
 * 2. SVG is XML-based and can be analyzed as markup
 * 3. Security: SVG can contain scripts and XSS vectors
 *
 * Priority: 5 (before IMAGE at priority 10)
 *
 * @example
 * ```typescript
 * const processor = new SvgProcessor();
 *
 * const result = await processor.processFile({
 *   id: 'svg-123',
 *   name: 'diagram.svg',
 *   mimetype: 'image/svg+xml',
 *   size: 2048,
 *   url: 'https://example.com/diagram.svg',
 * });
 *
 * if (result.success) {
 *   // Use sanitized SVG text content
 *   console.log(result.data.textContent);
 * }
 * ```
 */
export class SvgProcessor extends BaseFileProcessor<ProcessedSvg> {
  constructor() {
    super({
      maxSizeMB: 5,
      timeoutMs: 30000,
      supportedMimeTypes: [...SUPPORTED_SVG_TYPES],
      supportedExtensions: [...SUPPORTED_SVG_EXTENSIONS],
      fileTypeName: "SVG",
      defaultFilename: "image.svg",
    });
  }

  /**
   * Validate downloaded SVG file.
   * Checks for valid XML structure (SVG must contain <svg> element).
   *
   * @param buffer - Downloaded file content
   * @param fileInfo - Original file information
   * @returns null if valid, error message if invalid
   */
  protected override async validateDownloadedFile(
    buffer: Buffer,
    _fileInfo: FileInfo,
  ): Promise<string | null> {
    const content = buffer.toString("utf-8").trim();

    // Check for valid SVG content
    // Valid SVG can start with: <?xml, <!DOCTYPE, <svg, or just contain <svg
    const startsWithXml = content.startsWith("<?xml");
    const startsWithDoctype = content.toLowerCase().startsWith("<!doctype");
    const startsWithSvg = content.toLowerCase().startsWith("<svg");
    const containsSvgTag = content.toLowerCase().includes("<svg");

    if (
      !startsWithXml &&
      !startsWithDoctype &&
      !startsWithSvg &&
      !containsSvgTag
    ) {
      // Check if it might be HTML (download error page)
      if (content.toLowerCase().includes("<html")) {
        return "Download failed - received HTML instead of SVG content";
      }

      return "Invalid SVG - missing <svg> element";
    }

    return null;
  }

  /**
   * Build processed SVG result with sanitized content.
   * Applies security sanitization to remove potentially malicious content.
   *
   * @param buffer - Downloaded file content
   * @param fileInfo - Original file information
   * @returns Processed SVG result with sanitized text content
   */
  protected override buildProcessedResult(
    buffer: Buffer,
    fileInfo: FileInfo,
  ): ProcessedSvg {
    const rawContent = buffer.toString("utf-8");
    const filename = this.getFilename(fileInfo);

    // Check if content is safe before sanitization
    const wasSafe = isSvgContentSafe(rawContent);

    // Build security warnings (initialized before try/catch so catch block can append)
    const securityWarnings: string[] = [];

    // Apply security sanitization using allowlist-based approach
    let textContent: string;
    try {
      textContent = sanitizeSvgContent(rawContent);
    } catch {
      // Fail closed: if sanitization fails (e.g., malformed XML with XXE),
      // return a safe empty SVG instead of attempting regex-based cleanup.
      // Regex cannot safely sanitize XML/HTML (context-free grammar).
      textContent = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
      securityWarnings.push(
        "SVG sanitization failed - malformed content replaced with empty SVG for security",
      );
    }
    if (!wasSafe) {
      securityWarnings.push(
        "SVG contained potentially unsafe content that was sanitized",
      );
    }

    // Check if content was actually modified
    const contentWasModified = textContent !== rawContent;

    return {
      textContent,
      // Only include raw content if sanitization actually changed it (for debugging)
      rawContent: contentWasModified ? rawContent : undefined,
      sanitized: !wasSafe || contentWasModified,
      securityWarnings,
      buffer,
      mimetype: fileInfo.mimetype || "image/svg+xml",
      size: fileInfo.size,
      filename,
    };
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Singleton SVG processor instance.
 * Use this for most processing needs.
 *
 * @example
 * ```typescript
 * import { svgProcessor } from "./markup/SvgProcessor.js";
 *
 * const result = await svgProcessor.processFile(fileInfo);
 * ```
 */
export const svgProcessor = new SvgProcessor();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a file is an SVG file.
 *
 * @param mimetype - MIME type of the file
 * @param filename - Filename (for extension-based detection)
 * @returns true if the file is an SVG
 *
 * @example
 * ```typescript
 * if (isSvgFile('image/svg+xml', 'diagram.svg')) {
 *   // Handle as SVG
 * }
 *
 * // Also works with just filename
 * if (isSvgFile('', 'icon.svg')) {
 *   // Handle as SVG based on extension
 * }
 * ```
 */
export function isSvgFile(mimetype: string, filename: string): boolean {
  return svgProcessor.isFileSupported(mimetype, filename);
}

/**
 * Validate SVG file size against configured limit.
 *
 * @param sizeBytes - File size in bytes
 * @returns true if size is within the allowed limit (5 MB)
 *
 * @example
 * ```typescript
 * if (!validateSvgSize(fileInfo.size)) {
 *   console.error('SVG file is too large');
 * }
 * ```
 */
export function validateSvgSize(sizeBytes: number): boolean {
  const maxBytes = 5 * 1024 * 1024; // 5 MB
  return sizeBytes <= maxBytes;
}

/**
 * Process a single SVG file.
 * Convenience function that uses the singleton processor.
 *
 * @param fileInfo - File information (can include URL or buffer)
 * @param options - Optional processing options (auth headers, timeout, retry config)
 * @returns Processing result with sanitized SVG text content
 *
 * @example
 * ```typescript
 * const result = await processSvg({
 *   id: 'svg-123',
 *   name: 'diagram.svg',
 *   mimetype: 'image/svg+xml',
 *   size: 2048,
 *   buffer: svgBuffer,
 * });
 *
 * if (result.success) {
 *   console.log('Processed SVG:', result.data.textContent);
 *   if (result.data.sanitized) {
 *     console.log('Content was sanitized for security');
 *   }
 * } else {
 *   console.error('Processing failed:', result.error.userMessage);
 * }
 * ```
 */
export async function processSvg(
  fileInfo: FileInfo,
  options?: ProcessOptions,
): Promise<FileProcessingResult<ProcessedSvg>> {
  return svgProcessor.processFile(fileInfo, options);
}
