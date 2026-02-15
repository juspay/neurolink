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

// Connection pool - keyed by host:port:db
const connectionPool = new Map<
  string,
  { client: RedisClient; refCount: number }
>();
const pendingConnections = new Map<string, Promise<RedisClient>>();

/**
 * Get a pooled Redis connection. Multiple callers with the same host:port:db
 * share a single connection, reducing connection count.
 */
export async function getPooledRedisClient(
  config: Required<RedisStorageConfig>,
): Promise<RedisClient> {
  const key = `${config.host}:${config.port}:${config.db}:${config.password ? "auth" : "noauth"}`;
  const existing = connectionPool.get(key);

  if (existing && existing.client.isOpen) {
    existing.refCount++;
    logger.debug("[Redis] Reusing pooled connection", {
      key,
      refCount: existing.refCount,
    });
    return existing.client;
  }

  // Check pending BEFORE cleaning up stale entries to prevent TOCTOU race:
  // Two callers seeing a stale entry could both skip this check and both
  // attempt to create new connections if we cleaned up first.
  const pending = pendingConnections.get(key);
  if (pending) {
    const client = await pending;
    const entry = connectionPool.get(key);
    if (entry) {
      if (!entry.client.isOpen) {
        // Client was closed while awaiting; clean up and create fresh
        connectionPool.delete(key);
        const freshClient = await createRedisClient(config);
        connectionPool.set(key, { client: freshClient, refCount: 1 });
        return freshClient;
      }
      entry.refCount++;
    } else if (client.isOpen) {
      // Entry was released while we awaited; re-register
      connectionPool.set(key, { client, refCount: 1 });
    } else {
      // Client was closed while we awaited; create fresh connection
      const freshClient = await createRedisClient(config);
      connectionPool.set(key, { client: freshClient, refCount: 1 });
      return freshClient;
    }
    return client;
  }

  // Clean up stale entry if exists (connection closed)
  if (existing) {
    connectionPool.delete(key);
  }

  // Create the promise and register it in pendingConnections atomically
  // (synchronous) before any await, so concurrent callers will find it.
  const connectPromise = createRedisClient(config);
  pendingConnections.set(key, connectPromise);

  try {
    const client = await connectPromise;
    connectionPool.set(key, { client, refCount: 1 });
    logger.info("[Redis] Created pooled connection", { key, refCount: 1 });
    return client;
  } finally {
    pendingConnections.delete(key);
  }
}

/**
 * Release a pooled Redis connection. Only closes when refCount reaches 0.
 */
export async function releasePooledRedisClient(
  config: Required<RedisStorageConfig>,
): Promise<void> {
  const key = `${config.host}:${config.port}:${config.db}:${config.password ? "auth" : "noauth"}`;
  const entry = connectionPool.get(key);

  if (!entry) {
    return;
  }

  entry.refCount--;
  logger.debug("[Redis] Released pooled connection", {
    key,
    refCount: entry.refCount,
  });

  if (entry.refCount <= 0) {
    try {
      if (entry.client.isOpen) {
        await entry.client.quit();
      }
    } catch (e) {
      logger.warn("[Redis] Error closing pooled connection", {
        key,
        error: String(e),
      });
    }
    connectionPool.delete(key);
    logger.info("[Redis] Closed pooled connection", { key });
  }
}

/**
 * Get stats about the connection pool
 */
export function getPoolStats(): Array<{
  key: string;
  refCount: number;
  isOpen: boolean;
}> {
  return Array.from(connectionPool.entries()).map(([key, entry]) => ({
    key,
    refCount: entry.refCount,
    isOpen: entry.client.isOpen,
  }));
}

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
    return null;
  }

  try {
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
