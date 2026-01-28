/**
 * Vector Store CLI Commands for NeuroLink
 * Implements commands for vector store management and embedding operations
 */

import type { CommandModule, Argv } from "yargs";
import chalk from "chalk";
import ora from "ora";
import { logger } from "../../lib/utils/logger.js";
import {
  EmbeddingProviderFactory,
  EmbeddingProviderRegistry,
  EmbeddingProviderName,
  EMBEDDING_MODELS,
  EMBEDDING_PRESETS,
  getModelsForProvider,
} from "../../lib/embeddings/index.js";
import { VectorStoreFactory } from "../../lib/stores/vectorStoreFactory.js";
import { VectorStoreRegistry } from "../../lib/stores/vectorStoreRegistry.js";
import type {
  VectorIndexConfig,
  VectorRecord,
  VectorQueryOptions,
  SimilarityMetric,
} from "../../lib/types/vectorTypes.js";
import type { BaseVectorStore } from "../../lib/stores/baseVectorStore.js";
import fs from "fs";
import path from "path";

/**
 * Vector command arguments type
 */
type VectorCommandArgs = {
  format?: "table" | "json" | "compact";
  quiet?: boolean;
  debug?: boolean;
  provider?: string;
  model?: string;
  output?: string;
  text?: string;
  texts?: string[];
  file?: string;
  batchSize?: number;
  dimensions?: number;
  // Vector store specific options
  store?: string;
  name?: string;
  index?: string;
  dimension?: number;
  metric?: "cosine" | "euclidean" | "dotProduct";
  query?: string;
  topK?: number;
  vector?: string;
  includeVectors?: boolean;
  includeMetadata?: boolean;
  namespace?: string;
};

/**
 * Vector CLI command factory
 */
export class VectorCommandFactory {
  /**
   * Create the main vector command with subcommands
   */
  static createVectorCommands(): CommandModule {
    return {
      command: "vector <subcommand>",
      describe: "Manage vector stores and embeddings",
      builder: (yargs) => {
        return (
          yargs
            .command(
              "list-stores",
              "List available vector store integrations",
              (y) => this.buildListStoresOptions(y),
              async (argv) => this.executeListStores(argv as VectorCommandArgs),
            )
            .command(
              "list-providers",
              "List available embedding providers",
              (y) => this.buildListProvidersOptions(y),
              async (argv) =>
                this.executeListProviders(argv as VectorCommandArgs),
            )
            .command(
              "list-models",
              "List available embedding models",
              (y) => this.buildListModelsOptions(y),
              async (argv) => this.executeListModels(argv as VectorCommandArgs),
            )
            .command(
              "embed <text>",
              "Generate embedding for a single text",
              (y) => this.buildEmbedOptions(y),
              async (argv) => this.executeEmbed(argv as VectorCommandArgs),
            )
            .command(
              "embed-batch",
              "Generate embeddings for multiple texts",
              (y) => this.buildEmbedBatchOptions(y),
              async (argv) => this.executeEmbedBatch(argv as VectorCommandArgs),
            )
            .command(
              "stats",
              "Show vector store and embedding statistics",
              (y) => this.buildStatsOptions(y),
              async (argv) => this.executeStats(argv as VectorCommandArgs),
            )
            .command(
              "presets",
              "Show recommended embedding presets for common use cases",
              (y) => this.buildPresetsOptions(y),
              async (argv) => this.executePresets(argv as VectorCommandArgs),
            )
            // Vector store management commands
            .command(
              "create-index",
              "Create a new vector index in a store",
              (y) => this.buildCreateIndexOptions(y),
              async (argv) =>
                this.executeCreateIndex(argv as VectorCommandArgs),
            )
            .command(
              "delete-index",
              "Delete a vector index from a store",
              (y) => this.buildDeleteIndexOptions(y),
              async (argv) =>
                this.executeDeleteIndex(argv as VectorCommandArgs),
            )
            .command(
              "list-indexes",
              "List all indexes in a vector store",
              (y) => this.buildListIndexesOptions(y),
              async (argv) =>
                this.executeListIndexes(argv as VectorCommandArgs),
            )
            .command(
              "index-stats",
              "Get statistics for a specific index",
              (y) => this.buildIndexStatsOptions(y),
              async (argv) => this.executeIndexStats(argv as VectorCommandArgs),
            )
            .command(
              "upsert",
              "Upsert vectors from a JSON file into an index",
              (y) => this.buildUpsertOptions(y),
              async (argv) => this.executeUpsert(argv as VectorCommandArgs),
            )
            .command(
              "search",
              "Search for similar vectors in an index",
              (y) => this.buildSearchOptions(y),
              async (argv) => this.executeSearch(argv as VectorCommandArgs),
            )
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
            .option("debug", {
              type: "boolean",
              default: false,
              description: "Enable debug output",
            })
            .demandCommand(1, "Please specify a vector subcommand")
            .help()
        );
      },
      handler: () => {
        // No-op handler as subcommands handle everything
      },
    };
  }

  /**
   * Build options for list-stores command
   */
  private static buildListStoresOptions(y: Argv) {
    return y
      .option("category", {
        choices: ["cloud", "database", "local", "enterprise", "all"] as const,
        default: "all",
        description: "Filter by vector store category",
      })
      .example(
        "neurolink vector list-stores",
        "List all vector store integrations",
      )
      .example(
        "neurolink vector list-stores --category cloud",
        "List cloud-native vector stores",
      );
  }

  /**
   * Build options for list-providers command
   */
  private static buildListProvidersOptions(y: Argv) {
    return y
      .example(
        "neurolink vector list-providers",
        "List all embedding providers",
      )
      .example(
        "neurolink vector list-providers --format json",
        "List providers in JSON format",
      );
  }

  /**
   * Build options for list-models command
   */
  private static buildListModelsOptions(y: Argv) {
    return y
      .option("provider", {
        type: "string" as const,
        description: "Filter by embedding provider",
      })
      .example("neurolink vector list-models", "List all embedding models")
      .example(
        "neurolink vector list-models --provider openai",
        "List OpenAI embedding models",
      );
  }

