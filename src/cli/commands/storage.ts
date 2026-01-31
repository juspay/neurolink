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
import ora from "ora";
import type { Argv, CommandModule } from "yargs";
import { handleError } from "../errorHandler.js";
import { formatRow } from "../utils/formatters.js";
import { logger } from "../../lib/utils/logger.js";
import {
  StorageFactory,
  createStorageFromEnv,
  checkStorageHealth,
} from "../../lib/storage/index.js";
import type { StorageProvider } from "../../lib/types/index.js";

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
    yargs
      .option("format", {
        alias: "f",
        type: "string",
        choices: ["text", "json", "table"],
        default: "text",
        description: "Output format",
      })
      .option("verbose", {
        alias: "v",
        type: "boolean",
        default: false,
        description: "Show detailed output",
      })
      .option("quiet", {
        alias: "q",
        type: "boolean",
        default: false,
        description: "Suppress non-essential output",
      }),
  handler: async (argv) => {
    const spinner = ora("Checking storage status...").start();
    try {
      const storage = await getStorage();
      const storageType = process.env.STORAGE_TYPE || "memory";

      // Get stats and health
      const [stats, health] = await Promise.all([
        storage.getStats(),
        checkStorageHealth(storage),
      ]);

      spinner.succeed("Storage status retrieved");

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
          formatRow("Type", chalk.white(storageType.toUpperCase())),
        );
        logger.always(
          formatRow(
            "Status",
            health.healthy ? chalk.green("Healthy") : chalk.red("Unhealthy"),
          ),
        );
        logger.always(
          formatRow("Latency", chalk.white(formatLatency(health.latencyMs))),
        );

        if (health.error) {
          logger.always(formatRow("Error", chalk.red(health.error)));
        }

        // Statistics
        logger.always(chalk.cyan("\nData Statistics:"));
        logger.always(
          formatRow("Threads", chalk.white(stats.threadCount.toLocaleString())),
        );
        logger.always(
          formatRow(
            "Messages",
            chalk.white(stats.messageCount.toLocaleString()),
          ),
        );
        logger.always(
          formatRow(
            "Workflows",
            chalk.white(stats.workflowRunCount.toLocaleString()),
          ),
        );
        logger.always(
          formatRow(
            "Records",
            chalk.white(stats.customRecordCount.toLocaleString()),
          ),
        );

        if (stats.storageSize !== undefined) {
          logger.always(
            formatRow("Storage", chalk.white(formatBytes(stats.storageSize))),
          );
        }

        // Environment info
        logger.always(chalk.cyan("\nEnvironment:"));
        logger.always(
          formatRow(
            "STORAGE_TYPE",
            chalk.white(process.env.STORAGE_TYPE || "(not set, using memory)"),
          ),
        );

        switch (storageType.toLowerCase()) {
          case "postgresql":
          case "postgres":
            logger.always(
              formatRow(
                "POSTGRES_URL",
                chalk.white(process.env.POSTGRES_URL ? "***" : "(not set)"),
              ),
            );
            break;
          case "mongodb":
          case "mongo":
            logger.always(
              formatRow(
                "MONGODB_URI",
                chalk.white(process.env.MONGODB_URI ? "***" : "(not set)"),
              ),
            );
            break;
          case "libsql":
          case "sqlite":
            logger.always(
              formatRow(
                "LIBSQL_URL",
                chalk.white(process.env.LIBSQL_URL || "(not set)"),
              ),
            );
            break;
          case "redis":
          case "ioredis":
            logger.always(
              formatRow(
                "REDIS_URL",
                chalk.white(process.env.REDIS_URL ? "***" : "(not set)"),
              ),
            );
            break;
        }

        logger.always("");
      }

      await storage.close();
    } catch (error) {
      spinner.fail("Storage status check failed");
      handleError(error as Error, "storage status");
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
      })
      .option("verbose", {
        alias: "v",
        type: "boolean",
        default: false,
        description: "Show detailed output",
      })
      .option("quiet", {
        alias: "q",
        type: "boolean",
        default: false,
        description: "Suppress non-essential output",
      }),
  handler: async (argv) => {
    const dryRun = argv["dry-run"] as boolean;
    const spinner = ora("Running storage migrations...").start();

    try {
      const storageType = process.env.STORAGE_TYPE || "memory";

      if (dryRun) {
        spinner.info("Dry run mode - no changes will be made");
        logger.always(chalk.cyan("Would perform the following migrations:"));
        logger.always("  1. Create threads table");
        logger.always("  2. Create messages table");
        logger.always("  3. Create workflow_runs table");
        logger.always("  4. Create custom_records table");
        logger.always("  5. Create indexes");
        logger.always("");
      } else {
        spinner.text = `Running migrations for ${storageType}...`;
        const storage = await createStorageFromEnv();

        // Initialize with migrations
        await storage.init({ runMigrations: true });

        spinner.succeed("Migrations completed successfully");

        // Show post-migration stats
        const stats = await storage.getStats();
        logger.always(chalk.cyan("Current data counts:"));
        logger.always(formatRow("Threads", String(stats.threadCount)));
        logger.always(formatRow("Messages", String(stats.messageCount)));
        logger.always(formatRow("Workflows", String(stats.workflowRunCount)));
        logger.always(formatRow("Records", String(stats.customRecordCount)));
        logger.always("");

        await storage.close();
      }
    } catch (error) {
      spinner.fail("Migration failed");
      handleError(error as Error, "storage migrate");
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
        choices: ["text", "json", "table"],
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
      })
      .option("verbose", {
        alias: "v",
        type: "boolean",
        default: false,
        description: "Show detailed output",
      })
      .option("quiet", {
        alias: "q",
        type: "boolean",
        default: false,
        description: "Suppress non-essential output",
      }),
  handler: async (argv) => {
    const timeout = argv.timeout as number;
    const format = argv.format as string;
    const watch = argv.watch as boolean;
    const interval = argv.interval as number;
    const spinner = ora("Checking storage health...").start();

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
              formatRow("Backend", chalk.white(storageType.toUpperCase())),
            );
            logger.always(formatRow("Status", status));
            logger.always(formatRow("Latency", chalk.white(latency)));

            if (result.error) {
              logger.always(formatRow("Error", chalk.red(result.error)));
            }

            logger.always("");
          }
        }
      };

      if (watch) {
        spinner.stop();
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
        spinner.succeed("Storage health check complete");
        await performHealthCheck();
        await storage.close();
      }
    } catch (error) {
      spinner.fail("Storage health check failed");
      handleError(error as Error, "storage health");
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
  builder: (yargs: Argv) =>
    yargs
      .option("verbose", {
        alias: "v",
        type: "boolean",
        default: false,
        description: "Show detailed output",
      })
      .option("quiet", {
        alias: "q",
        type: "boolean",
        default: false,
        description: "Suppress non-essential output",
      }),
  handler: async () => {
    const spinner = ora("Loading storage backends...").start();
    try {
      // Register providers to get the list
      await StorageFactory.registerAllAdapters();
      const types = StorageFactory.getRegisteredAdapters();

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
      spinner.succeed("Storage backends loaded");
    } catch (error) {
      spinner.fail("Failed to load storage backends");
      handleError(error as Error, "storage info");
    }
  },
};

/**
 * Main storage command
 */
export const storageCommand: CommandModule = {
  command: "storage <subcommand>",
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
