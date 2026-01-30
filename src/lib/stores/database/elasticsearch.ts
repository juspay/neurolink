/**
 * Elasticsearch Vector Store Implementation
 * Uses Elasticsearch's dense_vector field type and kNN search
 * @see https://www.elastic.co/guide/en/elasticsearch/reference/current/knn-search.html
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
import { translateToElasticsearch } from "../filterTranslator.js";

// Types for Elasticsearch client (using dynamic import)
type ElasticsearchClient = {
  ping: () => Promise<boolean>;
  indices: {
    exists: (params: { index: string }) => Promise<boolean>;
    create: (params: {
      index: string;
      body?: {
        settings?: Record<string, unknown>;
        mappings?: Record<string, unknown>;
      };
    }) => Promise<void>;
    delete: (params: { index: string }) => Promise<void>;
    get: (params: {
      index: string;
    }) => Promise<Record<string, ElasticsearchIndexInfo>>;
    stats: (params: {
      index: string;
    }) => Promise<{ indices: Record<string, ElasticsearchIndexStats> }>;
    refresh: (params: { index: string }) => Promise<void>;
  };
  cat: {
    indices: (params: {
      index?: string;
      format: "json";
    }) => Promise<Array<{ index: string }>>;
  };
  bulk: (params: {
    index: string;
    body: Array<Record<string, unknown>>;
    refresh?: boolean | "wait_for";
  }) => Promise<{
    errors: boolean;
    items: Array<{
      index?: { status: number; error?: unknown };
      update?: { status: number; error?: unknown };
      delete?: { status: number; error?: unknown };
    }>;
  }>;
  search: <T = unknown>(params: {
    index: string;
    body: Record<string, unknown>;
    size?: number;
  }) => Promise<{
    hits: {
      total: { value: number };
      hits: Array<{
        _id: string;
        _score: number;
        _source: T;
      }>;
    };
  }>;
  update: (params: {
    index: string;
    id: string;
    body: { doc: Record<string, unknown> };
    refresh?: boolean | "wait_for";
  }) => Promise<{ result: string }>;
  get: <T = unknown>(params: {
    index: string;
    id: string;
  }) => Promise<{ found: boolean; _source: T }>;
  deleteByQuery: (params: {
    index: string;
    body: { query: Record<string, unknown> };
    refresh?: boolean;
  }) => Promise<{ deleted: number }>;
  count: (params: {
    index: string;
    body?: { query?: Record<string, unknown> };
  }) => Promise<{ count: number }>;
};

type ElasticsearchIndexInfo = {
  mappings: {
    properties: Record<
      string,
      { type: string; dims?: number; similarity?: string }
    >;
  };
};

type ElasticsearchIndexStats = {
  primaries: {
    docs: { count: number };
    store: { size_in_bytes: number };
  };
};

/**
 * Elasticsearch-specific configuration
 */
export type ElasticsearchConfig = VectorStoreConfig & {
  /** Elasticsearch node URL (required) */
  node: string;
  /** Cloud ID for Elastic Cloud (optional) */
  cloudId?: string;
  /** API key for authentication (optional) */
  apiKey?: string;
  /** Username for basic auth (optional) */
  username?: string;
  /** Password for basic auth (optional) */
  password?: string;
  /** CA certificate for TLS (optional) */
  caFingerprint?: string;
  /** Index prefix (optional, default: "vectors_") */
  indexPrefix?: string;
  /** Number of shards (default: 1) */
  numberOfShards?: number;
  /** Number of replicas (default: 1) */
  numberOfReplicas?: number;
  /** Refresh policy: true, false, or "wait_for" (default: "wait_for") */
  refreshPolicy?: boolean | "wait_for";
};

/**
 * Elasticsearch Vector Store implementation
 */
export class ElasticsearchStore extends BaseVectorStore<ElasticsearchConfig> {
  private client: ElasticsearchClient | null = null;
  private indexPrefix: string;
  private refreshPolicy: boolean | "wait_for";

  constructor(config: ElasticsearchConfig) {
    super(config, "elasticsearch" as VectorStoreName);
    this.indexPrefix = config.indexPrefix || "vectors_";
    this.refreshPolicy = config.refreshPolicy ?? "wait_for";
  }

