/**
 * Cloudflare Vectorize Adapter Tests
 * Comprehensive test suite for the Cloudflare Vectorize vector store adapter
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CloudflareVectorizeAdapter } from "../../../src/lib/vector/adapters/CloudflareVectorizeAdapter.js";
import type {
  VectorRecord,
  VectorQueryOptions,
} from "../../../src/lib/vector/types.js";
import type { CloudflareVectorizeConfig } from "../../../src/lib/vector/adapters/CloudflareVectorizeAdapter.js";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("CloudflareVectorizeAdapter", () => {
  let adapter: CloudflareVectorizeAdapter;
  const defaultConfig: CloudflareVectorizeConfig = {
    accountId: "test-account-id",
    apiToken: "test-api-token",
    requestTimeout: 5000,
    maxRetries: 1,
    retryDelay: 100,
  };

  const mockSuccessResponse = <T>(result: T) => ({
    ok: true,
    json: vi.fn().mockResolvedValue({
      success: true,
      errors: [],
      messages: [],
      result,
    }),
  });

  const mockErrorResponse = (status: number, message: string) => ({
    ok: false,
    status,
    json: vi.fn().mockResolvedValue({
      success: false,
      errors: [{ code: status, message }],
      messages: [],
      result: null,
    }),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the default mock behavior
    mockFetch.mockReset();
    adapter = new CloudflareVectorizeAdapter(defaultConfig);
  });

  afterEach(async () => {
    if (adapter.isInitialized()) {
      await adapter.disconnect();
    }
  });

  describe("Constructor and Configuration", () => {
    it("should create adapter with configuration", () => {
      expect(adapter).toBeInstanceOf(CloudflareVectorizeAdapter);
      expect(adapter.getStoreName()).toBe("cloudflare");
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should accept custom configuration options", () => {
      const customConfig: CloudflareVectorizeConfig = {
        accountId: "custom-account",
        apiToken: "custom-token",
        baseUrl: "https://custom.cloudflare.com",
        requestTimeout: 60000,
        maxRetries: 5,
        retryDelay: 2000,
      };
      const customAdapter = new CloudflareVectorizeAdapter(customConfig);
      expect(customAdapter.getConfig()).toEqual(customConfig);
    });

    it("should use default values for optional config", () => {
      const minimalConfig: CloudflareVectorizeConfig = {
        accountId: "account",
        apiToken: "token",
      };
      const minimalAdapter = new CloudflareVectorizeAdapter(minimalConfig);
      expect(minimalAdapter.getConfig().accountId).toBe("account");
      expect(minimalAdapter.getConfig().apiToken).toBe("token");
    });
  });

  describe("Connection Management", () => {
    it("should connect successfully", async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse([]));

      await adapter.connect();
      expect(adapter.isInitialized()).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/vectorize/v2/indexes"),
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: "Bearer test-api-token",
          }),
        }),
      );
    });

    it("should not reconnect if already connected", async () => {
      mockFetch.mockResolvedValue(mockSuccessResponse([]));

      await adapter.connect();
      await adapter.connect(); // Second call should be a no-op

      expect(adapter.isInitialized()).toBe(true);
      // Only one fetch call for the first connect
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should disconnect successfully", async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse([]));

      await adapter.connect();
      await adapter.disconnect();

      expect(adapter.isInitialized()).toBe(false);
    });

    it("should handle disconnect when not connected", async () => {
      await adapter.disconnect();
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should throw on connection failure", async () => {
      mockFetch.mockResolvedValueOnce(mockErrorResponse(401, "Unauthorized"));

      await expect(adapter.connect()).rejects.toThrow(
        "Failed to connect to Cloudflare Vectorize",
      );
    });
  });

  describe("Index Operations", () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse([]));
      await adapter.connect();
    });

    it("should create an index", async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({
          id: "idx-123",
          name: "test-index",
          config: { dimensions: 1536, metric: "cosine" },
          created_on: "2024-01-01T00:00:00Z",
          modified_on: "2024-01-01T00:00:00Z",
        }),
      );

      await adapter.createIndex({
        name: "test-index",
        dimension: 1536,
        metric: "cosine",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/vectorize/v2/indexes"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            name: "test-index",
            config: {
              dimensions: 1536,
              metric: "cosine",
            },
            description: undefined,
          }),
        }),
      );
    });

    it("should create index with default metric", async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({
          id: "idx-123",
          name: "test-index",
          config: { dimensions: 768, metric: "cosine" },
          created_on: "2024-01-01T00:00:00Z",
          modified_on: "2024-01-01T00:00:00Z",
        }),
      );

      await adapter.createIndex({
        name: "test-index",
        dimension: 768,
      });

      const callBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(callBody.config.metric).toBe("cosine");
    });

    it("should create index with dotProduct metric", async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({
          id: "idx-123",
          name: "test-index",
          config: { dimensions: 768, metric: "dot-product" },
          created_on: "2024-01-01T00:00:00Z",
          modified_on: "2024-01-01T00:00:00Z",
        }),
      );

      await adapter.createIndex({
        name: "test-index",
        dimension: 768,
        metric: "dotProduct",
      });

      const callBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(callBody.config.metric).toBe("dot-product");
    });

    it("should delete an index", async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse(null));

      await adapter.deleteIndex("test-index");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/vectorize/v2/indexes/test-index"),
        expect.objectContaining({
          method: "DELETE",
        }),
      );
    });

    it("should list indexes", async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse([
          { name: "index1", id: "idx-1", config: { dimensions: 128, metric: "cosine" }, created_on: "", modified_on: "" },
          { name: "index2", id: "idx-2", config: { dimensions: 256, metric: "euclidean" }, created_on: "", modified_on: "" },
        ]),
      );

      const indexes = await adapter.listIndexes();

      expect(indexes).toEqual(["index1", "index2"]);
    });

    it("should check if index exists - true", async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({
          id: "idx-123",
          name: "test-index",
          config: { dimensions: 128, metric: "cosine" },
          created_on: "",
          modified_on: "",
        }),
      );

      const exists = await adapter.indexExists("test-index");
      expect(exists).toBe(true);
    });

    it("should check if index exists - false", async () => {
      mockFetch.mockResolvedValueOnce(mockErrorResponse(404, "Index not found"));

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
      mockFetch.mockResolvedValueOnce(mockSuccessResponse([]));
      await adapter.connect();
    });

    it("should upsert records", async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({
          mutation_id: "mut-123",
          mutated_count: 2,
        }),
      );

      const result = await adapter.upsert("test-index", testRecords);

      expect(result.upsertedCount).toBe(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/vectorize/v2/indexes/test-index/upsert"),
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    it("should upsert with namespace", async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({
          mutation_id: "mut-123",
          mutated_count: 2,
        }),
      );

      const result = await adapter.upsert("test-index", testRecords, {
        namespace: "ns1",
      });

      expect(result.upsertedCount).toBe(2);

      const callBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(callBody.vectors[0].namespace).toBe("ns1");
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

    it("should batch upsert for large datasets", async () => {
      // Create 1500 records (should result in 2 batches: 1000 + 500)
      const manyRecords = Array.from({ length: 1500 }, (_, i) => ({
        id: `vec-${i}`,
        vector: [0.1, 0.2, 0.3],
        metadata: { index: i },
      }));

      mockFetch
        .mockResolvedValueOnce(mockSuccessResponse({ mutation_id: "mut-1", mutated_count: 1000 }))
        .mockResolvedValueOnce(mockSuccessResponse({ mutation_id: "mut-2", mutated_count: 500 }));

      const result = await adapter.upsert("test-index", manyRecords);

      expect(result.upsertedCount).toBe(1500);
      // Initial connect call + 2 upsert batches
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe("Query Operations", () => {
    const queryVector = [0.1, 0.2, 0.3];

    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse([]));
      await adapter.connect();
    });

    it("should query vectors", async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({
          matches: [
            { id: "vec-1", score: 0.95, metadata: { category: "tech" } },
            { id: "vec-2", score: 0.85, metadata: { category: "science" } },
          ],
          count: 2,
        }),
      );

      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
      };

      const results = await adapter.query("test-index", options);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
      expect(results[0].id).toBe("vec-1");
      expect(results[0].score).toBe(0.95);
    });

    it("should query with metadata filter", async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({
          matches: [{ id: "vec-1", score: 0.95, metadata: { category: "tech" } }],
          count: 1,
        }),
      );

      const options: VectorQueryOptions<{ category: string }> = {
        vector: queryVector,
        topK: 10,
        filter: { category: "tech" },
      };

      const results = await adapter.query("test-index", options);

      expect(results.length).toBe(1);

      const callBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(callBody.filter).toEqual({ category: { $eq: "tech" } });
    });

    it("should query with minimum score", async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({
          matches: [
            { id: "vec-1", score: 0.95 },
            { id: "vec-2", score: 0.45 },
          ],
          count: 2,
        }),
      );

      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        minScore: 0.5,
      };

      const results = await adapter.query("test-index", options);

      // Should filter out vec-2 with score 0.45
      expect(results.length).toBe(1);
      expect(results[0].id).toBe("vec-1");
    });

    it("should query with namespace filter", async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({
          matches: [{ id: "vec-1", score: 0.95 }],
          count: 1,
        }),
      );

      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        namespace: "ns1",
      };

      await adapter.query("test-index", options);

      const callBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(callBody.namespace).toBe("ns1");
    });

    it("should include vectors when requested", async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({
          matches: [{ id: "vec-1", score: 0.95, values: [0.1, 0.2, 0.3] }],
          count: 1,
        }),
      );

      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        includeVectors: true,
      };

      const results = await adapter.query("test-index", options);

      expect(results[0].vector).toEqual([0.1, 0.2, 0.3]);

      const callBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(callBody.returnValues).toBe(true);
    });

    it("should include metadata when requested", async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({
          matches: [{ id: "vec-1", score: 0.95, metadata: { key: "value" } }],
          count: 1,
        }),
      );

      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        includeMetadata: true,
      };

      const results = await adapter.query("test-index", options);

      expect(results[0].metadata).toEqual({ key: "value" });

      const callBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(callBody.returnMetadata).toBe("all");
    });

    it("should exclude metadata when not requested", async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({
          matches: [{ id: "vec-1", score: 0.95 }],
          count: 1,
        }),
      );

      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        includeMetadata: false,
      };

      await adapter.query("test-index", options);

      const callBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(callBody.returnMetadata).toBe("none");
    });
  });

  describe("Delete Operations", () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse([]));
      await adapter.connect();
    });

    it("should delete by IDs", async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({
          mutation_id: "mut-123",
          deleted_count: 2,
        }),
      );

      const result = await adapter.delete("test-index", {
        ids: ["vec-1", "vec-2"],
      });

      expect(result.deletedCount).toBe(2);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/vectorize/v2/indexes/test-index/delete-by-ids"),
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    it("should delete with namespace", async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({
          mutation_id: "mut-123",
          deleted_count: 1,
        }),
      );

      await adapter.delete("test-index", {
        ids: ["vec-1"],
        namespace: "ns1",
      });

      const callBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(callBody.namespace).toBe("ns1");
    });

    it("should handle empty IDs array", async () => {
      const result = await adapter.delete("test-index", {
        ids: [],
      });

      expect(result.deletedCount).toBe(0);
      // Should not make any additional API calls
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only the connect call
    });

    it("should throw error on deleteAll", async () => {
      await expect(
        adapter.delete("test-index", { deleteAll: true }),
      ).rejects.toThrow("deleteAll is not supported");
    });
  });

  describe("Statistics", () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse([]));
      await adapter.connect();
    });

    it("should get index statistics", async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({
          id: "idx-123",
          name: "test-index",
          config: { dimensions: 1536, metric: "cosine" },
          created_on: "2024-01-01T00:00:00Z",
          modified_on: "2024-01-15T00:00:00Z",
        }),
      );

      const stats = await adapter.getStats("test-index");

      expect(stats.dimension).toBe(1536);
      expect(stats.metrics?.metric).toBe("cosine");
      expect(stats.metrics?.createdOn).toBe("2024-01-01T00:00:00Z");
    });

    it("should convert dot-product metric correctly", async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({
          id: "idx-123",
          name: "test-index",
          config: { dimensions: 768, metric: "dot-product" },
          created_on: "2024-01-01T00:00:00Z",
          modified_on: "2024-01-01T00:00:00Z",
        }),
      );

      const stats = await adapter.getStats("test-index");

      expect(stats.metrics?.metric).toBe("dotProduct");
    });
  });

  describe("Health Check", () => {
    it("should return healthy status when connected", async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse([]));
      await adapter.connect();

      mockFetch.mockResolvedValueOnce(mockSuccessResponse([{ name: "index1" }]));

      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.status).toBe("connected");
      expect(health.latencyMs).toBeGreaterThanOrEqual(0);
      expect(health.lastChecked).toBeInstanceOf(Date);
    });

    it("should return error status when API fails", async () => {
      // Mock a failed API call
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.status).toBe("error");
      expect(health.error).toBeDefined();
    });
  });

  describe("Batch Operations", () => {
    const manyRecords = Array.from({ length: 250 }, (_, i) => ({
      id: `vec-${i}`,
      vector: [0.1, 0.2, 0.3],
      metadata: { index: i },
    }));

    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse([]));
      await adapter.connect();
    });

    it("should batch upsert large datasets", async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({ mutation_id: "mut-1", mutated_count: 100 }),
      );
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({ mutation_id: "mut-2", mutated_count: 100 }),
      );
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({ mutation_id: "mut-3", mutated_count: 50 }),
      );

      const result = await adapter.batchUpsert("test-index", manyRecords, {
        batchSize: 100,
      });

      expect(result.upsertedCount).toBe(250);
    });

    it("should batch delete large ID lists", async () => {
      const ids = manyRecords.map((r) => r.id);

      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({ mutation_id: "mut-1", deleted_count: 100 }),
      );
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({ mutation_id: "mut-2", deleted_count: 100 }),
      );
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({ mutation_id: "mut-3", deleted_count: 50 }),
      );

      const result = await adapter.batchDelete("test-index", ids, {
        batchSize: 100,
      });

      expect(result.deletedCount).toBe(250);
    });
  });

  describe("Filter Translation", () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse([]));
      await adapter.connect();
    });

    it("should translate simple equality filter", async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({ matches: [], count: 0 }),
      );

      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { category: "tech" },
      });

      const callBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(callBody.filter).toEqual({ category: { $eq: "tech" } });
    });

    it("should translate comparison operators", async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({ matches: [], count: 0 }),
      );

      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { price: { $gte: 100, $lte: 500 } },
      });

      const callBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(callBody.filter).toEqual({
        price: { $gte: 100, $lte: 500 },
      });
    });

    it("should translate logical $and operator", async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({ matches: [], count: 0 }),
      );

      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $and: [{ category: "tech" }, { status: "active" }],
        },
      });

      const callBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(callBody.filter.$and).toBeDefined();
      expect(callBody.filter.$and.length).toBe(2);
    });

    it("should translate logical $or operator", async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({ matches: [], count: 0 }),
      );

      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $or: [{ category: "tech" }, { category: "science" }],
        },
      });

      const callBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(callBody.filter.$or).toBeDefined();
      expect(callBody.filter.$or.length).toBe(2);
    });

    it("should translate $in operator", async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({ matches: [], count: 0 }),
      );

      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          status: { $in: ["active", "pending"] },
        },
      });

      const callBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(callBody.filter).toEqual({
        status: { $in: ["active", "pending"] },
      });
    });

    it("should translate $nin operator", async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({ matches: [], count: 0 }),
      );

      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          status: { $nin: ["deleted", "archived"] },
        },
      });

      const callBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(callBody.filter).toEqual({
        status: { $nin: ["deleted", "archived"] },
      });
    });

    it("should translate $exists operator", async () => {
      mockFetch.mockResolvedValueOnce(
        mockSuccessResponse({ matches: [], count: 0 }),
      );

      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          optional_field: { $exists: true },
        },
      });

      const callBody = JSON.parse(mockFetch.mock.calls[1][1].body);
      // $exists: true becomes $ne: null
      expect(callBody.filter).toEqual({
        optional_field: { $ne: null },
      });
    });
  });

  describe("Error Handling", () => {
    it("should throw when operating without connection", async () => {
      await expect(adapter.createIndex({ name: "test", dimension: 128 })).rejects.toThrow(
        "not initialized. Call connect() first",
      );
    });

    it("should throw when creating index fails", async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse([]));
      await adapter.connect();

      mockFetch.mockResolvedValueOnce(mockErrorResponse(400, "Invalid configuration"));

      await expect(
        adapter.createIndex({ name: "test", dimension: 128 }),
      ).rejects.toThrow("Failed to create Cloudflare Vectorize index");
    });

    it("should throw when deleting index fails", async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse([]));
      await adapter.connect();

      mockFetch.mockResolvedValueOnce(mockErrorResponse(404, "Index not found"));

      await expect(adapter.deleteIndex("test")).rejects.toThrow(
        "Failed to delete Cloudflare Vectorize index",
      );
    });

    it("should throw when upsert fails", async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse([]));
      await adapter.connect();

      mockFetch.mockResolvedValueOnce(mockErrorResponse(500, "Internal error"));

      await expect(
        adapter.upsert("test", [{ id: "1", vector: [0.1] }]),
      ).rejects.toThrow("Failed to upsert");
    });

    it("should throw when query fails", async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse([]));
      await adapter.connect();

      mockFetch.mockResolvedValueOnce(mockErrorResponse(500, "Query error"));

      await expect(
        adapter.query("test", { vector: [0.1], topK: 10 }),
      ).rejects.toThrow("Failed to query");
    });

    it("should throw when delete fails", async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse([]));
      await adapter.connect();

      mockFetch.mockResolvedValueOnce(mockErrorResponse(500, "Delete error"));

      await expect(
        adapter.delete("test", { ids: ["1"] }),
      ).rejects.toThrow("Failed to delete");
    });

    it("should throw when getting stats fails", async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse([]));
      await adapter.connect();

      mockFetch.mockResolvedValueOnce(mockErrorResponse(404, "Index not found"));

      await expect(adapter.getStats("test")).rejects.toThrow(
        "Failed to get stats",
      );
    });
  });

  describe("Retry Logic", () => {
    it("should retry on transient errors", async () => {
      // Mock connect success first
      const successfulConnect = mockSuccessResponse([]);

      // First call succeeds (connect), then 2 failures followed by success
      mockFetch
        .mockResolvedValueOnce(successfulConnect)
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce(
          mockSuccessResponse({
            matches: [{ id: "vec-1", score: 0.95 }],
            count: 1,
          }),
        );

      await adapter.connect();

      const result = await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
      });

      expect(result.length).toBe(1);
      // connect + 2 query attempts (1 fail + 1 success)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should not retry on 4xx errors except 429", async () => {
      mockFetch.mockResolvedValueOnce(mockSuccessResponse([]));
      await adapter.connect();

      mockFetch.mockResolvedValueOnce(mockErrorResponse(400, "Bad request"));

      await expect(
        adapter.query("test-index", { vector: [0.1], topK: 10 }),
      ).rejects.toThrow("Bad request");

      // Only connect + 1 query attempt (no retry)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("Request Timeout", () => {
    it("should handle abort signal when request takes too long", async () => {
      // Create adapter with very short timeout
      const shortTimeoutAdapter = new CloudflareVectorizeAdapter({
        ...defaultConfig,
        requestTimeout: 10, // 10ms timeout
        maxRetries: 0,
      });

      // Mock a response that checks abort signal and throws if aborted
      mockFetch.mockImplementation(async (url: string, options: { signal?: AbortSignal }) => {
        // Wait for a bit to let the abort happen
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Check if aborted
        if (options?.signal?.aborted) {
          const error = new Error("The operation was aborted");
          error.name = "AbortError";
          throw error;
        }

        return mockSuccessResponse([]);
      });

      await expect(shortTimeoutAdapter.connect()).rejects.toThrow();
    });
  });
});

describe("CloudflareVectorizeAdapter Integration", () => {
  // These tests would run against a real Cloudflare Vectorize instance
  // Skip if credentials not available

  it.skip("should work with real Cloudflare Vectorize", async () => {
    const adapter = new CloudflareVectorizeAdapter({
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
      apiToken: process.env.CLOUDFLARE_API_TOKEN!,
    });

    await adapter.connect();
    const indexes = await adapter.listIndexes();
    expect(Array.isArray(indexes)).toBe(true);
    await adapter.disconnect();
  });
});
