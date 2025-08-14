/**
 * Conversation Memory Manager for NeuroLink
 * Handles in-memory conversation storage, session management, and context injection
 */

import type {
  ConversationMemoryConfig,
  SessionMemory,
  ConversationMemoryStats,
  ChatMessage,
} from "../types/conversationTypes.js";
import { ConversationMemoryError } from "../types/conversationTypes.js";
import {
  DEFAULT_MAX_TURNS_PER_SESSION,
  DEFAULT_MAX_SESSIONS,
  MESSAGES_PER_TURN,
} from "../config/conversationMemoryConfig.js";
import { logger } from "../utils/logger.js";

export class ConversationMemoryManager {
  private sessions: Map<string, SessionMemory> = new Map();
  private config: ConversationMemoryConfig;
  private isInitialized: boolean = false;

  constructor(config: ConversationMemoryConfig) {
    // Trust that config is already complete from applyConversationMemoryDefaults()
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
   * ULTRA-OPTIMIZED: Direct ChatMessage[] storage with zero conversion overhead
   */
  async storeConversationTurn(
    sessionId: string,
    userId: string | undefined,
    userMessage: string,
    aiResponse: string,
  ): Promise<void> {
    await this.ensureInitialized();

    try {
      // Get or create session
      let session = this.sessions.get(sessionId);
      if (!session) {
        session = this.createNewSession(sessionId, userId);
        this.sessions.set(sessionId, session);
      }

      // ULTRA-OPTIMIZED: Direct message storage - no intermediate objects
      session.messages.push(
        { role: "user", content: userMessage },
        { role: "assistant", content: aiResponse },
      );

      session.lastActivity = Date.now();

      // Enforce per-session turn limit (each turn = MESSAGES_PER_TURN messages: user + assistant)
      const maxMessages =
        (this.config.maxTurnsPerSession || DEFAULT_MAX_TURNS_PER_SESSION) *
        MESSAGES_PER_TURN;
      if (session.messages.length > maxMessages) {
        session.messages = session.messages.slice(-maxMessages);
      }

      // Enforce global session limit
      this.enforceSessionLimit();

      logger.debug("Conversation turn stored", {
        sessionId,
        messageCount: session.messages.length,
        turnCount: session.messages.length / MESSAGES_PER_TURN, // Each turn = MESSAGES_PER_TURN messages
        userMessageLength: userMessage.length,
        aiResponseLength: aiResponse.length,
      });
    } catch (error) {
      throw new ConversationMemoryError(
        `Failed to store conversation turn for session ${sessionId}`,
        "STORAGE_ERROR",
        {
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }
  /**
   * Build context messages for AI prompt injection (ULTRA-OPTIMIZED)
   * Returns pre-stored message array with zero conversion overhead
   */
  buildContextMessages(sessionId: string): ChatMessage[] {
    const session = this.sessions.get(sessionId);
    if (!session || session.messages.length === 0) {
      return [];
    }

    // ULTRA-OPTIMIZED: Direct return - no processing needed!
    return session.messages;
  }

  /**
   * Get memory statistics (simplified for pure in-memory storage)
   * ULTRA-OPTIMIZED: Calculate turns from message count (each turn = MESSAGES_PER_TURN messages)
   */
  async getStats(): Promise<ConversationMemoryStats> {
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
   * Clear all conversations for a specific session
   */
  async clearSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    // Remove from memory
    this.sessions.delete(sessionId);

    logger.info("Session cleared", { sessionId });
    return true;
  }

  /**
   * Clear all conversations (reset memory)
   */
  async clearAllSessions(): Promise<void> {
    const sessionIds = Array.from(this.sessions.keys());

    // Clear memory
    this.sessions.clear();

    logger.info("All sessions cleared", { clearedCount: sessionIds.length });
  }

  // Private methods

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

    // Sort sessions by last activity (oldest first)
    const sessions = Array.from(this.sessions.entries()).sort(
      ([, a], [, b]) => a.lastActivity - b.lastActivity,
    );

    // Remove oldest sessions
    const sessionsToRemove = sessions.slice(0, sessions.length - maxSessions);

    for (const [sessionId] of sessionsToRemove) {
      this.sessions.delete(sessionId);
    }

    logger.debug("Session limit enforced", {
      removedSessions: sessionsToRemove.length,
      remainingSessions: this.sessions.size,
    });
  }
}
