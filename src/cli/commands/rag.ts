/**
 * RAG CLI Commands for NeuroLink
 *
 * Implements commands for RAG document processing:
 * - neurolink rag chunk <file> - Chunk a document
 * - neurolink rag index <file> - Index a document for retrieval
 * - neurolink rag query <query> - Query indexed documents
 */

import chalk from "chalk";
import { existsSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import ora from "ora";
import { basename, extname, resolve } from "path";
import type { Arguments, Argv, CommandModule } from "yargs";
import { ProviderFactory } from "../../lib/factories/providerFactory.js";
import { ProviderRegistry } from "../../lib/factories/providerRegistry.js";
import { ChunkerRegistry } from "../../lib/rag/chunking/chunkerRegistry.js";
import { GraphRAG } from "../../lib/rag/graphRag/graphRAG.js";
import { LLMMetadataExtractor } from "../../lib/rag/metadata/metadataExtractor.js";
import {
  createHybridSearch,
  InMemoryBM25Index,
} from "../../lib/rag/retrieval/hybridSearch.js";
import { InMemoryVectorStore } from "../../lib/rag/retrieval/vectorQueryTool.js";
import type {
  Chunk,
  ChunkingStrategy,
  RAGCommandArgs,
} from "../../lib/rag/types.js";
import { globalSession } from "../../lib/session/globalSessionState.js";
import { logger } from "../../lib/utils/logger.js";
import { getBestProvider } from "../../lib/utils/providerUtils.js";

/**
 * Ensure the NeuroLink SDK is initialized (which registers all providers)
 * This follows the same pattern as the 'generate' command
 */
async function ensureSDKInitialized(): Promise<void> {
  // Getting or creating the NeuroLink instance ensures proper SDK initialization
  // This registers all providers via the ProviderRegistry
  globalSession.getOrCreateNeuroLink();

  // Also ensure providers are registered (belt and suspenders approach)
  if (!ProviderRegistry.isRegistered()) {
    await ProviderRegistry.registerAllProviders();
  }
}

/**
 * Default embedding models for each provider
 * These are dedicated embedding models that support the embed() method
 */
const DEFAULT_EMBEDDING_MODELS: Record<string, string> = {
  vertex: "text-embedding-004",
  google: "text-embedding-004",
  "google-vertex": "text-embedding-004",
  openai: "text-embedding-3-small",
  azure: "text-embedding-3-small",
  "azure-openai": "text-embedding-3-small",
  bedrock: "amazon.titan-embed-text-v2:0",
  "amazon-bedrock": "amazon.titan-embed-text-v2:0",
};

/**
 * Provider-specific embedding model environment variables
 * Maps provider names to their embedding model env var names
 */
const EMBEDDING_ENV_VARS: Record<string, string[]> = {
  vertex: ["VERTEX_EMBEDDING_MODEL", "GOOGLE_EMBEDDING_MODEL"],
  google: ["GOOGLE_EMBEDDING_MODEL", "VERTEX_EMBEDDING_MODEL"],
  "google-vertex": ["VERTEX_EMBEDDING_MODEL", "GOOGLE_EMBEDDING_MODEL"],
  openai: ["OPENAI_EMBEDDING_MODEL"],
  azure: ["AZURE_EMBEDDING_MODEL", "AZURE_OPENAI_EMBEDDING_MODEL"],
  "azure-openai": ["AZURE_OPENAI_EMBEDDING_MODEL", "AZURE_EMBEDDING_MODEL"],
  bedrock: ["BEDROCK_EMBEDDING_MODEL", "AWS_EMBEDDING_MODEL"],
  "amazon-bedrock": ["BEDROCK_EMBEDDING_MODEL", "AWS_EMBEDDING_MODEL"],
};

/**
 * Provider-specific default model environment variables (for generation)
 * Used to check if user has set an embedding model in these vars
 */
const PROVIDER_MODEL_ENV_VARS: Record<string, string[]> = {
  vertex: ["VERTEX_MODEL"],
  google: ["GOOGLE_AI_MODEL"],
  "google-vertex": ["VERTEX_MODEL"],
  openai: ["OPENAI_MODEL"],
  azure: ["AZURE_OPENAI_MODEL"],
  "azure-openai": ["AZURE_OPENAI_MODEL"],
  bedrock: ["BEDROCK_MODEL", "BEDROCK_MODEL_ID"],
  "amazon-bedrock": ["BEDROCK_MODEL", "BEDROCK_MODEL_ID"],
};

/**
 * Check if a model name is an embedding model
 */
function isEmbeddingModel(modelName: string): boolean {
  const embeddingPatterns = [
    /embed/i,
    /text-embedding/i,
    /titan-embed/i,
    /gecko/i,
  ];
  return embeddingPatterns.some((pattern) => pattern.test(modelName));
}

/**
 * Get the appropriate embedding model for a provider
 *
 * Resolution order:
 * 1. CLI --model flag (if it's an embedding model)
 * 2. NEUROLINK_EMBEDDING_MODEL env var
 * 3. Provider-specific embedding env vars (e.g., VERTEX_EMBEDDING_MODEL)
 * 4. Provider's default model env var (if it's an embedding model)
 * 5. Provider-specific default embedding model
 * 6. Fallback to OpenAI text-embedding-3-small
 */
async function getEmbeddingModel(
  provider?: string,
  model?: string,
): Promise<{ provider: string; model: string }> {
  // Resolve provider using the same logic as generate/stream commands
  // This automatically detects available providers and falls back appropriately
  let resolvedProvider: string;

  if (provider) {
    // User explicitly specified a provider
    resolvedProvider = provider;
  } else {
    // Use getBestProvider() to automatically detect the best available provider
    // This is the same logic used by generate/stream commands
    try {
      resolvedProvider = await getBestProvider();
      logger.debug(
        `Auto-detected best available provider: ${resolvedProvider}`,
      );
    } catch {
      // If no provider is available at all, throw a helpful error
      throw new Error(
        `No AI providers available for embeddings. Please configure at least one provider:\n` +
          `  - OpenAI: Set OPENAI_API_KEY\n` +
          `  - Google Vertex: Set GOOGLE_CLOUD_PROJECT_ID and authenticate with gcloud\n` +
          `  - Amazon Bedrock: Configure AWS credentials\n` +
          `Or specify a provider explicitly with --provider`,
      );
    }
  }

  const normalizedProvider = resolvedProvider.toLowerCase();

  // Priority 1: CLI --model flag (if it's an embedding model)
  if (model && isEmbeddingModel(model)) {
    logger.debug(`Using CLI-provided embedding model: ${model}`);
    return { provider: resolvedProvider, model };
  }

  // Priority 2: Global NEUROLINK_EMBEDDING_MODEL env var
  const globalEmbeddingModel = process.env.NEUROLINK_EMBEDDING_MODEL;
  if (globalEmbeddingModel) {
    logger.debug(`Using NEUROLINK_EMBEDDING_MODEL: ${globalEmbeddingModel}`);
    return { provider: resolvedProvider, model: globalEmbeddingModel };
  }

  // Priority 3: Provider-specific embedding env vars
  const embeddingEnvVars = EMBEDDING_ENV_VARS[normalizedProvider];
  if (embeddingEnvVars) {
    for (const envVar of embeddingEnvVars) {
      const envModel = process.env[envVar];
      if (envModel) {
        logger.debug(`Using ${envVar}: ${envModel}`);
        return { provider: resolvedProvider, model: envModel };
      }
    }
  }

  // Priority 4: Check if provider's default model is an embedding model
  const providerModelEnvVars = PROVIDER_MODEL_ENV_VARS[normalizedProvider];
  if (providerModelEnvVars) {
    for (const envVar of providerModelEnvVars) {
      const envModel = process.env[envVar];
      if (envModel && isEmbeddingModel(envModel)) {
        logger.debug(
          `Using ${envVar} (detected as embedding model): ${envModel}`,
        );
        return { provider: resolvedProvider, model: envModel };
      }
    }
  }

  // Priority 5: Provider-specific default embedding model
  const defaultEmbeddingModel = DEFAULT_EMBEDDING_MODELS[normalizedProvider];
  if (defaultEmbeddingModel) {
    logger.debug(
      `Using default embedding model for ${resolvedProvider}: ${defaultEmbeddingModel}`,
    );
    return { provider: resolvedProvider, model: defaultEmbeddingModel };
  }

  // Priority 6: Fallback to OpenAI's embedding model if provider not found
  logger.warn(
    `No default embedding model for provider ${resolvedProvider}, falling back to OpenAI text-embedding-3-small`,
  );
  return { provider: "openai", model: "text-embedding-3-small" };
}

/**
 * Chunk subcommand arguments
 */
type ChunkArgs = RAGCommandArgs & {
  file: string;
  output?: string;
  extract?: boolean;
};

/**
 * Index subcommand arguments
 */
type IndexArgs = RAGCommandArgs & {
  file: string;
  indexName?: string;
};

/**
 * Query subcommand arguments
 */
type QueryArgs = RAGCommandArgs & {
  query: string;
  indexName?: string;
};

/**
 * In-memory storage for indexed documents
 * In production, this would be persisted to a vector database
 */
const indexedDocuments = new Map<
  string,
  {
    vectorStore: InMemoryVectorStore;
    bm25Index: InMemoryBM25Index;
    graphRag: GraphRAG;
    chunks: Chunk[];
  }
>();

/**
 * Detect document type from file extension
 */
function detectDocumentType(filePath: string): ChunkingStrategy {
  const ext = extname(filePath).toLowerCase();
  const typeMap: Record<string, ChunkingStrategy> = {
    ".md": "markdown",
    ".markdown": "markdown",
    ".html": "html",
    ".htm": "html",
    ".json": "json",
    ".tex": "latex",
    ".latex": "latex",
    ".txt": "recursive",
    ".csv": "recursive",
    ".pdf": "recursive",
  };
  return typeMap[ext] || "recursive";
}

/**
 * Format chunks for display
 */
function formatChunks(chunks: Chunk[], format: string): string {
  if (format === "json") {
    return JSON.stringify(chunks, null, 2);
  }

  if (format === "table") {
    const rows = chunks.map((chunk, i) => ({
      "#": i + 1,
      ID: chunk.id.slice(0, 8),
      Length: chunk.text.length,
      Preview: chunk.text.slice(0, 50).replace(/\n/g, " ") + "...",
    }));

    // Simple table formatting
    const headers = Object.keys(rows[0] || {});
    const colWidths = headers.map((h) =>
      Math.max(
        h.length,
        ...rows.map((r) => String((r as Record<string, unknown>)[h]).length),
      ),
    );

    let output =
      headers.map((h, i) => h.padEnd(colWidths[i])).join(" | ") + "\n";
    output += colWidths.map((w) => "-".repeat(w)).join("-+-") + "\n";
    output += rows
      .map((row) =>
        headers
          .map((h, i) =>
            String((row as Record<string, unknown>)[h]).padEnd(colWidths[i]),
          )
          .join(" | "),
      )
      .join("\n");

    return output;
  }

  // Default text format
  return chunks
    .map(
      (chunk, i) =>
        `--- Chunk ${i + 1} (${chunk.text.length} chars) ---\n${chunk.text}\n`,
    )
    .join("\n");
}

/**
 * Create the chunk subcommand
 */
function createChunkCommand(): CommandModule<{}, ChunkArgs> {
  return {
    command: "chunk <file>",
    describe: "Chunk a document into smaller pieces for processing",
    builder: (yargs: Argv) =>
      yargs
        .positional("file", {
          describe: "Path to the file to chunk",
          type: "string",
          demandOption: true,
        })
        .option("strategy", {
          alias: "s",
          describe: "Chunking strategy to use",
          choices: [
            "character",
            "recursive",
            "sentence",
            "token",
            "markdown",
            "html",
            "json",
            "latex",
            "semantic",
            "semantic-markdown",
          ] as ChunkingStrategy[],
          type: "string",
        })
        .option("maxSize", {
          alias: "m",
          describe: "Maximum chunk size",
          type: "number",
          default: 1000,
        })
        .option("overlap", {
          alias: "o",
          describe: "Overlap between chunks",
          type: "number",
          default: 200,
        })
        .option("format", {
          alias: "f",
          describe: "Output format",
          choices: ["json", "text", "table"],
          default: "text",
        })
        .option("output", {
          describe: "Output file path (optional)",
          type: "string",
        })
        .option("extract", {
          alias: "e",
          describe: "Extract metadata (title, summary, keywords)",
          type: "boolean",
          default: false,
        })
        .option("provider", {
          alias: "p",
          describe:
            "Provider for semantic chunking/metadata extraction (uses default from config/env if not specified)",
          type: "string",
        })
        .option("model", {
          describe:
            "Model for semantic chunking/metadata extraction (uses default from config/env if not specified)",
          type: "string",
        })
        .option("verbose", {
          alias: "v",
          describe: "Enable verbose output",
          type: "boolean",
          default: false,
        }) as Argv<ChunkArgs>,
    handler: async (args: Arguments<ChunkArgs>) => {
      const spinner = ora("Processing document...").start();

      try {
        // Validate file exists
        const filePath = resolve(args.file);
        if (!existsSync(filePath)) {
          spinner.fail(chalk.red(`File not found: ${filePath}`));
          process.exit(1);
        }

        // Read file content
        const content = await readFile(filePath, "utf-8");
        const fileName = basename(filePath);

        // Determine strategy
        const strategy = args.strategy || detectDocumentType(filePath);
        spinner.text = `Chunking with ${strategy} strategy...`;

        // Validate chunk parameters
        const maxSize = args.maxSize ?? 1000;
        const overlap = args.overlap ?? 200;
        if (maxSize <= 0) {
          spinner.fail(chalk.red("maxSize must be greater than 0"));
          process.exit(1);
        }
        if (overlap >= maxSize) {
          spinner.fail(chalk.red("overlap must be less than maxSize"));
          process.exit(1);
        }

        // Get chunker and chunk the document
        const chunker = ChunkerRegistry.get(strategy);
        const chunks = await chunker.chunk(content, {
          maxSize,
          overlap,
          metadata: { source: fileName },
        });

        spinner.succeed(
          chalk.green(`Created ${chunks.length} chunks from ${fileName}`),
        );

        // Extract metadata if requested
        if (args.extract) {
          // Ensure providers are registered for metadata extraction
          await ensureSDKInitialized();

          spinner.start("Extracting metadata...");

          const extractor = new LLMMetadataExtractor({
            provider: args.provider,
            modelName: args.model,
          });

          const results = await extractor.extract(chunks, {
            title: true,
            summary: true,
            keywords: true,
          });

          // Merge metadata into chunks
          for (let i = 0; i < chunks.length && i < results.length; i++) {
            const result = results[i];
            if (result.title) {
              chunks[i].metadata.title = result.title;
            }
            if (result.summary) {
              chunks[i].metadata.summary = result.summary;
            }
            if (result.keywords) {
              chunks[i].metadata.keywords = result.keywords;
            }
          }

          spinner.succeed(chalk.green("Metadata extracted"));
        }

        // Format output
        const output = formatChunks(chunks, args.format || "text");

        // Write to file or stdout
        if (args.output) {
          await writeFile(args.output, output, "utf-8");
          logger.always(chalk.green(`Output written to ${args.output}`));
        } else {
          logger.always("\n" + output);
        }

        // Show summary
        if (args.verbose) {
          logger.always(chalk.dim("\n--- Summary ---"));
          logger.always(chalk.dim(`Strategy: ${strategy}`));
          logger.always(chalk.dim(`Total chunks: ${chunks.length}`));
          logger.always(
            chalk.dim(
              `Avg chunk size: ${Math.round(chunks.reduce((sum, c) => sum + c.text.length, 0) / chunks.length)} chars`,
            ),
          );
        }
      } catch (error) {
        spinner.fail(
          chalk.red(
            `Error: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
        process.exit(1);
      }
    },
  };
}

/**
 * Create the index subcommand
 */
function createIndexCommand(): CommandModule<{}, IndexArgs> {
  return {
    command: "index <file>",
    describe: "Index a document for semantic search",
    builder: (yargs: Argv) =>
      yargs
        .positional("file", {
          describe: "Path to the file to index",
          type: "string",
          demandOption: true,
        })
        .option("indexName", {
          alias: "n",
          describe: "Name for the index",
          type: "string",
        })
        .option("strategy", {
          alias: "s",
          describe: "Chunking strategy to use",
          choices: [
            "character",
            "recursive",
            "sentence",
            "token",
            "markdown",
            "html",
            "json",
            "latex",
            "semantic",
            "semantic-markdown",
          ] as ChunkingStrategy[],
          type: "string",
        })
        .option("maxSize", {
          alias: "m",
          describe: "Maximum chunk size",
          type: "number",
          default: 1000,
        })
        .option("overlap", {
          alias: "o",
          describe: "Overlap between chunks",
          type: "number",
          default: 200,
        })
        .option("provider", {
          alias: "p",
          describe:
            "Provider for embeddings (uses default from config/env if not specified)",
          type: "string",
        })
        .option("model", {
          describe:
            "Model for embeddings (uses default from config/env if not specified)",
          type: "string",
        })
        .option("graph", {
          alias: "g",
          describe: "Build Graph RAG index",
          type: "boolean",
          default: false,
        })
        .option("verbose", {
          alias: "v",
          describe: "Enable verbose output",
          type: "boolean",
          default: false,
        }) as Argv<IndexArgs>,
    handler: async (args: Arguments<IndexArgs>) => {
      const spinner = ora("Indexing document...").start();

      try {
        // Ensure providers are registered before use
        await ensureSDKInitialized();

        // Validate file exists
        const filePath = resolve(args.file);
        if (!existsSync(filePath)) {
          spinner.fail(chalk.red(`File not found: ${filePath}`));
          process.exit(1);
        }

        // Read file content
        const content = await readFile(filePath, "utf-8");
        const fileName = basename(filePath);
        const indexName = args.indexName || fileName.replace(/\.[^.]+$/, "");

        // Determine strategy
        const strategy = args.strategy || detectDocumentType(filePath);
        spinner.text = `Chunking with ${strategy} strategy...`;

        // Validate chunk parameters
        const maxSize = args.maxSize ?? 1000;
        const overlap = args.overlap ?? 200;
        if (maxSize <= 0) {
          spinner.fail(chalk.red("maxSize must be greater than 0"));
          process.exit(1);
        }
        if (overlap >= maxSize) {
          spinner.fail(chalk.red("overlap must be less than maxSize"));
          process.exit(1);
        }

        // Chunk the document
        const chunker = ChunkerRegistry.get(strategy);
        const chunks = await chunker.chunk(content, {
          maxSize,
          overlap,
          metadata: { source: fileName },
        });

        spinner.text = `Generating embeddings for ${chunks.length} chunks...`;

        // Get embedding provider with smart model detection
        // Automatically uses the appropriate embedding model for the provider
        // Uses getBestProvider() to auto-detect available providers (same as generate/stream)
        const { provider: embeddingProviderName, model: embeddingModelName } =
          await getEmbeddingModel(args.provider, args.model);

        if (args.verbose) {
          logger.always(
            chalk.dim(
              `Using embedding provider: ${embeddingProviderName}, model: ${embeddingModelName}`,
            ),
          );
        }

        const embeddingProvider = await ProviderFactory.createProvider(
          embeddingProviderName,
          embeddingModelName,
        );

        // Verify the provider has an embed method
        if (
          typeof (embeddingProvider as unknown as { embed?: unknown }).embed !==
          "function"
        ) {
          spinner.fail(
            chalk.red(
              `Provider ${embeddingProviderName} with model ${embeddingModelName} does not support embeddings. ` +
                `Please use an embedding model like text-embedding-004 (Vertex) or text-embedding-3-small (OpenAI).`,
            ),
          );
          process.exit(1);
        }

        // Generate embeddings
        const embeddings: number[][] = [];
        for (const chunk of chunks) {
          const embedding = await (
            embeddingProvider as unknown as {
              embed: (s: string) => Promise<number[]>;
            }
          ).embed(chunk.text);
          embeddings.push(embedding);
          chunk.embedding = embedding;
        }

        // Create indices
        const vectorStore = new InMemoryVectorStore();
        const bm25Index = new InMemoryBM25Index();
        const graphRag = new GraphRAG({ threshold: 0.7 });

        // Index in vector store
        await vectorStore.upsert(
          indexName,
          chunks.map((chunk, i) => ({
            id: chunk.id,
            vector: embeddings[i],
            metadata: { ...chunk.metadata, text: chunk.text },
          })),
        );

        // Index in BM25
        await bm25Index.addDocuments(
          chunks.map((chunk) => ({
            id: chunk.id,
            text: chunk.text,
            metadata: chunk.metadata,
          })),
        );

        // Build Graph RAG if requested
        if (args.graph) {
          spinner.text = "Building knowledge graph...";
          graphRag.createGraph(
            chunks.map((c) => ({ text: c.text, metadata: c.metadata })),
            embeddings.map((v) => ({ vector: v })),
          );
        }

        // Store in memory
        indexedDocuments.set(indexName, {
          vectorStore,
          bm25Index,
          graphRag,
          chunks,
        });

        spinner.succeed(
          chalk.green(
            `Indexed ${chunks.length} chunks as "${indexName}"${args.graph ? " with Graph RAG" : ""}`,
          ),
        );

        if (args.verbose) {
          logger.always(chalk.dim("\n--- Index Summary ---"));
          logger.always(chalk.dim(`Index name: ${indexName}`));
          logger.always(chalk.dim(`Total chunks: ${chunks.length}`));
          logger.always(
            chalk.dim(`Embedding dimension: ${embeddings[0]?.length || 0}`),
          );
          if (args.graph) {
            const stats = graphRag.getStats();
            logger.always(chalk.dim(`Graph nodes: ${stats.nodeCount}`));
            logger.always(chalk.dim(`Graph edges: ${stats.edgeCount}`));
          }
        }
      } catch (error) {
        spinner.fail(
          chalk.red(
            `Error: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
        process.exit(1);
      }
    },
  };
}

/**
 * Create the query subcommand
 */
function createQueryCommand(): CommandModule<{}, QueryArgs> {
  return {
    command: "query <query>",
    describe: "Query indexed documents",
    builder: (yargs: Argv) =>
      yargs
        .positional("query", {
          describe: "Search query",
          type: "string",
          demandOption: true,
        })
        .option("indexName", {
          alias: "n",
          describe: "Name of the index to query",
          type: "string",
        })
        .option("topK", {
          alias: "k",
          describe: "Number of results to return",
          type: "number",
          default: 5,
        })
        .option("hybrid", {
          alias: "h",
          describe: "Use hybrid search (vector + BM25)",
          type: "boolean",
          default: false,
        })
        .option("graph", {
          alias: "g",
          describe: "Use Graph RAG search",
          type: "boolean",
          default: false,
        })
        .option("provider", {
          alias: "p",
          describe:
            "Provider for embeddings (uses default from config/env if not specified)",
          type: "string",
        })
        .option("model", {
          describe:
            "Model for embeddings (uses default from config/env if not specified)",
          type: "string",
        })
        .option("format", {
          alias: "f",
          describe: "Output format",
          choices: ["json", "text", "table"],
          default: "text",
        })
        .option("verbose", {
          alias: "v",
          describe: "Enable verbose output",
          type: "boolean",
          default: false,
        }) as Argv<QueryArgs>,
    handler: async (args: Arguments<QueryArgs>) => {
      const spinner = ora("Searching...").start();

      try {
        // Ensure providers are registered before use
        await ensureSDKInitialized();

        // Find index
        const indexName =
          args.indexName || Array.from(indexedDocuments.keys())[0];
        if (!indexName) {
          spinner.fail(
            chalk.red(
              "No indexed documents found. Run 'neurolink rag index' first.",
            ),
          );
          process.exit(1);
        }

        const indexed = indexedDocuments.get(indexName);
        if (!indexed) {
          spinner.fail(chalk.red(`Index "${indexName}" not found.`));
          process.exit(1);
        }

        const { vectorStore, bm25Index, graphRag } = indexed;

        // Generate query embedding with smart model detection
        // Uses getBestProvider() to auto-detect available providers (same as generate/stream)
        const { provider: embeddingProviderName, model: embeddingModelName } =
          await getEmbeddingModel(args.provider, args.model);

        if (args.verbose) {
          logger.always(
            chalk.dim(
              `Using embedding provider: ${embeddingProviderName}, model: ${embeddingModelName}`,
            ),
          );
        }

        const embeddingProvider = await ProviderFactory.createProvider(
          embeddingProviderName,
          embeddingModelName,
        );

        // Verify the provider has an embed method
        if (
          typeof (embeddingProvider as unknown as { embed?: unknown }).embed !==
          "function"
        ) {
          spinner.fail(
            chalk.red(
              `Provider ${embeddingProviderName} with model ${embeddingModelName} does not support embeddings. ` +
                `Please use an embedding model like text-embedding-004 (Vertex) or text-embedding-3-small (OpenAI).`,
            ),
          );
          process.exit(1);
        }

        const queryEmbedding = await (
          embeddingProvider as unknown as {
            embed: (s: string) => Promise<number[]>;
          }
        ).embed(args.query);

        let results: Array<{ id: string; score: number; text: string }>;

        if (args.graph) {
          // Graph RAG search
          spinner.text = "Searching knowledge graph...";
          const graphResults = graphRag.query({
            query: queryEmbedding,
            topK: args.topK || 5,
          });
          results = graphResults.map((r) => ({
            id: r.id,
            score: r.score,
            text: r.content,
          }));
        } else if (args.hybrid) {
          // Hybrid search
          spinner.text = "Performing hybrid search...";
          const hybridSearch = createHybridSearch({
            vectorStore,
            bm25Index,
            indexName,
            embeddingModel: {
              provider: embeddingProviderName,
              modelName: embeddingModelName,
            },
          });
          const hybridResults = await hybridSearch(args.query, {
            topK: args.topK || 5,
          });
          results = hybridResults.map((r) => ({
            id: r.id,
            score: r.score,
            text: r.text,
          }));
        } else {
          // Vector search
          spinner.text = "Performing vector search...";
          const vectorResults = await vectorStore.query({
            indexName,
            queryVector: queryEmbedding,
            topK: args.topK || 5,
          });
          results = vectorResults.map((r) => ({
            id: r.id,
            score: r.score || 0,
            text: (r.metadata?.text as string) || r.text || "",
          }));
        }

        spinner.succeed(chalk.green(`Found ${results.length} results`));

        // Format and display results
        if (args.format === "json") {
          logger.always(JSON.stringify(results, null, 2));
        } else if (args.format === "table") {
          logger.always("\n" + chalk.bold("Search Results:"));
          results.forEach((r, i) => {
            logger.always(
              chalk.cyan(`\n[${i + 1}] Score: ${r.score.toFixed(4)}`),
            );
            logger.always(r.text.slice(0, 200) + "...");
          });
        } else {
          logger.always("\n" + chalk.bold("Search Results:"));
          results.forEach((r, i) => {
            logger.always(
              chalk.cyan(
                `\n--- Result ${i + 1} (Score: ${r.score.toFixed(4)}) ---`,
              ),
            );
            logger.always(r.text);
          });
        }

        if (args.verbose) {
          logger.always(chalk.dim("\n--- Query Info ---"));
          logger.always(chalk.dim(`Index: ${indexName}`));
          logger.always(chalk.dim(`Query: ${args.query}`));
          logger.always(
            chalk.dim(
              `Search type: ${args.graph ? "Graph RAG" : args.hybrid ? "Hybrid" : "Vector"}`,
            ),
          );
        }
      } catch (error) {
        spinner.fail(
          chalk.red(
            `Error: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
        process.exit(1);
      }
    },
  };
}

/**
 * RAG CLI command factory
 */
export class RAGCommandFactory {
  /**
   * Create the main RAG command with subcommands
   */
  static createRAGCommands(): CommandModule {
    return {
      command: "rag <subcommand>",
      describe: "RAG document processing commands",
      builder: (yargs: Argv) =>
        yargs
          .command(createChunkCommand())
          .command(createIndexCommand())
          .command(createQueryCommand())
          .demandCommand(1, "Please specify a subcommand"),
      handler: () => {
        // Parent command handler - not called when subcommand is specified
      },
    };
  }
}

// Export for CLI registration
export const ragCommand = RAGCommandFactory.createRAGCommands();
