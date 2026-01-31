/**
 * Dynamic Arguments Type Definitions
 *
 * Provides type definitions for dynamic configuration capabilities,
 * enabling runtime resolution of configuration values through static values,
 * synchronous functions, asynchronous functions, or context-aware callbacks.
 *
 * @module dynamic/types
 */

import type { AIProviderName } from "../constants/enums.js";
import type { UnknownRecord } from "../types/common.js";

/**
 * User preferences for AI interactions
 */
export type UserPreferences = {
  preferredProvider?: AIProviderName | string;
  preferredModel?: string;
  temperature?: number;
  maxTokens?: number;
  thinkingLevel?: "minimal" | "low" | "medium" | "high";
  language?: string;
  timezone?: string;
  responseStyle?: "concise" | "detailed" | "conversational";
};

/**
 * Tenant-level quotas
 */
export type TenantQuotas = {
  tokensPerDay?: number;
  tokensPerMonth?: number;
  requestsPerMinute?: number;
  requestsPerDay?: number;
  maxTokensPerRequest?: number;
  allowedProviders?: string[];
  allowedModels?: string[];
};

/**
 * Tenant-level settings
 */
export type TenantSettings = {
  defaultProvider?: AIProviderName | string;
  defaultModel?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  enableTools?: boolean;
  enableStreaming?: boolean;
  apiKeyOverrides?: Record<string, string>;
  modelOverrides?: Record<string, string>;
};

/**
 * Request context passed to dynamic argument resolvers
 * Contains information about the current request, user, tenant, and session
 */
export type RequestContext = {
  /** Unique request identifier */
  requestId: string;

  /** User information */
  user?: {
    id: string;
    email?: string;
    name?: string;
    roles?: string[];
    permissions?: string[];
    preferences?: UserPreferences;
    metadata?: UnknownRecord;
  };

  /** Tenant/organization information */
  tenant?: {
    id: string;
    name?: string;
    plan?: "free" | "starter" | "pro" | "enterprise";
    quotas?: TenantQuotas;
    settings?: TenantSettings;
    metadata?: UnknownRecord;
  };

  /** Session information */
  session?: {
    id: string;
    startedAt: number;
    conversationId?: string;
    metadata?: UnknownRecord;
  };

  /** Resource information */
  resource?: {
    type: string;
    id?: string;
    metadata?: UnknownRecord;
  };

  /** Runtime context values */
  runtime?: Map<string, unknown>;

  /** Custom context extensions */
  custom?: UnknownRecord;

  /** Timestamp when context was created */
  timestamp: number;

  /** Environment information */
  environment?: {
    nodeEnv: string;
    region?: string;
    deploymentId?: string;
  };
};

/**
 * Context for dynamic argument resolution
 * Combines request context with NeuroLink instance access
 */
export type DynamicResolutionContext = {
  /** Current request context */
  requestContext: RequestContext;

  /** Access to NeuroLink instance methods (subset) */
  neurolink?: {
    getAvailableTools: () => Promise<string[]>;
    getProviderStatus: (provider: string) => Promise<boolean>;
    getRuntimeContext: () => Map<string, unknown> | undefined;
  };

  /** Abort signal for cancellation */
  signal?: AbortSignal;
};

/**
 * Dynamic argument type - can be static, function, or context-aware function
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
 * const model: DynamicArgument<string> = () => process.env.DEFAULT_MODEL || "gpt-4o";
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
 *   if (requestContext.tenant?.plan === "enterprise") {
 *     return "claude-3-opus";
 *   }
 *   return "claude-3-sonnet";
 * };
 * ```
 */
export type DynamicArgument<T> =
  | T
  | (() => T)
  | (() => Promise<T>)
  | ((context: DynamicResolutionContext) => T)
  | ((context: DynamicResolutionContext) => Promise<T>);

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

/**
 * Options for dynamic argument resolution
 */
export type ResolutionOptions = {
  /** Timeout for resolution in milliseconds */
  timeout?: number;

  /** Whether to cache the resolved value */
  cache?: boolean;

  /** Cache key (defaults to argument identity) */
  cacheKey?: string;

  /** Cache TTL in milliseconds */
  cacheTtl?: number;

  /** Default value if resolution fails */
  defaultValue?: unknown;

  /** Whether to throw on resolution failure */
  throwOnError?: boolean;
};

/**
 * Result of dynamic argument resolution
 */
export type ResolutionResult<T> = {
  /** Resolved value */
  value: T;

  /** Whether the value was from cache */
  fromCache: boolean;

  /** Resolution time in milliseconds */
  resolutionTime: number;

  /** Type of resolution performed */
  resolutionType:
    | "static"
    | "sync-function"
    | "async-function"
    | "context-aware";
};

