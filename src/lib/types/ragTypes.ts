/**
 * RAG Type Definitions
 *
 * Canonical type file for all RAG (Retrieval-Augmented Generation) interfaces.
 * All exported interfaces from src/lib/rag/ are collected here as type aliases.
 */

import type {
  BaseChunkerConfig,
  BM25Result,
  Chunk,
  ChunkingStrategy,
  DocumentType,
  ExtractionResult,
  ExtractParams,
  HybridSearchConfig,
  MetadataFilter,
  RerankResult,
  RerankerOptions,
  VectorQueryResult,
} from "../rag/types.js";

/**
 * Citation format options
 */
export type CitationFormat = "inline" | "footnote" | "numbered" | "none";

// ============================================================================
// Chunker Types (from src/lib/rag/types.ts)
// ============================================================================

/**
 * Chunker type - all chunking strategies implement this
 */
export type Chunker = {
  /** Strategy name for identification */
  readonly strategy: ChunkingStrategy;

  /**
   * Split text into chunks
   * @param text - The text to chunk
   * @param config - Strategy-specific configuration
   * @returns Array of chunks
   */
  chunk(text: string, config?: BaseChunkerConfig): Promise<Chunk[]>;
};

// ============================================================================
// Context Assembly Types (from src/lib/rag/pipeline/contextAssembly.ts)
// ============================================================================

/**
 * Context assembly options
 */
export type ContextAssemblyOptions = {
  /** Maximum characters in assembled context */
  maxChars?: number;
  /** Maximum tokens (approximate, 4 chars/token) */
  maxTokens?: number;
  /** Citation format to use */
  citationFormat?: CitationFormat;
  /** Separator between chunks */
  separator?: string;
  /** Include chunk metadata in context */
  includeMetadata?: boolean;
  /** Deduplicate overlapping content */
  deduplicate?: boolean;
  /** Similarity threshold for deduplication (0-1) */
  dedupeThreshold?: number;
  /** Order by relevance score */
  orderByRelevance?: boolean;
  /** Include section headers */
  includeSectionHeaders?: boolean;
  /** Header template (use {index}, {source}, {score} placeholders) */
  headerTemplate?: string;
};

/**
 * Context window representation
 */
export type ContextWindow = {
  /** Assembled context text */
  text: string;
  /** Number of chunks included */
  chunkCount: number;
  /** Total character count */
  charCount: number;
  /** Estimated token count */
  tokenCount: number;
  /** Chunks that were truncated/excluded */
  truncatedChunks: number;
  /** Citation map (id -> citation text) */
  citations: Map<string, string>;
};

// ============================================================================
// Metadata Extractor Types (from src/lib/rag/metadata/MetadataExtractorFactory.ts)
// ============================================================================

/**
 * Supported metadata extractor types
 */
export type MetadataExtractorType =
  | "llm"
  | "title"
  | "summary"
  | "keywords"
  | "questions"
  | "custom"
  | "composite";

/**
 * Metadata Extractor type - all extractors implement this
 */
export type MetadataExtractor = {
  /** Extractor type identifier */
  readonly type: MetadataExtractorType;

  /**
   * Extract metadata from chunks
   * @param chunks - Array of chunks to extract metadata from
   * @param params - Extraction parameters
   * @returns Array of extraction results
   */
  extract(chunks: Chunk[], params?: ExtractParams): Promise<ExtractionResult[]>;
};

/**
 * Metadata extractor configuration
 */
export type MetadataExtractorConfig = {
  /** Extractor type */
  type: MetadataExtractorType;
  /** Language model provider */
  provider?: string;
  /** Model name for LLM-based extraction */
  modelName?: string;
  /** Custom prompt template */
  promptTemplate?: string;
  /** Maximum tokens for LLM response */
  maxTokens?: number;
  /** Temperature for LLM generation */
  temperature?: number;
};

/**
 * Metadata extractor metadata for discovery and documentation
 */
export type MetadataExtractorMetadata = {
  /** Human-readable description */
  description: string;
  /** Default configuration */
  defaultConfig: Partial<MetadataExtractorConfig>;
  /** Supported configuration options */
  supportedOptions: string[];
  /** Recommended use cases */
  useCases: string[];
  /** Alternative names for this extractor */
  aliases: string[];
  /** Whether this extractor requires an AI model */
  requiresModel: boolean;
  /** Extraction types this extractor can produce */
  extractionTypes: string[];
};

// ============================================================================
// Resilience Types (from src/lib/rag/resilience/)
// ============================================================================

/**
 * RAG-specific retry configuration
 */
export type RAGRetryConfig = {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries: number;
  /** Initial delay in ms (default: 1000) */
  initialDelay: number;
  /** Maximum delay in ms (default: 30000) */
  maxDelay: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier: number;
  /** Whether to add jitter (default: true) */
  jitter: boolean;
  /** Custom function to determine if error is retryable */
  shouldRetry?: (error: Error) => boolean;
  /** Retryable error codes */
  retryableErrorCodes?: string[];
  /** Retryable HTTP status codes */
  retryableStatusCodes?: number[];
};

