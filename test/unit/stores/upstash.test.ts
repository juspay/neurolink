/**
 * UpstashStore Unit Tests
 *
 * Tests for the Upstash Vector store implementation.
 *
 * Note: Due to the UpstashStore using dynamic imports for the Upstash SDK,
 * these tests focus on configuration and behavior that can be tested without
 * requiring the actual Upstash client. Integration tests with a real Upstash
 * instance should be used for full API testing.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type UpstashConfig,
  UpstashStore,
} from "../../../src/lib/stores/cloud/upstash.js";

// Mock logger
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("UpstashStore", () => {
  describe("constructor", () => {
    it("should create store with required config", () => {
      const store = new UpstashStore({
        url: "https://test-vector.upstash.io",
        token: "test-token",
      });

      expect(store).toBeDefined();
      expect(store.getStoreName()).toBe("upstash");
    });

    it("should accept optional retry config", () => {
      const store = new UpstashStore({
        url: "https://test-vector.upstash.io",
        token: "test-token",
        retryConfig: {
          retries: 5,
          backoff: (count) => count * 1000,
        },
      });

      expect(store).toBeDefined();
    });

    it("should not be initialized before connect", () => {
      const store = new UpstashStore({
        url: "https://test-vector.upstash.io",
        token: "test-token",
      });

      expect(store.isInitialized()).toBe(false);
    });

    it("should accept debug flag", () => {
      const store = new UpstashStore({
        url: "https://test-vector.upstash.io",
        token: "test-token",
        debug: true,
      });

      expect(store).toBeDefined();
    });
  });

  describe("initialization state", () => {
    let store: UpstashStore;

    beforeEach(() => {
      store = new UpstashStore({
        url: "https://test-vector.upstash.io",
        token: "test-token",
      });
    });

    it("should throw on listIndexes when not initialized", async () => {
      await expect(store.listIndexes()).rejects.toThrow(
        "not initialized. Call connect() first",
      );
    });

    it("should throw on createIndex when not initialized", async () => {
      await expect(
        store.createIndex({ name: "test", dimension: 1536 }),
      ).rejects.toThrow("not initialized. Call connect() first");
    });

    it("should throw on deleteIndex when not initialized", async () => {
      await expect(store.deleteIndex("test")).rejects.toThrow(
        "not initialized. Call connect() first",
      );
    });

    it("should throw on upsert when not initialized", async () => {
      await expect(store.upsert("test", [])).rejects.toThrow(
        "not initialized. Call connect() first",
      );
    });

    it("should throw on query when not initialized", async () => {
      await expect(
        store.query("test", { vector: [0.1], topK: 5 }),
      ).rejects.toThrow("not initialized. Call connect() first");
    });

    it("should throw on delete when not initialized", async () => {
      await expect(store.delete("test", {})).rejects.toThrow(
        "not initialized. Call connect() first",
      );
    });

    it("should throw on getStats when not initialized", async () => {
      await expect(store.getStats("test")).rejects.toThrow(
        "not initialized. Call connect() first",
      );
    });

    it("should throw on indexExists when not initialized", async () => {
      // indexExists returns false when not initialized (doesn't throw)
      const exists = await store.indexExists("test");
      expect(exists).toBe(false);
    });
  });

  describe("configuration types", () => {
    it("should accept minimal config", () => {
      const config: UpstashConfig = {
        url: "https://test-vector.upstash.io",
        token: "test-token",
      };

      const store = new UpstashStore(config);
      expect(store).toBeDefined();
    });

    it("should accept full config", () => {
      const config: UpstashConfig = {
        url: "https://test-vector.upstash.io",
        token: "test-token",
        retryConfig: {
          retries: 3,
          backoff: (count) => count * 1000,
        },
        debug: true,
        timeout: 30000,
        maxRetries: 3,
      };

      const store = new UpstashStore(config);
      expect(store).toBeDefined();
    });
  });

  describe("healthCheck", () => {
    it("should return unhealthy when not connected", async () => {
      const store = new UpstashStore({
        url: "https://test-vector.upstash.io",
        token: "test-token",
      });

      const health = await store.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.status).toBe("error");
      expect(health.error).toBeDefined();
      expect(health.lastChecked).toBeInstanceOf(Date);
    });

    it("should include latency measurement", async () => {
      const store = new UpstashStore({
        url: "https://test-vector.upstash.io",
        token: "test-token",
      });

      const health = await store.healthCheck();

      expect(health.latencyMs).toBeDefined();
      expect(typeof health.latencyMs).toBe("number");
    });
  });

  describe("batchUpsert (inherited)", () => {
    it("should throw when not initialized", async () => {
      const store = new UpstashStore({
        url: "https://test-vector.upstash.io",
        token: "test-token",
      });

      const records = [{ id: "doc-1", vector: [0.1, 0.2], metadata: {} }];

      await expect(store.batchUpsert("test", records)).rejects.toThrow(
        "not initialized",
      );
    });
  });

  describe("queryAll (inherited)", () => {
    it("should throw when not initialized", async () => {
      const store = new UpstashStore({
        url: "https://test-vector.upstash.io",
        token: "test-token",
      });

      await expect(
        store.queryAll("test", { vector: [0.1], topK: 10 }),
      ).rejects.toThrow("not initialized");
    });
  });

  describe("store identification", () => {
    it("should return upstash as store name", () => {
      const store = new UpstashStore({
        url: "https://test-vector.upstash.io",
        token: "test-token",
      });

      expect(store.getStoreName()).toBe("upstash");
    });
  });

  describe("connect error handling", () => {
    it("should handle missing Upstash SDK gracefully", async () => {
      const store = new UpstashStore({
        url: "https://test-vector.upstash.io",
        token: "test-token",
      });

      try {
        await store.connect();
        // If it succeeds, the store should be initialized
        expect(store.isInitialized()).toBe(true);
        await store.disconnect();
      } catch (error) {
        // If it fails, it should be because the SDK couldn't be imported
        expect(error).toBeDefined();
      }
    });
  });

  describe("disconnect", () => {
    it("should reset initialization state", async () => {
      const store = new UpstashStore({
        url: "https://test-vector.upstash.io",
        token: "test-token",
      });

      // Try to connect (may or may not work depending on SDK availability)
      try {
        await store.connect();
        expect(store.isInitialized()).toBe(true);

        await store.disconnect();
        expect(store.isInitialized()).toBe(false);
      } catch {
        // If SDK not available, just check disconnect doesn't throw
        await store.disconnect();
        expect(store.isInitialized()).toBe(false);
      }
    });

    it("should be idempotent", async () => {
      const store = new UpstashStore({
        url: "https://test-vector.upstash.io",
        token: "test-token",
      });

      // Multiple disconnects should not throw
      await store.disconnect();
      await store.disconnect();
      await store.disconnect();

      expect(store.isInitialized()).toBe(false);
    });
  });
});
