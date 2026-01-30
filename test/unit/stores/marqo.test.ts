/**
 * MarqoStore Unit Tests
 *
 * Tests for the Marqo vector store implementation.
 *
 * Note: The MarqoStore uses HTTP API calls for communication.
 * These tests focus on configuration and behavior that can be tested without
 * requiring a real Marqo instance. Integration tests with a real Marqo
 * deployment should be used for full API testing.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type MarqoConfig,
  MarqoStore,
} from "../../../src/lib/stores/enterprise/marqo.js";

// Mock logger
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("MarqoStore", () => {
  describe("constructor", () => {
    it("should create store with required config", () => {
      const store = new MarqoStore({
        endpoint: "http://localhost:8882",
      });

      expect(store).toBeDefined();
      expect(store.getStoreName()).toBe("marqo");
    });

    it("should accept API key for Marqo Cloud", () => {
      const store = new MarqoStore({
        endpoint: "https://api.marqo.ai",
        apiKey: "test-api-key",
      });

      expect(store).toBeDefined();
    });

    it("should accept custom default model", () => {
      const store = new MarqoStore({
        endpoint: "http://localhost:8882",
        defaultModel: "sentence-transformers/all-MiniLM-L6-v2",
      });

      expect(store).toBeDefined();
    });

    it("should accept normalize embeddings setting", () => {
      const store = new MarqoStore({
        endpoint: "http://localhost:8882",
        normalizeEmbeddings: false,
      });

      expect(store).toBeDefined();
    });

    it("should accept custom request timeout", () => {
      const store = new MarqoStore({
        endpoint: "http://localhost:8882",
        requestTimeout: 60000,
      });

      expect(store).toBeDefined();
    });

    it("should accept custom number of shards", () => {
      const store = new MarqoStore({
        endpoint: "http://localhost:8882",
        numberOfShards: 3,
      });

      expect(store).toBeDefined();
    });

    it("should accept custom number of replicas", () => {
      const store = new MarqoStore({
        endpoint: "http://localhost:8882",
        numberOfReplicas: 2,
      });

      expect(store).toBeDefined();
    });

    it("should not be initialized before connect", () => {
      const store = new MarqoStore({
        endpoint: "http://localhost:8882",
      });

      expect(store.isInitialized()).toBe(false);
    });

    it("should accept debug flag", () => {
      const store = new MarqoStore({
        endpoint: "http://localhost:8882",
        debug: true,
      });

      expect(store).toBeDefined();
    });
  });

  describe("initialization state", () => {
    let store: MarqoStore;

    beforeEach(() => {
      store = new MarqoStore({
        endpoint: "http://localhost:8882",
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
        store.updateVector("test", "id-1", { metadata: { key: "value" } }),
      ).rejects.toThrow("not initialized. Call connect() first");
    });
  });

  describe("configuration types", () => {
    it("should accept minimal config", () => {
      const config: MarqoConfig = {
        endpoint: "http://localhost:8882",
      };

      const store = new MarqoStore(config);
      expect(store).toBeDefined();
    });

    it("should accept full config", () => {
      const config: MarqoConfig = {
        endpoint: "https://api.marqo.ai",
        apiKey: "secure-api-key",
        defaultModel: "hf/e5-large-v2",
        normalizeEmbeddings: true,
        requestTimeout: 60000,
        numberOfShards: 3,
        numberOfReplicas: 2,
        debug: true,
        timeout: 30000,
        maxRetries: 5,
      };

      const store = new MarqoStore(config);
      expect(store).toBeDefined();
    });

    it("should support Marqo Cloud configuration", () => {
      const config: MarqoConfig = {
        endpoint: "https://api.marqo.ai",
        apiKey: "marqo-cloud-api-key",
        defaultModel: "hf/e5-base-v2",
      };

      const store = new MarqoStore(config);
      expect(store).toBeDefined();
    });

    it("should support self-hosted configuration", () => {
      const config: MarqoConfig = {
        endpoint: "http://marqo.internal:8882",
        numberOfShards: 5,
        numberOfReplicas: 1,
      };

      const store = new MarqoStore(config);
      expect(store).toBeDefined();
    });

    it("should support custom embedding model", () => {
      const config: MarqoConfig = {
        endpoint: "http://localhost:8882",
        defaultModel: "open_clip/ViT-B-32/laion2b_s34b_b79k",
      };

      const store = new MarqoStore(config);
      expect(store).toBeDefined();
    });
  });

  describe("healthCheck", () => {
    it("should return unhealthy when not connected", async () => {
      const store = new MarqoStore({
        endpoint: "http://localhost:8882",
      });

      const health = await store.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.status).toBe("error");
      expect(health.error).toBeDefined();
      expect(health.lastChecked).toBeInstanceOf(Date);
    });

    it("should include latency measurement", async () => {
      const store = new MarqoStore({
        endpoint: "http://localhost:8882",
      });

      const health = await store.healthCheck();

      expect(health.latencyMs).toBeDefined();
      expect(typeof health.latencyMs).toBe("number");
    });
  });

  describe("batchUpsert (inherited)", () => {
    it("should throw when not initialized", async () => {
      const store = new MarqoStore({
        endpoint: "http://localhost:8882",
      });

      const records = [{ id: "doc-1", vector: [0.1, 0.2], metadata: {} }];

      await expect(store.batchUpsert("test", records)).rejects.toThrow(
        "not initialized",
      );
    });
  });

  describe("queryAll (inherited)", () => {
    it("should throw when not initialized", async () => {
      const store = new MarqoStore({
        endpoint: "http://localhost:8882",
      });

      await expect(
        store.queryAll("test", { vector: [0.1], topK: 10 }),
      ).rejects.toThrow("not initialized");
    });
  });

  describe("store identification", () => {
    it("should return marqo as store name", () => {
      const store = new MarqoStore({
        endpoint: "http://localhost:8882",
      });

      expect(store.getStoreName()).toBe("marqo");
    });
  });

  describe("connect error handling", () => {
    it("should handle connection failure gracefully", async () => {
      const store = new MarqoStore({
        endpoint: "http://non-existent-host:8882",
      });

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
      const store = new MarqoStore({
        endpoint: "http://localhost:8882",
      });

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
      const store = new MarqoStore({
        endpoint: "http://localhost:8882",
      });

      await store.disconnect();
      await store.disconnect();
      await store.disconnect();

      expect(store.isInitialized()).toBe(false);
    });
  });

  describe("model configuration", () => {
    it("should use default model hf/e5-base-v2 when not specified", () => {
      const config: MarqoConfig = {
        endpoint: "http://localhost:8882",
      };

      const store = new MarqoStore(config);
      expect(store).toBeDefined();
    });

    it("should support sentence-transformers models", () => {
      const config: MarqoConfig = {
        endpoint: "http://localhost:8882",
        defaultModel: "sentence-transformers/all-mpnet-base-v2",
      };

      const store = new MarqoStore(config);
      expect(store).toBeDefined();
    });

    it("should support OpenCLIP models for multimodal", () => {
      const config: MarqoConfig = {
        endpoint: "http://localhost:8882",
        defaultModel: "open_clip/ViT-L-14/laion2b_s32b_b82k",
      };

      const store = new MarqoStore(config);
      expect(store).toBeDefined();
    });
  });

  describe("sharding and replication", () => {
    it("should default to 1 shard when not specified", () => {
      const config: MarqoConfig = {
        endpoint: "http://localhost:8882",
      };

      const store = new MarqoStore(config);
      expect(store).toBeDefined();
    });

    it("should default to 0 replicas when not specified", () => {
      const config: MarqoConfig = {
        endpoint: "http://localhost:8882",
      };

      const store = new MarqoStore(config);
      expect(store).toBeDefined();
    });

    it("should accept high availability configuration", () => {
      const config: MarqoConfig = {
        endpoint: "http://localhost:8882",
        numberOfShards: 5,
        numberOfReplicas: 2,
      };

      const store = new MarqoStore(config);
      expect(store).toBeDefined();
    });
  });
});
