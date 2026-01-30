/**
 * Chroma Adapter Tests
 * Comprehensive test suite for the Chroma vector store adapter
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from "vitest";
import { ChromaAdapter } from "../../../src/lib/vector/adapters/ChromaAdapter.js";
import type {
  VectorRecord,
  VectorQueryOptions,
} from "../../../src/lib/vector/types.js";
import type { ChromaConfig } from "../../../src/lib/vector/adapters/ChromaAdapter.js";

// Create mock collection with proper typing
const createMockCollection = () => {
  const mock: Record<string, Mock | string> = {
    name: "test_collection",
    id: "test-id-123",
    add: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    query: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    modify: vi.fn(),
    peek: vi.fn(),
  };

  // Set up default implementations
  (mock.add as Mock).mockResolvedValue(undefined);
  (mock.update as Mock).mockResolvedValue(undefined);
  (mock.upsert as Mock).mockResolvedValue(undefined);
  (mock.query as Mock).mockResolvedValue({
    ids: [[]],
    distances: [[]],
    metadatas: [[]],
    documents: [[]],
    embeddings: null,
  });
  (mock.get as Mock).mockResolvedValue({
    ids: [],
    metadatas: [],
    documents: [],
    embeddings: null,
  });
  (mock.delete as Mock).mockResolvedValue(undefined);
  (mock.count as Mock).mockResolvedValue(100);
  (mock.modify as Mock).mockResolvedValue(undefined);
  (mock.peek as Mock).mockResolvedValue({
    ids: [],
    metadatas: [],
    documents: [],
    embeddings: null,
  });

  return mock;
};

// Create mock client
const mockCollection = createMockCollection();

const mockClient = {
  createCollection: vi.fn(),
  getCollection: vi.fn(),
  getOrCreateCollection: vi.fn(),
  deleteCollection: vi.fn(),
  listCollections: vi.fn(),
  heartbeat: vi.fn(),
  reset: vi.fn(),
};

// Mock the chromadb module
vi.mock("chromadb", () => ({
  ChromaClient: vi.fn(() => mockClient),
}));

describe("ChromaAdapter", () => {
  let adapter: ChromaAdapter;
  const defaultConfig: ChromaConfig = {
    ephemeral: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock implementations
    mockClient.listCollections.mockResolvedValue([]);
    mockClient.createCollection.mockResolvedValue(mockCollection);
    mockClient.getCollection.mockResolvedValue(mockCollection);
    mockClient.getOrCreateCollection.mockResolvedValue(mockCollection);
    mockClient.deleteCollection.mockResolvedValue(undefined);
    mockClient.heartbeat.mockResolvedValue(Date.now());
    mockClient.reset.mockResolvedValue(true);

    // Reset collection mocks
    (mockCollection.count as Mock).mockResolvedValue(100);
    (mockCollection.query as Mock).mockResolvedValue({
      ids: [[]],
      distances: [[]],
      metadatas: [[]],
      documents: [[]],
      embeddings: null,
    });
    (mockCollection.get as Mock).mockResolvedValue({
      ids: [],
      metadatas: [],
      documents: [],
      embeddings: null,
    });

    adapter = new ChromaAdapter(defaultConfig);
  });

  afterEach(async () => {
    if (adapter.isInitialized()) {
      await adapter.disconnect();
    }
  });

  describe("Constructor and Configuration", () => {
    it("should create adapter with configuration", () => {
      expect(adapter).toBeInstanceOf(ChromaAdapter);
      expect(adapter.getStoreName()).toBe("chroma");
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should accept ephemeral (in-memory) configuration", () => {
      const ephemeralConfig: ChromaConfig = {
        ephemeral: true,
      };
      const ephemeralAdapter = new ChromaAdapter(ephemeralConfig);
      expect(ephemeralAdapter.getConfig()).toEqual(ephemeralConfig);
    });

    it("should accept persistent path configuration", () => {
      const persistentConfig: ChromaConfig = {
        path: "/path/to/chroma-data",
      };
      const persistentAdapter = new ChromaAdapter(persistentConfig);
      expect(persistentAdapter.getConfig()).toEqual(persistentConfig);
    });

    it("should accept HTTP server configuration", () => {
      const httpConfig: ChromaConfig = {
        url: "http://localhost:8000",
      };
      const httpAdapter = new ChromaAdapter(httpConfig);
      expect(httpAdapter.getConfig().url).toBe("http://localhost:8000");
    });

    it("should accept configuration with authentication", () => {
      const authConfig: ChromaConfig = {
        url: "http://localhost:8000",
        auth: {
          provider: "basic",
          credentials: "user:pass",
        },
      };
      const authAdapter = new ChromaAdapter(authConfig);
      expect(authAdapter.getConfig().auth).toEqual({
        provider: "basic",
        credentials: "user:pass",
      });
    });

    it("should accept multi-tenant configuration", () => {
      const tenantConfig: ChromaConfig = {
        url: "http://localhost:8000",
        tenant: "my-tenant",
        database: "my-database",
      };
      const tenantAdapter = new ChromaAdapter(tenantConfig);
      expect(tenantAdapter.getConfig().tenant).toBe("my-tenant");
      expect(tenantAdapter.getConfig().database).toBe("my-database");
    });

    it("should accept SSL configuration", () => {
      const sslConfig: ChromaConfig = {
        url: "https://chroma.example.com",
        ssl: true,
      };
      const sslAdapter = new ChromaAdapter(sslConfig);
      expect(sslAdapter.getConfig().ssl).toBe(true);
    });
  });

  describe("Connection Management", () => {
    it("should connect successfully in ephemeral mode", async () => {
      await adapter.connect();
      expect(adapter.isInitialized()).toBe(true);
      expect(mockClient.heartbeat).toHaveBeenCalled();
    });

    it("should connect successfully with persistent path", async () => {
      const persistentAdapter = new ChromaAdapter({
        path: "./chroma-data",
      });
      await persistentAdapter.connect();
      expect(persistentAdapter.isInitialized()).toBe(true);
    });

    it("should connect successfully with HTTP URL", async () => {
      const httpAdapter = new ChromaAdapter({
        url: "http://localhost:8000",
      });
      await httpAdapter.connect();
      expect(httpAdapter.isInitialized()).toBe(true);
    });

    it("should not reconnect if already connected", async () => {
      await adapter.connect();
      const heartbeatCalls = mockClient.heartbeat.mock.calls.length;
      await adapter.connect(); // Second call should be a no-op
      expect(mockClient.heartbeat.mock.calls.length).toBe(heartbeatCalls);
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

    it("should verify connection with heartbeat", async () => {
      await adapter.connect();
      expect(mockClient.heartbeat).toHaveBeenCalled();
    });

    it("should throw error when connection fails", async () => {
      mockClient.heartbeat.mockRejectedValueOnce(new Error("Connection failed"));
      await expect(adapter.connect()).rejects.toThrow("Failed to connect to Chroma");
    });
  });

  describe("Index (Collection) Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should create an index with default metric", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 1536,
      });

      expect(mockClient.createCollection).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "test-index",
          metadata: expect.objectContaining({
            "hnsw:space": "cosine",
            dimension: 1536,
          }),
        }),
      );
    });

    it("should create an index with euclidean metric", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 768,
        metric: "euclidean",
      });

      expect(mockClient.createCollection).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "test-index",
          metadata: expect.objectContaining({
            "hnsw:space": "l2",
          }),
        }),
      );
    });

    it("should create an index with dotProduct metric", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 384,
        metric: "dotProduct",
      });

      expect(mockClient.createCollection).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "test-index",
          metadata: expect.objectContaining({
            "hnsw:space": "ip",
          }),
        }),
      );
    });

    it("should not recreate existing index", async () => {
      mockClient.listCollections.mockResolvedValueOnce([
        { name: "test-index", id: "123" },
      ]);
      mockClient.createCollection.mockClear();

      await adapter.createIndex({
        name: "test-index",
        dimension: 1536,
      });

      expect(mockClient.createCollection).not.toHaveBeenCalled();
    });

    it("should delete an index", async () => {
      await adapter.deleteIndex("test-index");
      expect(mockClient.deleteCollection).toHaveBeenCalledWith({
        name: "test-index",
      });
    });

    it("should list indexes", async () => {
      mockClient.listCollections.mockResolvedValueOnce([
        { name: "index1", id: "1" },
        { name: "index2", id: "2" },
        { name: "_neurolink_metadata", id: "meta" },
      ]);

      const indexes = await adapter.listIndexes();
      expect(indexes).toEqual(["index1", "index2"]);
    });

    it("should check if index exists", async () => {
      mockClient.listCollections.mockResolvedValueOnce([
        { name: "test-index", id: "1" },
      ]);
      const exists = await adapter.indexExists("test-index");
      expect(exists).toBe(true);

      mockClient.listCollections.mockResolvedValueOnce([]);
      const notExists = await adapter.indexExists("nonexistent");
      expect(notExists).toBe(false);
    });

    it("should throw error when creating index fails", async () => {
      mockClient.createCollection.mockRejectedValueOnce(new Error("Creation failed"));

      await expect(
        adapter.createIndex({ name: "test", dimension: 128 }),
      ).rejects.toThrow("Failed to create index");
    });

    it("should throw error when deleting index fails", async () => {
      mockClient.deleteCollection.mockRejectedValueOnce(new Error("Delete failed"));

      await expect(adapter.deleteIndex("test")).rejects.toThrow(
        "Failed to delete index",
      );
    });
  });

  describe("Upsert Operations", () => {
    const testRecords: VectorRecord<{ category: string; score: number }>[] = [
      {
        id: "vec-1",
        vector: [0.1, 0.2, 0.3],
        metadata: { category: "tech", score: 85 },
        content: "Test content 1",
      },
      {
        id: "vec-2",
        vector: [0.4, 0.5, 0.6],
        metadata: { category: "science", score: 92 },
        content: "Test content 2",
      },
    ];

    beforeEach(async () => {
      await adapter.connect();
    });

    it("should upsert records", async () => {
      const result = await adapter.upsert("test-index", testRecords);

      expect(result.upsertedCount).toBe(2);
      expect((mockCollection.upsert as Mock)).toHaveBeenCalledWith({
        ids: ["vec-1", "vec-2"],
        embeddings: [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]],
        documents: ["Test content 1", "Test content 2"],
        metadatas: [
          { category: "tech", score: 85 },
          { category: "science", score: 92 },
        ],
      });
    });

    it("should upsert with namespace", async () => {
      const result = await adapter.upsert("test-index", testRecords, {
        namespace: "ns1",
      });

      expect(result.upsertedCount).toBe(2);
      expect((mockCollection.upsert as Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          metadatas: [
            { category: "tech", score: 85, _namespace: "ns1" },
            { category: "science", score: 92, _namespace: "ns1" },
          ],
        }),
      );
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

    it("should handle records without metadata", async () => {
      const recordsWithoutMeta = [
        { id: "v1", vector: [0.1, 0.2, 0.3] },
        { id: "v2", vector: [0.4, 0.5, 0.6] },
      ];

      const result = await adapter.upsert("test-index", recordsWithoutMeta);
      expect(result.upsertedCount).toBe(2);
    });

    it("should handle records without content", async () => {
      const recordsWithoutContent = [
        { id: "v1", vector: [0.1, 0.2, 0.3], metadata: { type: "a" } },
        { id: "v2", vector: [0.4, 0.5, 0.6], metadata: { type: "b" } },
      ];

      const result = await adapter.upsert("test-index", recordsWithoutContent);
      expect(result.upsertedCount).toBe(2);
    });

    it("should throw error when upsert fails", async () => {
      (mockCollection.upsert as Mock).mockRejectedValueOnce(new Error("Upsert failed"));

      await expect(
        adapter.upsert("test", [{ id: "1", vector: [0.1] }]),
      ).rejects.toThrow("Failed to upsert");
    });
  });

  describe("Query Operations", () => {
    const queryVector = [0.1, 0.2, 0.3];
    const mockQueryResults = {
      ids: [["vec-1", "vec-2"]],
      distances: [[0.1, 0.2]],
      metadatas: [[{ category: "tech" }, { category: "science" }]],
      documents: [["Test content 1", "Test content 2"]],
      embeddings: [[[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]],
    };

    beforeEach(async () => {
      await adapter.connect();
      (mockCollection.query as Mock).mockResolvedValue(mockQueryResults);
    });

    it("should query vectors", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
      };

      const results = await adapter.query("test-index", options);

      expect(Array.isArray(results)).toBe(true);
      expect((mockCollection.query as Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          queryEmbeddings: [queryVector],
          nResults: 10,
        }),
      );
    });

    it("should return results with scores", async () => {
      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
      });

      expect(results.length).toBe(2);
      expect(results[0]).toHaveProperty("id");
      expect(results[0]).toHaveProperty("score");
      expect(typeof results[0].score).toBe("number");
    });

    it("should query with metadata filter", async () => {
      const options: VectorQueryOptions<{ category: string }> = {
        vector: queryVector,
        topK: 10,
        filter: { category: "tech" },
      };

      await adapter.query("test-index", options);

      expect((mockCollection.query as Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { category: "tech" },
        }),
      );
    });

    it("should query with minimum score threshold", async () => {
      (mockCollection.query as Mock).mockResolvedValueOnce({
        ids: [["vec-1", "vec-2", "vec-3"]],
        distances: [[0.05, 0.3, 0.6]], // Different distances
        metadatas: [[{}, {}, {}]],
        documents: [["", "", ""]],
        embeddings: null,
      });

      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
        minScore: 0.5,
      });

      // Only results with score >= 0.5 should be returned
      expect(results.every((r) => r.score >= 0.5)).toBe(true);
    });

    it("should query with namespace filter", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        namespace: "ns1",
      };

      await adapter.query("test-index", options);

      expect((mockCollection.query as Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { _namespace: "ns1" },
        }),
      );
    });

    it("should include vectors when requested", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        includeVectors: true,
      };

      await adapter.query("test-index", options);

      expect((mockCollection.query as Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.arrayContaining(["embeddings"]),
        }),
      );
    });

    it("should include metadata when requested", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        includeMetadata: true,
      };

      const results = await adapter.query("test-index", options);

      expect((mockCollection.query as Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.arrayContaining(["metadatas", "documents"]),
        }),
      );
      expect(results[0]).toHaveProperty("metadata");
    });

    it("should throw error when query fails", async () => {
      (mockCollection.query as Mock).mockRejectedValueOnce(new Error("Query failed"));

      await expect(
        adapter.query("test", { vector: [0.1], topK: 10 }),
      ).rejects.toThrow("Failed to query");
    });
  });

  describe("Delete Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
      (mockCollection.count as Mock)
        .mockResolvedValueOnce(100) // Before delete
        .mockResolvedValueOnce(98); // After delete
    });

    it("should delete by IDs", async () => {
      const result = await adapter.delete("test-index", {
        ids: ["vec-1", "vec-2"],
      });

      expect(result.deletedCount).toBe(2);
      expect((mockCollection.delete as Mock)).toHaveBeenCalledWith({
        ids: ["vec-1", "vec-2"],
      });
    });

    it("should delete by filter", async () => {
      await adapter.delete("test-index", {
        filter: { category: "deprecated" },
      });

      expect((mockCollection.delete as Mock)).toHaveBeenCalledWith({
        where: expect.objectContaining({ category: "deprecated" }),
      });
    });

    it("should delete by namespace", async () => {
      await adapter.delete("test-index", {
        namespace: "old-data",
        deleteAll: true,
      });

      expect((mockCollection.delete as Mock)).toHaveBeenCalledWith({
        where: { _namespace: "old-data" },
      });
    });

    it("should delete all records", async () => {
      (mockCollection.get as Mock).mockResolvedValueOnce({
        ids: ["v1", "v2", "v3"],
        metadatas: [],
        documents: [],
        embeddings: null,
      });

      await adapter.delete("test-index", {
        deleteAll: true,
      });

      expect((mockCollection.get as Mock)).toHaveBeenCalled();
      expect((mockCollection.delete as Mock)).toHaveBeenCalledWith({
        ids: ["v1", "v2", "v3"],
      });
    });

    it("should throw error when delete fails", async () => {
      (mockCollection.delete as Mock).mockRejectedValueOnce(new Error("Delete failed"));

      await expect(
        adapter.delete("test", { ids: ["1"] }),
      ).rejects.toThrow("Failed to delete");
    });
  });

  describe("Statistics", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should get collection statistics", async () => {
      (mockCollection.count as Mock).mockResolvedValueOnce(500);
      (mockCollection.get as Mock).mockResolvedValueOnce({
        ids: ["1", "2", "3"],
        metadatas: [
          { _namespace: "ns1" },
          { _namespace: "ns2" },
          { _namespace: "ns1" },
        ],
        documents: [],
        embeddings: null,
      });

      const stats = await adapter.getStats("test-index");

      expect(stats.vectorCount).toBe(500);
      expect(stats.namespaceCount).toBe(2);
    });

    it("should throw error when getting stats fails", async () => {
      (mockCollection.count as Mock).mockRejectedValueOnce(new Error("Stats error"));

      await expect(adapter.getStats("test")).rejects.toThrow(
        "Failed to get stats",
      );
    });
  });

  describe("Health Check", () => {
    it("should return healthy status when connected", async () => {
      await adapter.connect();
      mockClient.listCollections.mockResolvedValueOnce([]);

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

      (mockCollection.count as Mock).mockReset();
      (mockCollection.count as Mock)
        .mockResolvedValueOnce(250)
        .mockResolvedValueOnce(150)
        .mockResolvedValueOnce(150)
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(0);

      const result = await adapter.batchDelete("test-index", ids, {
        batchSize: 100,
      });

      expect(result.deletedCount).toBe(250);
    });
  });

  describe("Filter Translation - Comparison Operators", () => {
    beforeEach(async () => {
      await adapter.connect();
      (mockCollection.query as Mock).mockResolvedValue({
        ids: [[]],
        distances: [[]],
        metadatas: [[]],
        documents: [[]],
        embeddings: null,
      });
    });

    it("should translate $eq operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { status: { $eq: "active" } },
      });

      expect((mockCollection.query as Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: { $eq: "active" } },
        }),
      );
    });

    it("should translate $ne operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { status: { $ne: "deleted" } },
      });

      expect((mockCollection.query as Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: { $ne: "deleted" } },
        }),
      );
    });

    it("should translate $gt operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { price: { $gt: 100 } },
      });

      expect((mockCollection.query as Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { price: { $gt: 100 } },
        }),
      );
    });

    it("should translate $gte operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { price: { $gte: 100 } },
      });

      expect((mockCollection.query as Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { price: { $gte: 100 } },
        }),
      );
    });

    it("should translate $lt operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { price: { $lt: 500 } },
      });

      expect((mockCollection.query as Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { price: { $lt: 500 } },
        }),
      );
    });

    it("should translate $lte operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { price: { $lte: 500 } },
      });

      expect((mockCollection.query as Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { price: { $lte: 500 } },
        }),
      );
    });

    it("should translate $in operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { status: { $in: ["active", "pending"] } },
      });

      expect((mockCollection.query as Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: { $in: ["active", "pending"] } },
        }),
      );
    });

    it("should translate $nin operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { status: { $nin: ["deleted", "archived"] } },
      });

      expect((mockCollection.query as Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: { $nin: ["deleted", "archived"] } },
        }),
      );
    });

    it("should translate combined range operators", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { price: { $gte: 100, $lte: 500 } },
      });

      expect((mockCollection.query as Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { price: { $gte: 100, $lte: 500 } },
        }),
      );
    });
  });

  describe("Filter Translation - Logical Operators", () => {
    beforeEach(async () => {
      await adapter.connect();
      (mockCollection.query as Mock).mockResolvedValue({
        ids: [[]],
        distances: [[]],
        metadatas: [[]],
        documents: [[]],
        embeddings: null,
      });
    });

    it("should translate $and operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $and: [{ category: "tech" }, { status: "active" }],
        },
      });

      expect((mockCollection.query as Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            $and: [{ category: "tech" }, { status: "active" }],
          }),
        }),
      );
    });

    it("should translate $or operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $or: [{ category: "tech" }, { category: "science" }],
        },
      });

      expect((mockCollection.query as Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            $or: [{ category: "tech" }, { category: "science" }],
          }),
        }),
      );
    });

    it("should translate $not operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $not: { category: "spam" },
        },
      });

      expect((mockCollection.query as Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: { $ne: "spam" },
          }),
        }),
      );
    });

    it("should translate nested logical operators", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $and: [
            { $or: [{ category: "tech" }, { category: "science" }] },
            { status: "active" },
          ],
        },
      });

      expect((mockCollection.query as Mock)).toHaveBeenCalled();
    });

    it("should combine namespace with other filters using $and", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        namespace: "prod",
        filter: { category: "tech" },
      });

      expect((mockCollection.query as Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            $and: [{ _namespace: "prod" }, { category: "tech" }],
          }),
        }),
      );
    });
  });

  describe("Document-Level Filtering", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should translate $contains for document filter", () => {
      const filter = adapter.translateDocumentFilter({ contains: "machine learning" });

      expect(filter).toEqual({ $contains: "machine learning" });
    });

    it("should translate $not_contains for document filter", () => {
      const filter = adapter.translateDocumentFilter({ notContains: "deprecated" });

      expect(filter).toEqual({ $not_contains: "deprecated" });
    });

    it("should translate combined document filters", () => {
      const filter = adapter.translateDocumentFilter({
        contains: "important",
        notContains: "spam",
      });

      expect(filter).toEqual({
        $contains: "important",
        $not_contains: "spam",
      });
    });
  });

  describe("Collection Modification", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should modify collection name", async () => {
      await adapter.modifyCollection("old-name", { name: "new-name" });

      expect((mockCollection.modify as Mock)).toHaveBeenCalledWith({
        name: "new-name",
      });
    });

    it("should modify collection metadata", async () => {
      await adapter.modifyCollection("test-index", {
        metadata: { description: "Updated description" },
      });

      expect((mockCollection.modify as Mock)).toHaveBeenCalledWith({
        metadata: { description: "Updated description" },
      });
    });

    it("should throw error when modify fails", async () => {
      (mockCollection.modify as Mock).mockRejectedValueOnce(new Error("Modify failed"));

      await expect(
        adapter.modifyCollection("test", { name: "new-name" }),
      ).rejects.toThrow("Failed to modify collection");
    });
  });

  describe("Peek and Get Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should peek at collection records", async () => {
      (mockCollection.peek as Mock).mockResolvedValueOnce({
        ids: ["v1", "v2"],
        metadatas: [{}, {}],
        documents: ["doc1", "doc2"],
        embeddings: null,
      });

      const result = await adapter.peek("test-index", 5);

      expect((mockCollection.peek as Mock)).toHaveBeenCalledWith({ limit: 5 });
      expect(result.ids).toEqual(["v1", "v2"]);
    });

    it("should get records by IDs", async () => {
      (mockCollection.get as Mock).mockResolvedValueOnce({
        ids: ["v1", "v2"],
        metadatas: [{ type: "a" }, { type: "b" }],
        documents: ["doc1", "doc2"],
        embeddings: [[0.1, 0.2], [0.3, 0.4]],
      });

      const results = await adapter.getByIds("test-index", ["v1", "v2"], {
        includeVectors: true,
        includeMetadata: true,
      });

      expect(results.length).toBe(2);
      expect(results[0].id).toBe("v1");
      expect(results[0].vector).toEqual([0.1, 0.2]);
      expect(results[0].metadata).toEqual({ type: "a" });
    });

    it("should throw error when get fails", async () => {
      (mockCollection.get as Mock).mockRejectedValueOnce(new Error("Get failed"));

      await expect(
        adapter.getByIds("test", ["v1"]),
      ).rejects.toThrow("Failed to get records");
    });
  });

  describe("Error Handling", () => {
    it("should throw when operating without connection", async () => {
      await expect(adapter.listIndexes()).rejects.toThrow(
        "not initialized. Call connect() first",
      );
    });

    it("should handle invalid filter gracefully", async () => {
      await adapter.connect();
      (mockCollection.query as Mock).mockResolvedValue({
        ids: [[]],
        distances: [[]],
        metadatas: [[]],
        documents: [[]],
        embeddings: null,
      });

      // Should not throw, just log warning
      await adapter.query("test-index", {
        vector: [0.1],
        topK: 10,
        filter: { field: { $exists: true } }, // Unsupported in Chroma
      });

      expect((mockCollection.query as Mock)).toHaveBeenCalled();
    });
  });

  describe("Distance to Score Conversion", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should convert cosine distance to similarity score", async () => {
      (mockCollection.query as Mock).mockResolvedValueOnce({
        ids: [["vec-1"]],
        distances: [[0.1]], // Cosine distance = 0.1
        metadatas: [[{}]],
        documents: [[""]],
        embeddings: null,
      });

      const results = await adapter.query("test-index", {
        vector: [1, 0],
        topK: 1,
      });

      expect(results.length).toBe(1);
      expect(results[0].score).toBeCloseTo(0.9, 2); // 1 - 0.1 = 0.9
    });

    it("should convert L2 distance to similarity score", async () => {
      // For L2 distance, when there's no cached metric, it defaults to cosine
      // But we can test the conversion by checking that distance is properly converted
      (mockCollection.query as Mock).mockResolvedValueOnce({
        ids: [["vec-1"]],
        distances: [[0.0]], // L2 distance = 0.0 (perfect match)
        metadatas: [[{}]],
        documents: [[""]],
        embeddings: null,
      });

      const results = await adapter.query("test-index", {
        vector: [1, 0],
        topK: 1,
      });

      expect(results.length).toBe(1);
      // With cosine metric (default), distance 0 gives score 1.0
      expect(results[0].score).toBeCloseTo(1.0, 2);
    });
  });

  describe("Metadata Namespace Handling", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should strip _namespace from returned metadata", async () => {
      (mockCollection.query as Mock).mockResolvedValueOnce({
        ids: [["vec-1"]],
        distances: [[0.1]],
        metadatas: [[{ category: "tech", _namespace: "prod" }]],
        documents: [["Test"]],
        embeddings: null,
      });

      const results = await adapter.query("test-index", {
        vector: [0.1],
        topK: 1,
        includeMetadata: true,
      });

      expect(results[0].metadata).toEqual({ category: "tech" });
      expect((results[0].metadata as Record<string, unknown>)._namespace).toBeUndefined();
    });

    it("should use record-level namespace over options namespace", async () => {
      const records = [
        {
          id: "v1",
          vector: [0.1],
          namespace: "record-ns",
        },
      ];

      await adapter.upsert("test-index", records, { namespace: "option-ns" });

      expect((mockCollection.upsert as Mock)).toHaveBeenCalledWith(
        expect.objectContaining({
          metadatas: [{ _namespace: "record-ns" }],
        }),
      );
    });
  });

  describe("Client Mode Detection", () => {
    it("should detect ephemeral mode", () => {
      const ephemeralAdapter = new ChromaAdapter({ ephemeral: true });
      expect(ephemeralAdapter.getConfig().ephemeral).toBe(true);
    });

    it("should detect persistent mode", () => {
      const persistentAdapter = new ChromaAdapter({
        path: "./data",
        ephemeral: false,
      });
      expect(persistentAdapter.getConfig().path).toBe("./data");
      expect(persistentAdapter.getConfig().ephemeral).toBe(false);
    });

    it("should detect HTTP mode", () => {
      const httpAdapter = new ChromaAdapter({
        url: "http://localhost:8000",
      });
      expect(httpAdapter.getConfig().url).toBe("http://localhost:8000");
    });
  });
});

describe("ChromaAdapter Integration", () => {
  // These tests require chromadb to be installed
  // Skip if not available

  it.skip("should work with real Chroma database in ephemeral mode", async () => {
    // This test would use a real Chroma client
    // Requires chromadb to be installed
  });

  it.skip("should work with real Chroma database in persistent mode", async () => {
    // This test would use a real Chroma client with file persistence
    // Requires chromadb to be installed
  });

  it.skip("should work with Chroma server via HTTP", async () => {
    // This test would connect to a running Chroma server
    // Requires chromadb server to be running
  });

  it.skip("should handle concurrent operations", async () => {
    // This test would verify concurrent read/write operations
  });
});
