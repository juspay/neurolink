import { existsSync, readFileSync } from "fs";
import { extname, resolve } from "path";
import { z } from "zod";
import {
  SpanSerializer,
  SpanType,
  SpanStatus,
  getMetricsAggregator,
} from "../observability/index.js";
import { logger } from "../utils/logger.js";
import { createChunker } from "./ChunkerFactory.js";
import {
  createVectorQueryTool,
  InMemoryVectorStore,
} from "./retrieval/vectorQueryTool.js";
import type {
  ChunkingStrategy,
  RAGConfig,
  VectorQueryResult,
  RAGPreparedTool,
} from "../types/index.js";
import { withSpan } from "../telemetry/withSpan.js";
import { tracers } from "../telemetry/tracers.js";
import type { Tool } from "../types/index.js";

/**
 * Maps file extensions to recommended chunking strategies
 */
const EXTENSION_TO_STRATEGY: Record<string, ChunkingStrategy> = {
  ".md": "markdown",
  ".mdx": "markdown",
  ".html": "html",
  ".htm": "html",
  ".json": "json",
  ".tex": "latex",
  ".latex": "latex",
  ".txt": "recursive",
  ".csv": "recursive",
  ".xml": "recursive",
  ".yaml": "recursive",
  ".yml": "recursive",
  ".ts": "recursive",
  ".js": "recursive",
  ".py": "recursive",
  ".java": "recursive",
  ".go": "recursive",
  ".rs": "recursive",
  ".c": "recursive",
  ".cpp": "recursive",
  ".rb": "recursive",
  ".php": "recursive",
  ".swift": "recursive",
  ".kt": "recursive",
};

/**
 * Detect the best chunking strategy from file extension
 */
function detectStrategy(filePath: string): ChunkingStrategy {
  const ext = extname(filePath).toLowerCase();
  return EXTENSION_TO_STRATEGY[ext] || "recursive";
}

/**
 * Simple hash function for strings (FNV-1a variant).
 * Maps a word to a bucket index deterministically.
 */
function hashWord(word: string, buckets: number): number {
  let hash = 2166136261;
  for (let i = 0; i < word.length; i++) {
    hash ^= word.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash % buckets;
}

/**
 * Generate deterministic embeddings for chunks.
 * Combines character-frequency (40%) with word-level hash features (60%)
 * for better semantic discrimination than pure character frequency.
 * When a real embedding provider is configured, it will be used instead.
 */
function generateSimpleEmbedding(text: string, dimension: number): number[] {
  const charEmbedding = new Array(dimension).fill(0);
  const wordEmbedding = new Array(dimension).fill(0);

  // Character-frequency features
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const idx = charCode % dimension;
    charEmbedding[idx] += 1;
  }

  // Word-level hash features (TF-IDF-like)
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 1);
  for (const word of words) {
    const idx = hashWord(word, dimension);
    wordEmbedding[idx] += 1;
  }

  // Combine: 40% character, 60% word
  const combined = new Array(dimension);
  for (let i = 0; i < dimension; i++) {
    combined[i] = 0.4 * charEmbedding[i] + 0.6 * wordEmbedding[i];
  }

  // Normalize to unit vector
  const magnitude = Math.sqrt(
    combined.reduce((sum: number, v: number) => sum + v * v, 0),
  );
  if (magnitude > 0) {
    for (let i = 0; i < dimension; i++) {
      combined[i] /= magnitude;
    }
  }

  return combined;
}

/**
 * Diversify retrieval results via round-robin across source files.
 * Ensures at least one chunk per source file appears in the top-K results,
 * preventing any single file from dominating retrieval.
 */
function diversifyResults(
  results: VectorQueryResult[],
  topK: number,
): VectorQueryResult[] {
  // Group by source file
  const byFile = new Map<string, VectorQueryResult[]>();
  for (const r of results) {
    const source = (r.metadata?.source as string) || "unknown";
    if (!byFile.has(source)) {
      byFile.set(source, []);
    }
    const sourceGroup = byFile.get(source);
    if (sourceGroup) {
      sourceGroup.push(r);
    }
  }

  // If only one source file, no diversification needed
  if (byFile.size <= 1) {
    return results.slice(0, topK);
  }

  // Round-robin selection from each source file group
  const diversified: VectorQueryResult[] = [];
  const iterators = [...byFile.values()].map((arr) => ({ arr, idx: 0 }));
  while (
    diversified.length < topK &&
    iterators.some((it) => it.idx < it.arr.length)
  ) {
    for (const it of iterators) {
      if (it.idx < it.arr.length && diversified.length < topK) {
        diversified.push(it.arr[it.idx++]);
      }
    }
  }
  return diversified;
}

