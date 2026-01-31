/**
 * Storage-backed Conversation Memory Manager
 *
 * Bridges the existing IConversationMemoryManager interface with the new
 * storage abstraction layer, enabling conversation persistence across all
 * 8 storage backends (memory, file, sqlite, libsql, redis, postgresql,
 * mongodb, s3).
 *
 * Session-to-thread mapping strategy:
 *   sessionId is stored in thread metadata, and a custom record in the
 *   "session-threads" namespace maps sessionId → threadId. This avoids
 *   relying on caller-supplied IDs since StorageProvider auto-generates them.
 */

import { randomUUID } from "crypto";
import { MESSAGES_PER_TURN } from "../config/conversationMemory.js";
import type {
  ChatMessage,
  ConversationMemoryConfig,
  ConversationMemoryStats,
  IConversationMemoryManager,
  SessionMemory,
  StoreConversationTurnOptions,
  StorageProvider,
} from "../types/index.js";
import { ConversationMemoryError } from "../types/index.js";
import { logger } from "../utils/logger.js";

/** Namespace used for the sessionId → threadId mapping in the key-value store */
const SESSION_THREAD_NS = "session-threads";

/**
 * Converts a StorageMessage role to the ChatMessage role subset used internally.
 * The storage layer uses "tool" for tool messages; the memory layer uses
 * "tool_call" / "tool_result". We store the original role in metadata so that
 * roundtrip fidelity is preserved.
 */
function toStorageRole(
  role: ChatMessage["role"],
): "user" | "assistant" | "system" | "tool" {
  if (role === "tool_call" || role === "tool_result") {
    return "tool";
  }
  return role;
}

function fromStorageRole(
  role: string,
  originalRole?: string,
): ChatMessage["role"] {
  if (originalRole) {
    return originalRole as ChatMessage["role"];
  }
  if (role === "tool") {
    return "tool_call";
  }
  return role as ChatMessage["role"];
}

/**
 * Conversation memory manager backed by the storage abstraction layer.
 *
 * Implements IConversationMemoryManager using StorageProvider thread/message
 * primitives. The storage provider must already be initialized before this
 * manager is constructed, OR `initialize()` must be called before first use
 * (it is idempotent).
 */
export class StorageConversationMemoryManager implements IConversationMemoryManager {
  public config: ConversationMemoryConfig;

  private storage: StorageProvider;
  private isInitialized = false;

