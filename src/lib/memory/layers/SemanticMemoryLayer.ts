/**
 * Semantic Memory Layer Implementation
 *
 * Provides vector-based similarity search for retrieving contextually
 * relevant messages from conversation history. This is Layer 2 of the
 * Three-Layer Memory System.
 *
 * Features:
 * - Vector embedding of messages using configurable embedders
 * - Similarity search with configurable thresholds
 * - Message range context retrieval
 * - Circuit breaker for fault tolerance
 * - In-memory vector store for development/testing
 */

import type {
  ChatMessage,
  SemanticRecallConfig,
  MemoryContext,
  SemanticMatch,
  Embedder,
  VectorEntry,
  MemoryLayerType,
  MemoryVectorStore,
  SemanticRecallLayer as ISemanticRecallLayer,
  MemoryCircuitBreakerConfig,
  MemoryCircuitBreakerStatus,
  CircuitBreakerState,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { randomUUID } from "crypto";
import { createErrorFactory } from "../../core/infrastructure/index.js";

// =============================================================================
// Error Factory
// =============================================================================

const MemoryErrors = createErrorFactory("SemanticMemory", {
  INITIALIZATION_FAILED: "SEMANTIC_MEMORY_INITIALIZATION_FAILED",
  EMBEDDING_ERROR: "SEMANTIC_MEMORY_EMBEDDING_ERROR",
  VECTOR_STORE_ERROR: "SEMANTIC_MEMORY_VECTOR_STORE_ERROR",
  CIRCUIT_BREAKER_OPEN: "SEMANTIC_MEMORY_CIRCUIT_BREAKER_OPEN",
  SEARCH_ERROR: "SEMANTIC_MEMORY_SEARCH_ERROR",
});

// =============================================================================
// Circuit Breaker Implementation
// =============================================================================

/**
 * Circuit breaker for fault tolerance in external API calls
 */
class CircuitBreaker {
  private state: CircuitBreakerState = "closed";
  private failures: number = 0;
  private lastFailure: number | undefined;
  private lastSuccess: number | undefined;
  private config: Required<MemoryCircuitBreakerConfig>;

  constructor(config?: Partial<MemoryCircuitBreakerConfig>) {
    this.config = {
      failureThreshold: config?.failureThreshold ?? 5,
      resetTimeout: config?.resetTimeout ?? 30000, // 30 seconds
      successThreshold: config?.successThreshold ?? 2,
    };
  }

  /**
   * Check if circuit breaker allows the operation
   */
  shouldAllow(): boolean {
    if (this.state === "closed") {
      return true;
    }

    if (this.state === "open") {
      // Check if reset timeout has passed
      if (
        this.lastFailure &&
        Date.now() - this.lastFailure >= this.config.resetTimeout
      ) {
        this.state = "half-open";
        logger.debug("[CircuitBreaker] Transitioning to half-open state");
        return true;
      }
      return false;
    }

    // Half-open state allows limited requests
    return true;
  }

  /**
   * Record a successful operation
   */
  recordSuccess(): void {
    this.lastSuccess = Date.now();

    if (this.state === "half-open") {
      this.failures = 0;
      this.state = "closed";
      logger.debug("[CircuitBreaker] Transitioning to closed state");
    } else if (this.state === "closed") {
      this.failures = Math.max(0, this.failures - 1);
    }
  }

  /**
   * Record a failed operation
   */
  recordFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();

    if (
      this.state === "half-open" ||
      this.failures >= this.config.failureThreshold
    ) {
      this.state = "open";
      logger.warn("[CircuitBreaker] Circuit opened due to failures", {
        failures: this.failures,
        threshold: this.config.failureThreshold,
      });
    }
  }

  /**
   * Get current status
   */
  getStatus(): MemoryCircuitBreakerStatus {
    return {
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
    };
  }

  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.state = "closed";
    this.failures = 0;
    this.lastFailure = undefined;
    this.lastSuccess = undefined;
  }
}

// =============================================================================
// In-Memory Vector Store Implementation
// =============================================================================

/**
 * In-memory vector store for development and testing
 */
