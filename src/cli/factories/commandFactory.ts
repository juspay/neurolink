import type { CommandModule, Argv } from "yargs";
import { NeuroLink } from "../../lib/neurolink.js";
import type { AIProviderName } from "../../lib/index.js";
import type { UnknownRecord } from "../../lib/types/common.js";
import type {
  BaseCommandArgs,
  GenerateCommandArgs,
  StreamCommandArgs,
  GenerateResult,
  CommandResult,
  OutputOptions,
} from "../../lib/types/cli.js";
import ora from "ora";
import chalk from "chalk";
import { logger } from "../../lib/utils/logger.js";
import fs from "fs";

// Universal CLI command arguments interface extending BaseCommandArgs with all common options
interface CLICommandArgs extends BaseCommandArgs {
  input?: string;
  provider?: AIProviderName;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  system?: string;
  timeout?: number;
  disableTools?: boolean;
  enableAnalytics?: boolean;
  enableEvaluation?: boolean;
  outputFormat?: "text" | "structured" | "json";
  output?: string;
  delay?: number;
  file?: string;
  prompts?: string[];
  server?: string;
  list?: boolean;
  discover?: boolean;
  info?: boolean;
  tool?: string;
  params?: string;
  pull?: boolean;
  remove?: boolean;
  show?: boolean;
  all?: boolean;
  export?: boolean;
  context?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * CLI Command Factory for generate commands
 */
export class CLICommandFactory {
  // Common options available on all commands
  private static readonly commonOptions = {
    // Core generation options
    provider: {
      choices: [
        "auto",
        "openai",
        "bedrock",
        "vertex",
        "googleVertex",
        "anthropic",
        "azure",
        "google-ai",
        "huggingface",
        "ollama",
        "mistral",
      ],
      default: "auto",
      description: "AI provider to use (auto-selects best available)",
    },
    model: {
      type: "string" as const,
      description:
        "Specific model to use (e.g. gemini-2.5-pro, gemini-2.5-flash)",
    },
    temperature: {
      type: "number" as const,
      default: 0.7,
      description: "Creativity level (0.0 = focused, 1.0 = creative)",
    },
    maxTokens: {
      type: "number" as const,
      default: 1000,
      description: "Maximum tokens to generate",
    },
    system: {
      type: "string" as const,
      description: "System prompt to guide AI behavior",
    },

    // Output control options
    format: {
      choices: ["text", "json", "table"],
      default: "text",
      alias: ["f", "output-format"],
      description: "Output format",
    },
    output: {
      type: "string" as const,
      description: "Save output to file",
    },

    // Behavior control options
    timeout: {
      type: "number" as const,
      default: 120,
      description: "Maximum execution time in seconds",
    },
    delay: {
      type: "number" as const,
      description: "Delay between operations (ms)",
    },

    // Tools & features options
    disableTools: {
      type: "boolean" as const,
      default: false,
      description: "Disable MCP tool integration (tools enabled by default)",
    },
    enableAnalytics: {
      type: "boolean" as const,
      default: false,
      description: "Enable usage analytics collection",
    },
    enableEvaluation: {
      type: "boolean" as const,
      default: false,
      description: "Enable AI response quality evaluation",
    },
    evaluationDomain: {
      type: "string" as const,
      description:
        "Domain expertise for evaluation (e.g., 'AI coding assistant', 'Customer service expert')",
    },
    toolUsageContext: {
      type: "string" as const,
      description:
        "Tool usage context for evaluation (e.g., 'Used sales-data MCP tools')",
    },
    lighthouseStyle: {
      type: "boolean" as const,
      default: false,
      description: "Use Lighthouse-compatible domain-aware evaluation",
    },
    context: {
      type: "string" as const,
      description: "JSON context object for custom data",
    },

    // Debug & output options
    debug: {
      type: "boolean" as const,
      alias: ["v", "verbose"],
      default: false,
      description: "Enable debug mode with verbose output",
    },
    quiet: {
      type: "boolean" as const,
      alias: "q",
      default: false,
      description: "Suppress non-essential output",
    },
  };

