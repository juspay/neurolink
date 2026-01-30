/**
 * OpenSearch Adapter Tests
 * Comprehensive test suite for the OpenSearch vector store adapter
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type {
  VectorRecord,
  VectorQueryOptions,
} from "../../../src/lib/vector/types.js";
import {
  OpenSearchAdapter,
  type OpenSearchConfig,
  type OpenSearchClient,
} from "../../../src/lib/vector/adapters/OpenSearchAdapter.js";

/**
 * Create a mock OpenSearch client for testing
 */
function createMockClient(): OpenSearchClient & { _mocks: Record<string, ReturnType<typeof vi.fn>> } {
  const mockClusterHealth = vi.fn().mockResolvedValue({
    status: "green",
    number_of_nodes: 3,
    active_shards: 10,
  });

  const mockIndicesCreate = vi.fn().mockResolvedValue({
    acknowledged: true,
  });

  const mockIndicesDelete = vi.fn().mockResolvedValue({
    acknowledged: true,
  });

  const mockIndicesExists = vi.fn().mockResolvedValue(false);

  const mockIndicesStats = vi.fn().mockResolvedValue({
    _all: {
      primaries: {
        docs: { count: 100 },
        store: { size_in_bytes: 1024000 },
      },
    },
  });

  const mockIndicesGetMapping = vi.fn().mockResolvedValue({
    "test-index": {
      mappings: {
        properties: {
          vector: { type: "knn_vector", dimension: 1536 },
        },
      },
    },
  });

  const mockIndicesRefresh = vi.fn().mockResolvedValue({});

  const mockCatIndices = vi.fn().mockResolvedValue([
    { index: "index1" },
    { index: "index2" },
    { index: ".kibana" },
  ]);

  const mockBulk = vi.fn().mockResolvedValue({
    took: 10,
    errors: false,
    items: [
      { index: { status: 201 } },
      { index: { status: 201 } },
    ],
  });

  const mockSearch = vi.fn().mockResolvedValue({
    hits: {
      total: { value: 1 },
      hits: [
        {
          _id: "vec-1",
          _score: 0.95,
          _source: {
            id: "vec-1",
            content: "Test content",
            metadata: { category: "tech" },
            vector: [0.1, 0.2, 0.3],
          },
        },
      ],
    },
  });

  const mockDeleteByQuery = vi.fn().mockResolvedValue({
    deleted: 2,
  });

  const mockClose = vi.fn().mockResolvedValue(undefined);

  return {
    cluster: { health: mockClusterHealth },
    indices: {
      create: mockIndicesCreate,
      delete: mockIndicesDelete,
      exists: mockIndicesExists,
      stats: mockIndicesStats,
      getMapping: mockIndicesGetMapping,
      refresh: mockIndicesRefresh,
    },
    cat: { indices: mockCatIndices },
    bulk: mockBulk,
    search: mockSearch,
    deleteByQuery: mockDeleteByQuery,
    close: mockClose,
    // Store mocks for access in tests
    _mocks: {
      clusterHealth: mockClusterHealth,
      indicesCreate: mockIndicesCreate,
      indicesDelete: mockIndicesDelete,
      indicesExists: mockIndicesExists,
      indicesStats: mockIndicesStats,
      indicesGetMapping: mockIndicesGetMapping,
      indicesRefresh: mockIndicesRefresh,
      catIndices: mockCatIndices,
      bulk: mockBulk,
      search: mockSearch,
      deleteByQuery: mockDeleteByQuery,
      close: mockClose,
    },
  };
}

