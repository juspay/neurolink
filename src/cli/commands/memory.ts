/**
 * Memory CLI Commands for NeuroLink
 * Implements comprehensive three-layer memory management commands
 *
 * @module cli/commands/memory
 * @since 9.0.0
 */

import type { CommandModule, Argv } from "yargs";
import { NeuroLink } from "../../lib/neurolink.js";
import { globalSession } from "../../lib/session/globalSessionState.js";
import { logger } from "../../lib/utils/logger.js";
import chalk from "chalk";
import ora from "ora";
import fs from "fs";
import path from "path";

import type {
  MemoryCommandArgs,
  MemoryExportData,
  MemoryStats,
} from "../../lib/types/index.js";

/**
 * Memory CLI command factory
 */
export class MemoryCommandFactory {
  /**
   * Create the main memory command with subcommands
   */
  static createMemoryCommands(): CommandModule {
    return {
      command: "memory <subcommand>",
      describe: "Manage three-layer conversation memory",
      builder: (yargs) => {
        return yargs
          .command(
            "list",
            "List memory entries and sessions",
            (yargs) => this.buildListOptions(yargs),
            (argv) => this.executeList(argv as MemoryCommandArgs),
          )
          .command(
            "clear",
            "Clear memory for a session or all sessions",
            (yargs) => this.buildClearOptions(yargs),
            (argv) => this.executeClear(argv as MemoryCommandArgs),
          )
          .command(
            "export <file>",
            "Export memory data to a file",
            (yargs) => this.buildExportOptions(yargs),
            (argv) => this.executeExport(argv as MemoryCommandArgs),
          )
          .command(
            "import <file>",
            "Import memory data from a file",
            (yargs) => this.buildImportOptions(yargs),
            (argv) => this.executeImport(argv as MemoryCommandArgs),
          )
          .command(
            "stats",
            "Show memory system statistics",
            (yargs) => this.buildStatsOptions(yargs),
            (argv) => this.executeStats(argv as MemoryCommandArgs),
          )
          .command(
            "search <query>",
            "Semantic search in memory",
            (yargs) => this.buildSearchOptions(yargs),
            (argv) => this.executeSearch(argv as MemoryCommandArgs),
          )
          .option("format", {
            choices: ["table", "json", "compact"] as const,
            default: "table" as const,
            description: "Output format",
          })
          .option("output", {
            type: "string",
            description: "Save output to file",
          })
          .option("quiet", {
            type: "boolean",
            alias: "q",
            default: false,
            description: "Suppress non-essential output",
          })
          .option("debug", {
            type: "boolean",
            default: false,
            description: "Enable debug output",
          })
          .demandCommand(1, "Please specify a memory subcommand")
          .help();
      },
      handler: () => {
        // No-op handler as subcommands handle everything
      },
    };
  }

  /**
   * Build options for list command
   */
  private static buildListOptions(yargs: Argv): Argv {
    return yargs
      .option("session-id", {
        type: "string",
        description: "Filter by specific session ID",
      })
      .option("limit", {
        type: "number",
        default: 50,
        description: "Maximum number of entries to display",
      })
      .example("neurolink memory list", "List all memory sessions")
      .example(
        "neurolink memory list --session-id session-123",
        "List entries for specific session",
      )
      .example(
        "neurolink memory list --format json",
        "List sessions in JSON format",
      );
  }

  /**
   * Build options for clear command
   */
  private static buildClearOptions(yargs: Argv): Argv {
    return yargs
      .option("session-id", {
        type: "string",
        description: "Session ID to clear (omit to clear all)",
      })
      .option("force", {
        type: "boolean",
        default: false,
        description: "Force clear without confirmation",
      })
      .example("neurolink memory clear", "Clear all memory (requires --force)")
      .example(
        "neurolink memory clear --session-id session-123",
        "Clear specific session",
      )
      .example("neurolink memory clear --force", "Force clear all memory");
  }

