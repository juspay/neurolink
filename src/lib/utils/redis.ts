/**
 * Redis Utilities for NeuroLink
 * Helper functions for Redis storage operations
 */

import { createClient, type RedisClientOptions } from "redis";
import { logger } from "./logger.js";
import type {
  ChatMessage,
  RedisStorageConfig,
  RedisConversationObject,
} from "../types/conversation.js";

// Redis client type
type RedisClient = ReturnType<typeof createClient>;

/**
 * Creates a Redis client with the provided configuration
 */
export async function createRedisClient(
  config: Required<RedisStorageConfig>,
): Promise<RedisClient> {
  const url = `redis://${config.host}:${config.port}/${config.db}`;

  // Create client options
  const clientOptions: RedisClientOptions = {
    url,
    socket: {
      connectTimeout: config.connectionOptions?.connectTimeout,
      reconnectStrategy: (retries: number) => {
        if (retries > (config.connectionOptions?.maxRetriesPerRequest || 3)) {
          logger.error("Redis connection retries exhausted");
          return new Error("Redis connection retries exhausted");
        }
        const delay = Math.min(
          (config.connectionOptions?.retryDelayOnFailover || 100) *
            Math.pow(2, retries),
          10000,
        );
        return delay;
      },
    },
  };

  if (config.password) {
    clientOptions.password = config.password;
  }

  // Create client with secured options
  const client = createClient(clientOptions);

  client.on("error", (err: Error) => {
    const sanitizedMessage = err.message.replace(
      /redis:\/\/.*?@/g,
      "redis://[redacted]@",
    );
    logger.error("Redis client error", { error: sanitizedMessage });
  });

  client.on("connect", () => {
    logger.debug("Redis client connected", {
      host: config.host,
      port: config.port,
      db: config.db,
    });
  });

  client.on("reconnecting", () => {
    logger.debug("Redis client reconnecting");
  });

  if (!client.isOpen) {
    await client.connect();
  }

  return client;
}

/**
 * Generates a Redis key for session messages
 */
export function getSessionKey(
  config: Required<RedisStorageConfig>,
  sessionId: string,
  userId?: string,
): string {
  const key = `${config.keyPrefix}${userId || "randomUser"}:${sessionId}`;

  logger.debug("[redisUtils] Generated session key", {
    sessionId,
    userId,
    keyPrefix: config.keyPrefix,
    fullKey: key,
  });

  return key;
}

/**
 * Generates a Redis key for user sessions mapping
 */
export function getUserSessionsKey(
  config: Required<RedisStorageConfig>,
  userId: string,
): string {
  return `${config.userSessionsKeyPrefix}${userId}`;
}

/**
 * Serializes conversation object for Redis storage
 */
export function serializeConversation(
  conversation: RedisConversationObject,
): string {
  try {
    const serialized = JSON.stringify(conversation);
    return serialized;
  } catch (error) {
    logger.error("[redisUtils] Failed to serialize conversation", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      sessionId: conversation?.sessionId,
      userId: conversation?.userId,
    });
    throw error;
  }
}

/**
 * Deserializes conversation object from Redis storage
 */
