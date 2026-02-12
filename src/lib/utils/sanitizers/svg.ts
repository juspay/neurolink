/**
 * SVG Sanitization Utilities
 * OWASP-compliant SVG sanitization using allowlist approach
 *
 * This module addresses:
 * - Script tag injection
 * - Event handler injection (onload, onerror, etc.)
 * - javascript: URL schemes
 * - CSS-based XSS (expression(), url(), -moz-binding)
 * - SMIL animation attacks
 * - foreignObject-based HTML injection
 * - External reference attacks (use, image elements)
 * - XXE via DOCTYPE/ENTITY declarations
 *
 * Uses regex-based approach for robustness without external dependencies.
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
 */

/**
 * Safe SVG elements (allowlist)
 * Only these elements will be preserved in sanitized output
 */
const SAFE_SVG_ELEMENTS = new Set([
  // Container elements
  "svg",
  "g",
  "defs",
  "symbol",
  "marker",

  // Basic shapes
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "path",

  // Text
  "text",
  "tspan",

  // Gradients and patterns
  "linearGradient",
  "radialGradient",
  "stop",
  "pattern",

  // Clipping and masking
  "clipPath",
  "mask",

  // Filters (limited - no custom filters that could reference external resources)
  "filter",
  "feGaussianBlur",
  "feOffset",
  "feBlend",
  "feColorMatrix",
  "feMerge",
  "feMergeNode",

  // Metadata (safe)
  "title",
  "desc",
  "metadata",
]);

/**
 * Dangerous SVG elements (blocklist)
 * These elements are explicitly blocked due to XSS risks
 */
const DANGEROUS_SVG_ELEMENTS = new Set([
  "script", // Direct script execution
  "style", // Can contain CSS with XSS vectors
  "foreignObject", // Can contain HTML with XSS
  "use", // Can reference external SVG with malicious content
  "image", // Can reference external resources or data: URLs
  "a", // Can have href with javascript:
  "animate", // SMIL animations can set dangerous attributes
  "set", // SMIL - can set href to javascript:
  "animateMotion", // SMIL animation
  "animateTransform", // SMIL animation
  "animateColor", // SMIL animation (deprecated but still works in some browsers)
  "iframe", // Can embed external content
  "object", // Can embed external content
  "embed", // Can embed external content
]);

/**
 * Safe SVG attributes (allowlist)
 */
const SAFE_SVG_ATTRIBUTES = new Set([
  // Core attributes
  "id",
  "class",

  // Geometry
  "x",
  "y",
  "width",
  "height",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "d",
  "points",
  "x1",
  "y1",
  "x2",
  "y2",

  // Appearance (limited - style is intentionally excluded)
  "fill",
  "stroke",
  "stroke-width",
  "stroke-dasharray",
  "stroke-linecap",
  "stroke-linejoin",
  "opacity",
  "fill-opacity",
  "stroke-opacity",
  "fill-rule",

  // Transform
  "transform",

  // SVG-specific
  "viewBox",
  "xmlns",
  "xmlns:xlink",
  "preserveAspectRatio",
  "version",

  // Gradient/Pattern
  "offset",
  "stop-color",
  "stop-opacity",
  "gradientUnits",
  "gradientTransform",
  "patternUnits",
  "patternTransform",
  "spreadMethod",

  // Text
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "text-anchor",
  "dominant-baseline",
  "alignment-baseline",
  "letter-spacing",

  // Filter
  "stdDeviation",
  "dx",
  "dy",
  "in",
  "in2",
  "result",
  "mode",
  "type",
  "values",

  // Clip/Mask
  "clipPathUnits",
  "maskUnits",
  "maskContentUnits",

  // Marker
  "markerWidth",
  "markerHeight",
  "refX",
  "refY",
  "orient",
  "markerUnits",
]);

/**
 * Dangerous SVG attributes (blocklist)
 * These are explicitly blocked even if they appear on safe elements
 */
