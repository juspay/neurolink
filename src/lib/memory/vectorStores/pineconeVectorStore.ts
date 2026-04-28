/**
 * Pinecone Vector Store
 *
 * Vector store implementation using Pinecone - a fully managed vector database.
 * Supports serverless and pod-based indexes with namespace scoping.
 *
 * @module memory/vectorStores/pineconeVectorStore
 * @since 9.0.0
 */

import type {
  CollectionConfig,
  PineconeVectorConfig,
  VectorDeleteFilter,
  VectorEntry,
  VectorSearchQuery,
  VectorSearchResult,
  MemoryVectorStore,
  VectorStoreStats,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";

import type {
  MemoryPineconeIndexStats,
  MemoryPineconeQueryResponse,
} from "../../types/index.js";

/**
 * Pinecone Vector Store
 *
 * Features:
 * - Serverless and pod-based index support
 * - Namespace-based data isolation
 * - Rich metadata filtering
 * - High-performance similarity search
 *
 * Prerequisites:
 * - Pinecone account and API key
 * - Pre-created index in Pinecone console or via API
 */
export class PineconeVectorStore implements MemoryVectorStore {
  private config: PineconeVectorConfig;
  private collectionConfig?: CollectionConfig;
  private indexHost?: string;
  private isInitialized = false;

  constructor(config: PineconeVectorConfig) {
    this.config = config;
  }

  /**
   * Initialize the Pinecone connection
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (!this.config.apiKey) {
      throw new Error(
        "Pinecone API key not configured. Provide apiKey in config.",
      );
    }

    if (!this.config.indexName) {
      throw new Error(
        "Pinecone index name not configured. Provide indexName in config.",
      );
    }

    try {
      // Get the index host from Pinecone control plane
      const controlPlaneUrl = `https://api.pinecone.io/indexes/${this.config.indexName}`;

      const response = await fetch(controlPlaneUrl, {
        method: "GET",
        headers: {
          "Api-Key": this.config.apiKey,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(
            `Index '${this.config.indexName}' not found. Create it in the Pinecone console or via API first.`,
          );
        }
        const errorText = await response.text();
        throw new Error(
          `Failed to get index info: ${response.status} - ${errorText}`,
        );
      }

      const indexInfo = (await response.json()) as {
        host: string;
        name: string;
        dimension: number;
        metric: string;
        status: { ready: boolean; state: string };
      };

      if (!indexInfo.status.ready) {
        throw new Error(
          `Index '${this.config.indexName}' is not ready. State: ${indexInfo.status.state}`,
        );
      }

      this.indexHost = indexInfo.host;
      this.isInitialized = true;

      logger.info("[PineconeVectorStore] Connected to Pinecone", {
        indexName: this.config.indexName,
        host: this.indexHost,
        dimension: indexInfo.dimension,
        metric: indexInfo.metric,
        namespace: this.config.namespace ?? "default",
      });
    } catch (error) {
      logger.error("[PineconeVectorStore] Failed to connect to Pinecone", {
        error: error instanceof Error ? error.message : String(error),
        indexName: this.config.indexName,
      });
      throw error;
    }
  }

  /**
   * Get the base URL for data plane operations
   */
  private getDataPlaneUrl(): string {
    if (!this.indexHost) {
      throw new Error("Pinecone not initialized. Call initialize() first.");
    }
    return `https://${this.indexHost}`;
  }

  /**
   * Get headers for Pinecone API requests
   */
  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "Api-Key": this.config.apiKey,
    };
  }

  /**
   * Create or ensure collection exists
   * Note: Pinecone indexes must be created via console or control plane API
   */
  async ensureCollection(config: CollectionConfig): Promise<void> {
    this.collectionConfig = config;

    // Pinecone indexes are pre-created, we just verify it exists
    if (!this.isInitialized) {
      await this.initialize();
    }

    logger.debug("[PineconeVectorStore] Collection configuration stored", {
      indexName: this.config.indexName,
      namespace: this.config.namespace,
      dimensions: config.dimensions,
      metric: config.metric,
    });
  }

  /**
   * Upsert vectors into the store
   */
  async upsert(vectors: VectorEntry[]): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (vectors.length === 0) {
      return;
    }

    const baseUrl = this.getDataPlaneUrl();

    // Convert to Pinecone format
    const pineconeVectors = vectors.map((entry) => ({
      id: entry.id,
      values: entry.vector,
      metadata: entry.metadata,
    }));

    // Batch upsert (Pinecone recommends max 100 vectors per request)
    const batchSize = 100;
    for (let i = 0; i < pineconeVectors.length; i += batchSize) {
      const batch = pineconeVectors.slice(i, i + batchSize);

      const requestBody: Record<string, unknown> = {
        vectors: batch,
      };

      if (this.config.namespace) {
        requestBody.namespace = this.config.namespace;
      }

      const response = await fetch(`${baseUrl}/vectors/upsert`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to upsert vectors: ${response.status} - ${errorText}`,
        );
      }
    }

    logger.debug("[PineconeVectorStore] Upserted vectors", {
      count: vectors.length,
      namespace: this.config.namespace,
    });
  }

  /**
   * Search for similar vectors
   */
  async search(query: VectorSearchQuery): Promise<VectorSearchResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const baseUrl = this.getDataPlaneUrl();

    // Build filter for Pinecone
    const filter = this.buildFilter(query.filter);

    const requestBody: Record<string, unknown> = {
      vector: query.vector,
      topK: query.topK,
      includeMetadata: true,
    };

    if (this.config.namespace) {
      requestBody.namespace = this.config.namespace;
    }

    if (filter && Object.keys(filter).length > 0) {
      requestBody.filter = filter;
    }

    const response = await fetch(`${baseUrl}/query`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Search failed: ${response.status} - ${errorText}`);
    }

    const result = (await response.json()) as MemoryPineconeQueryResponse;

    // Filter by threshold if specified (Pinecone returns cosine similarity)
    let matches = result.matches;
    if (query.threshold !== undefined) {
      matches = matches.filter((m) => m.score >= query.threshold!);
    }

    const searchResults: VectorSearchResult[] = matches.map((match) => ({
      id: match.id,
      score: match.score,
      metadata: match.metadata as VectorSearchResult["metadata"],
    }));

    logger.debug("[PineconeVectorStore] Search completed", {
      namespace: this.config.namespace,
      topK: query.topK,
      threshold: query.threshold,
      returned: searchResults.length,
    });

    return searchResults;
  }

  /**
   * Build Pinecone filter from VectorFilter
   */
  private buildFilter(
    filter?: VectorSearchQuery["filter"],
  ): Record<string, unknown> | undefined {
    if (!filter) {
      return undefined;
    }

    const conditions: Record<string, unknown>[] = [];

    if (filter.threadId) {
      if (Array.isArray(filter.threadId)) {
        conditions.push({
          threadId: { $in: filter.threadId },
        });
      } else {
        conditions.push({
          threadId: { $eq: filter.threadId },
        });
      }
    }

    if (filter.resourceId) {
      conditions.push({
        resourceId: { $eq: filter.resourceId },
      });
    }

    if (filter.role) {
      if (Array.isArray(filter.role)) {
        conditions.push({
          role: { $in: filter.role },
        });
      } else {
        conditions.push({
          role: { $eq: filter.role },
        });
      }
    }

    // Note: Pinecone requires numeric fields for range queries
    // timestamp would need to be stored as a Unix timestamp (number) for this to work
    // For now, we skip timestamp range filtering

    if (conditions.length === 0) {
      return undefined;
    }

    if (conditions.length === 1) {
      return conditions[0];
    }

    return { $and: conditions };
  }

  /**
   * Delete vectors by filter
   */
  async delete(filter: VectorDeleteFilter): Promise<number> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const baseUrl = this.getDataPlaneUrl();
    let deleted = 0;

    // Delete by IDs
    if (filter.ids && filter.ids.length > 0) {
      const requestBody: Record<string, unknown> = {
        ids: filter.ids,
      };

      if (this.config.namespace) {
        requestBody.namespace = this.config.namespace;
      }

      const response = await fetch(`${baseUrl}/vectors/delete`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        deleted += filter.ids.length;
      }
    }

    // Delete by metadata filter (threadId or resourceId)
    if (filter.threadId || filter.resourceId) {
      const metadataFilter: Record<string, unknown> = {};

      if (filter.threadId) {
        metadataFilter.threadId = { $eq: filter.threadId };
      }

      if (filter.resourceId) {
        metadataFilter.resourceId = { $eq: filter.resourceId };
      }

      const requestBody: Record<string, unknown> = {
        filter: metadataFilter,
      };

      if (this.config.namespace) {
        requestBody.namespace = this.config.namespace;
      }

      const response = await fetch(`${baseUrl}/vectors/delete`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        // Pinecone doesn't return count of deleted vectors
        // We indicate success with 1
        deleted += 1;
      }
    }

    logger.debug("[PineconeVectorStore] Deleted vectors", {
      filter,
      namespace: this.config.namespace,
      deleted,
    });

    return deleted;
  }

  /**
   * Get collection statistics
   */
  async getStats(): Promise<VectorStoreStats> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const baseUrl = this.getDataPlaneUrl();

    try {
      const response = await fetch(`${baseUrl}/describe_index_stats`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`Failed to get index stats: ${response.statusText}`);
      }

      const result = (await response.json()) as MemoryPineconeIndexStats;

      // Get vector count for our namespace
      const namespace = this.config.namespace ?? "";
      const namespaceStats = result.namespaces[namespace];
      const vectorCount =
        namespaceStats?.vectorCount ?? result.totalVectorCount;

      return {
        vectorCount,
        dimensions: result.dimension,
      };
    } catch (error) {
      logger.warn("[PineconeVectorStore] Failed to get stats", {
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
    // Pinecone uses HTTP, no persistent connection to close
    this.isInitialized = false;
    logger.debug("[PineconeVectorStore] Closed");
  }

  /**
   * Delete all vectors in the namespace
   * Use with caution!
   */
  async deleteAll(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const baseUrl = this.getDataPlaneUrl();

    const requestBody: Record<string, unknown> = {
      deleteAll: true,
    };

    if (this.config.namespace) {
      requestBody.namespace = this.config.namespace;
    }

    const response = await fetch(`${baseUrl}/vectors/delete`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to delete all vectors: ${response.status} - ${errorText}`,
      );
    }

    logger.info("[PineconeVectorStore] Deleted all vectors", {
      namespace: this.config.namespace,
    });
  }
}
