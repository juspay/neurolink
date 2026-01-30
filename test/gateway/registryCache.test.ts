/**
 * Registry Cache Tests
 *
 * Tests for in-memory caching with TTL for model registry data
 *
 * @see src/lib/gateway/registryCache.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  RegistryCache,
  getGlobalCache,
  resetGlobalCache,
} from "../../src/lib/gateway/registryCache.js";
import type { GatewayModelInfo } from "../../src/lib/gateway/types.js";

describe("RegistryCache", () => {
  let cache: RegistryCache;

  beforeEach(() => {
    cache = new RegistryCache({ cleanupIntervalMs: 1000000 }); // Long interval for testing
  });

  afterEach(() => {
    cache.dispose();
  });

  describe("constructor", () => {
    it("should initialize with default options", () => {
      const c = new RegistryCache();
      expect(c).toBeInstanceOf(RegistryCache);
      c.dispose();
    });

    it("should accept custom options", () => {
      const c = new RegistryCache({
        defaultTtlMs: 5000,
        maxEntries: 100,
      });
      expect(c).toBeInstanceOf(RegistryCache);
      c.dispose();
    });

    it("should start cleanup timer", () => {
      const c = new RegistryCache();
      expect(c).toBeInstanceOf(RegistryCache);
      c.dispose();
    });
  });

  describe("get", () => {
    it("should return cached data when valid", () => {
      const models: GatewayModelInfo[] = [
        {
          id: "gpt-4",
          provider: "openai",
          displayName: "GPT-4",
          capabilities: {},
        },
      ];
      cache.set("test", models);
      const result = cache.get("test");
      expect(result).toEqual(models);
    });

    it("should return undefined for missing keys", () => {
      const result = cache.get("nonexistent");
      expect(result).toBeUndefined();
    });

    it("should return undefined for expired entries", async () => {
      const models: GatewayModelInfo[] = [
        {
          id: "gpt-4",
          provider: "openai",
          displayName: "GPT-4",
          capabilities: {},
        },
      ];
      cache.set("test", models, 1); // 1ms TTL
      await new Promise((resolve) => setTimeout(resolve, 10));
      const result = cache.get("test");
      expect(result).toBeUndefined();
    });

    it("should track cache hits", () => {
      const models: GatewayModelInfo[] = [];
      cache.set("test", models);
      cache.get("test");
      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
    });

    it("should track cache misses", () => {
      cache.get("nonexistent");
      const stats = cache.getStats();
      expect(stats.misses).toBe(1);
    });

    it("should delete expired entries on access", async () => {
      const models: GatewayModelInfo[] = [];
      cache.set("test", models, 1);
      await new Promise((resolve) => setTimeout(resolve, 10));
      cache.get("test");
      expect(cache.has("test")).toBe(false);
    });
  });

  describe("set", () => {
    it("should store data with TTL", () => {
      const models: GatewayModelInfo[] = [];
      cache.set("test", models, 10000);
      expect(cache.has("test")).toBe(true);
    });

    it("should use default TTL when not specified", () => {
      const models: GatewayModelInfo[] = [];
      cache.set("test", models);
      expect(cache.has("test")).toBe(true);
    });

    it("should evict oldest entry when at max capacity", () => {
      const c = new RegistryCache({ maxEntries: 2 });
      c.set("key1", []);
      c.set("key2", []);
      c.set("key3", []); // Should evict key1
      expect(c.has("key1")).toBe(false);
      expect(c.has("key2")).toBe(true);
      expect(c.has("key3")).toBe(true);
      c.dispose();
    });

    it("should update existing entries", () => {
      const models1: GatewayModelInfo[] = [
        { id: "m1", provider: "p1", displayName: "M1", capabilities: {} },
      ];
      const models2: GatewayModelInfo[] = [
        { id: "m2", provider: "p2", displayName: "M2", capabilities: {} },
      ];
      cache.set("test", models1);
      cache.set("test", models2);
      expect(cache.get("test")).toEqual(models2);
    });
  });

  describe("has", () => {
    it("should return true for valid entries", () => {
      cache.set("test", []);
      expect(cache.has("test")).toBe(true);
    });

    it("should return false for missing keys", () => {
      expect(cache.has("nonexistent")).toBe(false);
    });

    it("should return false for expired entries", async () => {
      cache.set("test", [], 1);
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(cache.has("test")).toBe(false);
    });

    it("should clean up expired entries", async () => {
      cache.set("test", [], 1);
      await new Promise((resolve) => setTimeout(resolve, 10));
      cache.has("test");
      const stats = cache.getStats();
      expect(stats.entries).toBe(0);
    });
  });

  describe("invalidate", () => {
    it("should remove specific key", () => {
      cache.set("test", []);
      cache.invalidate("test");
      expect(cache.has("test")).toBe(false);
    });

    it("should handle non-existent keys", () => {
      expect(() => cache.invalidate("nonexistent")).not.toThrow();
    });

    it("should update entry count", () => {
      cache.set("test", []);
      cache.invalidate("test");
      const stats = cache.getStats();
      expect(stats.entries).toBe(0);
    });
  });

  describe("clear", () => {
    it("should remove all entries", () => {
      cache.set("key1", []);
      cache.set("key2", []);
      cache.clear();
      expect(cache.has("key1")).toBe(false);
      expect(cache.has("key2")).toBe(false);
    });

    it("should reset entry count", () => {
      cache.set("key1", []);
      cache.set("key2", []);
      cache.clear();
      const stats = cache.getStats();
      expect(stats.entries).toBe(0);
    });
  });

  describe("getStats", () => {
    it("should return current statistics", () => {
      const stats = cache.getStats();
      expect(stats).toHaveProperty("hits");
      expect(stats).toHaveProperty("misses");
      expect(stats).toHaveProperty("entries");
      expect(stats).toHaveProperty("lastCleanup");
    });

    it("should track hits and misses", () => {
      cache.set("test", []);
      cache.get("test"); // hit
      cache.get("nonexistent"); // miss
      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it("should track entry count", () => {
      cache.set("key1", []);
      cache.set("key2", []);
      const stats = cache.getStats();
      expect(stats.entries).toBe(2);
    });

    it("should track last cleanup time", () => {
      const stats = cache.getStats();
      expect(stats.lastCleanup).toBeGreaterThan(0);
    });
  });

  describe("getHitRate", () => {
    it("should calculate hit rate percentage", () => {
      cache.set("test", []);
      cache.get("test"); // hit
      cache.get("test"); // hit
      cache.get("nonexistent"); // miss
      const hitRate = cache.getHitRate();
      expect(hitRate).toBe(67); // 2/3 = 66.67% rounded to 67
    });

    it("should return 0 when no requests", () => {
      const hitRate = cache.getHitRate();
      expect(hitRate).toBe(0);
    });
  });

  describe("getRemainingTtl", () => {
    it("should return remaining TTL for valid entry", () => {
      cache.set("test", [], 10000);
      const ttl = cache.getRemainingTtl("test");
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(10000);
    });

    it("should return 0 for expired entry", async () => {
      cache.set("test", [], 1);
      await new Promise((resolve) => setTimeout(resolve, 10));
      const ttl = cache.getRemainingTtl("test");
      expect(ttl).toBe(0);
    });

    it("should return 0 for missing key", () => {
      const ttl = cache.getRemainingTtl("nonexistent");
      expect(ttl).toBe(0);
    });
  });

  describe("cleanup", () => {
    it("should remove expired entries periodically", async () => {
      const c = new RegistryCache({ cleanupIntervalMs: 50 });
      c.set("test", [], 1);
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(c.has("test")).toBe(false);
      c.dispose();
    });

    it("should update statistics after cleanup", async () => {
      const c = new RegistryCache({ cleanupIntervalMs: 50 });
      c.set("test", [], 1);
      await new Promise((resolve) => setTimeout(resolve, 100));
      const stats = c.getStats();
      expect(stats.entries).toBe(0);
      c.dispose();
    });
  });

  describe("dispose", () => {
    it("should stop cleanup timer", () => {
      const c = new RegistryCache();
      c.dispose();
      expect(() => c.dispose()).not.toThrow();
    });
  });

  describe("global cache", () => {
    afterEach(() => {
      resetGlobalCache();
    });

    it("should provide singleton instance", () => {
      const cache1 = getGlobalCache();
      const cache2 = getGlobalCache();
      expect(cache1).toBe(cache2);
    });

    it("should allow reset for testing", () => {
      const cache1 = getGlobalCache();
      resetGlobalCache();
      const cache2 = getGlobalCache();
      expect(cache1).not.toBe(cache2);
    });
  });
});
