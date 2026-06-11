/**
 * JSON Extraction Utilities
 *
 * Utilities for extracting JSON from mixed text content.
 * Particularly useful for parsing AI responses that contain JSON within prose.
 */

import { parseJsonOrNull } from "./safeParse.js";

/**
 * Find the first balanced JSON object/array span starting at or after
 * `fromIndex`. Quote- and escape-aware: braces inside string literals do not
 * affect depth. Returns the matched substring and the index just past it, or
 * null if no balanced span exists.
 */
export function nextBalancedJsonSpan(
  text: string,
  fromIndex = 0,
): { span: string; end: number } | null {
  for (let start = fromIndex; start < text.length; start++) {
    const openChar = text[start];
    if (openChar !== "{" && openChar !== "[") {
      continue;
    }
    const closeChar = openChar === "{" ? "}" : "]";
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (ch === "\\") {
        escapeNext = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) {
        continue;
      }
      if (ch === openChar) {
        depth++;
      } else if (ch === closeChar) {
        depth--;
        if (depth === 0) {
          return { span: text.substring(start, i + 1), end: i + 1 };
        }
      }
    }
    // Unbalanced from this start — try the next opening char.
  }
  return null;
}

/**
 * Extract JSON string from text that may contain surrounding content.
 *
 * Searches for valid JSON in the following order:
 * 1. Direct parse of the entire text
 * 2. JSON within markdown code blocks (```json ... ``` or ``` ... ```)
 * 3. JSON object pattern ({ ... })
 * 4. JSON array pattern ([ ... ])
 *
 * @param text - Text that may contain JSON
 * @returns Extracted JSON string or null if none found
 *
 * @example
 * ```typescript
 * const response = "Here's the data: {\"name\": \"test\"} Let me know if you need more.";
 * const json = extractJsonStringFromText(response);
 * // Returns: '{"name": "test"}'
 * ```
 */
export function extractJsonStringFromText(text: string): string | null {
  // Try direct parse first - maybe the whole text is valid JSON
  try {
    JSON.parse(text);
    return text;
  } catch {
    // Continue to extraction patterns
  }

  // Try to find JSON in code blocks (```json ... ``` or ``` ... ```)
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch?.[1]) {
    const potentialJson = codeBlockMatch[1].trim();
    try {
      JSON.parse(potentialJson);
      return potentialJson;
    } catch {
      // Continue to other patterns
    }
  }

  // Scan for balanced JSON object/array spans (quote/escape aware) and return
  // the first one that parses. Unlike a non-greedy regex, this never stops at a
  // "}" that lives inside a string value, so nested objects are preserved.
  let searchFrom = 0;
  for (;;) {
    const found = nextBalancedJsonSpan(text, searchFrom);
    if (!found) {
      break;
    }
    try {
      JSON.parse(found.span);
      return found.span;
    } catch {
      // Not valid JSON — resume scanning just past this opening character so a
      // valid inner object/array can still be found.
    }
    searchFrom = found.end - found.span.length + 1;
  }

  return null;
}

/**
 * Extract and parse JSON from mixed text content.
 *
 * Useful for parsing AI responses that contain JSON within prose.
 * Combines extraction and parsing in one step.
 *
 * @param text - Text that may contain JSON
 * @returns Parsed JSON value or null if not found/invalid
 *
 * @example
 * ```typescript
 * const response = `
 *   Here is your configuration:
 *   \`\`\`json
 *   {"theme": "dark", "fontSize": 14}
 *   \`\`\`
 *   Let me know if you need changes.
 * `;
 * const config = extractJsonFromText(response);
 * // Returns: { theme: "dark", fontSize: 14 }
 * ```
 */
export function extractJsonFromText(text: string): unknown | null {
  const jsonString = extractJsonStringFromText(text);
  if (!jsonString) {
    return null;
  }
  return parseJsonOrNull(jsonString);
}

// Re-import for local use within this file
import type { JsonTypeGuard } from "../../types/index.js";

