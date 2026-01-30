/**
 * Zilliz Cloud Vector Store Adapter
 * Implements vector similarity search using Zilliz Cloud (managed Milvus)
 *
 * Zilliz Cloud provides a fully managed vector database service built on Milvus,
 * supporting serverless and dedicated clusters with auto-scaling capabilities.
 *
 * @see https://docs.zilliz.com/
 */

import type { UnknownRecord } from "../../types/common.js";
import { logger } from "../../utils/logger.js";
import { BaseVectorStore } from "../BaseVectorStore.js";
import type {
  VectorStoreConfig,
  VectorStoreName,
  VectorRecord,
  VectorQueryResult,
  VectorIndexConfig,
  VectorQueryOptions,
  VectorUpsertOptions,
  VectorDeleteOptions,
  VectorStoreStats,
  MetadataFilter,
  FieldFilter,
  SimilarityMetric,
} from "../types.js";

/**
 * Zilliz Cloud specific configuration
 */
export type ZillizConfig = VectorStoreConfig & {
  /** Zilliz Cloud cluster URI (e.g., "https://your-cluster.serverless.gcp-us-west1.cloud.zilliz.com") */
  uri: string;
  /** Zilliz Cloud API token or username:password */
  token: string;
  /** Optional: Use secure connection (default: true) */
  secure?: boolean;
  /** Optional: Connection pool size (default: 10) */
  poolSize?: number;
  /** Optional: Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Optional: Database name (default: "default") */
  database?: string;
};

/**
 * Internal type for Milvus client interface
 * Compatible with @zilliz/milvus2-sdk-node
 */
interface MilvusClient {
  connect(): Promise<void>;
  closeConnection(): Promise<void>;
  listCollections(params?: { type?: string }): Promise<{ collection_names: string[] }>;
  hasCollection(params: { collection_name: string }): Promise<{ value: boolean }>;
  createCollection(params: CreateCollectionParams): Promise<{ error_code: string; reason?: string }>;
  dropCollection(params: { collection_name: string }): Promise<{ error_code: string; reason?: string }>;
  createIndex(params: CreateIndexParams): Promise<{ error_code: string; reason?: string }>;
  loadCollection(params: { collection_name: string }): Promise<{ error_code: string; reason?: string }>;
  releaseCollection(params: { collection_name: string }): Promise<{ error_code: string; reason?: string }>;
  insert(params: InsertParams): Promise<{ status: { error_code: string }; insert_cnt: number }>;
  upsert(params: InsertParams): Promise<{ status: { error_code: string }; upsert_cnt: number }>;
  delete(params: DeleteParams): Promise<{ status: { error_code: string }; delete_cnt: number }>;
  search(params: SearchParams): Promise<{ status: { error_code: string }; results: SearchResult[] }>;
  query(params: QueryParams): Promise<{ status: { error_code: string }; data: unknown[] }>;
  getCollectionStatistics(params: { collection_name: string }): Promise<{
    status: { error_code: string };
    stats: Array<{ key: string; value: string }>
  }>;
  describeCollection(params: { collection_name: string }): Promise<{
    status: { error_code: string };
    schema: { fields: FieldSchema[] };
    collectionID: string;
  }>;
}

interface FieldSchema {
  name: string;
  data_type: string;
  type_params: Array<{ key: string; value: string }>;
  is_primary_key: boolean;
  autoID: boolean;
}

interface CreateCollectionParams {
  collection_name: string;
  fields: Array<{
    name: string;
    data_type: DataType;
    is_primary_key?: boolean;
    autoID?: boolean;
    max_length?: number;
    dim?: number;
  }>;
  enable_dynamic_field?: boolean;
}

interface CreateIndexParams {
  collection_name: string;
  field_name: string;
  index_type: string;
  metric_type: string;
  params?: Record<string, unknown>;
}

interface InsertParams {
  collection_name: string;
  fields_data: Array<Record<string, unknown>>;
  partition_name?: string;
}

interface DeleteParams {
  collection_name: string;
  ids?: string[] | number[];
  filter?: string;
  partition_name?: string;
}

interface SearchParams {
  collection_name: string;
  vectors: number[][];
  vector_type?: DataType;
  limit: number;
  output_fields?: string[];
  filter?: string;
  params?: Record<string, unknown>;
  partition_names?: string[];
}

interface QueryParams {
  collection_name: string;
  filter: string;
  output_fields?: string[];
  limit?: number;
  offset?: number;
  partition_names?: string[];
}

interface SearchResult {
  id: string | number;
  score: number;
  [key: string]: unknown;
}

/**
 * Milvus data types
 */
