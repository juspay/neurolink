/**
 * Three-Layer Memory System Types for NeuroLink
 *
 * This module defines the type system for the Mastra-style three-layer memory architecture:
 * 1. Conversation History Layer - Recent messages with summarization
 * 2. Semantic Recall Layer - Vector-based similarity search
 * 3. Working Memory Layer - Structured knowledge storage
 *
 * @module types/memory
 * @since 9.0.0
 */

import type { z } from "zod";
import type { ChatMessage, RedisStorageConfig } from "./conversation.js";

// ============================================================================
// Core Memory Types
// ============================================================================

/**
 * Memory scope determines data isolation boundaries
 * - "thread": Isolated to single conversation (sessionId)
 * - "resource": Shared across all conversations for a user (userId)
 */
export type MemoryScope = "thread" | "resource";

/**
 * Memory layer identifiers
 */
export type MemoryLayerType = "conversation" | "semantic" | "working";

/**
 * Memory context identifying the thread and resource
 */
export type MemoryContext = {
  /** Thread ID (maps to sessionId) */
  threadId: string;

  /** Resource ID (maps to userId) */
  resourceId?: string;

  /** Override scope for this operation */
  scope?: MemoryScope;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
};

/**
 * Memory thread (conversation container)
 */
export type MemoryThread = {
  /** Unique thread identifier */
  id: string;

  /** Resource (user/entity) this thread belongs to */
  resourceId?: string;

  /** Auto-generated or custom title */
  title: string;

  /** Creation timestamp (ISO 8601) */
  createdAt: string;

  /** Last update timestamp (ISO 8601) */
  updatedAt: string;

  /** Thread-specific metadata */
  metadata?: ThreadMetadata;
};

export type ThreadMetadata = {
  /** Custom tags */
  tags?: string[];

  /** Source/channel identifier */
  source?: string;

  /** Thread status */
  status?: "active" | "archived" | "deleted";

  /** Custom key-value data */
  [key: string]: unknown;
};

/**
 * Memory resource (user/entity container)
 */
export type MemoryResource = {
  /** Unique resource identifier */
  id: string;

  /** Resource type (user, organization, etc.) */
  type: string;

  /** Resource display name */
  name?: string;

  /** Working memory content */
  workingMemory?: string | Record<string, unknown>;

  /** Creation timestamp */
  createdAt: string;

  /** Last update timestamp */
  updatedAt: string;

  /** Resource metadata */
  metadata?: ResourceMetadata;
};

export type ResourceMetadata = {
  /** Email address */
  email?: string;

  /** External system ID */
  externalId?: string;

  /** Custom attributes */
  [key: string]: unknown;
};

// ============================================================================
// Three-Layer Memory Configuration
// ============================================================================

/**
 * Three-layer memory configuration
 * Extends and supersedes ConversationMemoryConfig
 */
export type ThreeLayerMemoryConfig = {
  /** Enable the memory system */
  enabled: boolean;

  /** Storage backend configuration */
  storage: MemoryStorageConfig;

  /** Conversation history layer configuration */
  conversationHistory?: ConversationHistoryConfig;

  /** Semantic recall layer configuration */
  semanticRecall?: SemanticRecallConfig;

  /** Working memory layer configuration */
  workingMemory?: WorkingMemoryConfig;

  /** Memory processors to apply */
  processors?: MemoryProcessorConfig[];
};

/**
 * Storage backend configuration
 */
export type MemoryStorageConfig = {
  /** Storage type */
  type: "memory" | "redis";

  /** Redis-specific configuration */
  redis?: RedisStorageConfig;
};

/**
 * Configuration for conversation history layer
 */
export type ConversationHistoryConfig = {
  /** Enable conversation history (default: true) */
  enabled?: boolean;

  /** Maximum recent messages to include (default: 40) */
  lastMessages?: number | false;

  /** Enable summarization of older messages */
  enableSummarization?: boolean;

  /** Token threshold for summarization trigger */
  tokenThreshold?: number;

  /** Provider for summarization */
  summarizationProvider?: string;

  /** Model for summarization */
  summarizationModel?: string;

  /** Read-only mode (don't persist new messages) */
  readOnly?: boolean;
};

/**
 * Configuration for semantic recall layer
 */
