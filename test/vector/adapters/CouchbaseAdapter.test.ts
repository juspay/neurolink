/**
 * Couchbase Adapter Tests
 * Comprehensive test suite for the Couchbase vector store adapter
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CouchbaseAdapter } from "../../../src/lib/vector/adapters/CouchbaseAdapter.js";
import type {
  VectorRecord,
  VectorQueryOptions,
} from "../../../src/lib/vector/types.js";
import type { CouchbaseConfig } from "../../../src/lib/vector/adapters/CouchbaseAdapter.js";

// Mock Couchbase SDK
const mockCollection = {
  get: vi.fn(),
  upsert: vi.fn(),
  remove: vi.fn(),
  exists: vi.fn(),
};

const mockScope = {
  collection: vi.fn(() => mockCollection),
};

const mockBucket = {
  scope: vi.fn(() => mockScope),
  defaultScope: vi.fn(() => mockScope),
};

const mockSearchIndexManager = {
  getAllIndexes: vi.fn(),
  getIndex: vi.fn(),
  upsertIndex: vi.fn(),
  dropIndex: vi.fn(),
};

const mockCluster = {
  bucket: vi.fn(() => mockBucket),
  searchQuery: vi.fn(),
  searchIndexes: vi.fn(() => mockSearchIndexManager),
  close: vi.fn(),
};

vi.mock("couchbase", () => ({
  default: {
    connect: vi.fn(() => Promise.resolve(mockCluster)),
  },
  connect: vi.fn(() => Promise.resolve(mockCluster)),
}));

describe("CouchbaseAdapter", () => {
  let adapter: CouchbaseAdapter;
  const defaultConfig: CouchbaseConfig = {
    connectionString: "couchbase://localhost",
    username: "admin",
    password: "password",
    bucketName: "vectors",
    scopeName: "_default",
    collectionName: "_default",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection.get.mockResolvedValue({ content: {}, cas: {} });
    mockCollection.upsert.mockResolvedValue({ cas: {} });
    mockCollection.remove.mockResolvedValue({ cas: {} });
    mockCollection.exists.mockResolvedValue({ exists: false });
    mockSearchIndexManager.upsertIndex.mockResolvedValue(undefined);
    mockSearchIndexManager.dropIndex.mockResolvedValue(undefined);
    mockSearchIndexManager.getAllIndexes.mockResolvedValue([]);
    mockCluster.searchQuery.mockResolvedValue({
      rows: [],
      meta: { totalRows: 0, took: 0, maxScore: 0 },
    });
    adapter = new CouchbaseAdapter(defaultConfig);
  });

  afterEach(async () => {
    if (adapter.isInitialized()) {
      await adapter.disconnect();
    }
  });

  describe("Constructor and Configuration", () => {
    it("should create adapter with configuration", () => {
      expect(adapter).toBeInstanceOf(CouchbaseAdapter);
      expect(adapter.getStoreName()).toBe("couchbase");
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should accept custom configuration options", () => {
      const customConfig: CouchbaseConfig = {
        connectionString: "couchbases://cluster.cloud.couchbase.com",
        username: "user",
        password: "secret",
        bucketName: "my-bucket",
        scopeName: "my-scope",
        collectionName: "my-collection",
        connectionTimeout: 15000,
        kvTimeout: 10000,
        searchTimeout: 120000,
        useTls: true,
        trustStorePath: "/path/to/cert.pem",
      };
      const customAdapter = new CouchbaseAdapter(customConfig);
      expect(customAdapter.getConfig()).toEqual(customConfig);
    });

    it("should use default scope and collection if not specified", () => {
      const minimalConfig: CouchbaseConfig = {
        connectionString: "couchbase://localhost",
        username: "admin",
        password: "password",
        bucketName: "vectors",
      };
      const minimalAdapter = new CouchbaseAdapter(minimalConfig);
      expect(minimalAdapter.getConfig().scopeName).toBeUndefined();
      expect(minimalAdapter.getConfig().collectionName).toBeUndefined();
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
      expect(mockCluster.close).toHaveBeenCalled();
    });

    it("should handle disconnect when not connected", async () => {
      // Should not throw
      await adapter.disconnect();
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should use custom scope if specified", async () => {
      const customConfig: CouchbaseConfig = {
        ...defaultConfig,
        scopeName: "custom-scope",
      };
      const customAdapter = new CouchbaseAdapter(customConfig);
      await customAdapter.connect();
      expect(mockBucket.scope).toHaveBeenCalledWith("custom-scope");
      await customAdapter.disconnect();
    });

    it("should use default scope when scopeName is _default", async () => {
      await adapter.connect();
      expect(mockBucket.defaultScope).toHaveBeenCalled();
    });
  });

  describe("Index Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should create an index with FTS configuration", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 1536,
        metric: "cosine",
      });

      expect(mockSearchIndexManager.upsertIndex).toHaveBeenCalled();
      expect(mockCollection.upsert).toHaveBeenCalledWith(
        "_index_meta_test-index",
        expect.objectContaining({
          name: "test-index",
          dimension: 1536,
          metric: "cosine",
        }),
      );
    });

    it("should create index with default metric (cosine)", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 768,
      });

      expect(mockCollection.upsert).toHaveBeenCalledWith(
        "_index_meta_test-index",
        expect.objectContaining({
          metric: "cosine",
        }),
      );
    });

    it("should create index with euclidean metric", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 512,
        metric: "euclidean",
      });

      expect(mockCollection.upsert).toHaveBeenCalledWith(
        "_index_meta_test-index",
        expect.objectContaining({
          metric: "euclidean",
        }),
      );
    });

    it("should create index with dotProduct metric", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 256,
        metric: "dotProduct",
      });

      expect(mockCollection.upsert).toHaveBeenCalledWith(
        "_index_meta_test-index",
        expect.objectContaining({
          metric: "dotProduct",
        }),
      );
    });

    it("should delete an index", async () => {
      // First create the index to populate cache
      await adapter.createIndex({
        name: "test-index",
        dimension: 1536,
      });

      await adapter.deleteIndex("test-index");
      expect(mockSearchIndexManager.dropIndex).toHaveBeenCalledWith("test-index");
      expect(mockCollection.remove).toHaveBeenCalledWith("_index_meta_test-index");
    });

    it("should handle delete of non-existent index", async () => {
      mockSearchIndexManager.dropIndex.mockRejectedValueOnce(
        new Error("Index not found"),
      );

      // Should not throw
      await adapter.deleteIndex("nonexistent-index");
    });

    it("should list indexes from cache", async () => {
      await adapter.createIndex({ name: "index1", dimension: 128 });
      await adapter.createIndex({ name: "index2", dimension: 256 });

      const indexes = await adapter.listIndexes();
      expect(indexes).toContain("index1");
      expect(indexes).toContain("index2");
    });

    it("should check if index exists in cache", async () => {
      await adapter.createIndex({ name: "test-index", dimension: 128 });

      const exists = await adapter.indexExists("test-index");
      expect(exists).toBe(true);
    });

    it("should check if index exists in storage", async () => {
      mockCollection.exists.mockResolvedValueOnce({ exists: true });

      const exists = await adapter.indexExists("stored-index");
      expect(exists).toBe(true);
      expect(mockCollection.exists).toHaveBeenCalledWith(
        "_index_meta_stored-index",
      );
    });

    it("should return false for non-existent index", async () => {
      mockCollection.exists.mockResolvedValueOnce({ exists: false });

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
      await adapter.createIndex({ name: "test-index", dimension: 3 });
    });

    it("should upsert records", async () => {
      const result = await adapter.upsert("test-index", testRecords);
      expect(result.upsertedCount).toBe(2);
      expect(mockCollection.upsert).toHaveBeenCalledWith(
        "test-index::vec-1",
        expect.objectContaining({
          id: "vec-1",
          vector: [0.1, 0.2, 0.3],
          metadata: { category: "tech" },
        }),
      );
    });

    it("should upsert with namespace", async () => {
      const result = await adapter.upsert("test-index", testRecords, {
        namespace: "ns1",
      });
      expect(result.upsertedCount).toBe(2);
      expect(mockCollection.upsert).toHaveBeenCalledWith(
        "test-index::vec-1",
        expect.objectContaining({
          namespace: "ns1",
        }),
      );
    });

    it("should use record namespace if provided", async () => {
      const recordsWithNamespace = [
        {
          id: "vec-1",
          vector: [0.1, 0.2, 0.3],
          namespace: "record-ns",
        },
      ];

      await adapter.upsert("test-index", recordsWithNamespace);
      expect(mockCollection.upsert).toHaveBeenCalledWith(
        "test-index::vec-1",
        expect.objectContaining({
          namespace: "record-ns",
        }),
      );
    });

    it("should validate vector dimensions against index", async () => {
      const invalidRecords = [
        { id: "v1", vector: [0.1, 0.2, 0.3, 0.4, 0.5] }, // Wrong dimension
      ];

      await expect(
        adapter.upsert("test-index", invalidRecords),
      ).rejects.toThrow("Vector dimension mismatch");
    });

    it("should validate consistent vector dimensions", async () => {
      // Create index without dimension check
      const newAdapter = new CouchbaseAdapter(defaultConfig);
      await newAdapter.connect();

      const invalidRecords = [
        { id: "v1", vector: [0.1, 0.2, 0.3] },
        { id: "v2", vector: [0.1, 0.2] }, // Different dimension
      ];

      await expect(
        newAdapter.upsert("new-index", invalidRecords),
      ).rejects.toThrow("Inconsistent vector dimensions");

      await newAdapter.disconnect();
    });

    it("should handle empty records array", async () => {
      const result = await adapter.upsert("test-index", []);
      expect(result.upsertedCount).toBe(0);
    });

    it("should update index metadata after upsert", async () => {
      await adapter.upsert("test-index", testRecords);

      // Check that metadata was updated
      expect(mockCollection.upsert).toHaveBeenCalledWith(
        "_index_meta_test-index",
        expect.objectContaining({
          vectorCount: expect.any(Number),
        }),
      );
    });
  });

  describe("Query Operations", () => {
    const queryVector = [0.1, 0.2, 0.3];

    beforeEach(async () => {
      await adapter.connect();
      await adapter.createIndex({ name: "test-index", dimension: 3 });
    });

    it("should query vectors", async () => {
      mockCluster.searchQuery.mockResolvedValueOnce({
        rows: [
          { id: "test-index::vec-1", score: 0.95 },
          { id: "test-index::vec-2", score: 0.85 },
        ],
        meta: { totalRows: 2, took: 10, maxScore: 0.95 },
      });

      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
      };

      const results = await adapter.query("test-index", options);
      expect(Array.isArray(results)).toBe(true);
      expect(mockCluster.searchQuery).toHaveBeenCalled();
    });

    it("should apply minimum score filter", async () => {
      mockCluster.searchQuery.mockResolvedValueOnce({
        rows: [
          { id: "test-index::vec-1", score: 0.95 },
          { id: "test-index::vec-2", score: 0.45 },
        ],
        meta: { totalRows: 2, took: 10, maxScore: 0.95 },
      });

      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
        minScore: 0.5,
      });

      // Only vec-1 should pass the minScore filter
      expect(results.length).toBeLessThanOrEqual(1);
    });

    it("should include vectors when requested", async () => {
      mockCluster.searchQuery.mockResolvedValueOnce({
        rows: [{ id: "test-index::vec-1", score: 0.95 }],
        meta: { totalRows: 1, took: 10, maxScore: 0.95 },
      });

      mockCollection.get.mockResolvedValueOnce({
        content: {
          id: "vec-1",
          vector: [0.1, 0.2, 0.3],
          metadata: { category: "tech" },
        },
        cas: {},
      });

      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
        includeVectors: true,
      });

      expect(results[0].vector).toEqual([0.1, 0.2, 0.3]);
    });

    it("should include metadata when requested", async () => {
      mockCluster.searchQuery.mockResolvedValueOnce({
        rows: [{ id: "test-index::vec-1", score: 0.95 }],
        meta: { totalRows: 1, took: 10, maxScore: 0.95 },
      });

      mockCollection.get.mockResolvedValueOnce({
        content: {
          id: "vec-1",
          vector: [0.1, 0.2, 0.3],
          metadata: { category: "tech" },
          content: "Test content",
        },
        cas: {},
      });

      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
        includeMetadata: true,
      });

      expect(results[0].metadata).toEqual({ category: "tech" });
      expect(results[0].content).toBe("Test content");
    });

    it("should skip documents that were deleted", async () => {
      mockCluster.searchQuery.mockResolvedValueOnce({
        rows: [{ id: "test-index::vec-1", score: 0.95 }],
        meta: { totalRows: 1, took: 10, maxScore: 0.95 },
      });

      mockCollection.get.mockRejectedValueOnce(new Error("Document not found"));

      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
        includeMetadata: true,
      });

      expect(results.length).toBe(0);
    });

    it("should limit results to topK", async () => {
      mockCluster.searchQuery.mockResolvedValueOnce({
        rows: [
          { id: "test-index::vec-1", score: 0.95 },
          { id: "test-index::vec-2", score: 0.90 },
          { id: "test-index::vec-3", score: 0.85 },
        ],
        meta: { totalRows: 3, took: 10, maxScore: 0.95 },
      });

      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 2,
      });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it("should strip index prefix from result IDs", async () => {
      mockCluster.searchQuery.mockResolvedValueOnce({
        rows: [{ id: "test-index::vec-1", score: 0.95 }],
        meta: { totalRows: 1, took: 10, maxScore: 0.95 },
      });

      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
      });

      expect(results[0].id).toBe("vec-1");
    });
  });

  describe("Delete Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
      await adapter.createIndex({ name: "test-index", dimension: 3 });
    });

    it("should delete by IDs", async () => {
      const result = await adapter.delete("test-index", {
        ids: ["vec-1", "vec-2"],
      });
      expect(result.deletedCount).toBe(2);
      expect(mockCollection.remove).toHaveBeenCalledWith("test-index::vec-1");
      expect(mockCollection.remove).toHaveBeenCalledWith("test-index::vec-2");
    });

    it("should handle delete of non-existent documents", async () => {
      mockCollection.remove.mockRejectedValueOnce(
        new Error("Document not found"),
      );

      const result = await adapter.delete("test-index", {
        ids: ["nonexistent"],
      });
      // Should not throw, but count as 0
      expect(result.deletedCount).toBe(0);
    });

    it("should update index metadata after delete", async () => {
      await adapter.delete("test-index", {
        ids: ["vec-1"],
      });

      // Check that metadata was updated
      expect(mockCollection.upsert).toHaveBeenCalledWith(
        "_index_meta_test-index",
        expect.objectContaining({
          vectorCount: expect.any(Number),
        }),
      );
    });

    it("should handle deleteAll operation", async () => {
      const result = await adapter.delete("test-index", {
        deleteAll: true,
      });
      // deleteAll returns the previous count
      expect(typeof result.deletedCount).toBe("number");
    });

    it("should handle empty ids array", async () => {
      const result = await adapter.delete("test-index", {
        ids: [],
      });
      expect(result.deletedCount).toBe(0);
    });
  });

  describe("Statistics", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should get index statistics from cache", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 1536,
        metric: "cosine",
      });

      const stats = await adapter.getStats("test-index");
      expect(stats.dimension).toBe(1536);
      expect(stats.vectorCount).toBe(0);
      expect(stats.metrics).toEqual(
        expect.objectContaining({
          metric: "cosine",
        }),
      );
    });

    it("should load stats from storage if not in cache", async () => {
      mockCollection.get.mockResolvedValueOnce({
        content: {
          name: "stored-index",
          dimension: 768,
          metric: "euclidean",
          vectorCount: 100,
          createdAt: "2024-01-01T00:00:00Z",
        },
        cas: {},
      });

      const stats = await adapter.getStats("stored-index");
      expect(stats.dimension).toBe(768);
      expect(stats.vectorCount).toBe(100);
    });

    it("should throw error for non-existent index", async () => {
      mockCollection.get.mockRejectedValueOnce(new Error("Document not found"));

      await expect(adapter.getStats("nonexistent")).rejects.toThrow(
        "Index nonexistent not found",
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

  describe("Batch Operations", () => {
    const manyRecords = Array.from({ length: 250 }, (_, i) => ({
      id: `vec-${i}`,
      vector: [0.1, 0.2, 0.3],
      metadata: { index: i },
    }));

    beforeEach(async () => {
      await adapter.connect();
      await adapter.createIndex({ name: "test-index", dimension: 3 });
    });

    it("should batch upsert large datasets", async () => {
      const result = await adapter.batchUpsert("test-index", manyRecords, {
        batchSize: 100,
      });
      expect(result.upsertedCount).toBe(250);
    });

    it("should batch delete large ID lists", async () => {
      const ids = manyRecords.map((r) => r.id);

      const result = await adapter.batchDelete("test-index", ids, {
        batchSize: 100,
      });
      expect(result.deletedCount).toBe(250);
    });
  });

  describe("Filter Translation", () => {
    beforeEach(async () => {
      await adapter.connect();
      await adapter.createIndex({ name: "test-index", dimension: 3 });

      mockCluster.searchQuery.mockResolvedValue({
        rows: [],
        meta: { totalRows: 0, took: 0, maxScore: 0 },
      });
    });

    it("should translate simple equality filter", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2, 0.3],
        topK: 10,
        filter: { category: "tech" },
      });

      expect(mockCluster.searchQuery).toHaveBeenCalled();
    });

    it("should translate comparison operators", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2, 0.3],
        topK: 10,
        filter: { price: { $gte: 100, $lte: 500 } },
      });

      expect(mockCluster.searchQuery).toHaveBeenCalled();
    });

    it("should translate logical $and operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2, 0.3],
        topK: 10,
        filter: {
          $and: [{ category: "tech" }, { status: "active" }],
        },
      });

      expect(mockCluster.searchQuery).toHaveBeenCalled();
    });

    it("should translate logical $or operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2, 0.3],
        topK: 10,
        filter: {
          $or: [{ category: "tech" }, { category: "science" }],
        },
      });

      expect(mockCluster.searchQuery).toHaveBeenCalled();
    });

    it("should translate $not operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2, 0.3],
        topK: 10,
        filter: {
          $not: { category: "spam" },
        },
      });

      expect(mockCluster.searchQuery).toHaveBeenCalled();
    });

    it("should translate $in operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2, 0.3],
        topK: 10,
        filter: {
          status: { $in: ["active", "pending"] },
        },
      });

      expect(mockCluster.searchQuery).toHaveBeenCalled();
    });

    it("should translate $nin operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2, 0.3],
        topK: 10,
        filter: {
          status: { $nin: ["deleted", "archived"] },
        },
      });

      expect(mockCluster.searchQuery).toHaveBeenCalled();
    });

    it("should translate string operators", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2, 0.3],
        topK: 10,
        filter: {
          title: { $contains: "vector" },
        },
      });

      expect(mockCluster.searchQuery).toHaveBeenCalled();
    });

    it("should translate $startsWith operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2, 0.3],
        topK: 10,
        filter: {
          title: { $startsWith: "intro" },
        },
      });

      expect(mockCluster.searchQuery).toHaveBeenCalled();
    });

    it("should translate $endsWith operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2, 0.3],
        topK: 10,
        filter: {
          title: { $endsWith: "tutorial" },
        },
      });

      expect(mockCluster.searchQuery).toHaveBeenCalled();
    });

    it("should translate $exists operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2, 0.3],
        topK: 10,
        filter: {
          optional_field: { $exists: true },
        },
      });

      expect(mockCluster.searchQuery).toHaveBeenCalled();
    });

    it("should handle namespace filter", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2, 0.3],
        topK: 10,
        namespace: "production",
      });

      expect(mockCluster.searchQuery).toHaveBeenCalled();
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
      mockSearchIndexManager.upsertIndex.mockRejectedValueOnce(
        new Error("FTS error"),
      );

      await expect(
        adapter.createIndex({ name: "test", dimension: 128 }),
      ).rejects.toThrow("Failed to create index");
    });

    it("should throw when upsert fails", async () => {
      await adapter.connect();
      await adapter.createIndex({ name: "test-index", dimension: 3 });

      mockCollection.upsert.mockRejectedValueOnce(new Error("KV error"));

      await expect(
        adapter.upsert("test-index", [{ id: "1", vector: [0.1, 0.2, 0.3] }]),
      ).rejects.toThrow("Failed to upsert");
    });

    it("should throw when query fails", async () => {
      await adapter.connect();
      await adapter.createIndex({ name: "test-index", dimension: 3 });

      mockCluster.searchQuery.mockRejectedValueOnce(new Error("Search error"));

      await expect(
        adapter.query("test-index", { vector: [0.1, 0.2, 0.3], topK: 10 }),
      ).rejects.toThrow("Failed to query");
    });

    it("should handle failed delete gracefully for single item", async () => {
      await adapter.connect();
      await adapter.createIndex({ name: "test-index", dimension: 3 });

      // Mock remove to throw an error (document not found scenario)
      mockCollection.remove.mockRejectedValueOnce(new Error("Document not found"));

      // The adapter catches remove errors and treats them as "document doesn't exist"
      // so it returns 0 deleted count instead of throwing
      const result = await adapter.delete("test-index", { ids: ["1"] });
      expect(result.deletedCount).toBe(0);
    });

    it("should throw when connection fails", async () => {
      const couchbase = await import("couchbase");
      (couchbase as { connect: unknown }).connect = vi.fn().mockRejectedValueOnce(
        new Error("Connection refused"),
      );

      const newAdapter = new CouchbaseAdapter(defaultConfig);
      await expect(newAdapter.connect()).rejects.toThrow(
        "Failed to connect to Couchbase",
      );
    });
  });

});

describe("CouchbaseAdapter Integration", () => {
  // These tests require a real Couchbase cluster with vector search enabled
  // Skip if not available

  it.skip("should work with real Couchbase cluster", async () => {
    // This test would use a real Couchbase cluster
    // Requires Couchbase Server 7.1+ with Vector Search
  });

  it.skip("should perform hybrid search with text and vectors", async () => {
    // Test combining vector search with full-text search
  });
});
