/**
 * MongoDB Atlas Vector Search Adapter Tests
 * Comprehensive test suite for the MongoDB Atlas vector store adapter
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MongoDBAtlasAdapter } from "../../../src/lib/vector/adapters/MongoDBAtlasAdapter.js";
import type {
  VectorRecord,
  VectorQueryOptions,
} from "../../../src/lib/vector/types.js";
import type { MongoDBAtlasConfig } from "../../../src/lib/vector/adapters/MongoDBAtlasAdapter.js";

// Mock MongoDB driver
const mockCollection = {
  insertMany: vi.fn(),
  bulkWrite: vi.fn(() => ({ upsertedCount: 1, modifiedCount: 1 })),
  find: vi.fn(() => ({ toArray: vi.fn(() => []) })),
  deleteMany: vi.fn(() => ({ deletedCount: 0 })),
  countDocuments: vi.fn(() => 0),
  aggregate: vi.fn(() => ({ toArray: vi.fn(() => []) })),
  createSearchIndex: vi.fn(() => "index-id"),
  dropSearchIndex: vi.fn(),
  listSearchIndexes: vi.fn(() => ({ toArray: vi.fn(() => []) })),
};

const mockAdmin = {
  ping: vi.fn(() => ({ ok: 1 })),
};

const mockDb = {
  collection: vi.fn(() => mockCollection),
  listCollections: vi.fn(() => ({ toArray: vi.fn(() => []) })),
  createCollection: vi.fn(() => mockCollection),
  dropCollection: vi.fn(() => true),
  admin: vi.fn(() => mockAdmin),
};

const mockClient = {
  connect: vi.fn(),
  close: vi.fn(),
  db: vi.fn(() => mockDb),
};

vi.mock("mongodb", () => ({
  MongoClient: vi.fn(() => mockClient),
}));

describe("MongoDBAtlasAdapter", () => {
  let adapter: MongoDBAtlasAdapter;
  const defaultConfig: MongoDBAtlasConfig = {
    connectionUri: "mongodb+srv://user:pass@cluster.mongodb.net",
    databaseName: "test_db",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock implementations
    mockCollection.bulkWrite.mockReturnValue({
      upsertedCount: 1,
      modifiedCount: 1,
    });
    mockCollection.find.mockReturnValue({
      toArray: vi.fn(() => []),
    });
    mockCollection.deleteMany.mockReturnValue({ deletedCount: 0 });
    mockCollection.countDocuments.mockReturnValue(0);
    mockCollection.aggregate.mockReturnValue({
      toArray: vi.fn(() => []),
    });
    mockDb.listCollections.mockReturnValue({
      toArray: vi.fn(() => []),
    });

    adapter = new MongoDBAtlasAdapter(defaultConfig);
  });

  afterEach(async () => {
    if (adapter.isInitialized()) {
      await adapter.disconnect();
    }
  });

  describe("Constructor and Configuration", () => {
    it("should create adapter with configuration", () => {
      expect(adapter).toBeInstanceOf(MongoDBAtlasAdapter);
      expect(adapter.getStoreName()).toBe("mongodb");
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should accept custom configuration options", () => {
      const customConfig: MongoDBAtlasConfig = {
        connectionUri: "mongodb+srv://custom@cluster.mongodb.net",
        databaseName: "custom_db",
        defaultCollection: "vectors",
        indexPrefix: "custom_index",
        connectionTimeout: 60000,
        socketTimeout: 60000,
        maxPoolSize: 20,
        minPoolSize: 5,
        writeConcern: "w1",
        readPreference: "secondary",
        retryWrites: false,
      };
      const customAdapter = new MongoDBAtlasAdapter(customConfig);
      expect(customAdapter.getConfig()).toEqual(customConfig);
    });
  });

  describe("Connection Management", () => {
    it("should connect successfully", async () => {
      await adapter.connect();
      expect(adapter.isInitialized()).toBe(true);
      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockAdmin.ping).toHaveBeenCalled();
    });

    it("should not reconnect if already connected", async () => {
      await adapter.connect();
      await adapter.connect(); // Second call should be a no-op
      expect(adapter.isInitialized()).toBe(true);
      expect(mockClient.connect).toHaveBeenCalledTimes(1);
    });

    it("should disconnect successfully", async () => {
      await adapter.connect();
      await adapter.disconnect();
      expect(adapter.isInitialized()).toBe(false);
      expect(mockClient.close).toHaveBeenCalled();
    });

    it("should handle disconnect when not connected", async () => {
      // Should not throw
      await adapter.disconnect();
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should throw on connection failure", async () => {
      mockClient.connect.mockRejectedValueOnce(new Error("Connection failed"));

      await expect(adapter.connect()).rejects.toThrow(
        "Failed to connect to MongoDB Atlas: Connection failed",
      );
    });
  });

  describe("Index Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should create an index", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 1536,
        metric: "cosine",
      });

      expect(mockDb.createCollection).toHaveBeenCalled();
      expect(mockCollection.createSearchIndex).toHaveBeenCalled();
      expect(mockCollection.bulkWrite).toHaveBeenCalled(); // For storing metadata
    });

    it("should create index with default metric", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 768,
      });

      // Check that the search index was created with cosine similarity
      expect(mockCollection.createSearchIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          definition: expect.objectContaining({
            mappings: expect.objectContaining({
              fields: expect.objectContaining({
                vector: expect.objectContaining({
                  similarity: "cosine",
                }),
              }),
            }),
          }),
        }),
      );
    });

    it("should handle existing collection", async () => {
      mockDb.listCollections.mockReturnValueOnce({
        toArray: vi.fn(() => [{ name: "vectors_test_index" }]),
      });

      await adapter.createIndex({
        name: "test-index",
        dimension: 1536,
      });

      expect(mockDb.createCollection).not.toHaveBeenCalled();
    });

    it("should delete an index", async () => {
      // First create an index to populate the cache
      await adapter.createIndex({
        name: "test-index",
        dimension: 1536,
      });

      await adapter.deleteIndex("test-index");
      expect(mockCollection.dropSearchIndex).toHaveBeenCalled();
      expect(mockDb.dropCollection).toHaveBeenCalled();
    });

    it("should list indexes", async () => {
      mockCollection.find.mockReturnValueOnce({
        toArray: vi.fn(() => [{ name: "index1" }, { name: "index2" }]),
      });

      const indexes = await adapter.listIndexes();
      expect(indexes).toEqual(["index1", "index2"]);
    });

    it("should check if index exists", async () => {
      // Create index to add to cache
      await adapter.createIndex({
        name: "test-index",
        dimension: 1536,
      });

      const exists = await adapter.indexExists("test-index");
      expect(exists).toBe(true);

      mockCollection.countDocuments.mockReturnValueOnce(0);
      const notExists = await adapter.indexExists("nonexistent");
      expect(notExists).toBe(false);
    });
  });

  describe("Upsert Operations", () => {
    const testRecords: VectorRecord<{ category: string }>[] = [
      {
        id: "vec-1",
        vector: [0.1, 0.2, 0.3],
        metadata: { category: "tech" },
        content: "Test content 1",
      },
      {
        id: "vec-2",
        vector: [0.4, 0.5, 0.6],
        metadata: { category: "science" },
        content: "Test content 2",
      },
    ];

    beforeEach(async () => {
      await adapter.connect();
    });

    it("should upsert records", async () => {
      mockCollection.bulkWrite.mockReturnValueOnce({
        upsertedCount: 1,
        modifiedCount: 1,
      });

      const result = await adapter.upsert("test-index", testRecords);
      expect(result.upsertedCount).toBe(2);
      expect(mockCollection.bulkWrite).toHaveBeenCalled();
    });

    it("should upsert with namespace", async () => {
      mockCollection.bulkWrite.mockReturnValueOnce({
        upsertedCount: 2,
        modifiedCount: 0,
      });

      const result = await adapter.upsert("test-index", testRecords, {
        namespace: "ns1",
      });
      expect(result.upsertedCount).toBe(2);
    });

    it("should validate vector dimensions", async () => {
      const invalidRecords = [
        { id: "v1", vector: [0.1, 0.2, 0.3] },
        { id: "v2", vector: [0.1, 0.2] }, // Different dimension
      ];

      await expect(adapter.upsert("test-index", invalidRecords)).rejects.toThrow(
        "Inconsistent vector dimensions",
      );
    });

    it("should handle empty records array", async () => {
      const result = await adapter.upsert("test-index", []);
      expect(result.upsertedCount).toBe(0);
    });
  });

  describe("Query Operations", () => {
    const queryVector = [0.1, 0.2, 0.3];
    const mockResults = [
      {
        _id: "vec-1",
        vector: [0.1, 0.2, 0.3],
        metadata: { category: "tech" },
        content: "Test content",
        score: 0.95,
      },
    ];

    beforeEach(async () => {
      await adapter.connect();
      mockCollection.aggregate.mockReturnValue({
        toArray: vi.fn(() => mockResults),
      });
    });

    it("should query vectors using $vectorSearch", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
      };

      const results = await adapter.query("test-index", options);
      expect(Array.isArray(results)).toBe(true);
      expect(mockCollection.aggregate).toHaveBeenCalled();

      // Verify $vectorSearch is in the pipeline
      const pipeline = mockCollection.aggregate.mock.calls[0][0];
      expect(pipeline[0]).toHaveProperty("$vectorSearch");
    });

    it("should query with metadata filter (pre-filter)", async () => {
      const options: VectorQueryOptions<{ category: string }> = {
        vector: queryVector,
        topK: 10,
        filter: { category: "tech" },
      };

      const results = await adapter.query("test-index", options);
      expect(Array.isArray(results)).toBe(true);

      // Verify filter is passed to $vectorSearch
      const pipeline = mockCollection.aggregate.mock.calls[0][0];
      expect(pipeline[0].$vectorSearch).toHaveProperty("filter");
    });

    it("should query with minimum score", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        minScore: 0.5,
      };

      const results = await adapter.query("test-index", options);
      expect(Array.isArray(results)).toBe(true);

      // Verify $match stage for minScore is in pipeline
      const pipeline = mockCollection.aggregate.mock.calls[0][0];
      const matchStage = pipeline.find(
        (stage: Record<string, unknown>) => stage.$match,
      );
      expect(matchStage).toBeDefined();
    });

    it("should query with namespace filter", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        namespace: "ns1",
      };

      const results = await adapter.query("test-index", options);
      expect(Array.isArray(results)).toBe(true);
    });

    it("should include vectors when requested", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        includeVectors: true,
      };

      const results = await adapter.query("test-index", options);
      expect(results[0].vector).toBeDefined();
    });

    it("should include metadata when requested", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        includeMetadata: true,
      };

      const results = await adapter.query("test-index", options);
      expect(results[0].metadata).toBeDefined();
    });

    it("should handle $vectorSearch errors gracefully", async () => {
      mockCollection.aggregate.mockReturnValueOnce({
        toArray: vi.fn(() => {
          throw new Error("$vectorSearch requires Atlas Search index");
        }),
      });

      await expect(
        adapter.query("test-index", { vector: queryVector, topK: 10 }),
      ).rejects.toThrow("Atlas Search index");
    });
  });

  describe("Delete Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
      mockCollection.deleteMany.mockReturnValue({ deletedCount: 2 });
    });

    it("should delete by IDs", async () => {
      const result = await adapter.delete("test-index", {
        ids: ["vec-1", "vec-2"],
      });
      expect(result.deletedCount).toBe(2);

      // Verify $in is used for IDs
      const filter = mockCollection.deleteMany.mock.calls[0][0];
      expect(filter._id.$in).toEqual(["vec-1", "vec-2"]);
    });

    it("should delete by filter", async () => {
      const result = await adapter.delete("test-index", {
        filter: { category: "deprecated" },
      });
      expect(result.deletedCount).toBe(2);
    });

    it("should delete by namespace", async () => {
      const result = await adapter.delete("test-index", {
        namespace: "old-data",
        deleteAll: true,
      });
      expect(result.deletedCount).toBe(2);

      // Verify namespace filter
      const filter = mockCollection.deleteMany.mock.calls[0][0];
      expect(filter.namespace).toBe("old-data");
    });

    it("should delete all records", async () => {
      const result = await adapter.delete("test-index", {
        deleteAll: true,
      });
      expect(result.deletedCount).toBe(2);

      // Verify empty filter for delete all
      const filter = mockCollection.deleteMany.mock.calls[0][0];
      expect(Object.keys(filter).length).toBe(0);
    });
  });

  describe("Statistics", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should get index statistics", async () => {
      mockCollection.countDocuments.mockReturnValueOnce(100);
      mockCollection.aggregate.mockReturnValueOnce({
        toArray: vi.fn(() => [{ count: 3 }]),
      });

      // Create index first to populate metadata
      await adapter.createIndex({
        name: "test-index",
        dimension: 1536,
        metric: "cosine",
      });

      const stats = await adapter.getStats("test-index");
      expect(stats.vectorCount).toBe(100);
      expect(stats.namespaceCount).toBe(3);
      expect(stats.dimension).toBe(1536);
    });
  });

  describe("Health Check", () => {
    it("should return healthy status when connected", async () => {
      await adapter.connect();
      mockCollection.find.mockReturnValueOnce({
        toArray: vi.fn(() => [{ name: "index1" }]),
      });

      const health = await adapter.healthCheck();
      expect(health.healthy).toBe(true);
      expect(health.status).toBe("connected");
      expect(health.latencyMs).toBeGreaterThanOrEqual(0);
      expect(health.lastChecked).toBeInstanceOf(Date);
    });

    it("should return error status when not connected", async () => {
      // Don't connect, just try health check
      const health = await adapter.healthCheck();
      expect(health.healthy).toBe(false);
      expect(health.status).toBe("error");
    });
  });

  describe("Batch Operations", () => {
    const manyRecords = Array.from({ length: 250 }, (_, i) => ({
      id: `vec-${i}`,
      vector: [0.1, 0.2, 0.3],
      metadata: { index: i },
    }));

    beforeEach(async () => {
      await adapter.connect();
    });

    it("should batch upsert large datasets", async () => {
      mockCollection.bulkWrite.mockReturnValue({
        upsertedCount: 100,
        modifiedCount: 0,
      });

      const result = await adapter.batchUpsert("test-index", manyRecords, {
        batchSize: 100,
      });
      expect(result.upsertedCount).toBe(300); // 3 batches * 100
    });

    it("should batch delete large ID lists", async () => {
      const ids = manyRecords.map((r) => r.id);
      mockCollection.deleteMany.mockReturnValue({ deletedCount: 100 });

      const result = await adapter.batchDelete("test-index", ids, {
        batchSize: 100,
      });
      // 3 batches of 100, 100, 50
      expect(result.deletedCount).toBe(300); // 3 * 100 changes per batch
    });
  });

  describe("Filter Translation (MQL)", () => {
    beforeEach(async () => {
      await adapter.connect();
      mockCollection.aggregate.mockReturnValue({
        toArray: vi.fn(() => []),
      });
    });

    it("should translate simple equality filter", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { category: "tech" },
      });

      const pipeline = mockCollection.aggregate.mock.calls[0][0];
      const filter = pipeline[0].$vectorSearch.filter;
      expect(filter["metadata.category"]).toBe("tech");
    });

    it("should translate comparison operators", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { price: { $gte: 100, $lte: 500 } },
      });

      const pipeline = mockCollection.aggregate.mock.calls[0][0];
      expect(pipeline[0].$vectorSearch.filter).toBeDefined();
    });

    it("should translate logical $and operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $and: [{ category: "tech" }, { status: "active" }],
        },
      });

      const pipeline = mockCollection.aggregate.mock.calls[0][0];
      const filter = pipeline[0].$vectorSearch.filter;
      expect(filter.$and).toBeDefined();
    });

    it("should translate logical $or operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $or: [{ category: "tech" }, { category: "science" }],
        },
      });

      const pipeline = mockCollection.aggregate.mock.calls[0][0];
      const filter = pipeline[0].$vectorSearch.filter;
      expect(filter.$or).toBeDefined();
    });

    it("should translate $not operator using $nor", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $not: { category: "spam" },
        },
      });

      const pipeline = mockCollection.aggregate.mock.calls[0][0];
      const filter = pipeline[0].$vectorSearch.filter;
      expect(filter.$nor).toBeDefined();
    });

    it("should translate $in operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          status: { $in: ["active", "pending"] },
        },
      });

      const pipeline = mockCollection.aggregate.mock.calls[0][0];
      const filter = pipeline[0].$vectorSearch.filter;
      expect(filter["metadata.status"].$in).toEqual(["active", "pending"]);
    });

    it("should translate string operators using $regex", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          title: { $contains: "vector" },
        },
      });

      const pipeline = mockCollection.aggregate.mock.calls[0][0];
      const filter = pipeline[0].$vectorSearch.filter;
      expect(filter["metadata.title"].$regex).toBeDefined();
    });

    it("should translate $exists operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          optional_field: { $exists: true },
        },
      });

      const pipeline = mockCollection.aggregate.mock.calls[0][0];
      const filter = pipeline[0].$vectorSearch.filter;
      expect(filter["metadata.optional_field"].$exists).toBe(true);
    });

    it("should translate $startsWith operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          name: { $startsWith: "test" },
        },
      });

      const pipeline = mockCollection.aggregate.mock.calls[0][0];
      const filter = pipeline[0].$vectorSearch.filter;
      expect(filter["metadata.name"].$regex).toMatch(/^\^/);
    });

    it("should translate $endsWith operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          name: { $endsWith: ".txt" },
        },
      });

      const pipeline = mockCollection.aggregate.mock.calls[0][0];
      const filter = pipeline[0].$vectorSearch.filter;
      expect(filter["metadata.name"].$regex).toMatch(/\$$/);
    });
  });

  describe("Error Handling", () => {
    it("should throw when operating without connection", async () => {
      await expect(adapter.listIndexes()).rejects.toThrow(
        "not initialized. Call connect() first",
      );
    });

    it("should throw when creating index fails", async () => {
      await adapter.connect();
      mockDb.createCollection.mockRejectedValueOnce(new Error("DB error"));

      await expect(
        adapter.createIndex({ name: "test", dimension: 128 }),
      ).rejects.toThrow("Failed to create index");
    });

    it("should throw when deleting index fails", async () => {
      await adapter.connect();

      // Create index first
      await adapter.createIndex({ name: "test", dimension: 128 });

      mockDb.dropCollection.mockRejectedValueOnce(new Error("Drop error"));

      await expect(adapter.deleteIndex("test")).rejects.toThrow(
        "Failed to delete index",
      );
    });

    it("should throw when upsert fails", async () => {
      await adapter.connect();
      mockCollection.bulkWrite.mockRejectedValueOnce(new Error("Insert error"));

      await expect(
        adapter.upsert("test", [{ id: "1", vector: [0.1] }]),
      ).rejects.toThrow("Failed to upsert");
    });

    it("should throw when query fails", async () => {
      await adapter.connect();
      mockCollection.aggregate.mockReturnValueOnce({
        toArray: vi.fn().mockRejectedValueOnce(new Error("Query error")),
      });

      await expect(
        adapter.query("test", { vector: [0.1], topK: 10 }),
      ).rejects.toThrow("Failed to query");
    });

    it("should throw when delete fails", async () => {
      await adapter.connect();
      mockCollection.deleteMany.mockRejectedValueOnce(new Error("Delete error"));

      await expect(adapter.delete("test", { ids: ["1"] })).rejects.toThrow(
        "Failed to delete",
      );
    });

    it("should throw when getting stats fails", async () => {
      await adapter.connect();
      mockCollection.countDocuments.mockRejectedValueOnce(
        new Error("Stats error"),
      );

      await expect(adapter.getStats("test")).rejects.toThrow(
        "Failed to get stats",
      );
    });
  });

  describe("Atlas Search Index Mapping", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should create index with cosine similarity", async () => {
      await adapter.createIndex({
        name: "test-cosine",
        dimension: 1536,
        metric: "cosine",
      });

      expect(mockCollection.createSearchIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          definition: expect.objectContaining({
            mappings: expect.objectContaining({
              fields: expect.objectContaining({
                vector: expect.objectContaining({
                  similarity: "cosine",
                }),
              }),
            }),
          }),
        }),
      );
    });

    it("should create index with euclidean similarity", async () => {
      await adapter.createIndex({
        name: "test-euclidean",
        dimension: 768,
        metric: "euclidean",
      });

      expect(mockCollection.createSearchIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          definition: expect.objectContaining({
            mappings: expect.objectContaining({
              fields: expect.objectContaining({
                vector: expect.objectContaining({
                  similarity: "euclidean",
                }),
              }),
            }),
          }),
        }),
      );
    });

    it("should create index with dotProduct similarity", async () => {
      await adapter.createIndex({
        name: "test-dot",
        dimension: 384,
        metric: "dotProduct",
      });

      expect(mockCollection.createSearchIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          definition: expect.objectContaining({
            mappings: expect.objectContaining({
              fields: expect.objectContaining({
                vector: expect.objectContaining({
                  similarity: "dotProduct",
                }),
              }),
            }),
          }),
        }),
      );
    });

    it("should handle missing createSearchIndex method", async () => {
      // Simulate old driver without createSearchIndex
      const collectionWithoutSearch = { ...mockCollection };
      delete collectionWithoutSearch.createSearchIndex;
      mockDb.collection.mockReturnValueOnce(collectionWithoutSearch);
      mockDb.collection.mockReturnValueOnce(mockCollection);

      // Should not throw
      await adapter.createIndex({
        name: "test-no-search",
        dimension: 1536,
      });
    });
  });

  describe("$vectorSearch Pipeline", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should build correct $vectorSearch pipeline structure", async () => {
      mockCollection.aggregate.mockReturnValue({
        toArray: vi.fn(() => []),
      });

      await adapter.query("test-index", {
        vector: [0.1, 0.2, 0.3],
        topK: 5,
      });

      const pipeline = mockCollection.aggregate.mock.calls[0][0];

      // First stage must be $vectorSearch
      expect(pipeline[0]).toHaveProperty("$vectorSearch");
      const vectorSearch = pipeline[0].$vectorSearch;

      // Check required fields
      expect(vectorSearch.path).toBe("vector");
      expect(vectorSearch.queryVector).toEqual([0.1, 0.2, 0.3]);
      expect(vectorSearch.numCandidates).toBeGreaterThanOrEqual(50);
      expect(vectorSearch.limit).toBe(5);
    });

    it("should include numCandidates for better recall", async () => {
      mockCollection.aggregate.mockReturnValue({
        toArray: vi.fn(() => []),
      });

      await adapter.query("test-index", {
        vector: [0.1, 0.2, 0.3],
        topK: 10,
      });

      const pipeline = mockCollection.aggregate.mock.calls[0][0];
      const vectorSearch = pipeline[0].$vectorSearch;

      // numCandidates should be at least 10x topK for better recall
      expect(vectorSearch.numCandidates).toBeGreaterThanOrEqual(100);
    });

    it("should add $addFields for vectorSearchScore", async () => {
      mockCollection.aggregate.mockReturnValue({
        toArray: vi.fn(() => []),
      });

      await adapter.query("test-index", {
        vector: [0.1, 0.2, 0.3],
        topK: 5,
      });

      const pipeline = mockCollection.aggregate.mock.calls[0][0];

      // Find $addFields stage
      const addFieldsStage = pipeline.find(
        (stage: Record<string, unknown>) => stage.$addFields,
      );
      expect(addFieldsStage).toBeDefined();
      expect(addFieldsStage.$addFields.score).toEqual({
        $meta: "vectorSearchScore",
      });
    });

    it("should add $project for field selection", async () => {
      mockCollection.aggregate.mockReturnValue({
        toArray: vi.fn(() => []),
      });

      await adapter.query("test-index", {
        vector: [0.1, 0.2, 0.3],
        topK: 5,
        includeVectors: false,
        includeMetadata: false,
      });

      const pipeline = mockCollection.aggregate.mock.calls[0][0];

      // Find $project stage
      const projectStage = pipeline.find(
        (stage: Record<string, unknown>) => stage.$project,
      );
      expect(projectStage).toBeDefined();
      expect(projectStage.$project._id).toBe(1);
      expect(projectStage.$project.score).toBe(1);
    });
  });
});

describe("MongoDBAtlasAdapter Integration", () => {
  // These tests require a real MongoDB Atlas instance
  // Skip if not available

  it.skip("should work with real MongoDB Atlas cluster", async () => {
    // This test would use a real MongoDB Atlas connection
    // Requires MONGODB_URI environment variable
  });

  it.skip("should perform actual vector search", async () => {
    // This test would perform actual $vectorSearch
    // Requires MongoDB Atlas M10+ with Vector Search enabled
  });
});
