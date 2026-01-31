/**
 * Conversation History Layer
 *
 * Wraps existing ConversationMemoryManager and RedisConversationMemoryManager
 * to provide enhanced functionality for the three-layer memory system.
 *
 * @module memory/layers/conversationHistoryLayer
 * @since 9.0.0
 */

import type { ConversationMemoryManager } from "../../core/conversationMemoryManager.js";
import type { RedisConversationMemoryManager } from "../../core/redisConversationMemoryManager.js";
import type {
  ChatMessage,
  SessionMetadata,
  StoreConversationTurnOptions,
  ConversationHistoryConfig,
  MemoryContext,
  MemoryThread,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";

/**
 * Default configuration values for conversation history layer
 */
const DEFAULTS = {
  enabled: true,
  lastMessages: 40,
  enableSummarization: true,
  tokenThreshold: 50000,
  summarizationProvider: "vertex",
  summarizationModel: "gemini-2.5-flash",
  readOnly: false,
} as const;

/**
 * Conversation History Layer
 *
 * Provides recent message retrieval with optional summarization.
 * Wraps existing NeuroLink conversation memory managers.
 */
export class ConversationHistoryLayer {
  private manager: ConversationMemoryManager | RedisConversationMemoryManager;
  private config: Required<ConversationHistoryConfig>;

  constructor(
    manager: ConversationMemoryManager | RedisConversationMemoryManager,
    config: ConversationHistoryConfig,
  ) {
    this.manager = manager;
    this.config = this.normalizeConfig(config);
  }

  /**
   * Normalize configuration with defaults
   */
  private normalizeConfig(
    config: ConversationHistoryConfig,
  ): Required<ConversationHistoryConfig> {
    return {
      enabled: config.enabled ?? DEFAULTS.enabled,
      lastMessages: config.lastMessages ?? DEFAULTS.lastMessages,
      enableSummarization:
        config.enableSummarization ?? DEFAULTS.enableSummarization,
      tokenThreshold: config.tokenThreshold ?? DEFAULTS.tokenThreshold,
      summarizationProvider:
        config.summarizationProvider ?? DEFAULTS.summarizationProvider,
      summarizationModel:
        config.summarizationModel ?? DEFAULTS.summarizationModel,
      readOnly: config.readOnly ?? DEFAULTS.readOnly,
    };
  }

  /**
   * Retrieve recent conversation messages
   */
  async retrieve(context: MemoryContext): Promise<ChatMessage[]> {
    if (!this.config.enabled || this.config.lastMessages === false) {
      return [];
    }

    const startTime = Date.now();

    try {
      // Use existing buildContextMessages from the underlying manager
      // Pass resourceId and enableSummarization for Redis manager compatibility
      const messages = await this.manager.buildContextMessages(
        context.threadId,
        context.resourceId,
        this.config.enableSummarization ?? true,
      );

      // Apply lastMessages limit if specified
      const limitedMessages =
        typeof this.config.lastMessages === "number" &&
        this.config.lastMessages > 0
          ? messages.slice(-this.config.lastMessages)
          : messages;

      logger.debug("[ConversationHistoryLayer] Retrieved messages", {
        threadId: context.threadId,
        totalMessages: messages.length,
        returnedMessages: limitedMessages.length,
        durationMs: Date.now() - startTime,
      });

      return limitedMessages;
    } catch (error) {
      logger.error("[ConversationHistoryLayer] Failed to retrieve messages", {
        threadId: context.threadId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Store a conversation turn (respects readOnly mode)
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
    if (this.config.readOnly) {
      logger.debug(
        "[ConversationHistoryLayer] Read-only mode, skipping store",
        {
          threadId: context.threadId,
        },
      );
      return;
    }

    const storeOptions: StoreConversationTurnOptions = {
      sessionId: context.threadId,
      userId: context.resourceId,
      userMessage,
      aiResponse,
      enableSummarization: this.config.enableSummarization,
      events: options?.events,
      providerDetails: options?.providerDetails,
    };

    await this.manager.storeConversationTurn(storeOptions);

    logger.debug("[ConversationHistoryLayer] Stored conversation turn", {
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
    // Check if thread exists (for Redis manager)
    if (this.isRedisManager(this.manager) && resourceId) {
      const existing = await this.manager.getUserSessionObject(
        resourceId,
        threadId,
      );
      if (existing) {
        return {
          id: existing.sessionId,
          resourceId: existing.userId,
          title: existing.title || "Conversation",
          createdAt: existing.createdAt,
          updatedAt: existing.updatedAt,
        };
      }
    }

    // Check in-memory manager
    if (this.isMemoryManager(this.manager)) {
      const session = this.manager.getSession(threadId);
      if (session) {
        return {
          id: session.sessionId,
          resourceId: session.userId,
          title: session.title || "Conversation",
          createdAt: new Date(session.createdAt).toISOString(),
          updatedAt: new Date(session.lastActivity).toISOString(),
        };
      }
    }

    // Return a new thread placeholder (actual creation happens on first message)
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
    if (this.isRedisManager(this.manager)) {
      const sessions = await this.manager.getUserAllSessionsHistory(resourceId);
      return sessions.map((s: SessionMetadata) => ({
        id: s.id,
        resourceId,
        title: s.title || "Conversation",
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }));
    }

    // In-memory manager doesn't support listing sessions by user
    // Return empty array for in-memory manager
    return [];
  }

  /**
   * Clear a thread's messages
   */
  async clearThread(threadId: string, resourceId?: string): Promise<boolean> {
    const result = await this.manager.clearSession(threadId, resourceId);
    logger.debug("[ConversationHistoryLayer] Cleared thread", {
      threadId,
      resourceId,
      success: result,
    });
    return result;
  }

  /**
   * Get the underlying manager for advanced operations
   */
  getManager(): ConversationMemoryManager | RedisConversationMemoryManager {
    return this.manager;
  }

  /**
   * Get the current configuration
   */
  getConfig(): Required<ConversationHistoryConfig> {
    return { ...this.config };
  }

  /**
   * Check if the manager is a Redis manager
   */
  private isRedisManager(
    manager: ConversationMemoryManager | RedisConversationMemoryManager,
  ): manager is RedisConversationMemoryManager {
    return (
      "getUserAllSessionsHistory" in manager &&
      "getUserSessionObject" in manager
    );
  }

  /**
   * Check if the manager is an in-memory manager
   */
  private isMemoryManager(
    manager: ConversationMemoryManager | RedisConversationMemoryManager,
  ): manager is ConversationMemoryManager {
    return "getSession" in manager;
  }

  /**
   * Close the layer and cleanup resources
   * Provides consistency with other layers in the three-layer system
   */
  async close(): Promise<void> {
    logger.debug("[ConversationHistoryLayer] Closed");
  }
}