  /**
   * Build options for export command
   */
  private static buildExportOptions(yargs: Argv): Argv {
    return yargs
      .positional("file", {
        type: "string",
        description: "File path to export memory data to",
        demandOption: true,
      })
      .option("session-id", {
        type: "string",
        description: "Export only a specific session",
      })
      .example(
        "neurolink memory export memory-backup.json",
        "Export all memory",
      )
      .example(
        "neurolink memory export session.json --session-id session-123",
        "Export specific session",
      );
  }

  /**
   * Build options for import command
   */
  private static buildImportOptions(yargs: Argv): Argv {
    return yargs
      .positional("file", {
        type: "string",
        description: "File path to import memory data from",
        demandOption: true,
      })
      .option("force", {
        type: "boolean",
        default: false,
        description: "Overwrite existing sessions",
      })
      .example(
        "neurolink memory import memory-backup.json",
        "Import memory data",
      )
      .example(
        "neurolink memory import memory.json --force",
        "Import and overwrite existing",
      );
  }

  /**
   * Build options for stats command
   */
  private static buildStatsOptions(yargs: Argv): Argv {
    return yargs
      .example("neurolink memory stats", "Show memory statistics")
      .example("neurolink memory stats --format json", "Export stats as JSON");
  }

  /**
   * Build options for search command
   */
  private static buildSearchOptions(yargs: Argv): Argv {
    return yargs
      .positional("query", {
        type: "string",
        description: "Search query for semantic search",
        demandOption: true,
      })
      .option("session-id", {
        type: "string",
        description: "Limit search to specific session",
      })
      .option("limit", {
        type: "number",
        default: 10,
        description: "Maximum number of results",
      })
      .option("threshold", {
        type: "number",
        default: 0.7,
        description: "Minimum similarity threshold (0-1)",
      })
      .example(
        'neurolink memory search "quantum computing"',
        "Search for relevant memories",
      )
      .example(
        'neurolink memory search "project status" --limit 5',
        "Search with result limit",
      );
  }

  /**
   * Execute list command
   */
  private static async executeList(argv: MemoryCommandArgs): Promise<void> {
    const spinner = argv.quiet
      ? null
      : ora("Loading memory entries...").start();

    try {
      const sdk = this.getSDK();
      const stats = await sdk.getConversationStats();

      if (spinner) {
        spinner.succeed(`Found ${stats.totalSessions} session(s)`);
      }

      if (stats.totalSessions === 0) {
        logger.always(chalk.yellow("No memory sessions found."));
        logger.always(
          chalk.blue("Memory is populated during conversations in loop mode."),
        );
        return;
      }

      // Get session list if we have a specific session ID
      if (argv.sessionId) {
        const history = await sdk.getConversationHistory(argv.sessionId);

        if (argv.format === "json") {
          logger.always(
            JSON.stringify(
              { sessionId: argv.sessionId, messages: history },
              null,
              2,
            ),
          );
        } else {
          logger.always(chalk.bold(`\nSession: ${chalk.cyan(argv.sessionId)}`));
          logger.always(chalk.gray(`Messages: ${history.length}`));
          logger.always("");

          const displayLimit = argv.limit ?? 50;
          const displayHistory = history.slice(-displayLimit);

          for (const msg of displayHistory) {
            const roleColor = msg.role === "user" ? chalk.cyan : chalk.green;
            const roleLabel = msg.role === "user" ? "User" : "Assistant";
            const content =
              typeof msg.content === "string"
                ? msg.content
                : JSON.stringify(msg.content);
            const truncatedContent =
              content.length > 200 ? content.slice(0, 200) + "..." : content;
            logger.always(`  [${roleColor(roleLabel)}]: ${truncatedContent}`);
          }

          if (history.length > displayLimit) {
            logger.always(
              chalk.gray(
                `\n  ... and ${history.length - displayLimit} more messages`,
              ),
            );
          }
        }
      } else {
        // Show summary of all sessions
        if (argv.format === "json") {
          logger.always(JSON.stringify(stats, null, 2));
        } else {
          logger.always(chalk.bold("\nMemory Sessions:\n"));
          logger.always(`  Total Sessions: ${chalk.cyan(stats.totalSessions)}`);
          logger.always(`  Total Turns: ${chalk.cyan(stats.totalTurns)}`);
          logger.always("");
          logger.always(
            chalk.blue(
              'Use "neurolink memory list --session-id <id>" to view a specific session.',
            ),
          );
        }
      }

      // Save to file if output specified
      if (argv.output) {
        const outputData = argv.sessionId
          ? {
              sessionId: argv.sessionId,
              messages: await sdk.getConversationHistory(argv.sessionId),
            }
          : stats;
        fs.writeFileSync(argv.output, JSON.stringify(outputData, null, 2));
        logger.always(chalk.green(`Output saved to ${argv.output}`));
      }
    } catch (error) {
      if (spinner) {
        spinner.fail("Failed to load memory entries");
      }
      this.handleMemoryError(error as Error, "list");
    }
  }

