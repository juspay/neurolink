/**
 * OpenSearch Vector Store Implementation
 * Uses OpenSearch's k-NN plugin for vector similarity search
 * @see https://opensearch.org/docs/latest/search-plugins/knn/index/
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
import { translateToOpenSearch } from "../filterTranslator.js";

// Types for OpenSearch client (using dynamic import)
type OpenSearchClient = {
  ping: () => Promise<{ body: boolean }>;
  indices: {
    exists: (params: { index: string }) => Promise<{ body: boolean }>;
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
    }) => Promise<{ body: Record<string, OpenSearchIndexInfo> }>;
    stats: (params: { index: string }) => Promise<{
      body: { indices: Record<string, OpenSearchIndexStats> };
    }>;
    refresh: (params: { index: string }) => Promise<void>;
  };
  cat: {
    indices: (params: {
      index?: string;
      format: "json";
    }) => Promise<{ body: Array<{ index: string }> }>;
  };
  bulk: (params: {
    index: string;
    body: Array<Record<string, unknown>>;
    refresh?: boolean | "wait_for";
  }) => Promise<{
    body: {
      errors: boolean;
      items: Array<{
        index?: { status: number; error?: unknown };
        update?: { status: number; error?: unknown };
        delete?: { status: number; error?: unknown };
      }>;
    };
  }>;
  search: <T = unknown>(params: {
    index: string;
    body: Record<string, unknown>;
    size?: number;
  }) => Promise<{
    body: {
      hits: {
        total: { value: number };
        hits: Array<{
          _id: string;
          _score: number;
          _source: T;
        }>;
      };
    };
  }>;
  update: (params: {
    index: string;
    id: string;
    body: { doc: Record<string, unknown> };
    refresh?: boolean | "wait_for";
  }) => Promise<{ body: { result: string } }>;
  get: <T = unknown>(params: {
    index: string;
    id: string;
  }) => Promise<{ body: { found: boolean; _source: T } }>;
  deleteByQuery: (params: {
    index: string;
    body: { query: Record<string, unknown> };
    refresh?: boolean;
  }) => Promise<{ body: { deleted: number } }>;
  count: (params: {
    index: string;
    body?: { query?: Record<string, unknown> };
  }) => Promise<{ body: { count: number } }>;
};

type OpenSearchIndexInfo = {
  mappings: {
    properties: Record<
      string,
      {
        type: string;
        dimension?: number;
        method?: { name: string; space_type: string };
      }
    >;
  };
};

type OpenSearchIndexStats = {
  primaries: {
    docs: { count: number };
    store: { size_in_bytes: number };
  };
};

/**
 * OpenSearch-specific configuration
 */
export type OpenSearchConfig = VectorStoreConfig & {
  /** OpenSearch node URL (required) */
  node: string;
  /** Username for authentication (optional) */
  username?: string;
  /** Password for authentication (optional) */
  password?: string;
  /** AWS region for AWS OpenSearch Service (optional) */
  awsRegion?: string;
  /** AWS access key ID (optional, for AWS OpenSearch) */
  awsAccessKeyId?: string;
  /** AWS secret access key (optional, for AWS OpenSearch) */
  awsSecretAccessKey?: string;
  /** SSL configuration (optional) */
  ssl?: {
    rejectUnauthorized?: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };
  /** Index prefix (optional, default: "vectors_") */
  indexPrefix?: string;
  /** Number of shards (default: 1) */
  numberOfShards?: number;
  /** Number of replicas (default: 1) */
  numberOfReplicas?: number;
  /** k-NN engine: "nmslib", "faiss", or "lucene" (default: "nmslib") */
  knnEngine?: "nmslib" | "faiss" | "lucene";
  /** Refresh policy: true, false, or "wait_for" (default: "wait_for") */
  refreshPolicy?: boolean | "wait_for";
  /** ef_construction for HNSW index (default: 512) */
  efConstruction?: number;
  /** m for HNSW index (default: 16) */
  m?: number;
};

/**
 * OpenSearch Vector Store implementation
 */
export class OpenSearchStore extends BaseVectorStore<OpenSearchConfig> {
  private client: OpenSearchClient | null = null;
  private indexPrefix: string;
  private refreshPolicy: boolean | "wait_for";

  constructor(config: OpenSearchConfig) {
    super(config, "opensearch" as VectorStoreName);
    this.indexPrefix = config.indexPrefix || "vectors_";
    this.refreshPolicy = config.refreshPolicy ?? "wait_for";
  }

  /**
   * Initialize connection to OpenSearch
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Dynamically import OpenSearch client
      const { Client } = await import("@opensearch-project/opensearch");

      const clientConfig: Record<string, unknown> = {
        node: this.config.node,
      };

      // Configure authentication
      if (this.config.username && this.config.password) {
        clientConfig.auth = {
          username: this.config.username,
          password: this.config.password,
        };
      }

      // Configure SSL
      if (this.config.ssl) {
        clientConfig.ssl = this.config.ssl;
      }

      // For AWS OpenSearch Service, additional configuration may be needed
      // This is a basic setup; AWS-specific signing would require aws-sdk
      if (this.config.awsRegion) {
        this.logInfo("AWS OpenSearch configuration detected", {
          region: this.config.awsRegion,
        });
      }

      this.client = new Client(clientConfig) as unknown as OpenSearchClient;

      // Test connection
      await this.client.ping();

      this.initialized = true;
      this.logInfo("Connected successfully", { node: this.config.node });
    } catch (error) {
      this.logError("Failed to connect", error);
      throw new Error(
        `Failed to connect to OpenSearch: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Disconnect from OpenSearch
   */
  async disconnect(): Promise<void> {
    this.client = null;
    this.initialized = false;
    this.logInfo("Disconnected");
  }

