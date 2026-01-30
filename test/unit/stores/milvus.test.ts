/**
 * MilvusStore Unit Tests
 *
 * Tests for the Milvus vector store implementation.
 *
 * Note: Due to the MilvusStore using dynamic imports for the Milvus SDK,
 * these tests focus on configuration and behavior that can be tested without
 * requiring the actual Milvus client. Integration tests with a real Milvus
 * instance should be used for full API testing.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type MilvusConfig,
  MilvusStore,
} from "../../../src/lib/stores/enterprise/milvus.js";

// Mock logger
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("MilvusStore", () => {
  describe("constructor", () => {
    it("should create store with required config", () => {
      const store = new MilvusStore({
        address: "localhost:19530",
      });

      expect(store).toBeDefined();
      expect(store.getStoreName()).toBe("milvus");
    });

    it("should accept authentication credentials", () => {
      const store = new MilvusStore({
        address: "localhost:19530",
        username: "root",
        password: "milvus",
      });

      expect(store).toBeDefined();
    });

    it("should accept SSL configuration", () => {
      const store = new MilvusStore({
        address: "milvus.example.com:19530",
        ssl: true,
      });

      expect(store).toBeDefined();
    });

    it("should accept token for Zilliz compatibility", () => {
      const store = new MilvusStore({
        address: "milvus.example.com:19530",
        token: "test-token",
      });

      expect(store).toBeDefined();
    });

    it("should not be initialized before connect", () => {
      const store = new MilvusStore({
        address: "localhost:19530",
      });

      expect(store.isInitialized()).toBe(false);
    });

    it("should accept debug flag", () => {
      const store = new MilvusStore({
        address: "localhost:19530",
        debug: true,
      });

      expect(store).toBeDefined();
    });

    it("should accept custom index type", () => {
      const store = new MilvusStore({
        address: "localhost:19530",
        indexType: "IVF_FLAT",
      });

      expect(store).toBeDefined();
    });

    it("should accept custom index parameters", () => {
      const store = new MilvusStore({
        address: "localhost:19530",
        indexType: "HNSW",
        indexParams: { M: 32, efConstruction: 200 },
      });

      expect(store).toBeDefined();
    });
  });

  describe("initialization state", () => {
    let store: MilvusStore;

    beforeEach(() => {
      store = new MilvusStore({ address: "localhost:19530" });
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
      const config: MilvusConfig = {
        address: "localhost:19530",
      };

      const store = new MilvusStore(config);
      expect(store).toBeDefined();
    });

    it("should accept full config", () => {
      const config: MilvusConfig = {
        address: "milvus.example.com:19530",
        username: "admin",
        password: "password123",
        ssl: true,
        token: "test-token",
        connectTimeout: 10000,
        indexType: "HNSW",
        indexParams: { M: 16, efConstruction: 100 },
        debug: true,
        timeout: 30000,
        maxRetries: 3,
      };

      const store = new MilvusStore(config);
      expect(store).toBeDefined();
    });

    it("should support IVF_FLAT index type", () => {
      const config: MilvusConfig = {
        address: "localhost:19530",
        indexType: "IVF_FLAT",
        indexParams: { nlist: 1024 },
      };

      const store = new MilvusStore(config);
      expect(store).toBeDefined();
    });

    it("should support HNSW index type", () => {
      const config: MilvusConfig = {
        address: "localhost:19530",
        indexType: "HNSW",
        indexParams: { M: 16, efConstruction: 100 },
      };

      const store = new MilvusStore(config);
      expect(store).toBeDefined();
    });

    it("should support IVF_PQ index type", () => {
      const config: MilvusConfig = {
        address: "localhost:19530",
        indexType: "IVF_PQ",
        indexParams: { nlist: 1024, m: 8, nbits: 8 },
      };

      const store = new MilvusStore(config);
      expect(store).toBeDefined();
    });
  });

  describe("healthCheck", () => {
    it("should return unhealthy when not connected", async () => {
      const store = new MilvusStore({ address: "localhost:19530" });

      const health = await store.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.status).toBe("error");
      expect(health.error).toBeDefined();
      expect(health.lastChecked).toBeInstanceOf(Date);
    });

    it("should include latency measurement", async () => {
      const store = new MilvusStore({ address: "localhost:19530" });

      const health = await store.healthCheck();

      expect(health.latencyMs).toBeDefined();
      expect(typeof health.latencyMs).toBe("number");
    });
  });

  describe("batchUpsert (inherited)", () => {
    it("should throw when not initialized", async () => {
      const store = new MilvusStore({ address: "localhost:19530" });

      const records = [{ id: "doc-1", vector: [0.1, 0.2], metadata: {} }];

      await expect(store.batchUpsert("test", records)).rejects.toThrow(
        "not initialized",
      );
    });
  });

  describe("queryAll (inherited)", () => {
    it("should throw when not initialized", async () => {
      const store = new MilvusStore({ address: "localhost:19530" });

      await expect(
        store.queryAll("test", { vector: [0.1], topK: 10 }),
      ).rejects.toThrow("not initialized");
    });
  });

  describe("store identification", () => {
    it("should return milvus as store name", () => {
      const store = new MilvusStore({ address: "localhost:19530" });

      expect(store.getStoreName()).toBe("milvus");
    });
  });

  describe("connect error handling", () => {
    it("should handle missing Milvus SDK gracefully", async () => {
      const store = new MilvusStore({ address: "localhost:19530" });

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
      const store = new MilvusStore({ address: "localhost:19530" });

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
      const store = new MilvusStore({ address: "localhost:19530" });

      await store.disconnect();
      await store.disconnect();
      await store.disconnect();

      expect(store.isInitialized()).toBe(false);
    });
  });
});