describe("OpenSearchAdapter", () => {
  let adapter: OpenSearchAdapter;
  let mockClient: ReturnType<typeof createMockClient>;

  const createConfig = (overrides?: Partial<OpenSearchConfig>): OpenSearchConfig => {
    mockClient = createMockClient();
    return {
      node: "https://localhost:9200",
      auth: {
        username: "admin",
        password: "admin",
      },
      ssl: true,
      knnEngine: "lucene",
      _injectedClient: mockClient,
      ...overrides,
    };
  };

  beforeEach(() => {
    adapter = new OpenSearchAdapter(createConfig());
  });

  describe("Constructor and Configuration", () => {
    it("should create adapter with configuration", () => {
      expect(adapter).toBeInstanceOf(OpenSearchAdapter);
      expect(adapter.getStoreName()).toBe("opensearch");
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should accept custom configuration options", () => {
      const customConfig: OpenSearchConfig = {
        node: "https://opensearch.example.com:9200",
        nodes: ["https://node1:9200", "https://node2:9200"],
        auth: {
          username: "user",
          password: "pass",
        },
        ssl: true,
        rejectUnauthorized: true,
        connectionTimeout: 15000,
        requestTimeout: 60000,
        maxRetries: 5,
        knnEngine: "faiss",
        numberOfShards: 3,
        numberOfReplicas: 2,
        refreshInterval: "5s",
        _injectedClient: mockClient,
      };
      const customAdapter = new OpenSearchAdapter(customConfig);
      expect(customAdapter.getConfig()).toEqual(customConfig);
    });

    it("should accept AWS authentication configuration", () => {
      const awsConfig: OpenSearchConfig = {
        node: "https://search-domain.region.es.amazonaws.com",
        awsAuth: {
          region: "us-east-1",
          service: "es",
          credentials: {
            accessKeyId: "AKIAIOSFODNN7EXAMPLE",
            secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
          },
        },
        _injectedClient: mockClient,
      };
      const awsAdapter = new OpenSearchAdapter(awsConfig);
      expect(awsAdapter.getConfig().awsAuth?.region).toBe("us-east-1");
    });

    it("should support different k-NN engine configurations", () => {
      const luceneConfig = new OpenSearchAdapter(createConfig({ knnEngine: "lucene" }));
      expect(luceneConfig.getConfig().knnEngine).toBe("lucene");

      const faissConfig = new OpenSearchAdapter(createConfig({ knnEngine: "faiss" }));
      expect(faissConfig.getConfig().knnEngine).toBe("faiss");

      const nmslibConfig = new OpenSearchAdapter(createConfig({ knnEngine: "nmslib" }));
      expect(nmslibConfig.getConfig().knnEngine).toBe("nmslib");
    });
  });

  describe("Connection Management", () => {
    it("should connect successfully", async () => {
      await adapter.connect();
      expect(adapter.isInitialized()).toBe(true);
    });

    it("should not reconnect if already connected", async () => {
      await adapter.connect();
      expect(adapter.isInitialized()).toBe(true);
      await adapter.connect(); // Second call should be a no-op
      expect(adapter.isInitialized()).toBe(true);
    });

    it("should disconnect successfully", async () => {
      await adapter.connect();
      expect(adapter.isInitialized()).toBe(true);
      await adapter.disconnect();
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should handle disconnect when not connected", async () => {
      expect(adapter.isInitialized()).toBe(false);
      await adapter.disconnect();
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should handle connection failure", async () => {
      mockClient._mocks.clusterHealth.mockRejectedValueOnce(new Error("Connection refused"));
      await expect(adapter.connect()).rejects.toThrow("Failed to connect to OpenSearch");
    });
  });

  describe("Index Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should create an index with default configuration", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 1536,
        metric: "cosine",
      });

      expect(mockClient._mocks.indicesCreate).toHaveBeenCalled();
      const createCall = mockClient._mocks.indicesCreate.mock.calls[0][0];
      expect(createCall.index).toBe("test-index");
      expect(createCall.body.settings["index.knn"]).toBe(true);
      expect(createCall.body.mappings.properties.vector.dimension).toBe(1536);
    });

    it("should create index with euclidean metric", async () => {
      await adapter.createIndex({
        name: "euclidean-index",
        dimension: 768,
        metric: "euclidean",
      });

      const createCall = mockClient._mocks.indicesCreate.mock.calls[0][0];
      expect(createCall.body.settings["index.knn.space_type"]).toBe("l2");
    });

    it("should create index with dot product metric", async () => {
      await adapter.createIndex({
        name: "dot-index",
        dimension: 512,
        metric: "dotProduct",
      });

      const createCall = mockClient._mocks.indicesCreate.mock.calls[0][0];
      expect(createCall.body.settings["index.knn.space_type"]).toBe("innerproduct");
    });

    it("should not create index if it already exists", async () => {
      mockClient._mocks.indicesExists.mockResolvedValueOnce(true);

      await adapter.createIndex({
        name: "existing-index",
        dimension: 1536,
      });

      expect(mockClient._mocks.indicesCreate).not.toHaveBeenCalled();
    });

    it("should delete an index", async () => {
      mockClient._mocks.indicesExists.mockResolvedValueOnce(true);
      await adapter.deleteIndex("test-index");
      expect(mockClient._mocks.indicesDelete).toHaveBeenCalledWith({ index: "test-index" });
    });

    it("should handle deleting non-existent index", async () => {
      mockClient._mocks.indicesExists.mockResolvedValueOnce(false);
      await adapter.deleteIndex("nonexistent");
      expect(mockClient._mocks.indicesDelete).not.toHaveBeenCalled();
    });

    it("should list indexes excluding system indexes", async () => {
      const indexes = await adapter.listIndexes();
      expect(indexes).toEqual(["index1", "index2"]);
      expect(indexes).not.toContain(".kibana");
    });

    it("should check if index exists", async () => {
      mockClient._mocks.indicesExists.mockResolvedValueOnce(true);
      const exists = await adapter.indexExists("test-index");
      expect(exists).toBe(true);

      mockClient._mocks.indicesExists.mockResolvedValueOnce(false);
      const notExists = await adapter.indexExists("nonexistent");
      expect(notExists).toBe(false);
    });

    it("should normalize index names", async () => {
      await adapter.createIndex({
        name: "My Test Index!",
        dimension: 1536,
      });

      const createCall = mockClient._mocks.indicesCreate.mock.calls[0][0];
      expect(createCall.index).toBe("my_test_index_");
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
      const result = await adapter.upsert("test-index", testRecords);
      expect(result.upsertedCount).toBe(2);
      expect(mockClient._mocks.bulk).toHaveBeenCalled();
    });

    it("should upsert with namespace", async () => {
      const result = await adapter.upsert("test-index", testRecords, {
        namespace: "ns1",
      });
      expect(result.upsertedCount).toBe(2);

      const bulkCall = mockClient._mocks.bulk.mock.calls[0][0];
      expect(bulkCall.body).toContainEqual(
        expect.objectContaining({
          namespace: "ns1",
        }),
      );
    });

    it("should validate vector dimensions", async () => {
      const invalidRecords = [
        { id: "v1", vector: [0.1, 0.2, 0.3] },
        { id: "v2", vector: [0.1, 0.2] },
      ];

      await expect(
        adapter.upsert("test-index", invalidRecords),
      ).rejects.toThrow("Inconsistent vector dimensions");
    });

    it("should handle empty records array", async () => {
      const result = await adapter.upsert("test-index", []);
      expect(result.upsertedCount).toBe(0);
      expect(mockClient._mocks.bulk).not.toHaveBeenCalled();
    });

    it("should handle bulk errors gracefully", async () => {
      mockClient._mocks.bulk.mockResolvedValueOnce({
        took: 10,
        errors: true,
        items: [
          { index: { status: 201 } },
          { index: { status: 400, error: { reason: "Invalid document" } } },
        ],
      });

      const result = await adapter.upsert("test-index", testRecords);
      expect(result.upsertedCount).toBe(1);
    });
  });

  describe("Query Operations", () => {
    const queryVector = [0.1, 0.2, 0.3];

    beforeEach(async () => {
      await adapter.connect();
    });

    it("should query vectors", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
      };

      const results = await adapter.query("test-index", options);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("vec-1");
      expect(results[0].score).toBe(0.95);
    });

    it("should query with metadata filter", async () => {
      const options: VectorQueryOptions<{ category: string }> = {
        vector: queryVector,
        topK: 10,
        filter: { category: "tech" },
      };

      const results = await adapter.query("test-index", options);
      expect(Array.isArray(results)).toBe(true);

      const searchCall = mockClient._mocks.search.mock.calls[0][0];
      expect(searchCall.body.query).toHaveProperty("bool");
    });

    it("should query with minimum score", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        minScore: 0.99,
      };

      const results = await adapter.query("test-index", options);
      expect(results.length).toBe(0);
    });

    it("should query with namespace filter", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        namespace: "ns1",
      };

      await adapter.query("test-index", options);

      const searchCall = mockClient._mocks.search.mock.calls[0][0];
      expect(searchCall.body.query.bool.filter).toContainEqual({
        term: { namespace: "ns1" },
      });
    });

    it("should include vectors when requested", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        includeVectors: true,
      };

      const results = await adapter.query("test-index", options);
      expect(results[0].vector).toEqual([0.1, 0.2, 0.3]);
    });

    it("should include metadata when requested", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        includeMetadata: true,
      };

      const results = await adapter.query("test-index", options);
      expect(results[0].metadata).toEqual({ category: "tech" });
    });
  });

  describe("Delete Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should delete by IDs", async () => {
      const result = await adapter.delete("test-index", {
        ids: ["vec-1", "vec-2"],
      });
      expect(result.deletedCount).toBe(2);

      const deleteCall = mockClient._mocks.deleteByQuery.mock.calls[0][0];
      expect(deleteCall.body.query).toEqual({
        ids: { values: ["vec-1", "vec-2"] },
      });
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

      const deleteCall = mockClient._mocks.deleteByQuery.mock.calls[0][0];
      expect(deleteCall.body.query).toEqual({
        term: { namespace: "old-data" },
      });
    });

    it("should delete all records", async () => {
      const result = await adapter.delete("test-index", {
        deleteAll: true,
      });
      expect(result.deletedCount).toBe(2);

      const deleteCall = mockClient._mocks.deleteByQuery.mock.calls[0][0];
      expect(deleteCall.body.query).toEqual({ match_all: {} });
    });

    it("should return 0 when no delete criteria provided", async () => {
      const result = await adapter.delete("test-index", {});
      expect(result.deletedCount).toBe(0);
      expect(mockClient._mocks.deleteByQuery).not.toHaveBeenCalled();
    });
  });

  describe("Statistics", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should get index statistics", async () => {
      const stats = await adapter.getStats("test-index");

      expect(stats.vectorCount).toBe(100);
      expect(stats.indexSize).toBe(1024000);
      expect(stats.dimension).toBe(1536);
      expect(stats.metrics).toEqual({
        knnEngine: "lucene",
      });
    });

    it("should cache dimension from createIndex", async () => {
      await adapter.createIndex({
        name: "cached-index",
        dimension: 768,
      });

      mockClient._mocks.indicesGetMapping.mockClear();

      const stats = await adapter.getStats("cached-index");
      expect(stats.dimension).toBe(768);
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
      mockClient._mocks.bulk.mockResolvedValue({
        took: 10,
        errors: false,
        items: Array(100).fill({ index: { status: 201 } }),
      });

      const result = await adapter.batchUpsert("test-index", manyRecords, {
        batchSize: 100,
      });
      expect(result.upsertedCount).toBe(250);
      expect(mockClient._mocks.bulk).toHaveBeenCalledTimes(3);
    });

    it("should batch delete large ID lists", async () => {
      const ids = manyRecords.map((r) => r.id);

      const result = await adapter.batchDelete("test-index", ids, {
        batchSize: 100,
      });
      expect(result.deletedCount).toBe(6);
    });
  });

  describe("Filter Translation", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should translate simple equality filter", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { category: "tech" },
      });

      const searchCall = mockClient._mocks.search.mock.calls[0][0];
      expect(searchCall.body.query.bool.filter).toContainEqual({
        term: { "metadata.category": "tech" },
      });
    });

    it("should translate comparison operators", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { price: { $gte: 100, $lte: 500 } },
      });

      const searchCall = mockClient._mocks.search.mock.calls[0][0];
      const filter = searchCall.body.query.bool.filter;
      expect(filter).toContainEqual(
        expect.objectContaining({
          bool: expect.objectContaining({
            must: expect.arrayContaining([
              { range: { "metadata.price": { gte: 100 } } },
              { range: { "metadata.price": { lte: 500 } } },
            ]),
          }),
        }),
      );
    });

    it("should translate logical $and operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $and: [{ category: "tech" }, { status: "active" }],
        },
      });

      const searchCall = mockClient._mocks.search.mock.calls[0][0];
      expect(searchCall.body.query.bool.filter).toContainEqual(
        expect.objectContaining({
          bool: expect.objectContaining({
            must: expect.arrayContaining([
              { term: { "metadata.category": "tech" } },
              { term: { "metadata.status": "active" } },
            ]),
          }),
        }),
      );
    });

    it("should translate logical $or operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $or: [{ category: "tech" }, { category: "science" }],
        },
      });

      const searchCall = mockClient._mocks.search.mock.calls[0][0];
      expect(searchCall.body.query.bool.filter).toContainEqual(
        expect.objectContaining({
          bool: expect.objectContaining({
            should: expect.arrayContaining([
              { term: { "metadata.category": "tech" } },
              { term: { "metadata.category": "science" } },
            ]),
            minimum_should_match: 1,
          }),
        }),
      );
    });

    it("should translate $not operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $not: { category: "spam" },
        },
      });

      const searchCall = mockClient._mocks.search.mock.calls[0][0];
      expect(searchCall.body.query.bool.filter).toContainEqual(
        expect.objectContaining({
          bool: expect.objectContaining({
            must_not: expect.arrayContaining([
              { term: { "metadata.category": "spam" } },
            ]),
          }),
        }),
      );
    });

    it("should translate $in operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          status: { $in: ["active", "pending"] },
        },
      });

      const searchCall = mockClient._mocks.search.mock.calls[0][0];
      expect(searchCall.body.query.bool.filter).toContainEqual(
        expect.objectContaining({
          terms: { "metadata.status": ["active", "pending"] },
        }),
      );
    });

    it("should translate $nin operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          status: { $nin: ["deleted", "archived"] },
        },
      });

      const searchCall = mockClient._mocks.search.mock.calls[0][0];
      expect(searchCall.body.query.bool.filter).toContainEqual(
        expect.objectContaining({
          bool: expect.objectContaining({
            must_not: [{ terms: { "metadata.status": ["deleted", "archived"] } }],
          }),
        }),
      );
    });

    it("should translate string operators", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          title: { $contains: "vector" },
        },
      });

      const searchCall = mockClient._mocks.search.mock.calls[0][0];
      expect(searchCall.body.query.bool.filter).toContainEqual(
        expect.objectContaining({
          wildcard: { "metadata.title": "*vector*" },
        }),
      );
    });

    it("should translate $startsWith operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          title: { $startsWith: "Vector" },
        },
      });

      const searchCall = mockClient._mocks.search.mock.calls[0][0];
      expect(searchCall.body.query.bool.filter).toContainEqual(
        expect.objectContaining({
          prefix: { "metadata.title": "Vector" },
        }),
      );
    });

    it("should translate $endsWith operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          title: { $endsWith: "Search" },
        },
      });

      const searchCall = mockClient._mocks.search.mock.calls[0][0];
      expect(searchCall.body.query.bool.filter).toContainEqual(
        expect.objectContaining({
          wildcard: { "metadata.title": "*Search" },
        }),
      );
    });

    it("should translate $exists operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          optional_field: { $exists: true },
        },
      });

      const searchCall = mockClient._mocks.search.mock.calls[0][0];
      expect(searchCall.body.query.bool.filter).toContainEqual(
        expect.objectContaining({
          exists: { field: "metadata.optional_field" },
        }),
      );
    });

    it("should translate $exists false operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          optional_field: { $exists: false },
        },
      });

      const searchCall = mockClient._mocks.search.mock.calls[0][0];
      expect(searchCall.body.query.bool.filter).toContainEqual(
        expect.objectContaining({
          bool: expect.objectContaining({
            must_not: [{ exists: { field: "metadata.optional_field" } }],
          }),
        }),
      );
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
      mockClient._mocks.indicesCreate.mockRejectedValueOnce(new Error("Index creation failed"));

      await expect(
        adapter.createIndex({ name: "test", dimension: 128 }),
      ).rejects.toThrow("Failed to create index");
    });

    it("should throw when deleting index fails", async () => {
      await adapter.connect();
      mockClient._mocks.indicesExists.mockResolvedValueOnce(true);
      mockClient._mocks.indicesDelete.mockRejectedValueOnce(new Error("Index deletion failed"));

      await expect(adapter.deleteIndex("test")).rejects.toThrow(
        "Failed to delete index",
      );
    });

    it("should throw when upsert fails", async () => {
      await adapter.connect();
      mockClient._mocks.bulk.mockRejectedValueOnce(new Error("Bulk request failed"));

      await expect(
        adapter.upsert("test", [{ id: "1", vector: [0.1] }]),
      ).rejects.toThrow("Failed to upsert");
    });

    it("should throw when query fails", async () => {
      await adapter.connect();
      mockClient._mocks.search.mockRejectedValueOnce(new Error("Search failed"));

      await expect(
        adapter.query("test", { vector: [0.1], topK: 10 }),
      ).rejects.toThrow("Failed to query");
    });

    it("should throw when delete fails", async () => {
      await adapter.connect();
      mockClient._mocks.deleteByQuery.mockRejectedValueOnce(new Error("Delete failed"));

      await expect(adapter.delete("test", { ids: ["1"] })).rejects.toThrow(
        "Failed to delete",
      );
    });

    it("should throw when getting stats fails", async () => {
      await adapter.connect();
      mockClient._mocks.indicesStats.mockRejectedValueOnce(new Error("Stats failed"));

      await expect(adapter.getStats("test")).rejects.toThrow(
        "Failed to get stats",
      );
    });

    it("should throw when disconnect fails", async () => {
      await adapter.connect();
      mockClient._mocks.close.mockRejectedValueOnce(new Error("Close failed"));

      await expect(adapter.disconnect()).rejects.toThrow(
        "Failed to disconnect",
      );
    });
  });

  describe("k-NN Engine Configuration", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should configure lucene engine with correct parameters", async () => {
      await adapter.createIndex({
        name: "lucene-index",
        dimension: 1536,
      });

      const createCall = mockClient._mocks.indicesCreate.mock.calls[0][0];
      const method = createCall.body.mappings.properties.vector.method;
      expect(method.engine).toBe("lucene");
      expect(method.name).toBe("hnsw");
      expect(method.parameters.ef_construction).toBe(100);
      expect(method.parameters.m).toBe(16);
    });

    it("should configure faiss engine with correct parameters", async () => {
      const faissAdapter = new OpenSearchAdapter(createConfig({ knnEngine: "faiss" }));
      await faissAdapter.connect();

      await faissAdapter.createIndex({
        name: "faiss-index",
        dimension: 1536,
      });

      const createCall = mockClient._mocks.indicesCreate.mock.calls[0][0];
      const method = createCall.body.mappings.properties.vector.method;
      expect(method.engine).toBe("faiss");
      expect(method.parameters.ef_construction).toBe(256);
      expect(method.parameters.m).toBe(32);
      expect(method.parameters.ef_search).toBe(100);
    });

    it("should configure nmslib engine with correct parameters", async () => {
      const nmslibAdapter = new OpenSearchAdapter(createConfig({ knnEngine: "nmslib" }));
      await nmslibAdapter.connect();

      await nmslibAdapter.createIndex({
        name: "nmslib-index",
        dimension: 1536,
      });

      const createCall = mockClient._mocks.indicesCreate.mock.calls[0][0];
      const method = createCall.body.mappings.properties.vector.method;
      expect(method.engine).toBe("nmslib");
      expect(method.parameters.ef_construction).toBe(128);
      expect(method.parameters.m).toBe(24);
    });
  });
});

describe("OpenSearchAdapter Integration", () => {
  it.skip("should work with real OpenSearch cluster", async () => {
    // This test would use a real OpenSearch connection
    // Requires OpenSearch to be installed and running
  });
});