export type SemanticRecallConfig = {
  /** Enable semantic recall (default: false) */
  enabled?: boolean;

  /** Vector store configuration */
  vectorStore: VectorStoreConfig;

  /** Embedding provider configuration */
  embedder: EmbedderConfig;

  /** Number of semantic matches to retrieve (default: 5) */
  topK?: number;

  /** Context window around matches */
  messageRange?: number | { before: number; after: number };

  /** Scope for semantic search (default: "thread") */
  scope?: MemoryScope;

  /** Minimum similarity threshold (default: 0.70) */
  similarityThreshold?: number;

  /** Roles to exclude from indexing (default: ["tool_call", "tool_result"]) */
  excludeRoles?: Array<
    "user" | "assistant" | "system" | "tool_call" | "tool_result"
  >;
};

/**
 * Configuration for working memory layer
 */
export type WorkingMemoryConfig = {
  /** Enable working memory (default: false) */
  enabled?: boolean;

  /** Scope for working memory (default: "resource" for user profiles) */
  scope?: MemoryScope;

  /** Template-based working memory (Markdown format) */
  template?: string;

  /** Schema-based working memory (Zod schema) */
  schema?: z.ZodObject<z.ZodRawShape>;

  /** Maximum tokens for working memory content (default: 2000) */
  maxTokens?: number;

  /** Custom instructions for the update tool */
  updateInstructions?: string;
};

// ============================================================================
// Vector Store Types
// ============================================================================

/**
 * Vector store configuration
 */
export type VectorStoreConfig = {
  /** Vector store provider */
  provider: VectorStoreProvider;

  /** Provider-specific configuration */
  config?: VectorStoreProviderConfig;

  /** Collection/index name */
  collectionName?: string;

  /** Vector dimensions (auto-detected from embedder if not specified) */
  dimensions?: number;

  /** Distance metric */
  metric?: "cosine" | "euclidean" | "dotProduct";
};

/**
 * Supported vector store providers
 */
export type VectorStoreProvider =
  | "memory"
  | "redis"
  | "qdrant"
  | "pinecone"
  | "pgvector";

/**
 * Vector store provider-specific configurations
 */
export type VectorStoreProviderConfig =
  | RedisVectorConfig
  | QdrantVectorConfig
  | PineconeVectorConfig
  | PGVectorConfig
  | MemoryVectorConfig;

export type RedisVectorConfig = {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  indexName?: string;
};

export type QdrantVectorConfig = {
  url: string;
  apiKey?: string;
  collectionName: string;
};

export type PineconeVectorConfig = {
  apiKey: string;
  environment: string;
  indexName: string;
  namespace?: string;
};

export type PGVectorConfig = {
  connectionString: string;
  tableName?: string;
  schemaName?: string;
  indexType?: "ivfflat" | "hnsw";
};

export type MemoryVectorConfig = {
  /** No additional config needed for in-memory */
};

/**
 * Collection configuration for vector store
 */
export type CollectionConfig = {
  name: string;
  dimensions: number;
  metric: "cosine" | "euclidean" | "dotProduct";
  indexConfig?: Record<string, unknown>;
};

/**
 * Vector entry for storage
 */
export type VectorEntry = {
  id: string;
  vector: number[];
  metadata: VectorMetadata;
};

/**
 * Metadata stored with vectors
 */
export type VectorMetadata = {
  /** Message ID */
  messageId: string;

  /** Thread ID */
  threadId: string;

  /** Resource ID */
  resourceId?: string;

  /** Message role */
  role: string;

  /** Message timestamp */
  timestamp: string;

  /** Content preview (for debugging) */
  contentPreview?: string;

  /** Additional metadata */
  [key: string]: unknown;
};

/**
 * Vector search query
 */
export type VectorSearchQuery = {
  /** Query vector */
  vector: number[];

  /** Number of results */
  topK: number;

  /** Minimum similarity threshold */
  threshold?: number;

  /** Metadata filters */
  filter?: VectorFilter;
};

/**
 * Vector filter for search and delete operations
 */
export type VectorFilter = {
  /** Filter by thread ID */
  threadId?: string | string[];

  /** Filter by resource ID */
  resourceId?: string;

  /** Filter by role */
  role?: string | string[];

  /** Time range filter */
  timestampRange?: { start?: string; end?: string };
};

/**
 * Vector search result
 */
export type VectorSearchResult = {
  id: string;
  score: number;
  metadata: VectorMetadata;
};

/**
 * Vector delete filter
 */
