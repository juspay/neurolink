/**
 * Qdrant Vector Store Implementation
 * High-performance open-source vector database with Rust-based SIMD optimizations
 * @see https://qdrant.tech/documentation/
 */

import type { UnknownRecord } from "../../types/common.js";
import type { MetadataFilter } from "../../types/vectorFilterTypes.js";
import type {
  SimilarityMetric,
  VectorDeleteOptions,
  VectorDeleteResult,
  VectorIndexConfig,
  VectorQueryOptions,
  VectorQueryResult,
  VectorRecord,
  VectorStoreName,
  VectorStoreStats,
  VectorUpsertOptions,
} from "../../types/vectorTypes.js";
import { BaseVectorStore, type VectorStoreConfig } from "../baseVectorStore.js";
import { translateToQdrant } from "../filterTranslator.js";

// Types for Qdrant client (using dynamic import)
type QdrantClient = {
  getCollections: () => Promise<{ collections: Array<{ name: string }> }>;
  createCollection: (
    name: string,
    params: {
      vectors: { size: number; distance: string };
      quantization_config?: Record<string, unknown>;
      optimizers_config?: Record<string, unknown>;
    },
  ) => Promise<void>;
  deleteCollection: (name: string) => Promise<void>;
  getCollection: (name: string) => Promise<QdrantCollectionInfo>;
  upsert: (
    collectionName: string,
    params: {
      wait: boolean;
      points: Array<QdrantPoint>;
    },
  ) => Promise<void>;
  search: (
    collectionName: string,
    params: QdrantSearchParams,
  ) => Promise<Array<QdrantSearchResult>>;
  delete: (
    collectionName: string,
    params: {
      wait: boolean;
      points?: (string | number)[];
      filter?: Record<string, unknown>;
    },
  ) => Promise<void>;
  setPayload: (
    collectionName: string,
    params: {
      wait: boolean;
      points: (string | number)[];
      payload: Record<string, unknown>;
    },
  ) => Promise<void>;
  retrieve: (
    collectionName: string,
    params: {
      ids: (string | number)[];
      with_vector?: boolean;
      with_payload?: boolean;
    },
  ) => Promise<Array<QdrantSearchResult>>;
};

type QdrantPoint = {
  id: string | number;
  vector: number[];
  payload?: Record<string, unknown>;
};

type QdrantSearchParams = {
  vector: number[];
  limit: number;
  with_payload?: boolean;
  with_vector?: boolean;
  filter?: Record<string, unknown>;
  score_threshold?: number;
};

type QdrantSearchResult = {
  id: string | number;
  score: number;
  vector?: number[];
  payload?: Record<string, unknown>;
};

type QdrantCollectionInfo = {
  points_count?: number;
  status?: "green" | "yellow" | "red";
  optimizer_status?: "ok" | "indexing";
  config: {
    params: {
      vectors?: { size?: number };
    };
  };
};

/**
 * Qdrant-specific configuration
 */
export type QdrantConfig = VectorStoreConfig & {
  /** Qdrant URL (required) */
  url: string;
  /** API key for Qdrant Cloud (optional for self-hosted) */
  apiKey?: string;
  /** Use HTTPS (default: auto-detected from URL) */
  https?: boolean;
  /** gRPC port for faster operations (optional) */
  grpcPort?: number;
  /** Prefer gRPC over REST (optional) */
  preferGrpc?: boolean;
};

/**
 * Qdrant Vector Store implementation
 */
export class QdrantStore extends BaseVectorStore<QdrantConfig> {
  private client: QdrantClient | null = null;

  constructor(config: QdrantConfig) {
    super(config, "qdrant" as VectorStoreName);
  }

  /**
   * Initialize connection to Qdrant
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Dynamically import Qdrant client
      const { QdrantClient: QdrantClientClass } = await import(
        "@qdrant/js-client-rest"
      );

      this.client = new QdrantClientClass({
        url: this.config.url,
        apiKey: this.config.apiKey,
      }) as unknown as QdrantClient;

      // Test connection
      await this.client.getCollections();

      this.initialized = true;
      this.logInfo("Connected successfully");
    } catch (error) {
      this.logError("Failed to connect", error);
      throw new Error(
        `Failed to connect to Qdrant: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Disconnect from Qdrant
   */
  async disconnect(): Promise<void> {
    this.client = null;
    this.initialized = false;
    this.logInfo("Disconnected");
  }

  /**
   * Create a new collection
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const distance = this.mapMetric(config.metric || "cosine");

    await this.client!.createCollection(config.name, {
      vectors: {
        size: config.dimension,
        distance,
      },
      // Optional: Enable scalar quantization for memory efficiency
      quantization_config: {
        scalar: {
          type: "int8",
          quantile: 0.99,
          always_ram: true,
        },
      },
      // Optimizers for better performance
      optimizers_config: {
        indexing_threshold: 20000,
      },
      ...(config.config || {}),
    });

    this.logInfo(`Collection created: ${config.name}`, {
      dimension: config.dimension,
      distance,
    });

    // Wait for collection to be ready (optimization complete)
    await this.waitForCollectionReady(config.name);
  }

  /**
   * Wait for collection to be ready after creation
   * Polls collection status until optimization is complete
   */
  private async waitForCollectionReady(
    collectionName: string,
    maxWaitMs: number = 30000,
  ): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 500;

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const info = await this.client!.getCollection(collectionName);

        // Check if collection is ready (status green and optimizer done)
        if (info.status === "green" && info.optimizer_status !== "indexing") {
          this.logDebug(`Collection ${collectionName} is ready`);
          return;
        }

