/**
 * CachingMiddleware Tests
 *
 * Comprehensive test suite for the CachingMiddleware class.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  CachingMiddleware,
  createCachingMiddleware,
} from "../../../src/lib/storage/middleware/CachingMiddleware.js";

describe("CachingMiddleware", () => {
  let middleware: CachingMiddleware;

  beforeEach(async () => {
    middleware = new CachingMiddleware({
      maxSize: 100,
      ttl: 300,
      lru: true,
      stats: true,
    });
    await middleware.init();
  });

  afterEach(async () => {
    await middleware.destroy();
  });

  describe("Initialization", () => {
    it("should initialize successfully", async () => {
      expect(middleware.name).toBe("caching");
    });

    it("should have correct priority", () => {
      expect(middleware.priority).toBe(10);
    });

    it("should use default config values", async () => {
      const defaultMiddleware = new CachingMiddleware();
      await defaultMiddleware.init();

      expect(defaultMiddleware.size).toBe(0);

      await defaultMiddleware.destroy();
    });
  });

  describe("Cache Write Operations", () => {
    it("should cache value on beforeWrite", async () => {
      const value = { data: "test" };
      const result = await middleware.beforeWrite("key1", value);

      expect(result).toEqual(value);
      expect(middleware.has("key1")).toBe(true);
    });

    it("should update cache on subsequent writes", async () => {
      await middleware.beforeWrite("key1", { data: "original" });
      await middleware.beforeWrite("key1", { data: "updated" });

      expect(middleware.get("key1")).toEqual({ data: "updated" });
    });
  });

  describe("Cache Read Operations", () => {
    it("should return cached value on afterRead", async () => {
      await middleware.beforeWrite("key1", { data: "cached" });

      const result = await middleware.afterRead("key1", {
        data: "from-storage",
      });
      expect(result).toEqual({ data: "cached" });
    });

    it("should cache value on cache miss", async () => {
      const storageValue = { data: "from-storage" };
      await middleware.afterRead("key1", storageValue);

      expect(middleware.has("key1")).toBe(true);
      expect(middleware.get("key1")).toEqual(storageValue);
    });
  });

  describe("Cache Expiration", () => {
    it("should expire entries after TTL", async () => {
      const shortTtlMiddleware = new CachingMiddleware({
        ttl: 0.1, // 100ms
      });
      await shortTtlMiddleware.init();

      await shortTtlMiddleware.beforeWrite("key1", { data: "value" });

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(shortTtlMiddleware.has("key1")).toBe(false);

      await shortTtlMiddleware.destroy();
    });
  });

  describe("LRU Eviction", () => {
    it("should evict LRU entries when maxSize is reached", async () => {
      const smallCache = new CachingMiddleware({
        maxSize: 3,
        lru: true,
      });
      await smallCache.init();

      await smallCache.beforeWrite("key1", { data: 1 });
      await smallCache.beforeWrite("key2", { data: 2 });
      await smallCache.beforeWrite("key3", { data: 3 });

      // Access key1 to make it recently used
      smallCache.get("key1");

      // Add key4, should evict key2 (LRU)
      await smallCache.beforeWrite("key4", { data: 4 });

      expect(smallCache.has("key1")).toBe(true);
      expect(smallCache.has("key2")).toBe(false);
      expect(smallCache.has("key3")).toBe(true);
      expect(smallCache.has("key4")).toBe(true);

      await smallCache.destroy();
    });

    it("should use FIFO when LRU is disabled", async () => {
      const fifoCache = new CachingMiddleware({
        maxSize: 3,
        lru: false,
      });
      await fifoCache.init();

      await fifoCache.beforeWrite("key1", { data: 1 });
      await fifoCache.beforeWrite("key2", { data: 2 });
      await fifoCache.beforeWrite("key3", { data: 3 });

      // Access key1 (should not affect eviction in FIFO)
      fifoCache.get("key1");

      // Add key4, should evict key1 (first in)
      await fifoCache.beforeWrite("key4", { data: 4 });

      expect(fifoCache.has("key1")).toBe(false);
      expect(fifoCache.has("key2")).toBe(true);
      expect(fifoCache.has("key3")).toBe(true);
      expect(fifoCache.has("key4")).toBe(true);

      await fifoCache.destroy();
    });
  });

  describe("Cache Statistics", () => {
    it("should track cache hits", async () => {
      await middleware.beforeWrite("key1", { data: "value" });
      await middleware.afterRead("key1", { data: "storage" });

      const stats = middleware.getStats();
      expect(stats.hits).toBe(1);
    });

    it("should track cache misses", async () => {
      await middleware.afterRead("key1", { data: "storage" });

      const stats = middleware.getStats();
      expect(stats.misses).toBe(1);
    });

    it("should track evictions", async () => {
      const smallCache = new CachingMiddleware({
        maxSize: 2,
      });
      await smallCache.init();

      await smallCache.beforeWrite("key1", { data: 1 });
      await smallCache.beforeWrite("key2", { data: 2 });
      await smallCache.beforeWrite("key3", { data: 3 });

      const stats = smallCache.getStats();
      expect(stats.evictions).toBe(1);

      await smallCache.destroy();
    });

    it("should calculate hit rate", async () => {
      await middleware.beforeWrite("key1", { data: "value" });
      await middleware.afterRead("key1", { data: "storage" }); // hit
      await middleware.afterRead("key2", { data: "storage" }); // miss

      const stats = middleware.getStats();
      expect(stats.hitRate).toBe(0.5);
    });

    it("should report cache size", async () => {
      await middleware.beforeWrite("key1", { data: 1 });
      await middleware.beforeWrite("key2", { data: 2 });

      const stats = middleware.getStats();
      expect(stats.size).toBe(2);
    });
  });

  describe("Cache Invalidation", () => {
    it("should invalidate specific key", async () => {
      await middleware.beforeWrite("key1", { data: 1 });
      await middleware.beforeWrite("key2", { data: 2 });

      const deleted = middleware.invalidate("key1");

      expect(deleted).toBe(true);
      expect(middleware.has("key1")).toBe(false);
      expect(middleware.has("key2")).toBe(true);
    });

    it("should invalidate by pattern", async () => {
      await middleware.beforeWrite("user:1", { data: 1 });
      await middleware.beforeWrite("user:2", { data: 2 });
      await middleware.beforeWrite("post:1", { data: 3 });

      const count = middleware.invalidatePattern(/^user:/);

      expect(count).toBe(2);
      expect(middleware.has("user:1")).toBe(false);
      expect(middleware.has("user:2")).toBe(false);
      expect(middleware.has("post:1")).toBe(true);
    });

    it("should clear all cache entries", async () => {
      await middleware.beforeWrite("key1", { data: 1 });
      await middleware.beforeWrite("key2", { data: 2 });

      middleware.clear();

      expect(middleware.size).toBe(0);
    });
  });

  describe("Direct Cache Access", () => {
    it("should get value directly from cache", async () => {
      await middleware.beforeWrite("key1", { data: "value" });

      const value = middleware.get("key1");
      expect(value).toEqual({ data: "value" });
    });

    it("should set value directly in cache", () => {
      middleware.set("key1", { data: "value" });
      expect(middleware.get("key1")).toEqual({ data: "value" });
    });

    it("should set value with custom TTL", async () => {
      middleware.set("key1", { data: "value" }, 0.1);

      expect(middleware.has("key1")).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(middleware.has("key1")).toBe(false);
    });

    it("should list all keys", async () => {
      await middleware.beforeWrite("key1", { data: 1 });
      await middleware.beforeWrite("key2", { data: 2 });

      const keys = middleware.keys();
      expect(keys).toContain("key1");
      expect(keys).toContain("key2");
    });
  });

  describe("Pruning", () => {
    it("should prune expired entries", async () => {
      const shortTtlMiddleware = new CachingMiddleware({
        ttl: 0.1,
      });
      await shortTtlMiddleware.init();

      await shortTtlMiddleware.beforeWrite("key1", { data: 1 });
      await shortTtlMiddleware.beforeWrite("key2", { data: 2 });

      await new Promise((resolve) => setTimeout(resolve, 150));

      const pruned = shortTtlMiddleware.prune();
      expect(pruned).toBe(2);

      await shortTtlMiddleware.destroy();
    });
  });

  describe("Factory Function", () => {
    it("should create middleware using factory function", async () => {
      const factoryMiddleware = createCachingMiddleware({
        maxSize: 50,
        ttl: 60,
      });

      expect(factoryMiddleware).toBeInstanceOf(CachingMiddleware);
      expect(factoryMiddleware.name).toBe("caching");

      await factoryMiddleware.init();
      await factoryMiddleware.destroy();
    });
  });
});
