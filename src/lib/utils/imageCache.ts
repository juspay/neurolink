/**
 * Image Cache Utility for NeuroLink
 *
 * Implements an LRU cache for downloaded images to avoid redundant URL downloads.
 * Addresses IMG-026: No Caching issue - same URL downloaded multiple times wasting bandwidth.
 *
 * Features:
 * - LRU (Least Recently Used) eviction strategy
 * - Configurable cache size and TTL
 * - Cache hit/miss metrics
 * - Content hash tracking for deduplication
 *
 * @module utils/imageCache
 */

import { createHash } from "crypto";
import { logger } from "./logger.js";

/**
 * Cached image entry structure
 */
export interface CachedImage {
  /** The image data as a base64 data URI */
  dataUri: string;
  /** Content type of the image (e.g., "image/jpeg") */
  contentType: string;
  /** Size of the image in bytes */
  size: number;
  /** SHA-256 hash of the image content for deduplication */
  contentHash: string;
  /** Timestamp when the entry was created */
  createdAt: number;
  /** Timestamp of last access */
  lastAccessedAt: number;
  /** Number of times this entry was accessed */
  accessCount: number;
}

/**
 * Configuration options for the image cache
 */
export interface ImageCacheConfig {
  /** Maximum number of entries in the cache (default: 100) */
  maxSize?: number;
  /** Time-to-live in milliseconds (default: 30 minutes) */
  ttlMs?: number;
  /** Maximum size per image in bytes (default: 10MB) */
  maxImageSize?: number;
}

/**
 * Cache statistics for monitoring
 */
export interface ImageCacheStats {
  /** Number of cache hits */
  hits: number;
  /** Number of cache misses */
  misses: number;
  /** Number of entries evicted due to size limits */
  evictions: number;
  /** Number of entries expired due to TTL */
  expirations: number;
  /** Total number of requests */
  totalRequests: number;
  /** Current number of entries in cache */
  size: number;
  /** Total size of cached images in bytes */
  totalBytes: number;
  /** Cache hit rate as percentage */
  hitRate: number;
}

/**
 * LRU Cache for downloaded images
 *
 * Uses URL as primary key and tracks content hashes for deduplication.
 * Implements LRU eviction and configurable TTL for memory management.
 */