  /**
   * Build options for embed command
   */
  private static buildEmbedOptions(y: Argv) {
    return y
      .positional("text", {
        type: "string" as const,
        description: "Text to generate embedding for",
        demandOption: true,
      })
      .option("provider", {
        type: "string" as const,
        default: "openai",
        description: "Embedding provider to use",
      })
      .option("model", {
        type: "string" as const,
        description: "Specific model to use",
      })
      .option("dimensions", {
        type: "number" as const,
        description: "Output dimensions (for models that support it)",
      })
      .option("output", {
        type: "string" as const,
        alias: "o",
        description: "Save embedding to file",
      })
      .example(
        'neurolink vector embed "Hello world"',
        "Generate embedding using default provider",
      )
      .example(
        'neurolink vector embed "Hello world" --provider cohere --model embed-v4',
        "Generate embedding with specific provider/model",
      );
  }

  /**
   * Build options for embed-batch command
   */
  private static buildEmbedBatchOptions(y: Argv) {
    return y
      .option("texts", {
        type: "array" as const,
        description: "Texts to generate embeddings for",
      })
      .option("file", {
        type: "string" as const,
        description: "File containing texts (one per line)",
      })
      .option("provider", {
        type: "string" as const,
        default: "openai",
        description: "Embedding provider to use",
      })
      .option("model", {
        type: "string" as const,
        description: "Specific model to use",
      })
      .option("batch-size", {
        type: "number" as const,
        default: 100,
        description: "Batch size for processing",
      })
      .option("output", {
        type: "string" as const,
        alias: "o",
        description: "Save embeddings to file (JSON format)",
      })
      .example(
        'neurolink vector embed-batch --texts "Hello" "World"',
        "Generate embeddings for multiple texts",
      )
      .example(
        "neurolink vector embed-batch --file texts.txt --output embeddings.json",
        "Generate embeddings from file",
      );
  }

  /**
   * Build options for stats command
   */
  private static buildStatsOptions(y: Argv) {
    return y
      .option("detailed", {
        type: "boolean" as const,
        default: false,
        description: "Show detailed statistics",
      })
      .example("neurolink vector stats", "Show vector/embedding statistics")
      .example("neurolink vector stats --detailed", "Show detailed statistics");
  }

  /**
   * Build options for presets command
   */
  private static buildPresetsOptions(y: Argv) {
    return y
      .example("neurolink vector presets", "Show all embedding presets")
      .example(
        "neurolink vector presets --format json",
        "Show presets in JSON format",
      );
  }

  /**
   * Build options for create-index command
   */
  private static buildCreateIndexOptions(y: Argv) {
    return y
      .option("store", {
        type: "string" as const,
        demandOption: true,
        description: "Vector store name (e.g., pinecone, qdrant, pgvector)",
      })
      .option("name", {
        type: "string" as const,
        demandOption: true,
        description: "Index name to create",
      })
      .option("dimension", {
        type: "number" as const,
        demandOption: true,
        description: "Vector dimension (e.g., 1536 for OpenAI ada-002)",
      })
      .option("metric", {
        choices: ["cosine", "euclidean", "dotProduct"] as const,
        default: "cosine",
        description: "Similarity metric to use",
      })
      .example(
        "neurolink vector create-index --store pinecone --name my-index --dimension 1536",
        "Create a new Pinecone index",
      )
      .example(
        "neurolink vector create-index --store qdrant --name embeddings --dimension 3072 --metric dotProduct",
        "Create Qdrant index with dot product metric",
      );
  }

  /**
   * Build options for delete-index command
   */
  private static buildDeleteIndexOptions(y: Argv) {
    return y
      .option("store", {
        type: "string" as const,
        demandOption: true,
        description: "Vector store name",
      })
      .option("name", {
        type: "string" as const,
        demandOption: true,
        description: "Index name to delete",
      })
      .example(
        "neurolink vector delete-index --store pinecone --name my-index",
        "Delete a Pinecone index",
      );
  }

  /**
   * Build options for list-indexes command
   */
  private static buildListIndexesOptions(y: Argv) {
    return y
      .option("store", {
        type: "string" as const,
        demandOption: true,
        description: "Vector store name",
      })
      .example(
        "neurolink vector list-indexes --store pinecone",
        "List all Pinecone indexes",
      )
      .example(
        "neurolink vector list-indexes --store qdrant --format json",
        "List Qdrant indexes in JSON format",
      );
  }

  /**
   * Build options for index-stats command
   */
  private static buildIndexStatsOptions(y: Argv) {
    return y
      .option("store", {
        type: "string" as const,
        demandOption: true,
        description: "Vector store name",
      })
      .option("index", {
        type: "string" as const,
        demandOption: true,
        description: "Index name to get statistics for",
      })
      .example(
        "neurolink vector index-stats --store pinecone --index my-index",
        "Get Pinecone index statistics",
      );
  }

  /**
   * Build options for upsert command
   */
  private static buildUpsertOptions(y: Argv) {
    return y
      .option("store", {
        type: "string" as const,
        demandOption: true,
        description: "Vector store name",
      })
      .option("index", {
        type: "string" as const,
        demandOption: true,
        description: "Index name to upsert into",
      })
      .option("file", {
        type: "string" as const,
        demandOption: true,
        description: "JSON file containing vector records",
      })
      .option("batch-size", {
        type: "number" as const,
        default: 100,
        description: "Batch size for upsert operations",
      })
      .option("namespace", {
        type: "string" as const,
        description: "Namespace for the vectors (optional)",
      })
      .example(
        "neurolink vector upsert --store pinecone --index my-index --file vectors.json",
        "Upsert vectors from JSON file",
      )
      .example(
        "neurolink vector upsert --store qdrant --index embeddings --file data.json --batch-size 50",
        "Upsert with custom batch size",
      );
  }

