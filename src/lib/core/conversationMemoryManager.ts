/**
 * Conversation Memory Manager for NeuroLink
 * Handles in-memory conversation storage, session management, and context injection
 */

import type {
  ConversationMemoryConfig,
  SessionMemory,
  ConversationMemoryStats,
  ChatMessage,
} from "../types/conversation.js";
import { ConversationMemoryError } from "../types/conversation.js";
import {
  DEFAULT_MAX_TURNS_PER_SESSION,
  DEFAULT_MAX_SESSIONS,
  MESSAGES_PER_TURN,
} from "../config/conversationMemory.js";
import { logger } from "../utils/logger.js";
import { NeuroLink } from "../neurolink.js";

export class ConversationMemoryManager {
  private sessions: Map<string, SessionMemory> = new Map();
  public config: ConversationMemoryConfig;
  private isInitialized: boolean = false;

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
   * ULTRA-OPTIMIZED: Direct ChatMessage[] storage with zero conversion overhead
   */
  async storeConversationTurn(
    sessionId: string,
    userId: string | undefined,
    userMessage: string,
    aiResponse: string,
    _startTimeStamp: Date | undefined,
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

      if (this.config.enableSummarization) {
        const userAssistantCount = session.messages.filter(
          (msg) => msg.role === "user" || msg.role === "assistant",
        ).length;
        const currentTurnCount = Math.floor(
          userAssistantCount / MESSAGES_PER_TURN,
        );
        if (
          currentTurnCount >= (this.config.summarizationThresholdTurns || 20)
        ) {
          await this._summarizeSession(session);
        }
      } else {
        const maxMessages =
          (this.config.maxTurnsPerSession || DEFAULT_MAX_TURNS_PER_SESSION) *
          MESSAGES_PER_TURN;
        if (session.messages.length > maxMessages) {
          session.messages = session.messages.slice(-maxMessages);
        }
      }

      this.enforceSessionLimit();
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
   * Now consistently async to match Redis implementation
   */
  async buildContextMessages(sessionId: string): Promise<ChatMessage[]> {
    const session = this.sessions.get(sessionId);
    return session ? session.messages : [];
  }

  public getSession(sessionId: string): SessionMemory | undefined {
    return this.sessions.get(sessionId);
  }

  public createSummarySystemMessage(content: string): ChatMessage {
    return {
      role: "system",
      content: `Summary of previous conversation turns:\n\n${content}`,
    };
  }

  private async _summarizeSession(session: SessionMemory): Promise<void> {
    logger.info(
      `[ConversationMemory] Summarizing session ${session.sessionId}...`,
    );
    const targetTurns = this.config.summarizationTargetTurns || 10;
    const splitIndex = Math.max(
      0,
      session.messages.length - targetTurns * MESSAGES_PER_TURN,
    );
    const messagesToSummarize = session.messages.slice(0, splitIndex);
    const recentMessages = session.messages.slice(splitIndex);

    if (messagesToSummarize.length === 0) {
      return;
    }

    const summarizationPrompt =
      this._createSummarizationPrompt(messagesToSummarize);

    const summarizer = new NeuroLink({
      conversationMemory: { enabled: false },
    });
    try {
      const providerName = this.config.summarizationProvider;

      // Map provider names to correct format
      let mappedProvider = providerName;
      if (providerName === "vertex") {
        mappedProvider = "googlevertex";
      }

      if (!mappedProvider) {
        logger.error(`[ConversationMemory] Missing summarization provider`);
        return;
      }

      logger.debug(
        `[ConversationMemory] Using provider: ${mappedProvider} for summarization`,
      );

      const summaryResult = await summarizer.generate({
        input: { text: summarizationPrompt },
        provider: mappedProvider,
        model: this.config.summarizationModel,
        disableTools: true,
      });

      if (summaryResult.content) {
        session.messages = [
          this.createSummarySystemMessage(summaryResult.content),
          ...recentMessages,
        ];
        logger.info(
          `[ConversationMemory] Summarization complete for session ${session.sessionId}.`,
        );
      } else {
        logger.warn(
          `[ConversationMemory] Summarization failed for session ${session.sessionId}. History not modified.`,
        );
      }
    } catch (error) {
      logger.error(
        `[ConversationMemory] Error during summarization for session ${session.sessionId}`,
        { error },
      );
    }
  }

  private _createSummarizationPrompt(history: ChatMessage[]): string {
    const formattedHistory = history
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n\n");
    return `
You are a context summarization AI. Your task is to condense the following conversation history for another AI assistant.
The summary must be a concise, third-person narrative that retains all critical information, including key entities, technical details, decisions made, and any specific dates or times mentioned.
Ensure the summary flows logically and is ready to be used as context for the next turn in the conversation.

Conversation History to Summarize:
---
${formattedHistory}
---
`.trim();
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