/**
 * Parse JSON from text with optional type validation.
 *
 * Extracts JSON from text and optionally validates it against a type guard.
 * Useful when you need type-safe parsing of AI responses.
 *
 * @param text - Text that may contain JSON
 * @param validator - Optional type guard to validate the parsed result
 * @returns Parsed and validated JSON or null if not found/invalid/fails validation
 *
 * @example
 * ```typescript
 * interface UserConfig {
 *   theme: string;
 *   fontSize: number;
 * }
 *
 * function isUserConfig(obj: unknown): obj is UserConfig {
 *   return (
 *     typeof obj === 'object' &&
 *     obj !== null &&
 *     'theme' in obj &&
 *     'fontSize' in obj &&
 *     typeof (obj as UserConfig).theme === 'string' &&
 *     typeof (obj as UserConfig).fontSize === 'number'
 *   );
 * }
 *
 * const config = parseJsonFromText<UserConfig>(aiResponse, isUserConfig);
 * if (config) {
 *   // config is typed as UserConfig
 *   console.log(config.theme, config.fontSize);
 * }
 * ```
 */
export function parseJsonFromText<T>(
  text: string,
  validator?: JsonTypeGuard<T>,
): T | null {
  const parsed = extractJsonFromText(text);
  if (parsed === null) {
    return null;
  }
  if (validator && !validator(parsed)) {
    return null;
  }
  return parsed as T;
}

/**
 * Extract all JSON objects/arrays from text.
 *
 * Useful when text contains multiple JSON blocks.
 *
 * @param text - Text that may contain multiple JSON values
 * @returns Array of parsed JSON values
 *
 * @example
 * ```typescript
 * const text = 'First: {"a": 1} Second: {"b": 2}';
 * const results = extractAllJsonFromText(text);
 * // Returns: [{ a: 1 }, { b: 2 }]
 * ```
 */
export function extractAllJsonFromText(text: string): unknown[] {
  const results: unknown[] = [];

  // Extract from code blocks first
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/g;
  let match: RegExpExecArray | null = codeBlockRegex.exec(text);

  while (match !== null) {
    if (match[1]) {
      const potentialJson = match[1].trim();
      try {
        results.push(JSON.parse(potentialJson));
      } catch {
        // Not valid JSON, skip
      }
    }
    match = codeBlockRegex.exec(text);
  }

  // If we found code blocks, return those results
  if (results.length > 0) {
    return results;
  }

  // Otherwise, try to find all JSON objects and arrays
  // This is a simplified approach - it finds top-level JSON structures
  const remaining = text;
  let searchStart = 0;

  while (searchStart < remaining.length) {
    // Find next potential JSON start
    const objectStart = remaining.indexOf("{", searchStart);
    const arrayStart = remaining.indexOf("[", searchStart);

    let start: number;
    let isObject: boolean;

    if (objectStart === -1 && arrayStart === -1) {
      break;
    } else if (objectStart === -1) {
      start = arrayStart;
      isObject = false;
    } else if (arrayStart === -1) {
      start = objectStart;
      isObject = true;
    } else {
      start = Math.min(objectStart, arrayStart);
      isObject = objectStart < arrayStart;
    }

    // Try to find matching end
    const openChar = isObject ? "{" : "[";
    const closeChar = isObject ? "}" : "]";
    let depth = 0;
    let inString = false;
    let escapeNext = false;

    for (let i = start; i < remaining.length; i++) {
      const char = remaining[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === "\\") {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) {
        continue;
      }

      if (char === openChar) {
        depth++;
      } else if (char === closeChar) {
        depth--;
        if (depth === 0) {
          const potentialJson = remaining.substring(start, i + 1);
          try {
            results.push(JSON.parse(potentialJson));
            searchStart = i + 1;
          } catch {
            searchStart = start + 1;
          }
          break;
        }
      }
    }

    if (depth !== 0) {
      // Unbalanced brackets, move past this start
      searchStart = start + 1;
    }
  }

  return results;
}