/**
 * Circuit breaker configuration
 */
export type RAGCircuitBreakerConfig = {
  /** Number of failures before opening circuit (default: 5) */
  failureThreshold: number;
  /** Time in ms before attempting reset (default: 60000) */
  resetTimeout: number;
  /** Max calls allowed in half-open state (default: 3) */
  halfOpenMaxCalls: number;
  /** Operation timeout in ms (default: 30000) */
  operationTimeout: number;
  /** Minimum calls before calculating failure rate (default: 10) */
  minimumCallsBeforeCalculation: number;
  /** Time window for statistics in ms (default: 300000 - 5 minutes) */
  statisticsWindowSize: number;
};

/**
 * Circuit breaker statistics
 */
export type RAGCircuitBreakerStats = {
  state: CircuitState;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  failureRate: number;
  windowCalls: number;
  lastStateChange: Date;
  nextRetryTime?: Date;
  halfOpenCalls: number;
  averageLatency: number;
  p95Latency: number;
};

// Re-import CircuitState for use in RAGCircuitBreakerStats
import type { CircuitState } from "../rag/resilience/CircuitBreaker.js";

// ============================================================================
// Pipeline Types (from src/lib/rag/pipeline/RAGPipeline.ts)
// ============================================================================

/**
 * Embedding model configuration
 */
export type EmbeddingModelConfig = {
  provider: string;
  modelName: string;
};

/**
 * Generation model configuration
 */
export type GenerationModelConfig = {
  provider: string;
  modelName: string;
  temperature?: number;
  maxTokens?: number;
};

/**
 * RAG pipeline configuration
 */
export type RAGPipelineConfig = {
  /** Pipeline identifier */
  id?: string;
  /** Vector store instance (defaults to in-memory) */
  vectorStore?: VectorStore;
  /** BM25 index for hybrid search (defaults to in-memory) */
  bm25Index?: BM25Index;
  /** Index name for vector store */
  indexName?: string;
  /** Embedding model configuration */
  embeddingModel: EmbeddingModelConfig;
  /** Generation model configuration (for RAG responses) */
  generationModel?: GenerationModelConfig;
  /** Default chunking strategy */
  defaultChunkingStrategy?: ChunkingStrategy;
  /** Default chunk size */
  defaultChunkSize?: number;
  /** Default chunk overlap */
  defaultChunkOverlap?: number;
  /** Enable hybrid search (vector + BM25) */
  enableHybridSearch?: boolean;
  /** Enable Graph RAG */
  enableGraphRAG?: boolean;
  /** Graph RAG similarity threshold */
  graphThreshold?: number;
  /** Default number of results to retrieve */
  defaultTopK?: number;
  /** Enable reranking */
  enableReranking?: boolean;
  /** Reranking model configuration */
  rerankingModel?: EmbeddingModelConfig;
};

/**
 * Ingestion options
 */
export type IngestOptions = {
  /** Chunking strategy override */
  strategy?: ChunkingStrategy;
  /** Chunk size override */
  chunkSize?: number;
  /** Chunk overlap override */
  chunkOverlap?: number;
  /** Custom metadata to add */
  metadata?: Record<string, unknown>;
  /** Extract metadata using LLM */
  extractMetadata?: boolean;
};

/**
 * Query options
 */
export type QueryOptions = {
  /** Number of chunks to retrieve */
  topK?: number;
  /** Use hybrid search */
  hybrid?: boolean;
  /** Use Graph RAG */
  graph?: boolean;
  /** Enable reranking */
  rerank?: boolean;
  /** Metadata filter */
  filter?: Record<string, unknown>;
  /** Include sources in response */
  includeSources?: boolean;
  /** Generate response (vs just retrieve) */
  generate?: boolean;
  /** Custom system prompt for generation */
  systemPrompt?: string;
  /** Temperature for generation */
  temperature?: number;
};

/**
 * Query response
 */
export type RAGResponse = {
  /** Generated answer (if generate=true) */
  answer?: string;
  /** Retrieved context chunks */
  context: string;
  /** Source documents/chunks */
  sources: Array<{
    id: string;
    text: string;
    score: number;
    metadata?: Record<string, unknown>;
  }>;
  /** Query metadata */
  metadata: {
    queryTime: number;
    retrievalMethod: string;
    chunksRetrieved: number;
    reranked: boolean;
  };
};

/**
 * Pipeline statistics
 */
export type PipelineStats = {
  totalDocuments: number;
  totalChunks: number;
  indexName: string;
  embeddingDimension?: number;
  hybridSearchEnabled: boolean;
  graphRAGEnabled: boolean;
};

// ============================================================================
// Reranker Types (from src/lib/rag/reranker/RerankerFactory.ts)
// ============================================================================

/**
 * Supported reranker types
 */
export type RerankerType =
  | "llm"
  | "cross-encoder"
  | "cohere"
  | "simple"
  | "batch";

/**
 * Reranker type - all rerankers implement this
 */
