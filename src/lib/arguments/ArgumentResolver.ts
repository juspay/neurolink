/**
 * Argument Resolver
 *
 * Core resolution engine for dynamic arguments. Supports static values,
 * synchronous functions, asynchronous functions, and context-aware functions.
 *
 * @module arguments/resolver
 * @version 1.0.0
 */

import { createErrorFactory } from "../core/infrastructure/index.js";
import { TypedEventEmitter } from "../core/infrastructure/typedEventEmitter.js";
import type {
  DynamicArgument,
  DynamicResolutionContext,
  ResolutionResult,
  ResolutionOptions,
  ResolutionType,
  ArgumentResolutionEvents,
  ArgumentResolverConfig,
  CacheEntry,
  CacheStrategy,
  CacheStats,
  BatchResolutionResult,
  DynamicConfig,
  ResolvedConfig,
} from "./types/argumentTypes.js";
import {
  getResolutionType,
  assertContextProvided,
} from "./ArgumentValidators.js";

// ============================================================================
// Error Factory
// ============================================================================

const ArgumentErrors = createErrorFactory("DynamicArgument", {
  RESOLUTION_FAILED: "ARGUMENT_RESOLUTION_FAILED",
  TIMEOUT: "ARGUMENT_RESOLUTION_TIMEOUT",
  CONTEXT_REQUIRED: "ARGUMENT_CONTEXT_REQUIRED",
  VALIDATION_FAILED: "ARGUMENT_VALIDATION_FAILED",
  CACHE_ERROR: "ARGUMENT_CACHE_ERROR",
  RESOLVER_NOT_FOUND: "ARGUMENT_RESOLVER_NOT_FOUND",
  INVALID_ARGUMENT: "ARGUMENT_INVALID_TYPE",
});

// ============================================================================
// Timeout Utility
// ============================================================================

/**
 * Execute a promise with a timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError?: Error,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        timeoutError || new Error(`Operation timed out after ${timeoutMs}ms`),
      );
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

// ============================================================================
// Resolution Cache
// ============================================================================

/**
 * Cache for resolved argument values
 */
class ResolutionCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private stats: CacheStats = { hits: 0, misses: 0, size: 0, hitRate: 0 };
  private maxSize: number;
  private cleanupIntervalId?: ReturnType<typeof setInterval>;

  constructor(maxSize: number = 1000, cleanupInterval: number = 60000) {
    this.maxSize = maxSize;
    if (cleanupInterval > 0) {
      this.cleanupIntervalId = setInterval(
        () => this.cleanup(),
        cleanupInterval,
      );
    }
  }

  /**
   * Generate a cache key
   */
  generateKey(
    argumentId: string,
    context?: DynamicResolutionContext,
    strategy: CacheStrategy = "global",
  ): string {
    const parts = [argumentId, strategy];

    if (context && strategy !== "global") {
      switch (strategy) {
        case "per-request":
          parts.push(context.requestContext.requestId);
          break;
        case "per-user":
          parts.push(context.requestContext.user?.id || "anonymous");
          break;
        case "per-tenant":
          parts.push(context.requestContext.tenant?.id || "default");
          break;
      }
    }

    return parts.join(":");
  }

  /**
   * Get a cached value
   */
  get<T>(key: string): CacheEntry<T> | undefined {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }

    // Check expiration
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      this.stats.size = this.cache.size;
      this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }

    this.stats.hits++;
    this.updateHitRate();
    return entry;
  }

  /**
   * Set a cached value
   */
  set<T>(key: string, value: T, ttl: number, strategy: CacheStrategy): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      value,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl,
      strategy,
    };

    this.cache.set(key, entry);
    this.stats.size = this.cache.size;
  }

  /**
   * Delete a cached entry
   */
  delete(key: string): boolean {
    const result = this.cache.delete(key);
    this.stats.size = this.cache.size;
    return result;
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, size: 0, hitRate: 0 };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    this.stats.size = this.cache.size;
    return cleaned;
  }

  /**
   * Evict the oldest entry
   */
  private evictOldest(): void {
    let oldestKey: string | undefined;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Dispose of the cache and cleanup intervals
   */
  dispose(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = undefined;
    }
    this.clear();
  }
}