  /**
   * Create a new index with k-NN vector field mapping
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const indexName = this.getIndexName(config.name);
    const metric = config.metric || "cosine";
    const engine = this.config.knnEngine || "nmslib";

    // k-NN settings
    const knnMethod: Record<string, unknown> = {
      name: "hnsw",
      space_type: this.mapMetric(metric),
      engine,
      parameters: {
        ef_construction: this.config.efConstruction || 512,
        m: this.config.m || 16,
      },
    };

    // Create index with k-NN mapping
    await this.client!.indices.create({
      index: indexName,
      body: {
        settings: {
          "index.knn": true,
          number_of_shards: this.config.numberOfShards || 1,
          number_of_replicas: this.config.numberOfReplicas || 1,
        },
        mappings: {
          properties: {
            embedding: {
              type: "knn_vector",
              dimension: config.dimension,
              method: knnMethod,
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
      engine,
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

    const response = await this.client!.cat.indices({
      index: `${this.indexPrefix}*`,
      format: "json",
    });

    return response.body
      .filter((idx) => idx.index.startsWith(this.indexPrefix))
      .map((idx) => idx.index.replace(this.indexPrefix, ""));
  }

  /**
   * Check if an index exists
   */
  async indexExists(indexName: string): Promise<boolean> {
    this.ensureInitialized();

    const fullIndexName = this.getIndexName(indexName);
    const response = await this.client!.indices.exists({
      index: fullIndexName,
    });
    return response.body;
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

      if (response.body.errors) {
        const errorItems = response.body.items.filter(
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
   * Query vectors using k-NN search
   */
  async query<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options: VectorQueryOptions<TMetadata>,
  ): Promise<VectorQueryResult<TMetadata>[]> {
    this.ensureInitialized();

    const fullIndexName = this.getIndexName(indexName);

    // Build k-NN query
    const knnQuery: Record<string, unknown> = {
      knn: {
        embedding: {
          vector: options.vector,
          k: options.topK,
        },
      },
    };

    // Combine with filter if provided
    let searchQuery: Record<string, unknown>;
    if (options.filter) {
      const filterQuery = translateToOpenSearch(options.filter);
      searchQuery = {
        bool: {
          must: [knnQuery],
          filter: [filterQuery],
        },
      };
    } else {
      searchQuery = knnQuery;
    }

    // Build source filter
    const source: string[] = ["content", "metadata"];
    if (options.includeVectors) {
      source.push("embedding");
    }

    const response = await this.client!.search({
      index: fullIndexName,
      body: {
        query: searchQuery,
        _source: source,
        min_score: options.minScore,
      },
      size: options.topK,
    });

    return response.body.hits.hits.map((hit) => {
      const sourceData = hit._source as Record<string, unknown>;
      return {
        id: hit._id,
        score: hit._score,
        vector: options.includeVectors
          ? (sourceData.embedding as number[])
          : undefined,
        metadata: sourceData.metadata as TMetadata,
        content: sourceData.content as string | undefined,
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
      const response = await this.client!.deleteByQuery({
        index: fullIndexName,
        body: { query: { match_all: {} } },
        refresh: true,
      });
      return { deletedCount: response.body.deleted, acknowledged: true };
    }

    if (options.ids && options.ids.length > 0) {
      const response = await this.client!.deleteByQuery({
        index: fullIndexName,
        body: {
          query: {
            ids: { values: options.ids },
          },
        },
        refresh: true,
      });
      return { deletedCount: response.body.deleted, acknowledged: true };
    }

    if (options.filter) {
      const osFilter = translateToOpenSearch(options.filter);
      const response = await this.client!.deleteByQuery({
        index: fullIndexName,
        body: { query: osFilter },
        refresh: true,
      });
      return { deletedCount: response.body.deleted, acknowledged: true };
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
    const mappings = indexInfo.body[fullIndexName]?.mappings?.properties;
    const dimension = mappings?.embedding?.dimension;

    // Get index stats
    const stats = await this.client!.indices.stats({ index: fullIndexName });
    const indexStats = stats.body.indices[fullIndexName]?.primaries;

    return {
      vectorCount: countResponse.body.count,
      dimension,
      indexSize: indexStats?.store?.size_in_bytes,
    };
  }

  /**
   * Translate filter to OpenSearch format
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): unknown {
    return translateToOpenSearch(filter);
  }

  /**
   * Get full index name with prefix
   */
  private getIndexName(indexName: string): string {
    return `${this.indexPrefix}${indexName}`;
  }

  /**
   * Map similarity metric to OpenSearch k-NN space type
   */
  private mapMetric(metric: SimilarityMetric): string {
    switch (metric) {
      case "cosine":
        return "cosinesimil";
      case "euclidean":
        return "l2";
      case "dotProduct":
        return "innerproduct";
      default:
        return "cosinesimil";
    }
  }
}