  // Helper method to build options for commands
  private static buildOptions(yargs: Argv, additionalOptions = {}) {
    return yargs.options({
      ...this.commonOptions,
      ...additionalOptions,
    });
  }

  // Helper method to process common options
  private static processOptions(argv: CLICommandArgs) {
    return {
      provider: argv.provider === "auto" ? undefined : argv.provider,
      model: argv.model,
      temperature: argv.temperature,
      maxTokens: argv.maxTokens,
      systemPrompt: argv.system,
      timeout: argv.timeout,
      disableTools: argv.disableTools,
      enableAnalytics: argv.enableAnalytics,
      enableEvaluation: argv.enableEvaluation,
      evaluationDomain: argv.evaluationDomain,
      toolUsageContext: argv.toolUsageContext,
      lighthouseStyle: argv.lighthouseStyle,
      context: argv.context
        ? typeof argv.context === "string"
          ? JSON.parse(argv.context)
          : argv.context
        : undefined,
      debug: argv.debug,
      quiet: argv.quiet,
      format: argv.format,
      output: argv.output,
      delay: argv.delay,
    };
  }

  // Helper method to handle output
  private static handleOutput(
    result: GenerateResult | unknown,
    options: CLICommandArgs,
  ) {
    let output: string;

    if (options.format === "json") {
      output = JSON.stringify(result, null, 2);
    } else if (options.format === "table" && Array.isArray(result)) {
      console.table(result);
      return;
    } else {
      if (typeof result === "string") {
        output = result;
      } else if (result && typeof result === "object" && "content" in result) {
        output = (result as GenerateResult).content;
      } else if (result && typeof result === "object" && "text" in result) {
        output = (result as { text: string }).text;
      } else {
        output = JSON.stringify(result);
      }
    }

    if (options.output) {
      fs.writeFileSync(options.output, output);
      if (!options.quiet) {
        console.log(`Output saved to ${options.output}`);
      }
    } else {
      console.log(output);
    }
  }

  /**
   * Create the new primary 'generate' command
   */
  static createGenerateCommand(): CommandModule {
    return {
      command: ["generate <input>", "gen <input>"],
      describe: "Generate content using AI providers",
      builder: (yargs) => {
        return this.buildOptions(
          yargs.positional("input", {
            type: "string" as const,
            description: "Text prompt for AI generation (or read from stdin)",
          }),
        );
      },
      handler: async (argv) =>
        await this.executeGenerate(argv as CLICommandArgs),
    };
  }

  /**
   * Create stream command
   */
  static createStreamCommand(): CommandModule {
    return {
      command: "stream <input>",
      describe: "Stream generation in real-time",
      builder: (yargs) => {
        return this.buildOptions(
          yargs.positional("input", {
            type: "string" as const,
            description: "Text prompt for streaming (or read from stdin)",
          }),
        );
      },
      handler: async (argv) => await this.executeStream(argv as CLICommandArgs),
    };
  }

  /**
   * Create batch command
   */
  static createBatchCommand(): CommandModule {
    return {
      command: "batch <file>",
      describe: "Process multiple prompts from a file",
      builder: (yargs) => {
        return this.buildOptions(
          yargs.positional("file", {
            type: "string" as const,
            description: "File with prompts (one per line)",
            demandOption: true,
          }),
        );
      },
      handler: async (argv) => await this.executeBatch(argv as CLICommandArgs),
    };
  }

  /**
   * Create provider commands
   */
  static createProviderCommands(): CommandModule {
    return {
      command: "provider <subcommand>",
      describe: "Manage AI provider configurations and status",
      builder: (yargs) => {
        return yargs
          .command(
            "status",
            "Check status of all configured AI providers",
            (y) => this.buildOptions(y),
            (argv) =>
              CLICommandFactory.executeProviderStatus(argv as CLICommandArgs),
          )
          .demandCommand(1, "");
      },
      handler: () => {}, // No-op handler as subcommands handle everything
    };
  }

