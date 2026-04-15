/**
 * Dynamic Arguments Runtime Utilities
 *
 * Provides type guard functions for dynamic argument resolution.
 * Type definitions live in src/lib/types/dynamic.ts (canonical location).
 *
 * @module dynamic/resolution
 */

import type {
  DynamicArgument,
  DynamicResolutionContext,
} from "../types/index.js";

/**
 * Type guard to check if a value is a DynamicArgument function
 */
export function isDynamicFunction<T>(
  value: DynamicArgument<T>,
): value is
  | (() => T)
  | (() => Promise<T>)
  | ((context: DynamicResolutionContext) => T)
  | ((context: DynamicResolutionContext) => Promise<T>) {
  return typeof value === "function";
}

/**
 * Type guard to check if a function expects context
 */
export function isContextAwareFunction<T>(
  fn: Function,
): fn is
  | ((context: DynamicResolutionContext) => T)
  | ((context: DynamicResolutionContext) => Promise<T>) {
  // Check function parameter count
  return fn.length > 0;
}
