/**
 * Milvus Vector Store Adapter
 * Implements vector similarity search using Milvus/Zilliz Cloud
 *
 * Milvus is a highly scalable open-source vector database designed for
 * similarity search and AI applications. It supports multiple index types
 * (IVF_FLAT, HNSW, etc.) and partition-based data organization.
 *
 * @see https://milvus.io/docs
 * @see https://github.com/milvus-io/milvus-sdk-node
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
 * Milvus-specific configuration
 */
export type MilvusConfig = VectorStoreConfig & {
  /** Milvus server address (e.g., "localhost:19530") */
  address: string;
  /** Milvus username (optional for local, required for Zilliz Cloud) */
  username?: string;
  /** Milvus password (optional for local, required for Zilliz Cloud) */
  password?: string;
  /** Milvus token for authentication (alternative to username/password) */
  token?: string;
  /** Enable SSL/TLS connection */
  ssl?: boolean;
  /** Connection pool size */
  poolSize?: number;
  /** Default index type for new collections */
  defaultIndexType?: MilvusIndexType;
  /** Default index parameters */
  defaultIndexParams?: MilvusIndexParams;
  /** Whether to automatically create indexes */
  autoIndex?: boolean;
};

/**
 * Milvus supported index types
 */
export type MilvusIndexType =
  | "IVF_FLAT"
  | "IVF_SQ8"
  | "IVF_PQ"
  | "HNSW"
  | "ANNOY"
  | "AUTOINDEX"
  | "FLAT"
  | "BIN_FLAT"
  | "BIN_IVF_FLAT";

/**
 * Index parameters for different index types
 */
export type MilvusIndexParams = {
  /** Number of cluster units (IVF indexes) */
  nlist?: number;
  /** Number of sub-quantizers (IVF_PQ) */
  m?: number;
  /** Number of bits per sub-quantizer (IVF_PQ) */
  nbits?: number;
  /** M value for HNSW */
  M?: number;
  /** efConstruction for HNSW */
  efConstruction?: number;
  /** Number of trees (ANNOY) */
  n_trees?: number;
};

/**
 * Search parameters for different index types
 */
export type MilvusSearchParams = {
  /** Number of clusters to search (IVF indexes) */
  nprobe?: number;
  /** ef for HNSW search */
  ef?: number;
  /** search_k for ANNOY */
  search_k?: number;
};

/**
 * Internal types for Milvus SDK
 */
interface MilvusClient {
  connect(): Promise<void>;
  close(): Promise<void>;
  createCollection(params: CreateCollectionParams): Promise<MilvusResponse>;
  dropCollection(params: { collection_name: string }): Promise<MilvusResponse>;
  hasCollection(params: { collection_name: string }): Promise<{ value: boolean }>;
  listCollections(): Promise<{ collection_names: string[] }>;
  describeCollection(params: { collection_name: string }): Promise<CollectionDescription>;
  getCollectionStatistics(params: { collection_name: string }): Promise<CollectionStats>;
  createIndex(params: CreateIndexParams): Promise<MilvusResponse>;
  loadCollection(params: { collection_name: string }): Promise<MilvusResponse>;
  releaseCollection(params: { collection_name: string }): Promise<MilvusResponse>;
  insert(params: InsertParams): Promise<InsertResponse>;
  upsert(params: InsertParams): Promise<InsertResponse>;
  search(params: SearchParams): Promise<SearchResponse>;
  delete(params: DeleteParams): Promise<MilvusResponse>;
  query(params: QueryParams): Promise<QueryResponse>;
  createPartition(params: { collection_name: string; partition_name: string }): Promise<MilvusResponse>;
  dropPartition(params: { collection_name: string; partition_name: string }): Promise<MilvusResponse>;
  hasPartition(params: { collection_name: string; partition_name: string }): Promise<{ value: boolean }>;
  listPartitions(params: { collection_name: string }): Promise<{ partition_names: string[] }>;
  checkHealth(): Promise<{ isHealthy: boolean }>;
}

interface CreateCollectionParams {
  collection_name: string;
  fields: FieldSchema[];
  enable_dynamic_field?: boolean;
  consistency_level?: "Strong" | "Session" | "Bounded" | "Eventually";
}

interface FieldSchema {
  name: string;
  description?: string;
  data_type: DataType;
  is_primary_key?: boolean;
  autoID?: boolean;
  dim?: number;
  max_length?: number;
}

