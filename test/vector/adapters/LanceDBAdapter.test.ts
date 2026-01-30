/**
 * LanceDB Adapter Tests
 * Comprehensive test suite for the LanceDB vector store adapter
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from "vitest";
import { LanceDBAdapter } from "../../../src/lib/vector/adapters/LanceDBAdapter.js";
import type {
  VectorRecord,
  VectorQueryOptions,
  LanceDBConfig,
} from "../../../src/lib/vector/types.js";

// Create mock functions with proper typing
const createMockVectorQuery = () => {
  const mock: Record<string, Mock> = {
    limit: vi.fn(),
    where: vi.fn(),
    select: vi.fn(),
    distanceType: vi.fn(),
    nprobes: vi.fn(),
    refineFactor: vi.fn(),
    toArray: vi.fn(),
  };

  // Set up chaining
  mock.limit.mockImplementation(() => mock);
  mock.where.mockImplementation(() => mock);
  mock.select.mockImplementation(() => mock);
  mock.distanceType.mockImplementation(() => mock);
  mock.nprobes.mockImplementation(() => mock);
  mock.refineFactor.mockImplementation(() => mock);
  mock.toArray.mockResolvedValue([]);

  return mock;
};

const createMockQuery = () => {
  const mock: Record<string, Mock> = {
    where: vi.fn(),
    select: vi.fn(),
    limit: vi.fn(),
    toArray: vi.fn(),
  };

  // Set up chaining
  mock.where.mockImplementation(() => mock);
  mock.select.mockImplementation(() => mock);
  mock.limit.mockImplementation(() => mock);
  mock.toArray.mockResolvedValue([]);

  return mock;
};

// Create fresh mock instances for each test
let mockVectorQuery: ReturnType<typeof createMockVectorQuery>;
let mockQuery: ReturnType<typeof createMockQuery>;

const mockTable = {
  name: "test_table",
  add: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
  countRows: vi.fn(),
  search: vi.fn(),
  vectorSearch: vi.fn(),
  query: vi.fn(),
  schema: vi.fn(),
  close: vi.fn(),
};

const mockConnection = {
  createTable: vi.fn(),
  createEmptyTable: vi.fn(),
  openTable: vi.fn(),
  dropTable: vi.fn(),
  tableNames: vi.fn(),
  close: vi.fn(),
  isOpen: vi.fn(),
};

// Mock the @lancedb/lancedb module
vi.mock("@lancedb/lancedb", () => ({
  connect: vi.fn(() => Promise.resolve(mockConnection)),
}));

describe("LanceDBAdapter", () => {
  let adapter: LanceDBAdapter;
  const defaultConfig: LanceDBConfig = {
    uri: "./test-data/lancedb",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create fresh mock instances
    mockVectorQuery = createMockVectorQuery();
    mockQuery = createMockQuery();

    // Reset mock implementations
    mockConnection.tableNames.mockResolvedValue([]);
    mockConnection.createTable.mockResolvedValue(mockTable);
    mockConnection.openTable.mockResolvedValue(mockTable);
    mockConnection.dropTable.mockResolvedValue(undefined);
    mockConnection.isOpen.mockReturnValue(true);

    mockTable.vectorSearch.mockReturnValue(mockVectorQuery);
    mockTable.query.mockReturnValue(mockQuery);
    mockTable.countRows.mockResolvedValue(100);
    mockTable.add.mockResolvedValue(undefined);
    mockTable.delete.mockResolvedValue(undefined);

    adapter = new LanceDBAdapter(defaultConfig);
  });

  afterEach(async () => {
    if (adapter.isInitialized()) {
      await adapter.disconnect();
    }
  });

  describe("Constructor and Configuration", () => {
    it("should create adapter with configuration", () => {
      expect(adapter).toBeInstanceOf(LanceDBAdapter);
      expect(adapter.getStoreName()).toBe("lance");
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should accept local path configuration", () => {
      const localConfig: LanceDBConfig = {
        uri: "/path/to/local/lancedb",
      };
      const localAdapter = new LanceDBAdapter(localConfig);
      expect(localAdapter.getConfig()).toEqual(localConfig);
    });

    it("should accept S3 configuration", () => {
      const s3Config: LanceDBConfig = {
        uri: "s3://my-bucket/vectors",
        storageOptions: {
          awsAccessKeyId: "AKIA...",
          awsSecretAccessKey: "secret",
          region: "us-west-2",
        },
      };
      const s3Adapter = new LanceDBAdapter(s3Config);
      expect(s3Adapter.getConfig()).toEqual(s3Config);
    });

    it("should accept S3 with DynamoDB configuration for concurrent writes", () => {
      const s3DdbConfig: LanceDBConfig = {
        uri: "s3+ddb://my-bucket/vectors?ddbTableName=my-table",
        storageOptions: {
          awsAccessKeyId: "AKIA...",
          awsSecretAccessKey: "secret",
          region: "us-west-2",
        },
      };
      const s3DdbAdapter = new LanceDBAdapter(s3DdbConfig);
      expect(s3DdbAdapter.getConfig()).toEqual(s3DdbConfig);
    });

    it("should accept Azure configuration", () => {
      const azureConfig: LanceDBConfig = {
        uri: "az://my-container/vectors",
        storageOptions: {
          azureStorageAccountName: "myaccount",
          azureStorageAccountKey: "key123",
        },
      };
      const azureAdapter = new LanceDBAdapter(azureConfig);
      expect(azureAdapter.getConfig()).toEqual(azureConfig);
    });

    it("should accept GCS configuration", () => {
      const gcsConfig: LanceDBConfig = {
        uri: "gs://my-bucket/vectors",
        storageOptions: {
          serviceAccountKey: '{"type":"service_account",...}',
        },
      };
      const gcsAdapter = new LanceDBAdapter(gcsConfig);
      expect(gcsAdapter.getConfig()).toEqual(gcsConfig);
    });

    it("should accept read consistency option", () => {
      const consistentConfig: LanceDBConfig = {
        uri: "./data/lancedb",
        readConsistency: "strong",
      };
      const consistentAdapter = new LanceDBAdapter(consistentConfig);
      expect(consistentAdapter.getConfig().readConsistency).toBe("strong");
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

    it("should close connection on disconnect", async () => {
      await adapter.connect();
      await adapter.disconnect();
      expect(mockConnection.close).toHaveBeenCalled();
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

      expect(mockConnection.createTable).toHaveBeenCalled();
    });

    it("should create index with default metric", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 768,
      });

      expect(mockConnection.createTable).toHaveBeenCalled();
    });

    it("should not recreate existing index", async () => {
      // Clear existing calls from connect()
      mockConnection.createTable.mockClear();

      mockConnection.tableNames.mockResolvedValueOnce([
        "idx_test_index",
        "_neurolink_metadata",
      ]);

      await adapter.createIndex({
        name: "test-index",
        dimension: 1536,
      });

      // Should not create the index table (but may create metadata table)
      const calls = mockConnection.createTable.mock.calls;
      const indexTableCreated = calls.some(
        (call) => call[0] === "idx_test_index"
      );
      expect(indexTableCreated).toBe(false);
    });

    it("should delete an index", async () => {
      await adapter.deleteIndex("test-index");
      expect(mockConnection.dropTable).toHaveBeenCalled();
    });

    it("should list indexes", async () => {
      mockConnection.tableNames.mockResolvedValueOnce([
        "idx_index1",
        "idx_index2",
        "_neurolink_metadata",
      ]);

      const indexes = await adapter.listIndexes();
      expect(indexes).toEqual(["index1", "index2"]);
    });

    it("should check if index exists", async () => {
      mockConnection.tableNames.mockResolvedValueOnce(["idx_test_index"]);
      const exists = await adapter.indexExists("test-index");
      expect(exists).toBe(true);

      mockConnection.tableNames.mockResolvedValueOnce([]);
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
      expect(mockTable.add).toHaveBeenCalled();
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

    it("should delete existing records before adding for upsert behavior", async () => {
      await adapter.upsert("test-index", testRecords);
      expect(mockTable.delete).toHaveBeenCalled();
      expect(mockTable.add).toHaveBeenCalled();
    });
  });

  describe("Query Operations", () => {
    const queryVector = [0.1, 0.2, 0.3];
    const mockSearchResults = [
      {
        id: "vec-1",
        vector: [0.1, 0.2, 0.3],
        metadata: JSON.stringify({ category: "tech" }),
        content: "Test content",
        _distance: 0.1,
      },
    ];

    beforeEach(async () => {
      await adapter.connect();
      mockVectorQuery.toArray.mockResolvedValue(mockSearchResults);
    });

    it("should query vectors", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
      };

      const results = await adapter.query("test-index", options);
      expect(Array.isArray(results)).toBe(true);
      expect(mockTable.vectorSearch).toHaveBeenCalledWith(queryVector);
    });

    it("should query with metadata filter", async () => {
      const options: VectorQueryOptions<{ category: string }> = {
        vector: queryVector,
        topK: 10,
        filter: { category: "tech" },
      };

      const results = await adapter.query("test-index", options);
      expect(Array.isArray(results)).toBe(true);
      expect(mockVectorQuery.where).toHaveBeenCalled();
    });

    it("should query with minimum score", async () => {
      mockVectorQuery.toArray.mockResolvedValueOnce([
        { id: "vec-1", _distance: 0.1, metadata: "{}", content: "" },
        { id: "vec-2", _distance: 0.9, metadata: "{}", content: "" }, // Will be filtered out
      ]);

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
      expect(mockVectorQuery.where).toHaveBeenCalled();
    });

    it("should include vectors when requested", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        includeVectors: true,
      };

      const results = await adapter.query("test-index", options);
      expect(Array.isArray(results)).toBe(true);
      expect(mockVectorQuery.select).toHaveBeenCalled();
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

    it("should use correct distance type for cosine metric", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
      };

      await adapter.query("test-index", options);
      expect(mockVectorQuery.distanceType).toHaveBeenCalledWith("cosine");
    });
  });

  describe("Delete Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
      mockTable.countRows
        .mockResolvedValueOnce(100) // Before delete
        .mockResolvedValueOnce(98);  // After delete
    });

    it("should delete by IDs", async () => {
      const result = await adapter.delete("test-index", {
        ids: ["vec-1", "vec-2"],
      });
      expect(result.deletedCount).toBe(2);
      expect(mockTable.delete).toHaveBeenCalled();
    });

    it("should delete by filter", async () => {
      await adapter.delete("test-index", {
        filter: { category: "deprecated" },
      });
      expect(mockTable.delete).toHaveBeenCalled();
    });

    it("should delete by namespace", async () => {
      await adapter.delete("test-index", {
        namespace: "old-data",
        deleteAll: true,
      });
      expect(mockTable.delete).toHaveBeenCalled();
    });

    it("should delete all records", async () => {
      await adapter.delete("test-index", {
        deleteAll: true,
      });
      expect(mockTable.delete).toHaveBeenCalled();
    });
  });

  describe("Statistics", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should get index statistics", async () => {
      mockTable.countRows.mockResolvedValueOnce(100);
      mockQuery.toArray.mockResolvedValueOnce([
        { namespace: "ns1" },
        { namespace: "ns2" },
        { namespace: "ns1" },
      ]);

      const stats = await adapter.getStats("test-index");
      expect(stats.vectorCount).toBe(100);
    });
  });

  describe("Health Check", () => {
    it("should return healthy status when connected", async () => {
      await adapter.connect();
      mockConnection.tableNames.mockResolvedValueOnce(["idx_index1"]);

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

      // Reset and set up countRows for batch delete
      mockTable.countRows.mockReset();
      mockTable.countRows
        .mockResolvedValueOnce(250) // First batch before
        .mockResolvedValueOnce(150) // First batch after (100 deleted)
        .mockResolvedValueOnce(150) // Second batch before
        .mockResolvedValueOnce(50)  // Second batch after (100 deleted)
        .mockResolvedValueOnce(50)  // Third batch before
        .mockResolvedValueOnce(0);  // Third batch after (50 deleted)

      const result = await adapter.batchDelete("test-index", ids, {
        batchSize: 100,
      });
      expect(result.deletedCount).toBe(250);
    });
  });

  describe("Filter Translation", () => {
    beforeEach(async () => {
      await adapter.connect();
      mockVectorQuery.toArray.mockResolvedValue([]);
    });

    it("should translate simple equality filter", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { category: "tech" },
      });

      expect(mockVectorQuery.where).toHaveBeenCalled();
    });

    it("should translate comparison operators", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: { price: { $gte: 100, $lte: 500 } },
      });

      expect(mockVectorQuery.where).toHaveBeenCalled();
    });

    it("should translate logical $and operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $and: [{ category: "tech" }, { status: "active" }],
        },
      });

      expect(mockVectorQuery.where).toHaveBeenCalled();
    });

    it("should translate logical $or operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $or: [{ category: "tech" }, { category: "science" }],
        },
      });

      expect(mockVectorQuery.where).toHaveBeenCalled();
    });

    it("should translate $not operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          $not: { category: "spam" },
        },
      });

      expect(mockVectorQuery.where).toHaveBeenCalled();
    });

    it("should translate $in operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          status: { $in: ["active", "pending"] },
        },
      });

      expect(mockVectorQuery.where).toHaveBeenCalled();
    });

    it("should translate string operators", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          title: { $contains: "vector" },
        },
      });

      expect(mockVectorQuery.where).toHaveBeenCalled();
    });

    it("should translate $exists operator", async () => {
      await adapter.query("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        filter: {
          optional_field: { $exists: true },
        },
      });

      expect(mockVectorQuery.where).toHaveBeenCalled();
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
      mockConnection.createTable.mockRejectedValueOnce(new Error("Create error"));

      await expect(
        adapter.createIndex({ name: "test", dimension: 128 }),
      ).rejects.toThrow("Failed to create index");
    });

    it("should throw when deleting index fails", async () => {
      await adapter.connect();
      mockConnection.dropTable.mockRejectedValueOnce(new Error("Drop error"));

      await expect(adapter.deleteIndex("test")).rejects.toThrow(
        "Failed to delete index",
      );
    });

    it("should throw when upsert fails", async () => {
      await adapter.connect();
      mockTable.add.mockRejectedValueOnce(new Error("Insert error"));

      await expect(
        adapter.upsert("test", [{ id: "1", vector: [0.1] }]),
      ).rejects.toThrow("Failed to upsert");
    });

    it("should throw when query fails", async () => {
      await adapter.connect();
      mockVectorQuery.toArray.mockRejectedValueOnce(new Error("Query error"));

      await expect(
        adapter.query("test", { vector: [0.1], topK: 10 }),
      ).rejects.toThrow("Failed to query");
    });

    it("should throw when delete fails", async () => {
      await adapter.connect();
      mockTable.delete.mockRejectedValueOnce(new Error("Delete error"));

      await expect(
        adapter.delete("test", { ids: ["1"] }),
      ).rejects.toThrow("Failed to delete");
    });

    it("should throw when getting stats fails", async () => {
      await adapter.connect();
      mockTable.countRows.mockRejectedValueOnce(new Error("Stats error"));

      await expect(adapter.getStats("test")).rejects.toThrow(
        "Failed to get stats",
      );
    });
  });

  describe("Distance to Score Conversion", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should convert cosine distance to similarity score", async () => {
      // For cosine, similarity = 1 - distance
      mockVectorQuery.toArray.mockResolvedValueOnce([
        {
          id: "vec-1",
          _distance: 0.1, // Should give score of 0.9
          metadata: "{}",
          content: "",
        },
      ]);

      const results = await adapter.query("test-index", {
        vector: [1, 0],
        topK: 1,
      });

      expect(results.length).toBe(1);
      expect(results[0].score).toBeCloseTo(0.9, 2);
    });

    it("should convert euclidean distance to similarity score", async () => {
      // For euclidean, similarity = 1 / (1 + distance)
      mockVectorQuery.toArray.mockResolvedValueOnce([
        {
          id: "vec-1",
          _distance: 1.0, // Should give score of 0.5
          metadata: "{}",
          content: "",
        },
      ]);

      const results = await adapter.query("test-index", {
        vector: [1, 0],
        topK: 1,
      });

      expect(results.length).toBe(1);
    });
  });

  describe("Cloud Storage Detection", () => {
    it("should detect S3 storage", () => {
      const s3Adapter = new LanceDBAdapter({
        uri: "s3://my-bucket/vectors",
      });
      expect(s3Adapter.getConfig().uri.startsWith("s3://")).toBe(true);
    });

    it("should detect Azure storage", () => {
      const azAdapter = new LanceDBAdapter({
        uri: "az://my-container/vectors",
      });
      expect(azAdapter.getConfig().uri.startsWith("az://")).toBe(true);
    });

    it("should detect GCS storage", () => {
      const gcsAdapter = new LanceDBAdapter({
        uri: "gs://my-bucket/vectors",
      });
      expect(gcsAdapter.getConfig().uri.startsWith("gs://")).toBe(true);
    });

    it("should detect local storage", () => {
      const localAdapter = new LanceDBAdapter({
        uri: "./data/lancedb",
      });
      expect(localAdapter.getConfig().uri.startsWith("./")).toBe(true);
    });
  });
});

describe("LanceDBAdapter Integration", () => {
  // These tests require @lancedb/lancedb to be installed
  // Skip if not available

  it.skip("should work with real LanceDB database", async () => {
    // This test would use a real local LanceDB database
    // Requires @lancedb/lancedb to be installed
  });

  it.skip("should handle concurrent operations", async () => {
    // This test would verify concurrent read/write operations
  });

  it.skip("should work with S3 backend", async () => {
    // This test would verify S3 storage integration
    // Requires AWS credentials
  });
});
