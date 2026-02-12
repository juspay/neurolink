/**
 * RAG Pipeline Orchestrator
 *
 * Provides a complete end-to-end RAG pipeline that orchestrates:
 * - Document loading and preprocessing
 * - Chunking with configurable strategies
 * - Embedding generation
 * - Vector storage and retrieval
 * - Context assembly for LLM queries
 * - Response generation with citations
 *
 * @example
 * ```typescript
 * const pipeline = new RAGPipeline({
 *   vectorStore: myVectorStore,
 *   embeddingModel: { provider: 'openai', modelName: 'text-embedding-3-small' },
 *   generationModel: { provider: 'openai', modelName: 'gpt-4o-mini' }
 * });
 *
 * // Ingest documents
 * await pipeline.ingest(['/path/to/doc1.md', '/path/to/doc2.pdf']);
 *
 * // Query with RAG
 * const response = await pipeline.query('What are the key features?');
 * console.log(response.answer, response.sources);
 * ```
 */

import { randomUUID } from "crypto";
import type { Chunk, VectorQueryResult } from "../types.js";
import { MDocument } from "../document/MDocument.js";
import { loadDocument } from "../document/loaders.js";
import {
  InMemoryVectorStore,
  type VectorStore,
} from "../retrieval/vectorQueryTool.js";
import {
  InMemoryBM25Index,
  createHybridSearch,
  type BM25Index,
} from "../retrieval/hybridSearch.js";
import { GraphRAG } from "../graphRag/graphRAG.js";
import { rerank } from "../reranker/reranker.js";
import { ProviderFactory } from "../../factories/providerFactory.js";
import type { AIProvider } from "../../types/providers.js";
import { logger } from "../../utils/logger.js";
import type {
  RAGPipelineConfig,
  IngestOptions,
  QueryOptions,
  RAGResponse,
  PipelineStats,
} from "../../types/ragTypes.js";

export type { EmbeddingModelConfig } from "../../types/ragTypes.js";
export type { GenerationModelConfig } from "../../types/ragTypes.js";
export type { RAGPipelineConfig } from "../../types/ragTypes.js";
export type { IngestOptions } from "../../types/ragTypes.js";
export type { QueryOptions } from "../../types/ragTypes.js";
export type { RAGResponse } from "../../types/ragTypes.js";
export type { PipelineStats } from "../../types/ragTypes.js";

/**
 * RAG Pipeline Orchestrator
 *
 * Complete end-to-end pipeline for Retrieval-Augmented Generation.
 */
export class RAGPipeline {
  private id: string;
  private config: RAGPipelineConfig;
  private vectorStore: VectorStore;
  private bm25Index: BM25Index;
  private graphRAG: GraphRAG;
  private embeddingProvider?: AIProvider;
  private generationProvider?: AIProvider;
  private hybridSearch?: ReturnType<typeof createHybridSearch>;
  private documents: Map<string, MDocument> = new Map();
  private allChunks: Chunk[] = [];

  constructor(config: RAGPipelineConfig) {
    this.id = config.id || `rag-pipeline-${randomUUID().slice(0, 8)}`;
    this.config = {
      indexName: "default",
      defaultChunkingStrategy: "recursive",
      defaultChunkSize: 1000,
      defaultChunkOverlap: 200,
      enableHybridSearch: false,
      enableGraphRAG: false,
      graphThreshold: 0.7,
      defaultTopK: 5,
      enableReranking: false,
      ...config,
    };

    // Initialize stores
    this.vectorStore = config.vectorStore || new InMemoryVectorStore();
    this.bm25Index = config.bm25Index || new InMemoryBM25Index();
    this.graphRAG = new GraphRAG({ threshold: this.config.graphThreshold });

    logger.info("[RAGPipeline] Pipeline initialized", {
      id: this.id,
      indexName: this.config.indexName,
      embeddingModel: this.config.embeddingModel,
    });
  }

  /**
   * Initialize the pipeline (lazy loading of providers)
   */
  async initialize(): Promise<void> {
    // Initialize embedding provider
    this.embeddingProvider = await ProviderFactory.createProvider(
      this.config.embeddingModel.provider,
      this.config.embeddingModel.modelName,
    );

    // Initialize generation provider if configured
    if (this.config.generationModel) {
      this.generationProvider = await ProviderFactory.createProvider(
        this.config.generationModel.provider,
        this.config.generationModel.modelName,
      );
    }

    // Initialize hybrid search if enabled
    if (this.config.enableHybridSearch) {
      this.hybridSearch = createHybridSearch({
        vectorStore: this.vectorStore,
        bm25Index: this.bm25Index,
        indexName: this.config.indexName ?? "default",
        embeddingModel: this.config.embeddingModel,
      });
    }

    logger.info("[RAGPipeline] Pipeline initialized", { id: this.id });
  }

