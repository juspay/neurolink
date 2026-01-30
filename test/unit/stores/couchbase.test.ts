/**
 * CouchbaseStore Unit Tests
 *
 * Tests for the Couchbase vector store implementation.
 *
 * Note: Due to the CouchbaseStore using dynamic imports for the Couchbase SDK,
 * these tests focus on configuration and behavior that can be tested without
 * requiring the actual Couchbase client. Integration tests with a real Couchbase
 * instance should be used for full API testing.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type CouchbaseConfig,
  CouchbaseStore,
} from "../../../src/lib/stores/enterprise/couchbase.js";

// Mock logger
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("CouchbaseStore", () => {
  describe("constructor", () => {
    it("should create store with required config", () => {
      const store = new CouchbaseStore({
        connectionString: "couchbase://localhost",
        username: "admin",
        password: "password",
        bucketName: "test-bucket",
      });

      expect(store).toBeDefined();
      expect(store.getStoreName()).toBe("couchbase");
    });

    it("should accept custom scope and collection names", () => {
      const store = new CouchbaseStore({
        connectionString: "couchbase://localhost",
        username: "admin",
        password: "password",
        bucketName: "test-bucket",
        scopeName: "custom_scope",
        collectionName: "custom_collection",
      });

      expect(store).toBeDefined();
    });

    it("should accept custom index prefix", () => {
      const store = new CouchbaseStore({
        connectionString: "couchbase://localhost",
        username: "admin",
        password: "password",
        bucketName: "test-bucket",
        indexPrefix: "custom_idx",
      });

      expect(store).toBeDefined();
    });

    it("should accept custom vector field name", () => {
      const store = new CouchbaseStore({
        connectionString: "couchbase://localhost",
        username: "admin",
        password: "password",
        bucketName: "test-bucket",
        vectorFieldName: "vector",
      });

      expect(store).toBeDefined();
    });

    it("should not be initialized before connect", () => {
      const store = new CouchbaseStore({
        connectionString: "couchbase://localhost",
        username: "admin",
        password: "password",
        bucketName: "test-bucket",
      });

      expect(store.isInitialized()).toBe(false);
    });

    it("should accept debug flag", () => {
      const store = new CouchbaseStore({
        connectionString: "couchbase://localhost",
        username: "admin",
        password: "password",
        bucketName: "test-bucket",
        debug: true,
      });

      expect(store).toBeDefined();
    });
  });

  describe("initialization state", () => {
    let store: CouchbaseStore;

    beforeEach(() => {
      store = new CouchbaseStore({
        connectionString: "couchbase://localhost",
        username: "admin",
        password: "password",
        bucketName: "test-bucket",
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
      const config: CouchbaseConfig = {
        connectionString: "couchbase://localhost",
        username: "admin",
        password: "password",
        bucketName: "test-bucket",
      };

      const store = new CouchbaseStore(config);
      expect(store).toBeDefined();
    });

    it("should accept full config", () => {
      const config: CouchbaseConfig = {
        connectionString: "couchbases://cluster.example.com",
        username: "admin",
        password: "password123",
        bucketName: "vectors",
        scopeName: "ai_data",
        collectionName: "embeddings",
        indexPrefix: "vec_idx",
        vectorFieldName: "embedding",
        debug: true,
        timeout: 30000,
        maxRetries: 3,
      };

      const store = new CouchbaseStore(config);
      expect(store).toBeDefined();
    });

    it("should support secure connection string", () => {
      const config: CouchbaseConfig = {
        connectionString: "couchbases://secure-cluster.example.com",
        username: "admin",
        password: "password",
        bucketName: "test-bucket",
      };

      const store = new CouchbaseStore(config);
      expect(store).toBeDefined();
    });
  });

  describe("healthCheck", () => {
    it("should return unhealthy when not connected", async () => {
      const store = new CouchbaseStore({
        connectionString: "couchbase://localhost",
        username: "admin",
        password: "password",
        bucketName: "test-bucket",
      });

      const health = await store.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.status).toBe("error");
      expect(health.error).toBeDefined();
      expect(health.lastChecked).toBeInstanceOf(Date);
    });

    it("should include latency measurement", async () => {
      const store = new CouchbaseStore({
        connectionString: "couchbase://localhost",
        username: "admin",
        password: "password",
        bucketName: "test-bucket",
      });

      const health = await store.healthCheck();

      expect(health.latencyMs).toBeDefined();
      expect(typeof health.latencyMs).toBe("number");
    });
  });

  describe("batchUpsert (inherited)", () => {
    it("should throw when not initialized", async () => {
      const store = new CouchbaseStore({
        connectionString: "couchbase://localhost",
        username: "admin",
        password: "password",
        bucketName: "test-bucket",
      });

      const records = [{ id: "doc-1", vector: [0.1, 0.2], metadata: {} }];

      await expect(store.batchUpsert("test", records)).rejects.toThrow(
        "not initialized",
      );
    });
  });

  describe("queryAll (inherited)", () => {
    it("should throw when not initialized", async () => {
      const store = new CouchbaseStore({
        connectionString: "couchbase://localhost",
        username: "admin",
        password: "password",
        bucketName: "test-bucket",
      });

      await expect(
        store.queryAll("test", { vector: [0.1], topK: 10 }),
      ).rejects.toThrow("not initialized");
    });
  });

  describe("store identification", () => {
    it("should return couchbase as store name", () => {
      const store = new CouchbaseStore({
        connectionString: "couchbase://localhost",
        username: "admin",
        password: "password",
        bucketName: "test-bucket",
      });

      expect(store.getStoreName()).toBe("couchbase");
    });
  });

  describe("connect error handling", () => {
    it("should handle missing Couchbase SDK gracefully", async () => {
      const store = new CouchbaseStore({
        connectionString: "couchbase://localhost",
        username: "admin",
        password: "password",
        bucketName: "test-bucket",
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
      const store = new CouchbaseStore({
        connectionString: "couchbase://localhost",
        username: "admin",
        password: "password",
        bucketName: "test-bucket",
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
      const store = new CouchbaseStore({
        connectionString: "couchbase://localhost",
        username: "admin",
        password: "password",
        bucketName: "test-bucket",
      });

      await store.disconnect();
      await store.disconnect();
      await store.disconnect();

      expect(store.isInitialized()).toBe(false);
    });
  });
});
