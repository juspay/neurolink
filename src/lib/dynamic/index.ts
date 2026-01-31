/**
 * Dynamic Arguments Module
 *
 * Provides Mastra-style dynamic configuration capabilities for NeuroLink,
 * enabling runtime resolution of configuration values through static values,
 * synchronous functions, asynchronous functions, or context-aware callbacks.
 *
 * Features:
 * - Type-safe dynamic arguments with full TypeScript inference
 * - Flexible resolution (static, sync, async, context-aware functions)
 * - Request context propagation via AsyncLocalStorage
 * - Multi-level caching (per-request, per-user, per-tenant, global)
 * - Utility functions: withFallback, conditional, memoize
 * - Full backward compatibility with existing static configurations
 *
 * @module dynamic
 *
 * @example Basic usage
 * ```typescript
 * import { DynamicArgument, resolveDynamicArgument, withFallback } from '@juspay/neurolink/dynamic';
 *
 * // Static value
 * const model: DynamicArgument<string> = "gpt-4o";
 *
 * // Context-aware function
 * const dynamicModel: DynamicArgument<string> = ({ requestContext }) =>
 *   requestContext.tenant?.plan === "enterprise" ? "claude-3-opus" : "gpt-4o-mini";
 *
 * // With fallback chain
 * const modelWithFallback = withFallback(
 *   ({ requestContext }) => requestContext.user?.preferences?.preferredModel,
 *   ({ requestContext }) => requestContext.tenant?.settings?.defaultModel,
 *   "gpt-4o-mini" // Final fallback
 * );
 * ```
 *
 * @example With request context
 * ```typescript
 * import { withRequestContext, RequestContextBuilder } from '@juspay/neurolink/dynamic';
 *
 * // Using withRequestContext
 * const result = await withRequestContext(
 *   {
 *     user: { id: "user123", preferences: { preferredModel: "claude-3-sonnet" } },
 *     tenant: { id: "tenant456", plan: "enterprise" }
 *   },
 *   () => neurolink.generate({ input: { text: "Hello" }, model: dynamicModel })
 * );
 *
 * // Using RequestContextBuilder
 * const result = await new RequestContextBuilder()
 *   .withUser({ id: "user123" })
 *   .withTenant({ id: "tenant456", plan: "enterprise" })
 *   .withRuntimeValue("taskComplexity", "high")
 *   .run(() => neurolink.generate({ input: { text: "Hello" }, model: dynamicModel }));
 * ```
 */

// Type exports
export type {
  // Core types
  DynamicArgument,
  DynamicResolutionContext,
  RequestContext,
  ResolutionOptions,
  ResolutionResult,

  // Configuration types
  DynamicConfig,
  ResolvedConfig,
  DynamicGenerateOptions,
  DynamicStreamOptions,
  DynamicToolConfig,
  DynamicMiddlewareConfig,

  // User and tenant types
  UserPreferences,
  TenantQuotas,
  TenantSettings,

  // Cache types
  CacheEntry,
  CacheStrategy,
  DynamicCacheConfig,
  DynamicArgumentMetadata,
} from "./types.js";

// Type guard exports
export { isDynamicFunction, isContextAwareFunction } from "./types.js";

// Resolution utilities
export {
  resolveDynamicArgument,
  resolveDynamicArguments,
  resolveDynamicConfig,
  memoizeDynamicArgument,
  withFallback,
  conditional,
  mapDynamicArgument,
  combineDynamicArguments,
  hasDynamicArgument,
  hasDynamicProperties,
  clearResolutionCache,
  getResolutionCacheStats,
  destroyResolver,
  resolutionCache,
  type Resolved,
  // Environment variable interpolation
  interpolateEnvVars,
  fromEnv,
  envVar,
  envSwitch,
  envJson,
  envNumber,
  envBoolean,
  envList,
} from "./dynamicResolver.js";

// Request context system
export {
  createRequestContext,
  withRequestContext,
  getCurrentContext,
  requireContext,
  hasContext,
  updateCurrentContext,
  setRuntimeValue,
  getRuntimeValue,
  deleteRuntimeValue,
  clearRuntimeValues,
  createResolutionContext,
  createResolutionContextFromRequest,
  createContextFromRequest,
  RequestContextBuilder,
  createChildContext,
  withChildContext,
} from "./requestContext.js";

// Caching system
export {
  DynamicCache,
  dynamicCache,
  createCacheKey,
  createStrategyCacheKey,
  withCache,
  invalidateCachePattern,
  type CacheStats,
} from "./caching.js";
