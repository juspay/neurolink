/**
 * DuckDB Adapter Tests
 * Comprehensive test suite for the DuckDB vector store adapter
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from "vitest";
import type {
  VectorRecord,
  VectorQueryOptions,
  DuckDBConfig,
} from "../../../src/lib/vector/types.js";

// Create mock database instance
const createMockDatabase = () => ({
  run: vi.fn().mockResolvedValue(undefined),
  exec: vi.fn().mockResolvedValue(undefined),
  all: vi.fn().mockResolvedValue([]),
  get: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
});

let mockDatabase = createMockDatabase();

// Mock the duckdb-async module before importing the adapter
vi.mock("duckdb-async", () => ({
  Database: {
    create: vi.fn(() => Promise.resolve(mockDatabase)),
  },
}));

// Import after mocking
import { DuckDBAdapter } from "../../../src/lib/vector/adapters/DuckDBAdapter.js";

describe("DuckDBAdapter", () => {
  let adapter: DuckDBAdapter;
  const defaultConfig: DuckDBConfig = {
    databasePath: ":memory:",
    inMemory: true,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset mock database for each test
    mockDatabase = createMockDatabase();

    // Re-configure the mocked Database.create to return fresh mock
    const duckdbAsync = await import("duckdb-async");
    (duckdbAsync.Database.create as Mock).mockResolvedValue(mockDatabase);

    adapter = new DuckDBAdapter(defaultConfig);
  });

  afterEach(async () => {
    if (adapter.isInitialized()) {
      await adapter.disconnect();
    }
  });

  describe("Constructor and Configuration", () => {
    it("should create adapter with configuration", () => {
      expect(adapter).toBeInstanceOf(DuckDBAdapter);
      expect(adapter.getStoreName()).toBe("duckdb");
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should accept custom configuration options", () => {
      const customConfig: DuckDBConfig = {
        databasePath: "/path/to/db.duckdb",
        inMemory: false,
        connectionTimeout: 10000,
        readOnly: false,
        threads: 4,
        memoryLimit: "4GB",
      };
      const customAdapter = new DuckDBAdapter(customConfig);
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

    it("should attempt to load VSS extension during connection", async () => {
      await adapter.connect();
      // VSS extension loading is attempted (INSTALL vss and LOAD vss)
      expect(mockDatabase.exec).toHaveBeenCalled();
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

      expect(mockDatabase.exec).toHaveBeenCalled();
      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining("INSERT OR REPLACE INTO _vector_indexes"),
        "test-index",
        1536,
        "cosine",
      );
    });

    it("should create index with default metric", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 768,
      });

      // Should default to cosine
      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining("INSERT OR REPLACE INTO _vector_indexes"),
        "test-index",
        768,
        "cosine",
      );
    });

    it("should create index with euclidean metric", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 384,
        metric: "euclidean",
      });

      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining("INSERT OR REPLACE INTO _vector_indexes"),
        "test-index",
        384,
        "euclidean",
      );
    });

    it("should create index with dotProduct metric", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 512,
        metric: "dotProduct",
      });

      expect(mockDatabase.run).toHaveBeenCalledWith(
        expect.stringContaining("INSERT OR REPLACE INTO _vector_indexes"),
        "test-index",
        512,
        "dotProduct",
      );
    });

    it("should delete an index", async () => {
      await adapter.deleteIndex("test-index");
      expect(mockDatabase.exec).toHaveBeenCalledWith(
        expect.stringContaining("DROP TABLE IF EXISTS"),
      );
    });

    it("should list indexes", async () => {
      mockDatabase.all.mockResolvedValueOnce([
        { name: "index1" },
        { name: "index2" },
      ]);

      const indexes = await adapter.listIndexes();
      expect(indexes).toEqual(["index1", "index2"]);
    });

    it("should check if index exists", async () => {
      mockDatabase.get.mockResolvedValueOnce({ exists: 1 });
      const exists = await adapter.indexExists("test-index");
      expect(exists).toBe(true);

      mockDatabase.get.mockResolvedValueOnce(undefined);
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
    });

    it("should upsert with namespace", async () => {
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

      await expect(
        adapter.upsert("test-index", invalidRecords),
      ).rejects.toThrow("Inconsistent vector dimensions");
    });

    it("should handle empty records array", async () => {
      const result = await adapter.upsert("test-index", []);
      expect(result.upsertedCount).toBe(0);
    });

    it("should upsert records without metadata", async () => {
      const recordsWithoutMetadata: VectorRecord[] = [
        { id: "v1", vector: [0.1, 0.2, 0.3] },
        { id: "v2", vector: [0.4, 0.5, 0.6] },
      ];

      const result = await adapter.upsert("test-index", recordsWithoutMetadata);
      expect(result.upsertedCount).toBe(2);
    });
  });

  describe("Query Operations", () => {
    const queryVector = [0.1, 0.2, 0.3];
    const mockRows = [
      {
        id: "vec-1",
        vector: "[0.1, 0.2, 0.3]",
        metadata: JSON.stringify({ category: "tech" }),
        content: "Test content",
        score: 0.95,
      },
    ];

    beforeEach(async () => {
      await adapter.connect();
      mockDatabase.all.mockResolvedValue(mockRows);
    });

    it("should query vectors", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
      };

      const results = await adapter.query("test-index", options);
      expect(Array.isArray(results)).toBe(true);
    });

    it("should query with metadata filter", async () => {
      const options: VectorQueryOptions<{ category: string }> = {
        vector: queryVector,
        topK: 10,
        filter: { category: "tech" },
      };

      const results = await adapter.query("test-index", options);
      expect(Array.isArray(results)).toBe(true);
    });

    it("should query with minimum score", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        minScore: 0.5,
      };

      const results = await adapter.query("test-index", options);
      expect(Array.isArray(results)).toBe(true);
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
      mockDatabase.all.mockResolvedValueOnce([
        {
          id: "vec-1",
          vector: "[0.1, 0.2, 0.3]",
          metadata: null,
          content: null,
          score: 0.95,
        },
      ]);

      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        includeVectors: true,
      };

      const results = await adapter.query("test-index", options);
      expect(Array.isArray(results)).toBe(true);
      if (results.length > 0) {
        expect(results[0].vector).toBeDefined();
      }
    });

    it("should include metadata when requested", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        includeMetadata: true,
      };

      const results = await adapter.query("test-index", options);
      expect(Array.isArray(results)).toBe(true);
    });

    it("should return results with scores", async () => {
      mockDatabase.all.mockResolvedValueOnce([
        {
          id: "vec-1",
          vector: "[0.1, 0.2, 0.3]",
          metadata: null,
          content: "Test",
          score: 0.95,
        },
      ]);

      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
      });

      expect(results.length).toBe(1);
      expect(results[0].score).toBe(0.95);
      expect(results[0].id).toBe("vec-1");
    });
  });

  describe("Delete Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
      mockDatabase.get.mockResolvedValue({ count: 2 });
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
      expect(result.deletedCount).toBe(2);
    });

    it("should delete by namespace", async () => {
      const result = await adapter.delete("test-index", {
        namespace: "old-data",
        deleteAll: true,
      });
      expect(result.deletedCount).toBe(2);
    });

    it("should delete all records", async () => {
      const result = await adapter.delete("test-index", {
        deleteAll: true,
      });
      expect(result.deletedCount).toBe(2);
    });

    it("should return 0 when no delete criteria specified", async () => {
      const result = await adapter.delete("test-index", {});
      expect(result.deletedCount).toBe(0);
    });
  });

  describe("Statistics", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should get index statistics", async () => {
      mockDatabase.get
        .mockResolvedValueOnce({ count: 100 }) // vector count
        .mockResolvedValueOnce({ count: 3 }); // namespace count

      const stats = await adapter.getStats("test-index");
      expect(stats.vectorCount).toBe(100);
      expect(stats.namespaceCount).toBe(3);
    });

    it("should include vssEnabled in metrics", async () => {
      mockDatabase.get
        .mockResolvedValueOnce({ count: 50 })
        .mockResolvedValueOnce({ count: 2 });

      const stats = await adapter.getStats("test-index");
      expect(stats.metrics).toBeDefined();
      expect(stats.metrics!.vssEnabled).toBeDefined();
    });
  });

  describe("Health Check", () => {
    it("should return healthy status when connected", async () => {
      await adapter.connect();
      mockDatabase.all.mockResolvedValueOnce([{ name: "index1" }]);

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
      const result = await adapter.batchUpsert("test-index", manyRecords, {
        batchSize: 100,
      });
      expect(result.upsertedCount).toBe(250);
    });

    it("should batch delete large ID lists", async () => {
      const ids = manyRecords.map((r) => r.id);
      mockDatabase.get.mockResolvedValue({ count: 100 });

      const result = await adapter.batchDelete("test-index", ids, {
        batchSize: 100,
      });
      // 3 batches of 100, 100, 50
      expect(result.deletedCount).toBe(300); // 3 * 100 changes per batch
    });
  });

  describe("Filter Translation", () => {
    beforeEach(async () => {
      await adapter.connect();
      mockDatabase.all.mockResolvedValue([]);
    });

    it("should translate simple equality filter", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { category: "tech" },
      });

      expect(mockDatabase.all).toHaveBeenCalled();
    });

    it("should translate comparison operators", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { price: { $gte: 100, $lte: 500 } },
      });

      expect(mockDatabase.all).toHaveBeenCalled();
    });

    it("should translate logical $and operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $and: [{ category: "tech" }, { status: "active" }],
        },
      });

      expect(mockDatabase.all).toHaveBeenCalled();
    });

    it("should translate logical $or operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $or: [{ category: "tech" }, { category: "science" }],
        },
      });

      expect(mockDatabase.all).toHaveBeenCalled();
    });

    it("should translate $not operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $not: { category: "spam" },
        },
      });

      expect(mockDatabase.all).toHaveBeenCalled();
    });

    it("should translate $in operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          status: { $in: ["active", "pending"] },
        },
      });

      expect(mockDatabase.all).toHaveBeenCalled();
    });

    it("should translate $nin operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          status: { $nin: ["deleted", "archived"] },
        },
      });

      expect(mockDatabase.all).toHaveBeenCalled();
    });

    it("should translate string operators", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          title: { $contains: "vector" },
        },
      });

      expect(mockDatabase.all).toHaveBeenCalled();
    });

    it("should translate $startsWith operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          title: { $startsWith: "intro" },
        },
      });

      expect(mockDatabase.all).toHaveBeenCalled();
    });

    it("should translate $endsWith operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          title: { $endsWith: "tutorial" },
        },
      });

      expect(mockDatabase.all).toHaveBeenCalled();
    });

    it("should translate $exists operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          optional_field: { $exists: true },
        },
      });

      expect(mockDatabase.all).toHaveBeenCalled();
    });

    it("should translate $exists false operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          optional_field: { $exists: false },
        },
      });

      expect(mockDatabase.all).toHaveBeenCalled();
    });

    it("should translate $eq operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          status: { $eq: "active" },
        },
      });

      expect(mockDatabase.all).toHaveBeenCalled();
    });

    it("should translate $ne operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          status: { $ne: "deleted" },
        },
      });

      expect(mockDatabase.all).toHaveBeenCalled();
    });

    it("should translate $gt and $lt operators", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          count: { $gt: 10, $lt: 100 },
        },
      });

      expect(mockDatabase.all).toHaveBeenCalled();
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
      mockDatabase.exec.mockRejectedValueOnce(new Error("SQL error"));

      await expect(
        adapter.createIndex({ name: "test", dimension: 128 }),
      ).rejects.toThrow("Failed to create index");
    });

    it("should throw when deleting index fails", async () => {
      await adapter.connect();
      mockDatabase.exec.mockRejectedValueOnce(new Error("SQL error"));

      await expect(adapter.deleteIndex("test")).rejects.toThrow(
        "Failed to delete index",
      );
    });

    it("should throw when upsert fails", async () => {
      await adapter.connect();
      mockDatabase.run.mockRejectedValueOnce(new Error("Insert error"));

      await expect(
        adapter.upsert("test", [{ id: "1", vector: [0.1] }]),
      ).rejects.toThrow("Failed to upsert");
    });

    it("should throw when query fails", async () => {
      await adapter.connect();
      mockDatabase.all.mockRejectedValueOnce(new Error("Query error"));

      await expect(
        adapter.query("test", { vector: [0.1], topK: 10 }),
      ).rejects.toThrow("Failed to query");
    });

    it("should throw when delete fails", async () => {
      await adapter.connect();
      mockDatabase.get.mockRejectedValueOnce(new Error("Delete error"));

      await expect(
        adapter.delete("test", { ids: ["1"] }),
      ).rejects.toThrow("Failed to delete");
    });

    it("should throw when getting stats fails", async () => {
      await adapter.connect();
      mockDatabase.get.mockRejectedValueOnce(new Error("Stats error"));

      await expect(adapter.getStats("test")).rejects.toThrow(
        "Failed to get stats",
      );
    });

    it("should throw when disconnect fails", async () => {
      await adapter.connect();
      mockDatabase.close.mockRejectedValueOnce(new Error("Close error"));

      await expect(adapter.disconnect()).rejects.toThrow(
        "Failed to disconnect",
      );
    });
  });

  describe("Vector Parsing", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should parse JSON array format vectors", async () => {
      mockDatabase.all.mockResolvedValueOnce([
        {
          id: "vec-1",
          vector: "[0.1, 0.2, 0.3]",
          metadata: null,
          content: null,
          score: 0.95,
        },
      ]);

      const results = await adapter.query("test-index", {
        vector: [0.1, 0.2, 0.3],
        topK: 1,
        includeVectors: true,
      });

      expect(results.length).toBe(1);
      expect(results[0].vector).toEqual([0.1, 0.2, 0.3]);
    });

    it("should handle metadata parsing errors gracefully", async () => {
      mockDatabase.all.mockResolvedValueOnce([
        {
          id: "vec-1",
          vector: "[0.1, 0.2, 0.3]",
          metadata: "invalid-json",
          content: null,
          score: 0.95,
        },
      ]);

      const results = await adapter.query("test-index", {
        vector: [0.1, 0.2, 0.3],
        topK: 1,
        includeMetadata: true,
      });

      expect(results.length).toBe(1);
      expect(results[0].metadata).toBeUndefined();
    });
  });

  describe("Similarity Metrics", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should use cosine similarity by default", async () => {
      mockDatabase.all.mockResolvedValueOnce([
        {
          id: "vec-1",
          vector: "[1, 0]",
          metadata: null,
          content: null,
          score: 1.0,
        },
      ]);

      const results = await adapter.query("test-index", {
        vector: [1, 0],
        topK: 1,
      });

      expect(results.length).toBe(1);
    });

    it("should support euclidean metric queries", async () => {
      // Create index with euclidean metric
      await adapter.createIndex({
        name: "euclidean-index",
        dimension: 3,
        metric: "euclidean",
      });

      mockDatabase.all.mockResolvedValueOnce([
        {
          id: "vec-1",
          vector: "[0.1, 0.2, 0.3]",
          metadata: null,
          content: null,
          score: 0.9,
        },
      ]);

      const results = await adapter.query("euclidean-index", {
        vector: [0.1, 0.2, 0.3],
        topK: 1,
      });

      expect(results.length).toBe(1);
    });

    it("should support dotProduct metric queries", async () => {
      // Create index with dotProduct metric
      await adapter.createIndex({
        name: "dot-index",
        dimension: 3,
        metric: "dotProduct",
      });

      mockDatabase.all.mockResolvedValueOnce([
        {
          id: "vec-1",
          vector: "[0.1, 0.2, 0.3]",
          metadata: null,
          content: null,
          score: 0.14,
        },
      ]);

      const results = await adapter.query("dot-index", {
        vector: [0.1, 0.2, 0.3],
        topK: 1,
      });

      expect(results.length).toBe(1);
    });
  });

  describe("Table Name Sanitization", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should sanitize table names with special characters", async () => {
      await adapter.createIndex({
        name: "test-index-with-dashes",
        dimension: 128,
      });

      // Should create table with sanitized name (dashes replaced with underscores)
      expect(mockDatabase.exec).toHaveBeenCalledWith(
        expect.stringContaining("test_index_with_dashes"),
      );
    });

    it("should handle table names with spaces", async () => {
      await adapter.createIndex({
        name: "test index with spaces",
        dimension: 128,
      });

      // Should create table with sanitized name (spaces replaced with underscores)
      expect(mockDatabase.exec).toHaveBeenCalledWith(
        expect.stringContaining("test_index_with_spaces"),
      );
    });
  });
});

describe("DuckDBAdapter Integration", () => {
  // These tests require duckdb-async to be installed
  // Skip if not available

  it.skip("should work with real DuckDB database", async () => {
    // This test would use a real in-memory DuckDB database
    // Requires duckdb-async to be installed
  });

  it.skip("should persist data to file", async () => {
    // This test would verify file-based persistence
    // Requires duckdb-async to be installed
  });
});
