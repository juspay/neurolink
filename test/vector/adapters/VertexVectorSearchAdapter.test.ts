/**
 * Vertex AI Vector Search Adapter Tests
 * Comprehensive test suite for the Google Vertex AI Matching Engine adapter
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { VertexVectorSearchAdapter } from "../../../src/lib/vector/adapters/VertexVectorSearchAdapter.js";
import type {
  VectorRecord,
  VectorQueryOptions,
} from "../../../src/lib/vector/types.js";
import type { VertexVectorSearchConfig } from "../../../src/lib/vector/adapters/VertexVectorSearchAdapter.js";

// Mock the @google-cloud/aiplatform module
const mockIndexClient = {
  createIndex: vi.fn(),
  deleteIndex: vi.fn(),
  getIndex: vi.fn(),
  listIndexes: vi.fn(),
  upsertDatapoints: vi.fn(),
  removeDatapoints: vi.fn(),
  close: vi.fn(),
};

const mockIndexEndpointClient = {
  findNeighbors: vi.fn(),
  readIndexDatapoints: vi.fn(),
  close: vi.fn(),
};

vi.mock("@google-cloud/aiplatform", () => ({
  IndexServiceClient: vi.fn(() => mockIndexClient),
  IndexEndpointServiceClient: vi.fn(() => mockIndexEndpointClient),
}));

describe("VertexVectorSearchAdapter", () => {
  let adapter: VertexVectorSearchAdapter;
  const defaultConfig: VertexVectorSearchConfig = {
    projectId: "test-project",
    location: "us-central1",
    indexEndpointId: "test-endpoint-123",
    indexId: "test-index-123",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    mockIndexClient.createIndex.mockResolvedValue([
      { name: "test-index-123" },
      {},
      {},
    ]);
    mockIndexClient.deleteIndex.mockResolvedValue([{}]);
    mockIndexClient.getIndex.mockResolvedValue([
      { name: "test-index-123", metadata: { config: { dimensions: 1536 } } },
    ]);
    mockIndexClient.upsertDatapoints.mockResolvedValue([{}]);
    mockIndexClient.removeDatapoints.mockResolvedValue([{}]);
    mockIndexClient.close.mockResolvedValue(undefined);
    mockIndexEndpointClient.findNeighbors.mockResolvedValue([
      { nearestNeighbors: [] },
    ]);
    mockIndexEndpointClient.close.mockResolvedValue(undefined);

    // Mock listIndexes as an async generator
    mockIndexClient.listIndexes.mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        yield {
          name: "projects/test-project/locations/us-central1/indexes/test-index-123",
        };
      },
    });

    adapter = new VertexVectorSearchAdapter(defaultConfig);
  });

  afterEach(async () => {
    if (adapter.isInitialized()) {
      await adapter.disconnect();
    }
  });

  describe("Constructor and Configuration", () => {
    it("should create adapter with configuration", () => {
      expect(adapter).toBeInstanceOf(VertexVectorSearchAdapter);
      expect(adapter.getStoreName()).toBe("vertex-vector");
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should accept custom configuration options", () => {
      const customConfig: VertexVectorSearchConfig = {
        projectId: "my-project",
        location: "europe-west1",
        indexEndpointId: "endpoint-456",
        indexId: "index-456",
        apiEndpoint: "custom-aiplatform.googleapis.com",
        requestTimeout: 120000,
        streamingUpdates: true,
        streamingBatchSize: 50,
      };
      const customAdapter = new VertexVectorSearchAdapter(customConfig);
      expect(customAdapter.getConfig()).toEqual(customConfig);
    });

    it("should accept credentials configuration", () => {
      const configWithCreds: VertexVectorSearchConfig = {
        projectId: "test-project",
        location: "us-central1",
        credentials: {
          client_email: "test@test.iam.gserviceaccount.com",
          private_key:
            "-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----\n",
        },
      };
      const credAdapter = new VertexVectorSearchAdapter(configWithCreds);
      expect(credAdapter.getConfig().credentials).toBeDefined();
    });
  });

  describe("Connection Management", () => {
    it("should connect successfully", async () => {
      await adapter.connect();
      expect(adapter.isInitialized()).toBe(true);
    });

    it("should not reconnect if already connected", async () => {
      await adapter.connect();
      await adapter.connect(); // Second call should be a no-op
      expect(adapter.isInitialized()).toBe(true);
    });

    it("should disconnect successfully", async () => {
      await adapter.connect();
      await adapter.disconnect();
      expect(adapter.isInitialized()).toBe(false);
      expect(mockIndexClient.close).toHaveBeenCalled();
      expect(mockIndexEndpointClient.close).toHaveBeenCalled();
    });

    it("should handle disconnect when not connected", async () => {
      await adapter.disconnect();
      expect(adapter.isInitialized()).toBe(false);
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

      expect(mockIndexClient.createIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          parent: `projects/${defaultConfig.projectId}/locations/${defaultConfig.location}`,
          index: expect.objectContaining({
            displayName: "test-index",
            metadata: expect.objectContaining({
              config: expect.objectContaining({
                dimensions: 1536,
                distanceMeasureType: "COSINE_DISTANCE",
              }),
            }),
          }),
        }),
        expect.any(Object),
      );
    });

    it("should create index with euclidean metric", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 768,
        metric: "euclidean",
      });

      expect(mockIndexClient.createIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          index: expect.objectContaining({
            metadata: expect.objectContaining({
              config: expect.objectContaining({
                distanceMeasureType: "SQUARED_L2_DISTANCE",
              }),
            }),
          }),
        }),
        expect.any(Object),
      );
    });

    it("should create index with dot product metric", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 768,
        metric: "dotProduct",
      });

      expect(mockIndexClient.createIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          index: expect.objectContaining({
            metadata: expect.objectContaining({
              config: expect.objectContaining({
                distanceMeasureType: "DOT_PRODUCT_DISTANCE",
              }),
            }),
          }),
        }),
        expect.any(Object),
      );
    });

    it("should delete an index", async () => {
      // First create the index to have it in cache
      await adapter.createIndex({
        name: "test-index",
        dimension: 1536,
      });

      await adapter.deleteIndex("test-index");
      expect(mockIndexClient.deleteIndex).toHaveBeenCalled();
    });

    it("should list indexes", async () => {
      const indexes = await adapter.listIndexes();
      expect(indexes).toEqual(["test-index-123"]);
    });

    it("should check if index exists", async () => {
      // Create index to have it in cache
      await adapter.createIndex({
        name: "my-index",
        dimension: 1536,
      });

      const exists = await adapter.indexExists("my-index");
      expect(exists).toBe(true);
    });

    it("should return false for non-existent index", async () => {
      // Mock listIndexes to return empty
      mockIndexClient.listIndexes.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          // Empty generator
        },
      });

      const exists = await adapter.indexExists("nonexistent");
      expect(exists).toBe(false);
    });
  });

  describe("Upsert Operations", () => {
    const testRecords: VectorRecord<{ category: string; priority: number }>[] =
      [
        {
          id: "vec-1",
          vector: [0.1, 0.2, 0.3],
          metadata: { category: "tech", priority: 1 },
          content: "Test content 1",
        },
        {
          id: "vec-2",
          vector: [0.4, 0.5, 0.6],
          metadata: { category: "science", priority: 2 },
          content: "Test content 2",
        },
      ];

    beforeEach(async () => {
      await adapter.connect();
      // Create index first
      await adapter.createIndex({
        name: "test-index",
        dimension: 3,
      });
    });

    it("should upsert records", async () => {
      const result = await adapter.upsert("test-index", testRecords);
      expect(result.upsertedCount).toBe(2);
      expect(mockIndexClient.upsertDatapoints).toHaveBeenCalled();
    });

    it("should upsert with namespace", async () => {
      const result = await adapter.upsert("test-index", testRecords, {
        namespace: "ns1",
      });
      expect(result.upsertedCount).toBe(2);

      // Check that datapoints include namespace restrict
      expect(mockIndexClient.upsertDatapoints).toHaveBeenCalledWith(
        expect.objectContaining({
          datapoints: expect.arrayContaining([
            expect.objectContaining({
              restricts: expect.arrayContaining([
                expect.objectContaining({
                  namespace: "_namespace",
                  allowList: ["ns1"],
                }),
              ]),
            }),
          ]),
        }),
        expect.any(Object),
      );
    });

    it("should convert string metadata to restricts", async () => {
      const result = await adapter.upsert("test-index", testRecords);
      expect(result.upsertedCount).toBe(2);

      expect(mockIndexClient.upsertDatapoints).toHaveBeenCalledWith(
        expect.objectContaining({
          datapoints: expect.arrayContaining([
            expect.objectContaining({
              datapointId: "vec-1",
              featureVector: [0.1, 0.2, 0.3],
              restricts: expect.arrayContaining([
                expect.objectContaining({
                  namespace: "category",
                  allowList: ["tech"],
                }),
              ]),
            }),
          ]),
        }),
        expect.any(Object),
      );
    });

    it("should convert numeric metadata to numeric restricts", async () => {
      await adapter.upsert("test-index", testRecords);

      expect(mockIndexClient.upsertDatapoints).toHaveBeenCalledWith(
        expect.objectContaining({
          datapoints: expect.arrayContaining([
            expect.objectContaining({
              datapointId: "vec-1",
              numericRestricts: expect.arrayContaining([
                expect.objectContaining({
                  namespace: "priority",
                  valueInt: "1",
                }),
              ]),
            }),
          ]),
        }),
        expect.any(Object),
      );
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
      expect(mockIndexClient.upsertDatapoints).not.toHaveBeenCalled();
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
      // Should have 3 batch calls: 100 + 100 + 50
      expect(mockIndexClient.upsertDatapoints).toHaveBeenCalledTimes(3);
    });
  });

  describe("Query Operations", () => {
    const queryVector = [0.1, 0.2, 0.3];
    const mockNeighbors = [
      {
        datapoint: {
          datapointId: "vec-1",
          featureVector: [0.1, 0.2, 0.3],
        },
        distance: 0.1,
      },
      {
        datapoint: {
          datapointId: "vec-2",
          featureVector: [0.4, 0.5, 0.6],
        },
        distance: 0.3,
      },
    ];

    beforeEach(async () => {
      await adapter.connect();
      mockIndexEndpointClient.findNeighbors.mockResolvedValue([
        { nearestNeighbors: [{ neighbors: mockNeighbors }] },
      ]);
    });

    it("should query vectors", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
      };

      const results = await adapter.query("test-index", options);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
      expect(results[0].id).toBe("vec-1");
    });

    it("should convert distance to score", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
      };

      const results = await adapter.query("test-index", options);
      // Distance 0.1 should convert to score 0.9
      expect(results[0].score).toBe(0.9);
      // Distance 0.3 should convert to score 0.7
      expect(results[1].score).toBe(0.7);
    });

    it("should query with metadata filter", async () => {
      const options: VectorQueryOptions<{ category: string }> = {
        vector: queryVector,
        topK: 10,
        filter: { category: "tech" },
      };

      await adapter.query("test-index", options);

      expect(mockIndexEndpointClient.findNeighbors).toHaveBeenCalledWith(
        expect.objectContaining({
          queries: expect.arrayContaining([
            expect.objectContaining({
              datapoint: expect.objectContaining({
                restricts: expect.arrayContaining([
                  expect.objectContaining({
                    namespace: "category",
                    allowList: ["tech"],
                  }),
                ]),
              }),
            }),
          ]),
        }),
        expect.any(Object),
      );
    });

    it("should query with numeric filter", async () => {
      const options: VectorQueryOptions<{ priority: number }> = {
        vector: queryVector,
        topK: 10,
        filter: { priority: { $gte: 5 } },
      };

      await adapter.query("test-index", options);

      expect(mockIndexEndpointClient.findNeighbors).toHaveBeenCalledWith(
        expect.objectContaining({
          queries: expect.arrayContaining([
            expect.objectContaining({
              datapoint: expect.objectContaining({
                numericRestricts: expect.arrayContaining([
                  expect.objectContaining({
                    namespace: "priority",
                    op: "GREATER_EQUAL",
                  }),
                ]),
              }),
            }),
          ]),
        }),
        expect.any(Object),
      );
    });

    it("should query with minimum score", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        minScore: 0.8,
      };

      const results = await adapter.query("test-index", options);
      // Only vec-1 with distance 0.1 (score 0.9) should pass
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("vec-1");
    });

    it("should query with namespace filter", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        namespace: "ns1",
      };

      await adapter.query("test-index", options);

      expect(mockIndexEndpointClient.findNeighbors).toHaveBeenCalledWith(
        expect.objectContaining({
          queries: expect.arrayContaining([
            expect.objectContaining({
              datapoint: expect.objectContaining({
                restricts: expect.arrayContaining([
                  expect.objectContaining({
                    namespace: "_namespace",
                    allowList: ["ns1"],
                  }),
                ]),
              }),
            }),
          ]),
        }),
        expect.any(Object),
      );
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

    it("should throw error if indexEndpointId not configured", async () => {
      const adapterWithoutEndpoint = new VertexVectorSearchAdapter({
        projectId: "test-project",
        location: "us-central1",
        // No indexEndpointId
      });
      await adapterWithoutEndpoint.connect();

      await expect(
        adapterWithoutEndpoint.query("test-index", {
          vector: queryVector,
          topK: 10,
        }),
      ).rejects.toThrow("indexEndpointId is required");

      await adapterWithoutEndpoint.disconnect();
    });
  });

  describe("Delete Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
      // Create index and upsert some data
      await adapter.createIndex({
        name: "test-index",
        dimension: 3,
      });
      await adapter.upsert("test-index", [
        {
          id: "vec-1",
          vector: [0.1, 0.2, 0.3],
          metadata: { category: "tech" },
          namespace: "ns1",
        },
        {
          id: "vec-2",
          vector: [0.4, 0.5, 0.6],
          metadata: { category: "science" },
          namespace: "ns1",
        },
        {
          id: "vec-3",
          vector: [0.7, 0.8, 0.9],
          metadata: { category: "tech" },
          namespace: "ns2",
        },
      ]);
      vi.clearAllMocks(); // Clear upsert calls
    });

    it("should delete by IDs", async () => {
      const result = await adapter.delete("test-index", {
        ids: ["vec-1", "vec-2"],
      });
      expect(result.deletedCount).toBe(2);
      expect(mockIndexClient.removeDatapoints).toHaveBeenCalledWith(
        expect.objectContaining({
          datapointIds: ["vec-1", "vec-2"],
        }),
        expect.any(Object),
      );
    });

    it("should delete by filter", async () => {
      const result = await adapter.delete("test-index", {
        filter: { category: "tech" },
      });
      expect(result.deletedCount).toBe(2); // vec-1 and vec-3 have category: tech
    });

    it("should delete by namespace", async () => {
      const result = await adapter.delete("test-index", {
        namespace: "ns1",
        deleteAll: true,
      });
      expect(result.deletedCount).toBe(2); // vec-1 and vec-2 are in ns1
    });

    it("should delete all records", async () => {
      const result = await adapter.delete("test-index", {
        deleteAll: true,
      });
      expect(result.deletedCount).toBe(3);
    });

    it("should return 0 when no records match", async () => {
      const result = await adapter.delete("test-index", {
        filter: { category: "nonexistent" },
      });
      expect(result.deletedCount).toBe(0);
    });
  });

  describe("Statistics", () => {
    beforeEach(async () => {
      await adapter.connect();
      // Create index and upsert some data
      await adapter.createIndex({
        name: "test-index",
        dimension: 1536,
        metric: "cosine",
      });
      await adapter.upsert("test-index", [
        { id: "vec-1", vector: new Array(1536).fill(0.1), namespace: "ns1" },
        { id: "vec-2", vector: new Array(1536).fill(0.2), namespace: "ns1" },
        { id: "vec-3", vector: new Array(1536).fill(0.3), namespace: "ns2" },
      ]);
    });

    it("should get index statistics", async () => {
      const stats = await adapter.getStats("test-index");
      expect(stats.vectorCount).toBe(3);
      expect(stats.dimension).toBe(1536);
      expect(stats.namespaceCount).toBe(2);
      expect(stats.metrics).toEqual(
        expect.objectContaining({
          metric: "cosine",
        }),
      );
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

  describe("Filter Translation", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should translate simple equality filter", async () => {
      mockIndexEndpointClient.findNeighbors.mockResolvedValue([
        { nearestNeighbors: [{ neighbors: [] }] },
      ]);

      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { category: "tech" },
      });

      expect(mockIndexEndpointClient.findNeighbors).toHaveBeenCalledWith(
        expect.objectContaining({
          queries: expect.arrayContaining([
            expect.objectContaining({
              datapoint: expect.objectContaining({
                restricts: expect.arrayContaining([
                  { namespace: "category", allowList: ["tech"] },
                ]),
              }),
            }),
          ]),
        }),
        expect.any(Object),
      );
    });

    it("should translate $eq operator", async () => {
      mockIndexEndpointClient.findNeighbors.mockResolvedValue([
        { nearestNeighbors: [{ neighbors: [] }] },
      ]);

      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { status: { $eq: "active" } },
      });

      expect(mockIndexEndpointClient.findNeighbors).toHaveBeenCalledWith(
        expect.objectContaining({
          queries: expect.arrayContaining([
            expect.objectContaining({
              datapoint: expect.objectContaining({
                restricts: expect.arrayContaining([
                  { namespace: "status", allowList: ["active"] },
                ]),
              }),
            }),
          ]),
        }),
        expect.any(Object),
      );
    });

    it("should translate $ne operator", async () => {
      mockIndexEndpointClient.findNeighbors.mockResolvedValue([
        { nearestNeighbors: [{ neighbors: [] }] },
      ]);

      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { status: { $ne: "inactive" } },
      });

      expect(mockIndexEndpointClient.findNeighbors).toHaveBeenCalledWith(
        expect.objectContaining({
          queries: expect.arrayContaining([
            expect.objectContaining({
              datapoint: expect.objectContaining({
                restricts: expect.arrayContaining([
                  { namespace: "status", denyList: ["inactive"] },
                ]),
              }),
            }),
          ]),
        }),
        expect.any(Object),
      );
    });

    it("should translate $in operator", async () => {
      mockIndexEndpointClient.findNeighbors.mockResolvedValue([
        { nearestNeighbors: [{ neighbors: [] }] },
      ]);

      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { status: { $in: ["active", "pending"] } },
      });

      expect(mockIndexEndpointClient.findNeighbors).toHaveBeenCalledWith(
        expect.objectContaining({
          queries: expect.arrayContaining([
            expect.objectContaining({
              datapoint: expect.objectContaining({
                restricts: expect.arrayContaining([
                  { namespace: "status", allowList: ["active", "pending"] },
                ]),
              }),
            }),
          ]),
        }),
        expect.any(Object),
      );
    });

    it("should translate $nin operator", async () => {
      mockIndexEndpointClient.findNeighbors.mockResolvedValue([
        { nearestNeighbors: [{ neighbors: [] }] },
      ]);

      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { status: { $nin: ["deleted", "archived"] } },
      });

      expect(mockIndexEndpointClient.findNeighbors).toHaveBeenCalledWith(
        expect.objectContaining({
          queries: expect.arrayContaining([
            expect.objectContaining({
              datapoint: expect.objectContaining({
                restricts: expect.arrayContaining([
                  { namespace: "status", denyList: ["deleted", "archived"] },
                ]),
              }),
            }),
          ]),
        }),
        expect.any(Object),
      );
    });

    it("should translate numeric comparison operators", async () => {
      mockIndexEndpointClient.findNeighbors.mockResolvedValue([
        { nearestNeighbors: [{ neighbors: [] }] },
      ]);

      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { price: { $gte: 100, $lte: 500 } },
      });

      expect(mockIndexEndpointClient.findNeighbors).toHaveBeenCalledWith(
        expect.objectContaining({
          queries: expect.arrayContaining([
            expect.objectContaining({
              datapoint: expect.objectContaining({
                numericRestricts: expect.arrayContaining([
                  expect.objectContaining({
                    namespace: "price",
                    op: "GREATER_EQUAL",
                  }),
                  expect.objectContaining({
                    namespace: "price",
                    op: "LESS_EQUAL",
                  }),
                ]),
              }),
            }),
          ]),
        }),
        expect.any(Object),
      );
    });

    it("should translate $and operator", async () => {
      mockIndexEndpointClient.findNeighbors.mockResolvedValue([
        { nearestNeighbors: [{ neighbors: [] }] },
      ]);

      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $and: [{ category: "tech" }, { status: "active" }],
        },
      });

      expect(mockIndexEndpointClient.findNeighbors).toHaveBeenCalledWith(
        expect.objectContaining({
          queries: expect.arrayContaining([
            expect.objectContaining({
              datapoint: expect.objectContaining({
                restricts: expect.arrayContaining([
                  { namespace: "category", allowList: ["tech"] },
                  { namespace: "status", allowList: ["active"] },
                ]),
              }),
            }),
          ]),
        }),
        expect.any(Object),
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
      mockIndexClient.createIndex.mockRejectedValueOnce(new Error("API error"));

      await expect(
        adapter.createIndex({ name: "test", dimension: 128 }),
      ).rejects.toThrow("Failed to create index");
    });

    it("should throw when deleting index fails", async () => {
      await adapter.connect();
      // First create an index
      await adapter.createIndex({ name: "test", dimension: 128 });

      mockIndexClient.deleteIndex.mockRejectedValueOnce(new Error("API error"));

      await expect(adapter.deleteIndex("test")).rejects.toThrow(
        "Failed to delete index",
      );
    });

    it("should throw when upsert fails", async () => {
      await adapter.connect();
      await adapter.createIndex({ name: "test", dimension: 3 });

      mockIndexClient.upsertDatapoints.mockRejectedValueOnce(
        new Error("Upsert error"),
      );

      await expect(
        adapter.upsert("test", [{ id: "1", vector: [0.1, 0.2, 0.3] }]),
      ).rejects.toThrow("Failed to upsert");
    });

    it("should throw when query fails", async () => {
      await adapter.connect();
      mockIndexEndpointClient.findNeighbors.mockRejectedValueOnce(
        new Error("Query error"),
      );

      await expect(
        adapter.query("test", { vector: [0.1], topK: 10 }),
      ).rejects.toThrow("Failed to query");
    });

    it("should throw when delete fails", async () => {
      await adapter.connect();
      await adapter.createIndex({ name: "test", dimension: 3 });
      await adapter.upsert("test", [{ id: "1", vector: [0.1, 0.2, 0.3] }]);

      mockIndexClient.removeDatapoints.mockRejectedValueOnce(
        new Error("Delete error"),
      );

      await expect(adapter.delete("test", { ids: ["1"] })).rejects.toThrow(
        "Failed to delete",
      );
    });

    it("should throw when getting stats fails", async () => {
      await adapter.connect();
      await adapter.createIndex({ name: "test", dimension: 128 });

      mockIndexClient.getIndex.mockRejectedValueOnce(new Error("Stats error"));

      await expect(adapter.getStats("test")).rejects.toThrow(
        "Failed to get stats",
      );
    });
  });

  describe("Deployed Index Management", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should set deployed index ID", async () => {
      await adapter.createIndex({
        name: "my-index",
        dimension: 1536,
      });

      adapter.setDeployedIndexId("my-index", "deployed-123");

      // Verify by getting stats (which uses the metadata)
      const stats = await adapter.getStats("my-index");
      expect(stats.metrics).toEqual(
        expect.objectContaining({
          hasDeployedIndex: true,
        }),
      );
    });

    it("should set deployed index ID for uncached index", async () => {
      adapter.setDeployedIndexId("new-index", "deployed-456");

      // Should not throw
      expect(() =>
        adapter.setDeployedIndexId("another-index", "deployed-789"),
      ).not.toThrow();
    });
  });

  describe("Streaming Updates", () => {
    it("should use streaming batch size when enabled", async () => {
      const streamingAdapter = new VertexVectorSearchAdapter({
        ...defaultConfig,
        streamingUpdates: true,
        streamingBatchSize: 50,
      });
      await streamingAdapter.connect();
      await streamingAdapter.createIndex({ name: "test", dimension: 3 });

      const records = Array.from({ length: 150 }, (_, i) => ({
        id: `vec-${i}`,
        vector: [0.1, 0.2, 0.3],
      }));

      await streamingAdapter.upsert("test", records);

      // Should use streaming batch size of 50, so 3 batches
      expect(mockIndexClient.upsertDatapoints).toHaveBeenCalledTimes(3);

      await streamingAdapter.disconnect();
    });
  });

  describe("Boolean Metadata", () => {
    beforeEach(async () => {
      await adapter.connect();
      await adapter.createIndex({ name: "test", dimension: 3 });
    });

    it("should convert boolean metadata to string restricts", async () => {
      await adapter.upsert("test", [
        { id: "vec-1", vector: [0.1, 0.2, 0.3], metadata: { featured: true } },
      ]);

      expect(mockIndexClient.upsertDatapoints).toHaveBeenCalledWith(
        expect.objectContaining({
          datapoints: expect.arrayContaining([
            expect.objectContaining({
              restricts: expect.arrayContaining([
                expect.objectContaining({
                  namespace: "featured",
                  allowList: ["true"],
                }),
              ]),
            }),
          ]),
        }),
        expect.any(Object),
      );
    });
  });
});

describe("VertexVectorSearchAdapter Integration", () => {
  // These tests require Google Cloud credentials and Vertex AI setup
  // Skip in CI environments

  it.skip("should work with real Vertex AI Vector Search", async () => {
    // This test would use a real Vertex AI index endpoint
    // Requires:
    // - GOOGLE_APPLICATION_CREDENTIALS environment variable
    // - Pre-created index deployed to an endpoint
    // - @google-cloud/aiplatform package installed
  });
});
