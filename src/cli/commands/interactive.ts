import type { CommandModule } from "yargs";
import chalk from "chalk";
import readline from "readline";
import fs from "fs";
import path from "path";
import os from "os";
import { logger } from "../../lib/utils/logger.js";
import ora from "ora";

/**
 * Interactive Mode for NeuroLink CLI
 * Provides a REPL-like interface with command history and tab completion
 */
export class InteractiveMode {
  private history: string[] = [];
  private historyFile: string;
  private sessionState: Record<string, unknown> = {};

  constructor() {
    // Store command history in user's home directory
    this.historyFile = path.join(os.homedir(), ".neurolink_history");
    this.loadHistory();
  }

  /**
   * Load command history from file
   */
  private loadHistory(): void {
    try {
      if (fs.existsSync(this.historyFile)) {
        const historyData = fs.readFileSync(this.historyFile, "utf8");
        this.history = historyData
          .split("\n")
          .filter((line) => line.trim() !== "");
      }
    } catch (_error) {
      // Silently ignore history loading errors
    }
  }

  /**
   * Save command history to file
   */
  private saveHistory(): void {
    try {
      // Keep only last 1000 commands
      const historyToSave = this.history.slice(-1000);
      fs.writeFileSync(this.historyFile, historyToSave.join("\n"), "utf8");
    } catch (_error) {
      // Silently ignore history saving errors
    }
  }

  /**
   * Add command to history
   */
  private addToHistory(command: string): void {
    const trimmedCommand = command.trim();
    if (
      trimmedCommand &&
      trimmedCommand !== this.history[this.history.length - 1]
    ) {
      this.history.push(trimmedCommand);
    }
  }

  /**
   * Start interactive mode
   */
  async start(): Promise<void> {
    logger.always(chalk.blue("🧠 NeuroLink Interactive Mode"));
    logger.always(chalk.gray('Type "help" for commands, "exit" to quit'));
    logger.always(
      chalk.gray("Use up/down arrows for command history, tab for completion"),
    );
    logger.always("");

    // Show current session state if any
    if (Object.keys(this.sessionState).length > 0) {
      logger.always(chalk.yellow("Session state:"));
      Object.entries(this.sessionState).forEach(([key, value]) => {
        logger.always(`  ${key}: ${value}`);
      });
      logger.always("");
    }

    while (true) {
      try {
        const input = await this.promptForInput();

        if (!input.trim()) {
          continue; // Skip empty input
        }

        const command = input.trim();

        // Handle special commands
        if (command === "exit" || command === "quit") {
          logger.always(chalk.blue("👋 Goodbye!"));
          break;
        }

        if (command === "clear") {
          // Clear console using process.stdout.write instead of console.clear()
          process.stdout.write("\x1Bc");
          continue;
        }

        if (command === "history") {
          this.showHistory();
          continue;
        }

        if (command.startsWith("set ")) {
          this.handleSetCommand(command);
          continue;
        }

        if (command === "state") {
          this.showSessionState();
          continue;
        }

        if (command === "help") {
          this.showHelp();
          continue;
        }

        // Add to history
        this.addToHistory(command);

        // Execute command
        await this.executeCommand(command);
      } catch (error) {
        if (
          (error as Error).message ===
          "User force closed the prompt with 0 null"
        ) {
          // User pressed Ctrl+C
          logger.always(chalk.blue("\n👋 Goodbye!"));
          break;
        } else {
          logger.error(chalk.red(`Error: ${(error as Error).message}`));
        }
      }
    }

    // Save history before exiting
    this.saveHistory();
  }

  /**
   * Prompt for input with history support
   */
  private async promptForInput(): Promise<string> {
    return new Promise((resolve, reject) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        history: [...this.history].reverse(), // Reverse for proper up/down navigation
        removeHistoryDuplicates: true,
        completer: this.autocomplete.bind(this),
      });

      rl.question(chalk.blue("neurolink> "), (answer) => {
        rl.close();
        resolve(answer);
      });