export type Reranker = {
  /** Reranker type identifier */
  readonly type: RerankerType;

  /**
   * Rerank results based on query relevance
   * @param results - Vector search results to rerank
   * @param query - Original search query
   * @param options - Reranking options
   * @returns Reranked results with scores
   */
  rerank(
    results: VectorQueryResult[],
    query: string,
    options?: RerankerOptions,
  ): Promise<RerankResult[]>;
};

/**
 * Reranker configuration
 */
export type RerankerConfig = {
  /** Reranker type */
  type: RerankerType;
  /** Model name for LLM-based rerankers */
  model?: string;
  /** Provider for the model */
  provider?: string;
  /** Number of results to return after reranking */
  topK?: number;
  /** Scoring weights */
  weights?: {
    semantic?: number;
    vector?: number;
    position?: number;
  };
  /** API key for external services (e.g., Cohere) */
  apiKey?: string;
};

/**
 * Reranker metadata for discovery and documentation
 */
export type RerankerMetadata = {
  /** Human-readable description */
  description: string;
  /** Default configuration */
  defaultConfig: Partial<RerankerConfig>;
  /** Supported configuration options */
  supportedOptions: string[];
  /** Recommended use cases */
  useCases: string[];
  /** Alternative names for this reranker */
  aliases: string[];
  /** Whether this reranker requires an AI model */
  requiresModel: boolean;
  /** Whether this reranker requires external API */
  requiresExternalAPI: boolean;
};

// ============================================================================
// Retrieval Types (from src/lib/rag/retrieval/)
// ============================================================================

/**
 * BM25 Index type
 * Implementations should provide sparse retrieval capabilities
 */
export type BM25Index = {
  /**
   * Search documents using BM25 algorithm
   * @param query - Search query string
   * @param topK - Number of results to return
   * @returns Array of BM25 results
   */
  search(query: string, topK?: number): Promise<BM25Result[]>;

  /**
   * Add documents to the index
   * @param documents - Documents to index
   */
  addDocuments(
    documents: Array<{
      id: string;
      text: string;
      metadata?: Record<string, unknown>;
    }>,
  ): Promise<void>;
};

/**
 * Hybrid search configuration for creating a search function
 */
export type HybridSearchOptions = {
  /** Vector store instance */
  vectorStore: VectorStore;
  /** BM25 index instance */
  bm25Index: BM25Index;
  /** Index name for vector store */
  indexName: string;
  /** Embedding model configuration (optional - uses defaults from ProviderFactory if not specified) */
  embeddingModel?: {
    provider?: string;
    modelName?: string;
  };
  /** Default search configuration */
  defaultConfig?: HybridSearchConfig;
};

/**
 * Abstract vector store type
 * Vector stores should implement this type to work with the query tool
 */
export type VectorStore = {
  query(params: {
    indexName: string;
    queryVector: number[];
    topK?: number;
    filter?: MetadataFilter;
    includeVectors?: boolean;
  }): Promise<VectorQueryResult[]>;
};

// ============================================================================
// Document Loader Types (from src/lib/rag/document/loaders.ts)
// ============================================================================

/**
 * Document loader options
 */
export type LoaderOptions = {
  /** Custom metadata to add to document */
  metadata?: Record<string, unknown>;
  /** Encoding for text files */
  encoding?: BufferEncoding;
  /** Document type override */
  type?: DocumentType;
};

/**
 * Web loader options
 */
export type WebLoaderOptions = LoaderOptions & {
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Custom headers for request */
  headers?: Record<string, string>;
  /** Extract only main content (remove navigation, ads, etc.) */
  extractMainContent?: boolean;
  /** Selector for main content (CSS selector) */
  contentSelector?: string;
  /** User agent string */
  userAgent?: string;
};

/**
 * PDF loader options
 */
export type PDFLoaderOptions = LoaderOptions & {
  /** Page range to extract (e.g., "1-5" or "1,3,5") */
  pageRange?: string;
  /** Extract images as base64 */
  extractImages?: boolean;
  /** OCR for scanned documents */
  enableOCR?: boolean;
  /** Preserve layout formatting */
  preserveLayout?: boolean;
};

/**
 * CSV loader options
 */
export type CSVLoaderOptions = LoaderOptions & {
  /** Delimiter character */
  delimiter?: string;
  /** Whether first row is header */
  hasHeader?: boolean;
  /** Column names (if no header) */
  columns?: string[];
  /** Output format */
  outputFormat?: "text" | "json" | "markdown";
};

/**
 * Abstract document loader type
 */
export type DocumentLoader = {
  /**
   * Load document from source
   * @param source - File path, URL, or content
   * @param options - Loader options
   * @returns Promise resolving to MDocument
   */
  load(
    source: string,
    options?: LoaderOptions,
  ): Promise<import("../rag/document/MDocument.js").MDocument>;

  /**
   * Check if loader can handle the source
   * @param source - File path, URL, or content
   * @returns True if loader can handle the source
   */
  canHandle(source: string): boolean;
};