export type VectorDeleteFilter = {
  /** Delete by IDs */
  ids?: string[];

  /** Delete by thread */
  threadId?: string;

  /** Delete by resource */
  resourceId?: string;
};

/**
 * Vector store statistics
 */
export type VectorStoreStats = {
  vectorCount: number;
  dimensions: number;
  indexSize?: number;
};

/**
 * Abstract vector store interface
 */
export type MemoryVectorStore = {
  /** Initialize the vector store connection */
  initialize(): Promise<void>;

  /** Create or ensure collection/index exists */
  ensureCollection(config: CollectionConfig): Promise<void>;

  /** Upsert vectors into the store */
  upsert(vectors: VectorEntry[]): Promise<void>;

  /** Search for similar vectors */
  search(query: VectorSearchQuery): Promise<VectorSearchResult[]>;

  /** Delete vectors by ID or filter */
  delete(filter: VectorDeleteFilter): Promise<number>;

  /** Get collection statistics */
  getStats(): Promise<VectorStoreStats>;

  /** Close connections */
  close(): Promise<void>;
};

// ============================================================================
// Embedder Types
// ============================================================================

/**
 * Embedding provider configuration
 */
export type EmbedderConfig = {
  /** Embedding provider */
  provider: EmbeddingProvider;

  /** Model name */
  model: string;

  /** Provider-specific configuration */
  config?: EmbedderProviderConfig;

  /** Batch size for embedding requests */
  batchSize?: number;
};

/**
 * Supported embedding providers
 */
export type EmbeddingProvider =
  | "openai"
  | "vertex"
  | "mistral"
  | "cohere"
  | "ollama"
  | "bedrock";

/**
 * Embedder provider-specific configuration
 */
export type EmbedderProviderConfig = {
  apiKey?: string;
  baseUrl?: string;
  projectId?: string;
  region?: string;
  dimensions?: number;
};

/**
 * Embedder model information
 */
export type EmbedderModelInfo = {
  provider: EmbeddingProvider;
  model: string;
  dimensions: number;
  maxTokens: number;
};

/**
 * Abstract embedder interface
 */
export type Embedder = {
  /** Initialize the embedder */
  initialize(): Promise<void>;

  /** Get dimensions of the embedding model */
  getDimensions(): number;

  /** Embed a single text */
  embed(text: string): Promise<number[]>;

  /** Embed multiple texts in batch */
  embedBatch(texts: string[]): Promise<number[][]>;

  /** Get model information */
  getModelInfo(): EmbedderModelInfo;

  /** Close the embedder and release resources */
  close?(): Promise<void>;
};

// ============================================================================
// Memory Processor Types
// ============================================================================

/**
 * Memory processor configuration
 */
export type MemoryProcessorConfig = {
  /** Processor type */
  type: "tokenLimit" | "roleFilter" | "timeWindow" | "custom";

  /** Processor-specific options */
  options: MemoryProcessorOptions;
};

/**
 * Memory processor options
 */
export type MemoryProcessorOptions = {
  /** Token limit for trimming */
  maxTokens?: number;

  /** Roles to include/exclude */
  includeRoles?: string[];
  excludeRoles?: string[];

  /** Time window in milliseconds */
  timeWindowMs?: number;

  /** Custom processor function */
  processor?: (messages: ChatMessage[]) => ChatMessage[];
};

/**
 * Memory processor interface
 */
export type MemoryProcessor = {
  name: string;
  process(messages: ChatMessage[], context: ProcessorContext): ChatMessage[];
};

/**
 * Context passed to memory processors
 */
export type ProcessorContext = {
  maxTokens?: number;
  currentTokens: number;
  config: MemoryProcessorOptions;
};

// ============================================================================
// Retrieved Memory Context Types
// ============================================================================

/**
 * A semantic match from vector search
 */
export type SemanticMatch = {
  /** Matched message */
  message: ChatMessage;

  /** Similarity score (0-1) */
  score: number;

  /** Source thread ID */
  threadId: string;

  /** Source resource ID */
  resourceId?: string;

  /** Context messages (before and after) */
  contextMessages?: ChatMessage[];
};

/**
 * Debug information for memory retrieval
 */
export type MemoryDebugInfo = {
  /** Time taken for each layer retrieval */
  layerTimings: {
    conversationHistory?: number;
    semanticRecall?: number;
    workingMemory?: number;
  };

  /** Messages retrieved from each layer */
  layerCounts: {
    conversationHistory: number;
    semanticRecall: number;
  };

  /** Processing steps applied */
  processors: string[];
};

