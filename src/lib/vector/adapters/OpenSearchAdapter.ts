/**
 * OpenSearch Vector Store Adapter
 * Implements vector similarity search using OpenSearch with k-NN plugin
 *
 * OpenSearch is a fork of Elasticsearch with native k-NN (k-Nearest Neighbors)
 * support. It supports multiple engines: nmslib, faiss, and lucene.
 *
 * @see https://opensearch.org/docs/latest/search-plugins/knn/index/
 */

import type { UnknownRecord } from "../../types/common.js";
import { logger } from "../../utils/logger.js";
import { BaseVectorStore } from "../BaseVectorStore.js";
import type {
  FieldFilter,
  MetadataFilter,
  SimilarityMetric,
  VectorDeleteOptions,
  VectorIndexConfig,
  VectorQueryOptions,
  VectorQueryResult,
  VectorRecord,
  VectorStoreConfig,
  VectorStoreName,
  VectorStoreStats,
  VectorUpsertOptions,
} from "../types.js";

/**
 * OpenSearch-specific configuration
 */
export type OpenSearchConfig = VectorStoreConfig & {
  /** OpenSearch node URL (e.g., "https://localhost:9200") */
  node: string;
  /** Additional nodes for cluster connection */
  nodes?: string[];
  /** Authentication credentials */
  auth?: {
    username: string;
    password: string;
  };
  /** AWS authentication configuration */
  awsAuth?: {
    region: string;
    service?: "es" | "aoss"; // es for OpenSearch Service, aoss for Serverless
    credentials?: {
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
    };
  };
  /** Enable SSL/TLS */
  ssl?: boolean;
  /** Path to CA certificate file */
  caPath?: string;
  /** Skip SSL verification (not recommended for production) */
  rejectUnauthorized?: boolean;
  /** Connection timeout in ms (default: 30000) */
  connectionTimeout?: number;
  /** Request timeout in ms (default: 30000) */
  requestTimeout?: number;
  /** Maximum retries for failed requests (default: 3) */
  maxRetries?: number;
  /** k-NN engine to use: nmslib, faiss, or lucene (default: lucene) */
  knnEngine?: "nmslib" | "faiss" | "lucene";
  /** Number of shards for new indexes (default: 1) */
  numberOfShards?: number;
  /** Number of replicas for new indexes (default: 1) */
  numberOfReplicas?: number;
  /** Refresh interval for indexes (default: "1s") */
  refreshInterval?: string;
  /** Injected client for testing (internal use only) */
  _injectedClient?: OpenSearchClient;
};

/**
 * OpenSearch client type (from @opensearch-project/opensearch)
 * Note: Using modern API without .body wrapper
 * Exported for testing purposes
 */
export interface OpenSearchClient {
  cluster: {
    health: (params?: { index?: string }) => Promise<{
      status: "green" | "yellow" | "red";
      number_of_nodes: number;
      active_shards: number;
    }>;
  };
  indices: {
    create: (params: {
      index: string;
      body: {
        settings: Record<string, unknown>;
        mappings: Record<string, unknown>;
      };
    }) => Promise<{ acknowledged: boolean }>;
    delete: (params: { index: string }) => Promise<{ acknowledged: boolean }>;
    exists: (params: { index: string }) => Promise<boolean>;
    stats: (params: { index: string }) => Promise<{
      _all: {
        primaries: {
          docs: { count: number };
          store: { size_in_bytes: number };
        };
      };
    }>;
    getMapping: (params: { index: string }) => Promise<
      Record<
        string,
        {
          mappings: {
            properties: Record<string, { type: string; dimension?: number }>;
          };
        }
      >
    >;
    refresh: (params: { index: string }) => Promise<unknown>;
  };
  cat: {
    indices: (params: { format: string }) => Promise<Array<{ index: string }>>;
  };
  bulk: (params: { index: string; body: unknown[]; refresh?: boolean | "true" | "false" | "wait_for" }) => Promise<{
    took: number;
    errors: boolean;
    items: Array<{
      index?: { status: number; error?: { reason: string } };
      delete?: { status: number; error?: { reason: string } };
    }>;
  }>;
  search: (params: {
    index: string;
    body: {
      size: number;
      query: Record<string, unknown>;
      _source?: string[] | { includes?: string[]; excludes?: string[] };
    };
  }) => Promise<{
    hits: {
      total: { value: number };
      hits: Array<{
        _id: string;
        _score: number;
        _source: Record<string, unknown>;
      }>;
    };
  }>;
  deleteByQuery: (params: {
    index: string;
    body: { query: Record<string, unknown> };
    refresh?: boolean;
  }) => Promise<{ deleted: number }>;
  close: () => Promise<void>;
}

