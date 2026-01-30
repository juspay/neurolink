# NeuroLink CLI Architecture Patterns

This document provides a comprehensive analysis of NeuroLink's CLI implementation patterns, serving as a reference guide for implementing new commands and maintaining consistency across the CLI codebase.

## Table of Contents

1. [Overview](#overview)
2. [CLI Architecture](#cli-architecture)
3. [Directory Structure](#directory-structure)
4. [Command Factory Pattern](#command-factory-pattern)
5. [Yargs Integration Patterns](#yargs-integration-patterns)
6. [Option Definition Patterns](#option-definition-patterns)
7. [Output Formatting Patterns](#output-formatting-patterns)
8. [Error Handling Patterns](#error-handling-patterns)
9. [Loop Mode and Session Management](#loop-mode-and-session-management)
10. [Interactive Prompts Pattern](#interactive-prompts-pattern)
11. [Configuration Management](#configuration-management)
12. [Command Implementation Template](#command-implementation-template)
13. [Best Practices](#best-practices)
14. [Common Utilities](#common-utilities)

---

## Overview

NeuroLink's CLI is a professional command-line interface built on top of `yargs` that provides unified access to the NeuroLink SDK. It features:

- **Factory Pattern**: Centralized command creation via `CLICommandFactory`
- **Modular Architecture**: Separate factories for different command groups
- **Interactive Mode**: REPL-style loop session with conversation memory
- **Rich UX**: Spinners, colored output, progress indicators
- **Type Safety**: Comprehensive TypeScript types for all command arguments

### Key Design Principles

1. **Separation of Concerns**: CLI layer is distinct from SDK business logic
2. **Consistent UX**: Unified option patterns and output formatting across all commands
3. **Graceful Degradation**: Commands handle errors without crashing the process
4. **Session Awareness**: Loop mode supports continuous interaction

---

## CLI Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLI Entry Point                          │
│                      src/cli/index.ts                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         CLI Parser                               │
│                      src/cli/parser.ts                           │
│   - Initializes yargs with middleware                            │
│   - Registers all command modules                                │
│   - Handles global options and error handling                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│    CLICommandFactory    │   │   SetupCommandFactory   │
│  (Main command factory) │   │  (Setup-specific cmds)  │
└─────────────────────────┘   └─────────────────────────┘
              │
              ├── createGenerateCommand()
              ├── createStreamCommand()
              ├── createBatchCommand()
              ├── createProviderCommands()
              ├── createModelsCommands()  → ModelsCommandFactory
              ├── createMCPCommands()     → MCPCommandFactory
              ├── createOllamaCommands()  → OllamaCommandFactory
              ├── createSageMakerCommands() → SageMakerCommandFactory
              ├── createConfigCommands()
              ├── createMemoryCommands()
              └── createLoopCommand()
```

### Component Responsibilities

| Component         | Location                              | Responsibility                                   |
| ----------------- | ------------------------------------- | ------------------------------------------------ |
| Entry Point       | `src/cli/index.ts`                    | Bootstrap, environment setup, cleanup            |
| Parser            | `src/cli/parser.ts`                   | Yargs initialization, middleware, error handling |
| CLICommandFactory | `src/cli/factories/commandFactory.ts` | Main command creation                            |
| ErrorHandler      | `src/cli/errorHandler.ts`             | Consistent error display                         |
| LoopSession       | `src/cli/loop/session.ts`             | Interactive mode management                      |
| ConfigManager     | `src/cli/commands/config.ts`          | Configuration persistence                        |

---

## Directory Structure

```
src/cli/
├── index.ts                    # CLI entry point with signal handling
├── parser.ts                   # Yargs parser initialization
├── errorHandler.ts             # Centralized error handling
│
├── factories/                  # Command factory classes
│   ├── commandFactory.ts       # Main CLICommandFactory
│   ├── setupCommandFactory.ts  # Setup-specific commands
│   ├── ollamaCommandFactory.ts # Ollama commands
│   └── sagemakerCommandFactory.ts # SageMaker commands
│
├── commands/                   # Individual command implementations
│   ├── config.ts              # Config management + ConfigManager class
│   ├── mcp.ts                 # MCPCommandFactory
│   ├── models.ts              # ModelsCommandFactory
│   ├── ollama.ts              # Ollama utilities
│   ├── setup.ts               # Main setup wizard
│   ├── setup-openai.ts        # OpenAI setup handler
│   ├── setup-anthropic.ts     # Anthropic setup handler
│   ├── setup-google-ai.ts     # Google AI setup handler
│   ├── setup-azure.ts         # Azure setup handler
│   ├── setup-bedrock.ts       # AWS Bedrock setup handler
│   ├── setup-gcp.ts           # GCP/Vertex setup handler
│   ├── setup-huggingface.ts   # Hugging Face setup handler
│   └── setup-mistral.ts       # Mistral setup handler
│
├── loop/                       # Interactive loop mode
│   ├── session.ts             # LoopSession class
│   ├── optionsSchema.ts       # Session variable definitions
│   └── conversationSelector.ts # Conversation picker UI
│
└── utils/                      # CLI utilities
    ├── pathResolver.ts         # File path resolution
    ├── audioFileUtils.ts       # TTS audio file handling
    ├── videoFileUtils.ts       # Video file handling
    ├── envManager.ts           # Environment file management
    ├── ollamaUtils.ts          # Ollama-specific utilities
    ├── interactiveSetup.ts     # Interactive setup wizard
    └── completeSetup.ts        # Setup completion utilities
```

---

## Command Factory Pattern

### Main Factory Class

The `CLICommandFactory` is the central hub for creating yargs command modules.

**Location**: `/src/cli/factories/commandFactory.ts`

```typescript
export class CLICommandFactory {
  // Centralized option definitions
  private static readonly commonOptions = {
    provider: {
      choices: ["auto", "openai", "anthropic", "bedrock", ...],
      default: "auto",
      description: "AI provider to use (auto-selects best available)",
      alias: "p",
    },
    model: {
      type: "string" as const,
      description: "Specific model to use",
      alias: "m",
    },
    temperature: {
      type: "number" as const,
      default: 0.7,
      description: "Creativity level (0.0 = focused, 1.0 = creative)",
      alias: "t",
    },
    // ... more common options
  };

  // Helper method to build options for commands
  private static buildOptions(yargs: Argv, additionalOptions = {}) {
    return yargs.options({
      ...this.commonOptions,
      ...additionalOptions,
    });
  }

  // Command creation methods
  static createGenerateCommand(): CommandModule {
    return {
      command: ["generate <input>", "gen <input>"],
      describe: "Generate content using AI providers",
      builder: (yargs) => {
        return this.buildOptions(
          yargs
            .positional("input", {
              type: "string" as const,
              description: "Text prompt for AI generation",
            })
            .example('$0 generate "Explain quantum computing"', "Basic generation")
            .example('$0 gen "Write code" --provider openai', "Use specific provider"),
        );
      },
      handler: async (argv) => await this.executeGenerate(argv as GenerateCommandArgs),
    };
  }
}
```

### Factory Method Pattern

Each command group follows the factory method pattern:

```typescript
// Pattern: Create a CommandModule that returns a yargs command configuration
static createXxxCommand(): CommandModule {
  return {
    command: "xxx <subcommand>",          // Command signature with positional args
    describe: "Short description",         // Shown in help
    builder: (yargs) => {                  // Configure subcommands and options
      return yargs
        .command("subcommand1", "description", builderFn, handlerFn)
        .command("subcommand2", "description", builderFn, handlerFn)
        .demandCommand(1, "Please specify a subcommand");
    },
    handler: () => {},                     // No-op for parent commands
  };
}
```

### Specialized Command Factories

For complex command groups, use dedicated factory classes:

```typescript
// src/cli/commands/models.ts
export class ModelsCommandFactory {
  static createModelsCommands(): CommandModule {
    return {
      command: "models <subcommand>",
      describe: "Manage and discover AI models",
      builder: (yargs) => {
        return yargs
          .command(
            "list",
            "List available models",
            this.buildListOptions,
            this.executeList,
          )
          .command(
            "search [query]",
            "Search models",
            this.buildSearchOptions,
            this.executeSearch,
          )
          .command(
            "best",
            "Get best model recommendation",
            this.buildBestOptions,
            this.executeBest,
          )
          .demandCommand(1, "Please specify a models subcommand");
      },
      handler: () => {},
    };
  }

  private static buildListOptions(yargs: Argv): Argv {
    return yargs
      .option("provider", {
        choices: getAvailableProviders(),
        description: "Filter by provider",
      })
      .option("category", {
        choices: ["general", "coding", "creative"],
        description: "Filter by category",
      })
      .example("neurolink models list", "List all models")
      .example(
        "neurolink models list --provider openai",
        "List OpenAI models only",
      );
  }

  private static async executeList(argv: ModelsCommandArgs): Promise<void> {
    // Implementation
  }
}
```

---

## Yargs Integration Patterns

### Parser Initialization

**Location**: `/src/cli/parser.ts`

```typescript
export function initializeCliParser() {
  return (
    yargs(hideBin(process.argv))
      .scriptName("neurolink") // CLI name
      .usage("Usage: $0 <command> [options]") // Usage string
      .version(packageJson.version) // Version from package.json
      .help()
      .alias("h", "help")
      .alias("V", "version")
      .strictOptions() // Reject unknown options
      .strictCommands() // Reject unknown commands
      .demandCommand(1, "") // Require at least one command
      .recommendCommands() // Suggest similar commands on typo
      .epilogue("For more info: https://github.com/juspay/neurolink")
      .showHelpOnFail(true, "Specify --help for available options")

      // Global middleware for all commands
      .middleware((argv) => {
        // Handle no-color option globally
        if (argv.noColor || process.env.NO_COLOR || !process.stdout.isTTY) {
          process.env.FORCE_COLOR = "0";
        }

        // Control SDK logging based on debug flag
        process.env.NEUROLINK_DEBUG = argv.debug ? "true" : "false";
      })

      // Custom error handler
      .fail((msg, err, yargsInstance) => {
        // Handle errors gracefully
        // Don't exit if in loop mode
        if (globalSession.getCurrentSessionId()) {
          handleError(err || new Error(msg), "CLI Error");
          return;
        }

        // Show help for parsing errors
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
  );
  // ... more commands
}
```

### Command Structure

```typescript
// Standard command structure
const command: CommandModule = {
  // Command signature - supports aliases and positional args
  command: ["generate <input>", "gen <input>"],

  // Short description for help text
  describe: "Generate content using AI providers",

  // Configure options and examples
  builder: (yargs: Argv) => {
    return (
      yargs
        // Positional arguments
        .positional("input", {
          type: "string",
          description: "Text prompt for AI generation",
          demandOption: true, // Mark as required
        })

        // Options (flags)
        .option("provider", {
          type: "string",
          choices: ["openai", "anthropic", "bedrock"],
          default: "auto",
          alias: "p",
          description: "AI provider to use",
        })

        // Boolean options
        .option("debug", {
          type: "boolean",
          default: false,
          alias: ["v", "verbose"],
          description: "Enable debug output",
        })

        // Examples
        .example('$0 generate "Hello"', "Basic usage")
        .example('$0 gen "Code review" -p openai', "With provider")
    );
  },

  // Command handler - receives parsed arguments
  handler: async (argv) => {
    await executeGenerate(argv as GenerateCommandArgs);
  },
};
```

### Subcommand Pattern

```typescript
// Parent command with subcommands
static createProviderCommands(): CommandModule {
  return {
    command: "provider <subcommand>",
    describe: "Manage AI provider configurations",
    builder: (yargs) => {
      return yargs
        // Subcommand with its own builder and handler
        .command(
          "status",                                    // Subcommand name
          "Check status of configured providers",     // Description
          (y) => this.buildOptions(y)                 // Builder function
            .example("$0 provider status", "Check all providers")
            .example("$0 provider status --verbose", "Detailed output"),
          (argv) => this.executeProviderStatus(argv)  // Handler function
        )
        .command(
          "list",
          "List all available providers",
          (y) => this.buildOptions(y),
          (argv) => this.executeProviderList(argv)
        )
        .demandCommand(1, "Please specify a provider subcommand");
    },
    handler: () => {},  // No-op - subcommands handle execution
  };
}
```

---

## Option Definition Patterns

### Common Options Object

All commands share a base set of options defined in `CLICommandFactory.commonOptions`:

```typescript
private static readonly commonOptions = {
  // Core generation options
  provider: {
    choices: ["auto", "openai", "anthropic", "bedrock", "vertex", "google-ai", ...],
    default: "auto",
    description: "AI provider to use (auto-selects best available)",
    alias: "p",
  },
  model: {
    type: "string" as const,
    description: "Specific model to use (e.g. gpt-4o, claude-3-sonnet)",
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
    choices: ["text", "json", "table"],
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
```

### Option Type Definitions

**Location**: `/src/lib/types/cli.ts`

```typescript
// Base arguments available on all commands
export type BaseCommandArgs = {
  debug?: boolean;
  format?: "text" | "json" | "table" | "yaml";
  verbose?: boolean;
  quiet?: boolean;
  [key: string]: unknown; // Allow additional properties
};

// Command-specific argument types extend the base
export type GenerateCommandArgs = BaseCommandArgs & {
  input?: string;
  provider?: string;
  model?: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  analytics?: boolean;
  evaluation?: boolean;
  context?: string;
  disableTools?: boolean;
  thinking?: boolean;
  thinkingBudget?: number;
  thinkingLevel?: "minimal" | "low" | "medium" | "high";
  region?: string;
  // Video generation options
  outputMode?: "text" | "video";
  videoOutput?: string;
  videoResolution?: "720p" | "1080p";
};

export type MCPCommandArgs = BaseCommandArgs & {
  server?: string;
  tool?: string;
  params?: string;
  transport?: "stdio" | "websocket" | "tcp";
  force?: boolean;
  autoInstall?: boolean;
};
```

### Session Variable Schema

For loop mode, options have a schema for validation:

```typescript
// src/cli/loop/optionsSchema.ts
export const textGenerationOptionsSchema: Record<string, OptionSchema> = {
  provider: {
    type: "string",
    description: "The AI provider to use.",
    allowedValues: Object.values(AIProviderName).filter((p) => p !== "AUTO"),
  },
  model: {
    type: "string",
    description: "The specific model to use from the provider.",
  },
  temperature: {
    type: "number",
    description: "Controls randomness of the output (e.g., 0.2, 0.8).",
  },
  thinking: {
    type: "boolean",
    description: "Enable extended thinking/reasoning capability.",
  },
  thinkingLevel: {
    type: "string",
    description: "Thinking level for Gemini 3 models.",
    allowedValues: ["minimal", "low", "medium", "high"],
  },
};
```

---

## Output Formatting Patterns

### Standard Output Helper

```typescript
private static handleOutput(
  result: GenerateResult | unknown,
  options: BaseCommandArgs & Record<string, unknown>,
) {
  let output: string;

  // JSON format - structured output
  if (options.format === "json") {
    output = JSON.stringify(result, null, 2);
  }
  // Table format - for arrays
  else if (options.format === "table" && Array.isArray(result)) {
    logger.table(result);
    return;
  }
  // Text format - human readable
  else {
    if (typeof result === "string") {
      output = result;
    } else if (result && typeof result === "object" && "content" in result) {
      output = (result as GenerateResult).content;

      // Add analytics display when enabled
      if (options.enableAnalytics && (result as GenerateResult).analytics) {
        output += this.formatAnalyticsForTextMode(result as GenerateResult);
      }
    } else {
      output = JSON.stringify(result);
    }
  }

  // Handle file output
  if (options.output) {
    fs.writeFileSync(options.output as string, output);
    if (!options.quiet) {
      logger.always(`Output saved to ${options.output}`);
    }
  } else {
    logger.always(output);
  }
}
```

### Using Chalk for Colored Output

```typescript
import chalk from "chalk";

// Status indicators
logger.always(chalk.green("✅ Operation successful"));
logger.always(chalk.red("❌ Operation failed"));
logger.always(chalk.yellow("⚠️  Warning message"));
logger.always(chalk.blue("ℹ️  Information"));

// Styled output
logger.always(chalk.bold("Important message"));
logger.always(chalk.gray("Secondary information"));
logger.always(chalk.cyan(`Provider: ${providerName}`));

// Nested styling
logger.always(
  `${chalk.green("✅")} ${chalk.cyan(modelId)} (${chalk.gray(provider)})`,
);
```

### Using Ora for Spinners

```typescript
import ora from "ora";

// Basic spinner
const spinner = ora("Loading...").start();
// ... do work
spinner.succeed("Done!"); // or spinner.fail("Failed")

// Conditional spinner (respect quiet mode)
const spinner = argv.quiet ? null : ora("Processing...").start();
if (spinner) {
  spinner.text = `Processing item ${index}...`;
  spinner.succeed(`Completed ${count} items`);
}

// Spinner with status updates
const spinner = ora({
  text: "Generating content...",
  color: "cyan",
}).start();

try {
  const result = await sdk.generate(options);
  spinner.succeed(chalk.green("✅ Content generated successfully!"));
} catch (error) {
  spinner.fail(chalk.red("❌ Generation failed"));
  throw error;
}
```

### Table Output Format

```typescript
// Simple table format for command results
logger.always(chalk.bold("\n📋 Available Models:\n"));

for (const model of models) {
  const status = model.deprecated
    ? chalk.red("DEPRECATED")
    : chalk.green("ACTIVE");
  const cost =
    model.pricing.inputCostPer1K === 0
      ? chalk.green("FREE")
      : `$${model.pricing.inputCostPer1K.toFixed(6)}/1K`;

  logger.always(`${chalk.cyan(model.id)} ${status}`);
  logger.always(`  Provider: ${model.provider} | Category: ${model.category}`);
  logger.always(
    `  Cost: ${cost} | Context: ${(model.limits.maxContextTokens / 1000).toFixed(0)}K tokens`,
  );
  logger.always(`  ${chalk.gray(model.description)}`);
  logger.always();
}
```

### ASCII Tables and Boxes

```typescript
// Box drawing for welcome screens
logger.always(
  chalk.blue("╭─────────────────────────────────────────────────────────────╮"),
);
logger.always(
  chalk.blue("│                                                             │"),
);
logger.always(
  chalk.blue("│  ") +
    chalk.bold.white("Welcome to NeuroLink") +
    chalk.blue("                                    │"),
);
logger.always(
  chalk.blue("│                                                             │"),
);
logger.always(
  chalk.blue("╰─────────────────────────────────────────────────────────────╯"),
);

// Data tables
logger.always(
  "┌─────────────────┬──────────────┬─────────────┬─────────────────┐",
);
logger.always(
  "│ Provider        │ Setup Time   │ Cost        │ Best For        │",
);
logger.always(
  "├─────────────────┼──────────────┼─────────────┼─────────────────┤",
);
for (const provider of providers) {
  logger.always(
    `│ ${provider.name.padEnd(15)} │ ${provider.time.padEnd(12)} │ ${provider.cost.padEnd(11)} │ ${provider.bestFor.padEnd(15)} │`,
  );
}
logger.always(
  "└─────────────────┴──────────────┴─────────────┴─────────────────┘",
);
```

---

## Error Handling Patterns

### Centralized Error Handler

**Location**: `/src/cli/errorHandler.ts`

```typescript
import chalk from "chalk";
import { logger } from "../lib/utils/logger.js";
import {
  AuthenticationError,
  AuthorizationError,
  NetworkError,
  RateLimitError,
} from "../lib/types/errors.js";
import { globalSession } from "../lib/session/globalSessionState.js";

export function handleError(error: Error, context: string): void {
  // Log the error with context
  logger.error(chalk.red(`❌ ${context} failed: ${error.message}`));

  // Provide helpful suggestions based on error type
  if (error instanceof AuthenticationError) {
    logger.error(
      chalk.yellow(
        "💡 Set Google AI Studio API key: export GOOGLE_AI_API_KEY=AIza-...",
      ),
    );
    logger.error(
      chalk.yellow("💡 Or set OpenAI API key: export OPENAI_API_KEY=sk-..."),
    );
    // ... more provider suggestions
  } else if (error instanceof RateLimitError) {
    logger.error(
      chalk.yellow("💡 Try again in a few moments or use --provider vertex"),
    );
  } else if (error instanceof AuthorizationError) {
    logger.error(
      chalk.yellow(
        "💡 Check your account permissions for the selected model/service.",
      ),
    );
  } else if (error instanceof NetworkError) {
    logger.error(
      chalk.yellow(
        "💡 Check your internet connection and the provider's status page.",
      ),
    );
  }

  // Exit only if not in loop mode
  if (!globalSession.getCurrentSessionId()) {
    process.exit(1);
  }
}
```

### Try-Catch Pattern in Commands

```typescript
private static async executeList(argv: MCPCommandArgs): Promise<void> {
  try {
    const spinner = argv.quiet ? null : ora("Loading MCP servers...").start();

    const sdk = new NeuroLink();
    const allServers = await sdk.listMCPServers();

    if (spinner) {
      spinner.succeed(`Found ${allServers.length} MCP servers`);
    }

    // Display results...
  } catch (error) {
    logger.error(chalk.red(`❌ List command failed: ${(error as Error).message}`));
    process.exit(1);
  }
}
```

### Yargs Fail Handler

```typescript
.fail((msg, err, yargsInstance) => {
  // If in loop mode, don't exit - just show error
  if (globalSession.getCurrentSessionId()) {
    if (msg) {
      logger.error(chalk.red(msg));
      yargsInstance.showHelp("log");
    } else if (err) {
      handleError(err, "CLI Error in Loop Session");
    }
    return;  // Don't exit
  }

  // For single-command execution, exit with code 1
  if (err) {
    process.stderr.write(chalk.red(`CLI Error: ${err.message}\n`));
  }
  if (msg) {
    process.stderr.write(chalk.red(`Error: ${msg}\n`));
    yargsInstance.showHelp();
  }
  process.exit(1);
})
```

---

## Loop Mode and Session Management

### LoopSession Class

**Location**: `/src/cli/loop/session.ts`

```typescript
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

  public async start(): Promise<void> {
    // Initialize global session state
    this.sessionId = globalSession.setLoopSession(
      this.conversationMemoryConfig,
    );

    // Load command history
    this.commandHistory = (await loadCommandHistory()).reverse();

    this.isRunning = true;
    logger.always(chalk.bold.green(NEUROLINK_BANNER));
    logger.always(chalk.bold.green("Welcome to NeuroLink Loop Mode!"));

    // Handle conversation memory and selection
    if (this.conversationMemoryConfig?.enabled) {
      await this.handleConversationSelection();
    }

    // Main loop
    while (this.isRunning) {
      try {
        const command = await this.getCommandWithHistory();

        // Handle exit commands
        if (["exit", "quit", ":q"].includes(command.toLowerCase())) {
          this.isRunning = false;
          continue;
        }

        // Process and execute command
        await this.processCommand(command);
      } catch (error) {
        handleError(error as Error, "Command execution failed");
      }
    }

    this.cleanup();
  }

  private async processCommand(command: string): Promise<void> {
    let processedCommand: string | string[];

    if (command.startsWith("//")) {
      // Escape sequence - treat as stream with single /
      processedCommand = ["stream", command.slice(1)];
    } else if (command.startsWith("/")) {
      // Explicit CLI command
      processedCommand = command.slice(1).trim();
      if (await this.handleSessionCommands(processedCommand)) {
        return; // Session command handled
      }
    } else {
      // Default: treat as stream command
      processedCommand = ["stream", command];
    }

    // Execute using fresh yargs instance
    const yargsInstance = this.initializeCliParser();
    await yargsInstance
      .scriptName("")
      .exitProcess(false)
      .parse(processedCommand);
  }
}
```

### Session Commands

```typescript
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
          logger.always(chalk.red(`Error: Unknown session variable "${key}".`));
          return true;
        }

        const value = parseValue(parts.slice(2).join(" "));
        globalSession.setSessionVariable(key, value);
        logger.always(chalk.green(`✓ ${key} set to ${value}`));
      }
      return true;

    case "get":
      if (parts.length >= 2) {
        const value = globalSession.getSessionVariable(parts[1]);
        logger.always(value !== undefined
          ? chalk.cyan(`${parts[1]}: ${value}`)
          : chalk.yellow(`${parts[1]} is not set`));
      }
      return true;

    case "show":
      const variables = globalSession.getSessionVariables();
      logger.always(chalk.cyan("Session Variables:"));
      for (const [key, value] of Object.entries(variables)) {
        logger.always(chalk.gray(`  ${key}: ${value}`));
      }
      return true;

    case "clear":
      globalSession.clearSessionVariables();
      logger.always(chalk.green("✓ All session variables cleared"));
      return true;

    default:
      return false;  // Not a session command
  }
}
```

### Command History with Readline

```typescript
private async getCommandWithHistory(): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      history: [...this.commandHistory],
      prompt: `${chalk.green("⎔")} ${chalk.bold("neurolink")} ${chalk.green("»")} `,
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
```

---

## Interactive Prompts Pattern

### Using Inquirer.js

**Location**: `/src/cli/utils/interactiveSetup.ts` and `/src/cli/commands/setup.ts`

```typescript
import inquirer from "inquirer";

// List selection
const { selectedProvider } = await inquirer.prompt([
  {
    type: "list",
    name: "selectedProvider",
    message: "Which AI provider would you like to configure?",
    choices: [
      { name: "Google AI Studio - Fast setup, free tier", value: "google-ai" },
      { name: "OpenAI - GPT-4, GPT-3.5 models", value: "openai" },
      { name: "Anthropic - Claude models", value: "anthropic" },
      new inquirer.Separator("─".repeat(50)),
      { name: chalk.yellow("💡 Tip: Start with Google AI!"), value: "tip" },
    ],
    pageSize: 10,
  },
]);

// Checkbox (multi-select)
const { selectedProviders } = await inquirer.prompt([
  {
    type: "checkbox",
    name: "selectedProviders",
    message: "Select providers to configure:",
    choices: providerChoices,
    validate: (answers) => answers.length > 0 || "Select at least one",
  },
]);

// Password input
const { apiKey } = await inquirer.prompt([
  {
    type: "password",
    name: "apiKey",
    message: "Enter your API key:",
    validate: (value) =>
      value.startsWith("sk-") || 'Key should start with "sk-"',
  },
]);

// Confirmation
const { confirmDelete } = await inquirer.prompt([
  {
    type: "confirm",
    name: "confirmDelete",
    message: "Are you sure you want to delete?",
    default: false,
  },
]);

// Input with default
const { region } = await inquirer.prompt([
  {
    type: "input",
    name: "region",
    message: "AWS Region:",
    default: "us-east-1",
    validate: (value) => value.length > 0 || "Region is required",
  },
]);
```

### Conditional Prompts

```typescript
const { value } = await inquirer.prompt([
  {
    type: "input",
    name: "value",
    message: "Enter value:",
    // Only show this prompt conditionally
    when: () => {
      if (existingValue) {
        return inquirer
          .prompt([
            {
              type: "confirm",
              name: "update",
              message: "Update existing value?",
              default: false,
            },
          ])
          .then((answer) => answer.update);
      }
      return true;
    },
  },
]);
```

---

## Configuration Management

### ConfigManager Class

**Location**: `/src/cli/commands/config.ts`

```typescript
import { z } from "zod";
import path from "path";
import fs from "fs";
import os from "os";

// Configuration schema for validation
const ConfigSchema = z.object({
  defaultProvider: z.enum(["auto", "openai", "bedrock", "vertex", ...]).default("auto"),
  providers: z.object({
    openai: z.object({
      apiKey: z.string().optional(),
      model: z.string().default("gpt-4"),
    }).optional(),
    // ... more providers
  }).default({}),
  preferences: z.object({
    outputFormat: z.enum(["text", "json", "yaml"]).default("text"),
    temperature: z.number().min(0).max(2).default(0.7),
    enableLogging: z.boolean().default(false),
  }).default({}),
});

export type NeuroLinkConfig = z.infer<typeof ConfigSchema>;

export class ConfigManager {
  private configDir: string;
  private configFile: string;
  private config: NeuroLinkConfig;

  constructor() {
    this.configDir = path.join(os.homedir(), ".neurolink");
    this.configFile = path.join(this.configDir, "config.json");
    this.config = this.loadConfig();
  }

  private loadConfig(): NeuroLinkConfig {
    try {
      if (fs.existsSync(this.configFile)) {
        const data = JSON.parse(fs.readFileSync(this.configFile, "utf8"));
        return ConfigSchema.parse(data);
      }
    } catch (error) {
      logger.warn(chalk.yellow(`Invalid config: ${(error as Error).message}`));
    }
    return ConfigSchema.parse({});
  }

  private saveConfig(): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
    const validated = ConfigSchema.parse(this.config);
    fs.writeFileSync(this.configFile, JSON.stringify(validated, null, 2));
    logger.always(chalk.green(`✅ Configuration saved to ${this.configFile}`));
  }

  async initInteractive(): Promise<void> {
    logger.always(chalk.blue("🧠 NeuroLink Configuration Setup\n"));

    const preferences = await inquirer.prompt([
      {
        type: "list",
        name: "defaultProvider",
        message: "Select your default AI provider:",
        choices: [
          { name: "Auto (recommended)", value: "auto" },
          { name: "OpenAI - GPT models", value: "openai" },
          // ...
        ],
      },
      // ... more prompts
    ]);

    this.config.defaultProvider = preferences.defaultProvider;
    this.saveConfig();
  }

  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    try {
      ConfigSchema.parse(this.config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(...error.errors.map(e => `${e.path.join(".")}: ${e.message}`));
      }
    }
    return { valid: errors.length === 0, errors };
  }
}

export const configManager = new ConfigManager();
```

---

## Command Implementation Template

### Template for New Commands

```typescript
// src/cli/commands/my-feature.ts

import type { CommandModule, Argv } from "yargs";
import chalk from "chalk";
import ora from "ora";
import { logger } from "../../lib/utils/logger.js";
import { handleError } from "../errorHandler.js";
import type { BaseCommandArgs } from "../../lib/types/cli.js";

// Define command-specific argument types
export type MyFeatureCommandArgs = BaseCommandArgs & {
  subcommand?: string;
  option1?: string;
  flag1?: boolean;
};

/**
 * MyFeature CLI command factory
 */
export class MyFeatureCommandFactory {
  /**
   * Create the main command with subcommands
   */
  static createMyFeatureCommands(): CommandModule {
    return {
      command: "my-feature <subcommand>",
      describe: "Description of what this command group does",
      builder: (yargs) => {
        return (
          yargs
            .command(
              "action1",
              "Perform action 1",
              (y) => this.buildAction1Options(y),
              (argv) => this.executeAction1(argv as MyFeatureCommandArgs),
            )
            .command(
              "action2 <required-arg>",
              "Perform action 2",
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
      handler: () => {
        // No-op - subcommands handle execution
      },
    };
  }

  /**
   * Build options for action1 subcommand
   */
  private static buildAction1Options(yargs: Argv): Argv {
    return yargs
      .option("option1", {
        type: "string",
        description: "Description of option1",
      })
      .option("flag1", {
        type: "boolean",
        default: false,
        description: "Description of flag1",
      })
      .example("neurolink my-feature action1", "Basic usage")
      .example("neurolink my-feature action1 --option1 value", "With option");
  }

  /**
   * Build options for action2 subcommand
   */
  private static buildAction2Options(yargs: Argv): Argv {
    return yargs
      .positional("required-arg", {
        type: "string",
        description: "Required argument description",
        demandOption: true,
      })
      .example("neurolink my-feature action2 myvalue", "With required arg");
  }

  /**
   * Execute action1 command
   */
  private static async executeAction1(
    argv: MyFeatureCommandArgs,
  ): Promise<void> {
    try {
      // Show spinner (respect quiet mode)
      const spinner = argv.quiet ? null : ora("Processing...").start();

      // Your implementation here
      const result = await doSomething(argv.option1);

      // Update spinner
      if (spinner) {
        spinner.succeed(`Completed successfully`);
      }

      // Format and display output
      if (argv.format === "json") {
        logger.always(JSON.stringify(result, null, 2));
      } else {
        logger.always(chalk.bold("\n📋 Results:\n"));
        // Display formatted results
      }
    } catch (error) {
      logger.error(chalk.red(`❌ Action1 failed: ${(error as Error).message}`));
      process.exit(1);
    }
  }

  /**
   * Execute action2 command
   */
  private static async executeAction2(
    argv: MyFeatureCommandArgs,
  ): Promise<void> {
    try {
      const spinner = argv.quiet ? null : ora("Processing...").start();

      // Implementation

      if (spinner) {
        spinner.succeed("Done!");
      }
    } catch (error) {
      handleError(error as Error, "Action2");
    }
  }
}
```

### Registering New Commands

In `/src/cli/parser.ts`:

```typescript
import { MyFeatureCommandFactory } from "./commands/my-feature.js";

export function initializeCliParser() {
  return (
    yargs(hideBin(process.argv))
      // ... existing setup

      // Add new command
      .command(MyFeatureCommandFactory.createMyFeatureCommands())
  );

  // ... rest of configuration
}
```

---

## Best Practices

### 1. Consistent Option Naming

- Use camelCase for multi-word options: `--max-tokens`, `--disable-tools`
- Provide short aliases for common options: `-p` for provider, `-m` for model
- Use consistent descriptions across commands

### 2. Error Messages

- Start with an emoji indicator: `❌`, `⚠️`, `💡`
- Include the context: "Generate command failed:", "Configuration error:"
- Provide actionable suggestions when possible

```typescript
logger.error(chalk.red("❌ Authentication failed: Invalid API key"));
logger.error(chalk.yellow("💡 Set your API key: export OPENAI_API_KEY=sk-..."));
```

### 3. Progress Indication

- Use spinners for operations taking > 1 second
- Respect quiet mode by conditionally creating spinners
- Update spinner text for multi-step operations

### 4. Output Formatting

- Support at least `text`, `json`, and `table` formats
- Use `text` as the default for human readability
- Provide `json` for scripting and piping

### 5. Session Awareness

- Check `globalSession.getCurrentSessionId()` before calling `process.exit()`
- In loop mode, display errors but don't exit
- Preserve session state across command executions

### 6. Type Safety

- Define argument types for each command
- Use `as const` for choice arrays to preserve literal types
- Validate at runtime for dynamic inputs

### 7. Examples

- Provide 2-4 examples per command
- Show basic usage first, then advanced options
- Use realistic values in examples

```typescript
.example('$0 generate "Hello world"', "Basic generation")
.example('$0 generate "Code review" -p openai -m gpt-4', "Specific provider and model")
.example('$0 generate "Analyze data" --csv data.csv', "With file input")
```

---

## Common Utilities

### Path Resolution

**Location**: `/src/cli/utils/pathResolver.ts`

```typescript
import path from "path";

/**
 * Check if string is a URL or data URI
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
 * Resolve file path to absolute path
 * - URLs are returned unchanged
 * - Relative paths resolved against cwd
 */
export function resolveFilePath(filePath: string): string {
  if (!filePath || !filePath.trim()) return "";
  if (isURL(filePath)) return filePath;
  return path.resolve(process.cwd(), filePath);
}

export function resolveFilePaths(filePaths: string[]): string[] {
  return filePaths.map(resolveFilePath);
}
```

### Logger Utility

```typescript
import { logger } from "../../lib/utils/logger.js";

// Always displayed (even in quiet mode)
logger.always("Critical information");

// Standard logging (respects quiet mode)
logger.info("Informational message");
logger.warn("Warning message");
logger.error("Error message");

// Debug logging (only when debug enabled)
logger.debug("Debug information", { details: "..." });

// Table display
logger.table([
  { name: "model1", provider: "openai" },
  { name: "model2", provider: "anthropic" },
]);
```

### File Size Formatting

**Location**: `/src/cli/utils/audioFileUtils.ts`

```typescript
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
```

---

## Summary

NeuroLink's CLI architecture follows a well-organized factory pattern that promotes:

1. **Consistency**: Shared options, error handling, and output formatting
2. **Extensibility**: Easy to add new commands via factory methods
3. **Type Safety**: Comprehensive TypeScript types for all arguments
4. **User Experience**: Spinners, colors, progress indicators, and interactive prompts
5. **Session Support**: Loop mode with conversation memory and command history

When implementing new CLI commands, follow the established patterns in this document to maintain consistency with the rest of the codebase.
