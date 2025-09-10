/**
 * Conversation Memory Utilities
 * Handles configuration merging and conversation memory operations
 */

import type {
  ConversationMemoryConfig,
  ChatMessage,
} from "../types/conversation.js";
import type { ConversationMemoryManager } from "../core/conversationMemoryManager.js";
import type { RedisConversationMemoryManager } from "../core/redisConversationMemoryManager.js";
import type {
  TextGenerationOptions,
  TextGenerationResult,
} from "../core/types.js";
import { getConversationMemoryDefaults } from "../config/conversationMemory.js";
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
    ...defaults,
    ...userConfig,
  };
}

/**
 * Get conversation history as message array, summarizing if needed.
 */
export async function getConversationMessages(
  conversationMemory:
    | ConversationMemoryManager
    | RedisConversationMemoryManager
    | null
    | undefined,
  options: TextGenerationOptions,
): Promise<ChatMessage[]> {
  if (!conversationMemory || !options.context) {
    logger.warn(
      "[conversationMemoryUtils] No memory or context, returning empty messages",
    );
    return [];
  }

  const sessionId = (options.context as Record<string, unknown>)?.sessionId;
  if (typeof sessionId !== "string" || !sessionId) {
    logger.warn(
      "[conversationMemoryUtils] Invalid or missing sessionId in context",
      {
        sessionIdType: typeof sessionId,
        sessionIdValue: sessionId,
      },
    );
    return [];
  }

  try {
    // Extract userId from context
    const userId = (options.context as Record<string, unknown>)?.userId as
      | string
      | undefined;

    // Remove duplicate summarization logic - it should be handled in ConversationMemoryManager
    const messages = await conversationMemory.buildContextMessages(
      sessionId,
      userId,
    );
    logger.debug(
      "[conversationMemoryUtils] Conversation messages retrieved successfully",
      {
        sessionId,
        messageCount: messages.length,
        messageTypes: messages.map((m) => m.role),
        firstMessage:
          messages.length > 0
            ? {
                role: messages[0].role,
                contentLength: messages[0].content.length,
                contentPreview: messages[0].content.substring(0, 50),
              }
            : null,
        lastMessage:
          messages.length > 0
            ? {
                role: messages[messages.length - 1].role,
                contentLength: messages[messages.length - 1].content.length,
                contentPreview: messages[messages.length - 1].content.substring(
                  0,
                  50,
                ),
              }
            : null,
      },
    );

    return messages;
  } catch (error) {
    logger.warn(
      "[conversationMemoryUtils] Failed to get conversation messages",
      {
        sessionId,
        memoryType: conversationMemory.constructor.name,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    );
    return [];
  }
}

/**
 * Store conversation turn for future context
 * Saves user messages and AI responses for conversation memory
 */
export async function storeConversationTurn(
  conversationMemory:
    | ConversationMemoryManager
    | RedisConversationMemoryManager
    | null
    | undefined,
  originalOptions: TextGenerationOptions,
  result: TextGenerationResult,
): Promise<void> {
  logger.debug("[conversationMemoryUtils] storeConversationTurn called", {
    hasMemory: !!conversationMemory,
    memoryType: conversationMemory?.constructor?.name || "NONE",
    hasContext: !!originalOptions.context,
    hasResult: !!result,
    resultContentLength: result?.content?.length || 0,
  });

  if (!conversationMemory || !originalOptions.context) {
    logger.debug(
      "[conversationMemoryUtils] No memory or context, skipping conversation storage",
    );
    return;
  }

  const context = originalOptions.context as Record<string, unknown>;
  const sessionId = context.sessionId;
  const userId =
    typeof context.userId === "string" ? context.userId : undefined;

  logger.debug(
    "[conversationMemoryUtils] Extracted session details from context",
    {
      sessionId,
      userId,
      contextKeys: Object.keys(context),
      hasValidSessionId: typeof sessionId === "string" && !!sessionId,
    },
  );

  if (typeof sessionId !== "string" || !sessionId) {
    logger.warn(
      "[conversationMemoryUtils] Invalid or missing sessionId in context",
      {
        sessionIdType: typeof sessionId,
        sessionIdValue: sessionId,
      },
    );
    return;
  }

  const userMessage =
    originalOptions.originalPrompt || originalOptions.prompt || "";
  const aiResponse = result.content;
  try {
    await conversationMemory.storeConversationTurn(
      sessionId,
      userId,
      userMessage,
      aiResponse,
    );

    logger.debug(
      "[conversationMemoryUtils] Conversation turn stored successfully",
      {
        sessionId,
        userId,
        memoryType: conversationMemory.constructor.name,
        userMessageLength: userMessage.length,
        aiResponseLength: aiResponse.length,
      },
    );
  } catch (error) {
    logger.warn("[conversationMemoryUtils] Failed to store conversation turn", {
      sessionId,
      userId,
      memoryType: conversationMemory.constructor.name,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
