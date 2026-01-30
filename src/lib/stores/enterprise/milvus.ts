/**
 * Milvus Vector Store Implementation
 * High-performance, cloud-native vector database designed for billion-scale AI applications
 * @see https://milvus.io/docs
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

// Milvus client types for dynamic import
type MilvusClient = {
  connectPromise: Promise<unknown>;
  listCollections: () => Promise<{ collection_names: string[] }>;
  hasCollection: (params: { collection_name: string }) => Promise<boolean>;
  createCollection: (
    params: MilvusCreateCollectionParams,
  ) => Promise<{ error_code: string; reason: string }>;
  dropCollection: (params: {
    collection_name: string;
  }) => Promise<{ error_code: string; reason: string }>;
  createIndex: (
    params: MilvusCreateIndexParams,
  ) => Promise<{ error_code: string; reason: string }>;
  loadCollection: (params: {
    collection_name: string;
  }) => Promise<{ error_code: string; reason: string }>;
  releaseCollection: (params: {
    collection_name: string;
  }) => Promise<{ error_code: string; reason: string }>;
  insert: (
    params: MilvusInsertParams,
  ) => Promise<{ insert_cnt: number; succ_index: number[] }>;
  upsert: (
    params: MilvusInsertParams,
  ) => Promise<{ upsert_cnt: number; succ_index: number[] }>;
  search: (
    params: MilvusSearchParams,
  ) => Promise<{ results: MilvusSearchResult[] }>;
  delete: (params: MilvusDeleteParams) => Promise<{ delete_cnt: number }>;
  query: (params: MilvusQueryParams) => Promise<{ data: MilvusQueryResult[] }>;
  getCollectionStatistics: (params: { collection_name: string }) => Promise<{
    data: { row_count: number };
    stats: Array<{ key: string; value: string }>;
  }>;
  describeCollection: (params: {
    collection_name: string;
  }) => Promise<{ schema: MilvusCollectionSchema }>;
};

type MilvusCreateCollectionParams = {
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

type MilvusCreateIndexParams = {
  collection_name: string;
  field_name: string;
  index_type: string;
  metric_type: string;
  params?: Record<string, unknown>;
};

type MilvusInsertParams = {
  collection_name: string;
  fields_data: Array<Record<string, unknown>>;
  partition_name?: string;
};

type MilvusSearchParams = {
  collection_name: string;
  vector: number[];
  output_fields?: string[];
  limit: number;
  filter?: string;
  metric_type?: string;
  params?: Record<string, unknown>;
};

type MilvusSearchResult = {
  id: string | number;
  score: number;
  [key: string]: unknown;
};

type MilvusDeleteParams = {
  collection_name: string;
  ids?: (string | number)[];
  filter?: string;
  partition_name?: string;
};

type MilvusQueryParams = {
  collection_name: string;
  filter: string;
  output_fields?: string[];
  limit?: number;
  offset?: number;
};

type MilvusQueryResult = {
  id: string | number;
  [key: string]: unknown;
};

type MilvusCollectionSchema = {
  fields: Array<{
    name: string;
    data_type: number;
    dim?: number;
  }>;
};

// Milvus data types
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
 * Milvus-specific configuration
 */
export type MilvusConfig = VectorStoreConfig & {
  /** Milvus server address (e.g., "localhost:19530") */
  address: string;
  /** Username for authentication */
  username?: string;
  /** Password for authentication */
  password?: string;
  /** Enable SSL/TLS */
  ssl?: boolean;
  /** Zilliz Cloud token (for managed Milvus) */
  token?: string;
  /** Connection timeout in ms */
  connectTimeout?: number;
  /** Index type: IVF_FLAT, IVF_SQ8, IVF_PQ, HNSW, FLAT, etc. */
  indexType?: string;
  /** Index build parameters */
  indexParams?: Record<string, unknown>;
};

/**
 * Milvus Vector Store implementation
 */
export class MilvusStore extends BaseVectorStore<MilvusConfig> {
  private client: MilvusClient | null = null;

  constructor(config: MilvusConfig) {
    super(config, "milvus" as VectorStoreName);
  }

  /**
   * Initialize connection to Milvus
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Dynamically import Milvus client
      const { MilvusClient } = await import("@zilliz/milvus2-sdk-node");

      const clientConfig: {
        address: string;
        username?: string;
        password?: string;
        ssl?: boolean;
        token?: string;
        timeout?: number;
      } = {
        address: this.config.address,
        timeout: this.config.connectTimeout || this.config.timeout || 30000,
      };

      if (this.config.username) {
        clientConfig.username = this.config.username;
      }

      if (this.config.password) {
        clientConfig.password = this.config.password;
      }

      if (this.config.ssl !== undefined) {
        clientConfig.ssl = this.config.ssl;
      }

      if (this.config.token) {
        clientConfig.token = this.config.token;
      }

      this.client = new MilvusClient(clientConfig) as unknown as MilvusClient;

      // Wait for connection
      await this.client.connectPromise;

      this.initialized = true;
      this.logInfo("Connected successfully");
    } catch (error) {
      this.logError("Failed to connect", error);
      throw new Error(
        `Failed to connect to Milvus: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Disconnect from Milvus
   */
  async disconnect(): Promise<void> {
    this.client = null;
    this.initialized = false;
    this.logInfo("Disconnected");
  }

  /**
   * Create a new collection (index)
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const collectionName = this.normalizeCollectionName(config.name);
    const metricType = this.mapMetric(config.metric || "cosine");
    const indexType = this.config.indexType || "HNSW";

    // Create collection with schema
    const createResult = await this.client!.createCollection({
      collection_name: collectionName,
      description: `Vector collection ${config.name}`,
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

    // Load collection into memory
    await this.client!.loadCollection({ collection_name: collectionName });

    this.logInfo(`Index created: ${collectionName}`, {
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
    this.logInfo(`Index deleted: ${collectionName}`);
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
   */
  async upsert<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    records: VectorRecord<TMetadata>[],
    options?: VectorUpsertOptions,
  ): Promise<{ upsertedCount: number }> {
    this.ensureInitialized();

    const collectionName = this.normalizeCollectionName(indexName);
    const batchSize = options?.batchSize || 1000;
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
   * Query vectors
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

    const searchParams: MilvusSearchParams = {
      collection_name: collectionName,
      vector: options.vector,
      limit: options.topK,
      output_fields: outputFields,
      params: { ef: 64 }, // Search parameter for HNSW
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

    // Milvus upsert requires all fields, so fetch existing data first
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
      },
    };
  }

  /**
   * Translate filter to Milvus format
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): unknown {
    return translateToMilvus(filter);
  }

  /**
   * Map similarity metric to Milvus metric type
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
   * Normalize collection name (Milvus naming conventions)
   */
  private normalizeCollectionName(name: string): string {
    // Milvus collection names: alphanumeric and underscores, start with letter
    let normalized = name.replace(/[^a-zA-Z0-9_]/g, "_");

    // Ensure starts with letter
    if (!/^[a-zA-Z]/.test(normalized)) {
      normalized = "c_" + normalized;
    }

    return normalized;
  }

  /**
   * Get default index parameters based on index type
   */
  private getDefaultIndexParams(indexType: string): Record<string, unknown> {
    switch (indexType.toUpperCase()) {
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
        return { M: 16, efConstruction: 100 };
    }
  }

  /**
   * Flatten metadata for Milvus dynamic fields
   */
  private flattenMetadata(metadata?: UnknownRecord): Record<string, unknown> {
    if (!metadata) {return {};}

    const flattened: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(metadata)) {
      // Only include primitive types that Milvus can handle
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
