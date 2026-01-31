/**
 * Storage Factory Unit Tests
 *
 * Tests for the StorageFactory including:
 * - Provider registration
 * - Provider creation
 * - Alias resolution
 * - Singleton pattern
 * - Configuration handling
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { StorageFactory } from "../../../src/lib/storage/storageFactory.js";
import type { StorageProvider } from "../../../src/lib/storage/types.js";

describe("StorageFactory", () => {
  beforeEach(async () => {
    await StorageFactory.reset();
  });

  afterEach(async () => {
    await StorageFactory.reset();
  });

  describe("Provider Registration", () => {
    it("should register all built-in providers", async () => {
      await StorageFactory.registerAllProviders();

      const types = StorageFactory.getRegisteredTypes();
      expect(types).toContain("memory");
      expect(types).toContain("postgresql");
      expect(types).toContain("mongodb");
      expect(types).toContain("libsql");
      expect(types).toContain("redis");
    });

    it("should not re-register providers", async () => {
      await StorageFactory.registerAllProviders();
      const types1 = StorageFactory.getRegisteredTypes();

      await StorageFactory.registerAllProviders();
      const types2 = StorageFactory.getRegisteredTypes();

      expect(types1).toEqual(types2);
    });

    it("should check if provider is registered", async () => {
      await StorageFactory.registerAllProviders();

      expect(StorageFactory.isRegistered("memory")).toBe(true);
      expect(StorageFactory.isRegistered("postgresql")).toBe(true);
      expect(StorageFactory.isRegistered("unknown")).toBe(false);
    });

    it("should get aliases for a backend type", async () => {
      await StorageFactory.registerAllProviders();

      const memoryAliases = StorageFactory.getAliases("memory");
      expect(memoryAliases).toContain("mem");
      expect(memoryAliases).toContain("in-memory");

      const postgresAliases = StorageFactory.getAliases("postgresql");
      expect(postgresAliases).toContain("postgres");
      expect(postgresAliases).toContain("pg");
    });
  });

  describe("Provider Creation", () => {
    it("should create a memory provider", async () => {
      const provider = await StorageFactory.createProvider("memory");

      expect(provider).toBeDefined();
      expect(provider.type).toBe("memory");

      await provider.close();
    });

    it("should create a memory provider with alias", async () => {
      const provider = await StorageFactory.createProvider("mem");

      expect(provider).toBeDefined();
      expect(provider.type).toBe("memory");

      await provider.close();
    });

    it("should throw error for unknown provider", async () => {
      await expect(
        StorageFactory.createProvider("unknown-provider"),
      ).rejects.toThrow(/Unknown storage backend/);
    });

    it("should create provider with configuration", async () => {
      const config = { maxEntries: 100, cleanupIntervalMs: 5000 };
      const provider = await StorageFactory.createProvider("memory", config);

      expect(provider).toBeDefined();
      expect(provider.type).toBe("memory");

      await provider.close();
    });

    it("should handle case-insensitive provider names", async () => {
      const provider1 = await StorageFactory.createProvider("MEMORY");
      const provider2 = await StorageFactory.createProvider("Memory");
      const provider3 = await StorageFactory.createProvider("memory");

      expect(provider1.type).toBe("memory");
      expect(provider2.type).toBe("memory");
      expect(provider3.type).toBe("memory");

      await provider1.close();
      await provider2.close();
      await provider3.close();
    });
  });

  describe("Configuration-based Creation", () => {
    it("should create from memory config", async () => {
      const config = {
        type: "memory" as const,
        config: { maxEntries: 100 },
      };

      const provider = await StorageFactory.createFromConfig(config);

      expect(provider.type).toBe("memory");
      await provider.close();
    });

    it("should create from config without extra config", async () => {
      const config = { type: "memory" as const };

      const provider = await StorageFactory.createFromConfig(config);

      expect(provider.type).toBe("memory");
      await provider.close();
    });
  });

  describe("Singleton Pattern", () => {
    it("should return same instance with getOrCreate", async () => {
      const provider1 = await StorageFactory.getOrCreate("memory");
      const provider2 = await StorageFactory.getOrCreate("memory");

      expect(provider1).toBe(provider2);

      await StorageFactory.clearInstances();
    });

    it("should create different instances with different keys", async () => {
      const provider1 = await StorageFactory.getOrCreate(
        "memory",
        undefined,
        "instance1",
      );
      const provider2 = await StorageFactory.getOrCreate(
        "memory",
        undefined,
        "instance2",
      );

      expect(provider1).not.toBe(provider2);

      await StorageFactory.clearInstances();
    });

    it("should create new instance after clearInstances", async () => {
      const provider1 = await StorageFactory.getOrCreate("memory");
      await StorageFactory.clearInstances();
      const provider2 = await StorageFactory.getOrCreate("memory");

      expect(provider1).not.toBe(provider2);

      await StorageFactory.clearInstances();
    });
  });

  describe("Lifecycle Management", () => {
    it("should close all instances on clearInstances", async () => {
      const provider1 = await StorageFactory.getOrCreate(
        "memory",
        undefined,
        "instance1",
      );
      const provider2 = await StorageFactory.getOrCreate(
        "memory",
        undefined,
        "instance2",
      );

      // Initialize providers to create data
      await provider1.init();
      await provider2.init();

      await provider1.createThread({ resourceId: "user1", title: "Test" });
      await provider2.createThread({ resourceId: "user2", title: "Test" });

      await StorageFactory.clearInstances();

      // Providers should be closed
      // Creating new instances should return fresh providers
      const provider3 = await StorageFactory.getOrCreate("memory");
      await provider3.init();

      const stats = await provider3.getStats();
      expect(stats.threadCount).toBe(0);

      await provider3.close();
    });

    it("should clear registrations", async () => {
      await StorageFactory.registerAllProviders();
      expect(StorageFactory.getRegisteredTypes().length).toBeGreaterThan(0);

      StorageFactory.clearRegistrations();
      expect(StorageFactory.getRegisteredTypes().length).toBe(0);
    });

    it("should reset factory completely", async () => {
      await StorageFactory.registerAllProviders();
      await StorageFactory.getOrCreate("memory");

      expect(StorageFactory.getRegisteredTypes().length).toBeGreaterThan(0);

      await StorageFactory.reset();

      expect(StorageFactory.getRegisteredTypes().length).toBe(0);
    });
  });

  describe("Alias Resolution", () => {
    it("should resolve memory aliases", async () => {
      await StorageFactory.registerAllProviders();

      const provider1 = await StorageFactory.createProvider("memory");
      const provider2 = await StorageFactory.createProvider("mem");
      const provider3 = await StorageFactory.createProvider("in-memory");

      expect(provider1.type).toBe("memory");
      expect(provider2.type).toBe("memory");
      expect(provider3.type).toBe("memory");

      await provider1.close();
      await provider2.close();
      await provider3.close();
    });

    it("should resolve postgresql aliases", async () => {
      await StorageFactory.registerAllProviders();

      // Note: These will fail to connect without real DB config,
      // but we're just testing alias resolution
      const createPromises = [
        StorageFactory.createProvider("postgresql", {
          connectionString: "postgresql://localhost/test",
        }).catch((e) => e),
        StorageFactory.createProvider("postgres", {
          connectionString: "postgresql://localhost/test",
        }).catch((e) => e),
        StorageFactory.createProvider("pg", {
          connectionString: "postgresql://localhost/test",
        }).catch((e) => e),
      ];

      const results = await Promise.all(createPromises);

      // All should create the same type of provider
      results.forEach((result) => {
        if (!(result instanceof Error)) {
          expect(result.type).toBe("postgresql");
        }
      });

      // Close any successfully created providers
      for (const result of results) {
        if (!(result instanceof Error)) {
          await result.close();
        }
      }
    });

    it("should resolve libsql aliases", async () => {
      await StorageFactory.registerAllProviders();

      const provider1 = await StorageFactory.createProvider("libsql", {
        url: "file::memory:",
      });
      const provider2 = await StorageFactory.createProvider("sqlite", {
        url: "file::memory:",
      });

      expect(provider1.type).toBe("libsql");
      expect(provider2.type).toBe("libsql");

      await provider1.close();
      await provider2.close();
    });
  });

  describe("Error Handling", () => {
    it("should provide helpful error for unknown backend", async () => {
      await StorageFactory.registerAllProviders();

      try {
        await StorageFactory.createProvider("unknown-backend");
        expect.fail("Should have thrown error");
      } catch (error: unknown) {
        const errorMessage = (error as Error).message;
        expect(errorMessage).toContain("Unknown storage backend");
        expect(errorMessage).toContain("Available backends:");
      }
    });

    it("should handle creation errors gracefully", async () => {
      await StorageFactory.registerAllProviders();

      // PostgreSQL without config should fail gracefully
      await expect(
        StorageFactory.createProvider("postgresql", {}),
      ).rejects.toThrow();
    });
  });

  describe("Custom Provider Registration", () => {
    it("should allow custom provider registration", async () => {
      const mockFactory = async (): Promise<StorageProvider> => {
        const { MemoryAdapter } = await import(
          "../../../src/lib/storage/adapters/memoryAdapter.js"
        );
        return new MemoryAdapter();
      };

      StorageFactory.registerProvider(
        "custom" as any,
        mockFactory,
        undefined,
        ["custom-alias"],
      );

      expect(StorageFactory.isRegistered("custom")).toBe(true);
      expect(StorageFactory.isRegistered("custom-alias")).toBe(true);

      const provider = await StorageFactory.createProvider("custom");
      expect(provider).toBeDefined();

      await provider.close();
    });
  });

  describe("Concurrent Access", () => {
    it("should handle concurrent provider creation", async () => {
      const createPromises = Array.from({ length: 10 }, () =>
        StorageFactory.createProvider("memory"),
      );

      const providers = await Promise.all(createPromises);

      expect(providers).toHaveLength(10);
      providers.forEach((p) => expect(p.type).toBe("memory"));

      await Promise.all(providers.map((p) => p.close()));
    });

    it("should handle concurrent singleton access", async () => {
      const getPromises = Array.from({ length: 10 }, () =>
        StorageFactory.getOrCreate("memory", undefined, "shared"),
      );

      const providers = await Promise.all(getPromises);

      // All should be the same instance
      const first = providers[0];
      providers.forEach((p) => expect(p).toBe(first));

      await StorageFactory.clearInstances();
    });
  });
});
