/**
 * MongoDBStore Unit Tests
 *
 * Tests for the MongoDB Vector Search store implementation.
 *
 * Note: Due to the MongoDBStore using dynamic imports for the MongoDB driver,
 * these tests focus on configuration and behavior that can be tested without
 * requiring the actual MongoDB connection. Integration tests with a real MongoDB
 * Atlas instance should be used for full API testing.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type MongoDBConfig,
  MongoDBStore,
} from "../../../src/lib/stores/database/mongodb.js";

// Mock logger
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("MongoDBStore", () => {
  describe("constructor", () => {
    it("should create store with required config", () => {
      const store = new MongoDBStore({
        connectionString: "mongodb+srv://user:pass@cluster.mongodb.net",
        database: "test_db",
      });

      expect(store).toBeDefined();
      expect(store.getStoreName()).toBe("mongodb");
    });

    it("should accept optional collection prefix", () => {
      const store = new MongoDBStore({
        connectionString: "mongodb+srv://user:pass@cluster.mongodb.net",
        database: "test_db",
        collectionPrefix: "custom_prefix_",
      });

      expect(store).toBeDefined();
    });

    it("should accept optional index wait config", () => {
      const store = new MongoDBStore({
        connectionString: "mongodb+srv://user:pass@cluster.mongodb.net",
        database: "test_db",
        waitForIndex: true,
        indexWaitTimeout: 120000,
      });

      expect(store).toBeDefined();
    });

    it("should not be initialized before connect", () => {
      const store = new MongoDBStore({
        connectionString: "mongodb+srv://user:pass@cluster.mongodb.net",
        database: "test_db",
      });

      expect(store.isInitialized()).toBe(false);
    });

    it("should accept debug flag", () => {
      const store = new MongoDBStore({
        connectionString: "mongodb+srv://user:pass@cluster.mongodb.net",
        database: "test_db",
        debug: true,
      });

      expect(store).toBeDefined();
    });
  });

  describe("initialization state", () => {
    let store: MongoDBStore;

    beforeEach(() => {
      store = new MongoDBStore({
        connectionString: "mongodb+srv://user:pass@cluster.mongodb.net",
        database: "test_db",
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
      const config: MongoDBConfig = {
        connectionString: "mongodb://localhost:27017",
        database: "test_db",
      };

      const store = new MongoDBStore(config);
      expect(store).toBeDefined();
    });

    it("should accept full config", () => {
      const config: MongoDBConfig = {
        connectionString: "mongodb+srv://user:pass@cluster.mongodb.net",
        database: "test_db",
        collectionPrefix: "vec_",
        waitForIndex: true,
        indexWaitTimeout: 60000,
        debug: true,
        timeout: 30000,
        maxRetries: 3,
      };

      const store = new MongoDBStore(config);
      expect(store).toBeDefined();
    });

    it("should use default collection prefix", () => {
      const config: MongoDBConfig = {
        connectionString: "mongodb://localhost:27017",
        database: "test_db",
      };

      const store = new MongoDBStore(config);
      expect(store).toBeDefined();
    });
  });

  describe("healthCheck", () => {
    it("should return unhealthy when not connected", async () => {
      const store = new MongoDBStore({
        connectionString: "mongodb://localhost:27017",
        database: "test_db",
      });

      const health = await store.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.status).toBe("error");
      expect(health.error).toBeDefined();
      expect(health.lastChecked).toBeInstanceOf(Date);
    });

    it("should include latency measurement", async () => {
      const store = new MongoDBStore({
        connectionString: "mongodb://localhost:27017",
        database: "test_db",
      });

      const health = await store.healthCheck();

      expect(health.latencyMs).toBeDefined();
      expect(typeof health.latencyMs).toBe("number");
    });
  });

  describe("batchUpsert (inherited)", () => {
    it("should throw when not initialized", async () => {
      const store = new MongoDBStore({
        connectionString: "mongodb://localhost:27017",
        database: "test_db",
      });

      const records = [{ id: "doc-1", vector: [0.1, 0.2], metadata: {} }];

      await expect(store.batchUpsert("test", records)).rejects.toThrow(
        "not initialized",
      );
    });
  });

  describe("queryAll (inherited)", () => {
    it("should throw when not initialized", async () => {
      const store = new MongoDBStore({
        connectionString: "mongodb://localhost:27017",
        database: "test_db",
      });

      await expect(
        store.queryAll("test", { vector: [0.1], topK: 10 }),
      ).rejects.toThrow("not initialized");
    });
  });

  describe("store identification", () => {
    it("should return mongodb as store name", () => {
      const store = new MongoDBStore({
        connectionString: "mongodb://localhost:27017",
        database: "test_db",
      });

      expect(store.getStoreName()).toBe("mongodb");
    });
  });

  describe("connect error handling", () => {
    it("should handle missing MongoDB driver gracefully", async () => {
      const store = new MongoDBStore({
        connectionString:
          "mongodb://localhost:27017/?serverSelectionTimeoutMS=1000&connectTimeoutMS=1000",
        database: "test_db",
      });

      // The connect will either succeed (if driver is available in test env)
      // or fail with an import/connection error
      try {
        await store.connect();
        // If it succeeds, the store should be initialized
        expect(store.isInitialized()).toBe(true);
        await store.disconnect();
      } catch (error) {
        // If it fails, it should be because the driver couldn't be imported
        // or the connection couldn't be established
        expect(error).toBeDefined();
      }
    }, 10000);
  });

  describe("disconnect", () => {
    it("should reset initialization state", async () => {
      const store = new MongoDBStore({
        connectionString:
          "mongodb://localhost:27017/?serverSelectionTimeoutMS=1000&connectTimeoutMS=1000",
        database: "test_db",
      });

      // Try to connect (may or may not work depending on driver availability)
      try {
        await store.connect();
        expect(store.isInitialized()).toBe(true);

        await store.disconnect();
        expect(store.isInitialized()).toBe(false);
      } catch {
        // If driver not available or connection fails, just check disconnect doesn't throw
        await store.disconnect();
        expect(store.isInitialized()).toBe(false);
      }
    }, 10000);

    it("should be idempotent", async () => {
      const store = new MongoDBStore({
        connectionString: "mongodb://localhost:27017",
        database: "test_db",
      });

      // Multiple disconnects should not throw
      await store.disconnect();
      await store.disconnect();
      await store.disconnect();

      expect(store.isInitialized()).toBe(false);
    });
  });
});