export class ImageCache {
  private cache = new Map<string, CachedImage>();
  private contentHashIndex = new Map<string, string>(); // contentHash -> url
  private maxSize: number;
  private ttlMs: number;
  private maxImageSize: number;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    expirations: 0,
    totalRequests: 0,
  };

  constructor(config: ImageCacheConfig = {}) {
    // Parse configuration with environment variable overrides
    const envMaxSize = process.env.NEUROLINK_IMAGE_CACHE_SIZE;
    const envTtlMs = process.env.NEUROLINK_IMAGE_CACHE_TTL_MS;
    const envMaxImageSize = process.env.NEUROLINK_IMAGE_MAX_SIZE;

    this.maxSize = this.parseConfigValue(
      envMaxSize,
      config.maxSize,
      100,
      1,
      1000,
    );
    this.ttlMs = this.parseConfigValue(
      envTtlMs,
      config.ttlMs,
      30 * 60 * 1000, // 30 minutes
      1000, // 1 second min
      24 * 60 * 60 * 1000, // 24 hours max
    );
    this.maxImageSize = this.parseConfigValue(
      envMaxImageSize,
      config.maxImageSize,
      10 * 1024 * 1024, // 10MB
      1024, // 1KB min
      100 * 1024 * 1024, // 100MB max
    );

    logger.debug("ImageCache initialized", {
      maxSize: this.maxSize,
      ttlMs: this.ttlMs,
      maxImageSize: this.maxImageSize,
    });
  }

  /**
   * Parse a config value with bounds checking
   */
  private parseConfigValue(
    envValue: string | undefined,
    configValue: number | undefined,
    defaultValue: number,
    min: number,
    max: number,
  ): number {
    let value: number;

    if (envValue !== undefined) {
      const parsed = parseInt(envValue, 10);
      value = isNaN(parsed) ? defaultValue : parsed;
    } else if (configValue !== undefined) {
      value = configValue;
    } else {
      value = defaultValue;
    }

    // Apply bounds
    if (value < min) {
      logger.warn(
        `Cache config value ${value} below minimum ${min}, using min`,
      );
      return min;
    }
    if (value > max) {
      logger.warn(
        `Cache config value ${value} above maximum ${max}, using max`,
      );
      return max;
    }

    return value;
  }

  /**
   * Normalize URL for consistent cache key generation
   * Removes tracking parameters and normalizes the URL
   */
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove common tracking parameters that don't affect content
      const trackingParams = [
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_term",
        "utm_content",
        "fbclid",
        "gclid",
        "_ga",
      ];
      trackingParams.forEach((param) => parsed.searchParams.delete(param));
      return parsed.toString();
    } catch {
      // If URL parsing fails, use the original URL
      return url;
    }
  }

  /**
   * Generate content hash from image data
   */
  private generateContentHash(data: Buffer | string): string {
    const buffer =
      typeof data === "string" ? Buffer.from(data, "base64") : data;
    return createHash("sha256").update(buffer).digest("hex").substring(0, 16);
  }

  /**
   * Check if an entry is expired based on TTL
   */
  private isExpired(entry: CachedImage): boolean {
    return Date.now() - entry.createdAt > this.ttlMs;
  }

  /**
   * Get a cached image by URL
   * Returns null if not found or expired
   */
  get(url: string): CachedImage | null {
    this.stats.totalRequests++;
    const normalizedUrl = this.normalizeUrl(url);
    const entry = this.cache.get(normalizedUrl);

    if (!entry) {
      this.stats.misses++;
      logger.debug("Image cache miss", { url: normalizedUrl.substring(0, 50) });
      return null;
    }

    // Check TTL expiration
    if (this.isExpired(entry)) {
      this.stats.expirations++;
      this.delete(normalizedUrl);
      logger.debug("Image cache entry expired", {
        url: normalizedUrl.substring(0, 50),
      });
      return null;
    }

    // Update LRU info
    entry.lastAccessedAt = Date.now();
    entry.accessCount++;

    // Move to end (most recently used) - delete and re-add
    this.cache.delete(normalizedUrl);
    this.cache.set(normalizedUrl, entry);

    this.stats.hits++;
    logger.debug("Image cache hit", {
      url: normalizedUrl.substring(0, 50),
      accessCount: entry.accessCount,
    });

    return entry;
  }

  /**
   * Get a cached image by content hash
   * Useful for deduplication when the same image is accessed via different URLs
   */
  getByContentHash(contentHash: string): CachedImage | null {
    const url = this.contentHashIndex.get(contentHash);
    if (!url) {
      return null;
    }
    return this.get(url);
  }

  /**
   * Store an image in the cache
   */
  set(
    url: string,
    dataUri: string,
    contentType: string,
    imageData: Buffer,
  ): void {
    const normalizedUrl = this.normalizeUrl(url);
    const size = imageData.length;

    // Skip caching if image exceeds max size
    if (size > this.maxImageSize) {
      logger.debug("Image too large to cache", {
        url: normalizedUrl.substring(0, 50),
        size,
        maxSize: this.maxImageSize,
      });
      return;
    }

    // Generate content hash
    const contentHash = this.generateContentHash(imageData);

    // Check if same content already exists under different URL
    const existingUrl = this.contentHashIndex.get(contentHash);
    if (existingUrl && existingUrl !== normalizedUrl) {
      // Content already cached under different URL - create a shallow copy
      const existingEntry = this.cache.get(existingUrl);
      if (existingEntry && !this.isExpired(existingEntry)) {
        // Create a shallow copy for the new URL to avoid shared reference issues
        this.cache.set(normalizedUrl, { ...existingEntry });
        logger.debug("Image cache dedup hit", {
          newUrl: normalizedUrl.substring(0, 50),
          existingUrl: existingUrl.substring(0, 50),
        });
        return;
      }
    }

    // Evict if at capacity
    while (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const now = Date.now();
    const entry: CachedImage = {
      dataUri,
      contentType,
      size,
      contentHash,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 1,
    };

    this.cache.set(normalizedUrl, entry);
    this.contentHashIndex.set(contentHash, normalizedUrl);

    logger.debug("Image cached", {
      url: normalizedUrl.substring(0, 50),
      size,
      contentHash: contentHash.substring(0, 8),
      cacheSize: this.cache.size,
    });
  }

  /**
   * Delete an entry from the cache
   */
  delete(url: string): boolean {
    const normalizedUrl = this.normalizeUrl(url);
    const entry = this.cache.get(normalizedUrl);

    if (entry) {
      // Remove from content hash index
      if (this.contentHashIndex.get(entry.contentHash) === normalizedUrl) {
        this.contentHashIndex.delete(entry.contentHash);
      }
      this.cache.delete(normalizedUrl);
      return true;
    }

    return false;
  }

  /**
   * Evict the oldest (least recently used) entry
   */
  private evictOldest(): void {
    // Map maintains insertion order, first entry is oldest
    const oldestKey = this.cache.keys().next().value;
    if (oldestKey !== undefined) {
      const entry = this.cache.get(oldestKey);
      if (entry) {
        if (this.contentHashIndex.get(entry.contentHash) === oldestKey) {
          this.contentHashIndex.delete(entry.contentHash);
        }
      }
      this.cache.delete(oldestKey);
      this.stats.evictions++;
      logger.debug("Image cache eviction", {
        url: String(oldestKey).substring(0, 50),
      });
    }
  }

  /**
   * Clear all expired entries
   */
  evictExpired(): number {
    let evicted = 0;
    const now = Date.now();

    for (const [url, entry] of this.cache.entries()) {
      if (now - entry.createdAt > this.ttlMs) {
        this.delete(url);
        evicted++;
        this.stats.expirations++;
      }
    }

    if (evicted > 0) {
      logger.debug(`Evicted ${evicted} expired image cache entries`);
    }

    return evicted;
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.contentHashIndex.clear();
    logger.debug(`Image cache cleared (${size} entries removed)`);
  }

  /**
   * Get cache statistics
   */
  getStats(): ImageCacheStats {
    let totalBytes = 0;
    for (const entry of this.cache.values()) {
      totalBytes += entry.size;
    }

    const hitRate =
      this.stats.totalRequests > 0
        ? Number(
            ((this.stats.hits / this.stats.totalRequests) * 100).toFixed(2),
          )
        : 0;

    return {
      ...this.stats,
      size: this.cache.size,
      totalBytes,
      hitRate,
    };
  }

  /**
   * Check if a URL is cached and not expired
   */
  has(url: string): boolean {
    const normalizedUrl = this.normalizeUrl(url);
    const entry = this.cache.get(normalizedUrl);
    return entry !== null && entry !== undefined && !this.isExpired(entry);
  }

  /**
   * Get the current cache size
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Get cache configuration
   */
  getConfig(): { maxSize: number; ttlMs: number; maxImageSize: number } {
    return {
      maxSize: this.maxSize,
      ttlMs: this.ttlMs,
      maxImageSize: this.maxImageSize,
    };
  }
}

// Global image cache instance
let globalImageCache: ImageCache | null = null;

/**
 * Get the global image cache instance
 * Creates a new instance if none exists
 */
export function getImageCache(config?: ImageCacheConfig): ImageCache {
  if (!globalImageCache) {
    globalImageCache = new ImageCache(config);
  }
  return globalImageCache;
}

/**
 * Reset the global image cache (useful for testing)
 */
export function resetImageCache(): void {
  if (globalImageCache) {
    globalImageCache.clear();
    globalImageCache = null;
  }
}

/**
 * Get image cache statistics from the global instance
 */
export function getImageCacheStats(): ImageCacheStats | null {
  return globalImageCache ? globalImageCache.getStats() : null;
}
