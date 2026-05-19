import type { Tool } from "./tools.js";

/**
 * RAG Type Definitions
 *
 * Canonical type file for all RAG (Retrieval-Augmented Generation) interfaces.
 * All exported interfaces from src/lib/rag/ are collected here as type aliases.
 */

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
  /**
   * Custom function to determine if error is retryable.
   *
   * Note: In `isRetryable()`, this callback is invoked *before* the built-in
   * abort-error check. If you provide a custom `shouldRetry`, it should
   * explicitly handle abort errors (e.g. return `false` for them) when
   * cancellation correctness is required. Otherwise an aborted operation
   * could be retried instead of propagating immediately.
   */
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

// CircuitState is now defined in this file (see bottom section)

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
  model?: string | { provider: string; modelName: string };
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

// =============================================================================
// CIRCUIT BREAKER TYPES (moved from rag/resilience/CircuitBreaker.ts)
// =============================================================================

/** Circuit breaker state. */
export type CircuitState = "closed" | "open" | "half-open";

/** Event map for RAG circuit breaker. */
export type RAGCircuitBreakerEvents = {
  stateChange: [
    {
      oldState: CircuitState;
      newState: CircuitState;
      reason: string;
      timestamp: Date;
    },
  ];
  callSuccess: [{ duration: number; timestamp: Date; operationType?: string }];
  callFailure: [
    {
      error: string;
      duration: number;
      timestamp: Date;
      operationType?: string;
    },
  ];
  circuitOpen: [{ failureRate: number; totalCalls: number; timestamp: Date }];
  circuitHalfOpen: [{ timestamp: Date }];
  circuitClosed: [{ timestamp: Date }];
};

// =============================================================================
// RAG INTEGRATION TYPES (moved from rag/ragIntegration.ts)
// =============================================================================
/** Prepared RAG tool ready for injection into generate/stream. */
export type RAGPreparedTool = {
  /** The tool to inject into the tools Record */
  tool: Tool;
  /** Tool name (key for the tools Record) */
  toolName: string;
  /** Number of chunks indexed */
  chunksIndexed: number;
  /** Number of files loaded */
  filesLoaded: number;
};

// =============================================================================
// RAG CONFIG (moved from rag/types.ts to break circular dependency)
// =============================================================================

/**
 * RAG configuration for generate() and stream() APIs.
 *
 * When provided, NeuroLink automatically:
 * 1. Loads the specified files
 * 2. Chunks them using the selected strategy
 * 3. Generates embeddings
 * 4. Stores in an in-memory vector store
 * 5. Creates a search tool the AI can invoke on demand
 *
 * @example
 * ```typescript
 * const result = await neurolink.generate({
 *   input: { text: "What is RAG?" },
 *   provider: "vertex",
 *   rag: {
 *     files: ["./docs/guide.md", "./docs/api.md"],
 *     strategy: "markdown",
 *     chunkSize: 512,
 *     topK: 5,
 *   }
 * });
 * ```
 */
export type RAGConfig = {
  /** File paths to load and index for retrieval */
  files: string[];

  /**
   * Chunking strategy to use. If not specified, auto-detected from file extension.
   * @default "recursive"
   */
  strategy?: ChunkingStrategy;

  /**
   * Maximum chunk size in characters.
   * @default 1000
   */
  chunkSize?: number;

  /**
   * Overlap between adjacent chunks in characters.
   * @default 200
   */
  chunkOverlap?: number;

  /**
   * Number of top results to retrieve per query.
   * @default 5
   */
  topK?: number;

  /**
   * Tool name visible to the AI model.
   * @default "search_knowledge_base"
   */
  toolName?: string;

  /**
   * Tool description for the AI model explaining what the knowledge base contains.
   * @default "Search the loaded documents for relevant information to answer the user's question"
   */
  toolDescription?: string;

  /**
   * Embedding model provider for generating embeddings.
   * Defaults to the same provider used for generation.
   */
  embeddingProvider?: string;

  /**
   * Embedding model name.
   * Defaults to the provider's default embedding model.
   */
  embeddingModel?: string;
};
// Document and Chunk Types
// ============================================================================

/**
 * Supported document types for processing
 */
export type DocumentType =
  | "text"
  | "markdown"
  | "html"
  | "json"
  | "latex"
  | "csv"
  | "pdf";

