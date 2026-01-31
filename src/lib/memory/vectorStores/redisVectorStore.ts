/**
 * Redis Vector Store
 *
 * Vector store implementation using Redis Stack with RediSearch for vector similarity search.
 * Requires Redis Stack 7.2+ with the RediSearch module.
 *
 * @module memory/vectorStores/redisVectorStore
 * @since 9.0.0
 */

import type {
  CollectionConfig,
  RedisVectorConfig,
  VectorDeleteFilter,
  VectorEntry,
  VectorSearchQuery,
  VectorSearchResult,
  MemoryVectorStore,
  VectorStoreStats,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";

import type { MemoryRedisClientType } from "../../types/index.js";

/**
 * Redis Vector Store using Redis Stack with RediSearch
 *
 * Features:
 * - HNSW algorithm for efficient approximate nearest neighbor search
 * - JSON document storage with vector embeddings
 * - Metadata filtering using TAG and TEXT indexes
 * - Batch operations via pipelining
 *
 * Prerequisites:
 * - Redis Stack 7.2+ with RediSearch module
 * - redis npm package
 */
export class RedisVectorStore implements MemoryVectorStore {
  private client: MemoryRedisClientType | null = null;
  private config: RedisVectorConfig;
  private collectionConfig?: CollectionConfig;
  private indexName: string;
  private isInitialized = false;

  constructor(config: RedisVectorConfig) {
    this.config = config;
    this.indexName = config.indexName ?? "neurolink_vectors";
  }

  /**
   * Initialize the Redis connection
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Dynamic import to avoid bundling issues
      const redis = await import("redis");

      const url =
        this.config.url ??
        `redis://${this.config.host ?? "localhost"}:${this.config.port ?? 6379}`;

      this.client = redis.createClient({
        url,
        password: this.config.password,
      }) as unknown as MemoryRedisClientType;

      await this.client.connect();

      // Test connection
      await this.client.ping();

      this.isInitialized = true;

      logger.info("[RedisVectorStore] Connected to Redis", {
        host: this.config.host ?? "localhost",
        port: this.config.port ?? 6379,
        indexName: this.indexName,
      });
    } catch (error) {
      logger.error("[RedisVectorStore] Failed to connect to Redis", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(
        `Redis connection failed: ${error instanceof Error ? error.message : String(error)}. ` +
          "Ensure Redis Stack is running with RediSearch module enabled.",
        { cause: error },
      );
    }
  }

  /**
   * Create or ensure collection/index exists
   */
  async ensureCollection(config: CollectionConfig): Promise<void> {
    this.collectionConfig = config;

    if (!this.client) {
      throw new Error("Redis client not initialized. Call initialize() first.");
    }

    try {
      // Check if index already exists
      await this.client.ft.info(this.indexName);
      logger.debug("[RedisVectorStore] Index already exists", {
        indexName: this.indexName,
      });
    } catch {
      // Index doesn't exist, create it
      const distanceMetric =
        config.metric === "cosine"
          ? "COSINE"
          : config.metric === "euclidean"
            ? "L2"
            : "IP";

      await this.client.ft.create(
        this.indexName,
        {
          "$.vector": {
            type: "VECTOR",
            AS: "vector",
            ALGORITHM: "HNSW",
            TYPE: "FLOAT32",
            DIM: config.dimensions,
            DISTANCE_METRIC: distanceMetric,
            // HNSW parameters for balanced performance
            M: 16,
            EF_CONSTRUCTION: 200,
          },
          "$.metadata.threadId": { type: "TAG", AS: "threadId" },
          "$.metadata.resourceId": { type: "TAG", AS: "resourceId" },
          "$.metadata.role": { type: "TAG", AS: "role" },
          "$.metadata.messageId": { type: "TAG", AS: "messageId" },
          "$.metadata.timestamp": { type: "TEXT", AS: "timestamp" },
        },
        {
          ON: "JSON",
          PREFIX: `${this.indexName}:`,
        },
      );

      logger.info("[RedisVectorStore] Created index", {
        indexName: this.indexName,
        dimensions: config.dimensions,
        metric: config.metric,
      });
    }
  }

  /**
   * Upsert vectors into the store
   */
  async upsert(vectors: VectorEntry[]): Promise<void> {
    if (!this.client) {
      throw new Error("Redis client not initialized. Call initialize() first.");
    }

    if (vectors.length === 0) {
      return;
    }

    const pipeline = this.client.multi();

    for (const entry of vectors) {
      const key = `${this.indexName}:${entry.id}`;
      pipeline.json.set(key, "$", {
        id: entry.id,
        vector: entry.vector,
        metadata: entry.metadata,
      });
    }

    await pipeline.exec();

    logger.debug("[RedisVectorStore] Upserted vectors", {
      count: vectors.length,
      indexName: this.indexName,
    });
  }

  /**
   * Search for similar vectors
   */
  async search(query: VectorSearchQuery): Promise<VectorSearchResult[]> {
    if (!this.client) {
      throw new Error("Redis client not initialized. Call initialize() first.");
    }

    // Build filter string for RediSearch
    const filters: string[] = [];

    if (query.filter?.threadId) {
      const threadIds = Array.isArray(query.filter.threadId)
        ? query.filter.threadId
        : [query.filter.threadId];
      // Escape special characters in thread IDs
      const escapedIds = threadIds.map((id) => this.escapeTagValue(id));
      filters.push(`@threadId:{${escapedIds.join("|")}}`);
    }

    if (query.filter?.resourceId) {
      const escapedId = this.escapeTagValue(query.filter.resourceId);
      filters.push(`@resourceId:{${escapedId}}`);
    }

    if (query.filter?.role) {
      const roles = Array.isArray(query.filter.role)
        ? query.filter.role
        : [query.filter.role];
      const escapedRoles = roles.map((r) => this.escapeTagValue(r));
      filters.push(`@role:{${escapedRoles.join("|")}}`);
    }

    const filterStr = filters.length > 0 ? filters.join(" ") : "*";

    // Convert vector to bytes for Redis (Float32Array buffer)
    const vectorBytes = Buffer.from(new Float32Array(query.vector).buffer);

    try {
      const results = await this.client.ft.search(
        this.indexName,
        `(${filterStr})=>[KNN ${query.topK} @vector $BLOB AS score]`,
        {
          PARAMS: { BLOB: vectorBytes },
          SORTBY: { BY: "score", DIRECTION: "ASC" },
          DIALECT: 2,
          RETURN: ["$.id", "$.metadata", "score"],
        },
      );

      const searchResults: VectorSearchResult[] = [];

      for (const doc of results.documents) {
        const id = doc.value["$.id"] as string;
        const scoreStr = doc.value.score as string;
        const metadataStr = doc.value["$.metadata"] as string;

        // Convert distance to similarity score (cosine distance to similarity)
        const distance = parseFloat(scoreStr);
        const similarity = 1 - distance;

        // Apply threshold filter
        if (query.threshold !== undefined && similarity < query.threshold) {
          continue;
        }

        let metadata: VectorSearchResult["metadata"];
        try {
          metadata = JSON.parse(metadataStr);
        } catch {
          logger.warn("[RedisVectorStore] Failed to parse metadata", {
            id,
            metadata: metadataStr,
          });
          continue;
        }

        searchResults.push({
          id,
          score: similarity,
          metadata,
        });
      }

      logger.debug("[RedisVectorStore] Search completed", {
        query: filterStr,
        topK: query.topK,
        threshold: query.threshold,
        returned: searchResults.length,
      });

      return searchResults;
    } catch (error) {
      logger.error("[RedisVectorStore] Search failed", {
        error: error instanceof Error ? error.message : String(error),
        filter: filterStr,
      });
      throw error;
    }
  }

  /**
   * Delete vectors by filter
   */
  async delete(filter: VectorDeleteFilter): Promise<number> {
    if (!this.client) {
      throw new Error("Redis client not initialized. Call initialize() first.");
    }

    let deleted = 0;

    // Delete by IDs
    if (filter.ids && filter.ids.length > 0) {
      for (const id of filter.ids) {
        const key = `${this.indexName}:${id}`;
        const result = await this.client.json.del(key);
        if (result) {
          deleted++;
        }
      }
    }

    // Delete by threadId or resourceId (requires search first)
    if (filter.threadId || filter.resourceId) {
      const searchFilter = filter.threadId
        ? `@threadId:{${this.escapeTagValue(filter.threadId)}}`
        : `@resourceId:{${this.escapeTagValue(filter.resourceId!)}}`;

      const results = await this.client.ft.search(
        this.indexName,
        searchFilter,
        {
          RETURN: ["$.id"],
          LIMIT: { from: 0, size: 10000 },
        },
      );

      for (const doc of results.documents) {
        const id = doc.value["$.id"] as string;
        const key = `${this.indexName}:${id}`;
        await this.client.json.del(key);
        deleted++;
      }
    }

    logger.debug("[RedisVectorStore] Deleted vectors", {
      filter,
      deleted,
    });

    return deleted;
  }

  /**
   * Get collection statistics
   */
  async getStats(): Promise<VectorStoreStats> {
    if (!this.client) {
      throw new Error("Redis client not initialized. Call initialize() first.");
    }

    try {
      const info = await this.client.ft.info(this.indexName);
      return {
        vectorCount: info.numDocs ?? 0,
        dimensions: this.collectionConfig?.dimensions ?? 0,
        indexSize: info.indexMemUsageMb
          ? info.indexMemUsageMb * 1024 * 1024
          : undefined,
      };
    } catch {
      return {
        vectorCount: 0,
        dimensions: this.collectionConfig?.dimensions ?? 0,
      };
    }
  }

  /**
   * Close the Redis connection
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isInitialized = false;
    }
    logger.debug("[RedisVectorStore] Closed connection");
  }

  /**
   * Escape special characters in TAG values for RediSearch
   */
  private escapeTagValue(value: string): string {
    // Escape special characters: , . < > { } [ ] " ' : ; ! @ # $ % ^ & * ( ) - + = ~
    return value.replace(/[,.<>{}[\]"':;!@#$%^&*()\-+=~]/g, "\\$&");
  }
}
