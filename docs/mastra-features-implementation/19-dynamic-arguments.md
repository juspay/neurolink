# Dynamic Arguments Implementation Guide

## Implementation Status

**Status: COMPLETE (100%)**

The Dynamic Arguments feature has been fully implemented in NeuroLink. All core functionality is working:

- [x] Type definitions (`src/lib/dynamic/types.ts`)
- [x] Resolution utilities (`src/lib/dynamic/resolver.ts`)
- [x] Request context system (`src/lib/dynamic/context.ts`)
- [x] NeuroLink integration (`generateWithDynamic()`, `streamWithDynamic()`)
- [x] Dynamic tools support via `enabledToolNames` option
- [x] CLI options schema updated
- [x] CLI context command (`src/cli/commands/context.ts`)
- [x] CLI context flags (`--user-id`, `--tenant-id`, `--context-json`)

**Key Files:**

- `src/lib/dynamic/types.ts` - DynamicArgument, RequestContext, DynamicGenerateOptions
- `src/lib/dynamic/resolver.ts` - resolveDynamicArgument(), withFallback(), conditional()
- `src/lib/dynamic/context.ts` - withRequestContext(), getCurrentContext()
- `src/lib/neurolink.ts` - generateWithDynamic(), streamWithDynamic() methods
- `src/lib/types/generateTypes.ts` - enabledToolNames option
- `src/cli/commands/context.ts` - CLI context management command
- `src/cli/factories/commandFactory.ts` - CLI context flags integration

**CLI Usage:**

```bash
# Set context values
neurolink context set --user-id user123 --tenant-id org456 --tenant-plan enterprise

# Get current context
neurolink context get
neurolink context get --format json

# Clear context
neurolink context clear
neurolink context clear userId

# Use context flags with generate command
neurolink generate "Hello" --user-id user123 --tenant-id org456
neurolink generate "Analyze data" --context-json '{"taskType": "analysis", "priority": "high"}'
```

---

## Executive Summary

This document provides a comprehensive implementation guide for adding Mastra-style dynamic configuration capabilities to NeuroLink. The dynamic arguments pattern enables runtime resolution of configuration values through static values, synchronous functions, asynchronous functions, or context-aware callbacks, enabling sophisticated multi-tenant, user-preference-based, and request-context-aware configurations.

---

## Table of Contents

