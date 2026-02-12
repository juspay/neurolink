/**
 * RAG Document Processing Types
 *
 * Comprehensive type definitions for RAG (Retrieval-Augmented Generation)
 * document processing, including chunking strategies, metadata extraction,
 * vector queries, and Graph RAG support.
 */

// ============================================================================
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
export type RerankerConfig = {
  /** Language model for reranking */
  model: {
    provider: string;
    modelName: string;
  };
  /** Scoring weights */
  weights?: {
    semantic?: number;
    vector?: number;
    position?: number;
  };
  /** Number of results after reranking */
  topK?: number;
};

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
export type RerankerType = "cross-encoder" | "colbert" | "cohere" | "llm";

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

// ============================================================================
// RAG Integration Config (for generate/stream)
// ============================================================================

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