/**
 * Chunk metadata for tracking source and position
 */
export type ChunkMetadata = {
  /** Source document identifier */
  documentId: string;
  /** Original document filename or URL */
  source?: string;
  /** Position in the original document (0-indexed) */
  chunkIndex: number;
  /** Total number of chunks from the document */
  totalChunks?: number;
  /** Start character position in original text */
  startPosition?: number;
  /** End character position in original text */
  endPosition?: number;
  /** Document type (markdown, html, json, etc.) */
  documentType?: DocumentType;
  /** Custom metadata from extraction */
  custom?: Record<string, unknown>;
  /** Extracted title (from metadata extraction) */
  title?: string;
  /** Extracted summary (from metadata extraction) */
  summary?: string;
  /** Extracted keywords (from metadata extraction) */
  keywords?: string[];
  /** Header level for markdown/html chunks */
  headerLevel?: number;
  /** Header text for structured documents */
  header?: string;
  /** JSON path for JSON chunks */
  jsonPath?: string;
  /** LaTeX environment name */
  latexEnvironment?: string;
};

/**
 * Base chunk result with text and metadata
 */
export type Chunk = {
  /** Unique identifier for the chunk */
  id: string;
  /** The text content of the chunk */
  text: string;
  /** Metadata associated with the chunk */
  metadata: ChunkMetadata;
  /** Optional embedding vector (populated after embedding) */
  embedding?: number[];
};

// ============================================================================
// Chunking Strategy Types
// ============================================================================

/**
 * Available chunking strategy types
 */
export type ChunkingStrategy =
  | "character"
  | "recursive"
  | "sentence"
  | "token"
  | "markdown"
  | "html"
  | "json"
  | "latex"
  | "semantic"
  | "semantic-markdown";

/**
 * Validation result for chunker configuration
 */
export type ChunkerValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

/**
 * Base configuration for all chunkers
 */
export type BaseChunkerConfig = {
  /** Maximum chunk size (interpretation varies by strategy) */
  maxSize?: number;
  /** Minimum chunk size */
  minSize?: number;
  /** Overlap between consecutive chunks */
  overlap?: number;
  /** Whether to trim whitespace from chunks */
  trimWhitespace?: boolean;
  /** Custom metadata to add to all chunks */
  metadata?: Record<string, unknown>;
  /** Whether to preserve metadata from source document */
  preserveMetadata?: boolean;
};

/**
 * Character chunker configuration
 * Simple character-based splitting
 */
export type CharacterChunkerConfig = BaseChunkerConfig & {
  /** Character separator (default: "") */
  separator?: string;
  /** Keep separator in chunks */
  keepSeparator?: boolean;
};

/**
 * Recursive chunker configuration
 * Smart splitting based on content structure
 */
export type RecursiveChunkerConfig = BaseChunkerConfig & {
  /** Ordered list of separators to try (default: ["\n\n", "\n", " ", ""]) */
  separators?: string[];
  /** Whether separators are regex patterns */
  isSeparatorRegex?: boolean;
  /** Whether to keep separators in the output chunks */
  keepSeparators?: boolean;
};

/**
 * Sentence chunker configuration
 * Sentence-aware splitting
 */
export type SentenceChunkerConfig = BaseChunkerConfig & {
  /** Sentence ending characters (default: [".", "!", "?", "\n"]) */
  sentenceEnders?: string[];
  /** Minimum sentences per chunk */
  minSentences?: number;
  /** Maximum sentences per chunk */
  maxSentences?: number;
};

/**
 * Token chunker configuration
 * Token-aware splitting using tokenizer
 */
export type TokenChunkerConfig = BaseChunkerConfig & {
  /** Tokenizer to use (default: "cl100k_base" for GPT models) */
  tokenizer?: string;
  /** Model name for token counting (alternative to tokenizer) */
  modelName?: string;
  /** Maximum tokens per chunk */
  maxTokens?: number;
  /** Token overlap between chunks */
  tokenOverlap?: number;
};

/**
 * Markdown chunker configuration
 * Structure-aware markdown splitting
 */
export type MarkdownChunkerConfig = BaseChunkerConfig & {
  /** Header levels to split on (default: [1, 2, 3]) */
  headerLevels?: number[];
  /** Include code blocks as single chunks */
  preserveCodeBlocks?: boolean;
  /** Include the header in the chunk content */
  includeHeader?: boolean;
  /** Strip markdown formatting from output */
  stripFormatting?: boolean;
};

