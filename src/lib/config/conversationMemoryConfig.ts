/**
 * Conversation Memory Configuration
 * Provides default values for conversation memory feature with environment variable support
 */

import type { ConversationMemoryConfig } from "../types/conversationTypes.js";

/**
 * Get default configuration values for conversation memory
 * Reads environment variables when called (not at module load time)
 */
export function getConversationMemoryDefaults(): ConversationMemoryConfig {
  return {
    enabled: process.env.NEUROLINK_MEMORY_ENABLED === "true" ? true : false,
    maxSessions: Number(process.env.NEUROLINK_MEMORY_MAX_SESSIONS) || 50,
    maxTurnsPerSession:
      Number(process.env.NEUROLINK_MEMORY_MAX_TURNS_PER_SESSION) || 20,
    storageLocation:
      process.env.NEUROLINK_MEMORY_STORAGE_LOCATION || "./conversations",
    autoCleanup:
      process.env.NEUROLINK_MEMORY_AUTO_CLEANUP === "false" ? false : true,
    contextInjection: {
      maxContextTurns:
        Number(process.env.NEUROLINK_MEMORY_MAX_CONTEXT_TURNS) || 10,
      maxContextTokens:
        Number(process.env.NEUROLINK_MEMORY_MAX_CONTEXT_TOKENS) || 2000,
      strategy:
        (process.env.NEUROLINK_MEMORY_CONTEXT_STRATEGY as
          | "recent"
          | "relevant"
          | "smart") || "recent",
    },
  };
}