      rl.on("SIGINT", () => {
        rl.close();
        reject(new Error("User force closed the prompt with 0 null"));
      });
    });
  }

  /**
   * Autocomplete function for tab completion
   */
  private autocomplete(line: string): [string[], string] {
    const commands = [
      "generate",
      "gen",
      "stream",
      "batch",
      "provider",
      "status",
      "models",
      "mcp",
      "discover",
      "config",
      "get-best-provider",
      "help",
      "exit",
      "quit",
      "clear",
      "history",
      "set",
      "state",
    ];

    const providers = [
      "openai",
      "anthropic",
      "google-ai",
      "bedrock",
      "vertex",
      "azure",
      "huggingface",
      "ollama",
      "mistral",
      "litellm",
    ];

    const flags = [
      "--provider",
      "--model",
      "--temperature",
      "--maxTokens",
      "--system",
      "--format",
      "--output",
      "--timeout",
      "--delay",
      "--enableAnalytics",
      "--enableEvaluation",
      "--debug",
      "--quiet",
      "--help",
    ];

    // Get all possible completions
    const allCompletions = [...commands, ...providers, ...flags];

    // Find matching completions
    const hits = allCompletions.filter((cmd) => cmd.startsWith(line));

    // If no hits, try partial matching
    if (hits.length === 0) {
      const partialHits = allCompletions.filter((cmd) =>
        cmd.toLowerCase().includes(line.toLowerCase()),
      );
      return [partialHits.slice(0, 10), line]; // Limit to 10 suggestions
    }

    return [hits, line];
  }

  /**
   * Execute a command directly using the NeuroLink SDK (bypassing CLI handlers that call process.exit)
   */
  private async executeCommand(command: string): Promise<void> {
    try {
      // Parse command into argv array
      const args = this.parseCommand(command);

      if (args.length === 0) {
        return;
      }

      // Apply session state to command if applicable
      const argsWithState = this.applySessionState(args);
      const commandName = argsWithState[0];
      const commandArgs = argsWithState.slice(1);

      // Parse command arguments into options object
      const options = this.parseCommandOptions(commandArgs);

      // Handle different commands directly with the SDK
      switch (commandName) {
        case "generate":
        case "gen":
          await this.executeGenerateInteractive(options);
          break;

        case "stream":
          await this.executeStreamInteractive(options);
          break;

        case "batch":
          await this.executeBatchInteractive(options);
          break;

        case "status":
          await this.executeStatusInteractive(options);
          break;

        case "provider":
          if (commandArgs[0] === "status") {
            await this.executeStatusInteractive(options);
          } else {
            logger.error(
              chalk.red("Unknown provider subcommand. Try: provider status"),
            );
          }
          break;

        case "models":
          await this.executeModelsInteractive(commandArgs, options);
          break;

        case "mcp":
          await this.executeMCPInteractive(commandArgs, options);
          break;

        case "config":
          await this.executeConfigInteractive(commandArgs, options);
          break;

        case "get-best-provider":
          await this.executeGetBestProviderInteractive(options);
          break;

        default:
          logger.error(chalk.red(`Unknown command: ${commandName}`));
          logger.error(chalk.gray('Type "help" for available commands'));
          break;
      }
    } catch (error) {
      logger.error(
        chalk.red(`Command execution failed: ${(error as Error).message}`),
      );
      if (this.sessionState.debug) {
        logger.error(chalk.gray((error as Error).stack));
      }
    }
  }

  /**
   * Parse command arguments into options object
   */
  private parseCommandOptions(args: string[]): Record<string, unknown> {
    const options: Record<string, unknown> = {};
    let currentFlag: string | null = null;

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg.startsWith("--")) {
        currentFlag = arg.substring(2);
        // Check if this is a boolean flag or has a value
        if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
          // Next arg is the value
          continue;
        } else {
          // Boolean flag
          options[currentFlag] = true;
          currentFlag = null;
        }
      } else if (arg.startsWith("-") && arg.length === 2) {
        currentFlag = this.expandShortFlag(arg.substring(1));
        // Check if this is a boolean flag or has a value
        if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
          // Next arg is the value
          continue;
        } else {
          // Boolean flag
          options[currentFlag] = true;
          currentFlag = null;
        }
      } else if (currentFlag) {
        // This is a value for the current flag
        options[currentFlag] = arg;
        currentFlag = null;
      } else {
        // This is a positional argument
        if (!options.input) {
          options.input = arg;
        }
      }
    }

    return options;
  }

  /**
   * Expand short flags to their full names
   */
  private expandShortFlag(flag: string): string {
    const flagMap: Record<string, string> = {
      p: "provider",
      m: "model",
      t: "temperature",
      s: "system",
      f: "format",
      o: "output",
      v: "debug",
      q: "quiet",
      d: "domain",
    };
    return flagMap[flag] || flag;
  }

  /**
   * Execute generate command interactively
   */
  private async executeGenerateInteractive(
    options: Record<string, unknown>,
  ): Promise<void> {
    if (!options.input) {
      logger.error(chalk.red('Input required. Usage: generate "your prompt"'));
      return;
    }

    const spinner = options.quiet ? null : ora("🤖 Generating text...").start();

    try {
      const { NeuroLink } = await import("../../lib/neurolink.js");
      const sdk = new NeuroLink();

      const result = await sdk.generate({
        input: { text: options.input as string },
        provider: options.provider as string,
        model: options.model as string,
        temperature: options.temperature as number,
        maxTokens: options.maxTokens as number,
        systemPrompt: options.system as string,
        timeout: options.timeout as number,
        disableTools: options.disableTools as boolean,
        enableAnalytics: options.enableAnalytics as boolean,
        enableEvaluation: options.enableEvaluation as boolean,
      });

      if (spinner) {
        spinner.succeed(chalk.green("✅ Text generated successfully!"));
      }

      logger.always(result.content);

      // Show analytics if enabled
      if (options.enableAnalytics && result.analytics) {
        const analytics = result.analytics as unknown as Record<
          string,
          unknown
        >;
        logger.always(`\n📊 Analytics:`);
        logger.always(`   Provider: ${analytics.provider}`);
        if (analytics.tokenUsage) {
          const tokenUsage = analytics.tokenUsage as Record<string, unknown>;
          logger.always(
            `   Tokens: ${tokenUsage.inputTokens} input + ${tokenUsage.outputTokens} output = ${tokenUsage.totalTokens} total`,
          );
        }
        if (analytics.requestDuration) {
          logger.always(
            `   Time: ${((analytics.requestDuration as number) / 1000).toFixed(1)}s`,
          );
        }
      }

      // Show evaluation if enabled
      if (options.enableEvaluation && result.evaluation) {
        logger.always(`\n⭐ Evaluation:`);
        logger.always(`   Relevance: ${result.evaluation.relevance}/10`);
        logger.always(`   Accuracy: ${result.evaluation.accuracy}/10`);
        logger.always(`   Completeness: ${result.evaluation.completeness}/10`);
        logger.always(`   Overall: ${result.evaluation.overall}/10`);
      }
    } catch (error) {
      if (spinner) {
        spinner.fail();
      }
      logger.error(
        chalk.red(`❌ Generation failed: ${(error as Error).message}`),
      );
    }
  }

  /**
   * Execute stream command interactively
   */
  private async executeStreamInteractive(
    options: Record<string, unknown>,
  ): Promise<void> {
    if (!options.input) {
      logger.error(chalk.red('Input required. Usage: stream "your prompt"'));
      return;
    }

    if (!options.quiet) {
      logger.always(chalk.blue("🔄 Streaming..."));
    }

    try {
      const { NeuroLink } = await import("../../lib/neurolink.js");
      const sdk = new NeuroLink();

      const stream = await sdk.stream({
        input: { text: options.input as string },
        provider: options.provider as string,
        model: options.model as string,
        temperature: options.temperature as number,
        maxTokens: options.maxTokens as number,
        systemPrompt: options.system as string,
        timeout: options.timeout as number,
        disableTools: options.disableTools as boolean,
        enableAnalytics: options.enableAnalytics as boolean,
        enableEvaluation: options.enableEvaluation as boolean,
      });

      // Process the stream
      for await (const chunk of stream.stream) {
        process.stdout.write(chunk.content);
      }

      if (!options.quiet) {
        process.stdout.write("\n");
      }

      // Show analytics if enabled
      if (options.enableAnalytics && stream.analytics) {
        const analytics = (await (stream.analytics instanceof Promise
          ? stream.analytics
          : Promise.resolve(stream.analytics))) as unknown as Record<
          string,
          unknown
        >;
        logger.always(`\n📊 Analytics:`);
        logger.always(`   Provider: ${analytics.provider}`);
        if (analytics.tokenUsage) {
          const tokenUsage = analytics.tokenUsage as Record<string, unknown>;
          logger.always(
            `   Tokens: ${tokenUsage.inputTokens} input + ${tokenUsage.outputTokens} output = ${tokenUsage.totalTokens} total`,
          );
        }
        if (analytics.requestDuration) {
          logger.always(
            `   Time: ${((analytics.requestDuration as number) / 1000).toFixed(1)}s`,
          );
        }
      }
    } catch (error) {
      logger.error(
        chalk.red(`❌ Streaming failed: ${(error as Error).message}`),
      );
    }
  }

  /**
   * Execute batch command interactively
   */
  private async executeBatchInteractive(
    options: Record<string, unknown>,
  ): Promise<void> {
    if (!options.input) {
      logger.error(chalk.red("File required. Usage: batch <file>"));
      return;
    }

    const spinner = options.quiet
      ? null
      : ora("📦 Processing batch...").start();

    try {
      const fs = await import("fs");
      const file = options.input as string;

      if (!fs.existsSync(file)) {
        throw new Error(`File not found: ${file}`);
      }

      const prompts = fs
        .readFileSync(file, "utf8")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      if (prompts.length === 0) {
        throw new Error("No prompts found in file");
      }

      if (spinner) {
        spinner.text = `📦 Processing ${prompts.length} prompts...`;
      }

      const { NeuroLink } = await import("../../lib/neurolink.js");
      const sdk = new NeuroLink();
      const results = [];

      for (let i = 0; i < prompts.length; i++) {
        if (spinner) {
          spinner.text = `Processing ${i + 1}/${prompts.length}: ${prompts[i].substring(0, 30)}...`;
        }

        try {
          const result = await sdk.generate({
            input: { text: prompts[i] },
            provider: options.provider as string,
            model: options.model as string,
            temperature: options.temperature as number,
            maxTokens: options.maxTokens as number,
            systemPrompt: options.system as string,
            timeout: options.timeout as number,
          });

          results.push({ prompt: prompts[i], response: result.content });
        } catch (error) {
          results.push({ prompt: prompts[i], error: (error as Error).message });
        }

        // Add delay between requests
        if (i < prompts.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      if (spinner) {
        spinner.succeed(chalk.green("✅ Batch processing complete!"));
      }

      if (options.format === "json") {
        logger.always(JSON.stringify(results, null, 2));
      } else {
        results.forEach((result, index) => {
          logger.always(
            `\n${chalk.blue(`Result ${index + 1}:`)} ${result.prompt}`,
          );
          if ("response" in result) {
            logger.always(result.response);
          } else {
            logger.always(chalk.red(`Error: ${result.error}`));
          }
        });
      }
    } catch (error) {
      if (spinner) {
        spinner.fail();
      }
      logger.error(
        chalk.red(`❌ Batch processing failed: ${(error as Error).message}`),
      );
    }
  }

  /**
   * Execute status command interactively
   */
  private async executeStatusInteractive(
    options: Record<string, unknown>,
  ): Promise<void> {
    const spinner = options.quiet
      ? null
      : ora("🔍 Checking provider status...").start();

    try {
      const { NeuroLink } = await import("../../lib/neurolink.js");
      const sdk = new NeuroLink();
      const results = await sdk.getProviderStatus({ quiet: !!options.quiet });

      if (spinner) {
        const working = results.filter((r) => r.status === "working").length;
        const configured = results.filter((r) => r.configured).length;
        spinner.succeed(
          `Provider check complete: ${working}/${configured} providers working`,
        );
      }

      // Display results
      for (const result of results) {
        const status =
          result.status === "working"
            ? chalk.green("✅ Working")
            : result.status === "failed"
              ? chalk.red("❌ Failed")
              : chalk.gray("⚪ Not configured");

        const time = result.responseTime ? ` (${result.responseTime}ms)` : "";
        const model = result.model ? ` [${result.model}]` : "";
        logger.always(`${result.provider}: ${status}${time}${model}`);
      }
    } catch (error) {
      if (spinner) {
        spinner.fail();
      }
      logger.error(
        chalk.red(`❌ Status check failed: ${(error as Error).message}`),
      );
    }
  }

  /**
   * Execute models command interactively
   */
  private async executeModelsInteractive(
    args: string[],
    _options: Record<string, unknown>,
  ): Promise<void> {
    const subcommand = args[0] || "list";

    try {
      if (subcommand === "list") {
        // Import models data
        const fs = await import("fs");
        const path = await import("path");
        const modelsPath = path.join(process.cwd(), "config", "models.json");

        if (fs.existsSync(modelsPath)) {
          const models = JSON.parse(fs.readFileSync(modelsPath, "utf8"));

          logger.always(chalk.blue("📋 Available Models:"));
          Object.entries(models).forEach(([provider, providerModels]) => {
            logger.always(`\n${chalk.cyan(provider.toUpperCase())}:`);
            (providerModels as Record<string, unknown>[]).forEach(
              (model: Record<string, unknown>) => {
                const status =
                  model.status === "active"
                    ? chalk.green("✅")
                    : chalk.gray("⚪");
                logger.always(
                  `  ${status} ${model.name} - ${model.description}`,
                );
              },
            );
          });
        } else {
          logger.error(chalk.red("Models configuration file not found"));
        }
      } else if (subcommand === "test") {
        logger.always(chalk.blue("🧪 Testing models..."));
        logger.always("This feature is under development");
      } else {
        logger.error(chalk.red(`Unknown models subcommand: ${subcommand}`));
        logger.error(chalk.gray("Available: list, test"));
      }
    } catch (error) {
      logger.error(
        chalk.red(`❌ Models command failed: ${(error as Error).message}`),
      );
    }
  }

  /**
   * Execute MCP command interactively
   */
  private async executeMCPInteractive(
    args: string[],
    _options: Record<string, unknown>,
  ): Promise<void> {
    const subcommand = args[0] || "list";

    try {
      if (subcommand === "list") {
        logger.always(chalk.blue("📋 MCP Servers:"));
        logger.always("This feature is under development");
      } else {
        logger.error(chalk.red(`Unknown MCP subcommand: ${subcommand}`));
        logger.error(chalk.gray("Available: list, install, test, exec"));
      }
    } catch (error) {
      logger.error(
        chalk.red(`❌ MCP command failed: ${(error as Error).message}`),
      );
    }
  }

  /**
   * Execute config command interactively
   */
  private async executeConfigInteractive(
    args: string[],
    _options: Record<string, unknown>,
  ): Promise<void> {
    const subcommand = args[0] || "show";

    try {
      if (subcommand === "show") {
        logger.always(chalk.blue("⚙️  Configuration:"));
        logger.always(`Provider: ${this.sessionState.provider || "auto"}`);
        logger.always(`Model: ${this.sessionState.model || "default"}`);
        logger.always(`Temperature: ${this.sessionState.temperature || 0.7}`);
      } else {
        logger.error(chalk.red(`Unknown config subcommand: ${subcommand}`));
        logger.error(chalk.gray("Available: show, init, validate, reset"));
      }
    } catch (error) {
      logger.error(
        chalk.red(`❌ Config command failed: ${(error as Error).message}`),
      );
    }
  }

  /**
   * Execute get-best-provider command interactively
   */
  private async executeGetBestProviderInteractive(
    options: Record<string, unknown>,
  ): Promise<void> {
    try {
      const { getBestProvider } = await import(
        "../../lib/utils/providerUtils.js"
      );
      const bestProvider = await getBestProvider();

      if (options.format === "json") {
        logger.always(JSON.stringify({ provider: bestProvider }, null, 2));
      } else {
        logger.always(
          chalk.green(`🎯 Best available provider: ${bestProvider}`),
        );
      }
    } catch (error) {
      logger.error(
        chalk.red(`❌ Provider selection failed: ${(error as Error).message}`),
      );
    }
  }

  /**
   * Parse command string into argv array
   */
  private parseCommand(command: string): string[] {
    // Simple command parsing - split by spaces but respect quotes
    const args: string[] = [];
    let current = "";
    let inQuotes = false;
    let quoteChar = "";

    for (let i = 0; i < command.length; i++) {
      const char = command[i];

      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
        quoteChar = "";
      } else if (char === " " && !inQuotes) {
        if (current.trim()) {
          args.push(current.trim());
          current = "";
        }
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      args.push(current.trim());
    }

    return args;
  }

  /**
   * Apply session state to command arguments
   */
  private applySessionState(args: string[]): string[] {
    const modifiedArgs = [...args];

    // Apply default provider if set and not already specified
    if (
      this.sessionState.provider &&
      !args.includes("--provider") &&
      !args.includes("-p")
    ) {
      modifiedArgs.push("--provider", this.sessionState.provider as string);
    }

    // Apply default model if set and not already specified
    if (
      this.sessionState.model &&
      !args.includes("--model") &&
      !args.includes("-m")
    ) {
      modifiedArgs.push("--model", this.sessionState.model as string);
    }

    // Apply other session state as needed
    Object.entries(this.sessionState).forEach(([key, value]) => {
      const flagName = `--${key}`;
      if (key !== "provider" && key !== "model" && !args.includes(flagName)) {
        if (typeof value === "boolean") {
          if (value) {
            modifiedArgs.push(flagName);
          }
        } else {
          modifiedArgs.push(flagName, String(value));
        }
      }
    });

    return modifiedArgs;
  }

  /**
   * Handle set command for session state
   */
  private handleSetCommand(command: string): void {
    const parts = command.split(" ");
    if (parts.length < 3) {
      logger.error("Usage: set <key> <value>");
      return;
    }

    const key = parts[1];
    const value = parts.slice(2).join(" ");

    // Convert string values to appropriate types
    let parsedValue: unknown = value;
    if (value.toLowerCase() === "true") {
      parsedValue = true;
    } else if (value.toLowerCase() === "false") {
      parsedValue = false;
    } else if (!isNaN(Number(value))) {
      parsedValue = Number(value);
    }

    this.sessionState[key] = parsedValue;
    logger.always(chalk.green(`✅ Set ${key} = ${parsedValue}`));
  }

  /**
   * Show session state
   */
  private showSessionState(): void {
    if (Object.keys(this.sessionState).length === 0) {
      logger.always(chalk.gray("No session state set"));
      return;
    }

    logger.always(chalk.blue("Session State:"));
    Object.entries(this.sessionState).forEach(([key, value]) => {
      logger.always(`  ${chalk.cyan(key)}: ${chalk.white(String(value))}`);
    });
  }

  /**
   * Show command history
   */
  private showHistory(): void {
    if (this.history.length === 0) {
      logger.always(chalk.gray("No command history"));
      return;
    }

    logger.always(chalk.blue("Command History:"));
    this.history.slice(-20).forEach((cmd, index) => {
      logger.always(
        `  ${chalk.gray((this.history.length - 20 + index + 1).toString().padStart(3))}: ${cmd}`,
      );
    });
  }

  /**
   * Show help for interactive mode
   */
  private showHelp(): void {
    logger.always(chalk.blue("\n🧠 NeuroLink Interactive Mode Help\n"));

    logger.always(chalk.cyan("Available Commands:"));
    logger.always("  generate, gen    Generate content using AI providers");
    logger.always("  stream           Stream generation in real-time");
    logger.always("  batch            Process multiple prompts from a file");
    logger.always("  provider         Manage AI provider configurations");
    logger.always("  status           Check AI provider connectivity");
    logger.always("  models           List and test AI models");
    logger.always("  mcp              Manage MCP servers");
    logger.always("  config           Manage NeuroLink configuration");

    logger.always(chalk.cyan("\nInteractive Commands:"));
    logger.always(
      '  set <key> <value>   Set session variable (e.g., "set provider openai")',
    );
    logger.always("  state               Show current session state");
    logger.always("  history             Show command history");
    logger.always("  clear               Clear screen");
    logger.always("  help                Show this help");
    logger.always("  exit, quit          Exit interactive mode");

    logger.always(chalk.cyan("\nKeyboard Shortcuts:"));
    logger.always("  Up/Down arrows      Navigate command history");
    logger.always("  Tab                 Auto-complete commands");
    logger.always("  Ctrl+C              Exit interactive mode");

    logger.always(chalk.cyan("\nExamples:"));
    logger.always("  set provider openai");
    logger.always('  generate "Hello world"');
    logger.always("  status");
    logger.always("  mcp list");
    logger.always("");
  }
}

/**
 * Create interactive command module for yargs
 */
export function createInteractiveCommand(): CommandModule {
  return {
    command: "interactive",
    aliases: ["repl", "shell"],
    describe: "Start interactive mode with command history and completion",
    builder: (yargs) => {
      return yargs
        .example("$0 interactive", "Start interactive REPL mode")
        .example("$0 repl", "Start interactive mode (alias)")
        .epilogue(
          "Interactive mode provides a shell-like experience with command history, tab completion, and session state management.",
        );
    },
    handler: async () => {
      const interactive = new InteractiveMode();
      await interactive.start();
    },
  };
}