const DANGEROUS_SVG_ATTRIBUTES = new Set([
  "style", // Can contain CSS with expression(), url(), -moz-binding
  "href", // Can contain javascript:
  "xlink:href", // Can contain javascript:
  // Event handlers (comprehensive list)
  "onload",
  "onerror",
  "onclick",
  "onmouseover",
  "onmouseout",
  "onmousedown",
  "onmouseup",
  "onmousemove",
  "onfocus",
  "onblur",
  "onabort",
  "onbegin",
  "onend",
  "onrepeat",
  "onactivate",
  "onscroll",
  "onresize",
  "onzoom",
  "oninput",
  "onchange",
  "onsubmit",
  "onreset",
  "onkeydown",
  "onkeyup",
  "onkeypress",
  "ondrag",
  "ondragstart",
  "ondragend",
  "ondragenter",
  "ondragleave",
  "ondragover",
  "ondrop",
  // SVG-specific event handlers
  "onunload",
  "oncopy",
  "oncut",
  "onpaste",
]);

/**
 * Result of SVG sanitization including metadata about removed content
 */
export type SvgSanitizationResult = {
  /** Sanitized SVG content */
  content: string;
  /** Items that were removed during sanitization */
  removedItems: string[];
  /** Whether any content was modified */
  wasModified: boolean;
};

/**
 * Sanitize SVG content by removing dangerous elements and attributes.
 * Uses OWASP-compliant allowlist approach with regex-based parsing.
 *
 * @param svgContent - Raw SVG content to sanitize
 * @returns Sanitized SVG content
 * @throws Error if SVG content is invalid or contains XXE declarations
 *
 * @example
 * const malicious = '<svg><script>alert(1)</script></svg>';
 * const safe = sanitizeSvgContent(malicious); // '<svg></svg>'
 *
 * @example
 * const xss = '<svg onload="alert(1)"><rect fill="red"/></svg>';
 * const safe = sanitizeSvgContent(xss); // '<svg><rect fill="red"/></svg>'
 */
export function sanitizeSvgContent(svgContent: string): string {
  const result = sanitizeSvgContentDetailed(svgContent);
  return result.content;
}

/**
 * Sanitize SVG content with detailed information about what was removed.
 * Useful for logging and security auditing.
 *
 * @param svgContent - Raw SVG content to sanitize
 * @returns Detailed sanitization result with removed items
 * @throws Error if SVG content is invalid or contains XXE declarations
 */