  /**
   * Execute clear command
   */
  private static async executeClear(argv: MemoryCommandArgs): Promise<void> {
    const isAllSessions = !argv.sessionId;
    const target = isAllSessions ? "all sessions" : `session ${argv.sessionId}`;

    // Require confirmation for clearing all sessions
    if (isAllSessions && !argv.force) {
      logger.always(
        chalk.yellow("Warning: This will clear all memory sessions."),
      );
      logger.always(
        "Use --force to confirm, or specify --session-id to clear a specific session.",
      );
      return;
    }

    const spinner = argv.quiet ? null : ora(`Clearing ${target}...`).start();

    try {
      const sdk = this.getSDK();

      if (argv.sessionId) {
        await sdk.clearConversationSession(argv.sessionId);
      } else {
        // Clear all sessions
        await sdk.clearAllConversations();
      }

      if (spinner) {
        spinner.succeed(chalk.green(`Cleared ${target}`));
      }

      if (argv.format === "json") {
        logger.always(
          JSON.stringify({
            success: true,
            action: isAllSessions ? "clear_all" : "clear_session",
            sessionId: argv.sessionId || null,
          }),
        );
      } else if (!argv.quiet) {
        logger.always(chalk.green(`Memory cleared for ${target}`));
      }
    } catch (error) {
      if (spinner) {
        spinner.fail(`Failed to clear ${target}`);
      }
      this.handleMemoryError(error as Error, "clear");
    }
  }