  /**
   * Build options for search command
   */
  private static buildSearchOptions(y: Argv) {
    return y
      .option("store", {
        type: "string" as const,
        demandOption: true,
        description: "Vector store name",
      })
      .option("index", {
        type: "string" as const,
        demandOption: true,
        description: "Index name to search",
      })
      .option("query", {
        type: "string" as const,
        description:
          "Text query to embed and search (requires embedding provider)",
      })
      .option("vector", {
        type: "string" as const,
        description: 'Vector as JSON array (e.g., "[0.1, 0.2, ...]")',
      })
      .option("top-k", {
        type: "number" as const,
        default: 10,
        description: "Number of results to return",
      })
      .option("include-vectors", {
        type: "boolean" as const,
        default: false,
        description: "Include vectors in results",
      })
      .option("include-metadata", {
        type: "boolean" as const,
        default: true,
        description: "Include metadata in results",
      })
      .option("namespace", {
        type: "string" as const,
        description: "Namespace to search within",
      })
      .example(
        'neurolink vector search --store pinecone --index my-index --query "machine learning"',
        "Search using text query (auto-embeds)",
      )
      .example(
        'neurolink vector search --store qdrant --index embeddings --vector "[0.1, 0.2, 0.3]" --top-k 5',
        "Search using vector directly",
      );
  }

  /**
   * Execute list-stores command
   */
  private static async executeListStores(
    argv: VectorCommandArgs,
  ): Promise<void> {
    try {
      const spinner = argv.quiet
        ? null
        : ora("Loading vector store integrations...").start();

      // Ensure vector stores are registered
      await VectorStoreRegistry.registerAllStores();
      const availableStores = VectorStoreFactory.getAvailableStores();

      // Define all vector stores with their implementation status
      const vectorStores = [
        // Cloud-Native
        {
          name: "Pinecone",
          id: "pinecone",
          category: "cloud",
          description: "Serverless vector database with excellent DX",
        },
        {
          name: "Qdrant",
          id: "qdrant",
          category: "cloud",
          description: "High-performance open source vector search",
        },
        {
          name: "Weaviate",
          id: "weaviate",
          category: "cloud",
          description: "AI-native vector database with hybrid search",
        },
        {
          name: "Astra DB",
          id: "astra",
          category: "cloud",
          description: "DataStax Cassandra-based vector database",
        },
        {
          name: "Cloudflare Vectorize",
          id: "cloudflare",
          category: "cloud",
          description: "Edge-native vector database",
        },
        {
          name: "Upstash Vector",
          id: "upstash",
          category: "cloud",
          description: "Serverless Redis-like vector database",
        },

        // Database Extensions
        {
          name: "PostgreSQL/pgvector",
          id: "pgvector",
          category: "database",
          description: "PostgreSQL vector extension",
        },
        {
          name: "MongoDB Atlas Vector",
          id: "mongodb",
          category: "database",
          description: "MongoDB Atlas vector search",
        },
        {
          name: "Elasticsearch",
          id: "elasticsearch",
          category: "database",
          description: "Elastic dense_vector with kNN",
        },
        {
          name: "OpenSearch",
          id: "opensearch",
          category: "database",
          description: "OpenSearch k-NN plugin",
        },

        // Local/Embedded
        {
          name: "Chroma",
          id: "chroma",
          category: "local",
          description: "Lightweight embedded vector database",
        },
        {
          name: "LanceDB",
          id: "lance",
          category: "local",
          description: "High-performance columnar vector storage",
        },
        {
          name: "DuckDB",
          id: "duckdb",
          category: "local",
          description: "Analytical database with VSS extension",
        },
        {
          name: "LibSQL/Turso",
          id: "libsql",
          category: "local",
          description: "SQLite-compatible with vector search",
        },

        // Enterprise
        {
          name: "Azure AI Search",
          id: "azure-ai-search",
          category: "enterprise",
          description: "Microsoft enterprise vector search",
        },
        {
          name: "Google Vertex Vector",
          id: "vertex-vector",
          category: "enterprise",
          description: "GCP managed vector search",
        },
        {
          name: "AWS OpenSearch Serverless",
          id: "aws-opensearch",
          category: "enterprise",
          description: "AWS managed OpenSearch with k-NN",
        },
        {
          name: "Milvus",
          id: "milvus",
          category: "enterprise",
          description: "Enterprise-scale vector database",
        },
        {
          name: "Zilliz Cloud",
          id: "zilliz",
          category: "enterprise",
          description: "Managed Milvus cloud service",
        },
        {
          name: "Couchbase",
          id: "couchbase",
          category: "enterprise",
          description: "Enterprise NoSQL with vector search",
        },
        {
          name: "Vespa",
          id: "vespa",
          category: "enterprise",
          description: "High-performance enterprise search",
        },
        {
          name: "Marqo",
          id: "marqo",
          category: "enterprise",
          description: "End-to-end vector search with embeddings",
        },
      ];

      // Add availability status based on registration
      const storesWithStatus = vectorStores.map((store) => ({
        ...store,
        status: availableStores.includes(store.id) ? "available" : "planned",
      }));

      const categoryArg =
        (argv as VectorCommandArgs & { category?: string }).category || "all";
      const filteredStores =
        categoryArg === "all"
          ? storesWithStatus
          : storesWithStatus.filter((s) => s.category === categoryArg);

      if (spinner) {
        const availableCount = filteredStores.filter(
          (s) => s.status === "available",
        ).length;
        spinner.succeed(
          `Found ${filteredStores.length} vector store integrations (${availableCount} available)`,
        );
      }

      if (argv.format === "json") {
        logger.always(JSON.stringify(filteredStores, null, 2));
      } else if (argv.format === "compact") {
        filteredStores.forEach((store) => {
          const statusIcon =
            store.status === "available"
              ? chalk.green("[OK]")
              : chalk.yellow("[--]");
          logger.always(`${statusIcon} ${store.name} (${store.id})`);
        });
      } else {
        logger.always(chalk.bold("\nVector Store Integrations:\n"));

        const categories = [...new Set(filteredStores.map((s) => s.category))];
        for (const category of categories) {
          const categoryTitle =
            category.charAt(0).toUpperCase() + category.slice(1);
          const categoryStores = filteredStores.filter(
            (s) => s.category === category,
          );
          const availableInCategory = categoryStores.filter(
            (s) => s.status === "available",
          ).length;

          logger.always(
            chalk.cyan(
              `\n${categoryTitle} (${availableInCategory}/${categoryStores.length} available):`,
            ),
          );

          for (const store of categoryStores) {
            const statusIcon =
              store.status === "available"
                ? chalk.green("[OK]")
                : chalk.yellow("[--]");
            const nameColor =
              store.status === "available" ? chalk.white : chalk.gray;
            logger.always(
              `  ${statusIcon} ${nameColor(store.name)} (${store.id})`,
            );
            logger.always(`       ${chalk.gray(store.description)}`);
          }
        }

        logger.always();
        logger.always(
          chalk.gray("Legend: ") +
            chalk.green("[OK]") +
            " available, " +
            chalk.yellow("[--]") +
            " planned",
        );
        logger.always();
      }
    } catch (error) {
      logger.error(
        chalk.red(`Failed to list vector stores: ${(error as Error).message}`),
      );
      process.exit(1);
    }
  }