/**
 * HTML chunker configuration
 * HTML structure-aware splitting
 */
export type HTMLChunkerConfig = BaseChunkerConfig & {
  /** Tags to split on (default: ["div", "p", "section", "article"]) */
  splitTags?: string[];
  /** Tags to preserve as single chunks */
  preserveTags?: string[];
  /** Extract text only (strip HTML tags) */
  extractTextOnly?: boolean;
  /** Include tag metadata in chunks */
  includeTagMetadata?: boolean;
};

/**
 * JSON chunker configuration
 * JSON structure-aware splitting
 */
export type JSONChunkerConfig = BaseChunkerConfig & {
  /** Maximum depth to traverse */
  maxDepth?: number;
  /** Keys to split on (arrays/objects at these keys become chunks) */
  splitKeys?: string[];
  /** Keys to preserve as single units */
  preserveKeys?: string[];
  /** Include JSON path in metadata */
  includeJsonPath?: boolean;
};

/**
 * LaTeX chunker configuration
 * LaTeX structure-aware splitting
 */
export type LaTeXChunkerConfig = BaseChunkerConfig & {
  /** Environments to split on (default: ["section", "subsection", "chapter"]) */
  splitEnvironments?: string[];
  /** Preserve math environments as single chunks */
  preserveMath?: boolean;
  /** Include preamble as separate chunk */
  includePreamble?: boolean;
};

/**
 * Semantic chunker configuration
 * LLM-based semantic splitting
 */
export type SemanticChunkerConfig = BaseChunkerConfig & {
  /** Minimum tokens before considering a split */
  joinThreshold?: number;
  /** Model for semantic analysis */
  modelName?: string;
  /** Provider for the model */
  provider?: string;
  /** Custom prompt for semantic grouping */
  semanticPrompt?: string;
  /** Maximum header depth to consider for grouping */
  maxHeaderDepth?: number;
  /** Similarity threshold for grouping (0-1) */
  similarityThreshold?: number;
};

/**
 * Union type for all chunker configurations
 */
export type ChunkerConfig =
  | CharacterChunkerConfig
  | RecursiveChunkerConfig
  | SentenceChunkerConfig
  | TokenChunkerConfig
  | MarkdownChunkerConfig
  | HTMLChunkerConfig
  | JSONChunkerConfig
  | LaTeXChunkerConfig
  | SemanticChunkerConfig;

/**
 * Chunker type - all chunking strategies implement this
 */

/**
 * Chunker metadata for factory registration
 */
export type ChunkerMetadata = {
  /** Human-readable description */
  description: string;
  /** Supported document types */
  supportedTypes?: DocumentType[];
  /** Whether the chunker requires external dependencies */
  requiresExternalDeps?: boolean;
  /** Default configuration (can be any chunker-specific config) */
  defaultConfig?: Record<string, unknown>;
  /** Supported configuration options */
  supportedOptions?: string[];
  /** Use cases where this chunker excels */
  useCases?: string[];
  /** Alternative names/aliases for this chunker */
  aliases?: string[];
};

// ============================================================================
// Metadata Extraction Types
// ============================================================================

/**
 * Metadata extraction types
 */
export type ExtractorType =
  | "title"
  | "summary"
  | "keywords"
  | "questions"
  | "custom";

/**
 * Base configuration for metadata extractors
 */
export type BaseExtractorConfig = {
  /** Language model to use for extraction */
  modelName?: string;
  /** Provider for the model */
  provider?: string;
  /** Custom prompt template */
  promptTemplate?: string;
  /** Maximum tokens for LLM response */
  maxTokens?: number;
  /** Temperature for LLM generation */
  temperature?: number;
};

/**
 * Title extractor configuration
 */
export type TitleExtractorConfig = BaseExtractorConfig & {
  /** Number of nodes to use for title extraction */
  nodes?: number;
  /** Template for processing individual nodes */
  nodeTemplate?: string;
  /** Template for combining node results */
  combineTemplate?: string;
};

/**
 * Summary extractor configuration
 */
export type SummaryExtractorConfig = BaseExtractorConfig & {
  /** Summary types to generate */
  summaryTypes?: ("current" | "previous" | "next")[];
  /** Maximum summary length in words */
  maxWords?: number;
};

