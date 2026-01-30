/**
 * Upstash Vector Adapter Tests
 * Comprehensive test suite for the Upstash Vector store adapter
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from "vitest";
import type {
  VectorRecord,
  VectorQueryOptions,
} from "../../../src/lib/vector/types.js";

// Mock namespace object
const mockNamespace = {
  upsert: vi.fn(() => Promise.resolve({ upserted: 0 })),
  query: vi.fn(() => Promise.resolve([])),
  delete: vi.fn(() => Promise.resolve({ deleted: 0 })),
  fetch: vi.fn(() => Promise.resolve([])),
  reset: vi.fn(() => Promise.resolve()),
};

// Mock index object
const mockIndex = {
  upsert: vi.fn(() => Promise.resolve({ upserted: 0 })),
  query: vi.fn(() => Promise.resolve([])),
  delete: vi.fn(() => Promise.resolve({ deleted: 0 })),
  fetch: vi.fn(() => Promise.resolve([])),
  range: vi.fn(() => Promise.resolve({ nextCursor: "", vectors: [] })),
  reset: vi.fn(() => Promise.resolve()),
  info: vi.fn(() =>
    Promise.resolve({
      vectorCount: 100,
      pendingVectorCount: 0,
      indexSize: 1024,
      dimension: 1536,
      similarityFunction: "COSINE",
      namespaces: {
        "test-namespace": { vectorCount: 50, pendingVectorCount: 0 },
      },
    }),
  ),
  listNamespaces: vi.fn(() => Promise.resolve(["default", "test-namespace"])),
  deleteNamespace: vi.fn(() => Promise.resolve()),
  namespace: vi.fn(() => mockNamespace),
};

// Mock the dynamic import before importing the adapter
vi.mock("@upstash/vector", () => ({
  Index: vi.fn(() => mockIndex),
}));

// Import after the mock is set up
import { UpstashVectorAdapter } from "../../../src/lib/vector/adapters/UpstashVectorAdapter.js";
import type { UpstashVectorConfig } from "../../../src/lib/vector/adapters/UpstashVectorAdapter.js";

describe("UpstashVectorAdapter", () => {
  let adapter: UpstashVectorAdapter;
  const defaultConfig: UpstashVectorConfig = {
    url: "https://test-vector.upstash.io",
    token: "test-token-123",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock return values
    mockNamespace.upsert.mockResolvedValue({ upserted: 0 });
    mockNamespace.query.mockResolvedValue([]);
    mockNamespace.delete.mockResolvedValue({ deleted: 0 });
    mockIndex.info.mockResolvedValue({
      vectorCount: 100,
      pendingVectorCount: 0,
      indexSize: 1024,
      dimension: 1536,
      similarityFunction: "COSINE",
      namespaces: {
        "test-namespace": { vectorCount: 50, pendingVectorCount: 0 },
      },
    });
    mockIndex.listNamespaces.mockResolvedValue(["default", "test-namespace"]);
    adapter = new UpstashVectorAdapter(defaultConfig);
  });

  afterEach(async () => {
    if (adapter.isInitialized()) {
      await adapter.disconnect();
    }
  });

  describe("Constructor and Configuration", () => {
    it("should create adapter with configuration", () => {
      expect(adapter).toBeInstanceOf(UpstashVectorAdapter);
      expect(adapter.getStoreName()).toBe("upstash");
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should accept custom configuration options", () => {
      const customConfig: UpstashVectorConfig = {
        url: "https://custom-vector.upstash.io",
        token: "custom-token",
        defaultNamespace: "my-namespace",
        requestTimeout: 60000,
        automaticRetries: true,
        headers: { "X-Custom-Header": "value" },
      };
      const customAdapter = new UpstashVectorAdapter(customConfig);
      expect(customAdapter.getConfig()).toEqual(customConfig);
    });
  });

  describe("Connection Management", () => {
    it("should connect successfully", async () => {
      await adapter.connect();
      expect(adapter.isInitialized()).toBe(true);
    });

    it("should fetch index info on connect", async () => {
      await adapter.connect();
      expect(mockIndex.info).toHaveBeenCalled();
    });

    it("should list namespaces on connect", async () => {
      await adapter.connect();
      expect(mockIndex.listNamespaces).toHaveBeenCalled();
    });

    it("should not reconnect if already connected", async () => {
      await adapter.connect();
      await adapter.connect(); // Second call should be a no-op
      expect(adapter.isInitialized()).toBe(true);
      expect(mockIndex.info).toHaveBeenCalledTimes(1);
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

  describe("Index Operations (Namespaces)", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should create/register a namespace", async () => {
      // Update mock to return the new namespace
      mockIndex.listNamespaces.mockResolvedValueOnce([
        "default",
        "test-namespace",
        "new-namespace",
      ]);

      await adapter.createIndex({
        name: "new-namespace",
        dimension: 1536,
        metric: "cosine",
      });

      // Verify namespace is tracked - the listIndexes will return updated mock
      const indexes = await adapter.listIndexes();
      expect(indexes).toContain("new-namespace");
    });

    it("should throw on dimension mismatch", async () => {
      await expect(
        adapter.createIndex({
          name: "wrong-dim",
          dimension: 768, // Different from index dimension (1536)
        }),
      ).rejects.toThrow("Dimension mismatch");
    });

    it("should delete a namespace", async () => {
      await adapter.deleteIndex("test-namespace");
      expect(mockIndex.deleteNamespace).toHaveBeenCalledWith("test-namespace");
    });

    it("should list namespaces", async () => {
      const indexes = await adapter.listIndexes();
      expect(indexes).toEqual(["default", "test-namespace"]);
    });

    it("should check if namespace exists", async () => {
      const exists = await adapter.indexExists("test-namespace");
      expect(exists).toBe(true);

      const notExists = await adapter.indexExists("nonexistent");
      expect(notExists).toBe(false);
    });

    it("should handle delete namespace failure", async () => {
      mockIndex.deleteNamespace.mockRejectedValueOnce(new Error("API error"));

      await expect(adapter.deleteIndex("failing-namespace")).rejects.toThrow(
        "Failed to delete namespace",
      );
    });
  });

  describe("Upsert Operations", () => {
    const testRecords: VectorRecord<{ category: string }>[] = [
      {
        id: "vec-1",
        vector: new Array(1536).fill(0.1),
        metadata: { category: "tech" },
        content: "Test content 1",
      },
      {
        id: "vec-2",
        vector: new Array(1536).fill(0.2),
        metadata: { category: "science" },
        content: "Test content 2",
      },
    ];

    beforeEach(async () => {
      await adapter.connect();
      mockNamespace.upsert.mockResolvedValue({ upserted: 2 });
    });

    it("should upsert records to namespace", async () => {
      const result = await adapter.upsert("test-namespace", testRecords);

      expect(mockIndex.namespace).toHaveBeenCalledWith("test-namespace");
      expect(mockNamespace.upsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: "vec-1",
            vector: expect.any(Array),
            metadata: { category: "tech" },
            data: "Test content 1",
          }),
        ]),
      );
      expect(result.upsertedCount).toBe(2);
    });

    it("should upsert with custom namespace option", async () => {
      const result = await adapter.upsert("default", testRecords, {
        namespace: "custom-ns",
      });

      expect(mockIndex.namespace).toHaveBeenCalledWith("custom-ns");
      expect(result.upsertedCount).toBe(2);
    });

    it("should validate vector dimensions", async () => {
      const invalidRecords = [
        { id: "v1", vector: new Array(1536).fill(0.1) },
        { id: "v2", vector: new Array(768).fill(0.2) }, // Different dimension
      ];

      await expect(
        adapter.upsert("test-namespace", invalidRecords),
      ).rejects.toThrow("Inconsistent vector dimensions");
    });

    it("should handle empty records array", async () => {
      const result = await adapter.upsert("test-namespace", []);
      expect(result.upsertedCount).toBe(0);
      expect(mockNamespace.upsert).not.toHaveBeenCalled();
    });

    it("should handle upsert failure", async () => {
      mockNamespace.upsert.mockRejectedValueOnce(new Error("Upsert failed"));

      await expect(
        adapter.upsert("test-namespace", testRecords),
      ).rejects.toThrow("Failed to upsert records");
    });

    it("should handle upsert response with count instead of upserted", async () => {
      mockNamespace.upsert.mockResolvedValue({ count: 3 });

      const result = await adapter.upsert("test-namespace", testRecords);
      expect(result.upsertedCount).toBe(3);
    });
  });

  describe("Query Operations", () => {
    const queryVector = new Array(1536).fill(0.1);
    const mockResults = [
      {
        id: "vec-1",
        score: 0.95,
        vector: new Array(1536).fill(0.1),
        metadata: { category: "tech" },
        data: "Test content 1",
      },
      {
        id: "vec-2",
        score: 0.85,
        metadata: { category: "science" },
        data: "Test content 2",
      },
    ];

    beforeEach(async () => {
      await adapter.connect();
      mockNamespace.query.mockResolvedValue(mockResults);
    });

    it("should query vectors", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
      };

      const results = await adapter.query("test-namespace", options);

      expect(mockIndex.namespace).toHaveBeenCalledWith("test-namespace");
      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          vector: queryVector,
          topK: 10,
          includeVectors: false,
          includeMetadata: true,
          includeData: true,
        }),
      );
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe("vec-1");
      expect(results[0].score).toBe(0.95);
    });

    it("should query with metadata filter", async () => {
      const options: VectorQueryOptions<{ category: string }> = {
        vector: queryVector,
        topK: 10,
        filter: { category: "tech" },
      };

      await adapter.query("test-namespace", options);

      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: "category = 'tech'",
        }),
      );
    });

    it("should query with minimum score", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        minScore: 0.9,
      };

      const results = await adapter.query("test-namespace", options);

      // Should filter out vec-2 with score 0.85
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("vec-1");
    });

    it("should query with namespace option", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        namespace: "custom-ns",
      };

      await adapter.query("default", options);

      expect(mockIndex.namespace).toHaveBeenCalledWith("custom-ns");
    });

    it("should include vectors when requested", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        includeVectors: true,
      };

      await adapter.query("test-namespace", options);

      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          includeVectors: true,
        }),
      );
    });

    it("should handle query failure", async () => {
      mockNamespace.query.mockRejectedValueOnce(new Error("Query failed"));

      await expect(
        adapter.query("test-namespace", { vector: queryVector, topK: 10 }),
      ).rejects.toThrow("Failed to query vectors");
    });
  });

  describe("Delete Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
      mockNamespace.delete.mockResolvedValue({ deleted: 2 });
    });

    it("should delete by IDs", async () => {
      const result = await adapter.delete("test-namespace", {
        ids: ["vec-1", "vec-2"],
      });

      expect(mockNamespace.delete).toHaveBeenCalledWith(["vec-1", "vec-2"]);
      expect(result.deletedCount).toBe(2);
    });

    it("should delete all records (reset namespace)", async () => {
      const result = await adapter.delete("test-namespace", {
        deleteAll: true,
      });

      expect(mockNamespace.reset).toHaveBeenCalled();
      expect(result.deletedCount).toBe(-1); // Unknown count after reset
    });

    it("should delete by filter", async () => {
      // Query will return matching records
      mockNamespace.query.mockResolvedValueOnce([
        { id: "vec-1", score: 0.5 },
        { id: "vec-2", score: 0.4 },
      ]);

      const result = await adapter.delete("test-namespace", {
        filter: { category: "deprecated" },
      });

      // Should query first, then delete matching IDs
      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: "category = 'deprecated'",
        }),
      );
      expect(mockNamespace.delete).toHaveBeenCalledWith(["vec-1", "vec-2"]);
      expect(result.deletedCount).toBe(2);
    });

    it("should handle delete by filter with no matches", async () => {
      mockNamespace.query.mockResolvedValueOnce([]);

      const result = await adapter.delete("test-namespace", {
        filter: { category: "nonexistent" },
      });

      expect(result.deletedCount).toBe(0);
    });

    it("should use custom namespace option", async () => {
      await adapter.delete("default", {
        ids: ["vec-1"],
        namespace: "custom-ns",
      });

      expect(mockIndex.namespace).toHaveBeenCalledWith("custom-ns");
    });

    it("should handle delete failure", async () => {
      mockNamespace.delete.mockRejectedValueOnce(new Error("Delete failed"));

      await expect(
        adapter.delete("test-namespace", { ids: ["vec-1"] }),
      ).rejects.toThrow("Failed to delete records");
    });

    it("should return 0 when no delete criteria provided", async () => {
      const result = await adapter.delete("test-namespace", {});
      expect(result.deletedCount).toBe(0);
    });
  });

  describe("Statistics", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should get index statistics", async () => {
      const stats = await adapter.getStats("test-namespace");

      expect(mockIndex.info).toHaveBeenCalled();
      expect(stats.vectorCount).toBe(50); // From namespace stats
      expect(stats.dimension).toBe(1536);
      expect(stats.indexSize).toBe(1024);
      expect(stats.namespaceCount).toBe(1);
      expect(stats.metrics).toEqual(
        expect.objectContaining({
          similarityFunction: "COSINE",
        }),
      );
    });

    it("should fall back to total stats if namespace not found", async () => {
      const stats = await adapter.getStats("nonexistent-namespace");

      expect(stats.vectorCount).toBe(100); // Total count
    });

    it("should handle stats failure", async () => {
      mockIndex.info.mockRejectedValueOnce(new Error("API error"));

      await expect(adapter.getStats("test-namespace")).rejects.toThrow(
        "Failed to get stats",
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
      vector: new Array(1536).fill(0.1),
      metadata: { index: i },
    }));

    beforeEach(async () => {
      await adapter.connect();
      mockNamespace.upsert.mockResolvedValue({ upserted: 100 });
    });

    it("should batch upsert large datasets", async () => {
      const result = await adapter.batchUpsert("test-namespace", manyRecords, {
        batchSize: 100,
      });
      expect(result.upsertedCount).toBe(300); // 3 batches of 100
    });

    it("should batch delete large ID lists", async () => {
      const ids = manyRecords.map((r) => r.id);
      mockNamespace.delete.mockResolvedValue({ deleted: 100 });

      const result = await adapter.batchDelete("test-namespace", ids, {
        batchSize: 100,
      });
      expect(result.deletedCount).toBe(300); // 3 batches
    });
  });

  describe("Filter Translation", () => {
    beforeEach(async () => {
      await adapter.connect();
      mockNamespace.query.mockResolvedValue([]);
    });

    it("should translate simple equality filter", async () => {
      await adapter.query("test-namespace", {
        vector: new Array(1536).fill(0),
        topK: 10,
        filter: { category: "tech" },
      });

      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: "category = 'tech'",
        }),
      );
    });

    it("should translate numeric comparison operators", async () => {
      await adapter.query("test-namespace", {
        vector: new Array(1536).fill(0),
        topK: 10,
        filter: { price: { $gte: 100, $lte: 500 } },
      });

      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: "price >= 100 AND price <= 500",
        }),
      );
    });

    it("should translate logical $and operator", async () => {
      await adapter.query("test-namespace", {
        vector: new Array(1536).fill(0),
        topK: 10,
        filter: {
          $and: [{ category: "tech" }, { status: "active" }],
        },
      });

      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: "(category = 'tech' AND status = 'active')",
        }),
      );
    });

    it("should translate logical $or operator", async () => {
      await adapter.query("test-namespace", {
        vector: new Array(1536).fill(0),
        topK: 10,
        filter: {
          $or: [{ category: "tech" }, { category: "science" }],
        },
      });

      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: "(category = 'tech' OR category = 'science')",
        }),
      );
    });

    it("should translate $not operator", async () => {
      await adapter.query("test-namespace", {
        vector: new Array(1536).fill(0),
        topK: 10,
        filter: {
          $not: { category: "spam" },
        },
      });

      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: "NOT (category = 'spam')",
        }),
      );
    });

    it("should translate $in operator", async () => {
      await adapter.query("test-namespace", {
        vector: new Array(1536).fill(0),
        topK: 10,
        filter: {
          status: { $in: ["active", "pending"] },
        },
      });

      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: "status IN ('active', 'pending')",
        }),
      );
    });

    it("should translate $nin operator", async () => {
      await adapter.query("test-namespace", {
        vector: new Array(1536).fill(0),
        topK: 10,
        filter: {
          status: { $nin: ["deleted", "archived"] },
        },
      });

      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: "status NOT IN ('deleted', 'archived')",
        }),
      );
    });

    it("should translate $exists operator", async () => {
      await adapter.query("test-namespace", {
        vector: new Array(1536).fill(0),
        topK: 10,
        filter: {
          optional_field: { $exists: true },
        },
      });

      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: "optional_field IS NOT NULL",
        }),
      );
    });

    it("should translate $exists false operator", async () => {
      await adapter.query("test-namespace", {
        vector: new Array(1536).fill(0),
        topK: 10,
        filter: {
          optional_field: { $exists: false },
        },
      });

      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: "optional_field IS NULL",
        }),
      );
    });

    it("should translate $contains operator", async () => {
      await adapter.query("test-namespace", {
        vector: new Array(1536).fill(0),
        topK: 10,
        filter: {
          title: { $contains: "vector" },
        },
      });

      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: "title CONTAINS 'vector'",
        }),
      );
    });

    it("should translate $startsWith operator", async () => {
      await adapter.query("test-namespace", {
        vector: new Array(1536).fill(0),
        topK: 10,
        filter: {
          name: { $startsWith: "test" },
        },
      });

      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: "name GLOB 'test*'",
        }),
      );
    });

    it("should translate $endsWith operator", async () => {
      await adapter.query("test-namespace", {
        vector: new Array(1536).fill(0),
        topK: 10,
        filter: {
          filename: { $endsWith: ".pdf" },
        },
      });

      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: "filename GLOB '*.pdf'",
        }),
      );
    });

    it("should escape single quotes in string values", async () => {
      await adapter.query("test-namespace", {
        vector: new Array(1536).fill(0),
        topK: 10,
        filter: { name: "O'Brien" },
      });

      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: "name = 'O''Brien'",
        }),
      );
    });

    it("should handle numeric values without quotes", async () => {
      await adapter.query("test-namespace", {
        vector: new Array(1536).fill(0),
        topK: 10,
        filter: { count: 42 },
      });

      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: "count = 42",
        }),
      );
    });

    it("should handle boolean values", async () => {
      await adapter.query("test-namespace", {
        vector: new Array(1536).fill(0),
        topK: 10,
        filter: { active: true },
      });

      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: "active = true",
        }),
      );
    });

    it("should handle complex nested filters", async () => {
      await adapter.query("test-namespace", {
        vector: new Array(1536).fill(0),
        topK: 10,
        filter: {
          $and: [
            { category: "tech" },
            {
              $or: [{ price: { $lt: 100 } }, { featured: true }],
            },
          ],
        },
      });

      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: "(category = 'tech' AND (price < 100 OR featured = true))",
        }),
      );
    });
  });

  describe("Error Handling", () => {
    it("should throw when operating without connection", async () => {
      await expect(adapter.listIndexes()).rejects.toThrow(
        "not initialized. Call connect() first",
      );
    });

    it("should throw when upserting without connection", async () => {
      await expect(
        adapter.upsert("test", [{ id: "1", vector: [0.1] }]),
      ).rejects.toThrow("not initialized");
    });

    it("should throw when querying without connection", async () => {
      await expect(
        adapter.query("test", { vector: [0.1], topK: 10 }),
      ).rejects.toThrow("not initialized");
    });

    it("should throw when deleting without connection", async () => {
      await expect(
        adapter.delete("test", { ids: ["1"] }),
      ).rejects.toThrow("not initialized");
    });

    it("should throw when getting stats without connection", async () => {
      await expect(adapter.getStats("test")).rejects.toThrow("not initialized");
    });
  });
});

describe("UpstashVectorAdapter Integration", () => {
  // These tests require actual Upstash credentials
  // Skip if not available

  it.skip("should work with real Upstash Vector instance", async () => {
    // This test would use real Upstash Vector credentials
    // Requires UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN environment variables
    const adapter = new UpstashVectorAdapter({
      url: process.env.UPSTASH_VECTOR_REST_URL!,
      token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
    });

    await adapter.connect();

    // Test basic operations
    const stats = await adapter.getStats("default");
    expect(stats.dimension).toBeGreaterThan(0);

    await adapter.disconnect();
  });
});
