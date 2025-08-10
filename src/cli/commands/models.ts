/**
 * Models CLI Commands for NeuroLink
 * Implements comprehensive model management commands
 * Part of Phase 4.1 - Models Command System
 */

import type { CommandModule, Argv } from "yargs";
import type { AIProviderName } from "../../lib/core/types.js";
import type { UnknownRecord } from "../../lib/types/common.js";
import type { ModelsCommandArgs } from "../../lib/types/cli.js";
import type {
  ModelCapability,
  ModelUseCase,
  ModelFilter,
  ModelResolutionContext,
  ModelStats,
  ModelPricing,
} from "../../lib/types/providers.js";
import {
  ModelResolver,
  formatSearchResults,
  formatRecommendation,
  formatComparison,
} from "../../lib/models/modelResolver.js";
import {
  getAllModels,
  getModelsByProvider,
  getAvailableProviders,
  formatModelForDisplay,
  type ModelSearchFilters,
  type ModelCapabilities,
  type UseCaseSuitability,
} from "../../lib/models/modelRegistry.js";
import type { RecommendationContext } from "../../lib/models/modelResolver.js";
import chalk from "chalk";
import ora from "ora";

import { logger } from "../../lib/utils/logger.js";
/**
 * Type-safe mapping functions to convert CLI types to SDK types
 */

// Map CLI capability queries to SDK ModelCapabilities keys
function mapQueryToCapability(
  query: string,
): keyof ModelCapabilities | undefined {
  const queryLower = query.toLowerCase();
  const mappings: Record<string, keyof ModelCapabilities> = {
    vision: "vision",
    function: "functionCalling",
    code: "codeGeneration",
    reasoning: "reasoning",
    multimodal: "multimodal",
    streaming: "streaming",
    json: "jsonMode",
  };

  // Find matching capability
  for (const [key, capability] of Object.entries(mappings)) {
    if (queryLower.includes(key)) {
      return capability;
    }
  }
  return undefined;
}

// Map CLI use cases to SDK UseCaseSuitability keys
function mapUseCaseToSuitability(
  useCase: string,
): keyof UseCaseSuitability | undefined {
  const mappings: Record<string, keyof UseCaseSuitability> = {
    chat: "conversation",
    coding: "coding",
    creative: "creative",
    analysis: "analysis",
    reasoning: "reasoning",
    translation: "translation",
    summarization: "summarization",
  };

  return mappings[useCase.toLowerCase()];
}

// Map CLI requirement flags to SDK ModelCapabilities keys
function mapRequirementToCapability(
  requirement: string,
): keyof ModelCapabilities | undefined {
  const mappings: Record<string, keyof ModelCapabilities> = {
    vision: "vision",
    functionCalling: "functionCalling",
  };

  return mappings[requirement];
}

/**
 * Models command arguments interface (extended)
 */
interface Extended_ModelsCommandArgs extends UnknownRecord {
  // List command options
  provider?: AIProviderName | AIProviderName[];
  category?: string;
  capability?: string[];
  deprecated?: boolean;

  // Search command options
  query?: string;
  useCase?: string;
  maxCost?: number;
  minContext?: number;
  maxContext?: number;
  performance?: "fast" | "medium" | "slow" | "high" | "low";

  // Best command options
  coding?: boolean;
  creative?: boolean;
  analysis?: boolean;
  conversation?: boolean;
  reasoning?: boolean;
  translation?: boolean;
  summarization?: boolean;
  costEffective?: boolean;
  highQuality?: boolean;
  fast?: boolean;
  requireVision?: boolean;
  requireFunctionCalling?: boolean;
  excludeProviders?: string[];
  preferLocal?: boolean;

  // Resolve command options
  model?: string;
  fuzzy?: boolean;

  // Compare command options
  models?: string[];

  // Stats command options
  detailed?: boolean;

  // Output formatting
  format?: "table" | "json" | "compact";
  output?: string;
  quiet?: boolean;
  debug?: boolean;
}

/**
 * Models CLI command factory
 */