/**
 * Keyword extractor configuration
 */
export type KeywordExtractorConfig = BaseExtractorConfig & {
  /** Maximum number of keywords to extract */
  maxKeywords?: number;
  /** Minimum keyword relevance score (0-1) */
  minRelevance?: number;
};

/**
 * Question-Answer extractor configuration
 */
export type QuestionExtractorConfig = BaseExtractorConfig & {
  /** Number of Q&A pairs to generate */
  numQuestions?: number;
  /** Include answers in output */
  includeAnswers?: boolean;
  /** Generate embedding-only questions (shorter, more focused) */
  embeddingOnly?: boolean;
};

/**
 * Custom schema extractor configuration
 */
export type CustomSchemaExtractorConfig = BaseExtractorConfig & {
  /** Zod schema for structured extraction */
  schema: unknown; // ZodType
  /** Description of what to extract */
  description?: string;
};

/**
 * Combined extraction parameters
 */
export type ExtractParams = {
  /** Extract document title */
  title?: boolean | TitleExtractorConfig;
  /** Extract document summary */
  summary?: boolean | SummaryExtractorConfig;
  /** Extract keywords */
  keywords?: boolean | KeywordExtractorConfig;
  /** Generate Q&A pairs */
  questions?: boolean | QuestionExtractorConfig;
  /** Custom schema extraction */
  custom?: CustomSchemaExtractorConfig;
};

/**
 * Extraction result for a single chunk
 */
export type ExtractionResult = {
  /** Extracted title */
  title?: string;
  /** Extracted summary */
  summary?: string;
  /** Extracted keywords */
  keywords?: string[];
  /** Generated Q&A pairs */
  questions?: Array<{ question: string; answer?: string }>;
  /** Custom schema extraction result */
  custom?: Record<string, unknown>;
};

// ============================================================================
// Vector Query Types
// ============================================================================

/**
 * Request context for dynamic configuration
 */
export type RequestContext = {
  userId?: string;
  tenantId?: string;
  environment?: string;
  custom?: Record<string, unknown>;
};

/**
 * Metadata filter using MongoDB/Sift query syntax
 */
export type MetadataFilter = {
  // Comparison operators
  $eq?: unknown;
  $ne?: unknown;
  $gt?: number;
  $gte?: number;
  $lt?: number;
  $lte?: number;
  $in?: unknown[];
  $nin?: unknown[];

  // Logical operators
  $and?: MetadataFilter[];
  $or?: MetadataFilter[];
  $not?: MetadataFilter;
  $nor?: MetadataFilter[];

  // Special operators
  $exists?: boolean;
  $contains?: string;
  $regex?: string;
  $size?: number;

  // Field-level filters
  [field: string]: unknown;
};

/**
 * Vector store query result
 */
export type VectorQueryResult = {
  /** Unique identifier */
  id: string;
  /** Text content */
  text?: string;
  /** Similarity/relevance score */
  score?: number;
  /** Associated metadata */
  metadata?: Record<string, unknown>;
  /** Embedding vector (if requested) */
  vector?: number[];
};

/**
 * Reranker configuration
 */

/**
 * Provider-specific query options
 */
export type VectorProviderOptions = {
  /** Pinecone options */
  pinecone?: {
    namespace?: string;
    sparseVector?: number[];
  };
  /** pgVector options */
  pgVector?: {
    minScore?: number;
    ef?: number;
    probes?: number;
  };
  /** Chroma options */
  chroma?: {
    where?: Record<string, unknown>;
    whereDocument?: Record<string, unknown>;
  };
};

/**
 * Vector query tool configuration
 */
export type VectorQueryToolConfig = {
  /** Tool identifier */
  id?: string;
  /** Tool description for AI agents */
  description?: string;
  /** Index name within the vector store */
  indexName: string;
  /** Embedding model specification */
  embeddingModel: {
    provider: string;
    modelName: string;
  };
  /** Enable metadata filtering */
  enableFilter?: boolean;
  /** Include embedding vectors in results */
  includeVectors?: boolean;
  /** Include full source objects in results */
  includeSources?: boolean;
  /** Number of results to return */
  topK?: number;
  /** Reranker configuration */
  reranker?: RerankerConfig;
  /** Provider-specific options */
  providerOptions?: VectorProviderOptions;
};

