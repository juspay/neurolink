/**
 * Tool Cache - Caches tool results and server responses
 *
 * Provides intelligent caching for MCP tool calls to improve performance
 * and reduce redundant operations. Supports multiple eviction strategies:
 * - LRU (Least Recently Used)
 * - FIFO (First In, First Out)
 * - LFU (Least Frequently Used)
 */

import { createHash } from "crypto";
import { EventEmitter } from "events";
import { withTimeout } from "../../utils/async/withTimeout.js";

/**
 * Cache eviction strategy
 */
export type CacheStrategy = "lru" | "fifo" | "lfu";

/**
 * Cache configuration options
 */
export type CacheConfig = {
  /**
   * Time-to-live in milliseconds (default: 5 minutes)
   */
  ttl: number;

  /**
   * Maximum number of entries (default: 500)
   */
  maxSize: number;

  /**
   * Eviction strategy (default: 'lru')
   */
  strategy: CacheStrategy;

  /**
   * Enable automatic cleanup of expired entries
   */
  enableAutoCleanup?: boolean;

  /**
   * Cleanup interval in milliseconds (default: 60 seconds)
   */
  cleanupInterval?: number;

  /**
   * Namespace for cache keys (optional)
   */
  namespace?: string;
};

/**
 * Cached entry with metadata
 */
type CacheEntry<T> = {
  value: T;
  expires: number;
  createdAt: number;
  accessedAt: number;
  accessCount: number;
  key: string;
};

/**
 * Cache statistics
 */
export type CacheStats = {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  maxSize: number;
  hitRate: number;
};

/**
 * Cache events
 */
export type CacheEvents = {
  hit: { key: string; value: unknown };
  miss: { key: string };
  set: { key: string; value: unknown; ttl: number };
  evict: { key: string; reason: "expired" | "capacity" | "manual" };
  clear: { entriesRemoved: number };
};

/**
 * Tool Cache - High-performance caching for MCP tool results
 *
 * @example
 * ```typescript
 * const cache = new ToolCache({
 *   ttl: 60000, // 1 minute
 *   maxSize: 500,
 *   strategy: 'lru',
 * });
 *
 * // Cache a tool result
 * cache.set('getUserById:123', { id: 123, name: 'John' });
 *
 * // Retrieve from cache
 * const user = cache.get('getUserById:123');
 *
 * // Invalidate by pattern
 * cache.invalidate('getUserById:*');
 * ```
 */
export class ToolCache<T = unknown> extends EventEmitter {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private config: Required<CacheConfig>;
  private stats: CacheStats;
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(config: CacheConfig) {
    super();

    this.config = {
      ttl: config.ttl,
      maxSize: config.maxSize,
      strategy: config.strategy,
      enableAutoCleanup: config.enableAutoCleanup ?? true,
      cleanupInterval: config.cleanupInterval ?? 60000,
      namespace: config.namespace ?? "",
    };

    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
      maxSize: this.config.maxSize,
      hitRate: 0,
    };

