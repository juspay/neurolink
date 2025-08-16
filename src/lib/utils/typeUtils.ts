/**
 * Type Utilities - Centralized type checking functions
 *
 * Consolidates common type checking patterns to reduce code duplication
 * and provide consistent type guards across the codebase.
 */

/**
 * Type guard to check if a value is a non-null object
 * Excludes arrays and null values
 *
 * @param value - Value to check
 * @returns true if value is a non-null object (excluding arrays)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Type guard to check if a value is a non-null object (including arrays)
 *
 * @param value - Value to check
 * @returns true if value is a non-null object (including arrays)
 */
export function isNonNullObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

/**
 * Type guard to check if a value is a plain object with string keys
 *
 * @param value - Value to check
 * @returns true if value is a plain object with string keys
 */
export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return isObject(value) && Object.getPrototypeOf(value) === Object.prototype;
}

/**
 * Type guard to check if a value is an array
 *
 * @param value - Value to check
 * @returns true if value is an array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Type guard to check if a value is a string
 *
 * @param value - Value to check
 * @returns true if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Type guard to check if a value is a number
 *
 * @param value - Value to check
 * @returns true if value is a number and not NaN
 */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value);
}

/**
 * Type guard to check if a value is a boolean
 *
 * @param value - Value to check
 * @returns true if value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/**
 * Type guard to check if a value is a function
 *
 * @param value - Value to check
 * @returns true if value is a function
 */
export function isFunction(value: unknown): value is Function {
  return typeof value === "function";
}

/**
 * Type guard to check if a value is null or undefined
 *
 * @param value - Value to check
 * @returns true if value is null or undefined
 */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Type guard to check if a value is defined (not undefined)
 *
 * @param value - Value to check
 * @returns true if value is not undefined
 */
export function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
