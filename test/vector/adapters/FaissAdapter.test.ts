/**
 * Faiss Adapter Tests
 * Comprehensive test suite for the Faiss vector store adapter
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mock,
} from "vitest";
import type {
  VectorRecord,
  VectorQueryOptions,
} from "../../../src/lib/vector/types.js";
import type { FaissConfig } from "../../../src/lib/vector/adapters/FaissAdapter.js";

// Use vi.hoisted() to ensure mocks are properly hoisted
const { mockState, fsMock, createMockIndex } = vi.hoisted(() => {
  // Create mock functions that will be shared across all index instances
  const mockState = {
    add: vi.fn(),
    search: vi.fn().mockReturnValue({ distances: [], labels: [] }),
    write: vi.fn(),
    ntotal: vi.fn().mockReturnValue(0),
    d: vi.fn().mockReturnValue(128),
    removeIds: vi.fn().mockReturnValue(0),
    train: vi.fn(),
    isTrained: vi.fn().mockReturnValue(true),
    setNprobe: vi.fn(),
    setEfSearch: vi.fn(),
    read: vi.fn(),
  };

  const fsMock = {
    mkdir: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockResolvedValue([]),
    access: vi.fn().mockRejectedValue(new Error("Not found")),
    readFile: vi.fn().mockRejectedValue(new Error("Not found")),
    writeFile: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
  };

  // Factory function to create mock indexes - returns a function-based interface
  // The FaissAdapter expects these as methods (functions), not getter values
  const createMockIndex = () => ({
    ntotal: mockState.ntotal,
    d: mockState.d,
    add: mockState.add,
    search: mockState.search,
    write: mockState.write,
    removeIds: mockState.removeIds,
    train: mockState.train,
    isTrained: mockState.isTrained,
    setNprobe: mockState.setNprobe,
    setEfSearch: mockState.setEfSearch,
  });

  return { mockState, fsMock, createMockIndex };
});

// Mock the faiss-node module
vi.mock("faiss-node", () => {
  // Use ES6 classes to properly support 'new' operator
  class MockIndexFlatL2 {
    ntotal = mockState.ntotal;
    d = mockState.d;
    add = mockState.add;
    search = mockState.search;
    write = mockState.write;
    removeIds = mockState.removeIds;
    train = mockState.train;
    isTrained = mockState.isTrained;
    setNprobe = mockState.setNprobe;
    setEfSearch = mockState.setEfSearch;
    constructor(_dimension?: number) {}
  }

  class MockIndexFlatIP {
    ntotal = mockState.ntotal;
    d = mockState.d;
    add = mockState.add;
    search = mockState.search;
    write = mockState.write;
    removeIds = mockState.removeIds;
    train = mockState.train;
    isTrained = mockState.isTrained;
    setNprobe = mockState.setNprobe;
    setEfSearch = mockState.setEfSearch;
    constructor(_dimension?: number) {}
  }

  class MockIndexIVFFlat {
    ntotal = mockState.ntotal;
    d = mockState.d;
    add = mockState.add;
    search = mockState.search;
    write = mockState.write;
    removeIds = mockState.removeIds;
    train = mockState.train;
    isTrained = mockState.isTrained;
    setNprobe = mockState.setNprobe;
    setEfSearch = mockState.setEfSearch;
    constructor(_quantizer?: unknown, _dimension?: number, _nlist?: number, _metricType?: number) {}
  }

  class MockIndexHNSWFlat {
    ntotal = mockState.ntotal;
    d = mockState.d;
    add = mockState.add;
    search = mockState.search;
    write = mockState.write;
    removeIds = mockState.removeIds;
    train = mockState.train;
    isTrained = mockState.isTrained;
    setNprobe = mockState.setNprobe;
    setEfSearch = mockState.setEfSearch;
    constructor(_dimension?: number, _M?: number) {}
  }

  class MockIndexIDMap {
    ntotal = mockState.ntotal;
    d = mockState.d;
    add = mockState.add;
    search = mockState.search;
    write = mockState.write;
    removeIds = mockState.removeIds;
    train = mockState.train;
    isTrained = mockState.isTrained;
    setNprobe = mockState.setNprobe;
    setEfSearch = mockState.setEfSearch;
    constructor(_index?: unknown) {}
  }

  return {
    default: {
      IndexFlatL2: MockIndexFlatL2,
      IndexFlatIP: MockIndexFlatIP,
      IndexIVFFlat: MockIndexIVFFlat,
      IndexHNSWFlat: MockIndexHNSWFlat,
      IndexIDMap: MockIndexIDMap,
      read: mockState.read.mockImplementation(() => createMockIndex()),
      MetricType: {
        METRIC_L2: 0,
        METRIC_INNER_PRODUCT: 1,
      },
    },
  };
});

// Mock fs operations
vi.mock("fs", () => ({
  promises: fsMock,
}));

// Import after mocking
import { FaissAdapter } from "../../../src/lib/vector/adapters/FaissAdapter.js";

describe("FaissAdapter", () => {
  let adapter: FaissAdapter;
  const defaultConfig: FaissConfig = {
    indexPath: "./test-faiss-data",
    indexType: "flat",
    metricType: "L2",
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset mock state
    mockState.add.mockClear();
    mockState.search.mockReturnValue({ distances: [], labels: [] });
    mockState.write.mockClear();
    mockState.ntotal.mockReturnValue(0);
    mockState.d.mockReturnValue(128);
    mockState.removeIds.mockReturnValue(0);
    mockState.train.mockClear();
    mockState.isTrained.mockReturnValue(true);
    mockState.setNprobe.mockClear();
    mockState.setEfSearch.mockClear();
    mockState.read.mockClear();

    // Reset fs mock
    fsMock.readdir.mockResolvedValue([]);
    fsMock.access.mockRejectedValue(new Error("Not found"));

    adapter = new FaissAdapter(defaultConfig);
  });

  afterEach(async () => {
    if (adapter.isInitialized()) {
      await adapter.disconnect();
    }
  });

  describe("Constructor and Configuration", () => {
    it("should create adapter with configuration", () => {
      expect(adapter).toBeInstanceOf(FaissAdapter);
      expect(adapter.getStoreName()).toBe("faiss");
      expect(adapter.isInitialized()).toBe(false);
    });

    it("should accept custom configuration options", () => {
      const customConfig: FaissConfig = {
        indexPath: "/path/to/faiss-data",
        indexType: "ivf",
        nlist: 200,
        nprobe: 20,
        metricType: "IP",
        useGpu: false,
      };
      const customAdapter = new FaissAdapter(customConfig);
      expect(customAdapter.getConfig()).toEqual(customConfig);
    });

    it("should accept flat index configuration", () => {
      const flatConfig: FaissConfig = {
        indexPath: "./faiss-data",
        indexType: "flat",
        metricType: "L2",
      };
      const flatAdapter = new FaissAdapter(flatConfig);
      expect(flatAdapter.getConfig().indexType).toBe("flat");
    });

    it("should accept IVF index configuration", () => {
      const ivfConfig: FaissConfig = {
        indexPath: "./faiss-data",
        indexType: "ivf",
        nlist: 100,
        nprobe: 10,
      };
      const ivfAdapter = new FaissAdapter(ivfConfig);
      expect(ivfAdapter.getConfig().indexType).toBe("ivf");
      expect(ivfAdapter.getConfig().nlist).toBe(100);
    });

    it("should accept HNSW index configuration", () => {
      const hnswConfig: FaissConfig = {
        indexPath: "./faiss-data",
        indexType: "hnsw",
        hnswM: 32,
        efConstruction: 200,
        efSearch: 64,
      };
      const hnswAdapter = new FaissAdapter(hnswConfig);
      expect(hnswAdapter.getConfig().indexType).toBe("hnsw");
      expect(hnswAdapter.getConfig().hnswM).toBe(32);
    });

    it("should accept IVF-PQ index configuration", () => {
      const ivfPqConfig: FaissConfig = {
        indexPath: "./faiss-data",
        indexType: "ivf-pq",
        nlist: 100,
        numSubQuantizers: 8,
        bitsPerCode: 8,
      };
      const ivfPqAdapter = new FaissAdapter(ivfPqConfig);
      expect(ivfPqAdapter.getConfig().indexType).toBe("ivf-pq");
    });

    it("should default to L2 metric type", () => {
      const configWithoutMetric: FaissConfig = {
        indexPath: "./faiss-data",
        indexType: "flat",
      };
      const adapterWithDefault = new FaissAdapter(configWithoutMetric);
      expect(adapterWithDefault.getConfig().metricType).toBeUndefined();
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

    it("should create index directory on connect", async () => {
      await adapter.connect();
      expect(fsMock.mkdir).toHaveBeenCalledWith("./test-faiss-data", {
        recursive: true,
      });
    });
  });

  describe("Index Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should create a flat index", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 128,
        metric: "cosine",
      });

      const indexes = await adapter.listIndexes();
      expect(indexes).toContain("test-index");
    });

    it("should create index with default metric", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 768,
      });

      const exists = await adapter.indexExists("test-index");
      expect(exists).toBe(true);
    });

    it("should create index with euclidean metric", async () => {
      await adapter.createIndex({
        name: "euclidean-index",
        dimension: 384,
        metric: "euclidean",
      });

      const exists = await adapter.indexExists("euclidean-index");
      expect(exists).toBe(true);
    });

    it("should create index with dotProduct metric", async () => {
      await adapter.createIndex({
        name: "dot-index",
        dimension: 512,
        metric: "dotProduct",
      });

      const exists = await adapter.indexExists("dot-index");
      expect(exists).toBe(true);
    });

    it("should not recreate existing index", async () => {
      await adapter.createIndex({
        name: "test-index",
        dimension: 128,
      });

      await adapter.createIndex({
        name: "test-index",
        dimension: 256,
      });

      const indexes = await adapter.listIndexes();
      expect(indexes.filter((i) => i === "test-index").length).toBe(1);
    });

    it("should delete an index", async () => {
      await adapter.createIndex({
        name: "to-delete",
        dimension: 128,
      });

      await adapter.deleteIndex("to-delete");

      const exists = await adapter.indexExists("to-delete");
      expect(exists).toBe(false);
    });

    it("should list indexes", async () => {
      await adapter.createIndex({ name: "index1", dimension: 128 });
      await adapter.createIndex({ name: "index2", dimension: 128 });

      const indexes = await adapter.listIndexes();
      expect(indexes).toContain("index1");
      expect(indexes).toContain("index2");
    });

    it("should check if index exists", async () => {
      await adapter.createIndex({ name: "existing", dimension: 128 });

      const exists = await adapter.indexExists("existing");
      const notExists = await adapter.indexExists("nonexistent");

      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });

    it("should persist index to file", async () => {
      await adapter.createIndex({
        name: "persistent-index",
        dimension: 128,
      });

      expect(fsMock.writeFile).toHaveBeenCalled();
    });

    it("should delete index files on deleteIndex", async () => {
      await adapter.createIndex({
        name: "to-delete",
        dimension: 128,
      });

      fsMock.unlink.mockResolvedValue(undefined);

      await adapter.deleteIndex("to-delete");

      expect(fsMock.unlink).toHaveBeenCalled();
    });
  });

  describe("Index Types", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should create flat L2 index", async () => {
      const flatAdapter = new FaissAdapter({
        ...defaultConfig,
        indexType: "flat",
        metricType: "L2",
      });
      await flatAdapter.connect();

      await flatAdapter.createIndex({
        name: "flat-l2",
        dimension: 128,
        metric: "euclidean",
      });

      expect(await flatAdapter.indexExists("flat-l2")).toBe(true);
      await flatAdapter.disconnect();
    });

    it("should create flat IP index", async () => {
      const ipAdapter = new FaissAdapter({
        ...defaultConfig,
        indexType: "flat",
        metricType: "IP",
      });
      await ipAdapter.connect();

      await ipAdapter.createIndex({
        name: "flat-ip",
        dimension: 128,
        metric: "cosine",
      });

      expect(await ipAdapter.indexExists("flat-ip")).toBe(true);
      await ipAdapter.disconnect();
    });

    it("should create IVF index", async () => {
      const ivfAdapter = new FaissAdapter({
        ...defaultConfig,
        indexType: "ivf",
        nlist: 100,
      });
      await ivfAdapter.connect();

      await ivfAdapter.createIndex({
        name: "ivf-index",
        dimension: 128,
      });

      expect(await ivfAdapter.indexExists("ivf-index")).toBe(true);
      await ivfAdapter.disconnect();
    });

    it("should create HNSW index", async () => {
      const hnswAdapter = new FaissAdapter({
        ...defaultConfig,
        indexType: "hnsw",
        hnswM: 32,
      });
      await hnswAdapter.connect();

      await hnswAdapter.createIndex({
        name: "hnsw-index",
        dimension: 128,
      });

      expect(await hnswAdapter.indexExists("hnsw-index")).toBe(true);
      await hnswAdapter.disconnect();
    });

    it("should create IVF-PQ index (falls back to IVF)", async () => {
      const pqAdapter = new FaissAdapter({
        ...defaultConfig,
        indexType: "ivf-pq",
        nlist: 100,
      });
      await pqAdapter.connect();

      await pqAdapter.createIndex({
        name: "ivf-pq-index",
        dimension: 128,
      });

      expect(await pqAdapter.indexExists("ivf-pq-index")).toBe(true);
      await pqAdapter.disconnect();
    });
  });

  describe("Upsert Operations", () => {
    const testRecords: VectorRecord<{ category: string }>[] = [
      {
        id: "vec-1",
        vector: Array(128).fill(0.1),
        metadata: { category: "tech" },
        content: "Test content 1",
      },
      {
        id: "vec-2",
        vector: Array(128).fill(0.2),
        metadata: { category: "science" },
        content: "Test content 2",
      },
    ];

    beforeEach(async () => {
      await adapter.connect();
      await adapter.createIndex({
        name: "test-index",
        dimension: 128,
        metric: "cosine",
      });
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

    it("should handle empty records array", async () => {
      const result = await adapter.upsert("test-index", []);
      expect(result.upsertedCount).toBe(0);
    });

    it("should upsert records without metadata", async () => {
      const recordsWithoutMetadata: VectorRecord[] = [
        { id: "v1", vector: Array(128).fill(0.1) },
        { id: "v2", vector: Array(128).fill(0.2) },
      ];

      const result = await adapter.upsert("test-index", recordsWithoutMetadata);
      expect(result.upsertedCount).toBe(2);
    });

    it("should update existing records (upsert behavior)", async () => {
      // First insert
      await adapter.upsert("test-index", [testRecords[0]]);

      // Second insert with same ID should update
      const updatedRecord = {
        ...testRecords[0],
        metadata: { category: "updated" },
      };
      const result = await adapter.upsert("test-index", [updatedRecord]);

      expect(result.upsertedCount).toBe(1);
    });

    it("should throw for non-existent index", async () => {
      await expect(
        adapter.upsert("nonexistent", testRecords)
      ).rejects.toThrow("Index nonexistent not found");
    });

    it("should handle large batch inserts", async () => {
      const largeRecords = Array.from({ length: 100 }, (_, i) => ({
        id: `vec-${i}`,
        vector: Array(128).fill(0.1 + i * 0.001),
        metadata: { index: i },
      }));

      const result = await adapter.upsert("test-index", largeRecords);
      expect(result.upsertedCount).toBe(100);
    });
  });

  describe("Query Operations", () => {
    const queryVector = Array(128).fill(0.15);

    beforeEach(async () => {
      await adapter.connect();
      await adapter.createIndex({
        name: "test-index",
        dimension: 128,
        metric: "cosine",
      });

      // Insert test data
      const testRecords: VectorRecord<{ category: string }>[] = [
        {
          id: "vec-1",
          vector: Array(128).fill(0.1),
          metadata: { category: "tech" },
          content: "Test content 1",
        },
        {
          id: "vec-2",
          vector: Array(128).fill(0.2),
          metadata: { category: "science" },
          content: "Test content 2",
        },
        {
          id: "vec-3",
          vector: Array(128).fill(0.3),
          metadata: { category: "tech" },
          content: "Test content 3",
        },
      ];

      await adapter.upsert("test-index", testRecords);

      // Configure mock search results
      mockState.search.mockReturnValue({
        distances: [0.9, 0.8, 0.7],
        labels: [BigInt(0), BigInt(1), BigInt(2)],
      });
      mockState.ntotal.mockReturnValue(3);
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
      // Add records with namespace
      const nsRecords = [
        {
          id: "ns-vec-1",
          vector: Array(128).fill(0.1),
          namespace: "ns1",
        },
      ];
      await adapter.upsert("test-index", nsRecords, { namespace: "ns1" });

      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 10,
        namespace: "ns1",
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
    });

    it("should throw for wrong query vector dimension", async () => {
      const wrongDimVector = Array(64).fill(0.1);

      await expect(
        adapter.query("test-index", {
          vector: wrongDimVector,
          topK: 10,
        })
      ).rejects.toThrow("dimension");
    });

    it("should throw for non-existent index", async () => {
      await expect(
        adapter.query("nonexistent", {
          vector: queryVector,
          topK: 10,
        })
      ).rejects.toThrow("Index nonexistent not found");
    });

    it("should return results with scores", async () => {
      const options: VectorQueryOptions = {
        vector: queryVector,
        topK: 3,
      };

      const results = await adapter.query("test-index", options);

      for (const result of results) {
        expect(typeof result.score).toBe("number");
        expect(result.id).toBeDefined();
      }
    });
  });

  describe("Delete Operations", () => {
    beforeEach(async () => {
      await adapter.connect();
      await adapter.createIndex({
        name: "test-index",
        dimension: 128,
        metric: "cosine",
      });

      const testRecords = [
        {
          id: "vec-1",
          vector: Array(128).fill(0.1),
          metadata: { category: "tech" },
        },
        {
          id: "vec-2",
          vector: Array(128).fill(0.2),
          metadata: { category: "science" },
        },
        {
          id: "vec-3",
          vector: Array(128).fill(0.3),
          metadata: { category: "tech" },
          namespace: "ns1",
        },
      ];

      await adapter.upsert("test-index", testRecords);
    });

    it("should delete by IDs", async () => {
      const result = await adapter.delete("test-index", {
        ids: ["vec-1", "vec-2"],
      });
      expect(result.deletedCount).toBe(2);
    });

    it("should delete by filter", async () => {
      const result = await adapter.delete("test-index", {
        filter: { category: "tech" },
      });
      expect(result.deletedCount).toBeGreaterThanOrEqual(0);
    });

    it("should delete by namespace", async () => {
      const result = await adapter.delete("test-index", {
        namespace: "ns1",
        deleteAll: true,
      });
      expect(result.deletedCount).toBeGreaterThanOrEqual(0);
    });

    it("should delete all records", async () => {
      const result = await adapter.delete("test-index", {
        deleteAll: true,
      });
      expect(result.deletedCount).toBe(3);
    });

    it("should return 0 when no matching IDs", async () => {
      const result = await adapter.delete("test-index", {
        ids: ["nonexistent-1", "nonexistent-2"],
      });
      expect(result.deletedCount).toBe(0);
    });

    it("should throw for non-existent index", async () => {
      await expect(
        adapter.delete("nonexistent", { ids: ["vec-1"] })
      ).rejects.toThrow("Index nonexistent not found");
    });
  });

  describe("Statistics", () => {
    beforeEach(async () => {
      await adapter.connect();
      await adapter.createIndex({
        name: "test-index",
        dimension: 128,
        metric: "cosine",
      });
    });

    it("should get index statistics", async () => {
      const testRecords = [
        { id: "vec-1", vector: Array(128).fill(0.1), metadata: {} },
        { id: "vec-2", vector: Array(128).fill(0.2), metadata: {} },
      ];
      await adapter.upsert("test-index", testRecords);

      mockState.ntotal.mockReturnValue(2);

      const stats = await adapter.getStats("test-index");
      expect(stats.vectorCount).toBe(2);
      expect(stats.dimension).toBe(128);
    });

    it("should include metric in stats", async () => {
      const stats = await adapter.getStats("test-index");
      expect(stats.metrics?.metric).toBe("cosine");
    });

    it("should include index type in stats", async () => {
      const stats = await adapter.getStats("test-index");
      expect(stats.metrics?.indexType).toBe("flat");
    });

    it("should count namespaces", async () => {
      const testRecords = [
        {
          id: "vec-1",
          vector: Array(128).fill(0.1),
          namespace: "ns1",
        },
        {
          id: "vec-2",
          vector: Array(128).fill(0.2),
          namespace: "ns2",
        },
        {
          id: "vec-3",
          vector: Array(128).fill(0.3),
          namespace: "ns1",
        },
      ];
      await adapter.upsert("test-index", testRecords);

      const stats = await adapter.getStats("test-index");
      expect(stats.namespaceCount).toBe(2);
    });

    it("should throw for non-existent index", async () => {
      await expect(adapter.getStats("nonexistent")).rejects.toThrow(
        "Index nonexistent not found"
      );
    });
  });

  describe("Health Check", () => {
    it("should return healthy status when connected", async () => {
      await adapter.connect();
      await adapter.createIndex({
        name: "health-test",
        dimension: 128,
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
      vector: Array(128).fill(0.1 + i * 0.001),
      metadata: { index: i },
    }));

    beforeEach(async () => {
      await adapter.connect();
      await adapter.createIndex({
        name: "test-index",
        dimension: 128,
      });
    });

    it("should batch upsert large datasets", async () => {
      const result = await adapter.batchUpsert("test-index", manyRecords, {
        batchSize: 100,
      });
      expect(result.upsertedCount).toBe(250);
    });

    it("should batch delete large ID lists", async () => {
      await adapter.upsert("test-index", manyRecords);
      const ids = manyRecords.map((r) => r.id);

      const result = await adapter.batchDelete("test-index", ids, {
        batchSize: 100,
      });
      expect(result.deletedCount).toBe(250);
    });
  });

  describe("Filter Translation (Post-Filtering)", () => {
    const queryVector = Array(128).fill(0.15);

    beforeEach(async () => {
      await adapter.connect();
      await adapter.createIndex({
        name: "test-index",
        dimension: 128,
        metric: "cosine",
      });

      // Insert test data with various metadata
      const testRecords = [
        {
          id: "vec-1",
          vector: Array(128).fill(0.1),
          metadata: { category: "tech", price: 100, status: "active" },
        },
        {
          id: "vec-2",
          vector: Array(128).fill(0.2),
          metadata: { category: "science", price: 200, status: "active" },
        },
        {
          id: "vec-3",
          vector: Array(128).fill(0.3),
          metadata: { category: "tech", price: 300, status: "inactive" },
        },
        {
          id: "vec-4",
          vector: Array(128).fill(0.4),
          metadata: { category: "art", price: 150, title: "Abstract Art" },
        },
      ];

      await adapter.upsert("test-index", testRecords);

      // Configure mock search to return all
      mockState.search.mockReturnValue({
        distances: [0.9, 0.8, 0.7, 0.6],
        labels: [BigInt(0), BigInt(1), BigInt(2), BigInt(3)],
      });
      mockState.ntotal.mockReturnValue(4);
    });

    it("should translate simple equality filter", async () => {
      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
        filter: { category: "tech" },
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should translate comparison operators", async () => {
      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
        filter: { price: { $gte: 100, $lte: 200 } },
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should translate logical $and operator", async () => {
      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
        filter: {
          $and: [{ category: "tech" }, { status: "active" }],
        },
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should translate logical $or operator", async () => {
      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
        filter: {
          $or: [{ category: "tech" }, { category: "science" }],
        },
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should translate $not operator", async () => {
      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
        filter: {
          $not: { category: "tech" },
        },
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should translate $in operator", async () => {
      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
        filter: {
          status: { $in: ["active", "pending"] },
        },
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should translate $nin operator", async () => {
      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
        filter: {
          status: { $nin: ["inactive", "deleted"] },
        },
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should translate string $contains operator", async () => {
      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
        filter: {
          title: { $contains: "Art" },
        },
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should translate $startsWith operator", async () => {
      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
        filter: {
          title: { $startsWith: "Abstract" },
        },
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should translate $endsWith operator", async () => {
      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
        filter: {
          title: { $endsWith: "Art" },
        },
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should translate $exists operator true", async () => {
      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
        filter: {
          title: { $exists: true },
        },
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should translate $exists operator false", async () => {
      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
        filter: {
          title: { $exists: false },
        },
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should translate $eq operator", async () => {
      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
        filter: {
          status: { $eq: "active" },
        },
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should translate $ne operator", async () => {
      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
        filter: {
          status: { $ne: "inactive" },
        },
      });
      expect(Array.isArray(results)).toBe(true);
    });

    it("should translate $gt and $lt operators", async () => {
      const results = await adapter.query("test-index", {
        vector: queryVector,
        topK: 10,
        filter: {
          price: { $gt: 100, $lt: 300 },
        },
      });
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should throw when operating without connection", async () => {
      await expect(adapter.listIndexes()).rejects.toThrow(
        "not initialized. Call connect() first"
      );
    });

    it("should throw when creating index without connection", async () => {
      await expect(
        adapter.createIndex({ name: "test", dimension: 128 })
      ).rejects.toThrow("not initialized");
    });

    it("should throw when deleting index fails", async () => {
      await adapter.connect();
      // Try to delete non-existent - should not throw
      await adapter.deleteIndex("nonexistent");
    });

    it("should throw when upsert fails", async () => {
      await adapter.connect();
      await expect(
        adapter.upsert("nonexistent", [{ id: "1", vector: [0.1] }])
      ).rejects.toThrow("Index nonexistent not found");
    });

    it("should throw when query fails", async () => {
      await adapter.connect();
      await expect(
        adapter.query("nonexistent", { vector: [0.1], topK: 10 })
      ).rejects.toThrow("Index nonexistent not found");
    });

    it("should throw when delete fails", async () => {
      await adapter.connect();
      await expect(
        adapter.delete("nonexistent", { ids: ["1"] })
      ).rejects.toThrow("Index nonexistent not found");
    });

    it("should throw when getting stats fails", async () => {
      await adapter.connect();
      await expect(adapter.getStats("nonexistent")).rejects.toThrow(
        "Index nonexistent not found"
      );
    });
  });

  describe("Distance to Score Conversion", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should convert L2 distance to similarity score", async () => {
      await adapter.createIndex({
        name: "l2-index",
        dimension: 128,
        metric: "euclidean",
      });

      const testRecords = [
        { id: "vec-1", vector: Array(128).fill(0.1), metadata: {} },
      ];
      await adapter.upsert("l2-index", testRecords);

      mockState.search.mockReturnValue({
        distances: [1.0],
        labels: [BigInt(0)],
      });
      mockState.ntotal.mockReturnValue(1);

      const results = await adapter.query("l2-index", {
        vector: Array(128).fill(0.1),
        topK: 1,
      });

      expect(results.length).toBe(1);
      expect(typeof results[0].score).toBe("number");
    });

    it("should convert IP distance to similarity score", async () => {
      await adapter.createIndex({
        name: "ip-index",
        dimension: 128,
        metric: "dotProduct",
      });

      const testRecords = [
        { id: "vec-1", vector: Array(128).fill(0.1), metadata: {} },
      ];
      await adapter.upsert("ip-index", testRecords);

      mockState.search.mockReturnValue({
        distances: [0.95],
        labels: [BigInt(0)],
      });
      mockState.ntotal.mockReturnValue(1);

      const results = await adapter.query("ip-index", {
        vector: Array(128).fill(0.1),
        topK: 1,
      });

      expect(results.length).toBe(1);
      expect(results[0].score).toBe(0.95);
    });

    it("should convert cosine distance to similarity score", async () => {
      await adapter.createIndex({
        name: "cosine-index",
        dimension: 128,
        metric: "cosine",
      });

      const testRecords = [
        { id: "vec-1", vector: Array(128).fill(0.1), metadata: {} },
      ];
      await adapter.upsert("cosine-index", testRecords);

      mockState.search.mockReturnValue({
        distances: [0.9],
        labels: [BigInt(0)],
      });
      mockState.ntotal.mockReturnValue(1);

      const results = await adapter.query("cosine-index", {
        vector: Array(128).fill(0.1),
        topK: 1,
      });

      expect(results.length).toBe(1);
      expect(results[0].score).toBe(0.9);
    });
  });

  describe("Index Persistence", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should save index to file", async () => {
      await adapter.createIndex({
        name: "persistent",
        dimension: 128,
      });

      await adapter.saveIndex("persistent");

      expect(mockState.write).toHaveBeenCalled();
      expect(fsMock.writeFile).toHaveBeenCalled();
    });

    it("should load index from file", async () => {
      const meta = {
        config: {
          name: "loaded-index",
          dimension: 128,
          metric: "cosine",
          indexType: "flat",
          isTrained: true,
          createdAt: new Date().toISOString(),
        },
        idMap: { "vec-1": "0" },
        reverseIdMap: { "0": "vec-1" },
        metadataStore: { "vec-1": { metadata: { test: true } } },
        nextId: "1",
        deletedIds: [],
      };

      fsMock.access.mockResolvedValue(undefined);
      fsMock.readFile.mockResolvedValueOnce(JSON.stringify(meta));

      mockState.read.mockReturnValue({
        ntotal: mockState.ntotal,
        d: mockState.d,
        add: mockState.add,
        search: mockState.search,
        write: mockState.write,
        train: mockState.train,
        isTrained: mockState.isTrained,
        setNprobe: mockState.setNprobe,
        setEfSearch: mockState.setEfSearch,
      });

      await adapter.loadIndex("loaded-index");

      expect(await adapter.indexExists("loaded-index")).toBe(true);
    });

    it("should throw when loading non-existent index", async () => {
      fsMock.access.mockRejectedValue(new Error("Not found"));

      await expect(adapter.loadIndex("nonexistent")).rejects.toThrow();
    });
  });

  describe("ID Mapping", () => {
    beforeEach(async () => {
      await adapter.connect();
      await adapter.createIndex({
        name: "test-index",
        dimension: 128,
        metric: "cosine",
      });
    });

    it("should map string IDs to internal IDs", async () => {
      const testRecords = [
        { id: "my-custom-id-1", vector: Array(128).fill(0.1), metadata: {} },
        { id: "my-custom-id-2", vector: Array(128).fill(0.2), metadata: {} },
      ];

      await adapter.upsert("test-index", testRecords);

      mockState.search.mockReturnValue({
        distances: [0.95, 0.9],
        labels: [BigInt(0), BigInt(1)],
      });
      mockState.ntotal.mockReturnValue(2);

      const results = await adapter.query("test-index", {
        vector: Array(128).fill(0.15),
        topK: 2,
      });

      expect(results[0].id).toBe("my-custom-id-1");
      expect(results[1].id).toBe("my-custom-id-2");
    });

    it("should handle re-inserting with same ID", async () => {
      const record1 = {
        id: "same-id",
        vector: Array(128).fill(0.1),
        metadata: { version: 1 },
      };
      const record2 = {
        id: "same-id",
        vector: Array(128).fill(0.2),
        metadata: { version: 2 },
      };

      await adapter.upsert("test-index", [record1]);
      await adapter.upsert("test-index", [record2]);

      const stats = await adapter.getStats("test-index");
      // Should still have 1 active vector (old one is deleted)
      expect(stats.vectorCount).toBe(1);
    });
  });

  describe("Search Parameters", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should set nprobe for IVF search", async () => {
      const ivfAdapter = new FaissAdapter({
        ...defaultConfig,
        indexType: "ivf",
        nlist: 100,
        nprobe: 20,
      });
      await ivfAdapter.connect();

      await ivfAdapter.createIndex({
        name: "ivf-index",
        dimension: 128,
      });

      const testRecords = [
        { id: "vec-1", vector: Array(128).fill(0.1), metadata: {} },
      ];
      await ivfAdapter.upsert("ivf-index", testRecords);

      mockState.search.mockReturnValue({
        distances: [0.95],
        labels: [BigInt(0)],
      });
      mockState.ntotal.mockReturnValue(1);

      await ivfAdapter.query("ivf-index", {
        vector: Array(128).fill(0.1),
        topK: 1,
      });

      expect(mockState.setNprobe).toHaveBeenCalledWith(20);
      await ivfAdapter.disconnect();
    });

    it("should set efSearch for HNSW search", async () => {
      const hnswAdapter = new FaissAdapter({
        ...defaultConfig,
        indexType: "hnsw",
        hnswM: 32,
        efSearch: 64,
      });
      await hnswAdapter.connect();

      await hnswAdapter.createIndex({
        name: "hnsw-index",
        dimension: 128,
      });

      const testRecords = [
        { id: "vec-1", vector: Array(128).fill(0.1), metadata: {} },
      ];
      await hnswAdapter.upsert("hnsw-index", testRecords);

      mockState.search.mockReturnValue({
        distances: [0.95],
        labels: [BigInt(0)],
      });
      mockState.ntotal.mockReturnValue(1);

      await hnswAdapter.query("hnsw-index", {
        vector: Array(128).fill(0.1),
        topK: 1,
      });

      expect(mockState.setEfSearch).toHaveBeenCalledWith(64);
      await hnswAdapter.disconnect();
    });
  });

  describe("Name Sanitization", () => {
    beforeEach(async () => {
      await adapter.connect();
    });

    it("should sanitize index names with special characters", async () => {
      await adapter.createIndex({
        name: "test-index-with-dashes",
        dimension: 128,
      });

      const exists = await adapter.indexExists("test-index-with-dashes");
      expect(exists).toBe(true);
    });

    it("should sanitize index names with spaces", async () => {
      await adapter.createIndex({
        name: "test index with spaces",
        dimension: 128,
      });

      const exists = await adapter.indexExists("test index with spaces");
      expect(exists).toBe(true);
    });
  });
});

describe("FaissAdapter Integration", () => {
  // These tests require faiss-node to be installed
  // Skip if not available

  it.skip("should work with real Faiss index", async () => {
    // This test would use a real Faiss index
    // Requires faiss-node to be installed
  });

  it.skip("should handle concurrent operations", async () => {
    // This test would verify concurrent read/write operations
  });

  it.skip("should persist and reload indexes", async () => {
    // This test would verify file-based persistence
  });
});