/**
 * Metric mapping from NeuroLink format to OpenSearch space type
 */
const METRIC_TO_SPACE_TYPE: Record<SimilarityMetric, string> = {
  cosine: "cosinesimil",
  euclidean: "l2",
  dotProduct: "innerproduct",
};

/**
 * OpenSearch Vector Store Adapter
 *
 * Features:
 * - Full k-NN plugin support with multiple engines (nmslib, faiss, lucene)
 * - Metadata filtering with OpenSearch query DSL
 * - Namespace support via index naming convention
 * - Batch operations for efficient bulk upserts
 * - Support for AWS OpenSearch Service and OpenSearch Serverless
 * - Configurable sharding and replication
 *
 * Prerequisites:
 * - OpenSearch cluster with k-NN plugin enabled
 * - @opensearch-project/opensearch SDK installed
 *
 * Example:
 * ```typescript
 * const adapter = new OpenSearchAdapter({
 *   node: "https://localhost:9200",
 *   auth: { username: "admin", password: "admin" },
 *   ssl: true,
 *   knnEngine: "lucene",
 * });
 * await adapter.connect();
 * ```
 */
export class OpenSearchAdapter extends BaseVectorStore<OpenSearchConfig> {
  private client: OpenSearchClient | null = null;
  private indexDimensionCache: Map<string, number> = new Map();

  constructor(config: OpenSearchConfig) {
    super(config, "opensearch" as VectorStoreName);
  }

