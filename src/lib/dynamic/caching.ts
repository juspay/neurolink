/**
 * Dynamic Argument Caching System
 *
 * Provides multi-level caching strategies for dynamic arguments:
 * - per-request: Cache within a single request
 * - per-user: Cache per user across requests
 * - per-tenant: Cache per tenant across users
 * - global: Cache globally across all contexts
 *
 * @module dynamic/caching
 */

import type {
  CacheStrategy,
  DynamicCacheConfig,
  RequestContext,
  CacheEntry as _CacheEntry,
} from "./types.js";

/**
 * Internal cache entry with TTL support
 */
type InternalCacheEntry = {
  value: unknown;
  resolvedAt: number;
  expiresAt: number;
  key: string;
};

/**
 * Multi-level cache for dynamic arguments
 */
export class DynamicCache {
  private requestCache = new Map<string, Map<string, unknown>>();
  private userCache = new Map<string, Map<string, InternalCacheEntry>>();
  private tenantCache = new Map<string, Map<string, InternalCacheEntry>>();
  private globalCache = new Map<string, InternalCacheEntry>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  private config: Required<DynamicCacheConfig>;

  constructor(config?: Partial<DynamicCacheConfig>) {
    this.config = {
      strategy: config?.strategy || "per-request",
      ttl: config?.ttl || 60000,
      maxSize: config?.maxSize || 1000,
      staleWhileRevalidate: config?.staleWhileRevalidate || false,
      serialize: config?.serialize || JSON.stringify,
      deserialize: config?.deserialize || JSON.parse,
    };

    // Start cleanup interval for TTL-based caches
    this.startCleanup();
  }

  /**
   * Get a cached value
   */
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

  /**
   * Set a cached value
   */
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

  /**
   * Delete a cached value
   */
  delete(
    key: string,
    strategy: CacheStrategy,
    context?: RequestContext,
  ): boolean {
    switch (strategy) {
      case "none":
        return false;

      case "per-request":
        return this.deleteFromRequestCache(key, context?.requestId);

      case "per-user":
        return this.deleteFromUserCache(key, context?.user?.id);

      case "per-tenant":
        return this.deleteFromTenantCache(key, context?.tenant?.id);

      case "global":
        return this.globalCache.delete(key);

      default:
        return false;
    }
  }

  /**
   * Check if a key exists in cache
   */
  has(key: string, strategy: CacheStrategy, context?: RequestContext): boolean {
    return this.get(key, strategy, context) !== undefined;
  }

  // ============================================================================
  // Per-Request Cache Methods
  // ============================================================================

  private getFromRequestCache<T>(
    key: string,
    requestId?: string,
  ): T | undefined {
    if (!requestId) {
      return undefined;
    }
    return this.requestCache.get(requestId)?.get(key) as T | undefined;
  }

  private setInRequestCache<T>(
    key: string,
    value: T,
    requestId?: string,
  ): void {
    if (!requestId) {
      return;
    }
    if (!this.requestCache.has(requestId)) {
      this.requestCache.set(requestId, new Map());
    }
    const cache = this.requestCache.get(requestId);
    if (cache) {
      cache.set(key, value);
    }
  }

  private deleteFromRequestCache(key: string, requestId?: string): boolean {
    if (!requestId) {
      return false;
    }
    return this.requestCache.get(requestId)?.delete(key) ?? false;
  }

  // ============================================================================
  // Per-User Cache Methods
  // ============================================================================

  private getFromUserCache<T>(key: string, userId?: string): T | undefined {
    if (!userId) {
      return undefined;
    }
    const entry = this.userCache.get(userId)?.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) {
        this.userCache.get(userId)?.delete(key);
      }
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
    if (!userId) {
      return;
    }
    if (!this.userCache.has(userId)) {
      this.userCache.set(userId, new Map());
    }

    // Enforce max size per user
    const userMap = this.userCache.get(userId);
    if (!userMap) {
      return;
    }
    if (userMap.size >= this.config.maxSize) {
      this.evictOldestEntry(userMap);
    }

