/**
 * NeuroLink Middleware System
 *
 * This module provides a comprehensive middleware system for NeuroLink that integrates
 * with the AI SDK's wrapLanguageModel functionality. It allows for modular enhancement
 * of language models with features like analytics, guardrails, caching, and more.
 */

// Import types and classes
import type {
  NeuroLinkMiddleware,
  MiddlewareRegistrationOptions,
  MiddlewareConfig,
} from "./types.js";
import { middlewareRegistry } from "./registry.js";
import { MiddlewareFactory } from "./factory.js";

// Core types and interfaces
export type {
  NeuroLinkMiddleware,
  MiddlewareConfig,
  MiddlewareContext,
  MiddlewareConditions,
  MiddlewareRegistrationOptions,
  MiddlewareExecutionResult,
  MiddlewareChainStats,
  MiddlewarePreset,
  MiddlewareFactoryOptions,
  BuiltInMiddlewareType,
} from "./types.js";

// Export AI SDK middleware type
export type { LanguageModelV1Middleware } from "ai";

// Registry for managing middleware
export { MiddlewareRegistry, middlewareRegistry } from "./registry.js";

// Factory for creating and applying middleware chains
export { MiddlewareFactory } from "./factory.js";

// Re-export built-in middleware when they're implemented
// export { analyticsMiddleware } from './built-in/analytics.js';
// export { guardrailsMiddleware } from './built-in/guardrails.js';
// export { loggingMiddleware } from './built-in/logging.js';
// export { cachingMiddleware } from './built-in/caching.js';
// export { rateLimitMiddleware } from './built-in/rateLimit.js';

/**
 * Convenience function to register a middleware
 */
export function registerMiddleware(
  middleware: NeuroLinkMiddleware,
  options?: MiddlewareRegistrationOptions,
): void {
  middlewareRegistry.register(middleware, options);
}

/**
 * Convenience function to unregister a middleware
 */
export function unregisterMiddleware(middlewareId: string): boolean {
  return middlewareRegistry.unregister(middlewareId);
}

/**
 * Convenience function to get all registered middleware
 */
export function listMiddleware(): NeuroLinkMiddleware[] {
  return middlewareRegistry.list();
}

/**
 * Convenience function to check if a middleware is registered
 */
export function hasMiddleware(middlewareId: string): boolean {
  return middlewareRegistry.has(middlewareId);
}

/**
 * Convenience function to get middleware execution statistics
 */
export function getMiddlewareStats(): Record<
  string,
  {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    lastExecutionTime: number;
  }
> {
  return middlewareRegistry.getAggregatedStats();
}

/**
 * Convenience function to clear middleware execution statistics
 */
export function clearMiddlewareStats(middlewareId?: string): void {
  middlewareRegistry.clearStats(middlewareId);
}

/**
 * Convenience function to get available middleware presets
 */
export function getAvailablePresets(): Array<{
  name: string;
  description: string;
  middleware: string[];
}> {
  return MiddlewareFactory.getAvailablePresets();
}

/**
 * Convenience function to validate middleware configuration
 */
export function validateMiddlewareConfig(
  config: Record<string, MiddlewareConfig>,
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  return MiddlewareFactory.validateConfig(config);
}
