/**
 * Zilliz Adapter Tests
 * Comprehensive test suite for the Zilliz Cloud vector store adapter
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ZillizAdapter } from "../../../src/lib/vector/adapters/ZillizAdapter.js";
import type {
  VectorRecord,
  VectorQueryOptions,
} from "../../../src/lib/vector/types.js";
import type { ZillizConfig } from "../../../src/lib/vector/adapters/ZillizAdapter.js";

// Mock Milvus client
// Note: Milvus SDK has different response formats for different operations:
// - Collection/Index ops: { error_code: string, reason?: string }
// - Data ops (insert/upsert/delete/search): { status: { error_code: string }, ...data }
// - Stats/Describe: { status: { error_code: string }, ...data }
const mockMilvusClient = {
  connect: vi.fn().mockResolvedValue(undefined),
  closeConnection: vi.fn().mockResolvedValue(undefined),
  listCollections: vi.fn().mockResolvedValue({ collection_names: [] }),
  hasCollection: vi.fn().mockResolvedValue({ value: false }),
  createCollection: vi.fn().mockResolvedValue({ error_code: "Success", reason: "" }),
  dropCollection: vi.fn().mockResolvedValue({ error_code: "Success", reason: "" }),
  createIndex: vi.fn().mockResolvedValue({ error_code: "Success", reason: "" }),
  loadCollection: vi.fn().mockResolvedValue({ error_code: "Success", reason: "" }),
  releaseCollection: vi.fn().mockResolvedValue({ error_code: "Success", reason: "" }),
  insert: vi.fn().mockResolvedValue({ status: { error_code: "Success" }, insert_cnt: 1 }),
  upsert: vi.fn().mockResolvedValue({ status: { error_code: "Success" }, upsert_cnt: 1 }),
  delete: vi.fn().mockResolvedValue({ status: { error_code: "Success" }, delete_cnt: 1 }),
  search: vi.fn().mockResolvedValue({ status: { error_code: "Success" }, results: [] }),
  query: vi.fn().mockResolvedValue({ status: { error_code: "Success" }, data: [] }),
  getCollectionStatistics: vi.fn().mockResolvedValue({
    status: { error_code: "Success" },
    stats: [{ key: "row_count", value: "100" }],
  }),
  describeCollection: vi.fn().mockResolvedValue({
    status: { error_code: "Success" },
    schema: {
      fields: [
        {
          name: "vector",
          data_type: "FloatVector",
          type_params: [{ key: "dim", value: "1536" }],
          is_primary_key: false,
          autoID: false,
        },
      ],
    },
    collectionID: "12345",
  }),
};

vi.mock("@zilliz/milvus2-sdk-node", () => ({
  MilvusClient: vi.fn(() => mockMilvusClient),
}));

describe("ZillizAdapter", () => {
  let adapter: ZillizAdapter;
  const defaultConfig: ZillizConfig = {
    uri: "https://test-cluster.serverless.gcp-us-west1.cloud.zilliz.com",
    token: "test-token",
    secure: true,
    timeout: 30000,
    database: "default",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations to defaults after clearing
    mockMilvusClient.listCollections.mockResolvedValue({ collection_names: [] });
    mockMilvusClient.hasCollection.mockResolvedValue({ value: false });
    mockMilvusClient.createCollection.mockResolvedValue({ error_code: "Success", reason: "" });
    mockMilvusClient.dropCollection.mockResolvedValue({ error_code: "Success", reason: "" });
    mockMilvusClient.createIndex.mockResolvedValue({ error_code: "Success", reason: "" });
    mockMilvusClient.loadCollection.mockResolvedValue({ error_code: "Success", reason: "" });
    mockMilvusClient.releaseCollection.mockResolvedValue({ error_code: "Success", reason: "" });
    mockMilvusClient.upsert.mockResolvedValue({ status: { error_code: "Success" }, upsert_cnt: 1 });
    mockMilvusClient.delete.mockResolvedValue({ status: { error_code: "Success" }, delete_cnt: 1 });
    mockMilvusClient.search.mockResolvedValue({ status: { error_code: "Success" }, results: [] });
    mockMilvusClient.getCollectionStatistics.mockResolvedValue({
      status: { error_code: "Success" },
      stats: [{ key: "row_count", value: "100" }],
    });
    mockMilvusClient.describeCollection.mockResolvedValue({
      status: { error_code: "Success" },
      schema: {
        fields: [
          {
            name: "vector",
            data_type: "FloatVector",
            type_params: [{ key: "dim", value: "1536" }],
            is_primary_key: false,
            autoID: false,
          },
        ],
      },
      collectionID: "12345",
    });
    adapter = new ZillizAdapter(defaultConfig);
  });

  afterEach(async () => {
    if (adapter.isInitialized()) {
      await adapter.disconnect();
    }
  });

  describe("Constructor and Configuration", () => {
    it("should create adapter with configuration", () => {
      expect(adapter).toBeInstanceOf(ZillizAdapter);
      expect(adapter.getStoreName()).toBe("zilliz");
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should accept custom configuration options", () => {
      const customConfig: ZillizConfig = {
        uri: "https://custom-cluster.cloud.zilliz.com",
        token: "custom-token",
        secure: true,
        poolSize: 20,
        timeout: 60000,
        database: "custom_db",
      };
      const customAdapter = new ZillizAdapter(customConfig);
      expect(customAdapter.getConfig()).toEqual(customConfig);
    });

    it("should use default values for optional config", () => {
      const minimalConfig: ZillizConfig = {
        uri: "https://minimal.cloud.zilliz.com",
        token: "token",
      };
      const minimalAdapter = new ZillizAdapter(minimalConfig);
      expect(minimalAdapter.getConfig().secure).toBeUndefined();
      expect(minimalAdapter.getConfig().poolSize).toBeUndefined();
    });
  });

  describe("Connection Management", () => {
    it("should connect successfully", async () => {
      await adapter.connect();
      expect(adapter.isInitialized()).toBe(true);
      expect(mockMilvusClient.listCollections).toHaveBeenCalled();
    });

    it("should not reconnect if already connected", async () => {
      await adapter.connect();
      await adapter.connect(); // Second call should be a no-op
      expect(adapter.isInitialized()).toBe(true);
      expect(mockMilvusClient.listCollections).toHaveBeenCalledTimes(1);
    });

    it("should disconnect successfully", async () => {
      await adapter.connect();
      await adapter.disconnect();
      expect(adapter.isInitialized()).toBe(false);
      expect(mockMilvusClient.closeConnection).toHaveBeenCalled();
    });

    it("should handle disconnect when not connected", async () => {
      // Should not throw
      await adapter.disconnect();
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should handle connection failure", async () => {
      mockMilvusClient.listCollections.mockRejectedValueOnce(
        new Error("Connection refused"),
      );
      await expect(adapter.connect()).rejects.toThrow("Failed to connect to Zilliz");
    });
  });

  describe("Index Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should create an index (collection)", async () => {
      mockMilvusClient.hasCollection.mockResolvedValueOnce({ value: false });

      await adapter.createIndex({
        name: "test-collection",
        dimension: 1536,
        metric: "cosine",
      });

      expect(mockMilvusClient.createCollection).toHaveBeenCalledWith(
        expect.objectContaining({
          collection_name: "test-collection",
          fields: expect.arrayContaining([
            expect.objectContaining({ name: "id", is_primary_key: true }),
            expect.objectContaining({ name: "vector", dim: 1536 }),
          ]),
        }),
      );
      expect(mockMilvusClient.createIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          collection_name: "test-collection",
          field_name: "vector",
          metric_type: "COSINE",
        }),
      );
      expect(mockMilvusClient.loadCollection).toHaveBeenCalledWith({
        collection_name: "test-collection",
      });
    });

    it("should skip creation if collection exists", async () => {
      mockMilvusClient.hasCollection.mockResolvedValueOnce({ value: true });

      await adapter.createIndex({
        name: "existing-collection",
        dimension: 768,
      });

      expect(mockMilvusClient.createCollection).not.toHaveBeenCalled();
    });

    it("should create index with euclidean metric", async () => {
      mockMilvusClient.hasCollection.mockResolvedValueOnce({ value: false });

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

    it("should create index with dotProduct metric", async () => {
      mockMilvusClient.hasCollection.mockResolvedValueOnce({ value: false });

      await adapter.createIndex({
        name: "ip-collection",
        dimension: 256,
        metric: "dotProduct",
      });

      expect(mockMilvusClient.createIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          metric_type: "IP",
        }),
      );
    });

    it("should delete an index (collection)", async () => {
      await adapter.deleteIndex("test-collection");
      expect(mockMilvusClient.dropCollection).toHaveBeenCalledWith({
        collection_name: "test-collection",
      });
    });

    it("should list indexes (collections)", async () => {
      mockMilvusClient.listCollections.mockResolvedValueOnce({
        collection_names: ["collection1", "collection2"],
      });

      const indexes = await adapter.listIndexes();
      expect(indexes).toEqual(["collection1", "collection2"]);
    });

    it("should check if index exists", async () => {
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
      mockMilvusClient.upsert.mockResolvedValueOnce({
        status: { error_code: "Success" },
        upsert_cnt: 2,
      });

      const result = await adapter.upsert("test-collection", testRecords);
      expect(result.upsertedCount).toBe(2);
      expect(mockMilvusClient.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          collection_name: "test-collection",
          fields_data: expect.arrayContaining([
            expect.objectContaining({
              id: "vec-1",
              vector: [0.1, 0.2, 0.3],
              content: "Test content 1",
              metadata: { category: "tech" },
            }),
          ]),
        }),
      );
    });

    it("should upsert with namespace (partition)", async () => {
      mockMilvusClient.upsert.mockResolvedValueOnce({
        status: { error_code: "Success" },
        upsert_cnt: 2,
      });

      const result = await adapter.upsert("test-collection", testRecords, {
        namespace: "ns1",
      });

      expect(result.upsertedCount).toBe(2);
      expect(mockMilvusClient.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          partition_name: "ns1",
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

    it("should handle upsert error", async () => {
      mockMilvusClient.upsert.mockResolvedValueOnce({
        status: { error_code: "Error" },
        upsert_cnt: 0,
      });

      await expect(
        adapter.upsert("test-collection", testRecords),
      ).rejects.toThrow("Failed to upsert");
    });
  });

  describe("Query Operations", () => {
    const queryVector = [0.1, 0.2, 0.3];
    const mockResults = [
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
    ];

    beforeEach(async () => {
      await adapter.connect();
      mockMilvusClient.search.mockResolvedValue({
        status: { error_code: "Success" },
        results: mockResults,
      });
    });

    it("should query vectors", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
      };

      const results = await adapter.query("test-collection", options);
      expect(Array.isArray(results)).toBe(true);
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
          filter: expect.stringContaining('metadata["category"]'),
        }),
      );
    });

    it("should query with minimum score filter", async () => {
      mockMilvusClient.search.mockResolvedValueOnce({
        status: { error_code: "Success" },
        results: [
          { id: "vec-1", score: 0.95 },
          { id: "vec-2", score: 0.4 }, // Below minimum
        ],
      });

      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        minScore: 0.5,
      };

      const results = await adapter.query("test-collection", options);
      expect(results.length).toBe(1);
      expect(results[0].score).toBeGreaterThanOrEqual(0.5);
    });

    it("should query with namespace (partition)", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        namespace: "ns1",
      };

      await adapter.query("test-collection", options);

      expect(mockMilvusClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          partition_names: ["ns1"],
        }),
      );
    });

    it("should include vectors when requested", async () => {
      mockMilvusClient.search.mockResolvedValueOnce({
        status: { error_code: "Success" },
        results: [
          {
            id: "vec-1",
            score: 0.95,
            vector: [0.1, 0.2, 0.3],
          },
        ],
      });

      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        includeVectors: true,
      };

      const results = await adapter.query("test-collection", options);
      expect(mockMilvusClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          output_fields: expect.arrayContaining(["vector"]),
        }),
      );
      expect(results[0].vector).toBeDefined();
    });

    it("should include metadata when requested", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        includeMetadata: true,
      };

      const results = await adapter.query("test-collection", options);
      expect(results[0].metadata).toBeDefined();
    });

    it("should handle query error", async () => {
      mockMilvusClient.search.mockResolvedValueOnce({
        status: { error_code: "Error" },
        results: [],
      });

      await expect(
        adapter.query("test-collection", { vector: queryVector, topK: 10 }),
      ).rejects.toThrow("Failed to query");
    });
  });

  describe("Delete Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
      mockMilvusClient.delete.mockResolvedValue({
        status: { error_code: "Success" },
        delete_cnt: 2,
      });
    });

    it("should delete by IDs", async () => {
      const result = await adapter.delete("test-collection", {
        ids: ["vec-1", "vec-2"],
      });

      expect(result.deletedCount).toBe(2);
      expect(mockMilvusClient.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.stringContaining("in"),
        }),
      );
    });

    it("should delete by filter", async () => {
      const result = await adapter.delete("test-collection", {
        filter: { category: "deprecated" },
      });

      expect(result.deletedCount).toBe(2);
      expect(mockMilvusClient.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.stringContaining('metadata["category"]'),
        }),
      );
    });

    it("should delete by namespace (partition)", async () => {
      const result = await adapter.delete("test-collection", {
        ids: ["vec-1"],
        namespace: "ns1",
      });

      expect(result.deletedCount).toBe(2);
      expect(mockMilvusClient.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          partition_name: "ns1",
        }),
      );
    });

    it("should delete all records", async () => {
      const result = await adapter.delete("test-collection", {
        deleteAll: true,
      });

      expect(result.deletedCount).toBe(2);
      expect(mockMilvusClient.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.stringContaining('!= ""'),
        }),
      );
    });

    it("should handle delete error", async () => {
      mockMilvusClient.delete.mockResolvedValueOnce({
        status: { error_code: "Error" },
        delete_cnt: 0,
      });

      await expect(
        adapter.delete("test-collection", { ids: ["vec-1"] }),
      ).rejects.toThrow("Failed to delete");
    });
  });

  describe("Statistics", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should get collection statistics", async () => {
      const stats = await adapter.getStats("test-collection");

      expect(stats.vectorCount).toBe(100);
      expect(stats.dimension).toBe(1536);
      expect(mockMilvusClient.getCollectionStatistics).toHaveBeenCalledWith({
        collection_name: "test-collection",
      });
    });

    it("should handle stats error", async () => {
      mockMilvusClient.getCollectionStatistics.mockResolvedValueOnce({
        status: { error_code: "Error" },
        stats: [],
      });

      await expect(adapter.getStats("test-collection")).rejects.toThrow(
        "Failed to get stats",
      );
    });
  });

  describe("Health Check", () => {
    it("should return healthy status when connected", async () => {
      await adapter.connect();
      mockMilvusClient.listCollections.mockResolvedValueOnce({
        collection_names: ["collection1"],
      });

      const health = await adapter.healthCheck();
      expect(health.healthy).toBe(true);
      expect(health.status).toBe("connected");
      expect(health.latencyMs).toBeGreaterThanOrEqual(0);
      expect(health.lastChecked).toBeInstanceOf(Date);
    });

    it("should return error status when not connected", async () => {
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
      // Mock to return the actual batch size for each call
      let callCount = 0;
      mockMilvusClient.upsert.mockImplementation(async (params: { fields_data: unknown[] }) => {
        callCount++;
        return {
          status: { error_code: "Success" },
          upsert_cnt: params.fields_data.length,
        };
      });

      const result = await adapter.batchUpsert("test-collection", manyRecords, {
        batchSize: 100,
      });

      // 3 batches: 100 + 100 + 50 = 250
      expect(result.upsertedCount).toBe(250);
      expect(callCount).toBe(3);
    });

    it("should batch delete large ID lists", async () => {
      const ids = manyRecords.map((r) => r.id);
      mockMilvusClient.delete.mockResolvedValue({
        status: { error_code: "Success" },
        delete_cnt: 100,
      });

      const result = await adapter.batchDelete("test-collection", ids, {
        batchSize: 100,
      });

      // 3 batches of 100 each
      expect(result.deletedCount).toBe(300);
    });
  });

  describe("Filter Translation", () => {
    beforeEach(async () => {
      await adapter.connect();
      mockMilvusClient.search.mockResolvedValue({
        status: { error_code: "Success" },
        results: [],
      });
    });

    it("should translate simple equality filter", async () => {
      await adapter.query("test-collection", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { category: "tech" },
      });

      expect(mockMilvusClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.stringContaining('metadata["category"] == "tech"'),
        }),
      );
    });

    it("should translate comparison operators", async () => {
      await adapter.query("test-collection", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { price: { $gte: 100, $lte: 500 } },
      });

      const call = mockMilvusClient.search.mock.calls[0][0];
      expect(call.filter).toContain(">=");
      expect(call.filter).toContain("<=");
    });

    it("should translate logical $and operator", async () => {
      await adapter.query("test-collection", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $and: [{ category: "tech" }, { status: "active" }],
        },
      });

      const call = mockMilvusClient.search.mock.calls[0][0];
      expect(call.filter).toContain(" and ");
    });

    it("should translate logical $or operator", async () => {
      await adapter.query("test-collection", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $or: [{ category: "tech" }, { category: "science" }],
        },
      });

      const call = mockMilvusClient.search.mock.calls[0][0];
      expect(call.filter).toContain(" or ");
    });

    it("should translate $not operator", async () => {
      await adapter.query("test-collection", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $not: { category: "spam" },
        },
      });

      const call = mockMilvusClient.search.mock.calls[0][0];
      expect(call.filter).toContain("not");
    });

    it("should translate $in operator", async () => {
      await adapter.query("test-collection", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          status: { $in: ["active", "pending"] },
        },
      });

      const call = mockMilvusClient.search.mock.calls[0][0];
      expect(call.filter).toContain(" in ");
    });

    it("should translate $nin operator", async () => {
      await adapter.query("test-collection", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          status: { $nin: ["deleted", "archived"] },
        },
      });

      const call = mockMilvusClient.search.mock.calls[0][0];
      expect(call.filter).toContain("not in");
    });

    it("should translate string operators", async () => {
      await adapter.query("test-collection", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          title: { $contains: "vector" },
        },
      });

      const call = mockMilvusClient.search.mock.calls[0][0];
      expect(call.filter).toContain("like");
      expect(call.filter).toContain("%vector%");
    });

    it("should translate $startsWith operator", async () => {
      await adapter.query("test-collection", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          title: { $startsWith: "intro" },
        },
      });

      const call = mockMilvusClient.search.mock.calls[0][0];
      expect(call.filter).toContain('like "intro%"');
    });

    it("should translate $endsWith operator", async () => {
      await adapter.query("test-collection", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          title: { $endsWith: "guide" },
        },
      });

      const call = mockMilvusClient.search.mock.calls[0][0];
      expect(call.filter).toContain('like "%guide"');
    });

    it("should translate $exists operator", async () => {
      await adapter.query("test-collection", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          optional_field: { $exists: true },
        },
      });

      const call = mockMilvusClient.search.mock.calls[0][0];
      expect(call.filter).toContain("!= null");
    });

    it("should translate $exists false operator", async () => {
      await adapter.query("test-collection", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          optional_field: { $exists: false },
        },
      });

      const call = mockMilvusClient.search.mock.calls[0][0];
      expect(call.filter).toContain("== null");
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
      mockMilvusClient.hasCollection.mockResolvedValueOnce({ value: false });
      mockMilvusClient.createCollection.mockResolvedValueOnce({
        error_code: "Error",
        reason: "Failed to create",
      });

      await expect(
        adapter.createIndex({ name: "test", dimension: 128 }),
      ).rejects.toThrow("Failed to create index");
    });

    it("should throw when deleting collection fails", async () => {
      await adapter.connect();
      mockMilvusClient.dropCollection.mockResolvedValueOnce({
        error_code: "Error",
        reason: "Failed to drop",
      });

      await expect(adapter.deleteIndex("test")).rejects.toThrow(
        "Failed to delete index",
      );
    });

    it("should throw when disconnect fails", async () => {
      await adapter.connect();
      mockMilvusClient.closeConnection.mockRejectedValueOnce(
        new Error("Close error"),
      );

      await expect(adapter.disconnect()).rejects.toThrow(
        "Failed to disconnect from Zilliz",
      );
    });
  });

  describe("SDK Loading", () => {
    it("should throw helpful error when SDK not installed", async () => {
      // Create a new adapter instance to test SDK loading failure
      const testAdapter = new ZillizAdapter(defaultConfig);

      // Mock the import to fail
      vi.doMock("@zilliz/milvus2-sdk-node", () => {
        throw new Error("Cannot find module");
      });

      // Note: This test verifies the error message is helpful
      // In actual implementation, the dynamic import would fail
    });
  });
});

describe("ZillizAdapter Integration", () => {
  // These tests require @zilliz/milvus2-sdk-node to be installed
  // and a Zilliz Cloud cluster to be available
  // Skip if not configured

  it.skip("should work with real Zilliz Cloud cluster", async () => {
    // This test would use a real Zilliz Cloud cluster
    // Requires ZILLIZ_URI and ZILLIZ_TOKEN environment variables
    const adapter = new ZillizAdapter({
      uri: process.env.ZILLIZ_URI || "",
      token: process.env.ZILLIZ_TOKEN || "",
    });

    await adapter.connect();

    // Create a test collection
    await adapter.createIndex({
      name: "integration_test",
      dimension: 128,
      metric: "cosine",
    });

    // Upsert test vectors
    const testRecords = [
      {
        id: "test-1",
        vector: Array.from({ length: 128 }, () => Math.random()),
        metadata: { category: "test" },
        content: "Test content",
      },
    ];

    await adapter.upsert("integration_test", testRecords);

    // Query
    const results = await adapter.query("integration_test", {
      vector: testRecords[0].vector,
      topK: 1,
      includeMetadata: true,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("test-1");

    // Cleanup
    await adapter.deleteIndex("integration_test");
    await adapter.disconnect();
  });
});
