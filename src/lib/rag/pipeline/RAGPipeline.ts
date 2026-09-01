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
import type {
  Chunk,
  VectorQueryResult,
  VectorStore,
  UpsertableVectorStore,
  BM25Index,
  AIProvider,
  RAGPipelineConfig,
  IngestOptions,
  QueryOptions,
  RAGResponse,
  PipelineStats,
  MultiModalRAGConfig,
  MultiModalChunk,
  MultiModalQuery,
  MultiModalSearchResult,
  MultiModalMatchType,
  EmbedInput,
} from "../../types/index.js";
import { MDocument } from "../document/MDocument.js";
import { loadDocument } from "../document/loaders.js";
import { InMemoryVectorStore } from "../retrieval/vectorQueryTool.js";
import {
  InMemoryBM25Index,
  createHybridSearch,
} from "../retrieval/hybridSearch.js";

import { GraphRAG } from "../graphRag/graphRAG.js";
import { rerank } from "../reranker/reranker.js";
import { ProviderFactory } from "../../factories/providerFactory.js";
import { ImageLoader } from "../document/imageLoader.js";
import { ImageProcessor } from "../../utils/imageProcessor.js";
import { redactUrlForError } from "../../utils/logSanitize.js";

import {
  SpanSerializer,
  SpanType,
  SpanStatus,
  getMetricsAggregator,
} from "../../observability/index.js";
import { logger } from "../../utils/logger.js";
import { withTimeout } from "../../utils/async/withTimeout.js";
import { ErrorFactory } from "../../utils/errorHandling.js";
/**
 * RAG Pipeline Orchestrator
 *
 * Complete end-to-end pipeline for Retrieval-Augmented Generation.
 */
/** Default timeout for external provider calls (30 seconds) */
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Runtime-validating guard for {@link UpsertableVectorStore}.
 */
function isUpsertableVectorStore(
  store: VectorStore,
): store is UpsertableVectorStore {
  return "upsert" in store;
}

export class RAGPipeline {
  private id: string;
  private config: RAGPipelineConfig;
  private vectorStore: VectorStore;
  private bm25Index: BM25Index;
  private graphRAG: GraphRAG;
  private embeddingProvider?: AIProvider;
  private multiModalEmbeddingProvider?: AIProvider;
  private generationProvider?: AIProvider;
  /**
   * Vision provider for image captioning, when `multiModal.captionProvider` /
   * `captionModel` name one. Undefined means captioning uses
   * {@link generationProvider} — captioning has always run on that provider,
   * and these two fields were declared but read nowhere, so a caller who set
   * them got the pipeline's generation model with no indication otherwise.
   */
  private captionProvider?: AIProvider;
  private hybridSearch?: ReturnType<typeof createHybridSearch>;
  private documents: Map<string, MDocument> = new Map();
  private allChunks: Chunk[] = [];
  private multiModalConfig?: MultiModalRAGConfig;
  private imageLoader: ImageLoader;

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

    this.multiModalConfig = config.multiModal;
    this.imageLoader = new ImageLoader({
      maxImageSize: config.multiModal?.maxImageSize,
    });

    // Initialize stores
    this.vectorStore = config.vectorStore || new InMemoryVectorStore();
    if (
      config.multiModal?.enabled &&
      !isUpsertableVectorStore(this.vectorStore)
    ) {
      throw ErrorFactory.invalidConfiguration(
        "vectorStore",
        "multi-modal RAG requires a vector store that supports upsert()",
      );
    }
    this.bm25Index = config.bm25Index || new InMemoryBM25Index();
    this.graphRAG = new GraphRAG({ threshold: this.config.graphThreshold });