export function deserializeConversation(
  data: string | null,
): RedisConversationObject | null {
  if (!data) {
    logger.debug(
      "[redisUtils] No conversation data to deserialize, returning null",
    );
    return null;
  }

  try {
    logger.debug("[redisUtils] Deserializing conversation", {
      dataLength: data.length,
      dataPreview: data.substring(0, 100) + (data.length > 100 ? "..." : ""),
    });

    // Parse as unknown first, then validate before casting
    const parsedData = JSON.parse(data) as unknown;

    // Check if the parsed data is an object with required properties
    if (
      typeof parsedData !== "object" ||
      parsedData === null ||
      !("title" in parsedData) ||
      !("sessionId" in parsedData) ||
      !("userId" in parsedData) ||
      !("createdAt" in parsedData) ||
      !("updatedAt" in parsedData) ||
      !("messages" in parsedData)
    ) {
      logger.warn(
        "[redisUtils] Deserialized data is not a valid conversation object",
        {
          type: typeof parsedData,
          hasRequiredFields:
            parsedData && typeof parsedData === "object"
              ? Object.keys(parsedData).join(", ")
              : "none",
          preview: JSON.stringify(parsedData).substring(0, 100),
        },
      );
      return null;
    }

    const conversation = parsedData as RedisConversationObject;

    // Validate messages is an array
    if (!Array.isArray(conversation.messages)) {
      logger.warn("[redisUtils] messages is not an array", {
        type: typeof conversation.messages,
      });
      return null;
    }

    // Validate each message in the messages array
    const isValidHistory = conversation.messages.every(
      (m): m is ChatMessage =>
        typeof m === "object" &&
        m !== null &&
        "role" in m &&
        "content" in m &&
        typeof m.role === "string" &&
        typeof m.content === "string" &&
        (m.role === "user" ||
          m.role === "assistant" ||
          m.role === "system" ||
          m.role === "tool_call" ||
          m.role === "tool_result"),
    );

    if (!isValidHistory) {
      logger.warn("[redisUtils] Invalid messages structure", {
        messageCount: conversation.messages.length,
        firstMessage:
          conversation.messages.length > 0
            ? JSON.stringify(conversation.messages[0])
            : null,
      });
      return null;
    }

    logger.debug("[redisUtils] Conversation deserialized successfully", {
      sessionId: conversation.sessionId,
      userId: conversation.userId,
      title: conversation.title,
      messageCount: conversation.messages.length,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    });

    return conversation;
  } catch (error) {
    logger.error("[redisUtils] Failed to deserialize conversation", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      dataLength: data.length,
      dataPreview: "[REDACTED]", // Prevent exposure of potentially sensitive data
    });
    return null;
  }
}

/**
 * Checks if Redis client is healthy
 */
export async function isRedisHealthy(client: RedisClient): Promise<boolean> {
  try {
    const pong = await client.ping();
    return pong === "PONG";
  } catch (error) {
    logger.error("Redis health check failed", { error });
    return false;
  }
}

/**
 * Scan Redis keys matching a pattern without blocking the server
 * This is a non-blocking alternative to the KEYS command
 *
 * @param client Redis client
 * @param pattern Pattern to match keys (e.g. "prefix:*")
 * @param batchSize Number of keys to scan in each iteration (default: 100)
 * @returns Array of keys matching the pattern
 */
export async function scanKeys(
  client: RedisClient,
  pattern: string,
  batchSize: number = 100,
): Promise<string[]> {
  logger.debug("[redisUtils] Starting SCAN operation", {
    pattern,
    batchSize,
  });

  const allKeys: string[] = [];
  let cursor = "0";
  let iterations = 0;
  let totalScanned = 0;

  try {
    do {
      iterations++;
      // Use SCAN instead of KEYS to avoid blocking the server
      const result = await client.scan(cursor, {
        MATCH: pattern,
        COUNT: batchSize,
      });

      // Extract cursor and keys from result
      cursor = result.cursor;
      const keys = result.keys || [];

      // Add keys to result array
      allKeys.push(...keys);
      totalScanned += keys.length;

      logger.debug("[redisUtils] SCAN iteration completed", {
        iteration: iterations,
        currentCursor: cursor,
        keysInBatch: keys.length,
        totalKeysFound: allKeys.length,
      });
    } while (cursor !== "0"); // Continue until cursor is 0

    logger.info("[redisUtils] SCAN operation completed", {
      pattern,
      totalIterations: iterations,
      totalKeysFound: allKeys.length,
      totalScanned,
    });

    return allKeys;
  } catch (error) {
    logger.error("[redisUtils] Error during SCAN operation", {
      pattern,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Get normalized Redis configuration with defaults
 */
export function getNormalizedConfig(
  config: RedisStorageConfig,
): Required<RedisStorageConfig> {
  const keyPrefix = config.keyPrefix || "neurolink:conversation:";

  // Intelligent default: derive user sessions prefix from conversation prefix
  const defaultUserSessionsPrefix = keyPrefix.replace(
    /conversation:?$/,
    "user:sessions:",
  );

  return {
    host: config.host || "localhost",
    port: config.port || 6379,
    password: config.password || "",
    db: config.db || 0,
    keyPrefix,
    userSessionsKeyPrefix:
      config.userSessionsKeyPrefix || defaultUserSessionsPrefix,
    ttl: config.ttl || 86400,
    connectionOptions: {
      connectTimeout: 30000,
      lazyConnect: true,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      ...config.connectionOptions,
    },
  };
}