  /**
   * Create status command (alias for provider status)
   */
  static createStatusCommand(): CommandModule {
    return {
      command: "status",
      describe:
        "Check AI provider connectivity and performance (alias for provider status)",
      builder: (yargs) => this.buildOptions(yargs),
      handler: async (argv) =>
        await CLICommandFactory.executeProviderStatus(argv as CLICommandArgs),
    };
  }

  /**
   * Create config commands
   */
  static createConfigCommands(): CommandModule {
    return {
      command: "config <subcommand>",
      describe: "Manage NeuroLink configuration",
      builder: (yargs) => {
        return yargs
          .command(
            "export",
            "Export current configuration",
            (y) => this.buildOptions(y),
            (argv) => this.executeConfigExport(argv as CLICommandArgs),
          )
          .demandCommand(1, "");
      },
      handler: () => {}, // No-op handler as subcommands handle everything
    };
  }

  /**
   * Create get-best-provider command
   */
  static createBestProviderCommand(): CommandModule {
    return {
      command: "get-best-provider",
      describe: "Show the best available AI provider",
      builder: (yargs) => this.buildOptions(yargs),
      handler: async (argv) =>
        await this.executeGetBestProvider(argv as CLICommandArgs),
    };
  }

  /**
   * Create completion command
   */
  static createCompletionCommand(): CommandModule {
    return {
      command: "completion",
      describe: "Generate shell completion script",
      builder: (yargs) => this.buildOptions(yargs),
      handler: async (argv) =>
        await this.executeCompletion(argv as CLICommandArgs),
    };
  }

  /**
   * Execute provider status command
   */
  private static async executeProviderStatus(argv: UnknownRecord) {
    if (argv.verbose && !argv.quiet) {
      console.log(
        chalk.yellow("ℹ️ Verbose mode enabled. Displaying detailed status.\n"),
      );
    }
    const spinner = argv.quiet
      ? null
      : ora("🔍 Checking AI provider status...\n").start();

    try {
      // Use SDK's provider diagnostic method instead of manual testing
      const sdk = new NeuroLink();
      const results = await sdk.getProviderStatus();

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
        console.log(`${result.provider}: ${status}${time}${model}`);

        if (argv.verbose && result.error) {
          console.log(`  Error: ${chalk.red(result.error)}`);
        }
      }

      if (argv.verbose && !argv.quiet) {
        console.log(chalk.blue("\n📋 Detailed Results:"));
        console.log(JSON.stringify(results, null, 2));
      }
    } catch (error) {
      if (spinner) {
        spinner.fail("Provider status check failed");
      }
      console.error(chalk.red("Error checking provider status:"), error);
      process.exit(1);
    }
  }

  /**
   * Execute the generate command
   */
  private static async executeGenerate(argv: CLICommandArgs) {
    // Handle stdin input if no input provided
    if (!argv.input && !process.stdin.isTTY) {
      let stdinData = "";
      process.stdin.setEncoding("utf8");
      for await (const chunk of process.stdin) {
        stdinData += chunk;
      }
      argv.input = stdinData.trim();
      if (!argv.input) {
        throw new Error("No input received from stdin");
      }
    } else if (!argv.input) {
      throw new Error(
        'Input required. Use: neurolink generate "your prompt" or echo "prompt" | neurolink generate',
      );
    }

    const options = this.processOptions(argv);
    const spinner = argv.quiet ? null : ora("🤖 Generating text...").start();

    try {
      // Add delay if specified
      if (options.delay) {
        await new Promise((resolve) => setTimeout(resolve, options.delay));
      }

      const sdk = new NeuroLink();
      const result = await sdk.generate({
        input: { text: argv.input as string },
        provider: options.provider,
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        systemPrompt: options.systemPrompt,
        timeout: options.timeout,
        disableTools: options.disableTools,
        enableAnalytics: options.enableAnalytics,
        enableEvaluation: options.enableEvaluation,
        evaluationDomain: options.evaluationDomain as string | undefined,
        toolUsageContext: options.toolUsageContext as string | undefined,
        context: options.context as UnknownRecord | undefined,
      });

      if (spinner) {
        spinner.succeed(chalk.green("✅ Text generated successfully!"));
      }

      // Handle output with universal formatting
      this.handleOutput(result, options);

      if (options.debug) {
        logger.debug("\n" + chalk.yellow("Debug Information:"));
        logger.debug("Provider:", result.provider);
        logger.debug("Model:", result.model);
        if (result.analytics) {
          logger.debug("Analytics:", JSON.stringify(result.analytics, null, 2));
        }
        if (result.evaluation) {
          logger.debug(
            "Evaluation:",
            JSON.stringify(result.evaluation, null, 2),
          );
        }
      }

      process.exit(0);
    } catch (error) {
      if (spinner) {
        spinner.fail();
      }
      console.error(
        chalk.red(`❌ Generation failed: ${(error as Error).message}`),
      );
      if (options.debug) {
        console.error(chalk.gray((error as Error).stack));
      }
      process.exit(1);
    }
  }