/**
 * Retrieved memory context for AI generation
 */
export type RetrievedMemoryContext = {
  /** Assembled context messages */
  messages: ChatMessage[];

  /** Working memory content (if enabled) */
  workingMemory?: string | Record<string, unknown>;

  /** Semantically retrieved messages */
  semanticMatches?: SemanticMatch[];

  /** Token count of assembled context */
  tokenCount: number;

  /** Debug information */
  debug?: MemoryDebugInfo;
};

// ============================================================================
// Working Memory Storage Types
// ============================================================================

/**
 * Working memory storage interface
 */
export type WorkingMemoryStorage = {
  get(
    resourceId: string,
    threadId?: string,
  ): Promise<string | Record<string, unknown> | null>;
  set(
    resourceId: string,
    threadId: string | undefined,
    data: string | Record<string, unknown>,
  ): Promise<void>;
  delete(resourceId: string, threadId?: string): Promise<void>;
  close(): Promise<void>;
};

// ============================================================================
// Working Memory Data Types
// ============================================================================

/**
 * Working memory mode
 */
export type WorkingMemoryMode = "template" | "schema";

/**
 * Embedding result with metadata
 */
export type EmbeddingResult = {
  vector: number[];
  tokenCount: number;
  modelInfo: EmbedderModelInfo;
};

/**
 * Working memory data
 */
export type WorkingMemoryData = {
  /** Unique resource identifier */
  resourceId: string;

  /** Working memory mode */
  mode: WorkingMemoryMode;

  /** Template content (for template mode) */
  template?: string;

  /** Schema data (for schema mode) */
  schemaData?: Record<string, unknown>;

  /** Creation timestamp (ISO 8601) */
  createdAt: string;

  /** Last update timestamp (ISO 8601) */
  updatedAt: string;

  /** Token count estimate */
  tokenCount?: number;
};

// ============================================================================
// Memory Circuit Breaker Types
// ============================================================================

/**
 * Memory-specific circuit breaker configuration
 */
export type MemoryCircuitBreakerConfig = {
  /** Number of failures before opening circuit */
  failureThreshold: number;

  /** Time to wait before transitioning to half-open (ms) */
  resetTimeout: number;

  /** Number of successes required in half-open to close */
  successThreshold?: number;
};

/**
 * Memory-specific circuit breaker status
 */
export type MemoryCircuitBreakerStatus = {
  state: "closed" | "open" | "half-open";
  failures: number;
  lastFailure?: number;
  lastSuccess?: number;
};

// ============================================================================
// Working Memory Storage Backend Types (richer interface with lifecycle methods)
// ============================================================================

/**
 * Backend storage interface for three-layer working memory (with lifecycle methods)
 */
export type WorkingMemoryStorageBackend = {
  /** Initialize storage */
  initialize(): Promise<void>;

  /** Get data for a resource */
  get(resourceId: string): Promise<WorkingMemoryData | null>;

  /** Set data for a resource */
  set(resourceId: string, data: WorkingMemoryData): Promise<void>;

  /** Delete data for a resource */
  delete(resourceId: string): Promise<boolean>;

  /** List all resource IDs */
  list(): Promise<string[]>;

  /** Close storage */
  close(): Promise<void>;
};

// ============================================================================
// Vector Store Factory Config
// ============================================================================

/**
 * Vector store configuration for factory
 */
export type VectorStoreFactoryConfig = VectorStoreConfig & {
  dimensions?: number;
};

// ============================================================================
// Memory Registry Metadata Types
// ============================================================================

/**
 * Metadata for memory coordinator registry entries
 */
export type MemoryCoordinatorMetadata = {
  config: ThreeLayerMemoryConfig;
  createdAt: string;
  layerStatus: {
    conversation: boolean;
    semantic: boolean;
    workingMemory: boolean;
  };
};

/**
 * Metadata for vector store registry entries
 */
export type VectorStoreMetadata = {
  provider: string;
  collectionName?: string;
  dimensions?: number;
  createdAt: string;
};

/**
 * Metadata for embedder registry entries
 */
export type EmbedderMetadata = {
  provider: string;
  model: string;
  dimensions: number;
  createdAt: string;
};

/**
 * Metadata for working memory storage registry entries
 */
export type WorkingMemoryStorageMetadata = {
  type: string;
  createdAt: string;
};

