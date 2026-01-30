/**
 * Elasticsearch Vector Store Adapter
 * Implements vector similarity search using Elasticsearch's dense_vector field type and kNN search
 *
 * Elasticsearch provides native vector search capabilities through:
 * - dense_vector field type for storing embeddings
 * - kNN query for approximate nearest neighbor search
 * - script_score for exact similarity calculations
 *
 * @see https://www.elastic.co/guide/en/elasticsearch/reference/current/dense-vector.html
 * @see https://www.elastic.co/guide/en/elasticsearch/reference/current/knn-search.html
 */

import type { UnknownRecord } from "../../types/common.js";
import { logger } from "../../utils/logger.js";
import { BaseVectorStore } from "../BaseVectorStore.js";
import type {
  VectorStoreName,
  VectorRecord,
  VectorQueryResult,
  VectorIndexConfig,
  VectorQueryOptions,
  VectorUpsertOptions,
  VectorDeleteOptions,
  VectorStoreStats,
  VectorStoreHealth,
  MetadataFilter,
  FieldFilter,
  SimilarityMetric,
  VectorStoreConfig,
} from "../types.js";

/**
 * Elasticsearch-specific configuration
 */
export type ElasticsearchConfig = VectorStoreConfig & {
  /** Elasticsearch node URL (e.g., "http://localhost:9200" or "https://elastic-cloud.io:443") */
  node: string;
  /** Additional node URLs for cluster configuration */
  nodes?: string[];
  /** Authentication credentials */
  auth?: {
    /** Username for basic auth */
    username?: string;
    /** Password for basic auth */
    password?: string;
    /** API key for API key auth */
    apiKey?: string;
    /** Bearer token for OAuth */
    bearer?: string;
  };
  /** Cloud ID for Elastic Cloud deployments */
  cloudId?: string;
  /** TLS/SSL configuration */
  tls?: {
    /** CA certificate */
    ca?: string;
    /** Skip certificate verification (not recommended for production) */
    rejectUnauthorized?: boolean;
  };
  /** Request timeout in milliseconds */
  requestTimeout?: number;
  /** Enable request compression */
  compression?: boolean;
  /** Maximum number of retries */
  maxRetries?: number;
  /** Index prefix for all indexes created by this adapter */
  indexPrefix?: string;
  /** Number of shards for new indexes */
  numberOfShards?: number;
  /** Number of replicas for new indexes */
  numberOfReplicas?: number;
  /** Refresh policy for write operations: 'true', 'false', or 'wait_for' */
  refreshPolicy?: "true" | "false" | "wait_for";
};

/**
 * Elasticsearch client interface for REST API operations
 * Compatible with @elastic/elasticsearch client
 */
interface ElasticsearchClient {
  indices: {
    create: (params: {
      index: string;
      body?: {
        settings?: Record<string, unknown>;
        mappings?: Record<string, unknown>;
      };
    }) => Promise<{ body?: unknown; acknowledged?: boolean }>;
    delete: (params: { index: string }) => Promise<{ body?: unknown }>;
    exists: (params: { index: string }) => Promise<{ body?: boolean } | boolean>;
    get: (params: { index: string }) => Promise<{
      body?: {
        [index: string]: {
          mappings?: {
            properties?: Record<string, unknown>;
          };
        };
      };
      [index: string]: unknown;
    }>;
    stats: (params: { index: string }) => Promise<{
      body?: {
        _all?: {
          primaries?: {
            docs?: { count?: number };
            store?: { size_in_bytes?: number };
          };
        };
      };
      _all?: {
        primaries?: {
          docs?: { count?: number };
          store?: { size_in_bytes?: number };
        };
      };
    }>;
    refresh: (params: { index: string }) => Promise<unknown>;
  };
  cat: {
    indices: (params: {
      format: string;
      h?: string;
      s?: string;
    }) => Promise<{ body?: Array<{ index: string }> } | Array<{ index: string }>>;
  };
  bulk: (params: {
    body: unknown[];
    refresh?: "true" | "false" | "wait_for";
  }) => Promise<{
    body?: { items?: Array<{ index?: { status?: number }; delete?: { status?: number } }> };
    items?: Array<{ index?: { status?: number }; delete?: { status?: number } }>;
  }>;
  search: (params: {
    index: string;
    body: Record<string, unknown>;
    size?: number;
  }) => Promise<{
    body?: {
      hits?: {
        hits?: Array<{
          _id: string;
          _score: number;
          _source?: Record<string, unknown>;
        }>;
      };
    };
    hits?: {
      hits?: Array<{
        _id: string;
        _score: number;
        _source?: Record<string, unknown>;
      }>;
    };
  }>;
  deleteByQuery: (params: {
    index: string;
    body: { query: Record<string, unknown> };
    refresh?: boolean;
  }) => Promise<{
    body?: { deleted?: number };
    deleted?: number;
  }>;
  count: (params: {
    index: string;
    body?: { query?: Record<string, unknown> };
  }) => Promise<{
    body?: { count?: number };
    count?: number;
  }>;
  info: () => Promise<{
    body?: { version?: { number?: string }; cluster_name?: string };
    version?: { number?: string };
    cluster_name?: string;
  }>;
  cluster: {
    health: () => Promise<{
      body?: { status?: string };
      status?: string;
    }>;
  };
  close: () => Promise<void>;
}

