/**
 * Dynamic Arguments Module
 *
 * Provides runtime configuration resolution for NeuroLink.
 * Supports static values, synchronous functions, asynchronous functions,
 * and context-aware functions for multi-tenant, user-preference-based configurations.
 *
 * @module arguments
 * @version 1.0.0
 *
 * @example Basic Usage
 * ```typescript
 * import {
 *   resolveDynamicArgument,
 *   withRequestContext,
 *   fromEnv,
 *   fromSecret,
 * } from './lib/arguments';
 *
 * // Static value
 * const result1 = await resolveDynamicArgument("gpt-4o");
 *
 * // Environment-based
 * const result2 = await resolveDynamicArgument(fromEnv("MODEL", "gpt-4o"));
 *
 * // Context-aware
 * await withRequestContext(
 *   { user: { id: "user1" }, tenant: { id: "tenant1", plan: "enterprise" } },
 *   async () => {
 *     const result = await resolveDynamicArgument(
 *       ({ requestContext }) =>
 *         requestContext.tenant?.plan === "enterprise"
 *           ? "claude-3-opus"
 *           : "gpt-4o-mini"
 *     );
 *   }
 * );
 * ```
 */

// ============================================================================
// Type Exports
// ============================================================================

export type {
  // Core types
  DynamicArgument,
  DynamicResolutionContext,
  RequestContext,
  ResolutionResult,
  ResolutionOptions,
  ResolutionType,

  // User/Tenant types
  UserPreferences,
  TenantQuotas,
  TenantSettings,
  RequestContextUser,
  RequestContextTenant,
  RequestContextSession,
  RequestContextResource,
  RequestContextEnvironment,

  // Resolver types
  SyncResolver,
  AsyncResolver,
  ContextAwareSyncResolver,
  ContextAwareAsyncResolver,
  ResolverFunction,
  ResolverMetadata,
  RegisteredResolver,

  // Cache types
  CacheStrategy,
  CacheEntry,
  CacheStats,

  // Configuration types
  DynamicConfig,
  ResolvedConfig,
  Resolved,
  BatchResolutionResult,
  ArgumentResolverConfig,
  CreateRequestContextOptions,
  RuntimeValueDescriptor,

  // Event types
  ArgumentResolutionEvents,
  ArgumentErrorCode,
} from "./types/argumentTypes.js";

export { ArgumentErrorCodes } from "./types/argumentTypes.js";

// ============================================================================
// Validator Exports
// ============================================================================

export {
  // Type guards
  isDynamicFunction,
  isContextAwareFunction,
  isAsyncFunction,
  getResolutionType,
  requiresContext,
  isAsyncArgument,

  // Request context guards
  isRequestContext,
  isRequestContextUser,
  isRequestContextTenant,
  isRequestContextSession,
  isDynamicResolutionContext,

  // Validation functions
  validateRequestContext,
  validateUser,
  validateTenant,
  validateSession,

  // Context creation
  generateRequestId,
  generateSessionId,
  createRequestContext,
  createMinimalContext,
  createResolutionContext,

  // Assertions
  assertContextProvided,
  assertDefined,

  // Type narrowing
  asStatic,
  asFunction,
} from "./ArgumentValidators.js";

// ============================================================================
// Resolver Exports
// ============================================================================

export {
  // Main resolver class
  ArgumentResolver,

  // Standalone resolution functions
  resolveDynamicArgument,
  resolveDynamicArguments,
  resolveDynamicConfig,

  // Helper utilities
  withFallback,
  conditional,
  memoize,
  lazy,
  transform,
  all,
  any,

  // Configuration
  configureDefaultResolver,
  resetDefaultResolver,
} from "./ArgumentResolver.js";

// ============================================================================
// Registry Exports
// ============================================================================

export {
  DynamicArgumentRegistry,
  getArgumentRegistry,
  registerResolver,
  resolveRegistered,
  resolverRef,
  type RegisterResolverOptions,
  type ResolverFilter,
} from "./DynamicArgumentRegistry.js";

// ============================================================================
// Context Resolver Exports
// ============================================================================

export {
  // Context access
  getCurrentContext,
  requireCurrentContext,
  getContextValue,

  // Context scopes
  withRequestContext,
  withUpdatedContext,
  withUser,
  withTenant,
  withSession,

  // Runtime values
  setRuntimeValue,
  getRuntimeValue,
  deleteRuntimeValue,
  hasRuntimeValue,

  // Context builder
  RequestContextBuilder,

  // HTTP integration
  createContextFromRequest,
  getContextHeaders,

  // Utilities
  cloneContext,
  createCurrentResolutionContext,
  hasContext,
  getCurrentUserId,
  getCurrentTenantId,
  getCurrentTenantPlan,
  hasRole,
  hasPermission,
  isEnterpriseTenant,
} from "./resolvers/ContextResolver.js";

// ============================================================================
// Environment Resolver Exports
// ============================================================================

export {
  // Direct access
  getEnv,
  requireEnv,
  getEnvNumber,
  getEnvBoolean,
  getEnvJson,
  getEnvArray,

  // Dynamic argument factories
  fromEnv,
  fromEnvRequired,
  fromEnvNumber,
  fromEnvBoolean,
  fromEnvJson,
  fromEnvArray,

  // Environment selection
  envSelect,
  byEnvironment,

  // Advanced configuration
  createEnvResolver,
  createPrefixedEnv,
  fromEnvMultiple,
  fromDescriptor,

  // Validation
  validateEnvVars,
  assertEnvVars,

  // Types
  type EnvConfigOptions,
} from "./resolvers/EnvironmentResolver.js";

// ============================================================================
// Secret Resolver Exports
// ============================================================================

export {
  // Secret provider types
  type SecretProvider,
  type SecretResolutionResult,
  type SecretManagerConfig,

  // Built-in providers
  envSecretProvider,
  createFileSecretProvider,
  createMockSecretProvider,

  // Secret manager
  SecretManager,

  // Dynamic argument factories
  fromSecret,
  fromSecretOptional,
  fromApiKey,
  fromTenantSecret,
  fromUserSecret,
  fromSecretChain,
  fromSecretWithTenantFallback,

  // Validation
  validateSecrets,
  assertSecrets,

  // Convenience functions
  getSecretSync,
  requireSecretSync,
  configureSecrets,
} from "./resolvers/SecretResolver.js";
