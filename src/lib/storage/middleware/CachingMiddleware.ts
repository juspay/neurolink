/**
 * CachingMiddleware - In-Memory Caching Layer for Storage
 *
 * Provides a high-performance caching layer that sits between the application
 * and the underlying storage backend. Uses LRU eviction and TTL expiration.
 *
 * Features:
 * - LRU (Least Recently Used) eviction
 * - Configurable TTL (Time-To-Live)
 * - Cache statistics collection
 * - Automatic cache invalidation
 *
 * @module CachingMiddleware
 * @since 9.0.0
 */

import { logger } from "../../utils/logger.js";
import type {
  StorageMiddleware,
  CachingMiddlewareConfig,
} from "../../types/index.js";
import type { JsonValue } from "../../types/index.js";
import type {
  StorageCacheEntry,
  StorageCacheStats,
} from "../../types/index.js";

// =============================================================================
// CachingMiddleware Class
// =============================================================================

/**
 * Caching middleware for storage operations
 *
 * @example
 * ```typescript
 * const caching = new CachingMiddleware({
 *   maxSize: 1000,
 *   ttl: 300, // 5 minutes
 *   lru: true,
 *   stats: true
 * });
 *
 * factory.addMiddleware(caching);
 * ```
 */
export class CachingMiddleware implements StorageMiddleware {
  readonly name = "caching";
  readonly priority = 10; // Run early in the middleware chain

  private cache = new Map<string, StorageCacheEntry>();
  private config: Required<CachingMiddlewareConfig>;

  // Statistics
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(config: CachingMiddlewareConfig = {}) {
    this.config = {
      maxSize: config.maxSize ?? 1000,
      ttl: config.ttl ?? 300, // 5 minutes default
      lru: config.lru ?? true,
      stats: config.stats ?? true,
    };
  }

  /**
   * Initialize the middleware
   */
  async init(): Promise<void> {
    logger.debug("CachingMiddleware: Initialized with config", this.config);
  }

  /**
   * Destroy the middleware
   */
  async destroy(): Promise<void> {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
    logger.debug("CachingMiddleware: Destroyed");
  }

  /**
   * Cache the value before storage write
   */
  async beforeWrite(key: string, value: JsonValue): Promise<JsonValue> {
    const now = Date.now();
    const entry: StorageCacheEntry = {
      value,
      expiresAt: now + this.config.ttl * 1000,
      accessedAt: now,
    };

    // Evict if at capacity
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictOne();
    }

    this.cache.set(key, entry);
    return value;
  }

  /**
   * Attempt to retrieve from cache before storage read
   */
  async afterRead(key: string, value: JsonValue): Promise<JsonValue> {
    const entry = this.cache.get(key);
    const now = Date.now();

    if (entry) {
      // Check if expired
      if (entry.expiresAt > now) {
        // Cache hit
        this.hits++;
        if (this.config.lru) {
          entry.accessedAt = now;
        }
        return entry.value;
      } else {
        // Expired, remove from cache
        this.cache.delete(key);
      }
    }

    // Cache miss - store the value
    this.misses++;

    // Store in cache
    const newEntry: StorageCacheEntry = {
      value,
      expiresAt: now + this.config.ttl * 1000,
      accessedAt: now,
    };

    if (this.cache.size >= this.config.maxSize) {
      this.evictOne();
    }

    this.cache.set(key, newEntry);
    return value;
  }

  /**
   * Get cache statistics
   */
  getStats(): StorageCacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      size: this.cache.size,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
    logger.debug("CachingMiddleware: Cache cleared");
  }

  /**
   * Invalidate a specific cache entry
   */
  invalidate(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      logger.debug(`CachingMiddleware: Invalidated ${key}`);
    }
    return deleted;
  }

  /**
   * Invalidate all entries matching a pattern
   */
  invalidatePattern(pattern: RegExp): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    if (count > 0) {
      logger.debug(
        `CachingMiddleware: Invalidated ${count} entries matching pattern`,
      );
    }
    return count;
  }

  /**
   * Check if a key exists in cache and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Get a value directly from cache (without going through storage)
   */
  get(key: string): JsonValue | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    const now = Date.now();
    if (entry.expiresAt <= now) {
      this.cache.delete(key);
      return undefined;
    }

    this.hits++;
    if (this.config.lru) {
      entry.accessedAt = now;
    }

    return entry.value;
  }

  /**
   * Set a value directly in cache
   */
  set(key: string, value: JsonValue, ttl?: number): void {
    const now = Date.now();
    const effectiveTtl = ttl ?? this.config.ttl;

    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictOne();
    }

    this.cache.set(key, {
      value,
      expiresAt: now + effectiveTtl * 1000,
      accessedAt: now,
    });
  }

  /**
   * Evict one entry from cache
   */
  private evictOne(): void {
    if (this.config.lru) {
      // Find LRU entry
      let oldest: { key: string; time: number } | null = null;

      for (const [key, entry] of this.cache) {
        if (!oldest || entry.accessedAt < oldest.time) {
          oldest = { key, time: entry.accessedAt };
        }
      }

      if (oldest) {
        this.cache.delete(oldest.key);
        this.evictions++;
        logger.debug(`CachingMiddleware: Evicted LRU entry ${oldest.key}`);
      }
    } else {
      // FIFO - remove first entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
        this.evictions++;
        logger.debug(`CachingMiddleware: Evicted FIFO entry ${firstKey}`);
      }
    }
  }

  /**
   * Remove expired entries
   */
  prune(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
        pruned++;
      }
    }

    if (pruned > 0) {
      logger.debug(`CachingMiddleware: Pruned ${pruned} expired entries`);
    }

    return pruned;
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get all keys in cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

/**
 * Create a caching middleware instance
 */
export function createCachingMiddleware(
  config?: CachingMiddlewareConfig,
): CachingMiddleware {
  return new CachingMiddleware(config);
}