/**
 * Index metadata stored locally for tracking created indexes
 */
interface IndexMetadata {
  name: string;
  dimension: number;
  metric: SimilarityMetric;
  createdAt: string;
}

/**
 * Elasticsearch Vector Store Adapter
 *
 * Features:
 * - Native kNN search with dense_vector fields
 * - Supports cosine, euclidean (l2_norm), and dot product similarity
 * - Rich metadata filtering via Elasticsearch Query DSL
 * - Namespace support through a namespace field
 * - Batch operations with bulk API
 * - HNSW approximate nearest neighbor indexing
 * - Elastic Cloud support with cloud ID
 *
 * Note: Requires @elastic/elasticsearch client to be installed:
 *   npm install @elastic/elasticsearch
 */
export class ElasticsearchAdapter extends BaseVectorStore<ElasticsearchConfig> {
  private client: ElasticsearchClient | null = null;
  private indexMetadataCache: Map<string, IndexMetadata> = new Map();

  constructor(config: ElasticsearchConfig) {
    super(config, "elasticsearch" as VectorStoreName);
  }

  /**
   * Initialize connection to Elasticsearch cluster
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      logger.debug("Elasticsearch already connected");
      return;
    }

    try {
      const Client = await this.loadElasticsearchClient();

      const clientOptions: Record<string, unknown> = {};

      // Configure node(s)
      if (this.config.cloudId) {
        clientOptions.cloud = { id: this.config.cloudId };
      } else if (this.config.nodes && this.config.nodes.length > 0) {
        clientOptions.nodes = [this.config.node, ...this.config.nodes];
      } else {
        clientOptions.node = this.config.node;
      }

      // Configure authentication
      if (this.config.auth) {
        if (this.config.auth.apiKey) {
          clientOptions.auth = { apiKey: this.config.auth.apiKey };
        } else if (this.config.auth.bearer) {
          clientOptions.auth = { bearer: this.config.auth.bearer };
        } else if (this.config.auth.username && this.config.auth.password) {
          clientOptions.auth = {
            username: this.config.auth.username,
            password: this.config.auth.password,
          };
        }
      }

      // Configure TLS
      if (this.config.tls) {
        clientOptions.tls = {
          ca: this.config.tls.ca,
          rejectUnauthorized: this.config.tls.rejectUnauthorized ?? true,
        };
      }

      // Configure other options
      if (this.config.requestTimeout) {
        clientOptions.requestTimeout = this.config.requestTimeout;
      }
      if (this.config.compression !== undefined) {
        clientOptions.compression = this.config.compression;
      }
      if (this.config.maxRetries !== undefined) {
        clientOptions.maxRetries = this.config.maxRetries;
      }

      this.client = new Client(clientOptions) as ElasticsearchClient;

      // Verify connection
      await this.verifyConnection();

      this.initialized = true;
      logger.debug("Elasticsearch connected successfully", {
        node: this.config.node,
        cloudId: this.config.cloudId ? "configured" : undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to Elasticsearch: ${message}`);
    }
  }

  /**
   * Close the Elasticsearch client connection
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
        this.client = null;
        this.initialized = false;
        this.indexMetadataCache.clear();
        logger.debug("Elasticsearch disconnected");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to disconnect from Elasticsearch: ${message}`);
      }
    }
  }

  /**
   * Create a new vector index with dense_vector mapping
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const { name, dimension, metric = "cosine" } = config;
    const indexName = this.getIndexName(name);

    try {
      // Map NeuroLink metric to Elasticsearch similarity
      const similarity = this.mapMetricToSimilarity(metric);

      await this.client!.indices.create({
        index: indexName,
        body: {
          settings: {
            number_of_shards: this.config.numberOfShards || 1,
            number_of_replicas: this.config.numberOfReplicas || 0,
            "index.knn": true,
          },
          mappings: {
            properties: {
              id: { type: "keyword" },
              vector: {
                type: "dense_vector",
                dims: dimension,
                index: true,
                similarity: similarity,
                index_options: {
                  type: "hnsw",
                  m: 16,
                  ef_construction: 100,
                },
              },
              metadata: {
                type: "object",
                enabled: true,
                dynamic: true,
              },
              content: { type: "text" },
              namespace: { type: "keyword" },
              created_at: { type: "date" },
              updated_at: { type: "date" },
            },
          },
        },
      });

      // Store metadata locally
      this.indexMetadataCache.set(name, {
        name,
        dimension,
        metric,
        createdAt: new Date().toISOString(),
      });

      logger.debug(`Created Elasticsearch index ${indexName}`, {
        dimension,
        metric,
        similarity,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create index ${name}: ${message}`);
    }
  }

  /**
   * Delete an index
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    const fullIndexName = this.getIndexName(indexName);

    try {
      await this.client!.indices.delete({ index: fullIndexName });
      this.indexMetadataCache.delete(indexName);
      logger.debug(`Deleted Elasticsearch index ${fullIndexName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete index ${indexName}: ${message}`);
    }
  }

  /**
   * List all vector indexes
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    try {
      const prefix = this.config.indexPrefix || "";
      const response = await this.client!.cat.indices({
        format: "json",
        h: "index",
        s: "index",
      });

      // Handle both old and new client response formats
      const indices = Array.isArray(response) ? response : (response.body || []);

      // Filter by prefix if configured
      const indexNames = indices
        .map((idx: { index: string }) => idx.index)
        .filter((name: string) => !name.startsWith(".")) // Exclude system indexes
        .filter((name: string) => (prefix ? name.startsWith(prefix) : true))
        .map((name: string) => (prefix ? name.substring(prefix.length) : name));

      return indexNames;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to list indexes: ${message}`);
    }
  }

  /**
   * Check if an index exists
   */
  async indexExists(indexName: string): Promise<boolean> {
    this.ensureInitialized();

    const fullIndexName = this.getIndexName(indexName);

    try {
      const response = await this.client!.indices.exists({ index: fullIndexName });
      // Handle both old and new client response formats
      return typeof response === "boolean" ? response : Boolean(response.body);
    } catch (error) {
      // Index not found errors should return false
      if (
        error instanceof Error &&
        (error.message.includes("index_not_found") || error.message.includes("404"))
      ) {
        return false;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to check index existence: ${message}`);
    }
  }

  /**
   * Upsert vectors into the index using bulk API
   */
  async upsert<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    records: VectorRecord<TMetadata>[],
    options?: VectorUpsertOptions,
  ): Promise<{ upsertedCount: number }> {
    this.ensureInitialized();

    if (records.length === 0) {
      return { upsertedCount: 0 };
    }

    const fullIndexName = this.getIndexName(indexName);
    const namespace = options?.namespace || null;

    // Validate dimensions
    this.validateDimensions(records.map((r) => r.vector));

    try {
      // Build bulk operations
      const operations: unknown[] = [];
      const now = new Date().toISOString();

      for (const record of records) {
        // Index action (upsert)
        operations.push({
          index: {
            _index: fullIndexName,
            _id: record.id,
          },
        });

        // Document body
        operations.push({
          id: record.id,
          vector: record.vector,
          metadata: record.metadata || {},
          content: record.content || null,
          namespace: record.namespace || namespace,
          created_at: now,
          updated_at: now,
        });
      }

      const response = await this.client!.bulk({
        body: operations,
        refresh: this.config.refreshPolicy || "false",
      });

      // Handle both old and new client response formats
      const items = response.items || response.body?.items || [];

      // Count successful operations
      const upsertedCount = items.filter(
        (item: { index?: { status?: number } }) =>
          item.index?.status === 200 || item.index?.status === 201
      ).length;

      logger.debug(`Upserted ${upsertedCount} records to ${indexName}`);
      return { upsertedCount };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to upsert records: ${message}`);
    }
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
    const {
      vector,
      topK,
      minScore,
      filter,
      includeVectors = false,
      includeMetadata = true,
      namespace,
    } = options;

    try {
      // Build the query
      const queryBody: Record<string, unknown> = {
        knn: {
          field: "vector",
          query_vector: vector,
          k: topK,
          num_candidates: Math.max(topK * 2, 100), // More candidates for better recall
        },
      };

      // Build filter conditions
      const filterConditions: Record<string, unknown>[] = [];

      if (namespace) {
        filterConditions.push({ term: { namespace: namespace } });
      }

      if (filter) {
        const translatedFilter = this.translateFilter(filter);
        if (translatedFilter) {
          filterConditions.push(translatedFilter);
        }
      }

      // Apply filters to kNN query
      if (filterConditions.length > 0) {
        (queryBody.knn as Record<string, unknown>).filter = {
          bool: { must: filterConditions },
        };
      }

      // Configure source fields
      const sourceFields = ["id", "content", "namespace"];
      if (includeMetadata) {
        sourceFields.push("metadata");
      }
      if (includeVectors) {
        sourceFields.push("vector");
      }
      queryBody._source = sourceFields;

      const response = await this.client!.search({
        index: fullIndexName,
        body: queryBody,
        size: topK,
      });

      // Handle both old and new client response formats
      const hits = response.hits?.hits || response.body?.hits?.hits || [];

      // Transform results
      const results: VectorQueryResult<TMetadata>[] = [];

      for (const hit of hits) {
        const score = hit._score || 0;

        // Apply minimum score filter
        if (minScore !== undefined && score < minScore) {
          continue;
        }

        const result: VectorQueryResult<TMetadata> = {
          id: hit._id,
          score,
        };

        if (hit._source) {
          if (hit._source.content) {
            result.content = hit._source.content as string;
          }
          if (includeMetadata && hit._source.metadata) {
            result.metadata = hit._source.metadata as TMetadata;
          }
          if (includeVectors && hit._source.vector) {
            result.vector = hit._source.vector as number[];
          }
        }

        results.push(result);
      }

      return results;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to query vectors: ${message}`);
    }
  }

  /**
   * Delete vectors from the index
   */
  async delete(
    indexName: string,
    options: VectorDeleteOptions,
  ): Promise<{ deletedCount: number }> {
    this.ensureInitialized();

    const fullIndexName = this.getIndexName(indexName);
    const { ids, filter, namespace, deleteAll } = options;

    try {
      let deletedCount = 0;

      if (deleteAll) {
        // Delete all (optionally filtered by namespace)
        const query: Record<string, unknown> = namespace
          ? { term: { namespace: namespace } }
          : { match_all: {} };

        const response = await this.client!.deleteByQuery({
          index: fullIndexName,
          body: { query },
          refresh: true,
        });

        deletedCount = response.deleted || response.body?.deleted || 0;
      } else if (ids && ids.length > 0) {
        // Delete by IDs using bulk API
        const operations: unknown[] = [];
        for (const id of ids) {
          operations.push({
            delete: {
              _index: fullIndexName,
              _id: id,
            },
          });
        }

        const response = await this.client!.bulk({
          body: operations,
          refresh: this.config.refreshPolicy || "true",
        });

        const items = response.items || response.body?.items || [];
        deletedCount = items.filter(
          (item: { delete?: { status?: number } }) =>
            item.delete?.status === 200 || item.delete?.status === 404
        ).length;
      } else if (filter) {
        // Delete by filter
        const translatedFilter = this.translateFilter(filter);
        const query = translatedFilter || { match_all: {} };

        const response = await this.client!.deleteByQuery({
          index: fullIndexName,
          body: { query },
          refresh: true,
        });

        deletedCount = response.deleted || response.body?.deleted || 0;
      }

      logger.debug(`Deleted ${deletedCount} records from ${indexName}`);
      return { deletedCount };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete records: ${message}`);
    }
  }

  /**
   * Get index statistics
   */
  async getStats(indexName: string): Promise<VectorStoreStats> {
    this.ensureInitialized();

    const fullIndexName = this.getIndexName(indexName);

    try {
      // Get index stats
      const statsResponse = await this.client!.indices.stats({ index: fullIndexName });
      const stats = statsResponse._all || statsResponse.body?._all;

      // Get document count
      const countResponse = await this.client!.count({ index: fullIndexName });
      const count = countResponse.count ?? countResponse.body?.count ?? 0;

      // Get namespace count
      const namespaceResponse = await this.client!.search({
        index: fullIndexName,
        body: {
          size: 0,
          aggs: {
            namespace_count: {
              cardinality: {
                field: "namespace",
              },
            },
          },
        },
      });

      const namespaceAgg = (namespaceResponse.body || namespaceResponse) as {
        aggregations?: { namespace_count?: { value?: number } };
      };
      const namespaceCount = namespaceAgg.aggregations?.namespace_count?.value || 0;

      // Get dimension from index mapping
      let dimension: number | undefined;
      const mappingResponse = await this.client!.indices.get({ index: fullIndexName });
      // Handle both old and new client response formats
      type IndexMapping = {
        mappings?: {
          properties?: {
            vector?: { dims?: number };
          };
        };
      };
      const responseBody = (mappingResponse.body || mappingResponse) as Record<string, IndexMapping>;
      const mapping = responseBody[fullIndexName];
      const vectorMapping = mapping?.mappings?.properties?.vector;
      if (vectorMapping?.dims) {
        dimension = vectorMapping.dims;
      }

      // Check local cache for metadata
      const cachedMeta = this.indexMetadataCache.get(indexName);

      return {
        vectorCount: count,
        indexSize: stats?.primaries?.store?.size_in_bytes,
        dimension: dimension || cachedMeta?.dimension,
        namespaceCount,
        metrics: {
          docsCount: stats?.primaries?.docs?.count,
          metric: cachedMeta?.metric || "cosine",
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get stats for ${indexName}: ${message}`);
    }
  }

  /**
   * Health check with cluster status
   */
  async healthCheck(): Promise<VectorStoreHealth> {
    const startTime = Date.now();
    try {
      if (!this.initialized || !this.client) {
        return {
          healthy: false,
          status: "disconnected",
          latencyMs: Date.now() - startTime,
          error: "Not connected",
          lastChecked: new Date(),
        };
      }

      // Check cluster health
      const healthResponse = await this.client.cluster.health();
      const clusterStatus = healthResponse.status || healthResponse.body?.status;

      // Get cluster info
      const infoResponse = await this.client.info();
      const version = infoResponse.version?.number || infoResponse.body?.version?.number;

      const isHealthy = clusterStatus === "green" || clusterStatus === "yellow";

      return {
        healthy: isHealthy,
        status: isHealthy ? "connected" : "degraded",
        latencyMs: Date.now() - startTime,
        lastChecked: new Date(),
        error: isHealthy ? undefined : `Cluster status: ${clusterStatus}`,
      };
    } catch (error) {
      return {
        healthy: false,
        status: "error",
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        lastChecked: new Date(),
      };
    }
  }

  /**
   * Translate abstract filter to Elasticsearch Query DSL
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): Record<string, unknown> | null {
    const conditions: Record<string, unknown>[] = [];

    for (const [key, value] of Object.entries(filter)) {
      if (key === "$and" && Array.isArray(value)) {
        const subConditions = value
          .map((f) => this.translateFilter(f as MetadataFilter))
          .filter((c): c is Record<string, unknown> => c !== null);
        if (subConditions.length > 0) {
          conditions.push({ bool: { must: subConditions } });
        }
      } else if (key === "$or" && Array.isArray(value)) {
        const subConditions = value
          .map((f) => this.translateFilter(f as MetadataFilter))
          .filter((c): c is Record<string, unknown> => c !== null);
        if (subConditions.length > 0) {
          conditions.push({ bool: { should: subConditions, minimum_should_match: 1 } });
        }
      } else if (key === "$not" && typeof value === "object" && value !== null) {
        const subCondition = this.translateFilter(value as MetadataFilter);
        if (subCondition) {
          conditions.push({ bool: { must_not: subCondition } });
        }
      } else if (this.isFieldFilter(value)) {
        const fieldCondition = this.translateFieldFilter(key, value as FieldFilter);
        if (fieldCondition) {
          conditions.push(fieldCondition);
        }
      } else {
        // Simple equality - use metadata prefix for nested fields
        const fieldPath = `metadata.${key}`;
        conditions.push({ term: { [fieldPath]: value } });
      }
    }

    if (conditions.length === 0) {
      return null;
    }

    if (conditions.length === 1) {
      return conditions[0];
    }

    return { bool: { must: conditions } };
  }

  // ===================
  // PRIVATE HELPER METHODS
  // ===================

  /**
   * Load Elasticsearch client dynamically
   */
  private async loadElasticsearchClient(): Promise<
    new (options: Record<string, unknown>) => ElasticsearchClient
  > {
    try {
      const modulePath = "@elastic/elasticsearch";
      const module = await import(/* @vite-ignore */ modulePath);
      return module.Client;
    } catch {
      throw new Error(
        "Elasticsearch client not found. Install @elastic/elasticsearch: npm install @elastic/elasticsearch"
      );
    }
  }

  /**
   * Verify connection to Elasticsearch
   */
  private async verifyConnection(): Promise<void> {
    try {
      const info = await this.client!.info();
      const version = info.version?.number || info.body?.version?.number;
      logger.debug(`Connected to Elasticsearch ${version}`);
    } catch (error) {
      throw new Error(
        `Failed to verify Elasticsearch connection: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get full index name with optional prefix
   */
  private getIndexName(name: string): string {
    const prefix = this.config.indexPrefix || "";
    return `${prefix}${name}`;
  }

  /**
   * Map NeuroLink metric to Elasticsearch similarity
   */
  private mapMetricToSimilarity(metric: SimilarityMetric): string {
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

  /**
   * Check if value is a field filter
   */
  private isFieldFilter(value: unknown): boolean {
    if (typeof value !== "object" || value === null) return false;
    const keys = Object.keys(value);
    return keys.some((k) => k.startsWith("$"));
  }

  /**
   * Translate a field filter to Elasticsearch query
   */
  private translateFieldFilter(
    key: string,
    filter: FieldFilter,
  ): Record<string, unknown> | null {
    const fieldPath = `metadata.${key}`;
    const conditions: Record<string, unknown>[] = [];

    for (const [op, val] of Object.entries(filter)) {
      switch (op) {
        case "$eq":
          conditions.push({ term: { [fieldPath]: val } });
          break;
        case "$ne":
          conditions.push({ bool: { must_not: { term: { [fieldPath]: val } } } });
          break;
        case "$gt":
          conditions.push({ range: { [fieldPath]: { gt: val } } });
          break;
        case "$gte":
          conditions.push({ range: { [fieldPath]: { gte: val } } });
          break;
        case "$lt":
          conditions.push({ range: { [fieldPath]: { lt: val } } });
          break;
        case "$lte":
          conditions.push({ range: { [fieldPath]: { lte: val } } });
          break;
        case "$in":
          if (Array.isArray(val)) {
            conditions.push({ terms: { [fieldPath]: val } });
          }
          break;
        case "$nin":
          if (Array.isArray(val)) {
            conditions.push({ bool: { must_not: { terms: { [fieldPath]: val } } } });
          }
          break;
        case "$exists":
          if (val) {
            conditions.push({ exists: { field: fieldPath } });
          } else {
            conditions.push({ bool: { must_not: { exists: { field: fieldPath } } } });
          }
          break;
        case "$contains":
          conditions.push({ wildcard: { [fieldPath]: `*${val}*` } });
          break;
        case "$startsWith":
          conditions.push({ prefix: { [fieldPath]: val } });
          break;
        case "$endsWith":
          conditions.push({ wildcard: { [fieldPath]: `*${val}` } });
          break;
        default:
          // Unknown operator, treat as equality
          conditions.push({ term: { [fieldPath]: val } });
      }
    }

    if (conditions.length === 0) {
      return null;
    }

    if (conditions.length === 1) {
      return conditions[0];
    }

    return { bool: { must: conditions } };
  }
}