type DataType =
  | "Bool"
  | "Int8"
  | "Int16"
  | "Int32"
  | "Int64"
  | "Float"
  | "Double"
  | "VarChar"
  | "FloatVector"
  | "BinaryVector"
  | "JSON";

interface CreateIndexParams {
  collection_name: string;
  field_name: string;
  index_type: MilvusIndexType;
  metric_type: MilvusMetricType;
  params?: MilvusIndexParams;
}

type MilvusMetricType = "L2" | "IP" | "COSINE";

interface InsertParams {
  collection_name: string;
  partition_name?: string;
  fields_data: Record<string, unknown>[];
}

interface InsertResponse {
  succ_index: number[];
  insert_cnt: number;
  IDs: { id_field: { data: string[] | number[] } };
}

interface SearchParams {
  collection_name: string;
  partition_names?: string[];
  vector: number[];
  vectors?: number[][];
  output_fields?: string[];
  limit: number;
  expr?: string;
  metric_type?: MilvusMetricType;
  params?: MilvusSearchParams;
}

interface SearchResponse {
  results: SearchResult[];
}

interface SearchResult {
  id: string | number;
  score: number;
  [key: string]: unknown;
}

interface DeleteParams {
  collection_name: string;
  partition_name?: string;
  expr?: string;
  ids?: string[] | number[];
}

interface QueryParams {
  collection_name: string;
  partition_names?: string[];
  output_fields?: string[];
  expr?: string;
  limit?: number;
  offset?: number;
}

interface QueryResponse {
  data: Record<string, unknown>[];
}

interface CollectionDescription {
  schema: {
    fields: Array<{
      name: string;
      data_type: string;
      type_params: Array<{ key: string; value: string }>;
    }>;
  };
  collectionID: string;
}

interface CollectionStats {
  stats: Array<{ key: string; value: string }>;
}

interface MilvusResponse {
  error_code: string;
  reason?: string;
}

/**
 * Milvus Vector Store Adapter
 *
 * Features:
 * - High-performance vector similarity search
 * - Multiple index types (IVF_FLAT, HNSW, etc.)
 * - Partition support for data organization
 * - Metadata filtering with expression language
 * - Batch operations for performance
 * - Automatic index creation
 * - Support for both Milvus and Zilliz Cloud
 *
 * Note: Requires the @zilliz/milvus2-sdk-node package.
 * Install with: npm install @zilliz/milvus2-sdk-node
 */
export class MilvusAdapter extends BaseVectorStore<MilvusConfig> {
  private client: MilvusClient | null = null;
  private collectionCache: Map<string, CollectionDescription> = new Map();

  // Reserved field names in Milvus
  private static readonly ID_FIELD = "id";
  private static readonly VECTOR_FIELD = "vector";
  private static readonly CONTENT_FIELD = "content";
  private static readonly METADATA_FIELD = "metadata";

  constructor(config: MilvusConfig) {
    super(config, "milvus" as VectorStoreName);
  }