  /**
   * Execute list-providers command
   */
  private static async executeListProviders(
    argv: VectorCommandArgs,
  ): Promise<void> {
    try {
      const spinner = argv.quiet
        ? null
        : ora("Loading embedding providers...").start();

      // Ensure providers are registered
      await EmbeddingProviderRegistry.registerAllProviders();

      const providers = [
        {
          name: "openai",
          displayName: "OpenAI",
          status: "available",
          envVar: "OPENAI_API_KEY",
        },
        {
          name: "cohere",
          displayName: "Cohere",
          status: "available",
          envVar: "COHERE_API_KEY",
        },
        {
          name: "voyage",
          displayName: "Voyage AI",
          status: "available",
          envVar: "VOYAGE_API_KEY",
        },
        {
          name: "google",
          displayName: "Google (Vertex AI / AI Studio)",
          status: "available",
          envVar: "GOOGLE_API_KEY",
        },
        {
          name: "huggingface",
          displayName: "HuggingFace",
          status: "available",
          envVar: "HUGGINGFACE_API_KEY",
        },
        {
          name: "ollama",
          displayName: "Ollama (Local)",
          status: "available",
          envVar: "OLLAMA_HOST",
        },
        {
          name: "bedrock",
          displayName: "AWS Bedrock",
          status: "available",
          envVar: "AWS_ACCESS_KEY_ID",
        },
        {
          name: "mistral",
          displayName: "Mistral AI",
          status: "available",
          envVar: "MISTRAL_API_KEY",
        },
      ];

      // Check which providers have credentials configured
      const providersWithStatus = providers.map((p) => ({
        ...p,
        configured: !!process.env[p.envVar],
      }));

      if (spinner) {
        spinner.succeed(`Found ${providers.length} embedding providers`);
      }

      if (argv.format === "json") {
        logger.always(JSON.stringify(providersWithStatus, null, 2));
      } else if (argv.format === "compact") {
        providersWithStatus.forEach((p) => {
          const status = p.configured
            ? chalk.green("configured")
            : chalk.yellow("not configured");
          logger.always(`${p.name}: ${status}`);
        });
      } else {
        logger.always(chalk.bold("\nEmbedding Providers:\n"));

        for (const provider of providersWithStatus) {
          const statusIcon = provider.configured
            ? chalk.green("[OK]")
            : chalk.yellow("[!]");
          const configStatus = provider.configured
            ? chalk.green("configured")
            : chalk.yellow(`needs ${provider.envVar}`);

          logger.always(
            `${statusIcon} ${chalk.cyan(provider.displayName)} (${provider.name})`,
          );
          logger.always(`    Status: ${configStatus}`);
        }
        logger.always();
      }
    } catch (error) {
      logger.error(
        chalk.red(`Failed to list providers: ${(error as Error).message}`),
      );
      process.exit(1);
    }
  }

  /**
   * Execute list-models command
   */
  private static async executeListModels(
    argv: VectorCommandArgs,
  ): Promise<void> {
    try {
      const spinner = argv.quiet
        ? null
        : ora("Loading embedding models...").start();

      let models = Object.values(EMBEDDING_MODELS);

      // Filter by provider if specified
      if (argv.provider) {
        const providerName = argv.provider.toLowerCase();
        const providerEnum = Object.values(EmbeddingProviderName).find(
          (p) => p.toLowerCase() === providerName,
        );
        if (providerEnum) {
          models = getModelsForProvider(providerEnum);
        }
      }

      if (spinner) {
        spinner.succeed(`Found ${models.length} embedding models`);
      }

      if (argv.format === "json") {
        logger.always(JSON.stringify(models, null, 2));
      } else if (argv.format === "compact") {
        models.forEach((m) => {
          logger.always(`${m.name} (${m.provider}) - ${m.dimension}d`);
        });
      } else {
        logger.always(chalk.bold("\nEmbedding Models:\n"));

        // Group by provider
        const providers = [...new Set(models.map((m) => m.provider))];
        for (const provider of providers) {
          logger.always(chalk.cyan(`\n${provider}:`));

          const providerModels = models.filter((m) => m.provider === provider);
          for (const model of providerModels) {
            const cost = model.costPerMillion
              ? `$${model.costPerMillion.toFixed(2)}/M tokens`
              : "N/A";

            logger.always(`  ${chalk.white(model.name)}`);
            logger.always(
              `    Dimension: ${model.dimension} | Max Tokens: ${model.maxTokens} | Cost: ${cost}`,
            );
            if (model.description) {
              logger.always(`    ${chalk.gray(model.description)}`);
            }
          }
        }
        logger.always();
      }
    } catch (error) {
      logger.error(
        chalk.red(`Failed to list models: ${(error as Error).message}`),
      );
      process.exit(1);
    }
  }

