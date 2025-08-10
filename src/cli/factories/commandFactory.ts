import type { CommandModule, Argv } from "yargs";
import { NeuroLink } from "../../lib/neurolink.js";
import type { AIProviderName } from "../../lib/index.js";
import type { UnknownRecord, JsonValue } from "../../lib/types/common.js";
import type {
  BaseCommandArgs,
  GenerateCommandArgs,
  StreamCommandArgs,
  GenerateResult,
  CommandResult,
  OutputOptions,
} from "../../lib/types/cli.js";
import type { TokenUsage, AnalyticsData } from "../../lib/types/providers.js";

// Interface for tokens with simplified property names (as used in analytics)
interface AnalyticsTokens {
  input: number;
  output: number;
  total: number;
}
import {
  ContextFactory,
  type BaseContext,
  type ContextConfig,
} from "../../lib/types/contextTypes.js";
import { ModelsCommandFactory } from "../commands/models.js";
import { MCPCommandFactory } from "../commands/mcp.js";
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
  domain?: string;
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
  noColor?: boolean;
  configFile?: string;
  dryRun?: boolean;
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
        "openai-compatible",
        "bedrock",
        "vertex",
        "googleVertex",
        "anthropic",
        "azure",
        "google-ai",
        "huggingface",
        "ollama",
        "mistral",
        "litellm",
      ],
      default: "auto",
      description: "AI provider to use (auto-selects best available)",
      alias: "p",
    },
    model: {
      type: "string" as const,
      description:
        "Specific model to use (e.g. gemini-2.5-pro, gemini-2.5-flash)",
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
      alias: "o",
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
    domain: {
      type: "string" as const,
      choices: [
        "healthcare",
        "finance",
        "analytics",
        "ecommerce",
        "education",
        "legal",
        "technology",
        "generic",
        "auto",
      ],
      description: "Domain type for specialized processing and optimization",
      alias: "d",
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
    domainAware: {
      type: "boolean" as const,
      default: false,
      description: "Use domain-aware evaluation",
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
    noColor: {
      type: "boolean" as const,
      default: false,
      description: "Disable colored output (useful for CI/scripts)",
    },
    configFile: {
      type: "string" as const,
      description: "Path to custom configuration file",
    },
    dryRun: {
      type: "boolean" as const,
      default: false,
      description: "Test command without making actual API calls (for testing)",
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
    // Handle noColor option by disabling chalk
    if (argv.noColor) {
      process.env.FORCE_COLOR = "0";
    }

    // Process context using ContextFactory for type-safe integration
    let processedContext: BaseContext | undefined;
    let contextConfig: Partial<ContextConfig> | undefined;

    if (argv.context) {
      let rawContext;
      if (typeof argv.context === "string") {
        try {
          rawContext = JSON.parse(argv.context);
        } catch (err) {
          const contextStr = argv.context as string;
          const truncatedJson =
            contextStr.length > 100
              ? `${contextStr.slice(0, 100)}...`
              : contextStr;
          logger.error(
            `Invalid JSON in --context parameter: ${(err as Error).message}. Received: ${truncatedJson}`,
          );
          process.exit(1);
        }
      } else {
        rawContext = argv.context;
      }

      const validatedContext = ContextFactory.validateContext(rawContext);
      if (validatedContext) {
        processedContext = validatedContext;

        // Configure context integration based on CLI usage
        contextConfig = {
          mode: "prompt_prefix", // Add context as prompt prefix for CLI usage
          includeInPrompt: true,
          includeInAnalytics: true,
          includeInEvaluation: true,
          maxLength: 500, // Reasonable limit for CLI context
        };
      } else if (argv.debug) {
        logger.debug("Invalid context provided, skipping context integration");
      }
    }

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
      domain: argv.domain,
      evaluationDomain: argv.evaluationDomain,
      toolUsageContext: argv.toolUsageContext,
      domainAware: argv.domainAware,
      context: processedContext,
      contextConfig,
      debug: argv.debug,
      quiet: argv.quiet,
      format: argv.format,
      output: argv.output,
      delay: argv.delay,
      noColor: argv.noColor,
      configFile: argv.configFile,
      dryRun: argv.dryRun,
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
      logger.table(result);
      return;
    } else {
      if (typeof result === "string") {
        output = result;
      } else if (result && typeof result === "object" && "content" in result) {
        const generateResult = result as GenerateResult;
        output = generateResult.content;

        // Add analytics display for text mode when enabled
        if (options.enableAnalytics && generateResult.analytics) {
          output += this.formatAnalyticsForTextMode(generateResult);
        }
      } else if (result && typeof result === "object" && "text" in result) {
        output = (result as { text: string }).text;
      } else {
        output = JSON.stringify(result);
      }
    }

    if (options.output) {
      fs.writeFileSync(options.output, output);
      if (!options.quiet) {
        logger.always(`Output saved to ${options.output}`);
      }
    } else {
      logger.always(output);
    }
  }

  // Helper method to validate token usage data
  private static isValidTokenUsage(tokens: unknown): tokens is AnalyticsTokens {
    return !!(
      tokens &&
      typeof tokens === "object" &&
      tokens !== null &&
      typeof (tokens as AnalyticsTokens).input === "number" &&
      typeof (tokens as AnalyticsTokens).output === "number" &&
      typeof (tokens as AnalyticsTokens).total === "number"
    );
  }

  // Helper method to format analytics for text mode display
  private static formatAnalyticsForTextMode(result: GenerateResult): string {
    if (!result.analytics) {
      return "";
    }

    const analytics = result.analytics;
    let analyticsText = "\n\n📊 Analytics:\n";

    // Provider and model info
    analyticsText += `   Provider: ${analytics.provider}`;
    if (result.model) {
      analyticsText += ` (${result.model})`;
    }
    analyticsText += "\n";

    // Token usage
    if (this.isValidTokenUsage(analytics.tokens)) {
      const tokens = analytics.tokens as AnalyticsTokens;
      analyticsText += `   Tokens: ${tokens.input} input + ${tokens.output} output = ${tokens.total} total\n`;
    }

    // Cost information
    if (
      analytics.cost !== undefined &&
      analytics.cost !== null &&
      typeof analytics.cost === "number"
    ) {
      analyticsText += `   Cost: $${analytics.cost.toFixed(5)}\n`;
    }

    // Response time
    if (analytics.responseTime && typeof analytics.responseTime === "number") {
      const timeInSeconds = (analytics.responseTime / 1000).toFixed(1);
      analyticsText += `   Time: ${timeInSeconds}s\n`;
    }

    // Tools used
    if (result.toolsUsed && result.toolsUsed.length > 0) {
      analyticsText += `   Tools: ${result.toolsUsed.join(", ")}\n`;
    }

    // Context information
    if (
      analytics.context &&
      typeof analytics.context === "object" &&
      analytics.context !== null
    ) {
      const contextEntries = Object.entries(analytics.context);
      if (contextEntries.length > 0) {
        const contextItems = contextEntries.map(
          ([key, value]) => `${key}=${value}`,
        );
        analyticsText += `   Context: ${contextItems.join(", ")}\n`;
      }
    }

    return analyticsText;
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
          yargs
            .positional("input", {
              type: "string" as const,
              description: "Text prompt for AI generation (or read from stdin)",
            })
            .example(
              '$0 generate "Explain quantum computing"',
              "Basic generation",
            )
            .example(
              '$0 gen "Write a Python function" --provider openai',
              "Use specific provider",
            )
            .example(
              '$0 generate "Code review" -m gpt-4 -t 0.3',
              "Use specific model and temperature",
            )
            .example('echo "Summarize this" | $0 generate', "Use stdin input")
            .example(
              '$0 generate "Analyze data" --enable-analytics',
              "Enable usage analytics",
            ),
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
          yargs
            .positional("input", {
              type: "string" as const,
              description: "Text prompt for streaming (or read from stdin)",
            })
            .example(
              '$0 stream "Write a story about space"',
              "Stream a creative story",
            )
            .example(
              '$0 stream "Explain machine learning" -p anthropic',
              "Stream with specific provider",
            )
            .example(
              '$0 stream "Code walkthrough" --output story.txt',
              "Stream to file",
            )
            .example('echo "Live demo" | $0 stream', "Stream from stdin"),
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
          yargs
            .positional("file", {
              type: "string" as const,
              description: "File with prompts (one per line)",
              demandOption: true,
            })
            .example("$0 batch prompts.txt", "Process prompts from file")
            .example(
              "$0 batch questions.txt --format json",
              "Export results as JSON",
            )
            .example(
              "$0 batch tasks.txt -p vertex --delay 2000",
              "Use Vertex AI with 2s delay",
            )
            .example(
              "$0 batch batch.txt --output results.json",
              "Save results to file",
            ),
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
            (y) =>
              this.buildOptions(y)
                .example("$0 provider status", "Check all provider status")
                .example(
                  "$0 provider status --verbose",
                  "Detailed provider diagnostics",
                )
                .example("$0 provider status --quiet", "Minimal status output"),
            (argv) =>
              CLICommandFactory.executeProviderStatus(argv as CLICommandArgs),
          )
          .demandCommand(1, "Please specify a provider subcommand");
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
      builder: (yargs) =>
        this.buildOptions(yargs)
          .example("$0 status", "Quick provider status check")
          .example("$0 status --verbose", "Detailed connectivity diagnostics")
          .example("$0 status --format json", "Export status as JSON"),
      handler: async (argv) =>
        await CLICommandFactory.executeProviderStatus(argv as CLICommandArgs),
    };
  }

  /**
   * Create models commands
   */
  static createModelsCommands(): CommandModule {
    return ModelsCommandFactory.createModelsCommands();
  }

  /**
   * Create MCP commands
   */
  static createMCPCommands(): CommandModule {
    return MCPCommandFactory.createMCPCommands();
  }

  /**
   * Create discover command
   */
  static createDiscoverCommand(): CommandModule {
    return MCPCommandFactory.createDiscoverCommand();
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
            "init",
            "Interactive configuration setup wizard",
            (y) => this.buildOptions(y),
            async (argv) => {
              const { configManager } = await import("../commands/config.js");
              await configManager.initInteractive();
            },
          )
          .command(
            "show",
            "Display current configuration",
            (y) => this.buildOptions(y),
            async (argv) => {
              const { configManager } = await import("../commands/config.js");
              configManager.showConfig();
            },
          )
          .command(
            "validate",
            "Validate current configuration",
            (y) => this.buildOptions(y),
            async (argv) => {
              const { configManager } = await import("../commands/config.js");
              const result = configManager.validateConfig();
              if (result.valid) {
                logger.always(chalk.green("✅ Configuration is valid"));
              } else {
                logger.always(chalk.red("❌ Configuration has errors:"));
                result.errors.forEach((error) => logger.always(`  • ${error}`));
                process.exit(1);
              }
            },
          )
          .command(
            "reset",
            "Reset configuration to defaults",
            (y) => this.buildOptions(y),
            async (argv) => {
              const { configManager } = await import("../commands/config.js");
              configManager.resetConfig();
            },
          )
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
      builder: (yargs) =>
        this.buildOptions(yargs)
          .example("$0 get-best-provider", "Get best available provider")
          .example("$0 get-best-provider --format json", "Get provider as JSON")
          .example("$0 get-best-provider --quiet", "Just the provider name"),
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
      builder: (yargs) =>
        this.buildOptions(yargs)
          .example("$0 completion", "Generate shell completion")
          .example(
            "$0 completion > ~/.neurolink-completion.sh",
            "Save completion script",
          )
          .example(
            "source ~/.neurolink-completion.sh",
            "Enable completions (bash)",
          )
          .epilogue(
            "Add the completion script to your shell profile for persistent completions",
          ),
      handler: async (argv) =>
        await this.executeCompletion(argv as CLICommandArgs),
    };
  }

  /**
   * Execute provider status command
   */
  private static async executeProviderStatus(argv: UnknownRecord) {
    if (argv.verbose && !argv.quiet) {
      logger.always(
        chalk.yellow("ℹ️ Verbose mode enabled. Displaying detailed status.\n"),
      );
    }
    const spinner = argv.quiet
      ? null
      : ora("🔍 Checking AI provider status...\n").start();

    try {
      // Handle dry-run mode for provider status
      if (argv.dryRun) {
        const mockResults = [
          {
            provider: "google-ai",
            status: "working",
            configured: true,
            responseTime: 150,
            model: "gemini-2.5-flash",
          },
          {
            provider: "openai",
            status: "working",
            configured: true,
            responseTime: 200,
            model: "gpt-4o-mini",
          },
          {
            provider: "anthropic",
            status: "working",
            configured: true,
            responseTime: 180,
            model: "claude-3-haiku",
          },
          { provider: "bedrock", status: "not configured", configured: false },
          { provider: "vertex", status: "not configured", configured: false },
        ];

        if (spinner) {
          spinner.succeed(
            "Provider check complete (dry-run): 3/3 providers working",
          );
        }

        // Display mock results
        for (const result of mockResults) {
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

        if (argv.verbose && !argv.quiet) {
          logger.always(chalk.blue("\n📋 Detailed Results (Dry-run):"));
          logger.always(JSON.stringify(mockResults, null, 2));
        }

        return;
      }

      // Use SDK's provider diagnostic method instead of manual testing
      const sdk = new NeuroLink();
      const results = await sdk.getProviderStatus({ quiet: !!argv.quiet });

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

        if (argv.verbose && result.error) {
          logger.always(`  Error: ${chalk.red(result.error)}`);
        }
      }

      if (argv.verbose && !argv.quiet) {
        logger.always(chalk.blue("\n📋 Detailed Results:"));
        logger.always(JSON.stringify(results, null, 2));
      }
    } catch (error) {
      if (spinner) {
        spinner.fail("Provider status check failed");
      }
      logger.error(chalk.red("Error checking provider status:"), error);
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

      // Process context if provided
      let inputText = argv.input as string;
      let contextMetadata: UnknownRecord | undefined;

      if (options.context && options.contextConfig) {
        const processedContextResult = ContextFactory.processContext(
          options.context,
          options.contextConfig,
        );

        // Integrate context into prompt if configured
        if (processedContextResult.processedContext) {
          inputText = processedContextResult.processedContext + inputText;
        }

        // Add context metadata for analytics
        contextMetadata = {
          ...ContextFactory.extractAnalyticsContext(options.context),
          contextMode: processedContextResult.config.mode,
          contextTruncated: processedContextResult.metadata.truncated,
        };

        if (options.debug) {
          logger.debug("Context processed:", {
            mode: processedContextResult.config.mode,
            truncated: processedContextResult.metadata.truncated,
            processingTime: processedContextResult.metadata.processingTime,
          });
        }
      }

      // Handle dry-run mode for testing
      if (options.dryRun) {
        const mockResult = {
          content: "Mock response for testing purposes",
          provider: options.provider || "auto",
          model: options.model || "test-model",
          usage: {
            inputTokens: 10,
            outputTokens: 15,
            totalTokens: 25,
          },
          responseTime: 150,
          analytics: options.enableAnalytics
            ? {
                provider: options.provider || "auto",
                model: options.model || "test-model",
                tokens: { input: 10, output: 15, total: 25 },
                cost: 0.00025,
                responseTime: 150,
                context: contextMetadata,
              }
            : undefined,
          evaluation: options.enableEvaluation
            ? {
                relevance: 8,
                accuracy: 9,
                completeness: 8,
                overall: 8.3,
                isOffTopic: false,
                alertSeverity: "none" as const,
                reasoning: "Test evaluation response",
                evaluationModel: "test-evaluator",
                evaluationTime: 50,
              }
            : undefined,
        };

        if (spinner) {
          spinner.succeed(chalk.green("✅ Dry-run completed successfully!"));
        }

        this.handleOutput(mockResult, options);

        if (options.debug) {
          logger.debug("\n" + chalk.yellow("Debug Information (Dry-run):"));
          logger.debug("Provider:", mockResult.provider);
          logger.debug("Model:", mockResult.model);
          logger.debug("Mode: DRY-RUN (no actual API calls made)");
        }

        process.exit(0);
        return;
      }

      const sdk = new NeuroLink();
      const result = await sdk.generate({
        input: { text: inputText },
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
        context: contextMetadata,
        factoryConfig: options.domain
          ? {
              domainType: options.domain,
              enhancementType: "domain-configuration",
              validateDomainData: true,
            }
          : undefined,
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
      logger.error(
        chalk.red(`❌ Generation failed: ${(error as Error).message}`),
      );
      if (options.debug) {
        logger.error(chalk.gray((error as Error).stack));
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
      logger.always(chalk.blue("🔄 Streaming..."));
    }

    try {
      // Add delay if specified
      if (options.delay) {
        await new Promise((resolve) => setTimeout(resolve, options.delay));
      }

      // Process context if provided (same as generate command)
      let inputText = argv.input as string;
      let contextMetadata: UnknownRecord | undefined;

      if (options.context && options.contextConfig) {
        const processedContextResult = ContextFactory.processContext(
          options.context,
          options.contextConfig,
        );

        // Integrate context into prompt if configured
        if (processedContextResult.processedContext) {
          inputText = processedContextResult.processedContext + inputText;
        }

        // Add context metadata for analytics
        contextMetadata = {
          ...ContextFactory.extractAnalyticsContext(options.context),
          contextMode: processedContextResult.config.mode,
          contextTruncated: processedContextResult.metadata.truncated,
        };

        if (options.debug) {
          logger.debug("Context processed for streaming:", {
            mode: processedContextResult.config.mode,
            truncated: processedContextResult.metadata.truncated,
            processingTime: processedContextResult.metadata.processingTime,
          });
        }
      }

      // Handle dry-run mode for testing
      if (options.dryRun) {
        if (!options.quiet) {
          logger.always(chalk.blue("🔄 Dry-run streaming..."));
        }

        // Simulate streaming output
        const chunks = [
          "Mock ",
          "streaming ",
          "response ",
          "for ",
          "testing ",
          "purposes",
        ];
        let fullContent = "";

        for (const chunk of chunks) {
          process.stdout.write(chunk);
          fullContent += chunk;
          await new Promise((resolve) => setTimeout(resolve, 50)); // Simulate streaming delay
        }

        if (!options.quiet) {
          process.stdout.write("\n");
        }

        // Mock analytics and evaluation for dry-run
        if (options.enableAnalytics) {
          const mockAnalytics: AnalyticsData = {
            provider: options.provider || "auto",
            model: options.model || "test-model",
            requestDuration: 300,
            tokenUsage: {
              inputTokens: 10,
              outputTokens: 15,
              totalTokens: 25,
            },
            timestamp: Date.now(),
            context: contextMetadata as JsonValue,
          };

          const mockGenerateResult: GenerateResult = {
            success: true,
            content: fullContent,
            analytics: mockAnalytics,
            model: mockAnalytics.model,
            toolsUsed: [],
          };

          const analyticsDisplay =
            this.formatAnalyticsForTextMode(mockGenerateResult);
          logger.always(analyticsDisplay);
        }

        if (options.enableEvaluation) {
          logger.always(chalk.blue("\n📊 Response Evaluation (Dry-run):"));
          logger.always(`   Relevance: 8/10`);
          logger.always(`   Accuracy: 9/10`);
          logger.always(`   Completeness: 8/10`);
          logger.always(`   Overall: 8.3/10`);
          logger.always(`   Reasoning: Test evaluation response`);
        }

        if (options.output) {
          fs.writeFileSync(options.output, fullContent);
          if (!options.quiet) {
            logger.always(`\nOutput saved to ${options.output}`);
          }
        }

        if (options.debug) {
          logger.debug(
            "\n" + chalk.yellow("Debug Information (Dry-run Streaming):"),
          );
          logger.debug("Provider:", options.provider || "auto");
          logger.debug("Model:", options.model || "test-model");
          logger.debug("Mode: DRY-RUN (no actual API calls made)");
        }

        process.exit(0);
        return;
      }

      const sdk = new NeuroLink();
      const stream = await sdk.stream({
        input: { text: inputText },
        provider: options.provider,
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        systemPrompt: options.systemPrompt,
        timeout: options.timeout,
        disableTools: options.disableTools,
        enableAnalytics: options.enableAnalytics,
        enableEvaluation: options.enableEvaluation,
        context: contextMetadata,
        factoryConfig: options.domain
          ? {
              domainType: options.domain,
              enhancementType: "domain-configuration",
              validateDomainData: true,
            }
          : undefined,
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

      // 🔧 NEW: Display analytics and evaluation after streaming (similar to generate command)
      if (options.enableAnalytics && stream.analytics) {
        const resolvedAnalytics = await (stream.analytics instanceof Promise
          ? stream.analytics
          : Promise.resolve(stream.analytics));
        const streamAnalytics = {
          success: true,
          content: fullContent,
          analytics: resolvedAnalytics,
          model: stream.model,
          toolsUsed: stream.toolCalls?.map((tc) => tc.toolName) || [],
        };
        const analyticsDisplay = this.formatAnalyticsForTextMode(
          streamAnalytics as unknown as GenerateResult,
        );
        logger.always(analyticsDisplay);
      }

      // 🔧 NEW: Display evaluation after streaming
      if (options.enableEvaluation && stream.evaluation) {
        const resolvedEvaluation = await (stream.evaluation instanceof Promise
          ? stream.evaluation
          : Promise.resolve(stream.evaluation));
        logger.always(chalk.blue("\n📊 Response Evaluation:"));
        logger.always(`   Relevance: ${resolvedEvaluation.relevance}/10`);
        logger.always(`   Accuracy: ${resolvedEvaluation.accuracy}/10`);
        logger.always(`   Completeness: ${resolvedEvaluation.completeness}/10`);
        logger.always(`   Overall: ${resolvedEvaluation.overall}/10`);
        if (resolvedEvaluation.reasoning) {
          logger.always(`   Reasoning: ${resolvedEvaluation.reasoning}`);
        }
      }

      // Handle output file if specified
      if (options.output) {
        fs.writeFileSync(options.output, fullContent);
        if (!options.quiet) {
          logger.always(`\nOutput saved to ${options.output}`);
        }
      }

      // 🔧 NEW: Debug output for streaming (similar to generate command)
      if (options.debug) {
        logger.debug("\n" + chalk.yellow("Debug Information (Streaming):"));
        logger.debug("Provider:", stream.provider);
        logger.debug("Model:", stream.model);
        if (stream.analytics) {
          const resolvedAnalytics = await (stream.analytics instanceof Promise
            ? stream.analytics
            : Promise.resolve(stream.analytics));
          logger.debug(
            "Analytics:",
            JSON.stringify(resolvedAnalytics, null, 2),
          );
        }
        if (stream.evaluation) {
          const resolvedEvaluation = await (stream.evaluation instanceof Promise
            ? stream.evaluation
            : Promise.resolve(stream.evaluation));
          logger.debug(
            "Evaluation:",
            JSON.stringify(resolvedEvaluation, null, 2),
          );
        }
        if (stream.metadata) {
          logger.debug("Metadata:", JSON.stringify(stream.metadata, null, 2));
        }
      }

      process.exit(0);
    } catch (error) {
      logger.error(
        chalk.red(`❌ Streaming failed: ${(error as Error).message}`),
      );
      if (options.debug) {
        logger.error(chalk.gray((error as Error).stack));
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
        logger.always(
          chalk.blue(`📦 Processing ${prompts.length} prompts...\n`),
        );
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
          // Handle dry-run mode for batch processing
          if (options.dryRun) {
            results.push({
              prompt: prompts[i],
              response: `Mock batch response ${i + 1} for testing purposes`,
            });

            if (spinner) {
              spinner.render();
            }
            continue;
          }

          // Process context for each batch item
          let inputText = prompts[i];
          let contextMetadata: UnknownRecord | undefined;

          if (options.context && options.contextConfig) {
            const processedContextResult = ContextFactory.processContext(
              options.context,
              options.contextConfig,
            );

            if (processedContextResult.processedContext) {
              inputText = processedContextResult.processedContext + inputText;
            }

            contextMetadata = {
              ...ContextFactory.extractAnalyticsContext(options.context),
              contextMode: processedContextResult.config.mode,
              contextTruncated: processedContextResult.metadata.truncated,
              batchIndex: i,
            };
          }

          const result = await sdk.generate({
            input: { text: inputText },
            provider: options.provider,
            model: options.model,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
            systemPrompt: options.systemPrompt,
            timeout: options.timeout,
            disableTools: options.disableTools,
            enableAnalytics: options.enableAnalytics,
            enableEvaluation: options.enableEvaluation,
            context: contextMetadata,
            factoryConfig: options.domain
              ? {
                  domainType: options.domain,
                  enhancementType: "domain-configuration",
                  validateDomainData: true,
                }
              : undefined,
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
      logger.error(
        chalk.red(`❌ Batch processing failed: ${(error as Error).message}`),
      );
      if (options.debug) {
        logger.error(chalk.gray((error as Error).stack));
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
      logger.error(
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
          logger.always(
            chalk.green(`🎯 Best available provider: ${bestProvider}`),
          );
        } else {
          this.handleOutput(bestProvider, options);
        }
      }
    } catch (error) {
      logger.error(
        chalk.red(`❌ Provider selection failed: ${(error as Error).message}`),
      );
      process.exit(1);
    }
  }

  /**
   * Execute completion command
   */
  private static async executeCompletion(argv: CLICommandArgs) {
    try {
      // Generate shell completion script as concatenated strings to avoid template literal issues
      const completionScript =
        "#!/usr/bin/env bash\n\n" +
        "# NeuroLink CLI Bash Completion Script\n" +
        "# Generated by: neurolink completion\n" +
        "# \n" +
        "# Installation instructions:\n" +
        "#   1. Save this script to a file (e.g., ~/.neurolink-completion.sh)\n" +
        "#   2. Add to your shell profile: source ~/.neurolink-completion.sh\n" +
        "#   3. Restart your shell or run: source ~/.bashrc\n\n" +
        "_neurolink_completion() {\n" +
        "    local cur prev opts base\n" +
        "    COMPREPLY=()\n" +
        '    cur="${COMP_WORDS[COMP_CWORD]}"\n' +
        '    prev="${COMP_WORDS[COMP_CWORD - 1]}"\n\n' +
        "    # Main commands\n" +
        "    if [[ ${COMP_CWORD} -eq 1 ]]; then\n" +
        '        opts="generate gen stream batch provider status models mcp discover config get-best-provider completion"\n' +
        '        COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )\n' +
        "        return 0\n" +
        "    fi\n\n" +
        "    # Subcommand completion\n" +
        '    case "${COMP_WORDS[1]}" in\n' +
        "        generate|gen)\n" +
        '            case "${prev}" in\n' +
        "                --provider|-p)\n" +
        '                    COMPREPLY=( $(compgen -W "auto openai bedrock vertex googleVertex anthropic azure google-ai huggingface ollama mistral litellm" -- ${cur}) )\n' +
        "                    return 0\n" +
        "                    ;;\n" +
        "                --format|-f|--output-format)\n" +
        '                    COMPREPLY=( $(compgen -W "text json table" -- ${cur}) )\n' +
        "                    return 0\n" +
        "                    ;;\n" +
        "                --model|-m)\n" +
        '                    COMPREPLY=( $(compgen -W "gemini-2.5-pro gemini-2.5-flash gpt-4o gpt-4o-mini claude-3-5-sonnet" -- ${cur}) )\n' +
        "                    return 0\n" +
        "                    ;;\n" +
        "                *)\n" +
        '                    opts="--provider --model --temperature --maxTokens --system --format --output --timeout --delay --disableTools --enableAnalytics --enableEvaluation --debug --quiet --noColor --configFile --dryRun"\n' +
        '                    COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )\n' +
        "                    return 0\n" +
        "                    ;;\n" +
        "            esac\n" +
        "            ;;\n" +
        "        mcp)\n" +
        '            case "${COMP_WORDS[2]}" in\n' +
        "                install)\n" +
        "                    if [[ ${COMP_CWORD} -eq 3 ]]; then\n" +
        '                        COMPREPLY=( $(compgen -W "filesystem github postgres sqlite brave puppeteer git memory bitbucket" -- ${cur}) )\n' +
        "                        return 0\n" +
        "                    fi\n" +
        "                    ;;\n" +
        "                *)\n" +
        "                    if [[ ${COMP_CWORD} -eq 2 ]]; then\n" +
        '                        opts="list install add test exec remove"\n' +
        '                        COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )\n' +
        "                        return 0\n" +
        "                    fi\n" +
        "                    ;;\n" +
        "            esac\n" +
        "            ;;\n" +
        "        provider)\n" +
        "            if [[ ${COMP_CWORD} -eq 2 ]]; then\n" +
        '                COMPREPLY=( $(compgen -W "status" -- ${cur}) )\n' +
        "                return 0\n" +
        "            fi\n" +
        "            ;;\n" +
        "        models)\n" +
        "            if [[ ${COMP_CWORD} -eq 2 ]]; then\n" +
        '                COMPREPLY=( $(compgen -W "list test" -- ${cur}) )\n' +
        "                return 0\n" +
        "            fi\n" +
        "            ;;\n" +
        "        config)\n" +
        "            if [[ ${COMP_CWORD} -eq 2 ]]; then\n" +
        '                COMPREPLY=( $(compgen -W "init show validate reset export" -- ${cur}) )\n' +
        "                return 0\n" +
        "            fi\n" +
        "            ;;\n" +
        "        *)\n" +
        "            # Global options for all commands\n" +
        '            opts="--help --version --debug --quiet --noColor --configFile"\n' +
        '            COMPREPLY=( $(compgen -W "${opts}" -- ${cur}) )\n' +
        "            return 0\n" +
        "            ;;\n" +
        "    esac\n\n" +
        "    # File completion for certain options\n" +
        '    case "${prev}" in\n' +
        "        --output|-o|--configFile)\n" +
        "            COMPREPLY=( $(compgen -f -- ${cur}) )\n" +
        "            return 0\n" +
        "            ;;\n" +
        "        batch)\n" +
        "            COMPREPLY=( $(compgen -f -- ${cur}) )\n" +
        "            return 0\n" +
        "            ;;\n" +
        "    esac\n\n" +
        "    return 0\n" +
        "}\n\n" +
        "# Register the completion function\n" +
        "complete -F _neurolink_completion neurolink\n\n" +
        "# Zsh completion (if running zsh)\n" +
        'if [[ -n "${ZSH_VERSION}" ]]; then\n' +
        "    autoload -U +X bashcompinit && bashcompinit\n" +
        "    complete -F _neurolink_completion neurolink\n" +
        "fi\n\n" +
        'echo "NeuroLink CLI completion script loaded successfully!"\n' +
        'echo "Available commands: generate, stream, batch, provider, status, models, mcp, discover, config, get-best-provider, completion"';

      // Handle output options
      if (argv.output) {
        const fs = await import("fs");
        fs.writeFileSync(argv.output, completionScript);
        if (!argv.quiet) {
          logger.always(`✅ Completion script saved to ${argv.output}`);
          logger.always(`💡 Run: source ${argv.output}`);
        }
      } else {
        logger.always(completionScript);
      }

      if (!argv.quiet) {
        logger.always(chalk.blue("\n📋 Installation Instructions:"));
        logger.always("1. Save the output to a file:");
        logger.always("   neurolink completion > ~/.neurolink-completion.sh");
        logger.always("2. Add to your shell profile:");
        logger.always(
          "   echo 'source ~/.neurolink-completion.sh' >> ~/.bashrc",
        );
        logger.always("3. Restart your shell or run:");
        logger.always("   source ~/.bashrc");
        logger.always(
          chalk.green("\n🎉 Then enjoy tab completion for NeuroLink commands!"),
        );
      }
    } catch (error) {
      logger.error(
        chalk.red(
          `❌ Completion generation failed: ${(error as Error).message}`,
        ),
      );
      process.exit(1);
    }
  }
}
