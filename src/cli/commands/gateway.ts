/**
 * Gateway CLI Commands for NeuroLink
 *
 * Implements comprehensive gateway management commands for the unified model routing system.
 * Provides CLI access to 69+ AI providers through a single interface.
 *
 * Part of Phase 4 - Gateway Provider System Integration
 */

import type { CommandModule, Argv } from "yargs";
import chalk from "chalk";
import ora from "ora";
import { logger } from "../../lib/utils/logger.js";
import type { GatewayCommandArgs } from "../../lib/types/cli.js";

// Gateway imports
import { RegistryFetcher } from "../../lib/gateway/registryFetcher.js";
import { ModelRouter } from "../../lib/gateway/modelRouter.js";
import { getGlobalCache } from "../../lib/gateway/registryCache.js";
import type { GatewayModelInfo } from "../../lib/gateway/types.js";

/**
 * Gateway CLI command factory
 */
export class GatewayCommandFactory {
  /**
   * Create the main gateway command with subcommands
   */
  static createGatewayCommands(): CommandModule {
    return {
      command: "gateway <subcommand>",
      describe:
        "Unified model gateway for 69+ AI providers (Mastra-style routing)",
      builder: (yargs) => {
        return yargs
          .command(
            "models",
            "List available models from dynamic registries",
            (yargs: Argv) => this.buildModelsOptions(yargs),
            this.executeModels,
          )
          .command(
            "search <query>",
            "Search models across all providers",
            (yargs: Argv) => this.buildSearchOptions(yargs),
            this.executeSearch,
          )
          .command(
            "info <model>",
            "Get detailed information about a specific model",
            (yargs: Argv) => this.buildInfoOptions(yargs),
            this.executeInfo,
          )
          .command(
            "providers",
            "List available providers and their status",
            (yargs: Argv) => this.buildProvidersOptions(yargs),
            this.executeProviders,
          )
          .command(
            "refresh",
            "Refresh the model registry cache",
            (yargs: Argv) => this.buildRefreshOptions(yargs),
            this.executeRefresh,
          )
          .command(
            "cache",
            "Show cache statistics",
            (yargs: Argv) => this.buildCacheOptions(yargs),
            this.executeCache,
          )
          .option("format", {
            choices: ["table", "json", "compact"],
            default: "table",
            description: "Output format",
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
          .demandCommand(1, "Please specify a gateway subcommand")
          .help();
      },
      handler: () => {
        // No-op handler as subcommands handle everything
      },
    };
  }

  /**
   * Build options for models command
   */
  private static buildModelsOptions(yargs: Argv): Argv {
    return yargs
      .option("provider", {
        type: "string",
        description: "Filter by provider (e.g., openai, anthropic, google)",
      })
      .option("capability", {
        type: "array",
        description:
          "Filter by capability (e.g., vision, functionCalling, streaming)",
      })
      .option("limit", {
        type: "number",
        default: 50,
        description: "Maximum number of models to display",
      })
      .option("source", {
        choices: ["all", "openrouter", "models.dev"],
        default: "all",
        description: "Registry source to fetch from",
      })
      .example("neurolink gateway models", "List all available gateway models")
      .example(
        "neurolink gateway models --provider openai",
        "List only OpenAI models",
      )
      .example(
        "neurolink gateway models --capability vision",
        "List models with vision capability",
      );
  }

  /**
   * Build options for search command
   */
  private static buildSearchOptions(yargs: Argv): Argv {
    return yargs
      .positional("query", {
        type: "string",
        description: "Search query (model name, provider, or capability)",
        demandOption: true,
      })
      .option("limit", {
        type: "number",
        default: 20,
        description: "Maximum number of results",
      })
      .example(
        "neurolink gateway search claude",
        "Search for models containing 'claude'",
      )
      .example("neurolink gateway search vision", "Search for vision models")
      .example("neurolink gateway search gpt-4", "Search for GPT-4 variants");
  }

  /**
   * Build options for info command
   */
  private static buildInfoOptions(yargs: Argv): Argv {
    return yargs
      .positional("model", {
        type: "string",
        description:
          "Model ID in provider/model format (e.g., openai/gpt-4o, anthropic/claude-3-5-sonnet)",
        demandOption: true,
      })
      .example(
        "neurolink gateway info openai/gpt-4o",
        "Get info about OpenAI GPT-4o",
      )
      .example(
        "neurolink gateway info anthropic/claude-3-5-sonnet",
        "Get info about Claude 3.5 Sonnet",
      );
  }

  /**
   * Build options for providers command
   */
  private static buildProvidersOptions(yargs: Argv): Argv {
    return yargs
      .option("check-keys", {
        type: "boolean",
        default: false,
        description: "Check if API keys are configured for each provider",
      })
      .example(
        "neurolink gateway providers",
        "List all supported gateway providers",
      )
      .example(
        "neurolink gateway providers --check-keys",
        "List providers with API key status",
      );
  }

  /**
   * Build options for refresh command
   */
  private static buildRefreshOptions(yargs: Argv): Argv {
    return yargs
      .option("source", {
        choices: ["all", "openrouter", "models.dev"],
        default: "all",
        description: "Registry source to refresh",
      })
      .example(
        "neurolink gateway refresh",
        "Refresh all model registry caches",
      );
  }

  /**
   * Build options for cache command
   */
  private static buildCacheOptions(yargs: Argv): Argv {
    return yargs
      .option("clear", {
        type: "boolean",
        default: false,
        description: "Clear the cache",
      })
      .example("neurolink gateway cache", "Show cache statistics")
      .example("neurolink gateway cache --clear", "Clear the cache");
  }

  /**
   * Execute models command - list available models from registry
   */
  private static async executeModels(argv: GatewayCommandArgs): Promise<void> {
    try {
      const spinner = argv.quiet
        ? null
        : ora("Fetching models from registry...").start();

      const fetcher = new RegistryFetcher();
      let models: GatewayModelInfo[];

      // Fetch models based on source
      if (argv.provider) {
        models = await fetcher.getProviderModels(argv.provider);
      } else {
        models = await fetcher.getModels();
      }

      // Apply capability filter
      if (argv.capability && Array.isArray(argv.capability)) {
        models = models.filter((model) => {
          return argv.capability!.every((cap) => {
            const capKey = cap as keyof typeof model.capabilities;
            return model.capabilities[capKey] === true;
          });
        });
      }

      // Apply limit
      const limit = argv.limit || 50;
      const displayModels = models.slice(0, limit);

      if (spinner) {
        spinner.succeed(`Found ${models.length} models`);
      }

      // Format and display results
      if (argv.format === "json") {
        logger.always(JSON.stringify(displayModels, null, 2));
      } else if (argv.format === "compact") {
        displayModels.forEach((model) => {
          logger.always(
            `${model.id} (${model.provider}) - ${model.displayName}`,
          );
        });
      } else {
        // Table format
        logger.always(chalk.bold("\n🌐 Gateway Models:\n"));

        for (const model of displayModels) {
          const capabilities: string[] = [];
          if (model.capabilities.imageInput) {
            capabilities.push("vision");
          }
          if (model.capabilities.functionCalling) {
            capabilities.push("tools");
          }
          if (model.capabilities.streaming) {
            capabilities.push("stream");
          }
          if (model.capabilities.thinking) {
            capabilities.push("thinking");
          }

          const capStr =
            capabilities.length > 0
              ? chalk.gray(`[${capabilities.join(", ")}]`)
              : "";

          const pricing = model.pricing
            ? chalk.yellow(
                `$${model.pricing.inputPer1M.toFixed(2)}/${model.pricing.outputPer1M.toFixed(2)} per 1M`,
              )
            : chalk.gray("pricing N/A");

          logger.always(`${chalk.cyan(model.id)} ${capStr}`);
          logger.always(
            `  ${model.displayName} | ${pricing} | ctx: ${model.contextLength || "N/A"}`,
          );
          if (model.description) {
            logger.always(`  ${chalk.gray(model.description.slice(0, 80))}...`);
          }
          logger.always();
        }

        if (models.length > limit) {
          logger.always(
            chalk.gray(
              `\n... and ${models.length - limit} more models (use --limit to show more)`,
            ),
          );
        }
      }
    } catch (error) {
      logger.error(
        chalk.red(`Failed to fetch models: ${(error as Error).message}`),
      );
      process.exit(1);
    }
  }

  /**
   * Execute search command - search models across all providers
   */
  private static async executeSearch(argv: GatewayCommandArgs): Promise<void> {
    try {
      const spinner = argv.quiet ? null : ora("Searching models...").start();

      const fetcher = new RegistryFetcher();
      const query = argv.query || "";
      const results = await fetcher.searchModels(query);

      const limit = argv.limit || 20;
      const displayResults = results.slice(0, limit);

      if (spinner) {
        spinner.succeed(`Found ${results.length} matching models`);
      }

      if (results.length === 0) {
        logger.always(chalk.yellow("No models found matching your query."));
        return;
      }

      // Format and display results
      if (argv.format === "json") {
        logger.always(JSON.stringify(displayResults, null, 2));
      } else {
        logger.always(chalk.bold(`\n🔍 Search Results for "${query}":\n`));

        displayResults.forEach((model, index) => {
          logger.always(
            `${index + 1}. ${chalk.cyan(model.id)} (${model.provider})`,
          );
          logger.always(`   ${model.displayName}`);
          if (model.description) {
            logger.always(`   ${chalk.gray(model.description.slice(0, 100))}`);
          }
          logger.always();
        });

        if (results.length > limit) {
          logger.always(
            chalk.gray(`\n... and ${results.length - limit} more results`),
          );
        }
      }
    } catch (error) {
      logger.error(chalk.red(`Search failed: ${(error as Error).message}`));
      process.exit(1);
    }
  }

  /**
   * Execute info command - get detailed model information
   */
  private static async executeInfo(argv: GatewayCommandArgs): Promise<void> {
    try {
      const spinner = argv.quiet
        ? null
        : ora("Fetching model information...").start();

      const modelId = argv.model || "";
      const router = new ModelRouter();
      const modelInfo = await router.getModelInfo(modelId);

      if (spinner) {
        spinner.stop();
      }

      if (!modelInfo) {
        logger.always(chalk.red(`Model not found: ${modelId}`));
        logger.always(
          chalk.gray(
            'Try "neurolink gateway search <query>" to find available models.',
          ),
        );
        process.exit(1);
      }

      // Format and display model info
      if (argv.format === "json") {
        logger.always(JSON.stringify(modelInfo, null, 2));
      } else {
        logger.always(chalk.bold(`\n📋 Model Information: ${modelId}\n`));

        logger.always(`${chalk.cyan("ID:")} ${modelInfo.id}`);
        logger.always(`${chalk.cyan("Provider:")} ${modelInfo.provider}`);
        logger.always(`${chalk.cyan("Name:")} ${modelInfo.displayName}`);
        if (modelInfo.description) {
          logger.always(
            `${chalk.cyan("Description:")} ${modelInfo.description}`,
          );
        }
        logger.always(
          `${chalk.cyan("Context Length:")} ${modelInfo.contextLength || "N/A"} tokens`,
        );
        if (modelInfo.maxOutputTokens) {
          logger.always(
            `${chalk.cyan("Max Output:")} ${modelInfo.maxOutputTokens} tokens`,
          );
        }

        if (modelInfo.pricing) {
          logger.always(chalk.bold("\n💰 Pricing:"));
          logger.always(
            `   Input: $${modelInfo.pricing.inputPer1M.toFixed(4)} per 1M tokens`,
          );
          logger.always(
            `   Output: $${modelInfo.pricing.outputPer1M.toFixed(4)} per 1M tokens`,
          );
        }

        logger.always(chalk.bold("\n🛠️  Capabilities:"));
        const caps = modelInfo.capabilities;
        const capEntries = Object.entries(caps).filter(
          ([, value]) => value === true,
        );
        if (capEntries.length > 0) {
          capEntries.forEach(([key]) => {
            logger.always(`   ${chalk.green("✓")} ${key}`);
          });
        } else {
          logger.always(`   ${chalk.gray("No special capabilities listed")}`);
        }

        // Show routing strategy
        const strategy = router.getRoutingStrategy(modelInfo.provider);
        logger.always(chalk.bold("\n🔀 Routing:"));
        logger.always(`   Strategy: ${chalk.cyan(strategy)}`);
      }
    } catch (error) {
      logger.error(
        chalk.red(`Failed to get model info: ${(error as Error).message}`),
      );
      process.exit(1);
    }
  }

  /**
   * Execute providers command - list available providers
   */
  private static async executeProviders(
    argv: GatewayCommandArgs,
  ): Promise<void> {
    try {
      const spinner = argv.quiet
        ? null
        : ora("Fetching provider information...").start();

      const fetcher = new RegistryFetcher();
      const router = new ModelRouter();
      const models = await fetcher.getModels();

      // Group models by provider
      const providerMap = new Map<
        string,
        { count: number; hasApiKey: boolean; routing: string }
      >();

      for (const model of models) {
        if (!providerMap.has(model.provider)) {
          const routing = router.getRoutingStrategy(model.provider);
          let hasApiKey = false;

          if (argv.checkKeys) {
            // Check common API key environment variables
            const keyPatterns = [
              `${model.provider.toUpperCase()}_API_KEY`,
              `${model.provider.toUpperCase().replace(/-/g, "_")}_API_KEY`,
            ];
            hasApiKey = keyPatterns.some((key) => !!process.env[key]);
          }

          providerMap.set(model.provider, {
            count: 0,
            hasApiKey,
            routing,
          });
        }

        const info = providerMap.get(model.provider)!;
        info.count++;
      }

      if (spinner) {
        spinner.succeed(`Found ${providerMap.size} providers`);
      }

      // Sort providers by model count
      const sortedProviders = Array.from(providerMap.entries()).sort(
        ([, a], [, b]) => b.count - a.count,
      );

      // Format and display results
      if (argv.format === "json") {
        const output = sortedProviders.map(([provider, info]) => ({
          provider,
          ...info,
        }));
        logger.always(JSON.stringify(output, null, 2));
      } else {
        logger.always(chalk.bold("\n🏢 Gateway Providers:\n"));

        for (const [provider, info] of sortedProviders) {
          const routingBadge =
            info.routing === "direct"
              ? chalk.green("[direct]")
              : chalk.blue(`[${info.routing}]`);

          const keyStatus = argv.checkKeys
            ? info.hasApiKey
              ? chalk.green("✓ key")
              : chalk.red("✗ no key")
            : "";

          logger.always(
            `${chalk.cyan(provider.padEnd(20))} ${String(info.count).padStart(4)} models ${routingBadge} ${keyStatus}`,
          );
        }

        logger.always(
          chalk.gray(
            `\nTotal: ${models.length} models from ${providerMap.size} providers`,
          ),
        );
      }
    } catch (error) {
      logger.error(
        chalk.red(`Failed to list providers: ${(error as Error).message}`),
      );
      process.exit(1);
    }
  }

  /**
   * Execute refresh command - refresh the model registry cache
   */
  private static async executeRefresh(argv: GatewayCommandArgs): Promise<void> {
    try {
      const spinner = argv.quiet
        ? null
        : ora("Refreshing model registry...").start();

      const fetcher = new RegistryFetcher();
      await fetcher.refresh();

      if (spinner) {
        spinner.succeed("Model registry refreshed successfully");
      }

      // Show updated stats
      const models = await fetcher.getModels();
      logger.always(
        chalk.green(`\n✓ Registry now contains ${models.length} models`),
      );
    } catch (error) {
      logger.error(
        chalk.red(`Failed to refresh registry: ${(error as Error).message}`),
      );
      process.exit(1);
    }
  }

  /**
   * Execute cache command - show or manage cache
   */
  private static async executeCache(argv: GatewayCommandArgs): Promise<void> {
    try {
      const cache = getGlobalCache();

      if (argv.clear) {
        cache.clear();
        logger.always(chalk.green("✓ Cache cleared successfully"));
        return;
      }

      const stats = cache.getStats();
      const hitRate = cache.getHitRate();

      if (argv.format === "json") {
        logger.always(
          JSON.stringify({ ...stats, hitRate: `${hitRate}%` }, null, 2),
        );
      } else {
        logger.always(chalk.bold("\n📊 Gateway Cache Statistics:\n"));

        logger.always(`${chalk.cyan("Entries:")} ${stats.entries}`);
        logger.always(`${chalk.cyan("Hits:")} ${stats.hits}`);
        logger.always(`${chalk.cyan("Misses:")} ${stats.misses}`);
        logger.always(`${chalk.cyan("Hit Rate:")} ${hitRate}%`);
        logger.always(
          `${chalk.cyan("Last Cleanup:")} ${new Date(stats.lastCleanup).toISOString()}`,
        );
      }
    } catch (error) {
      logger.error(
        chalk.red(`Failed to get cache stats: ${(error as Error).message}`),
      );
      process.exit(1);
    }
  }
}
