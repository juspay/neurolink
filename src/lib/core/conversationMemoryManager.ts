/**
 * Conversation Memory Manager for NeuroLink
 * Handles in-memory conversation storage, session management, and context injection
 */

import type {
  ConversationMemoryConfig,
  SessionMemory,
  ConversationMemoryStats,
  ChatMessage,
  StoreConversationTurnOptions,
} from "../types/conversation.js";
import { ConversationMemoryError } from "../types/conversation.js";
import {
  DEFAULT_MAX_SESSIONS,
  MEMORY_THRESHOLD_PERCENTAGE,
  RECENT_MESSAGES_RATIO,
  MESSAGES_PER_TURN,
} from "../config/conversationMemory.js";
import { logger } from "../utils/logger.js";
import { randomUUID } from "crypto";
import { TokenUtils } from "../constants/tokens.js";
import {
  buildContextFromPointer,
  getEffectiveTokenThreshold,
  generateSummary,
} from "../utils/conversationMemory.js";

export class ConversationMemoryManager {
  private sessions: Map<string, SessionMemory> = new Map();
  public config: ConversationMemoryConfig;
  private isInitialized: boolean = false;

  /**
   * Track sessions currently being summarized to prevent race conditions
   */
  private summarizationInProgress: Set<string> = new Set();

  constructor(config: ConversationMemoryConfig) {
    this.config = config;
  }

