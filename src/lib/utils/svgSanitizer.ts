/**
 * SVG Sanitization Utility
 * Removes potentially dangerous elements from SVG content to prevent XSS attacks
 */

import type { SVGSanitizationOptions } from "../types/fileTypes.js";
import { logger } from "./logger.js";

/**
 * Result of SVG sanitization
 */
export type SVGSanitizationResult = {
  content: string;
  sanitized: boolean;
  removedElements: string[];
  warnings: string[];
};

/**
 * Default sanitization options
 */
const DEFAULT_OPTIONS: Required<SVGSanitizationOptions> = {
  allowSvg: true,
  sanitize: true,
  removeScripts: true,
  removeEventHandlers: true,
  removeJavaScriptUrls: true,
};

/**
 * List of event handler attributes that can execute JavaScript
 */
const EVENT_HANDLER_ATTRIBUTES = [
  "onabort",
  "onactivate",
  "onafterprint",
  "onbeforeprint",
  "onbegin",
  "oncancel",
  "oncanplay",
  "oncanplaythrough",
  "onchange",
  "onclick",
  "onclose",
  "oncontextmenu",
  "oncopy",
  "oncuechange",
  "oncut",
  "ondblclick",
  "ondrag",
  "ondragend",
  "ondragenter",
  "ondragleave",
  "ondragover",
  "ondragstart",
  "ondrop",
  "ondurationchange",
  "onemptied",
  "onend",
  "onended",
  "onerror",
  "onfocus",
  "onfocusin",
  "onfocusout",
  "onhashchange",
  "oninput",
  "oninvalid",
  "onkeydown",
  "onkeypress",
  "onkeyup",
  "onload",
  "onloadeddata",
  "onloadedmetadata",
  "onloadstart",
  "onmessage",
  "onmousedown",
  "onmouseenter",
  "onmouseleave",
  "onmousemove",
  "onmouseout",
  "onmouseover",
  "onmouseup",
  "onmousewheel",
  "onoffline",
  "ononline",
  "onpagehide",
  "onpageshow",
  "onpaste",
  "onpause",
  "onplay",
  "onplaying",
  "onpopstate",
  "onprogress",
  "onratechange",
  "onrepeat",
  "onreset",
  "onresize",
  "onscroll",
  "onseeked",
  "onseeking",
  "onselect",
  "onshow",
  "onstalled",
  "onstorage",
  "onsubmit",
  "onsuspend",
  "ontimeupdate",
  "ontoggle",
  "onunload",
  "onvolumechange",
  "onwaiting",
  "onwheel",
  "onzoom",
];

/**
 * SVG Sanitizer class for removing potentially dangerous elements
 */
