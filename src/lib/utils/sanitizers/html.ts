/**
 * HTML/XSS Sanitization Utilities
 * Context-aware output escaping following OWASP guidelines
 *
 * This module provides:
 * - HTML entity escaping for safe display
 * - JavaScript string escaping for embedding in scripts
 * - URL escaping for query parameters
 * - JSON string sanitization
 *
 * Pure TypeScript implementation with no external dependencies.
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
 */

/**
 * Escape HTML special characters for safe insertion into HTML context.
 * Use this when you need to display user text as plain text (not HTML).
 *
 * OWASP Rule 1: HTML Encode Before Inserting Untrusted Data into HTML Element Content
 *
 * @param text - Raw text to escape
 * @returns HTML-escaped text safe for insertion into HTML
 *
 * @example
 * const userName = '<script>alert(1)</script>';
 * const safe = escapeHtml(userName);
 * // Returns: '&lt;script&gt;alert(1)&lt;/script&gt;'
 *
 * @example
 * // Safe to use in HTML
 * const html = `<div>${escapeHtml(userInput)}</div>`;
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== "string") {
    return "";
  }

  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Unescape HTML entities back to their original characters.
 * Use with caution - only on trusted content.
 *
 * @param text - HTML-escaped text
 * @returns Unescaped text
 *
 * @example
 * const escaped = '&lt;div&gt;Hello&lt;/div&gt;';
 * const original = unescapeHtml(escaped);
 * // Returns: '<div>Hello</div>'
 */
