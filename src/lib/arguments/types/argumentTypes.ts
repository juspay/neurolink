/**
 * Dynamic Arguments Type System
 *
 * Provides type definitions for runtime configuration resolution in NeuroLink.
 * Supports static values, synchronous functions, asynchronous functions,
 * and context-aware functions for multi-tenant, user-preference-based configurations.
 *
 * @module arguments/types
 * @version 1.0.0
 */

import type { AIProviderName } from "../../constants/enums.js";
import type { UnknownRecord } from "../../types/common.js";

// ============================================================================
// User and Tenant Types
// ============================================================================

/**
 * User preferences for AI interactions
 */
export type UserPreferences = {
  /** Preferred AI provider */
  preferredProvider?: AIProviderName | string;
  /** Preferred model name */
  preferredModel?: string;
  /** Default temperature setting */
  temperature?: number;
  /** Default max tokens */
  maxTokens?: number;
  /** Thinking level for extended reasoning */
  thinkingLevel?: "minimal" | "low" | "medium" | "high";
  /** Preferred language */
  language?: string;
  /** User's timezone */
  timezone?: string;
  /** Response style preference */
  responseStyle?: "concise" | "detailed" | "conversational";
  /** Custom preferences */
  custom?: UnknownRecord;
};

/**
 * Tenant-level quotas and limits
 */
export type TenantQuotas = {
  /** Maximum tokens per day */
  tokensPerDay?: number;
  /** Maximum tokens per month */
  tokensPerMonth?: number;
  /** Rate limit: requests per minute */
  requestsPerMinute?: number;
  /** Rate limit: requests per day */
  requestsPerDay?: number;
  /** Maximum tokens per single request */
  maxTokensPerRequest?: number;
  /** List of allowed provider names */
  allowedProviders?: string[];
  /** List of allowed model names */
  allowedModels?: string[];
};

/**
 * Tenant-level settings and defaults
 */
export type TenantSettings = {
  /** Default provider for this tenant */
  defaultProvider?: AIProviderName | string;
  /** Default model for this tenant */
  defaultModel?: string;
  /** Default temperature */
  defaultTemperature?: number;
  /** Default max tokens */
  defaultMaxTokens?: number;
  /** Enable tool usage */
  enableTools?: boolean;
  /** Enable streaming responses */
  enableStreaming?: boolean;
  /** API key overrides per provider */
  apiKeyOverrides?: Record<string, string>;
  /** Model overrides per provider */
  modelOverrides?: Record<string, string>;
  /** Custom settings */
  custom?: UnknownRecord;
};

// ============================================================================
// Request Context Types
// ============================================================================

/**
 * User information within request context
 */
export type RequestContextUser = {
  /** Unique user identifier */
  id: string;
  /** User email */
  email?: string;
  /** User display name */
  name?: string;
  /** User roles for authorization */
  roles?: string[];
  /** Fine-grained permissions */
  permissions?: string[];
  /** User preferences for AI */
  preferences?: UserPreferences;
  /** Additional user metadata */
  metadata?: UnknownRecord;
};

/**
 * Tenant/organization information within request context
 */
export type RequestContextTenant = {
  /** Unique tenant identifier */
  id: string;
  /** Tenant name */
  name?: string;
  /** Subscription plan */
  plan?: "free" | "starter" | "pro" | "enterprise";
  /** Tenant quotas */
  quotas?: TenantQuotas;
  /** Tenant settings */
  settings?: TenantSettings;
  /** Additional tenant metadata */
  metadata?: UnknownRecord;
};

/**
 * Session information within request context
 */
export type RequestContextSession = {
  /** Unique session identifier */
  id: string;
  /** Session start timestamp (unix ms) */
  startedAt: number;
  /** Associated conversation ID */
  conversationId?: string;
  /** Session expiry timestamp */
  expiresAt?: number;
  /** Additional session metadata */
  metadata?: UnknownRecord;
};

/**
 * Resource information for the current operation
 */
