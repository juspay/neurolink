/**
 * Pinecone Adapter Tests
 * Comprehensive test suite for the Pinecone vector store adapter
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PineconeAdapter } from "../../../src/lib/vector/adapters/PineconeAdapter.js";
import type {
  VectorRecord,
  VectorQueryOptions,
} from "../../../src/lib/vector/types.js";
import type { PineconeConfig } from "../../../src/lib/vector/adapters/PineconeAdapter.js";

// Mock namespace object
const mockNamespace = {
  upsert: vi.fn().mockResolvedValue({ upsertedCount: 2 }),
  query: vi.fn().mockResolvedValue({ matches: [] }),
  deleteOne: vi.fn().mockResolvedValue(undefined),
  deleteMany: vi.fn().mockResolvedValue(undefined),
  deleteAll: vi.fn().mockResolvedValue(undefined),
  fetch: vi.fn().mockResolvedValue({ vectors: {} }),
};

// Mock index object
const mockIndex = {
  namespace: vi.fn().mockReturnValue(mockNamespace),
  describeIndexStats: vi.fn().mockResolvedValue({
    namespaces: { "": { recordCount: 100 } },
    dimension: 1536,
    totalRecordCount: 100,
    indexFullness: 0.1,
  }),
};

// Create a mock Pinecone client instance - methods will be assigned in beforeEach
// Using Object.assign pattern to create a proper instance with mocked methods
const createMockPineconeClient = () => {
  const client = {
    createIndex: vi.fn().mockResolvedValue(undefined),
    deleteIndex: vi.fn().mockResolvedValue(undefined),
    listIndexes: vi.fn().mockResolvedValue({ indexes: [] }),
    describeIndex: vi.fn().mockResolvedValue({
      name: "test-index",
      dimension: 1536,
      metric: "cosine",
      host: "test-index-abc.svc.pinecone.io",
      status: { ready: true, state: "Ready" },
      spec: { serverless: { cloud: "aws", region: "us-east-1" } },
    }),
    index: vi.fn().mockReturnValue(mockIndex),
  };
  return client;
};

// Shared mock client for the test suite
let mockPineconeClient = createMockPineconeClient();

// Create a mock client factory that returns our mock client
const createMockClientFactory = () => {
  return async () => ({
    Pinecone: function MockPinecone() {
      // Return the shared mock client instance
      return mockPineconeClient;
    } as unknown as new () => typeof mockPineconeClient,
  });
};

describe("PineconeAdapter", () => {
  let adapter: PineconeAdapter;
  const defaultConfig: PineconeConfig = {
    apiKey: "test-api-key",
    clientFactory: createMockClientFactory(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Create a fresh mock client for each test
    mockPineconeClient = createMockPineconeClient();
    // Reset default mock return values
    mockPineconeClient.listIndexes.mockResolvedValue({ indexes: [] });
    mockPineconeClient.describeIndex.mockResolvedValue({
      name: "test-index",
      dimension: 1536,
      metric: "cosine",
      host: "test-index-abc.svc.pinecone.io",
      status: { ready: true, state: "Ready" },
      spec: { serverless: { cloud: "aws", region: "us-east-1" } },
    });
    mockPineconeClient.createIndex.mockResolvedValue(undefined);
    mockPineconeClient.deleteIndex.mockResolvedValue(undefined);
    mockPineconeClient.index.mockReturnValue(mockIndex);
    mockIndex.describeIndexStats.mockResolvedValue({
      namespaces: { "": { recordCount: 100 } },
      dimension: 1536,
      totalRecordCount: 100,
      indexFullness: 0.1,
    });
    mockIndex.namespace.mockReturnValue(mockNamespace);
    mockNamespace.upsert.mockResolvedValue({ upsertedCount: 2 });
    mockNamespace.query.mockResolvedValue({ matches: [] });
    mockNamespace.deleteOne.mockResolvedValue(undefined);
    mockNamespace.deleteMany.mockResolvedValue(undefined);
    mockNamespace.deleteAll.mockResolvedValue(undefined);
    mockNamespace.fetch.mockResolvedValue({ vectors: {} });

    adapter = new PineconeAdapter(defaultConfig);
  });

  afterEach(async () => {
    if (adapter.isInitialized()) {
      await adapter.disconnect();
    }
  });

  describe("Constructor and Configuration", () => {
    it("should create adapter with configuration", () => {
      expect(adapter).toBeInstanceOf(PineconeAdapter);
      expect(adapter.getStoreName()).toBe("pinecone");
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should accept custom configuration options", () => {
      const customConfig: PineconeConfig = {
        apiKey: "custom-api-key",
        environment: "us-east-1-aws",
        indexHost: "https://my-index.svc.pinecone.io",
        namespace: "default-ns",
        connectionTimeout: 60000,
        batchSize: 50,
      };
      const customAdapter = new PineconeAdapter(customConfig);
      expect(customAdapter.getConfig()).toEqual(customConfig);
    });

    it("should use default namespace when not specified", () => {
      const config = adapter.getConfig();
      expect(config.namespace).toBeUndefined();
    });

    it("should accept debug mode", () => {
      const debugConfig: PineconeConfig = {
        apiKey: "test-key",
        debug: true,
      };
      const debugAdapter = new PineconeAdapter(debugConfig);
      expect(debugAdapter.getConfig().debug).toBe(true);
    });
  });

  describe("Connection Management", () => {
    it("should connect successfully", async () => {
      await adapter.connect();
      expect(adapter.isInitialized()).toBe(true);
      expect(mockPineconeClient.listIndexes).toHaveBeenCalled();
    });

    it("should not reconnect if already connected", async () => {
      await adapter.connect();
      const callCount = mockPineconeClient.listIndexes.mock.calls.length;
      await adapter.connect(); // Second call should be a no-op
      expect(mockPineconeClient.listIndexes.mock.calls.length).toBe(callCount);
    });

    it("should disconnect successfully", async () => {
      await adapter.connect();
      await adapter.disconnect();
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should handle disconnect when not connected", async () => {
      await adapter.disconnect();
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should throw error on connection failure", async () => {
      mockPineconeClient.listIndexes.mockRejectedValueOnce(new Error("Invalid API key"));
      await expect(adapter.connect()).rejects.toThrow("Failed to connect to Pinecone");
    });

    it("should clear index cache on disconnect", async () => {
      await adapter.connect();
      // Access an index to populate cache
      mockPineconeClient.listIndexes.mockResolvedValueOnce({
        indexes: [{ name: "test-index", dimension: 1536, metric: "cosine", host: "test.io", status: { ready: true, state: "Ready" } }],
      });
      await adapter.listIndexes();
      await adapter.disconnect();
      // Cache should be cleared
      expect(adapter.isInitialized()).toBe(false);
    });
  });

  describe("Index Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should create a serverless index", async () => {
      await adapter.createIndex({
        name: "new-index",
        dimension: 1536,
        metric: "cosine",
      });

      expect(mockPineconeClient.createIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "new-index",
          dimension: 1536,
          metric: "cosine",
          spec: { serverless: { cloud: "aws", region: "us-east-1" } },
        }),
      );
    });

    it("should create index with custom serverless spec", async () => {
      await adapter.createIndex({
        name: "gcp-index",
        dimension: 768,
        metric: "dotProduct",
        config: {
          serverless: { cloud: "gcp", region: "us-central1" },
        },
      });

      expect(mockPineconeClient.createIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "gcp-index",
          dimension: 768,
          metric: "dotproduct",
          spec: { serverless: { cloud: "gcp", region: "us-central1" } },
        }),
      );
    });

    it("should create index with pod spec", async () => {
      await adapter.createIndex({
        name: "pod-index",
        dimension: 512,
        metric: "euclidean",
        config: {
          pod: {
            environment: "us-east-1-aws",
            podType: "p1.x1",
            pods: 1,
            replicas: 1,
          },
        },
      });

      expect(mockPineconeClient.createIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "pod-index",
          dimension: 512,
          metric: "euclidean",
          spec: expect.objectContaining({
            pod: expect.objectContaining({
              environment: "us-east-1-aws",
              podType: "p1.x1",
            }),
          }),
        }),
      );
    });

    it("should not create index if it already exists", async () => {
      mockPineconeClient.listIndexes.mockResolvedValueOnce({
        indexes: [{ name: "existing-index", dimension: 1536, metric: "cosine", host: "test.io", status: { ready: true, state: "Ready" } }],
      });

      await adapter.createIndex({
        name: "existing-index",
        dimension: 1536,
      });

      expect(mockPineconeClient.createIndex).not.toHaveBeenCalled();
    });

    it("should create index with deletion protection", async () => {
      await adapter.createIndex({
        name: "protected-index",
        dimension: 1536,
        config: {
          deletionProtection: "enabled",
        },
      });

      expect(mockPineconeClient.createIndex).toHaveBeenCalledWith(
        expect.objectContaining({
          deletionProtection: "enabled",
        }),
      );
    });

    it("should delete an index", async () => {
      mockPineconeClient.listIndexes.mockResolvedValueOnce({
        indexes: [{ name: "to-delete", dimension: 1536, metric: "cosine", host: "test.io", status: { ready: true, state: "Ready" } }],
      });

      await adapter.deleteIndex("to-delete");
      expect(mockPineconeClient.deleteIndex).toHaveBeenCalledWith("to-delete");
    });

    it("should not throw when deleting non-existent index", async () => {
      await adapter.deleteIndex("non-existent");
      expect(mockPineconeClient.deleteIndex).not.toHaveBeenCalled();
    });

    it("should list indexes", async () => {
      mockPineconeClient.listIndexes.mockResolvedValueOnce({
        indexes: [
          { name: "index1", dimension: 1536, metric: "cosine", host: "test1.io", status: { ready: true, state: "Ready" } },
          { name: "index2", dimension: 768, metric: "dotproduct", host: "test2.io", status: { ready: true, state: "Ready" } },
        ],
      });

      const indexes = await adapter.listIndexes();
      expect(indexes).toEqual(["index1", "index2"]);
    });

    it("should return empty array when no indexes exist", async () => {
      mockPineconeClient.listIndexes.mockResolvedValueOnce({ indexes: [] });
      const indexes = await adapter.listIndexes();
      expect(indexes).toEqual([]);
    });

    it("should check if index exists", async () => {
      mockPineconeClient.listIndexes.mockResolvedValueOnce({
        indexes: [{ name: "test-index", dimension: 1536, metric: "cosine", host: "test.io", status: { ready: true, state: "Ready" } }],
      });
      const exists = await adapter.indexExists("test-index");
      expect(exists).toBe(true);

      mockPineconeClient.listIndexes.mockResolvedValueOnce({ indexes: [] });
      const notExists = await adapter.indexExists("non-existent");
      expect(notExists).toBe(false);
    });
  });

  describe("Upsert Operations", () => {
    const testRecords: VectorRecord<{ category: string }>[] = [
      {
        id: "vec-1",
        vector: Array(1536).fill(0.1),
        metadata: { category: "tech" },
        content: "Test content 1",
      },
      {
        id: "vec-2",
        vector: Array(1536).fill(0.2),
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
      expect(mockNamespace.upsert).toHaveBeenCalled();
    });

    it("should upsert with namespace", async () => {
      await adapter.upsert("test-index", testRecords, {
        namespace: "custom-ns",
      });

      expect(mockIndex.namespace).toHaveBeenCalledWith("custom-ns");
      expect(mockNamespace.upsert).toHaveBeenCalled();
    });

    it("should upsert with default namespace from config", async () => {
      const configWithNs = new PineconeAdapter({
        apiKey: "test-key",
        namespace: "default-ns",
        clientFactory: createMockClientFactory(),
      });
      await configWithNs.connect();

      await configWithNs.upsert("test-index", testRecords);
      expect(mockIndex.namespace).toHaveBeenCalledWith("default-ns");
    });

    it("should validate vector dimensions", async () => {
      const invalidRecords = [
        { id: "v1", vector: Array(1536).fill(0.1) },
        { id: "v2", vector: Array(768).fill(0.1) }, // Different dimension
      ];

      await expect(
        adapter.upsert("test-index", invalidRecords),
      ).rejects.toThrow("Inconsistent vector dimensions");
    });

    it("should validate against index dimension", async () => {
      const wrongDimensionRecords = [
        { id: "v1", vector: Array(768).fill(0.1) }, // Wrong dimension (index is 1536)
      ];

      await expect(
        adapter.upsert("test-index", wrongDimensionRecords),
      ).rejects.toThrow("does not match index dimension");
    });

    it("should handle empty records array", async () => {
      const result = await adapter.upsert("test-index", []);
      expect(result.upsertedCount).toBe(0);
      expect(mockNamespace.upsert).not.toHaveBeenCalled();
    });

    it("should handle records without metadata", async () => {
      const recordsWithoutMetadata = [
        { id: "v1", vector: Array(1536).fill(0.1) },
        { id: "v2", vector: Array(1536).fill(0.2) },
      ];

      const result = await adapter.upsert("test-index", recordsWithoutMetadata);
      expect(result.upsertedCount).toBe(2);
    });

    it("should batch upserts in chunks of 100", async () => {
      const manyRecords = Array.from({ length: 250 }, (_, i) => ({
        id: `vec-${i}`,
        vector: Array(1536).fill(0.1),
      }));

      mockNamespace.upsert
        .mockResolvedValueOnce({ upsertedCount: 100 })
        .mockResolvedValueOnce({ upsertedCount: 100 })
        .mockResolvedValueOnce({ upsertedCount: 50 });

      const result = await adapter.upsert("test-index", manyRecords);

      // Should be called 3 times (100 + 100 + 50)
      expect(mockNamespace.upsert).toHaveBeenCalledTimes(3);
      expect(result.upsertedCount).toBe(250);
    });

    it("should include content in metadata", async () => {
      await adapter.upsert("test-index", testRecords);

      const upsertCall = mockNamespace.upsert.mock.calls[0][0];
      expect(upsertCall[0].metadata._content).toBe("Test content 1");
    });

    it("should respect custom batch size", async () => {
      const customAdapter = new PineconeAdapter({
        apiKey: "test-key",
        batchSize: 50,
        clientFactory: createMockClientFactory(),
      });
      await customAdapter.connect();

      const manyRecords = Array.from({ length: 150 }, (_, i) => ({
        id: `vec-${i}`,
        vector: Array(1536).fill(0.1),
      }));

      mockNamespace.upsert
        .mockResolvedValueOnce({ upsertedCount: 50 })
        .mockResolvedValueOnce({ upsertedCount: 50 })
        .mockResolvedValueOnce({ upsertedCount: 50 });

      await customAdapter.upsert("test-index", manyRecords);

      // Should be called 3 times with batch size 50
      expect(mockNamespace.upsert).toHaveBeenCalledTimes(3);
    });

    it("should cap batch size at 100", async () => {
      const largeButerAdapter = new PineconeAdapter({
        apiKey: "test-key",
        batchSize: 200, // Exceeds limit
        clientFactory: createMockClientFactory(),
      });
      await largeButerAdapter.connect();

      const records = Array.from({ length: 200 }, (_, i) => ({
        id: `vec-${i}`,
        vector: Array(1536).fill(0.1),
      }));

      mockNamespace.upsert
        .mockResolvedValueOnce({ upsertedCount: 100 })
        .mockResolvedValueOnce({ upsertedCount: 100 });

      await largeButerAdapter.upsert("test-index", records);

      // Should be called 2 times with max batch size 100
      expect(mockNamespace.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe("Query Operations", () => {
    const queryVector = Array(1536).fill(0.1);
    const mockQueryResults = {
      matches: [
        {
          id: "vec-1",
          score: 0.95,
          values: Array(1536).fill(0.1),
          metadata: { category: "tech", _content: "Test content" },
        },
        {
          id: "vec-2",
          score: 0.85,
          values: Array(1536).fill(0.2),
          metadata: { category: "science", _content: "Another content" },
        },
      ],
    };

    beforeEach(async () => {
      await adapter.connect();
      mockNamespace.query.mockResolvedValue(mockQueryResults);
    });

    it("should query vectors", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
      };

      const results = await adapter.query("test-index", options);
      expect(results.length).toBe(2);
      expect(results[0].id).toBe("vec-1");
      expect(results[0].score).toBe(0.95);
    });

    it("should query with namespace", async () => {
      await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
        namespace: "custom-ns",
      });

      expect(mockIndex.namespace).toHaveBeenCalledWith("custom-ns");
    });

    it("should include metadata when requested", async () => {
      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
        includeMetadata: true,
      });

      expect(results[0].metadata).toEqual({ category: "tech" });
      expect(results[0].content).toBe("Test content");
    });

    it("should exclude metadata when not requested", async () => {
      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
        includeMetadata: false,
      });

      expect(results[0].metadata).toBeUndefined();
    });

    it("should include vectors when requested", async () => {
      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
        includeVectors: true,
      });

      expect(results[0].vector).toBeDefined();
      expect(results[0].vector!.length).toBe(1536);
    });

    it("should exclude vectors when not requested", async () => {
      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
        includeVectors: false,
      });

      expect(results[0].vector).toBeUndefined();
    });

    it("should apply minimum score filter", async () => {
      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
        minScore: 0.9,
      });

      expect(results.length).toBe(1);
      expect(results[0].id).toBe("vec-1");
    });

    it("should pass filter to query", async () => {
      await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
        filter: { category: "tech" },
      });

      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            category: { $eq: "tech" },
          }),
        }),
      );
    });

    it("should handle empty results", async () => {
      mockNamespace.query.mockResolvedValueOnce({ matches: [] });

      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
      });

      expect(results).toEqual([]);
    });

    it("should handle missing score in match", async () => {
      mockNamespace.query.mockResolvedValueOnce({
        matches: [{ id: "vec-1" }],
      });

      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
      });

      expect(results[0].score).toBe(0);
    });
  });

  describe("Delete Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should delete by single ID", async () => {
      const result = await adapter.delete("test-index", {
        ids: ["vec-1"],
      });

      expect(mockNamespace.deleteOne).toHaveBeenCalledWith("vec-1");
      expect(result.deletedCount).toBe(1);
    });

    it("should delete by multiple IDs", async () => {
      const result = await adapter.delete("test-index", {
        ids: ["vec-1", "vec-2", "vec-3"],
      });

      expect(mockNamespace.deleteMany).toHaveBeenCalledWith(["vec-1", "vec-2", "vec-3"]);
      expect(result.deletedCount).toBe(3);
    });

    it("should delete all in namespace", async () => {
      const result = await adapter.delete("test-index", {
        deleteAll: true,
      });

      expect(mockNamespace.deleteAll).toHaveBeenCalled();
      expect(result.deletedCount).toBe(100); // From stats
    });

    it("should delete from specific namespace", async () => {
      await adapter.delete("test-index", {
        ids: ["vec-1"],
        namespace: "custom-ns",
      });

      expect(mockIndex.namespace).toHaveBeenCalledWith("custom-ns");
    });

    it("should delete by filter", async () => {
      mockNamespace.query.mockResolvedValueOnce({
        matches: [
          { id: "vec-1" },
          { id: "vec-2" },
        ],
      });

      const result = await adapter.delete("test-index", {
        filter: { category: "deprecated" },
      });

      expect(mockNamespace.query).toHaveBeenCalled();
      expect(mockNamespace.deleteMany).toHaveBeenCalledWith(["vec-1", "vec-2"]);
      expect(result.deletedCount).toBe(2);
    });

    it("should handle empty filter results", async () => {
      mockNamespace.query.mockResolvedValueOnce({ matches: [] });

      const result = await adapter.delete("test-index", {
        filter: { category: "non-existent" },
      });

      expect(mockNamespace.deleteMany).not.toHaveBeenCalled();
      expect(result.deletedCount).toBe(0);
    });
  });

  describe("Statistics", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should get index statistics", async () => {
      mockIndex.describeIndexStats.mockResolvedValueOnce({
        namespaces: {
          "": { recordCount: 500 },
          "ns1": { recordCount: 300 },
          "ns2": { recordCount: 200 },
        },
        dimension: 1536,
        totalRecordCount: 1000,
        indexFullness: 0.5,
      });

      const stats = await adapter.getStats("test-index");

      expect(stats.vectorCount).toBe(1000);
      expect(stats.dimension).toBe(1536);
      expect(stats.namespaceCount).toBe(3);
      expect(stats.metrics?.indexFullness).toBe(0.5);
    });

    it("should include host and status in metrics", async () => {
      const stats = await adapter.getStats("test-index");

      expect(stats.metrics?.host).toBe("test-index-abc.svc.pinecone.io");
      expect(stats.metrics?.status).toEqual({ ready: true, state: "Ready" });
    });

    it("should handle empty namespaces", async () => {
      mockIndex.describeIndexStats.mockResolvedValueOnce({
        dimension: 1536,
        totalRecordCount: 0,
      });

      const stats = await adapter.getStats("test-index");

      expect(stats.namespaceCount).toBe(0);
      expect(stats.vectorCount).toBe(0);
    });
  });

  describe("Health Check", () => {
    it("should return healthy status when connected", async () => {
      await adapter.connect();
      mockPineconeClient.listIndexes.mockResolvedValueOnce({
        indexes: [
          { name: "index1", dimension: 1536, metric: "cosine", host: "test.io", status: { ready: true, state: "Ready" } },
        ],
      });

      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.status).toBe("connected");
      expect(health.latencyMs).toBeGreaterThanOrEqual(0);
      expect(health.lastChecked).toBeInstanceOf(Date);
    });

    it("should return disconnected status when not connected", async () => {
      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.status).toBe("disconnected");
      expect(health.error).toBe("Client not initialized");
    });

    it("should return degraded status when indexes not ready", async () => {
      await adapter.connect();
      mockPineconeClient.listIndexes.mockResolvedValueOnce({
        indexes: [
          { name: "index1", dimension: 1536, metric: "cosine", host: "test.io", status: { ready: false, state: "Initializing" } },
        ],
      });

      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.status).toBe("degraded");
    });

    it("should return error status on exception", async () => {
      await adapter.connect();
      mockPineconeClient.listIndexes.mockRejectedValueOnce(new Error("API error"));

      const health = await adapter.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.status).toBe("error");
      expect(health.error).toContain("API error");
    });
  });

  describe("Filter Translation", () => {
    beforeEach(async () => {
      await adapter.connect();
      mockNamespace.query.mockResolvedValue({ matches: [] });
    });

    it("should translate simple equality filter", async () => {
      await adapter.query("test-index", {
        vector: Array(1536).fill(0.1),
        topK: 10,
        filter: { category: "tech" },
      });

      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: { category: { $eq: "tech" } },
        }),
      );
    });

    it("should translate $eq operator", async () => {
      await adapter.query("test-index", {
        vector: Array(1536).fill(0.1),
        topK: 10,
        filter: { category: { $eq: "tech" } },
      });

      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: { category: { $eq: "tech" } },
        }),
      );
    });

    it("should translate $ne operator", async () => {
      await adapter.query("test-index", {
        vector: Array(1536).fill(0.1),
        topK: 10,
        filter: { category: { $ne: "spam" } },
      });

      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: { category: { $ne: "spam" } },
        }),
      );
    });

    it("should translate comparison operators", async () => {
      await adapter.query("test-index", {
        vector: Array(1536).fill(0.1),
        topK: 10,
        filter: { price: { $gte: 100, $lte: 500 } },
      });

      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: { price: { $gte: 100, $lte: 500 } },
        }),
      );
    });

    it("should translate $gt operator", async () => {
      await adapter.query("test-index", {
        vector: Array(1536).fill(0.1),
        topK: 10,
        filter: { count: { $gt: 10 } },
      });

      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: { count: { $gt: 10 } },
        }),
      );
    });

    it("should translate $lt operator", async () => {
      await adapter.query("test-index", {
        vector: Array(1536).fill(0.1),
        topK: 10,
        filter: { count: { $lt: 100 } },
      });

      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: { count: { $lt: 100 } },
        }),
      );
    });

    it("should translate $in operator", async () => {
      await adapter.query("test-index", {
        vector: Array(1536).fill(0.1),
        topK: 10,
        filter: { status: { $in: ["active", "pending"] } },
      });

      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: { status: { $in: ["active", "pending"] } },
        }),
      );
    });

    it("should translate $nin operator", async () => {
      await adapter.query("test-index", {
        vector: Array(1536).fill(0.1),
        topK: 10,
        filter: { status: { $nin: ["deleted", "archived"] } },
      });

      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: { status: { $nin: ["deleted", "archived"] } },
        }),
      );
    });

    it("should translate $exists operator", async () => {
      await adapter.query("test-index", {
        vector: Array(1536).fill(0.1),
        topK: 10,
        filter: { optional_field: { $exists: true } },
      });

      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: { optional_field: { $exists: true } },
        }),
      );
    });

    it("should translate $and operator", async () => {
      await adapter.query("test-index", {
        vector: Array(1536).fill(0.1),
        topK: 10,
        filter: {
          $and: [{ category: "tech" }, { status: "active" }],
        },
      });

      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            $and: expect.arrayContaining([
              expect.objectContaining({ category: { $eq: "tech" } }),
              expect.objectContaining({ status: { $eq: "active" } }),
            ]),
          }),
        }),
      );
    });

    it("should translate $or operator", async () => {
      await adapter.query("test-index", {
        vector: Array(1536).fill(0.1),
        topK: 10,
        filter: {
          $or: [{ category: "tech" }, { category: "science" }],
        },
      });

      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            $or: expect.arrayContaining([
              expect.objectContaining({ category: { $eq: "tech" } }),
              expect.objectContaining({ category: { $eq: "science" } }),
            ]),
          }),
        }),
      );
    });

    it("should translate $not with simple equality", async () => {
      await adapter.query("test-index", {
        vector: Array(1536).fill(0.1),
        topK: 10,
        filter: {
          $not: { category: "spam" },
        },
      });

      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            category: { $ne: "spam" },
          }),
        }),
      );
    });

    it("should handle nested filters", async () => {
      await adapter.query("test-index", {
        vector: Array(1536).fill(0.1),
        topK: 10,
        filter: {
          $and: [
            { category: "tech" },
            {
              $or: [
                { status: "active" },
                { status: "pending" },
              ],
            },
          ],
        },
      });

      const callArgs = mockNamespace.query.mock.calls[0][0];
      expect(callArgs.filter.$and).toBeDefined();
      expect(callArgs.filter.$and.length).toBe(2);
    });
  });

  describe("Batch Operations", () => {
    const manyRecords = Array.from({ length: 250 }, (_, i) => ({
      id: `vec-${i}`,
      vector: Array(1536).fill(0.1),
      metadata: { index: i },
    }));

    beforeEach(async () => {
      await adapter.connect();
    });

    it("should batch upsert large datasets", async () => {
      mockNamespace.upsert
        .mockResolvedValueOnce({ upsertedCount: 100 })
        .mockResolvedValueOnce({ upsertedCount: 100 })
        .mockResolvedValueOnce({ upsertedCount: 50 });

      const result = await adapter.batchUpsert("test-index", manyRecords, {
        batchSize: 100,
      });

      expect(mockNamespace.upsert).toHaveBeenCalledTimes(3);
      expect(result.upsertedCount).toBe(250);
    });

    it("should batch delete large ID lists", async () => {
      const ids = manyRecords.map((r) => r.id);

      const result = await adapter.batchDelete("test-index", ids, {
        batchSize: 100,
      });

      // Should be called 3 times
      expect(mockNamespace.deleteMany).toHaveBeenCalledTimes(3);
      expect(result.deletedCount).toBe(250);
    });
  });

  describe("Fetch Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should fetch vectors by IDs", async () => {
      mockNamespace.fetch.mockResolvedValueOnce({
        vectors: {
          "vec-1": {
            id: "vec-1",
            values: Array(1536).fill(0.1),
            metadata: { category: "tech", _content: "Content 1" },
          },
          "vec-2": {
            id: "vec-2",
            values: Array(1536).fill(0.2),
            metadata: { category: "science" },
          },
        },
      });

      const result = await adapter.fetch("test-index", ["vec-1", "vec-2"]);

      expect(result.size).toBe(2);
      expect(result.get("vec-1")?.id).toBe("vec-1");
      expect(result.get("vec-1")?.content).toBe("Content 1");
      expect(result.get("vec-2")?.metadata).toEqual({ category: "science" });
    });

    it("should fetch from specific namespace", async () => {
      await adapter.fetch("test-index", ["vec-1"], { namespace: "custom-ns" });
      expect(mockIndex.namespace).toHaveBeenCalledWith("custom-ns");
    });

    it("should handle empty fetch result", async () => {
      mockNamespace.fetch.mockResolvedValueOnce({ vectors: {} });

      const result = await adapter.fetch("test-index", ["non-existent"]);
      expect(result.size).toBe(0);
    });
  });

  describe("Sparse Vector Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should upsert with sparse vectors", async () => {
      const sparseRecords = [
        {
          id: "vec-1",
          vector: Array(1536).fill(0.1),
          sparseVector: { indices: [0, 5, 10], values: [0.5, 0.3, 0.2] },
          metadata: { category: "tech" },
        },
      ];

      const result = await adapter.upsertSparse("test-index", sparseRecords);

      expect(result.upsertedCount).toBe(2);
      const upsertCall = mockNamespace.upsert.mock.calls[0][0];
      expect(upsertCall[0].sparseValues).toEqual({ indices: [0, 5, 10], values: [0.5, 0.3, 0.2] });
    });

    it("should query with sparse vectors", async () => {
      mockNamespace.query.mockResolvedValueOnce({
        matches: [{ id: "vec-1", score: 0.9 }],
      });

      const results = await adapter.querySparse("test-index", {
        vector: Array(1536).fill(0.1),
        sparseVector: { indices: [0, 5], values: [0.5, 0.5] },
        topK: 10,
      });

      expect(mockNamespace.query).toHaveBeenCalledWith(
        expect.objectContaining({
          sparseVector: { indices: [0, 5], values: [0.5, 0.5] },
        }),
      );
      expect(results.length).toBe(1);
    });
  });

  describe("Namespace Statistics", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should get namespace statistics", async () => {
      mockIndex.describeIndexStats.mockResolvedValueOnce({
        namespaces: {
          "": { recordCount: 500 },
          "ns1": { recordCount: 300 },
          "ns2": { recordCount: 200 },
        },
        dimension: 1536,
        totalRecordCount: 1000,
      });

      const stats = await adapter.getNamespaceStats("test-index");

      expect(stats[""]).toEqual({ recordCount: 500 });
      expect(stats["ns1"]).toEqual({ recordCount: 300 });
      expect(stats["ns2"]).toEqual({ recordCount: 200 });
    });

    it("should return empty object for no namespaces", async () => {
      mockIndex.describeIndexStats.mockResolvedValueOnce({
        dimension: 1536,
        totalRecordCount: 0,
      });

      const stats = await adapter.getNamespaceStats("test-index");
      expect(stats).toEqual({});
    });
  });

  describe("Wait for Index Ready", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should wait for index to be ready", async () => {
      mockPineconeClient.describeIndex
        .mockResolvedValueOnce({ status: { ready: false, state: "Initializing" } })
        .mockResolvedValueOnce({ status: { ready: false, state: "Initializing" } })
        .mockResolvedValueOnce({ status: { ready: true, state: "Ready" } });

      await adapter.waitForIndexReady("test-index", 30000, 100);

      expect(mockPineconeClient.describeIndex).toHaveBeenCalledTimes(3);
    });

    it("should throw on timeout", async () => {
      mockPineconeClient.describeIndex.mockResolvedValue({
        status: { ready: false, state: "Initializing" },
      });

      await expect(
        adapter.waitForIndexReady("test-index", 200, 50),
      ).rejects.toThrow("Timeout waiting for index");
    });

    it("should return immediately if already ready", async () => {
      mockPineconeClient.describeIndex.mockResolvedValueOnce({
        status: { ready: true, state: "Ready" },
      });

      await adapter.waitForIndexReady("test-index");
      expect(mockPineconeClient.describeIndex).toHaveBeenCalledTimes(1);
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
      mockPineconeClient.createIndex.mockRejectedValueOnce(
        new Error("Index creation failed"),
      );

      await expect(
        adapter.createIndex({ name: "test", dimension: 128 }),
      ).rejects.toThrow("Failed to create index");
    });

    it("should throw when deleting index fails", async () => {
      await adapter.connect();
      mockPineconeClient.listIndexes.mockResolvedValueOnce({
        indexes: [{ name: "test", dimension: 1536, metric: "cosine", host: "test.io", status: { ready: true, state: "Ready" } }],
      });
      mockPineconeClient.deleteIndex.mockRejectedValueOnce(
        new Error("Delete failed"),
      );

      await expect(adapter.deleteIndex("test")).rejects.toThrow(
        "Failed to delete index",
      );
    });

    it("should throw when upsert fails", async () => {
      await adapter.connect();
      mockNamespace.upsert.mockRejectedValueOnce(new Error("Upsert error"));

      await expect(
        adapter.upsert("test-index", [{ id: "1", vector: Array(1536).fill(0.1) }]),
      ).rejects.toThrow("Failed to upsert");
    });

    it("should throw when query fails", async () => {
      await adapter.connect();
      mockNamespace.query.mockRejectedValueOnce(new Error("Query error"));

      await expect(
        adapter.query("test-index", { vector: Array(1536).fill(0.1), topK: 10 }),
      ).rejects.toThrow("Failed to query");
    });

    it("should throw when delete fails", async () => {
      await adapter.connect();
      mockNamespace.deleteOne.mockRejectedValueOnce(new Error("Delete error"));

      await expect(
        adapter.delete("test-index", { ids: ["1"] }),
      ).rejects.toThrow("Failed to delete");
    });

    it("should throw when getting stats fails", async () => {
      await adapter.connect();
      mockIndex.describeIndexStats.mockRejectedValueOnce(
        new Error("Stats error"),
      );

      await expect(adapter.getStats("test-index")).rejects.toThrow(
        "Failed to get stats",
      );
    });

    it("should throw when fetch fails", async () => {
      await adapter.connect();
      mockNamespace.fetch.mockRejectedValueOnce(new Error("Fetch error"));

      await expect(
        adapter.fetch("test-index", ["vec-1"]),
      ).rejects.toThrow("Failed to fetch");
    });

    it("should throw when listing indexes fails", async () => {
      await adapter.connect();
      mockPineconeClient.listIndexes.mockRejectedValueOnce(new Error("List error"));

      await expect(adapter.listIndexes()).rejects.toThrow("Failed to list indexes");
    });

    it("should throw when checking index existence fails", async () => {
      await adapter.connect();
      mockPineconeClient.listIndexes.mockRejectedValueOnce(new Error("Check error"));

      await expect(adapter.indexExists("test")).rejects.toThrow("Failed to check index existence");
    });
  });

  describe("Metric Conversion", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should convert cosine metric", async () => {
      await adapter.createIndex({
        name: "cosine-index",
        dimension: 1536,
        metric: "cosine",
      });

      expect(mockPineconeClient.createIndex).toHaveBeenCalledWith(
        expect.objectContaining({ metric: "cosine" }),
      );
    });

    it("should convert euclidean metric", async () => {
      await adapter.createIndex({
        name: "euclidean-index",
        dimension: 1536,
        metric: "euclidean",
      });

      expect(mockPineconeClient.createIndex).toHaveBeenCalledWith(
        expect.objectContaining({ metric: "euclidean" }),
      );
    });

    it("should convert dotProduct metric", async () => {
      await adapter.createIndex({
        name: "dotproduct-index",
        dimension: 1536,
        metric: "dotProduct",
      });

      expect(mockPineconeClient.createIndex).toHaveBeenCalledWith(
        expect.objectContaining({ metric: "dotproduct" }),
      );
    });
  });
});

describe("PineconeAdapter Integration", () => {
  // These tests require a real Pinecone account
  // Skip if not available

  it.skip("should work with real Pinecone instance", async () => {
    const adapter = new PineconeAdapter({
      apiKey: process.env.PINECONE_API_KEY || "",
    });

    await adapter.connect();

    // Create index
    await adapter.createIndex({
      name: "integration-test",
      dimension: 128,
      metric: "cosine",
      config: {
        serverless: { cloud: "aws", region: "us-east-1" },
      },
    });

    // Wait for index to be ready
    await adapter.waitForIndexReady("integration-test", 120000);

    // Insert vectors
    const records = Array.from({ length: 10 }, (_, i) => ({
      id: `vec-${i}`,
      vector: Array.from({ length: 128 }, () => Math.random()),
      metadata: { index: i },
      content: `Content ${i}`,
    }));

    await adapter.upsert("integration-test", records);

    // Wait a bit for vectors to be indexed
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Query
    const queryVector = records[0].vector;
    const results = await adapter.query("integration-test", {
      vector: queryVector,
      topK: 5,
      includeMetadata: true,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("vec-0"); // Should be the same vector

    // Cleanup
    await adapter.deleteIndex("integration-test");
    await adapter.disconnect();
  });
});