/**
 * Prepare RAG tools from the provided configuration.
 *
 * This function:
 * 1. Loads and reads all specified files
 * 2. Chunks them using the configured (or auto-detected) strategy
 * 3. Generates embeddings for each chunk
 * 4. Stores them in an in-memory vector store
 * 5. Creates a tool the AI model can use to search the documents
 *
 * @param ragConfig - RAG configuration from generate/stream options
 * @param fallbackProvider - Provider to use for embeddings if not specified in ragConfig
 * @returns Prepared RAG tool to inject into the tools record
 */
export async function prepareRAGTool(
  ragConfig: RAGConfig,
  fallbackProvider?: string,
): Promise<RAGPreparedTool> {
  const span = SpanSerializer.createSpan(SpanType.RAG, "rag.prepare", {
    "rag.operation": "prepare",
    "rag.files_count": ragConfig.files?.length ?? 0,
    "rag.strategy": ragConfig.strategy ?? "auto",
    "rag.chunk_size": ragConfig.chunkSize ?? 1000,
  });
  const startTime = Date.now();
  try {
    const result = await _prepareRAGToolInner(ragConfig, fallbackProvider);
    span.durationMs = Date.now() - startTime;
    const endedSpan = SpanSerializer.endSpan(span, SpanStatus.OK);
    endedSpan.attributes = {
      ...endedSpan.attributes,
      "rag.chunks_indexed": result.chunksIndexed,
      "rag.files_loaded": result.filesLoaded,
    };
    getMetricsAggregator().recordSpan(endedSpan);
    return result;
  } catch (error) {
    span.durationMs = Date.now() - startTime;
    const endedSpan = SpanSerializer.endSpan(span, SpanStatus.ERROR);
    endedSpan.statusMessage =
      error instanceof Error ? error.message : String(error);
    getMetricsAggregator().recordSpan(endedSpan);
    throw error;
  }
}

