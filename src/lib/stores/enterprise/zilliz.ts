/**
 * Zilliz Vector Store Implementation
 * Zilliz Cloud is a fully managed vector database service built on Milvus
 * @see https://zilliz.com/
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
import { translateToMilvus } from "../filterTranslator.js";

// Zilliz uses the same Milvus SDK, so types are similar
type ZillizClient = {
  connectPromise: Promise<unknown>;
  listCollections: () => Promise<{ collection_names: string[] }>;
  hasCollection: (params: { collection_name: string }) => Promise<boolean>;
  createCollection: (
    params: ZillizCreateCollectionParams,
  ) => Promise<{ error_code: string; reason: string }>;
  dropCollection: (params: {
    collection_name: string;
  }) => Promise<{ error_code: string; reason: string }>;
  createIndex: (
    params: ZillizCreateIndexParams,
  ) => Promise<{ error_code: string; reason: string }>;
  loadCollection: (params: {
    collection_name: string;
  }) => Promise<{ error_code: string; reason: string }>;
  releaseCollection: (params: {
    collection_name: string;
  }) => Promise<{ error_code: string; reason: string }>;
  insert: (
    params: ZillizInsertParams,
  ) => Promise<{ insert_cnt: number; succ_index: number[] }>;
  upsert: (
    params: ZillizInsertParams,
  ) => Promise<{ upsert_cnt: number; succ_index: number[] }>;
  search: (
    params: ZillizSearchParams,
  ) => Promise<{ results: ZillizSearchResult[] }>;
  delete: (params: ZillizDeleteParams) => Promise<{ delete_cnt: number }>;
  query: (params: ZillizQueryParams) => Promise<{ data: ZillizQueryResult[] }>;
  getCollectionStatistics: (params: { collection_name: string }) => Promise<{
    data: { row_count: number };
    stats: Array<{ key: string; value: string }>;
  }>;
  describeCollection: (params: {
    collection_name: string;
  }) => Promise<{ schema: ZillizCollectionSchema }>;
};

type ZillizCreateCollectionParams = {
  collection_name: string;
  description?: string;
  fields: Array<{
    name: string;
    description?: string;
    data_type: number;
    is_primary_key?: boolean;
    autoID?: boolean;
    dim?: number;
    max_length?: number;
  }>;
  enable_dynamic_field?: boolean;
};

type ZillizCreateIndexParams = {
  collection_name: string;
  field_name: string;
  index_type: string;
  metric_type: string;
  params?: Record<string, unknown>;
};

type ZillizInsertParams = {
  collection_name: string;
  fields_data: Array<Record<string, unknown>>;
  partition_name?: string;
};

type ZillizSearchParams = {
  collection_name: string;
  vector: number[];
  output_fields?: string[];
  limit: number;
  filter?: string;
  metric_type?: string;
  params?: Record<string, unknown>;
};

type ZillizSearchResult = {
  id: string | number;
  score: number;
  [key: string]: unknown;
};

type ZillizDeleteParams = {
  collection_name: string;
  ids?: (string | number)[];
  filter?: string;
  partition_name?: string;
};

type ZillizQueryParams = {
  collection_name: string;
  filter: string;
  output_fields?: string[];
  limit?: number;
  offset?: number;
};

type ZillizQueryResult = {
  id: string | number;
  [key: string]: unknown;
};

type ZillizCollectionSchema = {
  fields: Array<{
    name: string;
    data_type: number;
    dim?: number;
  }>;
};

// Milvus/Zilliz data types
const DataType = {
  Bool: 1,
  Int8: 2,
  Int16: 3,
  Int32: 4,
  Int64: 5,
  Float: 10,
  Double: 11,
  String: 20,
  VarChar: 21,
  JSON: 23,
  Array: 24,
  FloatVector: 101,
  BinaryVector: 100,
  Float16Vector: 102,
  BFloat16Vector: 103,
  SparseFloatVector: 104,
};

/**
 * Zilliz-specific configuration
 */
