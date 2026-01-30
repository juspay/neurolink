/**
 * Pinecone Vector Store Adapter
 * Implements vector similarity search using Pinecone vector database
 *
 * Pinecone is a fully managed, cloud-native vector database that supports:
 * - Serverless and pod-based indexes
 * - Namespace-based organization
 * - Metadata filtering with rich query DSL
 * - Sparse vectors for hybrid search
 * - High-performance similarity search at scale
 *
 * @see https://docs.pinecone.io/
 * @see https://github.com/pinecone-io/pinecone-ts-client
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
  VectorStoreConfig,
  MetadataFilter,
  FieldFilter,
  SimilarityMetric,
} from "../types.js";

/**
 * Pinecone client factory type for dependency injection (mainly for testing)
 */
export type PineconeClientFactory = () => Promise<{
  Pinecone: new (config: { apiKey: string }) => PineconeClient;
}>;

/**
 * Pinecone-specific configuration
 */
export type PineconeConfig = VectorStoreConfig & {
  /** Pinecone API key (required) */
  apiKey: string;
  /** Environment for pod-based indexes (e.g., "us-east-1-aws") - deprecated for serverless */
  environment?: string;
  /** Direct index host URL (optional, for direct connections) */
  indexHost?: string;
  /** Default namespace for operations (optional) */
  namespace?: string;
  /** Connection timeout in ms (default: 30000) */
  connectionTimeout?: number;
  /** Batch size for upsert operations (default: 100, max: 100) */
  batchSize?: number;
  /** Custom client factory for dependency injection (mainly for testing) */
  clientFactory?: PineconeClientFactory;
};

/**
 * Pinecone index specification for serverless indexes
 */
export type PineconeServerlessSpec = {
  serverless: {
    cloud: "aws" | "gcp" | "azure";
    region: string;
  };
};

/**
 * Pinecone index specification for pod-based indexes
 */
export type PineconePodsSpec = {
  pod: {
    environment: string;
    podType: string;
    pods?: number;
    replicas?: number;
    shards?: number;
  };
};

/**
 * Pinecone index specification (serverless or pod-based)
 */
export type PineconeIndexSpec = PineconeServerlessSpec | PineconePodsSpec;

/**
 * Pinecone index configuration options
 */
export type PineconeIndexOptions = {
  /** Serverless specification */
  serverless?: {
    cloud: "aws" | "gcp" | "azure";
    region: string;
  };
  /** Pod specification (for pod-based indexes) */
  pod?: {
    environment: string;
    podType: string;
    pods?: number;
    replicas?: number;
    shards?: number;
  };
  /** Deletion protection */
  deletionProtection?: "enabled" | "disabled";
};

/**
 * Sparse vector for hybrid search
 */
export type SparseVector = {
  indices: number[];
  values: number[];
};

/**
 * Internal Pinecone client interface
 * Compatible with @pinecone-database/pinecone SDK
 */
interface PineconeClient {
  createIndex(params: CreateIndexParams): Promise<void>;
  deleteIndex(indexName: string): Promise<void>;
  listIndexes(): Promise<{ indexes?: PineconeIndexInfo[] }>;
  describeIndex(indexName: string): Promise<PineconeIndexDescription>;
  index(indexName: string): PineconeIndex;
}

interface CreateIndexParams {
  name: string;
  dimension: number;
  metric?: "cosine" | "euclidean" | "dotproduct";
  spec: PineconeIndexSpec;
  deletionProtection?: "enabled" | "disabled";
}

interface PineconeIndexInfo {
  name: string;
  dimension: number;
  metric: string;
  host: string;
  status: {
    ready: boolean;
    state: string;
  };
}

interface PineconeIndexDescription {
  name: string;
  dimension: number;
  metric: string;
  host: string;
  status: {
    ready: boolean;
    state: string;
  };
  spec: PineconeIndexSpec;
}

interface PineconeIndex {
  namespace(namespace: string): PineconeNamespace;
  describeIndexStats(filter?: PineconeFilter): Promise<IndexStats>;
}

interface PineconeNamespace {
  upsert(vectors: UpsertVector[]): Promise<UpsertResponse>;
  query(params: QueryParams): Promise<QueryResponse>;
  deleteOne(id: string): Promise<void>;
  deleteMany(ids: string[]): Promise<void>;
  deleteAll(): Promise<void>;
  fetch(ids: string[]): Promise<FetchResponse>;
}

