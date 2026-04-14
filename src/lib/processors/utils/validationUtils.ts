/**
 * Validation utilities for processors
 *
 * Provides helper functions for schema validation and common validation patterns.
 *
 * @module validationUtils
 */

import type {
  JsonObject,
  JsonValue,
  ProcessorConfigValidationResult,
} from "../../types/index.js";

/**
 * Validate that a value is a valid JSON object
 * @param value - Value to validate
 * @returns True if value is a valid JSON object
 */
export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Validate that a value is a valid JSON value
 * @param value - Value to validate
 * @returns True if value is a valid JSON value
 */
export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) {
    return true;
  }
  if (typeof value === "string") {
    return true;
  }
  if (typeof value === "number") {
    return true;
  }
  if (typeof value === "boolean") {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }
  if (isJsonObject(value)) {
    return Object.values(value).every(isJsonValue);
  }
  return false;
}

/**
 * Simple JSON schema validation
 * For production use, consider using ajv or similar library
 * @param data - Data to validate
 * @param schema - JSON schema to validate against
 * @returns Array of validation errors
 */
export function validateJsonSchema(
  data: unknown,
  schema: JsonObject,
): string[] {
  const errors: string[] = [];

  // Type validation
  if (schema.type) {
    const expectedType = schema.type as string;
    const actualType = Array.isArray(data) ? "array" : typeof data;

    if (expectedType === "object" && actualType !== "object") {
      errors.push(`Expected type 'object', got '${actualType}'`);
    } else if (expectedType === "array" && !Array.isArray(data)) {
      errors.push(`Expected type 'array', got '${actualType}'`);
    } else if (expectedType === "string" && typeof data !== "string") {
      errors.push(`Expected type 'string', got '${actualType}'`);
    } else if (expectedType === "number" && typeof data !== "number") {
      errors.push(`Expected type 'number', got '${actualType}'`);
    } else if (expectedType === "boolean" && typeof data !== "boolean") {
      errors.push(`Expected type 'boolean', got '${actualType}'`);
    } else if (expectedType === "null" && data !== null) {
      errors.push(`Expected type 'null', got '${actualType}'`);
    }
  }

  // Required fields validation
  if (schema.required && Array.isArray(schema.required) && isJsonObject(data)) {
    for (const field of schema.required) {
      if (typeof field === "string" && !(field in data)) {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }

  // Enum validation
  if (schema.enum && Array.isArray(schema.enum)) {
    if (!schema.enum.includes(data as JsonValue)) {
      errors.push(`Value must be one of: ${schema.enum.join(", ")}`);
    }
  }

  // String length validation
  if (typeof data === "string") {
    if (
      typeof schema.minLength === "number" &&
      data.length < schema.minLength
    ) {
      errors.push(
        `String length ${data.length} is less than minimum ${schema.minLength}`,
      );
    }
    if (
      typeof schema.maxLength === "number" &&
      data.length > schema.maxLength
    ) {
      errors.push(
        `String length ${data.length} exceeds maximum ${schema.maxLength}`,
      );
    }
    if (typeof schema.pattern === "string") {
      try {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(data)) {
          errors.push(`String does not match pattern: ${schema.pattern}`);
        }
      } catch {
        errors.push(`Invalid regex pattern in schema: ${schema.pattern}`);
      }
    }
  }

  // Number range validation
  if (typeof data === "number") {
    if (typeof schema.minimum === "number" && data < schema.minimum) {
      errors.push(`Number ${data} is less than minimum ${schema.minimum}`);
    }
    if (typeof schema.maximum === "number" && data > schema.maximum) {
      errors.push(`Number ${data} exceeds maximum ${schema.maximum}`);
    }
  }

  // Array validation
  if (Array.isArray(data)) {
    if (typeof schema.minItems === "number" && data.length < schema.minItems) {
      errors.push(
        `Array length ${data.length} is less than minimum ${schema.minItems}`,
      );
    }
    if (typeof schema.maxItems === "number" && data.length > schema.maxItems) {
      errors.push(
        `Array length ${data.length} exceeds maximum ${schema.maxItems}`,
      );
    }
  }

  return errors;
}

/**
 * Validate that a string matches a regex pattern
 * @param value - String to validate
 * @param pattern - Regex pattern
 * @returns True if value matches pattern
 */
export function matchesPattern(
  value: string,
  pattern: RegExp | string,
): boolean {
  const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
  return regex.test(value);
}

/**
 * Validate that a string is within length bounds
 * @param value - String to validate
 * @param minLength - Minimum length (inclusive)
 * @param maxLength - Maximum length (inclusive)
 * @returns True if string is within bounds
 */
export function isWithinLength(
  value: string,
  minLength: number = 0,
  maxLength: number = Number.MAX_SAFE_INTEGER,
): boolean {
  return value.length >= minLength && value.length <= maxLength;
}

/**
 * Validate that a number is within bounds
 * @param value - Number to validate
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns True if number is within bounds
 */
export function isWithinRange(
  value: number,
  min: number = Number.MIN_SAFE_INTEGER,
  max: number = Number.MAX_SAFE_INTEGER,
): boolean {
  return value >= min && value <= max;
}

/**
 * Check if a string contains any of the given substrings (case-insensitive)
 * @param text - Text to search in
 * @param substrings - Substrings to search for
 * @returns True if any substring is found
 */
export function containsAny(text: string, substrings: string[]): boolean {
  const lowerText = text.toLowerCase();
  return substrings.some((s) => lowerText.includes(s.toLowerCase()));
}

/**
 * Check if a string contains all of the given substrings (case-insensitive)
 * @param text - Text to search in
 * @param substrings - Substrings that must all be present
 * @returns True if all substrings are found
 */
export function containsAll(text: string, substrings: string[]): boolean {
  const lowerText = text.toLowerCase();
  return substrings.every((s) => lowerText.includes(s.toLowerCase()));
}

/**
 * Escape special regex characters in a string
 * @param string - String to escape
 * @returns Escaped string safe for use in regex
 */
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Create a word boundary regex for exact word matching
 * @param word - Word to match
 * @param flags - Regex flags (default: "gi")
 * @returns RegExp that matches the word with word boundaries
 */
export function createWordBoundaryRegex(
  word: string,
  flags: string = "gi",
): RegExp {
  return new RegExp(`\\b${escapeRegExp(word)}\\b`, flags);
}

/**
 * Validate that required fields are present in config
 * @param config - Configuration object to validate
 * @param requiredFields - Array of required field names
 * @returns Validation result
 */
export function validateRequiredFields(
  config: Record<string, unknown>,
  requiredFields: string[],
): ProcessorConfigValidationResult {
  const errors: string[] = [];

  for (const field of requiredFields) {
    if (
      !(field in config) ||
      config[field] === undefined ||
      config[field] === null
    ) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate that a value is one of the allowed values
 * @param value - Value to validate
 * @param allowedValues - Array of allowed values
 * @param fieldName - Name of the field for error messages
 * @returns Validation result
 */
export function validateAllowedValues<T>(
  value: T,
  allowedValues: T[],
  fieldName: string,
): ProcessorConfigValidationResult {
  if (!allowedValues.includes(value)) {
    return {
      valid: false,
      errors: [`${fieldName} must be one of: ${allowedValues.join(", ")}`],
    };
  }
  return { valid: true, errors: [] };
}
