/**
 * Milvus Adapter Tests
 * Comprehensive test suite for the Milvus vector store adapter
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MilvusAdapter } from "../../../src/lib/vector/adapters/MilvusAdapter.js";
import type {
  VectorRecord,
  VectorQueryOptions,
} from "../../../src/lib/vector/types.js";
import type { MilvusConfig } from "../../../src/lib/vector/adapters/MilvusAdapter.js";

// Mock Milvus client
const mockMilvusClient = {
  connect: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  createCollection: vi.fn().mockResolvedValue({ error_code: "Success" }),
  dropCollection: vi.fn().mockResolvedValue({ error_code: "Success" }),
  hasCollection: vi.fn().mockResolvedValue({ value: false }),
  listCollections: vi.fn().mockResolvedValue({ collection_names: [] }),
  describeCollection: vi.fn().mockResolvedValue({
    schema: {
      fields: [
        {
          name: "vector",
          data_type: "FloatVector",
          type_params: [{ key: "dim", value: "1536" }],
        },
      ],
    },
    collectionID: "test-collection-id",
  }),
  getCollectionStatistics: vi.fn().mockResolvedValue({
    stats: [{ key: "row_count", value: "0" }],
  }),
  createIndex: vi.fn().mockResolvedValue({ error_code: "Success" }),
  loadCollection: vi.fn().mockResolvedValue({ error_code: "Success" }),
  releaseCollection: vi.fn().mockResolvedValue({ error_code: "Success" }),
  insert: vi.fn().mockResolvedValue({
    succ_index: [0, 1],
    insert_cnt: 2,
    IDs: { id_field: { data: ["id1", "id2"] } },
  }),
  upsert: vi.fn().mockResolvedValue({
    succ_index: [0, 1],
    insert_cnt: 2,
    IDs: { id_field: { data: ["id1", "id2"] } },
  }),
  search: vi.fn().mockResolvedValue({ results: [] }),
  delete: vi.fn().mockResolvedValue({ error_code: "Success" }),
  query: vi.fn().mockResolvedValue({ data: [] }),
  createPartition: vi.fn().mockResolvedValue({ error_code: "Success" }),
  dropPartition: vi.fn().mockResolvedValue({ error_code: "Success" }),
  hasPartition: vi.fn().mockResolvedValue({ value: false }),
  listPartitions: vi.fn().mockResolvedValue({ partition_names: ["_default"] }),
  checkHealth: vi.fn().mockResolvedValue({ isHealthy: true }),
};

vi.mock("@zilliz/milvus2-sdk-node", () => ({
  MilvusClient: vi.fn(() => mockMilvusClient),
}));

describe("MilvusAdapter", () => {
  let adapter: MilvusAdapter;
  const defaultConfig: MilvusConfig = {
    address: "localhost:19530",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default mock return values after clearing
    mockMilvusClient.hasCollection.mockResolvedValue({ value: false });
    mockMilvusClient.createCollection.mockResolvedValue({ error_code: "Success" });
    mockMilvusClient.dropCollection.mockResolvedValue({ error_code: "Success" });
    mockMilvusClient.listCollections.mockResolvedValue({ collection_names: [] });
    mockMilvusClient.describeCollection.mockResolvedValue({
      schema: {
        fields: [
          {
            name: "vector",
            data_type: "FloatVector",
            type_params: [{ key: "dim", value: "1536" }],
          },
        ],
      },
      collectionID: "test-collection-id",
    });
    mockMilvusClient.getCollectionStatistics.mockResolvedValue({
      stats: [{ key: "row_count", value: "0" }],
    });
    mockMilvusClient.createIndex.mockResolvedValue({ error_code: "Success" });
    mockMilvusClient.loadCollection.mockResolvedValue({ error_code: "Success" });
    mockMilvusClient.releaseCollection.mockResolvedValue({ error_code: "Success" });
    mockMilvusClient.upsert.mockResolvedValue({
      succ_index: [0, 1],
      insert_cnt: 2,
      IDs: { id_field: { data: ["id1", "id2"] } },
    });
    mockMilvusClient.search.mockResolvedValue({ results: [] });
    mockMilvusClient.delete.mockResolvedValue({ error_code: "Success" });
    mockMilvusClient.query.mockResolvedValue({ data: [] });
    mockMilvusClient.createPartition.mockResolvedValue({ error_code: "Success" });
    mockMilvusClient.dropPartition.mockResolvedValue({ error_code: "Success" });
    mockMilvusClient.hasPartition.mockResolvedValue({ value: false });
    mockMilvusClient.listPartitions.mockResolvedValue({ partition_names: ["_default"] });
    mockMilvusClient.checkHealth.mockResolvedValue({ isHealthy: true });

    adapter = new MilvusAdapter(defaultConfig);
  });

  afterEach(async () => {
    if (adapter.isInitialized()) {
      await adapter.disconnect();
    }
  });

  describe("Constructor and Configuration", () => {
    it("should create adapter with configuration", () => {
      expect(adapter).toBeInstanceOf(MilvusAdapter);
      expect(adapter.getStoreName()).toBe("milvus");
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should accept custom configuration options", () => {
      const customConfig: MilvusConfig = {
        address: "milvus.example.com:19530",
        username: "testuser",
        password: "testpass",
        ssl: true,
        defaultIndexType: "HNSW",
        defaultIndexParams: {
          M: 32,
          efConstruction: 512,
        },
        autoIndex: true,
      };
      const customAdapter = new MilvusAdapter(customConfig);
      expect(customAdapter.getConfig()).toEqual(customConfig);
    });

    it("should accept token-based authentication", () => {
      const tokenConfig: MilvusConfig = {
        address: "cloud.zilliz.com:19530",
        token: "my-api-token",
        ssl: true,
      };
      const tokenAdapter = new MilvusAdapter(tokenConfig);
      expect(tokenAdapter.getConfig().token).toBe("my-api-token");
    });
  });

  describe("Connection Management", () => {
    it("should connect successfully", async () => {
      await adapter.connect();
      expect(adapter.isInitialized()).toBe(true);
      expect(mockMilvusClient.checkHealth).toHaveBeenCalled();
    });

    it("should not reconnect if already connected", async () => {
      await adapter.connect();
      const healthCallCount = mockMilvusClient.checkHealth.mock.calls.length;
      await adapter.connect(); // Second call should be a no-op
      expect(mockMilvusClient.checkHealth.mock.calls.length).toBe(healthCallCount);
    });

    it("should disconnect successfully", async () => {
      await adapter.connect();
      await adapter.disconnect();
      expect(adapter.isInitialized()).toBe(false);
      expect(mockMilvusClient.close).toHaveBeenCalled();
    });

    it("should handle disconnect when not connected", async () => {
      await adapter.disconnect();
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should throw error on connection failure", async () => {
      mockMilvusClient.checkHealth.mockRejectedValueOnce(new Error("Connection refused"));
      await expect(adapter.connect()).rejects.toThrow("Failed to connect to Milvus");
    });
  });

  describe("Index (Collection) Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should create a collection", async () => {
      await adapter.createIndex({
        name: "test-collection",
        dimension: 1536,
        metric: "cosine",
      });

      expect(mockMilvusClient.hasCollection).toHaveBeenCalledWith({
        collection_name: "test_collection",
      });
      expect(mockMilvusClient.createCollection).toHaveBeenCalled();
      expect(mockMilvusClient.createIndex).toHaveBeenCalled();
      expect(mockMilvusClient.loadCollection).toHaveBeenCalled();
    });

    it("should not create collection if it already exists", async () => {
      mockMilvusClient.hasCollection.mockResolvedValueOnce({ value: true });

      await adapter.createIndex({
        name: "existing-collection",
        dimension: 768,
      });

      expect(mockMilvusClient.createCollection).not.toHaveBeenCalled();
    });

    it("should create collection with different metrics", async () => {
      await adapter.createIndex({
        name: "euclidean-collection",
        dimension: 512,
        metric: "euclidean",
      });

      expect(mockMilvusClient.createIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          metric_type: "L2",
        }),
      );
    });

    it("should create collection with dot product metric", async () => {
      await adapter.createIndex({
        name: "dotproduct-collection",
        dimension: 512,
        metric: "dotProduct",
      });

      expect(mockMilvusClient.createIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          metric_type: "IP",
        }),
      );
    });

    it("should delete a collection", async () => {
      await adapter.deleteIndex("test-collection");
      expect(mockMilvusClient.dropCollection).toHaveBeenCalledWith({
        collection_name: "test_collection",
      });
    });

    it("should list collections", async () => {
      mockMilvusClient.listCollections.mockResolvedValueOnce({
        collection_names: ["collection1", "collection2"],
      });

      const collections = await adapter.listIndexes();
      expect(collections).toEqual(["collection1", "collection2"]);
    });

    it("should check if collection exists", async () => {
      mockMilvusClient.hasCollection.mockResolvedValueOnce({ value: true });
      const exists = await adapter.indexExists("test-collection");
      expect(exists).toBe(true);

      mockMilvusClient.hasCollection.mockResolvedValueOnce({ value: false });
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
      const result = await adapter.upsert("test-collection", testRecords);
      expect(result.upsertedCount).toBe(2);
      expect(mockMilvusClient.upsert).toHaveBeenCalled();
    });

    it("should upsert with namespace (partition)", async () => {
      await adapter.upsert("test-collection", testRecords, {
        namespace: "partition1",
      });

      expect(mockMilvusClient.hasPartition).toHaveBeenCalled();
      expect(mockMilvusClient.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          partition_name: "partition1",
        }),
      );
    });

    it("should validate vector dimensions", async () => {
      const invalidRecords = [
        { id: "v1", vector: [0.1, 0.2, 0.3] },
        { id: "v2", vector: [0.1, 0.2] }, // Different dimension
      ];

      await expect(
        adapter.upsert("test-collection", invalidRecords),
      ).rejects.toThrow("Inconsistent vector dimensions");
    });

    it("should handle empty records array", async () => {
      const result = await adapter.upsert("test-collection", []);
      expect(result.upsertedCount).toBe(0);
      expect(mockMilvusClient.upsert).not.toHaveBeenCalled();
    });

    it("should handle records without metadata", async () => {
      const recordsWithoutMetadata = [
        { id: "v1", vector: [0.1, 0.2, 0.3] },
        { id: "v2", vector: [0.4, 0.5, 0.6] },
      ];

      const result = await adapter.upsert("test-collection", recordsWithoutMetadata);
      expect(result.upsertedCount).toBe(2);
    });
  });

  describe("Query Operations", () => {
    const queryVector = [0.1, 0.2, 0.3];
    const mockSearchResults = {
      results: [
        {
          id: "vec-1",
          score: 0.95,
          content: "Test content",
          metadata: { category: "tech" },
        },
        {
          id: "vec-2",
          score: 0.85,
          content: "Another content",
          metadata: { category: "science" },
        },
      ],
    };

    beforeEach(async () => {
      await adapter.connect();
      mockMilvusClient.search.mockResolvedValue(mockSearchResults);
    });

    it("should query vectors", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
      };

      const results = await adapter.query("test-collection", options);
      expect(results.length).toBe(2);
      expect(results[0].id).toBe("vec-1");
      expect(results[0].score).toBe(0.95);
    });

    it("should query with metadata filter", async () => {
      const options: VectorQueryOptions<{ category: string }> = {
        vector: queryVector,
        topK: 10,
        filter: { category: "tech" },
      };

      await adapter.query("test-collection", options);

      expect(mockMilvusClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          expr: expect.stringContaining("metadata"),
        }),
      );
    });

    it("should query with minimum score", async () => {
      mockMilvusClient.search.mockResolvedValueOnce({
        results: [
          { id: "vec-1", score: 0.95 },
          { id: "vec-2", score: 0.45 }, // Below threshold
        ],
      });

      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        minScore: 0.5,
      };

      const results = await adapter.query("test-collection", options);
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("vec-1");
    });

    it("should query with namespace (partition)", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        namespace: "partition1",
      };

      await adapter.query("test-collection", options);

      expect(mockMilvusClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          partition_names: ["partition1"],
        }),
      );
    });

    it("should include vectors when requested", async () => {
      mockMilvusClient.search.mockResolvedValueOnce({
        results: [
          { id: "vec-1", score: 0.95, vector: [0.1, 0.2, 0.3] },
        ],
      });

      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        includeVectors: true,
      };

      const results = await adapter.query("test-collection", options);
      expect(results[0].vector).toEqual([0.1, 0.2, 0.3]);
    });

    it("should include metadata when requested", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        includeMetadata: true,
      };

      const results = await adapter.query("test-collection", options);
      expect(results[0].metadata).toEqual({ category: "tech" });
    });
  });

  describe("Delete Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should delete by IDs", async () => {
      const result = await adapter.delete("test-collection", {
        ids: ["vec-1", "vec-2"],
      });

      expect(mockMilvusClient.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          expr: expect.stringContaining("vec-1"),
        }),
      );
      expect(result.deletedCount).toBe(2);
    });

    it("should delete by filter", async () => {
      await adapter.delete("test-collection", {
        filter: { category: "deprecated" },
      });

      expect(mockMilvusClient.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          expr: expect.stringContaining("metadata"),
        }),
      );
    });

    it("should delete from specific partition", async () => {
      await adapter.delete("test-collection", {
        ids: ["vec-1"],
        namespace: "old-partition",
      });

      expect(mockMilvusClient.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          partition_name: "old-partition",
        }),
      );
    });

    it("should delete all records", async () => {
      mockMilvusClient.getCollectionStatistics.mockResolvedValueOnce({
        stats: [{ key: "row_count", value: "100" }],
      });

      const result = await adapter.delete("test-collection", {
        deleteAll: true,
      });

      expect(mockMilvusClient.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          expr: expect.stringContaining('!= ""'),
        }),
      );
    });

    it("should delete all in namespace via partition drop/recreate", async () => {
      await adapter.delete("test-collection", {
        deleteAll: true,
        namespace: "to-clear",
      });

      expect(mockMilvusClient.dropPartition).toHaveBeenCalledWith({
        collection_name: "test_collection",
        partition_name: "to-clear",
      });
      expect(mockMilvusClient.createPartition).toHaveBeenCalledWith({
        collection_name: "test_collection",
        partition_name: "to-clear",
      });
    });
  });

  describe("Statistics", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should get collection statistics", async () => {
      mockMilvusClient.getCollectionStatistics.mockResolvedValueOnce({
        stats: [{ key: "row_count", value: "1000" }],
      });
      mockMilvusClient.listPartitions.mockResolvedValueOnce({
        partition_names: ["_default", "partition1", "partition2"],
      });

      const stats = await adapter.getStats("test-collection");

      expect(stats.vectorCount).toBe(1000);
      expect(stats.dimension).toBe(1536); // From mock describeCollection
      expect(stats.namespaceCount).toBe(3);
    });
  });

  describe("Health Check", () => {
    it("should return healthy status when connected", async () => {
      await adapter.connect();

      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.status).toBe("connected");
      expect(health.latencyMs).toBeGreaterThanOrEqual(0);
      expect(health.lastChecked).toBeInstanceOf(Date);
    });

    it("should return disconnected status when not connected", async () => {
      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.status).toBe("disconnected");
    });

    it("should return degraded status when health check fails", async () => {
      await adapter.connect();
      mockMilvusClient.checkHealth.mockResolvedValueOnce({ isHealthy: false });

      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.status).toBe("degraded");
    });

    it("should return error status on exception", async () => {
      await adapter.connect();
      mockMilvusClient.checkHealth.mockRejectedValueOnce(new Error("Health check failed"));

      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.status).toBe("error");
      expect(health.error).toContain("Health check failed");
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
      mockMilvusClient.upsert.mockResolvedValue({
        insert_cnt: 100,
        succ_index: Array.from({ length: 100 }, (_, i) => i),
      });

      const result = await adapter.batchUpsert("test-collection", manyRecords, {
        batchSize: 100,
      });

      // Should be called 3 times (100 + 100 + 50)
      expect(mockMilvusClient.upsert).toHaveBeenCalledTimes(3);
      expect(result.upsertedCount).toBe(300); // 100 * 3 from mock
    });

    it("should batch delete large ID lists", async () => {
      const ids = manyRecords.map((r) => r.id);

      const result = await adapter.batchDelete("test-collection", ids, {
        batchSize: 100,
      });

      // Should be called 3 times
      expect(mockMilvusClient.delete).toHaveBeenCalledTimes(3);
    });
  });

  describe("Partition Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should create a partition", async () => {
      await adapter.createPartition("test-collection", "new-partition");

      expect(mockMilvusClient.createPartition).toHaveBeenCalledWith({
        collection_name: "test_collection",
        partition_name: "new-partition",
      });
    });

    it("should delete a partition", async () => {
      await adapter.deletePartition("test-collection", "old-partition");

      expect(mockMilvusClient.dropPartition).toHaveBeenCalledWith({
        collection_name: "test_collection",
        partition_name: "old-partition",
      });
    });

    it("should list partitions", async () => {
      mockMilvusClient.listPartitions.mockResolvedValueOnce({
        partition_names: ["_default", "partition1", "partition2"],
      });

      const partitions = await adapter.listPartitions("test-collection");

      expect(partitions).toEqual(["_default", "partition1", "partition2"]);
    });
  });

  describe("Collection Memory Management", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should load collection into memory", async () => {
      await adapter.loadCollection("test-collection");

      expect(mockMilvusClient.loadCollection).toHaveBeenCalledWith({
        collection_name: "test_collection",
      });
    });

    it("should release collection from memory", async () => {
      await adapter.releaseCollection("test-collection");

      expect(mockMilvusClient.releaseCollection).toHaveBeenCalledWith({
        collection_name: "test_collection",
      });
    });
  });

  describe("Filter Translation", () => {
    beforeEach(async () => {
      await adapter.connect();
      mockMilvusClient.search.mockResolvedValue({ results: [] });
    });

    it("should translate simple equality filter", async () => {
      await adapter.query("test-collection", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { category: "tech" },
      });

      expect(mockMilvusClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          expr: expect.stringContaining('metadata["category"] == "tech"'),
        }),
      );
    });

    it("should translate comparison operators", async () => {
      await adapter.query("test-collection", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { price: { $gte: 100, $lte: 500 } },
      });

      const callArgs = mockMilvusClient.search.mock.calls[0][0];
      expect(callArgs.expr).toContain(">=");
      expect(callArgs.expr).toContain("<=");
    });

    it("should translate logical $and operator", async () => {
      await adapter.query("test-collection", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $and: [{ category: "tech" }, { status: "active" }],
        },
      });

      const callArgs = mockMilvusClient.search.mock.calls[0][0];
      expect(callArgs.expr).toContain(" and ");
    });

    it("should translate logical $or operator", async () => {
      await adapter.query("test-collection", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $or: [{ category: "tech" }, { category: "science" }],
        },
      });

      const callArgs = mockMilvusClient.search.mock.calls[0][0];
      expect(callArgs.expr).toContain(" or ");
    });

    it("should translate $not operator", async () => {
      await adapter.query("test-collection", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $not: { category: "spam" },
        },
      });

      const callArgs = mockMilvusClient.search.mock.calls[0][0];
      expect(callArgs.expr).toContain("not ");
    });

    it("should translate $in operator", async () => {
      await adapter.query("test-collection", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          status: { $in: ["active", "pending"] },
        },
      });

      const callArgs = mockMilvusClient.search.mock.calls[0][0];
      expect(callArgs.expr).toContain(" in [");
    });

    it("should translate $nin operator", async () => {
      await adapter.query("test-collection", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          status: { $nin: ["deleted", "archived"] },
        },
      });

      const callArgs = mockMilvusClient.search.mock.calls[0][0];
      expect(callArgs.expr).toContain("not in [");
    });

    it("should translate string operators", async () => {
      await adapter.query("test-collection", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          title: { $contains: "vector" },
        },
      });

      const callArgs = mockMilvusClient.search.mock.calls[0][0];
      expect(callArgs.expr).toContain('like "%vector%"');
    });

    it("should translate $startsWith operator", async () => {
      await adapter.query("test-collection", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          title: { $startsWith: "intro" },
        },
      });

      const callArgs = mockMilvusClient.search.mock.calls[0][0];
      expect(callArgs.expr).toContain('like "intro%"');
    });

    it("should translate $endsWith operator", async () => {
      await adapter.query("test-collection", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          title: { $endsWith: ".txt" },
        },
      });

      const callArgs = mockMilvusClient.search.mock.calls[0][0];
      expect(callArgs.expr).toContain('like "%.txt"');
    });

    it("should translate $exists operator", async () => {
      await adapter.query("test-collection", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          optional_field: { $exists: true },
        },
      });

      const callArgs = mockMilvusClient.search.mock.calls[0][0];
      expect(callArgs.expr).toContain("!= null");
    });
  });

  describe("Error Handling", () => {
    it("should throw when operating without connection", async () => {
      await expect(adapter.listIndexes()).rejects.toThrow(
        "not initialized. Call connect() first",
      );
    });

    it("should throw when creating collection fails", async () => {
      await adapter.connect();
      mockMilvusClient.createCollection.mockRejectedValueOnce(
        new Error("Collection creation failed"),
      );

      await expect(
        adapter.createIndex({ name: "test", dimension: 128 }),
      ).rejects.toThrow("Failed to create collection");
    });

    it("should throw when deleting collection fails", async () => {
      await adapter.connect();
      mockMilvusClient.releaseCollection.mockResolvedValueOnce({});
      mockMilvusClient.dropCollection.mockRejectedValueOnce(
        new Error("Drop failed"),
      );

      await expect(adapter.deleteIndex("test")).rejects.toThrow(
        "Failed to delete collection",
      );
    });

    it("should throw when upsert fails", async () => {
      await adapter.connect();
      mockMilvusClient.upsert.mockRejectedValueOnce(new Error("Insert error"));

      await expect(
        adapter.upsert("test", [{ id: "1", vector: [0.1] }]),
      ).rejects.toThrow("Failed to upsert");
    });

    it("should throw when query fails", async () => {
      await adapter.connect();
      mockMilvusClient.search.mockRejectedValueOnce(new Error("Search error"));

      await expect(
        adapter.query("test", { vector: [0.1], topK: 10 }),
      ).rejects.toThrow("Failed to query");
    });

    it("should throw when delete fails", async () => {
      await adapter.connect();
      mockMilvusClient.delete.mockRejectedValueOnce(new Error("Delete error"));

      await expect(
        adapter.delete("test", { ids: ["1"] }),
      ).rejects.toThrow("Failed to delete");
    });

    it("should throw when getting stats fails", async () => {
      await adapter.connect();
      mockMilvusClient.getCollectionStatistics.mockRejectedValueOnce(
        new Error("Stats error"),
      );

      await expect(adapter.getStats("test")).rejects.toThrow(
        "Failed to get stats",
      );
    });

    it("should throw when partition operations fail", async () => {
      await adapter.connect();
      mockMilvusClient.createPartition.mockRejectedValueOnce(
        new Error("Partition error"),
      );

      await expect(
        adapter.createPartition("test", "new-partition"),
      ).rejects.toThrow("Failed to create partition");
    });
  });

  describe("Collection Name Sanitization", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should sanitize collection names with special characters", async () => {
      await adapter.createIndex({
        name: "test-collection-with.dots",
        dimension: 128,
      });

      expect(mockMilvusClient.hasCollection).toHaveBeenCalledWith({
        collection_name: "test_collection_with_dots",
      });
    });

    it("should handle collection names starting with numbers", async () => {
      await adapter.createIndex({
        name: "123-collection",
        dimension: 128,
      });

      expect(mockMilvusClient.hasCollection).toHaveBeenCalledWith({
        collection_name: "_123_collection",
      });
    });
  });
});

describe("MilvusAdapter Integration", () => {
  // These tests require a running Milvus instance
  // Skip if not available

  it.skip("should work with real Milvus instance", async () => {
    // This test would use a real Milvus connection
    // Requires Milvus to be running (e.g., docker-compose up)
    const adapter = new MilvusAdapter({
      address: "localhost:19530",
    });

    await adapter.connect();

    // Create collection
    await adapter.createIndex({
      name: "integration-test",
      dimension: 128,
      metric: "cosine",
    });

    // Insert vectors
    const records = Array.from({ length: 10 }, (_, i) => ({
      id: `vec-${i}`,
      vector: Array.from({ length: 128 }, () => Math.random()),
      metadata: { index: i },
      content: `Content ${i}`,
    }));

    await adapter.upsert("integration-test", records);

    // Query
    const queryVector = records[0].vector;
    const results = await adapter.query("integration-test", {
      vector: queryVector,
      topK: 5,
      includeMetadata: true,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("vec-0"); // Should be the same vector

    // Cleanup
    await adapter.deleteIndex("integration-test");
    await adapter.disconnect();
  });
});
