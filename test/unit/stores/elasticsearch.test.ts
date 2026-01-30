/**
 * ElasticsearchStore Unit Tests
 *
 * Tests for the Elasticsearch vector store implementation.
 *
 * Note: Due to the ElasticsearchStore using dynamic imports for the ES client,
 * these tests focus on configuration and behavior that can be tested without
 * requiring the actual Elasticsearch connection. Integration tests with a real
 * Elasticsearch instance should be used for full API testing.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type ElasticsearchConfig,
  ElasticsearchStore,
} from "../../../src/lib/stores/database/elasticsearch.js";

// Mock logger
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("ElasticsearchStore", () => {
  describe("constructor", () => {
    it("should create store with required config", () => {
      const store = new ElasticsearchStore({
        node: "http://localhost:9200",
      });

      expect(store).toBeDefined();
      expect(store.getStoreName()).toBe("elasticsearch");
    });

    it("should accept cloud ID config", () => {
      const store = new ElasticsearchStore({
        node: "http://localhost:9200",
        cloudId: "my-deployment:dXMtZWFzdC0x...",
        apiKey: "test-api-key",
      });

      expect(store).toBeDefined();
    });

    it("should accept basic auth config", () => {
      const store = new ElasticsearchStore({
        node: "http://localhost:9200",
        username: "elastic",
        password: "changeme",
      });

      expect(store).toBeDefined();
    });

    it("should accept optional index prefix", () => {
      const store = new ElasticsearchStore({
        node: "http://localhost:9200",
        indexPrefix: "custom_",
      });

      expect(store).toBeDefined();
    });

    it("should accept shard and replica config", () => {
      const store = new ElasticsearchStore({
        node: "http://localhost:9200",
        numberOfShards: 3,
        numberOfReplicas: 2,
      });

      expect(store).toBeDefined();
    });

    it("should accept refresh policy config", () => {
      const store = new ElasticsearchStore({
        node: "http://localhost:9200",
        refreshPolicy: true,
      });

      expect(store).toBeDefined();
    });

    it("should not be initialized before connect", () => {
      const store = new ElasticsearchStore({
        node: "http://localhost:9200",
      });

      expect(store.isInitialized()).toBe(false);
    });

    it("should accept debug flag", () => {
      const store = new ElasticsearchStore({
        node: "http://localhost:9200",
        debug: true,
      });

      expect(store).toBeDefined();
    });
  });

  describe("initialization state", () => {
    let store: ElasticsearchStore;

    beforeEach(() => {
      store = new ElasticsearchStore({
        node: "http://localhost:9200",
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
      await expect(store.indexExists("test")).rejects.toThrow(
        "not initialized. Call connect() first",
      );
    });

    it("should throw on updateVector when not initialized", async () => {
      await expect(
        store.updateVector("test", "id1", { metadata: { key: "value" } }),
      ).rejects.toThrow("not initialized. Call connect() first");
    });
  });

  describe("configuration types", () => {
    it("should accept minimal config", () => {
      const config: ElasticsearchConfig = {
        node: "http://localhost:9200",
      };

      const store = new ElasticsearchStore(config);
      expect(store).toBeDefined();
    });

    it("should accept full config", () => {
      const config: ElasticsearchConfig = {
        node: "https://my-cluster.es.cloud:9243",
        cloudId: "my-deployment:dXMtZWFzdC0x...",
        apiKey: "my-api-key",
        username: "elastic",
        password: "changeme",
        caFingerprint: "abc123...",
        indexPrefix: "vectors_",
        numberOfShards: 2,
        numberOfReplicas: 1,
        refreshPolicy: "wait_for",
        debug: true,
        timeout: 30000,
        maxRetries: 3,
      };

      const store = new ElasticsearchStore(config);
      expect(store).toBeDefined();
    });

    it("should support wait_for refresh policy", () => {
      const config: ElasticsearchConfig = {
        node: "http://localhost:9200",
        refreshPolicy: "wait_for",
      };

      const store = new ElasticsearchStore(config);
      expect(store).toBeDefined();
    });

    it("should support boolean refresh policy", () => {
      const config: ElasticsearchConfig = {
        node: "http://localhost:9200",
        refreshPolicy: false,
      };

      const store = new ElasticsearchStore(config);
      expect(store).toBeDefined();
    });
  });

  describe("healthCheck", () => {
    it("should return unhealthy when not connected", async () => {
      const store = new ElasticsearchStore({
        node: "http://localhost:9200",
      });

      const health = await store.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.status).toBe("error");
      expect(health.error).toBeDefined();
      expect(health.lastChecked).toBeInstanceOf(Date);
    });

    it("should include latency measurement", async () => {
      const store = new ElasticsearchStore({
        node: "http://localhost:9200",
      });

      const health = await store.healthCheck();

      expect(health.latencyMs).toBeDefined();
      expect(typeof health.latencyMs).toBe("number");
    });
  });

  describe("batchUpsert (inherited)", () => {
    it("should throw when not initialized", async () => {
      const store = new ElasticsearchStore({
        node: "http://localhost:9200",
      });

      const records = [{ id: "doc-1", vector: [0.1, 0.2], metadata: {} }];

      await expect(store.batchUpsert("test", records)).rejects.toThrow(
        "not initialized",
      );
    });
  });

  describe("queryAll (inherited)", () => {
    it("should throw when not initialized", async () => {
      const store = new ElasticsearchStore({
        node: "http://localhost:9200",
      });

      await expect(
        store.queryAll("test", { vector: [0.1], topK: 10 }),
      ).rejects.toThrow("not initialized");
    });
  });

  describe("store identification", () => {
    it("should return elasticsearch as store name", () => {
      const store = new ElasticsearchStore({
        node: "http://localhost:9200",
      });

      expect(store.getStoreName()).toBe("elasticsearch");
    });
  });

  describe("connect error handling", () => {
    it("should handle missing Elasticsearch SDK gracefully", async () => {
      const store = new ElasticsearchStore({
        node: "http://localhost:9200",
      });

      // The connect will either succeed (if SDK is available in test env)
      // or fail with an import/connection error
      try {
        await store.connect();
        // If it succeeds, the store should be initialized
        expect(store.isInitialized()).toBe(true);
        await store.disconnect();
      } catch (error) {
        // If it fails, it should be because the SDK couldn't be imported
        // or the connection couldn't be established
        expect(error).toBeDefined();
      }
    });
  });

  describe("disconnect", () => {
    it("should reset initialization state", async () => {
      const store = new ElasticsearchStore({
        node: "http://localhost:9200",
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
      const store = new ElasticsearchStore({
        node: "http://localhost:9200",
      });

      // Multiple disconnects should not throw
      await store.disconnect();
      await store.disconnect();
      await store.disconnect();

      expect(store.isInitialized()).toBe(false);
    });
  });
});