    userMap.set(key, {
      value,
      resolvedAt: Date.now(),
      expiresAt: Date.now() + ttl,
      key,
    });
  }

  private deleteFromUserCache(key: string, userId?: string): boolean {
    if (!userId) {
      return false;
    }
    return this.userCache.get(userId)?.delete(key) ?? false;
  }

  // ============================================================================
  // Per-Tenant Cache Methods
  // ============================================================================

  private getFromTenantCache<T>(key: string, tenantId?: string): T | undefined {
    if (!tenantId) {
      return undefined;
    }
    const entry = this.tenantCache.get(tenantId)?.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) {
        this.tenantCache.get(tenantId)?.delete(key);
      }
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
    if (!tenantId) {
      return;
    }
    if (!this.tenantCache.has(tenantId)) {
      this.tenantCache.set(tenantId, new Map());
    }

    // Enforce max size per tenant
    const tenantMap = this.tenantCache.get(tenantId);
    if (!tenantMap) {
      return;
    }
    if (tenantMap.size >= this.config.maxSize) {
      this.evictOldestEntry(tenantMap);
    }

    tenantMap.set(key, {
      value,
      resolvedAt: Date.now(),
      expiresAt: Date.now() + ttl,
      key,
    });
  }

  private deleteFromTenantCache(key: string, tenantId?: string): boolean {
    if (!tenantId) {
      return false;
    }
    return this.tenantCache.get(tenantId)?.delete(key) ?? false;
  }

  // ============================================================================
  // Global Cache Methods
  // ============================================================================

  private getFromGlobalCache<T>(key: string): T | undefined {
    const entry = this.globalCache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) {
        this.globalCache.delete(key);
      }
      return undefined;
    }
    return entry.value as T;
  }

  private setInGlobalCache<T>(
    key: string,
    value: T,
    ttl: number = this.config.ttl,
  ): void {
    // Enforce max size for global cache
    if (this.globalCache.size >= this.config.maxSize) {
      this.evictOldestEntry(this.globalCache);
    }

    this.globalCache.set(key, {
      value,
      resolvedAt: Date.now(),
      expiresAt: Date.now() + ttl,
      key,
    });
  }

  // ============================================================================
  // Cache Management Methods
  // ============================================================================

  /**
   * Clear request-specific cache (call after request completes)
   */
  clearRequest(requestId: string): void {
    this.requestCache.delete(requestId);
  }

  /**
   * Clear user-specific cache
   */
  clearUser(userId: string): void {
    this.userCache.delete(userId);
  }

  /**
   * Clear tenant-specific cache
   */
  clearTenant(tenantId: string): void {
    this.tenantCache.delete(tenantId);
  }

  /**
   * Clear global cache
   */
  clearGlobal(): void {
    this.globalCache.clear();
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

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      requestCaches: this.requestCache.size,
      userCaches: this.userCache.size,
      tenantCaches: this.tenantCache.size,
      globalEntries: this.globalCache.size,
      totalRequestEntries: Array.from(this.requestCache.values()).reduce(
        (sum, map) => sum + map.size,
        0,
      ),
      totalUserEntries: Array.from(this.userCache.values()).reduce(
        (sum, map) => sum + map.size,
        0,
      ),
      totalTenantEntries: Array.from(this.tenantCache.values()).reduce(
        (sum, map) => sum + map.size,
        0,
      ),
    };
  }

  /**
   * Destroy the cache (cleanup intervals)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }

  // ============================================================================
  // Internal Helper Methods
  // ============================================================================

  private startCleanup(): void {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, 60000);
  }

  private runCleanup(): void {
    const now = Date.now();

    // Clean up user cache
    for (const [userId, userMap] of this.userCache.entries()) {
      for (const [key, entry] of userMap.entries()) {
        if (now > entry.expiresAt) {
          userMap.delete(key);
        }
      }
      if (userMap.size === 0) {
        this.userCache.delete(userId);
      }
    }

    // Clean up tenant cache
    for (const [tenantId, tenantMap] of this.tenantCache.entries()) {
      for (const [key, entry] of tenantMap.entries()) {
        if (now > entry.expiresAt) {
          tenantMap.delete(key);
        }
      }
      if (tenantMap.size === 0) {
        this.tenantCache.delete(tenantId);
      }
    }

    // Clean up global cache
    for (const [key, entry] of this.globalCache.entries()) {
      if (now > entry.expiresAt) {
        this.globalCache.delete(key);
      }
    }
  }

  private evictOldestEntry(map: Map<string, InternalCacheEntry>): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of map.entries()) {
      if (entry.resolvedAt < oldestTime) {
        oldestTime = entry.resolvedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      map.delete(oldestKey);
    }
  }
}

/**
 * Cache statistics
 */