enum DataType {
  Bool = 1,
  Int8 = 2,
  Int16 = 3,
  Int32 = 4,
  Int64 = 5,
  Float = 10,
  Double = 11,
  String = 20,
  VarChar = 21,
  JSON = 23,
  Array = 22,
  FloatVector = 101,
  BinaryVector = 100,
}

/**
 * Index metadata stored in collection description
 */
interface CollectionMetadata {
  name: string;
  dimension: number;
  metric: SimilarityMetric;
}

/**
 * Zilliz Cloud Vector Store Adapter
 *
 * Features:
 * - Fully managed Milvus cloud service
 * - Serverless and dedicated cluster support
 * - Auto-scaling and high availability
 * - Rich metadata filtering with expressions
 * - Partition (namespace) support
 * - Batch operations for performance
 * - Multiple index types (AUTOINDEX, IVF_FLAT, HNSW, etc.)
 *
 * Note: Requires @zilliz/milvus2-sdk-node:
 *   npm install @zilliz/milvus2-sdk-node
 */
export class ZillizAdapter extends BaseVectorStore<ZillizConfig> {
  private client: MilvusClient | null = null;
  private collectionMetadataCache: Map<string, CollectionMetadata> = new Map();

  // Field names used in Zilliz collections
  private static readonly ID_FIELD = "id";
  private static readonly VECTOR_FIELD = "vector";
  private static readonly CONTENT_FIELD = "content";
  private static readonly METADATA_FIELD = "metadata";

  constructor(config: ZillizConfig) {
    super(config, "zilliz" as VectorStoreName);
  }

