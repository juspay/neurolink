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
import { NeuroLink } from "../neurolink.js";

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

    const enableSummarization = options.enableSummarization ?? undefined;
    const messages = await conversationMemory.buildContextMessages(
      sessionId,
      userId,
      enableSummarization,
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

  const aiResponse = result.content ?? "";
  let providerDetails: ProviderDetails | undefined = undefined;
  if (result.provider && result.model) {
    providerDetails = {
      provider: result.provider,
      model: result.model,
    };
  }
  try {
    await conversationMemory.storeConversationTurn({
      sessionId,
      userId,
      userMessage,
      aiResponse,
      startTimeStamp,
      providerDetails,
      enableSummarization: originalOptions.enableSummarization,
    });

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
 * Returns summary message (if exists) + all messages after the summarized pointer
 * @param session - Session memory with pointer
 * @returns Context messages to send to LLM
 */
export function buildContextFromPointer(session: SessionMemory): ChatMessage[] {
  if (!session.summarizedUpToMessageId || !session.summarizedMessage) {
    return session.messages;
  }

  // find a better way to wirte this
  const pointerIndex = session.messages.findIndex(
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

  const messagesAfterPointer = session.messages.slice(pointerIndex + 1);

  // Construct context: summary message + recent messages
  const summaryMessage: ChatMessage = {
    id: `summary-${session.summarizedUpToMessageId}`,
    role: "system",
    content: `Previous conversation summary: ${session.summarizedMessage}`,
    timestamp: new Date().toISOString(),
    metadata: {
      isSummary: true,
      summarizesTo: session.summarizedUpToMessageId,
    },
  };

  logger.debug("Building context with summary", {
    sessionId: session.sessionId,
    pointerIndex,
    messagesAfterPointer: messagesAfterPointer.length,
    totalMessages: session.messages.length,
    summaryLength: session.summarizedMessage.length,
  });

  return [summaryMessage, ...messagesAfterPointer];
}

/**
 * Create summarization prompt from message history
 * Used by both in-memory and Redis conversation managers
 * @param history - Messages to summarize
 * @param previousSummary - Optional previous summary to build upon
 */
export function createSummarizationPrompt(
  history: ChatMessage[],
  previousSummary?: string,
): string {
  const formattedHistory = history
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join("\n\n");

  const previousSummarySection = previousSummary
    ? `Previous Summary:
---
${previousSummary}
---

`
    : "";

  return `
You are a context summarization AI. Your task is to condense the following conversation history for another AI assistant.
${previousSummary ? "Build upon the previous summary and incorporate the new conversation turns below." : ""}
The summary must be a concise, third-person narrative that retains all critical information, including key entities, technical details, decisions made, and any specific dates or times mentioned.
Ensure the summary flows logically and is ready to be used as context for the next turn in the conversation.

${previousSummarySection}Conversation History to Summarize:
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

/**
 * Generate summary using configured provider and model
 * Centralized summarization logic used by both ConversationMemoryManager and RedisConversationMemoryManager
 * @param messages - Messages to summarize
 * @param config - Conversation memory configuration containing provider/model settings
 * @param previousSummary - Optional previous summary to build upon
 * @param logPrefix - Prefix for log messages (e.g., "[ConversationMemory]" or "[RedisConversationMemoryManager]")
 * @returns Summary text or null if generation fails
 */
export async function generateSummary(
  messages: ChatMessage[],
  config: ConversationMemoryConfig,
  logPrefix = "[ConversationMemory]",
  previousSummary?: string,
): Promise<string | null> {
  const summarizationPrompt = createSummarizationPrompt(
    messages,
    previousSummary,
  );
  const summarizer = new NeuroLink({
    conversationMemory: { enabled: false },
  });

  try {
    if (!config.summarizationProvider || !config.summarizationModel) {
      logger.error(`${logPrefix} Missing summarization provider`);
      return null;
    }

    const summaryResult = await summarizer.generate({
      input: { text: summarizationPrompt },
      provider: config.summarizationProvider,
      model: config.summarizationModel,
      disableTools: true,
    });

    return summaryResult.content || null;
  } catch (error) {
    logger.error(`${logPrefix} Error generating summary`, { error });
    return null;
  }
}
