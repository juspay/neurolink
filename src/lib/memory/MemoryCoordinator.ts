/**
 * Memory Coordinator
 *
 * Orchestrates the three-layer memory system:
 * 1. Conversation History Layer - Recent messages with summarization
 * 2. Semantic Recall Layer - Vector-based similarity search
 * 3. Working Memory Layer - Structured knowledge storage
 *
 * Provides unified API for:
 * - Token-aware context assembly from all layers
 * - Automatic message indexing to semantic layer
 * - Cross-layer integration and deduplication
 * - Priority-based token allocation
 */

import type {
  ChatMessage,
  ThreeLayerMemoryConfig,
  MemoryContext,
  RetrievedMemoryContext,
  SemanticMatch,
  MemoryDebugInfo,
  ConversationHistoryLayer,
  SemanticRecallLayer,
  WorkingMemoryLayer,
} from "../types/index.js";
import type { ConversationMemoryManager } from "../core/conversationMemoryManager.js";
import type { RedisConversationMemoryManager } from "../core/redisConversationMemoryManager.js";
import { logger } from "../utils/logger.js";
import { createErrorFactory } from "../core/infrastructure/index.js";
import { TokenUtils } from "../constants/tokens.js";

// =============================================================================
// Error Factory
// =============================================================================

const CoordinatorErrors = createErrorFactory("MemoryCoordinator", {
  INITIALIZATION_FAILED: "COORDINATOR_INITIALIZATION_FAILED",
  CONTEXT_ASSEMBLY_FAILED: "COORDINATOR_CONTEXT_ASSEMBLY_FAILED",
  LAYER_ERROR: "COORDINATOR_LAYER_ERROR",
  INVALID_CONFIG: "COORDINATOR_INVALID_CONFIG",
});

// =============================================================================
// Conversation History Adapter
// =============================================================================

/**
 * Adapter to wrap existing conversation memory managers as a layer
 */
class ConversationHistoryAdapter implements ConversationHistoryLayer {
  private manager: ConversationMemoryManager | RedisConversationMemoryManager;
  private config: ThreeLayerMemoryConfig["conversationHistory"];
  private isInitializedFlag: boolean = false;

  constructor(
    manager: ConversationMemoryManager | RedisConversationMemoryManager,
    config?: ThreeLayerMemoryConfig["conversationHistory"],
  ) {
    this.manager = manager;
    this.config = config || { enabled: true };
  }

  async initialize(): Promise<void> {
    if (this.isInitializedFlag) {
      return;
    }
    await this.manager.initialize();
    this.isInitializedFlag = true;
  }

  isEnabled(): boolean {
    return this.config?.enabled ?? true;
  }

  getLayerType(): "conversation" {
    return "conversation";
  }