export type CacheStats = {
  requestCaches: number;
  userCaches: number;
  tenantCaches: number;
  globalEntries: number;
  totalRequestEntries: number;
  totalUserEntries: number;
  totalTenantEntries: number;
};

/**
 * Global dynamic cache instance
 */
export const dynamicCache = new DynamicCache();

/**
 * Create a cache key from multiple parts
 */
export function createCacheKey(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(":");
}

/**
 * Create a cache key for a specific strategy
 */
export function createStrategyCacheKey(
  baseKey: string,
  strategy: CacheStrategy,
  context?: RequestContext,
): string {
  switch (strategy) {
    case "none":
      return "";

    case "per-request":
      return createCacheKey(baseKey, "request", context?.requestId);

    case "per-user":
      return createCacheKey(baseKey, "user", context?.user?.id);

    case "per-tenant":
      return createCacheKey(baseKey, "tenant", context?.tenant?.id);

    case "global":
      return createCacheKey(baseKey, "global");

    default:
      return baseKey;
  }
}

/**
 * Cache decorator for functions
 *
 * @example
 * ```typescript
 * const cachedFetch = withCache(
 *   async (tenantId: string) => {
 *     return await fetchTenantConfig(tenantId);
 *   },
 *   {
 *     strategy: "per-tenant",
 *     ttl: 300000, // 5 minutes
 *     keyGenerator: (tenantId) => `tenant-config:${tenantId}`,
 *   }
 * );
 * ```
 */
export function withCache<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: {
    strategy: CacheStrategy;
    ttl?: number;
    keyGenerator: (...args: TArgs) => string;
    getContext?: (...args: TArgs) => RequestContext | undefined;
  },
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    const key = options.keyGenerator(...args);
    const context = options.getContext?.(...args);

    // Check cache
    const cached = dynamicCache.get<TResult>(key, options.strategy, context);
    if (cached !== undefined) {
      return cached;
    }

    // Execute function
    const result = await fn(...args);

    // Cache result
    dynamicCache.set(key, result, options.strategy, context, options.ttl);

    return result;
  };
}

/**
 * Invalidate cache entries matching a pattern
 */
export function invalidateCachePattern(
  pattern: RegExp,
  strategy: CacheStrategy,
  context?: RequestContext,
): number {
  let invalidated = 0;

  const invalidateMap = (map: Map<string, unknown>) => {
    for (const key of map.keys()) {
      if (pattern.test(key)) {
        map.delete(key);
        invalidated++;
      }
    }
  };

  switch (strategy) {
    case "per-request":
      if (context?.requestId) {
        const requestMap = (
          dynamicCache as unknown as {
            requestCache: Map<string, Map<string, unknown>>;
          }
        ).requestCache.get(context.requestId);
        if (requestMap) {
          invalidateMap(requestMap);
        }
      }
      break;

    case "per-user":
      if (context?.user?.id) {
        const userMap = (
          dynamicCache as unknown as {
            userCache: Map<string, Map<string, unknown>>;
          }
        ).userCache.get(context.user.id);
        if (userMap) {
          invalidateMap(userMap);
        }
      }
      break;

    case "per-tenant":
      if (context?.tenant?.id) {
        const tenantMap = (
          dynamicCache as unknown as {
            tenantCache: Map<string, Map<string, unknown>>;
          }
        ).tenantCache.get(context.tenant.id);
        if (tenantMap) {
          invalidateMap(tenantMap);
        }
      }
      break;

    case "global":
      invalidateMap(
        (dynamicCache as unknown as { globalCache: Map<string, unknown> })
          .globalCache,
      );
      break;
  }

  return invalidated;
}
