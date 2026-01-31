/**
 * Migration Runner
 *
 * Provides database migration management for storage backends.
 * Supports versioned migrations with up/down operations.
 *
 * Features:
 * - Versioned migration tracking
 * - Up and down migration support
 * - Migration locking to prevent concurrent runs
 * - Dry run mode for testing
 * - Migration status reporting
 */

import { logger } from "../../utils/logger.js";
import type { StorageProvider } from "../types.js";

/**
 * Migration definition
 */
export interface Migration {
  /** Migration version (semver or numeric) */
  version: string;

  /** Migration name */
  name: string;

  /** Migration description */
  description?: string;

  /** Apply the migration */
  up: (context: MigrationContext) => Promise<void>;

  /** Revert the migration */
  down?: (context: MigrationContext) => Promise<void>;
}

/**
 * Migration context passed to migration functions
 */
export interface MigrationContext {
  /** Storage provider */
  storage: StorageProvider;

  /** Execute raw SQL (for SQL backends) */
  executeSql?: (sql: string, params?: unknown[]) => Promise<unknown>;

  /** Log function */
  log: (message: string, data?: Record<string, unknown>) => void;
}

/**
 * Migration record stored in the database
 */
export interface MigrationRecord {
  version: string;
  name: string;
  appliedAt: Date;
  checksum?: string;
}

/**
 * Migration status
 */
export interface MigrationStatus {
  applied: MigrationRecord[];
  pending: Migration[];
  current: string | null;
}

/**
 * Migration runner options
 */
export interface MigrationRunnerOptions {
  /** Namespace for migration records */
  namespace?: string;

  /** Lock timeout in milliseconds */
  lockTimeoutMs?: number;

  /** Whether to run in dry mode (no changes) */
  dryRun?: boolean;
}

/**
 * Migration Runner
 *
 * Manages database migrations with version tracking.
 */
export class MigrationRunner {
  private storage: StorageProvider;
  private migrations: Migration[] = [];
  private options: Required<MigrationRunnerOptions>;
  private namespace: string;

  constructor(storage: StorageProvider, options?: MigrationRunnerOptions) {
    this.storage = storage;
    this.options = {
      namespace: options?.namespace || "__migrations",
      lockTimeoutMs: options?.lockTimeoutMs || 60000,
      dryRun: options?.dryRun || false,
    };
    this.namespace = this.options.namespace;
  }

  /**
   * Register a migration
   */
  register(migration: Migration): this {
    // Validate migration
    if (!migration.version || !migration.name || !migration.up) {
      throw new Error("Migration must have version, name, and up function");
    }

    // Check for duplicate version
    if (this.migrations.some((m) => m.version === migration.version)) {
      throw new Error(`Duplicate migration version: ${migration.version}`);
    }

    this.migrations.push(migration);

    // Sort by version
    this.migrations.sort((a, b) => this.compareVersions(a.version, b.version));

    return this;
  }

