/**
 * Conversation Memory Utilities
 * Handles configuration merging and conversation memory operations
 */

import type {
  ConversationMemoryConfig,
  ChatMessage,
} from "../types/conversation.js";
import type { ConversationMemoryManager } from "../core/conversationMemoryManager.js";
import type {
  TextGenerationOptions,
  TextGenerationResult,
} from "../types/index.js";
import { getConversationMemoryDefaults } from "../config/conversationMemory.js";
import { logger } from "./logger.js";
import { createRedisClient, getNormalizedConfig } from "./redis.js";

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
    // Remove duplicate summarization logic - it should be handled in ConversationMemoryManager
    const messages = await conversationMemory.buildContextMessages(sessionId);
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
  startTimeStamp?: Date | undefined,
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
      originalOptions.originalPrompt || originalOptions.prompt || "",
      result.content,
      startTimeStamp,
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

/**
 * Check if Redis is available for conversation memory
 */
export async function checkRedisAvailability(): Promise<boolean> {
  let testClient = null;

  try {
    const testConfig = getNormalizedConfig({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : undefined,
      password: process.env.REDIS_PASSWORD,
      db: process.env.REDIS_DB ? Number(process.env.REDIS_DB) : undefined,
      keyPrefix: process.env.REDIS_KEY_PREFIX,
      ttl: process.env.REDIS_TTL ? Number(process.env.REDIS_TTL) : undefined,
      connectionOptions: {
        connectTimeout: 5000,
        maxRetriesPerRequest: 1,
        retryDelayOnFailover: 100,
      },
    });

    // Test Redis connection
    testClient = await createRedisClient(testConfig);
    await testClient.ping();

    logger.debug("Redis connection test successful");
    return true;
  } catch (error) {
    logger.debug("Redis connection test failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  } finally {
    if (testClient) {
      try {
        await testClient.quit();
        logger.debug("Redis test client disconnected successfully");
      } catch (quitError) {
        logger.debug("Error during Redis test client disconnect", {
          error:
            quitError instanceof Error ? quitError.message : String(quitError),
        });
      }
    }
  }
}