  /**
   * Initialize the memory manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    try {
      this.isInitialized = true;
      logger.info("ConversationMemoryManager initialized", {
        storage: "in-memory",
        maxSessions: this.config.maxSessions,
        maxTurnsPerSession: this.config.maxTurnsPerSession,
      });
    } catch (error) {
      throw new ConversationMemoryError(
        "Failed to initialize conversation memory",
        "CONFIG_ERROR",
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  /**
   * Store a conversation turn for a session
   * TOKEN-BASED: Validates message size and triggers summarization based on tokens
   */
  async storeConversationTurn(
    options: StoreConversationTurnOptions,
  ): Promise<void> {
    await this.ensureInitialized();

    try {
      // Get or create session
      let session = this.sessions.get(options.sessionId);
      if (!session) {
        session = this.createNewSession(options.sessionId, options.userId);
        this.sessions.set(options.sessionId, session);
      }

      const tokenThreshold = options.providerDetails
        ? getEffectiveTokenThreshold(
            options.providerDetails.provider,
            options.providerDetails.model,
            this.config.tokenThreshold,
            session.tokenThreshold,
          )
        : this.config.tokenThreshold || 50000;

      const userMsg = await this.validateAndPrepareMessage(
        options.userMessage,
        "user",
        tokenThreshold,
      );
      const assistantMsg = await this.validateAndPrepareMessage(
        options.aiResponse,
        "assistant",
        tokenThreshold,
      );
      session.messages.push(userMsg, assistantMsg);
      session.lastActivity = Date.now();

      const shouldSummarize =
        options.enableSummarization !== undefined
          ? options.enableSummarization
          : this.config.enableSummarization;

      if (shouldSummarize) {
        // Only trigger summarization if not already in progress for this session
        if (!this.summarizationInProgress.has(options.sessionId)) {
          setImmediate(async () => {
            try {
              await this.checkAndSummarize(session, tokenThreshold);
            } catch (error) {
              logger.error("Background summarization failed", {
                sessionId: session.sessionId,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          });
        } else {
          logger.debug(
            "[ConversationMemoryManager] Summarization already in progress, skipping",
            {
              sessionId: options.sessionId,
            },
          );
        }
      }

      this.enforceSessionLimit();
    } catch (error) {
      throw new ConversationMemoryError(
        `Failed to store conversation turn for session ${options.sessionId}`,
        "STORAGE_ERROR",
        {
          sessionId: options.sessionId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Validate and prepare a message before adding to session
   * Truncates if message exceeds token limit
   */
  private async validateAndPrepareMessage(
    content: string,
    role: ChatMessage["role"],
    threshold: number,
  ): Promise<ChatMessage> {
    const id = randomUUID();
    const tokenCount = TokenUtils.estimateTokenCount(content);

    const maxMessageSize = Math.floor(threshold * MEMORY_THRESHOLD_PERCENTAGE);
    if (tokenCount > maxMessageSize) {
      const truncated = TokenUtils.truncateToTokenLimit(
        content,
        maxMessageSize,
      );

      logger.warn("Message truncated due to token limit", {
        id,
        role,
        originalTokens: tokenCount,
        threshold,
        truncatedTo: maxMessageSize,
      });

      return {
        id,
        role,
        content: truncated,
        timestamp: new Date().toISOString(),
        metadata: {
          truncated: true,
        },
      };
    }

    return {
      id,
      role,
      content,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check if summarization is needed based on token count
   */
  private async checkAndSummarize(
    session: SessionMemory,
    threshold: number,
  ): Promise<void> {
    // Acquire lock - if already in progress, skip
    if (this.summarizationInProgress.has(session.sessionId)) {
      logger.debug(
        "[ConversationMemoryManager] Summarization already in progress, skipping",
        {
          sessionId: session.sessionId,
        },
      );
      return;
    }

    this.summarizationInProgress.add(session.sessionId);

    try {
      const contextMessages = buildContextFromPointer(session);
      const tokenCount = this.estimateTokens(contextMessages);

      session.lastTokenCount = tokenCount;
      session.lastCountedAt = Date.now();

      logger.debug("Token count check", {
        sessionId: session.sessionId,
        tokenCount,
        threshold,
        needsSummarization: tokenCount >= threshold,
      });

      if (tokenCount >= threshold) {
        await this.summarizeSessionTokenBased(session, threshold);
      }
    } catch (error) {
      logger.error("Token counting or summarization failed", {
        sessionId: session.sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      // Release lock when done
      this.summarizationInProgress.delete(session.sessionId);
    }
  }

  /**
   * Estimate total tokens for a list of messages
   */
  private estimateTokens(messages: ChatMessage[]): number {
    return messages.reduce((total, msg) => {
      return total + TokenUtils.estimateTokenCount(msg.content);
    }, 0);
  }

  /**
   * Build context messages for AI prompt injection (TOKEN-BASED)
   * Returns messages from pointer onwards (or all if no pointer)
   * Now consistently async to match Redis implementation
   */
  async buildContextMessages(sessionId: string): Promise<ChatMessage[]> {
    const session = this.sessions.get(sessionId);
    return session ? buildContextFromPointer(session) : [];
  }

  public getSession(sessionId: string): SessionMemory | undefined {
    return this.sessions.get(sessionId);
  }

  public createSummarySystemMessage(
    content: string,
    summarizesFrom?: string,
    summarizesTo?: string,
  ): ChatMessage {
    return {
      id: `summary-${randomUUID()}`,
      role: "system",
      content: `Summary of previous conversation turns:\n\n${content}`,
      timestamp: new Date().toISOString(),
      metadata: {
        isSummary: true,
        summarizesFrom,
        summarizesTo,
      },
    };
  }

  /**
   * Token-based summarization (pointer-based, non-destructive)
   */
  private async summarizeSessionTokenBased(
    session: SessionMemory,
    threshold: number,
  ): Promise<void> {
    const startIndex = session.summarizedUpToMessageId
      ? session.messages.findIndex(
          (m) => m.id === session.summarizedUpToMessageId,
        ) + 1
      : 0;

    const recentMessages = session.messages.slice(startIndex);
    if (recentMessages.length === 0) {
      return;
    }

    const targetRecentTokens = threshold * RECENT_MESSAGES_RATIO;
    const splitIndex = await this.findSplitIndexByTokens(
      recentMessages,
      targetRecentTokens,
    );
    const messagesToSummarize = recentMessages.slice(0, splitIndex);

    if (messagesToSummarize.length === 0) {
      return;
    }

    const summary = await generateSummary(
      messagesToSummarize,
      this.config,
      "[ConversationMemory]",
      session.summarizedMessage,
    );

    if (!summary) {
      logger.warn(
        `[ConversationMemory] Summary generation failed for session ${session.sessionId}`,
      );
      return;
    }

    const lastSummarized = messagesToSummarize[messagesToSummarize.length - 1];
    session.summarizedUpToMessageId = lastSummarized.id;
    session.summarizedMessage = summary; // Store summary separately

    logger.info(
      `[ConversationMemory] Summarization complete for session ${session.sessionId}`,
      {
        summarizedCount: messagesToSummarize.length,
        totalMessages: session.messages.length,
        pointer: session.summarizedUpToMessageId,
      },
    );
  }

  /**
   * Find split index to keep recent messages within target token count
   */
  private async findSplitIndexByTokens(
    messages: ChatMessage[],
    targetRecentTokens: number,
  ): Promise<number> {
    let recentTokens = 0;
    let splitIndex = messages.length;

    for (let i = messages.length - 1; i >= 0; i--) {
      const msgTokens = TokenUtils.estimateTokenCount(messages[i].content);

      if (recentTokens + msgTokens > targetRecentTokens) {
        splitIndex = i + 1;
        break;
      }

      recentTokens += msgTokens;
    }

    // To ensure at least one message is summarized
    return Math.max(1, splitIndex);
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  private createNewSession(sessionId: string, userId?: string): SessionMemory {
    return {
      sessionId,
      userId,
      messages: [],
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };
  }

  private enforceSessionLimit(): void {
    const maxSessions = this.config.maxSessions || DEFAULT_MAX_SESSIONS;
    if (this.sessions.size <= maxSessions) {
      return;
    }

    const sessions = Array.from(this.sessions.entries()).sort(
      ([, a], [, b]) => a.lastActivity - b.lastActivity,
    );
    const sessionsToRemove = sessions.slice(
      0,
      this.sessions.size - maxSessions,
    );

    for (const [sessionId] of sessionsToRemove) {
      this.sessions.delete(sessionId);
    }
  }

  public async getStats(): Promise<ConversationMemoryStats> {
    await this.ensureInitialized();

    const sessions = Array.from(this.sessions.values());
    const totalTurns = sessions.reduce(
      (sum, session) => sum + session.messages.length / MESSAGES_PER_TURN,
      0,
    );

    return {
      totalSessions: sessions.length,
      totalTurns,
    };
  }

  public async clearSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    this.sessions.delete(sessionId);
    logger.info("Session cleared", { sessionId });
    return true;
  }

  public async clearAllSessions(): Promise<void> {
    const sessionIds = Array.from(this.sessions.keys());
    this.sessions.clear();
    logger.info("All sessions cleared", { clearedCount: sessionIds.length });
  }
}