  /**
   * Execute embed command
   */
  private static async executeEmbed(argv: VectorCommandArgs): Promise<void> {
    try {
      const text = argv.text as string;
      if (!text) {
        logger.error(chalk.red("Text is required for embedding"));
        process.exit(1);
      }

      const spinner = argv.quiet
        ? null
        : ora(`Generating embedding with ${argv.provider}...`).start();

      // Create provider instance
      const provider = await EmbeddingProviderFactory.createProvider(
        argv.provider || "openai",
        {},
      );
      await provider.initialize();

      const options = {
        model: argv.model,
        dimensions: argv.dimensions,
        debug: argv.debug,
      };

      const result = await provider.embed(text, options);

      if (spinner) {
        spinner.succeed(
          `Generated ${result.embedding.length}-dimensional embedding`,
        );
      }

      // Save to file if output specified
      if (argv.output) {
        const fs = await import("fs");
        fs.writeFileSync(argv.output, JSON.stringify(result, null, 2));
        logger.always(chalk.green(`Embedding saved to ${argv.output}`));
      }

      if (argv.format === "json") {
        logger.always(JSON.stringify(result, null, 2));
      } else if (argv.format === "compact") {
        logger.always(`Dimension: ${result.embedding.length}`);
        logger.always(`Tokens: ${result.tokenCount}`);
        logger.always(`Model: ${result.model}`);
      } else {
        logger.always(chalk.bold("\nEmbedding Result:\n"));
        logger.always(`  Model: ${result.model}`);
        logger.always(`  Dimension: ${result.embedding.length}`);
        logger.always(`  Tokens: ${result.tokenCount}`);
        if (result.processingTimeMs) {
          logger.always(`  Processing Time: ${result.processingTimeMs}ms`);
        }
        logger.always(
          `  Vector (first 5): [${result.embedding
            .slice(0, 5)
            .map((n) => n.toFixed(6))
            .join(", ")}...]`,
        );
        logger.always();
      }
    } catch (error) {
      logger.error(
        chalk.red(`Failed to generate embedding: ${(error as Error).message}`),
      );
      process.exit(1);
    }
  }

  /**
   * Execute embed-batch command
   */
  private static async executeEmbedBatch(
    argv: VectorCommandArgs,
  ): Promise<void> {
    try {
      let texts: string[] = [];

      // Get texts from arguments or file
      if (argv.texts && argv.texts.length > 0) {
        texts = argv.texts;
      } else if (argv.file) {
        const fs = await import("fs");
        const content = fs.readFileSync(argv.file, "utf-8");
        texts = content.split("\n").filter((line) => line.trim().length > 0);
      }

      if (texts.length === 0) {
        logger.error(
          chalk.red("No texts provided. Use --texts or --file option."),
        );
        process.exit(1);
      }

      const spinner = argv.quiet
        ? null
        : ora(`Generating embeddings for ${texts.length} texts...`).start();

      // Create provider instance
      const provider = await EmbeddingProviderFactory.createProvider(
        argv.provider || "openai",
        {},
      );
      await provider.initialize();

      const options = {
        model: argv.model,
        batchSize: argv.batchSize,
        debug: argv.debug,
      };

      const result = await provider.embedBatch(texts, options);

      if (spinner) {
        spinner.succeed(`Generated ${result.embeddings.length} embeddings`);
      }

      // Save to file if output specified
      if (argv.output) {
        const fs = await import("fs");
        fs.writeFileSync(argv.output, JSON.stringify(result, null, 2));
        logger.always(chalk.green(`Embeddings saved to ${argv.output}`));
      }

      if (argv.format === "json") {
        logger.always(JSON.stringify(result, null, 2));
      } else if (argv.format === "compact") {
        logger.always(`Count: ${result.embeddings.length}`);
        logger.always(`Total Tokens: ${result.totalTokens}`);
        logger.always(`Model: ${result.model}`);
      } else {
        logger.always(chalk.bold("\nBatch Embedding Result:\n"));
        logger.always(`  Model: ${result.model}`);
        logger.always(`  Embeddings: ${result.embeddings.length}`);
        logger.always(`  Total Tokens: ${result.totalTokens}`);
        if (result.processingTimeMs) {
          logger.always(`  Processing Time: ${result.processingTimeMs}ms`);
        }
        logger.always();
      }
    } catch (error) {
      logger.error(
        chalk.red(
          `Failed to generate batch embeddings: ${(error as Error).message}`,
        ),
      );
      process.exit(1);
    }
  }

  /**
   * Execute stats command
   */
  private static async executeStats(argv: VectorCommandArgs): Promise<void> {
    try {
      const spinner = argv.quiet
        ? null
        : ora("Gathering statistics...").start();

      // Ensure providers and stores are registered
      await EmbeddingProviderRegistry.registerAllProviders();
      await VectorStoreRegistry.registerAllStores();

      const availableStores = VectorStoreFactory.getAvailableStores();

      const stats = {
        embeddingProviders: 8,
        embeddingModels: Object.keys(EMBEDDING_MODELS).length,
        vectorStores: 22,
        vectorStoresAvailable: availableStores.length,
        vectorStoresPlanned: 22 - availableStores.length,
        presets: Object.keys(EMBEDDING_PRESETS).length,
        configuredProviders: 0,
        availableStoresList: availableStores,
      };

      // Count configured providers
      const envVars = [
        "OPENAI_API_KEY",
        "COHERE_API_KEY",
        "VOYAGE_API_KEY",
        "GOOGLE_API_KEY",
        "HUGGINGFACE_API_KEY",
        "OLLAMA_HOST",
        "AWS_ACCESS_KEY_ID",
        "MISTRAL_API_KEY",
      ];
      stats.configuredProviders = envVars.filter(
        (v) => !!process.env[v],
      ).length;

      if (spinner) {
        spinner.succeed("Statistics gathered");
      }

      if (argv.format === "json") {
        logger.always(JSON.stringify(stats, null, 2));
      } else {
        logger.always(chalk.bold("\nVector Store & Embedding Statistics:\n"));
        logger.always(
          `  Embedding Providers: ${chalk.cyan(stats.embeddingProviders)}`,
        );
        logger.always(
          `  Embedding Models: ${chalk.cyan(stats.embeddingModels)}`,
        );
        logger.always(
          `  Configured Providers: ${chalk.green(stats.configuredProviders)}/${stats.embeddingProviders}`,
        );
        logger.always(`  Available Presets: ${chalk.cyan(stats.presets)}`);
        logger.always();
        logger.always(
          `  Vector Store Integrations: ${chalk.cyan(stats.vectorStores)}`,
        );
        logger.always(
          `    Available: ${chalk.green(stats.vectorStoresAvailable)}`,
        );
        logger.always(
          `    Planned: ${chalk.yellow(stats.vectorStoresPlanned)}`,
        );
        logger.always();

        if (
          (argv as VectorCommandArgs & { detailed?: boolean }).detailed &&
          availableStores.length > 0
        ) {
          logger.always(chalk.bold("  Available Vector Stores:"));
          for (const store of availableStores) {
            logger.always(`    ${chalk.green("-")} ${store}`);
          }
          logger.always();
        }
      }
    } catch (error) {
      logger.error(
        chalk.red(`Failed to gather statistics: ${(error as Error).message}`),
      );
      process.exit(1);
    }
  }