  /**
   * Initialize connection to Milvus
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      logger.debug("Milvus already connected");
      return;
    }

    try {
      const MilvusClientClass = await this.loadMilvusDriver();

      // Build connection configuration
      const connectionConfig: Record<string, unknown> = {
        address: this.config.address,
        ssl: this.config.ssl ?? false,
      };

      // Add authentication
      if (this.config.token) {
        connectionConfig.token = this.config.token;
      } else if (this.config.username && this.config.password) {
        connectionConfig.username = this.config.username;
        connectionConfig.password = this.config.password;
      }

      // Create client
      this.client = new MilvusClientClass(connectionConfig) as MilvusClient;

      // Test connection
      await this.client.checkHealth();

      this.initialized = true;
      logger.debug("Milvus connected successfully", {
        address: this.config.address,
        ssl: this.config.ssl,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to Milvus: ${message}`);
    }
  }

  /**
   * Close the Milvus connection
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
        this.client = null;
        this.initialized = false;
        this.collectionCache.clear();
        logger.debug("Milvus disconnected");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to disconnect from Milvus: ${message}`);
      }
    }
  }

  /**
   * Create a new collection (index)
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const { name, dimension, metric = "cosine" } = config;
    const collectionName = this.sanitizeCollectionName(name);

    try {
      // Check if collection already exists
      const exists = await this.client!.hasCollection({
        collection_name: collectionName,
      });

      if (exists.value) {
        logger.debug(`Collection ${collectionName} already exists`);
        return;
      }

      // Define schema with fields
      const fields: FieldSchema[] = [
        {
          name: MilvusAdapter.ID_FIELD,
          data_type: "VarChar",
          is_primary_key: true,
          max_length: 256,
        },
        {
          name: MilvusAdapter.VECTOR_FIELD,
          data_type: "FloatVector",
          dim: dimension,
        },
        {
          name: MilvusAdapter.CONTENT_FIELD,
          data_type: "VarChar",
          max_length: 65535,
        },
        {
          name: MilvusAdapter.METADATA_FIELD,
          data_type: "JSON",
        },
      ];

      // Create collection
      await this.client!.createCollection({
        collection_name: collectionName,
        fields,
        enable_dynamic_field: true,
        consistency_level: "Strong",
      });

      // Create index if auto-indexing is enabled (default: true)
      if (this.config.autoIndex !== false) {
        const indexType = this.config.defaultIndexType || "HNSW";
        const indexParams = this.config.defaultIndexParams || {
          M: 16,
          efConstruction: 256,
        };

        await this.client!.createIndex({
          collection_name: collectionName,
          field_name: MilvusAdapter.VECTOR_FIELD,
          index_type: indexType,
          metric_type: this.metricToMilvus(metric),
          params: indexParams,
        });

        // Load collection into memory for searching
        await this.client!.loadCollection({
          collection_name: collectionName,
        });
      }

      logger.debug(`Created collection ${collectionName}`, { dimension, metric });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create collection ${name}: ${message}`);
    }
  }

  /**
   * Delete a collection (index)
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    const collectionName = this.sanitizeCollectionName(indexName);

    try {
      // Release collection from memory first
      try {
        await this.client!.releaseCollection({
          collection_name: collectionName,
        });
      } catch {
        // Ignore if not loaded
      }

      // Drop collection
      await this.client!.dropCollection({
        collection_name: collectionName,
      });

      this.collectionCache.delete(indexName);
      logger.debug(`Deleted collection ${collectionName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete collection ${indexName}: ${message}`);
    }
  }

  /**
   * List all collections (indexes)
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    try {
      const result = await this.client!.listCollections();
      return result.collection_names || [];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to list collections: ${message}`);
    }
  }

  /**
   * Check if a collection exists
   */
  async indexExists(indexName: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      const collectionName = this.sanitizeCollectionName(indexName);
      const result = await this.client!.hasCollection({
        collection_name: collectionName,
      });
      return result.value;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to check collection existence: ${message}`);
    }
  }

  /**
   * Upsert vectors into the collection
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

    const collectionName = this.sanitizeCollectionName(indexName);
    const partitionName = options?.namespace;

    // Validate dimensions
    this.validateDimensions(records.map((r) => r.vector));

    try {
      // Create partition if specified and doesn't exist
      if (partitionName) {
        await this.ensurePartition(collectionName, partitionName);
      }

      // Prepare data for insertion
      const fieldsData = records.map((record) => ({
        [MilvusAdapter.ID_FIELD]: record.id,
        [MilvusAdapter.VECTOR_FIELD]: record.vector,
        [MilvusAdapter.CONTENT_FIELD]: record.content || "",
        [MilvusAdapter.METADATA_FIELD]: record.metadata || {},
      }));

      // Use upsert for insert-or-update behavior
      const result = await this.client!.upsert({
        collection_name: collectionName,
        partition_name: partitionName,
        fields_data: fieldsData,
      });

      const upsertedCount = result.insert_cnt || records.length;
      logger.debug(`Upserted ${upsertedCount} records to ${indexName}`);

      return { upsertedCount };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to upsert records: ${message}`);
    }
  }

  /**
   * Query vectors by similarity
   */
  async query<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options: VectorQueryOptions<TMetadata>,
  ): Promise<VectorQueryResult<TMetadata>[]> {
    this.ensureInitialized();

    const collectionName = this.sanitizeCollectionName(indexName);
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
      // Build output fields
      const outputFields: string[] = [MilvusAdapter.ID_FIELD, MilvusAdapter.CONTENT_FIELD];
      if (includeVectors) {
        outputFields.push(MilvusAdapter.VECTOR_FIELD);
      }
      if (includeMetadata) {
        outputFields.push(MilvusAdapter.METADATA_FIELD);
      }

      // Build filter expression
      let expr: string | undefined;
      if (filter) {
        expr = this.translateFilter(filter);
      }

      // Build search parameters
      const searchParams: SearchParams = {
        collection_name: collectionName,
        vector,
        output_fields: outputFields,
        limit: topK,
        expr,
        params: {
          ef: Math.max(topK * 2, 64), // HNSW search parameter
          nprobe: 10, // IVF search parameter
        },
      };

      // Add partition filter if namespace specified
      if (namespace) {
        searchParams.partition_names = [namespace];
      }

      // Execute search
      const result = await this.client!.search(searchParams);

      // Process results
      const results: VectorQueryResult<TMetadata>[] = [];

      for (const hit of result.results || []) {
        // Apply minimum score filter
        // Note: For L2 distance, lower is better; for IP/COSINE, higher is better
        if (minScore !== undefined && hit.score < minScore) {
          continue;
        }

        const queryResult: VectorQueryResult<TMetadata> = {
          id: String(hit.id),
          score: hit.score,
          content: hit[MilvusAdapter.CONTENT_FIELD] as string | undefined,
        };

        if (includeVectors && hit[MilvusAdapter.VECTOR_FIELD]) {
          queryResult.vector = hit[MilvusAdapter.VECTOR_FIELD] as number[];
        }

        if (includeMetadata && hit[MilvusAdapter.METADATA_FIELD]) {
          queryResult.metadata = hit[MilvusAdapter.METADATA_FIELD] as TMetadata;
        }

        results.push(queryResult);
      }

      return results;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to query vectors: ${message}`);
    }
  }

  /**
   * Delete vectors from the collection
   */
  async delete(
    indexName: string,
    options: VectorDeleteOptions,
  ): Promise<{ deletedCount: number }> {
    this.ensureInitialized();

    const collectionName = this.sanitizeCollectionName(indexName);
    const { ids, filter, namespace, deleteAll } = options;

    try {
      let deletedCount = 0;

      if (deleteAll) {
        // Delete all records - Milvus requires an expression
        if (namespace) {
          // Delete all in partition
          await this.client!.dropPartition({
            collection_name: collectionName,
            partition_name: namespace,
          });
          // Recreate partition to maintain structure
          await this.client!.createPartition({
            collection_name: collectionName,
            partition_name: namespace,
          });
        } else {
          // Delete all using expression that matches everything
          // This is a workaround as Milvus doesn't have a simple "delete all"
          await this.client!.delete({
            collection_name: collectionName,
            expr: `${MilvusAdapter.ID_FIELD} != ""`,
          });
        }
        // We can't easily get count, estimate based on stats
        const stats = await this.getStats(indexName);
        deletedCount = stats.vectorCount;
      } else if (ids && ids.length > 0) {
        // Delete by IDs
        const idsExpr = ids.map((id) => `"${id}"`).join(", ");
        await this.client!.delete({
          collection_name: collectionName,
          partition_name: namespace,
          expr: `${MilvusAdapter.ID_FIELD} in [${idsExpr}]`,
        });
        deletedCount = ids.length;
      } else if (filter) {
        // Delete by filter expression
        const expr = this.translateFilter(filter);
        await this.client!.delete({
          collection_name: collectionName,
          partition_name: namespace,
          expr,
        });
        // Can't determine exact count for filter-based delete
        deletedCount = 0;
      }

      logger.debug(`Deleted ${deletedCount} records from ${indexName}`);
      return { deletedCount };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete records: ${message}`);
    }
  }

  /**
   * Get collection statistics
   */
  async getStats(indexName: string): Promise<VectorStoreStats> {
    this.ensureInitialized();

    const collectionName = this.sanitizeCollectionName(indexName);

    try {
      // Get collection statistics
      const stats = await this.client!.getCollectionStatistics({
        collection_name: collectionName,
      });

      // Get collection schema for dimension info
      const description = await this.getCollectionDescription(collectionName);

      // Parse stats
      let vectorCount = 0;
      for (const stat of stats.stats || []) {
        if (stat.key === "row_count") {
          vectorCount = parseInt(stat.value, 10);
        }
      }

      // Get dimension from schema
      let dimension: number | undefined;
      for (const field of description.schema.fields) {
        if (field.name === MilvusAdapter.VECTOR_FIELD) {
          for (const param of field.type_params || []) {
            if (param.key === "dim") {
              dimension = parseInt(param.value, 10);
            }
          }
        }
      }

      // Get partition count (namespaces)
      const partitions = await this.client!.listPartitions({
        collection_name: collectionName,
      });

      return {
        vectorCount,
        dimension,
        namespaceCount: (partitions.partition_names || []).length,
        metrics: {
          collectionId: description.collectionID,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get stats for ${indexName}: ${message}`);
    }
  }

  /**
   * Health check for Milvus connection
   */
  async healthCheck(): Promise<VectorStoreHealth> {
    const startTime = Date.now();

    try {
      if (!this.client) {
        return {
          healthy: false,
          status: "disconnected",
          latencyMs: Date.now() - startTime,
          lastChecked: new Date(),
          error: "Client not connected",
        };
      }

      const health = await this.client.checkHealth();

      return {
        healthy: health.isHealthy,
        status: health.isHealthy ? "connected" : "degraded",
        latencyMs: Date.now() - startTime,
        lastChecked: new Date(),
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
   * Translate abstract filter to Milvus expression language
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): string {
    const conditions: string[] = [];

    for (const [key, value] of Object.entries(filter)) {
      if (key === "$and" && Array.isArray(value)) {
        const subConditions = value.map((f) =>
          this.translateFilter(f as MetadataFilter),
        );
        conditions.push(`(${subConditions.join(" and ")})`);
      } else if (key === "$or" && Array.isArray(value)) {
        const subConditions = value.map((f) =>
          this.translateFilter(f as MetadataFilter),
        );
        conditions.push(`(${subConditions.join(" or ")})`);
      } else if (key === "$not" && typeof value === "object" && value !== null) {
        const subExpr = this.translateFilter(value as MetadataFilter);
        conditions.push(`not (${subExpr})`);
      } else if (this.isFieldFilter(value)) {
        conditions.push(this.translateFieldFilter(key, value as FieldFilter));
      } else {
        // Simple equality - use JSON path for metadata fields
        const fieldPath = this.getFieldPath(key);
        conditions.push(`${fieldPath} == ${this.formatValue(value)}`);
      }
    }

    return conditions.length > 0 ? conditions.join(" and ") : "";
  }

  // ===================
  // PRIVATE HELPER METHODS
  // ===================

  /**
   * Load Milvus SDK dynamically
   */
  private async loadMilvusDriver(): Promise<new (config: Record<string, unknown>) => MilvusClient> {
    try {
      const modulePath = "@zilliz/milvus2-sdk-node";
      const module = await import(/* @vite-ignore */ modulePath);
      return module.MilvusClient;
    } catch {
      throw new Error(
        "Milvus SDK not found. Install @zilliz/milvus2-sdk-node: npm install @zilliz/milvus2-sdk-node",
      );
    }
  }

  /**
   * Convert similarity metric to Milvus metric type
   */
  private metricToMilvus(metric: SimilarityMetric): MilvusMetricType {
    switch (metric) {
      case "cosine":
        return "COSINE";
      case "euclidean":
        return "L2";
      case "dotProduct":
        return "IP";
      default:
        return "COSINE";
    }
  }

  /**
   * Sanitize collection name to be Milvus-compatible
   */
  private sanitizeCollectionName(name: string): string {
    // Milvus collection names must start with letter/underscore
    // and contain only alphanumeric/underscore characters
    let sanitized = name.replace(/[^a-zA-Z0-9_]/g, "_");
    if (!/^[a-zA-Z_]/.test(sanitized)) {
      sanitized = "_" + sanitized;
    }
    return sanitized;
  }

  /**
   * Ensure a partition exists
   */
  private async ensurePartition(
    collectionName: string,
    partitionName: string,
  ): Promise<void> {
    try {
      const exists = await this.client!.hasPartition({
        collection_name: collectionName,
        partition_name: partitionName,
      });

      if (!exists.value) {
        await this.client!.createPartition({
          collection_name: collectionName,
          partition_name: partitionName,
        });
      }
    } catch {
      // Ignore errors - partition might already exist
    }
  }

  /**
   * Get cached collection description
   */
  private async getCollectionDescription(
    collectionName: string,
  ): Promise<CollectionDescription> {
    const cached = this.collectionCache.get(collectionName);
    if (cached) {
      return cached;
    }

    const description = await this.client!.describeCollection({
      collection_name: collectionName,
    });

    this.collectionCache.set(collectionName, description);
    return description;
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
   * Get field path for Milvus expression
   * Metadata fields use JSON path syntax
   */
  private getFieldPath(key: string): string {
    // Reserved fields are accessed directly
    if ([MilvusAdapter.ID_FIELD, MilvusAdapter.CONTENT_FIELD].includes(key)) {
      return key;
    }
    // Metadata fields use JSON path
    return `${MilvusAdapter.METADATA_FIELD}["${key}"]`;
  }

  /**
   * Format value for Milvus expression
   */
  private formatValue(value: unknown): string {
    if (typeof value === "string") {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }
    if (value === null) {
      return "null";
    }
    if (Array.isArray(value)) {
      return `[${value.map((v) => this.formatValue(v)).join(", ")}]`;
    }
    return String(value);
  }

  /**
   * Translate a field filter to Milvus expression
   */
  private translateFieldFilter(key: string, filter: FieldFilter): string {
    const conditions: string[] = [];
    const fieldPath = this.getFieldPath(key);

    for (const [op, val] of Object.entries(filter)) {
      switch (op) {
        case "$eq":
          conditions.push(`${fieldPath} == ${this.formatValue(val)}`);
          break;
        case "$ne":
          conditions.push(`${fieldPath} != ${this.formatValue(val)}`);
          break;
        case "$gt":
          conditions.push(`${fieldPath} > ${this.formatValue(val)}`);
          break;
        case "$gte":
          conditions.push(`${fieldPath} >= ${this.formatValue(val)}`);
          break;
        case "$lt":
          conditions.push(`${fieldPath} < ${this.formatValue(val)}`);
          break;
        case "$lte":
          conditions.push(`${fieldPath} <= ${this.formatValue(val)}`);
          break;
        case "$in":
          if (Array.isArray(val)) {
            const values = val.map((v) => this.formatValue(v)).join(", ");
            conditions.push(`${fieldPath} in [${values}]`);
          }
          break;
        case "$nin":
          if (Array.isArray(val)) {
            const values = val.map((v) => this.formatValue(v)).join(", ");
            conditions.push(`${fieldPath} not in [${values}]`);
          }
          break;
        case "$exists":
          // Milvus doesn't have direct exists check, use null comparison
          if (val) {
            conditions.push(`${fieldPath} != null`);
          } else {
            conditions.push(`${fieldPath} == null`);
          }
          break;
        case "$contains":
          // String contains using LIKE equivalent (Milvus 2.3+)
          conditions.push(`${fieldPath} like "%${val}%"`);
          break;
        case "$startsWith":
          conditions.push(`${fieldPath} like "${val}%"`);
          break;
        case "$endsWith":
          conditions.push(`${fieldPath} like "%${val}"`);
          break;
        default:
          // Unknown operator, treat as equality
          conditions.push(`${fieldPath} == ${this.formatValue(val)}`);
      }
    }

    return conditions.length > 0 ? conditions.join(" and ") : "";
  }

  /**
   * Create a partition (namespace)
   */
  async createPartition(indexName: string, partitionName: string): Promise<void> {
    this.ensureInitialized();

    const collectionName = this.sanitizeCollectionName(indexName);

    try {
      await this.client!.createPartition({
        collection_name: collectionName,
        partition_name: partitionName,
      });
      logger.debug(`Created partition ${partitionName} in ${collectionName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create partition: ${message}`);
    }
  }

  /**
   * Delete a partition (namespace)
   */
  async deletePartition(indexName: string, partitionName: string): Promise<void> {
    this.ensureInitialized();

    const collectionName = this.sanitizeCollectionName(indexName);

    try {
      await this.client!.dropPartition({
        collection_name: collectionName,
        partition_name: partitionName,
      });
      logger.debug(`Deleted partition ${partitionName} from ${collectionName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete partition: ${message}`);
    }
  }

  /**
   * List partitions (namespaces) in a collection
   */
  async listPartitions(indexName: string): Promise<string[]> {
    this.ensureInitialized();

    const collectionName = this.sanitizeCollectionName(indexName);

    try {
      const result = await this.client!.listPartitions({
        collection_name: collectionName,
      });
      return result.partition_names || [];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to list partitions: ${message}`);
    }
  }

  /**
   * Load collection into memory for searching
   */
  async loadCollection(indexName: string): Promise<void> {
    this.ensureInitialized();

    const collectionName = this.sanitizeCollectionName(indexName);

    try {
      await this.client!.loadCollection({
        collection_name: collectionName,
      });
      logger.debug(`Loaded collection ${collectionName} into memory`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load collection: ${message}`);
    }
  }

  /**
   * Release collection from memory
   */
  async releaseCollection(indexName: string): Promise<void> {
    this.ensureInitialized();

    const collectionName = this.sanitizeCollectionName(indexName);

    try {
      await this.client!.releaseCollection({
        collection_name: collectionName,
      });
      logger.debug(`Released collection ${collectionName} from memory`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to release collection: ${message}`);
    }
  }
}
