/**
 * DataStax Astra DB Adapter Tests
 * Comprehensive test suite for the Astra DB vector store adapter
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from "vitest";
import type {
  VectorRecord,
  VectorQueryOptions,
} from "../../../src/lib/vector/types.js";
import type { AstraDBConfig } from "../../../src/lib/vector/adapters/AstraDBAdapter.js";

// Mock cursor with chainable methods
const createMockCursor = (documents: unknown[] = []) => {
  const cursor = {
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    includeSimilarity: vi.fn().mockReturnThis(),
    projection: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue(documents),
  };
  return cursor;
};

// Mock collection factory
const createMockCollection = (documents: unknown[] = []) => ({
  insertOne: vi.fn().mockResolvedValue({ insertedId: "test-id" }),
  insertMany: vi.fn().mockResolvedValue({ insertedIds: ["id1", "id2"] }),
  find: vi.fn().mockReturnValue(createMockCursor(documents)),
  findOne: vi.fn().mockResolvedValue(null),
  updateOne: vi.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 }),
  deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
  deleteMany: vi.fn().mockResolvedValue({ deletedCount: 2 }),
  countDocuments: vi.fn().mockResolvedValue(100),
  options: vi.fn().mockResolvedValue({ vector: { dimension: 1536, metric: "cosine" } }),
});

// Default mock collection instance
const mockCollection = createMockCollection();

// Mock database
const mockDb = {
  createCollection: vi.fn().mockResolvedValue(mockCollection),
  dropCollection: vi.fn().mockResolvedValue(undefined),
  listCollections: vi.fn().mockResolvedValue([]),
  collection: vi.fn().mockReturnValue(mockCollection),
};

// Mock client
const mockClient = {
  db: vi.fn().mockReturnValue(mockDb),
  close: vi.fn().mockResolvedValue(undefined),
};

// Mock DataAPIClient class constructor
const MockDataAPIClient = vi.fn().mockImplementation(() => mockClient);

// Mock the @datastax/astra-db-ts module
vi.mock("@datastax/astra-db-ts", () => {
  return {
    DataAPIClient: MockDataAPIClient,
    default: {
      DataAPIClient: MockDataAPIClient,
    },
  };
});

// Import adapter after setting up mocks
const { AstraDBAdapter } = await import("../../../src/lib/vector/adapters/AstraDBAdapter.js");

describe("AstraDBAdapter", () => {
  let adapter: InstanceType<typeof AstraDBAdapter>;
  const defaultConfig: AstraDBConfig = {
    token: "test-token",
    endpoint: "https://test-endpoint.astra.datastax.com",
    keyspace: "test_keyspace",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    MockDataAPIClient.mockImplementation(() => mockClient);
    mockClient.db.mockReturnValue(mockDb);
    mockDb.listCollections.mockResolvedValue([]);
    mockDb.createCollection.mockResolvedValue(mockCollection);
    mockDb.dropCollection.mockResolvedValue(undefined);
    mockDb.collection.mockReturnValue(mockCollection);
    mockCollection.find.mockReturnValue(createMockCursor([]));
    mockCollection.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
    mockCollection.deleteMany.mockResolvedValue({ deletedCount: 2 });
    mockCollection.countDocuments.mockResolvedValue(100);
    mockCollection.options.mockResolvedValue({ vector: { dimension: 1536, metric: "cosine" } });
    adapter = new AstraDBAdapter(defaultConfig);
  });

  afterEach(async () => {
    if (adapter.isInitialized()) {
      await adapter.disconnect();
    }
  });

  describe("Constructor and Configuration", () => {
    it("should create adapter with configuration", () => {
      expect(adapter).toBeInstanceOf(AstraDBAdapter);
      expect(adapter.getStoreName()).toBe("astra");
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should accept custom configuration options", () => {
      const customConfig: AstraDBConfig = {
        token: "custom-token",
        endpoint: "https://custom-endpoint.astra.datastax.com",
        keyspace: "custom_keyspace",
        connectionTimeout: 60000,
        logging: "all",
      };
      const customAdapter = new AstraDBAdapter(customConfig);
      expect(customAdapter.getConfig()).toEqual(customConfig);
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
    });

    it("should handle disconnect when not connected", async () => {
      // Should not throw
      await adapter.disconnect();
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should throw when connection fails", async () => {
      mockDb.listCollections.mockRejectedValueOnce(new Error("Connection refused"));

      await expect(adapter.connect()).rejects.toThrow(
        "Failed to connect to Astra DB",
      );
    });
  });

  describe("Index Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should create an index with cosine metric", async () => {
      await adapter.createIndex({
        name: "test-collection",
        dimension: 1536,
        metric: "cosine",
      });

      expect(mockDb.createCollection).toHaveBeenCalledWith("test-collection", {
        vector: {
          dimension: 1536,
          metric: "cosine",
        },
        defaultId: { type: "uuid" },
      });
    });

    it("should create an index with euclidean metric", async () => {
      await adapter.createIndex({
        name: "test-collection",
        dimension: 768,
        metric: "euclidean",
      });

      expect(mockDb.createCollection).toHaveBeenCalledWith("test-collection", {
        vector: {
          dimension: 768,
          metric: "euclidean",
        },
        defaultId: { type: "uuid" },
      });
    });

    it("should create an index with dotProduct metric", async () => {
      await adapter.createIndex({
        name: "test-collection",
        dimension: 384,
        metric: "dotProduct",
      });

      expect(mockDb.createCollection).toHaveBeenCalledWith("test-collection", {
        vector: {
          dimension: 384,
          metric: "dot_product",
        },
        defaultId: { type: "uuid" },
      });
    });

    it("should create index with default metric", async () => {
      await adapter.createIndex({
        name: "test-collection",
        dimension: 1536,
      });

      expect(mockDb.createCollection).toHaveBeenCalledWith("test-collection", {
        vector: {
          dimension: 1536,
          metric: "cosine",
        },
        defaultId: { type: "uuid" },
      });
    });

    it("should delete an index", async () => {
      await adapter.deleteIndex("test-collection");

      expect(mockDb.dropCollection).toHaveBeenCalledWith("test-collection");
    });

    it("should list indexes", async () => {
      mockDb.listCollections.mockResolvedValueOnce([
        { name: "collection1", options: { vector: { dimension: 1536 } } },
        { name: "collection2", options: { vector: { dimension: 1536 } } },
      ]);

      await adapter.connect();

      const indexes = await adapter.listIndexes();
      expect(indexes).toEqual(["collection1", "collection2"]);
    });

    it("should check if index exists", async () => {
      mockDb.listCollections.mockResolvedValue([
        { name: "test-collection", options: { vector: { dimension: 1536 } } },
      ]);

      const exists = await adapter.indexExists("test-collection");
      expect(exists).toBe(true);

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
    });

    it("should upsert with namespace", async () => {
      const result = await adapter.upsert("test-collection", testRecords, {
        namespace: "ns1",
      });
      expect(result.upsertedCount).toBe(2);
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
    });
  });

  describe("Query Operations", () => {
    const queryVector = [0.1, 0.2, 0.3];
    const mockDocuments = [
      {
        _id: "vec-1",
        $vector: [0.1, 0.2, 0.3],
        metadata: { category: "tech" },
        content: "Test content",
        $similarity: 0.95,
      },
      {
        _id: "vec-2",
        $vector: [0.2, 0.3, 0.4],
        metadata: { category: "science" },
        content: "Another content",
        $similarity: 0.85,
      },
    ];

    beforeEach(async () => {
      mockCollection.find.mockReturnValue(createMockCursor(mockDocuments));
      await adapter.connect();
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

      const results = await adapter.query("test-collection", options);
      expect(Array.isArray(results)).toBe(true);
    });

    it("should query with minimum score", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        minScore: 0.9,
      };

      const results = await adapter.query("test-collection", options);
      // Only vec-1 should pass the minScore filter
      expect(results.length).toBe(1);
      expect(results[0].score).toBeGreaterThanOrEqual(0.9);
    });

    it("should query with namespace filter", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        namespace: "ns1",
      };

      const results = await adapter.query("test-collection", options);
      expect(Array.isArray(results)).toBe(true);
    });

    it("should include vectors when requested", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        includeVectors: true,
      };

      const results = await adapter.query("test-collection", options);
      expect(results[0].vector).toBeDefined();
      expect(Array.isArray(results[0].vector)).toBe(true);
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
  });

  describe("Delete Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should delete by IDs", async () => {
      const result = await adapter.delete("test-collection", {
        ids: ["vec-1", "vec-2"],
      });
      expect(result.deletedCount).toBe(2);
    });

    it("should delete by filter", async () => {
      const result = await adapter.delete("test-collection", {
        filter: { category: "deprecated" },
      });
      expect(result.deletedCount).toBe(2);
    });

    it("should delete by namespace", async () => {
      const result = await adapter.delete("test-collection", {
        namespace: "old-data",
        deleteAll: true,
      });
      expect(result.deletedCount).toBe(2);
    });

    it("should delete all records", async () => {
      const result = await adapter.delete("test-collection", {
        deleteAll: true,
      });
      expect(result.deletedCount).toBe(2);
    });
  });

  describe("Statistics", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should get index statistics", async () => {
      const stats = await adapter.getStats("test-collection");
      expect(stats.vectorCount).toBe(100);
      expect(stats.dimension).toBe(1536);
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
      const result = await adapter.batchUpsert("test-collection", manyRecords, {
        batchSize: 100,
      });
      expect(result.upsertedCount).toBe(250);
    });

    it("should batch delete large ID lists", async () => {
      const ids = manyRecords.map((r) => r.id);

      const result = await adapter.batchDelete("test-collection", ids, {
        batchSize: 100,
      });
      // 3 batches of 100, 100, 50
      expect(result.deletedCount).toBe(250); // 250 total deletes
    });
  });

  describe("Filter Translation", () => {
    beforeEach(async () => {
      mockCollection.find.mockReturnValue(createMockCursor([]));
      await adapter.connect();
    });

    it("should translate simple equality filter", async () => {
      await adapter.query("test-collection", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { category: "tech" },
      });

      expect(mockCollection.find).toHaveBeenCalled();
    });

    it("should translate comparison operators", async () => {
      await adapter.query("test-collection", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { price: { $gte: 100, $lte: 500 } },
      });

      expect(mockCollection.find).toHaveBeenCalled();
    });

    it("should translate logical $and operator", async () => {
      await adapter.query("test-collection", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $and: [{ category: "tech" }, { status: "active" }],
        },
      });

      expect(mockCollection.find).toHaveBeenCalled();
    });

    it("should translate logical $or operator", async () => {
      await adapter.query("test-collection", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $or: [{ category: "tech" }, { category: "science" }],
        },
      });

      expect(mockCollection.find).toHaveBeenCalled();
    });

    it("should translate $in operator", async () => {
      await adapter.query("test-collection", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          status: { $in: ["active", "pending"] },
        },
      });

      expect(mockCollection.find).toHaveBeenCalled();
    });

    it("should translate string operators", async () => {
      await adapter.query("test-collection", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          title: { $contains: "vector" },
        },
      });

      expect(mockCollection.find).toHaveBeenCalled();
    });

    it("should translate $exists operator", async () => {
      await adapter.query("test-collection", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          optional_field: { $exists: true },
        },
      });

      expect(mockCollection.find).toHaveBeenCalled();
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
      mockDb.createCollection.mockRejectedValueOnce(new Error("API error"));

      await expect(
        adapter.createIndex({ name: "test", dimension: 128 }),
      ).rejects.toThrow("Failed to create collection");
    });

    it("should throw when deleting index fails", async () => {
      await adapter.connect();
      mockDb.dropCollection.mockRejectedValueOnce(new Error("API error"));

      await expect(adapter.deleteIndex("test")).rejects.toThrow(
        "Failed to delete collection",
      );
    });

    it("should throw when upsert fails", async () => {
      await adapter.connect();
      mockCollection.updateOne.mockRejectedValueOnce(new Error("Insert error"));

      await expect(
        adapter.upsert("test", [{ id: "1", vector: [0.1] }]),
      ).rejects.toThrow("Failed to upsert");
    });

    it("should throw when query fails", async () => {
      await adapter.connect();
      mockCollection.find.mockImplementationOnce(() => {
        throw new Error("Query error");
      });

      await expect(
        adapter.query("test", { vector: [0.1], topK: 10 }),
      ).rejects.toThrow("Failed to query");
    });

    it("should throw when delete fails", async () => {
      await adapter.connect();
      mockCollection.deleteOne.mockRejectedValueOnce(new Error("Delete error"));

      await expect(
        adapter.delete("test", { ids: ["1"] }),
      ).rejects.toThrow("Failed to delete");
    });

    it("should throw when getting stats fails", async () => {
      await adapter.connect();
      mockCollection.countDocuments.mockRejectedValueOnce(new Error("Stats error"));

      await expect(adapter.getStats("test")).rejects.toThrow(
        "Failed to get stats",
      );
    });
  });

  describe("Metric Conversion", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should convert cosine metric correctly", async () => {
      await adapter.createIndex({
        name: "test",
        dimension: 128,
        metric: "cosine",
      });

      expect(mockDb.createCollection).toHaveBeenCalledWith(
        "test",
        expect.objectContaining({
          vector: expect.objectContaining({ metric: "cosine" }),
        }),
      );
    });

    it("should convert euclidean metric correctly", async () => {
      await adapter.createIndex({
        name: "test",
        dimension: 128,
        metric: "euclidean",
      });

      expect(mockDb.createCollection).toHaveBeenCalledWith(
        "test",
        expect.objectContaining({
          vector: expect.objectContaining({ metric: "euclidean" }),
        }),
      );
    });

    it("should convert dotProduct metric correctly", async () => {
      await adapter.createIndex({
        name: "test",
        dimension: 128,
        metric: "dotProduct",
      });

      expect(mockDb.createCollection).toHaveBeenCalledWith(
        "test",
        expect.objectContaining({
          vector: expect.objectContaining({ metric: "dot_product" }),
        }),
      );
    });
  });
});

describe("AstraDBAdapter Integration", () => {
  // These tests require @datastax/astra-db-ts to be installed
  // and valid Astra DB credentials
  // Skip if not available

  it.skip("should work with real Astra DB instance", async () => {
    // This test would use a real Astra DB instance
    // Requires @datastax/astra-db-ts and valid credentials
  });
});