// ============================================================================
// Argument Resolver
// ============================================================================

/**
 * Default resolver configuration
 */
const DEFAULT_CONFIG: ArgumentResolverConfig = {
  defaultTimeout: 30000,
  enableCache: true,
  defaultCacheTtl: 60000,
  defaultCacheStrategy: "per-request",
  maxCacheSize: 1000,
  cacheCleanupInterval: 60000,
  throwOnError: true,
  enableEvents: true,
};

/**
 * Main argument resolver class
 */
export class ArgumentResolver extends TypedEventEmitter<ArgumentResolutionEvents> {
  private config: Required<ArgumentResolverConfig>;
  private cache: ResolutionCache;

  constructor(config: ArgumentResolverConfig = {}) {
    super();
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    } as Required<ArgumentResolverConfig>;
    this.cache = new ResolutionCache(
      this.config.maxCacheSize,
      this.config.cacheCleanupInterval,
    );
  }

  /**
   * Resolve a single dynamic argument
   */
  async resolve<T>(
    argument: DynamicArgument<T>,
    context?: DynamicResolutionContext,
    options: ResolutionOptions<T> = {},
  ): Promise<ResolutionResult<T>> {
    const startTime = Date.now();
    const resolutionType = getResolutionType(argument);
    const argumentId =
      options.argumentId ||
      `arg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Emit start event
    if (this.config.enableEvents) {
      this.emit("resolution:start", {
        argumentId,
        resolutionType,
        timestamp: startTime,
      });
    }

    // Check cache if enabled
    if (options.cache ?? this.config.enableCache) {
      const cacheStrategy =
        options.cacheStrategy ?? this.config.defaultCacheStrategy;
      const cacheKey = this.cache.generateKey(
        argumentId,
        context,
        cacheStrategy,
      );
      const cached = this.cache.get<T>(cacheKey);

      if (cached) {
        if (this.config.enableEvents) {
          this.emit("cache:hit", {
            argumentId,
            cacheKey,
            strategy: cacheStrategy,
          });
        }

        return {
          value: cached.value,
          resolutionType,
          fromCache: true,
          resolutionTime: Date.now() - startTime,
          cacheKey,
        };
      }

      if (this.config.enableEvents) {
        this.emit("cache:miss", {
          argumentId,
          cacheKey,
          strategy: cacheStrategy,
        });
      }
    }

    try {
      const value = await this.resolveValue(
        argument,
        resolutionType,
        context,
        options,
      );

      // Cache the result if caching is enabled
      if (options.cache ?? this.config.enableCache) {
        const cacheStrategy =
          options.cacheStrategy ?? this.config.defaultCacheStrategy;
        const cacheKey = this.cache.generateKey(
          argumentId,
          context,
          cacheStrategy,
        );
        const cacheTtl = options.cacheTtl ?? this.config.defaultCacheTtl;
        this.cache.set(cacheKey, value, cacheTtl, cacheStrategy);
      }

      const result: ResolutionResult<T> = {
        value,
        resolutionType,
        fromCache: false,
        resolutionTime: Date.now() - startTime,
      };

      // Emit complete event
      if (this.config.enableEvents) {
        this.emit("resolution:complete", {
          argumentId,
          resolutionType,
          duration: result.resolutionTime,
          fromCache: false,
        });
      }

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Emit error event
      if (this.config.enableEvents) {
        this.emit("resolution:error", {
          argumentId,
          error: err,
          willRetry: false,
        });
      }

      const throwOnError = options.throwOnError ?? this.config.throwOnError;

      if (throwOnError) {
        throw ArgumentErrors.create("RESOLUTION_FAILED", err.message, {
          cause: err,
          details: { argumentId, resolutionType },
        });
      }

      // Return with default value
      return {
        value: options.defaultValue as T,
        resolutionType,
        fromCache: false,
        resolutionTime: Date.now() - startTime,
        error: err,
      };
    }
  }

  /**
   * Resolve the actual value based on resolution type
   */
  private async resolveValue<T>(
    argument: DynamicArgument<T>,
    resolutionType: ResolutionType,
    context?: DynamicResolutionContext,
    options: ResolutionOptions<T> = {},
  ): Promise<T> {
    const timeout = options.timeout ?? this.config.defaultTimeout;
    const signal = options.signal ?? context?.signal;

    // Check for abort signal
    if (signal?.aborted) {
      throw new Error("Resolution aborted");
    }

    switch (resolutionType) {
      case "static":
        return argument as T;

      case "sync-function": {
        const syncFn = argument as () => T;
        return syncFn();
      }

      case "async-function": {
        const asyncFn = argument as () => Promise<T>;
        const promise = asyncFn();

        if (timeout > 0) {
          return await withTimeout(
            promise,
            timeout,
            ArgumentErrors.create(
              "TIMEOUT",
              `Resolution timed out after ${timeout}ms`,
            ),
          );
        }

        return await promise;
      }

      case "context-aware": {
        assertContextProvided(context, options.argumentId);
        const contextFn = argument as (ctx: DynamicResolutionContext) => T;
        return contextFn(context);
      }

      case "context-aware-async": {
        assertContextProvided(context, options.argumentId);
        const contextAsyncFn = argument as (
          ctx: DynamicResolutionContext,
        ) => Promise<T>;
        const promise = contextAsyncFn(context);

        if (timeout > 0) {
          return await withTimeout(
            promise,
            timeout,
            ArgumentErrors.create(
              "TIMEOUT",
              `Resolution timed out after ${timeout}ms`,
            ),
          );
        }

        return await promise;
      }

      default:
        throw ArgumentErrors.create(
          "INVALID_ARGUMENT",
          `Unknown resolution type: ${resolutionType}`,
        );
    }
  }

  /**
   * Resolve multiple arguments in parallel
   */
  async resolveMany<T extends readonly DynamicArgument<unknown>[]>(
    arguments_: T,
    context?: DynamicResolutionContext,
    options: ResolutionOptions = {},
  ): Promise<BatchResolutionResult<T>> {
    const startTime = Date.now();

    const results = await Promise.all(
      arguments_.map((arg, index) =>
        this.resolve(arg, context, {
          ...options,
          argumentId: options.argumentId
            ? `${options.argumentId}_${index}`
            : undefined,
        }),
      ),
    );

    const cacheHits = results.filter((r) => r.fromCache).length;
    const errors = results.filter((r) => r.error).length;

    return {
      values: results as BatchResolutionResult<T>["values"],
      totalTime: Date.now() - startTime,
      cacheHits,
      errors,
    };
  }

  /**
   * Resolve a configuration object with dynamic arguments
   */
  async resolveConfig<T extends Record<string, unknown>>(
    config: DynamicConfig<T>,
    context?: DynamicResolutionContext,
    options: ResolutionOptions = {},
  ): Promise<ResolvedConfig<T>> {
    const entries = Object.entries(config);
    const resolvedEntries = await Promise.all(
      entries.map(async ([key, value]) => {
        const result = await this.resolve(value, context, {
          ...options,
          argumentId: options.argumentId ? `${options.argumentId}.${key}` : key,
        });
        return [key, result.value] as const;
      }),
    );

    return Object.fromEntries(resolvedEntries) as ResolvedConfig<T>;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return this.cache.getStats();
  }

  /**
   * Clear the resolution cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Dispose of the resolver and free resources
   */
  dispose(): void {
    this.cache.dispose();
    this.removeAllListeners();
  }
}

// ============================================================================
// Standalone Resolution Functions
// ============================================================================

// Singleton resolver instance
let defaultResolver: ArgumentResolver | null = null;

/**
 * Get or create the default resolver instance
 */
function getDefaultResolver(): ArgumentResolver {
  if (!defaultResolver) {
    defaultResolver = new ArgumentResolver();
  }
  return defaultResolver;
}

/**
 * Resolve a single dynamic argument
 *
 * @example Static value
 * ```typescript
 * const result = await resolveDynamicArgument("gpt-4o");
 * console.log(result.value); // "gpt-4o"
 * console.log(result.resolutionType); // "static"
 * ```
 *
 * @example Sync function
 * ```typescript
 * const result = await resolveDynamicArgument(() => process.env.MODEL || "gpt-4o");
 * console.log(result.resolutionType); // "sync-function"
 * ```
 *
 * @example Context-aware function
 * ```typescript
 * const result = await resolveDynamicArgument(
 *   ({ requestContext }) => requestContext.tenant?.plan === "enterprise"
 *     ? "claude-3-opus" : "gpt-4o-mini",
 *   { requestContext: { requestId: "123", timestamp: Date.now(), tenant: { id: "t1", plan: "enterprise" } } }
 * );
 * console.log(result.value); // "claude-3-opus"
 * ```
 */
export async function resolveDynamicArgument<T>(
  argument: DynamicArgument<T>,
  context?: DynamicResolutionContext,
  options?: ResolutionOptions<T>,
): Promise<ResolutionResult<T>> {
  return getDefaultResolver().resolve(argument, context, options);
}

/**
 * Resolve multiple dynamic arguments in parallel
 *
 * @example
 * ```typescript
 * const [modelResult, tempResult, tokensResult] = await resolveDynamicArguments([
 *   () => process.env.MODEL || "gpt-4o",
 *   0.7,
 *   async () => (await fetchConfig()).maxTokens,
 * ]);
 * ```
 */
export async function resolveDynamicArguments<
  T extends readonly DynamicArgument<unknown>[],
>(
  arguments_: T,
  context?: DynamicResolutionContext,
  options?: ResolutionOptions,
): Promise<BatchResolutionResult<T>> {
  return getDefaultResolver().resolveMany(arguments_, context, options);
}

/**
 * Resolve a dynamic configuration object
 *
 * @example
 * ```typescript
 * const resolved = await resolveDynamicConfig({
 *   model: ({ requestContext }) => requestContext.tenant?.settings?.defaultModel || "gpt-4o",
 *   temperature: 0.7,
 *   maxTokens: async () => (await fetchConfig()).maxTokens,
 * }, context);
 * ```
 */
export async function resolveDynamicConfig<T extends Record<string, unknown>>(
  config: DynamicConfig<T>,
  context?: DynamicResolutionContext,
  options?: ResolutionOptions,
): Promise<ResolvedConfig<T>> {
  return getDefaultResolver().resolveConfig(config, context, options);
}

// ============================================================================
// Helper Utilities
// ============================================================================

/**
 * Create a dynamic argument with fallback values
 *
 * @example
 * ```typescript
 * const model = withFallback(
 *   ({ requestContext }) => requestContext.user?.preferences?.preferredModel,
 *   ({ requestContext }) => requestContext.tenant?.settings?.defaultModel,
 *   "gpt-4o"
 * );
 * ```
 */
export function withFallback<T>(
  ...arguments_: DynamicArgument<T | undefined | null>[]
): DynamicArgument<T> {
  return async (context: DynamicResolutionContext): Promise<T> => {
    const resolver = getDefaultResolver();

    for (const arg of arguments_) {
      const result = await resolver.resolve(arg, context, {
        throwOnError: false,
      });

      if (result.value !== undefined && result.value !== null) {
        return result.value as T;
      }
    }

    throw new Error("All fallback values were undefined or null");
  };
}

/**
 * Create a conditional dynamic argument
 *
 * @example
 * ```typescript
 * const model = conditional(
 *   ({ requestContext }) => requestContext.tenant?.plan === "enterprise",
 *   "claude-3-opus",
 *   "gpt-4o-mini"
 * );
 * ```
 */
export function conditional<T>(
  condition: DynamicArgument<boolean>,
  ifTrue: DynamicArgument<T>,
  ifFalse: DynamicArgument<T>,
): DynamicArgument<T> {
  return async (context: DynamicResolutionContext): Promise<T> => {
    const resolver = getDefaultResolver();
    const conditionResult = await resolver.resolve(condition, context);

    if (conditionResult.value) {
      const trueResult = await resolver.resolve(ifTrue, context);
      return trueResult.value;
    } else {
      const falseResult = await resolver.resolve(ifFalse, context);
      return falseResult.value;
    }
  };
}

/**
 * Memoize a dynamic argument with optional TTL
 *
 * @example
 * ```typescript
 * const expensiveModel = memoize(
 *   async () => await fetchModelFromApi(),
 *   { cacheTtl: 300000 } // 5 minutes
 * );
 * ```
 */
export function memoize<T>(
  argument: DynamicArgument<T>,
  options: { cacheTtl?: number; cacheStrategy?: CacheStrategy } = {},
): DynamicArgument<T> {
  const argumentId = `memoized_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  return async (context: DynamicResolutionContext): Promise<T> => {
    const resolver = getDefaultResolver();
    const result = await resolver.resolve(argument, context, {
      argumentId,
      cache: true,
      cacheTtl: options.cacheTtl ?? 60000,
      cacheStrategy: options.cacheStrategy ?? "global",
    });
    return result.value;
  };
}

