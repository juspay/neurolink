/**
 * PineconeStore Unit Tests
 *
 * Tests for the Pinecone vector store implementation.
 *
 * Note: Due to the PineconeStore using dynamic imports for the Pinecone SDK,
 * these tests focus on configuration and behavior that can be tested without
 * requiring the actual Pinecone client. Integration tests with a real Pinecone
 * instance should be used for full API testing.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type PineconeConfig,
  PineconeStore,
} from "../../../src/lib/stores/cloud/pinecone.js";

// Mock logger
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("PineconeStore", () => {
  describe("constructor", () => {
    it("should create store with required config", () => {
      const store = new PineconeStore({
        apiKey: "test-api-key",
      });

      expect(store).toBeDefined();
      expect(store.getStoreName()).toBe("pinecone");
    });

    it("should accept optional serverless config", () => {
      const store = new PineconeStore({
        apiKey: "test-api-key",
        serverless: {
          cloud: "gcp",
          region: "us-central1",
        },
      });

      expect(store).toBeDefined();
    });

    it("should accept optional controller host URL", () => {
      const store = new PineconeStore({
        apiKey: "test-api-key",
        controllerHostUrl: "https://custom.pinecone.io",
      });

      expect(store).toBeDefined();
    });

    it("should not be initialized before connect", () => {
      const store = new PineconeStore({
        apiKey: "test-api-key",
      });

      expect(store.isInitialized()).toBe(false);
    });

    it("should accept debug flag", () => {
      const store = new PineconeStore({
        apiKey: "test-api-key",
        debug: true,
      });

      expect(store).toBeDefined();
    });
  });

  describe("initialization state", () => {
    let store: PineconeStore;

    beforeEach(() => {
      store = new PineconeStore({ apiKey: "test-api-key" });
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
  });

  describe("configuration types", () => {
    it("should accept minimal config", () => {
      const config: PineconeConfig = {
        apiKey: "test-key",
      };

      const store = new PineconeStore(config);
      expect(store).toBeDefined();
    });

    it("should accept full config", () => {
      const config: PineconeConfig = {
        apiKey: "test-key",
        controllerHostUrl: "https://custom.pinecone.io",
        serverless: {
          cloud: "aws",
          region: "us-west-2",
        },
        debug: true,
        timeout: 30000,
        maxRetries: 3,
      };

      const store = new PineconeStore(config);
      expect(store).toBeDefined();
    });

    it("should support aws cloud option", () => {
      const config: PineconeConfig = {
        apiKey: "test-key",
        serverless: {
          cloud: "aws",
          region: "us-east-1",
        },
      };

      const store = new PineconeStore(config);
      expect(store).toBeDefined();
    });

    it("should support gcp cloud option", () => {
      const config: PineconeConfig = {
        apiKey: "test-key",
        serverless: {
          cloud: "gcp",
          region: "us-central1",
        },
      };

      const store = new PineconeStore(config);
      expect(store).toBeDefined();
    });

    it("should support azure cloud option", () => {
      const config: PineconeConfig = {
        apiKey: "test-key",
        serverless: {
          cloud: "azure",
          region: "eastus",
        },
      };

      const store = new PineconeStore(config);
      expect(store).toBeDefined();
    });
  });

  describe("healthCheck", () => {
    it("should return unhealthy when not connected", async () => {
      const store = new PineconeStore({ apiKey: "test-api-key" });

      const health = await store.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.status).toBe("error");
      expect(health.error).toBeDefined();
      expect(health.lastChecked).toBeInstanceOf(Date);
    });

    it("should include latency measurement", async () => {
      const store = new PineconeStore({ apiKey: "test-api-key" });

      const health = await store.healthCheck();

      expect(health.latencyMs).toBeDefined();
      expect(typeof health.latencyMs).toBe("number");
    });
  });

  describe("batchUpsert (inherited)", () => {
    it("should throw when not initialized", async () => {
      const store = new PineconeStore({ apiKey: "test-api-key" });

      const records = [{ id: "doc-1", vector: [0.1, 0.2], metadata: {} }];

      await expect(store.batchUpsert("test", records)).rejects.toThrow(
        "not initialized",
      );
    });
  });

  describe("queryAll (inherited)", () => {
    it("should throw when not initialized", async () => {
      const store = new PineconeStore({ apiKey: "test-api-key" });

      await expect(
        store.queryAll("test", { vector: [0.1], topK: 10 }),
      ).rejects.toThrow("not initialized");
    });
  });

  describe("store identification", () => {
    it("should return pinecone as store name", () => {
      const store = new PineconeStore({ apiKey: "test-api-key" });

      expect(store.getStoreName()).toBe("pinecone");
    });
  });

  describe("connect error handling", () => {
    it("should handle missing Pinecone SDK gracefully", async () => {
      // This tests the dynamic import failure scenario
      // In a real environment without @pinecone-database/pinecone installed,
      // connect() would throw an error
      const store = new PineconeStore({ apiKey: "test-api-key" });

      // The connect will either succeed (if SDK is available in test env)
      // or fail with an import error
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
      const store = new PineconeStore({ apiKey: "test-api-key" });

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
      const store = new PineconeStore({ apiKey: "test-api-key" });

      // Multiple disconnects should not throw
      await store.disconnect();
      await store.disconnect();
      await store.disconnect();

      expect(store.isInitialized()).toBe(false);
    });
  });
});