export function unescapeHtml(text: string): string {
  if (!text || typeof text !== "string") {
    return "";
  }

  return text
    .replace(/&#x2F;/g, "/")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

/**
 * Escape text for safe insertion into JavaScript string literals.
 * Use when embedding user data in inline JavaScript.
 *
 * OWASP Rule 3: JavaScript Encode Before Inserting Untrusted Data into JavaScript Data Values
 *
 * @param text - Raw text to escape
 * @returns JavaScript-escaped text safe for string literals
 *
 * @example
 * const userInput = "Hello\nWorld";
 * const safe = escapeJavaScript(userInput);
 * // Returns: 'Hello\\nWorld'
 *
 * @example
 * // Safe to use in inline script
 * const script = `const name = '${escapeJavaScript(userName)}';`;
 */
export function escapeJavaScript(text: string): string {
  if (!text || typeof text !== "string") {
    return "";
  }

  return text
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/[\b]/g, "\\b") // Backspace (using character class)
    .replace(/\f/g, "\\f") // Form feed
    .replace(/</g, "\\x3C") // Prevent </script> injection
    .replace(/>/g, "\\x3E")
    .replace(/&/g, "\\x26");
}

/**
 * Escape text for safe insertion into URLs.
 * Use for query parameter values.
 *
 * OWASP Rule 5: URL Encode Before Inserting Untrusted Data into URL Parameter Values
 *
 * @param text - Raw text to escape
 * @returns URL-encoded text safe for query parameters
 *
 * @example
 * const query = 'hello world&foo=bar';
 * const safe = escapeUrl(query);
 * // Returns: 'hello%20world%26foo%3Dbar'
 *
 * @example
 * // Safe to use in URL
 * const url = `https://example.com/search?q=${escapeUrl(userQuery)}`;
 */
export function escapeUrl(text: string): string {
  if (!text || typeof text !== "string") {
    return "";
  }

  return encodeURIComponent(text);
}

/**
 * Decode URL-encoded text.
 *
 * @param text - URL-encoded text
 * @returns Decoded text
 *
 * @example
 * const encoded = 'hello%20world';
 * const decoded = decodeUrl(encoded);
 * // Returns: 'hello world'
 */
export function decodeUrl(text: string): string {
  if (!text || typeof text !== "string") {
    return "";
  }

  try {
    return decodeURIComponent(text);
  } catch {
    // Return original if decoding fails (malformed input)
    return text;
  }
}

/**
 * Sanitize JSON string value to prevent injection attacks.
 * Ensures string can be safely used in JSON without breaking structure.
 *
 * @param value - Raw string value
 * @returns Escaped string safe for JSON values
 *
 * @example
 * const userInput = 'Hello\n"World"';
 * const safe = sanitizeJsonString(userInput);
 * // Returns: 'Hello\\n\\"World\\"'
 */
export function sanitizeJsonString(value: string): string {
  if (!value || typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t")
    .replace(/[\b]/g, "\\b")
    .replace(/\f/g, "\\f");
}

/**
 * Escape text for safe insertion into CSS context.
 * Use when embedding user data in style attributes or stylesheets.
 *
 * OWASP Rule 4: CSS Encode And Strictly Validate Before Inserting Untrusted Data into HTML Style Property Values
 *
 * @param text - Raw text to escape
 * @returns CSS-escaped text
 *
 * @example
 * const userColor = 'red; background: url(evil.com)';
 * const safe = escapeCss(userColor);
 * // Escapes dangerous characters
 */
export function escapeCss(text: string): string {
  if (!text || typeof text !== "string") {
    return "";
  }

  // Escape characters that could break out of CSS context or inject malicious CSS
  return text
    .replace(/\\/g, "\\5c ")
    .replace(/"/g, "\\22 ")
    .replace(/'/g, "\\27 ")
    .replace(/</g, "\\3c ")
    .replace(/>/g, "\\3e ")
    .replace(/&/g, "\\26 ")
    .replace(/\(/g, "\\28 ")
    .replace(/\)/g, "\\29 ")
    .replace(/;/g, "\\3b ")
    .replace(/:/g, "\\3a ")
    .replace(/{/g, "\\7b ")
    .replace(/}/g, "\\7d ");
}

/**
 * Strip all HTML tags from content, leaving only text.
 * Useful for extracting plain text from HTML.
 *
 * @param html - HTML content
 * @returns Plain text with all tags removed
 *
 * @example
 * const html = '<p>Hello <b>World</b></p>';
 * const text = stripHtmlTags(html);
 * // Returns: 'Hello World'
 */
export function stripHtmlTags(html: string): string {
  if (!html || typeof html !== "string") {
    return "";
  }

  // Strip all HTML tags iteratively until the string is stable.
  // The loop handles nested tag fragments that reform after inner tags are removed,
  // e.g. "<scr<script>ipt>" becomes "<script>" after the first pass.
  // Using a single generic regex avoids fragile paired-tag matching
  // (e.g. <script>...</script>) which CodeQL flags for incomplete sanitization.
  let sanitized = html;
  let previous;
  do {
    previous = sanitized;
    sanitized = sanitized.replace(/<[^>]*>/g, "");
  } while (sanitized !== previous);

  return sanitized
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

/**
 * Escape text for safe use in XML/XHTML context.
 * Similar to HTML escaping but uses XML numeric entities.
 *
 * @param text - Raw text to escape
 * @returns XML-escaped text
 */
export function escapeXml(text: string): string {
  if (!text || typeof text !== "string") {
    return "";
  }

  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Sanitize content for safe inclusion in HTML attributes.
 * More aggressive than escapeHtml - also handles newlines and tabs.
 *
 * @param value - Attribute value to sanitize
 * @returns Sanitized attribute value
 *
 * @example
 * const attr = 'value" onclick="alert(1)';
 * const safe = sanitizeHtmlAttribute(attr);
 * // Returns: 'value&quot; onclick=&quot;alert(1)'
 */
export function sanitizeHtmlAttribute(value: string): string {
  if (!value || typeof value !== "string") {
    return "";
  }

  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "&#10;")
    .replace(/\r/g, "&#13;")
    .replace(/\t/g, "&#9;");
}

/**
 * Check if a string contains potentially dangerous HTML content.
 * Does NOT sanitize - use other functions for that.
 *
 * @param text - Text to check
 * @returns true if text contains dangerous patterns
 *
 * @example
 * containsDangerousHtml('<script>alert(1)</script>'); // true
 * containsDangerousHtml('Hello World'); // false
 */
export function containsDangerousHtml(text: string): boolean {
  if (!text || typeof text !== "string") {
    return false;
  }

  const lowerText = text.toLowerCase();

  // Check for script tags
  if (/<script/i.test(text)) {
    return true;
  }

  // Check for event handlers
  if (/\bon[a-z]+\s*=/i.test(text)) {
    return true;
  }

  // Check for javascript: URLs
  if (lowerText.includes("javascript:")) {
    return true;
  }

  // Check for data: URLs (potentially dangerous)
  if (lowerText.includes("data:text/html")) {
    return true;
  }

  // Check for CSS expressions
  if (lowerText.includes("expression(") || lowerText.includes("-moz-binding")) {
    return true;
  }

  // Check for iframe/object/embed
  if (/<(iframe|object|embed)/i.test(text)) {
    return true;
  }

  return false;
}