/**
 * Vector query result wrapper
 */
export type VectorQueryResponse = {
  /** Formatted relevant context string */
  relevantContext: string;
  /** Source query results */
  sources: VectorQueryResult[];
  /** Total results found */
  totalResults: number;
  /** Query metadata */
  metadata: {
    queryTime: number;
    reranked: boolean;
    filtered: boolean;
  };
};

// ============================================================================
// Hybrid Search Types
// ============================================================================

/**
 * BM25 search result
 */
export type BM25Result = {
  /** Document ID */
  id: string;
  /** BM25 score */
  score: number;
  /** Document text */
  text: string;
  /** Associated metadata */
  metadata?: Record<string, unknown>;
};

/**
 * Hybrid search configuration
 */
export type HybridSearchConfig = {
  /** Weight for vector search (0-1) */
  vectorWeight?: number;
  /** Weight for BM25 search (0-1) */
  bm25Weight?: number;
  /** Fusion method */
  fusionMethod?: "rrf" | "linear";
  /** RRF k parameter */
  rrfK?: number;
  /** Number of results to return */
  topK?: number;
  /** Enable reranking */
  enableReranking?: boolean;
  /** Reranker configuration */
  reranker?: RerankerConfig;
};

/**
 * Hybrid search result
 */
export type HybridSearchResult = {
  /** Document ID */
  id: string;
  /** Combined score */
  score: number;
  /** Document text */
  text: string;
  /** Associated metadata */
  metadata?: Record<string, unknown>;
  /** Score breakdown */
  scores?: {
    vector?: number;
    bm25?: number;
    combined?: number;
    reranked?: number;
  };
};

// ============================================================================
// Graph RAG Types
// ============================================================================

/**
 * Graph node representing a document chunk
 */
export type GraphNode = {
  /** Unique node identifier */
  id: string;
  /** Text content of the node */
  content: string;
  /** Node metadata */
  metadata: Record<string, unknown>;
  /** Embedding vector */
  embedding?: number[];
};

/**
 * Graph edge representing semantic relationship
 */
export type GraphEdge = {
  /** Source node ID */
  source: string;
  /** Target node ID */
  target: string;
  /** Edge weight (similarity score) */
  weight: number;
  /** Edge type */
  type?: string;
};

/**
 * Chunk input for graph creation
 */
export type GraphChunk = {
  /** Chunk text content */
  text: string;
  /** Chunk metadata */
  metadata?: Record<string, unknown>;
};

/**
 * Embedding input for graph creation
 */
export type GraphEmbedding = {
  /** Embedding vector */
  vector: number[];
};

/**
 * Ranked node result from graph query
 */
export type RankedNode = {
  /** Node ID */
  id: string;
  /** Node content */
  content: string;
  /** Node metadata */
  metadata: Record<string, unknown>;
  /** Relevance score */
  score: number;
};

/**
 * Graph RAG configuration
 */
export type GraphRAGConfig = {
  /** Embedding vector dimension (default: 1536) */
  dimension?: number;
  /** Similarity threshold for edge creation (default: 0.7) */
  threshold?: number;
};

/**
 * Graph query parameters
 */
export type GraphQueryParams = {
  /** Query embedding vector */
  query: number[];
  /** Number of results to return (default: 10) */
  topK?: number;
  /** Random walk steps (default: 100) */
  randomWalkSteps?: number;
  /** Restart probability for random walk (default: 0.15) */
  restartProb?: number;
};

/**
 * Graph statistics
 */
export type GraphStats = {
  nodeCount: number;
  edgeCount: number;
  avgDegree: number;
  threshold: number;
};

// ============================================================================
// Reranker Types
// ============================================================================

/**
 * Reranker type options
 */

/**
 * Reranker options
 */
export type RerankerOptions = {
  /** Pre-computed query embedding */
  queryEmbedding?: number[];
  /** Number of results to return after reranking */
  topK?: number;
  /** Scoring weights (must sum to 1.0) */
  weights?: {
    semantic?: number;
    vector?: number;
    position?: number;
  };
};

/**
 * Reranked result with detailed scoring
 */
export type RerankResult = {
  /** Original query result */
  result: VectorQueryResult;
  /** Combined reranking score (0-1) */
  score: number;
  /** Detailed score breakdown */
  details: {
    semantic: number;
    vector: number;
    position: number;
    queryAnalysis?: string;
  };
};

