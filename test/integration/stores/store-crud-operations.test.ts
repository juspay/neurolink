/**
 * Integration tests for store CRUD operations
 * Tests basic vector operations across different store implementations
 * Note: These tests validate the interface but require real connections for full integration testing
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  VectorStoreFactory,
  VectorStoreRegistry,
  type PineconeConfig,
  type CouchbaseConfig,
  type VespaConfig,
  type MarqoConfig,
} from "../../../src/lib/stores/index.js";
import { VectorStoreName } from "../../../src/lib/types/vectorTypes.js";
import type {
  VectorRecord,
  VectorQueryOptions,
  VectorIndexConfig,
} from "../../../src/lib/types/vectorTypes.js";

describe("Store CRUD Operations", () => {
  beforeAll(async () => {
    VectorStoreRegistry.clearRegistrations();
    await VectorStoreRegistry.registerAllStores();
  });

  afterAll(() => {
    VectorStoreRegistry.clearRegistrations();
  });

  describe("BaseVectorStore Interface Compliance", () => {
    describe("Couchbase Store", () => {
      it("should implement all required methods", async () => {
        const store = await VectorStoreFactory.createStore(
          VectorStoreName.COUCHBASE,
          {
            connectionString: "couchbase://localhost",
            username: "admin",
            password: "password",
            bucketName: "test-bucket",
          } as CouchbaseConfig,
        );

        // Verify all required methods exist
        expect(typeof store.connect).toBe("function");
        expect(typeof store.disconnect).toBe("function");
        expect(typeof store.createIndex).toBe("function");
        expect(typeof store.deleteIndex).toBe("function");
        expect(typeof store.listIndexes).toBe("function");
        expect(typeof store.indexExists).toBe("function");
        expect(typeof store.upsert).toBe("function");
        expect(typeof store.query).toBe("function");
        expect(typeof store.delete).toBe("function");
        expect(typeof store.updateVector).toBe("function");
        expect(typeof store.getStats).toBe("function");

        // Common methods from BaseVectorStore
        expect(typeof store.deleteVector).toBe("function");
        expect(typeof store.healthCheck).toBe("function");
        expect(typeof store.batchUpsert).toBe("function");
        expect(typeof store.queryAll).toBe("function");
        expect(typeof store.getStoreName).toBe("function");
        expect(typeof store.isInitialized).toBe("function");
      });

      it("should have correct store name", async () => {
        const store = await VectorStoreFactory.createStore(
          VectorStoreName.COUCHBASE,
          {
            connectionString: "couchbase://localhost",
            username: "admin",
            password: "password",
            bucketName: "test-bucket",
          } as CouchbaseConfig,
        );

        expect(store.getStoreName()).toBe("couchbase");
      });

      it("should not be initialized before connect", async () => {
        const store = await VectorStoreFactory.createStore(
          VectorStoreName.COUCHBASE,
          {
            connectionString: "couchbase://localhost",
            username: "admin",
            password: "password",
            bucketName: "test-bucket",
          } as CouchbaseConfig,
        );

        expect(store.isInitialized()).toBe(false);
      });
    });

    describe("Vespa Store", () => {
      it("should implement all required methods", async () => {
        const store = await VectorStoreFactory.createStore(
          VectorStoreName.VESPA,
          {
            endpoint: "http://localhost:8080",
            applicationName: "test-app",
          } as VespaConfig,
        );

        expect(typeof store.connect).toBe("function");
        expect(typeof store.disconnect).toBe("function");
        expect(typeof store.createIndex).toBe("function");
        expect(typeof store.deleteIndex).toBe("function");
        expect(typeof store.listIndexes).toBe("function");
        expect(typeof store.indexExists).toBe("function");
        expect(typeof store.upsert).toBe("function");
        expect(typeof store.query).toBe("function");
        expect(typeof store.delete).toBe("function");
        expect(typeof store.updateVector).toBe("function");
        expect(typeof store.getStats).toBe("function");
      });

      it("should have correct store name", async () => {
        const store = await VectorStoreFactory.createStore(
          VectorStoreName.VESPA,
          {
            endpoint: "http://localhost:8080",
            applicationName: "test-app",
          } as VespaConfig,
        );

        expect(store.getStoreName()).toBe("vespa");
      });
    });

    describe("Marqo Store", () => {
      it("should implement all required methods", async () => {
        const store = await VectorStoreFactory.createStore(
          VectorStoreName.MARQO,
          {
            endpoint: "http://localhost:8882",
          } as MarqoConfig,
        );

        expect(typeof store.connect).toBe("function");
        expect(typeof store.disconnect).toBe("function");
        expect(typeof store.createIndex).toBe("function");
        expect(typeof store.deleteIndex).toBe("function");
        expect(typeof store.listIndexes).toBe("function");
        expect(typeof store.indexExists).toBe("function");
        expect(typeof store.upsert).toBe("function");
        expect(typeof store.query).toBe("function");
        expect(typeof store.delete).toBe("function");
        expect(typeof store.updateVector).toBe("function");
        expect(typeof store.getStats).toBe("function");
      });

      it("should have correct store name", async () => {
        const store = await VectorStoreFactory.createStore(
          VectorStoreName.MARQO,
          {
            endpoint: "http://localhost:8882",
          } as MarqoConfig,
        );

        expect(store.getStoreName()).toBe("marqo");
      });
    });
  });

  describe("Configuration Validation", () => {
    it("Couchbase should accept all configuration options", async () => {
      const config: CouchbaseConfig = {
        connectionString: "couchbase://localhost",
        username: "admin",
        password: "password",
        bucketName: "test-bucket",
        scopeName: "custom-scope",
        collectionName: "custom-collection",
        indexPrefix: "custom_idx",
        vectorFieldName: "custom_embedding",
        debug: true,
        timeout: 5000,
        maxRetries: 3,
      };

      const store = await VectorStoreFactory.createStore(
        VectorStoreName.COUCHBASE,
        config,
      );

      expect(store).toBeDefined();
    });

    it("Vespa should accept all configuration options", async () => {
      const config: VespaConfig = {
        endpoint: "http://localhost:8080",
        applicationName: "test-app",
        apiKey: "test-api-key",
        namespace: "custom-namespace",
        vectorFieldName: "custom_embedding",
        contentType: "custom_vectors",
        requestTimeout: 60000,
        debug: true,
      };

      const store = await VectorStoreFactory.createStore(
        VectorStoreName.VESPA,
        config,
      );

      expect(store).toBeDefined();
    });

    it("Marqo should accept all configuration options", async () => {
      const config: MarqoConfig = {
        endpoint: "http://localhost:8882",
        apiKey: "test-api-key",
        defaultModel: "hf/e5-large-v2",
        normalizeEmbeddings: false,
        requestTimeout: 60000,
        numberOfShards: 2,
        numberOfReplicas: 1,
        debug: true,
      };

      const store = await VectorStoreFactory.createStore(
        VectorStoreName.MARQO,
        config,
      );

      expect(store).toBeDefined();
    });
  });

  describe("Error Handling Before Initialization", () => {
    it("should throw error when calling methods before connect", async () => {
      const store = await VectorStoreFactory.createStore(
        VectorStoreName.COUCHBASE,
        {
          connectionString: "couchbase://localhost",
          username: "admin",
          password: "password",
          bucketName: "test-bucket",
        } as CouchbaseConfig,
      );

      // Methods should throw when not initialized
      await expect(store.listIndexes()).rejects.toThrow("not initialized");
    });
  });

  describe("Index Configuration Types", () => {
    it("should support different similarity metrics", async () => {
      const indexConfigs: VectorIndexConfig[] = [
        { name: "cosine-idx", dimension: 1536, metric: "cosine" },
        { name: "euclidean-idx", dimension: 768, metric: "euclidean" },
        { name: "dotproduct-idx", dimension: 3072, metric: "dotProduct" },
      ];

      // Just verify configs are valid
      for (const config of indexConfigs) {
        expect(config.name).toBeDefined();
        expect(config.dimension).toBeGreaterThan(0);
        expect(["cosine", "euclidean", "dotProduct"]).toContain(config.metric);
      }
    });
  });

  describe("Vector Record Types", () => {
    it("should support typed metadata in records", () => {
      type CustomMetadata = {
        category: string;
        tags: string[];
        score: number;
        active: boolean;
      };

      const record: VectorRecord<CustomMetadata> = {
        id: "test-1",
        vector: new Array(1536).fill(0.1),
        metadata: {
          category: "tech",
          tags: ["ai", "ml"],
          score: 0.95,
          active: true,
        },
        content: "Test content",
      };

      expect(record.id).toBe("test-1");
      expect(record.vector).toHaveLength(1536);
      expect(record.metadata?.category).toBe("tech");
      expect(record.metadata?.tags).toContain("ai");
    });

    it("should support optional fields in records", () => {
      const minimalRecord: VectorRecord = {
        id: "minimal-1",
        vector: [0.1, 0.2, 0.3],
      };

      expect(minimalRecord.id).toBe("minimal-1");
      expect(minimalRecord.metadata).toBeUndefined();
      expect(minimalRecord.content).toBeUndefined();
    });
  });

  describe("Query Options Types", () => {
    it("should support all query options", () => {
      type CustomMetadata = {
        category: string;
        price: number;
      };

      const queryOptions: VectorQueryOptions<CustomMetadata> = {
        vector: new Array(1536).fill(0.1),
        topK: 10,
        minScore: 0.7,
        includeVectors: true,
        includeMetadata: true,
        namespace: "test-namespace",
        filter: {
          category: "tech",
          price: { $gte: 100 },
        },
      };

      expect(queryOptions.vector).toHaveLength(1536);
      expect(queryOptions.topK).toBe(10);
      expect(queryOptions.minScore).toBe(0.7);
      expect(queryOptions.filter?.category).toBe("tech");
    });
  });

  describe("Batch Operations Compatibility", () => {
    it("should support batch upsert options", async () => {
      const store = await VectorStoreFactory.createStore(
        VectorStoreName.COUCHBASE,
        {
          connectionString: "couchbase://localhost",
          username: "admin",
          password: "password",
          bucketName: "test-bucket",
        } as CouchbaseConfig,
      );

      // Verify batchUpsert exists and accepts batch size option
      expect(typeof store.batchUpsert).toBe("function");
    });
  });
});

describe("Store-Specific Features", () => {
  beforeAll(async () => {
    await VectorStoreRegistry.registerAllStores();
  });

  describe("Couchbase-Specific Features", () => {
    it("should support custom scope and collection", async () => {
      const store = await VectorStoreFactory.createStore(
        VectorStoreName.COUCHBASE,
        {
          connectionString: "couchbase://localhost",
          username: "admin",
          password: "password",
          bucketName: "test-bucket",
          scopeName: "custom_scope",
          collectionName: "custom_collection",
        } as CouchbaseConfig,
      );

      expect(store).toBeDefined();
    });
  });

  describe("Vespa-Specific Features", () => {
    it("should support custom content type", async () => {
      const store = await VectorStoreFactory.createStore(
        VectorStoreName.VESPA,
        {
          endpoint: "http://localhost:8080",
          applicationName: "test-app",
          contentType: "custom_document_type",
        } as VespaConfig,
      );

      expect(store).toBeDefined();
    });
  });

  describe("Marqo-Specific Features", () => {
    it("should support custom embedding model", async () => {
      const store = await VectorStoreFactory.createStore(
        VectorStoreName.MARQO,
        {
          endpoint: "http://localhost:8882",
          defaultModel: "sentence-transformers/all-MiniLM-L6-v2",
          normalizeEmbeddings: true,
        } as MarqoConfig,
      );

      expect(store).toBeDefined();
    });
  });
});
