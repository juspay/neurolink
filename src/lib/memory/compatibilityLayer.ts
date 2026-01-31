/**
 * Compatibility Layer
 *
 * Converts legacy ConversationMemoryConfig to ThreeLayerMemoryConfig
 * for backward compatibility with existing NeuroLink configurations.
 *
 * @module memory/compatibilityLayer
 * @since 9.0.0
 */

import type {
  ConversationMemoryConfig,
  RedisStorageConfig,
  ThreeLayerMemoryConfig,
} from "../types/index.js";
import { logger } from "../utils/logger.js";

/**
 * Check if configuration is legacy format
 *
 * Legacy format has properties like:
 * - enabled: boolean
 * - maxSessions?: number
 * - maxTurnsPerSession?: number
 * - storage?: "memory" | "redis"
 * - redis?: RedisStorageConfig
 *
 * New format has properties like:
 * - enabled: boolean
 * - storage: { type: "memory" | "redis", redis?: ... }
 * - conversationHistory?: { ... }
 * - semanticRecall?: { ... }
 * - workingMemory?: { ... }
 */
export function isLegacyMemoryConfig(config: Record<string, unknown>): boolean {
  // Check for new format markers
  if (
    "conversationHistory" in config ||
    "semanticRecall" in config ||
    "workingMemory" in config
  ) {
    return false;
  }

  // Check for legacy format markers
  if (
    "maxSessions" in config ||
    "maxTurnsPerSession" in config ||
    "tokenThreshold" in config ||
    ("storage" in config && typeof config.storage === "string")
  ) {
    return true;
  }

  // If only has "enabled" and/or "redis", check storage type
  if ("storage" in config && typeof config.storage === "object") {
    return false; // New format
  }

  // Default to legacy if has redis config at top level
  if ("redis" in config) {
    return true;
  }

  return false;
}

/**
 * Convert legacy ConversationMemoryConfig to ThreeLayerMemoryConfig
 *
 * Maps legacy properties to the new three-layer format:
 * - redisConfig -> storage: { type: "redis", redis: { ... } }
 * - maxTurnsPerSession -> conversationHistory.lastMessages
 * - tokenThreshold -> conversationHistory.tokenThreshold
 * - enableSummarization -> conversationHistory.enableSummarization
 */
export function convertLegacyConfig(
  legacyConfig: ConversationMemoryConfig,
): ThreeLayerMemoryConfig {
  logger.debug(
    "[CompatibilityLayer] Converting legacy config to three-layer format",
    {
      maxTurnsPerSession: legacyConfig.maxTurnsPerSession,
      hasRedisConfig: !!legacyConfig.redisConfig,
    },
  );

  // Determine storage type based on presence of redisConfig
  const storageType = legacyConfig.redisConfig ? "redis" : "memory";

  // Build new config
  const newConfig: ThreeLayerMemoryConfig = {
    enabled: legacyConfig.enabled,
    storage: {
      type: storageType,
      ...(storageType === "redis" && legacyConfig.redisConfig
        ? { redis: legacyConfig.redisConfig }
        : {}),
    },
    conversationHistory: {
      enabled: true,
      // Convert maxTurnsPerSession to lastMessages (multiply by 2 for user+assistant pairs)
      lastMessages: legacyConfig.maxTurnsPerSession
        ? legacyConfig.maxTurnsPerSession * 2
        : 40,
      tokenThreshold: legacyConfig.tokenThreshold,
      enableSummarization: legacyConfig.enableSummarization,
      // Preserve summarization provider/model if specified
      summarizationProvider: legacyConfig.summarizationProvider,
      summarizationModel: legacyConfig.summarizationModel,
    },
    // Semantic recall and working memory are disabled by default in legacy mode
    semanticRecall: undefined,
    workingMemory: undefined,
  };

  logger.info("[CompatibilityLayer] Converted legacy config", {
    hasRedisConfig: !!legacyConfig.redisConfig,
    newStorageType: storageType,
    lastMessages: newConfig.conversationHistory?.lastMessages,
  });

  return newConfig;
}

/**
 * Normalize any memory config to ThreeLayerMemoryConfig
 *
 * Handles both legacy and new formats transparently.
 */
export function normalizeMemoryConfig(
  config:
    | ConversationMemoryConfig
    | ThreeLayerMemoryConfig
    | Record<string, unknown>,
): ThreeLayerMemoryConfig {
  // Check if already new format
  if (!isLegacyMemoryConfig(config as Record<string, unknown>)) {
    return config as ThreeLayerMemoryConfig;
  }

  // Convert from legacy format
  return convertLegacyConfig(config as ConversationMemoryConfig);
}

/**
 * Extract Redis config from either legacy or new format
 */
export function extractRedisConfig(
  config:
    | ConversationMemoryConfig
    | ThreeLayerMemoryConfig
    | Record<string, unknown>,
): RedisStorageConfig | undefined {
  // New format
  if ("storage" in config && typeof config.storage === "object") {
    const storage = config.storage as {
      type: string;
      redis?: RedisStorageConfig;
    };
    return storage.redis;
  }

  // Legacy format
  if ("redis" in config) {
    return config.redis as RedisStorageConfig;
  }

  return undefined;
}

/**
 * Check if config enables Redis storage
 */
export function isRedisEnabled(
  config:
    | ConversationMemoryConfig
    | ThreeLayerMemoryConfig
    | Record<string, unknown>,
): boolean {
  // New format
  if ("storage" in config && typeof config.storage === "object") {
    const storage = config.storage as { type: string };
    return storage.type === "redis";
  }

  // Legacy format
  if ("storage" in config && typeof config.storage === "string") {
    return config.storage === "redis";
  }

  return false;
}
