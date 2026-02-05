/**
 * JSON Utilities
 *
 * Centralized JSON parsing, serialization, and extraction utilities.
 * Provides safe operations that handle errors gracefully without throwing.
 *
 * @module json
 *
 * @example
 * ```typescript
 * import {
 *   safeParseJson,
 *   parseJsonOrNull,
 *   isValidJson,
 *   safeStringify,
 *   extractJsonFromText,
 *   parseJsonFromText,
 * } from './utils/json/index.js';
 *
 * // Safe parsing with fallback
 * const config = safeParseJson(userInput, { theme: 'light' });
 *
 * // Check if valid before parsing
 * if (isValidJson(str)) {
 *   const data = JSON.parse(str);
 * }
 *
 * // Handle circular references
 * const json = safeStringify(complexObject, 2);
 *
 * // Extract JSON from AI responses
 * const result = extractJsonFromText(aiResponse);
 * ```
 */

export * from "./extract.js";
export * from "./safeParse.js";