  constructor(storage: StorageProvider, config: ConversationMemoryConfig) {
    this.storage = storage;
    this.config = config;
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    try {
      await this.storage.init();
      this.isInitialized = true;
      logger.info("[StorageConversationMemoryManager] Initialized", {
        backend: this.storage.type,
        maxSessions: this.config.maxSessions,
      });
    } catch (error) {
      throw new ConversationMemoryError(
        "Failed to initialize StorageConversationMemoryManager",
        "CONFIG_ERROR",
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  async close(): Promise<void> {
    // Do NOT close the storage provider here — it may be shared with other
    // consumers (e.g. WorkflowPersistenceManager). Only reset our flag.
    this.isInitialized = false;
  }

  // ============================================================================
  // Thread-ID Resolution
  // ============================================================================

  /**
   * Resolve the storage threadId for a given sessionId.
   * Looks up the mapping in the "session-threads" custom record namespace.
   * Returns null if no thread exists yet.
   */
  private async resolveThreadId(sessionId: string): Promise<string | null> {
    try {
      const record = await this.storage.getRecord(SESSION_THREAD_NS, sessionId);
      if (record && typeof record.value === "string") {
        return record.value;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Ensure a storage thread exists for the given sessionId.
   * Creates a new thread if none exists and persists the mapping.
   */
  private async ensureThread(
    sessionId: string,
    userId?: string,
    firstMessage?: string,
  ): Promise<string> {
    const existing = await this.resolveThreadId(sessionId);
    if (existing) {
      return existing;
    }

    // Create a new thread for this session
    const thread = await this.storage.createThread({
      resourceId: userId || "default",
      title: firstMessage ? firstMessage.slice(0, 100) : sessionId,
      status: "active",
      metadata: {
        sessionId,
        userId: userId || null,
        createdAt: new Date().toISOString(),
      },
    });

    // Persist the sessionId → threadId mapping
    await this.storage.setRecord(SESSION_THREAD_NS, sessionId, thread.id);

    logger.debug(
      "[StorageConversationMemoryManager] Created thread for session",
      {
        sessionId,
        threadId: thread.id,
      },
    );

    return thread.id;
  }

  // ============================================================================
  // IConversationMemoryManager implementation
  // ============================================================================

  async storeConversationTurn(
    options: StoreConversationTurnOptions,
  ): Promise<void> {
    await this.ensureStorageReady();

    const { sessionId, userId, userMessage, aiResponse } = options;

    try {
      const threadId = await this.ensureThread(sessionId, userId, userMessage);

      const now = new Date().toISOString();
      // Store user message
      await this.storage.createMessage({
        threadId,
        role: "user",
        content: userMessage,
        metadata: {
          messageId: randomUUID(),
          timestamp: now,
          originalRole: "user",
        },
      });

      // Store assistant message — store scalar-safe metadata only
      const assistantMeta: Record<string, string | number | boolean | null> = {
        messageId: randomUUID(),
        timestamp: now,
        originalRole: "assistant",
      };
      if (options.tokenUsage) {
        assistantMeta.inputTokens = options.tokenUsage.inputTokens ?? null;
        assistantMeta.outputTokens = options.tokenUsage.outputTokens ?? null;
        assistantMeta.totalTokens = options.tokenUsage.totalTokens ?? null;
      }

      await this.storage.createMessage({
        threadId,
        role: "assistant",
        content: aiResponse,
        metadata: assistantMeta,
      });

      logger.debug(
        "[StorageConversationMemoryManager] Stored conversation turn",
        { sessionId, threadId },
      );
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

  async getSession(
    sessionId: string,
    _userId?: string,
  ): Promise<SessionMemory | undefined> {
    await this.ensureStorageReady();

    try {
      const threadId = await this.resolveThreadId(sessionId);
      if (!threadId) {
        return undefined;
      }

      const thread = await this.storage.getThread(threadId);
      if (!thread) {
        return undefined;
      }

      const storageMessages =
        await this.storage.getMessagesByThreadId(threadId);
      const messages = this.convertStorageMessages(storageMessages);

      const createdAtMs = thread.createdAt
        ? new Date(thread.createdAt).getTime()
        : Date.now();
      const updatedAtMs = thread.updatedAt
        ? new Date(thread.updatedAt).getTime()
        : Date.now();

      return {
        sessionId,
        userId:
          typeof thread.metadata?.userId === "string"
            ? thread.metadata.userId
            : undefined,
        messages,
        createdAt: createdAtMs,
        lastActivity: updatedAtMs,
      };
    } catch {
      return undefined;
    }
  }

  async buildContextMessages(
    sessionId: string,
    _userId?: string,
    _enableSummarization?: boolean,
    _requestId?: string,
  ): Promise<ChatMessage[]> {
    await this.ensureStorageReady();

    try {
      const threadId = await this.resolveThreadId(sessionId);
      if (!threadId) {
        return [];
      }

      const storageMessages =
        await this.storage.getMessagesByThreadId(threadId);
      return this.convertStorageMessages(storageMessages);
    } catch (error) {
      logger.warn(
        "[StorageConversationMemoryManager] buildContextMessages failed",
        {
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return [];
    }
  }

  async clearSession(sessionId: string, _userId?: string): Promise<boolean> {
    await this.ensureStorageReady();

    try {
      const threadId = await this.resolveThreadId(sessionId);
      if (!threadId) {
        return false;
      }

      const deleted = await this.storage.deleteThread(threadId);
      if (deleted) {
        await this.storage.deleteRecord(SESSION_THREAD_NS, sessionId);
        logger.info("[StorageConversationMemoryManager] Session cleared", {
          sessionId,
          threadId,
        });
      }
      return deleted;
    } catch (error) {
      logger.error(
        "[StorageConversationMemoryManager] Failed to clear session",
        {
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return false;
    }
  }

  async clearAllSessions(): Promise<void> {
    await this.ensureStorageReady();

    try {
      // Delete the entire session-threads namespace mapping
      await this.storage.deleteNamespace(SESSION_THREAD_NS);
      logger.warn(
        "[StorageConversationMemoryManager] clearAllSessions removed session-thread mappings. " +
          "Individual thread data may still exist in storage backend.",
      );
    } catch (error) {
      logger.error(
        "[StorageConversationMemoryManager] clearAllSessions failed",
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  async getStats(): Promise<ConversationMemoryStats> {
    await this.ensureStorageReady();

    try {
      const stats = await this.storage.getStats();
      const totalSessions = stats.threadCount || 0;
      const totalMessages = stats.messageCount || 0;
      const totalTurns = totalMessages / MESSAGES_PER_TURN;

      return {
        totalSessions,
        totalTurns,
      };
    } catch {
      return { totalSessions: 0, totalTurns: 0 };
    }
  }

  async getSessionMessages(
    sessionId: string,
    _userId?: string,
  ): Promise<ChatMessage[]> {
    await this.ensureStorageReady();

    try {
      const threadId = await this.resolveThreadId(sessionId);
      if (!threadId) {
        return [];
      }

      const storageMessages =
        await this.storage.getMessagesByThreadId(threadId);
      return this.convertStorageMessages(storageMessages);
    } catch {
      return [];
    }
  }

  async setSessionMessages(
    sessionId: string,
    messages: ChatMessage[],
    userId?: string,
  ): Promise<void> {
    await this.ensureStorageReady();

    try {
      // Ensure the thread exists (creates if needed)
      const threadId = await this.ensureThread(sessionId, userId);

      // Delete existing messages for this thread
      await this.storage.deleteMessagesByThreadId(threadId);

      // Re-insert all provided messages
      if (messages.length > 0) {
        const inputs = messages.map((msg) => {
          // Build a JsonObject-compatible metadata record.
          // Complex types (events, args, result, metadata) are JSON-serialized
          // to strings so they remain within JsonValue constraints.
          const meta: Record<string, string | number | boolean | null> = {
            messageId: msg.id,
            timestamp: msg.timestamp || new Date().toISOString(),
            originalRole: msg.role,
          };
          if (msg.tool) {
            meta.tool = msg.tool;
          }
          if (msg.args) {
            meta.args = JSON.stringify(msg.args);
          }
          if (msg.result) {
            meta.result = JSON.stringify(msg.result);
          }
          if (msg.events && msg.events.length > 0) {
            meta.events = JSON.stringify(msg.events);
          }
          if (msg.metadata) {
            meta.chatMetadata = JSON.stringify(msg.metadata);
          }

          return {
            threadId,
            role: toStorageRole(msg.role),
            content: msg.content,
            metadata: meta,
          };
        });

        await this.storage.createMessages(inputs);
      }

      logger.debug(
        "[StorageConversationMemoryManager] Session messages replaced",
        { sessionId, threadId, count: messages.length },
      );
    } catch (error) {
      throw new ConversationMemoryError(
        `Failed to set session messages for session ${sessionId}`,
        "STORAGE_ERROR",
        {
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private async ensureStorageReady(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Convert StorageMessage[] to ChatMessage[].
   * Restores original role and message metadata from storage metadata.
   */
  private convertStorageMessages(
    storageMessages: Array<{
      id: string;
      role: string;
      content: string;
      createdAt: Date;
      metadata?: Record<string, unknown> | null;
    }>,
  ): ChatMessage[] {
    return storageMessages.map((sm) => {
      const meta = sm.metadata || {};
      const originalRole =
        typeof meta.originalRole === "string" ? meta.originalRole : undefined;
      const role = fromStorageRole(sm.role, originalRole);

      // Reconstruct the ChatMessage, restoring all stored fields
      const msg: ChatMessage = {
        id: typeof meta.messageId === "string" ? meta.messageId : sm.id,
        role,
        content: sm.content,
        timestamp:
          typeof meta.timestamp === "string"
            ? meta.timestamp
            : sm.createdAt.toISOString(),
      };

      if (typeof meta.tool === "string") {
        msg.tool = meta.tool;
      }
      if (meta.args && typeof meta.args === "object") {
        msg.args = meta.args as Record<string, unknown>;
      }
      if (meta.result) {
        msg.result = meta.result as ChatMessage["result"];
      }
      if (Array.isArray(meta.events)) {
        msg.events = meta.events as ChatMessage["events"];
      }

      // Reconstruct metadata sub-object (exclude fields we've already promoted)
      const {
        messageId: _msgId,
        timestamp: _ts,
        originalRole: _role,
        tool: _tool,
        args: _args,
        result: _result,
        events: _events,
        ...restMeta
      } = meta;

      if (Object.keys(restMeta).length > 0) {
        msg.metadata = restMeta as ChatMessage["metadata"];
      }

      return msg;
    });
  }
}