interface UpsertVector {
  id: string;
  values: number[];
  sparseValues?: SparseVector;
  metadata?: Record<string, unknown>;
}

interface UpsertResponse {
  upsertedCount?: number;
}

interface QueryParams {
  vector?: number[];
  sparseVector?: SparseVector;
  topK: number;
  filter?: PineconeFilter;
  includeValues?: boolean;
  includeMetadata?: boolean;
  id?: string;
}

interface QueryResponse {
  matches?: QueryMatch[];
  namespace?: string;
}

interface QueryMatch {
  id: string;
  score?: number;
  values?: number[];
  sparseValues?: SparseVector;
  metadata?: Record<string, unknown>;
}

interface FetchResponse {
  vectors?: Record<string, FetchedVector>;
  namespace?: string;
}

interface FetchedVector {
  id: string;
  values: number[];
  sparseValues?: SparseVector;
  metadata?: Record<string, unknown>;
}

interface IndexStats {
  namespaces?: Record<string, NamespaceStats>;
  dimension?: number;
  indexFullness?: number;
  totalRecordCount?: number;
}

interface NamespaceStats {
  recordCount: number;
}

/**
 * Pinecone filter format
 * Supports $eq, $ne, $gt, $gte, $lt, $lte, $in, $nin operators
 */
type PineconeFilter = {
  [key: string]:
    | string
    | number
    | boolean
    | string[]
    | number[]
    | { $eq?: unknown }
    | { $ne?: unknown }
    | { $gt?: number }
    | { $gte?: number }
    | { $lt?: number }
    | { $lte?: number }
    | { $in?: unknown[] }
    | { $nin?: unknown[] }
    | { $exists?: boolean }
    | PineconeFilter;
  $and?: PineconeFilter[];
  $or?: PineconeFilter[];
};

/**
 * Pinecone Vector Store Adapter
 *
 * Features:
 * - Full CRUD operations for vector data
 * - Serverless and pod-based index support
 * - Namespace-based data organization
 * - Rich metadata filtering
 * - Sparse vectors for hybrid search
 * - Batch operations (chunks of 100 vectors)
 * - Dimension validation
 * - Health checks and statistics
 *
 * Note: Requires the @pinecone-database/pinecone package.
 * Install with: npm install @pinecone-database/pinecone
 */
export class PineconeAdapter extends BaseVectorStore<PineconeConfig> {
  private client: PineconeClient | null = null;
  private indexCache: Map<string, PineconeIndexDescription> = new Map();
  private clientFactory: PineconeClientFactory;

  // Maximum batch size for Pinecone upsert operations
  private static readonly MAX_BATCH_SIZE = 100;
  // Default namespace
  private static readonly DEFAULT_NAMESPACE = "";

  constructor(config: PineconeConfig) {
    super(config, "pinecone" as VectorStoreName);
    // Use injected client factory or default to dynamic import
    this.clientFactory = config.clientFactory || this.defaultClientFactory;
  }

  /**
   * Default client factory using dynamic import
   */
  private defaultClientFactory: PineconeClientFactory = async () => {
    try {
      const modulePath = "@pinecone-database/pinecone";
      const module = await import(/* @vite-ignore */ modulePath);
      return module;
    } catch {
      throw new Error(
        "Pinecone client not found. Install @pinecone-database/pinecone: npm install @pinecone-database/pinecone",
      );
    }
  };