  /**
   * Execute presets command
   */
  private static async executePresets(argv: VectorCommandArgs): Promise<void> {
    try {
      const spinner = argv.quiet ? null : ora("Loading presets...").start();

      const presets = Object.entries(EMBEDDING_PRESETS).map(
        ([name, config]) => ({
          name,
          ...config,
        }),
      );

      if (spinner) {
        spinner.succeed(`Found ${presets.length} embedding presets`);
      }

      if (argv.format === "json") {
        logger.always(JSON.stringify(presets, null, 2));
      } else if (argv.format === "compact") {
        presets.forEach((p) => {
          logger.always(
            `${p.name}: ${p.provider}/${p.model} (${p.dimensions}d)`,
          );
        });
      } else {
        logger.always(chalk.bold("\nEmbedding Presets:\n"));
        logger.always(chalk.gray("Use these presets for common use cases:\n"));

        for (const preset of presets) {
          const presetName =
            preset.name.charAt(0).toUpperCase() + preset.name.slice(1);
          logger.always(`  ${chalk.cyan(presetName)}`);
          logger.always(`    Provider: ${preset.provider}`);
          logger.always(`    Model: ${preset.model}`);
          logger.always(`    Dimensions: ${preset.dimensions}`);
          logger.always();
        }

        logger.always(chalk.gray("Example usage:"));
        logger.always(
          chalk.gray(
            '  neurolink vector embed "Hello" --provider openai --model text-embedding-3-small\n',
          ),
        );
      }
    } catch (error) {
      logger.error(
        chalk.red(`Failed to load presets: ${(error as Error).message}`),
      );
      process.exit(1);
    }
  }

  // ============================================
  // Vector Store Management Commands
  // ============================================

  /**
   * Helper to create and connect to a vector store
   */
  private static async getVectorStore(
    storeName: string,
  ): Promise<BaseVectorStore> {
    // Ensure stores are registered
    await VectorStoreRegistry.registerAllStores();

    if (!VectorStoreFactory.hasStore(storeName)) {
      const availableStores = VectorStoreFactory.getAvailableStores();
      throw new Error(
        `Unknown vector store: ${storeName}. Available stores: ${availableStores.join(", ")}`,
      );
    }

    // Create store with minimal config (relies on env vars for credentials)
    const store = await VectorStoreFactory.createStore(storeName, {
      debug: process.env.NEUROLINK_DEBUG === "true",
    });

    // Connect to the store
    await store.connect();
    return store;
  }

  /**
   * Execute create-index command
   */
  private static async executeCreateIndex(
    argv: VectorCommandArgs,
  ): Promise<void> {
    let store: BaseVectorStore | null = null;
    try {
      const storeName = argv.store as string;
      const indexName = argv.name as string;
      const dimension = argv.dimension as number;
      const metric = (argv.metric || "cosine") as SimilarityMetric;

      const spinner = argv.quiet
        ? null
        : ora(`Creating index "${indexName}" in ${storeName}...`).start();

      store = await this.getVectorStore(storeName);

      const config: VectorIndexConfig = {
        name: indexName,
        dimension: dimension,
        metric: metric,
      };

      await store.createIndex(config);

      if (spinner) {
        spinner.succeed(
          `Index "${indexName}" created successfully in ${storeName}`,
        );
      }

      if (argv.format === "json") {
        logger.always(
          JSON.stringify(
            {
              success: true,
              store: storeName,
              index: indexName,
              dimension: dimension,
              metric: metric,
            },
            null,
            2,
          ),
        );
      } else if (!argv.quiet) {
        logger.always(chalk.bold("\nIndex Created:\n"));
        logger.always(`  Store: ${chalk.cyan(storeName)}`);
        logger.always(`  Index: ${chalk.green(indexName)}`);
        logger.always(`  Dimension: ${chalk.white(dimension)}`);
        logger.always(`  Metric: ${chalk.white(metric)}`);
        logger.always();
      }
    } catch (error) {
      logger.error(
        chalk.red(`Failed to create index: ${(error as Error).message}`),
      );
      process.exit(1);
    } finally {
      if (store) {
        await store.disconnect();
      }
    }
  }

  /**
   * Execute delete-index command
   */
  private static async executeDeleteIndex(
    argv: VectorCommandArgs,
  ): Promise<void> {
    let store: BaseVectorStore | null = null;
    try {
      const storeName = argv.store as string;
      const indexName = argv.name as string;

      const spinner = argv.quiet
        ? null
        : ora(`Deleting index "${indexName}" from ${storeName}...`).start();

      store = await this.getVectorStore(storeName);

      // Check if index exists first
      const exists = await store.indexExists(indexName);
      if (!exists) {
        if (spinner) {
          spinner.fail(`Index "${indexName}" does not exist in ${storeName}`);
        }
        process.exit(1);
      }

      await store.deleteIndex(indexName);

      if (spinner) {
        spinner.succeed(
          `Index "${indexName}" deleted successfully from ${storeName}`,
        );
      }

      if (argv.format === "json") {
        logger.always(
          JSON.stringify(
            {
              success: true,
              store: storeName,
              index: indexName,
              deleted: true,
            },
            null,
            2,
          ),
        );
      }
    } catch (error) {
      logger.error(
        chalk.red(`Failed to delete index: ${(error as Error).message}`),
      );
      process.exit(1);
    } finally {
      if (store) {
        await store.disconnect();
      }
    }
  }

