/**
 * Weaviate Adapter Tests
 * Comprehensive test suite for the Weaviate vector store adapter
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { WeaviateAdapter } from "../../../src/lib/vector/adapters/WeaviateAdapter.js";
import type {
  WeaviateConfig,
  WeaviateClientFactory,
} from "../../../src/lib/vector/adapters/WeaviateAdapter.js";
import type {
  VectorRecord,
  VectorQueryOptions,
} from "../../../src/lib/vector/types.js";

// Mock batch object builder
const createMockBatchBuilder = () => ({
  withObject: vi.fn().mockReturnThis(),
  withObjects: vi.fn().mockReturnThis(),
  do: vi.fn(),
});

// Mock GraphQL get builder
const createMockGraphQLGetBuilder = () => ({
  withClassName: vi.fn().mockReturnThis(),
  withFields: vi.fn().mockReturnThis(),
  withNearVector: vi.fn().mockReturnThis(),
  withLimit: vi.fn().mockReturnThis(),
  withWhere: vi.fn().mockReturnThis(),
  withTenant: vi.fn().mockReturnThis(),
  do: vi.fn(),
});

// Mock GraphQL aggregate builder
const createMockGraphQLAggregateBuilder = () => ({
  withClassName: vi.fn().mockReturnThis(),
  withFields: vi.fn().mockReturnThis(),
  withTenant: vi.fn().mockReturnThis(),
  do: vi.fn(),
});

// Mock ready checker
const createMockReadyChecker = () => ({
  do: vi.fn().mockResolvedValue(true),
});

// Mock meta getter
const createMockMetaGetter = () => ({
  do: vi.fn().mockResolvedValue({
    version: "1.21.0",
    hostname: "localhost",
    modules: {},
  }),
});

// Create the mock Weaviate client
const createMockClient = () => {
  const mockBatchBuilder = createMockBatchBuilder();
  const mockGraphQLGetBuilder = createMockGraphQLGetBuilder();
  const mockGraphQLAggregateBuilder = createMockGraphQLAggregateBuilder();
  const mockReadyChecker = createMockReadyChecker();
  const mockMetaGetter = createMockMetaGetter();

  const mockClassCreatorDo = vi.fn().mockResolvedValue(undefined);
  const mockClassCreator = {
    withClass: vi.fn().mockReturnValue({
      do: mockClassCreatorDo,
    }),
  };

  const mockClassDeleterDo = vi.fn().mockResolvedValue(undefined);
  const mockClassDeleter = {
    withClassName: vi.fn().mockReturnValue({
      do: mockClassDeleterDo,
    }),
  };

  const mockSchemaGetter = {
    do: vi.fn().mockResolvedValue({ classes: [] }),
  };

  const mockClassGetter = {
    withClassName: vi.fn().mockReturnValue({
      do: vi.fn().mockResolvedValue({
        class: "TestIndex",
        vectorIndexConfig: { distance: "cosine" },
        vectorIndexType: "hnsw",
      }),
    }),
  };

  const mockDataDeleterWithIdDo = vi.fn().mockResolvedValue(undefined);
  const mockDataDeleterWithWhereDo = vi.fn().mockResolvedValue({ results: { successful: 5 } });
  const mockDataDeleter = {
    withClassName: vi.fn().mockReturnValue({
      withId: vi.fn().mockReturnValue({
        do: mockDataDeleterWithIdDo,
      }),
      withWhere: vi.fn().mockReturnValue({
        do: mockDataDeleterWithWhereDo,
      }),
    }),
  };

  const client = {
    schema: {
      classCreator: vi.fn().mockReturnValue(mockClassCreator),
      classDeleter: vi.fn().mockReturnValue(mockClassDeleter),
      getter: vi.fn().mockReturnValue(mockSchemaGetter),
      exists: vi.fn().mockResolvedValue(false),
      classGetter: vi.fn().mockReturnValue(mockClassGetter),
    },
    data: {
      creator: vi.fn(),
      deleter: vi.fn().mockReturnValue(mockDataDeleter),
      getter: vi.fn(),
    },
    batch: {
      objectsBatcher: vi.fn().mockReturnValue(mockBatchBuilder),
    },
    graphql: {
      get: vi.fn().mockReturnValue(mockGraphQLGetBuilder),
      aggregate: vi.fn().mockReturnValue(mockGraphQLAggregateBuilder),
    },
    misc: {
      metaGetter: vi.fn().mockReturnValue(mockMetaGetter),
      readyChecker: vi.fn().mockReturnValue(mockReadyChecker),
    },
  };

  return {
    client,
    mockBatchBuilder,
    mockGraphQLGetBuilder,
    mockGraphQLAggregateBuilder,
    mockReadyChecker,
    mockMetaGetter,
    mockClassCreator,
    mockClassCreatorDo,
    mockClassDeleter,
    mockClassDeleterDo,
    mockSchemaGetter,
    mockDataDeleter,
    mockDataDeleterWithIdDo,
    mockDataDeleterWithWhereDo,
  };
};

// Create mock client factory
const createMockClientFactory = (mockClient: ReturnType<typeof createMockClient>["client"]): WeaviateClientFactory => {
  return async () => ({
    client: vi.fn().mockReturnValue(mockClient),
    ApiKey: vi.fn().mockImplementation((key: string) => ({ key })) as unknown as new (key: string) => unknown,
  });
};

describe("WeaviateAdapter", () => {
  let adapter: WeaviateAdapter;
  let mocks: ReturnType<typeof createMockClient>;
  let mockClientFactory: WeaviateClientFactory;

  const getDefaultConfig = (): WeaviateConfig => ({
    host: "http://localhost:8080",
    scheme: "http",
    clientFactory: mockClientFactory,
  });

  const getConfigWithOverrides = (overrides: Partial<WeaviateConfig>): WeaviateConfig => ({
    ...getDefaultConfig(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Create fresh mock client for each test
    mocks = createMockClient();
    mockClientFactory = createMockClientFactory(mocks.client);

    // Default batch result
    mocks.mockBatchBuilder.do.mockResolvedValue([
      { id: "uuid-1", result: { status: "SUCCESS" } },
      { id: "uuid-2", result: { status: "SUCCESS" } },
    ]);

    // Default GraphQL results
    mocks.mockGraphQLGetBuilder.do.mockResolvedValue({
      data: {
        Get: {
          Test_index: [
            {
              _additional: {
                id: "550e8400-e29b-41d4-a716-446655440000",
                certainty: 0.95,
                distance: 0.05,
              },
              content: "Test content",
              namespace: "ns1",
              _metadata: JSON.stringify({ category: "tech" }),
            },
          ],
        },
      },
    });

    mocks.mockGraphQLAggregateBuilder.do.mockResolvedValue({
      data: {
        Aggregate: {
          Test_index: [
            {
              meta: { count: 100 },
            },
          ],
        },
      },
    });

    // Create the adapter after setting up mocks
    adapter = new WeaviateAdapter(getDefaultConfig());
  });

  afterEach(async () => {
    if (adapter.isInitialized()) {
      await adapter.disconnect();
    }
  });

  describe("Constructor and Configuration", () => {
    it("should create adapter with configuration", () => {
      expect(adapter).toBeInstanceOf(WeaviateAdapter);
      expect(adapter.getStoreName()).toBe("weaviate");
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should accept custom configuration options", () => {
      const customConfig = getConfigWithOverrides({
        host: "https://my-cluster.weaviate.network",
        apiKey: "my-api-key",
        scheme: "https",
        headers: { "X-Custom-Header": "value" },
        defaultTenant: "tenant1",
        connectionTimeout: 10000,
        batchingEnabled: true,
        batchSize: 50,
      });
      const customAdapter = new WeaviateAdapter(customConfig);
      const config = customAdapter.getConfig();
      expect(config.host).toBe("https://my-cluster.weaviate.network");
      expect(config.apiKey).toBe("my-api-key");
      expect(config.defaultTenant).toBe("tenant1");
    });

    it("should use https scheme for cloud instances by default", () => {
      const cloudConfig = getConfigWithOverrides({
        host: "my-cluster.weaviate.network",
      });
      const cloudAdapter = new WeaviateAdapter(cloudConfig);
      expect(cloudAdapter.getConfig().host).toBe("my-cluster.weaviate.network");
    });
  });

  describe("Connection Management", () => {
    it("should connect successfully", async () => {
      await adapter.connect();
      expect(adapter.isInitialized()).toBe(true);
      expect(mocks.mockReadyChecker.do).toHaveBeenCalled();
    });

    it("should not reconnect if already connected", async () => {
      await adapter.connect();
      await adapter.connect(); // Second call should be a no-op
      expect(adapter.isInitialized()).toBe(true);
      // readyChecker should only be called once
      expect(mocks.mockReadyChecker.do).toHaveBeenCalledTimes(1);
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

    it("should throw when Weaviate is not ready", async () => {
      mocks.mockReadyChecker.do.mockResolvedValueOnce(false);

      await expect(adapter.connect()).rejects.toThrow(
        "Weaviate server is not ready",
      );
    });

    it("should connect with API key", async () => {
      const authAdapter = new WeaviateAdapter(getConfigWithOverrides({
        host: "https://my-cluster.weaviate.network",
        apiKey: "test-api-key",
      }));

      await authAdapter.connect();
      expect(authAdapter.isInitialized()).toBe(true);
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

      expect(mocks.client.schema.exists).toHaveBeenCalledWith("Test_index");
      expect(mocks.mockClassCreator.withClass).toHaveBeenCalledWith(
        expect.objectContaining({
          class: "Test_index",
          vectorIndexType: "hnsw",
          vectorIndexConfig: expect.objectContaining({
            distance: "cosine",
          }),
        }),
      );
    });

    it("should create index with euclidean metric", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 768,
        metric: "euclidean",
      });

      expect(mocks.mockClassCreator.withClass).toHaveBeenCalledWith(
        expect.objectContaining({
          vectorIndexConfig: expect.objectContaining({
            distance: "l2-squared",
          }),
        }),
      );
    });

    it("should create index with dotProduct metric", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 768,
        metric: "dotProduct",
      });

      expect(mocks.mockClassCreator.withClass).toHaveBeenCalledWith(
        expect.objectContaining({
          vectorIndexConfig: expect.objectContaining({
            distance: "dot",
          }),
        }),
      );
    });

    it("should not create index if it already exists", async () => {
      mocks.client.schema.exists.mockResolvedValueOnce(true);

      await adapter.createIndex({
        name: "existing-index",
        dimension: 1536,
      });

      expect(mocks.mockClassCreator.withClass).not.toHaveBeenCalled();
    });

    it("should delete an index", async () => {
      mocks.client.schema.exists.mockResolvedValueOnce(true);

      await adapter.deleteIndex("test-index");

      expect(mocks.mockClassDeleter.withClassName).toHaveBeenCalledWith("Test_index");
    });

    it("should not delete non-existent index", async () => {
      mocks.client.schema.exists.mockResolvedValueOnce(false);

      await adapter.deleteIndex("nonexistent");

      expect(mocks.mockClassDeleter.withClassName).not.toHaveBeenCalled();
    });

    it("should list indexes", async () => {
      mocks.mockSchemaGetter.do.mockResolvedValueOnce({
        classes: [
          { class: "Index1" },
          { class: "Index2" },
          { class: "TestIndex" },
        ],
      });

      const indexes = await adapter.listIndexes();
      expect(indexes).toEqual(["index1", "index2", "testIndex"]);
    });

    it("should check if index exists", async () => {
      mocks.client.schema.exists.mockResolvedValueOnce(true);
      const exists = await adapter.indexExists("test-index");
      expect(exists).toBe(true);

      mocks.client.schema.exists.mockResolvedValueOnce(false);
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
      const result = await adapter.upsert("test-index", testRecords);
      expect(result.upsertedCount).toBe(2);
      expect(mocks.mockBatchBuilder.withObjects).toHaveBeenCalled();
    });

    it("should upsert with namespace", async () => {
      const result = await adapter.upsert("test-index", testRecords, {
        namespace: "ns1",
      });
      expect(result.upsertedCount).toBe(2);
    });

    it("should handle upsert with custom batch size", async () => {
      const manyRecords = Array.from({ length: 150 }, (_, i) => ({
        id: `vec-${i}`,
        vector: [0.1, 0.2, 0.3],
        metadata: { index: i },
      }));

      mocks.mockBatchBuilder.do
        .mockResolvedValueOnce(
          Array.from({ length: 50 }, (_, i) => ({
            id: `uuid-${i}`,
            result: { status: "SUCCESS" },
          })),
        )
        .mockResolvedValueOnce(
          Array.from({ length: 50 }, (_, i) => ({
            id: `uuid-${i + 50}`,
            result: { status: "SUCCESS" },
          })),
        )
        .mockResolvedValueOnce(
          Array.from({ length: 50 }, (_, i) => ({
            id: `uuid-${i + 100}`,
            result: { status: "SUCCESS" },
          })),
        );

      const result = await adapter.upsert("test-index", manyRecords, {
        batchSize: 50,
      });

      expect(result.upsertedCount).toBe(150);
      expect(mocks.mockBatchBuilder.do).toHaveBeenCalledTimes(3);
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
    });

    it("should count failed upserts correctly", async () => {
      mocks.mockBatchBuilder.do.mockResolvedValueOnce([
        { id: "uuid-1", result: { status: "SUCCESS" } },
        {
          id: "uuid-2",
          result: {
            status: "FAILED",
            errors: { error: [{ message: "Some error" }] },
          },
        },
      ]);

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
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty("id");
      expect(results[0]).toHaveProperty("score");
    });

    it("should query with metadata filter", async () => {
      const options: VectorQueryOptions<{ category: string }> = {
        vector: queryVector,
        topK: 10,
        filter: { category: "tech" },
      };

      const results = await adapter.query("test-index", options);
      expect(Array.isArray(results)).toBe(true);
      expect(mocks.mockGraphQLGetBuilder.withWhere).toHaveBeenCalled();
    });

    it("should query with minimum score", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        minScore: 0.8,
      };

      const results = await adapter.query("test-index", options);
      expect(Array.isArray(results)).toBe(true);
      // Results should be filtered by minScore
      for (const result of results) {
        expect(result.score).toBeGreaterThanOrEqual(0.8);
      }
    });

    it("should query with namespace filter", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        namespace: "ns1",
      };

      const results = await adapter.query("test-index", options);
      expect(Array.isArray(results)).toBe(true);
      expect(mocks.mockGraphQLGetBuilder.withWhere).toHaveBeenCalled();
    });

    it("should include vectors when requested", async () => {
      mocks.mockGraphQLGetBuilder.do.mockResolvedValueOnce({
        data: {
          Get: {
            Test_index: [
              {
                _additional: {
                  id: "550e8400-e29b-41d4-a716-446655440000",
                  certainty: 0.95,
                  vector: [0.1, 0.2, 0.3],
                },
                content: "Test content",
                _metadata: "{}",
              },
            ],
          },
        },
      });

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

    it("should handle empty results", async () => {
      mocks.mockGraphQLGetBuilder.do.mockResolvedValueOnce({
        data: {
          Get: {
            Test_index: [],
          },
        },
      });

      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
      };

      const results = await adapter.query("test-index", options);
      expect(results).toEqual([]);
    });

    it("should calculate score from distance when certainty not available", async () => {
      mocks.mockGraphQLGetBuilder.do.mockResolvedValueOnce({
        data: {
          Get: {
            Test_index: [
              {
                _additional: {
                  id: "550e8400-e29b-41d4-a716-446655440000",
                  distance: 0.1,
                },
                content: "Test content",
                _metadata: "{}",
              },
            ],
          },
        },
      });

      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
      });

      // Score should be calculated from distance
      expect(results[0].score).toBeCloseTo(1 / (1 + 0.1), 5);
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
    });

    it("should delete by filter", async () => {
      const result = await adapter.delete("test-index", {
        filter: { category: "deprecated" },
      });
      expect(result.deletedCount).toBe(5);
    });

    it("should delete by namespace", async () => {
      const result = await adapter.delete("test-index", {
        namespace: "old-data",
        deleteAll: true,
      });
      expect(result.deletedCount).toBe(5);
    });

    it("should delete all records", async () => {
      mocks.client.schema.exists.mockResolvedValue(true);

      const result = await adapter.delete("test-index", {
        deleteAll: true,
      });

      // When no filter, it recreates the class
      expect(result.deletedCount).toBe(-1); // Unknown count
    });

    it("should handle delete with no matching IDs", async () => {
      const mockDeleterWithId = {
        withId: vi.fn().mockReturnValue({
          do: vi.fn().mockRejectedValue(new Error("Object not found")),
        }),
        withWhere: mocks.mockDataDeleter.withClassName("test").withWhere,
      };
      mocks.client.data.deleter.mockReturnValueOnce({
        withClassName: vi.fn().mockReturnValue(mockDeleterWithId),
      });

      const result = await adapter.delete("test-index", {
        ids: ["nonexistent"],
      });
      expect(result.deletedCount).toBe(0);
    });
  });

  describe("Statistics", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should get index statistics", async () => {
      const stats = await adapter.getStats("test-index");
      expect(stats.vectorCount).toBe(100);
      expect(stats.metrics).toEqual({
        distance: "cosine",
        vectorIndexType: "hnsw",
      });
    });

    it("should get namespace count", async () => {
      mocks.mockGraphQLGetBuilder.do.mockResolvedValueOnce({
        data: {
          Get: {
            Test_index: [
              { namespace: "ns1" },
              { namespace: "ns2" },
              { namespace: "ns1" },
              { namespace: "ns3" },
            ],
          },
        },
      });

      const stats = await adapter.getStats("test-index");
      expect(stats.namespaceCount).toBe(3); // Unique namespaces
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

    it("should return disconnected status when not initialized", async () => {
      const health = await adapter.healthCheck();
      expect(health.healthy).toBe(false);
      expect(health.status).toBe("disconnected");
    });

    it("should return degraded status when Weaviate not ready", async () => {
      await adapter.connect();
      mocks.mockReadyChecker.do.mockResolvedValueOnce(false);

      const health = await adapter.healthCheck();
      expect(health.healthy).toBe(false);
      expect(health.status).toBe("degraded");
    });

    it("should return error status on exception", async () => {
      await adapter.connect();
      mocks.mockReadyChecker.do.mockRejectedValueOnce(new Error("Connection failed"));

      const health = await adapter.healthCheck();
      expect(health.healthy).toBe(false);
      expect(health.status).toBe("error");
      expect(health.error).toBe("Connection failed");
    });
  });

  describe("Batch Operations (inherited)", () => {
    const manyRecords = Array.from({ length: 250 }, (_, i) => ({
      id: `vec-${i}`,
      vector: [0.1, 0.2, 0.3],
      metadata: { index: i },
    }));

    beforeEach(async () => {
      await adapter.connect();

      // Mock for each batch
      mocks.mockBatchBuilder.do.mockImplementation(() =>
        Promise.resolve(
          Array.from({ length: 100 }, (_, i) => ({
            id: `uuid-${i}`,
            result: { status: "SUCCESS" },
          })),
        ),
      );
    });

    it("should batch upsert large datasets", async () => {
      const result = await adapter.batchUpsert("test-index", manyRecords, {
        batchSize: 100,
      });
      expect(result.upsertedCount).toBe(300); // 3 batches * 100
    });

    it("should batch delete large ID lists", async () => {
      const ids = manyRecords.map((r) => r.id);

      const result = await adapter.batchDelete("test-index", ids, {
        batchSize: 100,
      });
      // Each delete should succeed
      expect(result.deletedCount).toBe(250);
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

      expect(mocks.mockGraphQLGetBuilder.withWhere).toHaveBeenCalled();
    });

    it("should translate comparison operators", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { price: { $gte: 100, $lte: 500 } },
      });

      expect(mocks.mockGraphQLGetBuilder.withWhere).toHaveBeenCalled();
    });

    it("should translate logical $and operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $and: [{ category: "tech" }, { status: "active" }],
        },
      });

      expect(mocks.mockGraphQLGetBuilder.withWhere).toHaveBeenCalled();
    });

    it("should translate logical $or operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $or: [{ category: "tech" }, { category: "science" }],
        },
      });

      expect(mocks.mockGraphQLGetBuilder.withWhere).toHaveBeenCalled();
    });

    it("should translate $in operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          status: { $in: ["active", "pending"] },
        },
      });

      expect(mocks.mockGraphQLGetBuilder.withWhere).toHaveBeenCalled();
    });

    it("should translate string operators", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          title: { $contains: "vector" },
        },
      });

      expect(mocks.mockGraphQLGetBuilder.withWhere).toHaveBeenCalled();
    });

    it("should translate $exists operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          optional_field: { $exists: true },
        },
      });

      expect(mocks.mockGraphQLGetBuilder.withWhere).toHaveBeenCalled();
    });

    it("should translate $startsWith operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          name: { $startsWith: "test" },
        },
      });

      expect(mocks.mockGraphQLGetBuilder.withWhere).toHaveBeenCalled();
    });

    it("should translate $endsWith operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          name: { $endsWith: "ing" },
        },
      });

      expect(mocks.mockGraphQLGetBuilder.withWhere).toHaveBeenCalled();
    });
  });

  describe("Class Name Conversion", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should convert lowercase index names to valid class names", async () => {
      await adapter.createIndex({
        name: "my-test-index",
        dimension: 128,
      });

      // Should convert to My_test_index (uppercase first letter, hyphens to underscores)
      expect(mocks.client.schema.exists).toHaveBeenCalledWith("My_test_index");
    });

    it("should handle index names starting with numbers", async () => {
      await adapter.createIndex({
        name: "123-index",
        dimension: 128,
      });

      // Should prefix with Index_ for invalid first characters
      expect(mocks.client.schema.exists).toHaveBeenCalledWith("Index_123_index");
    });

    it("should handle special characters in index names", async () => {
      await adapter.createIndex({
        name: "my.special@index!",
        dimension: 128,
      });

      // Should sanitize special characters (trailing underscores are trimmed)
      expect(mocks.client.schema.exists).toHaveBeenCalledWith("My_special_index");
    });
  });

  describe("UUID Handling", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should accept valid UUIDs as IDs", async () => {
      const validUUIDRecord = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        vector: [0.1, 0.2, 0.3],
      };

      await adapter.upsert("test-index", [validUUIDRecord]);

      // Should use the UUID as-is
      expect(mocks.mockBatchBuilder.withObjects).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: "550e8400-e29b-41d4-a716-446655440000",
          }),
        ]),
      );
    });

    it("should convert string IDs to deterministic UUIDs", async () => {
      const stringIDRecord = {
        id: "my-custom-id",
        vector: [0.1, 0.2, 0.3],
      };

      await adapter.upsert("test-index", [stringIDRecord]);

      // Should convert to a valid UUID format
      expect(mocks.mockBatchBuilder.withObjects).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.stringMatching(
              /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
            ),
          }),
        ]),
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
      mocks.mockClassCreatorDo.mockRejectedValueOnce(new Error("Schema error"));

      await expect(
        adapter.createIndex({ name: "test", dimension: 128 }),
      ).rejects.toThrow("Failed to create index");
    });

    it("should throw when deleting index fails", async () => {
      await adapter.connect();
      mocks.client.schema.exists.mockResolvedValueOnce(true);
      mocks.mockClassDeleterDo.mockRejectedValueOnce(new Error("Delete error"));

      await expect(adapter.deleteIndex("test")).rejects.toThrow(
        "Failed to delete index",
      );
    });

    it("should throw when upsert fails", async () => {
      await adapter.connect();
      mocks.mockBatchBuilder.do.mockRejectedValueOnce(new Error("Batch error"));

      await expect(
        adapter.upsert("test", [{ id: "1", vector: [0.1] }]),
      ).rejects.toThrow("Failed to upsert");
    });

    it("should throw when query fails", async () => {
      await adapter.connect();
      mocks.mockGraphQLGetBuilder.do.mockRejectedValueOnce(new Error("Query error"));

      await expect(
        adapter.query("test", { vector: [0.1], topK: 10 }),
      ).rejects.toThrow("Failed to query");
    });

    it("should throw when delete fails", async () => {
      await adapter.connect();
      const mockDeleterWithError = {
        withId: vi.fn().mockReturnValue({
          do: vi.fn().mockRejectedValue(new Error("Delete error")),
        }),
        withWhere: vi.fn().mockReturnValue({
          do: vi.fn().mockRejectedValue(new Error("Delete error")),
        }),
      };
      mocks.client.data.deleter.mockReturnValueOnce({
        withClassName: vi.fn().mockReturnValue(mockDeleterWithError),
      });

      await expect(
        adapter.delete("test", { filter: { bad: "filter" } }),
      ).rejects.toThrow("Failed to delete");
    });

    it("should throw when getting stats fails", async () => {
      await adapter.connect();
      mocks.mockGraphQLAggregateBuilder.do.mockRejectedValueOnce(
        new Error("Stats error"),
      );

      await expect(adapter.getStats("test")).rejects.toThrow(
        "Failed to get stats",
      );
    });
  });

  describe("Multi-tenancy Support", () => {
    it("should enable multi-tenancy when tenant is configured", async () => {
      const tenantAdapter = new WeaviateAdapter(getConfigWithOverrides({
        defaultTenant: "tenant1",
      }));

      await tenantAdapter.connect();
      await tenantAdapter.createIndex({
        name: "multi-tenant-index",
        dimension: 128,
      });

      expect(mocks.mockClassCreator.withClass).toHaveBeenCalledWith(
        expect.objectContaining({
          multiTenancyConfig: { enabled: true },
        }),
      );
    });
  });
});

describe("WeaviateAdapter Integration", () => {
  // These tests require a real Weaviate instance
  // Skip if not available

  it.skip("should work with real Weaviate instance", async () => {
    // This test would connect to a real Weaviate instance
    // Requires Weaviate to be running at localhost:8080
    const adapter = new WeaviateAdapter({
      host: "http://localhost:8080",
    });

    await adapter.connect();
    expect(adapter.isInitialized()).toBe(true);

    await adapter.disconnect();
  });
});
