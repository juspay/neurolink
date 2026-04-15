/**
 * Dynamic Argument Resolution Utilities
 *
 * Provides utilities for resolving dynamic arguments to their actual values,
 * with support for caching, memoization, fallbacks, and conditional resolution.
 *
 * @module dynamic/dynamicResolver
 */

import type {
  DynamicArgument,
  DynamicResolutionContext,
  ResolutionOptions,
  ResolutionResult,
  DynamicCacheEntry,
  DynamicConfig,
  ResolvedConfig,
} from "../types/index.js";
import { isDynamicFunction, isContextAwareFunction } from "./resolution.js";
import { logger } from "../utils/logger.js";
import { withTimeout } from "../utils/errorHandling.js";

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
  private cache = new Map<string, DynamicCacheEntry<unknown>>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(cleanupIntervalMs: number = 60000) {
    this.startCleanup(cleanupIntervalMs);
  }

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

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

  size(): number {
    return this.cache.size;
  }

  private startCleanup(intervalMs: number): void {
    const timer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
        }
      }
    }, intervalMs);
    if (typeof timer.unref === "function") {
      timer.unref();
    }
    this.cleanupInterval = timer;
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

// Stable per-instance ids for function arguments — `String(fn)` is unsafe
// because two distinct closures with identical source text collide.
const functionIds = new WeakMap<Function, string>();
let nextFunctionId = 0;
function getArgumentId(argument: unknown): string {
  if (typeof argument !== "function") {
    return String(argument);
  }
  let id = functionIds.get(argument as Function);
  if (id === undefined) {
    id = `fn:${++nextFunctionId}`;
    functionIds.set(argument as Function, id);
  }
  return id;
}

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
    // Extract cache-scoping ids from generic context (consumer-defined shape)
    const rc = context.requestContext as Record<
      string,
      Record<string, unknown>
    >;
    if (rc.user?.id) {
      parts.push(`user:${rc.user.id}`);
    }
    if (rc.tenant?.id) {
      parts.push(`tenant:${rc.tenant.id}`);
    }
    if (rc.session?.id) {
      parts.push(`session:${rc.session.id}`);
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
    const cacheKey = generateCacheKey(
      getArgumentId(argument),
      context,
      options,
    );
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
        const cacheKey = generateCacheKey(
          getArgumentId(argument),
          context,
          options,
        );
        globalCache.set(cacheKey, argument, opts.cacheTtl);
      }

      return result;
    }

    // Function value
    let resolvedValue: T;
    let resolutionType: ResolutionResult<T>["resolutionType"] =
      "async-function";

    const resolutionPromise = (async () => {
      if (isContextAwareFunction<T>(argument)) {
        // Context-aware function — pass an empty context if caller didn't
        // provide one. Combinators (withFallback, conditional, etc.) return
        // arity-1 functions even when their inputs don't need context, so
        // requiring a context here would force callers to invent one.
        resolutionType = "context-aware";
        return argument(context ?? { requestContext: {} });
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
      resolutionType: resolutionType,
    };

    // Cache if enabled
    if (opts.cache) {
      const cacheKey = generateCacheKey(
        getArgumentId(argument),
        context,
        options,
      );
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
    let lastError: unknown;
    for (const arg of arguments_) {
      try {
        const result = await resolveDynamicArgument(arg, context, {
          throwOnError: false,
        });
        if (result.value !== undefined && result.value !== null) {
          return result.value as T;
        }
      } catch (err) {
        lastError = err;
      }
    }
    const msg =
      lastError instanceof Error ? lastError.message : String(lastError || "");
    throw new Error(`All fallbacks failed${msg ? `: ${msg}` : ""}`, {
      cause: lastError,
    });
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
 * Create a mapped dynamic argument that transforms the result
 *
 * @example
 * ```typescript
 * const upperCaseModel = mapDynamicArgument(
 *   ({ requestContext }) => requestContext.user?.preferences?.preferredModel,
 *   (model) => model?.toUpperCase()
 * );
 * ```
 */
export function mapDynamicArgument<T, U>(
  argument: DynamicArgument<T>,
  transform: (value: T) => U | Promise<U>,
): DynamicArgument<U> {
  return async (context: DynamicResolutionContext) => {
    const result = await resolveDynamicArgument(argument, context);
    return transform(result.value);
  };
}

/**
 * Create a dynamic argument that combines multiple arguments
 *
 * @example
 * ```typescript
 * const combinedConfig = combineDynamicArguments(
 *   [
 *     ({ requestContext }) => requestContext.user?.preferences?.preferredModel,
 *     ({ requestContext }) => requestContext.tenant?.settings?.defaultTemperature,
 *   ],
 *   ([model, temperature]) => ({ model: model || "gpt-4o", temperature: temperature || 0.7 })
 * );
 * ```
 */
export function combineDynamicArguments<T extends readonly unknown[], U>(
  arguments_: { [K in keyof T]: DynamicArgument<T[K]> },
  combiner: (values: T) => U | Promise<U>,
): DynamicArgument<U> {
  return async (context: DynamicResolutionContext) => {
    const results = await resolveDynamicArguments(arguments_, context);
    return combiner(results as T);
  };
}

/**
 * Check if a value contains any dynamic arguments (is a function)
 */
export function hasDynamicArgument<T>(value: DynamicArgument<T>): boolean {
  return isDynamicFunction(value);
}

/**
 * Check if an object has any dynamic properties
 */
export function hasDynamicProperties<T extends Record<string, unknown>>(
  config: DynamicConfig<T>,
): boolean {
  return Object.values(config).some((value) => isDynamicFunction(value));
}

/**
 * Clear the global resolution cache
 */
export function clearResolutionCache(): void {
  globalCache.clear();
}

/**
 * Get resolution cache statistics
 */
export function getResolutionCacheStats(): { size: number } {
  return { size: globalCache.size() };
}

/**
 * Destroy the resolver (cleanup intervals, etc.)
 */
export function destroyResolver(): void {
  globalCache.destroy();
}

// ============================================================================
// Environment Variable Interpolation
// ============================================================================

/**
 * Pattern for environment variable interpolation
 * Supports: ${ENV_VAR}, ${ENV_VAR:-default}, ${ENV_VAR:+replacement}
 */
const ENV_VAR_PATTERN = /\$\{([A-Za-z_][A-Za-z0-9_]*)(?::([+-]?)([^}]*))?\}/g;

/**
 * Interpolate environment variables in a string
 *
 * Supports syntax:
 * - ${VAR} - Simple substitution
 * - ${VAR:-default} - Use default if VAR is unset or empty
 * - ${VAR:+replacement} - Use replacement if VAR is set and non-empty
 *
 * @example
 * ```typescript
 * interpolateEnvVars("Model: ${DEFAULT_MODEL:-gpt-4o}");
 * // Returns "Model: gpt-4o" if DEFAULT_MODEL is not set
 *
 * interpolateEnvVars("API Key: ${OPENAI_API_KEY}");
 * // Returns "API Key: sk-xxx..." if OPENAI_API_KEY is set
 *
 * interpolateEnvVars("Debug: ${DEBUG:+enabled}");
 * // Returns "Debug: enabled" if DEBUG is set, "Debug: " otherwise
 * ```
 */
export function interpolateEnvVars(
  input: string,
  customEnv?: Record<string, string | undefined>,
): string {
  const env = customEnv || process.env;

  return input.replace(ENV_VAR_PATTERN, (match, varName, modifier, value) => {
    const envValue = env[varName];
    const isSet = envValue !== undefined && envValue !== "";

    if (modifier === "-") {
      // ${VAR:-default} - Use default if unset or empty
      return isSet ? envValue : value || "";
    } else if (modifier === "+") {
      // ${VAR:+replacement} - Use replacement if set and non-empty
      return isSet ? value || "" : "";
    } else {
      // ${VAR} - Simple substitution
      return envValue || "";
    }
  });
}

/**
 * Create a dynamic argument that interpolates environment variables
 *
 * @example
 * ```typescript
 * const model = fromEnv("${PREFERRED_MODEL:-gpt-4o}");
 * // Resolves to value of PREFERRED_MODEL or "gpt-4o" as fallback
 * ```
 */
export function fromEnv(template: string): DynamicArgument<string> {
  return () => interpolateEnvVars(template);
}

/**
 * Create a dynamic argument from a single environment variable
 *
 * @example
 * ```typescript
 * const apiKey = envVar("OPENAI_API_KEY");
 * // Resolves to value of OPENAI_API_KEY or undefined
 *
 * const model = envVar("DEFAULT_MODEL", "gpt-4o");
 * // Resolves to DEFAULT_MODEL value or "gpt-4o" as default
 * ```
 */
export function envVar<T extends string = string>(
  name: string,
  defaultValue?: T,
): DynamicArgument<T | undefined> {
  return () => {
    const value = process.env[name];
    return (value !== undefined && value !== "" ? value : defaultValue) as
      | T
      | undefined;
  };
}

/**
 * Create a dynamic argument that selects from environment-based configurations
 *
 * @example
 * ```typescript
 * const model = envSwitch("NODE_ENV", {
 *   development: "gpt-4o-mini",
 *   production: "gpt-4o",
 *   test: "gpt-3.5-turbo",
 * }, "gpt-4o-mini");
 * ```
 */
export function envSwitch<T>(
  envVarName: string,
  options: Record<string, T>,
  defaultValue: T,
): DynamicArgument<T> {
  return () => {
    const envValue = process.env[envVarName];
    if (envValue && envValue in options) {
      return options[envValue];
    }
    return defaultValue;
  };
}

/**
 * Create a dynamic argument that parses a JSON value from an environment variable
 *
 * @example
 * ```typescript
 * // If RATE_LIMITS='{"requestsPerMinute": 100, "tokensPerDay": 50000}'
 * const rateLimits = envJson<RateLimits>("RATE_LIMITS", { requestsPerMinute: 10 });
 * ```
 */
export function envJson<T>(
  name: string,
  defaultValue?: T,
): DynamicArgument<T | undefined> {
  return () => {
    const value = process.env[name];
    if (!value) {
      return defaultValue;
    }
    try {
      return JSON.parse(value) as T;
    } catch {
      logger.warn(`Failed to parse JSON from environment variable ${name}`);
      return defaultValue;
    }
  };
}

/**
 * Create a dynamic argument that reads a number from an environment variable
 *
 * @example
 * ```typescript
 * const maxTokens = envNumber("MAX_TOKENS", 1000);
 * const temperature = envNumber("TEMPERATURE", 0.7);
 * ```
 */
export function envNumber(
  name: string,
  defaultValue?: number,
): DynamicArgument<number | undefined> {
  return () => {
    const value = process.env[name];
    if (!value) {
      return defaultValue;
    }
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  };
}

/**
 * Create a dynamic argument that reads a boolean from an environment variable
 *
 * @example
 * ```typescript
 * const enableDebug = envBoolean("DEBUG", false);
 * const enableTools = envBoolean("ENABLE_TOOLS", true);
 * ```
 */
export function envBoolean(
  name: string,
  defaultValue?: boolean,
): DynamicArgument<boolean | undefined> {
  return () => {
    const value = process.env[name];
    if (!value) {
      return defaultValue;
    }
    const lower = value.toLowerCase();
    if (
      lower === "true" ||
      lower === "1" ||
      lower === "yes" ||
      lower === "on"
    ) {
      return true;
    }
    if (
      lower === "false" ||
      lower === "0" ||
      lower === "no" ||
      lower === "off"
    ) {
      return false;
    }
    return defaultValue;
  };
}

/**
 * Create a dynamic argument that reads a comma-separated list from an environment variable
 *
 * @example
 * ```typescript
 * // If ALLOWED_PROVIDERS='openai,anthropic,vertex'
 * const providers = envList("ALLOWED_PROVIDERS", ["openai"]);
 * // Returns ["openai", "anthropic", "vertex"]
 * ```
 */
export function envList(
  name: string,
  defaultValue?: string[],
  separator: string = ",",
): DynamicArgument<string[] | undefined> {
  return () => {
    const value = process.env[name];
    if (!value) {
      return defaultValue;
    }
    return value
      .split(separator)
      .map((s) => s.trim())
      .filter(Boolean);
  };
}

export { globalCache as resolutionCache };