    if (this.config.enableAutoCleanup) {
      this.startAutoCleanup();
    }
  }

  /**
   * Get a value from the cache
   */
  get(key: string): T | undefined {
    const fullKey = this.getFullKey(key);
    const entry = this.cache.get(fullKey);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      this.emit("miss", { key: fullKey });
      return undefined;
    }

    // Check expiration
    if (this.isExpired(entry)) {
      this.deleteWithReason(fullKey, "expired");
      this.stats.misses++;
      this.updateHitRate();
      this.emit("miss", { key: fullKey });
      return undefined;
    }

    // Update access metadata
    entry.accessedAt = Date.now();
    entry.accessCount++;

    this.stats.hits++;
    this.updateHitRate();
    this.emit("hit", { key: fullKey, value: entry.value });

    return entry.value;
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: T, ttl?: number): void {
    const fullKey = this.getFullKey(key);
    const effectiveTtl = ttl ?? this.config.ttl;
    const now = Date.now();

    // Evict if at capacity
    if (this.cache.size >= this.config.maxSize && !this.cache.has(fullKey)) {
      this.evictOne();
    }

    const entry: CacheEntry<T> = {
      value,
      expires: now + effectiveTtl,
      createdAt: now,
      accessedAt: now,
      accessCount: 1,
      key: fullKey,
    };

    this.cache.set(fullKey, entry);
    this.stats.size = this.cache.size;

    this.emit("set", { key: fullKey, value, ttl: effectiveTtl });
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const fullKey = this.getFullKey(key);
    const entry = this.cache.get(fullKey);

    if (!entry) {
      return false;
    }
    if (this.isExpired(entry)) {
      this.deleteWithReason(fullKey, "expired");
      return false;
    }

    return true;
  }

  /**
   * Delete a specific key from the cache
   */
  delete(key: string): boolean {
    const fullKey = this.getFullKey(key);
    const deleted = this.cache.delete(fullKey);

    if (deleted) {
      this.stats.size = this.cache.size;
      this.emit("evict", { key: fullKey, reason: "manual" });
    }

    return deleted;
  }

  /**
   * Invalidate entries matching a pattern
   * Supports glob-style patterns with * wildcard
   */
  invalidate(pattern: string): number {
    const fullPattern = this.getFullKey(pattern);
    const regex = this.patternToRegex(fullPattern);
    let invalidated = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        invalidated++;
        this.emit("evict", { key, reason: "manual" });
      }
    }

    this.stats.size = this.cache.size;
    return invalidated;
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    const entriesRemoved = this.cache.size;
    this.cache.clear();
    this.stats.size = 0;
    this.emit("clear", { entriesRemoved });
  }

  /**
   * Get or set a value (cache-aside pattern)
   */
  async getOrSet(
    key: string,
    factory: () => Promise<T> | T,
    ttl?: number,
  ): Promise<T> {
    const existing = this.get(key);
    if (existing !== undefined) {
      return existing;
    }

    const factoryTimeoutMs = 30_000;
    const value = await withTimeout(
      Promise.resolve(factory()),
      factoryTimeoutMs,
      `ToolCache getOrSet factory timed out after ${factoryTimeoutMs}ms for key "${key}"`,
    );
    if (value === undefined) {
      return value;
    }
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.evictions = 0;
    this.updateHitRate();
  }

  /**
   * Get all keys in the cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get the number of entries in the cache
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Generate a cache key from tool name and arguments
   */
  static generateKey(toolName: string, args: unknown): string {
    const stableStringify = (
      value: unknown,
      seen = new WeakSet<object>(),
    ): string => {
      if (value === null || typeof value !== "object") {
        return JSON.stringify(value);
      }
      if (value instanceof Date) {
        return `{"$date":${JSON.stringify(value.toISOString())}}`;
      }
      if (seen.has(value as object)) {
        throw new TypeError(
          "Circular structures are not supported in cache keys",
        );
      }
      seen.add(value as object);
      if (Array.isArray(value)) {
        const result =
          "[" + value.map((v) => stableStringify(v, seen)).join(",") + "]";
        seen.delete(value as object);
        return result;
      }
      const sortedKeys = Object.keys(value as Record<string, unknown>).sort();
      const entries = sortedKeys.map(
        (k) =>
          JSON.stringify(k) +
          ":" +
          stableStringify((value as Record<string, unknown>)[k], seen),
      );
      seen.delete(value as object);
      return "{" + entries.join(",") + "}";
    };

    const argsHash = createHash("sha256")
      .update(stableStringify(args))
      .digest("hex")
      .substring(0, 16);
    return `${toolName}:${argsHash}`;
  }

  /**
   * Stop the auto-cleanup timer
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
  }

  // ==================== Private Methods ====================

  private getFullKey(key: string): string {
    return this.config.namespace ? `${this.config.namespace}:${key}` : key;
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() > entry.expires;
  }

  /**
   * Delete a cache entry by its full key with a specific eviction reason.
   */
  private deleteWithReason(
    fullKey: string,
    reason: "expired" | "capacity" | "manual",
  ): boolean {
    const deleted = this.cache.delete(fullKey);
    if (deleted) {
      this.stats.evictions++;
      this.stats.size = this.cache.size;
      this.emit("evict", { key: fullKey, reason });
    }
    return deleted;
  }

  private evictOne(): void {
    const entryToEvict = this.selectEvictionCandidate();

    if (entryToEvict) {
      this.cache.delete(entryToEvict.key);
      this.stats.evictions++;
      this.stats.size = this.cache.size;
      this.emit("evict", { key: entryToEvict.key, reason: "capacity" });
    }
  }

  private selectEvictionCandidate(): CacheEntry<T> | undefined {
    if (this.cache.size === 0) {
      return undefined;
    }

    switch (this.config.strategy) {
      case "lru":
        return this.findLRU();
      case "fifo":
        return this.findFIFO();
      case "lfu":
        return this.findLFU();
      default:
        return this.findLRU();
    }
  }

  private findLRU(): CacheEntry<T> | undefined {
    let oldest: CacheEntry<T> | undefined;
    let oldestTime = Infinity;

    for (const entry of this.cache.values()) {
      if (entry.accessedAt < oldestTime) {
        oldestTime = entry.accessedAt;
        oldest = entry;
      }
    }

    return oldest;
  }

  private findFIFO(): CacheEntry<T> | undefined {
    let oldest: CacheEntry<T> | undefined;
    let oldestTime = Infinity;

    for (const entry of this.cache.values()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldest = entry;
      }
    }

    return oldest;
  }

  private findLFU(): CacheEntry<T> | undefined {
    let leastFrequent: CacheEntry<T> | undefined;
    let lowestCount = Infinity;

    for (const entry of this.cache.values()) {
      if (entry.accessCount < lowestCount) {
        lowestCount = entry.accessCount;
        leastFrequent = entry;
      }
    }

    return leastFrequent;
  }

  private patternToRegex(pattern: string): RegExp {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    const regexPattern = escaped.replace(/\*/g, "[^:]*");
    return new RegExp(`^${regexPattern}$`);
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  private startAutoCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, this.config.cleanupInterval);

    // Don't keep the process alive just for cleanup
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  private cleanupExpired(): void {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
        this.stats.evictions++;
        this.emit("evict", { key, reason: "expired" });
      }
    }

    this.stats.size = this.cache.size;
  }
}

