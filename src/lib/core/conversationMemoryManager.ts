/**
 * Conversation Memory Manager for NeuroLink
 * Handles in-memory conversation storage, session management, and context injection
 */

import { randomUUID } from "crypto";
import {
  DEFAULT_MAX_SESSIONS,
  MEMORY_THRESHOLD_PERCENTAGE,
  MESSAGES_PER_TURN,
} from "../config/conversationMemory.js";
import { TokenUtils } from "../constants/tokens.js";
import { SummarizationEngine } from "../context/summarizationEngine.js";
import { runWithCurrentLangfuseContext } from "../services/server/ai/observability/instrumentation.js";
import { tracers, withSpan } from "../telemetry/index.js";
import type {
  ChatMessage,
  ConversationMemoryConfig,
  ConversationMemoryStats,
  SessionListItem,
  SessionMemory,
  StoreConversationTurnOptions,
} from "../types/conversation.js";
import { ConversationMemoryError } from "../types/conversation.js";
import type { IConversationMemoryManager } from "../types/conversationMemoryInterface.js";
import {
  buildContextFromPointer,
  getEffectiveTokenThreshold,
} from "../utils/conversationMemory.js";
import { logger } from "../utils/logger.js";

export class ConversationMemoryManager implements IConversationMemoryManager {
  private sessions: Map<string, SessionMemory> = new Map();
  public config: ConversationMemoryConfig;
  private isInitialized: boolean = false;
  private summarizationEngine: SummarizationEngine = new SummarizationEngine();

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
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /** Whether this memory manager can persist data (always true for in-memory within process) */
  public get canPersist(): boolean {
    return true;
  }

  /** Whether Redis client is configured (always false for in-memory) */
  public get isRedisConfigured(): boolean {
    return false;
  }

  /** Get health status for monitoring */
  public getHealthStatus(): { initialized: boolean; connected: boolean } {
    return {
      initialized: this.isInitialized,
      connected: false,
    };
  }

  /**
   * Store a conversation turn for a session
   * TOKEN-BASED: Validates message size and triggers summarization based on tokens
   */
  async storeConversationTurn(
    options: StoreConversationTurnOptions,
  ): Promise<void> {
    return withSpan(
      {
        name: "neurolink.memory.storeTurn",
        tracer: tracers.memory,
        attributes: {
          "memory.type": "in-memory",
          "session.id": options.sessionId,
          "memory.operation": "store_turn",
        },
      },
      async (span) => {
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

          if (options.events && options.events.length > 0) {
            assistantMsg.events = options.events;
          }

          session.messages.push(userMsg, assistantMsg);
          session.lastActivity = Date.now();

          // Store API-reported token counts if available
          if (options.tokenUsage) {
            session.lastApiTokenCount = options.tokenUsage;
          }

          span.setAttribute("memory.message_count", session.messages.length);

          const shouldSummarize =
            options.enableSummarization !== undefined
              ? options.enableSummarization
              : this.config.enableSummarization;

          if (shouldSummarize) {
            // Only trigger summarization if not already in progress for this session
            if (!this.summarizationInProgress.has(options.sessionId)) {
              // Capture the current Langfuse ALS context before setImmediate,
              // which breaks automatic AsyncLocalStorage propagation and would
              // otherwise cause orphaned traces in Langfuse.
              const summarizeWithContext = runWithCurrentLangfuseContext(
                async () => {
                  try {
                    await this.checkAndSummarize(
                      session,
                      tokenThreshold,
                      options.requestId,
                    );
                  } catch (error) {
                    logger.error("Background summarization failed", {
                      sessionId: session.sessionId,
                      requestId: options.requestId,
                      error:
                        error instanceof Error ? error.message : String(error),
                    });
                  }
                },
              );
              setImmediate(summarizeWithContext);
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
      },
    );
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
    requestId?: string,
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
      await this.summarizationEngine.checkAndSummarize(
        session,
        threshold,
        this.config,
        "[ConversationMemory]",
        requestId,
      );
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
      let msgTokens = TokenUtils.estimateTokenCount(msg.content);
      if (msg.events && Array.isArray(msg.events) && msg.events.length > 0) {
        const eventsJson = JSON.stringify(msg.events);
        msgTokens += TokenUtils.estimateTokenCount(eventsJson);
      }
      return total + msgTokens;
    }, 0);
  }