// ============================================================================
// Tool and Processor Option Types
// ============================================================================

/**
 * Tool definition for the update working memory tool
 */
export type UpdateWorkingMemoryToolDefinition = {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
  execute: (args: {
    content?: string;
    updates?: Record<string, unknown>;
    reason: string;
  }) => Promise<{ success: boolean; message: string }>;
};

/**
 * Filter options for role filter processor
 */
export type RoleFilterOptions = {
  /** Roles to include (whitelist) */
  includeRoles?: Array<
    "user" | "assistant" | "system" | "tool_call" | "tool_result"
  >;

  /** Roles to exclude (blacklist) */
  excludeRoles?: Array<
    "user" | "assistant" | "system" | "tool_call" | "tool_result"
  >;
};

// ============================================================================
// Memory Layer Interface Types
// ============================================================================

/**
 * Base type for all memory layers
 */
export type MemoryLayer = {
  /** Initialize the layer */
  initialize(): Promise<void>;

  /** Check if layer is enabled */
  isEnabled(): boolean;

  /** Get layer type */
  getLayerType(): MemoryLayerType;

  /** Close/cleanup resources */
  close(): Promise<void>;
};

/**
 * Conversation history layer interface
 */
export type ConversationHistoryLayer = MemoryLayer & {
  /** Retrieve messages for a thread */
  retrieve(context: MemoryContext): Promise<ChatMessage[]>;

  /** Store a conversation turn */
  store(
    context: MemoryContext,
    userMessage: string,
    aiResponse: string,
    options?: {
      events?: Array<{
        type: string;
        seq: number;
        timestamp: number;
        [key: string]: unknown;
      }>;
      providerDetails?: { provider: string; model: string };
    },
  ): Promise<void>;

  /** Get or create a thread */
  getOrCreateThread(
    threadId: string,
    resourceId?: string,
  ): Promise<MemoryThread>;

  /** List threads for a resource */
  listThreads(resourceId: string): Promise<MemoryThread[]>;

  /** Clear a thread's messages */
  clearThread(threadId: string, resourceId?: string): Promise<boolean>;
};

/**
 * Semantic recall layer interface
 */
export type SemanticRecallLayer = MemoryLayer & {
  /** Index a message for semantic search */
  indexMessage(
    message: ChatMessage,
    threadId: string,
    resourceId?: string,
  ): Promise<void>;

  /** Index multiple messages */
  indexMessages(
    messages: ChatMessage[],
    threadId: string,
    resourceId?: string,
  ): Promise<void>;

  /** Search for similar messages */
  search(
    query: string,
    context: MemoryContext,
    options?: { topK?: number; threshold?: number },
  ): Promise<SemanticMatch[]>;

  /** Delete vectors for a thread */
  deleteThread(threadId: string): Promise<number>;

  /** Delete vectors for a resource */
  deleteResource(resourceId: string): Promise<number>;
};

/**
 * Working memory layer interface
 */
export type WorkingMemoryLayer = MemoryLayer & {
  /** Get working memory for a resource */
  get(resourceId: string): Promise<WorkingMemoryData | null>;

  /** Set working memory for a resource (replace semantics for template) */
  set(
    resourceId: string,
    data: string | Record<string, unknown>,
  ): Promise<void>;

  /** Merge data into working memory (for schema mode) */
  merge(resourceId: string, data: Record<string, unknown>): Promise<void>;

  /** Clear working memory for a resource */
  clear(resourceId: string): Promise<boolean>;

  /** Get rendered working memory content */
  render(
    resourceId: string,
    variables?: Record<string, unknown>,
  ): Promise<string>;

  /** Get token count for working memory */
  getTokenCount(resourceId: string): Promise<number>;
};

// ============================================================================
// Memory Error Types
// ============================================================================

/**
 * Memory error codes
 */
export const MemoryErrorCodes = {
  INITIALIZATION_FAILED: "MEMORY_INITIALIZATION_FAILED",
  STORAGE_ERROR: "MEMORY_STORAGE_ERROR",
  EMBEDDING_ERROR: "MEMORY_EMBEDDING_ERROR",
  VECTOR_STORE_ERROR: "MEMORY_VECTOR_STORE_ERROR",
  CIRCUIT_BREAKER_OPEN: "MEMORY_CIRCUIT_BREAKER_OPEN",
  INVALID_CONFIG: "MEMORY_INVALID_CONFIG",
  NOT_FOUND: "MEMORY_NOT_FOUND",
  OPERATION_FAILED: "MEMORY_OPERATION_FAILED",
} as const;