export type RequestContextResource = {
  /** Resource type (e.g., "document", "conversation") */
  type: string;
  /** Resource identifier */
  id?: string;
  /** Resource action being performed */
  action?: string;
  /** Additional resource metadata */
  metadata?: UnknownRecord;
};

/**
 * Environment information
 */
export type RequestContextEnvironment = {
  /** Node environment (development, production, etc.) */
  nodeEnv: string;
  /** Deployment region */
  region?: string;
  /** Deployment identifier */
  deploymentId?: string;
  /** Service version */
  version?: string;
};

/**
 * Complete request context passed to dynamic argument resolvers.
 * Contains all information about the current request, user, tenant, and session.
 */
export type RequestContext = {
  /** Unique request identifier */
  requestId: string;

  /** Timestamp when context was created (unix ms) */
  timestamp: number;

  /** User information */
  user?: RequestContextUser;

  /** Tenant/organization information */
  tenant?: RequestContextTenant;

  /** Session information */
  session?: RequestContextSession;

  /** Resource information */
  resource?: RequestContextResource;

  /** Environment information */
  environment?: RequestContextEnvironment;

  /** Runtime context values (mutable during request) */
  runtime?: Map<string, unknown>;

  /** Custom context extensions */
  custom?: UnknownRecord;
};

// ============================================================================
// Dynamic Resolution Context
// ============================================================================

/**
 * NeuroLink instance interface for resolution context
 * Provides access to NeuroLink capabilities during resolution
 */
export type DynamicResolutionNeuroLink = {
  /** Get list of available tools */
  getAvailableTools: () => Promise<string[]>;
  /** Check provider availability */
  getProviderStatus: (provider: string) => Promise<boolean>;
  /** Get runtime context map */
  getRuntimeContext: () => Map<string, unknown> | undefined;
};

/**
 * Context for dynamic argument resolution.
 * Combines request context with NeuroLink instance access.
 */
export type DynamicResolutionContext = {
  /** Current request context */
  requestContext: RequestContext;

  /** Access to NeuroLink instance methods (subset) */
  neurolink?: DynamicResolutionNeuroLink;

  /** Abort signal for cancellation */
  signal?: AbortSignal;
};

// ============================================================================
// Dynamic Argument Types
// ============================================================================

/**
 * Synchronous resolver function (no arguments)
 */
export type SyncResolver<T> = () => T;

/**
 * Asynchronous resolver function (no arguments)
 */
export type AsyncResolver<T> = () => Promise<T>;

/**
 * Context-aware synchronous resolver function
 */
export type ContextAwareSyncResolver<T> = (
  context: DynamicResolutionContext,
) => T;

/**
 * Context-aware asynchronous resolver function
 */
export type ContextAwareAsyncResolver<T> = (
  context: DynamicResolutionContext,
) => Promise<T>;

/**
 * Any resolver function type
 */
export type ResolverFunction<T> =
  | SyncResolver<T>
  | AsyncResolver<T>
  | ContextAwareSyncResolver<T>
  | ContextAwareAsyncResolver<T>;

/**
 * Dynamic argument type - can be static, function, or context-aware function.
 * This is the core type that enables runtime configuration resolution.
 *
 * @template T - The resolved value type
 *
 * @example Static value
 * ```typescript
 * const model: DynamicArgument<string> = "gpt-4o";
 * ```
 *
 * @example Sync function
 * ```typescript
 * const model: DynamicArgument<string> = () => process.env.MODEL || "gpt-4o";
 * ```
 *
 * @example Async function
 * ```typescript
 * const model: DynamicArgument<string> = async () => {
 *   const config = await fetchConfig();
 *   return config.model;
 * };
 * ```
 *
 * @example Context-aware function
 * ```typescript
 * const model: DynamicArgument<string> = ({ requestContext }) => {
 *   return requestContext.tenant?.plan === "enterprise"
 *     ? "claude-3-opus"
 *     : "gpt-4o-mini";
 * };
 * ```
 */
export type DynamicArgument<T> = T | ResolverFunction<T>;

// ============================================================================
// Resolution Types
// ============================================================================

/**
 * Type of resolution that was performed
 */