  async retrieve(context: MemoryContext): Promise<ChatMessage[]> {
    if (!this.isEnabled()) {
      return [];
    }

    try {
      // Use existing buildContextMessages method
      const messages = await this.manager.buildContextMessages(
        context.threadId,
      );

      // Apply lastMessages limit if specified
      const limit = this.config?.lastMessages;
      if (typeof limit === "number" && limit > 0) {
        return messages.slice(-limit);
      }

      return messages;
    } catch (error) {
      logger.error("[ConversationHistoryAdapter] Failed to retrieve", {
        threadId: context.threadId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  async store(
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
  ): Promise<void> {
    if (this.config?.readOnly) {
      logger.debug(
        "[ConversationHistoryAdapter] Read-only mode, skipping store",
      );
      return;
    }

    await this.manager.storeConversationTurn({
      sessionId: context.threadId,
      userId: context.resourceId,
      userMessage,
      aiResponse,
      enableSummarization: this.config?.enableSummarization,
      events: options?.events,
      providerDetails: options?.providerDetails,
    });
  }

  async getOrCreateThread(
    threadId: string,
    resourceId?: string,
  ): Promise<{
    id: string;
    resourceId?: string;
    title: string;
    createdAt: string;
    updatedAt: string;
  }> {
    // Check if session exists using appropriate method for manager type
    // ConversationMemoryManager has getSession (sync), Redis has getUserSessionObject (async)
    if (
      "getSession" in this.manager &&
      typeof this.manager.getSession === "function"
    ) {
      // In-memory manager
      const session = (this.manager as ConversationMemoryManager).getSession(
        threadId,
      );
      if (session) {
        return {
          id: session.sessionId,
          resourceId: session.userId,
          title: "Conversation",
          createdAt: new Date(session.createdAt).toISOString(),
          updatedAt: new Date(session.lastActivity).toISOString(),
        };
      }
    } else if (
      "getUserSessionObject" in this.manager &&
      typeof this.manager.getUserSessionObject === "function"
    ) {
      // Redis manager
      const session = await (
        this.manager as RedisConversationMemoryManager
      ).getUserSessionObject(resourceId || "", threadId);
      if (session) {
        return {
          id: session.sessionId,
          resourceId: session.userId,
          title: session.title || "Conversation",
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        };
      }
    }

    // Return placeholder for new thread
    return {
      id: threadId,
      resourceId,
      title: "New Conversation",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async listThreads(_resourceId: string): Promise<
    Array<{
      id: string;
      resourceId?: string;
      title: string;
      createdAt: string;
      updatedAt: string;
    }>
  > {
    // In-memory manager doesn't support listing by user
    // This would need to be implemented in the manager
    return [];
  }

  async clearThread(threadId: string, _resourceId?: string): Promise<boolean> {
    return this.manager.clearSession(threadId);
  }

  async close(): Promise<void> {
    // Manager lifecycle is handled externally
  }

  /**
   * Get underlying manager for direct access
   */
  getManager(): ConversationMemoryManager | RedisConversationMemoryManager {
    return this.manager;
  }
}

// =============================================================================
// Memory Coordinator Implementation
// =============================================================================

/**
 * Default context assembly priorities (token allocation percentages)
 */
const DEFAULT_TOKEN_ALLOCATION = {
  workingMemory: 0.15, // 15% for working memory (base context)
  conversationHistory: 0.6, // 60% for recent conversation
  semanticRecall: 0.25, // 25% for semantic matches
};

/**
 * Memory Coordinator
 *
 * Orchestrates the three-layer memory system, providing unified
 * context assembly with token-aware prioritization.
 */
export class MemoryCoordinator {
  private conversationLayer: ConversationHistoryLayer | null = null;
  private semanticLayer: SemanticRecallLayer | null = null;
  private workingMemoryLayer: WorkingMemoryLayer | null = null;
  private config: ThreeLayerMemoryConfig;
  private isInitializedFlag: boolean = false;

  constructor(config: ThreeLayerMemoryConfig) {
    this.config = config;
  }

  /**
   * Set the conversation history layer
   */
  setConversationLayer(
    layer:
      | ConversationHistoryLayer
      | ConversationMemoryManager
      | RedisConversationMemoryManager,
  ): void {
    // Check if it's a raw manager (has storeConversationTurn and buildContextMessages)
    if ("storeConversationTurn" in layer && "buildContextMessages" in layer) {
      // It's a raw manager, wrap it
      this.conversationLayer = new ConversationHistoryAdapter(
        layer as ConversationMemoryManager | RedisConversationMemoryManager,
        this.config.conversationHistory,
      );
    } else {
      this.conversationLayer = layer as ConversationHistoryLayer;
    }
  }

  /**
   * Set the semantic recall layer
   */
  setSemanticLayer(layer: SemanticRecallLayer): void {
    this.semanticLayer = layer;
  }

  /**
   * Set the working memory layer
   */
  setWorkingMemoryLayer(layer: WorkingMemoryLayer): void {
    this.workingMemoryLayer = layer;
  }

  /**
   * Initialize all layers
   */
  async initialize(): Promise<void> {
    if (this.isInitializedFlag) {
      return;
    }

    const startTime = Date.now();

    try {
      const initPromises: Promise<void>[] = [];

      if (this.conversationLayer) {
        initPromises.push(this.conversationLayer.initialize());
      }
      if (this.semanticLayer && this.config.semanticRecall?.enabled) {
        initPromises.push(this.semanticLayer.initialize());
      }
      if (this.workingMemoryLayer && this.config.workingMemory?.enabled) {
        initPromises.push(this.workingMemoryLayer.initialize());
      }

      await Promise.all(initPromises);

      this.isInitializedFlag = true;
      logger.info("[MemoryCoordinator] Initialized", {
        durationMs: Date.now() - startTime,
        layers: {
          conversation: !!this.conversationLayer,
          semantic: !!this.semanticLayer && this.config.semanticRecall?.enabled,
          workingMemory:
            !!this.workingMemoryLayer && this.config.workingMemory?.enabled,
        },
      });
    } catch (error) {
      throw CoordinatorErrors.create(
        "INITIALIZATION_FAILED",
        "Failed to initialize memory coordinator",
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
   * Assemble context from all layers with token-aware prioritization
   */
  async assembleContext(
    context: MemoryContext,
    options: {
      maxTokens?: number;
      query?: string;
      includeSemanticMatches?: boolean;
      includeWorkingMemory?: boolean;
    } = {},
  ): Promise<RetrievedMemoryContext> {
    if (!this.config.enabled) {
      return {
        messages: [],
        tokenCount: 0,
      };
    }

    const startTime = Date.now();
    const maxTokens = options.maxTokens || 8000;
    const debug: MemoryDebugInfo = {
      layerTimings: {},
      layerCounts: { conversationHistory: 0, semanticRecall: 0 },
      processors: [],
    };

    let messages: ChatMessage[] = [];
    let workingMemory: string | Record<string, unknown> | undefined;
    let semanticMatches: SemanticMatch[] | undefined;
    let tokenBudgetRemaining = maxTokens;

    // ==========================================================================
    // Step 1: Working Memory (Base Context - Always Included First)
    // ==========================================================================

    if (
      this.workingMemoryLayer &&
      this.config.workingMemory?.enabled &&
      context.resourceId &&
      options.includeWorkingMemory !== false
    ) {
      const wmStartTime = Date.now();
      try {
        const wmData = await this.workingMemoryLayer.get(context.resourceId);
        if (wmData) {
          const rendered = await this.workingMemoryLayer.render(
            context.resourceId,
          );
          if (rendered) {
            workingMemory = wmData.schemaData || rendered;
            const wmTokens =
              wmData.tokenCount || TokenUtils.estimateTokenCount(rendered);
            tokenBudgetRemaining -= wmTokens;
            debug.processors.push("workingMemory:included");

            logger.debug("[MemoryCoordinator] Working memory included", {
              resourceId: context.resourceId,
              tokens: wmTokens,
            });
          }
        }
      } catch (error) {
        logger.error("[MemoryCoordinator] Working memory retrieval failed", {
          resourceId: context.resourceId,
          error: error instanceof Error ? error.message : String(error),
        });
        debug.processors.push("workingMemory:error");
      }
      debug.layerTimings.workingMemory = Date.now() - wmStartTime;
    }

    // ==========================================================================
    // Step 2: Conversation History (Priority - Recent Messages)
    // ==========================================================================

    if (
      this.conversationLayer &&
      this.config.conversationHistory?.enabled !== false
    ) {
      const convStartTime = Date.now();
      try {
        const conversationMessages =
          await this.conversationLayer.retrieve(context);

        // Calculate tokens and fit within budget
        const conversationTokenBudget = Math.floor(
          (tokenBudgetRemaining *
            DEFAULT_TOKEN_ALLOCATION.conversationHistory) /
            (DEFAULT_TOKEN_ALLOCATION.conversationHistory +
              DEFAULT_TOKEN_ALLOCATION.semanticRecall),
        );

        const { messages: trimmedMessages, tokenCount } =
          this.trimToTokenBudget(conversationMessages, conversationTokenBudget);

        messages = trimmedMessages;
        tokenBudgetRemaining -= tokenCount;
        debug.layerCounts.conversationHistory = messages.length;
        debug.processors.push(`conversationHistory:${messages.length}`);

        logger.debug("[MemoryCoordinator] Conversation history retrieved", {
          threadId: context.threadId,
          messageCount: messages.length,
          tokenCount,
        });
      } catch (error) {
        logger.error(
          "[MemoryCoordinator] Conversation history retrieval failed",
          {
            threadId: context.threadId,
            error: error instanceof Error ? error.message : String(error),
          },
        );
        debug.processors.push("conversationHistory:error");
      }
      debug.layerTimings.conversationHistory = Date.now() - convStartTime;
    }

    // ==========================================================================
    // Step 3: Semantic Recall (Gap Filler - Contextually Relevant)
    // ==========================================================================

    if (
      this.semanticLayer &&
      this.config.semanticRecall?.enabled &&
      options.query &&
      options.includeSemanticMatches !== false
    ) {
      const semStartTime = Date.now();
      try {
        const matches = await this.semanticLayer.search(
          options.query,
          context,
          {
            topK: this.config.semanticRecall.topK || 3,
            threshold: this.config.semanticRecall.similarityThreshold || 0.7,
          },
        );

        if (matches.length > 0) {
          // Filter out duplicates (messages already in conversation history)
          const existingIds = new Set(messages.map((m) => m.id));
          const uniqueMatches = matches.filter(
            (m) => !existingIds.has(m.message.id),
          );

          // Fit within remaining token budget
          const semanticMessages = uniqueMatches.map((m) => m.message);
          const { messages: trimmedSemanticMessages, tokenCount } =
            this.trimToTokenBudget(semanticMessages, tokenBudgetRemaining);

          // Store matches for return
          semanticMatches = uniqueMatches.slice(
            0,
            trimmedSemanticMessages.length,
          );
          debug.layerCounts.semanticRecall = semanticMatches.length;
          debug.processors.push(`semanticRecall:${semanticMatches.length}`);

          logger.debug("[MemoryCoordinator] Semantic matches retrieved", {
            query: options.query.substring(0, 50),
            matchCount: semanticMatches.length,
            tokenCount,
          });
        }
      } catch (error) {
        logger.error("[MemoryCoordinator] Semantic recall failed", {
          query: options.query?.substring(0, 50),
          error: error instanceof Error ? error.message : String(error),
        });
        debug.processors.push("semanticRecall:error");
      }
      debug.layerTimings.semanticRecall = Date.now() - semStartTime;
    }

    // ==========================================================================
    // Step 4: Final Assembly
    // ==========================================================================

    const totalTokenCount = TokenUtils.estimateTokenCount(
      messages.map((m) => m.content).join("\n"),
    );

    const result: RetrievedMemoryContext = {
      messages,
      workingMemory,
      semanticMatches,
      tokenCount: totalTokenCount,
      debug,
    };

    logger.debug("[MemoryCoordinator] Context assembled", {
      threadId: context.threadId,
      totalMessages: messages.length,
      totalTokens: totalTokenCount,
      hasWorkingMemory: !!workingMemory,
      semanticMatchCount: semanticMatches?.length || 0,
      durationMs: Date.now() - startTime,
    });

    return result;
  }

  /**
   * Store a conversation turn and index to semantic layer
   */
  async storeAndIndex(
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
      indexToSemantic?: boolean;
    },
  ): Promise<void> {
    // Store to conversation layer
    if (this.conversationLayer) {
      await this.conversationLayer.store(
        context,
        userMessage,
        aiResponse,
        options,
      );
    }

    // Index to semantic layer (non-blocking)
    if (
      this.semanticLayer &&
      this.config.semanticRecall?.enabled &&
      options?.indexToSemantic !== false
    ) {
      // Fire and forget - don't block on indexing
      setImmediate(async () => {
        try {
          const userMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            content: userMessage,
            timestamp: new Date().toISOString(),
          };
          const assistantMsg: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: aiResponse,
            timestamp: new Date().toISOString(),
          };

          await this.semanticLayer?.indexMessages(
            [userMsg, assistantMsg],
            context.threadId,
            context.resourceId,
          );
        } catch (error) {
          logger.error(
            "[MemoryCoordinator] Failed to index to semantic layer",
            {
              threadId: context.threadId,
              error: error instanceof Error ? error.message : String(error),
            },
          );
        }
      });
    }
  }

  /**
   * Update working memory for a resource
   */
  async updateWorkingMemory(
    resourceId: string,
    data: string | Record<string, unknown>,
    mode: "set" | "merge" = "set",
  ): Promise<void> {
    if (!this.workingMemoryLayer || !this.config.workingMemory?.enabled) {
      return;
    }

    if (mode === "merge" && typeof data === "object") {
      await this.workingMemoryLayer.merge(resourceId, data);
    } else {
      await this.workingMemoryLayer.set(resourceId, data);
    }
  }

  /**
   * Get working memory for a resource
   */
  async getWorkingMemory(
    resourceId: string,
  ): Promise<string | Record<string, unknown> | null> {
    if (!this.workingMemoryLayer || !this.config.workingMemory?.enabled) {
      return null;
    }

    const data = await this.workingMemoryLayer.get(resourceId);
    if (!data) {
      return null;
    }

    return data.schemaData || data.template || null;
  }

  /**
   * Clear all memory for a thread
   */
  async clearThread(threadId: string, resourceId?: string): Promise<void> {
    const promises: Promise<unknown>[] = [];

    if (this.conversationLayer) {
      promises.push(this.conversationLayer.clearThread(threadId, resourceId));
    }

    if (this.semanticLayer && this.config.semanticRecall?.enabled) {
      promises.push(this.semanticLayer.deleteThread(threadId));
    }

    await Promise.all(promises);

    logger.info("[MemoryCoordinator] Thread cleared", { threadId });
  }

  /**
   * Clear working memory for a resource
   */
  async clearWorkingMemory(resourceId: string): Promise<void> {
    if (this.workingMemoryLayer && this.config.workingMemory?.enabled) {
      await this.workingMemoryLayer.clear(resourceId);
    }
  }

  /**
   * Close all layers
   */
  async close(): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.conversationLayer) {
      promises.push(this.conversationLayer.close());
    }
    if (this.semanticLayer) {
      promises.push(this.semanticLayer.close());
    }
    if (this.workingMemoryLayer) {
      promises.push(this.workingMemoryLayer.close());
    }

    await Promise.all(promises);
    this.isInitializedFlag = false;

    logger.info("[MemoryCoordinator] Closed");
  }

  /**
   * Check if coordinator is initialized
   */
  isInitialized(): boolean {
    return this.isInitializedFlag;
  }

  /**
   * Get layer status
   */
  getLayerStatus(): {
    conversation: boolean;
    semantic: boolean;
    workingMemory: boolean;
  } {
    return {
      conversation:
        !!this.conversationLayer && this.conversationLayer.isEnabled(),
      semantic:
        !!this.semanticLayer && this.config.semanticRecall?.enabled === true,
      workingMemory:
        !!this.workingMemoryLayer &&
        this.config.workingMemory?.enabled === true,
    };
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Trim messages to fit within token budget
   */
  private trimToTokenBudget(
    messages: ChatMessage[],
    maxTokens: number,
  ): { messages: ChatMessage[]; tokenCount: number } {
    let tokenCount = 0;
    const result: ChatMessage[] = [];

    // Process from most recent (end) to oldest (start)
    for (let i = messages.length - 1; i >= 0; i--) {
      const msgTokens = TokenUtils.estimateTokenCount(messages[i].content);

      if (tokenCount + msgTokens > maxTokens) {
        break;
      }

      result.unshift(messages[i]);
      tokenCount += msgTokens;
    }

    return { messages: result, tokenCount };
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a memory coordinator with minimal configuration
 */
export function createMemoryCoordinator(
  config: Partial<ThreeLayerMemoryConfig>,
): MemoryCoordinator {
  const fullConfig: ThreeLayerMemoryConfig = {
    enabled: true,
    storage: { type: "memory" },
    ...config,
  };

  return new MemoryCoordinator(fullConfig);
}
