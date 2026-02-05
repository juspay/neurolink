/**
 * Security Sanitizers
 *
 * OWASP-compliant sanitization utilities for secure input/output handling.
 * Pure TypeScript implementation with no external dependencies.
 *
 * @module sanitizers
 *
 * @example
 * // SVG sanitization
 * import { sanitizeSvgContent } from './sanitizers/index.js';
 * const safeSvg = sanitizeSvgContent(untrustedSvg);
 *
 * @example
 * // HTML escaping
 * import { escapeHtml } from './sanitizers/index.js';
 * const safeText = escapeHtml(userInput);
 *
 * @example
 * // Filename sanitization
 * import { sanitizeFileName } from './sanitizers/index.js';
 * const safeFilename = sanitizeFileName(uploadedFilename);
 */

// Filename and display name sanitization
export {
  generateSafeFileName,
  getDangerousExtensions,
  getFileExtension,
  isDangerousExtension,
  isValidDisplayName,
  isValidFileName,
  type SanitizeDisplayNameOptions,
  type SanitizeFileNameOptions,
  sanitizeDisplayName,
  sanitizeFileName,
} from "./filename.js";

// HTML escaping and sanitization
export {
  containsDangerousHtml,
  decodeUrl,
  escapeCss,
  escapeHtml,
  escapeJavaScript,
  escapeUrl,
  escapeXml,
  sanitizeHtmlAttribute,
  sanitizeJsonString,
  stripHtmlTags,
  unescapeHtml,
} from "./html.js";
// SVG sanitization
export {
  getSvgSanitizationRules,
  isSvgContentSafe,
  type SvgSanitizationResult,
  sanitizeSvg,
  sanitizeSvgContent,
  sanitizeSvgContentDetailed,
} from "./svg.js";