export class InMemoryVectorStore implements MemoryVectorStore {
  private vectors: Map<string, VectorEntry> = new Map();
  private dimensions: number = 0;
  private collectionName: string = "default";
  private isInitialized: boolean = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    this.isInitialized = true;
    logger.debug("[InMemoryVectorStore] Initialized");
  }

  async ensureCollection(config: {
    name: string;
    dimensions: number;
    metric: "cosine" | "euclidean" | "dotProduct";
  }): Promise<void> {
    this.collectionName = config.name;
    this.dimensions = config.dimensions;
    logger.debug("[InMemoryVectorStore] Collection configured", {
      name: config.name,
      dimensions: config.dimensions,
      metric: config.metric,
    });
  }

  async upsert(vectors: VectorEntry[]): Promise<void> {
    for (const vector of vectors) {
      this.vectors.set(vector.id, vector);
    }
    logger.debug("[InMemoryVectorStore] Upserted vectors", {
      count: vectors.length,
      totalVectors: this.vectors.size,
    });
  }

  async search(query: {
    vector: number[];
    topK: number;
    threshold?: number;
    filter?: {
      threadId?: string | string[];
      resourceId?: string;
      role?: string | string[];
    };
  }): Promise<
    Array<{ id: string; score: number; metadata: VectorEntry["metadata"] }>
  > {
    const results: Array<{
      id: string;
      score: number;
      metadata: VectorEntry["metadata"];
    }> = [];

    for (const [id, entry] of this.vectors) {
      // Apply filters
      if (query.filter) {
        if (query.filter.threadId) {
          const threadIds = Array.isArray(query.filter.threadId)
            ? query.filter.threadId
            : [query.filter.threadId];
          if (!threadIds.includes(entry.metadata.threadId)) {
            continue;
          }
        }
        if (
          query.filter.resourceId &&
          entry.metadata.resourceId !== query.filter.resourceId
        ) {
          continue;
        }
        if (query.filter.role) {
          const roles = Array.isArray(query.filter.role)
            ? query.filter.role
            : [query.filter.role];
          if (!roles.includes(entry.metadata.role)) {
            continue;
          }
        }
      }

      // Calculate cosine similarity
      const score = this.cosineSimilarity(query.vector, entry.vector);

      // Apply threshold filter
      if (query.threshold && score < query.threshold) {
        continue;
      }

      results.push({ id, score, metadata: entry.metadata });
    }

    // Sort by score descending and limit to topK
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, query.topK);
  }

  async delete(filter: {
    ids?: string[];
    threadId?: string;
    resourceId?: string;
  }): Promise<number> {
    let deletedCount = 0;

    if (filter.ids) {
      for (const id of filter.ids) {
        if (this.vectors.delete(id)) {
          deletedCount++;
        }
      }
    }

    if (filter.threadId || filter.resourceId) {
      for (const [id, entry] of this.vectors) {
        const shouldDelete =
          (filter.threadId && entry.metadata.threadId === filter.threadId) ||
          (filter.resourceId &&
            entry.metadata.resourceId === filter.resourceId);

        if (shouldDelete) {
          this.vectors.delete(id);
          deletedCount++;
        }
      }
    }

    logger.debug("[InMemoryVectorStore] Deleted vectors", {
      count: deletedCount,
      remaining: this.vectors.size,
    });
    return deletedCount;
  }

  async getStats(): Promise<{
    vectorCount: number;
    dimensions: number;
    indexSize?: number;
  }> {
    return {
      vectorCount: this.vectors.size,
      dimensions: this.dimensions,
    };
  }

  async close(): Promise<void> {
    this.vectors.clear();
    this.isInitialized = false;
    logger.debug("[InMemoryVectorStore] Closed");
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }
}

// =============================================================================
// Mock Embedder Implementation (for development/testing)
// =============================================================================

/**
 * Mock embedder for development and testing
 * Uses a simple hash-based approach to generate deterministic embeddings
 */
export class MockEmbedder implements Embedder {
  private dimensions: number;
  private model: string;
  private isInitialized: boolean = false;

  constructor(dimensions: number = 384, model: string = "mock-embed") {
    this.dimensions = dimensions;
    this.model = model;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    this.isInitialized = true;
    logger.debug("[MockEmbedder] Initialized", {
      dimensions: this.dimensions,
      model: this.model,
    });
  }

