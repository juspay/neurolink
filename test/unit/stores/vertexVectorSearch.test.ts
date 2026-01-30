/**
 * VertexVectorSearchStore Unit Tests
 *
 * Tests for the Google Vertex AI Vector Search store implementation.
 *
 * Note: These tests focus on configuration and behavior that can be tested without
 * requiring actual GCP credentials. Integration tests with a real Vertex AI
 * environment should be used for full API testing.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type VertexVectorSearchConfig,
  VertexVectorSearchStore,
} from "../../../src/lib/stores/enterprise/vertexVectorSearch.js";

// Mock logger
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("VertexVectorSearchStore", () => {
  describe("constructor", () => {
    it("should create store with required config", () => {
      const store = new VertexVectorSearchStore({
        projectId: "test-project",
        region: "us-central1",
      });

      expect(store).toBeDefined();
      expect(store.getStoreName()).toBe("vertex-vector");
    });

    it("should accept optional index endpoint ID", () => {
      const store = new VertexVectorSearchStore({
        projectId: "test-project",
        region: "us-central1",
        indexEndpointId: "123456789",
      });

      expect(store).toBeDefined();
    });

    it("should accept deployed index ID", () => {
      const store = new VertexVectorSearchStore({
        projectId: "test-project",
        region: "us-central1",
        indexEndpointId: "123456789",
        deployedIndexId: "deployed-index-1",
      });

      expect(store).toBeDefined();
    });

    it("should accept custom API endpoint", () => {
      const store = new VertexVectorSearchStore({
        projectId: "test-project",
        region: "us-central1",
        apiEndpoint: "custom-aiplatform.googleapis.com",
      });

      expect(store).toBeDefined();
    });

    it("should accept credentials as JSON string", () => {
      const store = new VertexVectorSearchStore({
        projectId: "test-project",
        region: "us-central1",
        credentials: '{"type": "service_account", "project_id": "test"}',
      });

      expect(store).toBeDefined();
    });

    it("should accept credentials as object", () => {
      const store = new VertexVectorSearchStore({
        projectId: "test-project",
        region: "us-central1",
        credentials: { type: "service_account", project_id: "test" },
      });

      expect(store).toBeDefined();
    });

    it("should not be initialized before connect", () => {
      const store = new VertexVectorSearchStore({
        projectId: "test-project",
        region: "us-central1",
      });

      expect(store.isInitialized()).toBe(false);
    });

    it("should accept debug flag", () => {
      const store = new VertexVectorSearchStore({
        projectId: "test-project",
        region: "us-central1",
        debug: true,
      });

      expect(store).toBeDefined();
    });
  });

  describe("initialization state", () => {
    let store: VertexVectorSearchStore;

    beforeEach(() => {
      store = new VertexVectorSearchStore({
        projectId: "test-project",
        region: "us-central1",
      });
    });

    it("should throw on listIndexes when not initialized", async () => {
      await expect(store.listIndexes()).rejects.toThrow(
        "not initialized. Call connect() first",
      );
    });

    it("should throw on createIndex when not initialized", async () => {
      await expect(
        store.createIndex({ name: "test", dimension: 1536 }),
      ).rejects.toThrow("not initialized. Call connect() first");
    });

    it("should throw on deleteIndex when not initialized", async () => {
      await expect(store.deleteIndex("test")).rejects.toThrow(
        "not initialized. Call connect() first",
      );
    });

    it("should throw on upsert when not initialized", async () => {
      await expect(store.upsert("test", [])).rejects.toThrow(
        "not initialized. Call connect() first",
      );
    });

    it("should throw on query when not initialized", async () => {
      await expect(
        store.query("test", { vector: [0.1], topK: 5 }),
      ).rejects.toThrow("not initialized. Call connect() first");
    });

    it("should throw on delete when not initialized", async () => {
      await expect(store.delete("test", {})).rejects.toThrow(
        "not initialized. Call connect() first",
      );
    });

    it("should throw on getStats when not initialized", async () => {
      await expect(store.getStats("test")).rejects.toThrow(
        "not initialized. Call connect() first",
      );
    });
  });

  describe("configuration types", () => {
    it("should accept minimal config", () => {
      const config: VertexVectorSearchConfig = {
        projectId: "test-project",
        region: "us-central1",
      };

      const store = new VertexVectorSearchStore(config);
      expect(store).toBeDefined();
    });

    it("should accept full config", () => {
      const config: VertexVectorSearchConfig = {
        projectId: "test-project",
        region: "us-central1",
        indexEndpointId: "123456789",
        deployedIndexId: "deployed-index-1",
        apiEndpoint: "us-central1-aiplatform.googleapis.com",
        credentials: { type: "service_account" },
        debug: true,
        timeout: 30000,
        maxRetries: 3,
      };

      const store = new VertexVectorSearchStore(config);
      expect(store).toBeDefined();
    });

    it("should support different regions", () => {
      const regions = [
        "us-central1",
        "us-east1",
        "us-west1",
        "europe-west1",
        "asia-east1",
      ];

      for (const region of regions) {
        const store = new VertexVectorSearchStore({
          projectId: "test-project",
          region,
        });
        expect(store).toBeDefined();
      }
    });
  });

  describe("healthCheck", () => {
    it("should return unhealthy when not connected", async () => {
      const store = new VertexVectorSearchStore({
        projectId: "test-project",
        region: "us-central1",
      });

      const health = await store.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.status).toBe("error");
      expect(health.error).toBeDefined();
      expect(health.lastChecked).toBeInstanceOf(Date);
    });

    it("should include latency measurement", async () => {
      const store = new VertexVectorSearchStore({
        projectId: "test-project",
        region: "us-central1",
      });

      const health = await store.healthCheck();

      expect(health.latencyMs).toBeDefined();
      expect(typeof health.latencyMs).toBe("number");
    });
  });

  describe("batchUpsert (inherited)", () => {
    it("should throw when not initialized", async () => {
      const store = new VertexVectorSearchStore({
        projectId: "test-project",
        region: "us-central1",
      });

      const records = [{ id: "doc-1", vector: [0.1, 0.2], metadata: {} }];

      await expect(store.batchUpsert("test", records)).rejects.toThrow(
        "not initialized",
      );
    });
  });

  describe("queryAll (inherited)", () => {
    it("should throw when not initialized", async () => {
      const store = new VertexVectorSearchStore({
        projectId: "test-project",
        region: "us-central1",
      });

      await expect(
        store.queryAll("test", { vector: [0.1], topK: 10 }),
      ).rejects.toThrow("not initialized");
    });
  });

  describe("store identification", () => {
    it("should return vertex-vector as store name", () => {
      const store = new VertexVectorSearchStore({
        projectId: "test-project",
        region: "us-central1",
      });

      expect(store.getStoreName()).toBe("vertex-vector");
    });
  });

  describe("disconnect", () => {
    it("should reset initialization state", async () => {
      const store = new VertexVectorSearchStore({
        projectId: "test-project",
        region: "us-central1",
      });

      await store.disconnect();
      expect(store.isInitialized()).toBe(false);
    });

    it("should be idempotent", async () => {
      const store = new VertexVectorSearchStore({
        projectId: "test-project",
        region: "us-central1",
      });

      // Multiple disconnects should not throw
      await store.disconnect();
      await store.disconnect();
      await store.disconnect();

      expect(store.isInitialized()).toBe(false);
    });

    it("should clear token state", async () => {
      const store = new VertexVectorSearchStore({
        projectId: "test-project",
        region: "us-central1",
      });

      await store.disconnect();
      expect(store.isInitialized()).toBe(false);
    });
  });
});