    logger.info("[RAGPipeline] Pipeline initialized", {
      id: this.id,
      indexName: this.config.indexName,
      embeddingModel: this.config.embeddingModel,
      multiModalEnabled: config.multiModal?.enabled ?? false,
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

    // A caption model only makes sense alongside the caption strategy, but it
    // is built whenever named rather than gated on the strategy: the strategy
    // is read per-ingest and can differ from the one set at construction.
    const captionModelName = this.multiModalConfig?.captionModel;
    if (captionModelName) {
      this.captionProvider = await ProviderFactory.createProvider(
        this.multiModalConfig?.captionProvider ??
          this.config.generationModel?.provider ??
          this.config.embeddingModel.provider,
        captionModelName,
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
        if (isUpsertableVectorStore(this.vectorStore)) {
          await this.vectorStore.upsert(
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
    const span = SpanSerializer.createSpan(SpanType.RAG, "rag.pipeline", {
      "rag.operation": "pipeline",
      "rag.query": query.slice(0, 200),
      "rag.topK": options?.topK ?? this.config.defaultTopK ?? 5,
      "rag.hybrid": options?.hybrid ?? this.config.enableHybridSearch ?? false,
      "rag.graph": options?.graph ?? this.config.enableGraphRAG ?? false,
      "rag.rerank": options?.rerank ?? this.config.enableReranking ?? false,
    });
    const spanStartTime = Date.now();
    try {
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
        const hybridResults = await this.hybridSearch(query, {
          topK: topK * 2,
        });
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

      const response: RAGResponse = {
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

      span.durationMs = Date.now() - spanStartTime;
      const endedSpan = SpanSerializer.endSpan(span, SpanStatus.OK);
      endedSpan.attributes = {
        ...endedSpan.attributes,
        "rag.retrieval_method": retrievalMethod,
        "rag.results_count": results.length,
        "rag.reranked": reranked,
      };
      getMetricsAggregator().recordSpan(endedSpan);
      return response;
    } catch (error) {
      span.durationMs = Date.now() - spanStartTime;
      const endedSpan = SpanSerializer.endSpan(span, SpanStatus.ERROR);
      endedSpan.statusMessage =
        error instanceof Error ? error.message : String(error);
      getMetricsAggregator().recordSpan(endedSpan);
      throw error;
    }
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
  // Multi-Modal Methods
  // ============================================================================

  /**
   * Ingest images into the pipeline for multi-modal RAG.
   * Loads images, generates embeddings via the configured multi-modal provider,
   * and stores them alongside text chunks in the vector store.
   *
   * @param sources - Array of image file paths, URLs, or Buffer objects
   * @param options - Ingestion options
   */
  async ingestImages(
    sources: Array<string | Buffer>,
    options?: IngestOptions,
  ): Promise<{ imagesProcessed: number; chunksCreated: number }> {
    if (!this.multiModalConfig?.enabled) {
      throw ErrorFactory.invalidConfiguration(
        "multiModal",
        "multi-modal RAG is not enabled; pass a multiModal config with enabled: true",
      );
    }

    await this.ensureInitialized();

    let imagesProcessed = 0;
    let chunksCreated = 0;

    for (const source of sources) {
      try {
        // Load the image
        let imageDoc;
        if (Buffer.isBuffer(source)) {
          const detectedMimeType = ImageProcessor.detectImageType(source);
          if (detectedMimeType === "application/octet-stream") {
            throw new Error(
              "Could not detect image type from buffer contents; unsupported image data",
            );
          }
          imageDoc = this.imageLoader.loadFromBuffer(
            source,
            detectedMimeType,
            `inline-${imagesProcessed}`,
          );
        } else {
          imageDoc = await this.imageLoader.load(source);
        }

        const { supportedFormats } = this.multiModalConfig;
        if (supportedFormats && !supportedFormats.includes(imageDoc.mimeType)) {
          throw ErrorFactory.invalidParameters(
            "ingestImages",
            new Error(`unsupported image MIME type: ${imageDoc.mimeType}`),
            { mimeType: imageDoc.mimeType, supportedFormats },
          );
        }

        // Generate text representation for the image
        let imageText = imageDoc.text;
        if (
          this.multiModalConfig.imageTextStrategy === "caption" &&
          (this.captionProvider || this.generationProvider)
        ) {
          imageText = await this.generateImageCaption(
            imageDoc.image,
            imageDoc.mimeType,
          );
        } else if (this.multiModalConfig.imageTextStrategy === "filename") {
          imageText = redactUrlForError(imageDoc.metadata.source);
        } else if (this.multiModalConfig.imageTextStrategy === "none") {
          imageText = "";
        }

        // Generate embedding using the configured multi-modal provider
        const embedding = await this.generateMultiModalEmbedding({
          text: imageText,
          image: imageDoc.image,
          mimeType: imageDoc.mimeType,
        });

        // `IngestOptions.metadata` is a loose record, so a caller's `custom`
        // arrives as `unknown`. Narrowed rather than asserted: a caller that
        // puts a string there should not silently produce a metadata object
        // with `hasImage` spread across its characters.
        const callerCustom = options?.metadata?.custom;
        const inheritedCustom =
          typeof callerCustom === "object" && callerCustom !== null
            ? callerCustom
            : {};

        // Create a chunk from the image document
        const chunk: MultiModalChunk = {
          id: `img-chunk-${randomUUID().slice(0, 8)}`,
          text: imageText,
          metadata: {
            // Caller metadata first, pipeline-owned fields after. Spread last,
            // a caller passing `custom` replaced the whole object and removed
            // `hasImage` — the one key the retrieval path checks.
            ...options?.metadata,
            documentId: `img-${randomUUID().slice(0, 8)}`,
            chunkIndex: 0,
            startPosition: 0,
            endPosition: imageDoc.image.byteLength,
            source: imageDoc.metadata.source,
            custom: { ...inheritedCustom, hasImage: true },
          },
          embedding,
          image: imageDoc.image,
          imageMimeType: imageDoc.mimeType,
          imageMeta: {
            width: imageDoc.metadata.width,
            height: imageDoc.metadata.height,
            format: imageDoc.metadata.format,
            source: imageDoc.metadata.source,
            hasImage: true,
          },
        };

        // Store in vector store
        if (isUpsertableVectorStore(this.vectorStore)) {
          await this.vectorStore.upsert(this.config.indexName ?? "default", [
            {
              id: chunk.id,
              vector: embedding,
              // Derived from chunk.metadata, as the text path does, rather
              // than hand-listed. Hand-listing is what caused the two paths to
              // diverge: caller metadata never reached the image records, so a
              // filtered query silently returned no images while the identical
              // call worked for text.
              metadata: {
                ...chunk.metadata,
                text: imageText,
                source: imageDoc.metadata.source,
                hasImage: true,
                mimeType: imageDoc.mimeType,
              },
            },
          ]);
        }

        // Add to BM25 index with text description. An empty text
        // representation ("none" strategy) is not indexable and would skew
        // the average document length used by BM25 scoring.
        if (imageText.length > 0) {
          await this.bm25Index.addDocuments([
            {
              id: chunk.id,
              text: imageText,
              metadata: chunk.metadata,
            },
          ]);
        }

        // Retained without the decoded image. `allChunks` is only emptied by
        // clear(), so keeping the buffer means the heap grows by the full size
        // of every image ever ingested, for the life of the process —
        // `maxImageSize` bounds one image, nothing bounds the sum. Nothing
        // reads it back: createGraph uses text/metadata/embedding, and
        // getMultiModalStats filters on imageMeta.hasImage.
        const { image: _retainedImage, ...chunkWithoutImage } = chunk;
        this.allChunks.push(chunkWithoutImage);
        imagesProcessed++;
        chunksCreated++;

        logger.debug("[RAGPipeline] Image ingested", {
          source: redactUrlForError(imageDoc.metadata.source),
          textLength: imageText.length,
          embeddingDimension: embedding.length,
        });
      } catch (error) {
        logger.error("[RAGPipeline] Failed to ingest image", {
          source:
            typeof source === "string" ? redactUrlForError(source) : "buffer",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info("[RAGPipeline] Image ingestion complete", {
      imagesProcessed,
      chunksCreated,
    });

    return { imagesProcessed, chunksCreated };
  }

  /**
   * Query the pipeline with multi-modal input (text, image, or both).
   *
   * @param query - Text, image, or combined query
   * @param options - Query options
   * @returns Array of multi-modal search results
   */
  async queryMultiModal(
    query: MultiModalQuery,
    options?: QueryOptions,
  ): Promise<MultiModalSearchResult[]> {
    if (!this.multiModalConfig?.enabled) {
      throw ErrorFactory.invalidConfiguration(
        "multiModal",
        "multi-modal RAG is not enabled; pass a multiModal config with enabled: true",
      );
    }

    await this.ensureInitialized();

    const topK = options?.topK || this.config.defaultTopK || 5;

    // Generate query embedding
    const queryEmbedding = await this.generateMultiModalEmbedding(query);

    const queryHasImage = query.image !== undefined;

    // Search vector store
    const results = await this.vectorStore.query({
      indexName: this.config.indexName ?? "default",
      queryVector: queryEmbedding,
      topK: topK * 2, // get extra for diversity
      filter: options?.filter,
    });

    // Map results to multi-modal search results
    const searchResults: MultiModalSearchResult[] = results.map((r) => {
      const resultHasImage = (r.metadata?.hasImage as boolean) ?? false;

      // Derive match type from BOTH query and result modality so all four
      // combinations are emitted (text-query→image-result is "text-to-image",
      // image-query→text-result is "image-to-text", etc.).
      const resultMatchType: MultiModalMatchType = resultHasImage
        ? queryHasImage
          ? "image-to-image"
          : "text-to-image"
        : queryHasImage
          ? "image-to-text"
          : "text-to-text";

      return {
        chunk: {
          id: r.id,
          text: r.text || (r.metadata?.text as string) || "",
          metadata: {
            documentId: r.id,
            chunkIndex: 0,
            startPosition: 0,
            endPosition: 0,
            source: (r.metadata?.source as string) || "",
          },
          image: undefined, // images not stored in vector store metadata
          imageMimeType: (r.metadata?.mimeType as string) || undefined,
          imageMeta: {
            hasImage: resultHasImage,
            source: (r.metadata?.source as string) || "",
          },
        },
        score: r.score || 0,
        matchType: resultMatchType,
      };
    });

    // Apply diversity across match types
    const diversified = this.diversifyMultiModalResults(searchResults, topK);

    logger.info("[RAGPipeline] Multi-modal query completed", {
      queryType: query.image ? (query.text ? "combined" : "image") : "text",
      resultsCount: diversified.length,
      topScore: diversified.at(0)?.score,
    });

    return diversified;
  }

  /**
   * Get multi-modal pipeline statistics
   */
  getMultiModalStats(): {
    totalImages: number;
    totalTextChunks: number;
    multiModalEnabled: boolean;
  } {
    const imageChunks = this.allChunks.filter(
      (c) => "imageMeta" in c && (c as MultiModalChunk).imageMeta?.hasImage,
    );
    return {
      totalImages: imageChunks.length,
      totalTextChunks: this.allChunks.length - imageChunks.length,
      multiModalEnabled: this.multiModalConfig?.enabled ?? false,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Generate a multi-modal embedding for text, image, or both.
   * Uses the configured multi-modal embedding provider (e.g. Bedrock Titan Image).
   */
  private async generateMultiModalEmbedding(
    input: MultiModalQuery,
  ): Promise<number[]> {
    if (!this.multiModalConfig?.embeddingModel) {
      throw ErrorFactory.missingConfiguration("multiModal.embeddingModel");
    }

    const { provider, modelName } = this.multiModalConfig.embeddingModel;

    // Build the embed input
    const embedInput: EmbedInput = {};
    if (input.text) {
      embedInput.text = input.text;
    }
    if (input.image) {
      embedInput.image = input.image;
    }
    if (input.mimeType) {
      embedInput.mimeType = input.mimeType;
    }

    if (embedInput.text === undefined && embedInput.image === undefined) {
      throw ErrorFactory.invalidParameters(
        "generateMultiModalEmbedding",
        new Error("Multi-modal embedding input requires text, image, or both"),
        {
          hasText: input.text !== undefined,
          hasImage: input.image !== undefined,
        },
      );
    }

    // Cache the provider so repeated ingest/query calls don't re-create it
    if (!this.multiModalEmbeddingProvider) {
      const providerInstance = await ProviderFactory.createProvider(
        provider,
        modelName,
      );
      if (typeof providerInstance.embed !== "function") {
        throw ErrorFactory.invalidConfiguration(
          "multiModal.embeddingModel.provider",
          `${provider} does not support embeddings`,
        );
      }
      this.multiModalEmbeddingProvider = providerInstance;
    }

    return await withTimeout(
      this.multiModalEmbeddingProvider.embed(embedInput),
      DEFAULT_TIMEOUT_MS,
      "Multi-modal embedding generation timed out",
    );
  }

  /**
   * Generate a caption for an image using the generation provider's vision model.
   */
  private async generateImageCaption(
    image: Buffer,
    mimeType: string,
  ): Promise<string> {
    const provider = this.captionProvider ?? this.generationProvider;
    if (!provider) {
      return "Image";
    }

    try {
      const base64 = image.toString("base64");
      const dataUri = `data:${mimeType};base64,${base64}`;

      const result = await withTimeout(
        provider.generate({
          prompt:
            "Describe this image in one sentence for use as a search document. Be specific about the content.",
          systemPrompt:
            "You are an image captioning assistant. Provide concise, descriptive captions.",
          input: { text: "", images: [dataUri] },
          maxTokens: 100,
        }),
        DEFAULT_TIMEOUT_MS,
        "Image captioning timed out",
      );

      return result?.content || "Image";
    } catch (error) {
      logger.warn("[RAGPipeline] Image captioning failed, using fallback", {
        error: error instanceof Error ? error.message : String(error),
      });
      return "Image";
    }
  }

  /**
   * Diversify multi-modal results to ensure a mix of text and image results.
   */
  private diversifyMultiModalResults(
    results: MultiModalSearchResult[],
    topK: number,
  ): MultiModalSearchResult[] {
    if (results.length <= topK) {
      return results;
    }

    const imageResults = results.filter((r) => r.chunk.imageMeta?.hasImage);
    const textResults = results.filter((r) => !r.chunk.imageMeta?.hasImage);

    const diversified: MultiModalSearchResult[] = [];
    let imgIdx = 0;
    let txtIdx = 0;

    // Interleave: alternate between image and text results
    for (
      let i = 0;
      i < topK && (imgIdx < imageResults.length || txtIdx < textResults.length);
      i++
    ) {
      if (i % 2 === 0 && imgIdx < imageResults.length) {
        diversified.push(imageResults[imgIdx++]);
      } else if (txtIdx < textResults.length) {
        diversified.push(textResults[txtIdx++]);
      } else if (imgIdx < imageResults.length) {
        diversified.push(imageResults[imgIdx++]);
      }
    }

    return diversified;
  }

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

    if (typeof this.embeddingProvider.embed !== "function") {
      throw new Error(
        `Provider ${this.config.embeddingModel.provider} does not support embeddings`,
      );
    }

    return await withTimeout(
      this.embeddingProvider.embed(text),
      DEFAULT_TIMEOUT_MS,
      "Embedding generation timed out",
    );
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

    const result = await withTimeout(
      this.generationProvider.generate({
        prompt,
        systemPrompt,
        temperature:
          temperature ?? this.config.generationModel?.temperature ?? 0.7,
        maxTokens: this.config.generationModel?.maxTokens ?? 1000,
      }),
      DEFAULT_TIMEOUT_MS * 2,
      "Answer generation timed out",
    );

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
  multiModal?: MultiModalRAGConfig;
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
    multiModal: options.multiModal,
  });
}