  getDimensions(): number {
    return this.dimensions;
  }

  async embed(text: string): Promise<number[]> {
    // Generate deterministic embedding based on text hash
    return this.generateEmbedding(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((text) => this.generateEmbedding(text)));
  }

  getModelInfo(): {
    provider: "openai" | "vertex" | "ollama" | "mistral" | "cohere" | "bedrock";
    model: string;
    dimensions: number;
    maxTokens: number;
  } {
    return {
      provider: "ollama", // Using ollama as it supports local models
      model: this.model,
      dimensions: this.dimensions,
      maxTokens: 8192,
    };
  }

  async close(): Promise<void> {
    this.isInitialized = false;
    logger.debug("[MockEmbedder] Closed");
  }

  private generateEmbedding(text: string): number[] {
    // Simple hash-based embedding for testing
    const embedding: number[] = new Array(this.dimensions).fill(0);

    // Use character codes to generate deterministic values
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const idx = (i * 31 + charCode) % this.dimensions;
      embedding[idx] += charCode / 256;
    }

    // Normalize the embedding
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= norm;
      }
    }

    return embedding;
  }
}

// =============================================================================
// Semantic Memory Layer Implementation
// =============================================================================

/**
 * Default semantic recall configuration
 */
const DEFAULT_CONFIG: Required<
  Omit<SemanticRecallConfig, "vectorStore" | "embedder">
> = {
  enabled: true,
  topK: 3,
  messageRange: { before: 2, after: 2 },
  scope: "thread",
  similarityThreshold: 0.7,
  excludeRoles: ["tool_call", "tool_result"],
};

/**
 * Semantic Memory Layer
 *
 * Provides vector-based similarity search for retrieving contextually
 * relevant messages from conversation history.
 */
export class SemanticMemoryLayer implements ISemanticRecallLayer {
  private vectorStore: MemoryVectorStore;
  private embedder: Embedder;
  private config: Required<SemanticRecallConfig>;
  private isInitializedFlag: boolean = false;
  private circuitBreaker: CircuitBreaker;
  private messageCache: Map<string, ChatMessage> = new Map();

