/**
 * Conversation Memory Initializer
 * Provides integration with Redis storage for conversation memory
 */

import type {
  ConversationMemoryConfig,
  RedisStorageConfig,
} from "../types/conversation.js";
import type { ConversationMemoryManager } from "./conversationMemoryManager.js";
import type { RedisConversationMemoryManager } from "./redisConversationMemoryManager.js";
import {
  createConversationMemoryManager,
  getStorageType,
} from "./conversationMemoryFactory.js";
import { applyConversationMemoryDefaults } from "../utils/conversationMemory.js";
import { logger } from "../utils/logger.js";

/**
 * Initialize conversation memory for NeuroLink
 * This function decides whether to use in-memory or Redis storage
 */
import { DiskConversationMemoryManager } from "./diskConversationMemoryManager.js";

export async function initializeConversationMemory(config?: {
  conversationMemory?: Partial<ConversationMemoryConfig>;
}): Promise<
  | ConversationMemoryManager
  | RedisConversationMemoryManager
  | DiskConversationMemoryManager
  | null
> {
  logger.debug(
    "[conversationMemoryInitializer] Initialize conversation memory called",
    {
      hasConfig: !!config,
      hasMemoryConfig: !!config?.conversationMemory,
      memoryEnabled: config?.conversationMemory?.enabled || false,
      storageType: process.env.STORAGE_TYPE || "memory",
    },
  );

  if (!config?.conversationMemory?.enabled) {
    logger.debug(
      "[conversationMemoryInitializer] Conversation memory not enabled - skipping initialization",
    );
    return null;
  }

  try {
    // Apply default configuration
    logger.debug(
      "[conversationMemoryInitializer] Applying conversation memory defaults",
    );
    const memoryConfig = applyConversationMemoryDefaults(
      config.conversationMemory,
    );
    logger.debug(
      "[conversationMemoryInitializer] Memory configuration processed",
      {
        enabled: memoryConfig.enabled,
        maxSessions: memoryConfig.maxSessions,
        maxTurnsPerSession: memoryConfig.maxTurnsPerSession,
        enableSummarization: memoryConfig.enableSummarization,
      },
    );

    // Determine storage type from environment
    const storageType = getStorageType();
    logger.debug("[conversationMemoryInitializer] Storage type determined", {
      storageType,
      fromEnv: !!process.env.STORAGE_TYPE,
    });

    // The factory now handles all the logic, so we just call it with the config.
    const manager = createConversationMemoryManager(
      memoryConfig,
      storageType,
      (memoryConfig as Record<string, unknown>).redisConfig as
        | RedisStorageConfig
        | undefined,
    );

    logger.info(
      "[conversationMemoryInitializer] Conversation memory manager created successfully",
      {
        storageType:
          manager.constructor.name
            .replace("ConversationMemoryManager", "")
            .toLowerCase() || "memory",
        managerType: manager.constructor.name,
      },
    );

    return manager;
  } catch (error) {
    logger.error(
      "[conversationMemoryInitializer] Failed to initialize conversation memory",
      {
        error: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorStack: error instanceof Error ? error.stack : undefined,
        storageType: process.env.STORAGE_TYPE || "memory",
        memoryConfig: {
          enabled: config?.conversationMemory?.enabled,
          maxSessions: config?.conversationMemory?.maxSessions,
          maxTurnsPerSession: config?.conversationMemory?.maxTurnsPerSession,
        },
        redisConfig: {
          host: process.env.REDIS_HOST || "(not set)",
          port: process.env.REDIS_PORT || "(not set)",
          hasPassword: !!process.env.REDIS_PASSWORD,
          keyPrefix: process.env.REDIS_KEY_PREFIX || "(not set)",
        },
      },
    );

    // Log additional diagnostics for redis errors
    if (process.env.STORAGE_TYPE === "redis") {
      logger.error(
        "[conversationMemoryInitializer] Redis configuration error details",
        {
          REDIS_HOST: process.env.REDIS_HOST || "(not set)",
          REDIS_PORT: process.env.REDIS_PORT || "(not set)",
          REDIS_PASSWORD: process.env.REDIS_PASSWORD ? "******" : "(not set)",
          REDIS_DB: process.env.REDIS_DB || "(not set)",
          REDIS_KEY_PREFIX: process.env.REDIS_KEY_PREFIX || "(not set)",
          REDIS_TTL: process.env.REDIS_TTL || "(not set)",
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      );
    }

    throw error;
  }
}
