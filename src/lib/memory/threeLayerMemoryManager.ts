/**
 * Three-Layer Memory Manager
 *
 * Unified coordinator for the three-layer memory system:
 * 1. Conversation History Layer - Recent messages with summarization
 * 2. Semantic Recall Layer - Vector-based similarity search
 * 3. Working Memory Layer - Structured knowledge storage
 *
 * @module memory/threeLayerMemoryManager
 * @since 9.0.0
 */

import { TokenUtils } from "../constants/tokens.js";
import type { ConversationMemoryManager } from "../core/conversationMemoryManager.js";
import type { RedisConversationMemoryManager } from "../core/redisConversationMemoryManager.js";
import type {
  ChatMessage,
  RedisStorageConfig,
  Embedder,
  MemoryContext,
  MemoryDebugInfo,
  MemoryThread,
  RetrievedMemoryContext,
  SemanticMatch,
  ThreeLayerMemoryConfig,
  MemoryVectorStore,
  WorkingMemoryStorage,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { createEmbedder } from "./embedders/embedderFactory.js";
import { ConversationHistoryLayer } from "./layers/conversationHistoryLayer.js";
import { SemanticRecallLayer } from "./layers/semanticRecallLayer.js";
import { WorkingMemoryLayer } from "./layers/workingMemoryLayer.js";
import { createWorkingMemoryStorage } from "./storage/workingMemoryStorage.js";
import { createUpdateWorkingMemoryTool } from "./tools/updateWorkingMemoryTool.js";
import type { UpdateWorkingMemoryToolDefinition } from "../types/index.js";
import { createVectorStore } from "./vectorStores/vectorStoreFactory.js";

/**
 * Default configuration for three-layer memory
 */
const DEFAULT_CONFIG: Partial<ThreeLayerMemoryConfig> = {
  enabled: true,
  storage: { type: "memory" },
  conversationHistory: {
    enabled: true,
    lastMessages: 40,
  },
};

/**
 * Three-Layer Memory Manager
 *
 * Coordinates all three memory layers and provides a unified interface
 * for memory operations during AI generation.
 */
export class ThreeLayerMemoryManager {
  private config: ThreeLayerMemoryConfig;
  private conversationHistoryLayer?: ConversationHistoryLayer;
  private semanticRecallLayer?: SemanticRecallLayer;
  private workingMemoryLayer?: WorkingMemoryLayer;
  private vectorStore?: MemoryVectorStore;
  private embedder?: Embedder;
  private workingMemoryStorage?: WorkingMemoryStorage;
  private isInitialized = false;

  constructor(config: ThreeLayerMemoryConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config } as ThreeLayerMemoryConfig;
  }

  /**
   * Initialize the memory manager with existing conversation managers
   */
  async initialize(
    conversationManager:
      | ConversationMemoryManager
      | RedisConversationMemoryManager,
    redisConfig?: RedisStorageConfig,
  ): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const startTime = Date.now();

    try {
      // Initialize Conversation History Layer (always available)
      if (this.config.conversationHistory?.enabled !== false) {
        this.conversationHistoryLayer = new ConversationHistoryLayer(
          conversationManager,
          this.config.conversationHistory ?? { enabled: true },
        );
        logger.debug(
          "[ThreeLayerMemoryManager] Conversation history layer initialized",
        );
      }

      // Initialize Semantic Recall Layer (optional)
      if (this.config.semanticRecall?.enabled) {
        await this.initializeSemanticRecallLayer();
        logger.debug(
          "[ThreeLayerMemoryManager] Semantic recall layer initialized",
        );
      }

      // Initialize Working Memory Layer (optional)
      if (this.config.workingMemory?.enabled) {
        await this.initializeWorkingMemoryLayer(redisConfig);
        logger.debug(
          "[ThreeLayerMemoryManager] Working memory layer initialized",
        );
      }

      this.isInitialized = true;

      logger.info("[ThreeLayerMemoryManager] Initialized successfully", {
        conversationHistory: !!this.conversationHistoryLayer,
        semanticRecall: !!this.semanticRecallLayer,
        workingMemory: !!this.workingMemoryLayer,
        durationMs: Date.now() - startTime,
      });
    } catch (error) {
      logger.error("[ThreeLayerMemoryManager] Failed to initialize", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Initialize the semantic recall layer
   */
  private async initializeSemanticRecallLayer(): Promise<void> {
    const semanticConfig = this.config.semanticRecall!;

    // Create vector store
    this.vectorStore = await createVectorStore(semanticConfig.vectorStore);

    // Create embedder
    this.embedder = await createEmbedder(semanticConfig.embedder);

    // Create layer
    this.semanticRecallLayer = new SemanticRecallLayer(
      this.vectorStore,
      this.embedder,
      semanticConfig,
    );

    // Initialize
    await this.semanticRecallLayer.initialize();
  }

  /**
   * Initialize the working memory layer
   */
  private async initializeWorkingMemoryLayer(
    redisConfig?: RedisStorageConfig,
  ): Promise<void> {
    const workingConfig = this.config.workingMemory!;

    // Create storage based on config
    this.workingMemoryStorage = createWorkingMemoryStorage(
      this.config.storage.type,
      this.config.storage.type === "redis"
        ? (this.config.storage.redis ?? redisConfig)
        : undefined,
    );

    // Create layer
    this.workingMemoryLayer = new WorkingMemoryLayer(
      this.workingMemoryStorage,
      workingConfig,
    );
  }

  /**
   * Retrieve context for AI generation
   *
   * Assembles context from all enabled layers:
   * 1. Working memory (if enabled) - prepended to system prompt
   * 2. Semantic matches (if enabled) - relevant historical messages
   * 3. Conversation history - recent messages
   */
  async retrieve(
    context: MemoryContext,
    query?: string,
  ): Promise<RetrievedMemoryContext> {
    if (!this.isInitialized) {
      throw new Error(
        "ThreeLayerMemoryManager not initialized. Call initialize() first.",
      );
    }

    const startTime = Date.now();
    const debug: MemoryDebugInfo = {
      layerTimings: {},
      layerCounts: { conversationHistory: 0, semanticRecall: 0 },
      processors: [],
    };

    const messages: ChatMessage[] = [];
    let workingMemory: string | Record<string, unknown> | undefined;
    let semanticMatches: SemanticMatch[] | undefined;

    // 1. Retrieve working memory
    if (this.workingMemoryLayer) {
      const wmStart = Date.now();
      const wmData = await this.workingMemoryLayer.retrieve(context);
      debug.layerTimings.workingMemory = Date.now() - wmStart;

      if (wmData) {
        workingMemory = wmData;
      }
    }

    // 2. Retrieve conversation history
    let conversationMessages: ChatMessage[] = [];
    if (this.conversationHistoryLayer) {
      const chStart = Date.now();
      conversationMessages =
        await this.conversationHistoryLayer.retrieve(context);
      debug.layerTimings.conversationHistory = Date.now() - chStart;
      debug.layerCounts.conversationHistory = conversationMessages.length;
    }

    // 3. Retrieve semantic matches
    if (this.semanticRecallLayer && query) {
      const srStart = Date.now();
      semanticMatches = await this.semanticRecallLayer.retrieve(
        query,
        context,
        conversationMessages,
      );
      debug.layerTimings.semanticRecall = Date.now() - srStart;
      debug.layerCounts.semanticRecall = semanticMatches.length;
    }

    // Assemble final messages
    // Add semantic context messages first (if any unique ones)
    if (semanticMatches && semanticMatches.length > 0) {
      const conversationIds = new Set(conversationMessages.map((m) => m.id));

      for (const match of semanticMatches) {
        // Add context messages that aren't already in conversation history
        if (match.contextMessages) {
          for (const ctxMsg of match.contextMessages) {
            if (ctxMsg.id && !conversationIds.has(ctxMsg.id)) {
              messages.push(ctxMsg);
              conversationIds.add(ctxMsg.id);
            }
          }
        } else if (match.message.id && !conversationIds.has(match.message.id)) {
          messages.push(match.message);
          conversationIds.add(match.message.id);
        }
      }
    }

    // Add conversation history messages
    messages.push(...conversationMessages);

    // Calculate approximate token count (rough estimate: 4 chars per token)
    const tokenCount = this.estimateTokens(messages, workingMemory);

    logger.debug("[ThreeLayerMemoryManager] Retrieved context", {
      threadId: context.threadId,
      messageCount: messages.length,
      tokenCount,
      semanticMatches: semanticMatches?.length ?? 0,
      hasWorkingMemory: !!workingMemory,
      totalDurationMs: Date.now() - startTime,
    });

    return {
      messages,
      workingMemory,
      semanticMatches,
      tokenCount,
      debug,
    };
  }

  /**
   * Store a conversation turn
   *
   * Persists the conversation to all enabled layers:
   * 1. Conversation history - stores the turn
   * 2. Semantic recall - indexes messages for search
   */
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
    if (!this.isInitialized) {
      throw new Error(
        "ThreeLayerMemoryManager not initialized. Call initialize() first.",
      );
    }

    // 1. Store in conversation history
    if (this.conversationHistoryLayer) {
      await this.conversationHistoryLayer.store(
        context,
        userMessage,
        aiResponse,
        options,
      );
    }

    // 2. Index in semantic recall
    if (this.semanticRecallLayer) {
      const timestamp = new Date().toISOString();

      // Index user message
      await this.semanticRecallLayer.indexMessage(
        {
          id: `${context.threadId}-${Date.now()}-user`,
          role: "user",
          content: userMessage,
          timestamp,
        },
        context.threadId,
        context.resourceId,
      );

      // Index AI response
      await this.semanticRecallLayer.indexMessage(
        {
          id: `${context.threadId}-${Date.now()}-assistant`,
          role: "assistant",
          content: aiResponse,
          timestamp,
        },
        context.threadId,
        context.resourceId,
      );
    }

    logger.debug("[ThreeLayerMemoryManager] Stored conversation turn", {
      threadId: context.threadId,
      resourceId: context.resourceId,
    });
  }

  /**
   * Get or create a thread
   */
  async getOrCreateThread(
    threadId: string,
    resourceId?: string,
  ): Promise<MemoryThread> {
    if (this.conversationHistoryLayer) {
      return this.conversationHistoryLayer.getOrCreateThread(
        threadId,
        resourceId,
      );
    }

    const now = new Date().toISOString();
    return {
      id: threadId,
      resourceId,
      title: "New Conversation",
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * List threads for a resource
   */
  async listThreads(resourceId: string): Promise<MemoryThread[]> {
    if (this.conversationHistoryLayer) {
      return this.conversationHistoryLayer.listThreads(resourceId);
    }
    return [];
  }

  /**
   * Clear a thread's data from all layers
   */
  async clearThread(threadId: string, resourceId?: string): Promise<void> {
    // Clear conversation history
    if (this.conversationHistoryLayer) {
      await this.conversationHistoryLayer.clearThread(threadId, resourceId);
    }

    // Clear semantic index
    if (this.semanticRecallLayer) {
      await this.semanticRecallLayer.deleteThread(threadId);
    }

    // Clear working memory (if thread-scoped)
    if (
      this.workingMemoryLayer &&
      this.config.workingMemory?.scope === "thread"
    ) {
      await this.workingMemoryLayer.clear({ threadId, resourceId });
    }

    logger.debug("[ThreeLayerMemoryManager] Cleared thread", {
      threadId,
      resourceId,
    });
  }

  /**
   * Clear all data for a resource
   */
  async clearResource(resourceId: string): Promise<void> {
    // Clear semantic index
    if (this.semanticRecallLayer) {
      await this.semanticRecallLayer.deleteResource(resourceId);
    }

    // Clear working memory
    if (this.workingMemoryLayer) {
      await this.workingMemoryLayer.clear({ threadId: "unused", resourceId });
    }

    logger.debug("[ThreeLayerMemoryManager] Cleared resource", { resourceId });
  }

  /**
   * Get the update working memory tool for agent use
   */
  getWorkingMemoryTool(
    context: MemoryContext,
  ): UpdateWorkingMemoryToolDefinition | null {
    if (!this.workingMemoryLayer) {
      return null;
    }

    return createUpdateWorkingMemoryTool(this.workingMemoryLayer, context);
  }

  /**
   * Format working memory for system prompt injection
   */
  formatWorkingMemoryForPrompt(
    workingMemory: string | Record<string, unknown> | undefined,
  ): string {
    if (!workingMemory || !this.workingMemoryLayer) {
      return "";
    }

    return this.workingMemoryLayer.formatForPrompt(workingMemory);
  }

  /**
   * Check if a specific layer is enabled
   */
  isLayerEnabled(
    layer: "conversationHistory" | "semanticRecall" | "workingMemory",
  ): boolean {
    switch (layer) {
      case "conversationHistory":
        return !!this.conversationHistoryLayer;
      case "semanticRecall":
        return !!this.semanticRecallLayer;
      case "workingMemory":
        return !!this.workingMemoryLayer;
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): ThreeLayerMemoryConfig {
    return { ...this.config };
  }

  /**
   * Close all layers and release resources
   */
  async close(): Promise<void> {
    if (this.conversationHistoryLayer) {
      await this.conversationHistoryLayer.close();
    }

    if (this.semanticRecallLayer) {
      await this.semanticRecallLayer.close();
    }

    if (this.workingMemoryLayer) {
      await this.workingMemoryLayer.close();
    }

    this.isInitialized = false;

    logger.debug("[ThreeLayerMemoryManager] Closed");
  }

  /**
   * Update working memory
   *
   * Allows direct updates to working memory from external code.
   * The working memory layer handles merge/replace semantics based on mode.
   */
  async updateWorkingMemory(
    context: MemoryContext,
    data: string | Record<string, unknown>,
    reason?: string,
  ): Promise<void> {
    if (!this.workingMemoryLayer) {
      throw new Error(
        "Working memory is not enabled. Enable it in the configuration.",
      );
    }

    await this.workingMemoryLayer.update(context, data, reason);

    logger.debug("[ThreeLayerMemoryManager] Updated working memory", {
      threadId: context.threadId,
      resourceId: context.resourceId,
      reason,
    });
  }

  /**
   * Retrieve and assemble context with token-aware consolidation
   *
   * This method provides advanced context assembly with:
   * - Token budget management
   * - Priority-based message selection
   * - Working memory injection as system context
   * - Semantic context injection with deduplication
   */
  async retrieveWithTokenBudget(
    context: MemoryContext,
    query?: string,
    maxTokens: number = 50000,
  ): Promise<RetrievedMemoryContext> {
    if (!this.isInitialized) {
      throw new Error(
        "ThreeLayerMemoryManager not initialized. Call initialize() first.",
      );
    }

    const startTime = Date.now();
    const debug: MemoryDebugInfo = {
      layerTimings: {},
      layerCounts: { conversationHistory: 0, semanticRecall: 0 },
      processors: [],
    };

    // 1. Retrieve working memory
    let workingMemory: string | Record<string, unknown> | undefined;
    if (this.workingMemoryLayer) {
      const wmStart = Date.now();
      const wmData = await this.workingMemoryLayer.retrieve(context);
      debug.layerTimings.workingMemory = Date.now() - wmStart;

      if (wmData) {
        workingMemory = wmData;
      }
    }

    // 2. Retrieve conversation history
    let conversationMessages: ChatMessage[] = [];
    if (this.conversationHistoryLayer) {
      const chStart = Date.now();
      conversationMessages =
        await this.conversationHistoryLayer.retrieve(context);
      debug.layerTimings.conversationHistory = Date.now() - chStart;
      debug.layerCounts.conversationHistory = conversationMessages.length;
    }

    // 3. Retrieve semantic matches
    let semanticMatches: SemanticMatch[] | undefined;
    if (this.semanticRecallLayer && query) {
      const srStart = Date.now();
      semanticMatches = await this.semanticRecallLayer.retrieve(
        query,
        context,
        conversationMessages,
      );
      debug.layerTimings.semanticRecall = Date.now() - srStart;
      debug.layerCounts.semanticRecall = semanticMatches?.length ?? 0;
    }

    // 4. Assemble context with token awareness
    const assembled = this.assembleContextWithTokenBudget(
      conversationMessages,
      semanticMatches ?? [],
      workingMemory,
      maxTokens,
    );

    debug.processors = assembled.processorsApplied;

    logger.debug(
      "[ThreeLayerMemoryManager] Retrieved context with token budget",
      {
        threadId: context.threadId,
        messageCount: assembled.messages.length,
        tokenCount: assembled.tokenCount,
        semanticMatches: semanticMatches?.length ?? 0,
        hasWorkingMemory: !!workingMemory,
        totalDurationMs: Date.now() - startTime,
      },
    );

    return {
      messages: assembled.messages,
      workingMemory,
      semanticMatches,
      tokenCount: assembled.tokenCount,
      debug,
    };
  }

  /**
   * Assemble final context from all layers with token awareness
   *
   * Priority order:
   * 1. Working memory (prepended as system message)
   * 2. Recent conversation history (most important)
   * 3. Semantic matches (supplementary context)
   */
  private assembleContextWithTokenBudget(
    conversationMessages: ChatMessage[],
    semanticMatches: SemanticMatch[],
    workingMemory: string | Record<string, unknown> | undefined,
    maxTokens: number,
  ): {
    messages: ChatMessage[];
    tokenCount: number;
    processorsApplied: string[];
  } {
    const processorsApplied: string[] = [];
    const messages: ChatMessage[] = [];
    let currentTokens = 0;

    // 1. Add working memory as system message (highest priority)
    if (workingMemory && this.workingMemoryLayer) {
      const wmContent = this.workingMemoryLayer.formatForPrompt(workingMemory);
      const wmTokens = TokenUtils.estimateTokenCount(wmContent);

      if (wmTokens < maxTokens * 0.2) {
        // Cap at 20% of budget
        messages.push({
          id: "working-memory",
          role: "system",
          content: wmContent,
          timestamp: new Date().toISOString(),
          metadata: { source: "working-memory" },
        });
        currentTokens += wmTokens;
        processorsApplied.push("working-memory-injection");
      }
    }

    // 2. Reserve space for recent conversation (60% of remaining budget)
    const conversationBudget = Math.floor((maxTokens - currentTokens) * 0.8);
    const conversationIds = new Set<string>();

    // Add conversation messages from most recent backwards
    const reversedConversation = [...conversationMessages].reverse();
    const selectedConversation: ChatMessage[] = [];

    for (const msg of reversedConversation) {
      const content =
        typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content);
      const msgTokens = TokenUtils.estimateTokenCount(content);

      if (currentTokens + msgTokens <= currentTokens + conversationBudget) {
        selectedConversation.unshift(msg);
        currentTokens += msgTokens;
        if (msg.id) {
          conversationIds.add(msg.id);
        }
      } else {
        break;
      }
    }

    // 3. Add semantic matches that don't duplicate conversation (remaining budget)
    const semanticBudget = maxTokens - currentTokens;
    const semanticMessages: ChatMessage[] = [];

    for (const match of semanticMatches) {
      // Skip if already in conversation
      if (match.message.id && conversationIds.has(match.message.id)) {
        continue;
      }

      const content = match.message.content;
      const msgTokens = TokenUtils.estimateTokenCount(content);

      if (
        currentTokens + msgTokens <= maxTokens &&
        msgTokens < semanticBudget
      ) {
        // Format as context with similarity score
        // Note: We store additional context info in metadata for debugging/tracing
        // The ChatMessage type allows [key: string]: unknown in metadata
        const semanticMetadata: ChatMessage["metadata"] = {
          source: "semantic-recall",
        };
        // Add additional context as custom data (allowed by ChatMessage.metadata index signature)
        (semanticMetadata as Record<string, unknown>).score = match.score;
        (semanticMetadata as Record<string, unknown>).originalThreadId =
          match.threadId;

        semanticMessages.push({
          id: `semantic-${match.message.id}`,
          role: "system",
          content: `[Relevant context from ${match.threadId === conversationMessages[0]?.id ? "earlier in this" : "a previous"} conversation (similarity: ${match.score.toFixed(2)})]:\n${match.message.content}`,
          timestamp: match.message.timestamp,
          metadata: semanticMetadata,
        });
        currentTokens += msgTokens;
        if (match.message.id) {
          conversationIds.add(match.message.id);
        }
      }
    }

    if (semanticMessages.length > 0) {
      processorsApplied.push("semantic-injection");
    }

    // 4. Assemble in order: working memory -> semantic -> conversation
    // (Working memory already added)
    messages.push(...semanticMessages);
    messages.push(...selectedConversation);

    if (selectedConversation.length < conversationMessages.length) {
      processorsApplied.push("token-limit-trim");
    }

    return {
      messages,
      tokenCount: currentTokens,
      processorsApplied,
    };
  }

  /**
   * Get statistics about the memory system
   */
  async getStats(): Promise<{
    conversationHistory?: { enabled: boolean };
    semanticRecall?: { vectorCount: number };
    workingMemory?: { enabled: boolean; mode: "template" | "schema" };
  }> {
    const stats: Awaited<ReturnType<typeof this.getStats>> = {};

    if (this.conversationHistoryLayer) {
      stats.conversationHistory = { enabled: true };
    }

    if (this.semanticRecallLayer) {
      const srStats = await this.semanticRecallLayer.getStats();
      stats.semanticRecall = { vectorCount: srStats.vectorCount };
    }

    if (this.workingMemoryLayer) {
      stats.workingMemory = {
        enabled: true,
        mode: this.workingMemoryLayer.getMode(),
      };
    }

    return stats;
  }

  /**
   * Retry failed semantic indexing operations
   *
   * Returns the number of successfully retried operations
   */
  async retryFailedIndexing(): Promise<number> {
    if (!this.semanticRecallLayer) {
      return 0;
    }

    return this.semanticRecallLayer.retryFailedIndexing();
  }

  /**
   * Get the count of messages pending retry for semantic indexing
   */
  getFailedIndexQueueSize(): number {
    return this.semanticRecallLayer?.getFailedIndexQueueSize() ?? 0;
  }

  /**
   * Estimate token count for messages and working memory
   * Uses TokenUtils for accurate estimation with safety margin
   */
  private estimateTokens(
    messages: ChatMessage[],
    workingMemory?: string | Record<string, unknown>,
  ): number {
    let totalTokens = 0;

    // Count message content tokens using TokenUtils
    for (const msg of messages) {
      const content =
        typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content);
      totalTokens += TokenUtils.estimateTokenCount(content);
    }

    // Count working memory tokens
    if (workingMemory) {
      const wmContent =
        typeof workingMemory === "string"
          ? workingMemory
          : JSON.stringify(workingMemory);
      totalTokens += TokenUtils.estimateTokenCount(wmContent);
    }

    return totalTokens;
  }
}

/**
 * Create a three-layer memory manager with default configuration
 */
export function createThreeLayerMemoryManager(
  config?: Partial<ThreeLayerMemoryConfig>,
): ThreeLayerMemoryManager {
  const fullConfig: ThreeLayerMemoryConfig = {
    enabled: config?.enabled ?? true,
    storage: config?.storage ?? { type: "memory" },
    conversationHistory: config?.conversationHistory,
    semanticRecall: config?.semanticRecall,
    workingMemory: config?.workingMemory,
    processors: config?.processors,
  };

  return new ThreeLayerMemoryManager(fullConfig);
}
