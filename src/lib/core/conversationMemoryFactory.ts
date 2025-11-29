/**
 * Conversation Memory Factory for NeuroLink
 * Creates appropriate conversation memory manager based on configuration
 */

import type {
  ConversationMemoryConfig,
  RedisStorageConfig,
  DiskStorageConfig,
} from "../types/conversation.js";
import type { StorageType } from "../types/common.js";
import { ConversationMemoryManager } from "./conversationMemoryManager.js";
import { RedisConversationMemoryManager } from "./redisConversationMemoryManager.js";
import { DiskConversationMemoryManager } from "./diskConversationMemoryManager.js";
import { logger } from "../utils/logger.js";

/**
 * Creates a conversation memory manager based on configuration
 * BACKWARD COMPATIBLE: Supports both old and new calling patterns
 */
export function createConversationMemoryManager(
  config: ConversationMemoryConfig,
  storageType?: StorageType,
  redisConfig?: RedisStorageConfig,
):
  | ConversationMemoryManager
  | RedisConversationMemoryManager
  | DiskConversationMemoryManager {
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

  // Disk storage
  if (storageType === "disk") {
    const diskConfig = getDiskConfigFromEnv();
    if (!diskConfig.storagePath) {
      throw new Error(
        "Disk storage requires a storagePath in the configuration.",
      );
    }
    return new DiskConversationMemoryManager(config, diskConfig);
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
  const validStorageTypes: StorageType[] = ["memory", "redis", "disk"];

  if (validStorageTypes.indexOf(normalizedStorageType as StorageType) > -1) {
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
  return config;
}

/**
 * Get Disk configuration from environment variables
 */
export function getDiskConfigFromEnv(): DiskStorageConfig {
  const config = {
    storagePath: process.env.DISK_STORAGE_PATH,
    format: process.env.DISK_STORAGE_FORMAT as "json" | "jsonl" | undefined,
    compression: process.env.DISK_STORAGE_COMPRESSION as
      | "none"
      | "gzip"
      | undefined,
    ttl: process.env.DISK_STORAGE_TTL
      ? Number(process.env.DISK_STORAGE_TTL)
      : undefined,
    maxFileSize: process.env.DISK_STORAGE_MAX_FILE_SIZE,
    enableBackup: process.env.DISK_STORAGE_ENABLE_BACKUP === "true",
    backupRetention: process.env.DISK_STORAGE_BACKUP_RETENTION
      ? Number(process.env.DISK_STORAGE_BACKUP_RETENTION)
      : undefined,
    enableEncryption: process.env.DISK_ENABLE_ENCRYPTION === "true",
    encryptionKey: process.env.DISK_ENCRYPTION_KEY,
    filePermissions: process.env.DISK_FILE_PERMISSIONS,
  };
  // We only return a partial config, the manager will fill in defaults
  // But storagePath is essential.
  return config as DiskStorageConfig;
}
