/**
 * MigrationManager Tests
 *
 * Comprehensive test suite for the MigrationManager class.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  MigrationManager,
  createMigrationManager,
  BuiltInMigrations,
} from "../../src/lib/storage/MigrationManager.js";
import { MemoryStorageAdapter } from "../../src/lib/storage/adapters/MemoryStorageAdapter.js";
import type { MastraMigration as Migration } from "../../src/lib/types/index.js";

describe("MigrationManager", () => {
  let storage: MemoryStorageAdapter;
  let manager: MigrationManager;

  beforeEach(async () => {
    storage = new MemoryStorageAdapter();
    await storage.init();
    manager = new MigrationManager(storage);
  });

  afterEach(async () => {
    await storage.close();
  });

  describe("Migration Registration", () => {
    it("should register a migration", () => {
      const migration: Migration = {
        version: 1,
        name: "test_migration",
        up: vi.fn(),
      };

      manager.register(migration);

      const registered = manager.getRegisteredMigrations();
      expect(registered).toHaveLength(1);
      expect(registered[0].version).toBe(1);
    });

    it("should register multiple migrations", () => {
      manager.registerAll([
        { version: 1, name: "migration_1", up: vi.fn() },
        { version: 2, name: "migration_2", up: vi.fn() },
        { version: 3, name: "migration_3", up: vi.fn() },
      ]);

      const registered = manager.getRegisteredMigrations();
      expect(registered).toHaveLength(3);
    });

    it("should throw for duplicate version", () => {
      manager.register({ version: 1, name: "first", up: vi.fn() });

      expect(() => {
        manager.register({ version: 1, name: "duplicate", up: vi.fn() });
      }).toThrow();
    });

    it("should throw for invalid version", () => {
      expect(() => {
        manager.register({ version: 0, name: "invalid", up: vi.fn() });
      }).toThrow();

      expect(() => {
        manager.register({ version: -1, name: "negative", up: vi.fn() });
      }).toThrow();
    });

    it("should return migrations sorted by version", () => {
      manager.registerAll([
        { version: 3, name: "third", up: vi.fn() },
        { version: 1, name: "first", up: vi.fn() },
        { version: 2, name: "second", up: vi.fn() },
      ]);

      const registered = manager.getRegisteredMigrations();
      expect(registered.map((m) => m.version)).toEqual([1, 2, 3]);
    });
  });

  describe("Migration Status", () => {
    it("should report current version as 0 when no migrations applied", async () => {
      const status = await manager.getStatus();
      expect(status.currentVersion).toBe(0);
    });

    it("should report pending migrations", async () => {
      manager.registerAll([
        { version: 1, name: "first", up: vi.fn() },
        { version: 2, name: "second", up: vi.fn() },
      ]);

      const status = await manager.getStatus();
      expect(status.pending).toHaveLength(2);
      expect(status.latestVersion).toBe(2);
    });

    it("should report applied migrations", async () => {
      manager.registerAll([
        { version: 1, name: "first", up: vi.fn() },
        { version: 2, name: "second", up: vi.fn() },
      ]);

      await manager.migrate();

      const status = await manager.getStatus();
      expect(status.currentVersion).toBe(2);
      expect(status.pending).toHaveLength(0);
      expect(status.applied).toHaveLength(2);
    });
  });

  describe("Forward Migration", () => {
    it("should apply all pending migrations", async () => {
      const up1 = vi.fn();
      const up2 = vi.fn();

      manager.registerAll([
        { version: 1, name: "first", up: up1 },
        { version: 2, name: "second", up: up2 },
      ]);

      const result = await manager.migrate();

      expect(result.success).toBe(true);
      expect(result.applied).toEqual([1, 2]);
      expect(up1).toHaveBeenCalled();
      expect(up2).toHaveBeenCalled();
    });

    it("should apply migrations in order", async () => {
      const order: number[] = [];

      manager.registerAll([
        {
          version: 1,
          name: "first",
          up: async () => {
            order.push(1);
          },
        },
        {
          version: 2,
          name: "second",
          up: async () => {
            order.push(2);
          },
        },
        {
          version: 3,
          name: "third",
          up: async () => {
            order.push(3);
          },
        },
      ]);

      await manager.migrate();

      expect(order).toEqual([1, 2, 3]);
    });

    it("should migrate to specific target version", async () => {
      manager.registerAll([
        { version: 1, name: "first", up: vi.fn() },
        { version: 2, name: "second", up: vi.fn() },
        { version: 3, name: "third", up: vi.fn() },
      ]);

      const result = await manager.migrate({ targetVersion: 2 });

      expect(result.success).toBe(true);
      expect(result.applied).toEqual([1, 2]);

      const status = await manager.getStatus();
      expect(status.currentVersion).toBe(2);
    });

    it("should stop on first error", async () => {
      const up1 = vi.fn();
      const up2 = vi.fn().mockRejectedValue(new Error("Migration failed"));
      const up3 = vi.fn();

      manager.registerAll([
        { version: 1, name: "first", up: up1 },
        { version: 2, name: "second", up: up2 },
        { version: 3, name: "third", up: up3 },
      ]);

      const result = await manager.migrate();

      expect(result.success).toBe(false);
      expect(result.applied).toEqual([1]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].version).toBe(2);
      expect(up3).not.toHaveBeenCalled();
    });

    it("should return success when no migrations to apply", async () => {
      const result = await manager.migrate();

      expect(result.success).toBe(true);
      expect(result.applied).toEqual([]);
    });
  });

  describe("Dry Run", () => {
    it("should not apply migrations in dry run mode", async () => {
      const up = vi.fn();

      manager.register({ version: 1, name: "test", up });

      const result = await manager.migrate({ dryRun: true });

      expect(result.success).toBe(true);
      expect(result.applied).toEqual([1]);
      expect(up).not.toHaveBeenCalled();

      // Verify migration was not recorded
      const status = await manager.getStatus();
      expect(status.currentVersion).toBe(0);
    });
  });

  describe("Rollback", () => {
    it("should rollback to target version", async () => {
      const down1 = vi.fn();
      const down2 = vi.fn();

      manager.registerAll([
        { version: 1, name: "first", up: vi.fn(), down: down1 },
        { version: 2, name: "second", up: vi.fn(), down: down2 },
      ]);

      await manager.migrate();
      const result = await manager.rollback(0);

      expect(result.success).toBe(true);
      expect(result.applied).toEqual([2, 1]);
      expect(down2).toHaveBeenCalled();
      expect(down1).toHaveBeenCalled();
    });

    it("should rollback in reverse order", async () => {
      const order: number[] = [];

      manager.registerAll([
        {
          version: 1,
          name: "first",
          up: vi.fn(),
          down: async () => {
            order.push(1);
          },
        },
        {
          version: 2,
          name: "second",
          up: vi.fn(),
          down: async () => {
            order.push(2);
          },
        },
        {
          version: 3,
          name: "third",
          up: vi.fn(),
          down: async () => {
            order.push(3);
          },
        },
      ]);

      await manager.migrate();
      await manager.rollback(0);

      expect(order).toEqual([3, 2, 1]);
    });

    it("should fail rollback when down is not defined", async () => {
      manager.registerAll([
        { version: 1, name: "first", up: vi.fn() },
        { version: 2, name: "second", up: vi.fn() },
      ]);

      await manager.migrate();
      const result = await manager.rollback(0);

      expect(result.success).toBe(false);
      expect(result.errors![0].error).toContain("does not support rollback");
    });

    it("should rollback last N migrations", async () => {
      manager.registerAll([
        { version: 1, name: "first", up: vi.fn(), down: vi.fn() },
        { version: 2, name: "second", up: vi.fn(), down: vi.fn() },
        { version: 3, name: "third", up: vi.fn(), down: vi.fn() },
      ]);

      await manager.migrate();
      const result = await manager.rollbackLast(2);

      expect(result.success).toBe(true);

      const status = await manager.getStatus();
      expect(status.currentVersion).toBe(1);
    });

    it("should rollback with dry run", async () => {
      const down = vi.fn();

      manager.register({ version: 1, name: "test", up: vi.fn(), down });

      await manager.migrate();
      const result = await manager.rollback(0, true);

      expect(result.success).toBe(true);
      expect(result.applied).toEqual([1]);
      expect(down).not.toHaveBeenCalled();

      // Verify migration was not removed
      const status = await manager.getStatus();
      expect(status.currentVersion).toBe(1);
    });
  });

  describe("Migration History", () => {
    it("should track applied migrations", async () => {
      manager.registerAll([
        { version: 1, name: "first", up: vi.fn() },
        { version: 2, name: "second", up: vi.fn() },
      ]);

      await manager.migrate();

      const status = await manager.getStatus();
      expect(status.applied).toHaveLength(2);
      expect(status.applied[0].appliedAt).toBeInstanceOf(Date);
    });

    it("should check if version is applied", async () => {
      manager.register({ version: 1, name: "test", up: vi.fn() });

      expect(await manager.isApplied(1)).toBe(false);

      await manager.migrate();

      expect(await manager.isApplied(1)).toBe(true);
    });

    it("should reset migration history", async () => {
      manager.register({ version: 1, name: "test", up: vi.fn() });

      await manager.migrate();
      await manager.resetHistory();

      const status = await manager.getStatus();
      expect(status.currentVersion).toBe(0);
      expect(status.applied).toHaveLength(0);
    });
  });

  describe("Static Factory Method", () => {
    it("should create migration using static method", () => {
      const up = vi.fn();
      const down = vi.fn();

      const migration = MigrationManager.createMigration(1, "test", up, down);

      expect(migration.version).toBe(1);
      expect(migration.name).toBe("test");
      expect(migration.up).toBe(up);
      expect(migration.down).toBe(down);
    });
  });

  describe("Factory Function", () => {
    it("should create manager using factory function", async () => {
      const factoryManager = createMigrationManager(storage);

      expect(factoryManager).toBeInstanceOf(MigrationManager);
    });
  });

  describe("Built-in Migrations", () => {
    it("should have initial schema migration", () => {
      expect(BuiltInMigrations).toHaveLength(1);
      expect(BuiltInMigrations[0].version).toBe(1);
      expect(BuiltInMigrations[0].name).toBe("initial_schema");
    });

    it("should register built-in migrations", async () => {
      manager.registerAll(BuiltInMigrations);

      const registered = manager.getRegisteredMigrations();
      expect(registered).toHaveLength(1);
    });

    it("should apply built-in migrations", async () => {
      manager.registerAll(BuiltInMigrations);

      const result = await manager.migrate();

      expect(result.success).toBe(true);
    });
  });

  describe("Partial Migration", () => {
    it("should continue from current version", async () => {
      manager.registerAll([
        { version: 1, name: "first", up: vi.fn() },
        { version: 2, name: "second", up: vi.fn() },
      ]);

      await manager.migrate({ targetVersion: 1 });

      manager.register({ version: 3, name: "third", up: vi.fn() });

      const result = await manager.migrate();

      expect(result.applied).toEqual([2, 3]);
    });
  });

  describe("Migration with Storage Interaction", () => {
    it("should receive storage in up function", async () => {
      const up = vi.fn(async (s) => {
        await s.setRecord("migration", "test", { migrated: true });
      });

      manager.register({ version: 1, name: "test", up });

      await manager.migrate();

      expect(up).toHaveBeenCalledWith(storage);

      const record = await storage.getRecord("migration", "test");
      expect(record?.value).toEqual({ migrated: true });
    });

    it("should receive storage in down function", async () => {
      const down = vi.fn(async (s) => {
        await s.deleteRecord("migration", "test");
      });

      manager.register({
        version: 1,
        name: "test",
        up: async (s) => {
          await s.setRecord("migration", "test", { migrated: true });
        },
        down,
      });

      await manager.migrate();
      await manager.rollback(0);

      expect(down).toHaveBeenCalledWith(storage);

      const record = await storage.getRecord("migration", "test");
      expect(record).toBeUndefined();
    });
  });
});
