/**
 * Tests for ImageCache utility
 * Validates LRU cache behavior, TTL expiration, and metrics
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  ImageCache,
  getImageCache,
  resetImageCache,
  getImageCacheStats,
} from "../../../src/lib/utils/imageCache.js";

describe("ImageCache", () => {
  let cache: ImageCache;

  beforeEach(() => {
    cache = new ImageCache({ maxSize: 3, ttlMs: 5000 });
  });

  afterEach(() => {
    resetImageCache();
    vi.restoreAllMocks();
  });

  describe("basic operations", () => {
    it("should store and retrieve cached images", () => {
      const url = "https://example.com/image1.jpg";
      const dataUri = "data:image/jpeg;base64,/9j/4AAQ...";
      const contentType = "image/jpeg";
      const buffer = Buffer.from("test image data");

      cache.set(url, dataUri, contentType, buffer);
      const result = cache.get(url);

      expect(result).not.toBeNull();
      expect(result?.dataUri).toBe(dataUri);
      expect(result?.contentType).toBe(contentType);
      expect(result?.size).toBe(buffer.length);
    });

    it("should return null for uncached URLs", () => {
      const result = cache.get("https://example.com/nonexistent.jpg");
      expect(result).toBeNull();
    });

    it("should track cache hits and misses", () => {
      const url = "https://example.com/image.jpg";
      const buffer = Buffer.from("test data");

      // Miss
      cache.get(url);
      let stats = cache.getStats();
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(0);

      // Set and hit
      cache.set(url, "data:image/jpeg;base64,abc", "image/jpeg", buffer);
      cache.get(url);
      stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it("should delete entries correctly", () => {
      const url = "https://example.com/image.jpg";
      const buffer = Buffer.from("test data");

      cache.set(url, "data:image/jpeg;base64,abc", "image/jpeg", buffer);
      expect(cache.has(url)).toBe(true);

      const deleted = cache.delete(url);
      expect(deleted).toBe(true);
      expect(cache.has(url)).toBe(false);
    });

    it("should clear all entries", () => {
      const buffer = Buffer.from("test data");
      cache.set(
        "https://example.com/1.jpg",
        "data:image/jpeg;base64,a",
        "image/jpeg",
        buffer,
      );
      cache.set(
        "https://example.com/2.jpg",
        "data:image/jpeg;base64,b",
        "image/jpeg",
        buffer,
      );

      expect(cache.getSize()).toBe(2);

      cache.clear();
      expect(cache.getSize()).toBe(0);
    });
  });

  describe("LRU eviction", () => {
    it("should evict oldest entry when at capacity", () => {
      // Use different buffer content for each entry to avoid deduplication
      const buffer1 = Buffer.from("test data 1");
      const buffer2 = Buffer.from("test data 2");
      const buffer3 = Buffer.from("test data 3");
      const buffer4 = Buffer.from("test data 4");

      // Fill cache to capacity (maxSize: 3)
      cache.set(
        "https://example.com/1.jpg",
        "data:image/jpeg;base64,1",
        "image/jpeg",
        buffer1,
      );
      cache.set(
        "https://example.com/2.jpg",
        "data:image/jpeg;base64,2",
        "image/jpeg",
        buffer2,
      );
      cache.set(
        "https://example.com/3.jpg",
        "data:image/jpeg;base64,3",
        "image/jpeg",
        buffer3,
      );

      expect(cache.getSize()).toBe(3);

      // Add a 4th entry - should evict first one
      cache.set(
        "https://example.com/4.jpg",
        "data:image/jpeg;base64,4",
        "image/jpeg",
        buffer4,
      );

      expect(cache.getSize()).toBe(3);
      expect(cache.has("https://example.com/1.jpg")).toBe(false); // Evicted
      expect(cache.has("https://example.com/2.jpg")).toBe(true);
      expect(cache.has("https://example.com/3.jpg")).toBe(true);
      expect(cache.has("https://example.com/4.jpg")).toBe(true);
    });

    it("should move accessed entries to most recently used position", () => {
      // Use different buffer content to avoid deduplication
      const buffer1 = Buffer.from("unique data 1");
      const buffer2 = Buffer.from("unique data 2");
      const buffer3 = Buffer.from("unique data 3");
      const buffer4 = Buffer.from("unique data 4");

      // Fill cache
      cache.set(
        "https://example.com/1.jpg",
        "data:image/jpeg;base64,1",
        "image/jpeg",
        buffer1,
      );
      cache.set(
        "https://example.com/2.jpg",
        "data:image/jpeg;base64,2",
        "image/jpeg",
        buffer2,
      );
      cache.set(
        "https://example.com/3.jpg",
        "data:image/jpeg;base64,3",
        "image/jpeg",
        buffer3,
      );

      // Access first entry to make it most recently used
      cache.get("https://example.com/1.jpg");

      // Add new entry - should evict second one (now oldest)
      cache.set(
        "https://example.com/4.jpg",
        "data:image/jpeg;base64,4",
        "image/jpeg",
        buffer4,
      );

      expect(cache.has("https://example.com/1.jpg")).toBe(true); // Accessed, now recent
      expect(cache.has("https://example.com/2.jpg")).toBe(false); // Evicted
      expect(cache.has("https://example.com/3.jpg")).toBe(true);
      expect(cache.has("https://example.com/4.jpg")).toBe(true);
    });

    it("should track eviction count", () => {
      // Use unique buffer content for each entry
      const buffers = [
        Buffer.from("unique content 0"),
        Buffer.from("unique content 1"),
        Buffer.from("unique content 2"),
        Buffer.from("unique content 3"),
        Buffer.from("unique content 4"),
      ];

      // Fill and overflow cache
      for (let i = 0; i < 5; i++) {
        cache.set(
          `https://example.com/${i}.jpg`,
          `data:image/jpeg;base64,${i}`,
          "image/jpeg",
          buffers[i],
        );
      }

      const stats = cache.getStats();
      expect(stats.evictions).toBe(2); // 5 entries - 3 capacity = 2 evictions
    });
  });

  describe("TTL expiration", () => {
    it("should expire entries after TTL", async () => {
      // Use minimum allowed TTL of 1000ms for this test
      // The cache enforces a minimum TTL of 1000ms
      const shortTtlCache = new ImageCache({ maxSize: 10, ttlMs: 1000 });
      const buffer = Buffer.from("test data");

      shortTtlCache.set(
        "https://example.com/image.jpg",
        "data:image/jpeg;base64,abc",
        "image/jpeg",
        buffer,
      );

      // Should be accessible immediately
      expect(shortTtlCache.get("https://example.com/image.jpg")).not.toBeNull();

      // Wait for TTL to expire (1100ms > 1000ms TTL)
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Should be expired now
      const result = shortTtlCache.get("https://example.com/image.jpg");
      expect(result).toBeNull();

      const stats = shortTtlCache.getStats();
      expect(stats.expirations).toBe(1);
    });

    it("should evict expired entries on demand", async () => {
      // Use minimum allowed TTL of 1000ms
      const shortTtlCache = new ImageCache({ maxSize: 10, ttlMs: 1000 });
      const buffer1 = Buffer.from("test data 1");
      const buffer2 = Buffer.from("test data 2");

      shortTtlCache.set(
        "https://example.com/1.jpg",
        "data:image/jpeg;base64,1",
        "image/jpeg",
        buffer1,
      );
      shortTtlCache.set(
        "https://example.com/2.jpg",
        "data:image/jpeg;base64,2",
        "image/jpeg",
        buffer2,
      );

      expect(shortTtlCache.getSize()).toBe(2);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      const evicted = shortTtlCache.evictExpired();
      expect(evicted).toBe(2);
      expect(shortTtlCache.getSize()).toBe(0);
    });
  });

  describe("URL normalization", () => {
    it("should normalize URLs by removing tracking parameters", () => {
      const buffer = Buffer.from("test data");

      // Set with tracking params
      cache.set(
        "https://example.com/image.jpg?utm_source=test&utm_medium=email",
        "data:image/jpeg;base64,abc",
        "image/jpeg",
        buffer,
      );

      // Get without tracking params - should hit cache
      const result = cache.get("https://example.com/image.jpg");
      expect(result).not.toBeNull();
    });

    it("should treat same URL with different tracking params as same entry", () => {
      const buffer = Buffer.from("test data");

      cache.set(
        "https://example.com/image.jpg?utm_campaign=summer",
        "data:image/jpeg;base64,abc",
        "image/jpeg",
        buffer,
      );

      cache.set(
        "https://example.com/image.jpg?fbclid=123",
        "data:image/jpeg;base64,updated",
        "image/jpeg",
        buffer,
      );

      // Should overwrite, not create new entry
      expect(cache.getSize()).toBe(1);
      const result = cache.get("https://example.com/image.jpg");
      expect(result?.dataUri).toBe("data:image/jpeg;base64,updated");
    });
  });

  describe("content deduplication", () => {
    it("should deduplicate same content from different URLs", () => {
      const buffer = Buffer.from("identical image data");

      // Store same content under different URLs
      cache.set(
        "https://cdn1.example.com/image.jpg",
        "data:image/jpeg;base64,abc",
        "image/jpeg",
        buffer,
      );

      cache.set(
        "https://cdn2.example.com/image.jpg",
        "data:image/jpeg;base64,abc",
        "image/jpeg",
        buffer,
      );

      // Both URLs should work
      expect(cache.get("https://cdn1.example.com/image.jpg")).not.toBeNull();
      expect(cache.get("https://cdn2.example.com/image.jpg")).not.toBeNull();
    });
  });

  describe("size limits", () => {
    it("should not cache images exceeding maxImageSize", () => {
      // Use minimum allowed maxImageSize (1024 bytes = 1KB)
      const smallCache = new ImageCache({
        maxSize: 10,
        ttlMs: 5000,
        maxImageSize: 1024, // 1KB minimum
      });

      // Create a buffer larger than 1KB
      const largeBuffer = Buffer.alloc(2000);

      smallCache.set(
        "https://example.com/large.jpg",
        "data:image/jpeg;base64,large",
        "image/jpeg",
        largeBuffer,
      );

      // Should not be cached
      expect(smallCache.has("https://example.com/large.jpg")).toBe(false);
      expect(smallCache.getSize()).toBe(0);
    });
  });

  describe("statistics", () => {
    it("should calculate hit rate correctly", () => {
      const buffer = Buffer.from("test data");

      cache.set(
        "https://example.com/image.jpg",
        "data:image/jpeg;base64,abc",
        "image/jpeg",
        buffer,
      );

      // 2 hits
      cache.get("https://example.com/image.jpg");
      cache.get("https://example.com/image.jpg");

      // 2 misses
      cache.get("https://example.com/miss1.jpg");
      cache.get("https://example.com/miss2.jpg");

      const stats = cache.getStats();
      expect(stats.totalRequests).toBe(4);
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(50);
    });

    it("should track total bytes cached", () => {
      const buffer1 = Buffer.from("short");
      const buffer2 = Buffer.from("longer buffer data");

      cache.set(
        "https://example.com/1.jpg",
        "data:image/jpeg;base64,a",
        "image/jpeg",
        buffer1,
      );
      cache.set(
        "https://example.com/2.jpg",
        "data:image/jpeg;base64,b",
        "image/jpeg",
        buffer2,
      );

      const stats = cache.getStats();
      expect(stats.totalBytes).toBe(buffer1.length + buffer2.length);
    });
  });

  describe("global cache", () => {
    it("should provide a singleton global cache", () => {
      const cache1 = getImageCache();
      const cache2 = getImageCache();

      expect(cache1).toBe(cache2);
    });

    it("should reset the global cache", () => {
      const cache = getImageCache();
      const buffer = Buffer.from("test");

      cache.set(
        "https://example.com/test.jpg",
        "data:image/jpeg;base64,test",
        "image/jpeg",
        buffer,
      );

      expect(getImageCacheStats()?.size).toBe(1);

      resetImageCache();

      expect(getImageCacheStats()).toBeNull();
    });
  });

  describe("configuration", () => {
    it("should respect environment variable configuration", () => {
      const originalEnv = process.env.NEUROLINK_IMAGE_CACHE_SIZE;
      process.env.NEUROLINK_IMAGE_CACHE_SIZE = "50";

      const envCache = new ImageCache();
      const config = envCache.getConfig();

      expect(config.maxSize).toBe(50);

      // Restore
      if (originalEnv === undefined) {
        delete process.env.NEUROLINK_IMAGE_CACHE_SIZE;
      } else {
        process.env.NEUROLINK_IMAGE_CACHE_SIZE = originalEnv;
      }
    });

    it("should apply bounds to configuration values", () => {
      const boundedCache = new ImageCache({
        maxSize: 10000, // Above max (1000)
        ttlMs: 1, // Below min (1000)
      });

      const config = boundedCache.getConfig();
      expect(config.maxSize).toBe(1000);
      expect(config.ttlMs).toBe(1000);
    });
  });

  describe("access count tracking", () => {
    it("should increment access count on each get", () => {
      const buffer = Buffer.from("test data");

      cache.set(
        "https://example.com/image.jpg",
        "data:image/jpeg;base64,abc",
        "image/jpeg",
        buffer,
      );

      // accessCount starts at 1 after set()
      // Each get() increments accessCount
      cache.get("https://example.com/image.jpg"); // 2
      cache.get("https://example.com/image.jpg"); // 3
      cache.get("https://example.com/image.jpg"); // 4

      const result = cache.get("https://example.com/image.jpg"); // 5
      expect(result?.accessCount).toBe(5);
    });
  });
});