// ============================================================================
// MDocument Types
// ============================================================================

/**
 * MDocument configuration
 */
export type MDocumentConfig = {
  /** Document type */
  type: DocumentType;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
};

/**
 * Chunk parameters for MDocument
 */
export type ChunkParams = {
  /** Chunking strategy to use */
  strategy?: ChunkingStrategy;
  /** Strategy-specific configuration */
  config?: ChunkerConfig;
  /** Metadata extraction options */
  extract?: ExtractParams;
};

// ============================================================================
// CLI Types
// ============================================================================

/**
 * RAG CLI command arguments
 */
export type RAGCommandArgs = {
  /** Input file path */
  file?: string;
  /** Query string */
  query?: string;
  /** Chunking strategy */
  strategy?: ChunkingStrategy;
  /** Maximum chunk size */
  maxSize?: number;
  /** Chunk overlap */
  overlap?: number;
  /** Output format */
  format?: "json" | "text" | "table";
  /** Enable verbose output */
  verbose?: boolean;
  /** Provider for embeddings */
  provider?: string;
  /** Model for embeddings */
  model?: string;
  /** Number of results */
  topK?: number;
  /** Index name */
  index?: string;
  /** Enable hybrid search */
  hybrid?: boolean;
  /** Use Graph RAG */
  graph?: boolean;
};

// =============================================================================
// JSON CHUNKER (from rag/chunking/jsonChunker.ts)
// =============================================================================

/** Options for the recursive JSON chunk extractor. */
export type ExtractChunksOptions = {
  data: unknown;
  path: string;
  depth: number;
  maxDepth: number;
  maxSize: number;
  splitKeys: string[];
  preserveKeys: string[];
  includeJsonPath: boolean;
};

// =============================================================================
// MDOCUMENT (from rag/document/MDocument.ts)
// =============================================================================

/** Document processing state held by MDocument. */
export type DocumentState = {
  content: string;
  type: DocumentType;
  metadata: Record<string, unknown>;
  chunks: Chunk[];
  embeddings: number[][];
  history: string[];
};

// =============================================================================
// RAG ERRORS (from rag/errors/RAGError.ts)
// =============================================================================

/** Canonical RAG error code. */
export type RAGErrorCode =
  | "RAG_CHUNKING_ERROR"
  | "RAG_CHUNKING_INVALID_CONFIG"
  | "RAG_CHUNKING_STRATEGY_NOT_FOUND"
  | "RAG_CHUNKING_EMPTY_CONTENT"
  | "RAG_CHUNKING_SIZE_EXCEEDED"
  | "RAG_METADATA_EXTRACTION_ERROR"
  | "RAG_METADATA_EXTRACTION_TIMEOUT"
  | "RAG_METADATA_SCHEMA_INVALID"
  | "RAG_METADATA_EXTRACTOR_NOT_FOUND"
  | "RAG_EMBEDDING_ERROR"
  | "RAG_EMBEDDING_DIMENSION_MISMATCH"
  | "RAG_EMBEDDING_RATE_LIMIT"
  | "RAG_EMBEDDING_PROVIDER_ERROR"
  | "RAG_VECTOR_QUERY_ERROR"
  | "RAG_VECTOR_QUERY_TIMEOUT"
  | "RAG_VECTOR_STORE_UNAVAILABLE"
  | "RAG_VECTOR_STORE_CONNECTION_ERROR"
  | "RAG_VECTOR_INDEX_NOT_FOUND"
  | "RAG_RERANKER_ERROR"
  | "RAG_RERANKER_NOT_FOUND"
  | "RAG_RERANKER_API_ERROR"
  | "RAG_GRAPH_ERROR"
  | "RAG_GRAPH_TRAVERSAL_ERROR"
  | "RAG_GRAPH_NODE_NOT_FOUND"
  | "RAG_PIPELINE_ERROR"
  | "RAG_PIPELINE_STAGE_FAILED"
  | "RAG_PIPELINE_PARTIAL_FAILURE"
  | "RAG_CIRCUIT_BREAKER_OPEN"
  | "RAG_CIRCUIT_BREAKER_HALF_OPEN_LIMIT"
  | "RAG_OPERATION_TIMEOUT"
  | "RAG_RETRY_EXHAUSTED"
  | "RAG_INVALID_CONFIGURATION";