  /**
   * Build context messages for AI prompt injection (TOKEN-BASED)
   * Returns messages from pointer onwards (or all if no pointer)
   * Now consistently async to match Redis implementation
   */
  async buildContextMessages(
    sessionId: string,
    _userId?: string,
    _enableSummarization?: boolean,
    requestId?: string,
  ): Promise<ChatMessage[]> {
    return withSpan(
      {
        name: "neurolink.memory.buildContext",
        tracer: tracers.memory,
        attributes: {
          "memory.type": "in-memory",
          "session.id": sessionId,
          "memory.operation": "build_context",
        },
      },
      async (span) => {
        const session = this.sessions.get(sessionId);
        const messages = session
          ? buildContextFromPointer(session, requestId)
          : [];
        span.setAttribute("memory.message_count", messages.length);
        return messages;
      },
    );
  }

  public getSession(
    sessionId: string,
    _userId?: string,
  ): SessionMemory | undefined {
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

  /**
   * List all sessions with metadata
   * @param userId - Optional user ID to filter sessions
   * @returns Array of session list items with metadata
   */
  public async listSessions(userId?: string): Promise<SessionListItem[]> {
    await this.ensureInitialized();

    const sessions = Array.from(this.sessions.values());
    const now = Date.now();

    return sessions
      .filter((session) => !userId || session.userId === userId)
      .map((session) => {
        const lastActive = this.formatTimeAgo(now - session.lastActivity);
        return {
          id: session.sessionId,
          title: session.sessionId, // In-memory doesn't store title, use sessionId
          createdAt: new Date(session.createdAt).toISOString(),
          updatedAt: new Date(session.lastActivity).toISOString(),
          userId: session.userId,
          messageCount: session.messages.length,
          lastActive,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }

  /**
   * Format milliseconds into human-readable time ago string
   */
  private formatTimeAgo(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? "s" : ""} ago`;
    }
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    }
    if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    }
    return "just now";
  }

  public async clearSession(sessionId: string): Promise<boolean> {
    return withSpan(
      {
        name: "neurolink.memory.clear",
        tracer: tracers.memory,
        attributes: {
          "memory.type": "in-memory",
          "session.id": sessionId,
          "memory.operation": "clear_session",
        },
      },
      async (span) => {
        const session = this.sessions.get(sessionId);
        if (!session) {
          span.setAttribute("memory.session_found", false);
          return false;
        }
        this.sessions.delete(sessionId);
        span.setAttribute("memory.session_found", true);
        logger.info("Session cleared", { sessionId });
        return true;
      },
    );
  }

  public async clearAllSessions(): Promise<void> {
    const sessionIds = Array.from(this.sessions.keys());
    this.sessions.clear();
    logger.info("All sessions cleared", { clearedCount: sessionIds.length });
  }

  /**
   * Get the raw messages array for a session.
   * Returns the full messages list without context filtering or summarization.
   * Returns a deep copy to prevent external mutation of internal state.
   */
  async getSessionMessages(
    sessionId: string,
    _userId?: string,
  ): Promise<ChatMessage[]> {
    await this.ensureInitialized();
    const session = this.sessions.get(sessionId);
    return session ? session.messages.map((msg) => ({ ...msg })) : [];
  }

  /**
   * Replace the entire messages array for a session.
   * Creates the session if it does not exist.
   * Resets summary pointers since old pointers may reference messages that no longer exist.
   */
  async setSessionMessages(
    sessionId: string,
    messages: ChatMessage[],
    userId?: string,
  ): Promise<void> {
    await this.ensureInitialized();
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = this.createNewSession(sessionId, userId);
      this.sessions.set(sessionId, session);
      this.enforceSessionLimit();
    }
    session.messages = [...messages];
    session.summarizedUpToMessageId = undefined;
    session.summarizedMessage = undefined;
    session.lastTokenCount = undefined;
    session.lastCountedAt = undefined;
    session.lastActivity = Date.now();
  }

  /** Close/shutdown — no-op for in-memory manager (no external connections to release) */
  async close(): Promise<void> {
    // In-memory manager has nothing to close
  }
}