  /**
   * Initialize connection to Pinecone
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      logger.debug("Pinecone already connected");
      return;
    }

    try {
      // Load Pinecone client via factory (injected or default)
      const pineconeModule = await this.clientFactory();

      // Create client with API key
      this.client = new pineconeModule.Pinecone({
        apiKey: this.config.apiKey,
      });

      // Verify connection by listing indexes
      await this.client.listIndexes();

      this.initialized = true;
      logger.debug("Pinecone connected successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to Pinecone: ${message}`);
    }
  }

  /**
   * Close connection to Pinecone
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      // Pinecone client doesn't have explicit disconnect
      this.client = null;
      this.initialized = false;
      this.indexCache.clear();
      logger.debug("Pinecone disconnected");
    }
  }

  /**
   * Create a new index
   * Note: Pinecone indexes take time to become ready (typically 1-2 minutes for serverless)
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const { name, dimension, metric = "cosine" } = config;
    const indexOptions = config.config as PineconeIndexOptions | undefined;

    try {
      // Check if index already exists
      const exists = await this.indexExists(name);
      if (exists) {
        logger.debug(`Index ${name} already exists`);
        return;
      }

      // Build index specification
      let spec: PineconeIndexSpec;
      if (indexOptions?.serverless) {
        spec = { serverless: indexOptions.serverless };
      } else if (indexOptions?.pod) {
        spec = { pod: indexOptions.pod };
      } else {
        // Default to serverless on AWS us-east-1
        spec = {
          serverless: {
            cloud: "aws",
            region: "us-east-1",
          },
        };
      }

      // Map NeuroLink metric to Pinecone metric
      const pineconeMetric = this.metricToPinecone(metric);

      // Create index
      await this.client!.createIndex({
        name,
        dimension,
        metric: pineconeMetric,
        spec,
        deletionProtection: indexOptions?.deletionProtection,
      });

      logger.debug(`Created Pinecone index ${name}`, { dimension, metric: pineconeMetric });
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

    try {
      const exists = await this.indexExists(indexName);
      if (!exists) {
        logger.debug(`Index ${indexName} does not exist`);
        return;
      }

      await this.client!.deleteIndex(indexName);
      this.indexCache.delete(indexName);

      logger.debug(`Deleted Pinecone index ${indexName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete index ${indexName}: ${message}`);
    }
  }

  /**
   * List all indexes
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    try {
      const result = await this.client!.listIndexes();
      return (result.indexes || []).map((idx) => idx.name);
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
      const indexes = await this.listIndexes();
      return indexes.includes(indexName);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to check index existence: ${message}`);
    }
  }

  /**
   * Upsert vectors into the index
   * Automatically batches in chunks of 100 (Pinecone's limit)
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

    const namespace = options?.namespace || this.config.namespace || PineconeAdapter.DEFAULT_NAMESPACE;

    // Validate dimensions
    this.validateDimensions(records.map((r) => r.vector));

    // Validate against index dimension
    await this.validateIndexDimension(indexName, records[0].vector.length);

    try {
      const index = this.client!.index(indexName);
      const ns = index.namespace(namespace);

      // Batch upsert in chunks of 100 (Pinecone's limit)
      const batchSize = Math.min(
        this.config.batchSize || PineconeAdapter.MAX_BATCH_SIZE,
        PineconeAdapter.MAX_BATCH_SIZE,
      );
      let totalUpserted = 0;

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const vectors: UpsertVector[] = batch.map((record) => {
          const upsertVec: UpsertVector = {
            id: record.id,
            values: record.vector,
          };

          // Add metadata if present
          if (record.metadata || record.content) {
            upsertVec.metadata = {
              ...(record.metadata || {}),
              ...(record.content && { _content: record.content }),
            };
          }

          return upsertVec;
        });

        const result = await ns.upsert(vectors);
        totalUpserted += result.upsertedCount || vectors.length;

        logger.debug(
          `Batch upsert progress: ${totalUpserted}/${records.length}`,
          { index: indexName, namespace },
        );
      }

      logger.debug(`Upserted ${totalUpserted} records to ${indexName}`);
      return { upsertedCount: totalUpserted };
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

    const ns = namespace || this.config.namespace || PineconeAdapter.DEFAULT_NAMESPACE;

    try {
      const index = this.client!.index(indexName);
      const namespaceObj = index.namespace(ns);

      // Build query parameters
      const queryParams: QueryParams = {
        vector,
        topK,
        includeValues: includeVectors,
        includeMetadata,
      };

      // Add filter if provided
      if (filter) {
        queryParams.filter = this.translateFilter(filter) as PineconeFilter;
      }

      // Execute query
      const response = await namespaceObj.query(queryParams);

      // Process results
      const results: VectorQueryResult<TMetadata>[] = [];

      for (const match of response.matches || []) {
        // Apply minimum score filter
        if (minScore !== undefined && (match.score ?? 0) < minScore) {
          continue;
        }

        const result: VectorQueryResult<TMetadata> = {
          id: match.id,
          score: match.score ?? 0,
        };

        if (includeVectors && match.values) {
          result.vector = match.values;
        }

        if (includeMetadata && match.metadata) {
          // Extract content from metadata if present
          const { _content, ...rest } = match.metadata as TMetadata & { _content?: string };
          result.metadata = rest as TMetadata;
          if (_content) {
            result.content = _content;
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

    const { ids, filter, namespace, deleteAll } = options;
    const ns = namespace || this.config.namespace || PineconeAdapter.DEFAULT_NAMESPACE;

    try {
      const index = this.client!.index(indexName);
      const namespaceObj = index.namespace(ns);
      let deletedCount = 0;

      if (deleteAll) {
        // Get count before deletion for reporting
        const stats = await this.getStats(indexName);
        deletedCount = stats.vectorCount;

        // Delete all vectors in namespace
        await namespaceObj.deleteAll();
      } else if (ids && ids.length > 0) {
        // Delete by IDs
        if (ids.length === 1) {
          await namespaceObj.deleteOne(ids[0]);
        } else {
          await namespaceObj.deleteMany(ids);
        }
        deletedCount = ids.length;
      } else if (filter) {
        // Pinecone doesn't support filter-based deletion directly
        // We need to query matching IDs first, then delete
        const pineconeFilter = this.translateFilter(filter) as PineconeFilter;

        // Query to get matching IDs (up to 10000)
        // Note: This is a workaround; for large datasets, pagination would be needed
        const queryResult = await index.namespace(ns).query({
          vector: new Array(await this.getIndexDimension(indexName)).fill(0),
          topK: 10000,
          filter: pineconeFilter,
          includeValues: false,
          includeMetadata: false,
        });

        const matchedIds = (queryResult.matches || []).map((m) => m.id);
        if (matchedIds.length > 0) {
          await namespaceObj.deleteMany(matchedIds);
          deletedCount = matchedIds.length;
        }
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

    try {
      const index = this.client!.index(indexName);
      const stats = await index.describeIndexStats();

      // Get index description for dimension info
      const description = await this.getIndexDescription(indexName);

      // Count namespaces
      const namespaceCount = stats.namespaces
        ? Object.keys(stats.namespaces).length
        : 0;

      return {
        vectorCount: stats.totalRecordCount || 0,
        dimension: stats.dimension || description.dimension,
        namespaceCount,
        metrics: {
          indexFullness: stats.indexFullness,
          metric: description.metric,
          host: description.host,
          status: description.status,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get stats for ${indexName}: ${message}`);
    }
  }

  /**
   * Get store health status
   */
  async healthCheck(): Promise<VectorStoreHealth> {
    const startTime = Date.now();
    try {
      if (!this.client) {
        return {
          healthy: false,
          status: "disconnected",
          latencyMs: Date.now() - startTime,
          error: "Client not initialized",
          lastChecked: new Date(),
        };
      }

      // Check health by listing indexes
      const indexes = await this.client.listIndexes();
      const indexList = indexes.indexes || [];

      // Check if any indexes are not ready
      const notReady = indexList.filter((idx) => !idx.status.ready);

      return {
        healthy: notReady.length === 0,
        status: notReady.length === 0 ? "connected" : "degraded",
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
   * Translate abstract filter to Pinecone filter format
   */
  protected translateFilter<TMetadata extends UnknownRecord>(
    filter: MetadataFilter<TMetadata>,
  ): PineconeFilter | null {
    const result: PineconeFilter = {};

    for (const [key, value] of Object.entries(filter)) {
      if (key === "$and" && Array.isArray(value)) {
        const subFilters = value
          .map((f) => this.translateFilter(f as MetadataFilter))
          .filter((f): f is PineconeFilter => f !== null);
        if (subFilters.length > 0) {
          result.$and = subFilters;
        }
      } else if (key === "$or" && Array.isArray(value)) {
        const subFilters = value
          .map((f) => this.translateFilter(f as MetadataFilter))
          .filter((f): f is PineconeFilter => f !== null);
        if (subFilters.length > 0) {
          result.$or = subFilters;
        }
      } else if (key === "$not" && typeof value === "object" && value !== null) {
        // Pinecone doesn't have a direct $not operator
        // We need to convert to equivalent using $ne or other operators
        // This is a limitation - complex NOT operations may not work perfectly
        const subFilter = this.translateFilter(value as MetadataFilter);
        if (subFilter) {
          // For simple equality $not, convert to $ne
          for (const [subKey, subValue] of Object.entries(subFilter)) {
            if (typeof subValue !== "object" || subValue === null) {
              result[subKey] = { $ne: subValue };
            } else if ("$eq" in subValue) {
              result[subKey] = { $ne: subValue.$eq };
            }
          }
        }
      } else if (this.isFieldFilter(value)) {
        result[key] = this.translateFieldFilter(value as FieldFilter);
      } else {
        // Simple equality
        result[key] = { $eq: value };
      }
    }

    return Object.keys(result).length > 0 ? result : null;
  }

  // ===================
  // PRIVATE HELPER METHODS
  // ===================

  /**
   * Get cached index description
   */
  private async getIndexDescription(indexName: string): Promise<PineconeIndexDescription> {
    const cached = this.indexCache.get(indexName);
    if (cached) {
      return cached;
    }

    const description = await this.client!.describeIndex(indexName);
    this.indexCache.set(indexName, description);
    return description;
  }

  /**
   * Get index dimension
   */
  private async getIndexDimension(indexName: string): Promise<number> {
    const description = await this.getIndexDescription(indexName);
    return description.dimension;
  }

  /**
   * Validate vector dimension against index dimension
   */
  private async validateIndexDimension(indexName: string, vectorDimension: number): Promise<void> {
    const indexDimension = await this.getIndexDimension(indexName);
    if (vectorDimension !== indexDimension) {
      throw new Error(
        `Vector dimension (${vectorDimension}) does not match index dimension (${indexDimension})`,
      );
    }
  }

  /**
   * Map NeuroLink similarity metric to Pinecone metric
   */
  private metricToPinecone(metric: SimilarityMetric): "cosine" | "euclidean" | "dotproduct" {
    switch (metric) {
      case "cosine":
        return "cosine";
      case "euclidean":
        return "euclidean";
      case "dotProduct":
        return "dotproduct";
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
   * Translate a field filter to Pinecone format
   */
  private translateFieldFilter(
    filter: FieldFilter,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [op, val] of Object.entries(filter)) {
      switch (op) {
        case "$eq":
          result.$eq = val;
          break;
        case "$ne":
          result.$ne = val;
          break;
        case "$gt":
          result.$gt = val as number;
          break;
        case "$gte":
          result.$gte = val as number;
          break;
        case "$lt":
          result.$lt = val as number;
          break;
        case "$lte":
          result.$lte = val as number;
          break;
        case "$in":
          result.$in = val;
          break;
        case "$nin":
          result.$nin = val;
          break;
        case "$exists":
          result.$exists = val;
          break;
        case "$contains":
        case "$startsWith":
        case "$endsWith":
          // Pinecone doesn't support string operations directly
          // Log warning and skip
          logger.warn(`Pinecone does not support ${op} operator, skipping`);
          break;
        default:
          // Unknown operator, treat as equality
          result.$eq = val;
      }
    }

    return result;
  }

  /**
   * Wait for index to be ready (useful after creation)
   */
  async waitForIndexReady(
    indexName: string,
    timeout: number = 120000,
    pollInterval: number = 5000,
  ): Promise<void> {
    this.ensureInitialized();

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const description = await this.client!.describeIndex(indexName);
        if (description.status.ready) {
          logger.debug(`Index ${indexName} is ready`);
          return;
        }
        logger.debug(`Index ${indexName} not ready, state: ${description.status.state}`);
      } catch (error) {
        logger.debug(`Error checking index status: ${error}`);
      }

      await this.sleep(pollInterval);
    }

    throw new Error(`Timeout waiting for index ${indexName} to be ready`);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Fetch vectors by IDs
   */
  async fetch<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    ids: string[],
    options?: { namespace?: string },
  ): Promise<Map<string, VectorRecord<TMetadata>>> {
    this.ensureInitialized();

    const namespace = options?.namespace || this.config.namespace || PineconeAdapter.DEFAULT_NAMESPACE;

    try {
      const index = this.client!.index(indexName);
      const ns = index.namespace(namespace);

      const response = await ns.fetch(ids);
      const result = new Map<string, VectorRecord<TMetadata>>();

      for (const [id, vector] of Object.entries(response.vectors || {})) {
        const record: VectorRecord<TMetadata> = {
          id,
          vector: vector.values,
        };

        if (vector.metadata) {
          const { _content, ...rest } = vector.metadata as TMetadata & { _content?: string };
          record.metadata = rest as TMetadata;
          if (_content) {
            record.content = _content;
          }
        }

        result.set(id, record);
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to fetch vectors: ${message}`);
    }
  }

  /**
   * Upsert with sparse vectors for hybrid search
   */
  async upsertSparse<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    records: Array<VectorRecord<TMetadata> & { sparseVector?: SparseVector }>,
    options?: VectorUpsertOptions,
  ): Promise<{ upsertedCount: number }> {
    this.ensureInitialized();

    if (records.length === 0) {
      return { upsertedCount: 0 };
    }

    const namespace = options?.namespace || this.config.namespace || PineconeAdapter.DEFAULT_NAMESPACE;

    // Validate dimensions
    this.validateDimensions(records.map((r) => r.vector));

    try {
      const index = this.client!.index(indexName);
      const ns = index.namespace(namespace);

      // Batch upsert
      const batchSize = Math.min(
        this.config.batchSize || PineconeAdapter.MAX_BATCH_SIZE,
        PineconeAdapter.MAX_BATCH_SIZE,
      );
      let totalUpserted = 0;

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const vectors: UpsertVector[] = batch.map((record) => {
          const upsertVec: UpsertVector = {
            id: record.id,
            values: record.vector,
          };

          // Add sparse vector if present
          if (record.sparseVector) {
            upsertVec.sparseValues = record.sparseVector;
          }

          // Add metadata if present
          if (record.metadata || record.content) {
            upsertVec.metadata = {
              ...(record.metadata || {}),
              ...(record.content && { _content: record.content }),
            };
          }

          return upsertVec;
        });

        const result = await ns.upsert(vectors);
        totalUpserted += result.upsertedCount || vectors.length;
      }

      logger.debug(`Upserted ${totalUpserted} sparse records to ${indexName}`);
      return { upsertedCount: totalUpserted };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to upsert sparse records: ${message}`);
    }
  }

  /**
   * Query with sparse vectors for hybrid search
   */
  async querySparse<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options: VectorQueryOptions<TMetadata> & { sparseVector?: SparseVector },
  ): Promise<VectorQueryResult<TMetadata>[]> {
    this.ensureInitialized();

    const {
      vector,
      sparseVector,
      topK,
      minScore,
      filter,
      includeVectors = false,
      includeMetadata = true,
      namespace,
    } = options;

    const ns = namespace || this.config.namespace || PineconeAdapter.DEFAULT_NAMESPACE;

    try {
      const index = this.client!.index(indexName);
      const namespaceObj = index.namespace(ns);

      // Build query parameters
      const queryParams: QueryParams = {
        vector,
        topK,
        includeValues: includeVectors,
        includeMetadata,
      };

      // Add sparse vector if provided
      if (sparseVector) {
        queryParams.sparseVector = sparseVector;
      }

      // Add filter if provided
      if (filter) {
        queryParams.filter = this.translateFilter(filter) as PineconeFilter;
      }

      // Execute query
      const response = await namespaceObj.query(queryParams);

      // Process results
      const results: VectorQueryResult<TMetadata>[] = [];

      for (const match of response.matches || []) {
        if (minScore !== undefined && (match.score ?? 0) < minScore) {
          continue;
        }

        const result: VectorQueryResult<TMetadata> = {
          id: match.id,
          score: match.score ?? 0,
        };

        if (includeVectors && match.values) {
          result.vector = match.values;
        }

        if (includeMetadata && match.metadata) {
          const { _content, ...rest } = match.metadata as TMetadata & { _content?: string };
          result.metadata = rest as TMetadata;
          if (_content) {
            result.content = _content;
          }
        }

        results.push(result);
      }

      return results;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to query sparse vectors: ${message}`);
    }
  }

  /**
   * Get namespace statistics
   */
  async getNamespaceStats(
    indexName: string,
  ): Promise<Record<string, { recordCount: number }>> {
    this.ensureInitialized();

    try {
      const index = this.client!.index(indexName);
      const stats = await index.describeIndexStats();
      return stats.namespaces || {};
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get namespace stats: ${message}`);
    }
  }
}