/**
 * Create a lazy dynamic argument that only resolves when first accessed
 */
export function lazy<T>(factory: () => DynamicArgument<T>): DynamicArgument<T> {
  let cachedArgument: DynamicArgument<T> | undefined;

  return async (context: DynamicResolutionContext): Promise<T> => {
    if (!cachedArgument) {
      cachedArgument = factory();
    }

    const resolver = getDefaultResolver();
    const result = await resolver.resolve(cachedArgument, context);
    return result.value;
  };
}

/**
 * Transform the resolved value of a dynamic argument
 *
 * @example
 * ```typescript
 * const uppercaseModel = transform(
 *   () => process.env.MODEL || "gpt-4o",
 *   (model) => model.toUpperCase()
 * );
 * ```
 */
export function transform<T, U>(
  argument: DynamicArgument<T>,
  transformer: (value: T) => U | Promise<U>,
): DynamicArgument<U> {
  return async (context: DynamicResolutionContext): Promise<U> => {
    const resolver = getDefaultResolver();
    const result = await resolver.resolve(argument, context);
    return await transformer(result.value);
  };
}

/**
 * Create a dynamic argument that checks all required conditions
 *
 * @example
 * ```typescript
 * const isEnterprise = ({ requestContext }) => requestContext.tenant?.plan === "enterprise";
 * const hasPermission = ({ requestContext }) => requestContext.user?.permissions?.includes("advanced_models");
 *
 * const model = all([isEnterprise, hasPermission], "claude-3-opus", "gpt-4o-mini");
 * ```
 */
