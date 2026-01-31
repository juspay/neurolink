/**
 * Working Memory Storage Backends
 *
 * Storage implementations for persisting working memory data.
 *
 * @module memory/storage/workingMemoryStorage
 * @since 9.0.0
 */

import type {
  RedisStorageConfig,
  WorkingMemoryStorage,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { createRedisClient, getNormalizedConfig } from "../../utils/redis.js";

/**
 * In-memory working memory storage
 *
 * Simple Map-based storage for development and testing
 */
export class InMemoryWorkingMemoryStorage implements WorkingMemoryStorage {
  private data: Map<string, string | Record<string, unknown>> = new Map();

  /**
   * Get storage key
   */
  private getKey(resourceId: string, threadId?: string): string {
    return threadId ? `${resourceId}:${threadId}` : resourceId;
  }

  /**
   * Get working memory
   */
  async get(
    resourceId: string,
    threadId?: string,
  ): Promise<string | Record<string, unknown> | null> {
    const key = this.getKey(resourceId, threadId);
    return this.data.get(key) ?? null;
  }

  /**
   * Set working memory
   */
  async set(
    resourceId: string,
    threadId: string | undefined,
    data: string | Record<string, unknown>,
  ): Promise<void> {
    const key = this.getKey(resourceId, threadId);
    this.data.set(key, data);
  }

  /**
   * Delete working memory
   */
  async delete(resourceId: string, threadId?: string): Promise<void> {
    const key = this.getKey(resourceId, threadId);
    this.data.delete(key);
  }

  /**
   * Close storage
   */
  async close(): Promise<void> {
    this.data.clear();
  }
}

/**
 * Redis-based working memory storage
 *
 * Persistent storage for production use
 */
export class RedisWorkingMemoryStorage implements WorkingMemoryStorage {
  private client: Awaited<ReturnType<typeof createRedisClient>> | null = null;
  private config: Required<RedisStorageConfig>;
  private keyPrefix: string;
  private isInitialized = false;

  constructor(
    redisConfig: RedisStorageConfig,
    keyPrefix = "neurolink:working_memory:",
  ) {
    this.config = getNormalizedConfig(redisConfig);
    this.keyPrefix = keyPrefix;
  }

  /**
   * Initialize Redis connection
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (!this.client) {
      this.client = await createRedisClient(this.config);
    }

    this.isInitialized = true;

    logger.debug("[RedisWorkingMemoryStorage] Initialized", {
      host: this.config.host,
      port: this.config.port,
      keyPrefix: this.keyPrefix,
    });
  }

  /**
   * Get storage key
   */
  private getKey(resourceId: string, threadId?: string): string {
    return threadId
      ? `${this.keyPrefix}${resourceId}:${threadId}`
      : `${this.keyPrefix}${resourceId}`;
  }

  /**
   * Get working memory
   */
  async get(
    resourceId: string,
    threadId?: string,
  ): Promise<string | Record<string, unknown> | null> {
    await this.initialize();

    if (!this.client) {
      return null;
    }

    const key = this.getKey(resourceId, threadId);
    const raw = await this.client.get(key);
    const data = raw ? String(raw) : null;

    if (!data) {
      return null;
    }

    // Try to parse as JSON, otherwise return as string
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }

  /**
   * Set working memory
   */
  async set(
    resourceId: string,
    threadId: string | undefined,
    data: string | Record<string, unknown>,
  ): Promise<void> {
    await this.initialize();

    if (!this.client) {
      return;
    }

    const key = this.getKey(resourceId, threadId);
    const serialized = typeof data === "string" ? data : JSON.stringify(data);

    await this.client.set(key, serialized);

    // Apply TTL if configured
    if (this.config.ttl > 0) {
      await this.client.expire(key, this.config.ttl);
    }

    logger.debug("[RedisWorkingMemoryStorage] Set working memory", {
      resourceId,
      threadId,
      keyLength: serialized.length,
    });
  }

  /**
   * Delete working memory
   */
  async delete(resourceId: string, threadId?: string): Promise<void> {
    await this.initialize();

    if (!this.client) {
      return;
    }

    const key = this.getKey(resourceId, threadId);
    await this.client.del(key);

    logger.debug("[RedisWorkingMemoryStorage] Deleted working memory", {
      resourceId,
      threadId,
    });
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isInitialized = false;
    }

    logger.debug("[RedisWorkingMemoryStorage] Closed");
  }
}

/**
 * Create working memory storage based on type
 */
export function createWorkingMemoryStorage(
  type: "memory" | "redis",
  redisConfig?: RedisStorageConfig,
): WorkingMemoryStorage {
  if (type === "redis" && redisConfig) {
    return new RedisWorkingMemoryStorage(redisConfig);
  }

  return new InMemoryWorkingMemoryStorage();
}
