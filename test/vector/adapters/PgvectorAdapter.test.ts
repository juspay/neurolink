/**
 * pgvector (PostgreSQL) Adapter Tests
 * Comprehensive test suite for the pgvector vector store adapter
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from "vitest";
import type {
  VectorRecord,
  VectorQueryOptions,
} from "../../../src/lib/vector/types.js";
import type { PgvectorConfig } from "../../../src/lib/vector/adapters/PgvectorAdapter.js";

// Create mock PostgreSQL pool and client
const createMockQueryResult = (
  rows: unknown[] = [],
  rowCount: number | null = null,
  fields: Array<{ name: string }> = [],
) => ({
  rows,
  rowCount,
  fields,
});

const createMockPool = () => ({
  query: vi.fn().mockResolvedValue(createMockQueryResult([])),
  connect: vi.fn().mockResolvedValue({
    query: vi.fn().mockResolvedValue(createMockQueryResult([])),
    release: vi.fn(),
  }),
  end: vi.fn().mockResolvedValue(undefined),
});

let mockPool = createMockPool();

// Mock the pg module before importing the adapter
vi.mock("pg", () => ({
  default: {
    Pool: vi.fn(() => mockPool),
  },
  Pool: vi.fn(() => mockPool),
}));

// Import after mocking
import { PgvectorAdapter } from "../../../src/lib/vector/adapters/PgvectorAdapter.js";

describe("PgvectorAdapter", () => {
  let adapter: PgvectorAdapter;
  const defaultConfig: PgvectorConfig = {
    host: "localhost",
    port: 5432,
    user: "postgres",
    password: "secret",
    database: "vectors",
    schema: "public",
    poolSize: 10,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset mock pool for each test
    mockPool = createMockPool();

    // Re-configure the mocked Pool to return fresh mock
    const pg = await import("pg");
    ((pg.default?.Pool || pg.Pool) as Mock).mockImplementation(() => mockPool);

    adapter = new PgvectorAdapter(defaultConfig);
  });

  afterEach(async () => {
    if (adapter.isInitialized()) {
      await adapter.disconnect();
    }
  });

  describe("Constructor and Configuration", () => {
    it("should create adapter with configuration", () => {
      expect(adapter).toBeInstanceOf(PgvectorAdapter);
      expect(adapter.getStoreName()).toBe("pgvector");
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should accept host/port configuration", () => {
      const hostConfig: PgvectorConfig = {
        host: "db.example.com",
        port: 5433,
        user: "vectoruser",
        password: "pass123",
        database: "vectordb",
      };
      const customAdapter = new PgvectorAdapter(hostConfig);
      expect(customAdapter.getConfig()).toEqual(hostConfig);
    });

    it("should accept connection string configuration", () => {
      const connStringConfig: PgvectorConfig = {
        connectionString: "postgresql://user:pass@localhost:5432/vectors",
      };
      const customAdapter = new PgvectorAdapter(connStringConfig);
      expect(customAdapter.getConfig().connectionString).toBe(
        "postgresql://user:pass@localhost:5432/vectors",
      );
    });

    it("should accept schema configuration", () => {
      const schemaConfig: PgvectorConfig = {
        ...defaultConfig,
        schema: "vector_store",
      };
      const customAdapter = new PgvectorAdapter(schemaConfig);
      expect(customAdapter.getConfig().schema).toBe("vector_store");
    });

    it("should accept SSL configuration", () => {
      const sslConfig: PgvectorConfig = {
        ...defaultConfig,
        ssl: {
          rejectUnauthorized: true,
          ca: "-----BEGIN CERTIFICATE-----",
        },
      };
      const customAdapter = new PgvectorAdapter(sslConfig);
      expect(customAdapter.getConfig().ssl).toEqual({
        rejectUnauthorized: true,
        ca: "-----BEGIN CERTIFICATE-----",
      });
    });

    it("should accept pool size configuration", () => {
      const poolConfig: PgvectorConfig = {
        ...defaultConfig,
        poolSize: 25,
      };
      const customAdapter = new PgvectorAdapter(poolConfig);
      expect(customAdapter.getConfig().poolSize).toBe(25);
    });

    it("should accept timeout configurations", () => {
      const timeoutConfig: PgvectorConfig = {
        ...defaultConfig,
        connectionTimeout: 60000,
        idleTimeout: 30000,
        statementTimeout: 60000,
      };
      const customAdapter = new PgvectorAdapter(timeoutConfig);
      expect(customAdapter.getConfig().connectionTimeout).toBe(60000);
      expect(customAdapter.getConfig().idleTimeout).toBe(30000);
      expect(customAdapter.getConfig().statementTimeout).toBe(60000);
    });
  });

  describe("Connection Management", () => {
    beforeEach(() => {
      // Mock pgvector extension check and metadata table
      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([{ "1": 1 }], 1)) // Extension exists
        .mockResolvedValueOnce(createMockQueryResult([])) // Create metadata table
        .mockResolvedValueOnce(createMockQueryResult([])); // Load index metadata
    });

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
      expect(mockPool.end).toHaveBeenCalled();
    });

    it("should handle disconnect when not connected", async () => {
      // Should not throw
      await adapter.disconnect();
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should check for pgvector extension during connection", async () => {
      await adapter.connect();
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("pg_extension"),
      );
    });

    it("should create pgvector extension if not exists", async () => {
      // Create a fresh adapter and reset mocks completely
      vi.clearAllMocks();
      mockPool = createMockPool();
      const freshAdapter = new PgvectorAdapter(defaultConfig);

      // Mock extension not found, then create extension succeeds
      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([], 0)) // Extension not found
        .mockResolvedValueOnce(createMockQueryResult([])) // Create extension
        .mockResolvedValueOnce(createMockQueryResult([])) // Create metadata table
        .mockResolvedValueOnce(createMockQueryResult([])); // Load index metadata

      await freshAdapter.connect();

      // Check that CREATE EXTENSION was called
      const createExtensionCalls = mockPool.query.mock.calls.filter(
        (call) =>
          typeof call[0] === "string" &&
          call[0].includes("CREATE EXTENSION IF NOT EXISTS vector"),
      );
      expect(createExtensionCalls.length).toBe(1);

      await freshAdapter.disconnect();
    });
  });

  describe("Index Operations", () => {
    beforeEach(async () => {
      // Mock connect sequence
      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([{ "1": 1 }], 1))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([]));

      await adapter.connect();
    });

    it("should create an index with HNSW", async () => {
      mockPool.query.mockResolvedValue(createMockQueryResult([]));

      await adapter.createIndex({
        name: "test-index",
        dimension: 1536,
        metric: "cosine",
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("CREATE TABLE IF NOT EXISTS"),
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("vector(1536)"),
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("USING hnsw"),
      );
    });

    it("should create index with IVFFlat", async () => {
      mockPool.query.mockResolvedValue(createMockQueryResult([]));

      await adapter.createIndex({
        name: "ivf-index",
        dimension: 768,
        metric: "euclidean",
        config: { indexType: "ivfflat", lists: 200 },
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("USING ivfflat"),
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("lists = 200"),
      );
    });

    it("should create index without vector index (indexType: none)", async () => {
      mockPool.query.mockResolvedValue(createMockQueryResult([]));

      await adapter.createIndex({
        name: "no-index",
        dimension: 384,
        config: { indexType: "none" },
      });

      // Should not create vector index
      const calls = mockPool.query.mock.calls;
      const indexCalls = calls.filter(
        (call) =>
          typeof call[0] === "string" &&
          (call[0].includes("USING hnsw") || call[0].includes("USING ivfflat")),
      );
      expect(indexCalls.length).toBe(0);
    });

    it("should create index with custom HNSW parameters", async () => {
      mockPool.query.mockResolvedValue(createMockQueryResult([]));

      await adapter.createIndex({
        name: "custom-hnsw",
        dimension: 512,
        metric: "dotProduct",
        config: { indexType: "hnsw", m: 32, efConstruction: 128 },
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("m = 32"),
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("ef_construction = 128"),
      );
    });

    it("should create GIN index on metadata", async () => {
      mockPool.query.mockResolvedValue(createMockQueryResult([]));

      await adapter.createIndex({
        name: "metadata-index",
        dimension: 1536,
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("USING GIN (metadata)"),
      );
    });

    it("should delete an index", async () => {
      mockPool.query.mockResolvedValue(createMockQueryResult([], 1));

      await adapter.deleteIndex("test-index");

      // Check DROP TABLE was called
      const dropCalls = mockPool.query.mock.calls.filter(
        (call) =>
          typeof call[0] === "string" && call[0].includes("DROP TABLE IF EXISTS"),
      );
      expect(dropCalls.length).toBeGreaterThan(0);
    });

    it("should list indexes", async () => {
      mockPool.query.mockResolvedValueOnce(
        createMockQueryResult([{ name: "index1" }, { name: "index2" }]),
      );

      const indexes = await adapter.listIndexes();
      expect(indexes).toEqual(["index1", "index2"]);
    });

    it("should check if index exists (true)", async () => {
      mockPool.query.mockResolvedValueOnce(createMockQueryResult([{ "1": 1 }], 1));

      const exists = await adapter.indexExists("test-index");
      expect(exists).toBe(true);
    });

    it("should check if index exists (false)", async () => {
      mockPool.query.mockResolvedValueOnce(createMockQueryResult([], 0));

      const exists = await adapter.indexExists("nonexistent");
      expect(exists).toBe(false);
    });

    it("should use correct operator class for cosine metric", async () => {
      mockPool.query.mockResolvedValue(createMockQueryResult([]));

      await adapter.createIndex({
        name: "cosine-index",
        dimension: 128,
        metric: "cosine",
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("vector_cosine_ops"),
      );
    });

    it("should use correct operator class for euclidean metric", async () => {
      mockPool.query.mockResolvedValue(createMockQueryResult([]));

      await adapter.createIndex({
        name: "l2-index",
        dimension: 128,
        metric: "euclidean",
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("vector_l2_ops"),
      );
    });

    it("should use correct operator class for dotProduct metric", async () => {
      mockPool.query.mockResolvedValue(createMockQueryResult([]));

      await adapter.createIndex({
        name: "ip-index",
        dimension: 128,
        metric: "dotProduct",
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("vector_ip_ops"),
      );
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
      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([{ "1": 1 }], 1))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([]));
      await adapter.connect();
    });

    it("should upsert records using INSERT ON CONFLICT", async () => {
      mockPool.query.mockResolvedValue(createMockQueryResult([], 2));

      const result = await adapter.upsert("test-index", testRecords);

      expect(result.upsertedCount).toBe(2);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO"),
        expect.any(Array),
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("ON CONFLICT (id) DO UPDATE"),
        expect.any(Array),
      );
    });

    it("should upsert with namespace", async () => {
      mockPool.query.mockResolvedValue(createMockQueryResult([], 2));

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
      mockPool.query.mockResolvedValue(createMockQueryResult([], 2));

      const recordsWithoutMetadata: VectorRecord[] = [
        { id: "v1", vector: [0.1, 0.2, 0.3] },
        { id: "v2", vector: [0.4, 0.5, 0.6] },
      ];

      const result = await adapter.upsert("test-index", recordsWithoutMetadata);
      expect(result.upsertedCount).toBe(2);
    });

    it("should batch large upserts", async () => {
      mockPool.query.mockResolvedValue(createMockQueryResult([], 100));

      const manyRecords = Array.from({ length: 250 }, (_, i) => ({
        id: `vec-${i}`,
        vector: [0.1, 0.2, 0.3],
        metadata: { index: i },
      }));

      const result = await adapter.upsert("test-index", manyRecords, {
        batchSize: 100,
      });

      expect(result.upsertedCount).toBe(250);
      // Should be called 3 times for batches of 100, 100, 50
      const insertCalls = mockPool.query.mock.calls.filter(
        (call) =>
          typeof call[0] === "string" && call[0].includes("INSERT INTO"),
      );
      expect(insertCalls.length).toBe(3);
    });

    it("should include vector as proper pgvector format", async () => {
      mockPool.query.mockResolvedValue(createMockQueryResult([], 1));

      await adapter.upsert("test-index", [testRecords[0]]);

      // Check that vector is formatted correctly
      const insertCall = mockPool.query.mock.calls.find(
        (call) =>
          typeof call[0] === "string" && call[0].includes("INSERT INTO"),
      );
      expect(insertCall).toBeDefined();
      expect(insertCall![1]).toContainEqual("[0.1,0.2,0.3]");
    });
  });

  describe("Query Operations", () => {
    const queryVector = [0.1, 0.2, 0.3];
    const mockRows = [
      {
        id: "vec-1",
        vector_data: "[0.1, 0.2, 0.3]",
        metadata: { category: "tech" },
        content: "Test content",
        score: 0.95,
        distance: 0.05,
      },
    ];

    beforeEach(async () => {
      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([{ "1": 1 }], 1))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([]));
      await adapter.connect();
    });

    it("should query vectors with cosine distance", async () => {
      mockPool.query.mockResolvedValueOnce(createMockQueryResult(mockRows));

      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
      };

      const results = await adapter.query("test-index", options);

      expect(Array.isArray(results)).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("<=>"),
        expect.any(Array),
      );
    });

    it("should query with metadata filter", async () => {
      mockPool.query.mockResolvedValueOnce(createMockQueryResult(mockRows));

      const options: VectorQueryOptions<{ category: string }> = {
        vector: queryVector,
        topK: 10,
        filter: { category: "tech" },
      };

      const results = await adapter.query("test-index", options);

      expect(Array.isArray(results)).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("@>"),
        expect.any(Array),
      );
    });

    it("should query with minimum score", async () => {
      mockPool.query.mockResolvedValueOnce(createMockQueryResult(mockRows));

      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        minScore: 0.5,
      };

      const results = await adapter.query("test-index", options);
      expect(Array.isArray(results)).toBe(true);
    });

    it("should query with namespace filter", async () => {
      mockPool.query.mockResolvedValueOnce(createMockQueryResult(mockRows));

      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        namespace: "ns1",
      };

      const results = await adapter.query("test-index", options);

      expect(Array.isArray(results)).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("namespace ="),
        expect.any(Array),
      );
    });

    it("should include vectors when requested", async () => {
      mockPool.query.mockResolvedValueOnce(createMockQueryResult(mockRows));

      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        includeVectors: true,
      };

      const results = await adapter.query("test-index", options);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("vector::text AS vector_data"),
        expect.any(Array),
      );
      if (results.length > 0) {
        expect(results[0].vector).toBeDefined();
      }
    });

    it("should include metadata when requested", async () => {
      mockPool.query.mockResolvedValueOnce(createMockQueryResult(mockRows));

      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        includeMetadata: true,
      };

      const results = await adapter.query("test-index", options);
      expect(Array.isArray(results)).toBe(true);
    });

    it("should return results with scores", async () => {
      // First call is for index metadata lookup, second is for the actual query
      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([])) // loadIndexMetadata returns no rows
        .mockResolvedValueOnce(createMockQueryResult(mockRows)); // actual query

      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
      });

      expect(results.length).toBe(1);
      expect(results[0].score).toBe(0.95);
      expect(results[0].id).toBe("vec-1");
    });

    it("should use L2 distance operator for euclidean queries", async () => {
      // Create index with euclidean metric
      mockPool.query.mockResolvedValue(createMockQueryResult([]));
      await adapter.createIndex({
        name: "euclidean-index",
        dimension: 3,
        metric: "euclidean",
      });

      mockPool.query.mockResolvedValueOnce(createMockQueryResult(mockRows));

      await adapter.query("euclidean-index", {
        vector: queryVector,
        topK: 1,
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("<->"),
        expect.any(Array),
      );
    });

    it("should use inner product operator for dotProduct queries", async () => {
      // Create index with dotProduct metric
      mockPool.query.mockResolvedValue(createMockQueryResult([]));
      await adapter.createIndex({
        name: "ip-index",
        dimension: 3,
        metric: "dotProduct",
      });

      mockPool.query.mockResolvedValueOnce(createMockQueryResult(mockRows));

      await adapter.query("ip-index", {
        vector: queryVector,
        topK: 1,
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("<#>"),
        expect.any(Array),
      );
    });
  });

  describe("Delete Operations", () => {
    beforeEach(async () => {
      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([{ "1": 1 }], 1))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([]));
      await adapter.connect();
    });

    it("should delete by IDs", async () => {
      mockPool.query.mockResolvedValueOnce(createMockQueryResult([], 2));

      const result = await adapter.delete("test-index", {
        ids: ["vec-1", "vec-2"],
      });

      expect(result.deletedCount).toBe(2);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM"),
        ["vec-1", "vec-2"],
      );
    });

    it("should delete by filter", async () => {
      mockPool.query.mockResolvedValueOnce(createMockQueryResult([], 5));

      const result = await adapter.delete("test-index", {
        filter: { category: "deprecated" },
      });

      expect(result.deletedCount).toBe(5);
    });

    it("should delete by namespace", async () => {
      mockPool.query.mockResolvedValueOnce(createMockQueryResult([], 10));

      const result = await adapter.delete("test-index", {
        namespace: "old-data",
        deleteAll: true,
      });

      expect(result.deletedCount).toBe(10);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE namespace ="),
        ["old-data"],
      );
    });

    it("should delete all records", async () => {
      mockPool.query.mockResolvedValueOnce(createMockQueryResult([], 100));

      const result = await adapter.delete("test-index", {
        deleteAll: true,
      });

      expect(result.deletedCount).toBe(100);
    });

    it("should return 0 when no delete criteria specified", async () => {
      const result = await adapter.delete("test-index", {});
      expect(result.deletedCount).toBe(0);
    });
  });

  describe("Statistics", () => {
    beforeEach(async () => {
      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([{ "1": 1 }], 1))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([]));
      await adapter.connect();
    });

    it("should get index statistics", async () => {
      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([{ count: "100" }])) // vector count
        .mockResolvedValueOnce(createMockQueryResult([{ count: "3" }])) // namespace count
        .mockResolvedValueOnce(createMockQueryResult([{ size: "1048576" }])); // table size

      const stats = await adapter.getStats("test-index");

      expect(stats.vectorCount).toBe(100);
      expect(stats.namespaceCount).toBe(3);
      expect(stats.indexSize).toBe(1048576);
    });

    it("should include pgvectorEnabled in metrics", async () => {
      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([{ count: "50" }]))
        .mockResolvedValueOnce(createMockQueryResult([{ count: "2" }]))
        .mockResolvedValueOnce(createMockQueryResult([{ size: "512000" }]));

      const stats = await adapter.getStats("test-index");

      expect(stats.metrics).toBeDefined();
      expect(stats.metrics!.pgvectorEnabled).toBeDefined();
    });
  });

  describe("Health Check", () => {
    it("should return healthy status when connected", async () => {
      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([{ "1": 1 }], 1))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([{ name: "index1" }]));

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
      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([{ "1": 1 }], 1))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([]));
      await adapter.connect();
    });

    it("should batch upsert large datasets", async () => {
      mockPool.query.mockResolvedValue(createMockQueryResult([], 100));

      const result = await adapter.batchUpsert("test-index", manyRecords, {
        batchSize: 100,
      });

      expect(result.upsertedCount).toBe(250);
    });

    it("should batch delete large ID lists", async () => {
      const ids = manyRecords.map((r) => r.id);
      mockPool.query.mockResolvedValue(createMockQueryResult([], 100));

      const result = await adapter.batchDelete("test-index", ids, {
        batchSize: 100,
      });

      // 3 batches
      expect(result.deletedCount).toBe(300);
    });
  });

  describe("Filter Translation", () => {
    beforeEach(async () => {
      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([{ "1": 1 }], 1))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([]));
      await adapter.connect();
      mockPool.query.mockResolvedValue(createMockQueryResult([]));
    });

    it("should translate simple equality filter using JSONB containment", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { category: "tech" },
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("metadata @>"),
        expect.arrayContaining([expect.stringContaining("category")]),
      );
    });

    it("should translate $eq operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { status: { $eq: "active" } },
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("metadata->>'status' ="),
        expect.any(Array),
      );
    });

    it("should translate $ne operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { status: { $ne: "deleted" } },
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("metadata->>'status' !="),
        expect.any(Array),
      );
    });

    it("should translate comparison operators ($gt, $gte, $lt, $lte)", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { price: { $gte: 100, $lte: 500 } },
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringMatching(/::numeric.*>=|>=.*::numeric/),
        expect.any(Array),
      );
    });

    it("should translate $in operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { status: { $in: ["active", "pending"] } },
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("IN ("),
        expect.any(Array),
      );
    });

    it("should translate $nin operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { status: { $nin: ["deleted", "archived"] } },
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("NOT IN ("),
        expect.any(Array),
      );
    });

    it("should translate $exists operator (true)", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { optional_field: { $exists: true } },
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("metadata ? 'optional_field'"),
        expect.any(Array),
      );
    });

    it("should translate $exists operator (false)", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { optional_field: { $exists: false } },
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("NOT (metadata ? 'optional_field')"),
        expect.any(Array),
      );
    });

    it("should translate $contains operator (ILIKE)", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { title: { $contains: "vector" } },
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("ILIKE"),
        expect.any(Array),
      );
    });

    it("should translate $startsWith operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { title: { $startsWith: "intro" } },
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("ILIKE"),
        expect.arrayContaining(["intro%"]),
      );
    });

    it("should translate $endsWith operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { title: { $endsWith: "tutorial" } },
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("ILIKE"),
        expect.arrayContaining(["%tutorial"]),
      );
    });

    it("should translate logical $and operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $and: [{ category: "tech" }, { status: "active" }],
        },
      });

      expect(mockPool.query).toHaveBeenCalled();
    });

    it("should translate logical $or operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $or: [{ category: "tech" }, { category: "science" }],
        },
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining(" OR "),
        expect.any(Array),
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

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("NOT ("),
        expect.any(Array),
      );
    });
  });

  describe("Error Handling", () => {
    it("should throw when operating without connection", async () => {
      await expect(adapter.listIndexes()).rejects.toThrow(
        "not initialized. Call connect() first",
      );
    });

    it("should throw when connection fails", async () => {
      // Create fresh adapter with a mock pool that rejects on query
      vi.clearAllMocks();
      const failingPool = createMockPool();
      failingPool.query.mockRejectedValue(new Error("Connection refused"));
      mockPool = failingPool;

      // Re-configure the mock to use the failing pool
      const pg = await import("pg");
      ((pg.default?.Pool || pg.Pool) as Mock).mockImplementation(() => failingPool);

      const freshAdapter = new PgvectorAdapter(defaultConfig);

      await expect(freshAdapter.connect()).rejects.toThrow("Failed to connect");
    });

    it("should throw when creating index fails", async () => {
      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([{ "1": 1 }], 1))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockRejectedValueOnce(new Error("SQL error"));

      await adapter.connect();

      await expect(
        adapter.createIndex({ name: "test", dimension: 128 }),
      ).rejects.toThrow("Failed to create index");
    });

    it("should throw when deleting index fails", async () => {
      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([{ "1": 1 }], 1))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockRejectedValueOnce(new Error("SQL error"));

      await adapter.connect();

      await expect(adapter.deleteIndex("test")).rejects.toThrow(
        "Failed to delete index",
      );
    });

    it("should throw when upsert fails", async () => {
      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([{ "1": 1 }], 1))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockRejectedValueOnce(new Error("Insert error"));

      await adapter.connect();

      await expect(
        adapter.upsert("test", [{ id: "1", vector: [0.1] }]),
      ).rejects.toThrow("Failed to upsert");
    });

    it("should throw when query fails", async () => {
      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([{ "1": 1 }], 1))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockRejectedValueOnce(new Error("Query error"));

      await adapter.connect();

      await expect(
        adapter.query("test", { vector: [0.1], topK: 10 }),
      ).rejects.toThrow("Failed to query");
    });

    it("should throw when delete fails", async () => {
      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([{ "1": 1 }], 1))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockRejectedValueOnce(new Error("Delete error"));

      await adapter.connect();

      await expect(
        adapter.delete("test", { ids: ["1"] }),
      ).rejects.toThrow("Failed to delete");
    });

    it("should throw when getting stats fails", async () => {
      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([{ "1": 1 }], 1))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockRejectedValueOnce(new Error("Stats error"));

      await adapter.connect();

      await expect(adapter.getStats("test")).rejects.toThrow(
        "Failed to get stats",
      );
    });

    it("should throw when disconnect fails", async () => {
      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([{ "1": 1 }], 1))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([]));
      mockPool.end.mockRejectedValueOnce(new Error("Close error"));

      await adapter.connect();

      await expect(adapter.disconnect()).rejects.toThrow(
        "Failed to disconnect",
      );
    });
  });

  describe("Vector Parsing", () => {
    beforeEach(async () => {
      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([{ "1": 1 }], 1))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([]));
      await adapter.connect();
    });

    it("should parse PostgreSQL vector format", async () => {
      // First is loadIndexMetadata, second is actual query
      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([])) // loadIndexMetadata
        .mockResolvedValueOnce(
          createMockQueryResult([
            {
              id: "vec-1",
              vector_data: "[0.1,0.2,0.3]",
              metadata: null,
              content: null,
              score: 0.95,
              distance: 0.05,
            },
          ]),
        );

      const results = await adapter.query("test-index", {
        vector: [0.1, 0.2, 0.3],
        topK: 1,
        includeVectors: true,
      });

      expect(results.length).toBe(1);
      expect(results[0].vector).toEqual([0.1, 0.2, 0.3]);
    });

    it("should handle metadata as object (JSONB)", async () => {
      // First is loadIndexMetadata, second is actual query
      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([])) // loadIndexMetadata
        .mockResolvedValueOnce(
          createMockQueryResult([
            {
              id: "vec-1",
              metadata: { category: "tech", count: 42 },
              content: null,
              score: 0.9,
              distance: 0.1,
            },
          ]),
        );

      const results = await adapter.query("test-index", {
        vector: [0.1, 0.2, 0.3],
        topK: 1,
        includeMetadata: true,
      });

      expect(results.length).toBe(1);
      expect(results[0].metadata).toEqual({ category: "tech", count: 42 });
    });

    it("should handle metadata as string", async () => {
      // First is loadIndexMetadata, second is actual query
      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([])) // loadIndexMetadata
        .mockResolvedValueOnce(
          createMockQueryResult([
            {
              id: "vec-1",
              metadata: '{"category":"tech"}',
              content: null,
              score: 0.9,
              distance: 0.1,
            },
          ]),
        );

      const results = await adapter.query("test-index", {
        vector: [0.1, 0.2, 0.3],
        topK: 1,
        includeMetadata: true,
      });

      expect(results.length).toBe(1);
      expect(results[0].metadata).toEqual({ category: "tech" });
    });
  });

  describe("Index Tuning", () => {
    beforeEach(async () => {
      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([{ "1": 1 }], 1))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([]));
      await adapter.connect();
    });

    it("should set HNSW ef_search parameter", async () => {
      mockPool.query.mockResolvedValue(createMockQueryResult([]));

      await adapter.setHnswEfSearch(100);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("SET hnsw.ef_search = 100"),
      );
    });

    it("should set IVFFlat probes parameter", async () => {
      mockPool.query.mockResolvedValue(createMockQueryResult([]));

      await adapter.setIvfflatProbes(20);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("SET ivfflat.probes = 20"),
      );
    });
  });

  describe("Table Name Sanitization", () => {
    beforeEach(async () => {
      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([{ "1": 1 }], 1))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([]));
      await adapter.connect();
      mockPool.query.mockResolvedValue(createMockQueryResult([]));
    });

    it("should sanitize table names with special characters", async () => {
      await adapter.createIndex({
        name: "test-index-with-dashes",
        dimension: 128,
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("test_index_with_dashes"),
      );
    });

    it("should handle table names with spaces", async () => {
      await adapter.createIndex({
        name: "test index with spaces",
        dimension: 128,
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("test_index_with_spaces"),
      );
    });

    it("should use schema prefix for table names", async () => {
      const schemaAdapter = new PgvectorAdapter({
        ...defaultConfig,
        schema: "vector_store",
      });

      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([{ "1": 1 }], 1))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([]));
      await schemaAdapter.connect();
      mockPool.query.mockResolvedValue(createMockQueryResult([]));

      await schemaAdapter.createIndex({
        name: "my-index",
        dimension: 128,
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('vector_store."my_index"'),
      );

      await schemaAdapter.disconnect();
    });
  });

  describe("Schema Support", () => {
    it("should use public schema by default", async () => {
      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([{ "1": 1 }], 1))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValue(createMockQueryResult([]));

      await adapter.connect();
      await adapter.createIndex({ name: "test", dimension: 128 });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('public."test"'),
      );
    });

    it("should use custom schema when specified", async () => {
      const customSchemaAdapter = new PgvectorAdapter({
        ...defaultConfig,
        schema: "my_vectors",
      });

      mockPool.query
        .mockResolvedValueOnce(createMockQueryResult([{ "1": 1 }], 1))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValueOnce(createMockQueryResult([]))
        .mockResolvedValue(createMockQueryResult([]));

      await customSchemaAdapter.connect();
      await customSchemaAdapter.createIndex({ name: "test", dimension: 128 });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('my_vectors."test"'),
      );

      await customSchemaAdapter.disconnect();
    });
  });
});

describe("PgvectorAdapter Integration", () => {
  // These tests require a real PostgreSQL database with pgvector extension
  // Skip if not available

  it.skip("should work with real PostgreSQL database", async () => {
    // This test would use a real PostgreSQL database
    // Requires pg to be installed and PostgreSQL + pgvector available
  });

  it.skip("should perform vector similarity search", async () => {
    // This test would verify actual vector search functionality
    // Requires pg + pgvector
  });
});
