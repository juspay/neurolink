/**
 * BaseVectorStore Unit Tests
 *
 * Tests for the abstract base class for all vector store implementations.
 * Validates common functionality, lifecycle management, and batch operations.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { BaseVectorStore } from "../../../src/lib/stores/baseVectorStore.js";
import type { UnknownRecord } from "../../../src/lib/types/common.js";
import type { MetadataFilter } from "../../../src/lib/types/vectorFilterTypes.js";
import type {
  VectorDeleteOptions,
  VectorDeleteResult,
  VectorIndexConfig,
  VectorQueryOptions,
  VectorQueryResult,
  VectorRecord,
  VectorStoreName,
  VectorStoreStats,
  VectorUpsertOptions,
} from "../../../src/lib/types/vectorTypes.js";

// Mock logger
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

/**
 * Concrete test implementation of BaseVectorStore
 */
class TestVectorStore extends BaseVectorStore {
  public upsertCalls: Array<{
    indexName: string;
    records: VectorRecord[];
    options?: VectorUpsertOptions;
  }> = [];
  public queryCalls: Array<{ indexName: string; options: VectorQueryOptions }> =
    [];
  public deleteCalls: Array<{
    indexName: string;
    options: VectorDeleteOptions;
  }> = [];
  public updateVectorCalls: Array<{
    indexName: string;
    id: string;
    update: { vector?: number[]; metadata?: UnknownRecord };
  }> = [];

  async connect(): Promise<void> {
    this.initialized = true;
  }

  async disconnect(): Promise<void> {
    this.initialized = false;
  }

  async createIndex(_config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();
  }

  async deleteIndex(_indexName: string): Promise<void> {
    this.ensureInitialized();
  }

  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();
    return ["test-index-1", "test-index-2"];
  }

  async indexExists(indexName: string): Promise<boolean> {
    this.ensureInitialized();
    return indexName === "test-index-1";
  }

  async upsert<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    records: VectorRecord<TMetadata>[],
    options?: VectorUpsertOptions,
  ): Promise<{ upsertedCount: number }> {
    this.ensureInitialized();
    this.upsertCalls.push({
      indexName,
      records: records as VectorRecord[],
      options,
    });
    return { upsertedCount: records.length };
  }

  async query<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options: VectorQueryOptions<TMetadata>,
  ): Promise<VectorQueryResult<TMetadata>[]> {
    this.ensureInitialized();
    this.queryCalls.push({ indexName, options: options as VectorQueryOptions });
    return [
      { id: "result-1", score: 0.95, metadata: {} as TMetadata },
      { id: "result-2", score: 0.85, metadata: {} as TMetadata },
    ];
  }

  async delete(
    indexName: string,
    options: VectorDeleteOptions,
  ): Promise<VectorDeleteResult> {
    this.ensureInitialized();
    this.deleteCalls.push({ indexName, options });
    return { deletedCount: options.ids?.length ?? 0, acknowledged: true };
  }

  async getStats(indexName: string): Promise<VectorStoreStats> {
    this.ensureInitialized();
    return {
      vectorCount: 1000,
      dimension: 1536,
      namespaceCount: 2,
      metrics: { indexName },
    };
  }

  async updateVector<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    id: string,
    update: { vector?: number[]; metadata?: TMetadata },
  ): Promise<void> {
    this.ensureInitialized();
    this.updateVectorCalls.push({
      indexName,
      id,
      update: update as { vector?: number[]; metadata?: UnknownRecord },
    });
  }

  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): unknown {
    return filter; // Pass through for testing
  }

  // Expose protected methods for testing
  public testEnsureInitialized(): void {
    this.ensureInitialized();
  }

  public testValidateDimensions(
    vectors: number[][],
    expectedDimension?: number,
  ): void {
    this.validateDimensions(vectors, expectedDimension);
  }

  public testLogDebug(message: string, context?: UnknownRecord): void {
    this.logDebug(message, context);
  }
}