  /**
   * Execute list-indexes command
   */
  private static async executeListIndexes(
    argv: VectorCommandArgs,
  ): Promise<void> {
    let store: BaseVectorStore | null = null;
    try {
      const storeName = argv.store as string;

      const spinner = argv.quiet
        ? null
        : ora(`Listing indexes in ${storeName}...`).start();

      store = await this.getVectorStore(storeName);

      const indexes = await store.listIndexes();

      if (spinner) {
        spinner.succeed(`Found ${indexes.length} index(es) in ${storeName}`);
      }

      if (argv.format === "json") {
        logger.always(
          JSON.stringify(
            {
              store: storeName,
              indexes: indexes,
              count: indexes.length,
            },
            null,
            2,
          ),
        );
      } else if (argv.format === "compact") {
        indexes.forEach((index) => {
          logger.always(index);
        });
      } else {
        logger.always(chalk.bold(`\nIndexes in ${storeName}:\n`));

        if (indexes.length === 0) {
          logger.always(chalk.yellow("  No indexes found."));
        } else {
          indexes.forEach((index, i) => {
            logger.always(`  ${i + 1}. ${chalk.cyan(index)}`);
          });
        }
        logger.always();
      }
    } catch (error) {
      logger.error(
        chalk.red(`Failed to list indexes: ${(error as Error).message}`),
      );
      process.exit(1);
    } finally {
      if (store) {
        await store.disconnect();
      }
    }
  }

  /**
   * Execute index-stats command
   */
  private static async executeIndexStats(
    argv: VectorCommandArgs,
  ): Promise<void> {
    let store: BaseVectorStore | null = null;
    try {
      const storeName = argv.store as string;
      const indexName = argv.index as string;

      const spinner = argv.quiet
        ? null
        : ora(
            `Getting statistics for "${indexName}" in ${storeName}...`,
          ).start();

      store = await this.getVectorStore(storeName);

      // Check if index exists
      const exists = await store.indexExists(indexName);
      if (!exists) {
        if (spinner) {
          spinner.fail(`Index "${indexName}" does not exist in ${storeName}`);
        }
        process.exit(1);
      }

      const stats = await store.getStats(indexName);

      if (spinner) {
        spinner.succeed(`Retrieved statistics for "${indexName}"`);
      }

      if (argv.format === "json") {
        logger.always(
          JSON.stringify(
            {
              store: storeName,
              index: indexName,
              stats: stats,
            },
            null,
            2,
          ),
        );
      } else if (argv.format === "compact") {
        logger.always(`Vectors: ${stats.vectorCount}`);
        if (stats.dimension) logger.always(`Dimension: ${stats.dimension}`);
        if (stats.indexSize)
          logger.always(`Size: ${this.formatBytes(stats.indexSize)}`);
      } else {
        logger.always(chalk.bold(`\nIndex Statistics: ${indexName}\n`));
        logger.always(`  Store: ${chalk.cyan(storeName)}`);
        logger.always(`  Vector Count: ${chalk.white(stats.vectorCount)}`);
        if (stats.dimension) {
          logger.always(`  Dimension: ${chalk.white(stats.dimension)}`);
        }
        if (stats.indexSize) {
          logger.always(
            `  Index Size: ${chalk.white(this.formatBytes(stats.indexSize))}`,
          );
        }
        if (stats.namespaceCount !== undefined) {
          logger.always(`  Namespaces: ${chalk.white(stats.namespaceCount)}`);
        }
        if (stats.metrics) {
          logger.always(chalk.bold("\n  Additional Metrics:"));
          Object.entries(stats.metrics).forEach(([key, value]) => {
            logger.always(`    ${key}: ${chalk.white(String(value))}`);
          });
        }
        logger.always();
      }
    } catch (error) {
      logger.error(
        chalk.red(`Failed to get index stats: ${(error as Error).message}`),
      );
      process.exit(1);
    } finally {
      if (store) {
        await store.disconnect();
      }
    }
  }

  /**
   * Execute upsert command
   */
  private static async executeUpsert(argv: VectorCommandArgs): Promise<void> {
    let store: BaseVectorStore | null = null;
    try {
      const storeName = argv.store as string;
      const indexName = argv.index as string;
      const filePath = argv.file as string;
      const batchSize = argv.batchSize || 100;
      const namespace = argv.namespace;

      // Validate file exists
      const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(process.cwd(), filePath);

      if (!fs.existsSync(absolutePath)) {
        logger.error(chalk.red(`File not found: ${absolutePath}`));
        process.exit(1);
      }

      const spinner = argv.quiet
        ? null
        : ora(`Loading vectors from ${filePath}...`).start();

      // Read and parse JSON file
      const content = fs.readFileSync(absolutePath, "utf-8");
      let records: VectorRecord[];

      try {
        const parsed = JSON.parse(content);
        // Support both array directly or { records: [...] } format
        records = Array.isArray(parsed)
          ? parsed
          : parsed.records || parsed.vectors || [];
      } catch {
        logger.error(chalk.red(`Invalid JSON file: ${filePath}`));
        process.exit(1);
      }

      if (records.length === 0) {
        if (spinner) {
          spinner.fail("No vector records found in file");
        }
        process.exit(1);
      }

      // Validate record structure
      const validRecords = records.filter(
        (r) => r.id && Array.isArray(r.vector) && r.vector.length > 0,
      );

      if (validRecords.length !== records.length) {
        logger.warn(
          chalk.yellow(
            `Warning: ${records.length - validRecords.length} invalid records skipped`,
          ),
        );
      }

      if (spinner) {
        spinner.text = `Connecting to ${storeName}...`;
      }

      store = await this.getVectorStore(storeName);

      // Check if index exists
      const exists = await store.indexExists(indexName);
      if (!exists) {
        if (spinner) {
          spinner.fail(`Index "${indexName}" does not exist in ${storeName}`);
        }
        process.exit(1);
      }

      if (spinner) {
        spinner.text = `Upserting ${validRecords.length} vectors to "${indexName}"...`;
      }

      const result = await store.batchUpsert(indexName, validRecords, {
        batchSize,
        namespace,
      });

      if (spinner) {
        spinner.succeed(
          `Upserted ${result.upsertedCount} vectors to "${indexName}"`,
        );
      }

      if (argv.format === "json") {
        logger.always(
          JSON.stringify(
            {
              success: true,
              store: storeName,
              index: indexName,
              upsertedCount: result.upsertedCount,
              totalRecords: validRecords.length,
              batchSize: batchSize,
            },
            null,
            2,
          ),
        );
      } else if (!argv.quiet) {
        logger.always(chalk.bold("\nUpsert Complete:\n"));
        logger.always(`  Store: ${chalk.cyan(storeName)}`);
        logger.always(`  Index: ${chalk.cyan(indexName)}`);
        logger.always(
          `  Records Upserted: ${chalk.green(result.upsertedCount)}`,
        );
        if (namespace) {
          logger.always(`  Namespace: ${chalk.white(namespace)}`);
        }
        logger.always();
      }
    } catch (error) {
      logger.error(
        chalk.red(`Failed to upsert vectors: ${(error as Error).message}`),
      );
      process.exit(1);
    } finally {
      if (store) {
        await store.disconnect();
      }
    }
  }