export type ResolutionType =
  | "static"
  | "sync-function"
  | "async-function"
  | "context-aware"
  | "context-aware-async";

/**
 * Result of resolving a dynamic argument
 */
export type ResolutionResult<T> = {
  /** The resolved value */
  value: T;

  /** Type of resolution performed */
  resolutionType: ResolutionType;

  /** Whether result was from cache */
  fromCache: boolean;

  /** Time taken to resolve (ms) */
  resolutionTime: number;

  /** Cache key if caching was used */
  cacheKey?: string;

  /** Error that occurred during resolution (if throwOnError is false) */
  error?: Error;
};

/**
 * Options for resolution behavior
 */
export type ResolutionOptions<T = unknown> = {
  /** Whether to throw on resolution error (default: true) */
  throwOnError?: boolean;

  /** Default value to use if resolution fails */
  defaultValue?: T;

  /** Timeout in milliseconds for async resolution */
  timeout?: number;

  /** Whether to cache the result */
  cache?: boolean;

  /** Cache TTL in milliseconds */
  cacheTtl?: number;

  /** Cache strategy */
  cacheStrategy?: CacheStrategy;

  /** Unique identifier for caching (auto-generated if not provided) */
  argumentId?: string;

  /** Abort signal for cancellation */
  signal?: AbortSignal;
};

// ============================================================================
// Caching Types
// ============================================================================

/**
 * Cache strategy for resolved values
 */
export type CacheStrategy =
  | "per-request" // Cache for current request only
  | "per-user" // Cache per user
  | "per-tenant" // Cache per tenant
  | "global"; // Global cache

/**
 * Cache entry with metadata
 */
export type CacheEntry<T> = {
  /** Cached value */
  value: T;

  /** When the entry was created */
  createdAt: number;

  /** When the entry expires */
  expiresAt: number;

  /** Cache strategy used */
  strategy: CacheStrategy;

  /** Additional cache metadata */
  metadata?: UnknownRecord;
};

/**
 * Cache statistics
 */
export type CacheStats = {
  /** Total cache hits */
  hits: number;

  /** Total cache misses */
  misses: number;

  /** Current cache size */
  size: number;

  /** Hit rate percentage */
  hitRate: number;
};

// ============================================================================
// Dynamic Configuration Types
// ============================================================================

/**
 * Convert a type to have dynamic argument versions of each property
 */
export type DynamicConfig<T> = {
  [K in keyof T]: DynamicArgument<T[K]>;
};

/**
 * Convert dynamic config back to resolved static values
 */
export type ResolvedConfig<T> = {
  [K in keyof T]: T[K] extends DynamicArgument<infer U> ? U : T[K];
};

/**
 * Extract the resolved type from a DynamicArgument
 */
export type Resolved<T> = T extends DynamicArgument<infer U> ? U : T;

/**
 * Batch resolution result
 */
export type BatchResolutionResult<T extends readonly unknown[]> = {
  /** Resolved values in order */
  values: { [K in keyof T]: ResolutionResult<Resolved<T[K]>> };

  /** Total resolution time */
  totalTime: number;

  /** Number of cache hits */
  cacheHits: number;

  /** Number of errors (if throwOnError is false) */
  errors: number;
};

// ============================================================================
// Resolver Registration Types
// ============================================================================

/**
 * Resolver metadata for registration
 */
export type ResolverMetadata = {
  /** Resolver name */
  name: string;

  /** Resolver description */
  description?: string;

  /** Resolver version */
  version?: string;

  /** Whether resolver is async */
  isAsync: boolean;

  /** Whether resolver requires context */
  requiresContext: boolean;

  /** Estimated resolution time (ms) */
  estimatedTime?: number;

  /** Tags for categorization */
  tags?: string[];
};

/**
 * Registered resolver entry
 */
export type RegisteredResolver<T = unknown> = {
  /** Unique resolver ID */
  id: string;

  /** Resolver (can be static value, function, or context-aware function) */
  resolver: DynamicArgument<T>;

  /** Resolver metadata */
  metadata: ResolverMetadata;

  /** Default resolution options */
  defaultOptions?: ResolutionOptions<T>;
};