  /**
   * Ingest documents into the pipeline
   *
   * @param sources - Array of file paths, URLs, or MDocument instances
   * @param options - Ingestion options
   */
  async ingest(
    sources: Array<string | MDocument>,
    options?: IngestOptions,
  ): Promise<{ documentsProcessed: number; chunksCreated: number }> {
    await this.ensureInitialized();

    const strategy =
      options?.strategy || this.config.defaultChunkingStrategy || "recursive";
    const chunkSize =
      options?.chunkSize || this.config.defaultChunkSize || 1000;
    const chunkOverlap =
      options?.chunkOverlap || this.config.defaultChunkOverlap || 200;

    let documentsProcessed = 0;
    let chunksCreated = 0;

    for (const source of sources) {
      try {
        // Load document if string
        const doc =
          source instanceof MDocument
            ? source
            : await loadDocument(source, { metadata: options?.metadata });

        // Chunk the document
        await doc.chunk({
          strategy,
          config: {
            maxSize: chunkSize,
            overlap: chunkOverlap,
            metadata: options?.metadata,
          },
        });

        // Extract metadata if requested
        if (options?.extractMetadata) {
          await doc.extractMetadata({
            title: true,
            summary: true,
            keywords: true,
          });
        }

        // Generate embeddings
        await doc.embed(
          this.config.embeddingModel.provider,
          this.config.embeddingModel.modelName,
        );

        const chunks = doc.getChunks();
        const embeddings = doc.getEmbeddings();

        // Store in vector store
        await this.vectorStore.query({
          indexName: this.config.indexName ?? "default",
          queryVector: embeddings[0],
          topK: 1,
        }); // Warm up

        // Upsert into vector store
        if ("upsert" in this.vectorStore) {
          await (this.vectorStore as InMemoryVectorStore).upsert(
            this.config.indexName ?? "default",
            chunks.map((chunk, i) => ({
              id: chunk.id,
              vector: embeddings[i],
              metadata: { ...chunk.metadata, text: chunk.text },
            })),
          );
        }

        // Add to BM25 index
        await this.bm25Index.addDocuments(
          chunks.map((chunk) => ({
            id: chunk.id,
            text: chunk.text,
            metadata: chunk.metadata,
          })),
        );

        // Update Graph RAG if enabled
        if (this.config.enableGraphRAG) {
          this.graphRAG.createGraph(
            [...this.allChunks, ...chunks].map((c) => ({
              text: c.text,
              metadata: c.metadata,
            })),
            [...this.allChunks, ...chunks].map((c) => ({
              vector: c.embedding || [],
            })),
          );
        }

        // Track documents and chunks
        this.documents.set(doc.getId(), doc);
        this.allChunks.push(...chunks);

        documentsProcessed++;
        chunksCreated += chunks.length;

        logger.debug("[RAGPipeline] Document ingested", {
          documentId: doc.getId(),
          chunks: chunks.length,
        });
      } catch (error) {
        logger.error("[RAGPipeline] Failed to ingest document", {
          source: typeof source === "string" ? source : source.getId(),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info("[RAGPipeline] Ingestion complete", {
      documentsProcessed,
      chunksCreated,
    });

    return { documentsProcessed, chunksCreated };
  }

  /**
   * Query the pipeline
   *
   * @param query - Search query
   * @param options - Query options
   * @returns RAG response with retrieved context and optional generated answer
   */
  async query(query: string, options?: QueryOptions): Promise<RAGResponse> {
    await this.ensureInitialized();

    const startTime = Date.now();
    const topK = options?.topK || this.config.defaultTopK || 5;
    const useHybrid = options?.hybrid ?? this.config.enableHybridSearch;
    const useGraph = options?.graph ?? this.config.enableGraphRAG;
    const useRerank = options?.rerank ?? this.config.enableReranking;

    let results: VectorQueryResult[];
    let retrievalMethod = "vector";

    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);

    if (useGraph && this.config.enableGraphRAG) {
      // Graph RAG search
      retrievalMethod = "graph";
      const graphResults = this.graphRAG.query({
        query: queryEmbedding,
        topK: topK * 2, // Get more for potential reranking
      });
      results = graphResults.map((r) => ({
        id: r.id,
        text: r.content,
        score: r.score,
        metadata: r.metadata,
      }));
    } else if (useHybrid && this.hybridSearch) {
      // Hybrid search
      retrievalMethod = "hybrid";
      const hybridResults = await this.hybridSearch(query, { topK: topK * 2 });
      results = hybridResults.map((r) => ({
        id: r.id,
        text: r.text,
        score: r.score,
        metadata: r.metadata,
      }));
    } else {
      // Vector search
      results = await this.vectorStore.query({
        indexName: this.config.indexName ?? "default",
        queryVector: queryEmbedding,
        topK: topK * 2,
        filter: options?.filter,
      });
    }

    // Apply reranking if enabled
    let reranked = false;
    if (useRerank && this.config.rerankingModel && results.length > 0) {
      const rerankModel = await ProviderFactory.createProvider(
        this.config.rerankingModel.provider,
        this.config.rerankingModel.modelName,
      );
      const rerankedResults = await rerank(results, query, rerankModel, {
        topK,
        queryEmbedding,
      });
      results = rerankedResults.map((r) => r.result);
      reranked = true;
    }

    // Take top K results
    results = results.slice(0, topK);

    // Assemble context
    const context = this.assembleContext(results);

    // Format sources
    const sources = results.map((r) => ({
      id: r.id,
      text: r.text || (r.metadata?.text as string) || "",
      score: r.score || 0,
      metadata: r.metadata,
    }));

    // Generate answer if requested
    let answer: string | undefined;
    if (options?.generate !== false && this.generationProvider) {
      answer = await this.generateAnswer(
        query,
        context,
        options?.systemPrompt,
        options?.temperature,
      );
    }

    const queryTime = Date.now() - startTime;

    logger.info("[RAGPipeline] Query completed", {
      query: query.slice(0, 50),
      retrievalMethod,
      resultsCount: results.length,
      reranked,
      queryTime,
    });

    return {
      answer,
      context,
      sources,
      metadata: {
        queryTime,
        retrievalMethod,
        chunksRetrieved: results.length,
        reranked,
      },
    };
  }

  /**
   * Get pipeline statistics
   */
  getStats(): PipelineStats {
    return {
      totalDocuments: this.documents.size,
      totalChunks: this.allChunks.length,
      indexName: this.config.indexName ?? "default",
      embeddingDimension: this.allChunks[0]?.embedding?.length,
      hybridSearchEnabled: this.config.enableHybridSearch ?? false,
      graphRAGEnabled: this.config.enableGraphRAG ?? false,
    };
  }

  /**
   * Get pipeline ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * Clear all indexed data
   */
  async clear(): Promise<void> {
    this.documents.clear();
    this.allChunks = [];
    this.graphRAG = new GraphRAG({ threshold: this.config.graphThreshold });

    if ("delete" in this.vectorStore) {
      // Clear vector store if supported
      // Note: InMemoryVectorStore doesn't have a clear method
    }

    logger.info("[RAGPipeline] Pipeline cleared", { id: this.id });
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Ensure pipeline is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.embeddingProvider) {
      await this.initialize();
    }
  }

  /**
   * Generate embedding for text
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    if (!this.embeddingProvider) {
      throw new Error("Embedding provider not initialized");
    }

    if (
      typeof (this.embeddingProvider as unknown as { embed?: unknown })
        .embed !== "function"
    ) {
      throw new Error(
        `Provider ${this.config.embeddingModel.provider} does not support embeddings`,
      );
    }

    return await (
      this.embeddingProvider as unknown as {
        embed: (s: string) => Promise<number[]>;
      }
    ).embed(text);
  }

  /**
   * Assemble context from results
   */
  private assembleContext(results: VectorQueryResult[]): string {
    return results
      .map((r, i) => {
        const text = r.text || (r.metadata?.text as string) || "";
        const source = r.metadata?.source || `chunk-${i + 1}`;
        return `[Source ${i + 1}: ${source}]\n${text}`;
      })
      .join("\n\n---\n\n");
  }

  /**
   * Generate answer using LLM
   */
  private async generateAnswer(
    query: string,
    context: string,
    customSystemPrompt?: string,
    temperature?: number,
  ): Promise<string> {
    if (!this.generationProvider) {
      throw new Error("Generation provider not configured");
    }

    const systemPrompt =
      customSystemPrompt ||
      `You are a helpful assistant that answers questions based on the provided context.
Use only the information from the context to answer the question.
If the context doesn't contain relevant information, say so.
Cite sources when possible using [Source N] format.`;

    const prompt = `Context:\n${context}\n\nQuestion: ${query}\n\nAnswer:`;

    const result = await this.generationProvider.generate({
      prompt,
      systemPrompt,
      temperature:
        temperature ?? this.config.generationModel?.temperature ?? 0.7,
      maxTokens: this.config.generationModel?.maxTokens ?? 1000,
    });

    return result?.content || "";
  }
}

/**
 * Create a simple RAG pipeline with sensible defaults
 *
 * @param options - Basic configuration options
 * @returns Configured RAGPipeline instance
 */
export function createRAGPipeline(options: {
  provider?: string;
  embeddingModel?: string;
  generationModel?: string;
  enableHybrid?: boolean;
  enableGraph?: boolean;
}): RAGPipeline {
  const provider = options.provider || "openai";

  return new RAGPipeline({
    embeddingModel: {
      provider,
      modelName: options.embeddingModel || "text-embedding-3-small",
    },
    generationModel: options.generationModel
      ? {
          provider,
          modelName: options.generationModel,
        }
      : undefined,
    enableHybridSearch: options.enableHybrid,
    enableGraphRAG: options.enableGraph,
  });
}