export function all<T>(
  conditions: DynamicArgument<boolean>[],
  ifAllTrue: DynamicArgument<T>,
  ifAnyFalse: DynamicArgument<T>,
): DynamicArgument<T> {
  return async (context: DynamicResolutionContext): Promise<T> => {
    const resolver = getDefaultResolver();
    const results = await resolver.resolveMany(conditions, context);

    const allTrue = results.values.every((r) => r.value === true);

    if (allTrue) {
      const trueResult = await resolver.resolve(ifAllTrue, context);
      return trueResult.value;
    } else {
      const falseResult = await resolver.resolve(ifAnyFalse, context);
      return falseResult.value;
    }
  };
}

/**
 * Create a dynamic argument that checks if any condition is true
 */
export function any<T>(
  conditions: DynamicArgument<boolean>[],
  ifAnyTrue: DynamicArgument<T>,
  ifAllFalse: DynamicArgument<T>,
): DynamicArgument<T> {
  return async (context: DynamicResolutionContext): Promise<T> => {
    const resolver = getDefaultResolver();
    const results = await resolver.resolveMany(conditions, context);

    const anyTrue = results.values.some((r) => r.value === true);

    if (anyTrue) {
      const trueResult = await resolver.resolve(ifAnyTrue, context);
      return trueResult.value;
    } else {
      const falseResult = await resolver.resolve(ifAllFalse, context);
      return falseResult.value;
    }
  };
}

// ============================================================================
// Configuration for Default Resolver
// ============================================================================

/**
 * Configure the default resolver
 */
export function configureDefaultResolver(config: ArgumentResolverConfig): void {
  if (defaultResolver) {
    defaultResolver.dispose();
  }
  defaultResolver = new ArgumentResolver(config);
}

/**
 * Reset the default resolver to initial state
 */
export function resetDefaultResolver(): void {
  if (defaultResolver) {
    defaultResolver.dispose();
    defaultResolver = null;
  }
}
