/**
 * Conversation Memory Utilities
 * Handles configuration merging and conversation memory operations
 */

import type {
  ConversationMemoryConfig,
  ChatMessage,
} from "../types/conversationTypes.js";
import type { ConversationMemoryManager } from "../core/conversationMemoryManager.js";
import type {
  TextGenerationOptions,
  TextGenerationResult,
} from "../core/types.js";
import { getConversationMemoryDefaults } from "../config/conversationMemoryConfig.js";
import { logger } from "./logger.js";

/**
 * Apply conversation memory defaults to user configuration
 * Merges user config with environment variables and default values
 */
export function applyConversationMemoryDefaults(
  userConfig?: Partial<ConversationMemoryConfig>,
): ConversationMemoryConfig {
  const defaults = getConversationMemoryDefaults();

  return {
    enabled: userConfig?.enabled ?? defaults.enabled,
    maxSessions: userConfig?.maxSessions ?? defaults.maxSessions,
    maxTurnsPerSession:
      userConfig?.maxTurnsPerSession ?? defaults.maxTurnsPerSession,
  };
}

/**
 * Get conversation history as message array (PREFERRED METHOD)
 * Returns proper message array format for AI providers
 */
export async function getConversationMessages(
  conversationMemory: ConversationMemoryManager | undefined,
  options: TextGenerationOptions,
): Promise<ChatMessage[]> {
  if (!conversationMemory || !options.context) {
    return [];
  }

  const sessionId = (options.context as Record<string, unknown>)?.sessionId;
  if (typeof sessionId !== "string" || !sessionId) {
    return [];
  }

  try {
    const messages = conversationMemory.buildContextMessages(sessionId);
    logger.debug("Conversation messages retrieved", {
      sessionId,
      messageCount: messages.length,
    });

    return messages;
  } catch (error) {
    logger.warn("Failed to get conversation messages", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Store conversation turn for future context
 * Saves user messages and AI responses for conversation memory
 */
export async function storeConversationTurn(
  conversationMemory: ConversationMemoryManager | undefined,
  originalOptions: TextGenerationOptions,
  result: TextGenerationResult,
): Promise<void> {
  if (!conversationMemory || !originalOptions.context) {
    return;
  }

  const context = originalOptions.context as Record<string, unknown>;
  const sessionId = context.sessionId;
  const userId =
    typeof context.userId === "string" ? context.userId : undefined;

  if (typeof sessionId !== "string" || !sessionId) {
    return;
  }

  try {
    await conversationMemory.storeConversationTurn(
      sessionId,
      userId,
      originalOptions.prompt || "",
      result.content,
    );

    logger.debug("Conversation turn stored", {
      sessionId,
      userId,
      promptLength: originalOptions.prompt?.length || 0,
      responseLength: result.content.length,
    });
  } catch (error) {
    logger.warn("Failed to store conversation turn", {
      sessionId,
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
