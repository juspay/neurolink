/**
 * Elasticsearch Adapter Tests
 * Comprehensive test suite for the Elasticsearch vector store adapter
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ElasticsearchAdapter } from "../../../src/lib/vector/adapters/ElasticsearchAdapter.js";
import type {
  VectorRecord,
  VectorQueryOptions,
} from "../../../src/lib/vector/types.js";
import type { ElasticsearchConfig } from "../../../src/lib/vector/adapters/ElasticsearchAdapter.js";

// Mock Elasticsearch client
const mockIndices = {
  create: vi.fn(() => Promise.resolve({ acknowledged: true })),
  delete: vi.fn(() => Promise.resolve({})),
  exists: vi.fn(() => Promise.resolve(true)),
  get: vi.fn(() =>
    Promise.resolve({
      "test-index": {
        mappings: {
          properties: {
            vector: { dims: 1536 },
          },
        },
      },
    })
  ),
  stats: vi.fn(() =>
    Promise.resolve({
      _all: {
        primaries: {
          docs: { count: 100 },
          store: { size_in_bytes: 1024000 },
        },
      },
    })
  ),
  refresh: vi.fn(() => Promise.resolve({})),
};

const mockCat = {
  indices: vi.fn(() =>
    Promise.resolve([
      { index: "index1" },
      { index: "index2" },
      { index: ".internal" }, // System index, should be filtered
    ])
  ),
};

const mockCluster = {
  health: vi.fn(() => Promise.resolve({ status: "green" })),
};

const mockClient = {
  indices: mockIndices,
  cat: mockCat,
  cluster: mockCluster,
  bulk: vi.fn(() =>
    Promise.resolve({
      items: [
        { index: { status: 201 } },
        { index: { status: 201 } },
      ],
    })
  ),
  search: vi.fn(() =>
    Promise.resolve({
      hits: {
        hits: [
          {
            _id: "vec-1",
            _score: 0.95,
            _source: {
              id: "vec-1",
              content: "Test content 1",
              metadata: { category: "tech" },
              vector: [0.1, 0.2, 0.3],
            },
          },
          {
            _id: "vec-2",
            _score: 0.85,
            _source: {
              id: "vec-2",
              content: "Test content 2",
              metadata: { category: "science" },
              vector: [0.4, 0.5, 0.6],
            },
          },
        ],
      },
    })
  ),
  deleteByQuery: vi.fn(() => Promise.resolve({ deleted: 5 })),
  count: vi.fn(() => Promise.resolve({ count: 100 })),
  info: vi.fn(() =>
    Promise.resolve({
      version: { number: "8.11.0" },
      cluster_name: "test-cluster",
    })
  ),
  close: vi.fn(() => Promise.resolve()),
};

vi.mock("@elastic/elasticsearch", () => ({
  Client: vi.fn(() => mockClient),
}));

describe("ElasticsearchAdapter", () => {
  let adapter: ElasticsearchAdapter;
  const defaultConfig: ElasticsearchConfig = {
    node: "http://localhost:9200",
    indexPrefix: "",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new ElasticsearchAdapter(defaultConfig);
  });

  afterEach(async () => {
    if (adapter.isInitialized()) {
      await adapter.disconnect();
    }
  });

  describe("Constructor and Configuration", () => {
    it("should create adapter with configuration", () => {
      expect(adapter).toBeInstanceOf(ElasticsearchAdapter);
      expect(adapter.getStoreName()).toBe("elasticsearch");
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should accept basic configuration", () => {
      const basicConfig: ElasticsearchConfig = {
        node: "http://localhost:9200",
      };
      const basicAdapter = new ElasticsearchAdapter(basicConfig);
      expect(basicAdapter.getConfig()).toEqual(basicConfig);
    });

    it("should accept full configuration options", () => {
      const fullConfig: ElasticsearchConfig = {
        node: "https://es.example.com:9243",
        nodes: ["https://es-node-2.example.com:9243"],
        auth: {
          username: "elastic",
          password: "secret",
        },
        tls: {
          rejectUnauthorized: true,
        },
        requestTimeout: 30000,
        compression: true,
        maxRetries: 3,
        indexPrefix: "myapp_",
        numberOfShards: 2,
        numberOfReplicas: 1,
        refreshPolicy: "wait_for",
      };
      const fullAdapter = new ElasticsearchAdapter(fullConfig);
      expect(fullAdapter.getConfig()).toEqual(fullConfig);
    });

    it("should accept cloud configuration", () => {
      const cloudConfig: ElasticsearchConfig = {
        node: "",
        cloudId: "my-cloud:dXMtZWFzdC0xLmF3cy5mb3VuZC5pbw==",
        auth: {
          apiKey: "my-api-key",
        },
      };
      const cloudAdapter = new ElasticsearchAdapter(cloudConfig);
      expect(cloudAdapter.getConfig().cloudId).toBe(cloudConfig.cloudId);
    });
  });

  describe("Connection Management", () => {
    it("should connect successfully", async () => {
      await adapter.connect();
      expect(adapter.isInitialized()).toBe(true);
      expect(mockClient.info).toHaveBeenCalled();
    });

    it("should not reconnect if already connected", async () => {
      await adapter.connect();
      await adapter.connect(); // Second call should be a no-op
      expect(adapter.isInitialized()).toBe(true);
      expect(mockClient.info).toHaveBeenCalledTimes(1);
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

    it("should handle connection failure", async () => {
      mockClient.info.mockRejectedValueOnce(new Error("Connection refused"));
      await expect(adapter.connect()).rejects.toThrow("Failed to connect");
    });
  });

  describe("Index Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should create an index with default settings", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 1536,
      });

      expect(mockIndices.create).toHaveBeenCalledWith(
        expect.objectContaining({
          index: "test-index",
          body: expect.objectContaining({
            mappings: expect.objectContaining({
              properties: expect.objectContaining({
                vector: expect.objectContaining({
                  type: "dense_vector",
                  dims: 1536,
                  similarity: "cosine",
                }),
              }),
            }),
          }),
        })
      );
    });

    it("should create an index with cosine similarity", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 768,
        metric: "cosine",
      });

      expect(mockIndices.create).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            mappings: expect.objectContaining({
              properties: expect.objectContaining({
                vector: expect.objectContaining({
                  similarity: "cosine",
                }),
              }),
            }),
          }),
        })
      );
    });

    it("should create an index with euclidean (l2_norm) similarity", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 768,
        metric: "euclidean",
      });

      expect(mockIndices.create).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            mappings: expect.objectContaining({
              properties: expect.objectContaining({
                vector: expect.objectContaining({
                  similarity: "l2_norm",
                }),
              }),
            }),
          }),
        })
      );
    });

    it("should create an index with dot product similarity", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 768,
        metric: "dotProduct",
      });

      expect(mockIndices.create).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            mappings: expect.objectContaining({
              properties: expect.objectContaining({
                vector: expect.objectContaining({
                  similarity: "dot_product",
                }),
              }),
            }),
          }),
        })
      );
    });

    it("should create an index with HNSW index options", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 1536,
      });

      expect(mockIndices.create).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            mappings: expect.objectContaining({
              properties: expect.objectContaining({
                vector: expect.objectContaining({
                  index_options: expect.objectContaining({
                    type: "hnsw",
                    m: 16,
                    ef_construction: 100,
                  }),
                }),
              }),
            }),
          }),
        })
      );
    });

    it("should delete an index", async () => {
      await adapter.deleteIndex("test-index");
      expect(mockIndices.delete).toHaveBeenCalledWith({ index: "test-index" });
    });

    it("should list indexes", async () => {
      const indexes = await adapter.listIndexes();
      expect(indexes).toEqual(["index1", "index2"]);
      expect(indexes).not.toContain(".internal"); // System index filtered
    });

    it("should list indexes with prefix filtering", async () => {
      const prefixAdapter = new ElasticsearchAdapter({
        node: "http://localhost:9200",
        indexPrefix: "myapp_",
      });
      await prefixAdapter.connect();

      mockCat.indices.mockResolvedValueOnce([
        { index: "myapp_index1" },
        { index: "myapp_index2" },
        { index: "other_index" },
      ]);

      const indexes = await prefixAdapter.listIndexes();
      expect(indexes).toEqual(["index1", "index2"]);
    });

    it("should check if index exists", async () => {
      const exists = await adapter.indexExists("test-index");
      expect(exists).toBe(true);
      expect(mockIndices.exists).toHaveBeenCalledWith({ index: "test-index" });
    });

    it("should return false for non-existent index", async () => {
      mockIndices.exists.mockResolvedValueOnce(false);
      const exists = await adapter.indexExists("nonexistent");
      expect(exists).toBe(false);
    });

    it("should handle index not found error gracefully", async () => {
      mockIndices.exists.mockRejectedValueOnce(
        new Error("index_not_found_exception")
      );
      const exists = await adapter.indexExists("nonexistent");
      expect(exists).toBe(false);
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

    it("should upsert records using bulk API", async () => {
      const result = await adapter.upsert("test-index", testRecords);
      expect(result.upsertedCount).toBe(2);
      expect(mockClient.bulk).toHaveBeenCalled();
    });

    it("should include document ID in bulk operations", async () => {
      await adapter.upsert("test-index", testRecords);

      const bulkCall = mockClient.bulk.mock.calls[0][0];
      expect(bulkCall.body).toContainEqual(
        expect.objectContaining({
          index: expect.objectContaining({
            _id: "vec-1",
          }),
        })
      );
    });

    it("should include vector and metadata in documents", async () => {
      await adapter.upsert("test-index", testRecords);

      const bulkCall = mockClient.bulk.mock.calls[0][0];
      expect(bulkCall.body).toContainEqual(
        expect.objectContaining({
          id: "vec-1",
          vector: [0.1, 0.2, 0.3],
          metadata: { category: "tech" },
          content: "Test content 1",
        })
      );
    });

    it("should upsert with namespace", async () => {
      await adapter.upsert("test-index", testRecords, {
        namespace: "ns1",
      });

      const bulkCall = mockClient.bulk.mock.calls[0][0];
      expect(bulkCall.body).toContainEqual(
        expect.objectContaining({
          namespace: "ns1",
        })
      );
    });

    it("should validate vector dimensions", async () => {
      const invalidRecords = [
        { id: "v1", vector: [0.1, 0.2, 0.3] },
        { id: "v2", vector: [0.1, 0.2] }, // Different dimension
      ];

      await expect(
        adapter.upsert("test-index", invalidRecords)
      ).rejects.toThrow("Inconsistent vector dimensions");
    });

    it("should handle empty records array", async () => {
      const result = await adapter.upsert("test-index", []);
      expect(result.upsertedCount).toBe(0);
      expect(mockClient.bulk).not.toHaveBeenCalled();
    });

    it("should use configured refresh policy", async () => {
      const refreshAdapter = new ElasticsearchAdapter({
        node: "http://localhost:9200",
        refreshPolicy: "wait_for",
      });
      await refreshAdapter.connect();

      await refreshAdapter.upsert("test-index", testRecords);

      expect(mockClient.bulk).toHaveBeenCalledWith(
        expect.objectContaining({
          refresh: "wait_for",
        })
      );
    });
  });

  describe("Query Operations", () => {
    const queryVector = [0.1, 0.2, 0.3];

    beforeEach(async () => {
      await adapter.connect();
    });

    it("should query vectors using kNN search", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
      };

      const results = await adapter.query("test-index", options);

      expect(mockClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            knn: expect.objectContaining({
              field: "vector",
              query_vector: queryVector,
              k: 10,
            }),
          }),
        })
      );

      expect(results.length).toBe(2);
      expect(results[0].id).toBe("vec-1");
      expect(results[0].score).toBe(0.95);
    });

    it("should include metadata in results when requested", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        includeMetadata: true,
      };

      const results = await adapter.query("test-index", options);

      expect(results[0].metadata).toEqual({ category: "tech" });
    });

    it("should include vectors in results when requested", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        includeVectors: true,
      };

      const results = await adapter.query("test-index", options);

      expect(results[0].vector).toEqual([0.1, 0.2, 0.3]);
    });

    it("should filter by minimum score", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        minScore: 0.9,
      };

      const results = await adapter.query("test-index", options);

      // Only vec-1 with score 0.95 should pass
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("vec-1");
    });

    it("should filter by namespace", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        namespace: "ns1",
      };

      await adapter.query("test-index", options);

      expect(mockClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            knn: expect.objectContaining({
              filter: expect.objectContaining({
                bool: expect.objectContaining({
                  must: expect.arrayContaining([
                    { term: { namespace: "ns1" } },
                  ]),
                }),
              }),
            }),
          }),
        })
      );
    });

    it("should apply metadata filter", async () => {
      const options: VectorQueryOptions<{ category: string }> = {
        vector: queryVector,
        topK: 10,
        filter: { category: "tech" },
      };

      await adapter.query("test-index", options);

      expect(mockClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            knn: expect.objectContaining({
              filter: expect.anything(),
            }),
          }),
        })
      );
    });

    it("should use num_candidates for better recall", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
      };

      await adapter.query("test-index", options);

      expect(mockClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            knn: expect.objectContaining({
              num_candidates: 100, // At least 2x topK or 100
            }),
          }),
        })
      );
    });
  });

  describe("Delete Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should delete by IDs using bulk API", async () => {
      mockClient.bulk.mockResolvedValueOnce({
        items: [
          { delete: { status: 200 } },
          { delete: { status: 200 } },
        ],
      });

      const result = await adapter.delete("test-index", {
        ids: ["vec-1", "vec-2"],
      });

      expect(mockClient.bulk).toHaveBeenCalled();
      expect(result.deletedCount).toBe(2);
    });

    it("should delete by filter using deleteByQuery", async () => {
      const result = await adapter.delete("test-index", {
        filter: { category: "deprecated" },
      });

      expect(mockClient.deleteByQuery).toHaveBeenCalled();
      expect(result.deletedCount).toBe(5);
    });

    it("should delete by namespace", async () => {
      const result = await adapter.delete("test-index", {
        namespace: "old-data",
        deleteAll: true,
      });

      expect(mockClient.deleteByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {
            query: { term: { namespace: "old-data" } },
          },
        })
      );
      expect(result.deletedCount).toBe(5);
    });

    it("should delete all records", async () => {
      const result = await adapter.delete("test-index", {
        deleteAll: true,
      });

      expect(mockClient.deleteByQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          body: {
            query: { match_all: {} },
          },
        })
      );
      expect(result.deletedCount).toBe(5);
    });

    it("should handle 404 status for already deleted documents", async () => {
      mockClient.bulk.mockResolvedValueOnce({
        items: [
          { delete: { status: 200 } },
          { delete: { status: 404 } }, // Already deleted
        ],
      });

      const result = await adapter.delete("test-index", {
        ids: ["vec-1", "vec-deleted"],
      });

      expect(result.deletedCount).toBe(2); // Both count as success
    });
  });

  describe("Statistics", () => {
    beforeEach(async () => {
      await adapter.connect();
      // Mock aggregation response for namespace count
      mockClient.search.mockResolvedValueOnce({
        aggregations: {
          namespace_count: { value: 3 },
        },
      });
    });

    it("should get index statistics", async () => {
      const stats = await adapter.getStats("test-index");

      expect(stats.vectorCount).toBe(100);
      expect(stats.indexSize).toBe(1024000);
      expect(stats.dimension).toBe(1536);
      expect(stats.namespaceCount).toBe(3);
    });

    it("should include metrics information", async () => {
      const stats = await adapter.getStats("test-index");

      expect(stats.metrics).toBeDefined();
      expect(stats.metrics?.docsCount).toBe(100);
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

    it("should return healthy for yellow cluster status", async () => {
      await adapter.connect();
      mockCluster.health.mockResolvedValueOnce({ status: "yellow" });

      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.status).toBe("connected");
    });

    it("should return degraded for red cluster status", async () => {
      await adapter.connect();
      mockCluster.health.mockResolvedValueOnce({ status: "red" });

      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.status).toBe("degraded");
      expect(health.error).toContain("red");
    });

    it("should return disconnected status when not connected", async () => {
      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.status).toBe("disconnected");
    });

    it("should return error status on exception", async () => {
      await adapter.connect();
      mockCluster.health.mockRejectedValueOnce(new Error("Network error"));

      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.status).toBe("error");
      expect(health.error).toContain("Network error");
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
      // Mock bulk to return items matching each batch size
      mockClient.bulk
        .mockResolvedValueOnce({
          items: Array.from({ length: 100 }, () => ({ index: { status: 201 } })),
        })
        .mockResolvedValueOnce({
          items: Array.from({ length: 100 }, () => ({ index: { status: 201 } })),
        })
        .mockResolvedValueOnce({
          items: Array.from({ length: 50 }, () => ({ index: { status: 201 } })),
        });

      const result = await adapter.batchUpsert("test-index", manyRecords, {
        batchSize: 100,
      });

      expect(result.upsertedCount).toBe(250);
      expect(mockClient.bulk).toHaveBeenCalledTimes(3); // 100 + 100 + 50
    });

    it("should batch delete large ID lists", async () => {
      const ids = manyRecords.map((r) => r.id);
      mockClient.bulk
        .mockResolvedValueOnce({
          items: Array.from({ length: 100 }, () => ({ delete: { status: 200 } })),
        })
        .mockResolvedValueOnce({
          items: Array.from({ length: 100 }, () => ({ delete: { status: 200 } })),
        })
        .mockResolvedValueOnce({
          items: Array.from({ length: 50 }, () => ({ delete: { status: 200 } })),
        });

      const result = await adapter.batchDelete("test-index", ids, {
        batchSize: 100,
      });

      expect(result.deletedCount).toBe(250); // 100 + 100 + 50
      expect(mockClient.bulk).toHaveBeenCalledTimes(3);
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

      expect(mockClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            knn: expect.objectContaining({
              filter: expect.objectContaining({
                bool: expect.objectContaining({
                  must: expect.arrayContaining([
                    { term: { "metadata.category": "tech" } },
                  ]),
                }),
              }),
            }),
          }),
        })
      );
    });

    it("should translate $eq operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { status: { $eq: "active" } },
      });

      expect(mockClient.search).toHaveBeenCalled();
    });

    it("should translate $ne operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { status: { $ne: "deleted" } },
      });

      expect(mockClient.search).toHaveBeenCalled();
    });

    it("should translate comparison operators ($gt, $gte, $lt, $lte)", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { price: { $gte: 100, $lte: 500 } },
      });

      expect(mockClient.search).toHaveBeenCalled();
    });

    it("should translate $in operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          status: { $in: ["active", "pending"] },
        },
      });

      expect(mockClient.search).toHaveBeenCalled();
    });

    it("should translate $nin operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          status: { $nin: ["deleted", "archived"] },
        },
      });

      expect(mockClient.search).toHaveBeenCalled();
    });

    it("should translate logical $and operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $and: [{ category: "tech" }, { status: "active" }],
        },
      });

      expect(mockClient.search).toHaveBeenCalled();
    });

    it("should translate logical $or operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $or: [{ category: "tech" }, { category: "science" }],
        },
      });

      expect(mockClient.search).toHaveBeenCalled();
    });

    it("should translate $not operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $not: { category: "spam" },
        },
      });

      expect(mockClient.search).toHaveBeenCalled();
    });

    it("should translate $exists operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          optional_field: { $exists: true },
        },
      });

      expect(mockClient.search).toHaveBeenCalled();
    });

    it("should translate string operators ($contains, $startsWith, $endsWith)", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          title: { $contains: "vector" },
        },
      });

      expect(mockClient.search).toHaveBeenCalled();

      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          title: { $startsWith: "intro" },
        },
      });

      expect(mockClient.search).toHaveBeenCalled();

      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          title: { $endsWith: "doc" },
        },
      });

      expect(mockClient.search).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should throw when operating without connection", async () => {
      await expect(adapter.listIndexes()).rejects.toThrow(
        "not initialized. Call connect() first"
      );
    });

    it("should throw when creating index fails", async () => {
      await adapter.connect();
      mockIndices.create.mockRejectedValueOnce(new Error("Index exists"));

      await expect(
        adapter.createIndex({ name: "test", dimension: 128 })
      ).rejects.toThrow("Failed to create index");
    });

    it("should throw when deleting index fails", async () => {
      await adapter.connect();
      mockIndices.delete.mockRejectedValueOnce(new Error("Index not found"));

      await expect(adapter.deleteIndex("test")).rejects.toThrow(
        "Failed to delete index"
      );
    });

    it("should throw when upsert fails", async () => {
      await adapter.connect();
      mockClient.bulk.mockRejectedValueOnce(new Error("Bulk error"));

      await expect(
        adapter.upsert("test", [{ id: "1", vector: [0.1] }])
      ).rejects.toThrow("Failed to upsert");
    });

    it("should throw when query fails", async () => {
      await adapter.connect();
      mockClient.search.mockRejectedValueOnce(new Error("Search error"));

      await expect(
        adapter.query("test", { vector: [0.1], topK: 10 })
      ).rejects.toThrow("Failed to query");
    });

    it("should throw when delete fails", async () => {
      await adapter.connect();
      mockClient.bulk.mockRejectedValueOnce(new Error("Delete error"));

      await expect(adapter.delete("test", { ids: ["1"] })).rejects.toThrow(
        "Failed to delete"
      );
    });

    it("should throw when getting stats fails", async () => {
      await adapter.connect();
      mockIndices.stats.mockRejectedValueOnce(new Error("Stats error"));

      await expect(adapter.getStats("test")).rejects.toThrow(
        "Failed to get stats"
      );
    });
  });

  describe("Index Prefix", () => {
    let prefixAdapter: ElasticsearchAdapter;

    beforeEach(async () => {
      prefixAdapter = new ElasticsearchAdapter({
        node: "http://localhost:9200",
        indexPrefix: "myapp_",
      });
      await prefixAdapter.connect();
    });

    afterEach(async () => {
      if (prefixAdapter.isInitialized()) {
        await prefixAdapter.disconnect();
      }
    });

    it("should apply prefix when creating index", async () => {
      await prefixAdapter.createIndex({
        name: "vectors",
        dimension: 1536,
      });

      expect(mockIndices.create).toHaveBeenCalledWith(
        expect.objectContaining({
          index: "myapp_vectors",
        })
      );
    });

    it("should apply prefix when deleting index", async () => {
      await prefixAdapter.deleteIndex("vectors");

      expect(mockIndices.delete).toHaveBeenCalledWith({
        index: "myapp_vectors",
      });
    });

    it("should apply prefix when checking index existence", async () => {
      await prefixAdapter.indexExists("vectors");

      expect(mockIndices.exists).toHaveBeenCalledWith({
        index: "myapp_vectors",
      });
    });

    it("should apply prefix when upserting", async () => {
      await prefixAdapter.upsert("vectors", [
        { id: "1", vector: [0.1, 0.2] },
      ]);

      expect(mockClient.bulk).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.arrayContaining([
            expect.objectContaining({
              index: expect.objectContaining({
                _index: "myapp_vectors",
              }),
            }),
          ]),
        })
      );
    });

    it("should apply prefix when querying", async () => {
      await prefixAdapter.query("vectors", {
        vector: [0.1, 0.2],
        topK: 10,
      });

      expect(mockClient.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: "myapp_vectors",
        })
      );
    });
  });
});

describe("ElasticsearchAdapter Integration", () => {
  // These tests require a running Elasticsearch instance
  // Skip if not available

  it.skip("should work with real Elasticsearch cluster", async () => {
    // This test would use a real Elasticsearch cluster
    // Requires Elasticsearch to be running
  });
});