1. [Overview](#overview)
2. [Current State Analysis](#current-state-analysis)
3. [DynamicArgument Pattern](#dynamicargument-pattern)
4. [Type Definitions](#type-definitions)
5. [Resolution Utilities](#resolution-utilities)
6. [Request Context System](#request-context-system)
7. [Use Cases](#use-cases)
8. [Integration with NeuroLink](#integration-with-neurolink)
9. [Caching Strategies](#caching-strategies)
10. [Implementation Plan](#implementation-plan)
11. [Code Examples](#code-examples)
12. [Testing Strategy](#testing-strategy)
13. [Migration Guide](#migration-guide)

---

## Overview

### What are Dynamic Arguments?

Dynamic arguments allow configuration values to be:

- **Static**: Direct values (`T`)
- **Synchronous functions**: `() => T`
- **Asynchronous functions**: `() => Promise<T>`
- **Context-aware functions**: `(context: RequestContext) => T | Promise<T>`

This pattern enables runtime configuration resolution based on:

- Current request context (user, tenant, session)
- Runtime environment conditions
- User preferences and permissions
- Dynamic resource allocation

### Mastra Reference

Mastra's `DynamicArgument` pattern (as seen in their agent and workflow systems) allows configuration properties like `model`, `instructions`, `temperature`, and tool selections to be resolved at runtime based on request context.

### Benefits

| Benefit             | Description                                               |
| ------------------- | --------------------------------------------------------- |
| Multi-tenancy       | Different tenants can have different model configurations |
| User preferences    | Users can have personalized AI settings                   |
| A/B testing         | Easy model/config switching for experiments               |
| Cost optimization   | Dynamic model selection based on task complexity          |
| Resource management | Load balancing and quota management                       |
| Security            | Per-request API key and credential resolution             |

---

## Current State Analysis

### Existing NeuroLink Configuration Patterns

NeuroLink currently uses static configuration patterns:

```typescript
// Current: Static configuration
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    maxSessions: 50,
  },
  hitl: {
    enabled: true,
    timeout: 30000,
  },
});

// Current: Static generation options
const result = await neurolink.generate({
  input: { text: "Hello" },
  provider: "anthropic",
  model: "claude-3-5-sonnet",
  temperature: 0.7,
});
```

### Limitations

1. **No per-request configuration**: All requests use the same configuration
2. **No tenant isolation**: Multi-tenant applications require workarounds
3. **No user preferences**: Cannot adapt to individual user settings
4. **No dynamic model selection**: Model must be known at call time

### Files to Modify

| File                                   | Purpose                   |
| -------------------------------------- | ------------------------- |
| `src/lib/types/dynamicTypes.ts`        | New type definitions      |
| `src/lib/utils/dynamicResolver.ts`     | Resolution utilities      |
| `src/lib/context/requestContext.ts`    | Request context system    |
| `src/lib/neurolink.ts`                 | Integration with main SDK |
| `src/lib/types/generateTypes.ts`       | Update generation options |
| `src/lib/types/configTypes.ts`         | Update config types       |
| `src/lib/factories/providerFactory.ts` | Dynamic provider creation |

---

## DynamicArgument Pattern

### Core Type Hierarchy

```
DynamicArgument<T>
├── T                                    (Static value)
├── () => T                              (Sync function)
├── () => Promise<T>                     (Async function)
└── (context: RequestContext) => T       (Context-aware function)
    └── (context: RequestContext) => Promise<T>  (Async context-aware)
```

### Pattern Philosophy

1. **Type Safety**: Full TypeScript inference for all variants
2. **Backwards Compatible**: Static values work without changes
3. **Lazy Evaluation**: Functions only called when needed
4. **Context Propagation**: Request context flows through the system
5. **Caching Support**: Resolution results can be cached

---

## Type Definitions

### File: `src/lib/types/dynamicTypes.ts`

````typescript
// src/lib/types/dynamicTypes.ts

import type { AIProviderName } from "../constants/enums.js";
import type { UnknownRecord, JsonValue } from "./common.js";

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
  cacheStrategy?: "none" | "per-request" | "per-user" | "per-tenant" | "global";

  /** Cache TTL in milliseconds */
  cacheTtl?: number;
};
````

---

## Resolution Utilities

### File: `src/lib/utils/dynamicResolver.ts`

````typescript
// src/lib/utils/dynamicResolver.ts

import type {
  DynamicArgument,
  DynamicResolutionContext,
  ResolutionOptions,
  ResolutionResult,
  CacheEntry,
  RequestContext,
  DynamicConfig,
  ResolvedConfig,
} from "../types/dynamicTypes.js";
import {
  isDynamicFunction,
  isContextAwareFunction,
} from "../types/dynamicTypes.js";
import { logger } from "./logger.js";
import { withTimeout } from "./errorHandling.js";

/**
 * Default resolution options
 */
const DEFAULT_RESOLUTION_OPTIONS: Required<ResolutionOptions> = {
  timeout: 5000,
  cache: false,
  cacheKey: "",
  cacheTtl: 60000, // 1 minute
  defaultValue: undefined,
  throwOnError: true,
};

/**
 * Resolution cache for dynamic arguments
 */
class ResolutionCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(cleanupIntervalMs: number = 60000) {
    this.startCleanup(cleanupIntervalMs);
  }

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttl: number): void {
    const now = Date.now();
    this.cache.set(key, {
      value,
      resolvedAt: now,
      expiresAt: now + ttl,
      key,
    });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private startCleanup(intervalMs: number): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
        }
      }
    }, intervalMs);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

// Global resolution cache
const globalCache = new ResolutionCache();

/**
 * Generate cache key for dynamic argument resolution
 */
function generateCacheKey(
  argumentId: string,
  context?: DynamicResolutionContext,
  options?: ResolutionOptions,
): string {
  if (options?.cacheKey) {
    return options.cacheKey;
  }

  const parts = [argumentId];

  if (context?.requestContext) {
    if (context.requestContext.user?.id) {
      parts.push(`user:${context.requestContext.user.id}`);
    }
    if (context.requestContext.tenant?.id) {
      parts.push(`tenant:${context.requestContext.tenant.id}`);
    }
    if (context.requestContext.session?.id) {
      parts.push(`session:${context.requestContext.session.id}`);
    }
  }

  return parts.join(":");
}

/**
 * Resolve a dynamic argument to its actual value
 *
 * @template T - The expected resolved type
 * @param argument - The dynamic argument to resolve
 * @param context - Resolution context (optional for static values)
 * @param options - Resolution options
 * @returns Resolution result with value and metadata
 *
 * @example Resolve static value
 * ```typescript
 * const result = await resolveDynamicArgument("gpt-4o");
 * console.log(result.value); // "gpt-4o"
 * console.log(result.resolutionType); // "static"
 * ```
 *
 * @example Resolve context-aware function
 * ```typescript
 * const modelSelector = ({ requestContext }) =>
 *   requestContext.tenant?.plan === "enterprise" ? "claude-3-opus" : "claude-3-sonnet";
 *
 * const result = await resolveDynamicArgument(modelSelector, {
 *   requestContext: { requestId: "123", tenant: { id: "t1", plan: "enterprise" } }
 * });
 * console.log(result.value); // "claude-3-opus"
 * ```
 */
export async function resolveDynamicArgument<T>(
  argument: DynamicArgument<T>,
  context?: DynamicResolutionContext,
  options?: ResolutionOptions,
): Promise<ResolutionResult<T>> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_RESOLUTION_OPTIONS, ...options };

  // Check cache first
  if (opts.cache) {
    const cacheKey = generateCacheKey(String(argument), context, options);
    const cached = globalCache.get<T>(cacheKey);
    if (cached !== undefined) {
      return {
        value: cached,
        fromCache: true,
        resolutionTime: Date.now() - startTime,
        resolutionType: "static", // Cached value, original type unknown
      };
    }
  }

  try {
    // Static value
    if (!isDynamicFunction(argument)) {
      const result: ResolutionResult<T> = {
        value: argument as T,
        fromCache: false,
        resolutionTime: Date.now() - startTime,
        resolutionType: "static",
      };

      if (opts.cache) {
        const cacheKey = generateCacheKey(String(argument), context, options);
        globalCache.set(cacheKey, argument, opts.cacheTtl);
      }

      return result;
    }

    // Function value
    let resolvedValue: T;
    let resolutionType: ResolutionResult<T>["resolutionType"];

    const resolutionPromise = (async () => {
      if (isContextAwareFunction<T>(argument)) {
        // Context-aware function
        if (!context) {
          throw new Error(
            "Context-aware dynamic argument requires resolution context",
          );
        }
        resolutionType = "context-aware";
        return argument(context);
      } else {
        // No-argument function
        const fn = argument as (() => T) | (() => Promise<T>);
        const result = fn();

        if (result instanceof Promise) {
          resolutionType = "async-function";
          return result;
        } else {
          resolutionType = "sync-function";
          return result;
        }
      }
    })();

    // Apply timeout if specified
    if (opts.timeout > 0) {
      resolvedValue = await withTimeout(
        resolutionPromise,
        opts.timeout,
        new Error(
          `Dynamic argument resolution timed out after ${opts.timeout}ms`,
        ),
      );
    } else {
      resolvedValue = await resolutionPromise;
    }

    const result: ResolutionResult<T> = {
      value: resolvedValue,
      fromCache: false,
      resolutionTime: Date.now() - startTime,
      resolutionType: resolutionType!,
    };

    // Cache if enabled
    if (opts.cache) {
      const cacheKey = generateCacheKey(String(argument), context, options);
      globalCache.set(cacheKey, resolvedValue, opts.cacheTtl);
    }

    return result;
  } catch (error) {
    logger.error("Dynamic argument resolution failed", {
      error: error instanceof Error ? error.message : String(error),
      resolutionTime: Date.now() - startTime,
    });

    if (opts.throwOnError) {
      throw error;
    }

    // Return default value on error
    return {
      value: opts.defaultValue as T,
      fromCache: false,
      resolutionTime: Date.now() - startTime,
      resolutionType: "static",
    };
  }
}

/**
 * Resolve multiple dynamic arguments in parallel
 *
 * @example
 * ```typescript
 * const [model, temperature] = await resolveDynamicArguments(
 *   [
 *     ({ requestContext }) => requestContext.user?.preferences?.preferredModel || "gpt-4o",
 *     0.7,
 *   ],
 *   context
 * );
 * ```
 */
export async function resolveDynamicArguments<T extends readonly unknown[]>(
  arguments_: { [K in keyof T]: DynamicArgument<T[K]> },
  context?: DynamicResolutionContext,
  options?: ResolutionOptions,
): Promise<{ [K in keyof T]: T[K] }> {
  const results = await Promise.all(
    arguments_.map((arg) => resolveDynamicArgument(arg, context, options)),
  );
  return results.map((r) => r.value) as { [K in keyof T]: T[K] };
}

/**
 * Resolve all properties of a dynamic configuration object
 *
 * @example
 * ```typescript
 * const dynamicConfig = {
 *   model: ({ requestContext }) => requestContext.tenant?.settings?.defaultModel || "gpt-4o",
 *   temperature: 0.7,
 *   maxTokens: async () => (await fetchConfig()).maxTokens,
 * };
 *
 * const resolved = await resolveDynamicConfig(dynamicConfig, context);
 * // resolved.model, resolved.temperature, resolved.maxTokens are all resolved values
 * ```
 */
export async function resolveDynamicConfig<T extends Record<string, unknown>>(
  config: DynamicConfig<T>,
  context?: DynamicResolutionContext,
  options?: ResolutionOptions,
): Promise<ResolvedConfig<T>> {
  const entries = Object.entries(config);
  const resolvedEntries = await Promise.all(
    entries.map(async ([key, value]) => {
      const result = await resolveDynamicArgument(
        value as DynamicArgument<unknown>,
        context,
        options,
      );
      return [key, result.value] as const;
    }),
  );

  return Object.fromEntries(resolvedEntries) as ResolvedConfig<T>;
}

/**
 * Create a memoized dynamic argument that caches its result
 *
 * @example
 * ```typescript
 * const expensiveModelSelector = memoizeDynamicArgument(
 *   async ({ requestContext }) => {
 *     const config = await fetchTenantConfig(requestContext.tenant?.id);
 *     return config.preferredModel;
 *   },
 *   { cacheTtl: 300000 } // Cache for 5 minutes
 * );
 * ```
 */
export function memoizeDynamicArgument<T>(
  argument: DynamicArgument<T>,
  options?: { cacheTtl?: number; cacheKey?: string },
): DynamicArgument<T> {
  if (!isDynamicFunction(argument)) {
    return argument; // Static values don't need memoization
  }

  const cache = new Map<string, { value: T; expiresAt: number }>();
  const ttl = options?.cacheTtl || 60000;

  return async (context: DynamicResolutionContext) => {
    const key =
      options?.cacheKey ||
      generateCacheKey("memoized", context, { cacheKey: options?.cacheKey });

    const cached = cache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.value;
    }

    const result = await resolveDynamicArgument(argument, context);
    cache.set(key, { value: result.value, expiresAt: Date.now() + ttl });

    return result.value;
  };
}

/**
 * Create a dynamic argument with fallback chain
 *
 * @example
 * ```typescript
 * const modelWithFallback = withFallback(
 *   ({ requestContext }) => requestContext.user?.preferences?.preferredModel,
 *   ({ requestContext }) => requestContext.tenant?.settings?.defaultModel,
 *   "gpt-4o" // Final static fallback
 * );
 * ```
 */
export function withFallback<T>(
  ...arguments_: DynamicArgument<T | undefined | null>[]
): DynamicArgument<T> {
  return async (context: DynamicResolutionContext) => {
    for (const arg of arguments_) {
      try {
        const result = await resolveDynamicArgument(arg, context, {
          throwOnError: false,
        });
        if (result.value !== undefined && result.value !== null) {
          return result.value as T;
        }
      } catch {
        // Continue to next fallback
      }
    }
    throw new Error("All fallbacks failed");
  };
}

/**
 * Create a conditional dynamic argument
 *
 * @example
 * ```typescript
 * const conditionalModel = conditional(
 *   ({ requestContext }) => requestContext.tenant?.plan === "enterprise",
 *   "claude-3-opus",   // If true
 *   "claude-3-sonnet"  // If false
 * );
 * ```
 */
export function conditional<T>(
  condition: DynamicArgument<boolean>,
  ifTrue: DynamicArgument<T>,
  ifFalse: DynamicArgument<T>,
): DynamicArgument<T> {
  return async (context: DynamicResolutionContext) => {
    const conditionResult = await resolveDynamicArgument(condition, context);
    if (conditionResult.value) {
      return (await resolveDynamicArgument(ifTrue, context)).value;
    }
    return (await resolveDynamicArgument(ifFalse, context)).value;
  };
}

/**
 * Clear the global resolution cache
 */
export function clearResolutionCache(): void {
  globalCache.clear();
}

/**
 * Destroy the resolver (cleanup intervals, etc.)
 */
export function destroyResolver(): void {
  globalCache.destroy();
}

/**
 * Type helper to extract the resolved type from a DynamicArgument
 */
export type Resolved<T> = T extends DynamicArgument<infer U> ? U : T;

export { globalCache as resolutionCache };
````

---

## Request Context System

### File: `src/lib/context/requestContext.ts`

````typescript
// src/lib/context/requestContext.ts

import { AsyncLocalStorage } from "async_hooks";
import type {
  RequestContext,
  DynamicResolutionContext,
  UserPreferences,
  TenantQuotas,
  TenantSettings,
} from "../types/dynamicTypes.js";
import type { UnknownRecord } from "../types/common.js";
import { logger } from "../utils/logger.js";

/**
 * AsyncLocalStorage for thread-safe context propagation
 */
const contextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new request context
 *
 * @example
 * ```typescript
 * const context = createRequestContext({
 *   user: { id: "user123", email: "user@example.com" },
 *   tenant: { id: "tenant456", plan: "enterprise" },
 * });
 * ```
 */
export function createRequestContext(
  options?: Partial<Omit<RequestContext, "requestId" | "timestamp">>,
): RequestContext {
  return {
    requestId: generateRequestId(),
    timestamp: Date.now(),
    ...options,
    runtime: options?.runtime || new Map(),
  };
}

/**
 * Run a function with request context
 * Context is automatically propagated to all async operations
 *
 * @example
 * ```typescript
 * await withRequestContext(
 *   { user: { id: "user123" }, tenant: { id: "tenant456" } },
 *   async () => {
 *     // Context is available here and in all nested calls
 *     const ctx = getCurrentContext();
 *     console.log(ctx?.user?.id); // "user123"
 *   }
 * );
 * ```
 */
export function withRequestContext<T>(
  context: Partial<Omit<RequestContext, "requestId" | "timestamp">>,
  fn: () => T | Promise<T>,
): Promise<T> {
  const fullContext = createRequestContext(context);

  logger.debug("Starting request context", {
    requestId: fullContext.requestId,
    userId: fullContext.user?.id,
    tenantId: fullContext.tenant?.id,
  });

  return contextStorage.run(fullContext, async () => {
    try {
      return await fn();
    } finally {
      logger.debug("Request context completed", {
        requestId: fullContext.requestId,
        duration: Date.now() - fullContext.timestamp,
      });
    }
  });
}

/**
 * Get the current request context
 * Returns undefined if called outside of withRequestContext
 */
export function getCurrentContext(): RequestContext | undefined {
  return contextStorage.getStore();
}

/**
 * Get the current request context or throw if not available
 */
export function requireContext(): RequestContext {
  const context = getCurrentContext();
  if (!context) {
    throw new Error(
      "Request context required. Ensure this code is running within withRequestContext.",
    );
  }
  return context;
}

/**
 * Update the current request context
 *
 * @example
 * ```typescript
 * // Add user information mid-request (e.g., after authentication)
 * updateCurrentContext({
 *   user: { id: "user123", email: "user@example.com" }
 * });
 * ```
 */
export function updateCurrentContext(
  updates: Partial<Omit<RequestContext, "requestId" | "timestamp">>,
): void {
  const current = getCurrentContext();
  if (!current) {
    logger.warn("Cannot update context - no active context");
    return;
  }

  // Merge updates into current context
  if (updates.user) {
    current.user = { ...current.user, ...updates.user };
  }
  if (updates.tenant) {
    current.tenant = { ...current.tenant, ...updates.tenant };
  }
  if (updates.session) {
    current.session = { ...current.session, ...updates.session };
  }
  if (updates.resource) {
    current.resource = { ...current.resource, ...updates.resource };
  }
  if (updates.custom) {
    current.custom = { ...current.custom, ...updates.custom };
  }
  if (updates.environment) {
    current.environment = { ...current.environment, ...updates.environment };
  }
  if (updates.runtime) {
    for (const [key, value] of updates.runtime) {
      current.runtime?.set(key, value);
    }
  }
}

/**
 * Set a runtime value in the current context
 *
 * @example
 * ```typescript
 * setRuntimeValue("taskComplexity", "high");
 * setRuntimeValue("estimatedTokens", 5000);
 * ```
 */
export function setRuntimeValue(key: string, value: unknown): void {
  const context = getCurrentContext();
  if (!context) {
    logger.warn("Cannot set runtime value - no active context");
    return;
  }

  if (!context.runtime) {
    context.runtime = new Map();
  }

  context.runtime.set(key, value);
}

/**
 * Get a runtime value from the current context
 */
export function getRuntimeValue<T>(key: string): T | undefined {
  const context = getCurrentContext();
  return context?.runtime?.get(key) as T | undefined;
}

/**
 * Create a DynamicResolutionContext from the current RequestContext
 *
 * @param neurolink - Optional NeuroLink instance for additional capabilities
 */
export function createResolutionContext(
  neurolink?: {
    getAvailableTools: () => Promise<string[]>;
    getProviderStatus: (provider: string) => Promise<boolean>;
    getRuntimeContext: () => Map<string, unknown> | undefined;
  },
  signal?: AbortSignal,
): DynamicResolutionContext {
  const requestContext = getCurrentContext() || createRequestContext();

  return {
    requestContext,
    neurolink,
    signal,
  };
}

/**
 * Middleware-style context creator for HTTP requests
 *
 * @example Express middleware
 * ```typescript
 * app.use((req, res, next) => {
 *   const context = createContextFromRequest(req);
 *   withRequestContext(context, next);
 * });
 * ```
 */
export function createContextFromRequest(request: {
  headers?: Record<string, string | string[] | undefined>;
  user?: { id: string; email?: string; [key: string]: unknown };
  tenant?: { id: string; [key: string]: unknown };
  session?: { id: string; [key: string]: unknown };
}): Partial<RequestContext> {
  const context: Partial<RequestContext> = {};

  // Extract user from request
  if (request.user) {
    context.user = {
      id: request.user.id,
      email: request.user.email,
      metadata: request.user,
    };
  }

  // Extract tenant from request
  if (request.tenant) {
    context.tenant = {
      id: request.tenant.id,
      metadata: request.tenant,
    };
  }

  // Extract session from request
  if (request.session) {
    context.session = {
      id: request.session.id,
      startedAt: Date.now(),
      metadata: request.session,
    };
  }

  // Extract from headers
  if (request.headers) {
    const userId = request.headers["x-user-id"];
    const tenantId = request.headers["x-tenant-id"];
    const sessionId = request.headers["x-session-id"];

    if (userId && !context.user) {
      context.user = { id: Array.isArray(userId) ? userId[0] : userId };
    }
    if (tenantId && !context.tenant) {
      context.tenant = { id: Array.isArray(tenantId) ? tenantId[0] : tenantId };
    }
    if (sessionId && !context.session) {
      context.session = {
        id: Array.isArray(sessionId) ? sessionId[0] : sessionId,
        startedAt: Date.now(),
      };
    }
  }

  return context;
}

/**
 * Context builder for fluent API
 *
 * @example
 * ```typescript
 * const context = new RequestContextBuilder()
 *   .withUser({ id: "user123", email: "user@example.com" })
 *   .withTenant({ id: "tenant456", plan: "enterprise" })
 *   .withSession({ id: "session789" })
 *   .withRuntimeValue("taskType", "analysis")
 *   .build();
 * ```
 */
export class RequestContextBuilder {
  private context: Partial<RequestContext> = {};

  withUser(user: RequestContext["user"]): this {
    this.context.user = user;
    return this;
  }

  withTenant(tenant: RequestContext["tenant"]): this {
    this.context.tenant = tenant;
    return this;
  }

  withSession(session: Partial<NonNullable<RequestContext["session"]>>): this {
    this.context.session = {
      id: session.id || `session_${Date.now()}`,
      startedAt: session.startedAt || Date.now(),
      ...session,
    };
    return this;
  }

  withResource(resource: RequestContext["resource"]): this {
    this.context.resource = resource;
    return this;
  }

  withCustom(custom: UnknownRecord): this {
    this.context.custom = { ...this.context.custom, ...custom };
    return this;
  }

  withEnvironment(environment: RequestContext["environment"]): this {
    this.context.environment = environment;
    return this;
  }

  withRuntimeValue(key: string, value: unknown): this {
    if (!this.context.runtime) {
      this.context.runtime = new Map();
    }
    this.context.runtime.set(key, value);
    return this;
  }

  build(): RequestContext {
    return createRequestContext(this.context);
  }

  /**
   * Build and run a function with this context
   */
  async run<T>(fn: () => T | Promise<T>): Promise<T> {
    const context = this.build();
    return withRequestContext(context, fn);
  }
}
````

---

## Use Cases

### 1. Dynamic Model Selection Per Request

```typescript
// src/examples/dynamic-model-selection.ts

import { NeuroLink } from "@juspay/neurolink";
import type {
  DynamicArgument,
  DynamicResolutionContext,
} from "@juspay/neurolink";

// Model selector based on task complexity and tenant plan
const modelSelector: DynamicArgument<string> = ({ requestContext }) => {
  const plan = requestContext.tenant?.plan;
  const taskComplexity = requestContext.runtime?.get("taskComplexity");

  // Enterprise gets access to premium models
  if (plan === "enterprise") {
    if (taskComplexity === "high") {
      return "claude-3-opus"; // Best reasoning
    }
    return "claude-3-sonnet"; // Good balance
  }

  // Pro gets mid-tier models
  if (plan === "pro") {
    return "gpt-4o"; // Capable and fast
  }

  // Free/Starter gets efficient models
  return "gpt-4o-mini"; // Cost-effective
};

// Usage
const neurolink = new NeuroLink();

const result = await neurolink.generate({
  model: modelSelector,
  input: { text: "Analyze this complex data..." },
  context: {
    requestId: "req_123",
    timestamp: Date.now(),
    tenant: { id: "tenant_456", plan: "enterprise" },
    runtime: new Map([["taskComplexity", "high"]]),
  },
});
```

### 2. Tenant-Specific Configuration

```typescript
// src/examples/tenant-configuration.ts

import { NeuroLink } from "@juspay/neurolink";
import { withFallback, conditional } from "@juspay/neurolink/dynamic";

type TenantConfig = {
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
};

// Fetch tenant configuration from database/cache
async function fetchTenantConfig(
  tenantId: string,
): Promise<TenantConfig | null> {
  // Simulated database lookup
  const configs: Record<string, TenantConfig> = {
    tenant_acme: {
      provider: "anthropic",
      model: "claude-3-opus",
      temperature: 0.3,
      maxTokens: 4096,
      systemPrompt:
        "You are ACME Corp's AI assistant. Be professional and concise.",
    },
    tenant_startup: {
      provider: "openai",
      model: "gpt-4o-mini",
      temperature: 0.7,
      maxTokens: 2048,
      systemPrompt:
        "You are a helpful startup assistant. Be creative and energetic.",
    },
  };
  return configs[tenantId] || null;
}

// Dynamic configuration with tenant fallbacks
const tenantProvider = withFallback(
  async ({ requestContext }) => {
    const config = await fetchTenantConfig(requestContext.tenant?.id || "");
    return config?.provider;
  },
  ({ requestContext }) => requestContext.tenant?.settings?.defaultProvider,
  "openai", // Final fallback
);

const tenantModel = withFallback(
  async ({ requestContext }) => {
    const config = await fetchTenantConfig(requestContext.tenant?.id || "");
    return config?.model;
  },
  ({ requestContext }) => requestContext.tenant?.settings?.defaultModel,
  "gpt-4o-mini",
);

const tenantSystemPrompt = async ({
  requestContext,
}: DynamicResolutionContext) => {
  const config = await fetchTenantConfig(requestContext.tenant?.id || "");
  return config?.systemPrompt || "You are a helpful AI assistant.";
};

// Usage
const neurolink = new NeuroLink();

const result = await neurolink.generate({
  provider: tenantProvider,
  model: tenantModel,
  systemPrompt: tenantSystemPrompt,
  input: { text: "Help me draft an email" },
  context: {
    requestId: "req_789",
    timestamp: Date.now(),
    tenant: { id: "tenant_acme", name: "ACME Corp", plan: "enterprise" },
  },
});
```

### 3. User Preference-Based Settings

```typescript
// src/examples/user-preferences.ts

import { NeuroLink } from "@juspay/neurolink";
import type { DynamicArgument, UserPreferences } from "@juspay/neurolink";

// Dynamic temperature based on user's response style preference
const userTemperature: DynamicArgument<number> = ({ requestContext }) => {
  const style = requestContext.user?.preferences?.responseStyle;

  switch (style) {
    case "concise":
      return 0.3; // More deterministic
    case "detailed":
      return 0.5; // Balanced
    case "conversational":
      return 0.8; // More creative
    default:
      return 0.7;
  }
};

// Dynamic max tokens based on user preference and plan
const userMaxTokens: DynamicArgument<number> = ({ requestContext }) => {
  const userPreferred = requestContext.user?.preferences?.maxTokens;
  const tenantMax = requestContext.tenant?.quotas?.maxTokensPerRequest;

  // User preference capped by tenant quota
  if (userPreferred && tenantMax) {
    return Math.min(userPreferred, tenantMax);
  }

  return userPreferred || tenantMax || 2048;
};

// Dynamic model based on user's preferred provider
const userModel: DynamicArgument<string> = ({ requestContext }) => {
  const preferredProvider = requestContext.user?.preferences?.preferredProvider;
  const preferredModel = requestContext.user?.preferences?.preferredModel;

  if (preferredModel) {
    return preferredModel;
  }

  // Map provider to default model
  const providerDefaults: Record<string, string> = {
    openai: "gpt-4o",
    anthropic: "claude-3-sonnet",
    "google-ai": "gemini-2.5-pro",
    vertex: "gemini-2.5-pro",
  };

  return preferredProvider
    ? providerDefaults[preferredProvider] || "gpt-4o"
    : "gpt-4o";
};

// Usage with user preferences
const neurolink = new NeuroLink();

const result = await neurolink.generate({
  model: userModel,
  temperature: userTemperature,
  maxTokens: userMaxTokens,
  input: { text: "Explain machine learning" },
  context: {
    requestId: "req_user_123",
    timestamp: Date.now(),
    user: {
      id: "user_456",
      email: "developer@example.com",
      preferences: {
        preferredProvider: "anthropic",
        responseStyle: "detailed",
        maxTokens: 4000,
      },
    },
    tenant: {
      id: "tenant_789",
      plan: "pro",
      quotas: {
        maxTokensPerRequest: 8000,
      },
    },
  },
});
```

### 4. Runtime Tool Registration

```typescript
// src/examples/dynamic-tools.ts

import { NeuroLink } from "@juspay/neurolink";
import type { DynamicArgument } from "@juspay/neurolink";

// Dynamic tool selection based on user permissions and context
const dynamicTools: DynamicArgument<string[]> = async ({
  requestContext,
  neurolink,
}) => {
  const userPermissions = requestContext.user?.permissions || [];
  const tenantPlan = requestContext.tenant?.plan;
  const availableTools = (await neurolink?.getAvailableTools()) || [];

  const allowedTools: string[] = [];

  // Base tools everyone can use
  const baseTools = ["getCurrentTime", "calculateMath"];
  allowedTools.push(...baseTools.filter((t) => availableTools.includes(t)));

  // File tools require permission
  if (userPermissions.includes("file:read")) {
    allowedTools.push("readFile", "listDirectory");
  }
  if (userPermissions.includes("file:write")) {
    allowedTools.push("writeFile");
  }

  // Web tools for pro+ plans
  if (tenantPlan === "pro" || tenantPlan === "enterprise") {
    if (availableTools.includes("websearchGrounding")) {
      allowedTools.push("websearchGrounding");
    }
  }

  // Database tools for enterprise only
  if (tenantPlan === "enterprise") {
    if (userPermissions.includes("database:query")) {
      allowedTools.push("queryDatabase");
    }
  }

  return allowedTools;
};

// Usage
const neurolink = new NeuroLink();

const result = await neurolink.generate({
  tools: dynamicTools,
  input: { text: "Search the web for recent AI news" },
  context: {
    requestId: "req_tools_123",
    timestamp: Date.now(),
    user: {
      id: "user_456",
      permissions: ["file:read", "file:write"],
    },
    tenant: {
      id: "tenant_789",
      plan: "pro",
    },
  },
});
```

### 5. Context-Aware Instructions

```typescript
// src/examples/context-aware-instructions.ts

import { NeuroLink } from "@juspay/neurolink";
import type { DynamicArgument } from "@juspay/neurolink";

// Dynamic system prompt based on full context
const contextAwareInstructions: DynamicArgument<string> = ({
  requestContext,
}) => {
  const parts: string[] = [];

  // Base instructions
  parts.push("You are an AI assistant.");

  // Personalization based on user
  if (requestContext.user?.name) {
    parts.push(`You are helping ${requestContext.user.name}.`);
  }

  // Tenant-specific guidelines
  const tenantName = requestContext.tenant?.name;
  if (tenantName) {
    parts.push(`You represent ${tenantName}. Follow their brand guidelines.`);
  }

  // Plan-based capabilities
  const plan = requestContext.tenant?.plan;
  if (plan === "enterprise") {
    parts.push("You have access to advanced analysis capabilities.");
  } else if (plan === "free") {
    parts.push(
      "Keep responses concise. Suggest upgrading for detailed analysis.",
    );
  }

  // Response style
  const style = requestContext.user?.preferences?.responseStyle;
  if (style === "concise") {
    parts.push("Be brief and to the point.");
  } else if (style === "detailed") {
    parts.push("Provide comprehensive explanations.");
  } else if (style === "conversational") {
    parts.push("Be friendly and conversational.");
  }

  // Language preference
  const language = requestContext.user?.preferences?.language;
  if (language && language !== "en") {
    parts.push(`Respond in ${language}.`);
  }

  // Custom context
  const customGuidelines = requestContext.custom?.guidelines as
    | string
    | undefined;
  if (customGuidelines) {
    parts.push(customGuidelines);
  }

  return parts.join(" ");
};

// Usage
const neurolink = new NeuroLink();

const result = await neurolink.generate({
  systemPrompt: contextAwareInstructions,
  input: { text: "How do I set up CI/CD?" },
  context: {
    requestId: "req_instructions_123",
    timestamp: Date.now(),
    user: {
      id: "user_456",
      name: "Alice",
      preferences: {
        responseStyle: "detailed",
        language: "en",
      },
    },
    tenant: {
      id: "tenant_789",
      name: "TechStartup Inc",
      plan: "pro",
    },
    custom: {
      guidelines: "Focus on GitHub Actions and AWS CodePipeline.",
    },
  },
});
```

---

## Integration with NeuroLink

### Updated NeuroLink Class

````typescript
// src/lib/neurolink.ts (additions)

import {
  resolveDynamicArgument,
  resolveDynamicConfig,
  createResolutionContext,
} from "./utils/dynamicResolver.js";
import {
  withRequestContext,
  getCurrentContext,
  createRequestContext,
} from "./context/requestContext.js";
import type {
  DynamicArgument,
  DynamicGenerateOptions,
  RequestContext,
  DynamicResolutionContext,
} from "./types/dynamicTypes.js";

export class NeuroLink {
  // ... existing code ...

  /**
   * Generate with dynamic argument support
   *
   * @example Static options (backward compatible)
   * ```typescript
   * const result = await neurolink.generate({
   *   input: { text: "Hello" },
   *   model: "gpt-4o",
   *   temperature: 0.7,
   * });
   * ```
   *
   * @example Dynamic options
   * ```typescript
   * const result = await neurolink.generate({
   *   input: { text: "Hello" },
   *   model: ({ requestContext }) =>
   *     requestContext.tenant?.plan === "enterprise" ? "gpt-4o" : "gpt-4o-mini",
   *   temperature: async () => (await fetchConfig()).temperature,
   *   context: { tenant: { id: "t1", plan: "enterprise" } },
   * });
   * ```
   */
  async generate(
    options: GenerateOptions | DynamicGenerateOptions,
  ): Promise<GenerateResult> {
    // Check if we need dynamic resolution
    if (this.hasDynamicArguments(options)) {
      return this.generateWithDynamicResolution(
        options as DynamicGenerateOptions,
      );
    }

    // Standard generation path (existing code)
    return this.generateInternal(options as GenerateOptions);
  }

  /**
   * Check if options contain any dynamic arguments
   */
  private hasDynamicArguments(
    options: GenerateOptions | DynamicGenerateOptions,
  ): boolean {
    const dynamicKeys = [
      "model",
      "provider",
      "temperature",
      "maxTokens",
      "systemPrompt",
      "tools",
      "timeout",
      "thinkingLevel",
    ];

    return dynamicKeys.some((key) => {
      const value = (options as Record<string, unknown>)[key];
      return typeof value === "function";
    });
  }

  /**
   * Generate with dynamic argument resolution
   */
  private async generateWithDynamicResolution(
    options: DynamicGenerateOptions,
  ): Promise<GenerateResult> {
    // Create resolution context
    const requestContext =
      options.context || getCurrentContext() || createRequestContext();
    const resolutionContext: DynamicResolutionContext = {
      requestContext,
      neurolink: {
        getAvailableTools: () => this.getAvailableToolNames(),
        getProviderStatus: (provider) => this.isProviderAvailable(provider),
        getRuntimeContext: () => this.getRuntimeContext(),
      },
    };

    // Resolve all dynamic arguments in parallel
    const [
      resolvedModel,
      resolvedProvider,
      resolvedTemperature,
      resolvedMaxTokens,
      resolvedSystemPrompt,
      resolvedTools,
      resolvedTimeout,
      resolvedThinkingLevel,
    ] = await Promise.all([
      options.model
        ? resolveDynamicArgument(options.model, resolutionContext)
        : Promise.resolve({ value: undefined }),
      options.provider
        ? resolveDynamicArgument(options.provider, resolutionContext)
        : Promise.resolve({ value: undefined }),
      options.temperature !== undefined
        ? resolveDynamicArgument(options.temperature, resolutionContext)
        : Promise.resolve({ value: undefined }),
      options.maxTokens !== undefined
        ? resolveDynamicArgument(options.maxTokens, resolutionContext)
        : Promise.resolve({ value: undefined }),
      options.systemPrompt
        ? resolveDynamicArgument(options.systemPrompt, resolutionContext)
        : Promise.resolve({ value: undefined }),
      options.tools
        ? resolveDynamicArgument(options.tools, resolutionContext)
        : Promise.resolve({ value: undefined }),
      options.timeout !== undefined
        ? resolveDynamicArgument(options.timeout, resolutionContext)
        : Promise.resolve({ value: undefined }),
      options.thinkingLevel
        ? resolveDynamicArgument(options.thinkingLevel, resolutionContext)
        : Promise.resolve({ value: undefined }),
    ]);

    // Build resolved options
    const resolvedOptions: GenerateOptions = {
      input: options.input,
      ...(resolvedModel.value && { model: resolvedModel.value }),
      ...(resolvedProvider.value && { provider: resolvedProvider.value }),
      ...(resolvedTemperature.value !== undefined && {
        temperature: resolvedTemperature.value,
      }),
      ...(resolvedMaxTokens.value !== undefined && {
        maxTokens: resolvedMaxTokens.value,
      }),
      ...(resolvedSystemPrompt.value && {
        systemPrompt: resolvedSystemPrompt.value,
      }),
      ...(resolvedTimeout.value !== undefined && {
        timeout: resolvedTimeout.value,
      }),
      ...(resolvedThinkingLevel.value && {
        thinkingConfig: { thinkingLevel: resolvedThinkingLevel.value },
      }),
    };

    // Handle dynamic tools
    if (resolvedTools.value) {
      // Filter available tools based on resolved list
      resolvedOptions.disableTools = false;
      // Store allowed tools for filtering in generation
      (resolvedOptions as any)._allowedTools = resolvedTools.value;
    }

    logger.debug("Resolved dynamic arguments", {
      requestId: requestContext.requestId,
      resolvedModel: resolvedModel.value,
      resolvedProvider: resolvedProvider.value,
      resolutionTypes: {
        model: resolvedModel.resolutionType,
        provider: resolvedProvider.resolutionType,
        temperature: resolvedTemperature.resolutionType,
      },
    });

    // Continue with standard generation
    return this.generateInternal(resolvedOptions);
  }

  /**
   * Run operations with request context
   */
  async withContext<T>(
    context: Partial<RequestContext>,
    fn: () => T | Promise<T>,
  ): Promise<T> {
    return withRequestContext(context, fn);
  }

  /**
   * Get available tool names for dynamic resolution
   */
  private async getAvailableToolNames(): Promise<string[]> {
    const tools = await this.getAvailableTools();
    return tools.map((t) => t.name);
  }

  /**
   * Check if a provider is available
   */
  private async isProviderAvailable(provider: string): Promise<boolean> {
    try {
      const providerInstance = await ProviderFactory.createProvider(provider);
      return providerInstance.isAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Get runtime context map
   */
  getRuntimeContext(): Map<string, unknown> | undefined {
    return getCurrentContext()?.runtime;
  }
}
````

---

## Caching Strategies

### Cache Strategy Types

```typescript
// src/lib/types/dynamicTypes.ts (additions)

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
```

### Cache Implementation

```typescript
// src/lib/utils/dynamicCache.ts

import type {
  CacheStrategy,
  DynamicCacheConfig,
  RequestContext,
} from "../types/dynamicTypes.js";

/**
 * Multi-level cache for dynamic arguments
 */
export class DynamicCache {
  private requestCache = new Map<string, Map<string, unknown>>();
  private userCache = new Map<string, Map<string, CacheEntry>>();
  private tenantCache = new Map<string, Map<string, CacheEntry>>();
  private globalCache = new Map<string, CacheEntry>();

  private config: DynamicCacheConfig;

  constructor(config?: Partial<DynamicCacheConfig>) {
    this.config = {
      strategy: "per-request",
      ttl: 60000,
      maxSize: 1000,
      staleWhileRevalidate: false,
      ...config,
    };
  }

  get<T>(
    key: string,
    strategy: CacheStrategy,
    context?: RequestContext,
  ): T | undefined {
    switch (strategy) {
      case "none":
        return undefined;

      case "per-request":
        return this.getFromRequestCache(key, context?.requestId);

      case "per-user":
        return this.getFromUserCache(key, context?.user?.id);

      case "per-tenant":
        return this.getFromTenantCache(key, context?.tenant?.id);

      case "global":
        return this.getFromGlobalCache(key);

      default:
        return undefined;
    }
  }

  set<T>(
    key: string,
    value: T,
    strategy: CacheStrategy,
    context?: RequestContext,
    ttl?: number,
  ): void {
    const effectiveTtl = ttl || this.config.ttl;

    switch (strategy) {
      case "none":
        return;

      case "per-request":
        this.setInRequestCache(key, value, context?.requestId);
        break;

      case "per-user":
        this.setInUserCache(key, value, context?.user?.id, effectiveTtl);
        break;

      case "per-tenant":
        this.setInTenantCache(key, value, context?.tenant?.id, effectiveTtl);
        break;

      case "global":
        this.setInGlobalCache(key, value, effectiveTtl);
        break;
    }
  }

  private getFromRequestCache<T>(
    key: string,
    requestId?: string,
  ): T | undefined {
    if (!requestId) return undefined;
    return this.requestCache.get(requestId)?.get(key) as T | undefined;
  }

  private setInRequestCache<T>(
    key: string,
    value: T,
    requestId?: string,
  ): void {
    if (!requestId) return;
    if (!this.requestCache.has(requestId)) {
      this.requestCache.set(requestId, new Map());
    }
    this.requestCache.get(requestId)!.set(key, value);
  }

  private getFromUserCache<T>(key: string, userId?: string): T | undefined {
    if (!userId) return undefined;
    const entry = this.userCache.get(userId)?.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      return undefined;
    }
    return entry.value as T;
  }

  private setInUserCache<T>(
    key: string,
    value: T,
    userId?: string,
    ttl: number = this.config.ttl,
  ): void {
    if (!userId) return;
    if (!this.userCache.has(userId)) {
      this.userCache.set(userId, new Map());
    }
    this.userCache.get(userId)!.set(key, {
      value,
      resolvedAt: Date.now(),
      expiresAt: Date.now() + ttl,
      key,
    });
  }

  private getFromTenantCache<T>(key: string, tenantId?: string): T | undefined {
    if (!tenantId) return undefined;
    const entry = this.tenantCache.get(tenantId)?.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      return undefined;
    }
    return entry.value as T;
  }

  private setInTenantCache<T>(
    key: string,
    value: T,
    tenantId?: string,
    ttl: number = this.config.ttl,
  ): void {
    if (!tenantId) return;
    if (!this.tenantCache.has(tenantId)) {
      this.tenantCache.set(tenantId, new Map());
    }
    this.tenantCache.get(tenantId)!.set(key, {
      value,
      resolvedAt: Date.now(),
      expiresAt: Date.now() + ttl,
      key,
    });
  }

  private getFromGlobalCache<T>(key: string): T | undefined {
    const entry = this.globalCache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      return undefined;
    }
    return entry.value as T;
  }

  private setInGlobalCache<T>(
    key: string,
    value: T,
    ttl: number = this.config.ttl,
  ): void {
    this.globalCache.set(key, {
      value,
      resolvedAt: Date.now(),
      expiresAt: Date.now() + ttl,
      key,
    });
  }

  /**
   * Clear request-specific cache (call after request completes)
   */
  clearRequest(requestId: string): void {
    this.requestCache.delete(requestId);
  }

  /**
   * Clear all caches
   */
  clear(): void {
    this.requestCache.clear();
    this.userCache.clear();
    this.tenantCache.clear();
    this.globalCache.clear();
  }
}

type CacheEntry = {
  value: unknown;
  resolvedAt: number;
  expiresAt: number;
  key: string;
};

// Global cache instance
export const dynamicCache = new DynamicCache();
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)

1. **Create type definitions**

   ```bash
   touch src/lib/types/dynamicTypes.ts
   ```

   - Define `DynamicArgument<T>` type
   - Define `RequestContext` interface
   - Define `DynamicResolutionContext` interface
   - Add type guards and utility types

2. **Implement resolution utilities**

   ```bash
   touch src/lib/utils/dynamicResolver.ts
   ```

   - Implement `resolveDynamicArgument()`
   - Implement `resolveDynamicConfig()`
   - Add memoization helpers
   - Add fallback and conditional utilities

3. **Write unit tests**
   ```bash
   touch test/unit/dynamicResolver.test.ts
   ```

### Phase 2: Request Context System (Week 1-2)

1. **Implement request context**

   ```bash
   mkdir -p src/lib/context
   touch src/lib/context/requestContext.ts
   ```

   - Implement `AsyncLocalStorage` based context
   - Create `withRequestContext()` wrapper
   - Add context builder class
   - Implement HTTP request context extraction

2. **Write integration tests**
   ```bash
   touch test/integration/requestContext.test.ts
   ```

### Phase 3: NeuroLink Integration (Week 2)

1. **Update NeuroLink class**
   - Add dynamic argument detection
   - Implement `generateWithDynamicResolution()`
   - Add `withContext()` method
   - Update type exports

2. **Update generation types**
   - Add `DynamicGenerateOptions` support
   - Maintain backward compatibility

3. **Integration tests**
   ```bash
   touch test/integration/dynamicGeneration.test.ts
   ```

### Phase 4: Caching System (Week 2-3)

1. **Implement caching**

   ```bash
   touch src/lib/utils/dynamicCache.ts
   ```

   - Multi-level cache implementation
   - Cache strategy support
   - TTL and eviction

2. **Performance tests**
   ```bash
   touch test/performance/dynamicResolution.test.ts
   ```

### Phase 5: Documentation and Polish (Week 3)

1. **Update documentation**
   - API reference
   - Usage examples
   - Migration guide

2. **CLI integration**
   - Add context flags to CLI commands
   - Support dynamic configuration in CLI

### File Structure

```
src/lib/
├── types/
│   └── dynamicTypes.ts        # New: Dynamic argument types
├── utils/
│   ├── dynamicResolver.ts     # New: Resolution utilities
│   └── dynamicCache.ts        # New: Caching system
├── context/
│   └── requestContext.ts      # New: Request context system
├── neurolink.ts               # Updated: Add dynamic support
└── index.ts                   # Updated: Export new types

test/
├── unit/
│   ├── dynamicResolver.test.ts
│   └── dynamicCache.test.ts
├── integration/
│   ├── requestContext.test.ts
│   └── dynamicGeneration.test.ts
└── performance/
    └── dynamicResolution.test.ts
```

---

## Code Examples

### Complete Example: Multi-Tenant AI SaaS

```typescript
// src/examples/multi-tenant-saas.ts

import { NeuroLink } from "@juspay/neurolink";
import {
  withRequestContext,
  RequestContextBuilder,
  createContextFromRequest,
} from "@juspay/neurolink/context";
import {
  withFallback,
  conditional,
  memoizeDynamicArgument,
} from "@juspay/neurolink/dynamic";
import type {
  DynamicArgument,
  DynamicResolutionContext,
  RequestContext,
} from "@juspay/neurolink";

// ===================
// Configuration
// ===================

// Tenant configuration database (simulated)
const tenantConfigs = new Map([
  [
    "tenant_acme",
    {
      provider: "anthropic",
      model: "claude-3-opus",
      maxTokens: 8192,
      customInstructions: "You represent ACME Corp. Be professional.",
    },
  ],
  [
    "tenant_startup",
    {
      provider: "openai",
      model: "gpt-4o-mini",
      maxTokens: 2048,
      customInstructions: "You're a helpful startup assistant.",
    },
  ],
]);

// ===================
// Dynamic Arguments
// ===================

// Memoized tenant config fetcher (caches for 5 minutes per tenant)
const getTenantConfig = memoizeDynamicArgument(
  async ({ requestContext }: DynamicResolutionContext) => {
    const tenantId = requestContext.tenant?.id;
    if (!tenantId) return null;

    // Simulated async fetch
    await new Promise((r) => setTimeout(r, 100));
    return tenantConfigs.get(tenantId) || null;
  },
  { cacheTtl: 300000 },
);

// Dynamic model with fallback chain
const dynamicModel = withFallback<string>(
  // 1. User preference
  ({ requestContext }) => requestContext.user?.preferences?.preferredModel,
  // 2. Tenant configuration
  async (ctx) => (await getTenantConfig(ctx))?.model,
  // 3. Plan-based default
  conditional(
    ({ requestContext }) => requestContext.tenant?.plan === "enterprise",
    "claude-3-opus",
    "gpt-4o-mini",
  ),
  // 4. Final fallback
  "gpt-4o-mini",
);

// Dynamic system prompt
const dynamicSystemPrompt: DynamicArgument<string> = async (ctx) => {
  const tenantConfig = await getTenantConfig(ctx);
  const parts: string[] = [];

  // Base instruction
  parts.push("You are an AI assistant.");

  // Tenant customization
  if (tenantConfig?.customInstructions) {
    parts.push(tenantConfig.customInstructions);
  }

  // User personalization
  const userName = ctx.requestContext.user?.name;
  if (userName) {
    parts.push(`You're helping ${userName}.`);
  }

  // Response style
  const style = ctx.requestContext.user?.preferences?.responseStyle;
  if (style === "concise") {
    parts.push("Be brief and direct.");
  }

  return parts.join(" ");
};

// Dynamic tools based on permissions
const dynamicTools: DynamicArgument<string[]> = async ({
  requestContext,
  neurolink,
}) => {
  const permissions = requestContext.user?.permissions || [];
  const plan = requestContext.tenant?.plan;
  const available = (await neurolink?.getAvailableTools()) || [];

  const allowed: string[] = ["getCurrentTime", "calculateMath"];

  if (permissions.includes("file:read")) {
    allowed.push("readFile");
  }
  if (plan === "enterprise" && permissions.includes("web:search")) {
    allowed.push("websearchGrounding");
  }

  return allowed.filter((t) => available.includes(t));
};

// ===================
// NeuroLink Instance
// ===================

const neurolink = new NeuroLink({
  hitl: {
    enabled: true,
    dangerousActions: ["writeFile", "deleteFile"],
  },
});

// ===================
// Express Integration
// ===================

import express from "express";

const app = express();
app.use(express.json());

// Authentication middleware (simplified)
app.use(async (req, res, next) => {
  // Extract user/tenant from auth token (simplified)
  const userId = req.headers["x-user-id"] as string;
  const tenantId = req.headers["x-tenant-id"] as string;

  if (userId && tenantId) {
    // Fetch user and tenant from database
    req.user = {
      id: userId,
      name: "Demo User",
      permissions: ["file:read", "web:search"],
      preferences: {
        responseStyle: "detailed",
      },
    };
    req.tenant = {
      id: tenantId,
      plan: "enterprise",
    };
  }

  next();
});

// AI generation endpoint
app.post("/api/generate", async (req, res) => {
  const { prompt } = req.body;

  // Create context from request
  const context = createContextFromRequest({
    headers: req.headers,
    user: req.user,
    tenant: req.tenant,
  });

  try {
    // Run with request context
    const result = await withRequestContext(context, async () => {
      return neurolink.generate({
        input: { text: prompt },
        model: dynamicModel,
        systemPrompt: dynamicSystemPrompt,
        tools: dynamicTools,
        context: context as RequestContext,
      });
    });

    res.json({
      content: result.content,
      model: result.model,
      provider: result.provider,
      usage: result.usage,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Generation failed",
    });
  }
});

// Start server
app.listen(3000, () => {
  console.log("Server running on port 3000");
});
```

---

## Testing Strategy

### Unit Tests

```typescript
// test/unit/dynamicResolver.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  resolveDynamicArgument,
  resolveDynamicConfig,
  withFallback,
  conditional,
  memoizeDynamicArgument,
  clearResolutionCache,
} from "../../src/lib/utils/dynamicResolver.js";
import type { DynamicResolutionContext } from "../../src/lib/types/dynamicTypes.js";

describe("resolveDynamicArgument", () => {
  beforeEach(() => {
    clearResolutionCache();
  });

  it("should resolve static values", async () => {
    const result = await resolveDynamicArgument("gpt-4o");
    expect(result.value).toBe("gpt-4o");
    expect(result.resolutionType).toBe("static");
    expect(result.fromCache).toBe(false);
  });

  it("should resolve sync functions", async () => {
    const fn = () => "claude-3-sonnet";
    const result = await resolveDynamicArgument(fn);
    expect(result.value).toBe("claude-3-sonnet");
    expect(result.resolutionType).toBe("sync-function");
  });

  it("should resolve async functions", async () => {
    const fn = async () => {
      await new Promise((r) => setTimeout(r, 10));
      return "gemini-pro";
    };
    const result = await resolveDynamicArgument(fn);
    expect(result.value).toBe("gemini-pro");
    expect(result.resolutionType).toBe("async-function");
  });

  it("should resolve context-aware functions", async () => {
    const fn = ({ requestContext }: DynamicResolutionContext) =>
      requestContext.tenant?.plan === "enterprise"
        ? "claude-3-opus"
        : "gpt-4o-mini";

    const context: DynamicResolutionContext = {
      requestContext: {
        requestId: "test_123",
        timestamp: Date.now(),
        tenant: { id: "t1", plan: "enterprise" },
      },
    };

    const result = await resolveDynamicArgument(fn, context);
    expect(result.value).toBe("claude-3-opus");
    expect(result.resolutionType).toBe("context-aware");
  });

  it("should throw when context-aware function called without context", async () => {
    const fn = ({ requestContext }: DynamicResolutionContext) =>
      requestContext.user?.id;

    await expect(resolveDynamicArgument(fn)).rejects.toThrow(
      "Context-aware dynamic argument requires resolution context",
    );
  });

  it("should cache resolved values when enabled", async () => {
    let callCount = 0;
    const fn = () => {
      callCount++;
      return "cached-value";
    };

    const options = { cache: true, cacheKey: "test-key", cacheTtl: 60000 };

    const result1 = await resolveDynamicArgument(fn, undefined, options);
    const result2 = await resolveDynamicArgument(fn, undefined, options);

    expect(result1.value).toBe("cached-value");
    expect(result2.value).toBe("cached-value");
    expect(result2.fromCache).toBe(true);
    expect(callCount).toBe(1);
  });

  it("should timeout long-running resolutions", async () => {
    const fn = async () => {
      await new Promise((r) => setTimeout(r, 1000));
      return "slow-value";
    };

    await expect(
      resolveDynamicArgument(fn, undefined, { timeout: 100 }),
    ).rejects.toThrow("timed out");
  });

  it("should return default value on error when throwOnError is false", async () => {
    const fn = () => {
      throw new Error("Oops");
    };

    const result = await resolveDynamicArgument(fn, undefined, {
      throwOnError: false,
      defaultValue: "fallback",
    });

    expect(result.value).toBe("fallback");
  });
});

describe("withFallback", () => {
  it("should return first non-null value", async () => {
    const fallbackChain = withFallback<string>(
      () => undefined,
      () => null,
      () => "third-value",
      () => "fourth-value",
    );

    const context: DynamicResolutionContext = {
      requestContext: { requestId: "test", timestamp: Date.now() },
    };

    const result = await resolveDynamicArgument(fallbackChain, context);
    expect(result.value).toBe("third-value");
  });

  it("should throw when all fallbacks fail", async () => {
    const fallbackChain = withFallback<string>(
      () => undefined,
      () => null,
    );

    const context: DynamicResolutionContext = {
      requestContext: { requestId: "test", timestamp: Date.now() },
    };

    await expect(
      resolveDynamicArgument(fallbackChain, context),
    ).rejects.toThrow("All fallbacks failed");
  });
});

describe("conditional", () => {
  it("should return ifTrue when condition is true", async () => {
    const cond = conditional(() => true, "yes", "no");

    const context: DynamicResolutionContext = {
      requestContext: { requestId: "test", timestamp: Date.now() },
    };

    const result = await resolveDynamicArgument(cond, context);
    expect(result.value).toBe("yes");
  });

  it("should return ifFalse when condition is false", async () => {
    const cond = conditional(
      ({ requestContext }) => requestContext.tenant?.plan === "enterprise",
      "premium-model",
      "basic-model",
    );

    const context: DynamicResolutionContext = {
      requestContext: {
        requestId: "test",
        timestamp: Date.now(),
        tenant: { id: "t1", plan: "free" },
      },
    };

    const result = await resolveDynamicArgument(cond, context);
    expect(result.value).toBe("basic-model");
  });
});

describe("memoizeDynamicArgument", () => {
  it("should memoize function results", async () => {
    let callCount = 0;
    const expensive = async () => {
      callCount++;
      await new Promise((r) => setTimeout(r, 50));
      return "expensive-result";
    };

    const memoized = memoizeDynamicArgument(expensive, { cacheTtl: 60000 });

    const context: DynamicResolutionContext = {
      requestContext: { requestId: "test", timestamp: Date.now() },
    };

    const result1 = await resolveDynamicArgument(memoized, context);
    const result2 = await resolveDynamicArgument(memoized, context);

    expect(result1.value).toBe("expensive-result");
    expect(result2.value).toBe("expensive-result");
    expect(callCount).toBe(1);
  });

  it("should not memoize static values", () => {
    const static_ = "static-value";
    const memoized = memoizeDynamicArgument(static_);
    expect(memoized).toBe(static_);
  });
});

describe("resolveDynamicConfig", () => {
  it("should resolve all properties in config object", async () => {
    const config = {
      model: "gpt-4o",
      temperature: () => 0.7,
      maxTokens: async () => 2048,
      systemPrompt: ({ requestContext }: DynamicResolutionContext) =>
        `Hello ${requestContext.user?.name || "User"}`,
    };

    const context: DynamicResolutionContext = {
      requestContext: {
        requestId: "test",
        timestamp: Date.now(),
        user: { id: "u1", name: "Alice" },
      },
    };

    const resolved = await resolveDynamicConfig(config, context);

    expect(resolved.model).toBe("gpt-4o");
    expect(resolved.temperature).toBe(0.7);
    expect(resolved.maxTokens).toBe(2048);
    expect(resolved.systemPrompt).toBe("Hello Alice");
  });
});
```

### Integration Tests

```typescript
// test/integration/dynamicGeneration.test.ts

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NeuroLink } from "../../src/lib/neurolink.js";
import { withRequestContext } from "../../src/lib/context/requestContext.js";
import type { DynamicArgument } from "../../src/lib/types/dynamicTypes.js";

describe("NeuroLink Dynamic Generation", () => {
  let neurolink: NeuroLink;

  beforeEach(() => {
    neurolink = new NeuroLink();
  });

  afterEach(async () => {
    await neurolink.cleanup?.();
  });

  it("should support static generation options (backward compatible)", async () => {
    const result = await neurolink.generate({
      input: { text: "Say hello" },
      provider: "openai",
      model: "gpt-4o-mini",
      maxTokens: 50,
    });

    expect(result.content).toBeDefined();
    expect(result.provider).toBe("openai");
  });

  it("should resolve dynamic model based on context", async () => {
    const modelSelector: DynamicArgument<string> = ({ requestContext }) =>
      requestContext.tenant?.plan === "enterprise" ? "gpt-4o" : "gpt-4o-mini";

    const result = await neurolink.generate({
      input: { text: "Say hello" },
      model: modelSelector,
      maxTokens: 50,
      context: {
        requestId: "test_123",
        timestamp: Date.now(),
        tenant: { id: "t1", plan: "enterprise" },
      },
    });

    expect(result.content).toBeDefined();
    expect(result.model).toBe("gpt-4o");
  });

  it("should resolve async dynamic arguments", async () => {
    const asyncModel: DynamicArgument<string> = async () => {
      await new Promise((r) => setTimeout(r, 10));
      return "gpt-4o-mini";
    };

    const result = await neurolink.generate({
      input: { text: "Say hello" },
      model: asyncModel,
      maxTokens: 50,
    });

    expect(result.content).toBeDefined();
    expect(result.model).toBe("gpt-4o-mini");
  });

  it("should work with withRequestContext", async () => {
    const modelSelector: DynamicArgument<string> = ({ requestContext }) =>
      requestContext.user?.preferences?.preferredModel || "gpt-4o-mini";

    const result = await withRequestContext(
      {
        user: {
          id: "u1",
          preferences: { preferredModel: "claude-3-sonnet" },
        },
      },
      () =>
        neurolink.generate({
          input: { text: "Say hello" },
          model: modelSelector,
          provider: "anthropic",
          maxTokens: 50,
        }),
    );

    expect(result.content).toBeDefined();
    expect(result.model).toBe("claude-3-sonnet");
  });
});
```

---

## Migration Guide

### From Static to Dynamic Configuration

#### Before (Static)

```typescript
// Static configuration - same for all requests
const neurolink = new NeuroLink();

const result = await neurolink.generate({
  input: { text: "Hello" },
  provider: "openai",
  model: "gpt-4o",
  temperature: 0.7,
});
```

#### After (Dynamic)

```typescript
// Dynamic configuration - adapts per request
import { NeuroLink } from "@juspay/neurolink";
import { withRequestContext } from "@juspay/neurolink/context";
import { withFallback } from "@juspay/neurolink/dynamic";

const neurolink = new NeuroLink();

// Define dynamic arguments
const dynamicModel = withFallback(
  ({ requestContext }) => requestContext.user?.preferences?.preferredModel,
  ({ requestContext }) => requestContext.tenant?.settings?.defaultModel,
  "gpt-4o-mini",
);

// Use with context
const result = await withRequestContext(
  {
    user: { id: "user123", preferences: { preferredModel: "claude-3-sonnet" } },
    tenant: { id: "tenant456", plan: "pro" },
  },
  () =>
    neurolink.generate({
      input: { text: "Hello" },
      model: dynamicModel,
      temperature: 0.7, // Static values still work
    }),
);
```

### Gradual Migration Path

1. **Phase 1**: Add context infrastructure without changing existing code
2. **Phase 2**: Convert high-value configurations to dynamic (model, provider)
3. **Phase 3**: Add tenant/user-specific customizations
4. **Phase 4**: Implement caching for expensive dynamic resolutions

### Compatibility Notes

- Static values continue to work unchanged
- No breaking changes to existing API
- Dynamic arguments are opt-in per property
- Context is optional for non-context-aware functions

---

## Conclusion

This implementation guide provides a complete blueprint for adding Mastra-style dynamic configuration capabilities to NeuroLink. Key features include:

1. **Type-safe dynamic arguments** - Full TypeScript support with inference
2. **Flexible resolution** - Static, sync, async, and context-aware functions
3. **Request context propagation** - Thread-safe context via AsyncLocalStorage
4. **Multi-level caching** - Per-request, per-user, per-tenant, and global caching
5. **Utility functions** - withFallback, conditional, memoize helpers
6. **Backward compatibility** - Existing code works without changes

The dynamic arguments pattern enables sophisticated multi-tenant AI applications with per-request customization, user preferences, and intelligent resource allocation.

---

## References

- **Mastra Documentation**: https://mastra.ai/docs
- **Mastra Agent System**: https://mastra.ai/docs/agents
- **AsyncLocalStorage**: https://nodejs.org/api/async_context.html
- **NeuroLink Architecture**: `/docs/mastra-features-implementation/00-neurolink-architecture-patterns.md`
- **NeuroLink Provider System**: `/docs/mastra-features-implementation/01-gateway-provider-system.md`
