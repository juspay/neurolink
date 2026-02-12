/**
 * Cache Middleware
 * Provides response caching for server adapters
 */

import type { MiddlewareDefinition, ServerContext } from "../types.js";

/**
 * Cache configuration
 */
export type CacheConfig = {
  /** Default TTL in milliseconds */
  ttlMs: number;

  /** Maximum cache size (number of entries) */
  maxSize?: number;

  /**
   * Custom key generator
   * Default: method + path + sorted query params
   */
  keyGenerator?: (ctx: ServerContext) => string;

  /**
   * Methods to cache (default: GET only)
   */
  methods?: string[];

  /**
   * Paths to cache (default: all paths)
   */
  paths?: string[];

  /**
   * Paths to exclude from caching
   */
  excludePaths?: string[];

  /**
   * Custom cache store
   * Default: in-memory store
   */
  store?: CacheStore;

  /**
   * Whether to include query params in cache key
   * Default: true
   */
  includeQuery?: boolean;

  /**
   * Custom TTL per path pattern
   */
  ttlByPath?: Record<string, number>;
};

/**
 * Cache entry
 */
export type CacheEntry = {
  data: unknown;
  createdAt: number;
  ttlMs: number;
  headers?: Record<string, string>;
};

/**
 * Cache store interface
 */
export type CacheStore = {
  get(key: string): Promise<CacheEntry | undefined>;
  set(key: string, entry: CacheEntry): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
};

/**
 * In-memory LRU cache store
 */
export class InMemoryCacheStore implements CacheStore {
  private cache = new Map<string, CacheEntry>();
  private accessOrder: string[] = [];
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  async get(key: string): Promise<CacheEntry | undefined> {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() - entry.createdAt > entry.ttlMs) {
      await this.delete(key);
      return undefined;
    }

    // Update access order (LRU)
    this.updateAccessOrder(key);

    return entry;
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    // Check size limit
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      // Remove least recently used
      const lruKey = this.accessOrder.shift();
      if (lruKey) {
        this.cache.delete(lruKey);
      }
    }

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.accessOrder = [];
  }

  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }
}

/**
 * Create cache middleware
 *
 * Response headers set by this middleware:
 * - `X-Cache`: "HIT" if served from cache, "MISS" if freshly generated
 * - `X-Cache-Age`: Seconds since the response was cached (only on HIT)
 * - `Cache-Control`: Caching directive with max-age (only on MISS)
 *
 * @example
 * ```typescript
 * const cacheMiddleware = createCacheMiddleware({
 *   ttlMs: 60 * 1000, // 1 minute
 *   methods: ["GET"],
 *   excludePaths: ["/api/health"],
 * });
 *
 * server.registerMiddleware(cacheMiddleware);
 * ```
 */
export function createCacheMiddleware(
  config: CacheConfig,
): MiddlewareDefinition {
  const {
    ttlMs,
    maxSize = 1000,
    keyGenerator = defaultKeyGenerator,
    methods = ["GET"],
    paths,
    excludePaths = [],
    store = new InMemoryCacheStore(maxSize),
    includeQuery: _includeQuery = true,
    ttlByPath = {},
  } = config;

  return {
    name: "cache",
    order: 20, // Run after auth but before route handlers
    excludePaths,
    handler: async (ctx, next) => {
      // Only cache specified methods
      if (!methods.includes(ctx.method.toUpperCase())) {
        return next();
      }

      // Check if path should be cached
      if (paths && !paths.some((p) => ctx.path.startsWith(p))) {
        return next();
      }

      // Generate cache key
      const cacheKey = keyGenerator(ctx);

      // Check cache
      const cached = await store.get(cacheKey);
      if (cached) {
        // Set cache headers in responseHeaders for actual HTTP response
        ctx.responseHeaders = ctx.responseHeaders || {};
        ctx.responseHeaders["X-Cache"] = "HIT";
        ctx.responseHeaders["X-Cache-Age"] = String(
          Math.floor((Date.now() - cached.createdAt) / 1000),
        );

        // Return cached data (middleware should handle this)
        ctx.metadata.cachedResponse = cached.data;
        return cached.data;
      }

      // Execute handler and cache result
      const result = await next();

      // Determine TTL for this path
      let pathTtl = ttlMs;
      for (const [pattern, patternTtl] of Object.entries(ttlByPath)) {
        if (ctx.path.startsWith(pattern)) {
          pathTtl = patternTtl;
          break;
        }
      }

      // Store in cache
      await store.set(cacheKey, {
        data: result,
        createdAt: Date.now(),
        ttlMs: pathTtl,
      });

      // Set cache headers in responseHeaders for actual HTTP response
      ctx.responseHeaders = ctx.responseHeaders || {};
      ctx.responseHeaders["X-Cache"] = "MISS";
      ctx.responseHeaders["Cache-Control"] =
        `max-age=${Math.floor(pathTtl / 1000)}`;

      return result;
    },
  };
}

