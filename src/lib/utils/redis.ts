/**
 * Redis Utilities for NeuroLink
 * Helper functions for Redis storage operations
 */

import { Redis, Cluster, type RedisOptions, type ClusterNode } from "ioredis";
import { logger } from "./logger.js";
import type {
  ChatMessage,
  RedisStorageConfig,
  RedisConversationObject,
} from "../types/conversation.js";

// Redis client type
export type RedisClient = Redis | Cluster;

/**
 * Creates a Redis client (standalone or cluster) with the provided configuration
 */
export async function createRedisClient(
  config: Required<RedisStorageConfig>,
): Promise<RedisClient> {
  const isCluster = config.isCluster ?? false;
  const baseOptions: RedisOptions = {
    // Do not send AUTH when password is absent
    password: config.password && config.password.length > 0 ? config.password : undefined,
    db: config.db,
    connectTimeout: config.connectionOptions?.connectTimeout ?? 30000,
    maxRetriesPerRequest: config.connectionOptions?.maxRetriesPerRequest ?? 3,
    // Add more options as needed
  };

  let client: RedisClient;

  if (isCluster) {
    // Cluster mode
    const startupNodes: ClusterNode[] = [
      { host: config.host, port: config.port },
      // Add more nodes if needed
    ];
    client = new Cluster(startupNodes, { redisOptions: baseOptions });

    client.on("error", (err: Error) => {
      logger.error("[RedisCluster] Error", { error: err.message });
    });
    client.on("connect", () => {
      logger.debug("[RedisCluster] Connected");
    });
  } else {
    // Standalone mode
    client = new Redis({
      ...baseOptions,
      host: config.host,
      port: config.port,
    });

    client.on("error", (err: Error) => {
      logger.error("[Redis] Error", { error: err.message });
    });
    client.on("connect", () => {
      logger.debug("[Redis] Connected", {
        host: config.host,
        port: config.port,
        db: config.db,
      });
    });
  }

  // ioredis connects automatically, but you can wait for ready if needed
  // await client.connect(); // Not required for ioredis

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
  logger.debug("[redisUtils] Starting SCAN operation", { pattern, batchSize });

  const allKeys: Set<string> = new Set();

  if (client instanceof Cluster) {
    // Cluster mode: scan all master nodes
    const masters = client.nodes("master");
    logger.debug(
      "[redisUtils] Cluster mode detected, scanning all master nodes",
      {
        masterCount: masters.length,
      },
    );
    for (const node of masters) {
      let cursor = "0";
      let nodeIterations = 0;
      do {
        nodeIterations++;
        const [nextCursor, keys] = await node.scan(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          batchSize,
        );
        cursor = nextCursor;
        keys.forEach((k: string) => allKeys.add(k));
        logger.debug("[redisUtils] SCAN iteration (cluster node)", {
          node: node.options?.host + ":" + node.options?.port,
          nodeIterations,
          currentCursor: cursor,
          keysInBatch: keys.length,
          totalKeysFound: allKeys.size,
        });
      } while (cursor !== "0");
    }
  } else {
    // Standalone mode
    let cursor = "0";
    let iterations = 0;
    do {
      iterations++;
      const [nextCursor, keys] = await client.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        batchSize,
      );
      cursor = nextCursor;
      keys.forEach((k: string) => allKeys.add(k));
      logger.debug("[redisUtils] SCAN iteration (standalone)", {
        iteration: iterations,
        currentCursor: cursor,
        keysInBatch: keys.length,
        totalKeysFound: allKeys.size,
      });
    } while (cursor !== "0");
  }

  logger.info("[redisUtils] SCAN operation completed", {
    pattern,
    totalKeysFound: allKeys.size,
  });

  return Array.from(allKeys);
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
    isCluster: config.isCluster ?? false,
    connectionOptions: {
      connectTimeout: 30000,
      lazyConnect: true,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      // clusterMode: false by default, set to true for cluster
      ...config.connectionOptions,
    },
  };
}