export type ZillizConfig = VectorStoreConfig & {
  /** Zilliz Cloud cluster URI (e.g., "https://xxx.api.region.zillizcloud.com") */
  uri: string;
  /** Zilliz Cloud API token */
  token: string;
  /** Username (optional, for RBAC) */
  username?: string;
  /** Password (optional, for RBAC) */
  password?: string;
  /** Connection timeout in ms */
  connectTimeout?: number;
  /** Index type: AUTOINDEX (recommended), IVF_FLAT, IVF_SQ8, HNSW, etc. */
  indexType?: string;
  /** Index build parameters */
  indexParams?: Record<string, unknown>;
  /** Enable serverless auto-scaling */
  serverless?: boolean;
};

/**
 * Zilliz Vector Store implementation
 * Zilliz Cloud is the fully managed cloud service built on Milvus
 */
export class ZillizStore extends BaseVectorStore<ZillizConfig> {
  private client: ZillizClient | null = null;

  constructor(config: ZillizConfig) {
    super(config, "zilliz" as VectorStoreName);
  }

  /**
   * Initialize connection to Zilliz Cloud
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Dynamically import Milvus client (Zilliz uses the same SDK)
      const { MilvusClient } = await import("@zilliz/milvus2-sdk-node");

      // Zilliz Cloud configuration
      const clientConfig: {
        address: string;
        token?: string;
        username?: string;
        password?: string;
        ssl?: boolean;
        timeout?: number;
      } = {
        address: this.normalizeUri(this.config.uri),
        token: this.config.token,
        ssl: true, // Zilliz Cloud always uses SSL
        timeout: this.config.connectTimeout || this.config.timeout || 30000,
      };

      if (this.config.username) {
        clientConfig.username = this.config.username;
      }

      if (this.config.password) {
        clientConfig.password = this.config.password;
      }

      this.client = new MilvusClient(clientConfig) as unknown as ZillizClient;

      // Wait for connection
      await this.client.connectPromise;

      this.initialized = true;
      this.logInfo("Connected to Zilliz Cloud successfully");
    } catch (error) {
      this.logError("Failed to connect to Zilliz Cloud", error);
      throw new Error(
        `Failed to connect to Zilliz Cloud: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Disconnect from Zilliz Cloud
   */
  async disconnect(): Promise<void> {
    this.client = null;
    this.initialized = false;
    this.logInfo("Disconnected from Zilliz Cloud");
  }

  /**
   * Create a new collection (index)
   * Zilliz Cloud supports AUTOINDEX for optimal performance
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const collectionName = this.normalizeCollectionName(config.name);
    const metricType = this.mapMetric(config.metric || "cosine");
    // AUTOINDEX is recommended for Zilliz Cloud as it automatically selects the best index
    const indexType = this.config.indexType || "AUTOINDEX";

    // Create collection with schema
    const createResult = await this.client!.createCollection({
      collection_name: collectionName,
      description: `Zilliz collection ${config.name}`,
      enable_dynamic_field: true,
      fields: [
        {
          name: "id",
          data_type: DataType.VarChar,
          is_primary_key: true,
          max_length: 512,
        },
        {
          name: "vector",
          data_type: DataType.FloatVector,
          dim: config.dimension,
        },
        {
          name: "content",
          data_type: DataType.VarChar,
          max_length: 65535,
        },
        {
          name: "metadata",
          data_type: DataType.JSON,
        },
      ],
    });

    if (
      createResult.error_code !== "Success" &&
      createResult.error_code !== "0"
    ) {
      throw new Error(`Failed to create collection: ${createResult.reason}`);
    }

    // Create index on vector field
    // For Zilliz Cloud, AUTOINDEX automatically optimizes parameters
    const indexParams =
      this.config.indexParams || this.getDefaultIndexParams(indexType);

    const indexResult = await this.client!.createIndex({
      collection_name: collectionName,
      field_name: "vector",
      index_type: indexType,
      metric_type: metricType,
      params: indexParams,
    });

    if (
      indexResult.error_code !== "Success" &&
      indexResult.error_code !== "0"
    ) {
      throw new Error(`Failed to create index: ${indexResult.reason}`);
    }

    // Load collection into memory (Zilliz Cloud handles this automatically but explicit is safer)
    await this.client!.loadCollection({ collection_name: collectionName });

    this.logInfo(`Collection created: ${collectionName}`, {
      dimension: config.dimension,
      metric: config.metric,
      indexType,
    });
  }

  /**
   * Delete a collection (index)
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    const collectionName = this.normalizeCollectionName(indexName);

    // Release collection first
    try {
      await this.client!.releaseCollection({ collection_name: collectionName });
    } catch {
      // Collection may not be loaded
    }

    await this.client!.dropCollection({ collection_name: collectionName });
    this.logInfo(`Collection deleted: ${collectionName}`);
  }

  /**
   * List all collections (indexes)
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    const response = await this.client!.listCollections();
    return response.collection_names || [];
  }

  /**
   * Check if a collection exists
   */
  async indexExists(indexName: string): Promise<boolean> {
    this.ensureInitialized();

    const collectionName = this.normalizeCollectionName(indexName);
    return await this.client!.hasCollection({
      collection_name: collectionName,
    });
  }