  /**
   * Initialize connection to Elasticsearch
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Dynamically import Elasticsearch client
      const { Client } = await import("@elastic/elasticsearch");

      const clientConfig: Record<string, unknown> = {};

      if (this.config.cloudId) {
        clientConfig.cloud = { id: this.config.cloudId };
      } else {
        clientConfig.node = this.config.node;
      }

      if (this.config.apiKey) {
        clientConfig.auth = { apiKey: this.config.apiKey };
      } else if (this.config.username && this.config.password) {
        clientConfig.auth = {
          username: this.config.username,
          password: this.config.password,
        };
      }

      if (this.config.caFingerprint) {
        clientConfig.caFingerprint = this.config.caFingerprint;
      }

      this.client = new Client(clientConfig) as unknown as ElasticsearchClient;

      // Test connection
      await this.client.ping();

      this.initialized = true;
      this.logInfo("Connected successfully", { node: this.config.node });
    } catch (error) {
      this.logError("Failed to connect", error);
      throw new Error(
        `Failed to connect to Elasticsearch: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Disconnect from Elasticsearch
   */
  async disconnect(): Promise<void> {
    this.client = null;
    this.initialized = false;
    this.logInfo("Disconnected");
  }

  /**
   * Create a new index with vector field mapping
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const indexName = this.getIndexName(config.name);
    const metric = config.metric || "cosine";

    // Create index with dense_vector mapping
    await this.client!.indices.create({
      index: indexName,
      body: {
        settings: {
          number_of_shards: this.config.numberOfShards || 1,
          number_of_replicas: this.config.numberOfReplicas || 1,
          "index.knn": true,
        },
        mappings: {
          properties: {
            embedding: {
              type: "dense_vector",
              dims: config.dimension,
              index: true,
              similarity: this.mapMetric(metric),
            },
            content: { type: "text" },
            metadata: { type: "object", dynamic: true },
            createdAt: { type: "date" },
            updatedAt: { type: "date" },
          },
        },
      },
    });

    this.logInfo(`Index created: ${indexName}`, {
      dimension: config.dimension,
      metric,
    });
  }

  /**
   * Delete an index
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    const fullIndexName = this.getIndexName(indexName);
    await this.client!.indices.delete({ index: fullIndexName });
    this.logInfo(`Index deleted: ${fullIndexName}`);
  }

  /**
   * List all vector indexes
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    const indices = await this.client!.cat.indices({
      index: `${this.indexPrefix}*`,
      format: "json",
    });

    return indices
      .filter((idx) => idx.index.startsWith(this.indexPrefix))
      .map((idx) => idx.index.replace(this.indexPrefix, ""));
  }

  /**
   * Check if an index exists
   */
  async indexExists(indexName: string): Promise<boolean> {
    this.ensureInitialized();

    const fullIndexName = this.getIndexName(indexName);
    return await this.client!.indices.exists({ index: fullIndexName });
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

    const fullIndexName = this.getIndexName(indexName);
    const batchSize = options?.batchSize || 500;
    let totalUpserted = 0;

    // Process in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      // Build bulk operations
      const bulkBody: Array<Record<string, unknown>> = [];
      const now = new Date().toISOString();

      for (const record of batch) {
        // Index operation (upsert)
        bulkBody.push({
          index: {
            _index: fullIndexName,
            _id: record.id,
          },
        });
        bulkBody.push({
          embedding: record.vector,
          content: record.content || null,
          metadata: record.metadata || {},
          updatedAt: now,
        });
      }

      const response = await this.client!.bulk({
        index: fullIndexName,
        body: bulkBody,
        refresh: this.refreshPolicy,
      });

      if (response.errors) {
        const errorItems = response.items.filter(
          (item) =>
            item.index?.error || item.update?.error || item.delete?.error,
        );
        this.logError(
          `Bulk upsert had errors: ${JSON.stringify(errorItems.slice(0, 5))}`,
        );
      }

      totalUpserted += batch.length;
      this.logDebug(`Upserted batch: ${totalUpserted}/${records.length}`);
    }