  /**
   * Execute search command
   */
  private static async executeSearch(argv: VectorCommandArgs): Promise<void> {
    let store: BaseVectorStore | null = null;
    try {
      const storeName = argv.store as string;
      const indexName = argv.index as string;
      const queryText = argv.query;
      const vectorStr = argv.vector;
      const topK =
        (argv as VectorCommandArgs & { "top-k"?: number })["top-k"] ||
        argv.topK ||
        10;
      const includeVectors =
        (argv as VectorCommandArgs & { "include-vectors"?: boolean })[
          "include-vectors"
        ] ||
        argv.includeVectors ||
        false;
      const includeMetadata =
        (argv as VectorCommandArgs & { "include-metadata"?: boolean })[
          "include-metadata"
        ] ??
        argv.includeMetadata ??
        true;
      const namespace = argv.namespace;

      // Must provide either query text or vector
      if (!queryText && !vectorStr) {
        logger.error(
          chalk.red(
            "Either --query (text) or --vector (JSON array) is required",
          ),
        );
        process.exit(1);
      }

      let queryVector: number[];

      if (vectorStr) {
        // Parse vector from JSON string
        try {
          queryVector = JSON.parse(vectorStr);
          if (!Array.isArray(queryVector) || queryVector.length === 0) {
            throw new Error("Vector must be a non-empty array");
          }
        } catch (err) {
          logger.error(
            chalk.red(
              `Invalid vector format. Expected JSON array: ${(err as Error).message}`,
            ),
          );
          process.exit(1);
        }
      } else {
        // Generate embedding from query text
        const spinner = argv.quiet
          ? null
          : ora(`Generating embedding for query...`).start();

        try {
          const provider = await EmbeddingProviderFactory.createProvider(
            argv.provider || "openai",
            {},
          );
          await provider.initialize();
          const result = await provider.embed(queryText as string, {
            model: argv.model,
          });
          queryVector = result.embedding;

          if (spinner) {
            spinner.succeed(
              `Generated ${queryVector.length}-dimensional query embedding`,
            );
          }
        } catch (err) {
          if (spinner) {
            spinner.fail(
              `Failed to generate embedding: ${(err as Error).message}`,
            );
          }
          process.exit(1);
        }
      }

      const searchSpinner = argv.quiet
        ? null
        : ora(`Searching "${indexName}" in ${storeName}...`).start();

      store = await this.getVectorStore(storeName);

      // Check if index exists
      const exists = await store.indexExists(indexName);
      if (!exists) {
        if (searchSpinner) {
          searchSpinner.fail(
            `Index "${indexName}" does not exist in ${storeName}`,
          );
        }
        process.exit(1);
      }

      const queryOptions: VectorQueryOptions = {
        vector: queryVector,
        topK: topK,
        includeVectors: includeVectors,
        includeMetadata: includeMetadata,
        namespace: namespace,
      };

      const results = await store.query(indexName, queryOptions);

      if (searchSpinner) {
        searchSpinner.succeed(`Found ${results.length} result(s)`);
      }

      if (argv.format === "json") {
        logger.always(
          JSON.stringify(
            {
              store: storeName,
              index: indexName,
              query: queryText || "(vector provided)",
              topK: topK,
              results: results,
            },
            null,
            2,
          ),
        );
      } else if (argv.format === "compact") {
        results.forEach((r, i) => {
          const meta = r.metadata
            ? ` | ${JSON.stringify(r.metadata).slice(0, 50)}`
            : "";
          logger.always(
            `${i + 1}. ${r.id} (score: ${r.score.toFixed(4)})${meta}`,
          );
        });
      } else {
        logger.always(chalk.bold("\nSearch Results:\n"));

        if (queryText) {
          logger.always(`  Query: "${chalk.cyan(queryText)}"`);
        }
        logger.always(`  Index: ${chalk.cyan(indexName)} (${storeName})`);
        logger.always(`  Results: ${chalk.white(results.length)} / ${topK}`);
        logger.always();

        if (results.length === 0) {
          logger.always(chalk.yellow("  No matching vectors found."));
        } else {
          results.forEach((result, i) => {
            logger.always(
              `  ${chalk.bold(`${i + 1}.`)} ${chalk.cyan(result.id)}`,
            );
            logger.always(
              `     Score: ${chalk.green(result.score.toFixed(6))}`,
            );

            if (result.content) {
              const preview =
                result.content.length > 100
                  ? result.content.slice(0, 100) + "..."
                  : result.content;
              logger.always(`     Content: ${chalk.gray(preview)}`);
            }

            if (result.metadata && Object.keys(result.metadata).length > 0) {
              logger.always(
                `     Metadata: ${chalk.gray(JSON.stringify(result.metadata))}`,
              );
            }
            logger.always();
          });
        }
      }
    } catch (error) {
      logger.error(chalk.red(`Failed to search: ${(error as Error).message}`));
      process.exit(1);
    } finally {
      if (store) {
        await store.disconnect();
      }
    }
  }

  /**
   * Helper to format bytes to human readable string
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}