// ============================================================================
// Event Types
// ============================================================================

/**
 * Event payload types
 */
export type ResolutionStartEvent = {
  argumentId: string;
  resolutionType: ResolutionType;
  timestamp: number;
};

export type ResolutionCompleteEvent = {
  argumentId: string;
  resolutionType: ResolutionType;
  duration: number;
  fromCache: boolean;
};

export type ResolutionErrorEvent = {
  argumentId: string;
  error: Error;
  willRetry: boolean;
};

export type CacheHitEvent = {
  argumentId: string;
  cacheKey: string;
  strategy: CacheStrategy;
};

export type CacheMissEvent = {
  argumentId: string;
  cacheKey: string;
  strategy: CacheStrategy;
};

export type CacheExpiredEvent = {
  argumentId: string;
  cacheKey: string;
};

/**
 * Events emitted during resolution.
 * Each event maps to an array of arguments for TypedEventEmitter compatibility.
 */
export type ArgumentResolutionEvents = {
  /** Resolution started */
  "resolution:start": [ResolutionStartEvent];

  /** Resolution completed */
  "resolution:complete": [ResolutionCompleteEvent];

  /** Resolution error */
  "resolution:error": [ResolutionErrorEvent];

  /** Cache hit */
  "cache:hit": [CacheHitEvent];

  /** Cache miss */
  "cache:miss": [CacheMissEvent];

  /** Cache entry expired */
  "cache:expired": [CacheExpiredEvent];
};

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error codes for dynamic arguments
 */
export const ArgumentErrorCodes = {
  RESOLUTION_FAILED: "ARGUMENT_RESOLUTION_FAILED",
  TIMEOUT: "ARGUMENT_RESOLUTION_TIMEOUT",
  CONTEXT_REQUIRED: "ARGUMENT_CONTEXT_REQUIRED",
  VALIDATION_FAILED: "ARGUMENT_VALIDATION_FAILED",
  CACHE_ERROR: "ARGUMENT_CACHE_ERROR",
  RESOLVER_NOT_FOUND: "ARGUMENT_RESOLVER_NOT_FOUND",
  INVALID_ARGUMENT: "ARGUMENT_INVALID_TYPE",
} as const;

export type ArgumentErrorCode =
  (typeof ArgumentErrorCodes)[keyof typeof ArgumentErrorCodes];

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Options for creating a request context
 */
export type CreateRequestContextOptions = {
  /** Request ID (auto-generated if not provided) */
  requestId?: string;

  /** User information */
  user?: RequestContextUser;

  /** Tenant information */
  tenant?: RequestContextTenant;

  /** Session information */
  session?: RequestContextSession;

  /** Resource information */
  resource?: RequestContextResource;

  /** Environment information */
  environment?: Partial<RequestContextEnvironment>;

  /** Custom extensions */
  custom?: UnknownRecord;
};

/**
 * Configuration for the argument resolver
 */
export type ArgumentResolverConfig = {
  /** Default timeout for async resolution (ms) */
  defaultTimeout?: number;

  /** Enable caching by default */
  enableCache?: boolean;

  /** Default cache TTL (ms) */
  defaultCacheTtl?: number;

  /** Default cache strategy */
  defaultCacheStrategy?: CacheStrategy;

  /** Maximum cache size */
  maxCacheSize?: number;

  /** Cache cleanup interval (ms) */
  cacheCleanupInterval?: number;

  /** Throw on error by default */
  throwOnError?: boolean;

  /** Enable event emission */
  enableEvents?: boolean;
};

/**
 * Runtime value descriptor for environment/secret resolution
 */
export type RuntimeValueDescriptor = {
  /** Source of the value */
  source: "env" | "secret" | "config" | "runtime";

  /** Key/name of the value */
  key: string;

  /** Optional transformer function */
  transform?: (value: string) => unknown;

  /** Default value if not found */
  defaultValue?: unknown;

  /** Whether the value is required */
  required?: boolean;
};