export class ModelsCommandFactory {
  /**
   * Create the main models command with subcommands
   */
  static createModelsCommands(): CommandModule {
    return {
      command: "models <subcommand>",
      describe: "Manage and discover AI models",
      builder: (yargs) => {
        return yargs
          .command(
            "list",
            "List available models with filtering options",
            this.buildListOptions,
            this.executeList,
          )
          .command(
            "search [query]",
            "Search models by capabilities, use case, or features",
            this.buildSearchOptions,
            this.executeSearch,
          )
          .command(
            "best",
            "Get the best model recommendation for your use case",
            this.buildBestOptions,
            this.executeBest,
          )
          .command(
            "resolve <model>",
            "Resolve model aliases and find exact model names",
            this.buildResolveOptions,
            this.executeResolve,
          )
          .command(
            "compare <models..>",
            "Compare multiple models side by side",
            this.buildCompareOptions,
            this.executeCompare,
          )
          .command(
            "stats",
            "Show model registry statistics and insights",
            this.buildStatsOptions,
            this.executeStats,
          )
          .option("format", {
            choices: ["table", "json", "compact"],
            default: "table",
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
          .demandCommand(1, "Please specify a models subcommand")
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
      .option("provider", {
        choices: [
          "openai",
          "bedrock",
          "vertex",
          "anthropic",
          "azure",
          "google-ai",
          "huggingface",
          "ollama",
          "mistral",
        ],
        description: "Filter by AI provider",
      })
      .option("category", {
        choices: ["general", "coding", "creative", "vision", "reasoning"],
        description: "Filter by model category",
      })
      .option("capability", {
        type: "array",
        choices: [
          "vision",
          "functionCalling",
          "codeGeneration",
          "reasoning",
          "multimodal",
          "streaming",
          "jsonMode",
        ],
        description: "Filter by required capabilities",
      })
      .option("deprecated", {
        type: "boolean",
        default: false,
        description: "Include deprecated models",
      })
      .example("neurolink models list", "List all available models")
      .example(
        "neurolink models list --provider openai",
        "List OpenAI models only",
      )
      .example(
        "neurolink models list --capability vision",
        "List models with vision capability",
      )
      .example(
        "neurolink models list --category coding",
        "List coding-focused models",
      );
  }

  /**
   * Build options for search command
   */
  private static buildSearchOptions(yargs: Argv): Argv {
    return yargs
      .positional("query", {
        type: "string",
        description: "Search query (capability, use case, or model name)",
      })
      .option("use-case", {
        choices: [
          "coding",
          "creative",
          "analysis",
          "conversation",
          "reasoning",
          "translation",
          "summarization",
        ],
        description: "Filter by primary use case",
      })
      .option("max-cost", {
        type: "number",
        description: "Maximum cost per 1K tokens (USD)",
      })
      .option("min-context", {
        type: "number",
        description: "Minimum context window size (tokens)",
      })
      .option("max-context", {
        type: "number",
        description: "Maximum context window size (tokens)",
      })
      .option("performance", {
        choices: ["fast", "medium", "slow", "high", "low"],
        description: "Required performance level (speed or quality)",
      })
      .example(
        "neurolink models search vision",
        "Search for models with vision capabilities",
      )
      .example(
        "neurolink models search --use-case coding --max-cost 0.01",
        "Find coding models under $0.01/1K tokens",
      )
      .example(
        "neurolink models search --min-context 100000",
        "Find models with large context windows",
      );
  }

  /**
   * Build options for best command
   */
  private static buildBestOptions(yargs: Argv): Argv {
    return yargs
      .option("coding", {
        type: "boolean",
        description: "Optimize for code generation and programming",
      })
      .option("creative", {
        type: "boolean",
        description: "Optimize for creative writing and content",
      })
      .option("analysis", {
        type: "boolean",
        description: "Optimize for data analysis and research",
      })
      .option("conversation", {
        type: "boolean",
        description: "Optimize for conversational interactions",
      })
      .option("reasoning", {
        type: "boolean",
        description: "Optimize for logical reasoning tasks",
      })
      .option("translation", {
        type: "boolean",
        description: "Optimize for language translation",
      })
      .option("summarization", {
        type: "boolean",
        description: "Optimize for text summarization",
      })
      .option("cost-effective", {
        type: "boolean",
        description: "Prioritize cost-effectiveness",
      })
      .option("high-quality", {
        type: "boolean",
        description: "Prioritize output quality over cost",
      })
      .option("fast", {
        type: "boolean",
        description: "Prioritize response speed",
      })
      .option("require-vision", {
        type: "boolean",
        description: "Require vision/image processing capability",
      })
      .option("require-function-calling", {
        type: "boolean",
        description: "Require function calling capability",
      })
      .option("exclude-providers", {
        type: "array",
        description: "Exclude specific providers",
      })
      .option("prefer-local", {
        type: "boolean",
        description: "Prefer local/offline models",
      })
      .example(
        "neurolink models best --coding",
        "Get best model for coding tasks",
      )
      .example(
        "neurolink models best --cost-effective --require-vision",
        "Get cheapest model with vision",
      )
      .example(
        "neurolink models best --fast --exclude-providers ollama",
        "Get fastest non-local model",
      );
  }

  /**
   * Build options for resolve command
   */
  private static buildResolveOptions(yargs: Argv): Argv {
    return yargs
      .positional("model", {
        type: "string",
        description: "Model name, alias, or partial match to resolve",
        demandOption: true,
      })
      .option("fuzzy", {
        type: "boolean",
        default: true,
        description: "Enable fuzzy matching for partial names",
      })
      .example(
        "neurolink models resolve claude-latest",
        "Resolve claude-latest alias",
      )
      .example("neurolink models resolve gpt4", "Fuzzy match for GPT-4 models")
      .example(
        "neurolink models resolve fastest",
        "Resolve fastest model alias",
      );
  }

  /**
   * Build options for compare command
   */
  private static buildCompareOptions(yargs: Argv): Argv {
    return yargs
      .positional("models", {
        type: "string",
        array: true,
        description: "Model IDs or aliases to compare",
        demandOption: true,
      })
      .example(
        "neurolink models compare gpt-4o claude-3.5-sonnet gemini-2.5-pro",
        "Compare three flagship models",
      )
      .example(
        "neurolink models compare fastest cheapest best-coding",
        "Compare models by alias",
      );
  }

  /**
   * Build options for stats command
   */
  private static buildStatsOptions(yargs: Argv): Argv {
    return yargs
      .option("detailed", {
        type: "boolean",
        default: false,
        description: "Show detailed statistics breakdown",
      })
      .example("neurolink models stats", "Show model registry statistics")
      .example(
        "neurolink models stats --detailed",
        "Show detailed statistics with breakdowns",
      );
  }

  /**
   * Execute list command
   */
  private static async executeList(
    argv: Extended_ModelsCommandArgs,
  ): Promise<void> {
    try {
      const spinner = argv.quiet
        ? null
        : ora("Loading model registry...").start();

      let models = getAllModels();

      // Apply filters
      if (argv.provider) {
        const providers = Array.isArray(argv.provider)
          ? argv.provider
          : [argv.provider];
        models = models.filter((model) => providers.includes(model.provider));
      }

      if (argv.category) {
        models = models.filter((model) => model.category === argv.category);
      }

      if (argv.capability) {
        models = models.filter((model) => {
          return argv.capability!.every(
            (cap) => model.capabilities[cap as keyof typeof model.capabilities],
          );
        });
      }

      if (!argv.deprecated) {
        models = models.filter((model) => !model.deprecated);
      }

      if (spinner) {
        spinner.succeed(`Found ${models.length} models`);
      }

      // Format and display results
      if (argv.format === "json") {
        const output = models.map(formatModelForDisplay);
        logger.always(JSON.stringify(output, null, 2));
      } else if (argv.format === "compact") {
        models.forEach((model) => {
          logger.always(
            `${model.id} (${model.provider}) - ${model.description}`,
          );
        });
      } else {
        // Table format
        logger.always(chalk.bold("\n📋 Available Models:\n"));

        for (const model of models) {
          const status = model.deprecated
            ? chalk.red("DEPRECATED")
            : chalk.green("ACTIVE");
          const cost =
            model.pricing.inputCostPer1K === 0
              ? chalk.green("FREE")
              : `$${(model.pricing.inputCostPer1K + model.pricing.outputCostPer1K).toFixed(6)}/1K`;

          logger.always(`${chalk.cyan(model.id)} ${status}`);
          logger.always(
            `  Provider: ${model.provider} | Category: ${model.category}`,
          );
          logger.always(
            `  Cost: ${cost} | Context: ${(model.limits.maxContextTokens / 1000).toFixed(0)}K tokens`,
          );
          logger.always(`  ${chalk.gray(model.description)}`);
          logger.always();
        }
      }
    } catch (error) {
      logger.error(
        chalk.red(`❌ List command failed: ${(error as Error).message}`),
      );
      process.exit(1);
    }
  }

  /**
   * Execute search command
   */
  private static async executeSearch(
    argv: Extended_ModelsCommandArgs,
  ): Promise<void> {
    try {
      const spinner = argv.quiet ? null : ora("Searching models...").start();

      // Build search filters
      const filters: ModelSearchFilters = {};

      if (argv.query) {
        // Use type-safe capability mapping
        const mappedCapability = mapQueryToCapability(argv.query);
        if (mappedCapability) {
          filters.capability = mappedCapability;
        }
      }

      if (argv.useCase) {
        // Use type-safe use case mapping
        const mappedUseCase = mapUseCaseToSuitability(argv.useCase);
        if (mappedUseCase) {
          filters.useCase = mappedUseCase;
        }
      }

      if (argv.maxCost) {
        filters.maxCost = argv.maxCost;
      }

      if (argv.minContext) {
        filters.minContextSize = argv.minContext;
      }

      if (argv.maxContext) {
        filters.maxContextSize = argv.maxContext;
      }

      if (argv.performance) {
        filters.performance = argv.performance;
      }

      const results = ModelResolver.searchModels(filters);

      if (spinner) {
        spinner.succeed(`Found ${results.length} matching models`);
      }

      if (results.length === 0) {
        logger.always(chalk.yellow("No models found matching your criteria."));
        return;
      }

      // Display results
      if (argv.format === "json") {
        logger.always(JSON.stringify(formatSearchResults(results), null, 2));
      } else {
        logger.always(chalk.bold("\n🔍 Search Results:\n"));

        results.slice(0, 10).forEach((result, index) => {
          logger.always(
            `${index + 1}. ${chalk.cyan(result.model.id)} (Score: ${result.score})`,
          );
          logger.always(`   ${result.model.description}`);
          logger.always(
            `   Matches: ${chalk.green(result.matchReasons.join(", "))}`,
          );
          logger.always();
        });

        if (results.length > 10) {
          logger.always(
            chalk.gray(`... and ${results.length - 10} more results`),
          );
        }
      }
    } catch (error) {
      logger.error(
        chalk.red(`❌ Search command failed: ${(error as Error).message}`),
      );
      process.exit(1);
    }
  }

  /**
   * Execute best command
   */
  private static async executeBest(
    argv: Extended_ModelsCommandArgs,
  ): Promise<void> {
    try {
      const spinner = argv.quiet ? null : ora("Finding best model...").start();

      // Build recommendation context
      const context: RecommendationContext = {};

      // Determine use case from flags
      if (argv.coding) {
        context.useCase = "coding";
      } else if (argv.creative) {
        context.useCase = "creative";
      } else if (argv.analysis) {
        context.useCase = "analysis";
      } else if (argv.conversation) {
        context.useCase = "conversation";
      } else if (argv.reasoning) {
        context.useCase = "reasoning";
      } else if (argv.translation) {
        context.useCase = "translation";
      } else if (argv.summarization) {
        context.useCase = "summarization";
      }

      // Apply other preferences
      if (argv.costEffective) {
        context.maxCost = 0.01;
      }
      if (argv.highQuality) {
        context.minQuality = "high";
      }
      if (argv.preferLocal) {
        context.preferLocal = true;
      }

      // Required capabilities - build with correct type from start
      const requiredCapabilities: (keyof ModelCapabilities)[] = [];
      if (argv.requireVision) {
        const mapped = mapRequirementToCapability("vision");
        if (mapped) {
          requiredCapabilities.push(mapped);
        }
      }
      if (argv.requireFunctionCalling) {
        const mapped = mapRequirementToCapability("functionCalling");
        if (mapped) {
          requiredCapabilities.push(mapped);
        }
      }
      if (requiredCapabilities.length > 0) {
        // Now we can assign safely since types match
        context.requireCapabilities = requiredCapabilities;
      }

      // Excluded providers
      if (argv.excludeProviders) {
        context.excludeProviders = argv.excludeProviders as AIProviderName[];
      }

      const recommendation = ModelResolver.getBestModel(context);

      if (spinner) {
        spinner.succeed("Found best model recommendation");
      }

      // Display recommendation
      if (argv.format === "json") {
        logger.always(
          JSON.stringify(formatRecommendation(recommendation), null, 2),
        );
      } else {
        logger.always(chalk.bold("\n🎯 Best Model Recommendation:\n"));

        const model = recommendation.model;
        logger.always(
          `${chalk.green("✅")} ${chalk.cyan(model.id)} (${model.name})`,
        );
        logger.always(
          `   Provider: ${model.provider} | Category: ${model.category}`,
        );
        logger.always(`   Score: ${recommendation.score}/100`);
        logger.always();

        logger.always(chalk.bold("📋 Why this model:"));
        recommendation.reasoning.forEach((reason) => {
          logger.always(`   • ${reason}`);
        });
        logger.always();

        if (recommendation.alternatives.length > 0) {
          logger.always(chalk.bold("🔄 Alternatives to consider:"));
          recommendation.alternatives.slice(0, 3).forEach((alt) => {
            logger.always(`   • ${alt.id} (${alt.provider})`);
          });
        }
      }
    } catch (error) {
      logger.error(
        chalk.red(`❌ Best command failed: ${(error as Error).message}`),
      );
      process.exit(1);
    }
  }

  /**
   * Execute resolve command
   */
  private static async executeResolve(
    argv: Extended_ModelsCommandArgs,
  ): Promise<void> {
    try {
      const query = argv.model!;
      const model = ModelResolver.resolveModel(query);

      if (!model) {
        logger.always(chalk.red(`❌ Could not resolve model: ${query}`));

        // Suggest similar models
        const allModels = getAllModels();
        const similar = allModels
          .filter(
            (m) =>
              m.id.toLowerCase().includes(query.toLowerCase()) ||
              m.name.toLowerCase().includes(query.toLowerCase()),
          )
          .slice(0, 3);

        if (similar.length > 0) {
          logger.always(chalk.yellow("\n💡 Did you mean:"));
          similar.forEach((m) => logger.always(`   • ${m.id}`));
        }

        process.exit(1);
      }

      // Display resolution
      if (argv.format === "json") {
        logger.always(JSON.stringify(formatModelForDisplay(model), null, 2));
      } else {
        logger.always(chalk.bold("\n🔍 Model Resolution:\n"));

        logger.always(`Query: ${chalk.yellow(query)}`);
        logger.always(`Resolved: ${chalk.green(model.id)}`);
        logger.always(`Name: ${model.name}`);
        logger.always(`Provider: ${model.provider}`);
        logger.always(`Description: ${chalk.gray(model.description)}`);

        if (model.aliases.length > 0) {
          logger.always(`Aliases: ${model.aliases.join(", ")}`);
        }
      }
    } catch (error) {
      logger.error(
        chalk.red(`❌ Resolve command failed: ${(error as Error).message}`),
      );
      process.exit(1);
    }
  }

  /**
   * Execute compare command
   */
  private static async executeCompare(
    argv: Extended_ModelsCommandArgs,
  ): Promise<void> {
    try {
      const modelIds = argv.models!;
      const comparison = ModelResolver.compareModels(modelIds);

      if (argv.format === "json") {
        logger.always(JSON.stringify(formatComparison(comparison), null, 2));
      } else {
        logger.always(chalk.bold("\n⚖️  Model Comparison:\n"));

        // Display models being compared
        logger.always(chalk.bold("Models:"));
        comparison.models.forEach((model, index) => {
          logger.always(
            `${index + 1}. ${chalk.cyan(model.id)} (${model.provider})`,
          );
        });
        logger.always();

        // Pricing comparison
        logger.always(chalk.bold("💰 Pricing:"));
        logger.always(
          `   Cheapest: ${chalk.green(comparison.comparison.pricing.cheapest.id)}`,
        );
        logger.always(
          `   Most Expensive: ${chalk.red(comparison.comparison.pricing.mostExpensive.id)}`,
        );
        logger.always();

        // Context size comparison
        logger.always(chalk.bold("📏 Context Size:"));
        logger.always(
          `   Largest: ${chalk.green(comparison.comparison.contextSize.largest.id)}`,
        );
        logger.always(
          `   Smallest: ${chalk.yellow(comparison.comparison.contextSize.smallest.id)}`,
        );
        logger.always();

        // Capabilities comparison
        logger.always(chalk.bold("🛠️  Capabilities:"));
        Object.entries(comparison.comparison.capabilities).forEach(
          ([capability, models]) => {
            if (models.length > 0) {
              logger.always(
                `   ${capability}: ${models.map((m) => m.id).join(", ")}`,
              );
            }
          },
        );
      }
    } catch (error) {
      logger.error(
        chalk.red(`❌ Compare command failed: ${(error as Error).message}`),
      );
      process.exit(1);
    }
  }

  /**
   * Execute stats command
   */
  private static async executeStats(
    argv: Extended_ModelsCommandArgs,
  ): Promise<void> {
    try {
      const stats = ModelResolver.getModelStatistics();

      if (argv.format === "json") {
        logger.always(JSON.stringify(stats, null, 2));
      } else {
        logger.always(chalk.bold("\n📊 Model Registry Statistics:\n"));

        if (typeof stats === "object" && stats !== null) {
          const statsObj = stats as Record<string, unknown>;
          logger.always(`Total Models: ${chalk.cyan(statsObj.total)}`);
          logger.always(`Providers: ${chalk.cyan(statsObj.providers)}`);
          logger.always(`Deprecated: ${chalk.yellow(statsObj.deprecated)}`);
          logger.always();

          logger.always(chalk.bold("By Provider:"));
          Object.entries(statsObj.byProvider as Record<string, number>).forEach(
            ([provider, count]) => {
              logger.always(`   ${provider}: ${count}`);
            },
          );
          logger.always();

          logger.always(chalk.bold("By Category:"));
          Object.entries(statsObj.byCategory as Record<string, number>).forEach(
            ([category, count]) => {
              logger.always(`   ${category}: ${count}`);
            },
          );
          logger.always();

          if (argv.detailed) {
            logger.always(chalk.bold("Capability Distribution:"));
            Object.entries(
              statsObj.capabilities as Record<string, number>,
            ).forEach(([capability, count]) => {
              logger.always(`   ${capability}: ${count} models`);
            });
            logger.always();

            const pricing = statsObj.pricing as ModelPricing;
            logger.always(chalk.bold("Pricing Overview:"));
            logger.always(
              `   Average: $${(pricing.average || 0).toFixed(6)}/1K tokens`,
            );
            logger.always(
              `   Range: $${(pricing.min || 0).toFixed(6)} - $${(pricing.max || 0).toFixed(6)}/1K`,
            );
            logger.always(`   Free models: ${pricing.free || false}`);
          }
        }
      }
    } catch (error) {
      logger.error(
        chalk.red(`❌ Stats command failed: ${(error as Error).message}`),
      );
      process.exit(1);
    }
  }
}
