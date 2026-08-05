/**
 * Shared type for conversation memory managers.
 * Both ConversationMemoryManager and RedisConversationMemoryManager
 * should implement this type.
 */

import type {
  ChatMessage,
  ConversationMemoryConfig,
  ConversationMemoryStats,
  SessionListItem,
  SessionMemory,
  StoreConversationTurnOptions,
} from "./conversation.js";

/**
 * Common type for all conversation memory manager implementations.
 * Provides a consistent API for storing, retrieving, and managing conversation history.
 */
export type IConversationMemoryManager = {
  config: ConversationMemoryConfig;

  /** Initialize the memory manager */
  initialize(): Promise<void> | void;

  /** Store a conversation turn */
  storeConversationTurn(options: StoreConversationTurnOptions): Promise<void>;

  /** Get session by ID */
  getSession(
    sessionId: string,
    userId?: string,
  ): SessionMemory | undefined | Promise<SessionMemory | undefined>;

  /** Build context messages for AI prompt injection */
  buildContextMessages(
    sessionId: string,
    userId?: string,
    enableSummarization?: boolean,
    requestId?: string,
  ): Promise<ChatMessage[]> | ChatMessage[];

  /** Clear a specific session */
  clearSession(sessionId: string, userId?: string): Promise<boolean> | boolean;

  /** Clear all sessions */
  clearAllSessions(): Promise<void> | void;

  /** Get memory statistics */
  getStats(): Promise<ConversationMemoryStats> | ConversationMemoryStats;

  /** List all sessions with metadata (optional - for session management) */
  listSessions?(userId?: string): Promise<SessionListItem[]>;

  /** List all sessions with metadata (optional - for session management) */
  listSessions?(userId?: string): Promise<SessionListItem[]>;
  /** Get raw messages array for a session (no context filtering or summarization) */
  getSessionMessages(
    sessionId: string,
    userId?: string,
  ): Promise<ChatMessage[]>;

  /** Replace the entire messages array for a session */
  setSessionMessages(
    sessionId: string,
    messages: ChatMessage[],
    userId?: string,
  ): Promise<void>;

  /**
   * Persist a step's tool calls and results as `tool_call` / `tool_result`
   * messages on the session.
   *
   * Declared on the interface so every backend can implement it. Previously
   * only the Redis manager had it, and the caller reached it by casting — so
   * on in-memory storage tool activity never became messages at all, and the
   * compaction, pruning and pair-repair paths saw a different history shape
   * depending on `STORAGE_TYPE`.
   */
  storeToolExecution?(
    sessionId: string,
    userId: string | undefined,
    toolCalls: Array<{
      toolCallId?: string;
      toolName?: string;
      args?: Record<string, unknown>;
      [key: string]: unknown;
    }>,
    toolResults: Array<{
      toolCallId?: string;
      output?: unknown;
      result?: unknown;
      error?: string;
      [key: string]: unknown;
    }>,
    currentTime?: Date,
  ): Promise<void>;

  /** Close/shutdown the memory manager and release resources (e.g., Redis connections) */
  close?(): Promise<void>;
};
