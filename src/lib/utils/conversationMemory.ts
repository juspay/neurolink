/**
 * Conversation Memory Utilities
 * Handles configuration merging and conversation memory operations
 */

import type {
  ConversationMemoryConfig,
  ChatMessage,
  SessionMemory,
  ProviderDetails,
} from "../types/conversation.js";
import type { ConversationMemoryManager } from "../core/conversationMemoryManager.js";
import type { RedisConversationMemoryManager } from "../core/redisConversationMemoryManager.js";
import type {
  TextGenerationOptions,
  TextGenerationResult,
} from "../types/generateTypes.js";
import {
  getConversationMemoryDefaults,
  MEMORY_THRESHOLD_PERCENTAGE,
  DEFAULT_FALLBACK_THRESHOLD,
} from "../config/conversationMemory.js";
import { TokenUtils } from "../constants/tokens.js";
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
  startTimeStamp?: Date | undefined,
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
  let providerDetails: ProviderDetails | undefined = undefined;
  if (result.provider && result.model) {
    providerDetails = {
      provider: result.provider,
      model: result.model,
    };
  }
  try {
    await conversationMemory.storeConversationTurn(
      sessionId,
      userId,
      userMessage,
      aiResponse,
      startTimeStamp,
      providerDetails,
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

/**
 * Build context messages from pointer onwards (token-based memory)
 * Returns messages after the summarized pointer + the summary message
 * @param session - Session memory with pointer
 * @returns Context messages to send to LLM
 */
export function buildContextFromPointer(session: SessionMemory): ChatMessage[] {
  if (!session.summarizedUpToMessageId) {
    return session.messages;
  }

  let pointerIndex = session.summarizedUpToMessageIndex;

  if (
    pointerIndex !== undefined &&
    pointerIndex >= 0 &&
    pointerIndex < session.messages.length &&
    session.messages[pointerIndex]?.id === session.summarizedUpToMessageId
  ) {
    logger.debug("Using cached pointer index for fast context retrieval", {
      sessionId: session.sessionId,
      pointerIndex,
      totalMessages: session.messages.length,
    });
  } else {
    pointerIndex = session.messages.findIndex(
      (msg) => msg.id === session.summarizedUpToMessageId,
    );

    if (pointerIndex === -1) {
      logger.warn("Pointer message not found, returning all messages", {
        sessionId: session.sessionId,
        pointer: session.summarizedUpToMessageId,
        totalMessages: session.messages.length,
      });
      return session.messages;
    }
  }

  // Return: summary message + all messages after pointer
  // Expect summary to be at pointerIndex + 1
  const contextMessages = session.messages.slice(pointerIndex + 1);

  if (contextMessages.length > 0 && contextMessages[0]?.metadata?.isSummary) {
    return contextMessages;
  }

  logger.warn("Expected summary message after pointer", {
    sessionId: session.sessionId,
    pointerIndex,
    nextMessageRole: contextMessages[0]?.role,
    nextMessageIsSummary: contextMessages[0]?.metadata?.isSummary,
  });
  return contextMessages;
}

/**
 * Create summarization prompt from message history
 * Used by both in-memory and Redis conversation managers
 */
export function createSummarizationPrompt(history: ChatMessage[]): string {
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

/**
 * Calculate token threshold based on model's output token limit
 * Uses existing provider token limits as proxy for context window
 * @param provider - AI provider name
 * @param model - Model name
 * @returns Token threshold (80% of model's token limit)
 */
export function calculateTokenThreshold(
  provider: string,
  model: string,
): number {
  try {
    // Get model's token limit from existing TokenUtils
    const modelTokenLimit = TokenUtils.getProviderTokenLimit(provider, model);

    // Return 80% of token limit for conversation memory
    // This is conservative since output limits are typically smaller than input limits
    return Math.floor(modelTokenLimit * MEMORY_THRESHOLD_PERCENTAGE);
  } catch (error) {
    logger.warn("Failed to calculate model threshold, using fallback", {
      provider,
      model,
      error: error instanceof Error ? error.message : String(error),
    });
    return DEFAULT_FALLBACK_THRESHOLD;
  }
}

/**
 * Get effective token threshold for a session
 * Priority: session override > env var > model-based (80%) > fallback
 * @param provider - AI provider name
 * @param model - Model name
 * @param envOverride - Environment variable override
 * @param sessionOverride - Per-session token threshold override
 * @returns Effective token threshold
 */
export function getEffectiveTokenThreshold(
  provider: string,
  model: string,
  envOverride?: number,
  sessionOverride?: number,
): number {
  // Priority 1: Session-level override
  if (sessionOverride && sessionOverride > 0) {
    return sessionOverride;
  }

  // Priority 2: Environment variable override
  if (envOverride && envOverride > 0) {
    return envOverride;
  }

  // Priority 3: Model-based calculation (80% of context window)
  try {
    return calculateTokenThreshold(provider, model);
  } catch (error) {
    logger.warn("Failed to calculate effective threshold, using fallback", {
      provider,
      model,
      error: error instanceof Error ? error.message : String(error),
    });
    // Priority 4: Fallback for unknown models
    return DEFAULT_FALLBACK_THRESHOLD;
  }
}
