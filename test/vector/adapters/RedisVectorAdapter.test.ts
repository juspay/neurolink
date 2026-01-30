/**
 * Redis Vector Store Adapter Tests
 * Comprehensive test suite for the Redis vector store adapter with RediSearch
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  RedisVectorAdapter,
  type RedisVectorConfig,
} from "../../../src/lib/vector/adapters/RedisVectorAdapter.js";
import type {
  VectorRecord,
  VectorQueryOptions,
} from "../../../src/lib/vector/types.js";

// Mock Redis client
const mockRedisClient = {
  connect: vi.fn().mockResolvedValue(undefined),
  quit: vi.fn().mockResolvedValue("OK"),
  ping: vi.fn().mockResolvedValue("PONG"),
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue("OK"),
  del: vi.fn().mockResolvedValue(1),
  keys: vi.fn().mockResolvedValue([]),
  hSet: vi.fn().mockResolvedValue(1),
  hGet: vi.fn().mockResolvedValue(null),
  hGetAll: vi.fn().mockResolvedValue({}),
  hDel: vi.fn().mockResolvedValue(1),
  sendCommand: vi.fn().mockResolvedValue([]),
  isOpen: true,
};

vi.mock("redis", () => ({
  createClient: vi.fn(() => mockRedisClient),
}));

describe("RedisVectorAdapter", () => {
  let adapter: RedisVectorAdapter;
  const defaultConfig: RedisVectorConfig = {
    host: "localhost",
    port: 6379,
    keyPrefix: "test:vector:",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default mock implementations
    mockRedisClient.sendCommand.mockResolvedValue([]);
    mockRedisClient.hGetAll.mockResolvedValue({});
    adapter = new RedisVectorAdapter(defaultConfig);
  });

  afterEach(async () => {
    if (adapter.isInitialized()) {
      await adapter.disconnect();
    }
  });

  describe("Constructor and Configuration", () => {
    it("should create adapter with configuration", () => {
      expect(adapter).toBeInstanceOf(RedisVectorAdapter);
      expect(adapter.getStoreName()).toBe("redis");
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should accept custom configuration options", () => {
      const customConfig: RedisVectorConfig = {
        url: "redis://user:password@localhost:6379/1",
        keyPrefix: "custom:prefix:",
        connectionTimeout: 15000,
        commandTimeout: 10000,
        tls: true,
        tlsOptions: {
          rejectUnauthorized: true,
        },
      };
      const customAdapter = new RedisVectorAdapter(customConfig);
      expect(customAdapter.getConfig()).toEqual(customConfig);
    });

    it("should use default key prefix when not specified", () => {
      const configWithoutPrefix: RedisVectorConfig = {
        host: "localhost",
        port: 6379,
      };
      const adapterWithDefault = new RedisVectorAdapter(configWithoutPrefix);
      expect(adapterWithDefault.getConfig().keyPrefix).toBeUndefined();
    });
  });

  describe("Connection Management", () => {
    it("should connect successfully", async () => {
      await adapter.connect();
      expect(adapter.isInitialized()).toBe(true);
      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(mockRedisClient.ping).toHaveBeenCalled();
    });

    it("should not reconnect if already connected", async () => {
      await adapter.connect();
      await adapter.connect(); // Second call should be a no-op
      expect(adapter.isInitialized()).toBe(true);
      expect(mockRedisClient.connect).toHaveBeenCalledTimes(1);
    });

    it("should disconnect successfully", async () => {
      await adapter.connect();
      await adapter.disconnect();
      expect(adapter.isInitialized()).toBe(false);
      expect(mockRedisClient.quit).toHaveBeenCalled();
    });

    it("should handle disconnect when not connected", async () => {
      // Should not throw
      await adapter.disconnect();
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should verify RediSearch module is loaded", async () => {
      mockRedisClient.sendCommand.mockResolvedValueOnce([]); // FT._LIST
      await adapter.connect();
      expect(mockRedisClient.sendCommand).toHaveBeenCalledWith(["FT._LIST"]);
    });

    it("should throw if RediSearch module not available", async () => {
      mockRedisClient.sendCommand.mockRejectedValueOnce(
        new Error("ERR unknown command `FT._LIST`"),
      );

      await expect(adapter.connect()).rejects.toThrow(
        "RediSearch module not loaded",
      );
    });
  });

  describe("Index Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should create an HNSW index", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 1536,
        metric: "cosine",
        config: {
          algorithm: "HNSW",
          hnsw: {
            M: 16,
            efConstruction: 200,
          },
        },
      });

      expect(mockRedisClient.sendCommand).toHaveBeenCalledWith(
        expect.arrayContaining([
          "FT.CREATE",
          expect.stringContaining("test-index"),
          expect.anything(),
        ]),
      );
    });

    it("should create a FLAT index", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 768,
        metric: "euclidean",
        config: {
          algorithm: "FLAT",
          flat: {
            initialCapacity: 10000,
          },
        },
      });

      expect(mockRedisClient.sendCommand).toHaveBeenCalled();
    });

    it("should create index with default metric (cosine)", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 768,
      });

      expect(mockRedisClient.sendCommand).toHaveBeenCalled();
      expect(mockRedisClient.hSet).toHaveBeenCalled();
    });

    it("should handle index already exists error gracefully", async () => {
      mockRedisClient.sendCommand.mockRejectedValueOnce(
        new Error("Index already exists"),
      );

      // Should not throw
      await adapter.createIndex({
        name: "existing-index",
        dimension: 1536,
      });
    });

    it("should delete an index", async () => {
      await adapter.deleteIndex("test-index");

      expect(mockRedisClient.sendCommand).toHaveBeenCalledWith(
        expect.arrayContaining(["FT.DROPINDEX", expect.anything(), "DD"]),
      );
    });

    it("should handle delete of non-existent index gracefully", async () => {
      mockRedisClient.sendCommand.mockRejectedValueOnce(
        new Error("Unknown Index name"),
      );

      // Should not throw
      await adapter.deleteIndex("nonexistent");
    });

    it("should list indexes", async () => {
      mockRedisClient.sendCommand.mockResolvedValueOnce([
        "test:vector:idx:index1",
        "test:vector:idx:index2",
        "other:prefix:idx:foreign",
      ]);

      const indexes = await adapter.listIndexes();
      expect(indexes).toContain("index1");
      expect(indexes).toContain("index2");
      expect(indexes).not.toContain("foreign");
    });

    it("should check if index exists", async () => {
      mockRedisClient.sendCommand.mockResolvedValueOnce(["some", "info"]);
      const exists = await adapter.indexExists("test-index");
      expect(exists).toBe(true);

      mockRedisClient.sendCommand.mockRejectedValueOnce(
        new Error("Unknown Index name"),
      );
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
      expect(mockRedisClient.hSet).toHaveBeenCalledTimes(2);
    });

    it("should upsert with namespace", async () => {
      const result = await adapter.upsert("test-index", testRecords, {
        namespace: "ns1",
      });
      expect(result.upsertedCount).toBe(2);
    });

    it("should validate vector dimensions against index metadata", async () => {
      // First create an index to populate metadata cache
      mockRedisClient.sendCommand.mockResolvedValueOnce([]); // FT.CREATE
      await adapter.createIndex({
        name: "test-index",
        dimension: 3,
      });

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

    it("should convert vector to FLOAT32 buffer correctly", async () => {
      await adapter.upsert("test-index", [
        { id: "test", vector: [1.0, 2.0, 3.0] },
      ]);

      expect(mockRedisClient.hSet).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          id: "test",
          vector: expect.any(Buffer),
        }),
      );
    });
  });

  describe("Query Operations", () => {
    const queryVector = [0.1, 0.2, 0.3];

    beforeEach(async () => {
      await adapter.connect();
    });

    it("should query vectors with KNN", async () => {
      // Mock FT.SEARCH response: [totalCount, key1, [field1, value1, ...], ...]
      mockRedisClient.sendCommand.mockResolvedValueOnce([
        1,
        "test:vector:doc:test-index:vec-1",
        ["id", "vec-1", "score", "0.1", "content", "Test content"],
      ]);

      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
      };

      const results = await adapter.query("test-index", options);
      expect(Array.isArray(results)).toBe(true);
      expect(mockRedisClient.sendCommand).toHaveBeenCalledWith(
        expect.arrayContaining(["FT.SEARCH"]),
      );
    });

    it("should query with metadata filter", async () => {
      mockRedisClient.sendCommand.mockResolvedValueOnce([0]);

      const options: VectorQueryOptions<{ category: string }> = {
        vector: queryVector,
        topK: 10,
        filter: { category: "tech" },
      };

      await adapter.query("test-index", options);
      expect(mockRedisClient.sendCommand).toHaveBeenCalled();
    });

    it("should query with namespace filter", async () => {
      mockRedisClient.sendCommand.mockResolvedValueOnce([0]);

      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        namespace: "ns1",
      };

      await adapter.query("test-index", options);
      expect(mockRedisClient.sendCommand).toHaveBeenCalled();
    });

    it("should apply minimum score filter", async () => {
      mockRedisClient.sendCommand.mockResolvedValueOnce([
        2,
        "key1",
        ["id", "id1", "score", "0.1"],
        "key2",
        ["id", "id2", "score", "0.9"],
      ]);

      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        minScore: 0.5,
      };

      const results = await adapter.query("test-index", options);
      // Only result with score > 0.5 should be returned (1 - 0.1 = 0.9 > 0.5)
      // The one with distance 0.9 has similarity 0.1 which is < 0.5
      expect(results.every((r) => r.score >= 0.5)).toBe(true);
    });

    it("should include vectors when requested", async () => {
      const vectorBuffer = Buffer.alloc(12);
      vectorBuffer.writeFloatLE(0.1, 0);
      vectorBuffer.writeFloatLE(0.2, 4);
      vectorBuffer.writeFloatLE(0.3, 8);

      mockRedisClient.sendCommand.mockResolvedValueOnce([
        1,
        "key1",
        ["id", "id1", "score", "0.1", "vector", vectorBuffer.toString("binary")],
      ]);

      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        includeVectors: true,
      };

      const results = await adapter.query("test-index", options);
      expect(results[0].vector).toBeDefined();
    });

    it("should include metadata when requested", async () => {
      mockRedisClient.sendCommand.mockResolvedValueOnce([
        1,
        "key1",
        [
          "id",
          "id1",
          "score",
          "0.1",
          "metadata",
          JSON.stringify({ category: "tech" }),
        ],
      ]);

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
      mockRedisClient.del.mockResolvedValueOnce(2);

      const result = await adapter.delete("test-index", {
        ids: ["vec-1", "vec-2"],
      });
      expect(result.deletedCount).toBe(2);
    });

    it("should delete by filter", async () => {
      mockRedisClient.sendCommand.mockResolvedValueOnce([
        2,
        "key1",
        "key2",
      ]);
      mockRedisClient.del.mockResolvedValueOnce(2);

      const result = await adapter.delete("test-index", {
        filter: { category: "deprecated" },
      });
      expect(result.deletedCount).toBe(2);
    });

    it("should delete all records", async () => {
      mockRedisClient.keys.mockResolvedValueOnce(["key1", "key2", "key3"]);
      mockRedisClient.del.mockResolvedValueOnce(3);

      const result = await adapter.delete("test-index", {
        deleteAll: true,
      });
      expect(result.deletedCount).toBe(3);
    });

    it("should delete by namespace", async () => {
      mockRedisClient.keys.mockResolvedValueOnce(["key1", "key2"]);
      mockRedisClient.hGet
        .mockResolvedValueOnce("ns1")
        .mockResolvedValueOnce("ns2");
      mockRedisClient.del.mockResolvedValue(1);

      const result = await adapter.delete("test-index", {
        namespace: "ns1",
        deleteAll: true,
      });
      expect(result.deletedCount).toBe(1);
    });
  });

  describe("Statistics", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should get index statistics", async () => {
      mockRedisClient.sendCommand.mockResolvedValueOnce([
        "num_docs",
        "100",
        "inverted_sz_mb",
        "0.5",
        "num_records",
        "100",
        "indexing",
        "0",
      ]);
      mockRedisClient.keys.mockResolvedValueOnce(["k1", "k2", "k3"]);
      mockRedisClient.hGet
        .mockResolvedValueOnce("ns1")
        .mockResolvedValueOnce("ns2")
        .mockResolvedValueOnce("ns1");

      const stats = await adapter.getStats("test-index");
      expect(stats.vectorCount).toBe(100);
      expect(stats.namespaceCount).toBe(2);
    });
  });

  describe("Health Check", () => {
    it("should return healthy status when connected", async () => {
      await adapter.connect();
      mockRedisClient.sendCommand.mockResolvedValueOnce([
        "test:vector:idx:index1",
      ]);

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
      const result = await adapter.batchUpsert("test-index", manyRecords, {
        batchSize: 100,
      });
      expect(result.upsertedCount).toBe(250);
    });

    it("should batch delete large ID lists", async () => {
      const ids = manyRecords.map((r) => r.id);
      mockRedisClient.del.mockResolvedValue(100);

      const result = await adapter.batchDelete("test-index", ids, {
        batchSize: 100,
      });
      expect(result.deletedCount).toBe(300); // 3 batches * 100
    });
  });

  describe("Filter Translation", () => {
    beforeEach(async () => {
      await adapter.connect();
      mockRedisClient.sendCommand.mockResolvedValue([0]);
    });

    it("should translate simple equality filter", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { category: "tech" },
      });

      expect(mockRedisClient.sendCommand).toHaveBeenCalled();
    });

    it("should translate comparison operators", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { price: { $gte: 100, $lte: 500 } },
      });

      expect(mockRedisClient.sendCommand).toHaveBeenCalled();
    });

    it("should translate logical $and operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $and: [{ category: "tech" }, { status: "active" }],
        },
      });

      expect(mockRedisClient.sendCommand).toHaveBeenCalled();
    });

    it("should translate logical $or operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $or: [{ category: "tech" }, { category: "science" }],
        },
      });

      expect(mockRedisClient.sendCommand).toHaveBeenCalled();
    });

    it("should translate $not operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $not: { category: "spam" },
        },
      });

      expect(mockRedisClient.sendCommand).toHaveBeenCalled();
    });

    it("should translate $in operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          status: { $in: ["active", "pending"] },
        },
      });

      expect(mockRedisClient.sendCommand).toHaveBeenCalled();
    });

    it("should translate $nin operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          status: { $nin: ["deleted", "archived"] },
        },
      });

      expect(mockRedisClient.sendCommand).toHaveBeenCalled();
    });

    it("should translate string operators", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          title: { $contains: "vector" },
        },
      });

      expect(mockRedisClient.sendCommand).toHaveBeenCalled();
    });

    it("should translate $startsWith operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          name: { $startsWith: "neo" },
        },
      });

      expect(mockRedisClient.sendCommand).toHaveBeenCalled();
    });

    it("should translate $endsWith operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          file: { $endsWith: ".pdf" },
        },
      });

      expect(mockRedisClient.sendCommand).toHaveBeenCalled();
    });

    it("should translate $exists operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          optional_field: { $exists: true },
        },
      });

      expect(mockRedisClient.sendCommand).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should throw when operating without connection", async () => {
      await expect(adapter.listIndexes()).rejects.toThrow(
        "not initialized. Call connect() first",
      );
    });

    it("should throw when connection fails", async () => {
      mockRedisClient.ping.mockRejectedValueOnce(
        new Error("Connection refused"),
      );

      await expect(adapter.connect()).rejects.toThrow(
        "Failed to connect to Redis",
      );
    });

    it("should throw when creating index fails", async () => {
      await adapter.connect();
      mockRedisClient.sendCommand.mockRejectedValueOnce(
        new Error("Syntax error"),
      );

      await expect(
        adapter.createIndex({ name: "test", dimension: 128 }),
      ).rejects.toThrow("Failed to create index");
    });

    it("should throw when deleting index fails", async () => {
      await adapter.connect();
      mockRedisClient.sendCommand.mockRejectedValueOnce(
        new Error("Permission denied"),
      );

      await expect(adapter.deleteIndex("test")).rejects.toThrow(
        "Failed to delete index",
      );
    });

    it("should throw when upsert fails", async () => {
      await adapter.connect();
      mockRedisClient.hSet.mockRejectedValueOnce(
        new Error("OOM command not allowed"),
      );

      await expect(
        adapter.upsert("test", [{ id: "1", vector: [0.1] }]),
      ).rejects.toThrow("Failed to upsert");
    });

    it("should throw when query fails", async () => {
      await adapter.connect();
      mockRedisClient.sendCommand.mockRejectedValueOnce(
        new Error("Query error"),
      );

      await expect(
        adapter.query("test", { vector: [0.1], topK: 10 }),
      ).rejects.toThrow("Failed to query");
    });

    it("should throw when delete fails", async () => {
      await adapter.connect();
      mockRedisClient.del.mockRejectedValueOnce(new Error("Delete error"));

      await expect(adapter.delete("test", { ids: ["1"] })).rejects.toThrow(
        "Failed to delete",
      );
    });

    it("should throw when getting stats fails", async () => {
      await adapter.connect();
      mockRedisClient.sendCommand.mockRejectedValueOnce(
        new Error("Stats error"),
      );

      await expect(adapter.getStats("test")).rejects.toThrow(
        "Failed to get stats",
      );
    });
  });

  describe("Index Algorithms", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should support HNSW algorithm with custom parameters", async () => {
      await adapter.createIndex({
        name: "hnsw-index",
        dimension: 1536,
        metric: "cosine",
        config: {
          algorithm: "HNSW",
          hnsw: {
            M: 32,
            efConstruction: 400,
            efRuntime: 20,
          },
        },
      });

      expect(mockRedisClient.sendCommand).toHaveBeenCalledWith(
        expect.arrayContaining(["FT.CREATE"]),
      );
    });

    it("should support FLAT algorithm with custom parameters", async () => {
      await adapter.createIndex({
        name: "flat-index",
        dimension: 768,
        metric: "euclidean",
        config: {
          algorithm: "FLAT",
          flat: {
            initialCapacity: 50000,
            blockSize: 1024,
          },
        },
      });

      expect(mockRedisClient.sendCommand).toHaveBeenCalled();
    });

    it("should default to HNSW algorithm", async () => {
      await adapter.createIndex({
        name: "default-algo-index",
        dimension: 512,
      });

      // Should have created with HNSW
      expect(mockRedisClient.hSet).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.stringContaining("HNSW"),
      );
    });
  });

  describe("Distance Metrics", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should support cosine similarity", async () => {
      await adapter.createIndex({
        name: "cosine-index",
        dimension: 384,
        metric: "cosine",
      });

      expect(mockRedisClient.sendCommand).toHaveBeenCalled();
    });

    it("should support euclidean distance (L2)", async () => {
      await adapter.createIndex({
        name: "euclidean-index",
        dimension: 384,
        metric: "euclidean",
      });

      expect(mockRedisClient.sendCommand).toHaveBeenCalled();
    });

    it("should support dot product (inner product)", async () => {
      await adapter.createIndex({
        name: "dotproduct-index",
        dimension: 384,
        metric: "dotProduct",
      });

      expect(mockRedisClient.sendCommand).toHaveBeenCalled();
    });
  });

  describe("Connection Options", () => {
    it("should connect using URL", async () => {
      const urlAdapter = new RedisVectorAdapter({
        url: "redis://localhost:6379",
      });
      await urlAdapter.connect();
      expect(urlAdapter.isInitialized()).toBe(true);
      await urlAdapter.disconnect();
    });

    it("should connect using host and port", async () => {
      const hostAdapter = new RedisVectorAdapter({
        host: "localhost",
        port: 6380,
      });
      await hostAdapter.connect();
      expect(hostAdapter.isInitialized()).toBe(true);
      await hostAdapter.disconnect();
    });

    it("should support password authentication", async () => {
      const authAdapter = new RedisVectorAdapter({
        host: "localhost",
        port: 6379,
        password: "secret",
      });
      await authAdapter.connect();
      expect(authAdapter.isInitialized()).toBe(true);
      await authAdapter.disconnect();
    });

    it("should support database selection", async () => {
      const dbAdapter = new RedisVectorAdapter({
        host: "localhost",
        port: 6379,
        database: 1,
      });
      await dbAdapter.connect();
      expect(dbAdapter.isInitialized()).toBe(true);
      await dbAdapter.disconnect();
    });
  });
});

describe("RedisVectorAdapter Integration", () => {
  // These tests require Redis Stack to be installed and running
  // Skip if not available

  it.skip("should work with real Redis Stack", async () => {
    // This test would use a real Redis Stack server
    // Requires Redis Stack: docker run -p 6379:6379 redis/redis-stack:latest
  });

  it.skip("should perform actual KNN search", async () => {
    // Integration test for KNN search
  });

  it.skip("should handle large vector datasets", async () => {
    // Performance test for large datasets
  });
});