export class SVGSanitizer {
  /**
   * Sanitize SVG content to remove potentially dangerous elements
   *
   * @param content - SVG content as string or Buffer
   * @param options - Sanitization options
   * @returns Sanitization result with cleaned content and metadata
   */
  static sanitize(
    content: string | Buffer,
    options?: SVGSanitizationOptions,
  ): SVGSanitizationResult {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const svgString =
      typeof content === "string" ? content : content.toString("utf-8");
    const removedElements: string[] = [];
    const warnings: string[] = [];

    // If SVG is not allowed, throw an error
    if (!opts.allowSvg) {
      throw new Error(
        "SVG files are not allowed. Set svgOptions.allowSvg to true to allow SVG processing.",
      );
    }

    // If sanitization is disabled, return content as-is with warning
    if (!opts.sanitize) {
      const hasScripts = /<script[\s\S]*?<\/script>/gi.test(svgString);
      const hasEventHandlers = this.hasEventHandlers(svgString);
      const hasJavaScriptUrls = /javascript:/gi.test(svgString);

      if (hasScripts || hasEventHandlers || hasJavaScriptUrls) {
        warnings.push(
          "SVG contains potentially dangerous content but sanitization is disabled",
        );
        logger.warn(
          "[SVGSanitizer] Processing unsanitized SVG with potentially dangerous content",
        );
      }

      return {
        content: svgString,
        sanitized: false,
        removedElements: [],
        warnings,
      };
    }

    let sanitized = svgString;

    // Remove script tags
    if (opts.removeScripts) {
      const scriptMatches = sanitized.match(/<script[\s\S]*?<\/script>/gi);
      if (scriptMatches) {
        removedElements.push(
          ...scriptMatches.map((m) => `script tag: ${m.substring(0, 50)}...`),
        );
        sanitized = sanitized.replace(/<script[\s\S]*?<\/script>/gi, "");
        logger.debug(
          `[SVGSanitizer] Removed ${scriptMatches.length} script tag(s)`,
        );
      }

      // Also remove script tags that might be self-closing or malformed
      const selfClosingScripts = sanitized.match(/<script[^>]*\/>/gi);
      if (selfClosingScripts) {
        removedElements.push(
          ...selfClosingScripts.map(
            (m) => `self-closing script: ${m.substring(0, 50)}`,
          ),
        );
        sanitized = sanitized.replace(/<script[^>]*\/>/gi, "");
      }

      // Remove script tags without closing tags (malformed)
      const malformedScripts = sanitized.match(/<script[^>]*>/gi);
      if (malformedScripts) {
        removedElements.push(
          ...malformedScripts.map(
            (m) => `malformed script: ${m.substring(0, 50)}`,
          ),
        );
        sanitized = sanitized.replace(/<script[^>]*>/gi, "");
      }
    }

    // Remove event handler attributes
    if (opts.removeEventHandlers) {
      for (const handler of EVENT_HANDLER_ATTRIBUTES) {
        // Match event handler attributes with various quote styles
        const patterns = [
          new RegExp(`\\s${handler}\\s*=\\s*"[^"]*"`, "gi"),
          new RegExp(`\\s${handler}\\s*=\\s*'[^']*'`, "gi"),
          new RegExp(`\\s${handler}\\s*=\\s*[^\\s>]+`, "gi"),
        ];

        for (const pattern of patterns) {
          const matches = sanitized.match(pattern);
          if (matches) {
            removedElements.push(...matches.map((m) => m.trim()));
            sanitized = sanitized.replace(pattern, "");
          }
        }
      }
    }

    // Remove javascript: URLs
    if (opts.removeJavaScriptUrls) {
      // Match href, xlink:href, src attributes with javascript: URLs
      const jsUrlPatterns = [
        /\s(href|xlink:href|src)\s*=\s*["']javascript:[^"']*["']/gi,
        /\s(href|xlink:href|src)\s*=\s*javascript:[^\s>]+/gi,
      ];

      for (const pattern of jsUrlPatterns) {
        const matches = sanitized.match(pattern);
        if (matches) {
          removedElements.push(
            ...matches.map((m) => `javascript URL: ${m.trim()}`),
          );
          sanitized = sanitized.replace(pattern, "");
        }
      }

      // Also check for data: URLs that might contain JavaScript
      const dataUrlPattern =
        /\s(href|xlink:href|src)\s*=\s*["']data:text\/html[^"']*["']/gi;
      const dataMatches = sanitized.match(dataUrlPattern);
      if (dataMatches) {
        removedElements.push(
          ...dataMatches.map((m) => `data URL: ${m.trim()}`),
        );
        sanitized = sanitized.replace(dataUrlPattern, "");
      }
    }

    if (removedElements.length > 0) {
      logger.info(
        `[SVGSanitizer] Removed ${removedElements.length} potentially dangerous element(s)`,
      );
    }

    return {
      content: sanitized,
      sanitized: true,
      removedElements,
      warnings,
    };
  }

  /**
   * Check if SVG content contains event handler attributes
   */
  private static hasEventHandlers(content: string): boolean {
    for (const handler of EVENT_HANDLER_ATTRIBUTES) {
      const pattern = new RegExp(`\\s${handler}\\s*=`, "gi");
      if (pattern.test(content)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if content is SVG by examining content patterns
   */
  static isSVG(content: string | Buffer): boolean {
    const str =
      typeof content === "string" ? content : content.toString("utf-8");
    const trimmed = str.trimStart();
    return (
      trimmed.startsWith("<svg") ||
      trimmed.startsWith("<?xml") ||
      (trimmed.includes("<svg") && trimmed.includes("</svg>"))
    );
  }

  /**
   * Validate SVG content for security issues without modifying it
   * Returns a list of security concerns found
   */
  static validate(content: string | Buffer): string[] {
    const str =
      typeof content === "string" ? content : content.toString("utf-8");
    const issues: string[] = [];

    // Check for script tags
    if (/<script[\s\S]*?<\/script>/gi.test(str)) {
      issues.push("Contains script tags which can execute JavaScript");
    }

    // Check for event handlers
    if (this.hasEventHandlers(str)) {
      issues.push(
        "Contains event handler attributes which can execute JavaScript",
      );
    }

    // Check for javascript: URLs
    if (/javascript:/gi.test(str)) {
      issues.push("Contains javascript: URLs which can execute JavaScript");
    }

    // Check for data: URLs with HTML content
    if (/data:text\/html/gi.test(str)) {
      issues.push(
        "Contains data: URLs with HTML content which may be dangerous",
      );
    }

    return issues;
  }
}
