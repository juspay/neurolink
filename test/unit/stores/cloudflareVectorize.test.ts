/**
 * CloudflareVectorizeStore Unit Tests
 *
 * Tests for the Cloudflare Vectorize store implementation.
 *
 * Note: Due to the CloudflareVectorizeStore using HTTP REST API,
 * these tests focus on configuration and behavior that can be tested without
 * requiring actual Cloudflare credentials. Integration tests with a real
 * Cloudflare account should be used for full API testing.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type CloudflareVectorizeConfig,
  CloudflareVectorizeStore,
} from "../../../src/lib/stores/cloud/cloudflareVectorize.js";

// Mock logger
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("CloudflareVectorizeStore", () => {
  describe("constructor", () => {
    it("should create store with required config", () => {
      const store = new CloudflareVectorizeStore({
        accountId: "test-account-id",
        apiToken: "test-api-token",
        indexName: "test-index",
      });

      expect(store).toBeDefined();
      expect(store.getStoreName()).toBe("cloudflare");
    });

    it("should accept optional base URL", () => {
      const store = new CloudflareVectorizeStore({
        accountId: "test-account-id",
        apiToken: "test-api-token",
        indexName: "test-index",
        baseUrl: "https://custom-api.example.com",
      });

      expect(store).toBeDefined();
    });

    it("should not be initialized before connect", () => {
      const store = new CloudflareVectorizeStore({
        accountId: "test-account-id",
        apiToken: "test-api-token",
        indexName: "test-index",
      });

      expect(store.isInitialized()).toBe(false);
    });

    it("should accept debug flag", () => {
      const store = new CloudflareVectorizeStore({
        accountId: "test-account-id",
        apiToken: "test-api-token",
        indexName: "test-index",
        debug: true,
      });

      expect(store).toBeDefined();
    });
  });

  describe("initialization state", () => {
    let store: CloudflareVectorizeStore;

    beforeEach(() => {
      store = new CloudflareVectorizeStore({
        accountId: "test-account-id",
        apiToken: "test-api-token",
        indexName: "test-index",
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

    it("should return false on indexExists when not initialized", async () => {
      // indexExists returns false when not initialized (catches errors)
      const exists = await store.indexExists("test");
      expect(exists).toBe(false);
    });
  });

  describe("configuration types", () => {
    it("should accept minimal config", () => {
      const config: CloudflareVectorizeConfig = {
        accountId: "test-account-id",
        apiToken: "test-api-token",
        indexName: "test-index",
      };

      const store = new CloudflareVectorizeStore(config);
      expect(store).toBeDefined();
    });

    it("should accept full config", () => {
      const config: CloudflareVectorizeConfig = {
        accountId: "test-account-id",
        apiToken: "test-api-token",
        indexName: "test-index",
        baseUrl: "https://custom-api.example.com",
        debug: true,
        timeout: 30000,
        maxRetries: 5,
      };

      const store = new CloudflareVectorizeStore(config);
      expect(store).toBeDefined();
    });
  });

  describe("healthCheck", () => {
    it("should return unhealthy when not connected", async () => {
      const store = new CloudflareVectorizeStore({
        accountId: "test-account-id",
        apiToken: "test-api-token",
        indexName: "test-index",
      });

      const health = await store.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.status).toBe("error");
      expect(health.error).toBeDefined();
      expect(health.lastChecked).toBeInstanceOf(Date);
    });

    it("should include latency measurement", async () => {
      const store = new CloudflareVectorizeStore({
        accountId: "test-account-id",
        apiToken: "test-api-token",
        indexName: "test-index",
      });

      const health = await store.healthCheck();

      expect(health.latencyMs).toBeDefined();
      expect(typeof health.latencyMs).toBe("number");
    });
  });

  describe("batchUpsert (inherited)", () => {
    it("should throw when not initialized", async () => {
      const store = new CloudflareVectorizeStore({
        accountId: "test-account-id",
        apiToken: "test-api-token",
        indexName: "test-index",
      });

      const records = [{ id: "doc-1", vector: [0.1, 0.2], metadata: {} }];

      await expect(store.batchUpsert("test", records)).rejects.toThrow(
        "not initialized",
      );
    });
  });

  describe("queryAll (inherited)", () => {
    it("should throw when not initialized", async () => {
      const store = new CloudflareVectorizeStore({
        accountId: "test-account-id",
        apiToken: "test-api-token",
        indexName: "test-index",
      });

      await expect(
        store.queryAll("test", { vector: [0.1], topK: 10 }),
      ).rejects.toThrow("not initialized");
    });
  });

  describe("store identification", () => {
    it("should return cloudflare as store name", () => {
      const store = new CloudflareVectorizeStore({
        accountId: "test-account-id",
        apiToken: "test-api-token",
        indexName: "test-index",
      });

      expect(store.getStoreName()).toBe("cloudflare");
    });
  });

  describe("connect error handling", () => {
    it("should handle API errors gracefully", async () => {
      const store = new CloudflareVectorizeStore({
        accountId: "invalid-account",
        apiToken: "invalid-token",
        indexName: "test-index",
      });

      // Connect should fail with invalid credentials
      await expect(store.connect()).rejects.toThrow();
    });
  });

  describe("disconnect", () => {
    it("should reset initialization state", async () => {
      const store = new CloudflareVectorizeStore({
        accountId: "test-account-id",
        apiToken: "test-api-token",
        indexName: "test-index",
      });

      // Disconnect should work even when not connected
      await store.disconnect();
      expect(store.isInitialized()).toBe(false);
    });

    it("should be idempotent", async () => {
      const store = new CloudflareVectorizeStore({
        accountId: "test-account-id",
        apiToken: "test-api-token",
        indexName: "test-index",
      });

      // Multiple disconnects should not throw
      await store.disconnect();
      await store.disconnect();
      await store.disconnect();

      expect(store.isInitialized()).toBe(false);
    });
  });
});
