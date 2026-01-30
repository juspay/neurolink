/**
 * SQLite-VSS Adapter Tests
 * Comprehensive test suite for the SQLite-VSS vector store adapter
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SQLiteVSSAdapter } from "../../../src/lib/vector/adapters/SQLiteVSSAdapter.js";
import type {
  VectorRecord,
  VectorQueryOptions,
  SQLiteVSSConfig,
} from "../../../src/lib/vector/types.js";

// Mock better-sqlite3
const mockDatabase = {
  exec: vi.fn(),
  prepare: vi.fn(),
  close: vi.fn(),
  pragma: vi.fn(),
};

const mockStatement = {
  run: vi.fn(() => ({ changes: 1, lastInsertRowid: 1 })),
  get: vi.fn(),
  all: vi.fn(() => []),
  finalize: vi.fn(),
};

vi.mock("better-sqlite3", () => ({
  default: vi.fn(() => mockDatabase),
}));

describe("SQLiteVSSAdapter", () => {
  let adapter: SQLiteVSSAdapter;
  const defaultConfig: SQLiteVSSConfig = {
    databasePath: ":memory:",
    inMemory: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDatabase.prepare.mockReturnValue(mockStatement);
    mockStatement.all.mockReturnValue([]);
    mockStatement.get.mockReturnValue(undefined);
    adapter = new SQLiteVSSAdapter(defaultConfig);
  });

  afterEach(async () => {
    if (adapter.isInitialized()) {
      await adapter.disconnect();
    }
  });

  describe("Constructor and Configuration", () => {
    it("should create adapter with configuration", () => {
      expect(adapter).toBeInstanceOf(SQLiteVSSAdapter);
      expect(adapter.getStoreName()).toBe("sqlite-vss");
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should accept custom configuration options", () => {
      const customConfig: SQLiteVSSConfig = {
        databasePath: "/path/to/db.sqlite",
        inMemory: false,
        connectionTimeout: 10000,
        walMode: true,
        foreignKeys: true,
        busyTimeout: 3000,
      };
      const customAdapter = new SQLiteVSSAdapter(customConfig);
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
      expect(mockStatement.run).toHaveBeenCalledWith(
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
      expect(mockStatement.run).toHaveBeenCalledWith(
        "test-index",
        768,
        "cosine",
      );
    });

    it("should delete an index", async () => {
      await adapter.deleteIndex("test-index");
      expect(mockDatabase.exec).toHaveBeenCalled();
    });

    it("should list indexes", async () => {
      mockStatement.all.mockReturnValueOnce([
        { name: "index1" },
        { name: "index2" },
      ]);

      const indexes = await adapter.listIndexes();
      expect(indexes).toEqual(["index1", "index2"]);
    });

    it("should check if index exists", async () => {
      mockStatement.get.mockReturnValueOnce({ 1: 1 });
      const exists = await adapter.indexExists("test-index");
      expect(exists).toBe(true);

      mockStatement.get.mockReturnValueOnce(undefined);
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
  });

  describe("Query Operations", () => {
    const queryVector = [0.1, 0.2, 0.3];
    const mockRows = [
      {
        id: "vec-1",
        vector: Buffer.from(new Float32Array([0.1, 0.2, 0.3]).buffer),
        metadata: JSON.stringify({ category: "tech" }),
        content: "Test content",
      },
    ];

    beforeEach(async () => {
      await adapter.connect();
      mockStatement.all.mockReturnValue(mockRows);
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
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        includeVectors: true,
      };

      const results = await adapter.query("test-index", options);
      // Results should include vector data
      expect(Array.isArray(results)).toBe(true);
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
  });

  describe("Delete Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
      mockStatement.run.mockReturnValue({ changes: 2, lastInsertRowid: 0 });
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
  });

  describe("Statistics", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should get index statistics", async () => {
      mockStatement.get
        .mockReturnValueOnce({ count: 100 }) // vector count
        .mockReturnValueOnce({ count: 3 }); // namespace count

      const stats = await adapter.getStats("test-index");
      expect(stats.vectorCount).toBe(100);
      expect(stats.namespaceCount).toBe(3);
    });
  });

  describe("Health Check", () => {
    it("should return healthy status when connected", async () => {
      await adapter.connect();
      mockStatement.all.mockReturnValueOnce([{ name: "index1" }]);

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
      mockStatement.run.mockReturnValue({ changes: 100, lastInsertRowid: 0 });

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
      mockStatement.all.mockReturnValue([]);
    });

    it("should translate simple equality filter", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { category: "tech" },
      });

      // Check that the filter was applied
      expect(mockStatement.all).toHaveBeenCalled();
    });

    it("should translate comparison operators", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { price: { $gte: 100, $lte: 500 } },
      });

      expect(mockStatement.all).toHaveBeenCalled();
    });

    it("should translate logical $and operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $and: [{ category: "tech" }, { status: "active" }],
        },
      });

      expect(mockStatement.all).toHaveBeenCalled();
    });

    it("should translate logical $or operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $or: [{ category: "tech" }, { category: "science" }],
        },
      });

      expect(mockStatement.all).toHaveBeenCalled();
    });

    it("should translate $not operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $not: { category: "spam" },
        },
      });

      expect(mockStatement.all).toHaveBeenCalled();
    });

    it("should translate $in operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          status: { $in: ["active", "pending"] },
        },
      });

      expect(mockStatement.all).toHaveBeenCalled();
    });

    it("should translate string operators", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          title: { $contains: "vector" },
        },
      });

      expect(mockStatement.all).toHaveBeenCalled();
    });

    it("should translate $exists operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          optional_field: { $exists: true },
        },
      });

      expect(mockStatement.all).toHaveBeenCalled();
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
      mockDatabase.exec.mockImplementationOnce(() => {
        throw new Error("SQL error");
      });

      await expect(
        adapter.createIndex({ name: "test", dimension: 128 }),
      ).rejects.toThrow("Failed to create index");
    });

    it("should throw when deleting index fails", async () => {
      await adapter.connect();
      // The deleteIndex tries to drop VSS table first (in try-catch), then main table
      // We need to make the main table drop fail
      mockDatabase.exec
        .mockImplementationOnce(() => {}) // VSS table drop succeeds
        .mockImplementationOnce(() => {
          throw new Error("SQL error");
        }); // Main table drop fails

      await expect(adapter.deleteIndex("test")).rejects.toThrow(
        "Failed to delete index",
      );
    });

    it("should throw when upsert fails", async () => {
      await adapter.connect();
      mockStatement.run.mockImplementationOnce(() => {
        throw new Error("Insert error");
      });

      await expect(
        adapter.upsert("test", [{ id: "1", vector: [0.1] }]),
      ).rejects.toThrow("Failed to upsert");
    });

    it("should throw when query fails", async () => {
      await adapter.connect();
      mockStatement.all.mockImplementationOnce(() => {
        throw new Error("Query error");
      });

      await expect(
        adapter.query("test", { vector: [0.1], topK: 10 }),
      ).rejects.toThrow("Failed to query");
    });

    it("should throw when delete fails", async () => {
      await adapter.connect();
      mockStatement.run.mockImplementationOnce(() => {
        throw new Error("Delete error");
      });

      await expect(
        adapter.delete("test", { ids: ["1"] }),
      ).rejects.toThrow("Failed to delete");
    });

    it("should throw when getting stats fails", async () => {
      await adapter.connect();
      mockStatement.get.mockImplementationOnce(() => {
        throw new Error("Stats error");
      });

      await expect(adapter.getStats("test")).rejects.toThrow(
        "Failed to get stats",
      );
    });
  });

  describe("Similarity Metrics", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should calculate cosine similarity correctly", async () => {
      // Vectors [1, 0] and [1, 0] should have similarity 1
      mockStatement.all.mockReturnValueOnce([
        {
          id: "vec-1",
          vector: Buffer.from(new Float32Array([1, 0]).buffer),
          metadata: null,
          content: null,
        },
      ]);

      const results = await adapter.query("test-index", {
        vector: [1, 0],
        topK: 1,
      });

      expect(results.length).toBe(1);
      expect(results[0].score).toBeCloseTo(1, 5);
    });

    it("should handle orthogonal vectors", async () => {
      // Vectors [1, 0] and [0, 1] should have similarity 0
      mockStatement.all.mockReturnValueOnce([
        {
          id: "vec-1",
          vector: Buffer.from(new Float32Array([0, 1]).buffer),
          metadata: null,
          content: null,
        },
      ]);

      const results = await adapter.query("test-index", {
        vector: [1, 0],
        topK: 1,
      });

      expect(results.length).toBe(1);
      expect(results[0].score).toBeCloseTo(0, 5);
    });
  });
});

describe("SQLiteVSSAdapter Integration", () => {
  // These tests require better-sqlite3 to be installed
  // Skip if not available

  it.skip("should work with real SQLite database", async () => {
    // This test would use a real in-memory SQLite database
    // Requires better-sqlite3 to be installed
  });
});
