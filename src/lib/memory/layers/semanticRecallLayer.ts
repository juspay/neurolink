/**
 * Semantic Recall Layer
 *
 * Provides vector-based similarity search for retrieving
 * contextually relevant messages from conversation history.
 *
 * @module memory/layers/semanticRecallLayer
 * @since 9.0.0
 */

import { randomUUID } from "crypto";
import type { ChatMessage } from "../../types/index.js";
import type {
  Embedder,
  MemoryContext,
  SemanticMatch,
  SemanticRecallConfig,
  VectorEntry,
  VectorSearchQuery,
  MemoryVectorStore,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";

/**
 * Default configuration values for semantic recall layer
 */
const DEFAULTS = {
  enabled: true,
  topK: 5,
  messageRange: { before: 2, after: 2 },
  scope: "thread" as const,
  similarityThreshold: 0.7,
  excludeRoles: ["tool_call", "tool_result"] as const,
};

/**
 * Semantic Recall Layer
 *
 * Provides vector-based similarity search for retrieving
 * contextually relevant messages from conversation history.
 */
import type { MemoryFailedIndexEntry } from "../../types/index.js";

export class SemanticRecallLayer {
  private vectorStore: MemoryVectorStore;
  private embedder: Embedder;
  private config: Required<
    Omit<SemanticRecallConfig, "vectorStore" | "embedder">
  > & {
    vectorStore: SemanticRecallConfig["vectorStore"];
    embedder: SemanticRecallConfig["embedder"];
  };
  private isInitialized = false;

  /**
   * Queue of messages that failed to index, for retry
   */
  private failedIndexQueue: MemoryFailedIndexEntry[] = [];

  /**
   * Maximum number of retries for failed indexing
   */
  private static readonly MAX_RETRY_COUNT = 3;

  constructor(
    vectorStore: MemoryVectorStore,
    embedder: Embedder,
    config: SemanticRecallConfig,
  ) {
    this.vectorStore = vectorStore;
    this.embedder = embedder;
    this.config = this.normalizeConfig(config);
  }

  /**
   * Normalize configuration with defaults
   */
  private normalizeConfig(config: SemanticRecallConfig) {
    const messageRange =
      typeof config.messageRange === "number"
        ? { before: config.messageRange, after: config.messageRange }
        : (config.messageRange ?? DEFAULTS.messageRange);

    return {
      enabled: config.enabled ?? DEFAULTS.enabled,
      vectorStore: config.vectorStore,
      embedder: config.embedder,
      topK: config.topK ?? DEFAULTS.topK,
      messageRange,
      scope: config.scope ?? DEFAULTS.scope,
      similarityThreshold:
        config.similarityThreshold ?? DEFAULTS.similarityThreshold,
      excludeRoles: config.excludeRoles ?? [...DEFAULTS.excludeRoles],
    };
  }

  /**
   * Initialize the semantic recall layer
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    await this.vectorStore.initialize();
    await this.embedder.initialize();

    // Ensure collection exists with correct dimensions
    await this.vectorStore.ensureCollection({
      name: this.config.vectorStore.collectionName ?? "neurolink_messages",
      dimensions: this.embedder.getDimensions(),
      metric: this.config.vectorStore.metric ?? "cosine",
    });

    this.isInitialized = true;

    logger.info("[SemanticRecallLayer] Initialized successfully", {
      dimensions: this.embedder.getDimensions(),
      provider: this.config.embedder.provider,
      model: this.config.embedder.model,
    });
  }

  /**
   * Index a message for semantic search
   * Failed messages are added to a retry queue instead of being lost
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
    if (this.config.excludeRoles?.includes(message.role as never)) {
      return;
    }

    // Skip empty content
    if (!message.content || message.content.trim().length === 0) {
      return;
    }

    await this.ensureInitialized();

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

      logger.debug("[SemanticRecallLayer] Indexed message", {
        messageId: message.id,
        threadId,
        role: message.role,
      });
    } catch (error) {
      logger.error(
        "[SemanticRecallLayer] Failed to index message, adding to retry queue",
        {
          messageId: message.id,
          error: error instanceof Error ? error.message : String(error),
        },
      );

      // Add to retry queue instead of silently failing
      this.failedIndexQueue.push({
        message,
        threadId,
        resourceId,
        failedAt: new Date().toISOString(),
        retryCount: 0,
      });
      // Don't throw - allow operation to continue
    }
  }

  /**
   * Retry indexing of failed messages
   * @returns Number of successfully retried messages
   */
  async retryFailedIndexing(): Promise<number> {
    if (this.failedIndexQueue.length === 0) {
      return 0;
    }

    const toRetry = [...this.failedIndexQueue];
    this.failedIndexQueue = [];
    let successCount = 0;

    for (const entry of toRetry) {
      try {
        // Try to index again - this will use the same method
        // but we need to bypass the queue addition on failure
        await this.indexMessageDirect(
          entry.message,
          entry.threadId,
          entry.resourceId,
        );
        successCount++;
        logger.debug("[SemanticRecallLayer] Successfully retried indexing", {
          messageId: entry.message.id,
          retryCount: entry.retryCount + 1,
        });
      } catch (error) {
        // Re-add to queue if still failing and under max retries
        if (entry.retryCount < SemanticRecallLayer.MAX_RETRY_COUNT) {
          this.failedIndexQueue.push({
            ...entry,
            retryCount: entry.retryCount + 1,
          });
          logger.warn(
            "[SemanticRecallLayer] Retry failed, re-queuing for later",
            {
              messageId: entry.message.id,
              retryCount: entry.retryCount + 1,
              maxRetries: SemanticRecallLayer.MAX_RETRY_COUNT,
            },
          );
        } else {
          logger.error(
            "[SemanticRecallLayer] Max retries exceeded, dropping message from queue",
            {
              messageId: entry.message.id,
              error: error instanceof Error ? error.message : String(error),
            },
          );
        }
      }
    }

    logger.info("[SemanticRecallLayer] Retry completed", {
      attempted: toRetry.length,
      succeeded: successCount,
      stillPending: this.failedIndexQueue.length,
    });

    return successCount;
  }

  /**
   * Direct indexing method without retry queue (used by retry mechanism)
   * @internal
   */
  private async indexMessageDirect(
    message: ChatMessage,
    threadId: string,
    resourceId?: string,
  ): Promise<void> {
    const vector = await this.embedder.embed(message.content);

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

    await this.vectorStore.upsert([entry]);
  }

  /**
   * Get the count of messages pending retry
   */
  getFailedIndexQueueSize(): number {
    return this.failedIndexQueue.length;
  }

  /**
   * Index multiple messages in batch
   */
  async indexMessages(
    messages: ChatMessage[],
    threadId: string,
    resourceId?: string,
  ): Promise<void> {
    if (!this.config.enabled || messages.length === 0) {
      return;
    }

    // Filter out excluded roles and empty messages
    const filteredMessages = messages.filter(
      (m) =>
        !this.config.excludeRoles?.includes(m.role as never) &&
        m.content &&
        m.content.trim().length > 0,
    );

    if (filteredMessages.length === 0) {
      return;
    }

    await this.ensureInitialized();

    try {
      // Generate embeddings in batch
      const texts = filteredMessages.map((m) => m.content);
      const vectors = await this.embedder.embedBatch(texts);

      // Create vector entries
      const entries: VectorEntry[] = filteredMessages.map((message, index) => ({
        id: message.id || randomUUID(),
        vector: vectors[index],
        metadata: {
          messageId: message.id,
          threadId,
          resourceId,
          role: message.role,
          timestamp: message.timestamp || new Date().toISOString(),
          contentPreview: message.content.substring(0, 100),
        },
      }));

      // Upsert to vector store
      await this.vectorStore.upsert(entries);

      logger.debug("[SemanticRecallLayer] Indexed message batch", {
        count: entries.length,
        threadId,
      });
    } catch (error) {
      logger.error("[SemanticRecallLayer] Failed to index message batch", {
        count: messages.length,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Retrieve semantically similar messages
   */
  async retrieve(
    query: string,
    context: MemoryContext,
    conversationMessages?: ChatMessage[],
  ): Promise<SemanticMatch[]> {
    if (!this.config.enabled) {
      return [];
    }

    await this.ensureInitialized();

    const startTime = Date.now();

    try {
      // Generate query embedding
      const queryVector = await this.embedder.embed(query);

      // Build search filter based on scope
      const filter: VectorSearchQuery["filter"] = {};

      if (this.config.scope === "thread") {
        filter.threadId = context.threadId;
      } else if (this.config.scope === "resource" && context.resourceId) {
        filter.resourceId = context.resourceId;
      }

      // Search vector store
      const searchQuery: VectorSearchQuery = {
        vector: queryVector,
        topK: this.config.topK,
        threshold: this.config.similarityThreshold,
        filter,
      };

      const results = await this.vectorStore.search(searchQuery);

      // Enrich with context messages
      const matches = this.enrichWithContext(
        results,
        conversationMessages || [],
      );

      logger.debug("[SemanticRecallLayer] Retrieved semantic matches", {
        threadId: context.threadId,
        queryLength: query.length,
        matchCount: matches.length,
        durationMs: Date.now() - startTime,
      });

      return matches;
    } catch (error) {
      logger.error("[SemanticRecallLayer] Failed to retrieve matches", {
        threadId: context.threadId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Enrich search results with surrounding context messages
   */
  private enrichWithContext(
    results: Array<{
      id: string;
      score: number;
      metadata: Record<string, unknown>;
    }>,
    conversationMessages: ChatMessage[],
  ): SemanticMatch[] {
    const matches: SemanticMatch[] = [];
    const messageRange = this.config.messageRange as {
      before: number;
      after: number;
    };
    const { before, after } = messageRange;

    for (const result of results) {
      const metadata = result.metadata;
      const messageId = metadata.messageId as string;

      // Find the message in conversation history
      const messageIndex = conversationMessages.findIndex(
        (m) => m.id === messageId,
      );

      let message: ChatMessage;
      let contextMessages: ChatMessage[] | undefined;

      if (messageIndex !== -1) {
        message = conversationMessages[messageIndex];

        // Get surrounding context
        const startIdx = Math.max(0, messageIndex - before);
        const endIdx = Math.min(
          conversationMessages.length,
          messageIndex + after + 1,
        );
        const context = conversationMessages.slice(startIdx, endIdx);

        // Only include context if we have multiple messages
        if (context.length > 1) {
          contextMessages = context;
        }
      } else {
        // Message not in current conversation - reconstruct from metadata
        message = {
          id: messageId,
          role: (metadata.role as ChatMessage["role"]) || "user",
          content: (metadata.contentPreview as string) || "",
          timestamp: metadata.timestamp as string,
        };
      }

      matches.push({
        message,
        score: result.score,
        threadId: metadata.threadId as string,
        resourceId: metadata.resourceId as string | undefined,
        contextMessages,
      });
    }

    return matches;
  }

  /**
   * Delete indexed messages for a thread
   */
  async deleteThread(threadId: string): Promise<void> {
    await this.ensureInitialized();
    await this.vectorStore.delete({ threadId });
    logger.debug("[SemanticRecallLayer] Deleted thread index", { threadId });
  }

  /**
   * Delete indexed messages for a resource
   */
  async deleteResource(resourceId: string): Promise<void> {
    await this.ensureInitialized();
    await this.vectorStore.delete({ resourceId });
    logger.debug("[SemanticRecallLayer] Deleted resource index", {
      resourceId,
    });
  }

  /**
   * Get statistics about indexed vectors
   */
  async getStats(): Promise<{ vectorCount: number }> {
    await this.ensureInitialized();
    const stats = await this.vectorStore.getStats();
    return { vectorCount: stats.vectorCount };
  }

  /**
   * Close the layer and release resources
   */
  async close(): Promise<void> {
    if (this.isInitialized) {
      await this.vectorStore.close();
      this.isInitialized = false;
    }
    logger.debug("[SemanticRecallLayer] Closed");
  }

  /**
   * Ensure the layer is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
}