        this.logDebug(
          `Waiting for collection ${collectionName} to be ready (status: ${info.status}, optimizer: ${info.optimizer_status})`,
        );
      } catch {
        // Collection might not be accessible yet
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    // Don't throw, just log a warning - collection may still work
    this.logInfo(
      `Collection ${collectionName} readiness check timed out after ${maxWaitMs}ms, proceeding anyway`,
    );
  }

  /**
   * Delete a collection
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    await this.client!.deleteCollection(indexName);
    this.logInfo(`Collection deleted: ${indexName}`);
  }

  /**
   * List all collections
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    const response = await this.client!.getCollections();
    return response.collections.map((c) => c.name);
  }

  /**
   * Check if a collection exists
   */
  async indexExists(indexName: string): Promise<boolean> {
    const indexes = await this.listIndexes();
    return indexes.includes(indexName);
  }

  /**
   * Upsert vectors
   */
  async upsert<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    records: VectorRecord<TMetadata>[],
    options?: VectorUpsertOptions,
  ): Promise<{ upsertedCount: number }> {
    this.ensureInitialized();

    const batchSize = options?.batchSize || 500;
    let totalUpserted = 0;

    // Convert records to Qdrant format
    const points: QdrantPoint[] = records.map((record) => ({
      id: record.id,
      vector: record.vector,
      payload: {
        ...record.metadata,
        _content: record.content,
      } as Record<string, unknown>,
    }));

    // Batch upsert
    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize);
      await this.client!.upsert(indexName, {
        wait: true,
        points: batch,
      });
      totalUpserted += batch.length;

      this.logDebug(`Upserted batch: ${totalUpserted}/${points.length}`);
    }

    return { upsertedCount: totalUpserted };
  }

  /**
   * Query vectors
   */
  async query<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options: VectorQueryOptions<TMetadata>,
  ): Promise<VectorQueryResult<TMetadata>[]> {
    this.ensureInitialized();

    const searchParams: QdrantSearchParams = {
      vector: options.vector,
      limit: options.topK,
      with_payload: options.includeMetadata ?? true,
      with_vector: options.includeVectors ?? false,
    };

    if (options.filter) {
      searchParams.filter = translateToQdrant(options.filter) as Record<
        string,
        unknown
      >;
    }

    if (options.minScore) {
      searchParams.score_threshold = options.minScore;
    }

    const response = await this.client!.search(indexName, searchParams);

    return response.map((result) => ({
      id: String(result.id),
      score: result.score,
      vector: result.vector,
      metadata: result.payload as TMetadata,
      content: (result.payload as Record<string, unknown>)?._content as
        | string
        | undefined,
    }));
  }

  /**
   * Update an individual vector's embedding and/or metadata
   */
  async updateVector<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    id: string,
    update: { vector?: number[]; metadata?: TMetadata },
  ): Promise<void> {
    this.ensureInitialized();

    if (!update.vector && !update.metadata) {
      return; // Nothing to update
    }

    // If only updating metadata, use setPayload for efficiency
    if (!update.vector && update.metadata) {
      await this.client!.setPayload(indexName, {
        wait: true,
        points: [id],
        payload: update.metadata as Record<string, unknown>,
      });
      this.logDebug(`Updated metadata for vector: ${id}`);
      return;
    }

    // If updating vector (with or without metadata), need to upsert
    // First retrieve existing payload if we're only updating the vector
    let payload: Record<string, unknown> | undefined;

    if (update.vector && !update.metadata) {
      const existing = await this.client!.retrieve(indexName, {
        ids: [id],
        with_payload: true,
        with_vector: false,
      });

      if (existing.length === 0) {
        throw new Error(
          `Vector with id '${id}' not found in collection '${indexName}'`,
        );
      }
      payload = existing[0].payload;
    } else {
      payload = update.metadata as Record<string, unknown>;
    }

    // Upsert with the new vector and payload
    await this.client!.upsert(indexName, {
      wait: true,
      points: [
        {
          id,
          vector: update.vector!,
          payload,
        },
      ],
    });
    this.logDebug(`Updated vector: ${id}`);
  }

  /**
   * Get collection statistics
   */
  async getStats(indexName: string): Promise<VectorStoreStats> {
    this.ensureInitialized();

    const info = await this.client!.getCollection(indexName);

    return {
      vectorCount: info.points_count || 0,
      dimension: info.config.params.vectors?.size,
      metrics: info as unknown as UnknownRecord,
    };
  }

  /**
   * Delete vectors
   */
  async delete(
    indexName: string,
    options: VectorDeleteOptions,
  ): Promise<VectorDeleteResult> {
    this.ensureInitialized();

    if (options.ids && options.ids.length > 0) {
      await this.client!.delete(indexName, {
        wait: true,
        points: options.ids,
      });
      return { deletedCount: options.ids.length, acknowledged: true };
    }

    if (options.filter) {
      await this.client!.delete(indexName, {
        wait: true,
        filter: translateToQdrant(options.filter) as Record<string, unknown>,
      });
      return { deletedCount: undefined, acknowledged: true }; // Qdrant doesn't return count for filter deletes
    }

    return { deletedCount: 0, acknowledged: true };
  }

  /**
   * Translate filter to Qdrant format
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): unknown {
    return translateToQdrant(filter);
  }

  /**
   * Map similarity metric to Qdrant format
   */
  private mapMetric(metric: SimilarityMetric): string {
    switch (metric) {
      case "cosine":
        return "Cosine";
      case "euclidean":
        return "Euclid";
      case "dotProduct":
        return "Dot";
      default:
        return "Cosine";
    }
  }
}