/**
 * Default cache key generator
 */
function defaultKeyGenerator(ctx: ServerContext): string {
  const parts = [ctx.method, ctx.path];

  // Include sorted query params
  const queryKeys = Object.keys(ctx.query).sort();
  if (queryKeys.length > 0) {
    const queryPart = queryKeys.map((k) => `${k}=${ctx.query[k]}`).join("&");
    parts.push(queryPart);
  }

  return parts.join(":");
}

/**
 * Create a cache invalidation helper
 */
export function createCacheInvalidator(store: CacheStore): {
  invalidate: (pattern: string) => Promise<void>;
  clear: () => Promise<void>;
} {
  return {
    invalidate: async (pattern: string) => {
      // For in-memory store, this would need iteration
      // For Redis, you could use pattern matching
      await store.delete(pattern);
    },
    clear: async () => {
      await store.clear();
    },
  };
}

// ============================================
// LRU Cache (Synchronous)
// ============================================

/**
 * Generic LRU (Least Recently Used) Cache
 *
 * Provides a simple in-memory cache with LRU eviction policy.
 *
 * @example
 * ```typescript
 * const cache = new LRUCache<string, number>(100);
 *
 * cache.set("key1", 42);
 * cache.get("key1"); // => 42
 * cache.has("key1"); // => true
 * cache.delete("key1");
 * ```
 */
export class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private accessOrder: K[] = [];
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  /**
   * Get a value from the cache
   */
  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.updateAccessOrder(key);
    }
    return value;
  }

  /**
   * Set a value in the cache
   */
  set(key: K, value: V): void {
    // Check size limit
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      // Remove least recently used
      const lruKey = this.accessOrder.shift();
      if (lruKey !== undefined) {
        this.cache.delete(lruKey);
      }
    }

    this.cache.set(key, value);
    this.updateAccessOrder(key);
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete a key from the cache
   */
  delete(key: K): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    }
    return deleted;
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get the current size of the cache
   */
  get size(): number {
    return this.cache.size;
  }

  private updateAccessOrder(key: K): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }
}

// ============================================
// Response Cache Store (Synchronous)
// ============================================

/**
 * Response cache entry
 */
type ResponseCacheEntry<T> = {
  value: T;
  expiresAt: number;
};

/**
 * Synchronous response cache store with TTL support
 *
 * Designed for caching HTTP responses with automatic expiration.
 *
 * @example
 * ```typescript
 * const store = new ResponseCacheStore(100, 60000); // 100 entries, 60s TTL
 *
 * store.set("GET:/api/users", { status: 200, data: [...] });
 * const cached = store.get("GET:/api/users");
 *
 * // Invalidate specific key
 * store.invalidate("GET:/api/users");
 *
 * // Invalidate by pattern (e.g., all user endpoints)
 * store.invalidateByPattern("/api/users");
 * ```
 */
export class ResponseCacheStore<T = unknown> {
  private cache: LRUCache<string, ResponseCacheEntry<T>>;
  private ttlMs: number;

  constructor(maxSize: number = 1000, ttlMs: number = 60000) {
    this.cache = new LRUCache<string, ResponseCacheEntry<T>>(maxSize);
    this.ttlMs = ttlMs;
  }

  /**
   * Get a value from the cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: T, ttlMs?: number): void {
    const effectiveTtl = ttlMs ?? this.ttlMs;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + effectiveTtl,
    });
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Invalidate (delete) a specific key
   */
  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Invalidate all keys matching a pattern (substring match or regex)
   * @param pattern - String to match or RegExp
   */
  invalidateByPattern(pattern: string | RegExp): number {
    return this.invalidatePattern(pattern);
  }

  /**
   * Invalidate all keys matching a pattern (substring match or regex)
   * @param pattern - String to match or RegExp
   */
  invalidatePattern(pattern: string | RegExp): number {
    // Note: This is O(n) because we need to iterate through all keys
    // For production, consider using a more efficient data structure
    let invalidated = 0;
    const keysToDelete: string[] = [];

    // Get all keys (requires accessing internal cache)
    const internalCache = (
      this.cache as unknown as { cache: Map<string, unknown> }
    ).cache;
    for (const key of internalCache.keys()) {
      const matches =
        pattern instanceof RegExp ? pattern.test(key) : key.includes(pattern);
      if (matches) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      if (this.cache.delete(key)) {
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the current size of the cache
   */
  get size(): number {
    return this.cache.size;
  }
}