async function _prepareRAGToolInner(
  ragConfig: RAGConfig,
  fallbackProvider?: string,
): Promise<RAGPreparedTool> {
  const {
    files,
    strategy: userStrategy,
    chunkSize = 1000,
    chunkOverlap = 200,
    topK: userTopK = 5,
    toolName = "search_knowledge_base",
    toolDescription = "REQUIRED: Search through pre-loaded local documents to find relevant information. Use this tool FIRST before any web search or other tools. This searches an indexed knowledge base of documents the user has provided.",
    embeddingProvider,
    embeddingModel,
  } = ragConfig;

  if (!files || files.length === 0) {
    throw new Error("RAG config requires at least one file path in 'files'");
  }

  // 1. Load files
  const fileContents: Array<{
    path: string;
    content: string;
    strategy: ChunkingStrategy;
  }> = [];

  for (const filePath of files) {
    const resolvedPath = resolve(filePath);
    if (!existsSync(resolvedPath)) {
      logger.warn(`[RAG] File not found, skipping: ${resolvedPath}`);
      continue;
    }

    try {
      const content = readFileSync(resolvedPath, "utf-8");
      const strategy = userStrategy || detectStrategy(resolvedPath);
      fileContents.push({ path: resolvedPath, content, strategy });
    } catch (error) {
      logger.warn(
        `[RAG] Failed to read file: ${resolvedPath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Auto-increase topK for multi-file scenarios to ensure coverage
  // (computed after loading so it reflects only files that actually exist)
  const topK =
    fileContents.length > 1
      ? Math.max(userTopK, fileContents.length * 3)
      : userTopK;

  if (fileContents.length === 0) {
    throw new Error(
      "RAG: No files could be loaded. Check that file paths exist and are readable.",
    );
  }

  logger.info(`[RAG] Loaded ${fileContents.length} files for indexing`);

  // 2. Chunk all files
  const allChunks: Array<{
    text: string;
    metadata: Record<string, unknown>;
  }> = [];

  for (const { path, content, strategy } of fileContents) {
    try {
      const chunker = await createChunker(strategy, {
        maxSize: chunkSize,
        overlap: Math.min(chunkOverlap, Math.floor(chunkSize * 0.5)),
      });
      const chunks = await chunker.chunk(content, {
        metadata: { source: path },
      });

      for (const chunk of chunks) {
        allChunks.push({
          text: chunk.text,
          metadata: { ...chunk.metadata, source: path },
        });
      }
    } catch (error) {
      logger.warn(
        `[RAG] Chunking failed for ${path}, using fallback: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Fallback: treat entire file as one chunk
      allChunks.push({
        text: content.slice(0, chunkSize),
        metadata: { source: path, fallback: true },
      });
    }
  }

  logger.info(
    `[RAG] Created ${allChunks.length} chunks from ${fileContents.length} files`,
  );

  // 3. Generate embeddings and store in vector store
  const EMBEDDING_DIMENSION = 128;
  const vectorStore = new InMemoryVectorStore();
  const indexName = "rag-index";

  const items = allChunks.map((chunk, i) => ({
    id: `rag-chunk-${i}`,
    vector: generateSimpleEmbedding(chunk.text, EMBEDDING_DIMENSION),
    metadata: {
      text: chunk.text,
      ...chunk.metadata,
    },
  }));

  await vectorStore.upsert(indexName, items);

  logger.info(`[RAG] Indexed ${items.length} chunks in vector store`);

  // 4. Create the search tool
  // Determine embedding provider/model for the query tool
  const provider = embeddingProvider || fallbackProvider || "vertex";
  const model = embeddingModel || "gemini-2.5-flash";

  const queryTool = createVectorQueryTool(
    {
      id: toolName,
      description: toolDescription,
      indexName,
      embeddingModel: { provider, modelName: model },
      topK,
      includeSources: true,
    },
    vectorStore,
  );

  // Convert to Vercel AI SDK Tool format
  const aiTool: Tool = {
    description: queryTool.description,
    inputSchema: z.object({
      query: z
        .string()
        .describe("The search query to find relevant information"),
    }),
    execute: async ({ query }: { query: string }) => {
      return withSpan(
        {
          name: "neurolink.rag.search",
          tracer: tracers.rag,
          attributes: {
            "rag.query_length": query ? String(query).length : 0,
            "rag.top_k": topK ?? 5,
          },
        },
        async (span) => {
          // For the in-memory store with simple embeddings,
          // generate a query embedding using the same method
          const queryEmbedding = generateSimpleEmbedding(
            query,
            EMBEDDING_DIMENSION,
          );

          // Fetch more candidates than needed so diversity can select across files
          const fetchK = fileContents.length > 1 ? topK * 3 : topK;
          const rawResults = await vectorStore.query({
            indexName,
            queryVector: queryEmbedding,
            topK: fetchK,
          });

          // Apply source-file diversity for multi-file RAG
          const results =
            fileContents.length > 1
              ? diversifyResults(rawResults, topK)
              : rawResults.slice(0, topK);

          if (results.length === 0) {
            span.setAttribute("rag.results_count", 0);
            return {
              relevantContext: "No relevant documents found for the query.",
              sources: [],
              totalResults: 0,
            };
          }

          const relevantContext = results
            .map(
              (r, i) =>
                `[${i + 1}] ${(r.metadata?.text as string) || r.text || ""}`,
            )
            .join("\n\n");

          span.setAttribute("rag.results_count", results.length);
          return {
            relevantContext,
            sources: results.map((r) => ({
              id: r.id,
              score: r.score,
              source: r.metadata?.source,
              text: ((r.metadata?.text as string) || r.text || "").slice(
                0,
                200,
              ),
            })),
            totalResults: results.length,
          };
        },
      );
    },
  };

  return {
    tool: aiTool,
    toolName,
    chunksIndexed: allChunks.length,
    filesLoaded: fileContents.length,
  };
}

/** @internal Exported for testing only */
export { generateSimpleEmbedding as _generateSimpleEmbedding };
/** @internal Exported for testing only */
export { diversifyResults as _diversifyResults };
