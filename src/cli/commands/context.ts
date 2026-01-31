/**
 * Context CLI Command - Manages dynamic argument context
 *
 * This command provides CLI access to the dynamic arguments context system,
 * allowing users to set, get, and clear context values for dynamic argument resolution.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import chalk from "chalk";
import type { ArgumentsCamelCase, CommandModule } from "yargs";
import { logger } from "../../lib/utils/logger.js";

/**
 * Context storage file path (user home directory)
 */
const CONTEXT_FILE = path.join(os.homedir(), ".neurolink", "context.json");

/**
 * Context data structure
 */
interface ContextData {
  userId?: string;
  userEmail?: string;
  tenantId?: string;
  tenantPlan?: "free" | "starter" | "pro" | "enterprise";
  sessionId?: string;
  env?: "development" | "staging" | "production";
  runtimeContext?: Record<string, unknown>;
  updatedAt?: string;
}

/**
 * Ensure the context directory exists
 */
function ensureContextDir(): void {
  const dir = path.dirname(CONTEXT_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Load context from file
 */
function loadContext(): ContextData {
  try {
    if (fs.existsSync(CONTEXT_FILE)) {
      const data = fs.readFileSync(CONTEXT_FILE, "utf-8");
      return JSON.parse(data) as ContextData;
    }
  } catch (error) {
    logger.debug(`Failed to load context: ${(error as Error).message}`);
  }
  return {};
}

/**
 * Save context to file
 */
function saveContext(context: ContextData): void {
  ensureContextDir();
  context.updatedAt = new Date().toISOString();
  fs.writeFileSync(CONTEXT_FILE, JSON.stringify(context, null, 2));
}

/**
 * Context command options interface
 */
interface ContextOptions {
  userId?: string;
  userEmail?: string;
  tenantId?: string;
  tenantPlan?: string;
  sessionId?: string;
  env?: string;
  runtimeContext?: string;
  format?: "text" | "json";
  key?: string;
}

/**
 * Handle 'context set' subcommand
 */
function handleSet(argv: ArgumentsCamelCase<ContextOptions>): void {
  const context = loadContext();

  // Update context with provided values
  if (argv.userId !== undefined) {
    context.userId = argv.userId;
    logger.always(chalk.green(`  user-id: ${argv.userId}`));
  }
  if (argv.userEmail !== undefined) {
    context.userEmail = argv.userEmail;
    logger.always(chalk.green(`  user-email: ${argv.userEmail}`));
  }
  if (argv.tenantId !== undefined) {
    context.tenantId = argv.tenantId;
    logger.always(chalk.green(`  tenant-id: ${argv.tenantId}`));
  }
  if (argv.tenantPlan !== undefined) {
    context.tenantPlan = argv.tenantPlan as ContextData["tenantPlan"];
    logger.always(chalk.green(`  tenant-plan: ${argv.tenantPlan}`));
  }
  if (argv.sessionId !== undefined) {
    context.sessionId = argv.sessionId;
    logger.always(chalk.green(`  session-id: ${argv.sessionId}`));
  }
  if (argv.env !== undefined) {
    context.env = argv.env as ContextData["env"];
    logger.always(chalk.green(`  env: ${argv.env}`));
  }
  if (argv.runtimeContext !== undefined) {
    try {
      const parsed = JSON.parse(argv.runtimeContext);
      context.runtimeContext = {
        ...context.runtimeContext,
        ...parsed,
      };
      logger.always(chalk.green(`  runtime-context: ${JSON.stringify(parsed)}`));
    } catch (error) {
      logger.error(chalk.red(`Invalid JSON for runtime-context: ${(error as Error).message}`));
      process.exit(1);
    }
  }

  saveContext(context);
  logger.always(chalk.green("\nContext updated successfully."));
}

/**
 * Handle 'context get' subcommand
 */
function handleGet(argv: ArgumentsCamelCase<ContextOptions>): void {
  const context = loadContext();

  // If a specific key is requested
  if (argv.key) {
    const value = context[argv.key as keyof ContextData];
    if (value !== undefined) {
      if (argv.format === "json") {
        logger.always(JSON.stringify({ [argv.key]: value }, null, 2));
      } else {
        logger.always(`${argv.key}: ${JSON.stringify(value)}`);
      }
    } else {
      logger.always(chalk.yellow(`Key '${argv.key}' not found in context.`));
    }
    return;
  }

  // Show all context
  if (Object.keys(context).length === 0) {
    logger.always(chalk.yellow("No context values set."));
    logger.always(chalk.gray("Use 'neurolink context set --user-id <id>' to set values."));
    return;
  }

  if (argv.format === "json") {
    logger.always(JSON.stringify(context, null, 2));
  } else {
    logger.always(chalk.bold("\nCurrent Dynamic Argument Context:\n"));

    if (context.userId) {
      logger.always(`  ${chalk.cyan("user-id:")} ${context.userId}`);
    }
    if (context.userEmail) {
      logger.always(`  ${chalk.cyan("user-email:")} ${context.userEmail}`);
    }
    if (context.tenantId) {
      logger.always(`  ${chalk.cyan("tenant-id:")} ${context.tenantId}`);
    }
    if (context.tenantPlan) {
      logger.always(`  ${chalk.cyan("tenant-plan:")} ${context.tenantPlan}`);
    }
    if (context.sessionId) {
      logger.always(`  ${chalk.cyan("session-id:")} ${context.sessionId}`);
    }
    if (context.env) {
      logger.always(`  ${chalk.cyan("env:")} ${context.env}`);
    }
    if (context.runtimeContext && Object.keys(context.runtimeContext).length > 0) {
      logger.always(`  ${chalk.cyan("runtime-context:")}`);
      for (const [key, value] of Object.entries(context.runtimeContext)) {
        logger.always(`    ${key}: ${JSON.stringify(value)}`);
      }
    }
    if (context.updatedAt) {
      logger.always(chalk.gray(`\n  Last updated: ${context.updatedAt}`));
    }
  }
}

/**
 * Handle 'context clear' subcommand
 */
function handleClear(argv: ArgumentsCamelCase<ContextOptions>): void {
  if (argv.key) {
    // Clear specific key
    const context = loadContext();
    if (argv.key in context) {
      delete context[argv.key as keyof ContextData];
      saveContext(context);
      logger.always(chalk.green(`Cleared '${argv.key}' from context.`));
    } else {
      logger.always(chalk.yellow(`Key '${argv.key}' not found in context.`));
    }
  } else {
    // Clear all context
    if (fs.existsSync(CONTEXT_FILE)) {
      fs.unlinkSync(CONTEXT_FILE);
      logger.always(chalk.green("Context cleared successfully."));
    } else {
      logger.always(chalk.yellow("No context to clear."));
    }
  }
}

/**
 * Context command definition
 */
export const contextCommand: CommandModule = {
  command: "context",
  describe: "Manage dynamic argument context for request-aware configuration",
  builder: (yargs) =>
    yargs
      .option("user-id", {
        type: "string",
        describe: "Set user ID for context resolution",
      })
      .option("user-email", {
        type: "string",
        describe: "Set user email for context resolution",
      })
      .option("tenant-id", {
        type: "string",
        describe: "Set tenant ID for multi-tenant context",
      })
      .option("tenant-plan", {
        type: "string",
        choices: ["free", "starter", "pro", "enterprise"],
        describe: "Set tenant subscription plan for tier-based configuration",
      })
      .option("session-id", {
        type: "string",
        describe: "Set session ID for request context tracking",
      })
      .option("env", {
        type: "string",
        choices: ["development", "staging", "production"],
        describe: "Set environment for environment-specific configuration",
      })
      .option("runtime-context", {
        type: "string",
        describe: 'JSON object with runtime context values (e.g., {"taskType": "analysis"})',
      })
      .option("format", {
        type: "string",
        choices: ["text", "json"],
        default: "text",
        describe: "Output format for get command",
      })
      .command(
        "set",
        "Set context values for dynamic argument resolution",
        (y) =>
          y
            .example("$0 context set --user-id user123", "Set user ID in context")
            .example("$0 context set --tenant-id org456 --tenant-plan enterprise", "Set tenant context")
            .example('$0 context set --runtime-context \'{"priority": "high"}\'', "Set runtime values"),
        (argv) => handleSet(argv as unknown as ArgumentsCamelCase<ContextOptions>),
      )
      .command(
        "get [key]",
        "Get current context values",
        (y) =>
          y
            .positional("key", {
              type: "string",
              describe: "Specific context key to retrieve",
            })
            .example("$0 context get", "Show all context values")
            .example("$0 context get userId", "Get specific context value")
            .example("$0 context get --format json", "Output as JSON"),
        (argv) => handleGet(argv as unknown as ArgumentsCamelCase<ContextOptions>),
      )
      .command(
        "clear [key]",
        "Clear context values",
        (y) =>
          y
            .positional("key", {
              type: "string",
              describe: "Specific context key to clear (omit to clear all)",
            })
            .example("$0 context clear", "Clear all context")
            .example("$0 context clear userId", "Clear specific key"),
        (argv) => handleClear(argv as unknown as ArgumentsCamelCase<ContextOptions>),
      )
      .demandCommand(1, "Please specify a context subcommand (set, get, clear)")
      .epilogue("Context values are persisted and used for dynamic argument resolution in generate/stream commands."),
  handler: () => {},
};

/**
 * Context Command Factory for integration with CLICommandFactory pattern
 */
export class ContextCommandFactory {
  /**
   * Create the context command module
   */
  static createContextCommands(): CommandModule {
    return contextCommand;
  }

  /**
   * Get the current context (for use by other commands)
   */
  static getCurrentContext(): ContextData {
    return loadContext();
  }

  /**
   * Merge CLI context flags with stored context
   * CLI flags take precedence over stored values
   */
  static mergeWithCliFlags(cliFlags: Partial<ContextData>): ContextData {
    const stored = loadContext();
    return {
      ...stored,
      ...Object.fromEntries(Object.entries(cliFlags).filter(([_, v]) => v !== undefined)),
    };
  }
}

export default contextCommand;