  /**
   * Upsert vectors
   * Zilliz Cloud supports high-throughput batch operations
   */
  async upsert<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    records: VectorRecord<TMetadata>[],
    options?: VectorUpsertOptions,
  ): Promise<{ upsertedCount: number }> {
    this.ensureInitialized();

    const collectionName = this.normalizeCollectionName(indexName);
    // Zilliz Cloud handles larger batches efficiently
    const batchSize = options?.batchSize || 2000;
    let totalUpserted = 0;

    // Process in batches
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      const fieldsData = batch.map((record) => ({
        id: record.id,
        vector: record.vector,
        content: record.content || "",
        metadata: record.metadata || {},
        // Also add metadata fields directly for filtering
        ...this.flattenMetadata(record.metadata),
      }));

      const result = await this.client!.upsert({
        collection_name: collectionName,
        fields_data: fieldsData,
        partition_name: options?.namespace,
      });

      totalUpserted += result.upsert_cnt || batch.length;
      this.logDebug(`Upserted batch: ${totalUpserted}/${records.length}`);
    }

    return { upsertedCount: totalUpserted };
  }

  /**
   * Query vectors with similarity search
   * Zilliz Cloud optimizes search with auto-scaling
   */
  async query<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options: VectorQueryOptions<TMetadata>,
  ): Promise<VectorQueryResult<TMetadata>[]> {
    this.ensureInitialized();

    const collectionName = this.normalizeCollectionName(indexName);

    // Build output fields
    const outputFields = ["id", "content", "metadata"];
    if (options.includeVectors) {
      outputFields.push("vector");
    }

    const searchParams: ZillizSearchParams = {
      collection_name: collectionName,
      vector: options.vector,
      limit: options.topK,
      output_fields: outputFields,
      // Zilliz Cloud auto-optimizes search parameters
      params: { level: 1 },
    };

    // Apply filter if provided
    if (options.filter) {
      searchParams.filter = translateToMilvus(options.filter);
    }

    const response = await this.client!.search(searchParams);
    const results = response.results || [];

    return results
      .filter((result) => !options.minScore || result.score >= options.minScore)
      .map((result) => {
        const metadata = (result.metadata as TMetadata) || ({} as TMetadata);

        return {
          id: String(result.id),
          score: result.score,
          vector: options.includeVectors
            ? (result.vector as number[])
            : undefined,
          metadata: options.includeMetadata !== false ? metadata : undefined,
          content: result.content as string | undefined,
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

    const collectionName = this.normalizeCollectionName(indexName);

    if (options.deleteAll) {
      // Delete all by recreating the collection
      const exists = await this.indexExists(indexName);
      if (exists) {
        // Get collection schema
        const schema = await this.client!.describeCollection({
          collection_name: collectionName,
        });
        const dimension =
          schema.schema.fields.find((f) => f.data_type === DataType.FloatVector)
            ?.dim || 1536;

        await this.deleteIndex(indexName);
        await this.createIndex({ name: indexName, dimension });
      }
      return { deletedCount: undefined, acknowledged: true };
    }

    if (options.ids && options.ids.length > 0) {
      const result = await this.client!.delete({
        collection_name: collectionName,
        ids: options.ids,
        partition_name: options.namespace,
      });
      return { deletedCount: result.delete_cnt, acknowledged: true };
    }

    if (options.filter) {
      const filterExpr = translateToMilvus(options.filter);
      const result = await this.client!.delete({
        collection_name: collectionName,
        filter: filterExpr,
        partition_name: options.namespace,
      });
      return { deletedCount: result.delete_cnt, acknowledged: true };
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
      return;
    }

    const collectionName = this.normalizeCollectionName(indexName);

    // Fetch existing data first (upsert requires all fields)
    const queryResult = await this.client!.query({
      collection_name: collectionName,
      filter: `id == "${id}"`,
      output_fields: ["id", "vector", "content", "metadata"],
      limit: 1,
    });

    if (!queryResult.data || queryResult.data.length === 0) {
      throw new Error(
        `Vector with id '${id}' not found in collection '${collectionName}'`,
      );
    }

    const existing = queryResult.data[0];

    // Prepare updated data
    const updateData = {
      id,
      vector: update.vector || (existing.vector as number[]),
      content: (existing.content as string) || "",
      metadata: update.metadata || (existing.metadata as TMetadata) || {},
      ...this.flattenMetadata(
        update.metadata || (existing.metadata as TMetadata),
      ),
    };

    await this.client!.upsert({
      collection_name: collectionName,
      fields_data: [updateData],
    });

    this.logDebug(`Updated vector: ${id}`);
  }

  /**
   * Get collection statistics
   */
  async getStats(indexName: string): Promise<VectorStoreStats> {
    this.ensureInitialized();

    const collectionName = this.normalizeCollectionName(indexName);

    const stats = await this.client!.getCollectionStatistics({
      collection_name: collectionName,
    });
    const schema = await this.client!.describeCollection({
      collection_name: collectionName,
    });

    const vectorField = schema.schema.fields.find(
      (f) => f.data_type === DataType.FloatVector,
    );

    return {
      vectorCount: stats.data?.row_count || 0,
      dimension: vectorField?.dim,
      metrics: {
        collectionName,
        stats: stats.stats,
        provider: "zilliz-cloud",
      },
    };
  }

  /**
   * Translate filter to Milvus/Zilliz format
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): unknown {
    return translateToMilvus(filter);
  }

  /**
   * Map similarity metric to Milvus/Zilliz metric type
   */
  private mapMetric(metric: SimilarityMetric): string {
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
   * Normalize Zilliz Cloud URI
   */
  private normalizeUri(uri: string): string {
    // Remove protocol prefix if present (SDK adds it)
    let normalized = uri.replace(/^https?:\/\//, "");

    // Ensure proper Zilliz Cloud endpoint format
    if (!normalized.includes(":")) {
      normalized = `${normalized}:443`;
    }

    return normalized;
  }

  /**
   * Normalize collection name
   */
  private normalizeCollectionName(name: string): string {
    // Collection names: alphanumeric and underscores, start with letter
    let normalized = name.replace(/[^a-zA-Z0-9_]/g, "_");

    // Ensure starts with letter
    if (!/^[a-zA-Z]/.test(normalized)) {
      normalized = "c_" + normalized;
    }

    return normalized;
  }

  /**
   * Get default index parameters based on index type
   * AUTOINDEX is recommended for Zilliz Cloud
   */
  private getDefaultIndexParams(indexType: string): Record<string, unknown> {
    switch (indexType.toUpperCase()) {
      case "AUTOINDEX":
        // Zilliz Cloud automatically optimizes parameters
        return {};
      case "HNSW":
        return { M: 16, efConstruction: 100 };
      case "IVF_FLAT":
        return { nlist: 1024 };
      case "IVF_SQ8":
        return { nlist: 1024 };
      case "IVF_PQ":
        return { nlist: 1024, m: 8, nbits: 8 };
      case "FLAT":
        return {};
      default:
        return {};
    }
  }

  /**
   * Flatten metadata for dynamic fields
   */
  private flattenMetadata(metadata?: UnknownRecord): Record<string, unknown> {
    if (!metadata) {return {};}

    const flattened: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(metadata)) {
      // Only include primitive types
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        flattened[key] = value;
      }
    }

    return flattened;
  }
}
