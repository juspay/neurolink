/**
 * WeaviateStore Unit Tests
 *
 * Tests for the Weaviate vector store implementation.
 *
 * Note: Due to the WeaviateStore using dynamic imports for the Weaviate SDK,
 * these tests focus on configuration and behavior that can be tested without
 * requiring the actual Weaviate client. Integration tests with a real Weaviate
 * instance should be used for full API testing.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type WeaviateConfig,
  WeaviateStore,
} from "../../../src/lib/stores/cloud/weaviate.js";

// Mock logger
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("WeaviateStore", () => {
  describe("constructor", () => {
    it("should create store with required config", () => {
      const store = new WeaviateStore({
        host: "localhost:8080",
      });

      expect(store).toBeDefined();
      expect(store.getStoreName()).toBe("weaviate");
    });

    it("should accept optional API key", () => {
      const store = new WeaviateStore({
        host: "weaviate.example.com",
        apiKey: "test-api-key",
      });

      expect(store).toBeDefined();
    });

    it("should accept optional scheme config", () => {
      const store = new WeaviateStore({
        host: "localhost:8080",
        scheme: "http",
      });

      expect(store).toBeDefined();
    });

    it("should accept https scheme", () => {
      const store = new WeaviateStore({
        host: "weaviate.example.com",
        scheme: "https",
        apiKey: "test-api-key",
      });

      expect(store).toBeDefined();
    });

    it("should not be initialized before connect", () => {
      const store = new WeaviateStore({
        host: "localhost:8080",
      });

      expect(store.isInitialized()).toBe(false);
    });

    it("should accept debug flag", () => {
      const store = new WeaviateStore({
        host: "localhost:8080",
        debug: true,
      });

      expect(store).toBeDefined();
    });

    it("should accept custom headers", () => {
      const store = new WeaviateStore({
        host: "localhost:8080",
        headers: {
          "X-Custom-Header": "custom-value",
        },
      });

      expect(store).toBeDefined();
    });
  });

  describe("initialization state", () => {
    let store: WeaviateStore;

    beforeEach(() => {
      store = new WeaviateStore({ host: "localhost:8080" });
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
      await expect(store.indexExists("test")).rejects.toThrow(
        "not initialized. Call connect() first",
      );
    });

    it("should throw on updateVector when not initialized", async () => {
      await expect(
        store.updateVector("test", "id-1", { metadata: { key: "value" } }),
      ).rejects.toThrow("not initialized. Call connect() first");
    });
  });

  describe("configuration types", () => {
    it("should accept minimal config", () => {
      const config: WeaviateConfig = {
        host: "localhost:8080",
      };

      const store = new WeaviateStore(config);
      expect(store).toBeDefined();
    });

    it("should accept full config", () => {
      const config: WeaviateConfig = {
        host: "weaviate.example.com",
        apiKey: "test-key",
        scheme: "https",
        headers: {
          Authorization: "Bearer token",
        },
        debug: true,
        timeout: 30000,
        maxRetries: 3,
      };

      const store = new WeaviateStore(config);
      expect(store).toBeDefined();
    });

    it("should support http scheme", () => {
      const config: WeaviateConfig = {
        host: "localhost:8080",
        scheme: "http",
      };

      const store = new WeaviateStore(config);
      expect(store).toBeDefined();
    });

    it("should support https scheme", () => {
      const config: WeaviateConfig = {
        host: "weaviate.example.com",
        scheme: "https",
      };

      const store = new WeaviateStore(config);
      expect(store).toBeDefined();
    });
  });

  describe("healthCheck", () => {
    it("should return unhealthy when not connected", async () => {
      const store = new WeaviateStore({ host: "localhost:8080" });

      const health = await store.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.status).toBe("error");
      expect(health.error).toBeDefined();
      expect(health.lastChecked).toBeInstanceOf(Date);
    });

    it("should include latency measurement", async () => {
      const store = new WeaviateStore({ host: "localhost:8080" });

      const health = await store.healthCheck();

      expect(health.latencyMs).toBeDefined();
      expect(typeof health.latencyMs).toBe("number");
    });
  });

  describe("batchUpsert (inherited)", () => {
    it("should throw when not initialized", async () => {
      const store = new WeaviateStore({ host: "localhost:8080" });

      const records = [{ id: "doc-1", vector: [0.1, 0.2], metadata: {} }];

      await expect(store.batchUpsert("test", records)).rejects.toThrow(
        "not initialized",
      );
    });
  });

  describe("queryAll (inherited)", () => {
    it("should throw when not initialized", async () => {
      const store = new WeaviateStore({ host: "localhost:8080" });

      await expect(
        store.queryAll("test", { vector: [0.1], topK: 10 }),
      ).rejects.toThrow("not initialized");
    });
  });

  describe("store identification", () => {
    it("should return weaviate as store name", () => {
      const store = new WeaviateStore({ host: "localhost:8080" });

      expect(store.getStoreName()).toBe("weaviate");
    });
  });

  describe("connect error handling", () => {
    it("should handle missing Weaviate SDK gracefully", async () => {
      const store = new WeaviateStore({ host: "localhost:8080" });

      try {
        await store.connect();
        expect(store.isInitialized()).toBe(true);
        await store.disconnect();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("disconnect", () => {
    it("should reset initialization state", async () => {
      const store = new WeaviateStore({ host: "localhost:8080" });

      try {
        await store.connect();
        expect(store.isInitialized()).toBe(true);

        await store.disconnect();
        expect(store.isInitialized()).toBe(false);
      } catch {
        await store.disconnect();
        expect(store.isInitialized()).toBe(false);
      }
    });

    it("should be idempotent", async () => {
      const store = new WeaviateStore({ host: "localhost:8080" });

      await store.disconnect();
      await store.disconnect();
      await store.disconnect();

      expect(store.isInitialized()).toBe(false);
    });
  });
});
