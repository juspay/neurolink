/**
 * LibSQL/Turso Adapter Tests
 * Comprehensive test suite for the LibSQL vector store adapter
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { LibSQLAdapter, type LibSQLConfig } from "../../../src/lib/vector/adapters/LibSQLAdapter.js";
import type { VectorRecord, VectorQueryOptions } from "../../../src/lib/vector/types.js";

// Mock @libsql/client
const mockClient = {
  execute: vi.fn(),
  batch: vi.fn(),
  sync: vi.fn(),
  close: vi.fn(),
};

vi.mock("@libsql/client", () => ({
  createClient: vi.fn(() => mockClient),
}));

describe("LibSQLAdapter", () => {
  let adapter: LibSQLAdapter;

  const localConfig: LibSQLConfig = {
    mode: "local",
    databasePath: "./test.db",
  };

  const remoteConfig: LibSQLConfig = {
    mode: "remote",
    url: "libsql://test-db.turso.io",
    authToken: "test-token",
  };

  const replicaConfig: LibSQLConfig = {
    mode: "replica",
    databasePath: "./replica.db",
    url: "libsql://test-db.turso.io",
    authToken: "test-token",
    syncInterval: 30000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.execute.mockResolvedValue({ columns: [], rows: [], rowsAffected: 0 });
    mockClient.batch.mockResolvedValue([]);
    mockClient.sync.mockResolvedValue(undefined);
    adapter = new LibSQLAdapter(localConfig);
  });

  afterEach(async () => {
    if (adapter.isInitialized()) {
      await adapter.disconnect();
    }
  });

  describe("Constructor and Configuration", () => {
    it("should create adapter with local configuration", () => {
      expect(adapter).toBeInstanceOf(LibSQLAdapter);
      expect(adapter.getStoreName()).toBe("libsql");
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should create adapter with remote configuration", () => {
      const remoteAdapter = new LibSQLAdapter(remoteConfig);
      expect(remoteAdapter).toBeInstanceOf(LibSQLAdapter);
      expect(remoteAdapter.getConfig()).toEqual(remoteConfig);
    });

    it("should create adapter with replica configuration", () => {
      const replicaAdapter = new LibSQLAdapter(replicaConfig);
      expect(replicaAdapter).toBeInstanceOf(LibSQLAdapter);
      expect(replicaAdapter.getConfig()).toEqual(replicaConfig);
    });

    it("should throw error for local mode without databasePath", () => {
      expect(() => {
        new LibSQLAdapter({ mode: "local" } as LibSQLConfig);
      }).toThrow("LibSQL local mode requires databasePath");
    });

    it("should throw error for remote mode without url", () => {
      expect(() => {
        new LibSQLAdapter({ mode: "remote", authToken: "token" } as LibSQLConfig);
      }).toThrow("LibSQL remote mode requires url");
    });

    it("should throw error for remote mode without authToken", () => {
      expect(() => {
        new LibSQLAdapter({ mode: "remote", url: "libsql://test.turso.io" } as LibSQLConfig);
      }).toThrow("LibSQL remote mode requires authToken");
    });

    it("should throw error for replica mode without databasePath", () => {
      expect(() => {
        new LibSQLAdapter({
          mode: "replica",
          url: "libsql://test.turso.io",
          authToken: "token",
        } as LibSQLConfig);
      }).toThrow("LibSQL replica mode requires databasePath");
    });

    it("should throw error for replica mode without url", () => {
      expect(() => {
        new LibSQLAdapter({
          mode: "replica",
          databasePath: "./test.db",
          authToken: "token",
        } as LibSQLConfig);
      }).toThrow("LibSQL replica mode requires url");
    });

    it("should throw error for replica mode without authToken", () => {
      expect(() => {
        new LibSQLAdapter({
          mode: "replica",
          databasePath: "./test.db",
          url: "libsql://test.turso.io",
        } as LibSQLConfig);
      }).toThrow("LibSQL replica mode requires authToken");
    });

    it("should throw error for invalid mode", () => {
      expect(() => {
        new LibSQLAdapter({ mode: "invalid" as "local" } as LibSQLConfig);
      }).toThrow("Invalid LibSQL mode");
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
      expect(mockClient.close).toHaveBeenCalled();
    });

    it("should handle disconnect when not connected", async () => {
      // Should not throw
      await adapter.disconnect();
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should sync before disconnect in replica mode", async () => {
      const replicaAdapter = new LibSQLAdapter(replicaConfig);
      await replicaAdapter.connect();
      await replicaAdapter.disconnect();
      expect(mockClient.sync).toHaveBeenCalled();
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

      expect(mockClient.execute).toHaveBeenCalled();
      // Check that table creation SQL was called
      const calls = mockClient.execute.mock.calls;
      const createTableCall = calls.find(
        (call) => typeof call[0] === "string" && call[0].includes("CREATE TABLE"),
      );
      expect(createTableCall).toBeDefined();
    });

    it("should create index with default metric", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 768,
      });

      // Should default to cosine
      const calls = mockClient.execute.mock.calls;
      const insertCall = calls.find(
        (call) =>
          typeof call[0] === "object" &&
          call[0].sql?.includes("INSERT OR REPLACE INTO _vector_indexes"),
      );
      expect(insertCall).toBeDefined();
      if (insertCall && typeof insertCall[0] === "object") {
        expect(insertCall[0].args).toContain("cosine");
      }
    });

    it("should delete an index", async () => {
      await adapter.deleteIndex("test-index");

      const calls = mockClient.execute.mock.calls;
      const dropCall = calls.find(
        (call) => typeof call[0] === "string" && call[0].includes("DROP TABLE"),
      );
      expect(dropCall).toBeDefined();
    });

    it("should list indexes", async () => {
      mockClient.execute.mockResolvedValueOnce({
        columns: ["name"],
        rows: [["index1"], ["index2"]],
        rowsAffected: 0,
      });

      const indexes = await adapter.listIndexes();
      expect(indexes).toEqual(["index1", "index2"]);
    });

    it("should check if index exists", async () => {
      mockClient.execute.mockResolvedValueOnce({
        columns: ["1"],
        rows: [[1]],
        rowsAffected: 0,
      });

      const exists = await adapter.indexExists("test-index");
      expect(exists).toBe(true);

      mockClient.execute.mockResolvedValueOnce({
        columns: [],
        rows: [],
        rowsAffected: 0,
      });

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
      expect(mockClient.batch).toHaveBeenCalled();
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

      await expect(adapter.upsert("test-index", invalidRecords)).rejects.toThrow(
        "Inconsistent vector dimensions",
      );
    });

    it("should handle empty records array", async () => {
      const result = await adapter.upsert("test-index", []);
      expect(result.upsertedCount).toBe(0);
    });
  });

  describe("Query Operations", () => {
    const queryVector = [0.1, 0.2, 0.3];

    beforeEach(async () => {
      await adapter.connect();
      // Setup mock for query results
      mockClient.execute.mockResolvedValue({
        columns: ["id", "content", "distance", "metadata"],
        rows: [
          ["vec-1", "Test content", 0.1, JSON.stringify({ category: "tech" })],
        ],
        rowsAffected: 0,
      });
    });

    it("should query vectors", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
      };

      const results = await adapter.query("test-index", options);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
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
      mockClient.execute.mockResolvedValueOnce({
        columns: ["id", "content", "distance", "vector_data"],
        rows: [["vec-1", "Test content", 0.1, JSON.stringify([0.1, 0.2, 0.3])]],
        rowsAffected: 0,
      });

      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        includeVectors: true,
      };

      const results = await adapter.query("test-index", options);
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
      if (results.length > 0) {
        expect(results[0].metadata).toBeDefined();
      }
    });

    it("should convert distance to score correctly", async () => {
      mockClient.execute.mockResolvedValueOnce({
        columns: ["id", "content", "distance"],
        rows: [["vec-1", "Test content", 0.1]],
        rowsAffected: 0,
      });

      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
      });

      // For cosine, score = 1 - distance
      expect(results[0].score).toBeCloseTo(0.9, 5);
    });
  });

  describe("Delete Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
      mockClient.execute.mockResolvedValue({
        columns: [],
        rows: [],
        rowsAffected: 2,
      });
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

    it("should return 0 when no delete options provided", async () => {
      const result = await adapter.delete("test-index", {});
      expect(result.deletedCount).toBe(0);
    });
  });

  describe("Statistics", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should get index statistics", async () => {
      mockClient.execute
        .mockResolvedValueOnce({
          columns: ["count"],
          rows: [[100]],
          rowsAffected: 0,
        })
        .mockResolvedValueOnce({
          columns: ["count"],
          rows: [[3]],
          rowsAffected: 0,
        });

      const stats = await adapter.getStats("test-index");
      expect(stats.vectorCount).toBe(100);
      expect(stats.namespaceCount).toBe(3);
    });
  });

  describe("Health Check", () => {
    it("should return healthy status when connected", async () => {
      await adapter.connect();
      mockClient.execute.mockResolvedValueOnce({
        columns: ["name"],
        rows: [["index1"]],
        rowsAffected: 0,
      });

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
      mockClient.execute.mockResolvedValue({
        columns: [],
        rows: [],
        rowsAffected: 100,
      });

      const result = await adapter.batchDelete("test-index", ids, {
        batchSize: 100,
      });
      // 3 batches of 100, 100, 50
      expect(result.deletedCount).toBe(300); // 3 * 100 changes per batch
    });
  });

  describe("Sync Operations", () => {
    it("should sync in replica mode", async () => {
      const replicaAdapter = new LibSQLAdapter(replicaConfig);
      await replicaAdapter.connect();

      await replicaAdapter.sync();
      expect(mockClient.sync).toHaveBeenCalled();

      await replicaAdapter.disconnect();
    });

    it("should not fail sync in local mode", async () => {
      await adapter.connect();
      // Should not throw, just log debug message
      await adapter.sync();
    });
  });

  describe("Filter Translation", () => {
    beforeEach(async () => {
      await adapter.connect();
      mockClient.execute.mockResolvedValue({
        columns: ["id", "content", "distance"],
        rows: [],
        rowsAffected: 0,
      });
    });

    it("should translate simple equality filter", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { category: "tech" },
      });

      expect(mockClient.execute).toHaveBeenCalled();
    });

    it("should translate comparison operators", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { price: { $gte: 100, $lte: 500 } },
      });

      expect(mockClient.execute).toHaveBeenCalled();
    });

    it("should translate logical $and operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $and: [{ category: "tech" }, { status: "active" }],
        },
      });

      expect(mockClient.execute).toHaveBeenCalled();
    });

    it("should translate logical $or operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $or: [{ category: "tech" }, { category: "science" }],
        },
      });

      expect(mockClient.execute).toHaveBeenCalled();
    });

    it("should translate $not operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $not: { category: "spam" },
        },
      });

      expect(mockClient.execute).toHaveBeenCalled();
    });

    it("should translate $in operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          status: { $in: ["active", "pending"] },
        },
      });

      expect(mockClient.execute).toHaveBeenCalled();
    });

    it("should translate string operators", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          title: { $contains: "vector" },
        },
      });

      expect(mockClient.execute).toHaveBeenCalled();
    });

    it("should translate $exists operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          optional_field: { $exists: true },
        },
      });

      expect(mockClient.execute).toHaveBeenCalled();
    });

    it("should translate $startsWith operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          name: { $startsWith: "test" },
        },
      });

      expect(mockClient.execute).toHaveBeenCalled();
    });

    it("should translate $endsWith operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          name: { $endsWith: ".txt" },
        },
      });

      expect(mockClient.execute).toHaveBeenCalled();
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
      mockClient.execute.mockRejectedValueOnce(new Error("SQL error"));

      await expect(
        adapter.createIndex({ name: "test", dimension: 128 }),
      ).rejects.toThrow("Failed to create index");
    });

    it("should throw when deleting index fails", async () => {
      await adapter.connect();
      mockClient.execute.mockRejectedValueOnce(new Error("SQL error"));

      await expect(adapter.deleteIndex("test")).rejects.toThrow(
        "Failed to delete index",
      );
    });

    it("should throw when upsert fails", async () => {
      await adapter.connect();
      mockClient.batch.mockRejectedValueOnce(new Error("Insert error"));

      await expect(
        adapter.upsert("test", [{ id: "1", vector: [0.1] }]),
      ).rejects.toThrow("Failed to upsert");
    });

    it("should throw when query fails", async () => {
      await adapter.connect();
      mockClient.execute.mockRejectedValueOnce(new Error("Query error"));

      await expect(
        adapter.query("test", { vector: [0.1], topK: 10 }),
      ).rejects.toThrow("Failed to query");
    });

    it("should throw when delete fails", async () => {
      await adapter.connect();
      mockClient.execute.mockRejectedValueOnce(new Error("Delete error"));

      await expect(adapter.delete("test", { ids: ["1"] })).rejects.toThrow(
        "Failed to delete",
      );
    });

    it("should throw when getting stats fails", async () => {
      await adapter.connect();
      mockClient.execute.mockRejectedValueOnce(new Error("Stats error"));

      await expect(adapter.getStats("test")).rejects.toThrow(
        "Failed to get stats",
      );
    });
  });

  describe("Similarity Metrics", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should use cosine distance function by default", async () => {
      mockClient.execute.mockResolvedValueOnce({
        columns: ["id", "content", "distance"],
        rows: [["vec-1", "Test", 0]],
        rowsAffected: 0,
      });

      await adapter.query("test-index", {
        vector: [1, 0],
        topK: 1,
      });

      const call = mockClient.execute.mock.calls.find(
        (c) =>
          typeof c[0] === "object" &&
          c[0].sql?.includes("vector_distance_cos"),
      );
      expect(call).toBeDefined();
    });

    it("should calculate cosine similarity correctly", async () => {
      // Distance of 0 should give score of 1
      mockClient.execute.mockResolvedValueOnce({
        columns: ["id", "content", "distance"],
        rows: [["vec-1", "Test", 0]],
        rowsAffected: 0,
      });

      const results = await adapter.query("test-index", {
        vector: [1, 0],
        topK: 1,
      });

      expect(results.length).toBe(1);
      expect(results[0].score).toBeCloseTo(1, 5);
    });

    it("should handle large distance correctly", async () => {
      // Distance of 2 (max for cosine) should give score of -1
      mockClient.execute.mockResolvedValueOnce({
        columns: ["id", "content", "distance"],
        rows: [["vec-1", "Test", 2]],
        rowsAffected: 0,
      });

      const results = await adapter.query("test-index", {
        vector: [1, 0],
        topK: 1,
      });

      expect(results.length).toBe(1);
      expect(results[0].score).toBeCloseTo(-1, 5);
    });
  });

  describe("Configuration Modes", () => {
    it("should configure local mode correctly", async () => {
      const localAdapter = new LibSQLAdapter({
        mode: "local",
        databasePath: "/path/to/db.sqlite",
        encryptionKey: "secret",
      });
      expect(localAdapter.getConfig().mode).toBe("local");
      expect(localAdapter.getConfig().encryptionKey).toBe("secret");
    });

    it("should configure remote mode correctly", async () => {
      const remoteAdapter = new LibSQLAdapter({
        mode: "remote",
        url: "libsql://mydb.turso.io",
        authToken: "my-token",
        timeout: 30000,
      });
      expect(remoteAdapter.getConfig().mode).toBe("remote");
      expect(remoteAdapter.getConfig().url).toBe("libsql://mydb.turso.io");
    });

    it("should configure replica mode correctly", async () => {
      const replicaAdapter = new LibSQLAdapter({
        mode: "replica",
        databasePath: "./local.db",
        url: "libsql://mydb.turso.io",
        authToken: "my-token",
        syncInterval: 15000,
      });
      expect(replicaAdapter.getConfig().mode).toBe("replica");
      expect(replicaAdapter.getConfig().syncInterval).toBe(15000);
    });
  });
});

describe("LibSQLAdapter Integration", () => {
  // These tests require @libsql/client to be installed
  // Skip if not available

  it.skip("should work with real LibSQL local database", async () => {
    // This test would use a real in-memory LibSQL database
    // Requires @libsql/client to be installed
  });

  it.skip("should work with Turso cloud database", async () => {
    // This test would connect to an actual Turso instance
    // Requires TURSO_URL and TURSO_AUTH_TOKEN environment variables
  });

  it.skip("should work with embedded replica mode", async () => {
    // This test would test the sync functionality
    // Requires both local file and Turso connection
  });
});
