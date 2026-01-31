/**
 * Qdrant Vector Store
 *
 * Vector store implementation using Qdrant - a high-performance vector database.
 * Supports both cloud-hosted and self-hosted Qdrant instances.
 *
 * @module memory/vectorStores/qdrantVectorStore
 * @since 9.0.0
 */

import type {
  CollectionConfig,
  QdrantVectorConfig,
  VectorDeleteFilter,
  VectorEntry,
  VectorSearchQuery,
  VectorSearchResult,
  MemoryVectorStore,
  VectorStoreStats,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";

/**
 * Qdrant distance metric mapping
 */
const DISTANCE_METRICS = {
  cosine: "Cosine",
  euclidean: "Euclid",
  dotProduct: "Dot",
} as const;

/**
 * Qdrant Vector Store
 *
 * Features:
 * - High-performance vector similarity search
 * - Rich filtering capabilities with payload indexing
 * - Support for both Qdrant Cloud and self-hosted instances
 * - Batch operations for efficient data ingestion
 *
 * Prerequisites:
 * - Qdrant instance (cloud or self-hosted)
 * - @qdrant/js-client-rest npm package (optional, uses fetch API)
 */
export class QdrantVectorStore implements MemoryVectorStore {
  private config: QdrantVectorConfig;
  private collectionConfig?: CollectionConfig;
  private baseUrl: string;
  private headers: Record<string, string>;
  private isInitialized = false;

  constructor(config: QdrantVectorConfig) {
    this.config = config;
    this.baseUrl = config.url.replace(/\/$/, ""); // Remove trailing slash

    this.headers = {
      "Content-Type": "application/json",
    };

    if (config.apiKey) {
      this.headers["api-key"] = config.apiKey;
    }
  }

  /**
   * Initialize the Qdrant connection
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Test connection by getting cluster info
      const response = await fetch(`${this.baseUrl}/`, {
        method: "GET",
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`Qdrant connection failed: ${response.statusText}`);
      }

      this.isInitialized = true;

      logger.info("[QdrantVectorStore] Connected to Qdrant", {
        url: this.baseUrl,
        collection: this.config.collectionName,
      });
    } catch (error) {
      logger.error("[QdrantVectorStore] Failed to connect to Qdrant", {
        error: error instanceof Error ? error.message : String(error),
        url: this.baseUrl,
      });
      throw new Error(
        `Qdrant connection failed: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }

  /**
   * Create or ensure collection exists
   */
  async ensureCollection(config: CollectionConfig): Promise<void> {
    this.collectionConfig = config;

    const collectionName = this.config.collectionName;

    try {
      // Check if collection exists
      const checkResponse = await fetch(
        `${this.baseUrl}/collections/${collectionName}`,
        {
          method: "GET",
          headers: this.headers,
        },
      );

      if (checkResponse.ok) {
        logger.debug("[QdrantVectorStore] Collection already exists", {
          collectionName,
        });
        return;
      }

      // Create collection
      const distance =
        DISTANCE_METRICS[config.metric] || DISTANCE_METRICS.cosine;

      const createResponse = await fetch(
        `${this.baseUrl}/collections/${collectionName}`,
        {
          method: "PUT",
          headers: this.headers,
          body: JSON.stringify({
            vectors: {
              size: config.dimensions,
              distance,
            },
            // Create payload indexes for filtering
            payload_schema: {
              threadId: { type: "keyword" },
              resourceId: { type: "keyword" },
              role: { type: "keyword" },
              messageId: { type: "keyword" },
              timestamp: { type: "text" },
            },
          }),
        },
      );

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Failed to create collection: ${errorText}`);
      }

      // Create payload indexes for filtering
      await this.createPayloadIndex(collectionName, "threadId", "keyword");
      await this.createPayloadIndex(collectionName, "resourceId", "keyword");
      await this.createPayloadIndex(collectionName, "role", "keyword");

      logger.info("[QdrantVectorStore] Created collection", {
        collectionName,
        dimensions: config.dimensions,
        metric: config.metric,
      });
    } catch (error) {
      logger.error("[QdrantVectorStore] Failed to ensure collection", {
        error: error instanceof Error ? error.message : String(error),
        collectionName,
      });
      throw error;
    }
  }

  /**
   * Create a payload index for filtering
   */
  private async createPayloadIndex(
    collectionName: string,
    fieldName: string,
    fieldType: "keyword" | "integer" | "float" | "text",
  ): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/collections/${collectionName}/index`, {
        method: "PUT",
        headers: this.headers,
        body: JSON.stringify({
          field_name: fieldName,
          field_schema: fieldType,
        }),
      });
    } catch (error) {
      // Index may already exist, log and continue
      logger.debug("[QdrantVectorStore] Payload index creation note", {
        fieldName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Upsert vectors into the store
   */
  async upsert(vectors: VectorEntry[]): Promise<void> {
    if (vectors.length === 0) {
      return;
    }

    const collectionName = this.config.collectionName;

    // Convert to Qdrant point format
    const points = vectors.map((entry) => ({
      id: entry.id,
      vector: entry.vector,
      payload: entry.metadata,
    }));

    // Batch upsert (Qdrant handles large batches well, but we chunk for safety)
    const batchSize = 100;
    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize);

      const response = await fetch(
        `${this.baseUrl}/collections/${collectionName}/points`,
        {
          method: "PUT",
          headers: this.headers,
          body: JSON.stringify({
            points: batch,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upsert vectors: ${errorText}`);
      }
    }

    logger.debug("[QdrantVectorStore] Upserted vectors", {
      count: vectors.length,
      collectionName,
    });
  }

  /**
   * Search for similar vectors
   */
  async search(query: VectorSearchQuery): Promise<VectorSearchResult[]> {
    const collectionName = this.config.collectionName;

    // Build Qdrant filter
    const filter = this.buildFilter(query.filter);

    const searchRequest: Record<string, unknown> = {
      vector: query.vector,
      limit: query.topK,
      with_payload: true,
    };

    if (filter) {
      searchRequest.filter = filter;
    }

    if (query.threshold !== undefined) {
      searchRequest.score_threshold = query.threshold;
    }

    const response = await fetch(
      `${this.baseUrl}/collections/${collectionName}/points/search`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(searchRequest),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Search failed: ${errorText}`);
    }

    const result = (await response.json()) as {
      result: Array<{
        id: string;
        score: number;
        payload: VectorSearchResult["metadata"];
      }>;
    };

    const searchResults: VectorSearchResult[] = result.result.map((item) => ({
      id: item.id,
      score: item.score,
      metadata: item.payload,
    }));

    logger.debug("[QdrantVectorStore] Search completed", {
      collectionName,
      topK: query.topK,
      threshold: query.threshold,
      returned: searchResults.length,
    });

    return searchResults;
  }

  /**
   * Build Qdrant filter from VectorFilter
   */
  private buildFilter(
    filter?: VectorSearchQuery["filter"],
  ): Record<string, unknown> | undefined {
    if (!filter) {
      return undefined;
    }

    const must: Array<Record<string, unknown>> = [];

    if (filter.threadId) {
      const threadIds = Array.isArray(filter.threadId)
        ? filter.threadId
        : [filter.threadId];

      if (threadIds.length === 1) {
        must.push({
          key: "threadId",
          match: { value: threadIds[0] },
        });
      } else {
        must.push({
          should: threadIds.map((id) => ({
            key: "threadId",
            match: { value: id },
          })),
        });
      }
    }

    if (filter.resourceId) {
      must.push({
        key: "resourceId",
        match: { value: filter.resourceId },
      });
    }

    if (filter.role) {
      const roles = Array.isArray(filter.role) ? filter.role : [filter.role];

      if (roles.length === 1) {
        must.push({
          key: "role",
          match: { value: roles[0] },
        });
      } else {
        must.push({
          should: roles.map((role) => ({
            key: "role",
            match: { value: role },
          })),
        });
      }
    }

    if (filter.timestampRange) {
      if (filter.timestampRange.start) {
        must.push({
          key: "timestamp",
          range: { gte: filter.timestampRange.start },
        });
      }
      if (filter.timestampRange.end) {
        must.push({
          key: "timestamp",
          range: { lte: filter.timestampRange.end },
        });
      }
    }

    if (must.length === 0) {
      return undefined;
    }

    return { must };
  }

  /**
   * Delete vectors by filter
   */
  async delete(filter: VectorDeleteFilter): Promise<number> {
    const collectionName = this.config.collectionName;
    let deleted = 0;

    // Delete by IDs
    if (filter.ids && filter.ids.length > 0) {
      const response = await fetch(
        `${this.baseUrl}/collections/${collectionName}/points/delete`,
        {
          method: "POST",
          headers: this.headers,
          body: JSON.stringify({
            points: filter.ids,
          }),
        },
      );

      if (response.ok) {
        deleted += filter.ids.length;
      }
    }

    // Delete by threadId
    if (filter.threadId) {
      const response = await fetch(
        `${this.baseUrl}/collections/${collectionName}/points/delete`,
        {
          method: "POST",
          headers: this.headers,
          body: JSON.stringify({
            filter: {
              must: [
                {
                  key: "threadId",
                  match: { value: filter.threadId },
                },
              ],
            },
          }),
        },
      );

      if (response.ok) {
        // We don't know exact count, estimate
        deleted += 1;
      }
    }

    // Delete by resourceId
    if (filter.resourceId) {
      const response = await fetch(
        `${this.baseUrl}/collections/${collectionName}/points/delete`,
        {
          method: "POST",
          headers: this.headers,
          body: JSON.stringify({
            filter: {
              must: [
                {
                  key: "resourceId",
                  match: { value: filter.resourceId },
                },
              ],
            },
          }),
        },
      );

      if (response.ok) {
        deleted += 1;
      }
    }

    logger.debug("[QdrantVectorStore] Deleted vectors", {
      filter,
      deleted,
    });

    return deleted;
  }

  /**
   * Get collection statistics
   */
  async getStats(): Promise<VectorStoreStats> {
    const collectionName = this.config.collectionName;

    try {
      const response = await fetch(
        `${this.baseUrl}/collections/${collectionName}`,
        {
          method: "GET",
          headers: this.headers,
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to get collection stats: ${response.statusText}`,
        );
      }

      const result = (await response.json()) as {
        result: {
          points_count: number;
          vectors_count?: number;
          config: {
            params: {
              vectors: {
                size: number;
              };
            };
          };
        };
      };

      return {
        vectorCount: result.result.points_count,
        dimensions:
          result.result.config?.params?.vectors?.size ??
          this.collectionConfig?.dimensions ??
          0,
      };
    } catch (error) {
      logger.warn("[QdrantVectorStore] Failed to get stats", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        vectorCount: 0,
        dimensions: this.collectionConfig?.dimensions ?? 0,
      };
    }
  }

  /**
   * Close the connection
   */
  async close(): Promise<void> {
    // Qdrant uses HTTP, no persistent connection to close
    this.isInitialized = false;
    logger.debug("[QdrantVectorStore] Closed");
  }
}