    return { upsertedCount: totalUpserted };
  }

  /**
   * Query vectors using kNN search
   */
  async query<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options: VectorQueryOptions<TMetadata>,
  ): Promise<VectorQueryResult<TMetadata>[]> {
    this.ensureInitialized();

    const fullIndexName = this.getIndexName(indexName);

    // Build kNN query
    const knn: Record<string, unknown> = {
      field: "embedding",
      query_vector: options.vector,
      k: options.topK,
      num_candidates: options.topK * 10, // Increase for better recall
    };

    // Add filter if provided
    if (options.filter) {
      knn.filter = translateToElasticsearch(options.filter);
    }

    // Build search body
    const searchBody: Record<string, unknown> = {
      knn,
      _source: {
        includes: ["content", "metadata"].concat(
          options.includeVectors ? ["embedding"] : [],
        ),
      },
    };

    // Apply min_score if specified
    if (options.minScore) {
      searchBody.min_score = options.minScore;
    }

    const response = await this.client!.search({
      index: fullIndexName,
      body: searchBody,
      size: options.topK,
    });

    return response.hits.hits.map((hit) => {
      const source = hit._source as Record<string, unknown>;
      return {
        id: hit._id,
        score: hit._score,
        vector: options.includeVectors
          ? (source.embedding as number[])
          : undefined,
        metadata: source.metadata as TMetadata,
        content: source.content as string | undefined,
      };
    });
  }

  /**
   * Delete vectors
   */
  async delete(
    indexName: string,
    options: VectorDeleteOptions,
  ): Promise<VectorDeleteResult> {
    this.ensureInitialized();

    const fullIndexName = this.getIndexName(indexName);

    if (options.deleteAll) {
      const result = await this.client!.deleteByQuery({
        index: fullIndexName,
        body: { query: { match_all: {} } },
        refresh: true,
      });
      return { deletedCount: result.deleted, acknowledged: true };
    }

    if (options.ids && options.ids.length > 0) {
      const result = await this.client!.deleteByQuery({
        index: fullIndexName,
        body: {
          query: {
            ids: { values: options.ids },
          },
        },
        refresh: true,
      });
      return { deletedCount: result.deleted, acknowledged: true };
    }

    if (options.filter) {
      const esFilter = translateToElasticsearch(options.filter);
      const result = await this.client!.deleteByQuery({
        index: fullIndexName,
        body: { query: esFilter },
        refresh: true,
      });
      return { deletedCount: result.deleted, acknowledged: true };
    }

    return { deletedCount: 0, acknowledged: true };
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

    const fullIndexName = this.getIndexName(indexName);
    const updateDoc: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (update.vector) {
      updateDoc.embedding = update.vector;
    }

    if (update.metadata) {
      updateDoc.metadata = update.metadata;
    }

    try {
      await this.client!.update({
        index: fullIndexName,
        id,
        body: { doc: updateDoc },
        refresh: this.refreshPolicy,
      });
      this.logDebug(`Updated vector: ${id}`);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("document_missing_exception")
      ) {
        throw new Error(
          `Vector with id '${id}' not found in index '${indexName}'`,
        );
      }
      throw error;
    }
  }

  /**
   * Get index statistics
   */
  async getStats(indexName: string): Promise<VectorStoreStats> {
    this.ensureInitialized();

    const fullIndexName = this.getIndexName(indexName);

    // Get document count
    const countResponse = await this.client!.count({ index: fullIndexName });

    // Get index info for dimension
    const indexInfo = await this.client!.indices.get({ index: fullIndexName });
    const mappings = indexInfo[fullIndexName]?.mappings?.properties;
    const dimension = mappings?.embedding?.dims;

    // Get index stats
    const stats = await this.client!.indices.stats({ index: fullIndexName });
    const indexStats = stats.indices[fullIndexName]?.primaries;

    return {
      vectorCount: countResponse.count,
      dimension,
      indexSize: indexStats?.store?.size_in_bytes,
    };
  }

  /**
   * Translate filter to Elasticsearch format
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): unknown {
    return translateToElasticsearch(filter);
  }

  /**
   * Get full index name with prefix
   */
  private getIndexName(indexName: string): string {
    return `${this.indexPrefix}${indexName}`;
  }

  /**
   * Map similarity metric to Elasticsearch format
   */
  private mapMetric(metric: SimilarityMetric): string {
    switch (metric) {
      case "cosine":
        return "cosine";
      case "euclidean":
        return "l2_norm";
      case "dotProduct":
        return "dot_product";
      default:
        return "cosine";
    }
  }
}