/**
 * Dynamic configuration type - makes all properties of T dynamic
 */
export type DynamicConfig<T> = {
  [K in keyof T]: DynamicArgument<T[K]>;
};

/**
 * Resolved configuration type - resolves all dynamic properties
 */
export type ResolvedConfig<T> = {
  [K in keyof T]: T[K] extends DynamicArgument<infer U> ? U : T[K];
};

/**
 * Dynamic generation options
 */
export type DynamicGenerateOptions = {
  /** Dynamic model selection */
  model?: DynamicArgument<string>;

  /** Dynamic provider selection */
  provider?: DynamicArgument<AIProviderName | string>;

  /** Dynamic temperature */
  temperature?: DynamicArgument<number>;

  /** Dynamic max tokens */
  maxTokens?: DynamicArgument<number>;

  /** Dynamic system prompt */
  systemPrompt?: DynamicArgument<string>;

  /** Dynamic tool selection */
  tools?: DynamicArgument<string[]>;

  /** Dynamic timeout */
  timeout?: DynamicArgument<number>;

  /** Dynamic thinking level */
  thinkingLevel?: DynamicArgument<"minimal" | "low" | "medium" | "high">;

  /** Static input (not dynamic - must be known at call time) */
  input: {
    text: string;
    images?: Array<Buffer | string>;
    files?: Array<Buffer | string>;
  };

  /** Request context for resolution */
  context?: RequestContext;
};

/**
 * Dynamic stream options for streaming generation with dynamic arguments
 */
export type DynamicStreamOptions = {
  /** Dynamic model selection */
  model?: DynamicArgument<string>;

  /** Dynamic provider selection */
  provider?: DynamicArgument<AIProviderName | string>;

  /** Dynamic temperature */
  temperature?: DynamicArgument<number>;

  /** Dynamic max tokens */
  maxTokens?: DynamicArgument<number>;

  /** Dynamic system prompt */
  systemPrompt?: DynamicArgument<string>;

  /** Dynamic tool selection (whether to disable tools) */
  disableTools?: DynamicArgument<boolean>;

  /** Dynamic timeout */
  timeout?: DynamicArgument<number>;

  /** Static input (not dynamic - must be known at call time) */
  input: {
    text: string;
    images?: Array<Buffer | string>;
    files?: Array<Buffer | string>;
  };

  /** Request context for resolution */
  context?: RequestContext;

  /** Enable analytics */
  enableAnalytics?: DynamicArgument<boolean>;

  /** Enable evaluation */
  enableEvaluation?: DynamicArgument<boolean>;
};

/**
 * Dynamic tool configuration
 */
export type DynamicToolConfig = {
  /** Dynamic tool enable/disable */
  enabled?: DynamicArgument<boolean>;

  /** Dynamic tool parameters */
  parameters?: DynamicArgument<UnknownRecord>;

  /** Dynamic tool timeout */
  timeout?: DynamicArgument<number>;

  /** Dynamic tool retry count */
  retries?: DynamicArgument<number>;
};

/**
 * Dynamic middleware configuration
 */
export type DynamicMiddlewareConfig = {
  /** Dynamic middleware enable/disable */
  enabled?: DynamicArgument<boolean>;

  /** Dynamic middleware preset */
  preset?: DynamicArgument<string>;

  /** Dynamic middleware options */
  options?: DynamicArgument<UnknownRecord>;
};

/**
 * Cache entry for resolved values
 */
export type CacheEntry<T> = {
  value: T;
  resolvedAt: number;
  expiresAt: number;
  key: string;
};

/**
 * Caching strategies for dynamic arguments
 */
export type CacheStrategy =
  | "none" // Never cache
  | "per-request" // Cache within single request
  | "per-user" // Cache per user across requests
  | "per-tenant" // Cache per tenant across users
  | "global"; // Cache globally

/**
 * Dynamic argument metadata
 */
export type DynamicArgumentMetadata = {
  /** Unique identifier for the argument */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description of what the argument does */
  description?: string;

  /** Whether the argument requires context */
  requiresContext: boolean;

  /** Whether the argument is async */
  isAsync: boolean;

  /** Caching strategy */
  cacheStrategy?: CacheStrategy;

  /** Cache TTL in milliseconds */
  cacheTtl?: number;
};

/**
 * Cache configuration for dynamic arguments
 */
export type DynamicCacheConfig = {
  strategy: CacheStrategy;
  ttl: number; // Time-to-live in milliseconds
  maxSize?: number; // Maximum cache entries
  staleWhileRevalidate?: boolean; // Return stale while refreshing
  serialize?: (value: unknown) => string;
  deserialize?: (data: string) => unknown;
};