  /**
   * Execute the stream command
   */
  private static async executeStream(argv: CLICommandArgs) {
    // Handle stdin input if no input provided
    if (!argv.input && !process.stdin.isTTY) {
      let stdinData = "";
      process.stdin.setEncoding("utf8");
      for await (const chunk of process.stdin) {
        stdinData += chunk;
      }
      argv.input = stdinData.trim();
      if (!argv.input) {
        throw new Error("No input received from stdin");
      }
    } else if (!argv.input) {
      throw new Error(
        'Input required. Use: neurolink stream "your prompt" or echo "prompt" | neurolink stream',
      );
    }

    const options = this.processOptions(argv);

    if (!options.quiet) {
      console.log(chalk.blue("🔄 Streaming..."));
    }

    try {
      // Add delay if specified
      if (options.delay) {
        await new Promise((resolve) => setTimeout(resolve, options.delay));
      }

      const sdk = new NeuroLink();
      const stream = await sdk.stream({
        input: { text: argv.input as string },
        provider: options.provider,
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        systemPrompt: options.systemPrompt,
        timeout: options.timeout,
        disableTools: options.disableTools,
        enableAnalytics: options.enableAnalytics,
        enableEvaluation: options.enableEvaluation,
        context: options.context as UnknownRecord | undefined,
      });

      let fullContent = "";

      // Process the stream
      for await (const chunk of stream.stream) {
        if (options.delay && options.delay > 0) {
          // Demo mode - add delay between chunks
          await new Promise((resolve) => setTimeout(resolve, options.delay));
        }

        process.stdout.write(chunk.content);
        fullContent += chunk.content;
      }

      if (!options.quiet) {
        process.stdout.write("\n");
      }

      // Handle output file if specified
      if (options.output) {
        fs.writeFileSync(options.output, fullContent);
        if (!options.quiet) {
          console.log(`\nOutput saved to ${options.output}`);
        }
      }

      process.exit(0);
    } catch (error) {
      console.error(
        chalk.red(`❌ Streaming failed: ${(error as Error).message}`),
      );
      if (options.debug) {
        console.error(chalk.gray((error as Error).stack));
      }
      process.exit(1);
    }
  }

