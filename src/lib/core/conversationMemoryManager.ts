/**
 * Conversation Memory Manager for NeuroLink
 * Handles file-based conversation storage, session management, and context injection
 */

import { promises as fs } from "fs";
import path from "path";
import type {
  ConversationMemoryConfig,
  ConversationTurn,
  SessionMemory,
  ConversationMemoryStats,
  ContextInjectionOptions,
  ContextInjectionResult,
} from "../types/conversationTypes.js";
import { ConversationMemoryError } from "../types/conversationTypes.js";
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
   * Initialize the memory manager by loading existing sessions from disk
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.ensureStorageDirectory();
      await this.loadExistingSessions();
      this.isInitialized = true;

      logger.info("ConversationMemoryManager initialized", {
        storageLocation: this.config.storageLocation,
        loadedSessions: this.sessions.size,
      });
    } catch (error) {
      throw new ConversationMemoryError(
        "Failed to initialize conversation memory",
        "STORAGE_ERROR",
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  /**
   * Store a conversation turn for a session
   */
  async storeConversationTurn(
    sessionId: string,
    userId: string | undefined,
    userMessage: string,
    aiResponse: string,
    metadata?: ConversationTurn["metadata"],
  ): Promise<void> {
    await this.ensureInitialized();

    try {
      // Get or create session
      let session = this.sessions.get(sessionId);
      if (!session) {
        session = this.createNewSession(sessionId, userId);
        this.sessions.set(sessionId, session);
      }

      // Create conversation turn
      const turn: ConversationTurn = {
        timestamp: Date.now(),
        userMessage,
        aiResponse,
        metadata,
      };

      // Add turn to session
      session.turns.push(turn);
      session.lastActivity = Date.now();

      // Enforce per-session turn limit
      if (session.turns.length > this.config.maxTurnsPerSession) {
        session.turns = session.turns.slice(-this.config.maxTurnsPerSession);
      }

      // Enforce global session limit
      if (this.config.autoCleanup) {
        await this.enforceSessionLimit();
      }

      // Persist session to disk
      await this.persistSessionToDisk(sessionId, session);

      logger.debug("Conversation turn stored", {
        sessionId,
        turnCount: session.turns.length,
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
   * Get conversation history for a session
   */
  getConversationHistory(
    sessionId: string,
    maxTurns?: number,
  ): ConversationTurn[] {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return [];
    }

    const limit = maxTurns ?? 10;
    return session.turns
      .slice(-limit)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Build context string for AI prompt injection
   */
  buildContextString(
    sessionId: string,
    options?: ContextInjectionOptions,
  ): ContextInjectionResult {
    const history = this.getConversationHistory(sessionId, options?.maxTurns);

    if (history.length === 0) {
      return {
        contextString: "",
        turnsIncluded: 0,
        estimatedTokens: 0,
        wasTruncated: false,
      };
    }

    // Use custom format if provided
    if (options?.customFormat) {
      const contextString = options.customFormat(history);
      return {
        contextString,
        turnsIncluded: history.length,
        estimatedTokens: this.estimateTokenCount(contextString),
        wasTruncated: false,
      };
    }

    // Default format
    const contextLines = history.map((turn) => {
      let line = `Human: ${turn.userMessage}\nAssistant: ${turn.aiResponse}`;

      if (options?.includeMetadata && turn.metadata) {
        const metadataStr = Object.entries(turn.metadata)
          .map(([key, value]) => `${key}: ${value}`)
          .join(", ");
        line += `\n[Metadata: ${metadataStr}]`;
      }

      return line;
    });

    let contextString = `Previous conversation:\n${contextLines.join("\n---\n")}\n\nCurrent message:`;
    let wasTruncated = false;

    // Truncate if too long
    const maxTokens = options?.maxTokens ?? 2000;
    if (this.estimateTokenCount(contextString) > maxTokens) {
      // Simple truncation strategy - take recent turns until under limit
      const truncatedHistory = [];
      let estimatedTokens = 0;

      for (let i = history.length - 1; i >= 0; i--) {
        const turn = history[i];
        const turnText = `Human: ${turn.userMessage}\nAssistant: ${turn.aiResponse}`;
        const turnTokens = this.estimateTokenCount(turnText);

        if (estimatedTokens + turnTokens < maxTokens * 0.8) {
          // Leave some buffer
          truncatedHistory.unshift(turn);
          estimatedTokens += turnTokens;
        } else {
          break;
        }
      }

      const truncatedLines = truncatedHistory.map(
        (turn) => `Human: ${turn.userMessage}\nAssistant: ${turn.aiResponse}`,
      );

      contextString = `Previous conversation (truncated):\n${truncatedLines.join("\n---\n")}\n\nCurrent message:`;
      wasTruncated = true;
    }

    return {
      contextString,
      turnsIncluded: history.length,
      estimatedTokens: this.estimateTokenCount(contextString),
      wasTruncated,
    };
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<ConversationMemoryStats> {
    await this.ensureInitialized();

    const sessions = Array.from(this.sessions.values());
    const totalTurns = sessions.reduce(
      (sum, session) => sum + session.turns.length,
      0,
    );

    let mostActiveSessionId: string | undefined;
    let maxTurns = 0;

    for (const session of sessions) {
      if (session.turns.length > maxTurns) {
        maxTurns = session.turns.length;
        mostActiveSessionId = session.sessionId;
      }
    }

    // Calculate storage size
    const storageSize = await this.calculateStorageSize();
    const fileCount = sessions.length;

    return {
      totalSessions: sessions.length,
      totalTurns,
      averageTurnsPerSession:
        sessions.length > 0 ? totalTurns / sessions.length : 0,
      mostActiveSessionId,
      memoryUsage: {
        storageSize,
        fileCount,
      },
      generatedAt: Date.now(),
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

    // Remove from disk
    try {
      const filePath = this.getSessionFilePath(sessionId);
      await fs.unlink(filePath);

      logger.info("Session cleared", { sessionId });
      return true;
    } catch (error) {
      logger.warn("Failed to delete session file", { sessionId, error });
      return false;
    }
  }

  /**
   * Clear all conversations (reset memory)
   */
  async clearAllSessions(): Promise<void> {
    const sessionIds = Array.from(this.sessions.keys());

    // Clear memory
    this.sessions.clear();

    // Clear disk storage
    try {
      for (const sessionId of sessionIds) {
        const filePath = this.getSessionFilePath(sessionId);
        try {
          await fs.unlink(filePath);
        } catch (error) {
          // File might not exist, continue
        }
      }

      logger.info("All sessions cleared", { clearedCount: sessionIds.length });
    } catch (error) {
      throw new ConversationMemoryError(
        "Failed to clear all sessions",
        "CLEANUP_ERROR",
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
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
      turns: [],
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };
  }

  private async ensureStorageDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.storageLocation, { recursive: true });
    } catch (error) {
      throw new ConversationMemoryError(
        `Failed to create storage directory: ${this.config.storageLocation}`,
        "STORAGE_ERROR",
        { path: this.config.storageLocation, error },
      );
    }
  }

  private async loadExistingSessions(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.storageLocation);
      const sessionFiles = files.filter((file) => file.endsWith(".json"));

      for (const file of sessionFiles) {
        try {
          const filePath = path.join(this.config.storageLocation, file);
          const content = await fs.readFile(filePath, "utf8");
          const session: SessionMemory = JSON.parse(content);

          // Validate session structure
          if (this.isValidSession(session)) {
            this.sessions.set(session.sessionId, session);
          } else {
            logger.warn("Invalid session file skipped", { file });
          }
        } catch (error) {
          logger.warn("Failed to load session file", { file, error });
        }
      }

      logger.debug("Sessions loaded from disk", {
        loaded: this.sessions.size,
        totalFiles: sessionFiles.length,
      });
    } catch (error) {
      // Directory doesn't exist yet - that's fine
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  private async persistSessionToDisk(
    sessionId: string,
    session: SessionMemory,
  ): Promise<void> {
    const filePath = this.getSessionFilePath(sessionId);
    const content = JSON.stringify(session, null, 2);

    try {
      await fs.writeFile(filePath, content, "utf8");
    } catch (error) {
      throw new ConversationMemoryError(
        `Failed to persist session ${sessionId} to disk`,
        "STORAGE_ERROR",
        { sessionId, filePath, error },
      );
    }
  }

  private async enforceSessionLimit(): Promise<void> {
    if (this.sessions.size <= this.config.maxSessions) {
      return;
    }

    // Sort sessions by last activity (oldest first)
    const sessions = Array.from(this.sessions.entries()).sort(
      ([, a], [, b]) => a.lastActivity - b.lastActivity,
    );

    // Remove oldest sessions
    const sessionsToRemove = sessions.slice(
      0,
      sessions.length - this.config.maxSessions,
    );

    for (const [sessionId] of sessionsToRemove) {
      await this.clearSession(sessionId);
    }

    logger.debug("Session limit enforced", {
      removedSessions: sessionsToRemove.length,
      remainingSessions: this.sessions.size,
    });
  }

  private getSessionFilePath(sessionId: string): string {
    const sanitizedSessionId = sessionId.replace(/[^a-zA-Z0-9-_]/g, "_");
    return path.join(this.config.storageLocation, `${sanitizedSessionId}.json`);
  }

  private isValidSession(session: unknown): session is SessionMemory {
    if (typeof session !== "object" || session === null) {
      return false;
    }

    const obj = session as Record<string, unknown>;

    return (
      "sessionId" in obj &&
      typeof obj.sessionId === "string" &&
      "turns" in obj &&
      Array.isArray(obj.turns) &&
      "createdAt" in obj &&
      typeof obj.createdAt === "number" &&
      "lastActivity" in obj &&
      typeof obj.lastActivity === "number"
    );
  }

  private estimateTokenCount(text: string): number {
    // Simple token estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private async calculateStorageSize(): Promise<number> {
    try {
      const files = await fs.readdir(this.config.storageLocation);
      let totalSize = 0;

      for (const file of files) {
        if (file.endsWith(".json")) {
          const filePath = path.join(this.config.storageLocation, file);
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
        }
      }

      return totalSize;
    } catch (error) {
      return 0;
    }
  }
}
