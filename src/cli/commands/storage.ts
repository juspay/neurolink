#!/usr/bin/env node
/**
 * NeuroLink CLI Storage Commands
 *
 * Commands for managing storage:
 * - neurolink storage status - Show storage status and statistics
 * - neurolink storage migrate - Run migrations
 * - neurolink storage health - Check storage health
 */

import chalk from "chalk";
import type { Argv, CommandModule } from "yargs";
import { logger } from "../../lib/utils/logger.js";
import {
  StorageFactory,
  createStorageFromEnv,
  checkStorageHealth,
  type StorageProvider,
} from "../../lib/storage/index.js";

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes?: number): string {
  if (bytes === undefined) {
    return "N/A";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Format latency to human readable string
 */
function formatLatency(ms?: number): string {
  if (ms === undefined) {
    return "N/A";
  }
  if (ms < 1) {
    return "<1ms";
  }
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Get storage provider from environment
 */
async function getStorage(): Promise<StorageProvider> {
  const storage = await createStorageFromEnv();
  await storage.init({ runMigrations: false });
  return storage;
}

/**
 * Storage status command
 */
const statusCommand: CommandModule = {
  command: "status",
  describe: "Show storage status and statistics",
  builder: (yargs: Argv) =>
    yargs.option("format", {
      alias: "f",
      type: "string",
      choices: ["text", "json"],
      default: "text",
      description: "Output format",
    }),
  handler: async (argv) => {
    try {
      const storage = await getStorage();
      const storageType = process.env.STORAGE_TYPE || "memory";

      // Get stats and health
      const [stats, health] = await Promise.all([
        storage.getStats(),
        checkStorageHealth(storage),
      ]);

      if (argv.format === "json") {
        logger.always(
          JSON.stringify(
            {
              type: storageType,
              health: health.healthy ? "healthy" : "unhealthy",
              latencyMs: health.latencyMs,
              stats,
            },
            null,
            2,
          ),
        );
      } else {
        logger.always(chalk.blue("\n📊 NeuroLink Storage Status\n"));

        // Backend info
        logger.always(chalk.cyan("Backend Information:"));
        logger.always(
          `  Type:        ${chalk.white(storageType.toUpperCase())}`,
        );
        logger.always(
          `  Status:      ${health.healthy ? chalk.green("Healthy") : chalk.red("Unhealthy")}`,
        );
        logger.always(
          `  Latency:     ${chalk.white(formatLatency(health.latencyMs))}`,
        );

        if (health.error) {
          logger.always(`  Error:       ${chalk.red(health.error)}`);
        }

        // Statistics
        logger.always(chalk.cyan("\nData Statistics:"));
        logger.always(
          `  Threads:     ${chalk.white(stats.threadCount.toLocaleString())}`,
        );
        logger.always(
          `  Messages:    ${chalk.white(stats.messageCount.toLocaleString())}`,
        );
        logger.always(
          `  Workflows:   ${chalk.white(stats.workflowRunCount.toLocaleString())}`,
        );
        logger.always(
          `  Records:     ${chalk.white(stats.customRecordCount.toLocaleString())}`,
        );

        if (stats.storageSize !== undefined) {
          logger.always(
            `  Storage:     ${chalk.white(formatBytes(stats.storageSize))}`,
          );
        }

        // Environment info
        logger.always(chalk.cyan("\nEnvironment:"));
        logger.always(
          `  STORAGE_TYPE: ${chalk.white(process.env.STORAGE_TYPE || "(not set, using memory)")}`,
        );

        switch (storageType.toLowerCase()) {
          case "postgresql":
          case "postgres":
            logger.always(
              `  POSTGRES_URL: ${chalk.white(process.env.POSTGRES_URL ? "***" : "(not set)")}`,
            );
            break;
          case "mongodb":
          case "mongo":
            logger.always(
              `  MONGODB_URI:  ${chalk.white(process.env.MONGODB_URI ? "***" : "(not set)")}`,
            );
            break;
          case "libsql":
          case "sqlite":
            logger.always(
              `  LIBSQL_URL:   ${chalk.white(process.env.LIBSQL_URL || "(not set)")}`,
            );
            break;
          case "redis":
          case "ioredis":
            logger.always(
              `  REDIS_URL:    ${chalk.white(process.env.REDIS_URL ? "***" : "(not set)")}`,
            );
            break;
        }

        logger.always("");
      }

      await storage.close();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(
        chalk.red(`\n❌ Failed to get storage status: ${message}\n`),
      );
      process.exit(1);
    }
  },
};

/**
 * Storage migrate command
 */
const migrateCommand: CommandModule = {
  command: "migrate",
  describe: "Run storage migrations",
  builder: (yargs: Argv) =>
    yargs
      .option("dry-run", {
        type: "boolean",
        default: false,
        description: "Show what would be done without making changes",
      })
      .option("force", {
        type: "boolean",
        default: false,
        description: "Force migration even if already up to date",
      }),
  handler: async (argv) => {
    const dryRun = argv["dry-run"] as boolean;

    try {
      const storageType = process.env.STORAGE_TYPE || "memory";

      if (dryRun) {
        logger.always(
          chalk.yellow("\n🔍 Dry run mode - no changes will be made\n"),
        );
      }

      logger.always(
        chalk.blue(`\n🔄 Running migrations for ${storageType}...\n`),
      );

      if (dryRun) {
        logger.always(chalk.cyan("Would perform the following migrations:"));
        logger.always("  1. Create threads table");
        logger.always("  2. Create messages table");
        logger.always("  3. Create workflow_runs table");
        logger.always("  4. Create custom_records table");
        logger.always("  5. Create indexes");
        logger.always("");
      } else {
        const storage = await createStorageFromEnv();

        // Initialize with migrations
        await storage.init({ runMigrations: true });

        logger.always(chalk.green("✅ Migrations completed successfully\n"));

        // Show post-migration stats
        const stats = await storage.getStats();
        logger.always(chalk.cyan("Current data counts:"));
        logger.always(`  Threads:     ${stats.threadCount}`);
        logger.always(`  Messages:    ${stats.messageCount}`);
        logger.always(`  Workflows:   ${stats.workflowRunCount}`);
        logger.always(`  Records:     ${stats.customRecordCount}`);
        logger.always("");

        await storage.close();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(chalk.red(`\n❌ Migration failed: ${message}\n`));
      process.exit(1);
    }
  },
};

/**
 * Storage health command
 */
const healthCommand: CommandModule = {
  command: "health",
  describe: "Check storage health",
  builder: (yargs: Argv) =>
    yargs
      .option("timeout", {
        alias: "t",
        type: "number",
        default: 5000,
        description: "Health check timeout in milliseconds",
      })
      .option("format", {
        alias: "f",
        type: "string",
        choices: ["text", "json"],
        default: "text",
        description: "Output format",
      })
      .option("watch", {
        alias: "w",
        type: "boolean",
        default: false,
        description: "Continuously monitor health",
      })
      .option("interval", {
        type: "number",
        default: 5000,
        description: "Watch interval in milliseconds",
      }),
  handler: async (argv) => {
    const timeout = argv.timeout as number;
    const format = argv.format as string;
    const watch = argv.watch as boolean;
    const interval = argv.interval as number;

    try {
      const storage = await getStorage();
      const storageType = process.env.STORAGE_TYPE || "memory";

      const performHealthCheck = async (): Promise<void> => {
        const result = await checkStorageHealth(storage, timeout);

        if (format === "json") {
          logger.always(JSON.stringify(result, null, 2));
        } else {
          const status = result.healthy
            ? chalk.green("✓ Healthy")
            : chalk.red("✗ Unhealthy");
          const latency = formatLatency(result.latencyMs);

          if (watch) {
            const timestamp = new Date().toISOString();
            logger.always(
              `[${timestamp}] ${storageType.toUpperCase()}: ${status} (${latency})${result.error ? ` - ${result.error}` : ""}`,
            );
          } else {
            logger.always(chalk.blue("\n🏥 Storage Health Check\n"));
            logger.always(
              `  Backend:   ${chalk.white(storageType.toUpperCase())}`,
            );
            logger.always(`  Status:    ${status}`);
            logger.always(`  Latency:   ${chalk.white(latency)}`);

            if (result.error) {
              logger.always(`  Error:     ${chalk.red(result.error)}`);
            }

            logger.always("");
          }
        }
      };

      if (watch) {
        logger.always(
          chalk.blue(
            `\n👁️  Watching storage health (interval: ${interval}ms)\n`,
          ),
        );
        logger.always("Press Ctrl+C to stop\n");

        // Initial check
        await performHealthCheck();

        // Set up interval
        const healthInterval = setInterval(performHealthCheck, interval);

        // Handle shutdown
        process.on("SIGINT", async () => {
          clearInterval(healthInterval);
          await storage.close();
          logger.always("\n\nStopped watching.");
          process.exit(0);
        });

        // Keep process alive
        await new Promise(() => {});
      } else {
        await performHealthCheck();
        await storage.close();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(chalk.red(`\n❌ Health check failed: ${message}\n`));
      process.exit(1);
    }
  },
};

/**
 * Storage clear command (dangerous)
 */
const clearCommand: CommandModule = {
  command: "clear",
  describe: "Clear all storage data (DANGEROUS)",
  builder: (yargs: Argv) =>
    yargs.option("confirm", {
      type: "boolean",
      default: false,
      description: "Confirm data deletion",
    }),
  handler: async (argv) => {
    const confirm = argv.confirm as boolean;

    if (!confirm) {
      logger.always(chalk.yellow("\n⚠️  This command will DELETE ALL DATA!\n"));
      logger.always("To proceed, run with --confirm flag:");
      logger.always(chalk.cyan("  neurolink storage clear --confirm\n"));
      process.exit(1);
    }

    try {
      const storage = await getStorage();

      logger.always(chalk.yellow("\n⚠️  Clearing all storage data...\n"));

      await storage.clearAll();

      logger.always(chalk.green("✅ All data cleared successfully\n"));

      await storage.close();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(chalk.red(`\n❌ Failed to clear storage: ${message}\n`));
      process.exit(1);
    }
  },
};

/**
 * Storage info command
 */
const infoCommand: CommandModule = {
  command: "info",
  describe: "Show available storage backends",
  handler: async () => {
    // Register providers to get the list
    await StorageFactory.registerAllProviders();
    const types = StorageFactory.getRegisteredTypes();

    logger.always(chalk.blue("\n📚 Available Storage Backends\n"));

    for (const type of types) {
      const aliases = StorageFactory.getAliases(type);
      const aliasStr = aliases.length > 0 ? ` (${aliases.join(", ")})` : "";

      let description = "";
      let envVars: string[] = [];

      switch (type) {
        case "memory":
          description = "In-memory storage for development and testing";
          envVars = [];
          break;
        case "postgresql":
          description = "Production-ready PostgreSQL with ACID compliance";
          envVars = [
            "POSTGRES_URL or DATABASE_URL",
            "POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB",
            "POSTGRES_USER, POSTGRES_PASSWORD",
            "POSTGRES_SCHEMA, POSTGRES_SSL",
          ];
          break;
        case "mongodb":
          description = "Flexible document storage with MongoDB";
          envVars = [
            "MONGODB_URI or MONGO_URL",
            "MONGODB_DATABASE or MONGO_DB",
            "MONGODB_COLLECTION_PREFIX",
          ];
          break;
        case "libsql":
          description = "Lightweight SQLite-compatible storage (Turso)";
          envVars = [
            "LIBSQL_URL or TURSO_DATABASE_URL",
            "LIBSQL_AUTH_TOKEN or TURSO_AUTH_TOKEN",
            "LIBSQL_SYNC_URL",
          ];
          break;
        case "redis":
          description = "High-performance Redis storage with TTL support";
          envVars = [
            "REDIS_URL",
            "REDIS_HOST, REDIS_PORT",
            "REDIS_PASSWORD, REDIS_DB",
            "REDIS_KEY_PREFIX, REDIS_TLS",
          ];
          break;
      }

      logger.always(chalk.cyan(`  ${type.toUpperCase()}${aliasStr}`));
      logger.always(`    ${description}`);

      if (envVars.length > 0) {
        logger.always(chalk.gray("    Environment variables:"));
        for (const env of envVars) {
          logger.always(chalk.gray(`      - ${env}`));
        }
      }

      logger.always("");
    }

    logger.always(chalk.cyan("To select a backend, set STORAGE_TYPE:"));
    logger.always(chalk.white("  export STORAGE_TYPE=postgresql\n"));
  },
};

/**
 * Main storage command
 */
export const storageCommand: CommandModule = {
  command: "storage <command>",
  describe: "Manage storage backends",
  builder: (yargs: Argv) =>
    yargs
      .command(statusCommand)
      .command(migrateCommand)
      .command(healthCommand)
      .command(clearCommand)
      .command(infoCommand)
      .demandCommand(1, "You must specify a storage command")
      .help(),
  handler: () => {},
};

export default storageCommand;