  constructor(
    vectorStore: MemoryVectorStore,
    embedder: Embedder,
    config: SemanticRecallConfig,
  ) {
    this.vectorStore = vectorStore;
    this.embedder = embedder;
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      vectorStore: config.vectorStore,
      embedder: config.embedder,
    };
    this.circuitBreaker = new CircuitBreaker();
  }

  /**
   * Initialize the semantic recall layer
   */
  async initialize(): Promise<void> {
    if (this.isInitializedFlag) {
      return;
    }

    try {
      await this.vectorStore.initialize();
      await this.embedder.initialize();

      // Ensure collection exists with correct dimensions
      await this.vectorStore.ensureCollection({
        name: this.config.vectorStore.collectionName ?? "neurolink_messages",
        dimensions: this.embedder.getDimensions(),
        metric: this.config.vectorStore.metric ?? "cosine",
      });

      this.isInitializedFlag = true;
      logger.info("[SemanticMemoryLayer] Initialized successfully", {
        dimensions: this.embedder.getDimensions(),
        provider: this.config.embedder.provider,
        model: this.config.embedder.model,
        collectionName: this.config.vectorStore.collectionName,
      });
    } catch (error) {
      throw MemoryErrors.create(
        "INITIALIZATION_FAILED",
        "Failed to initialize semantic memory layer",
        {
          cause: error instanceof Error ? error : undefined,
          details: {
            error: error instanceof Error ? error.message : String(error),
          },
        },
      );
    }
  }

  /**
   * Check if layer is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get layer type
   */
  getLayerType(): MemoryLayerType {
    return "semantic";
  }

  /**
   * Index a message for semantic search
   */
  async indexMessage(
    message: ChatMessage,
    threadId: string,
    resourceId?: string,
  ): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    // Skip excluded roles
    if (
      this.config.excludeRoles?.includes(
        message.role as "system" | "tool_call" | "tool_result",
      )
    ) {
      return;
    }

    // Skip empty content
    if (!message.content || message.content.trim().length === 0) {
      return;
    }

    // Check circuit breaker
    if (!this.circuitBreaker.shouldAllow()) {
      throw MemoryErrors.create(
        "CIRCUIT_BREAKER_OPEN",
        "Circuit breaker is open, indexing temporarily disabled",
        {
          retryable: true,
          details: { status: this.circuitBreaker.getStatus() },
        },
      );
    }

    try {
      // Generate embedding
      const vector = await this.embedder.embed(message.content);

      // Create vector entry
      const entry: VectorEntry = {
        id: message.id || randomUUID(),
        vector,
        metadata: {
          messageId: message.id,
          threadId,
          resourceId,
          role: message.role,
          timestamp: message.timestamp || new Date().toISOString(),
          contentPreview: message.content.substring(0, 100),
        },
      };

      // Upsert to vector store
      await this.vectorStore.upsert([entry]);

      // Cache the message for retrieval
      this.messageCache.set(message.id, message);

      this.circuitBreaker.recordSuccess();

      logger.debug("[SemanticMemoryLayer] Indexed message", {
        messageId: message.id,
        threadId,
        role: message.role,
      });
    } catch (error) {
      this.circuitBreaker.recordFailure();
      throw MemoryErrors.create("EMBEDDING_ERROR", "Failed to index message", {
        retryable: true,
        cause: error instanceof Error ? error : undefined,
        details: { messageId: message.id, threadId },
      });
    }
  }

  /**
   * Index multiple messages
   */
  async indexMessages(
    messages: ChatMessage[],
    threadId: string,
    resourceId?: string,
  ): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    // Filter messages
    const indexableMessages = messages.filter((msg) => {
      if (
        this.config.excludeRoles?.includes(
          msg.role as "system" | "tool_call" | "tool_result",
        )
      ) {
        return false;
      }
      return msg.content && msg.content.trim().length > 0;
    });

    if (indexableMessages.length === 0) {
      return;
    }

    // Check circuit breaker
    if (!this.circuitBreaker.shouldAllow()) {
      throw MemoryErrors.create(
        "CIRCUIT_BREAKER_OPEN",
        "Circuit breaker is open, indexing temporarily disabled",
        {
          retryable: true,
          details: { status: this.circuitBreaker.getStatus() },
        },
      );
    }

    try {
      // Batch embed
      const texts = indexableMessages.map((msg) => msg.content);
      const vectors = await this.embedder.embedBatch(texts);

      // Create vector entries
      const entries: VectorEntry[] = indexableMessages.map((msg, idx) => ({
        id: msg.id || randomUUID(),
        vector: vectors[idx],
        metadata: {
          messageId: msg.id,
          threadId,
          resourceId,
          role: msg.role,
          timestamp: msg.timestamp || new Date().toISOString(),
          contentPreview: msg.content.substring(0, 100),
        },
      }));

      // Upsert to vector store
      await this.vectorStore.upsert(entries);

      // Cache messages
      for (const msg of indexableMessages) {
        this.messageCache.set(msg.id, msg);
      }

      this.circuitBreaker.recordSuccess();

      logger.debug("[SemanticMemoryLayer] Indexed messages batch", {
        count: indexableMessages.length,
        threadId,
      });
    } catch (error) {
      this.circuitBreaker.recordFailure();
      throw MemoryErrors.create(
        "EMBEDDING_ERROR",
        "Failed to index messages batch",
        {
          retryable: true,
          cause: error instanceof Error ? error : undefined,
          details: { count: indexableMessages.length, threadId },
        },
      );
    }
  }

  /**
   * Search for similar messages
   */
  async search(
    query: string,
    context: MemoryContext,
    options?: { topK?: number; threshold?: number },
  ): Promise<SemanticMatch[]> {
    if (!this.config.enabled) {
      return [];
    }

    // Check circuit breaker
    if (!this.circuitBreaker.shouldAllow()) {
      logger.warn(
        "[SemanticMemoryLayer] Circuit breaker open, skipping search",
      );
      return [];
    }

    const startTime = Date.now();

    try {
      // Generate query embedding
      const queryVector = await this.embedder.embed(query);

      // Build filter based on scope
      const filter: {
        threadId?: string | string[];
        resourceId?: string;
      } = {};

      if (this.config.scope === "thread") {
        filter.threadId = context.threadId;
      } else if (this.config.scope === "resource" && context.resourceId) {
        filter.resourceId = context.resourceId;
      }

      // Search vector store
      const results = await this.vectorStore.search({
        vector: queryVector,
        topK: options?.topK ?? this.config.topK,
        threshold: options?.threshold ?? this.config.similarityThreshold,
        filter,
      });

      this.circuitBreaker.recordSuccess();

      // Convert to SemanticMatch
      const matches: SemanticMatch[] = results.map((result) => {
        const cachedMessage = this.messageCache.get(result.metadata.messageId);
        const message: ChatMessage = cachedMessage || {
          id: result.metadata.messageId,
          role: result.metadata.role as ChatMessage["role"],
          content: result.metadata.contentPreview || "",
          timestamp: result.metadata.timestamp,
        };

        return {
          message,
          score: result.score,
          threadId: result.metadata.threadId,
        };
      });

      logger.debug("[SemanticMemoryLayer] Search completed", {
        query: query.substring(0, 50),
        matchCount: matches.length,
        durationMs: Date.now() - startTime,
      });

      return matches;
    } catch (error) {
      this.circuitBreaker.recordFailure();
      logger.error("[SemanticMemoryLayer] Search failed", {
        error: error instanceof Error ? error.message : String(error),
        query: query.substring(0, 50),
      });
      return [];
    }
  }

  /**
   * Delete vectors for a thread
   */
  async deleteThread(threadId: string): Promise<number> {
    try {
      const count = await this.vectorStore.delete({ threadId });

      // Clear cached messages for this thread
      // Note: We don't have threadId in the cache, so we can't filter by thread
      // In a real implementation, we'd store threadId in the cache
      // For now, this is a no-op for cache clearing

      logger.debug("[SemanticMemoryLayer] Deleted thread vectors", {
        threadId,
        count,
      });
      return count;
    } catch (error) {
      throw MemoryErrors.create(
        "VECTOR_STORE_ERROR",
        "Failed to delete thread vectors",
        {
          cause: error instanceof Error ? error : undefined,
          details: { threadId },
        },
      );
    }
  }

  /**
   * Delete vectors for a resource
   */
  async deleteResource(resourceId: string): Promise<number> {
    try {
      const count = await this.vectorStore.delete({ resourceId });
      logger.debug("[SemanticMemoryLayer] Deleted resource vectors", {
        resourceId,
        count,
      });
      return count;
    } catch (error) {
      throw MemoryErrors.create(
        "VECTOR_STORE_ERROR",
        "Failed to delete resource vectors",
        {
          cause: error instanceof Error ? error : undefined,
          details: { resourceId },
        },
      );
    }
  }

  /**
   * Close/cleanup resources
   */
  async close(): Promise<void> {
    await this.vectorStore.close();
    await this.embedder.close?.();
    this.messageCache.clear();
    this.isInitializedFlag = false;
    logger.debug("[SemanticMemoryLayer] Closed");
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): MemoryCircuitBreakerStatus {
    return this.circuitBreaker.getStatus();
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }

  /**
   * Get vector store statistics
   */
  async getStats(): Promise<{ vectorCount: number; dimensions: number }> {
    return this.vectorStore.getStats();
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a semantic memory layer with in-memory storage (for development/testing)
 */
export function createInMemorySemanticLayer(
  config?: Partial<SemanticRecallConfig>,
): SemanticMemoryLayer {
  const vectorStore = new InMemoryVectorStore();
  const embedder = new MockEmbedder();

  const fullConfig: SemanticRecallConfig = {
    enabled: true,
    vectorStore: {
      provider: "memory",
      config: {},
      collectionName: "neurolink_messages",
      metric: "cosine",
    },
    embedder: {
      provider: "ollama",
      model: "mock-embed",
    },
    ...config,
  };

  return new SemanticMemoryLayer(vectorStore, embedder, fullConfig);
}
