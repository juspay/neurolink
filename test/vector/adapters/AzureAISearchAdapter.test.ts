/**
 * Azure AI Search Adapter Tests
 * Comprehensive test suite for the Azure AI Search vector store adapter
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AzureAISearchAdapter } from "../../../src/lib/vector/adapters/AzureAISearchAdapter.js";
import type {
  VectorRecord,
  VectorQueryOptions,
} from "../../../src/lib/vector/types.js";
import type { AzureAISearchConfig } from "../../../src/lib/vector/adapters/AzureAISearchAdapter.js";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("AzureAISearchAdapter", () => {
  let adapter: AzureAISearchAdapter;
  const defaultConfig: AzureAISearchConfig = {
    endpoint: "https://test-search.search.windows.net",
    apiKey: "test-api-key",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default successful response for connect
    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({ value: [] }),
    });
    adapter = new AzureAISearchAdapter(defaultConfig);
  });

  afterEach(async () => {
    if (adapter.isInitialized()) {
      await adapter.disconnect();
    }
  });

  describe("Constructor and Configuration", () => {
    it("should create adapter with configuration", () => {
      expect(adapter).toBeInstanceOf(AzureAISearchAdapter);
      expect(adapter.getStoreName()).toBe("azure-ai-search");
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should accept custom configuration options", () => {
      const customConfig: AzureAISearchConfig = {
        endpoint: "https://custom-search.search.windows.net",
        apiKey: "custom-api-key",
        apiVersion: "2024-05-01-preview",
        vectorFieldName: "embeddings",
        contentFieldName: "text",
        metadataFieldName: "meta",
        enableSemanticRanking: true,
        semanticConfigurationName: "my-semantic-config",
        requestTimeout: 60000,
      };
      const customAdapter = new AzureAISearchAdapter(customConfig);
      expect(customAdapter.getConfig()).toEqual(customConfig);
    });

    it("should use default values for optional config", () => {
      const config = adapter.getConfig();
      expect(config.endpoint).toBe("https://test-search.search.windows.net");
      expect(config.apiKey).toBe("test-api-key");
    });
  });

  describe("Connection Management", () => {
    it("should connect successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ value: [] }),
      });

      await adapter.connect();
      expect(adapter.isInitialized()).toBe(true);
    });

    it("should not reconnect if already connected", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ value: [] }),
      });

      await adapter.connect();
      await adapter.connect(); // Second call should be a no-op
      expect(adapter.isInitialized()).toBe(true);
      // Only one fetch call for the initial connect
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should disconnect successfully", async () => {
      await adapter.connect();
      await adapter.disconnect();
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should handle connect failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(adapter.connect()).rejects.toThrow(
        "Failed to connect to Azure AI Search",
      );
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should handle API error during connect", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Unauthorized"),
      });

      await expect(adapter.connect()).rejects.toThrow("Azure AI Search API error");
    });
  });

  describe("Index Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should create an index", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({}),
      });

      await adapter.createIndex({
        name: "test-index",
        dimension: 1536,
        metric: "cosine",
      });

      // Verify the request was made with correct parameters
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/indexes/test-index"),
        expect.objectContaining({
          method: "PUT",
          headers: expect.objectContaining({
            "api-key": "test-api-key",
          }),
        }),
      );
    });

    it("should create index with default metric", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({}),
      });

      await adapter.createIndex({
        name: "test-index",
        dimension: 768,
      });

      const callArgs = mockFetch.mock.calls[1];
      const body = JSON.parse(callArgs[1].body);
      expect(body.vectorSearch.algorithms[0].hnswParameters.metric).toBe("cosine");
    });

    it("should create index with euclidean metric", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({}),
      });

      await adapter.createIndex({
        name: "test-index",
        dimension: 768,
        metric: "euclidean",
      });

      const callArgs = mockFetch.mock.calls[1];
      const body = JSON.parse(callArgs[1].body);
      expect(body.vectorSearch.algorithms[0].hnswParameters.metric).toBe("euclidean");
    });

    it("should create index with dotProduct metric", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({}),
      });

      await adapter.createIndex({
        name: "test-index",
        dimension: 768,
        metric: "dotProduct",
      });

      const callArgs = mockFetch.mock.calls[1];
      const body = JSON.parse(callArgs[1].body);
      expect(body.vectorSearch.algorithms[0].hnswParameters.metric).toBe("dotProduct");
    });

    it("should delete an index", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        text: () => Promise.resolve(""),
      });

      await adapter.deleteIndex("test-index");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/indexes/test-index"),
        expect.objectContaining({
          method: "DELETE",
        }),
      );
    });

    it("should list indexes", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () =>
          Promise.resolve({
            value: [{ name: "index1" }, { name: "index2" }],
          }),
      });

      const indexes = await adapter.listIndexes();
      expect(indexes).toEqual(["index1", "index2"]);
    });

    it("should check if index exists (true)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ name: "test-index" }),
      });

      const exists = await adapter.indexExists("test-index");
      expect(exists).toBe(true);
    });

    it("should check if index exists (false)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve("Index not found"),
      });

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
    });

    it("should upsert records", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ value: [] }),
      });

      const result = await adapter.upsert("test-index", testRecords);
      expect(result.upsertedCount).toBe(2);

      // Verify request body
      const callArgs = mockFetch.mock.calls[1];
      const body = JSON.parse(callArgs[1].body);
      expect(body.value).toHaveLength(2);
      expect(body.value[0]["@search.action"]).toBe("mergeOrUpload");
      expect(body.value[0].id).toBe("vec-1");
    });

    it("should upsert with namespace", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ value: [] }),
      });

      const result = await adapter.upsert("test-index", testRecords, {
        namespace: "ns1",
      });
      expect(result.upsertedCount).toBe(2);

      const callArgs = mockFetch.mock.calls[1];
      const body = JSON.parse(callArgs[1].body);
      expect(body.value[0].namespace).toBe("ns1");
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

    it("should batch large upserts", async () => {
      // Create more than 1000 records to test batching
      const manyRecords = Array.from({ length: 1500 }, (_, i) => ({
        id: `vec-${i}`,
        vector: [0.1, 0.2, 0.3],
        metadata: { index: i },
      }));

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({ value: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({ value: [] }),
        });

      const result = await adapter.upsert("test-index", manyRecords);
      expect(result.upsertedCount).toBe(1500);
      // Should make 2 batch requests (1000 + 500)
      expect(mockFetch).toHaveBeenCalledTimes(3); // 1 connect + 2 batches
    });
  });

  describe("Query Operations", () => {
    const queryVector = [0.1, 0.2, 0.3];

    beforeEach(async () => {
      await adapter.connect();
    });

    it("should query vectors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () =>
          Promise.resolve({
            "@odata.count": 1,
            value: [
              {
                id: "vec-1",
                "@search.score": 0.95,
                content: "Test content",
                metadata: JSON.stringify({ category: "tech" }),
              },
            ],
          }),
      });

      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
      };

      const results = await adapter.query("test-index", options);
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("vec-1");
      expect(results[0].score).toBe(0.95);
    });

    it("should query with metadata filter", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () =>
          Promise.resolve({
            value: [
              {
                id: "vec-1",
                "@search.score": 0.9,
                content: "Tech content",
                metadata: JSON.stringify({ category: "tech" }),
              },
            ],
          }),
      });

      const options: VectorQueryOptions<{ category: string }> = {
        vector: queryVector,
        topK: 10,
        filter: { category: "tech" },
      };

      const results = await adapter.query("test-index", options);
      expect(Array.isArray(results)).toBe(true);

      // Verify filter was applied in request
      const callArgs = mockFetch.mock.calls[1];
      const body = JSON.parse(callArgs[1].body);
      expect(body.filter).toBeDefined();
    });

    it("should query with minimum score", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () =>
          Promise.resolve({
            value: [
              { id: "vec-1", "@search.score": 0.9 },
              { id: "vec-2", "@search.score": 0.3 }, // Below minScore
            ],
          }),
      });

      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        minScore: 0.5,
      };

      const results = await adapter.query("test-index", options);
      expect(results).toHaveLength(1);
      expect(results[0].score).toBe(0.9);
    });

    it("should query with namespace filter", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () =>
          Promise.resolve({
            value: [{ id: "vec-1", "@search.score": 0.8 }],
          }),
      });

      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        namespace: "ns1",
      };

      const results = await adapter.query("test-index", options);
      expect(Array.isArray(results)).toBe(true);

      // Verify namespace filter was applied
      const callArgs = mockFetch.mock.calls[1];
      const body = JSON.parse(callArgs[1].body);
      expect(body.filter).toContain("namespace eq");
    });

    it("should include vectors when requested", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () =>
          Promise.resolve({
            value: [
              {
                id: "vec-1",
                "@search.score": 0.9,
                vector: [0.1, 0.2, 0.3],
              },
            ],
          }),
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
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () =>
          Promise.resolve({
            value: [
              {
                id: "vec-1",
                "@search.score": 0.9,
                metadata: JSON.stringify({ category: "tech", version: 2 }),
              },
            ],
          }),
      });

      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        includeMetadata: true,
      };

      const results = await adapter.query("test-index", options);
      expect(results[0].metadata).toEqual({ category: "tech", version: 2 });
    });
  });

  describe("Delete Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should delete by IDs", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ value: [] }),
      });

      const result = await adapter.delete("test-index", {
        ids: ["vec-1", "vec-2"],
      });
      expect(result.deletedCount).toBe(2);

      // Verify delete action in request
      const callArgs = mockFetch.mock.calls[1];
      const body = JSON.parse(callArgs[1].body);
      expect(body.value[0]["@search.action"]).toBe("delete");
    });

    it("should delete by filter", async () => {
      // First call: search to get matching IDs
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () =>
          Promise.resolve({
            value: [{ id: "vec-1" }, { id: "vec-2" }],
          }),
      });
      // Second call: delete the IDs
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ value: [] }),
      });

      const result = await adapter.delete("test-index", {
        filter: { category: "deprecated" },
      });
      expect(result.deletedCount).toBe(2);
    });

    it("should delete by namespace", async () => {
      // First call: search to get IDs in namespace
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () =>
          Promise.resolve({
            value: [{ id: "vec-1" }, { id: "vec-2" }, { id: "vec-3" }],
          }),
      });
      // Second call: delete the IDs
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ value: [] }),
      });

      const result = await adapter.delete("test-index", {
        namespace: "old-data",
        deleteAll: true,
      });
      expect(result.deletedCount).toBe(3);
    });

    it("should delete all records", async () => {
      // First call: search to get all IDs
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () =>
          Promise.resolve({
            value: [{ id: "vec-1" }, { id: "vec-2" }],
          }),
      });
      // Second call: delete the IDs
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ value: [] }),
      });

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
      // Index definition response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () =>
          Promise.resolve({
            name: "test-index",
            fields: [
              {
                name: "vector",
                type: "Collection(Edm.Single)",
                dimensions: 1536,
              },
            ],
          }),
      });
      // Document count response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () =>
          Promise.resolve({
            "@odata.count": 100,
            value: [],
          }),
      });
      // Facet response for namespaces
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () =>
          Promise.resolve({
            "@odata.count": 100,
            "@search.facets": {
              namespace: [
                { value: "ns1", count: 50 },
                { value: "ns2", count: 30 },
                { value: "ns3", count: 20 },
              ],
            },
            value: [],
          }),
      });

      const stats = await adapter.getStats("test-index");
      expect(stats.vectorCount).toBe(100);
      expect(stats.dimension).toBe(1536);
      expect(stats.namespaceCount).toBe(3);
    });
  });

  describe("Health Check", () => {
    it("should return healthy status when connected", async () => {
      await adapter.connect();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ value: [{ name: "index1" }] }),
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

  describe("Filter Translation", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should translate simple equality filter", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ value: [] }),
      });

      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { category: "tech" },
      });

      const callArgs = mockFetch.mock.calls[1];
      const body = JSON.parse(callArgs[1].body);
      expect(body.filter).toContain("search.ismatch");
      expect(body.filter).toContain("category");
    });

    it("should translate $and operator", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ value: [] }),
      });

      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $and: [{ category: "tech" }, { status: "active" }],
        },
      });

      const callArgs = mockFetch.mock.calls[1];
      const body = JSON.parse(callArgs[1].body);
      expect(body.filter).toContain("and");
    });

    it("should translate $or operator", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ value: [] }),
      });

      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $or: [{ category: "tech" }, { category: "science" }],
        },
      });

      const callArgs = mockFetch.mock.calls[1];
      const body = JSON.parse(callArgs[1].body);
      expect(body.filter).toContain("or");
    });

    it("should translate $not operator", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ value: [] }),
      });

      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $not: { category: "spam" },
        },
      });

      const callArgs = mockFetch.mock.calls[1];
      const body = JSON.parse(callArgs[1].body);
      expect(body.filter).toContain("not");
    });

    it("should translate $in operator", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ value: [] }),
      });

      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          status: { $in: ["active", "pending"] },
        },
      });

      const callArgs = mockFetch.mock.calls[1];
      const body = JSON.parse(callArgs[1].body);
      expect(body.filter).toBeDefined();
    });

    it("should translate $exists operator", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ value: [] }),
      });

      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          optional_field: { $exists: true },
        },
      });

      const callArgs = mockFetch.mock.calls[1];
      const body = JSON.parse(callArgs[1].body);
      expect(body.filter).toBeDefined();
    });

    it("should translate $contains operator", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ value: [] }),
      });

      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          title: { $contains: "vector" },
        },
      });

      const callArgs = mockFetch.mock.calls[1];
      const body = JSON.parse(callArgs[1].body);
      expect(body.filter).toBeDefined();
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
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve("Bad Request"),
      });

      await expect(
        adapter.createIndex({ name: "test", dimension: 128 }),
      ).rejects.toThrow("Failed to create index");
    });

    it("should throw when deleting index fails", async () => {
      await adapter.connect();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      });

      await expect(adapter.deleteIndex("test")).rejects.toThrow(
        "Failed to delete index",
      );
    });

    it("should throw when upsert fails", async () => {
      await adapter.connect();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve("Bad Request"),
      });

      await expect(
        adapter.upsert("test", [{ id: "1", vector: [0.1] }]),
      ).rejects.toThrow("Failed to upsert");
    });

    it("should throw when query fails", async () => {
      await adapter.connect();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Query Error"),
      });

      await expect(
        adapter.query("test", { vector: [0.1], topK: 10 }),
      ).rejects.toThrow("Failed to query");
    });

    it("should throw when delete fails", async () => {
      await adapter.connect();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Delete Error"),
      });

      await expect(
        adapter.delete("test", { ids: ["1"] }),
      ).rejects.toThrow("Failed to delete");
    });

    it("should throw when getting stats fails", async () => {
      await adapter.connect();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve("Index not found"),
      });

      await expect(adapter.getStats("test")).rejects.toThrow(
        "Failed to get stats",
      );
    });

    it("should handle request timeout", async () => {
      await adapter.connect();

      // Create adapter with very short timeout
      const timeoutAdapter = new AzureAISearchAdapter({
        ...defaultConfig,
        requestTimeout: 1,
      });
      await timeoutAdapter.connect();

      // Mock a slow response that never resolves (simulates true timeout)
      mockFetch.mockImplementationOnce(
        (_url: string, options: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            // Listen for abort signal
            if (options?.signal) {
              options.signal.addEventListener("abort", () => {
                const error = new Error("AbortError");
                error.name = "AbortError";
                reject(error);
              });
            }
            // Never resolve - let the abort signal handle it
          }),
      );

      await expect(timeoutAdapter.listIndexes()).rejects.toThrow("timeout");
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
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ value: [] }),
      });

      const result = await adapter.batchUpsert("test-index", manyRecords, {
        batchSize: 100,
      });
      expect(result.upsertedCount).toBe(250);
    });

    it("should batch delete large ID lists", async () => {
      const ids = manyRecords.map((r) => r.id);
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ value: [] }),
      });

      const result = await adapter.batchDelete("test-index", ids, {
        batchSize: 100,
      });
      // 3 batches of deletions
      expect(result.deletedCount).toBe(250);
    });
  });

  describe("Semantic Ranking Configuration", () => {
    it("should create index with semantic ranking enabled", async () => {
      const semanticAdapter = new AzureAISearchAdapter({
        ...defaultConfig,
        enableSemanticRanking: true,
        semanticConfigurationName: "my-semantic-config",
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ value: [] }),
      });

      await semanticAdapter.connect();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({}),
      });

      await semanticAdapter.createIndex({
        name: "semantic-index",
        dimension: 1536,
      });

      const callArgs = mockFetch.mock.calls[1];
      const body = JSON.parse(callArgs[1].body);
      expect(body.semantic).toBeDefined();
      expect(body.semantic.configurations[0].name).toBe("my-semantic-config");
    });
  });
});

describe("AzureAISearchAdapter Integration", () => {
  // These tests require Azure AI Search service to be available
  // Skip if not configured

  it.skip("should work with real Azure AI Search service", async () => {
    // This test would use a real Azure AI Search service
    // Requires AZURE_SEARCH_ENDPOINT and AZURE_SEARCH_API_KEY environment variables
  });
});
