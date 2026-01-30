# CLI Implementation Guide

This comprehensive guide consolidates lessons learned from NeuroLink's CLI evolution (achieving 80% code reduction) and establishes patterns for building professional command-line interfaces.

## Table of Contents

1. [CLI Architecture Lessons](#cli-architecture-lessons)
2. [Command Factory Patterns](#command-factory-patterns)
3. [Loop Mode Implementation](#loop-mode-implementation)
4. [Interactive Features](#interactive-features)
5. [Output Formatting](#output-formatting)
6. [Error Handling in CLI](#error-handling-in-cli)
7. [Command Templates](#command-templates)
8. [Multimodal CLI Support](#multimodal-cli-support)
9. [Best Practices Summary](#best-practices-summary)

---

## CLI Architecture Lessons

### The Journey: From Monolithic to Factory Pattern

The NeuroLink CLI evolution demonstrates critical lessons in CLI architecture:

| Phase                          | Lines of Code | Commands             | Architecture           |
| ------------------------------ | ------------- | -------------------- | ---------------------- |
| Initial (June 2025)            | 380 lines     | 5                    | Monolithic single file |
| Growth (July 2025)             | 1,580 lines   | 15                   | Sprawling handlers     |
| Factory Refactor (August 2025) | 314 lines     | 20+                  | Factory pattern        |
| **Code Reduction**             | **80%**       | **4x more commands** | **Sustainable**        |

### Key Architectural Decisions

#### 1. Factory Pattern Over Embedded Handlers

**Problem**: Initial monolithic design became unmaintainable as commands grew.

**Solution**: Centralized command factory with shared options.

```typescript
// BEFORE: Embedded handlers (unmaintainable at scale)
yargs
  .command("generate <input>", "Generate content", (y) => {
    return y
      .option("provider", { /* 10 lines */ })
      .option("model", { /* 10 lines */ })
      .option("temperature", { /* 10 lines */ })
      // ... 50+ more options duplicated across commands
  }, async (argv) => { /* handler */ })
  .command("stream <input>", "Stream content", (y) => {
    // Same options duplicated again!
    return y.option("provider", { /* 10 lines */ })...
  }, async (argv) => { /* handler */ });

// AFTER: Factory pattern (sustainable)
export class CLICommandFactory {
  private static readonly commonOptions = {
    provider: { choices: [...], default: "auto", alias: "p" },
    model: { type: "string", alias: "m" },
    temperature: { type: "number", default: 0.7, alias: "t" },
    // ... defined once, used everywhere
  };

  private static buildOptions(yargs: Argv, additionalOptions = {}) {
    return yargs.options({ ...this.commonOptions, ...additionalOptions });
  }

  static createGenerateCommand(): CommandModule { /* uses buildOptions */ }
  static createStreamCommand(): CommandModule { /* uses buildOptions */ }
}
```

#### 2. Unified Command Design

**Problem**: Multiple similar commands (generate-text, agent-generate) confused users.

**Solution**: Single command with flags for variations.

```bash
# BEFORE: Confusing command proliferation
neurolink generate-text "prompt"      # Basic generation
neurolink agent-generate "prompt"     # With tools
neurolink stream-text "prompt"        # Streaming

# AFTER: Unified with clear flags
neurolink generate "prompt"           # Default (tools enabled)
neurolink generate "prompt" --disable-tools  # Without tools
neurolink stream "prompt"             # Clear streaming variant
```

#### 3. Session-Aware Error Handling

**Problem**: Errors in loop mode terminated the entire session.

**Solution**: Global session state awareness in error handlers.

```typescript
export function handleError(error: Error, context: string): void {
  logger.error(chalk.red(`Error: ${context} failed: ${error.message}`));

  // Only exit if NOT in loop mode
  if (!globalSession.getCurrentSessionId()) {
    process.exit(1);
  }
  // In loop mode, display error but continue
}
```

#### 4. Stream as Default in Interactive Mode

**Problem**: Generate command waits for full response, poor UX in REPL.

**Solution**: Default to streaming in loop mode for immediate feedback.

```typescript
// In loop session command processing
if (command.startsWith("/")) {
  // Explicit command: /generate, /batch, etc.
  processedCommand = command.slice(1).trim();
} else {
  // Default: treat plain text as stream command
  processedCommand = ["stream", command];
}
```

### Architecture Component Diagram

```
+------------------------------------------------------------------+
|                         CLI Entry Point                           |
|                      src/cli/index.ts                             |
+--------------------------------+---------------------------------+
                                 |
                                 v
+------------------------------------------------------------------+
|                         CLI Parser                                |
|                      src/cli/parser.ts                            |
|   - Yargs initialization with middleware                          |
|   - Global options and error handling                             |
|   - Command registration                                          |
+--------------------------------+---------------------------------+
                                 |
              +------------------+------------------+
              |                                     |
              v                                     v
+---------------------------+         +---------------------------+
|    CLICommandFactory      |         |   Specialized Factories   |
|  (Main command factory)   |         |  - OllamaCommandFactory   |
|  - createGenerateCommand  |         |  - SageMakerCommandFactory|
|  - createStreamCommand    |         |  - MCPCommandFactory      |
|  - createBatchCommand     |         |  - ModelsCommandFactory   |
|  - createLoopCommand      |         |  - SetupCommandFactory    |
+---------------------------+         +---------------------------+
              |
              v
+------------------------------------------------------------------+
|                      Loop Session                                 |
|                  src/cli/loop/session.ts                          |
|   - Interactive REPL with history                                 |
|   - Session variable management                                   |
|   - Conversation memory integration                               |
+------------------------------------------------------------------+
```

---

## Command Factory Patterns

### Core Factory Implementation

The `CLICommandFactory` is the central hub for command creation:

```typescript
// src/cli/factories/commandFactory.ts

import type { CommandModule, Argv } from "yargs";
import chalk from "chalk";
import ora from "ora";
import { logger } from "../../lib/utils/logger.js";
import { handleError } from "../errorHandler.js";

export class CLICommandFactory {
  // =====================================================
  // COMMON OPTIONS - Single source of truth
  // =====================================================
  private static readonly commonOptions = {
    // Core generation options
    provider: {
      choices: [
        "auto",
        "openai",
        "anthropic",
        "bedrock",
        "vertex",
        "google-ai",
        "azure",
        "mistral",
        "ollama",
        "litellm",
      ],
      default: "auto",
      description: "AI provider to use (auto-selects best available)",
      alias: "p",
    },
    model: {
      type: "string" as const,
      description: "Specific model to use (e.g., gpt-4o, claude-3-sonnet)",
      alias: "m",
    },
    temperature: {
      type: "number" as const,
      default: 0.7,
      description: "Creativity level (0.0 = focused, 1.0 = creative)",
      alias: "t",
    },
    maxTokens: {
      type: "number" as const,
      default: 1000,
      description: "Maximum tokens to generate",
      alias: "max",
    },
    system: {
      type: "string" as const,
      description: "System prompt to guide AI behavior",
      alias: "s",
    },

    // Output control
    format: {
      choices: ["text", "json", "table"] as const,
      default: "text",
      alias: ["f", "output-format"],
      description: "Output format",
    },
    output: {
      type: "string" as const,
      description: "Save output to file",
      alias: "o",
    },

    // Behavior control
    timeout: {
      type: "number" as const,
      default: 120,
      description: "Maximum execution time in seconds",
    },
    disableTools: {
      type: "boolean" as const,
      default: false,
      description: "Disable MCP tool integration",
    },

    // Debug options
    debug: {
      type: "boolean" as const,
      alias: ["v", "verbose"],
      default: false,
      description: "Enable debug mode with verbose output",
    },
    quiet: {
      type: "boolean" as const,
      alias: "q",
      default: true,
      description: "Suppress non-essential output",
    },
    noColor: {
      type: "boolean" as const,
      default: false,
      description: "Disable colored output (useful for CI/scripts)",
    },
    dryRun: {
      type: "boolean" as const,
      default: false,
      description: "Test command without making actual API calls",
    },
  };

  // =====================================================
  // HELPER METHODS
  // =====================================================

  /**
   * Build options for a command by merging common options with additionals
   */
  private static buildOptions(yargs: Argv, additionalOptions = {}): Argv {
    return yargs.options({
      ...this.commonOptions,
      ...additionalOptions,
    });
  }

  /**
   * Process common options before command execution
   */
  private static processOptions(argv: Record<string, unknown>): void {
    // Handle noColor option by disabling chalk
    if (argv.noColor) {
      process.env.FORCE_COLOR = "0";
    }

    // Set debug environment variable
    if (argv.debug) {
      process.env.NEUROLINK_DEBUG = "true";
    }
  }

  // =====================================================
  // COMMAND CREATION METHODS
  // =====================================================

  /**
   * Create the generate command
   */
  static createGenerateCommand(): CommandModule {
    return {
      command: ["generate <input>", "gen <input>"], // Command with alias
      describe: "Generate content using AI providers",
      builder: (yargs) => {
        return this.buildOptions(
          yargs
            .positional("input", {
              type: "string" as const,
              description: "Text prompt for AI generation",
              demandOption: true,
            })
            .example(
              '$0 generate "Explain quantum computing"',
              "Basic generation",
            )
            .example(
              '$0 gen "Write code" --provider openai',
              "Specific provider",
            )
            .example('$0 gen "Analyze image" --image photo.jpg', "With image"),
        );
      },
      handler: async (argv) => {
        this.processOptions(argv);
        await this.executeGenerate(argv);
      },
    };
  }

  /**
   * Create the stream command
   */
  static createStreamCommand(): CommandModule {
    return {
      command: "stream <input>",
      describe: "Stream AI-generated content in real-time",
      builder: (yargs) => {
        return this.buildOptions(
          yargs
            .positional("input", {
              type: "string" as const,
              description: "Text prompt for streaming",
              demandOption: true,
            })
            .example('$0 stream "Tell me a story"', "Stream a story"),
        );
      },
      handler: async (argv) => {
        this.processOptions(argv);
        await this.executeStream(argv);
      },
    };
  }

  // =====================================================
  // EXECUTION METHODS
  // =====================================================

  private static async executeGenerate(
    argv: Record<string, unknown>,
  ): Promise<void> {
    const spinner = argv.quiet ? null : ora("Generating content...").start();

    try {
      // Implementation...
      const result = await performGeneration(argv);

      if (spinner) {
        spinner.succeed(chalk.green("Content generated successfully!"));
      }

      this.handleOutput(result, argv);
    } catch (error) {
      if (spinner) {
        spinner.fail(chalk.red("Generation failed"));
      }
      handleError(error as Error, "Generate");
    }
  }

  private static handleOutput(
    result: unknown,
    options: Record<string, unknown>,
  ): void {
    let output: string;

    if (options.format === "json") {
      output = JSON.stringify(result, null, 2);
    } else if (options.format === "table" && Array.isArray(result)) {
      logger.table(result);
      return;
    } else {
      output = typeof result === "string" ? result : JSON.stringify(result);
    }

    if (options.output) {
      fs.writeFileSync(options.output as string, output);
      if (!options.quiet) {
        logger.always(`Output saved to ${options.output}`);
      }
    } else {
      logger.always(output);
    }
  }
}
```

### Specialized Factory Pattern

For complex command groups, create dedicated factory classes:

```typescript
// src/cli/commands/models.ts

export class ModelsCommandFactory {
  /**
   * Create the models command group
   */
  static createModelsCommands(): CommandModule {
    return {
      command: "models <subcommand>",
      describe: "Manage and discover AI models",
      builder: (yargs) => {
        return yargs
          .command(
            "list",
            "List available models",
            (y) => this.buildListOptions(y),
            (argv) => this.executeList(argv),
          )
          .command(
            "search [query]",
            "Search models by capability",
            (y) => this.buildSearchOptions(y),
            (argv) => this.executeSearch(argv),
          )
          .command(
            "info <model>",
            "Get detailed model information",
            (y) =>
              y.positional("model", { type: "string", demandOption: true }),
            (argv) => this.executeInfo(argv),
          )
          .demandCommand(1, "Please specify a models subcommand");
      },
      handler: () => {}, // No-op for parent command
    };
  }

  private static buildListOptions(yargs: Argv): Argv {
    return yargs
      .option("provider", {
        choices: getAvailableProviders(),
        description: "Filter by provider",
      })
      .option("category", {
        choices: ["general", "coding", "creative", "vision"],
        description: "Filter by category",
      })
      .option("format", {
        choices: ["table", "json", "compact"],
        default: "table",
      })
      .example("neurolink models list", "List all models")
      .example("neurolink models list --provider openai", "List OpenAI models");
  }

  private static async executeList(
    argv: Record<string, unknown>,
  ): Promise<void> {
    const spinner = argv.quiet ? null : ora("Loading models...").start();

    try {
      const models = await getModels(argv.provider, argv.category);

      if (spinner) {
        spinner.succeed(`Found ${models.length} models`);
      }

      if (argv.format === "json") {
        logger.always(JSON.stringify(models, null, 2));
      } else {
        this.displayModelsTable(models);
      }
    } catch (error) {
      if (spinner) spinner.fail("Failed to load models");
      handleError(error as Error, "Models list");
    }
  }

  private static displayModelsTable(models: Model[]): void {
    logger.always(chalk.bold("\nAvailable Models:\n"));

    for (const model of models) {
      const status = model.deprecated
        ? chalk.red("DEPRECATED")
        : chalk.green("ACTIVE");

      logger.always(`${chalk.cyan(model.id)} ${status}`);
      logger.always(
        `  Provider: ${model.provider} | Category: ${model.category}`,
      );
      logger.always(`  ${chalk.gray(model.description)}`);
      logger.always();
    }
  }
}
```

### Registering Commands in Parser

```typescript
// src/cli/parser.ts

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { CLICommandFactory } from "./factories/commandFactory.js";
import { ModelsCommandFactory } from "./commands/models.js";
import { MCPCommandFactory } from "./commands/mcp.js";
import { OllamaCommandFactory } from "./factories/ollamaCommandFactory.js";
import { globalSession } from "../lib/session/globalSessionState.js";
import { handleError } from "./errorHandler.js";

export function initializeCliParser() {
  return (
    yargs(hideBin(process.argv))
      .scriptName("neurolink")
      .usage("Usage: $0 <command> [options]")
      .version(packageJson.version)
      .help()
      .alias("h", "help")
      .alias("V", "version")
      .strictOptions()
      .strictCommands()
      .demandCommand(1, "")
      .recommendCommands()
      .epilogue("For more info: https://github.com/juspay/neurolink")
      .showHelpOnFail(true, "Specify --help for available options")

      // Global middleware
      .middleware((argv) => {
        if (argv.noColor || process.env.NO_COLOR || !process.stdout.isTTY) {
          process.env.FORCE_COLOR = "0";
        }
        process.env.NEUROLINK_DEBUG = argv.debug ? "true" : "false";
      })

      // Session-aware error handling
      .fail((msg, err, yargsInstance) => {
        if (globalSession.getCurrentSessionId()) {
          // In loop mode: show error but don't exit
          handleError(err || new Error(msg), "CLI Error");
          return;
        }

        // Not in loop mode: exit with error
        if (msg) {
          process.stderr.write(chalk.red(`Error: ${msg}\n`));
          yargsInstance.showHelp();
        }
        process.exit(1);
      })

      // Register commands
      .command(CLICommandFactory.createGenerateCommand())
      .command(CLICommandFactory.createStreamCommand())
      .command(CLICommandFactory.createBatchCommand())
      .command(CLICommandFactory.createLoopCommand())
      .command(ModelsCommandFactory.createModelsCommands())
      .command(MCPCommandFactory.createMCPCommands())
      .command(OllamaCommandFactory.createOllamaCommands())
  );
}
```

---

## Loop Mode Implementation

### Session Architecture

```typescript
// src/cli/loop/session.ts

import type { Argv } from "yargs";
import chalk from "chalk";
import readline from "readline";
import { logger } from "../../lib/utils/logger.js";
import { globalSession } from "../../lib/session/globalSessionState.js";
import { handleError } from "../errorHandler.js";
import { textGenerationOptionsSchema } from "./optionsSchema.js";
import {
  loadCommandHistory,
  saveCommandToHistory,
  parseValue,
} from "../../lib/utils/loopUtils.js";

const NEUROLINK_BANNER = `
 _   _ _____ _   _ ____   ___  _     ___ _   _ _  __
| \\ | | ____| | | |  _ \\ / _ \\| |   |_ _| \\ | | |/ /
|  \\| |  _| | | | | |_) | | | | |    | ||  \\| | ' /
| |\\  | |___| |_| |  _ <| |_| | |___ | || |\\  | . \\
|_| \\_|_____|\\___/|_| \\_\\\\___/|_____|___|_| \\_|_|\\_\\
`;

export class LoopSession {
  private initializeCliParser: () => Argv;
  private isRunning = false;
  private sessionId?: string;
  private commandHistory: string[] = [];
  private sessionVariablesSchema = textGenerationOptionsSchema;

  constructor(
    initializeCliParser: () => Argv,
    private conversationMemoryConfig?: ConversationMemoryConfig,
    private options?: {
      directResumeSessionId?: string;
      forceNewSession?: boolean;
    },
  ) {
    this.initializeCliParser = initializeCliParser;
  }

  /**
   * Start the interactive loop session
   */
  public async start(): Promise<void> {
    // Initialize global session state
    this.sessionId = globalSession.setLoopSession(
      this.conversationMemoryConfig,
    );

    // Load command history
    this.commandHistory = (await loadCommandHistory()).reverse();

    this.isRunning = true;

    // Display welcome banner
    logger.always(chalk.bold.green(NEUROLINK_BANNER));
    logger.always(chalk.bold.green("Welcome to NeuroLink Loop Mode!"));

    // Handle conversation memory if enabled
    if (this.conversationMemoryConfig?.enabled) {
      await this.handleConversationSelection();
      logger.always(chalk.gray(`Session ID: ${this.sessionId}`));
    }

    logger.always(chalk.gray('Type "help" for commands, "exit" to leave.'));

    // Main loop
    while (this.isRunning) {
      try {
        const command = await this.getCommandWithHistory();

        // Handle exit commands
        if (["exit", "quit", ":q"].includes(command.toLowerCase())) {
          this.isRunning = false;
          continue;
        }

        if (!command.trim()) continue;

        // Save to history
        this.commandHistory.unshift(command);
        await saveCommandToHistory(command);

        // Process command
        await this.processCommand(command);
      } catch (error) {
        handleError(error as Error, "Command execution");
      }
    }

    this.cleanup();
  }

  /**
   * Process a command input
   */
  private async processCommand(command: string): Promise<void> {
    let processedCommand: string | string[];

    if (command.startsWith("//")) {
      // Escape sequence: // becomes stream with single /
      processedCommand = ["stream", command.slice(1)];
    } else if (command.startsWith("/")) {
      // Explicit CLI command
      processedCommand = command.slice(1).trim();

      // Check for session commands first
      if (await this.handleSessionCommands(processedCommand)) {
        return;
      }
    } else {
      // Default: treat as stream command
      processedCommand = ["stream", command];
    }

    // Execute with fresh yargs instance
    const yargsInstance = this.initializeCliParser();
    await yargsInstance
      .scriptName("")
      .exitProcess(false)
      .parse(processedCommand);
  }

  /**
   * Handle session-specific commands (set, get, show, clear, help)
   */
  private async handleSessionCommands(command: string): Promise<boolean> {
    const parts = command.split(" ");
    const cmd = parts[0].toLowerCase();

    switch (cmd) {
      case "help":
        this.showHelp();
        return true;

      case "set":
        if (parts.length >= 3) {
          const key = parts[1];
          const schema = this.sessionVariablesSchema[key];

          if (!schema) {
            logger.always(chalk.red(`Unknown variable: "${key}"`));
            logger.always(
              chalk.gray(
                `Available: ${Object.keys(this.sessionVariablesSchema).join(", ")}`,
              ),
            );
            return true;
          }

          const value = parseValue(parts.slice(2).join(" "));
          globalSession.setSessionVariable(key, value);
          logger.always(chalk.green(`Set ${key} = ${value}`));
        } else {
          logger.always(chalk.yellow("Usage: set <variable> <value>"));
        }
        return true;

      case "get":
        if (parts.length >= 2) {
          const value = globalSession.getSessionVariable(parts[1]);
          logger.always(
            value !== undefined
              ? chalk.cyan(`${parts[1]}: ${value}`)
              : chalk.yellow(`${parts[1]} is not set`),
          );
        }
        return true;

      case "show":
        const variables = globalSession.getSessionVariables();
        logger.always(chalk.bold.cyan("\nSession Variables:"));
        for (const [key, value] of Object.entries(variables)) {
          logger.always(chalk.gray(`  ${key}: ${value}`));
        }
        return true;

      case "clear":
        globalSession.clearSessionVariables();
        logger.always(chalk.green("Session variables cleared"));
        return true;

      default:
        return false; // Not a session command
    }
  }

  /**
   * Get command input with history navigation
   */
  private async getCommandWithHistory(): Promise<string> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        history: [...this.commandHistory],
        prompt: `${chalk.green(">")} ${chalk.bold("neurolink")} ${chalk.green(">")} `,
      });

      rl.prompt();

      rl.on("line", (input) => {
        rl.close();
        resolve(input.trim());
      });

      rl.on("SIGINT", () => {
        rl.close();
        this.isRunning = false;
        resolve("exit");
      });
    });
  }

  /**
   * Show help message
   */
  private showHelp(): void {
    logger.always(chalk.bold.cyan("\nLoop Mode Commands:\n"));
    logger.always(
      chalk.white("  <text>              ") +
        chalk.gray("Stream response (default)"),
    );
    logger.always(
      chalk.white("  /generate <text>    ") +
        chalk.gray("Generate (non-streaming)"),
    );
    logger.always(
      chalk.white("  /help               ") + chalk.gray("Show this help"),
    );
    logger.always(
      chalk.white("  /set <var> <value>  ") +
        chalk.gray("Set session variable"),
    );
    logger.always(
      chalk.white("  /get <var>          ") +
        chalk.gray("Get session variable"),
    );
    logger.always(
      chalk.white("  /show               ") + chalk.gray("Show all variables"),
    );
    logger.always(
      chalk.white("  /clear              ") + chalk.gray("Clear all variables"),
    );
    logger.always(
      chalk.white("  exit | quit | :q    ") + chalk.gray("Exit loop mode"),
    );

    logger.always(chalk.bold.cyan("\nSession Variables:"));
    for (const [key, schema] of Object.entries(this.sessionVariablesSchema)) {
      logger.always(
        chalk.white(`  ${key}`) + chalk.gray(` - ${schema.description}`),
      );
    }
  }

  /**
   * Cleanup on session end
   */
  private cleanup(): void {
    globalSession.clearLoopSession();
    logger.always(chalk.green("\nGoodbye!"));
  }
}
```

### Session Variable Schema

```typescript
// src/cli/loop/optionsSchema.ts

import type { OptionSchema } from "../../lib/types/cli.js";
import { AIProviderName } from "../../lib/types/index.js";

export const textGenerationOptionsSchema: Record<string, OptionSchema> = {
  provider: {
    type: "string",
    description: "The AI provider to use",
    allowedValues: Object.values(AIProviderName).filter((p) => p !== "AUTO"),
  },
  model: {
    type: "string",
    description: "The specific model to use",
  },
  temperature: {
    type: "number",
    description: "Controls randomness (0.0-1.0)",
  },
  maxTokens: {
    type: "number",
    description: "Maximum tokens to generate",
  },
  thinking: {
    type: "boolean",
    description: "Enable extended thinking/reasoning",
  },
  thinkingLevel: {
    type: "string",
    description: "Thinking level: minimal, low, medium, high",
    allowedValues: ["minimal", "low", "medium", "high"],
  },
  system: {
    type: "string",
    description: "System prompt to guide behavior",
  },
};
```

---

## Interactive Features

### Inquirer.js Patterns

```typescript
// src/cli/utils/interactiveSetup.ts

import inquirer from "inquirer";
import chalk from "chalk";
import { logger } from "../../lib/utils/logger.js";

/**
 * Provider selection with visual hierarchy
 */
export async function selectProvider(): Promise<string> {
  const { provider } = await inquirer.prompt([
    {
      type: "list",
      name: "provider",
      message: "Which AI provider would you like to configure?",
      choices: [
        // Recommended options first
        {
          name: `${chalk.green(">")} Google AI Studio ${chalk.gray("- Free tier, fast setup")}`,
          value: "google-ai",
        },
        {
          name: `${chalk.blue(">")} OpenAI ${chalk.gray("- GPT-4, GPT-4o models")}`,
          value: "openai",
        },
        {
          name: `${chalk.magenta(">")} Anthropic ${chalk.gray("- Claude 3.5, Claude 4 models")}`,
          value: "anthropic",
        },

        // Separator for enterprise options
        new inquirer.Separator(chalk.gray("─".repeat(50))),

        {
          name: `${chalk.yellow(">")} AWS Bedrock ${chalk.gray("- Enterprise, multiple models")}`,
          value: "bedrock",
        },
        {
          name: `${chalk.cyan(">")} Google Vertex AI ${chalk.gray("- Enterprise GCP")}`,
          value: "vertex",
        },
        {
          name: `${chalk.blue(">")} Azure OpenAI ${chalk.gray("- Enterprise Azure")}`,
          value: "azure",
        },

        // Separator for local/other
        new inquirer.Separator(chalk.gray("─".repeat(50))),

        {
          name: `${chalk.white(">")} Ollama ${chalk.gray("- Local AI, no API key")}`,
          value: "ollama",
        },
      ],
      pageSize: 10,
    },
  ]);

  return provider;
}

/**
 * Secure API key input with validation
 */
export async function getApiKey(
  providerName: string,
  keyPrefix: string,
): Promise<string> {
  const { apiKey } = await inquirer.prompt([
    {
      type: "password",
      name: "apiKey",
      message: `Enter your ${providerName} API key:`,
      mask: "*",
      validate: (value: string) => {
        if (!value.trim()) {
          return "API key is required";
        }
        if (keyPrefix && !value.startsWith(keyPrefix)) {
          return `Key should start with "${keyPrefix}"`;
        }
        return true;
      },
    },
  ]);

  return apiKey;
}

/**
 * Multi-select for features
 */
export async function selectFeatures(): Promise<string[]> {
  const { features } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "features",
      message: "Select features to enable:",
      choices: [
        { name: "MCP Tool Integration", value: "mcp", checked: true },
        { name: "Conversation Memory", value: "memory", checked: true },
        { name: "Analytics & Telemetry", value: "analytics", checked: false },
        { name: "Evaluation Mode", value: "evaluation", checked: false },
      ],
      validate: (answers: string[]) => {
        return answers.length > 0 || "Select at least one feature";
      },
    },
  ]);

  return features;
}

/**
 * Confirmation with default
 */
export async function confirmAction(
  message: string,
  defaultValue = false,
): Promise<boolean> {
  const { confirmed } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirmed",
      message,
      default: defaultValue,
    },
  ]);

  return confirmed;
}

/**
 * Input with default value
 */
export async function getInput(
  message: string,
  defaultValue?: string,
  validate?: (input: string) => boolean | string,
): Promise<string> {
  const { value } = await inquirer.prompt([
    {
      type: "input",
      name: "value",
      message,
      default: defaultValue,
      validate,
    },
  ]);

  return value;
}
```

### Setup Wizard Example

```typescript
// src/cli/commands/setup.ts

import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { logger } from "../../lib/utils/logger.js";
import {
  selectProvider,
  getApiKey,
  confirmAction,
} from "../utils/interactiveSetup.js";
import { EnvManager } from "../utils/envManager.js";

export async function handleSetup(): Promise<void> {
  logger.always(chalk.bold.blue("\n  NeuroLink Setup Wizard\n"));

  // Display provider comparison
  displayProviderComparison();

  // Select provider
  const provider = await selectProvider();

  // Provider-specific setup
  switch (provider) {
    case "google-ai":
      await setupGoogleAI();
      break;
    case "openai":
      await setupOpenAI();
      break;
    case "anthropic":
      await setupAnthropic();
      break;
    // ... other providers
  }
}

function displayProviderComparison(): void {
  logger.always(chalk.gray("Provider Comparison:\n"));
  logger.always(
    "+-----------------+-------------+------------+-----------------+",
  );
  logger.always(
    "| Provider        | Setup Time  | Cost       | Best For        |",
  );
  logger.always(
    "+-----------------+-------------+------------+-----------------+",
  );
  logger.always(
    "| Google AI       | 2 min       | Free tier  | Quick start     |",
  );
  logger.always(
    "| OpenAI          | 5 min       | Pay-as-go  | General purpose |",
  );
  logger.always(
    "| Anthropic       | 5 min       | Pay-as-go  | Code/reasoning  |",
  );
  logger.always(
    "| AWS Bedrock     | 15 min      | Enterprise | Scale/security  |",
  );
  logger.always(
    "| Ollama          | 10 min      | Free       | Local/privacy   |",
  );
  logger.always(
    "+-----------------+-------------+------------+-----------------+\n",
  );
}

async function setupGoogleAI(): Promise<void> {
  logger.always(chalk.cyan("\nGoogle AI Studio Setup\n"));
  logger.always(chalk.gray("1. Visit: https://aistudio.google.com/apikey"));
  logger.always(chalk.gray("2. Create or select a project"));
  logger.always(chalk.gray("3. Generate an API key\n"));

  const apiKey = await getApiKey("Google AI Studio", "AIza");

  const spinner = ora("Validating API key...").start();

  try {
    // Validate the key
    const isValid = await validateGoogleAIKey(apiKey);

    if (isValid) {
      spinner.succeed("API key validated");

      // Save to .env
      const envManager = new EnvManager();
      await envManager.set("GOOGLE_AI_API_KEY", apiKey);

      logger.always(chalk.green("\nGoogle AI Studio configured successfully!"));
      logger.always(chalk.gray('Try: neurolink generate "Hello, world!"'));
    } else {
      spinner.fail("Invalid API key");
    }
  } catch (error) {
    spinner.fail(`Validation failed: ${(error as Error).message}`);
  }
}
```

---

## Output Formatting

### Chalk Styling Patterns

```typescript
import chalk from "chalk";
import { logger } from "../../lib/utils/logger.js";

// =====================================================
// STATUS INDICATORS
// =====================================================

// Success
logger.always(chalk.green("Success: Operation completed"));
logger.always(chalk.green.bold("SUCCESS"));

// Error
logger.always(chalk.red("Error: Operation failed"));
logger.always(chalk.red.bold("FAILED"));

// Warning
logger.always(chalk.yellow("Warning: Check your configuration"));
logger.always(chalk.yellow.bold("WARNING"));

// Info
logger.always(chalk.blue("Info: Processing request"));
logger.always(chalk.cyan("Hint: Try --help for options"));

// =====================================================
// STYLED OUTPUT
// =====================================================

// Headers
logger.always(chalk.bold.white("\nResults:\n"));
logger.always(chalk.bold.cyan("=== Configuration ==="));

// Secondary text
logger.always(chalk.gray("Additional information here"));
logger.always(chalk.dim("Less important details"));

// Emphasis
logger.always(`Using ${chalk.cyan.bold("GPT-4")} model`);
logger.always(`Provider: ${chalk.magenta("OpenAI")}`);

// =====================================================
// COMBINED PATTERNS
// =====================================================

// Status with context
logger.always(`${chalk.green(">")} Model loaded: ${chalk.cyan(modelName)}`);
logger.always(
  `${chalk.red("x")} Failed to connect: ${chalk.gray(errorMessage)}`,
);

// Progress indication
logger.always(
  `${chalk.blue("[")}${chalk.green("==")}${chalk.gray("==")}${chalk.blue("]")} 50%`,
);

// Table-like output
logger.always(`${chalk.white("Provider:".padEnd(12))} ${chalk.cyan(provider)}`);
logger.always(`${chalk.white("Model:".padEnd(12))} ${chalk.cyan(model)}`);
logger.always(`${chalk.white("Tokens:".padEnd(12))} ${chalk.yellow(tokens)}`);
```

### Ora Spinner Patterns

```typescript
import ora from "ora";
import chalk from "chalk";

// =====================================================
// BASIC SPINNER
// =====================================================

const spinner = ora("Loading...").start();

// Update text
spinner.text = "Still loading...";

// Success
spinner.succeed("Done!");

// Failure
spinner.fail("Operation failed");

// Warning (info level)
spinner.info("Skipped");

// Stop without status
spinner.stop();

// =====================================================
// CONDITIONAL SPINNER (respect quiet mode)
// =====================================================

async function executeWithSpinner(
  argv: { quiet?: boolean },
  message: string,
  operation: () => Promise<void>,
): Promise<void> {
  const spinner = argv.quiet ? null : ora(message).start();

  try {
    await operation();
    if (spinner) spinner.succeed();
  } catch (error) {
    if (spinner) spinner.fail();
    throw error;
  }
}

// =====================================================
// STYLED SPINNER
// =====================================================

const styledSpinner = ora({
  text: "Processing...",
  color: "cyan",
  spinner: "dots", // or: "line", "arc", "bouncingBar"
}).start();

// With prefixed status
styledSpinner.prefixText = chalk.gray("[step 1/3]");
styledSpinner.text = "Downloading models...";

// =====================================================
// PROGRESS UPDATES
// =====================================================

async function processWithProgress(items: string[]): Promise<void> {
  const spinner = ora("Processing...").start();

  for (let i = 0; i < items.length; i++) {
    spinner.text = `Processing item ${i + 1}/${items.length}: ${items[i]}`;
    await processItem(items[i]);
  }

  spinner.succeed(`Processed ${items.length} items`);
}
```

### Table Formatting

```typescript
import chalk from "chalk";
import { logger } from "../../lib/utils/logger.js";

// =====================================================
// SIMPLE TABLE
// =====================================================

function displaySimpleTable(
  data: Array<{ name: string; value: string }>,
): void {
  const maxNameLength = Math.max(...data.map((d) => d.name.length));

  for (const item of data) {
    logger.always(
      `${chalk.white(item.name.padEnd(maxNameLength + 2))}${chalk.cyan(item.value)}`,
    );
  }
}

// =====================================================
// BOXED TABLE
// =====================================================

function displayBoxedTable(
  headers: string[],
  rows: string[][],
  colWidths: number[],
): void {
  const border = colWidths.map((w) => "─".repeat(w + 2)).join("┬");
  const separator = colWidths.map((w) => "─".repeat(w + 2)).join("┼");

  // Top border
  logger.always(`┌${border}┐`);

  // Headers
  const headerRow = headers
    .map((h, i) => ` ${chalk.bold(h.padEnd(colWidths[i]))} `)
    .join("│");
  logger.always(`│${headerRow}│`);

  // Separator
  logger.always(`├${separator}┤`);

  // Data rows
  for (const row of rows) {
    const dataRow = row
      .map((cell, i) => ` ${cell.padEnd(colWidths[i])} `)
      .join("│");
    logger.always(`│${dataRow}│`);
  }

  // Bottom border
  logger.always(`└${border.replace(/┬/g, "┴")}┘`);
}

// Usage
displayBoxedTable(
  ["Provider", "Status", "Models"],
  [
    ["OpenAI", chalk.green("Active"), "15"],
    ["Anthropic", chalk.green("Active"), "6"],
    ["Bedrock", chalk.yellow("Limited"), "12"],
  ],
  [12, 10, 8],
);

// =====================================================
// MODEL LIST DISPLAY
// =====================================================

function displayModelList(models: Model[]): void {
  logger.always(chalk.bold("\nAvailable Models:\n"));

  for (const model of models) {
    const statusBadge = model.deprecated
      ? chalk.red("[DEPRECATED]")
      : chalk.green("[ACTIVE]");

    const costDisplay =
      model.pricing.inputCostPer1K === 0
        ? chalk.green("FREE")
        : chalk.yellow(`$${model.pricing.inputCostPer1K.toFixed(4)}/1K`);

    logger.always(`${chalk.cyan.bold(model.id)} ${statusBadge}`);
    logger.always(
      `  ${chalk.gray("Provider:")} ${model.provider} ${chalk.gray("|")} ` +
        `${chalk.gray("Cost:")} ${costDisplay} ${chalk.gray("|")} ` +
        `${chalk.gray("Context:")} ${(model.limits.maxContextTokens / 1000).toFixed(0)}K`,
    );
    logger.always(`  ${chalk.gray(model.description)}`);
    logger.always();
  }
}
```

---

## Error Handling in CLI

### Centralized Error Handler

```typescript
// src/cli/errorHandler.ts

import chalk from "chalk";
import { logger } from "../lib/utils/logger.js";
import {
  AuthenticationError,
  AuthorizationError,
  NetworkError,
  RateLimitError,
  ValidationError,
  ProviderError,
} from "../lib/types/errors.js";
import { globalSession } from "../lib/session/globalSessionState.js";

/**
 * Handle errors with user-friendly messages and suggestions
 */
export function handleError(error: Error, context: string): void {
  // Log the error with context
  logger.error(chalk.red(`Error: ${context} failed: ${error.message}`));

  // Provide specific suggestions based on error type
  if (error instanceof AuthenticationError) {
    logger.error(chalk.yellow("\nSuggestions:"));
    logger.error(
      chalk.yellow("  - Set GOOGLE_AI_API_KEY for Google AI Studio"),
    );
    logger.error(chalk.yellow("  - Set OPENAI_API_KEY for OpenAI"));
    logger.error(chalk.yellow("  - Set ANTHROPIC_API_KEY for Anthropic"));
    logger.error(
      chalk.yellow("  - Run 'neurolink setup' for guided configuration"),
    );
  } else if (error instanceof RateLimitError) {
    logger.error(chalk.yellow("\nSuggestions:"));
    logger.error(chalk.yellow("  - Wait a few moments and try again"));
    logger.error(chalk.yellow("  - Use --provider to switch providers"));
    logger.error(
      chalk.yellow("  - Check your API quota at the provider dashboard"),
    );
  } else if (error instanceof AuthorizationError) {
    logger.error(chalk.yellow("\nSuggestions:"));
    logger.error(
      chalk.yellow("  - Verify your account has access to this model"),
    );
    logger.error(chalk.yellow("  - Check API key permissions"));
    logger.error(
      chalk.yellow("  - For Bedrock, ensure model access is enabled"),
    );
  } else if (error instanceof NetworkError) {
    logger.error(chalk.yellow("\nSuggestions:"));
    logger.error(chalk.yellow("  - Check your internet connection"));
    logger.error(chalk.yellow("  - Verify the provider's service status"));
    logger.error(chalk.yellow("  - Try again in a few moments"));
  } else if (error instanceof ValidationError) {
    logger.error(chalk.yellow("\nSuggestions:"));
    logger.error(chalk.yellow("  - Check your input parameters"));
    logger.error(chalk.yellow("  - Use --help to see available options"));
  } else if (error instanceof ProviderError) {
    logger.error(chalk.yellow("\nSuggestions:"));
    logger.error(chalk.yellow("  - Try a different provider with --provider"));
    logger.error(chalk.yellow("  - Check if the model is available"));
  }

  // Debug mode: show stack trace
  if (process.env.NEUROLINK_DEBUG === "true") {
    logger.error(chalk.gray("\nStack trace:"));
    logger.error(chalk.gray(error.stack || "No stack trace available"));
  }

  // Session-aware exit behavior
  if (!globalSession.getCurrentSessionId()) {
    // Not in loop mode: exit with error code
    process.exit(1);
  }
  // In loop mode: error is displayed but we don't exit
}
```

### Error Types

```typescript
// src/lib/types/errors.ts

export class NeuroLinkError extends Error {
  constructor(
    message: string,
    public code: string,
    public suggestions?: string[],
  ) {
    super(message);
    this.name = "NeuroLinkError";
  }
}

export class AuthenticationError extends NeuroLinkError {
  constructor(message: string, provider?: string) {
    super(
      message,
      "AUTH_ERROR",
      provider
        ? [`Set the API key for ${provider}`, "Run 'neurolink setup'"]
        : ["Configure your API credentials"],
    );
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends NeuroLinkError {
  constructor(message: string) {
    super(message, "AUTHZ_ERROR", [
      "Check your account permissions",
      "Verify model access is enabled",
    ]);
    this.name = "AuthorizationError";
  }
}

export class RateLimitError extends NeuroLinkError {
  constructor(message: string, retryAfter?: number) {
    super(message, "RATE_LIMIT", [
      retryAfter
        ? `Wait ${retryAfter} seconds before retrying`
        : "Wait a moment and try again",
      "Consider upgrading your API plan",
    ]);
    this.name = "RateLimitError";
  }
}

export class NetworkError extends NeuroLinkError {
  constructor(message: string) {
    super(message, "NETWORK_ERROR", [
      "Check your internet connection",
      "Verify the service is available",
    ]);
    this.name = "NetworkError";
  }
}

export class ValidationError extends NeuroLinkError {
  constructor(message: string, field?: string) {
    super(message, "VALIDATION_ERROR", [
      field ? `Check the value for "${field}"` : "Check your input parameters",
      "Use --help for option details",
    ]);
    this.name = "ValidationError";
  }
}

export class ProviderError extends NeuroLinkError {
  constructor(message: string, provider: string) {
    super(message, "PROVIDER_ERROR", [
      `The ${provider} provider encountered an error`,
      "Try a different provider with --provider",
    ]);
    this.name = "ProviderError";
  }
}
```

### Try-Catch Pattern in Commands

```typescript
private static async executeGenerate(argv: GenerateCommandArgs): Promise<void> {
  const spinner = argv.quiet ? null : ora("Generating...").start();

  try {
    // Validate inputs
    if (!argv.input?.trim()) {
      throw new ValidationError("Input prompt is required", "input");
    }

    // Execute operation
    const sdk = new NeuroLink();
    const result = await sdk.generate({
      prompt: argv.input,
      provider: argv.provider,
      model: argv.model,
      // ...
    });

    // Success
    if (spinner) {
      spinner.succeed(chalk.green("Generated successfully"));
    }

    this.handleOutput(result, argv);

  } catch (error) {
    // Handle spinner state
    if (spinner) {
      spinner.fail(chalk.red("Generation failed"));
    }

    // Delegate to error handler
    handleError(error as Error, "Generate");
  }
}
```

---

## Command Templates

### Basic Command Template

```typescript
// src/cli/commands/my-feature.ts

import type { CommandModule, Argv } from "yargs";
import chalk from "chalk";
import ora from "ora";
import { logger } from "../../lib/utils/logger.js";
import { handleError } from "../errorHandler.js";
import type { BaseCommandArgs } from "../../lib/types/cli.js";

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export type MyFeatureCommandArgs = BaseCommandArgs & {
  subcommand?: string;
  option1?: string;
  flag1?: boolean;
  items?: string[];
};

// =====================================================
// COMMAND FACTORY
// =====================================================

export class MyFeatureCommandFactory {
  /**
   * Create the main command with subcommands
   */
  static createMyFeatureCommands(): CommandModule {
    return {
      command: "my-feature <subcommand>",
      describe: "Description of the command group",
      builder: (yargs) => {
        return (
          yargs
            // Subcommands
            .command(
              "action1",
              "Perform action 1",
              (y) => this.buildAction1Options(y),
              (argv) => this.executeAction1(argv as MyFeatureCommandArgs),
            )
            .command(
              "action2 <required-arg>",
              "Perform action 2 with required argument",
              (y) => this.buildAction2Options(y),
              (argv) => this.executeAction2(argv as MyFeatureCommandArgs),
            )
            // Global options for all subcommands
            .option("format", {
              choices: ["table", "json", "compact"] as const,
              default: "table",
              description: "Output format",
            })
            .option("quiet", {
              type: "boolean",
              alias: "q",
              default: false,
              description: "Suppress non-essential output",
            })
            .demandCommand(1, "Please specify a subcommand")
            .help()
        );
      },
      handler: () => {},
    };
  }

  // =====================================================
  // OPTION BUILDERS
  // =====================================================

  private static buildAction1Options(yargs: Argv): Argv {
    return yargs
      .option("option1", {
        type: "string",
        description: "Description of option1",
        alias: "o",
      })
      .option("flag1", {
        type: "boolean",
        default: false,
        description: "Enable feature flag",
        alias: "f",
      })
      .example("neurolink my-feature action1", "Basic usage")
      .example("neurolink my-feature action1 -o value -f", "With options");
  }

  private static buildAction2Options(yargs: Argv): Argv {
    return yargs
      .positional("required-arg", {
        type: "string",
        description: "Required argument",
        demandOption: true,
      })
      .option("items", {
        type: "array",
        description: "Multiple items (can repeat)",
        alias: "i",
      })
      .example("neurolink my-feature action2 myvalue", "Basic")
      .example("neurolink my-feature action2 myvalue -i a -i b", "With items");
  }

  // =====================================================
  // EXECUTION HANDLERS
  // =====================================================

  private static async executeAction1(
    argv: MyFeatureCommandArgs,
  ): Promise<void> {
    const spinner = argv.quiet ? null : ora("Processing...").start();

    try {
      // Implementation
      const result = await doAction1(argv.option1, argv.flag1);

      if (spinner) {
        spinner.succeed("Action completed");
      }

      // Output based on format
      if (argv.format === "json") {
        logger.always(JSON.stringify(result, null, 2));
      } else {
        this.displayResult(result);
      }
    } catch (error) {
      if (spinner) spinner.fail("Action failed");
      handleError(error as Error, "Action1");
    }
  }

  private static async executeAction2(
    argv: MyFeatureCommandArgs,
  ): Promise<void> {
    const spinner = argv.quiet ? null : ora("Processing...").start();

    try {
      const requiredArg = argv["required-arg"] as string;
      const items = argv.items || [];

      // Implementation
      const result = await doAction2(requiredArg, items);

      if (spinner) {
        spinner.succeed(`Processed ${items.length} items`);
      }

      this.displayResult(result);
    } catch (error) {
      if (spinner) spinner.fail("Action failed");
      handleError(error as Error, "Action2");
    }
  }

  // =====================================================
  // DISPLAY HELPERS
  // =====================================================

  private static displayResult(result: unknown): void {
    logger.always(chalk.bold.cyan("\nResults:\n"));
    // Custom display logic
    logger.always(JSON.stringify(result, null, 2));
  }
}
```

### Registering the Command

```typescript
// In src/cli/parser.ts

import { MyFeatureCommandFactory } from "./commands/my-feature.js";

export function initializeCliParser() {
  return (
    yargs(hideBin(process.argv))
      // ... existing setup
      .command(MyFeatureCommandFactory.createMyFeatureCommands())
  );
  // ... rest of configuration
}
```

---

## Multimodal CLI Support

### Flag Definitions

```typescript
// In CLICommandFactory.commonOptions

private static readonly commonOptions = {
  // ... other options

  // Image support
  image: {
    type: "string" as const,
    description: "Add image file for multimodal analysis (can be used multiple times)",
    alias: "i",
  },

  // CSV support
  csv: {
    type: "string" as const,
    description: "Add CSV file for data analysis (can be used multiple times)",
    alias: "c",
  },
  csvMaxRows: {
    type: "number" as const,
    default: 1000,
    description: "Maximum number of CSV rows to process",
  },
  csvFormat: {
    type: "string" as const,
    choices: ["raw", "markdown", "json"],
    default: "raw",
    description: "CSV output format",
  },

  // PDF support
  pdf: {
    type: "string" as const,
    description: "Add PDF file for analysis (can be used multiple times)",
  },

  // Video support
  video: {
    type: "string" as const,
    description: "Add video file for analysis (MP4, WebM, MOV, AVI, MKV)",
  },
  "video-frames": {
    type: "number" as const,
    default: 8,
    description: "Number of frames to extract (default: 8)",
  },
  "video-quality": {
    type: "number" as const,
    default: 85,
    description: "Frame quality 0-100 (default: 85)",
  },

  // Auto-detect support
  file: {
    type: "string" as const,
    description: "Add file with auto-detection (can be used multiple times)",
  },
};
```

### File Processing Helpers

```typescript
// src/cli/factories/commandFactory.ts

import { resolveFilePaths } from "../utils/pathResolver.js";

export class CLICommandFactory {
  // =====================================================
  // FILE PROCESSING HELPERS
  // =====================================================

  /**
   * Process CLI image files
   * Handles both single files and arrays, resolves relative paths
   */
  private static processCliImages(
    images?: string | string[],
  ): Array<Buffer | string> | undefined {
    if (!images) return undefined;

    const imagePaths = Array.isArray(images) ? images : [images];
    return resolveFilePaths(imagePaths);
  }

  /**
   * Process CLI CSV files
   */
  private static processCliCSVFiles(
    csvFiles?: string | string[],
  ): Array<Buffer | string> | undefined {
    if (!csvFiles) return undefined;

    const paths = Array.isArray(csvFiles) ? csvFiles : [csvFiles];
    return resolveFilePaths(paths);
  }

  /**
   * Process CLI PDF files
   */
  private static processCliPDFFiles(
    pdfFiles?: string | string[],
  ): Array<Buffer | string> | undefined {
    if (!pdfFiles) return undefined;

    const paths = Array.isArray(pdfFiles) ? pdfFiles : [pdfFiles];
    return resolveFilePaths(paths);
  }

  /**
   * Process CLI video files
   */
  private static processCliVideoFiles(
    videoFiles?: string | string[],
  ): Array<Buffer | string> | undefined {
    if (!videoFiles) return undefined;

    const paths = Array.isArray(videoFiles) ? videoFiles : [videoFiles];
    return resolveFilePaths(paths);
  }

  /**
   * Process CLI files with auto-detection
   */
  private static processCliFiles(
    files?: string | string[],
  ): Array<Buffer | string> | undefined {
    if (!files) return undefined;

    const paths = Array.isArray(files) ? files : [files];
    return resolveFilePaths(paths);
  }
}
```

### Path Resolution Utility

```typescript
// src/cli/utils/pathResolver.ts

import path from "path";

/**
 * Check if a string is a URL or data URI
 */
function isURL(str: string): boolean {
  const lower = str.toLowerCase();
  return (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("file://") ||
    lower.startsWith("data:")
  );
}

/**
 * Resolve a file path to an absolute path
 * - URLs are returned unchanged
 * - Relative paths resolved against cwd
 * - Absolute paths returned unchanged
 */
export function resolveFilePath(filePath: string): string {
  if (!filePath || !filePath.trim()) return "";
  if (isURL(filePath)) return filePath;
  return path.resolve(process.cwd(), filePath);
}

/**
 * Resolve multiple file paths
 */
export function resolveFilePaths(filePaths: string[]): string[] {
  return filePaths.map(resolveFilePath);
}
```

### Multimodal Command Execution

```typescript
private static async executeGenerate(argv: GenerateCommandArgs): Promise<void> {
  const spinner = argv.quiet ? null : ora("Generating...").start();

  try {
    const sdk = new NeuroLink();

    // Build options with multimodal content
    const options: GenerateOptions = {
      prompt: argv.input as string,
      provider: argv.provider,
      model: argv.model,
      temperature: argv.temperature,
      maxTokens: argv.maxTokens,
      system: argv.system,

      // Process multimodal inputs
      images: this.processCliImages(argv.image),
      csvFiles: this.processCliCSVFiles(argv.csv),
      pdfFiles: this.processCliPDFFiles(argv.pdf),
      videoFiles: this.processCliVideoFiles(argv.video),
      files: this.processCliFiles(argv.file),

      // File processing options
      csvOptions: {
        maxRows: argv.csvMaxRows,
        format: argv.csvFormat,
      },
      videoOptions: {
        frameCount: argv["video-frames"],
        quality: argv["video-quality"],
        format: argv["video-format"],
      },
    };

    // Update spinner with context
    if (spinner) {
      const fileTypes: string[] = [];
      if (options.images?.length) fileTypes.push(`${options.images.length} image(s)`);
      if (options.csvFiles?.length) fileTypes.push(`${options.csvFiles.length} CSV(s)`);
      if (options.pdfFiles?.length) fileTypes.push(`${options.pdfFiles.length} PDF(s)`);
      if (options.videoFiles?.length) fileTypes.push(`${options.videoFiles.length} video(s)`);

      if (fileTypes.length > 0) {
        spinner.text = `Processing ${fileTypes.join(", ")}...`;
      }
    }

    const result = await sdk.generate(options);

    if (spinner) {
      spinner.succeed(chalk.green("Generated successfully"));
    }

    this.handleOutput(result, argv);

  } catch (error) {
    if (spinner) spinner.fail(chalk.red("Generation failed"));
    handleError(error as Error, "Generate");
  }
}
```

### Usage Examples

```bash
# Image analysis
neurolink generate "Describe this image" --image photo.jpg
neurolink generate "Compare these" -i img1.png -i img2.jpg
neurolink generate "Analyze" --image https://example.com/image.png

# CSV analysis
neurolink generate "Summarize this data" --csv data.csv
neurolink generate "Find trends" -c sales.csv -c inventory.csv
neurolink generate "Top 100 rows" --csv large.csv --csvMaxRows 100

# PDF analysis
neurolink generate "Summarize this document" --pdf report.pdf
neurolink generate "Extract key points" --pdf doc1.pdf --pdf doc2.pdf

# Video analysis
neurolink generate "Describe this video" --video clip.mp4
neurolink generate "Analyze" --video video.mp4 --video-frames 16 --video-quality 90

# Auto-detection
neurolink generate "Analyze these files" --file data.csv --file chart.png

# Combined multimodal
neurolink generate "Analyze the report and chart" \
  --pdf report.pdf \
  --image chart.png \
  --csv data.csv
```

---

## Best Practices Summary

### 1. Use Factory Pattern from Day One

```typescript
// DO: Centralized factory with shared options
export class CLICommandFactory {
  private static readonly commonOptions = { /* ... */ };
  private static buildOptions(yargs, additional = {}) { /* ... */ }
  static createGenerateCommand() { /* ... */ }
  static createStreamCommand() { /* ... */ }
}

// DON'T: Duplicate options across commands
yargs.command("generate", ..., (y) => y.option("provider", {...}).option("model", {...}))
yargs.command("stream", ..., (y) => y.option("provider", {...}).option("model", {...}))
```

### 2. Session-Aware Error Handling

```typescript
// DO: Check session state before exiting
export function handleError(error: Error, context: string): void {
  logger.error(`Error: ${error.message}`);

  if (!globalSession.getCurrentSessionId()) {
    process.exit(1); // Only exit if not in loop mode
  }
}

// DON'T: Always exit on error
export function handleError(error: Error): void {
  console.error(error.message);
  process.exit(1); // This breaks loop mode!
}
```

### 3. Respect Quiet Mode

```typescript
// DO: Conditional spinners and output
const spinner = argv.quiet ? null : ora("Loading...").start();
if (spinner) spinner.succeed("Done");
if (!argv.quiet) logger.info("Additional info...");

// DON'T: Always show output
const spinner = ora("Loading...").start(); // Always shows
console.log("Processing..."); // Always logs
```

### 4. Provide Helpful Examples

```typescript
// DO: Multiple realistic examples
.example('$0 generate "Hello"', "Basic usage")
.example('$0 generate "Code review" --provider openai -m gpt-4', "Specific model")
.example('$0 generate "Analyze" --image chart.png --csv data.csv', "Multimodal")

// DON'T: Single or unrealistic examples
.example('$0 generate "test"', "Example")
```

### 5. Type-Safe Command Arguments

```typescript
// DO: Define specific types for each command
export type GenerateCommandArgs = BaseCommandArgs & {
  input?: string;
  provider?: string;
  model?: string;
  image?: string | string[];
  // ...
};

handler: async (argv) => {
  await this.executeGenerate(argv as GenerateCommandArgs);
};

// DON'T: Use any or untyped arguments
handler: async (argv: any) => {
  /* ... */
};
```

### 6. Consistent Output Formatting

```typescript
// DO: Support multiple formats consistently
if (argv.format === "json") {
  logger.always(JSON.stringify(result, null, 2));
} else if (argv.format === "table") {
  this.displayTable(result);
} else {
  this.displayText(result);
}

// Handle file output
if (argv.output) {
  fs.writeFileSync(argv.output, formatted);
  if (!argv.quiet) logger.always(`Saved to ${argv.output}`);
}
```

### 7. Professional UX from Start

```typescript
// DO: Use spinners, colors, and clear messages
const spinner = ora("Generating content...").start();
spinner.succeed(chalk.green("Content generated successfully!"));
logger.always(chalk.cyan(`Model: ${model}`));

// DON'T: Plain console output
console.log("Generating...");
console.log("Done");
console.log("Model: " + model);
```

### 8. Path Resolution for Files

```typescript
// DO: Resolve relative paths and preserve URLs
export function resolveFilePath(filePath: string): string {
  if (isURL(filePath)) return filePath;
  return path.resolve(process.cwd(), filePath);
}

// DON'T: Assume paths are absolute
const content = fs.readFileSync(filePath); // Fails for relative paths
```

---

## References

### Key Files

| File                                  | Purpose              |
| ------------------------------------- | -------------------- |
| `src/cli/index.ts`                    | CLI entry point      |
| `src/cli/parser.ts`                   | Yargs initialization |
| `src/cli/factories/commandFactory.ts` | Main command factory |
| `src/cli/errorHandler.ts`             | Error handling       |
| `src/cli/loop/session.ts`             | Loop mode session    |
| `src/cli/loop/optionsSchema.ts`       | Session variables    |
| `src/cli/utils/pathResolver.ts`       | File path resolution |

### CLI Evolution Commits

| Commit    | Achievement                          |
| --------- | ------------------------------------ |
| `9991edb` | Initial CLI (380 lines, 5 commands)  |
| `66ad664` | Factory pattern (80% code reduction) |
| `89b5012` | Interactive loop mode                |
| `678b61b` | Multimodal support                   |
| `7aeb1d7` | Stream as default                    |

### Technology Stack

- **yargs**: Command parsing and help generation
- **ora**: Animated spinners
- **chalk**: Colored terminal output
- **inquirer**: Interactive prompts
- **readline**: Command history in loop mode
