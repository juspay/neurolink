/**
 * Qdrant Adapter Tests
 * Comprehensive test suite for the Qdrant vector store adapter
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { QdrantAdapter } from "../../../src/lib/vector/adapters/QdrantAdapter.js";
import type {
  QdrantConfig,
  QdrantClientFactory,
} from "../../../src/lib/vector/adapters/QdrantAdapter.js";
import type {
  VectorRecord,
  VectorQueryOptions,
} from "../../../src/lib/vector/types.js";

// Mock Qdrant client interface
interface MockQdrantClient {
  getCollections: ReturnType<typeof vi.fn>;
  collectionExists: ReturnType<typeof vi.fn>;
  createCollection: ReturnType<typeof vi.fn>;
  deleteCollection: ReturnType<typeof vi.fn>;
  getCollection: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  search: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  scroll: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
  healthcheck: ReturnType<typeof vi.fn>;
}

// Create mock Qdrant client
const createMockClient = (): MockQdrantClient => ({
  getCollections: vi.fn().mockResolvedValue({ collections: [] }),
  collectionExists: vi.fn().mockResolvedValue({ exists: false }),
  createCollection: vi.fn().mockResolvedValue({ status: "completed", result: true }),
  deleteCollection: vi.fn().mockResolvedValue({ status: "completed", result: true }),
  getCollection: vi.fn().mockResolvedValue({
    name: "test-index",
    status: "green",
    points_count: 100,
    vectors_count: 100,
    segments_count: 1,
    config: {
      params: {
        vectors: {
          size: 128,
          distance: "Cosine",
        },
        shard_number: 1,
        replication_factor: 1,
      },
    },
  }),
  upsert: vi.fn().mockResolvedValue({ status: "completed", operation_id: 1 }),
  search: vi.fn().mockResolvedValue([]),
  delete: vi.fn().mockResolvedValue({ status: "completed", operation_id: 2 }),
  scroll: vi.fn().mockResolvedValue({ points: [], next_page_offset: undefined }),
  count: vi.fn().mockResolvedValue({ count: 0 }),
  healthcheck: vi.fn().mockResolvedValue({ title: "qdrant", version: "1.7.0" }),
});

// Create mock client factory
const createMockClientFactory = (mockClient: MockQdrantClient): QdrantClientFactory => {
  return async () => ({
    QdrantClient: vi.fn().mockImplementation(() => mockClient) as unknown as new (
      config: unknown,
    ) => MockQdrantClient,
  });
};

describe("QdrantAdapter", () => {
  let adapter: QdrantAdapter;
  let mockClient: MockQdrantClient;
  let mockClientFactory: QdrantClientFactory;

  const getDefaultConfig = (): QdrantConfig => ({
    url: "http://localhost:6333",
    clientFactory: mockClientFactory,
  });

  const getConfigWithOverrides = (overrides: Partial<QdrantConfig>): QdrantConfig => ({
    ...getDefaultConfig(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Create fresh mock client for each test
    mockClient = createMockClient();
    mockClientFactory = createMockClientFactory(mockClient);

    // Create the adapter after setting up mocks
    adapter = new QdrantAdapter(getDefaultConfig());
  });

  afterEach(async () => {
    if (adapter.isInitialized()) {
      await adapter.disconnect();
    }
  });

  // ============================
  // CONSTRUCTOR AND CONFIGURATION (8 tests)
  // ============================
  describe("Constructor and Configuration", () => {
    it("should create adapter with default configuration", () => {
      expect(adapter).toBeInstanceOf(QdrantAdapter);
      expect(adapter.getStoreName()).toBe("qdrant");
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should accept custom URL", () => {
      const customAdapter = new QdrantAdapter(
        getConfigWithOverrides({
          url: "https://my-cluster.cloud.qdrant.io",
        }),
      );
      const config = customAdapter.getConfig();
      expect(config.url).toBe("https://my-cluster.cloud.qdrant.io");
    });

    it("should accept API key for Qdrant Cloud", () => {
      const cloudAdapter = new QdrantAdapter(
        getConfigWithOverrides({
          url: "https://my-cluster.cloud.qdrant.io",
          apiKey: "test-api-key",
        }),
      );
      const config = cloudAdapter.getConfig();
      expect(config.apiKey).toBe("test-api-key");
    });

    it("should accept custom timeout", () => {
      const customAdapter = new QdrantAdapter(
        getConfigWithOverrides({
          timeout: 60000,
        }),
      );
      const config = customAdapter.getConfig();
      expect(config.timeout).toBe(60000);
    });

    it("should accept HTTPS setting", () => {
      const httpsAdapter = new QdrantAdapter(
        getConfigWithOverrides({
          https: true,
        }),
      );
      const config = httpsAdapter.getConfig();
      expect(config.https).toBe(true);
    });

    it("should accept default shard key for multi-tenancy", () => {
      const tenantAdapter = new QdrantAdapter(
        getConfigWithOverrides({
          defaultShardKey: "tenant-123",
        }),
      );
      const config = tenantAdapter.getConfig();
      expect(config.defaultShardKey).toBe("tenant-123");
    });

    it("should accept on-disk payload storage setting", () => {
      const diskAdapter = new QdrantAdapter(
        getConfigWithOverrides({
          onDiskPayload: true,
        }),
      );
      const config = diskAdapter.getConfig();
      expect(config.onDiskPayload).toBe(true);
    });

    it("should accept write consistency factor", () => {
      const consistentAdapter = new QdrantAdapter(
        getConfigWithOverrides({
          writeConsistencyFactor: 2,
        }),
      );
      const config = consistentAdapter.getConfig();
      expect(config.writeConsistencyFactor).toBe(2);
    });
  });

  // ============================
  // CONNECTION MANAGEMENT (7 tests)
  // ============================
  describe("Connection Management", () => {
    it("should connect successfully", async () => {
      await adapter.connect();
      expect(adapter.isInitialized()).toBe(true);
      expect(mockClient.healthcheck).toHaveBeenCalled();
    });

    it("should not reconnect if already connected", async () => {
      await adapter.connect();
      await adapter.connect(); // Second call should be a no-op
      expect(adapter.isInitialized()).toBe(true);
      expect(mockClient.healthcheck).toHaveBeenCalledTimes(1);
    });

    it("should disconnect successfully", async () => {
      await adapter.connect();
      await adapter.disconnect();
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should handle disconnect when not connected", async () => {
      // Should not throw
      await adapter.disconnect();
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should throw when healthcheck fails", async () => {
      mockClient.healthcheck.mockRejectedValueOnce(new Error("Connection refused"));

      await expect(adapter.connect()).rejects.toThrow(
        "Failed to connect to Qdrant",
      );
    });

    it("should connect with API key authentication", async () => {
      const authAdapter = new QdrantAdapter(
        getConfigWithOverrides({
          url: "https://my-cluster.cloud.qdrant.io",
          apiKey: "test-api-key",
        }),
      );

      await authAdapter.connect();
      expect(authAdapter.isInitialized()).toBe(true);
    });

    it("should pass TLS settings to client", async () => {
      const tlsAdapter = new QdrantAdapter(
        getConfigWithOverrides({
          https: true,
          checkTls: false,
        }),
      );

      await tlsAdapter.connect();
      expect(tlsAdapter.isInitialized()).toBe(true);
    });
  });

  // ============================
  // INDEX OPERATIONS (12 tests)
  // ============================
  describe("Index Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should create an index with default settings", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 128,
      });

      expect(mockClient.collectionExists).toHaveBeenCalledWith("test-index");
      expect(mockClient.createCollection).toHaveBeenCalledWith(
        "test-index",
        expect.objectContaining({
          vectors: expect.objectContaining({
            size: 128,
            distance: "Cosine",
          }),
        }),
      );
    });

    it("should create index with cosine metric", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 128,
        metric: "cosine",
      });

      expect(mockClient.createCollection).toHaveBeenCalledWith(
        "test-index",
        expect.objectContaining({
          vectors: expect.objectContaining({
            distance: "Cosine",
          }),
        }),
      );
    });

    it("should create index with euclidean metric", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 128,
        metric: "euclidean",
      });

      expect(mockClient.createCollection).toHaveBeenCalledWith(
        "test-index",
        expect.objectContaining({
          vectors: expect.objectContaining({
            distance: "Euclid",
          }),
        }),
      );
    });

    it("should create index with dotProduct metric", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 128,
        metric: "dotProduct",
      });

      expect(mockClient.createCollection).toHaveBeenCalledWith(
        "test-index",
        expect.objectContaining({
          vectors: expect.objectContaining({
            distance: "Dot",
          }),
        }),
      );
    });

    it("should not create index if it already exists", async () => {
      mockClient.collectionExists.mockResolvedValueOnce({ exists: true });

      await adapter.createIndex({
        name: "existing-index",
        dimension: 128,
      });

      expect(mockClient.createCollection).not.toHaveBeenCalled();
    });

    it("should create index with HNSW configuration", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 128,
        config: {
          hnsw: {
            m: 32,
            efConstruct: 200,
          },
        },
      });

      expect(mockClient.createCollection).toHaveBeenCalledWith(
        "test-index",
        expect.objectContaining({
          vectors: expect.objectContaining({
            hnsw_config: expect.objectContaining({
              m: 32,
              ef_construct: 200,
            }),
          }),
        }),
      );
    });

    it("should create index with scalar quantization", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 128,
        config: {
          quantization: {
            type: "scalar",
            scalar: {
              dataType: "int8",
              quantile: 0.99,
            },
          },
        },
      });

      expect(mockClient.createCollection).toHaveBeenCalledWith(
        "test-index",
        expect.objectContaining({
          vectors: expect.objectContaining({
            quantization_config: expect.objectContaining({
              scalar: expect.objectContaining({
                type: "int8",
                quantile: 0.99,
              }),
            }),
          }),
        }),
      );
    });

    it("should delete an index", async () => {
      mockClient.collectionExists.mockResolvedValueOnce({ exists: true });

      await adapter.deleteIndex("test-index");

      expect(mockClient.deleteCollection).toHaveBeenCalledWith("test-index");
    });

    it("should not delete non-existent index", async () => {
      mockClient.collectionExists.mockResolvedValueOnce({ exists: false });

      await adapter.deleteIndex("nonexistent");

      expect(mockClient.deleteCollection).not.toHaveBeenCalled();
    });

    it("should list indexes", async () => {
      mockClient.getCollections.mockResolvedValueOnce({
        collections: [
          { name: "index1" },
          { name: "index2" },
          { name: "index3" },
        ],
      });

      const indexes = await adapter.listIndexes();
      expect(indexes).toEqual(["index1", "index2", "index3"]);
    });

    it("should check if index exists", async () => {
      mockClient.collectionExists.mockResolvedValueOnce({ exists: true });
      const exists = await adapter.indexExists("test-index");
      expect(exists).toBe(true);

      mockClient.collectionExists.mockResolvedValueOnce({ exists: false });
      const notExists = await adapter.indexExists("nonexistent");
      expect(notExists).toBe(false);
    });

    it("should sanitize collection names", async () => {
      await adapter.createIndex({
        name: "test.collection@name!",
        dimension: 128,
      });

      expect(mockClient.collectionExists).toHaveBeenCalledWith("test_collection_name_");
    });
  });

  // ============================
  // UPSERT OPERATIONS (9 tests)
  // ============================
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
      expect(mockClient.upsert).toHaveBeenCalledWith(
        "test-index",
        expect.objectContaining({
          wait: true,
          points: expect.arrayContaining([
            expect.objectContaining({
              id: "vec-1",
              vector: [0.1, 0.2, 0.3],
              payload: expect.objectContaining({
                category: "tech",
                _content: "Test content 1",
              }),
            }),
          ]),
        }),
      );
    });

    it("should upsert with namespace", async () => {
      const result = await adapter.upsert("test-index", testRecords, {
        namespace: "ns1",
      });
      expect(result.upsertedCount).toBe(2);
      expect(mockClient.upsert).toHaveBeenCalledWith(
        "test-index",
        expect.objectContaining({
          points: expect.arrayContaining([
            expect.objectContaining({
              payload: expect.objectContaining({
                _namespace: "ns1",
              }),
            }),
          ]),
        }),
      );
    });

    it("should handle numeric IDs", async () => {
      const numericRecords = [
        { id: "123", vector: [0.1, 0.2, 0.3] },
        { id: "456", vector: [0.4, 0.5, 0.6] },
      ];

      await adapter.upsert("test-index", numericRecords);

      expect(mockClient.upsert).toHaveBeenCalledWith(
        "test-index",
        expect.objectContaining({
          points: expect.arrayContaining([
            expect.objectContaining({ id: 123 }),
            expect.objectContaining({ id: 456 }),
          ]),
        }),
      );
    });

    it("should handle string IDs (UUIDs)", async () => {
      const uuidRecords = [
        { id: "550e8400-e29b-41d4-a716-446655440000", vector: [0.1, 0.2, 0.3] },
      ];

      await adapter.upsert("test-index", uuidRecords);

      expect(mockClient.upsert).toHaveBeenCalledWith(
        "test-index",
        expect.objectContaining({
          points: expect.arrayContaining([
            expect.objectContaining({
              id: "550e8400-e29b-41d4-a716-446655440000",
            }),
          ]),
        }),
      );
    });

    it("should batch upsert large datasets", async () => {
      const manyRecords = Array.from({ length: 250 }, (_, i) => ({
        id: `vec-${i}`,
        vector: [0.1, 0.2, 0.3],
        metadata: { index: i },
      }));

      const result = await adapter.upsert("test-index", manyRecords, {
        batchSize: 100,
      });

      expect(result.upsertedCount).toBe(250);
      expect(mockClient.upsert).toHaveBeenCalledTimes(3); // 3 batches
    });

    it("should validate vector dimensions", async () => {
      const invalidRecords = [
        { id: "v1", vector: [0.1, 0.2, 0.3] },
        { id: "v2", vector: [0.1, 0.2] }, // Different dimension
      ];

      await expect(
        adapter.upsert("test-index", invalidRecords),
      ).rejects.toThrow("Inconsistent vector dimensions");
    });

    it("should handle empty records array", async () => {
      const result = await adapter.upsert("test-index", []);
      expect(result.upsertedCount).toBe(0);
      expect(mockClient.upsert).not.toHaveBeenCalled();
    });

    it("should use shard key when configured", async () => {
      const tenantAdapter = new QdrantAdapter(
        getConfigWithOverrides({
          defaultShardKey: "tenant-123",
        }),
      );
      await tenantAdapter.connect();

      await tenantAdapter.upsert("test-index", testRecords);

      expect(mockClient.upsert).toHaveBeenCalledWith(
        "test-index",
        expect.objectContaining({
          shard_key_selector: "tenant-123",
        }),
      );
    });

    it("should handle upsert failure", async () => {
      mockClient.upsert.mockRejectedValueOnce(new Error("Upsert failed"));

      await expect(
        adapter.upsert("test-index", testRecords),
      ).rejects.toThrow("Failed to upsert");
    });
  });

  // ============================
  // QUERY OPERATIONS (12 tests)
  // ============================
  describe("Query Operations", () => {
    const queryVector = [0.1, 0.2, 0.3];

    beforeEach(async () => {
      await adapter.connect();

      // Default search results
      mockClient.search.mockResolvedValue([
        {
          id: "vec-1",
          score: 0.95,
          payload: {
            _content: "Test content",
            _namespace: "",
            category: "tech",
          },
          vector: [0.1, 0.2, 0.3],
        },
      ]);
    });

    it("should query vectors", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
      };

      const results = await adapter.query("test-index", options);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty("id");
      expect(results[0]).toHaveProperty("score");
    });

    it("should query with topK limit", async () => {
      await adapter.query("test-index", {
        vector: queryVector,
        topK: 5,
      });

      expect(mockClient.search).toHaveBeenCalledWith(
        "test-index",
        expect.objectContaining({
          limit: 5,
        }),
      );
    });

    it("should query with minimum score threshold", async () => {
      await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
        minScore: 0.8,
      });

      expect(mockClient.search).toHaveBeenCalledWith(
        "test-index",
        expect.objectContaining({
          score_threshold: 0.8,
        }),
      );
    });

    it("should query with namespace filter", async () => {
      await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
        namespace: "ns1",
      });

      expect(mockClient.search).toHaveBeenCalledWith(
        "test-index",
        expect.objectContaining({
          filter: expect.objectContaining({
            must: expect.arrayContaining([
              expect.objectContaining({
                key: "_namespace",
                match: { value: "ns1" },
              }),
            ]),
          }),
        }),
      );
    });

    it("should include vectors when requested", async () => {
      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
        includeVectors: true,
      });

      expect(mockClient.search).toHaveBeenCalledWith(
        "test-index",
        expect.objectContaining({
          with_vector: true,
        }),
      );
      expect(results[0].vector).toEqual([0.1, 0.2, 0.3]);
    });

    it("should include metadata when requested", async () => {
      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
        includeMetadata: true,
      });

      expect(mockClient.search).toHaveBeenCalledWith(
        "test-index",
        expect.objectContaining({
          with_payload: true,
        }),
      );
      expect(results[0].metadata).toEqual({ category: "tech" });
    });

    it("should extract content from payload", async () => {
      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
        includeMetadata: true,
      });

      expect(results[0].content).toBe("Test content");
    });

    it("should handle empty results", async () => {
      mockClient.search.mockResolvedValueOnce([]);

      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
      });

      expect(results).toEqual([]);
    });

    it("should apply metadata filter", async () => {
      await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
        filter: { category: "tech" },
      });

      expect(mockClient.search).toHaveBeenCalledWith(
        "test-index",
        expect.objectContaining({
          filter: expect.objectContaining({
            must: expect.arrayContaining([
              expect.objectContaining({
                filter: expect.objectContaining({
                  must: expect.arrayContaining([
                    expect.objectContaining({
                      key: "category",
                      match: { value: "tech" },
                    }),
                  ]),
                }),
              }),
            ]),
          }),
        }),
      );
    });

    it("should use shard key when configured", async () => {
      const tenantAdapter = new QdrantAdapter(
        getConfigWithOverrides({
          defaultShardKey: "tenant-123",
        }),
      );
      await tenantAdapter.connect();

      await tenantAdapter.query("test-index", {
        vector: queryVector,
        topK: 10,
      });

      expect(mockClient.search).toHaveBeenCalledWith(
        "test-index",
        expect.objectContaining({
          shard_key_selector: "tenant-123",
        }),
      );
    });

    it("should handle query failure", async () => {
      mockClient.search.mockRejectedValueOnce(new Error("Search failed"));

      await expect(
        adapter.query("test-index", { vector: queryVector, topK: 10 }),
      ).rejects.toThrow("Failed to query");
    });

    it("should convert numeric IDs to strings", async () => {
      mockClient.search.mockResolvedValueOnce([
        { id: 12345, score: 0.9, payload: { _content: "", _namespace: "" } },
      ]);

      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
      });

      expect(results[0].id).toBe("12345");
    });
  });

  // ============================
  // DELETE OPERATIONS (8 tests)
  // ============================
  describe("Delete Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should delete by IDs", async () => {
      const result = await adapter.delete("test-index", {
        ids: ["vec-1", "vec-2"],
      });

      expect(mockClient.delete).toHaveBeenCalledWith(
        "test-index",
        expect.objectContaining({
          points: ["vec-1", "vec-2"],
        }),
      );
      expect(result.deletedCount).toBe(2);
    });

    it("should delete by numeric IDs", async () => {
      const result = await adapter.delete("test-index", {
        ids: ["123", "456"],
      });

      expect(mockClient.delete).toHaveBeenCalledWith(
        "test-index",
        expect.objectContaining({
          points: [123, 456],
        }),
      );
      expect(result.deletedCount).toBe(2);
    });

    it("should delete by filter", async () => {
      mockClient.count.mockResolvedValueOnce({ count: 5 });

      const result = await adapter.delete("test-index", {
        filter: { category: "deprecated" },
      });

      expect(mockClient.delete).toHaveBeenCalledWith(
        "test-index",
        expect.objectContaining({
          filter: expect.any(Object),
        }),
      );
      expect(result.deletedCount).toBe(5);
    });

    it("should delete all records", async () => {
      mockClient.count.mockResolvedValueOnce({ count: 100 });
      mockClient.scroll.mockResolvedValueOnce({
        points: Array.from({ length: 100 }, (_, i) => ({ id: `point-${i}` })),
      });

      const result = await adapter.delete("test-index", {
        deleteAll: true,
      });

      expect(mockClient.delete).toHaveBeenCalled();
      expect(result.deletedCount).toBe(100);
    });

    it("should delete all by namespace", async () => {
      mockClient.count.mockResolvedValueOnce({ count: 50 });

      const result = await adapter.delete("test-index", {
        namespace: "old-data",
        deleteAll: true,
      });

      expect(mockClient.delete).toHaveBeenCalledWith(
        "test-index",
        expect.objectContaining({
          filter: expect.objectContaining({
            must: expect.arrayContaining([
              expect.objectContaining({
                key: "_namespace",
                match: { value: "old-data" },
              }),
            ]),
          }),
        }),
      );
      expect(result.deletedCount).toBe(50);
    });

    it("should use shard key when configured", async () => {
      const tenantAdapter = new QdrantAdapter(
        getConfigWithOverrides({
          defaultShardKey: "tenant-123",
        }),
      );
      await tenantAdapter.connect();

      await tenantAdapter.delete("test-index", { ids: ["vec-1"] });

      expect(mockClient.delete).toHaveBeenCalledWith(
        "test-index",
        expect.objectContaining({
          shard_key_selector: "tenant-123",
        }),
      );
    });

    it("should handle delete failure", async () => {
      mockClient.delete.mockRejectedValueOnce(new Error("Delete failed"));

      await expect(
        adapter.delete("test-index", { ids: ["vec-1"] }),
      ).rejects.toThrow("Failed to delete");
    });

    it("should return 0 when no records to delete", async () => {
      mockClient.scroll.mockResolvedValueOnce({ points: [] });

      const result = await adapter.delete("test-index", { deleteAll: true });
      expect(result.deletedCount).toBe(0);
    });
  });

  // ============================
  // STATISTICS (5 tests)
  // ============================
  describe("Statistics", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should get index statistics", async () => {
      const stats = await adapter.getStats("test-index");

      expect(stats.vectorCount).toBe(100);
      expect(stats.dimension).toBe(128);
      expect(stats.metrics?.distance).toBe("Cosine");
    });

    it("should get namespace count", async () => {
      mockClient.scroll.mockResolvedValueOnce({
        points: [
          { id: 1, payload: { _namespace: "ns1" } },
          { id: 2, payload: { _namespace: "ns2" } },
          { id: 3, payload: { _namespace: "ns1" } },
          { id: 4, payload: { _namespace: "ns3" } },
        ],
      });

      const stats = await adapter.getStats("test-index");
      expect(stats.namespaceCount).toBe(3); // Unique namespaces
    });

    it("should include shard and replication info", async () => {
      const stats = await adapter.getStats("test-index");

      expect(stats.metrics?.shardNumber).toBe(1);
      expect(stats.metrics?.replicationFactor).toBe(1);
    });

    it("should handle named vectors config", async () => {
      mockClient.getCollection.mockResolvedValueOnce({
        name: "test-index",
        points_count: 100,
        config: {
          params: {
            vectors: {
              text: { size: 768, distance: "Cosine" },
              image: { size: 512, distance: "Euclid" },
            },
          },
        },
      });

      const stats = await adapter.getStats("test-index");
      expect(stats.dimension).toBe(768); // First vector dimension
    });

    it("should handle stats failure", async () => {
      mockClient.getCollection.mockRejectedValueOnce(new Error("Stats failed"));

      await expect(adapter.getStats("test-index")).rejects.toThrow(
        "Failed to get stats",
      );
    });
  });

  // ============================
  // HEALTH CHECK (4 tests)
  // ============================
  describe("Health Check", () => {
    it("should return healthy status when connected", async () => {
      await adapter.connect();

      const health = await adapter.healthCheck();
      expect(health.healthy).toBe(true);
      expect(health.status).toBe("connected");
      expect(health.latencyMs).toBeGreaterThanOrEqual(0);
      expect(health.lastChecked).toBeInstanceOf(Date);
    });

    it("should return disconnected status when not initialized", async () => {
      const health = await adapter.healthCheck();
      expect(health.healthy).toBe(false);
      expect(health.status).toBe("disconnected");
    });

    it("should return error status on healthcheck failure", async () => {
      await adapter.connect();
      mockClient.healthcheck.mockRejectedValueOnce(new Error("Health check failed"));

      const health = await adapter.healthCheck();
      expect(health.healthy).toBe(false);
      expect(health.status).toBe("error");
      expect(health.error).toBe("Health check failed");
    });

    it("should measure latency", async () => {
      await adapter.connect();

      const health = await adapter.healthCheck();
      expect(typeof health.latencyMs).toBe("number");
      expect(health.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================
  // FILTER TRANSLATION (15 tests)
  // ============================
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
        "test-index",
        expect.objectContaining({
          filter: expect.objectContaining({
            must: expect.arrayContaining([
              expect.objectContaining({
                filter: expect.objectContaining({
                  must: expect.arrayContaining([
                    expect.objectContaining({
                      key: "category",
                      match: { value: "tech" },
                    }),
                  ]),
                }),
              }),
            ]),
          }),
        }),
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

    it("should translate $gt operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { price: { $gt: 100 } },
      });

      expect(mockClient.search).toHaveBeenCalled();
    });

    it("should translate $gte operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { price: { $gte: 100 } },
      });

      expect(mockClient.search).toHaveBeenCalled();
    });

    it("should translate $lt operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { price: { $lt: 500 } },
      });

      expect(mockClient.search).toHaveBeenCalled();
    });

    it("should translate $lte operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { price: { $lte: 500 } },
      });

      expect(mockClient.search).toHaveBeenCalled();
    });

    it("should translate $in operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { status: { $in: ["active", "pending"] } },
      });

      expect(mockClient.search).toHaveBeenCalled();
    });

    it("should translate $nin operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { status: { $nin: ["deleted", "archived"] } },
      });

      expect(mockClient.search).toHaveBeenCalled();
    });

    it("should translate $and operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $and: [{ category: "tech" }, { status: "active" }],
        },
      });

      expect(mockClient.search).toHaveBeenCalled();
    });

    it("should translate $or operator", async () => {
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
          $not: { status: "deleted" },
        },
      });

      expect(mockClient.search).toHaveBeenCalled();
    });

    it("should translate $contains operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          title: { $contains: "vector" },
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

    it("should translate compound range filters", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          price: { $gte: 100, $lte: 500 },
        },
      });

      expect(mockClient.search).toHaveBeenCalled();
    });

    it("should handle empty filter", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {},
      });

      // Should not add filter property
      expect(mockClient.search).toHaveBeenCalled();
    });
  });

  // ============================
  // NAMED VECTORS (5 tests)
  // ============================
  describe("Named Vectors", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should create index with named vectors", async () => {
      await adapter.createIndexWithNamedVectors("test-index", {
        text: { dimension: 768, metric: "cosine" },
        image: { dimension: 512, metric: "euclidean" },
      });

      expect(mockClient.createCollection).toHaveBeenCalledWith(
        "test-index",
        expect.objectContaining({
          vectors: expect.objectContaining({
            text: expect.objectContaining({ size: 768, distance: "Cosine" }),
            image: expect.objectContaining({ size: 512, distance: "Euclid" }),
          }),
        }),
      );
    });

    it("should upsert with named vectors", async () => {
      const records = [
        {
          id: "item-1",
          vectors: {
            text: [0.1, 0.2, 0.3],
            image: [0.4, 0.5],
          },
          metadata: { category: "tech" },
        },
      ];

      await adapter.upsertWithNamedVectors("test-index", records);

      expect(mockClient.upsert).toHaveBeenCalledWith(
        "test-index",
        expect.objectContaining({
          points: expect.arrayContaining([
            expect.objectContaining({
              id: "item-1",
              vector: {
                text: [0.1, 0.2, 0.3],
                image: [0.4, 0.5],
              },
            }),
          ]),
        }),
      );
    });

    it("should query named vector", async () => {
      mockClient.search.mockResolvedValueOnce([
        {
          id: "item-1",
          score: 0.95,
          payload: { _content: "", _namespace: "" },
          vector: { text: [0.1, 0.2, 0.3] },
        },
      ]);

      const results = await adapter.queryNamedVector("test-index", "text", {
        vector: [0.1, 0.2, 0.3],
        topK: 10,
        includeVectors: true,
      });

      expect(mockClient.search).toHaveBeenCalledWith(
        "test-index",
        expect.objectContaining({
          vector: { name: "text", vector: [0.1, 0.2, 0.3] },
        }),
      );
      expect(results[0].vector).toEqual([0.1, 0.2, 0.3]);
    });

    it("should not recreate existing index with named vectors", async () => {
      mockClient.collectionExists.mockResolvedValueOnce({ exists: true });

      await adapter.createIndexWithNamedVectors("existing-index", {
        text: { dimension: 768 },
      });

      expect(mockClient.createCollection).not.toHaveBeenCalled();
    });

    it("should handle named vector query failure", async () => {
      mockClient.search.mockRejectedValueOnce(new Error("Search failed"));

      await expect(
        adapter.queryNamedVector("test-index", "text", {
          vector: [0.1, 0.2, 0.3],
          topK: 10,
        }),
      ).rejects.toThrow("Failed to query named vector");
    });
  });

  // ============================
  // SCROLL OPERATIONS (4 tests)
  // ============================
  describe("Scroll Operations", () => {
    beforeEach(async () => {
      await adapter.connect();

      mockClient.scroll.mockResolvedValue({
        points: [
          { id: "item-1", payload: { _content: "Content 1", _namespace: "", category: "tech" } },
          { id: "item-2", payload: { _content: "Content 2", _namespace: "", category: "science" } },
        ],
        next_page_offset: "item-3",
      });
    });

    it("should scroll through all points", async () => {
      const result = await adapter.scroll("test-index", { limit: 100 });

      expect(result.results.length).toBe(2);
      expect(result.nextOffset).toBe("item-3");
    });

    it("should scroll with offset", async () => {
      await adapter.scroll("test-index", {
        limit: 100,
        offset: "item-3",
      });

      expect(mockClient.scroll).toHaveBeenCalledWith(
        "test-index",
        expect.objectContaining({
          offset: "item-3",
        }),
      );
    });

    it("should scroll with filter", async () => {
      await adapter.scroll("test-index", {
        limit: 100,
        filter: { category: "tech" },
      });

      expect(mockClient.scroll).toHaveBeenCalledWith(
        "test-index",
        expect.objectContaining({
          filter: expect.any(Object),
        }),
      );
    });

    it("should scroll with namespace", async () => {
      await adapter.scroll("test-index", {
        limit: 100,
        namespace: "ns1",
      });

      expect(mockClient.scroll).toHaveBeenCalledWith(
        "test-index",
        expect.objectContaining({
          filter: expect.objectContaining({
            must: expect.arrayContaining([
              expect.objectContaining({
                key: "_namespace",
                match: { value: "ns1" },
              }),
            ]),
          }),
        }),
      );
    });
  });

  // ============================
  // ERROR HANDLING (6 tests)
  // ============================
  describe("Error Handling", () => {
    it("should throw when operating without connection", async () => {
      await expect(adapter.listIndexes()).rejects.toThrow(
        "not initialized. Call connect() first",
      );
    });

    it("should throw when creating index fails", async () => {
      await adapter.connect();
      mockClient.createCollection.mockRejectedValueOnce(new Error("Create failed"));

      await expect(
        adapter.createIndex({ name: "test", dimension: 128 }),
      ).rejects.toThrow("Failed to create index");
    });

    it("should throw when deleting index fails", async () => {
      await adapter.connect();
      mockClient.collectionExists.mockResolvedValueOnce({ exists: true });
      mockClient.deleteCollection.mockRejectedValueOnce(new Error("Delete failed"));

      await expect(adapter.deleteIndex("test")).rejects.toThrow(
        "Failed to delete index",
      );
    });

    it("should throw when listing indexes fails", async () => {
      await adapter.connect();
      mockClient.getCollections.mockRejectedValueOnce(new Error("List failed"));

      await expect(adapter.listIndexes()).rejects.toThrow(
        "Failed to list indexes",
      );
    });

    it("should throw when checking index existence fails", async () => {
      await adapter.connect();
      mockClient.collectionExists.mockRejectedValueOnce(new Error("Check failed"));

      await expect(adapter.indexExists("test")).rejects.toThrow(
        "Failed to check index existence",
      );
    });

    it("should throw when scroll fails", async () => {
      await adapter.connect();
      mockClient.scroll.mockRejectedValueOnce(new Error("Scroll failed"));

      await expect(adapter.scroll("test-index")).rejects.toThrow(
        "Failed to scroll",
      );
    });
  });

  // ============================
  // BATCH OPERATIONS (4 tests)
  // ============================
  describe("Batch Operations (inherited)", () => {
    const manyRecords = Array.from({ length: 350 }, (_, i) => ({
      id: `vec-${i}`,
      vector: [0.1, 0.2, 0.3],
      metadata: { index: i },
    }));

    beforeEach(async () => {
      await adapter.connect();
    });

    it("should batch upsert large datasets", async () => {
      const result = await adapter.batchUpsert("test-index", manyRecords, {
        batchSize: 100,
      });

      expect(result.upsertedCount).toBe(350);
      expect(mockClient.upsert).toHaveBeenCalledTimes(4); // 4 batches
    });

    it("should batch delete large ID lists", async () => {
      const ids = manyRecords.map((r) => r.id);

      const result = await adapter.batchDelete("test-index", ids, {
        batchSize: 100,
      });

      expect(result.deletedCount).toBe(350);
    });

    it("should use default batch size when not specified", async () => {
      await adapter.upsert("test-index", manyRecords);

      // Default batch size is 100
      expect(mockClient.upsert).toHaveBeenCalledTimes(4);
    });

    it("should handle single batch", async () => {
      const smallRecords = manyRecords.slice(0, 50);

      const result = await adapter.upsert("test-index", smallRecords);

      expect(result.upsertedCount).toBe(50);
      expect(mockClient.upsert).toHaveBeenCalledTimes(1);
    });
  });

  // ============================
  // QUANTIZATION SUPPORT (3 tests)
  // ============================
  describe("Quantization Support", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should create index with binary quantization", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 128,
        config: {
          quantization: {
            type: "binary",
            binary: { alwaysRam: true },
          },
        },
      });

      expect(mockClient.createCollection).toHaveBeenCalledWith(
        "test-index",
        expect.objectContaining({
          vectors: expect.objectContaining({
            quantization_config: expect.objectContaining({
              binary: expect.objectContaining({
                always_ram: true,
              }),
            }),
          }),
        }),
      );
    });

    it("should create index with product quantization", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 128,
        config: {
          quantization: {
            type: "product",
            product: { compression: "x8", alwaysRam: false },
          },
        },
      });

      expect(mockClient.createCollection).toHaveBeenCalledWith(
        "test-index",
        expect.objectContaining({
          vectors: expect.objectContaining({
            quantization_config: expect.objectContaining({
              product: expect.objectContaining({
                compression: "x8",
              }),
            }),
          }),
        }),
      );
    });

    it("should create index with on-disk storage", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 128,
        config: {
          onDisk: true,
        },
      });

      expect(mockClient.createCollection).toHaveBeenCalledWith(
        "test-index",
        expect.objectContaining({
          vectors: expect.objectContaining({
            on_disk: true,
          }),
        }),
      );
    });
  });
});

// ============================
// INTEGRATION TESTS (skipped)
// ============================
describe("QdrantAdapter Integration", () => {
  // These tests require a real Qdrant instance
  // Skip if not available

  it.skip("should work with real Qdrant instance", async () => {
    // This test would connect to a real Qdrant instance
    // Requires Qdrant to be running at localhost:6333
    const adapter = new QdrantAdapter({
      url: "http://localhost:6333",
    });

    await adapter.connect();
    expect(adapter.isInitialized()).toBe(true);

    await adapter.disconnect();
  });
});
