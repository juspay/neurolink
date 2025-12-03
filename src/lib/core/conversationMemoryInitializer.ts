/**
 * Conversation Memory Initializer
 * Provides integration with Redis storage for conversation memory
 */

import type { ConversationMemoryConfig } from "../types/conversation.js";
import type { ConversationMemoryManager } from "./conversationMemoryManager.js";
import type { RedisConversationMemoryManager } from "./redisConversationMemoryManager.js";
import {
  createConversationMemoryManager,
  getStorageType,
  getRedisConfigFromEnv,
} from "./conversationMemoryFactory.js";
import { applyConversationMemoryDefaults } from "../utils/conversationMemory.js";
import { logger } from "../utils/logger.js";

/**
 * Initialize conversation memory for NeuroLink
 * This function decides whether to use in-memory or Redis storage
 */
export async function initializeConversationMemory(config?: {
  conversationMemory?: Partial<ConversationMemoryConfig>;
}): Promise<ConversationMemoryManager | RedisConversationMemoryManager | null> {
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

    if (storageType === "redis") {
      logger.info(
        "[conversationMemoryInitializer] Initializing Redis-based conversation memory manager",
      );

      // Get Redis configuration - prioritize passed config, fallback to environment
      logger.debug(
        "[conversationMemoryInitializer] Getting Redis configuration",
      );
      const redisConfig =
        config.conversationMemory?.redisConfig || getRedisConfigFromEnv();
      const configSource = config.conversationMemory?.redisConfig
        ? "SDK input (from Lighthouse)"
        : "environment variables (NeuroLink)";
      logger.debug(
        "[conversationMemoryInitializer] Redis configuration retrieved",
        {
          configSource,
          host: redisConfig.host || "localhost",
          port: redisConfig.port || 6379,
          hasPassword: !!redisConfig.password,
          db: redisConfig.db || 0,
          keyPrefix: redisConfig.keyPrefix || "neurolink:conversation:",
          ttl: redisConfig.ttl || 86400,
        },
      );

      // Create Redis-based conversation memory manager
      logger.debug(
        "[conversationMemoryInitializer] Creating Redis conversation memory manager",
      );
      const redisMemoryManager = createConversationMemoryManager(
        memoryConfig,
        "redis",
        redisConfig,
      );

      logger.debug(
        "[conversationMemoryInitializer] Checking Redis manager creation result",
        {
          managerType: redisMemoryManager?.constructor?.name || "unknown",
          isRedisType:
            redisMemoryManager?.constructor?.name ===
            "RedisConversationMemoryManager",
          hasConfig: !!redisMemoryManager?.config,
        },
      );

      logger.info(
        "[conversationMemoryInitializer] Redis conversation memory manager created successfully",
        {
          configSource,
          host: redisConfig.host || "localhost",
          port: redisConfig.port || 6379,
          keyPrefix: redisConfig.keyPrefix || "neurolink:conversation:",
          maxSessions: memoryConfig.maxSessions,
          maxTurnsPerSession: memoryConfig.maxTurnsPerSession,
          managerType: redisMemoryManager?.constructor?.name,
        },
      );

      // Perform basic validation
      if (
        redisMemoryManager?.constructor?.name !==
        "RedisConversationMemoryManager"
      ) {
        logger.warn(
          "[conversationMemoryInitializer] Created manager is not of RedisConversationMemoryManager type",
          {
            actualType: redisMemoryManager?.constructor?.name,
          },
        );
      }

      return redisMemoryManager;
    } else {
      logger.info(
        "[conversationMemoryInitializer] Initializing in-memory conversation memory manager",
      );

      // Create in-memory conversation memory manager
      logger.debug(
        "[conversationMemoryInitializer] Creating in-memory conversation memory manager",
      );
      const memoryManager = createConversationMemoryManager(memoryConfig);

      logger.debug(
        "[conversationMemoryInitializer] Checking memory manager creation result",
        {
          managerType: memoryManager?.constructor?.name || "unknown",
          isInMemoryType:
            memoryManager?.constructor?.name === "ConversationMemoryManager",
          hasConfig: !!memoryManager?.config,
        },
      );

      logger.info(
        "[conversationMemoryInitializer] In-memory conversation memory manager created successfully",
        {
          maxSessions: memoryConfig.maxSessions,
          maxTurnsPerSession: memoryConfig.maxTurnsPerSession,
          managerType: memoryManager?.constructor?.name,
        },
      );

      return memoryManager;
    }
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
