/**
 * Safe JSON Parsing Utilities
 *
 * Centralized JSON parsing utilities that handle errors gracefully.
 * Provides safe parsing that doesn't throw on invalid JSON.
 */

/**
 * Result type for safe JSON parsing operations
 */
export type SafeParseResult<T> = {
  success: boolean;
  data: T | null;
  error: Error | null;
};

/**
 * Safely parse a JSON string without throwing.
 *
 * This is the preferred method for parsing JSON from external sources
 * (user input, API responses, etc.) where invalid JSON is possible.
 *
 * @param str - The string to parse as JSON
 * @returns Object with success flag and either data or error
 *
 * @example
 * ```typescript
 * const result = safeParseJsonResult<UserData>(userInput);
 * if (result.success) {
 *   console.log(result.data.name);
 * } else {
 *   console.error('Invalid JSON:', result.error.message);
 * }
 * ```
 */
export function safeParseJsonResult<T = unknown>(
  str: string,
): SafeParseResult<T> {
  try {
    const data = JSON.parse(str) as T;
    return { success: true, data, error: null };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Safely parse JSON with fallback value.
 *
 * Useful when you need a value regardless of parse success.
 *
 * @param str - The string to parse as JSON
 * @param fallback - Value to return if parsing fails
 * @returns Parsed value or fallback
 *
 * @example
 * ```typescript
 * const config = safeParseJson(configString, { theme: 'light' });
 * // Always returns an object, never throws
 * ```
 */
export function safeParseJson<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

/**
 * Parse JSON or return undefined if invalid.
 *
 * @param str - The string to parse as JSON
 * @returns Parsed value or undefined
 *
 * @example
 * ```typescript
 * const data = parseJsonOrUndefined<Config>(input);
 * if (data) {
 *   // Use data
 * }
 * ```
 */
export function parseJsonOrUndefined<T>(str: string): T | undefined {
  try {
    return JSON.parse(str) as T;
  } catch {
    return undefined;
  }
}

/**
 * Parse JSON or return null if invalid.
 *
 * @param str - The string to parse as JSON
 * @returns Parsed value or null
 *
 * @example
 * ```typescript
 * const data = parseJsonOrNull<Config>(input);
 * if (data !== null) {
 *   // Use data
 * }
 * ```
 */
export function parseJsonOrNull<T>(str: string): T | null {
  try {
    return JSON.parse(str) as T;
  } catch {
    return null;
  }
}

/**
 * Check if a string is valid JSON.
 *
 * @param str - The string to validate
 * @returns true if the string is valid JSON
 *
 * @example
 * ```typescript
 * if (isValidJson(userInput)) {
 *   // Proceed with parsing
 * }
 * ```
 */
export function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safe stringify with circular reference handling.
 *
 * Handles circular references, BigInt values, and other edge cases gracefully.
 *
 * @param obj - Value to stringify
 * @param space - Optional indentation (number of spaces)
 * @returns JSON string, with circular references replaced by "[Circular]"
 *
 * @example
 * ```typescript
 * const obj = { name: 'test' };
 * obj.self = obj; // Circular reference
 *
 * const json = safeStringify(obj);
 * // Returns: '{"name":"test","self":"[Circular]"}'
 *
 * const prettyJson = safeStringify(data, 2);
 * // Returns formatted JSON with 2-space indentation
 * ```
 */
export function safeStringify(obj: unknown, space?: number): string {
  const seen = new WeakSet();
  return JSON.stringify(
    obj,
    (_key, value) => {
      // Handle BigInt
      if (typeof value === "bigint") {
        return value.toString();
      }
      // Handle circular references
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return "[Circular]";
        }
        seen.add(value);
      }
      return value;
    },
    space,
  );
}

/**
 * Safe stringify with options for more control.
 *
 * @param obj - Value to stringify
 * @param options - Stringify options
 * @returns JSON string or fallback string on error
 *
 * @example
 * ```typescript
 * const json = safeStringifyWithOptions(data, {
 *   pretty: true,
 *   fallback: '{}',
 * });
 * ```
 */
export function safeStringifyWithOptions(
  obj: unknown,
  options?: {
    /** Use 2-space indentation */
    pretty?: boolean;
    /** Value to return if stringify fails */
    fallback?: string;
  },
): string {
  const { pretty = false, fallback = "[Unable to stringify]" } = options ?? {};

  try {
    const space = pretty ? 2 : undefined;
    return safeStringify(obj, space);
  } catch {
    return fallback;
  }
}