  /**
   * Register multiple migrations
   */
  registerAll(migrations: Migration[]): this {
    for (const migration of migrations) {
      this.register(migration);
    }
    return this;
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<MigrationStatus> {
    const applied = await this.getAppliedMigrations();
    const appliedVersions = new Set(applied.map((m) => m.version));

    const pending = this.migrations.filter(
      (m) => !appliedVersions.has(m.version),
    );

    const current =
      applied.length > 0 ? applied[applied.length - 1].version : null;

    return { applied, pending, current };
  }

  /**
   * Run all pending migrations (up)
   */
  async migrateUp(targetVersion?: string): Promise<MigrationRecord[]> {
    const status = await this.getStatus();
    const applied: MigrationRecord[] = [];

    let migrationsToRun = status.pending;

    // Filter by target version if specified
    if (targetVersion) {
      migrationsToRun = migrationsToRun.filter(
        (m) => this.compareVersions(m.version, targetVersion) <= 0,
      );
    }

    if (migrationsToRun.length === 0) {
      logger.info("[MigrationRunner] No pending migrations");
      return applied;
    }

    // Acquire lock
    const lockAcquired = await this.acquireLock();
    if (!lockAcquired) {
      throw new Error("Could not acquire migration lock");
    }

    try {
      for (const migration of migrationsToRun) {
        logger.info("[MigrationRunner] Running migration", {
          version: migration.version,
          name: migration.name,
          dryRun: this.options.dryRun,
        });

        if (!this.options.dryRun) {
          const context = this.createContext();

          try {
            await migration.up(context);

            // Record migration
            const record: MigrationRecord = {
              version: migration.version,
              name: migration.name,
              appliedAt: new Date(),
              checksum: this.calculateChecksum(migration),
            };

            await this.recordMigration(record);
            applied.push(record);

            logger.info("[MigrationRunner] Migration completed", {
              version: migration.version,
            });
          } catch (error) {
            logger.error("[MigrationRunner] Migration failed", {
              version: migration.version,
              error: error instanceof Error ? error.message : String(error),
            });
            throw error;
          }
        } else {
          logger.info("[MigrationRunner] Dry run - skipping actual migration");
          applied.push({
            version: migration.version,
            name: migration.name,
            appliedAt: new Date(),
          });
        }
      }
    } finally {
      await this.releaseLock();
    }

    return applied;
  }

  /**
   * Revert migrations (down)
   */
  async migrateDown(targetVersion?: string): Promise<MigrationRecord[]> {
    const applied = await this.getAppliedMigrations();
    const reverted: MigrationRecord[] = [];

    if (applied.length === 0) {
      logger.info("[MigrationRunner] No migrations to revert");
      return reverted;
    }

    // Determine which migrations to revert
    let migrationsToRevert = [...applied].reverse();

    if (targetVersion) {
      migrationsToRevert = migrationsToRevert.filter(
        (m) => this.compareVersions(m.version, targetVersion) > 0,
      );
    } else {
      // Revert only the last one if no target
      migrationsToRevert = [migrationsToRevert[0]];
    }

    if (migrationsToRevert.length === 0) {
      logger.info("[MigrationRunner] No migrations to revert");
      return reverted;
    }

    // Acquire lock
    const lockAcquired = await this.acquireLock();
    if (!lockAcquired) {
      throw new Error("Could not acquire migration lock");
    }

    try {
      for (const record of migrationsToRevert) {
        const migration = this.migrations.find(
          (m) => m.version === record.version,
        );

        if (!migration) {
          logger.warn("[MigrationRunner] Migration not found", {
            version: record.version,
          });
          continue;
        }

        if (!migration.down) {
          throw new Error(
            `Migration ${migration.version} does not have a down function`,
          );
        }

        logger.info("[MigrationRunner] Reverting migration", {
          version: migration.version,
          name: migration.name,
          dryRun: this.options.dryRun,
        });

        if (!this.options.dryRun) {
          const context = this.createContext();

          try {
            await migration.down(context);

            // Remove migration record
            await this.removeMigrationRecord(record.version);
            reverted.push(record);

            logger.info("[MigrationRunner] Migration reverted", {
              version: migration.version,
            });
          } catch (error) {
            logger.error("[MigrationRunner] Migration revert failed", {
              version: migration.version,
              error: error instanceof Error ? error.message : String(error),
            });
            throw error;
          }
        } else {
          logger.info("[MigrationRunner] Dry run - skipping actual revert");
          reverted.push(record);
        }
      }
    } finally {
      await this.releaseLock();
    }

    return reverted;
  }

  /**
   * Reset all migrations (down all, then up all)
   */
  async reset(): Promise<{ down: MigrationRecord[]; up: MigrationRecord[] }> {
    const down = await this.migrateDown("0");
    const up = await this.migrateUp();
    return { down, up };
  }

  /**
   * Get applied migrations from storage
   */
  private async getAppliedMigrations(): Promise<MigrationRecord[]> {
    const result = await this.storage.listRecords(this.namespace);

    return result.data
      .map((record) => ({
        version: record.key,
        name: (record.value as Record<string, unknown>).name as string,
        appliedAt: new Date(
          (record.value as Record<string, unknown>).appliedAt as string,
        ),
        checksum: (record.value as Record<string, unknown>).checksum as
          | string
          | undefined,
      }))
      .sort((a, b) => this.compareVersions(a.version, b.version));
  }

  /**
   * Record a migration as applied
   */
  private async recordMigration(record: MigrationRecord): Promise<void> {
    const value: Record<string, string> = {
      name: record.name,
      appliedAt: record.appliedAt.toISOString(),
    };
    if (record.checksum !== undefined) {
      value.checksum = record.checksum;
    }
    await this.storage.setRecord(this.namespace, record.version, value);
  }

  /**
   * Remove a migration record
   */
  private async removeMigrationRecord(version: string): Promise<void> {
    await this.storage.deleteRecord(this.namespace, version);
  }

  /**
   * Acquire migration lock
   */
  private async acquireLock(): Promise<boolean> {
    const lockKey = "__migration_lock";
    const lockValue = Date.now().toString();

    // Check if lock exists
    const existing = await this.storage.getRecord(this.namespace, lockKey);

    if (existing) {
      const lockTime = parseInt(existing.value as string, 10);
      const elapsed = Date.now() - lockTime;

      // If lock is expired, remove it
      if (elapsed > this.options.lockTimeoutMs) {
        await this.storage.deleteRecord(this.namespace, lockKey);
      } else {
        return false;
      }
    }

    // Set new lock
    await this.storage.setRecord(this.namespace, lockKey, lockValue, {
      ttl: Math.ceil(this.options.lockTimeoutMs / 1000),
    });

    return true;
  }

  /**
   * Release migration lock
   */
  private async releaseLock(): Promise<void> {
    const lockKey = "__migration_lock";
    await this.storage.deleteRecord(this.namespace, lockKey);
  }

  /**
   * Create migration context
   */
  private createContext(): MigrationContext {
    return {
      storage: this.storage,
      log: (message: string, data?: Record<string, unknown>) => {
        logger.info(`[Migration] ${message}`, data);
      },
    };
  }

  /**
   * Compare version strings
   */
  private compareVersions(a: string, b: string): number {
    const partsA = a.split(".").map((n) => parseInt(n, 10) || 0);
    const partsB = b.split(".").map((n) => parseInt(n, 10) || 0);

    const maxLength = Math.max(partsA.length, partsB.length);

    for (let i = 0; i < maxLength; i++) {
      const partA = partsA[i] || 0;
      const partB = partsB[i] || 0;

      if (partA > partB) {
        return 1;
      }
      if (partA < partB) {
        return -1;
      }
    }

    return 0;
  }

  /**
   * Calculate checksum for a migration
   */
  private calculateChecksum(migration: Migration): string {
    const content = `${migration.version}:${migration.name}:${migration.up.toString()}`;
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

/**
 * Built-in migrations for NeuroLink storage
 */
export const builtInMigrations: Migration[] = [
  {
    version: "1.0.0",
    name: "initial_setup",
    description: "Initial storage setup with core tables",
    async up(context) {
      context.log("Setting up initial storage structure");
      // Storage providers handle their own table/collection creation
      // This migration is a placeholder for custom setup
    },
    async down(context) {
      context.log("Reverting initial storage structure");
      // Clear all data as a reset
      await context.storage.clearAll();
    },
  },
];

/**
 * Create a migration runner for a storage provider
 */
export function createMigrationRunner(
  storage: StorageProvider,
  options?: MigrationRunnerOptions,
): MigrationRunner {
  return new MigrationRunner(storage, options);
}