  /**
   * Initialize connection to OpenSearch cluster
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      logger.debug("OpenSearch already connected");
      return;
    }

    try {
      // Use injected client if provided (for testing)
      if (this.config._injectedClient) {
        this.client = this.config._injectedClient;
        const health = await this.client.cluster.health();
        logger.debug("OpenSearch connected (injected client)", {
          status: health.status,
          nodes: health.number_of_nodes,
        });
        this.initialized = true;
        return;
      }

      const OpenSearchClientClass = await this.loadOpenSearchClient();

      const clientConfig: Record<string, unknown> = {
        node: this.config.node,
        nodes: this.config.nodes,
        requestTimeout: this.config.requestTimeout || 30000,
        maxRetries: this.config.maxRetries || 3,
      };

      // Configure authentication
      if (this.config.auth) {
        clientConfig.auth = this.config.auth;
      }

      // Configure SSL
      if (this.config.ssl !== false) {
        clientConfig.ssl = {
          rejectUnauthorized: this.config.rejectUnauthorized !== false,
        };
        if (this.config.caPath) {
          // CA path would be loaded by the client
          clientConfig.ssl = {
            ...(clientConfig.ssl as object),
            ca: this.config.caPath,
          };
        }
      }

      // Configure AWS authentication if provided
      if (this.config.awsAuth) {
        const { createAwsConnector } = await this.loadAwsConnector();
        const awsConfig = createAwsConnector(this.config.awsAuth);
        Object.assign(clientConfig, awsConfig);
      }

      this.client = new OpenSearchClientClass(clientConfig) as OpenSearchClient;

      // Verify connection with a health check
      const health = await this.client.cluster.health();
      logger.debug("OpenSearch connected successfully", {
        status: health.status,
        nodes: health.number_of_nodes,
      });

      this.initialized = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to OpenSearch: ${message}`);
    }
  }

  /**
   * Close connection to OpenSearch
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
        this.client = null;
        this.initialized = false;
        this.indexDimensionCache.clear();
        logger.debug("OpenSearch disconnected");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to disconnect from OpenSearch: ${message}`);
      }
    }
  }

  /**
   * Create a new k-NN index
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const { name, dimension, metric = "cosine", config: indexConfig } = config;
    const indexName = this.normalizeIndexName(name);
    const knnEngine = this.config.knnEngine || "lucene";
    const spaceType = METRIC_TO_SPACE_TYPE[metric];

    try {
      // Check if index already exists
      const exists = await this.client!.indices.exists({ index: indexName });
      if (exists) {
        logger.debug(`Index ${indexName} already exists`);
        this.indexDimensionCache.set(indexName, dimension);
        return;
      }

      // Build k-NN method configuration based on engine
      const knnMethod = this.buildKnnMethod(knnEngine, dimension, spaceType);

      // Create index with k-NN mapping
      await this.client!.indices.create({
        index: indexName,
        body: {
          settings: {
            "index.knn": true,
            "index.knn.space_type": spaceType,
            number_of_shards: this.config.numberOfShards || 1,
            number_of_replicas: this.config.numberOfReplicas || 1,
            refresh_interval: this.config.refreshInterval || "1s",
            ...((indexConfig as Record<string, unknown>) || {}),
          },
          mappings: {
            properties: {
              id: { type: "keyword" },
              vector: {
                type: "knn_vector",
                dimension,
                method: knnMethod,
              },
              metadata: { type: "object", enabled: true },
              content: { type: "text" },
              namespace: { type: "keyword" },
              created_at: { type: "date" },
              updated_at: { type: "date" },
            },
          },
        },
      });

      this.indexDimensionCache.set(indexName, dimension);
      logger.debug(`Created index ${indexName}`, {
        dimension,
        metric,
        knnEngine,
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

    const normalizedName = this.normalizeIndexName(indexName);

    try {
      const exists = await this.client!.indices.exists({
        index: normalizedName,
      });
      if (!exists) {
        logger.debug(`Index ${normalizedName} does not exist`);
        return;
      }

      await this.client!.indices.delete({ index: normalizedName });
      this.indexDimensionCache.delete(normalizedName);
      logger.debug(`Deleted index ${normalizedName}`);
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
      const response = await this.client!.cat.indices({ format: "json" });
      // Filter out system indexes (those starting with ".")
      return response.filter((idx) => !idx.index.startsWith(".")).map((idx) => idx.index);
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

    try {
      const normalizedName = this.normalizeIndexName(indexName);
      const response = await this.client!.indices.exists({
        index: normalizedName,
      });
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to check index existence: ${message}`);
    }
  }

  /**
   * Upsert vectors into the index
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

    const normalizedName = this.normalizeIndexName(indexName);
    const namespace = options?.namespace || null;

    // Validate dimensions
    this.validateDimensions(records.map((r) => r.vector));

    try {
      // Build bulk request body
      const bulkBody: unknown[] = [];
      const now = new Date().toISOString();

      for (const record of records) {
        // Index action (upsert semantics via document ID)
        bulkBody.push({
          index: {
            _index: normalizedName,
            _id: record.id,
          },
        });

        // Document body
        bulkBody.push({
          id: record.id,
          vector: record.vector,
          metadata: record.metadata || {},
          content: record.content || null,
          namespace: record.namespace || namespace,
          created_at: now,
          updated_at: now,
        });
      }

      // Execute bulk request
      const response = await this.client!.bulk({
        index: normalizedName,
        body: bulkBody,
        refresh: true,
      });

      if (response.errors) {
        // Count successful operations
        const successCount = response.items.filter(
          (item) => item.index && item.index.status >= 200 && item.index.status < 300,
        ).length;

        // Log first error for debugging
        const firstError = response.items.find((item) => item.index?.error);
        if (firstError?.index?.error) {
          logger.warn(`Bulk upsert had errors: ${firstError.index.error.reason}`);
        }

        return { upsertedCount: successCount };
      }

      logger.debug(`Upserted ${records.length} records to ${normalizedName}`);
      return { upsertedCount: records.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to upsert records: ${message}`);
    }
  }

  /**
   * Query vectors by similarity using k-NN search
   */
  async query<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options: VectorQueryOptions<TMetadata>,
  ): Promise<VectorQueryResult<TMetadata>[]> {
    this.ensureInitialized();

    const normalizedName = this.normalizeIndexName(indexName);
    const { vector, topK, minScore, filter, includeVectors = false, includeMetadata = true, namespace } = options;

    try {
      // Build k-NN query
      const knnQuery: Record<string, unknown> = {
        knn: {
          vector: {
            vector,
            k: topK,
          },
        },
      };

      // Add filter if provided
      const filterQuery = this.buildFilterQuery(filter, namespace);
      let finalQuery: Record<string, unknown>;

      if (filterQuery) {
        // Combine k-NN with filter using bool query
        finalQuery = {
          bool: {
            must: [knnQuery],
            filter: filterQuery,
          },
        };
      } else {
        finalQuery = knnQuery;
      }

      // Build source filter
      const sourceFields: string[] = ["id", "content"];
      if (includeMetadata) {
        sourceFields.push("metadata");
      }
      if (includeVectors) {
        sourceFields.push("vector");
      }

      // Execute search
      const response = await this.client!.search({
        index: normalizedName,
        body: {
          size: topK,
          query: finalQuery,
          _source: sourceFields,
        },
      });

      // Transform results
      const results: VectorQueryResult<TMetadata>[] = [];

      for (const hit of response.hits.hits) {
        const score = hit._score || 0;

        // Apply minimum score filter
        if (minScore !== undefined && score < minScore) {
          continue;
        }

        const result: VectorQueryResult<TMetadata> = {
          id: hit._id,
          score,
        };

        if (hit._source.content) {
          result.content = hit._source.content as string;
        }

        if (includeMetadata && hit._source.metadata) {
          result.metadata = hit._source.metadata as TMetadata;
        }

        if (includeVectors && hit._source.vector) {
          result.vector = hit._source.vector as number[];
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
  async delete(indexName: string, options: VectorDeleteOptions): Promise<{ deletedCount: number }> {
    this.ensureInitialized();

    const normalizedName = this.normalizeIndexName(indexName);
    const { ids, filter, namespace, deleteAll } = options;

    try {
      let query: Record<string, unknown>;

      if (deleteAll) {
        // Delete all, optionally filtered by namespace
        if (namespace) {
          query = {
            term: { namespace },
          };
        } else {
          query = { match_all: {} };
        }
      } else if (ids && ids.length > 0) {
        // Delete by IDs
        query = {
          ids: { values: ids },
        };
      } else if (filter) {
        // Delete by filter
        query = this.translateFilter(filter) as Record<string, unknown>;
      } else {
        // No delete criteria provided
        return { deletedCount: 0 };
      }

      const response = await this.client!.deleteByQuery({
        index: normalizedName,
        body: { query },
        refresh: true,
      });

      logger.debug(`Deleted ${response.deleted} records from ${normalizedName}`);
      return { deletedCount: response.deleted };
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

    const normalizedName = this.normalizeIndexName(indexName);

    try {
      // Get index stats
      const statsResponse = await this.client!.indices.stats({
        index: normalizedName,
      });
      const indexStats = statsResponse._all.primaries;

      // Get dimension from mapping
      let dimension: number | undefined = this.indexDimensionCache.get(normalizedName);

      if (!dimension) {
        const mappingResponse = await this.client!.indices.getMapping({
          index: normalizedName,
        });
        const mapping = Object.values(mappingResponse)[0];
        const vectorMapping = mapping?.mappings?.properties?.vector;
        dimension = vectorMapping?.dimension;

        if (dimension) {
          this.indexDimensionCache.set(normalizedName, dimension);
        }
      }

      // Get namespace count (approximate via aggregation)
      let namespaceCount = 0;
      try {
        const namespaceAgg = await this.client!.search({
          index: normalizedName,
          body: {
            size: 0,
            query: { match_all: {} },
            _source: [] as string[],
          },
        });
        namespaceCount = namespaceAgg.hits.total.value > 0 ? 1 : 0;
      } catch {
        // Ignore aggregation errors
      }

      return {
        vectorCount: indexStats.docs.count,
        indexSize: indexStats.store.size_in_bytes,
        dimension,
        namespaceCount,
        metrics: {
          knnEngine: this.config.knnEngine || "lucene",
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get stats for ${indexName}: ${message}`);
    }
  }

  /**
   * Translate abstract filter to OpenSearch query DSL
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): Record<string, unknown> {
    const conditions: Record<string, unknown>[] = [];

    for (const [key, value] of Object.entries(filter)) {
      if (key === "$and" && Array.isArray(value)) {
        const subConditions = value.map((f) => this.translateFilter(f as MetadataFilter));
        conditions.push({
          bool: { must: subConditions },
        });
      } else if (key === "$or" && Array.isArray(value)) {
        const subConditions = value.map((f) => this.translateFilter(f as MetadataFilter));
        conditions.push({
          bool: { should: subConditions, minimum_should_match: 1 },
        });
      } else if (key === "$not" && typeof value === "object" && value !== null) {
        const subCondition = this.translateFilter(value as MetadataFilter);
        conditions.push({
          bool: { must_not: [subCondition] },
        });
      } else if (this.isFieldFilter(value)) {
        const fieldCondition = this.translateFieldFilter(`metadata.${key}`, value as FieldFilter);
        conditions.push(fieldCondition);
      } else {
        // Simple equality
        conditions.push({
          term: { [`metadata.${key}`]: value },
        });
      }
    }

    if (conditions.length === 0) {
      return { match_all: {} };
    }

    if (conditions.length === 1) {
      return conditions[0];
    }

    return {
      bool: { must: conditions },
    };
  }

  // ===================
  // PRIVATE HELPER METHODS
  // ===================

  /**
   * Load OpenSearch client dynamically
   */
  private async loadOpenSearchClient(): Promise<new (config: Record<string, unknown>) => OpenSearchClient> {
    try {
      const modulePath = "@opensearch-project/opensearch";
      const module = await import(/* @vite-ignore */ modulePath);
      return module.Client;
    } catch {
      throw new Error(
        "OpenSearch client not found. Install @opensearch-project/opensearch: npm install @opensearch-project/opensearch",
      );
    }
  }

  /**
   * Load AWS connector for OpenSearch Service authentication
   */
  private async loadAwsConnector(): Promise<{
    createAwsConnector: (config: OpenSearchConfig["awsAuth"]) => Record<string, unknown>;
  }> {
    try {
      // The actual implementation would use @aws-sdk packages
      // This is a placeholder that returns a configuration object
      return {
        createAwsConnector: (awsAuth) => {
          if (!awsAuth) return {};

          return {
            // AWS signature would be configured here
            // This typically uses aws4 or @aws-sdk/signature-v4
            node: this.config.node,
            // Additional AWS-specific configuration
          };
        },
      };
    } catch {
      throw new Error(
        "AWS SDK not found for OpenSearch Service authentication. Install @aws-sdk/credential-provider-node",
      );
    }
  }

  /**
   * Normalize index name for OpenSearch (lowercase, no special chars)
   */
  private normalizeIndexName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  }

  /**
   * Build k-NN method configuration based on engine
   */
  private buildKnnMethod(
    engine: "nmslib" | "faiss" | "lucene",
    _dimension: number,
    spaceType: string,
  ): Record<string, unknown> {
    switch (engine) {
      case "nmslib":
        return {
          name: "hnsw",
          space_type: spaceType,
          engine: "nmslib",
          parameters: {
            ef_construction: 128,
            m: 24,
          },
        };

      case "faiss":
        return {
          name: "hnsw",
          space_type: spaceType,
          engine: "faiss",
          parameters: {
            ef_construction: 256,
            m: 32,
            ef_search: 100,
          },
        };

      case "lucene":
      default:
        return {
          name: "hnsw",
          space_type: spaceType,
          engine: "lucene",
          parameters: {
            ef_construction: 100,
            m: 16,
          },
        };
    }
  }

  /**
   * Build filter query for k-NN search
   */
  private buildFilterQuery<TMetadata extends UnknownRecord>(
    filter?: MetadataFilter<TMetadata>,
    namespace?: string,
  ): Record<string, unknown>[] | null {
    const filters: Record<string, unknown>[] = [];

    if (namespace) {
      filters.push({ term: { namespace } });
    }

    if (filter && Object.keys(filter).length > 0) {
      filters.push(this.translateFilter(filter));
    }

    return filters.length > 0 ? filters : null;
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
   * Translate a field filter to OpenSearch query
   */
  private translateFieldFilter(field: string, filter: FieldFilter): Record<string, unknown> {
    const conditions: Record<string, unknown>[] = [];

    for (const [op, val] of Object.entries(filter)) {
      switch (op) {
        case "$eq":
          conditions.push({ term: { [field]: val } });
          break;

        case "$ne":
          conditions.push({
            bool: { must_not: [{ term: { [field]: val } }] },
          });
          break;

        case "$gt":
          conditions.push({ range: { [field]: { gt: val } } });
          break;

        case "$gte":
          conditions.push({ range: { [field]: { gte: val } } });
          break;

        case "$lt":
          conditions.push({ range: { [field]: { lt: val } } });
          break;

        case "$lte":
          conditions.push({ range: { [field]: { lte: val } } });
          break;

        case "$in":
          if (Array.isArray(val)) {
            conditions.push({ terms: { [field]: val } });
          }
          break;

        case "$nin":
          if (Array.isArray(val)) {
            conditions.push({
              bool: { must_not: [{ terms: { [field]: val } }] },
            });
          }
          break;

        case "$exists":
          if (val) {
            conditions.push({ exists: { field } });
          } else {
            conditions.push({
              bool: { must_not: [{ exists: { field } }] },
            });
          }
          break;

        case "$contains":
          conditions.push({ wildcard: { [field]: `*${val}*` } });
          break;

        case "$startsWith":
          conditions.push({ prefix: { [field]: val } });
          break;

        case "$endsWith":
          conditions.push({ wildcard: { [field]: `*${val}` } });
          break;

        default:
          // Unknown operator, treat as equality
          conditions.push({ term: { [field]: val } });
      }
    }

    if (conditions.length === 1) {
      return conditions[0];
    }

    return {
      bool: { must: conditions },
    };
  }
}
