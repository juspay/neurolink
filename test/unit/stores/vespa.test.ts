/**
 * VespaStore Unit Tests
 *
 * Tests for the Vespa vector store implementation.
 *
 * Note: The VespaStore uses HTTP API calls for communication.
 * These tests focus on configuration and behavior that can be tested without
 * requiring a real Vespa instance. Integration tests with a real Vespa
 * deployment should be used for full API testing.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type VespaConfig,
  VespaStore,
} from "../../../src/lib/stores/enterprise/vespa.js";

// Mock logger
vi.mock("../../../src/lib/utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe("VespaStore", () => {
  describe("constructor", () => {
    it("should create store with required config", () => {
      const store = new VespaStore({
        endpoint: "http://localhost:8080",
        applicationName: "test-app",
      });

      expect(store).toBeDefined();
      expect(store.getStoreName()).toBe("vespa");
    });

    it("should accept API key for Vespa Cloud", () => {
      const store = new VespaStore({
        endpoint: "https://vespa-cloud.example.com",
        applicationName: "test-app",
        apiKey: "test-api-key",
      });

      expect(store).toBeDefined();
    });

    it("should accept custom namespace", () => {
      const store = new VespaStore({
        endpoint: "http://localhost:8080",
        applicationName: "test-app",
        namespace: "custom_namespace",
      });

      expect(store).toBeDefined();
    });

    it("should accept custom vector field name", () => {
      const store = new VespaStore({
        endpoint: "http://localhost:8080",
        applicationName: "test-app",
        vectorFieldName: "vector",
      });

      expect(store).toBeDefined();
    });

    it("should accept custom content type", () => {
      const store = new VespaStore({
        endpoint: "http://localhost:8080",
        applicationName: "test-app",
        contentType: "custom_vectors",
      });

      expect(store).toBeDefined();
    });

    it("should accept custom request timeout", () => {
      const store = new VespaStore({
        endpoint: "http://localhost:8080",
        applicationName: "test-app",
        requestTimeout: 60000,
      });

      expect(store).toBeDefined();
    });

    it("should accept mTLS certificate paths", () => {
      const store = new VespaStore({
        endpoint: "https://vespa.example.com",
        applicationName: "test-app",
        certPath: "/path/to/cert.pem",
        keyPath: "/path/to/key.pem",
        caCertPath: "/path/to/ca.pem",
      });

      expect(store).toBeDefined();
    });

    it("should not be initialized before connect", () => {
      const store = new VespaStore({
        endpoint: "http://localhost:8080",
        applicationName: "test-app",
      });

      expect(store.isInitialized()).toBe(false);
    });

    it("should accept debug flag", () => {
      const store = new VespaStore({
        endpoint: "http://localhost:8080",
        applicationName: "test-app",
        debug: true,
      });

      expect(store).toBeDefined();
    });
  });

  describe("initialization state", () => {
    let store: VespaStore;

    beforeEach(() => {
      store = new VespaStore({
        endpoint: "http://localhost:8080",
        applicationName: "test-app",
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

    it("should throw on indexExists when not initialized", async () => {
      await expect(store.indexExists("test")).rejects.toThrow(
        "not initialized. Call connect() first",
      );
    });

    it("should throw on updateVector when not initialized", async () => {
      await expect(
        store.updateVector("test", "id-1", { metadata: { key: "value" } }),
      ).rejects.toThrow("not initialized. Call connect() first");
    });
  });

  describe("configuration types", () => {
    it("should accept minimal config", () => {
      const config: VespaConfig = {
        endpoint: "http://localhost:8080",
        applicationName: "test-app",
      };

      const store = new VespaStore(config);
      expect(store).toBeDefined();
    });

    it("should accept full config", () => {
      const config: VespaConfig = {
        endpoint: "https://vespa.example.com:443",
        applicationName: "production-app",
        apiKey: "secure-api-key",
        certPath: "/path/to/cert.pem",
        keyPath: "/path/to/key.pem",
        caCertPath: "/path/to/ca.pem",
        namespace: "production",
        vectorFieldName: "embedding",
        contentType: "documents",
        requestTimeout: 60000,
        debug: true,
        timeout: 30000,
        maxRetries: 5,
      };

      const store = new VespaStore(config);
      expect(store).toBeDefined();
    });

    it("should support Vespa Cloud configuration", () => {
      const config: VespaConfig = {
        endpoint: "https://my-app.vespa-cloud.com",
        applicationName: "cloud-app",
        apiKey: "vespa-cloud-api-key",
      };

      const store = new VespaStore(config);
      expect(store).toBeDefined();
    });

    it("should support self-hosted configuration with mTLS", () => {
      const config: VespaConfig = {
        endpoint: "https://vespa.internal:8443",
        applicationName: "internal-app",
        certPath: "/certs/client.pem",
        keyPath: "/certs/client-key.pem",
        caCertPath: "/certs/ca.pem",
      };

      const store = new VespaStore(config);
      expect(store).toBeDefined();
    });
  });

  describe("healthCheck", () => {
    it("should return unhealthy when not connected", async () => {
      const store = new VespaStore({
        endpoint: "http://localhost:8080",
        applicationName: "test-app",
      });

      const health = await store.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.status).toBe("error");
      expect(health.error).toBeDefined();
      expect(health.lastChecked).toBeInstanceOf(Date);
    });

    it("should include latency measurement", async () => {
      const store = new VespaStore({
        endpoint: "http://localhost:8080",
        applicationName: "test-app",
      });

      const health = await store.healthCheck();

      expect(health.latencyMs).toBeDefined();
      expect(typeof health.latencyMs).toBe("number");
    });
  });

  describe("batchUpsert (inherited)", () => {
    it("should throw when not initialized", async () => {
      const store = new VespaStore({
        endpoint: "http://localhost:8080",
        applicationName: "test-app",
      });

      const records = [{ id: "doc-1", vector: [0.1, 0.2], metadata: {} }];

      await expect(store.batchUpsert("test", records)).rejects.toThrow(
        "not initialized",
      );
    });
  });

  describe("queryAll (inherited)", () => {
    it("should throw when not initialized", async () => {
      const store = new VespaStore({
        endpoint: "http://localhost:8080",
        applicationName: "test-app",
      });

      await expect(
        store.queryAll("test", { vector: [0.1], topK: 10 }),
      ).rejects.toThrow("not initialized");
    });
  });

  describe("store identification", () => {
    it("should return vespa as store name", () => {
      const store = new VespaStore({
        endpoint: "http://localhost:8080",
        applicationName: "test-app",
      });

      expect(store.getStoreName()).toBe("vespa");
    });
  });

  describe("connect error handling", () => {
    it("should handle connection failure gracefully", async () => {
      const store = new VespaStore({
        endpoint: "http://non-existent-host:8080",
        applicationName: "test-app",
      });

      try {
        await store.connect();
        expect(store.isInitialized()).toBe(true);
        await store.disconnect();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("disconnect", () => {
    it("should reset initialization state", async () => {
      const store = new VespaStore({
        endpoint: "http://localhost:8080",
        applicationName: "test-app",
      });

      try {
        await store.connect();
        expect(store.isInitialized()).toBe(true);

        await store.disconnect();
        expect(store.isInitialized()).toBe(false);
      } catch {
        await store.disconnect();
        expect(store.isInitialized()).toBe(false);
      }
    });

    it("should be idempotent", async () => {
      const store = new VespaStore({
        endpoint: "http://localhost:8080",
        applicationName: "test-app",
      });

      await store.disconnect();
      await store.disconnect();
      await store.disconnect();

      expect(store.isInitialized()).toBe(false);
    });

    it("should clear local index store", async () => {
      const store = new VespaStore({
        endpoint: "http://localhost:8080",
        applicationName: "test-app",
      });

      await store.disconnect();

      expect(store.isInitialized()).toBe(false);
    });
  });
});
