/**
 * StorageFactory Tests
 *
 * Comprehensive test suite for the StorageFactory class.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  StorageFactory,
  createStorage,
  getDefaultStorageConfig,
} from "../../src/lib/storage/StorageFactory.js";
import type { MastraStorageConfig as StorageProviderConfig } from "../../src/lib/types/index.js";
import type { MastraStorage } from "../../src/lib/types/index.js";

describe("StorageFactory", () => {
  beforeEach(() => {
    StorageFactory.clearCache();
  });

  afterEach(() => {
    StorageFactory.clearCache();
  });

  describe("Factory Creation", () => {
    it("should create a memory storage instance", async () => {
      const storage = await StorageFactory.createStorage({
        type: "memory",
      });

      expect(storage).toBeDefined();
      expect(storage.type).toBe("memory");
    });

    it("should create a file storage instance", async () => {
      const storage = await StorageFactory.createStorage({
        type: "file",
        path: "/tmp/neurolink-test-storage.json",
      });

      expect(storage).toBeDefined();
      expect(storage.type).toBe("file");
    });

    it("should throw error for unknown storage type", async () => {
      await expect(
        StorageFactory.createStorage({
          type: "unknown" as "memory",
        }),
      ).rejects.toThrow();
    });

    it("should cache storage instances by default", async () => {
      const config: StorageProviderConfig = { type: "memory" };
      const storage1 = await StorageFactory.createStorage(config);
      const storage2 = await StorageFactory.createStorage(config);

      expect(storage1).toBe(storage2);
    });

    it("should not cache when forceNew is true", async () => {
      const config: StorageProviderConfig = { type: "memory" };
      const storage1 = await StorageFactory.createStorage(config);
      const storage2 = await StorageFactory.createStorage(config, {
        forceNew: true,
      });

      expect(storage1).not.toBe(storage2);
    });
  });

  describe("Storage Initialization", () => {
    it("should auto-initialize storage by default", async () => {
      const storage = await StorageFactory.createStorage({ type: "memory" });

      // Should be able to perform operations immediately
      await expect(storage.healthCheck()).resolves.toBe(true);
    });

    it("should skip initialization when autoInit is false", async () => {
      const storage = await StorageFactory.createStorage(
        { type: "memory" },
        { autoInit: false },
      );

      expect(storage).toBeDefined();
    });
  });

  describe("Middleware Application", () => {
    it("should apply caching middleware", async () => {
      const storage = await StorageFactory.createStorage(
        { type: "memory" },
        {
          middleware: [
            {
              name: "caching",
              priority: 10,
              init: async () => {},
              destroy: async () => {},
            },
          ],
        },
      );

      expect(storage).toBeDefined();
    });

    it("should sort middleware by priority", async () => {
      const executionOrder: string[] = [];

      const middleware1 = {
        name: "low-priority",
        priority: 1,
        init: async () => {
          executionOrder.push("low");
        },
        destroy: async () => {},
      };

      const middleware2 = {
        name: "high-priority",
        priority: 10,
        init: async () => {
          executionOrder.push("high");
        },
        destroy: async () => {},
      };

      await StorageFactory.createStorage(
        { type: "memory" },
        { middleware: [middleware1, middleware2] },
      );

      expect(executionOrder).toEqual(["high", "low"]);
    });
  });

  describe("Environment Configuration", () => {
    it("should get storage config from environment", () => {
      const originalEnv = process.env.STORAGE_TYPE;
      process.env.STORAGE_TYPE = "memory";

      try {
        const config = StorageFactory.getStorageConfigFromEnv();
        expect(config.type).toBe("memory");
      } finally {
        if (originalEnv) {
          process.env.STORAGE_TYPE = originalEnv;
        } else {
          delete process.env.STORAGE_TYPE;
        }
      }
    });

    it("should use memory as default storage type", () => {
      const originalEnv = process.env.STORAGE_TYPE;
      delete process.env.STORAGE_TYPE;

      try {
        const config = StorageFactory.getStorageConfigFromEnv();
        expect(config.type).toBe("memory");
      } finally {
        if (originalEnv) {
          process.env.STORAGE_TYPE = originalEnv;
        }
      }
    });

    it("should parse Redis URL from environment", () => {
      const originalType = process.env.STORAGE_TYPE;
      const originalUrl = process.env.REDIS_URL;
      process.env.STORAGE_TYPE = "redis";
      process.env.REDIS_URL = "redis://localhost:6379";

      try {
        const config = StorageFactory.getStorageConfigFromEnv();
        expect(config.type).toBe("redis");
        expect((config as { type: "redis"; url: string }).url).toBe(
          "redis://localhost:6379",
        );
      } finally {
        if (originalType) {
          process.env.STORAGE_TYPE = originalType;
        } else {
          delete process.env.STORAGE_TYPE;
        }
        if (originalUrl) {
          process.env.REDIS_URL = originalUrl;
        } else {
          delete process.env.REDIS_URL;
        }
      }
    });
  });

  describe("Cache Management", () => {
    it("should clear all cached instances", async () => {
      await StorageFactory.createStorage({ type: "memory" });

      StorageFactory.clearCache();

      // After clearing, a new instance should be created
      const storage = await StorageFactory.createStorage({ type: "memory" });
      expect(storage).toBeDefined();
    });

    it("should clear specific cache key", async () => {
      const config1: StorageProviderConfig = { type: "memory" };
      const config2: StorageProviderConfig = { type: "memory", maxSize: 100 };

      const storage1 = await StorageFactory.createStorage(config1);
      const storage2 = await StorageFactory.createStorage(config2);

      // Clear only the first config's cache
      StorageFactory.clearCache(JSON.stringify(config1));

      const newStorage1 = await StorageFactory.createStorage(config1);
      const sameStorage2 = await StorageFactory.createStorage(config2);

      expect(newStorage1).not.toBe(storage1);
      expect(sameStorage2).toBe(storage2);
    });
  });

  describe("Factory Function", () => {
    it("should create storage using createStorage function", async () => {
      const storage = await createStorage({ type: "memory" });
      expect(storage).toBeDefined();
      expect(storage.type).toBe("memory");
    });
  });

  describe("getDefaultStorageConfig", () => {
    it("should return memory config as default", () => {
      const config = getDefaultStorageConfig();
      expect(config.type).toBe("memory");
    });
  });
});