describe("BaseVectorStore", () => {
  let store: TestVectorStore;

  beforeEach(() => {
    store = new TestVectorStore({ debug: true }, "test" as VectorStoreName);
  });

  describe("lifecycle", () => {
    it("should track connection state", async () => {
      expect(store.isInitialized()).toBe(false);

      await store.connect();
      expect(store.isInitialized()).toBe(true);

      await store.disconnect();
      expect(store.isInitialized()).toBe(false);
    });

    it("should return store name", () => {
      expect(store.getStoreName()).toBe("test");
    });
  });

  describe("ensureInitialized", () => {
    it("should throw when not initialized", () => {
      expect(() => store.testEnsureInitialized()).toThrow(
        "Vector store test not initialized. Call connect() first.",
      );
    });

    it("should not throw when initialized", async () => {
      await store.connect();
      expect(() => store.testEnsureInitialized()).not.toThrow();
    });
  });

  describe("validateDimensions", () => {
    it("should accept empty array", () => {
      expect(() => store.testValidateDimensions([])).not.toThrow();
    });

    it("should accept consistent dimensions", () => {
      const vectors = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
        [0.7, 0.8, 0.9],
      ];
      expect(() => store.testValidateDimensions(vectors)).not.toThrow();
    });

    it("should throw for inconsistent dimensions", () => {
      const vectors = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5], // Different dimension
      ];
      expect(() => store.testValidateDimensions(vectors)).toThrow(
        "Inconsistent vector dimensions: expected 3, got 2",
      );
    });

    it("should throw when dimension doesn't match expected", () => {
      const vectors = [[0.1, 0.2, 0.3]];
      expect(() => store.testValidateDimensions(vectors, 5)).toThrow(
        "Vector dimension mismatch: expected 5, got 3",
      );
    });

    it("should accept matching expected dimension", () => {
      const vectors = [[0.1, 0.2, 0.3]];
      expect(() => store.testValidateDimensions(vectors, 3)).not.toThrow();
    });
  });

  describe("healthCheck", () => {
    it("should return healthy status when connected", async () => {
      await store.connect();

      const health = await store.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.status).toBe("connected");
      expect(health.latencyMs).toBeDefined();
      expect(health.lastChecked).toBeInstanceOf(Date);
    });

    it("should return unhealthy status when disconnected", async () => {
      // Store is not connected, so listIndexes will throw
      const storeWithError = new TestVectorStore({}, "test" as VectorStoreName);

      const health = await storeWithError.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.status).toBe("error");
      expect(health.error).toBeDefined();
    });
  });

  describe("batchUpsert", () => {
    beforeEach(async () => {
      await store.connect();
    });

    it("should batch records correctly with default batch size", async () => {
      const records = Array.from({ length: 250 }, (_, i) => ({
        id: `doc-${i}`,
        vector: [0.1, 0.2],
        metadata: { index: i },
      }));

      const result = await store.batchUpsert("test-index", records);

      expect(result.upsertedCount).toBe(250);
      // Default batch size is 100, so 3 batches
      expect(store.upsertCalls.length).toBe(3);
      expect(store.upsertCalls[0].records.length).toBe(100);
      expect(store.upsertCalls[1].records.length).toBe(100);
      expect(store.upsertCalls[2].records.length).toBe(50);
    });

    it("should respect custom batch size", async () => {
      const records = Array.from({ length: 100 }, (_, i) => ({
        id: `doc-${i}`,
        vector: [0.1, 0.2],
        metadata: {},
      }));

      const result = await store.batchUpsert("test-index", records, {
        batchSize: 25,
      });

      expect(result.upsertedCount).toBe(100);
      expect(store.upsertCalls.length).toBe(4);
      store.upsertCalls.forEach((call) => {
        expect(call.records.length).toBe(25);
      });
    });

    it("should handle single batch when records fit", async () => {
      const records = Array.from({ length: 50 }, (_, i) => ({
        id: `doc-${i}`,
        vector: [0.1, 0.2],
        metadata: {},
      }));

      const result = await store.batchUpsert("test-index", records, {
        batchSize: 100,
      });

      expect(result.upsertedCount).toBe(50);
      expect(store.upsertCalls.length).toBe(1);
    });

    it("should pass namespace to upsert calls", async () => {
      const records = [{ id: "doc-1", vector: [0.1], metadata: {} }];

      await store.batchUpsert("test-index", records, {
        namespace: "custom-ns",
      });

      expect(store.upsertCalls[0].options?.namespace).toBe("custom-ns");
    });
  });

  describe("queryAll", () => {
    beforeEach(async () => {
      await store.connect();
    });

    it("should limit results to maxResults", async () => {
      const results = await store.queryAll("test-index", {
        vector: [0.1, 0.2],
        topK: 10,
        maxResults: 1,
      });

      expect(results.length).toBeLessThanOrEqual(1);
    });

    it("should use topK when smaller than maxResults", async () => {
      await store.queryAll("test-index", {
        vector: [0.1, 0.2],
        topK: 5,
        maxResults: 100,
      });

      expect(store.queryCalls[0].options.topK).toBe(5);
    });
  });

  describe("abstract methods", () => {
    beforeEach(async () => {
      await store.connect();
    });

    it("should call upsert with correct parameters", async () => {
      const records = [
        { id: "doc-1", vector: [0.1, 0.2], metadata: { type: "test" } },
      ];

      await store.upsert("test-index", records, { namespace: "ns1" });

      expect(store.upsertCalls.length).toBe(1);
      expect(store.upsertCalls[0].indexName).toBe("test-index");
      expect(store.upsertCalls[0].records).toEqual(records);
      expect(store.upsertCalls[0].options).toEqual({ namespace: "ns1" });
    });

    it("should call query with correct parameters", async () => {
      const options: VectorQueryOptions = {
        vector: [0.1, 0.2, 0.3],
        topK: 5,
        minScore: 0.8,
      };

      const results = await store.query("test-index", options);

      expect(store.queryCalls.length).toBe(1);
      expect(store.queryCalls[0].indexName).toBe("test-index");
      expect(store.queryCalls[0].options).toEqual(options);
      expect(results.length).toBe(2);
    });

    it("should call delete with correct parameters", async () => {
      const options: VectorDeleteOptions = {
        ids: ["id-1", "id-2"],
        namespace: "ns1",
      };

      const result = await store.delete("test-index", options);

      expect(store.deleteCalls.length).toBe(1);
      expect(store.deleteCalls[0].indexName).toBe("test-index");
      expect(store.deleteCalls[0].options).toEqual(options);
      expect(result.deletedCount).toBe(2);
    });

    it("should get stats", async () => {
      const stats = await store.getStats("test-index");

      expect(stats.vectorCount).toBe(1000);
      expect(stats.dimension).toBe(1536);
      expect(stats.namespaceCount).toBe(2);
    });

    it("should list indexes", async () => {
      const indexes = await store.listIndexes();

      expect(indexes).toEqual(["test-index-1", "test-index-2"]);
    });

    it("should check index existence", async () => {
      expect(await store.indexExists("test-index-1")).toBe(true);
      expect(await store.indexExists("nonexistent")).toBe(false);
    });
  });

  describe("operations require initialization", () => {
    it("should throw on createIndex when not initialized", async () => {
      await expect(
        store.createIndex({ name: "test", dimension: 1536 }),
      ).rejects.toThrow("not initialized");
    });

    it("should throw on deleteIndex when not initialized", async () => {
      await expect(store.deleteIndex("test")).rejects.toThrow(
        "not initialized",
      );
    });

    it("should throw on listIndexes when not initialized", async () => {
      await expect(store.listIndexes()).rejects.toThrow("not initialized");
    });

    it("should throw on upsert when not initialized", async () => {
      await expect(store.upsert("test", [])).rejects.toThrow("not initialized");
    });

    it("should throw on query when not initialized", async () => {
      await expect(
        store.query("test", { vector: [0.1], topK: 5 }),
      ).rejects.toThrow("not initialized");
    });

    it("should throw on delete when not initialized", async () => {
      await expect(store.delete("test", {})).rejects.toThrow("not initialized");
    });

    it("should throw on getStats when not initialized", async () => {
      await expect(store.getStats("test")).rejects.toThrow("not initialized");
    });

    it("should throw on updateVector when not initialized", async () => {
      await expect(
        store.updateVector("test", "id-1", { vector: [0.1, 0.2] }),
      ).rejects.toThrow("not initialized");
    });
  });

  describe("updateVector", () => {
    beforeEach(async () => {
      await store.connect();
    });

    it("should call updateVector with vector update", async () => {
      await store.updateVector("test-index", "doc-1", {
        vector: [0.1, 0.2, 0.3],
      });

      expect(store.updateVectorCalls.length).toBe(1);
      expect(store.updateVectorCalls[0].indexName).toBe("test-index");
      expect(store.updateVectorCalls[0].id).toBe("doc-1");
      expect(store.updateVectorCalls[0].update.vector).toEqual([0.1, 0.2, 0.3]);
    });

    it("should call updateVector with metadata update", async () => {
      await store.updateVector("test-index", "doc-1", {
        metadata: { category: "updated" },
      });

      expect(store.updateVectorCalls.length).toBe(1);
      expect(store.updateVectorCalls[0].update.metadata).toEqual({
        category: "updated",
      });
    });

    it("should call updateVector with both vector and metadata", async () => {
      await store.updateVector("test-index", "doc-1", {
        vector: [0.5, 0.5],
        metadata: { updated: true },
      });

      expect(store.updateVectorCalls.length).toBe(1);
      expect(store.updateVectorCalls[0].update.vector).toEqual([0.5, 0.5]);
      expect(store.updateVectorCalls[0].update.metadata).toEqual({
        updated: true,
      });
    });
  });

  describe("deleteVector", () => {
    beforeEach(async () => {
      await store.connect();
    });

    it("should delete a single vector by id", async () => {
      await store.deleteVector("test-index", "doc-1");

      expect(store.deleteCalls.length).toBe(1);
      expect(store.deleteCalls[0].indexName).toBe("test-index");
      expect(store.deleteCalls[0].options.ids).toEqual(["doc-1"]);
    });

    it("should use the delete method with single id array", async () => {
      await store.deleteVector("test-index", "single-id");

      expect(store.deleteCalls[0].options.ids).toHaveLength(1);
      expect(store.deleteCalls[0].options.ids![0]).toBe("single-id");
    });
  });
});
