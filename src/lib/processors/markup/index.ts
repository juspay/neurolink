/**
 * Markup Processors Module
 *
 * Processors for markup-based file formats that are processed as TEXT
 * rather than binary data. This includes:
 * - SVG files (XML-based, despite being in image/* MIME type)
 * - HTML files (web pages with text extraction)
 * - Markdown files (documentation with structure analysis)
 *
 * @module processors/markup
 *
 * @example
 * ```typescript
 * import {
 *   // SVG Processor
 *   SvgProcessor,
 *   svgProcessor,
 *   isSvgFile,
 *   processSvg,
 *   type ProcessedSvg,
 *
 *   // HTML Processor
 *   HtmlProcessor,
 *   htmlProcessor,
 *   isHtmlFile,
 *   processHtml,
 *   type ProcessedHtml,
 *
 *   // Markdown Processor
 *   MarkdownProcessor,
 *   markdownProcessor,
 *   isMarkdownFile,
 *   processMarkdown,
 *   type ProcessedMarkdown,
 * } from "./markup/index.js";
 *
 * // Process an SVG file
 * if (isSvgFile(mimetype, filename)) {
 *   const result = await processSvg(fileInfo);
 *   if (result.success) {
 *     console.log(result.data.textContent);
 *   }
 * }
 *
 * // Process an HTML file
 * if (isHtmlFile(mimetype, filename)) {
 *   const result = await processHtml(fileInfo);
 *   if (result.success) {
 *     console.log('Title:', result.data.title);
 *     console.log('Text:', result.data.textContent);
 *   }
 * }
 *
 * // Process a Markdown file
 * if (isMarkdownFile(mimetype, filename)) {
 *   const result = await processMarkdown(fileInfo);
 *   if (result.success) {
 *     console.log('Headings:', result.data.headings);
 *   }
 * }
 * ```
 */

// =============================================================================
// SVG PROCESSOR
// =============================================================================

export {
  // Helper functions
  isSvgFile,
  // Types
  type ProcessedSvg,
  processSvg,
  // Processor class
  SvgProcessor,
  // Singleton instance
  svgProcessor,
  validateSvgSize,
} from "./SvgProcessor.js";

// =============================================================================
// HTML PROCESSOR
// =============================================================================

export {
  // Processor class
  HtmlProcessor,
  // Singleton instance
  htmlProcessor,
  // Helper functions
  isHtmlFile,
  // Types
  type ProcessedHtml,
  processHtml,
  validateHtmlSize,
} from "./HtmlProcessor.js";

// =============================================================================
// MARKDOWN PROCESSOR
// =============================================================================

export {
  // Helper functions
  isMarkdownFile,
  // Processor class
  MarkdownProcessor,
  // Singleton instance
  markdownProcessor,
  // Types
  type ProcessedMarkdown,
  processMarkdown,
  validateMarkdownSize,
} from "./MarkdownProcessor.js";

// =============================================================================
// TEXT PROCESSOR
// =============================================================================

export {
  // Helper functions
  isTextFile,
  // Types
  type ProcessedText,
  processText,
  // Processor class
  TextProcessor,
  // Singleton instance
  textProcessor,
} from "./TextProcessor.js";
