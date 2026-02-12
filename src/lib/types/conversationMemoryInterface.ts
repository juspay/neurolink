/**
 * Shared type for conversation memory managers.
 * Both ConversationMemoryManager and RedisConversationMemoryManager
 * should implement this type.
 */

import type {
  ChatMessage,
  ConversationMemoryConfig,
  ConversationMemoryStats,
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
  ): Promise<ChatMessage[]> | ChatMessage[];

  /** Clear a specific session */
  clearSession(sessionId: string, userId?: string): Promise<boolean> | boolean;

  /** Clear all sessions */
  clearAllSessions(): Promise<void> | void;

  /** Get memory statistics */
  getStats(): Promise<ConversationMemoryStats> | ConversationMemoryStats;
};
