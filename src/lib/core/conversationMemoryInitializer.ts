/**
 * Conversation Memory Initializer
 * Provides integration with Redis storage for conversation memory
 */

import type {
  ConversationMemoryConfig,
  IConversationMemoryManager,
} from "../types/index.js";
import { applyConversationMemoryDefaults } from "../utils/conversationMemory.js";
import { logger } from "../utils/logger.js";
import {
  createConversationMemoryManager,
  getRedisConfigFromEnv,
  getStorageType,
} from "./conversationMemoryFactory.js";

/**
 * Initialize conversation memory for NeuroLink
 * This function decides whether to use in-memory, Redis, or storage-abstraction backend
 */
export async function initializeConversationMemory(config?: {
  conversationMemory?: Partial<ConversationMemoryConfig>;
}): Promise<IConversationMemoryManager | null> {
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

    // Determine storage type: if redisConfig is passed in the SDK config, use Redis
    // regardless of STORAGE_TYPE env var. This lets consumers configure Redis via the API.
    const hasRedisConfig = !!config.conversationMemory?.redisConfig;
    const storageType = hasRedisConfig ? "redis" : getStorageType();
    logger.debug("[conversationMemoryInitializer] Storage type determined", {
      storageType,
      fromConfig: hasRedisConfig,
      fromEnv: !hasRedisConfig && !!process.env.STORAGE_TYPE,
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
      const redisMemoryManager = await createConversationMemoryManager(
        memoryConfig,
        "redis",
        redisConfig,
      );

      logger.debug(
        "[conversationMemoryInitializer] Checking Redis manager creation result",
        {
          managerType: redisMemoryManager?.constructor?.name || "unknown",
          hasConfig: !!redisMemoryManager?.config,
        },
      );

      logger.info(
        "[conversationMemoryInitializer] Redis conversation memory manager created successfully",
      );

      return redisMemoryManager;
    } else {
      logger.info(
        "[conversationMemoryInitializer] Initializing in-memory conversation memory manager",
      );

      // Create in-memory (or storage-abstraction) conversation memory manager
      logger.debug(
        "[conversationMemoryInitializer] Creating conversation memory manager",
        { storageType },
      );
      const memoryManager = await createConversationMemoryManager(
        memoryConfig,
        storageType,
      );

      logger.debug(
        "[conversationMemoryInitializer] Checking memory manager creation result",
        {
          managerType: memoryManager?.constructor?.name || "unknown",
          hasConfig: !!memoryManager?.config,
        },
      );

      logger.info(
        "[conversationMemoryInitializer] Conversation memory manager created successfully",
        {
          storageType,
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
