/**
 * Conversation Memory Factory for NeuroLink
 * Creates appropriate conversation memory manager based on configuration
 */

import type {
  ConversationMemoryConfig,
  RedisStorageConfig,
} from "../types/conversation.js";
import type { StorageType } from "../types/common.js";
import { ConversationMemoryManager } from "./conversationMemoryManager.js";
import { RedisConversationMemoryManager } from "./redisConversationMemoryManager.js";
import { logger } from "../utils/logger.js";

/**
 * Creates a conversation memory manager based on configuration
 */
export function createConversationMemoryManager(
  config: ConversationMemoryConfig,
  storageType: StorageType = "memory",
  redisConfig?: RedisStorageConfig,
): ConversationMemoryManager | RedisConversationMemoryManager {
  logger.debug(
    "[conversationMemoryFactory] Creating conversation memory manager",
    {
      storageType,
      config: {
        enabled: config.enabled,
        maxSessions: config.maxSessions,
        maxTurnsPerSession: config.maxTurnsPerSession,
        enableSummarization: config.enableSummarization,
        summarizationThresholdTurns: config.summarizationThresholdTurns,
        summarizationTargetTurns: config.summarizationTargetTurns,
        summarizationProvider: config.summarizationProvider,
        summarizationModel: config.summarizationModel,
      },
      hasRedisConfig: !!redisConfig,
    },
  );

  // Default to memory storage
  if (storageType === "memory" || !storageType) {
    logger.debug(
      "[conversationMemoryFactory] Creating in-memory conversation manager",
    );
    const memoryManager = new ConversationMemoryManager(config);
    logger.debug(
      "[conversationMemoryFactory] In-memory conversation manager created successfully",
      {
        managerType: memoryManager.constructor.name,
      },
    );
    return memoryManager;
  }

  // Redis storage
  if (storageType === "redis") {
    logger.debug(
      "[conversationMemoryFactory] Creating Redis conversation manager",
      {
        host: redisConfig?.host || "localhost",
        port: redisConfig?.port || 6379,
        keyPrefix: redisConfig?.keyPrefix || "neurolink:conversation:",
        ttl: redisConfig?.ttl || 86400,
        hasConnectionOptions: !!redisConfig?.connectionOptions,
      },
    );

    const redisManager = new RedisConversationMemoryManager(
      config,
      redisConfig,
    );

    logger.debug(
      "[conversationMemoryFactory] Redis conversation manager created successfully",
      {
        managerType: redisManager.constructor.name,
        config: {
          maxSessions: config.maxSessions,
          maxTurnsPerSession: config.maxTurnsPerSession,
        },
      },
    );

    return redisManager;
  }

  // Fallback to memory storage for unknown types
  logger.warn(
    `[conversationMemoryFactory] Unknown storage type: ${storageType}, falling back to memory storage`,
  );
  const fallbackManager = new ConversationMemoryManager(config);
  logger.debug(
    "[conversationMemoryFactory] Fallback memory manager created successfully",
    {
      managerType: fallbackManager.constructor.name,
    },
  );
  return fallbackManager;
}

/**
 * Get storage type from environment variable or configuration
 */
export function getStorageType(): StorageType {
  // Get the raw value from environment, or use default
  const rawStorageType = process.env.STORAGE_TYPE;

  // Default to "memory" if not set
  if (!rawStorageType) {
    logger.debug(
      "[conversationMemoryFactory] No storage type configured, using default",
      {
        storageType: "memory",
        fromEnv: false,
      },
    );
    return "memory";
  }

  // Normalize: trim and convert to lowercase
  const normalizedStorageType = rawStorageType.trim().toLowerCase();

  // Validate against allowed StorageType values
  const validStorageTypes: StorageType[] = ["memory", "redis"];

  if (validStorageTypes.includes(normalizedStorageType as StorageType)) {
    logger.debug("[conversationMemoryFactory] Determined storage type", {
      storageType: normalizedStorageType,
      fromEnv: true,
      envValue: rawStorageType,
      normalized: normalizedStorageType !== rawStorageType,
    });
    return normalizedStorageType as StorageType;
  } else {
    // Invalid storage type, log warning and return default
    logger.warn(
      `[conversationMemoryFactory] Unrecognized storage type in environment: "${rawStorageType}", falling back to "memory"`,
      {
        providedValue: rawStorageType,
        normalizedValue: normalizedStorageType,
        validValues: validStorageTypes,
        usingDefault: true,
      },
    );
    return "memory";
  }
}

/**
 * Get Redis configuration from environment variables
 */
export function getRedisConfigFromEnv(): RedisStorageConfig {
  logger.debug(
    "[conversationMemoryFactory] Reading Redis configuration from environment",
    {
      REDIS_HOST: process.env.REDIS_HOST || "(not set)",
      REDIS_PORT: process.env.REDIS_PORT || "(not set)",
      REDIS_PASSWORD: process.env.REDIS_PASSWORD ? "******" : "(not set)",
      REDIS_DB: process.env.REDIS_DB || "(not set)",
      REDIS_KEY_PREFIX: process.env.REDIS_KEY_PREFIX || "(not set)",
      REDIS_TTL: process.env.REDIS_TTL || "(not set)",
      REDIS_CONNECT_TIMEOUT: process.env.REDIS_CONNECT_TIMEOUT || "(not set)",
      REDIS_MAX_RETRIES: process.env.REDIS_MAX_RETRIES || "(not set)",
      REDIS_RETRY_DELAY: process.env.REDIS_RETRY_DELAY || "(not set)",
    },
  );

  const config = {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : undefined,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB ? Number(process.env.REDIS_DB) : undefined,
    keyPrefix: process.env.REDIS_KEY_PREFIX,
    ttl: process.env.REDIS_TTL ? Number(process.env.REDIS_TTL) : undefined,
    connectionOptions: {
      connectTimeout: process.env.REDIS_CONNECT_TIMEOUT
        ? Number(process.env.REDIS_CONNECT_TIMEOUT)
        : undefined,
      maxRetriesPerRequest: process.env.REDIS_MAX_RETRIES
        ? Number(process.env.REDIS_MAX_RETRIES)
        : undefined,
      retryDelayOnFailover: process.env.REDIS_RETRY_DELAY
        ? Number(process.env.REDIS_RETRY_DELAY)
        : undefined,
    },
  };

  logger.debug("[conversationMemoryFactory] Redis configuration normalized", {
    host: config.host || "localhost",
    port: config.port || 6379,
    hasPassword: !!config.password,
    db: config.db || 0,
    keyPrefix: config.keyPrefix || "neurolink:conversation:",
    ttl: config.ttl || 86400,
    hasConnectionOptions: !!config.connectionOptions,
  });

  return config;
}
