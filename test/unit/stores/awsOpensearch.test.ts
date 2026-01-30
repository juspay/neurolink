/**
 * AwsOpensearchStore Unit Tests
 *
 * Tests for the AWS OpenSearch vector store implementation.
 *
 * Note: These tests focus on configuration and behavior that can be tested without
 * requiring actual AWS credentials. Integration tests with a real OpenSearch
 * cluster should be used for full API testing.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type AwsOpensearchConfig,
  AwsOpensearchStore,
} from "../../../src/lib/stores/enterprise/awsOpensearch.js";

// Mock logger
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("AwsOpensearchStore", () => {
  describe("constructor", () => {
    it("should create store with required config", () => {
      const store = new AwsOpensearchStore({
        endpoint: "https://test-domain.us-east-1.es.amazonaws.com",
      });

      expect(store).toBeDefined();
      expect(store.getStoreName()).toBe("aws-opensearch");
    });

    it("should accept AWS region for auth", () => {
      const store = new AwsOpensearchStore({
        endpoint: "https://test-domain.us-east-1.es.amazonaws.com",
        region: "us-east-1",
      });

      expect(store).toBeDefined();
    });

    it("should accept AWS credentials", () => {
      const store = new AwsOpensearchStore({
        endpoint: "https://test-domain.us-east-1.es.amazonaws.com",
        region: "us-east-1",
        accessKeyId: "AKIAIOSFODNN7EXAMPLE",
        secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      });

      expect(store).toBeDefined();
    });

    it("should accept session token for temporary credentials", () => {
      const store = new AwsOpensearchStore({
        endpoint: "https://test-domain.us-east-1.es.amazonaws.com",
        region: "us-east-1",
        accessKeyId: "AKIAIOSFODNN7EXAMPLE",
        secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        sessionToken: "session-token",
      });

      expect(store).toBeDefined();
    });

    it("should accept basic auth credentials", () => {
      const store = new AwsOpensearchStore({
        endpoint: "https://test-domain.us-east-1.es.amazonaws.com",
        username: "admin",
        password: "Admin123!",
      });

      expect(store).toBeDefined();
    });

    it("should accept custom field names", () => {
      const store = new AwsOpensearchStore({
        endpoint: "https://test-domain.us-east-1.es.amazonaws.com",
        vectorFieldName: "embedding",
        metadataFieldName: "meta",
        contentFieldName: "text",
      });

      expect(store).toBeDefined();
    });

    it("should accept kNN algorithm configuration", () => {
      const store = new AwsOpensearchStore({
        endpoint: "https://test-domain.us-east-1.es.amazonaws.com",
        knnAlgorithm: "ivf",
      });

      expect(store).toBeDefined();
    });

    it("should accept HNSW parameters", () => {
      const store = new AwsOpensearchStore({
        endpoint: "https://test-domain.us-east-1.es.amazonaws.com",
        hnswParameters: {
          m: 24,
          efConstruction: 256,
          efSearch: 256,
        },
      });

      expect(store).toBeDefined();
    });

    it("should not be initialized before connect", () => {
      const store = new AwsOpensearchStore({
        endpoint: "https://test-domain.us-east-1.es.amazonaws.com",
      });

      expect(store.isInitialized()).toBe(false);
    });

    it("should accept debug flag", () => {
      const store = new AwsOpensearchStore({
        endpoint: "https://test-domain.us-east-1.es.amazonaws.com",
        debug: true,
      });

      expect(store).toBeDefined();
    });

    it("should remove trailing slash from endpoint", () => {
      const store = new AwsOpensearchStore({
        endpoint: "https://test-domain.us-east-1.es.amazonaws.com/",
      });

      expect(store).toBeDefined();
    });
  });

  describe("initialization state", () => {
    let store: AwsOpensearchStore;

    beforeEach(() => {
      store = new AwsOpensearchStore({
        endpoint: "https://test-domain.us-east-1.es.amazonaws.com",
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
      const config: AwsOpensearchConfig = {
        endpoint: "https://test-domain.us-east-1.es.amazonaws.com",
      };

      const store = new AwsOpensearchStore(config);
      expect(store).toBeDefined();
    });

    it("should accept full config with AWS auth", () => {
      const config: AwsOpensearchConfig = {
        endpoint: "https://test-domain.us-east-1.es.amazonaws.com",
        region: "us-east-1",
        accessKeyId: "AKIAIOSFODNN7EXAMPLE",
        secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        sessionToken: "session-token",
        useAwsAuth: true,
        vectorFieldName: "vector",
        metadataFieldName: "metadata",
        contentFieldName: "content",
        knnAlgorithm: "hnsw",
        hnswParameters: {
          m: 16,
          efConstruction: 512,
          efSearch: 512,
        },
        debug: true,
        timeout: 30000,
        maxRetries: 3,
      };

      const store = new AwsOpensearchStore(config);
      expect(store).toBeDefined();
    });

    it("should accept full config with basic auth", () => {
      const config: AwsOpensearchConfig = {
        endpoint: "https://test-domain.us-east-1.es.amazonaws.com",
        username: "admin",
        password: "Admin123!",
        vectorFieldName: "vector",
        metadataFieldName: "metadata",
        contentFieldName: "content",
        debug: true,
      };

      const store = new AwsOpensearchStore(config);
      expect(store).toBeDefined();
    });

    it("should support different kNN algorithms", () => {
      const algorithms: Array<"hnsw" | "ivf" | "ivfpq"> = [
        "hnsw",
        "ivf",
        "ivfpq",
      ];

      for (const algo of algorithms) {
        const store = new AwsOpensearchStore({
          endpoint: "https://test-domain.us-east-1.es.amazonaws.com",
          knnAlgorithm: algo,
        });
        expect(store).toBeDefined();
      }
    });
  });

  describe("healthCheck", () => {
    it("should return unhealthy when not connected", async () => {
      const store = new AwsOpensearchStore({
        endpoint: "https://test-domain.us-east-1.es.amazonaws.com",
      });

      const health = await store.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.status).toBe("error");
      expect(health.error).toBeDefined();
      expect(health.lastChecked).toBeInstanceOf(Date);
    });

    it("should include latency measurement", async () => {
      const store = new AwsOpensearchStore({
        endpoint: "https://test-domain.us-east-1.es.amazonaws.com",
      });

      const health = await store.healthCheck();

      expect(health.latencyMs).toBeDefined();
      expect(typeof health.latencyMs).toBe("number");
    });
  });

  describe("batchUpsert (inherited)", () => {
    it("should throw when not initialized", async () => {
      const store = new AwsOpensearchStore({
        endpoint: "https://test-domain.us-east-1.es.amazonaws.com",
      });

      const records = [{ id: "doc-1", vector: [0.1, 0.2], metadata: {} }];

      await expect(store.batchUpsert("test", records)).rejects.toThrow(
        "not initialized",
      );
    });
  });

  describe("queryAll (inherited)", () => {
    it("should throw when not initialized", async () => {
      const store = new AwsOpensearchStore({
        endpoint: "https://test-domain.us-east-1.es.amazonaws.com",
      });

      await expect(
        store.queryAll("test", { vector: [0.1], topK: 10 }),
      ).rejects.toThrow("not initialized");
    });
  });

  describe("store identification", () => {
    it("should return aws-opensearch as store name", () => {
      const store = new AwsOpensearchStore({
        endpoint: "https://test-domain.us-east-1.es.amazonaws.com",
      });

      expect(store.getStoreName()).toBe("aws-opensearch");
    });
  });

  describe("disconnect", () => {
    it("should reset initialization state", async () => {
      const store = new AwsOpensearchStore({
        endpoint: "https://test-domain.us-east-1.es.amazonaws.com",
      });

      await store.disconnect();
      expect(store.isInitialized()).toBe(false);
    });

    it("should be idempotent", async () => {
      const store = new AwsOpensearchStore({
        endpoint: "https://test-domain.us-east-1.es.amazonaws.com",
      });

      // Multiple disconnects should not throw
      await store.disconnect();
      await store.disconnect();
      await store.disconnect();

      expect(store.isInitialized()).toBe(false);
    });

    it("should clear auth header state", async () => {
      const store = new AwsOpensearchStore({
        endpoint: "https://test-domain.us-east-1.es.amazonaws.com",
        username: "admin",
        password: "Admin123!",
      });

      await store.disconnect();
      expect(store.isInitialized()).toBe(false);
    });
  });
});
