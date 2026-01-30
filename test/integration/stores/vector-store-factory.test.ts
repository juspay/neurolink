/**
 * Integration tests for VectorStoreFactory
 * Tests factory creation of all registered store types
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  VectorStoreFactory,
  VectorStoreRegistry,
} from "../../../src/lib/stores/index.js";
import { VectorStoreName } from "../../../src/lib/types/vectorTypes.js";

describe("VectorStoreFactory", () => {
  beforeAll(async () => {
    // Clear any existing registrations and re-register
    VectorStoreRegistry.clearRegistrations();
    await VectorStoreRegistry.registerAllStores();
  });

  afterAll(() => {
    VectorStoreRegistry.clearRegistrations();
  });

  describe("Store Registration", () => {
    it("should register all expected stores", () => {
      const availableStores = VectorStoreFactory.getAvailableStores();

      // Check cloud stores
      expect(availableStores).toContain("pinecone");
      expect(availableStores).toContain("qdrant");
      expect(availableStores).toContain("weaviate");
      expect(availableStores).toContain("upstash");
      expect(availableStores).toContain("cloudflare");
      expect(availableStores).toContain("astra");

      // Check database stores
      expect(availableStores).toContain("pgvector");
      expect(availableStores).toContain("mongodb");
      expect(availableStores).toContain("elasticsearch");
      expect(availableStores).toContain("opensearch");

      // Check embedded stores
      expect(availableStores).toContain("chroma");
      expect(availableStores).toContain("lance");
      expect(availableStores).toContain("duckdb");
      expect(availableStores).toContain("libsql");

      // Check enterprise stores
      expect(availableStores).toContain("milvus");
      expect(availableStores).toContain("zilliz");
      expect(availableStores).toContain("azure-ai-search");
      expect(availableStores).toContain("vertex-vector");
      expect(availableStores).toContain("aws-opensearch");
      expect(availableStores).toContain("couchbase");
      expect(availableStores).toContain("vespa");
      expect(availableStores).toContain("marqo");
    });

    it("should recognize store aliases", () => {
      // Check various aliases
      expect(VectorStoreFactory.hasStore("pinecone")).toBe(true);
      expect(VectorStoreFactory.hasStore("postgres")).toBe(true);
      expect(VectorStoreFactory.hasStore("pg")).toBe(true);
      expect(VectorStoreFactory.hasStore("chromadb")).toBe(true);
      expect(VectorStoreFactory.hasStore("couchbase-vector")).toBe(true);
      expect(VectorStoreFactory.hasStore("vespa-ai")).toBe(true);
      expect(VectorStoreFactory.hasStore("marqo-ai")).toBe(true);
    });

    it("should return false for unknown stores", () => {
      expect(VectorStoreFactory.hasStore("unknown-store")).toBe(false);
      expect(VectorStoreFactory.hasStore("")).toBe(false);
    });
  });

  describe("Store Creation - Cloud Stores", () => {
    it("should create Pinecone store with valid config", async () => {
      const store = await VectorStoreFactory.createStore(
        VectorStoreName.PINECONE,
        {
          apiKey: "test-api-key",
        },
      );

      expect(store).toBeDefined();
      expect(store.getStoreName()).toBe("pinecone");
      expect(store.isInitialized()).toBe(false);
    });

    it("should create Qdrant store with valid config", async () => {
      const store = await VectorStoreFactory.createStore(
        VectorStoreName.QDRANT,
        {
          url: "http://localhost:6333",
        },
      );

      expect(store).toBeDefined();
      expect(store.getStoreName()).toBe("qdrant");
    });
  });

  describe("Store Creation - Enterprise Stores", () => {
    it("should create Couchbase store with valid config", async () => {
      const store = await VectorStoreFactory.createStore(
        VectorStoreName.COUCHBASE,
        {
          connectionString: "couchbase://localhost",
          username: "admin",
          password: "password",
          bucketName: "test-bucket",
        },
      );

      expect(store).toBeDefined();
      expect(store.getStoreName()).toBe("couchbase");
      expect(store.isInitialized()).toBe(false);
    });

    it("should create Vespa store with valid config", async () => {
      const store = await VectorStoreFactory.createStore(
        VectorStoreName.VESPA,
        {
          endpoint: "http://localhost:8080",
          applicationName: "test-app",
        },
      );

      expect(store).toBeDefined();
      expect(store.getStoreName()).toBe("vespa");
      expect(store.isInitialized()).toBe(false);
    });

    it("should create Marqo store with valid config", async () => {
      const store = await VectorStoreFactory.createStore(
        VectorStoreName.MARQO,
        {
          endpoint: "http://localhost:8882",
        },
      );

      expect(store).toBeDefined();
      expect(store.getStoreName()).toBe("marqo");
      expect(store.isInitialized()).toBe(false);
    });
  });

  describe("Store Creation - Database Stores", () => {
    it("should create pgvector store with valid config", async () => {
      const store = await VectorStoreFactory.createStore(
        VectorStoreName.PGVECTOR,
        {
          connectionString: "postgresql://localhost:5432/test",
        },
      );

      expect(store).toBeDefined();
      expect(store.getStoreName()).toBe("pgvector");
    });
  });

  describe("Store Creation - Embedded Stores", () => {
    it("should create Chroma store with valid config", async () => {
      const store = await VectorStoreFactory.createStore(
        VectorStoreName.CHROMA,
        {
          path: "./test-chroma-db",
        },
      );

      expect(store).toBeDefined();
      expect(store.getStoreName()).toBe("chroma");
    });
  });

  describe("Error Handling", () => {
    it("should throw error for unknown store name", async () => {
      await expect(
        VectorStoreFactory.createStore("unknown-store", {}),
      ).rejects.toThrow("Unknown vector store: unknown-store");
    });

    it("should include available stores in error message", async () => {
      try {
        await VectorStoreFactory.createStore("invalid", {});
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect((error as Error).message).toContain("Available stores:");
      }
    });
  });

  describe("Store Aliases", () => {
    it("should create store using alias", async () => {
      // Test creating store with alias "pg" for pgvector
      const store = await VectorStoreFactory.createStore("pg", {
        connectionString: "postgresql://localhost:5432/test",
      });

      expect(store).toBeDefined();
      expect(store.getStoreName()).toBe("pgvector");
    });

    it("should be case-insensitive", async () => {
      const store1 = await VectorStoreFactory.createStore("PINECONE", {
        apiKey: "test",
      });
      const store2 = await VectorStoreFactory.createStore("Pinecone", {
        apiKey: "test",
      });
      const store3 = await VectorStoreFactory.createStore("pinecone", {
        apiKey: "test",
      });

      expect(store1.getStoreName()).toBe(store2.getStoreName());
      expect(store2.getStoreName()).toBe(store3.getStoreName());
    });
  });

  describe("Registry State", () => {
    it("should track registration state", () => {
      expect(VectorStoreRegistry.isRegistered()).toBe(true);
    });

    it("should not re-register if already registered", async () => {
      const storesBefore = VectorStoreFactory.getAvailableStores().length;
      await VectorStoreRegistry.registerAllStores();
      const storesAfter = VectorStoreFactory.getAvailableStores().length;

      expect(storesBefore).toBe(storesAfter);
    });

    it("should allow clearing and re-registering", async () => {
      VectorStoreRegistry.clearRegistrations();
      expect(VectorStoreRegistry.isRegistered()).toBe(false);
      expect(VectorStoreFactory.getAvailableStores().length).toBe(0);

      await VectorStoreRegistry.registerAllStores();
      expect(VectorStoreRegistry.isRegistered()).toBe(true);
      expect(VectorStoreFactory.getAvailableStores().length).toBeGreaterThan(0);
    });
  });
});
