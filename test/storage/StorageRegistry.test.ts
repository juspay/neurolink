/**
 * StorageRegistry Tests
 *
 * Comprehensive test suite for the StorageRegistry class.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  StorageRegistry,
  registerStorageBackend,
  getStorageBackend,
  checkStorageHealth,
} from "../../src/lib/storage/StorageRegistry.js";
import { MemoryStorageAdapter } from "../../src/lib/storage/adapters/MemoryStorageAdapter.js";

describe("StorageRegistry", () => {
  beforeEach(() => {
    StorageRegistry.clear();
  });

  afterEach(() => {
    StorageRegistry.clear();
  });

  describe("Backend Registration", () => {
    it("should register a storage backend", async () => {
      const storage = new MemoryStorageAdapter();
      await storage.init();

      StorageRegistry.registerAdapter("memory", {
        instance: storage,
        description: "In-memory storage",
      });

      const registered = await StorageRegistry.getAdapter("memory");
      expect(registered).toBe(storage);
    });

    it("should register backend with factory function", async () => {
      StorageRegistry.registerAdapter("memory", {
        factory: async () => {
          const storage = new MemoryStorageAdapter();
          await storage.init();
          return storage;
        },
        description: "In-memory storage factory",
      });

      const storage = await StorageRegistry.getAdapter("memory");
      expect(storage).toBeDefined();
      expect(storage?.type).toBe("memory");
    });

    it("should throw error when registering duplicate backend", async () => {
      const storage = new MemoryStorageAdapter();
      await storage.init();

      StorageRegistry.registerAdapter("memory", {
        instance: storage,
      });

      expect(() =>
        StorageRegistry.registerAdapter("memory", {
          instance: storage,
        }),
      ).toThrow();
    });

    it("should register backend with aliases", async () => {
      const storage = new MemoryStorageAdapter();
      await storage.init();

      StorageRegistry.registerAdapter("memory", {
        instance: storage,
        aliases: ["mem", "in-memory"],
      });

      const fromAlias1 = await StorageRegistry.getAdapter("mem");
      const fromAlias2 = await StorageRegistry.getAdapter("in-memory");

      expect(fromAlias1).toBe(storage);
      expect(fromAlias2).toBe(storage);
    });
  });

  describe("Backend Retrieval", () => {
    it("should return undefined for unregistered backend", async () => {
      const backend = await StorageRegistry.getAdapter("nonexistent");
      expect(backend).toBeUndefined();
    });

    it("should return registered backend instance", async () => {
      const storage = new MemoryStorageAdapter();
      await storage.init();

      StorageRegistry.registerAdapter("memory", {
        instance: storage,
      });

      const retrieved = await StorageRegistry.getAdapter("memory");
      expect(retrieved).toBe(storage);
    });

    it("should create backend from factory on first retrieval", async () => {
      const factoryFn = vi.fn(async () => {
        const storage = new MemoryStorageAdapter();
        await storage.init();
        return storage;
      });

      StorageRegistry.registerAdapter("memory", {
        factory: factoryFn,
      });

      // First retrieval should call factory
      await StorageRegistry.getAdapter("memory");
      expect(factoryFn).toHaveBeenCalledTimes(1);

      // Second retrieval should use cached instance
      await StorageRegistry.getAdapter("memory");
      expect(factoryFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("Health Checks", () => {
    it("should check health of registered backend", async () => {
      const storage = new MemoryStorageAdapter();
      await storage.init();

      StorageRegistry.registerAdapter("memory", {
        instance: storage,
      });

      const health = await StorageRegistry.checkHealth("memory");
      expect(health.healthy).toBe(true);
      expect(health.type).toBe("memory");
    });

    it("should return unhealthy for unregistered backend", async () => {
      const health = await StorageRegistry.checkHealth("nonexistent");
      expect(health.healthy).toBe(false);
      expect(health.error).toBeDefined();
    });

    it("should check health of all backends", async () => {
      const storage1 = new MemoryStorageAdapter();
      const storage2 = new MemoryStorageAdapter();
      await storage1.init();
      await storage2.init();

      StorageRegistry.registerAdapter("memory1", { instance: storage1 });
      StorageRegistry.registerAdapter("memory2", { instance: storage2 });

      const results = await StorageRegistry.checkAllHealth();
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.healthy)).toBe(true);
    });
  });

  describe("Backend Listing", () => {
    it("should list all registered backends", async () => {
      const storage1 = new MemoryStorageAdapter();
      const storage2 = new MemoryStorageAdapter();
      await storage1.init();
      await storage2.init();

      StorageRegistry.registerAdapter("memory1", {
        instance: storage1,
        description: "First memory storage",
      });
      StorageRegistry.registerAdapter("memory2", {
        instance: storage2,
        description: "Second memory storage",
      });

      const backends = StorageRegistry.listBackends();
      expect(backends).toHaveLength(2);
      expect(backends.map((b) => b.type)).toContain("memory1");
      expect(backends.map((b) => b.type)).toContain("memory2");
    });

    it("should include backend descriptions", async () => {
      const storage = new MemoryStorageAdapter();
      await storage.init();

      StorageRegistry.registerAdapter("memory", {
        instance: storage,
        description: "Test description",
      });

      const backends = StorageRegistry.listBackends();
      expect(backends[0].description).toBe("Test description");
    });
  });

  describe("Backend Removal", () => {
    it("should unregister a backend", async () => {
      const storage = new MemoryStorageAdapter();
      await storage.init();

      StorageRegistry.registerAdapter("memory", {
        instance: storage,
      });

      StorageRegistry.unregisterBackend("memory");

      const retrieved = await StorageRegistry.getAdapter("memory");
      expect(retrieved).toBeUndefined();
    });

    it("should clear all backends", async () => {
      const storage1 = new MemoryStorageAdapter();
      const storage2 = new MemoryStorageAdapter();
      await storage1.init();
      await storage2.init();

      StorageRegistry.registerAdapter("memory1", { instance: storage1 });
      StorageRegistry.registerAdapter("memory2", { instance: storage2 });

      StorageRegistry.clear();

      const backends = StorageRegistry.listBackends();
      expect(backends).toHaveLength(0);
    });
  });

  describe("Event Emission", () => {
    it("should emit event when backend is registered", async () => {
      const handler = vi.fn();
      StorageRegistry.on("backend:registered", handler);

      const storage = new MemoryStorageAdapter();
      await storage.init();

      StorageRegistry.registerAdapter("memory", {
        instance: storage,
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "memory",
        }),
      );
    });

    it("should emit event when backend is unregistered", async () => {
      const handler = vi.fn();
      StorageRegistry.on("backend:unregistered", handler);

      const storage = new MemoryStorageAdapter();
      await storage.init();

      StorageRegistry.registerAdapter("memory", {
        instance: storage,
      });

      StorageRegistry.unregisterBackend("memory");

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "memory",
        }),
      );
    });
  });

  describe("Convenience Functions", () => {
    it("should register using registerStorageBackend", async () => {
      const storage = new MemoryStorageAdapter();
      await storage.init();

      registerStorageBackend("memory", { instance: storage });

      const retrieved = await getStorageBackend("memory");
      expect(retrieved).toBe(storage);
    });

    it("should check health using checkStorageHealth", async () => {
      const storage = new MemoryStorageAdapter();
      await storage.init();

      registerStorageBackend("memory", { instance: storage });

      const health = await checkStorageHealth("memory");
      expect(health.healthy).toBe(true);
    });
  });
});
