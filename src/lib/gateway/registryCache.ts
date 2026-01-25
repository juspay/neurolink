/**
 * Registry Cache
 *
 * In-memory cache with TTL for model registry data.
 * Provides thread-safe caching with automatic cleanup.
 */

import { logger } from "../utils/logger.js";
import { CACHE_TTL_MS } from "./constants.js";
import type {
  CacheEntry,
  CacheOptions,
  CacheStats,
  GatewayModelInfo,
} from "./types.js";

/**
 * Default cache options
 */
const DEFAULT_CACHE_OPTIONS: CacheOptions = {
  defaultTtlMs: CACHE_TTL_MS,
  maxEntries: 10000, // Should handle ~2000 models per source
  cleanupIntervalMs: 5 * 60 * 1000, // 5 minutes
};

/**
 * Registry cache for model information
 *
 * Features:
 * - TTL-based expiration
 * - Automatic cleanup of expired entries
 * - Memory-efficient storage
 * - Thread-safe operations
 *
 * @example
 * ```typescript
 * const cache = new RegistryCache();
 *
 * // Store models
 * cache.set("all", models, 3600000);
 *
 * // Retrieve models
 * const cached = cache.get("all");
 *
 * // Check if valid
 * if (cache.has("all")) {
 *   console.log("Cache hit");
 * }
 * ```
 */
export class RegistryCache {
  private cache: Map<string, CacheEntry<GatewayModelInfo[]>>;
  private options: CacheOptions;
  private stats: CacheStats;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options?: Partial<CacheOptions>) {
    this.options = { ...DEFAULT_CACHE_OPTIONS, ...options };
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      entries: 0,
      lastCleanup: Date.now(),
    };

    // Start cleanup timer
    this.startCleanupTimer();
  }

  /**
   * Get cached models
   *
   * @param key - Cache key
   * @returns Cached models or undefined if not found/expired
   */
  get(key: string): GatewayModelInfo[] | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      logger.debug(`Cache miss for key "${key}"`);
      return undefined;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.stats.misses++;
      this.cache.delete(key);
      this.stats.entries = this.cache.size;
      logger.debug(`Cache expired for key "${key}"`);
      return undefined;
    }

    this.stats.hits++;
    logger.debug(`Cache hit for key "${key}"`);
    return entry.data;
  }

  /**
   * Set cached models with TTL
   *
   * @param key - Cache key
   * @param models - Models to cache
   * @param ttlMs - TTL in milliseconds (optional, uses default)
   */
  set(key: string, models: GatewayModelInfo[], ttlMs?: number): void {
    // Check max entries
    if (this.cache.size >= this.options.maxEntries && !this.cache.has(key)) {
      // Remove oldest entry
      const oldestKey = this.findOldestEntry();
      if (oldestKey) {
        this.cache.delete(oldestKey);
        logger.debug(`Evicted oldest cache entry "${oldestKey}"`);
      }
    }

    const entry: CacheEntry<GatewayModelInfo[]> = {
      data: models,
      timestamp: Date.now(),
      ttlMs: ttlMs ?? this.options.defaultTtlMs,
    };

    this.cache.set(key, entry);
    this.stats.entries = this.cache.size;

    logger.debug(`Cached ${models.length} models under key "${key}"`, {
      ttlMs: entry.ttlMs,
      totalEntries: this.stats.entries,
    });
  }

  /**
   * Check if cache entry exists and is valid
   *
   * @param key - Cache key
   * @returns True if entry exists and hasn't expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.entries = this.cache.size;
      return false;
    }

    return true;
  }

  /**
   * Invalidate a specific cache key
   *
   * @param key - Cache key to invalidate
   */
  invalidate(key: string): void {
    const existed = this.cache.delete(key);
    if (existed) {
      this.stats.entries = this.cache.size;
      logger.debug(`Invalidated cache key "${key}"`);
    }
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    const count = this.cache.size;
    this.cache.clear();
    this.stats.entries = 0;
    logger.debug(`Cleared ${count} cache entries`);
  }

  /**
   * Get cache statistics
   *
   * @returns Current cache stats
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get hit rate as a percentage
   *
   * @returns Hit rate (0-100)
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    if (total === 0) {
      return 0;
    }
    return Math.round((this.stats.hits / total) * 100);
  }

  /**
   * Get remaining TTL for a cache entry
   *
   * @param key - Cache key
   * @returns Remaining TTL in milliseconds, or 0 if expired/not found
   */
  getRemainingTtl(key: string): number {
    const entry = this.cache.get(key);
    if (!entry) {
      return 0;
    }

    const elapsed = Date.now() - entry.timestamp;
    const remaining = entry.ttlMs - elapsed;
    return Math.max(0, remaining);
  }

  /**
   * Stop the cleanup timer
   * Should be called when disposing the cache
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Check if a cache entry has expired
   */
  private isExpired(entry: CacheEntry<GatewayModelInfo[]>): boolean {
    const now = Date.now();
    const age = now - entry.timestamp;
    return age >= entry.ttlMs;
  }

  /**
   * Find the oldest cache entry key
   */
  private findOldestEntry(): string | undefined {
    let oldestKey: string | undefined;
    let oldestTime = Infinity;

    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * Start the periodic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupIntervalMs);

    // Don't prevent process exit
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        removed++;
      }
    }

    this.stats.entries = this.cache.size;
    this.stats.lastCleanup = now;

    if (removed > 0) {
      logger.debug(`Cache cleanup: removed ${removed} expired entries`, {
        remaining: this.stats.entries,
      });
    }
  }
}

// Singleton instance for global usage
let globalCache: RegistryCache | null = null;

/**
 * Get the global registry cache instance
 *
 * @returns Singleton cache instance
 */
export function getGlobalCache(): RegistryCache {
  if (!globalCache) {
    globalCache = new RegistryCache();
  }
  return globalCache;
}

/**
 * Reset the global cache (mainly for testing)
 */
export function resetGlobalCache(): void {
  if (globalCache) {
    globalCache.dispose();
    globalCache = null;
  }
}