/**
 * Factory function to create a ToolCache instance
 */
export const createToolCache = <T = unknown>(
  config: CacheConfig,
): ToolCache<T> => new ToolCache<T>(config);

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 500,
  strategy: "lru",
  enableAutoCleanup: true,
  cleanupInterval: 60000, // 1 minute
};

/**
 * Tool-specific cache wrapper with automatic key generation
 */
export class ToolResultCache {
  private cache: ToolCache<unknown>;

  constructor(config?: Partial<CacheConfig>) {
    this.cache = new ToolCache({
      ...DEFAULT_CACHE_CONFIG,
      ...config,
      namespace: config?.namespace ?? "tool-results",
    });
  }

  /**
   * Cache a tool result
   */
  cacheResult(
    toolName: string,
    args: unknown,
    result: unknown,
    ttl?: number,
  ): void {
    const key = ToolCache.generateKey(toolName, args);
    this.cache.set(key, result, ttl);
  }

  /**
   * Get a cached tool result
   */
  getCachedResult(toolName: string, args: unknown): unknown | undefined {
    const key = ToolCache.generateKey(toolName, args);
    return this.cache.get(key);
  }

  /**
   * Check if a result is cached
   */
  hasCachedResult(toolName: string, args: unknown): boolean {
    const key = ToolCache.generateKey(toolName, args);
    return this.cache.has(key);
  }

  /**
   * Invalidate all cached results for a tool
   */
  invalidateTool(toolName: string): number {
    return this.cache.invalidate(`${toolName}:*`);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return this.cache.getStats();
  }

  /**
   * Clear all cached results
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Destroy the cache
   */
  destroy(): void {
    this.cache.destroy();
  }
}

/**
 * Create a tool result cache instance
 */
export const createToolResultCache = (
  config?: Partial<CacheConfig>,
): ToolResultCache => new ToolResultCache(config);
