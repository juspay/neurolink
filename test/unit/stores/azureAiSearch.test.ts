/**
 * AzureAiSearchStore Unit Tests
 *
 * Tests for the Azure AI Search vector store implementation.
 *
 * Note: These tests focus on configuration and behavior that can be tested without
 * requiring actual Azure AI Search credentials. Integration tests with a real Azure
 * Search instance should be used for full API testing.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type AzureAiSearchConfig,
  AzureAiSearchStore,
} from "../../../src/lib/stores/enterprise/azureAiSearch.js";

// Mock logger
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("AzureAiSearchStore", () => {
  describe("constructor", () => {
    it("should create store with required config", () => {
      const store = new AzureAiSearchStore({
        endpoint: "https://test.search.windows.net",
        apiKey: "test-api-key",
      });

      expect(store).toBeDefined();
      expect(store.getStoreName()).toBe("azure-ai-search");
    });

    it("should accept optional API version", () => {
      const store = new AzureAiSearchStore({
        endpoint: "https://test.search.windows.net",
        apiKey: "test-api-key",
        apiVersion: "2023-11-01",
      });

      expect(store).toBeDefined();
    });

    it("should accept custom field names", () => {
      const store = new AzureAiSearchStore({
        endpoint: "https://test.search.windows.net",
        apiKey: "test-api-key",
        vectorFieldName: "embedding",
        metadataFieldName: "meta",
        contentFieldName: "text",
      });

      expect(store).toBeDefined();
    });

    it("should accept HNSW parameters", () => {
      const store = new AzureAiSearchStore({
        endpoint: "https://test.search.windows.net",
        apiKey: "test-api-key",
        hnswParameters: {
          m: 8,
          efConstruction: 500,
          efSearch: 600,
        },
      });

      expect(store).toBeDefined();
    });

    it("should not be initialized before connect", () => {
      const store = new AzureAiSearchStore({
        endpoint: "https://test.search.windows.net",
        apiKey: "test-api-key",
      });

      expect(store.isInitialized()).toBe(false);
    });

    it("should accept debug flag", () => {
      const store = new AzureAiSearchStore({
        endpoint: "https://test.search.windows.net",
        apiKey: "test-api-key",
        debug: true,
      });

      expect(store).toBeDefined();
    });

    it("should remove trailing slash from endpoint", () => {
      const store = new AzureAiSearchStore({
        endpoint: "https://test.search.windows.net/",
        apiKey: "test-api-key",
      });

      expect(store).toBeDefined();
    });
  });

  describe("initialization state", () => {
    let store: AzureAiSearchStore;

    beforeEach(() => {
      store = new AzureAiSearchStore({
        endpoint: "https://test.search.windows.net",
        apiKey: "test-api-key",
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
      const config: AzureAiSearchConfig = {
        endpoint: "https://test.search.windows.net",
        apiKey: "test-key",
      };

      const store = new AzureAiSearchStore(config);
      expect(store).toBeDefined();
    });

    it("should accept full config", () => {
      const config: AzureAiSearchConfig = {
        endpoint: "https://test.search.windows.net",
        apiKey: "test-key",
        apiVersion: "2024-07-01",
        vectorFieldName: "contentVector",
        metadataFieldName: "metadata",
        contentFieldName: "content",
        hnswParameters: {
          m: 4,
          efConstruction: 400,
          efSearch: 500,
        },
        debug: true,
        timeout: 30000,
        maxRetries: 3,
      };

      const store = new AzureAiSearchStore(config);
      expect(store).toBeDefined();
    });
  });

  describe("healthCheck", () => {
    it("should return unhealthy when not connected", async () => {
      const store = new AzureAiSearchStore({
        endpoint: "https://test.search.windows.net",
        apiKey: "test-api-key",
      });

      const health = await store.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.status).toBe("error");
      expect(health.error).toBeDefined();
      expect(health.lastChecked).toBeInstanceOf(Date);
    });

    it("should include latency measurement", async () => {
      const store = new AzureAiSearchStore({
        endpoint: "https://test.search.windows.net",
        apiKey: "test-api-key",
      });

      const health = await store.healthCheck();

      expect(health.latencyMs).toBeDefined();
      expect(typeof health.latencyMs).toBe("number");
    });
  });

  describe("batchUpsert (inherited)", () => {
    it("should throw when not initialized", async () => {
      const store = new AzureAiSearchStore({
        endpoint: "https://test.search.windows.net",
        apiKey: "test-api-key",
      });

      const records = [{ id: "doc-1", vector: [0.1, 0.2], metadata: {} }];

      await expect(store.batchUpsert("test", records)).rejects.toThrow(
        "not initialized",
      );
    });
  });

  describe("queryAll (inherited)", () => {
    it("should throw when not initialized", async () => {
      const store = new AzureAiSearchStore({
        endpoint: "https://test.search.windows.net",
        apiKey: "test-api-key",
      });

      await expect(
        store.queryAll("test", { vector: [0.1], topK: 10 }),
      ).rejects.toThrow("not initialized");
    });
  });

  describe("store identification", () => {
    it("should return azure-ai-search as store name", () => {
      const store = new AzureAiSearchStore({
        endpoint: "https://test.search.windows.net",
        apiKey: "test-api-key",
      });

      expect(store.getStoreName()).toBe("azure-ai-search");
    });
  });

  describe("disconnect", () => {
    it("should reset initialization state", async () => {
      const store = new AzureAiSearchStore({
        endpoint: "https://test.search.windows.net",
        apiKey: "test-api-key",
      });

      await store.disconnect();
      expect(store.isInitialized()).toBe(false);
    });

    it("should be idempotent", async () => {
      const store = new AzureAiSearchStore({
        endpoint: "https://test.search.windows.net",
        apiKey: "test-api-key",
      });

      // Multiple disconnects should not throw
      await store.disconnect();
      await store.disconnect();
      await store.disconnect();

      expect(store.isInitialized()).toBe(false);
    });
  });
});
