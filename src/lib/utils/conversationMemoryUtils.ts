/**
 * Conversation Memory Utilities
 * Handles configuration merging and conversation memory operations
 */

import type { ConversationMemoryConfig } from "../types/conversationTypes.js";
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

  // Ensure contextInjection always has values
  const defaultContextInjection = defaults.contextInjection || {
    maxContextTurns: 10,
    maxContextTokens: 2000,
    strategy: "recent" as const,
  };

  return {
    enabled: userConfig?.enabled ?? defaults.enabled,
    maxSessions: userConfig?.maxSessions ?? defaults.maxSessions,
    maxTurnsPerSession:
      userConfig?.maxTurnsPerSession ?? defaults.maxTurnsPerSession,
    storageLocation: userConfig?.storageLocation ?? defaults.storageLocation,
    autoCleanup: userConfig?.autoCleanup ?? defaults.autoCleanup,
    contextInjection: {
      maxContextTurns:
        userConfig?.contextInjection?.maxContextTurns ??
        defaultContextInjection.maxContextTurns,
      maxContextTokens:
        userConfig?.contextInjection?.maxContextTokens ??
        defaultContextInjection.maxContextTokens,
      strategy:
        userConfig?.contextInjection?.strategy ??
        defaultContextInjection.strategy,
    },
  };
}

/**
 * Inject conversation history into generation options
 * Enhances prompts with relevant conversation context
 */
export async function injectConversationHistory(
  conversationMemory: ConversationMemoryManager | undefined,
  options: TextGenerationOptions,
): Promise<TextGenerationOptions> {
  if (!conversationMemory || !options.context) {
    return options;
  }

  const sessionId = (options.context as Record<string, unknown>)
    ?.sessionId as string;
  if (!sessionId) {
    return options;
  }

  try {
    const contextResult = conversationMemory.buildContextString(sessionId, {
      includeMetadata: false,
    });

    if (contextResult.contextString) {
      // Inject conversation history into the prompt
      const enhancedPrompt = `${contextResult.contextString}\n\n${options.prompt}`;

      logger.debug("Conversation history injected", {
        sessionId,
        turnsIncluded: contextResult.turnsIncluded,
        estimatedTokens: contextResult.estimatedTokens,
        wasTruncated: contextResult.wasTruncated,
      });

      return {
        ...options,
        prompt: enhancedPrompt,
      };
    }
  } catch (error) {
    logger.warn("Failed to inject conversation history", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return options;
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
  const sessionId = context.sessionId as string;
  const userId = context.userId as string | undefined;

  if (!sessionId) {
    return;
  }

  try {
    await conversationMemory.storeConversationTurn(
      sessionId,
      userId,
      originalOptions.prompt || "",
      result.content,
      {
        provider: result.provider,
        responseTime: result.responseTime,
        toolsUsed: result.toolsUsed,
        tokenCount: result.usage
          ? {
              input: result.usage.promptTokens,
              output: result.usage.completionTokens,
              total: result.usage.totalTokens,
            }
          : undefined,
        model: result.model,
      },
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