  /**
   * Execute export command
   */
  private static async executeExport(argv: MemoryCommandArgs): Promise<void> {
    const filePath = argv.file;
    if (!filePath) {
      logger.error(chalk.red("File path is required"));
      process.exit(1);
    }

    const spinner = argv.quiet
      ? null
      : ora(`Exporting memory to ${filePath}...`).start();

    try {
      const sdk = this.getSDK();
      const stats = await sdk.getConversationStats();

      const exportData: MemoryExportData = {
        version: "1.0.0",
        exportedAt: new Date().toISOString(),
        sessions: [],
        stats: {
          totalSessions: stats.totalSessions,
          totalTurns: stats.totalTurns,
        },
      };

      // Export specific session or attempt to export all
      if (argv.sessionId) {
        const history = await sdk.getConversationHistory(argv.sessionId);
        exportData.sessions.push({
          sessionId: argv.sessionId,
          messages: history.map((m) => ({
            role: m.role,
            content:
              typeof m.content === "string"
                ? m.content
                : JSON.stringify(m.content),
            timestamp: m.timestamp,
          })),
        });
      } else {
        // Export default session (SDK doesn't expose all sessions directly)
        const defaultHistory = await sdk.getConversationHistory("default");
        if (defaultHistory.length > 0) {
          exportData.sessions.push({
            sessionId: "default",
            messages: defaultHistory.map((m) => ({
              role: m.role,
              content:
                typeof m.content === "string"
                  ? m.content
                  : JSON.stringify(m.content),
              timestamp: m.timestamp,
            })),
          });
        }
      }

      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (dir && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));

      if (spinner) {
        spinner.succeed(chalk.green(`Memory exported to ${filePath}`));
      }

      if (argv.format === "json") {
        logger.always(
          JSON.stringify({
            success: true,
            file: filePath,
            sessions: exportData.sessions.length,
            totalMessages: exportData.sessions.reduce(
              (sum, s) => sum + s.messages.length,
              0,
            ),
          }),
        );
      } else if (!argv.quiet) {
        logger.always(`Exported ${exportData.sessions.length} session(s)`);
        logger.always(
          `Total messages: ${exportData.sessions.reduce((sum, s) => sum + s.messages.length, 0)}`,
        );
      }
    } catch (error) {
      if (spinner) {
        spinner.fail("Export failed");
      }
      this.handleMemoryError(error as Error, "export");
    }
  }

  /**
   * Execute import command
   */
  private static async executeImport(argv: MemoryCommandArgs): Promise<void> {
    const filePath = argv.file;
    if (!filePath) {
      logger.error(chalk.red("File path is required"));
      process.exit(1);
    }

    if (!fs.existsSync(filePath)) {
      logger.error(chalk.red(`File not found: ${filePath}`));
      process.exit(1);
    }

    const spinner = argv.quiet
      ? null
      : ora(`Importing memory from ${filePath}...`).start();

    try {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      let importData: MemoryExportData;

      try {
        importData = JSON.parse(fileContent) as MemoryExportData;
      } catch {
        throw new Error("Invalid JSON format in import file");
      }

      // Validate import data structure
      if (!importData.sessions || !Array.isArray(importData.sessions)) {
        throw new Error("Invalid import file: missing sessions array");
      }

      const sdk = this.getSDK();
      let importedSessions = 0;
      let importedMessages = 0;

      for (const session of importData.sessions) {
        if (!session.sessionId || !session.messages) {
          continue;
        }

        // Import messages as conversation turns
        for (let i = 0; i < session.messages.length - 1; i += 2) {
          const userMsg = session.messages[i];
          const assistantMsg = session.messages[i + 1];

          if (userMsg?.role === "user" && assistantMsg?.role === "assistant") {
            await sdk.storeConversation(
              userMsg.content,
              assistantMsg.content,
              session.sessionId,
            );
            importedMessages += 2;
          }
        }
        importedSessions++;
      }

      if (spinner) {
        spinner.succeed(chalk.green(`Memory imported from ${filePath}`));
      }

      if (argv.format === "json") {
        logger.always(
          JSON.stringify({
            success: true,
            file: filePath,
            importedSessions,
            importedMessages,
          }),
        );
      } else if (!argv.quiet) {
        logger.always(`Imported ${importedSessions} session(s)`);
        logger.always(`Total messages: ${importedMessages}`);
      }
    } catch (error) {
      if (spinner) {
        spinner.fail("Import failed");
      }
      this.handleMemoryError(error as Error, "import");
    }
  }

  /**
   * Execute stats command
   */
  private static async executeStats(argv: MemoryCommandArgs): Promise<void> {
    const spinner = argv.quiet
      ? null
      : ora("Getting memory statistics...").start();

    try {
      const sdk = this.getSDK();
      const basicStats = await sdk.getConversationStats();

      // Try to get three-layer memory stats if available
      let threeLayerStats: Awaited<
        ReturnType<typeof sdk.getThreeLayerMemoryStats>
      > | null = null;
      try {
        threeLayerStats = await sdk.getThreeLayerMemoryStats();
      } catch {
        // Three-layer memory may not be enabled
      }

      const stats: MemoryStats = {
        totalSessions: basicStats.totalSessions,
        totalTurns: basicStats.totalTurns,
        layers: {
          conversationHistory: {
            enabled: true,
            messageCount: basicStats.totalTurns * 2, // Approximate
          },
        },
        storage: {
          type: "memory",
          status: "connected",
        },
      };

      // Merge three-layer stats if available
      if (threeLayerStats) {
        if (threeLayerStats.conversationHistory) {
          stats.layers.conversationHistory.enabled =
            threeLayerStats.conversationHistory.enabled;
        }
        if (threeLayerStats.semanticRecall) {
          stats.layers.semanticRecall = {
            enabled: true,
            vectorCount: threeLayerStats.semanticRecall.vectorCount,
          };
        }
        if (threeLayerStats.workingMemory) {
          stats.layers.workingMemory = {
            enabled: threeLayerStats.workingMemory.enabled,
            mode: threeLayerStats.workingMemory.mode,
          };
        }
      }

      if (spinner) {
        spinner.succeed("Memory statistics retrieved");
      }

      if (argv.format === "json") {
        logger.always(JSON.stringify(stats, null, 2));
      } else {
        logger.always(chalk.bold("\nMemory System Statistics:\n"));

        // Basic stats
        logger.always(chalk.cyan("Overview:"));
        logger.always(`  Total Sessions: ${chalk.white(stats.totalSessions)}`);
        logger.always(`  Total Turns: ${chalk.white(stats.totalTurns)}`);
        logger.always(`  Storage Type: ${chalk.white(stats.storage.type)}`);
        logger.always(
          `  Storage Status: ${stats.storage.status === "connected" ? chalk.green("connected") : chalk.red("disconnected")}`,
        );

        // Layer status
        logger.always(chalk.cyan("\nMemory Layers:"));

        // Conversation History
        const chEnabled = stats.layers.conversationHistory.enabled;
        logger.always(
          `  Conversation History: ${chEnabled ? chalk.green("enabled") : chalk.gray("disabled")}`,
        );
        if (chEnabled && stats.layers.conversationHistory.messageCount) {
          logger.always(
            `    Messages: ~${stats.layers.conversationHistory.messageCount}`,
          );
        }

        // Semantic Recall
        if (stats.layers.semanticRecall) {
          const srEnabled = stats.layers.semanticRecall.enabled;
          logger.always(
            `  Semantic Recall: ${srEnabled ? chalk.green("enabled") : chalk.gray("disabled")}`,
          );
          if (srEnabled && stats.layers.semanticRecall.vectorCount) {
            logger.always(
              `    Vectors: ${stats.layers.semanticRecall.vectorCount}`,
            );
          }
        } else {
          logger.always(`  Semantic Recall: ${chalk.gray("not configured")}`);
        }

        // Working Memory
        if (stats.layers.workingMemory) {
          const wmEnabled = stats.layers.workingMemory.enabled;
          logger.always(
            `  Working Memory: ${wmEnabled ? chalk.green("enabled") : chalk.gray("disabled")}`,
          );
          if (wmEnabled && stats.layers.workingMemory.mode) {
            logger.always(`    Mode: ${stats.layers.workingMemory.mode}`);
          }
        } else {
          logger.always(`  Working Memory: ${chalk.gray("not configured")}`);
        }
      }

      // Save to file if output specified
      if (argv.output) {
        fs.writeFileSync(argv.output, JSON.stringify(stats, null, 2));
        logger.always(chalk.green(`\nStats saved to ${argv.output}`));
      }
    } catch (error) {
      if (spinner) {
        spinner.fail("Failed to get memory statistics");
      }
      this.handleMemoryError(error as Error, "stats");
    }
  }

  /**
   * Execute search command
   */
  private static async executeSearch(argv: MemoryCommandArgs): Promise<void> {
    const query = argv.query;
    if (!query) {
      logger.error(chalk.red("Search query is required"));
      process.exit(1);
    }

    const spinner = argv.quiet
      ? null
      : ora(`Searching memory for "${query}"...`).start();

    try {
      const sdk = this.getSDK();

      // Check if semantic search is available
      let searchResults: Array<{
        content: string;
        score: number;
        role: string;
        threadId?: string;
      }> = [];

      try {
        // Try to use semantic search through the SDK
        // This depends on semantic recall being configured
        const results = await sdk.searchMemory(query, {
          sessionId: argv.sessionId,
          limit: argv.limit ?? 10,
          threshold: argv.threshold ?? 0.7,
        });
        searchResults = results;
      } catch {
        // Semantic search not available, fall back to basic text search
        if (spinner) {
          spinner.text = "Semantic search not available, using text search...";
        }

        // Fall back to searching through conversation history
        const sessionId = argv.sessionId ?? "default";
        const history = await sdk.getConversationHistory(sessionId);
        const queryLower = query.toLowerCase();

        searchResults = history
          .filter((msg) => {
            const content =
              typeof msg.content === "string"
                ? msg.content
                : JSON.stringify(msg.content);
            return content.toLowerCase().includes(queryLower);
          })
          .map((msg) => ({
            content:
              typeof msg.content === "string"
                ? msg.content
                : JSON.stringify(msg.content),
            score: 1.0, // Text match doesn't have a real score
            role: msg.role,
            threadId: sessionId,
          }))
          .slice(0, argv.limit ?? 10);
      }

      if (spinner) {
        spinner.succeed(`Found ${searchResults.length} result(s)`);
      }

      if (searchResults.length === 0) {
        logger.always(chalk.yellow("No matching memories found."));
        if (!argv.sessionId) {
          logger.always(
            chalk.blue(
              "Try specifying a session with --session-id or adjusting the threshold.",
            ),
          );
        }
        return;
      }

      if (argv.format === "json") {
        logger.always(
          JSON.stringify(
            {
              query,
              results: searchResults,
              total: searchResults.length,
            },
            null,
            2,
          ),
        );
      } else {
        logger.always(chalk.bold(`\nSearch Results for "${query}":\n`));

        for (let i = 0; i < searchResults.length; i++) {
          const result = searchResults[i];
          const roleColor = result.role === "user" ? chalk.cyan : chalk.green;
          const scoreDisplay =
            result.score < 1
              ? chalk.gray(`(${(result.score * 100).toFixed(1)}% match)`)
              : chalk.gray("(text match)");

          logger.always(
            `${chalk.white(`${i + 1}.`)} [${roleColor(result.role)}] ${scoreDisplay}`,
          );

          // Truncate long content
          const content = result.content;
          const truncatedContent =
            content.length > 300 ? content.slice(0, 300) + "..." : content;
          logger.always(`   ${truncatedContent}`);

          if (result.threadId) {
            logger.always(chalk.gray(`   Thread: ${result.threadId}`));
          }
          logger.always("");
        }
      }

      // Save to file if output specified
      if (argv.output) {
        fs.writeFileSync(
          argv.output,
          JSON.stringify({ query, results: searchResults }, null, 2),
        );
        logger.always(chalk.green(`Results saved to ${argv.output}`));
      }
    } catch (error) {
      if (spinner) {
        spinner.fail("Search failed");
      }
      this.handleMemoryError(error as Error, "search");
    }
  }

  /**
   * Get SDK instance from global session or create new one
   */
  private static getSDK(): NeuroLink {
    return globalSession.getOrCreateNeuroLink();
  }

  /**
   * Handle memory-related errors with helpful messages
   */
  private static handleMemoryError(error: Error, operation: string): void {
    const message = error.message || "Unknown error";

    if (message.includes("not enabled") || message.includes("Memory is not")) {
      logger.always(chalk.yellow("Memory system is not fully configured."));
      logger.always(
        chalk.blue("Memory is populated during conversations in loop mode."),
      );
      logger.always(
        chalk.blue(
          "Start a conversation with: neurolink loop --enable-conversation-memory",
        ),
      );
    } else if (message.includes("semantic") || message.includes("vector")) {
      logger.always(
        chalk.yellow("Semantic search requires additional configuration."),
      );
      logger.always(
        chalk.blue(
          "Enable semantic recall with a vector store and embedding provider.",
        ),
      );
    } else {
      logger.error(chalk.red(`Memory ${operation} failed: ${message}`));
      if (process.env.NEUROLINK_DEBUG === "true") {
        logger.error(chalk.gray(error.stack || ""));
      }
    }
    process.exit(1);
  }
}