export function sanitizeSvgContentDetailed(
  svgContent: string,
): SvgSanitizationResult {
  if (!svgContent || typeof svgContent !== "string") {
    throw new Error("SVG content is required and must be a string");
  }

  const removedItems: string[] = [];
  let content = svgContent;
  const originalContent = svgContent;

  // 1. Block DOCTYPE and ENTITY declarations (XXE prevention)
  if (content.includes("<!DOCTYPE") || content.includes("<!ENTITY")) {
    throw new Error(
      "SVG contains DOCTYPE or ENTITY declarations which are not allowed for security reasons",
    );
  }

  // 2. Remove XML stylesheet processing instructions
  const stylesheetRegex = /<\?xml-stylesheet[^?]*\?>/gi;
  if (stylesheetRegex.test(content)) {
    removedItems.push("XML stylesheet processing instruction");
    content = content.replace(stylesheetRegex, "");
  }

  // 3. Remove CDATA sections that might contain malicious content
  const cdataRegex = /<!\[CDATA\[[\s\S]*?\]\]>/gi;
  const cdataMatches = content.match(cdataRegex);
  if (cdataMatches) {
    removedItems.push(`CDATA sections (${cdataMatches.length} found)`);
    content = content.replace(cdataRegex, "");
  }

  // 4. Remove all dangerous elements with their content
  const dangerousElements = Array.from(DANGEROUS_SVG_ELEMENTS);
  for (let i = 0; i < dangerousElements.length; i++) {
    const element = dangerousElements[i];
    // Match both self-closing and paired tags
    const pairedRegex = new RegExp(
      `<${element}[^>]*>[\\s\\S]*?<\\/${element}>`,
      "gi",
    );
    const selfClosingRegex = new RegExp(`<${element}[^>]*\\/?>`, "gi");

    if (pairedRegex.test(content)) {
      removedItems.push(`Element: <${element}> (with content)`);
      content = content.replace(pairedRegex, "");
    }

    if (selfClosingRegex.test(content)) {
      removedItems.push(`Element: <${element}>`);
      content = content.replace(selfClosingRegex, "");
    }
  }

  // 5. Remove unknown elements (not in safe list)
  // Match element tags and check against allowlist
  const elementRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*\/?>/g;
  content = content.replace(elementRegex, (match, tagName) => {
    const lowerTagName = tagName.toLowerCase();

    // Skip XML declaration
    if (lowerTagName === "xml") {
      return match;
    }

    // Check if it's a safe element
    if (
      !SAFE_SVG_ELEMENTS.has(tagName) &&
      !SAFE_SVG_ELEMENTS.has(lowerTagName)
    ) {
      // Check case-insensitive match for camelCase elements like linearGradient
      const isSafe = Array.from(SAFE_SVG_ELEMENTS).some(
        (safe) => safe.toLowerCase() === lowerTagName,
      );
      if (!isSafe) {
        removedItems.push(`Unknown element: <${tagName}>`);
        return "";
      }
    }
    return match;
  });

  // 6. Remove dangerous attributes from remaining elements
  content = removeDangerousAttributes(content, removedItems);

  // 7. Remove javascript: URLs from any remaining attribute values
  const jsUrlRegex = /(?:=\s*["']?)javascript:[^"'\s>]*/gi;
  if (jsUrlRegex.test(content)) {
    removedItems.push("javascript: URL scheme");
    content = content.replace(jsUrlRegex, '=""');
  }

  // 8. Remove data: URLs (except for safe image types)
  const dataUrlRegex =
    /(?:=\s*["']?)data:(?!image\/(?:png|jpeg|jpg|gif|svg\+xml))[^"'\s>]*/gi;
  if (dataUrlRegex.test(content)) {
    removedItems.push("Suspicious data: URL");
    content = content.replace(dataUrlRegex, '=""');
  }

  // 9. Remove vbscript: URLs
  const vbscriptRegex = /(?:=\s*["']?)vbscript:[^"'\s>]*/gi;
  if (vbscriptRegex.test(content)) {
    removedItems.push("vbscript: URL scheme");
    content = content.replace(vbscriptRegex, '=""');
  }

  // 10. Clean up any empty elements left behind
  content = content.replace(/\s+/g, " ").trim();

  return {
    content,
    removedItems: Array.from(new Set(removedItems)), // Deduplicate
    wasModified: content !== originalContent,
  };
}

/**
 * Remove dangerous attributes from SVG elements.
 * Keeps only attributes in the safe allowlist.
 */
function removeDangerousAttributes(
  content: string,
  removedItems: string[],
): string {
  // Match elements with attributes
  const elementWithAttrsRegex = /<([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g;

  return content.replace(elementWithAttrsRegex, (match, tagName, attrs) => {
    if (!attrs || !attrs.trim()) {
      return match;
    }

    // Parse attributes
    const attrRegex =
      /([a-zA-Z][a-zA-Z0-9:_-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    const safeAttrs: string[] = [];
    let attrMatch: RegExpExecArray | null = attrRegex.exec(attrs);

    while (attrMatch !== null) {
      const attrName = attrMatch[1];
      const attrValue = attrMatch[2] ?? attrMatch[3] ?? "";
      const lowerAttrName = attrName.toLowerCase();

      // Check if attribute is explicitly dangerous
      if (DANGEROUS_SVG_ATTRIBUTES.has(lowerAttrName)) {
        removedItems.push(`Attribute: ${attrName}`);
        continue;
      }

      // Check if attribute starts with 'on' (event handler pattern)
      if (lowerAttrName.startsWith("on")) {
        removedItems.push(`Event handler: ${attrName}`);
        continue;
      }

      // Check if attribute is in safe list
      if (
        !SAFE_SVG_ATTRIBUTES.has(attrName) &&
        !SAFE_SVG_ATTRIBUTES.has(lowerAttrName)
      ) {
        // Check case-insensitive match for hyphenated attributes
        const isSafe = Array.from(SAFE_SVG_ATTRIBUTES).some(
          (safe) => safe.toLowerCase() === lowerAttrName,
        );
        if (!isSafe) {
          removedItems.push(`Unknown attribute: ${attrName}`);
          continue;
        }
      }

      // Validate attribute value
      const lowerValue = attrValue.toLowerCase();

      // Block javascript: URLs
      if (lowerValue.includes("javascript:")) {
        removedItems.push(`javascript: URL in ${attrName}`);
        continue;
      }

      // Block suspicious data: URLs (allow safe image types)
      if (
        lowerValue.startsWith("data:") &&
        !lowerValue.startsWith("data:image/png") &&
        !lowerValue.startsWith("data:image/jpeg") &&
        !lowerValue.startsWith("data:image/jpg") &&
        !lowerValue.startsWith("data:image/gif") &&
        !lowerValue.startsWith("data:image/svg+xml")
      ) {
        removedItems.push(`Suspicious data: URL in ${attrName}`);
        continue;
      }

      // Block expression() and other CSS XSS vectors in values
      if (
        lowerValue.includes("expression(") ||
        lowerValue.includes("-moz-binding") ||
        lowerValue.includes("behavior:")
      ) {
        removedItems.push(`CSS XSS vector in ${attrName}`);
        continue;
      }

      // Attribute is safe, keep it
      safeAttrs.push(`${attrName}="${escapeAttributeValue(attrValue)}"`);

      // Get next match
      attrMatch = attrRegex.exec(attrs);
    }

    // Also keep standalone attributes (like xmlns without value in some cases)
    const standaloneAttrRegex = /\s([a-zA-Z][a-zA-Z0-9:_-]*)(?=\s|>|$|\/)/g;
    let standaloneMatch: RegExpExecArray | null =
      standaloneAttrRegex.exec(attrs);
    while (standaloneMatch !== null) {
      const attrName = standaloneMatch[1];
      // Only keep if it looks like a valid attribute and is safe
      if (
        SAFE_SVG_ATTRIBUTES.has(attrName) ||
        SAFE_SVG_ATTRIBUTES.has(attrName.toLowerCase())
      ) {
        // Avoid duplicates
        if (!safeAttrs.some((a) => a.startsWith(`${attrName}=`))) {
          safeAttrs.push(attrName);
        }
      }
      standaloneMatch = standaloneAttrRegex.exec(attrs);
    }

    if (safeAttrs.length > 0) {
      return `<${tagName} ${safeAttrs.join(" ")}>`;
    }
    return `<${tagName}>`;
  });
}

/**
 * Escape attribute value to prevent injection
 */
function escapeAttributeValue(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Check if SVG content appears to be safe (quick validation).
 * Does NOT sanitize - use sanitizeSvgContent for that.
 *
 * @param svgContent - SVG content to check
 * @returns true if content appears safe, false if it contains suspicious patterns
 */
export function isSvgContentSafe(svgContent: string): boolean {
  if (!svgContent || typeof svgContent !== "string") {
    return false;
  }

  const lowerContent = svgContent.toLowerCase();

  // Check for XXE
  if (lowerContent.includes("<!doctype") || lowerContent.includes("<!entity")) {
    return false;
  }

  // Check for dangerous elements
  const dangerousElementsArray = Array.from(DANGEROUS_SVG_ELEMENTS);
  for (let i = 0; i < dangerousElementsArray.length; i++) {
    const element = dangerousElementsArray[i];
    if (lowerContent.includes(`<${element.toLowerCase()}`)) {
      return false;
    }
  }

  // Check for event handlers
  if (/\bon[a-z]+\s*=/i.test(svgContent)) {
    return false;
  }

  // Check for javascript: URLs
  if (lowerContent.includes("javascript:")) {
    return false;
  }

  return true;
}

/**
 * Legacy alias for sanitizeSvgContent.
 * Maintained for backward compatibility.
 *
 * @param svgContent - Raw SVG content
 * @returns Sanitized SVG content
 */
export function sanitizeSvg(svgContent: string): string {
  return sanitizeSvgContent(svgContent);
}

/**
 * Get lists of safe and dangerous elements/attributes for reference.
 * Useful for documentation and debugging.
 */
export function getSvgSanitizationRules(): {
  safeElements: string[];
  dangerousElements: string[];
  safeAttributes: string[];
  dangerousAttributes: string[];
} {
  return {
    safeElements: Array.from(SAFE_SVG_ELEMENTS),
    dangerousElements: Array.from(DANGEROUS_SVG_ELEMENTS),
    safeAttributes: Array.from(SAFE_SVG_ATTRIBUTES),
    dangerousAttributes: Array.from(DANGEROUS_SVG_ATTRIBUTES),
  };
}