export type MemoryErrorCode =
  (typeof MemoryErrorCodes)[keyof typeof MemoryErrorCodes];

// ============================================================================
// Compatibility Types
// ============================================================================

/**
 * Check if config is legacy ConversationMemoryConfig format
 */
export function isLegacyConfig(config: Record<string, unknown>): boolean {
  return (
    !("conversationHistory" in config) &&
    !("semanticRecall" in config) &&
    !("workingMemory" in config)
  );
}

// =============================================================================
// Internal memory types (moved from implementation files per Critical Rule 2)
// =============================================================================

/**
 * Memory CLI command arguments
 */
export type MemoryCommandArgs = {
  sessionId?: string;
  file?: string;
  query?: string;
  format?: "table" | "json" | "compact";
  output?: string;
  quiet?: boolean;
  debug?: boolean;
  force?: boolean;
  limit?: number;
  threshold?: number;
};

/**
 * Memory export data format
 */
export type MemoryExportData = {
  version: string;
  exportedAt: string;
  sessions: Array<{
    sessionId: string;
    messages: Array<{
      role: string;
      content: string;
      timestamp?: string;
    }>;
    metadata?: Record<string, unknown>;
  }>;
  stats?: {
    totalSessions: number;
    totalTurns: number;
  };
};

/**
 * Memory statistics
 */
export type MemoryStats = {
  totalSessions: number;
  totalTurns: number;
  layers: {
    conversationHistory: { enabled: boolean; messageCount?: number };
    semanticRecall?: { enabled: boolean; vectorCount?: number };
    workingMemory?: { enabled: boolean; mode?: string };
  };
  storage: {
    type: "memory" | "redis";
    status: "connected" | "disconnected" | "unknown";
  };
};

/**
 * AWS credentials for Bedrock embedder
 */
export type MemoryAWSCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
};

/**
 * Cohere embedding input types
 */
export type MemoryCohereInputType =
  | "search_document"
  | "search_query"
  | "classification"
  | "clustering";

/**
 * Entry in the semantic recall failed indexing retry queue
 */
export type MemoryFailedIndexEntry = {
  message: ChatMessage;
  threadId: string;
  resourceId?: string;
  failedAt: string;
  retryCount: number;
};

/**
 * JSON Schema type (simplified for working memory layer)
 */
export type MemoryJSONSchema7 = {
  type?: string;
  properties?: Record<string, MemoryJSONSchema7>;
  items?: MemoryJSONSchema7;
  required?: string[];
  [key: string]: unknown;
};

/**
 * PostgreSQL client type (dynamically imported)
 */
export type MemoryPgClient = {
  connect(): Promise<void>;
  end(): Promise<void>;
  query<T extends Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number }>;
};

/**
 * Pinecone API response types
 */
export type MemoryPineconeIndexStats = {
  namespaces: Record<string, { vectorCount: number }>;
  dimension: number;
  indexFullness: number;
  totalVectorCount: number;
};

export type MemoryPineconeQueryMatch = {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
};

export type MemoryPineconeQueryResponse = {
  matches: MemoryPineconeQueryMatch[];
  namespace: string;
};

/**
 * Redis client type for vector store (dynamically imported)
 */
export type MemoryRedisClientType = {
  connect(): Promise<void>;
  quit(): Promise<void>;
  ping(): Promise<string>;
  json: {
    set(key: string, path: string, value: unknown): Promise<unknown>;
    get(key: string): Promise<unknown>;
    del(key: string): Promise<number>;
  };
  ft: {
    info(indexName: string): Promise<{
      numDocs?: number;
      indexMemUsageMb?: number;
      [key: string]: unknown;
    }>;
    create(
      indexName: string,
      schema: Record<string, unknown>,
      options: Record<string, unknown>,
    ): Promise<void>;
    search(
      indexName: string,
      query: string,
      options: Record<string, unknown>,
    ): Promise<{
      total: number;
      documents: Array<{
        id: string;
        value: Record<string, unknown>;
      }>;
    }>;
    dropIndex(indexName: string): Promise<void>;
  };
  multi(): {
    json: {
      set(key: string, path: string, value: unknown): unknown;
    };
    exec(): Promise<unknown[]>;
  };
};