  /**
   * Execute the batch command
   */
  private static async executeBatch(argv: CLICommandArgs) {
    const options = this.processOptions(argv);
    const spinner = options.quiet ? null : ora().start();

    try {
      if (!argv.file) {
        throw new Error("No file specified");
      }

      if (!fs.existsSync(argv.file)) {
        throw new Error(`File not found: ${argv.file}`);
      }

      const buffer = fs.readFileSync(argv.file);
      const prompts = buffer
        .toString("utf8")
        .split("\n")
        .map((line: string) => line.trim())
        .filter(Boolean);

      if (prompts.length === 0) {
        throw new Error("No prompts found in file");
      }

      if (spinner) {
        spinner.text = `📦 Processing ${prompts.length} prompts...`;
      } else if (!options.quiet) {
        console.log(chalk.blue(`📦 Processing ${prompts.length} prompts...\n`));
      }

      const results: Array<{
        prompt: string;
        response?: string;
        error?: string;
      }> = [];

      const sdk = new NeuroLink();

      for (let i = 0; i < prompts.length; i++) {
        if (spinner) {
          spinner.text = `Processing ${i + 1}/${prompts.length}: ${prompts[i].substring(0, 30)}...`;
        }

        try {
          const result = await sdk.generate({
            input: { text: prompts[i] },
            provider: options.provider,
            model: options.model,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
            systemPrompt: options.systemPrompt,
            timeout: options.timeout,
            disableTools: options.disableTools,
            enableAnalytics: options.enableAnalytics,
            enableEvaluation: options.enableEvaluation,
            context: options.context as UnknownRecord | undefined,
          });

          results.push({ prompt: prompts[i], response: result.content });

          if (spinner) {
            spinner.render();
          }
        } catch (error) {
          results.push({
            prompt: prompts[i],
            error: (error as Error).message,
          });

          if (spinner) {
            spinner.render();
          }
        }

        // Add delay between requests
        if (i < prompts.length - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, options.delay || 1000),
          );
        }
      }

      if (spinner) {
        spinner.succeed(chalk.green("✅ Batch processing complete!"));
      }

      // Handle output with universal formatting
      this.handleOutput(results, options);

      process.exit(0);
    } catch (error) {
      if (spinner) {
        spinner.fail();
      }
      console.error(
        chalk.red(`❌ Batch processing failed: ${(error as Error).message}`),
      );
      if (options.debug) {
        console.error(chalk.gray((error as Error).stack));
      }
      process.exit(1);
    }
  }

  /**
   * Execute config export command
   */
  private static async executeConfigExport(argv: CLICommandArgs) {
    const options = this.processOptions(argv);

    try {
      const config = {
        providers: {
          openai: !!process.env.OPENAI_API_KEY,
          bedrock: !!(
            process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ),
          vertex: !!(
            process.env.GOOGLE_APPLICATION_CREDENTIALS ||
            process.env.GOOGLE_SERVICE_ACCOUNT_KEY
          ),
          anthropic: !!process.env.ANTHROPIC_API_KEY,
          azure: !!(
            process.env.AZURE_OPENAI_API_KEY &&
            process.env.AZURE_OPENAI_ENDPOINT
          ),
          "google-ai": !!process.env.GOOGLE_AI_API_KEY,
        },
        defaults: {
          temperature: 0.7,
          maxTokens: 500,
        },
        timestamp: new Date().toISOString(),
      };

      this.handleOutput(config, options);
    } catch (error) {
      console.error(
        chalk.red(
          `❌ Configuration export failed: ${(error as Error).message}`,
        ),
      );
      process.exit(1);
    }
  }

  /**
   * Execute get best provider command
   */
  private static async executeGetBestProvider(argv: CLICommandArgs) {
    const options = this.processOptions(argv);

    try {
      const { getBestProvider } = await import(
        "../../lib/utils/providerUtils.js"
      );
      const bestProvider = await getBestProvider();

      if (options.format === "json") {
        this.handleOutput({ provider: bestProvider }, options);
      } else {
        if (!options.quiet) {
          console.log(
            chalk.green(`🎯 Best available provider: ${bestProvider}`),
          );
        } else {
          this.handleOutput(bestProvider, options);
        }
      }
    } catch (error) {
      console.error(
        chalk.red(`❌ Provider selection failed: ${(error as Error).message}`),
      );
      process.exit(1);
    }
  }

  /**
   * Execute completion command
   */
  private static async executeCompletion(argv: CLICommandArgs) {
    // This would need to be implemented with the actual CLI instance
    console.log("# Completion script would be generated here");
    console.log("# This requires access to the yargs CLI instance");
  }
}