  /**
   * Initialize connection to Zilliz Cloud
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      logger.debug("Zilliz already connected");
      return;
    }

    try {
      const MilvusClientClass = await this.loadMilvusClient();

      // Parse connection options
      const address = this.config.uri;
      const token = this.config.token;
      const secure = this.config.secure !== false;
      const poolSize = this.config.poolSize || 10;
      const timeout = this.config.timeout || 30000;
      const database = this.config.database || "default";

      this.client = new MilvusClientClass({
        address,
        token,
        ssl: secure,
        channelOptions: {
          "grpc.max_send_message_length": 512 * 1024 * 1024,
          "grpc.max_receive_message_length": 512 * 1024 * 1024,
        },
        pool: { max: poolSize },
        timeout,
        database,
      }) as MilvusClient;

      // Test connection by listing collections
      await this.client.listCollections();

      this.initialized = true;
      logger.debug("Zilliz connected successfully", {
        uri: address,
        database,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to Zilliz: ${message}`);
    }
  }

  /**
   * Close connection to Zilliz Cloud
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.closeConnection();
        this.client = null;
        this.initialized = false;
        this.collectionMetadataCache.clear();
        logger.debug("Zilliz disconnected");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to disconnect from Zilliz: ${message}`);
      }
    }
  }

  /**
   * Create a new collection (index)
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const { name, dimension, metric = "cosine" } = config;

    try {
      // Check if collection already exists
      const exists = await this.indexExists(name);
      if (exists) {
        logger.debug(`Collection ${name} already exists`);
        return;
      }

      // Create collection with schema
      const createResult = await this.client!.createCollection({
        collection_name: name,
        fields: [
          {
            name: ZillizAdapter.ID_FIELD,
            data_type: DataType.VarChar,
            is_primary_key: true,
            autoID: false,
            max_length: 256,
          },
          {
            name: ZillizAdapter.VECTOR_FIELD,
            data_type: DataType.FloatVector,
            dim: dimension,
          },
          {
            name: ZillizAdapter.CONTENT_FIELD,
            data_type: DataType.VarChar,
            max_length: 65535,
          },
          {
            name: ZillizAdapter.METADATA_FIELD,
            data_type: DataType.JSON,
          },
        ],
        enable_dynamic_field: true,
      });

      if (createResult.error_code !== "Success" && createResult.error_code !== "0") {
        throw new Error(createResult.reason || `Failed to create collection: ${createResult.error_code}`);
      }

      // Create index on vector field with AUTOINDEX (Zilliz Cloud optimized)
      const indexResult = await this.client!.createIndex({
        collection_name: name,
        field_name: ZillizAdapter.VECTOR_FIELD,
        index_type: "AUTOINDEX",
        metric_type: this.mapMetricType(metric),
      });

      if (indexResult.error_code !== "Success" && indexResult.error_code !== "0") {
        throw new Error(indexResult.reason || `Failed to create index: ${indexResult.error_code}`);
      }

      // Load collection into memory for searching
      const loadResult = await this.client!.loadCollection({
        collection_name: name,
      });

      if (loadResult.error_code !== "Success" && loadResult.error_code !== "0") {
        throw new Error(loadResult.reason || `Failed to load collection: ${loadResult.error_code}`);
      }

      // Cache metadata
      this.collectionMetadataCache.set(name, {
        name,
        dimension,
        metric,
      });

      logger.debug(`Created collection ${name}`, { dimension, metric });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create index ${name}: ${message}`);
    }
  }

  /**
   * Delete a collection (index)
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    try {
      // Release collection first if loaded
      try {
        await this.client!.releaseCollection({
          collection_name: indexName,
        });
      } catch {
        // Ignore if not loaded
      }

      const result = await this.client!.dropCollection({
        collection_name: indexName,
      });

      if (result.error_code !== "Success" && result.error_code !== "0") {
        throw new Error(result.reason || `Failed to drop collection: ${result.error_code}`);
      }

      this.collectionMetadataCache.delete(indexName);
      logger.debug(`Deleted collection ${indexName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete index ${indexName}: ${message}`);
    }
  }

  /**
   * List all collections
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    try {
      const result = await this.client!.listCollections();
      return result.collection_names || [];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to list indexes: ${message}`);
    }
  }

  /**
   * Check if a collection exists
   */
  async indexExists(indexName: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      const result = await this.client!.hasCollection({
        collection_name: indexName,
      });
      return result.value;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to check index existence: ${message}`);
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

    // Validate dimensions
    this.validateDimensions(records.map((r) => r.vector));

    const partitionName = options?.namespace;

    try {
      // Prepare data for upsert
      const fieldsData = records.map((record) => ({
        [ZillizAdapter.ID_FIELD]: record.id,
        [ZillizAdapter.VECTOR_FIELD]: record.vector,
        [ZillizAdapter.CONTENT_FIELD]: record.content || "",
        [ZillizAdapter.METADATA_FIELD]: record.metadata || {},
      }));

      const result = await this.client!.upsert({
        collection_name: indexName,
        fields_data: fieldsData,
        partition_name: partitionName,
      });

      if (result.status.error_code !== "Success" && result.status.error_code !== "0") {
        throw new Error(`Upsert failed with error code: ${result.status.error_code}`);
      }

      const upsertedCount = result.upsert_cnt;
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
      const outputFields: string[] = [ZillizAdapter.ID_FIELD, ZillizAdapter.CONTENT_FIELD];
      if (includeMetadata) {
        outputFields.push(ZillizAdapter.METADATA_FIELD);
      }
      if (includeVectors) {
        outputFields.push(ZillizAdapter.VECTOR_FIELD);
      }

      // Build filter expression
      let filterExpr: string | undefined;
      if (filter) {
        filterExpr = this.translateFilter(filter);
      }

      const searchParams: SearchParams = {
        collection_name: indexName,
        vectors: [vector],
        limit: topK,
        output_fields: outputFields,
        filter: filterExpr,
        params: { nprobe: 16 }, // Search params for IVF indexes
      };

      if (namespace) {
        searchParams.partition_names = [namespace];
      }

      const result = await this.client!.search(searchParams);

      if (result.status.error_code !== "Success" && result.status.error_code !== "0") {
        throw new Error(`Search failed with error code: ${result.status.error_code}`);
      }

      // Transform results
      const results: VectorQueryResult<TMetadata>[] = [];

      for (const hit of result.results) {
        // Apply minimum score filter
        // Note: Zilliz returns distance for L2, similarity for IP/COSINE
        const score = hit.score;
        if (minScore !== undefined && score < minScore) {
          continue;
        }

        const queryResult: VectorQueryResult<TMetadata> = {
          id: String(hit.id),
          score,
          content: hit[ZillizAdapter.CONTENT_FIELD] as string | undefined,
        };

        if (includeMetadata && hit[ZillizAdapter.METADATA_FIELD]) {
          queryResult.metadata = hit[ZillizAdapter.METADATA_FIELD] as TMetadata;
        }

        if (includeVectors && hit[ZillizAdapter.VECTOR_FIELD]) {
          queryResult.vector = hit[ZillizAdapter.VECTOR_FIELD] as number[];
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

    const { ids, filter, namespace, deleteAll } = options;

    try {
      let deletedCount = 0;

      if (deleteAll) {
        // Delete all - use a filter that matches everything
        // Zilliz requires a valid expression, so we use id != ""
        const result = await this.client!.delete({
          collection_name: indexName,
          filter: `${ZillizAdapter.ID_FIELD} != ""`,
          partition_name: namespace,
        });

        if (result.status.error_code !== "Success" && result.status.error_code !== "0") {
          throw new Error(`Delete failed with error code: ${result.status.error_code}`);
        }

        deletedCount = result.delete_cnt;
      } else if (ids && ids.length > 0) {
        // Delete by IDs
        const idList = ids.map((id) => `"${id}"`).join(", ");
        const result = await this.client!.delete({
          collection_name: indexName,
          filter: `${ZillizAdapter.ID_FIELD} in [${idList}]`,
          partition_name: namespace,
        });

        if (result.status.error_code !== "Success" && result.status.error_code !== "0") {
          throw new Error(`Delete failed with error code: ${result.status.error_code}`);
        }

        deletedCount = result.delete_cnt;
      } else if (filter) {
        // Delete by filter
        const filterExpr = this.translateFilter(filter);
        const result = await this.client!.delete({
          collection_name: indexName,
          filter: filterExpr,
          partition_name: namespace,
        });

        if (result.status.error_code !== "Success" && result.status.error_code !== "0") {
          throw new Error(`Delete failed with error code: ${result.status.error_code}`);
        }

        deletedCount = result.delete_cnt;
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

    try {
      const statsResult = await this.client!.getCollectionStatistics({
        collection_name: indexName,
      });

      if (statsResult.status.error_code !== "Success" && statsResult.status.error_code !== "0") {
        throw new Error(`Failed to get stats: ${statsResult.status.error_code}`);
      }

      // Parse stats
      let vectorCount = 0;
      for (const stat of statsResult.stats) {
        if (stat.key === "row_count") {
          vectorCount = parseInt(stat.value, 10);
        }
      }

      // Get collection description for dimension
      const descResult = await this.client!.describeCollection({
        collection_name: indexName,
      });

      let dimension: number | undefined;
      if (descResult.status.error_code === "Success" || descResult.status.error_code === "0") {
        const vectorField = descResult.schema.fields.find(
          (f) => f.name === ZillizAdapter.VECTOR_FIELD,
        );
        if (vectorField) {
          const dimParam = vectorField.type_params.find((p) => p.key === "dim");
          if (dimParam) {
            dimension = parseInt(dimParam.value, 10);
          }
        }
      }

      // Get cached metadata
      const meta = this.collectionMetadataCache.get(indexName);

      return {
        vectorCount,
        dimension: dimension || meta?.dimension,
        metrics: {
          metric: meta?.metric || "cosine",
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get stats for ${indexName}: ${message}`);
    }
  }

  /**
   * Translate abstract filter to Zilliz expression
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
        const fieldExpr = this.translateFieldFilter(key, value as FieldFilter);
        conditions.push(fieldExpr);
      } else {
        // Simple equality - check if it's a top-level field or metadata field
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
   * Load Milvus client dynamically
   */
  private async loadMilvusClient(): Promise<new (config: unknown) => MilvusClient> {
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
   * Map similarity metric to Milvus metric type
   */
  private mapMetricType(metric: SimilarityMetric): string {
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
   * Get field path for filter expressions
   * Metadata fields need to be accessed via JSON path
   */
  private getFieldPath(key: string): string {
    // Check if it's a top-level field
    const topLevelFields = [
      ZillizAdapter.ID_FIELD,
      ZillizAdapter.VECTOR_FIELD,
      ZillizAdapter.CONTENT_FIELD,
    ];

    if (topLevelFields.includes(key)) {
      return key;
    }

    // Access as metadata JSON field
    return `${ZillizAdapter.METADATA_FIELD}["${key}"]`;
  }

  /**
   * Format value for Zilliz expression
   */
  private formatValue(value: unknown): string {
    if (typeof value === "string") {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }
    if (value === null || value === undefined) {
      return "null";
    }
    if (Array.isArray(value)) {
      return `[${value.map((v) => this.formatValue(v)).join(", ")}]`;
    }
    return String(value);
  }

  /**
   * Check if value is a field filter
   */
  private isFieldFilter(value: unknown): boolean {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    const keys = Object.keys(value);
    return keys.some((k) => k.startsWith("$"));
  }

  /**
   * Translate a field filter to Zilliz expression
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
            conditions.push(`${fieldPath} in ${this.formatValue(val)}`);
          }
          break;
        case "$nin":
          if (Array.isArray(val)) {
            conditions.push(`${fieldPath} not in ${this.formatValue(val)}`);
          }
          break;
        case "$exists":
          // Zilliz doesn't have a direct exists check, use != null
          if (val) {
            conditions.push(`${fieldPath} != null`);
          } else {
            conditions.push(`${fieldPath} == null`);
          }
          break;
        case "$contains":
          // Use LIKE for string contains
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
}
