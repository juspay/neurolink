/**
 * Qdrant Vector Store Adapter
 * Implements vector similarity search using Qdrant cloud-native vector database
 *
 * Qdrant is a vector similarity search engine with a rich filtering system,
 * multiple distance metrics, and support for payload storage. It supports:
 * - Rich filtering with must/should/must_not conditions
 * - Multiple distance metrics (Cosine, Euclidean, Dot)
 * - Scalar and binary quantization for memory optimization
 * - Named vectors (multiple vector fields per point)
 * - Shard key routing for multi-tenant scenarios
 * - Batch operations with automatic chunking
 *
 * @see https://qdrant.tech/documentation/
 * @see https://github.com/qdrant/qdrant-js
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
  VectorStoreHealth,
  VectorStoreName,
  VectorStoreStats,
  VectorUpsertOptions,
} from "../types.js";

/**
 * Qdrant-specific configuration
 */
export type QdrantConfig = VectorStoreConfig & {
  /** Qdrant server URL (e.g., "http://localhost:6333" or "https://your-cluster.cloud.qdrant.io") */
  url?: string;
  /** API key for Qdrant Cloud (optional for local instances) */
  apiKey?: string;
  /** gRPC port for faster operations (default: 6334) */
  grpcPort?: number;
  /** Use HTTPS (default: auto-detected from URL) */
  https?: boolean;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Check TLS certificate (default: true) */
  checkTls?: boolean;
  /** Default shard key for multi-tenant scenarios */
  defaultShardKey?: string;
  /** Enable on-disk payload storage */
  onDiskPayload?: boolean;
  /** Write consistency factor (default: 1) */
  writeConsistencyFactor?: number;
  /** Custom client factory for dependency injection (mainly for testing) */
  clientFactory?: QdrantClientFactory;
};

/**
 * Qdrant distance metrics
 */
export type QdrantDistance = "Cosine" | "Euclid" | "Dot" | "Manhattan";

/**
 * Qdrant index configuration options
 */
export type QdrantIndexOptions = {
  /** Distance metric (default: Cosine) */
  distance?: QdrantDistance;
  /** HNSW index parameters */
  hnsw?: {
    /** Number of edges per node (default: 16) */
    m?: number;
    /** Number of neighbours to consider during construction (default: 100) */
    efConstruct?: number;
    /** Minimal size of layer to start search */
    fullScanThreshold?: number;
    /** Number of parallel threads for background index building */
    maxIndexingThreads?: number;
    /** Store vectors on disk instead of memory */
    onDisk?: boolean;
  };
  /** Quantization settings for memory optimization */
  quantization?: QdrantQuantization;
  /** Enable on-disk vector storage */
  onDisk?: boolean;
  /** Shard number (for sharding) */
  shardNumber?: number;
  /** Replication factor */
  replicationFactor?: number;
  /** Write consistency factor */
  writeConsistencyFactor?: number;
};

/**
 * Qdrant quantization options
 */
export type QdrantQuantization = {
  /** Quantization type */
  type: "scalar" | "binary" | "product";
  /** Scalar quantization options */
  scalar?: {
    /** Data type for quantization (default: int8) */
    dataType?: "int8" | "float16";
    /** Quantile for quantization (default: 0.99) */
    quantile?: number;
    /** Always use original vectors for rescoring */
    alwaysRam?: boolean;
  };
  /** Binary quantization options */
  binary?: {
    /** Always use original vectors for rescoring */
    alwaysRam?: boolean;
  };
  /** Product quantization options */
  product?: {
    /** Compression ratio */
    compression?: "x4" | "x8" | "x16" | "x32" | "x64";
    /** Always use original vectors for rescoring */
    alwaysRam?: boolean;
  };
};

/**
 * Qdrant search parameters
 */
export type QdrantSearchParams = {
  /** Size of the dynamic candidate list (default: 128) */
  ef?: number;
  /** Whether to use exact search (default: false) */
  exact?: boolean;
  /** Quantization search parameters */
  quantization?: {
    /** Whether to ignore quantized vectors */
    ignore?: boolean;
    /** Rescore top results using original vectors */
    rescore?: boolean;
    /** Oversampling factor for rescoring */
    oversampling?: number;
  };
};

/**
 * Qdrant client factory type for dependency injection
 */
export type QdrantClientFactory = () => Promise<{
  QdrantClient: new (config: QdrantClientConfig) => QdrantClient;
}>;

/**
 * Internal Qdrant client configuration
 */
interface QdrantClientConfig {
  url?: string;
  apiKey?: string;
  https?: boolean;
  timeout?: number;
  checkTls?: boolean;
}

/**
 * Internal Qdrant client interface
 * Compatible with @qdrant/js-client-rest API
 */
interface QdrantClient {
  getCollections(): Promise<{ collections: CollectionInfo[] }>;
  collectionExists(name: string): Promise<{ exists: boolean }>;
  createCollection(name: string, params: CreateCollectionParams): Promise<OperationResult>;
  deleteCollection(name: string): Promise<OperationResult>;
  getCollection(name: string): Promise<CollectionInfo>;
  upsert(collectionName: string, params: UpsertParams): Promise<OperationResult>;
  search(collectionName: string, params: SearchParams): Promise<SearchResult[]>;
  delete(collectionName: string, params: DeleteParams): Promise<OperationResult>;
  scroll(collectionName: string, params: ScrollParams): Promise<ScrollResult>;
  count(collectionName: string, params?: CountParams): Promise<{ count: number }>;
  healthcheck(): Promise<HealthCheckResult>;
}

interface CollectionInfo {
  name: string;
  status?: string;
  vectors_count?: number;
  points_count?: number;
  segments_count?: number;
  config?: {
    params?: {
      vectors?:
        | {
            size?: number;
            distance?: string;
          }
        | Record<string, { size?: number; distance?: string }>;
      shard_number?: number;
      replication_factor?: number;
      write_consistency_factor?: number;
    };
    hnsw_config?: {
      m?: number;
      ef_construct?: number;
    };
    quantization_config?: unknown;
  };
  payload_schema?: Record<string, unknown>;
}

interface CreateCollectionParams {
  vectors: VectorsConfig | Record<string, VectorsConfig>;
  sparse_vectors?: Record<string, unknown>;
  shard_number?: number;
  sharding_method?: string;
  replication_factor?: number;
  write_consistency_factor?: number;
  on_disk_payload?: boolean;
  hnsw_config?: HnswConfig;
  optimizers_config?: OptimizersConfig;
  wal_config?: unknown;
  quantization_config?: QuantizationConfig;
}

interface VectorsConfig {
  size: number;
  distance: QdrantDistance;
  on_disk?: boolean;
  hnsw_config?: HnswConfig;
  quantization_config?: QuantizationConfig;
}

interface HnswConfig {
  m?: number;
  ef_construct?: number;
  full_scan_threshold?: number;
  max_indexing_threads?: number;
  on_disk?: boolean;
}

interface OptimizersConfig {
  deleted_threshold?: number;
  vacuum_min_vector_number?: number;
  default_segment_number?: number;
  max_segment_size?: number;
  memmap_threshold?: number;
  indexing_threshold?: number;
  flush_interval_sec?: number;
  max_optimization_threads?: number;
}

interface QuantizationConfig {
  scalar?: {
    type: "int8" | "float16";
    quantile?: number;
    always_ram?: boolean;
  };
  binary?: {
    always_ram?: boolean;
  };
  product?: {
    compression: "x4" | "x8" | "x16" | "x32" | "x64";
    always_ram?: boolean;
  };
}

interface UpsertParams {
  wait?: boolean;
  ordering?: string;
  points: QdrantPoint[];
  shard_key_selector?: string | string[];
}

interface QdrantPoint {
  id: string | number;
  vector: number[] | Record<string, number[]>;
  payload?: Record<string, unknown>;
}

interface SearchParams {
  vector: number[] | { name: string; vector: number[] };
  limit: number;
  offset?: number;
  filter?: QdrantFilter;
  with_payload?: boolean | string[];
  with_vector?: boolean | string[];
  score_threshold?: number;
  params?: {
    ef?: number;
    exact?: boolean;
    quantization?: {
      ignore?: boolean;
      rescore?: boolean;
      oversampling?: number;
    };
  };
  shard_key_selector?: string | string[];
}

interface SearchResult {
  id: string | number;
  version?: number;
  score: number;
  payload?: Record<string, unknown>;
  vector?: number[] | Record<string, number[]>;
}

interface DeleteParams {
  wait?: boolean;
  ordering?: string;
  points?: (string | number)[];
  filter?: QdrantFilter;
  shard_key_selector?: string | string[];
}

interface ScrollParams {
  limit?: number;
  offset?: string | number;
  filter?: QdrantFilter;
  with_payload?: boolean;
  with_vector?: boolean;
  shard_key_selector?: string | string[];
}

interface ScrollResult {
  points: Array<{
    id: string | number;
    payload?: Record<string, unknown>;
    vector?: number[] | Record<string, number[]>;
  }>;
  next_page_offset?: string | number;
}

interface CountParams {
  filter?: QdrantFilter;
  exact?: boolean;
  shard_key_selector?: string | string[];
}

interface OperationResult {
  operation_id?: number;
  status: string;
  result?: boolean;
}

interface HealthCheckResult {
  title?: string;
  version?: string;
}

/**
 * Qdrant filter format
 * Supports must/should/must_not conditions
 */
interface QdrantFilter {
  must?: QdrantCondition[];
  should?: QdrantCondition[];
  must_not?: QdrantCondition[];
  min_should?: {
    conditions: QdrantCondition[];
    min_count: number;
  };
}

interface QdrantCondition {
  key?: string;
  match?: QdrantMatch;
  range?: QdrantRange;
  geo_bounding_box?: unknown;
  geo_radius?: unknown;
  values_count?: QdrantValuesCount;
  is_empty?: { key: string };
  is_null?: { key: string };
  has_id?: (string | number)[];
  nested?: {
    key: string;
    filter: QdrantFilter;
  };
  filter?: QdrantFilter;
}

interface QdrantMatch {
  value?: string | number | boolean;
  text?: string;
  any?: (string | number)[];
  except?: (string | number)[];
}

interface QdrantRange {
  lt?: number;
  lte?: number;
  gt?: number;
  gte?: number;
}

interface QdrantValuesCount {
  lt?: number;
  lte?: number;
  gt?: number;
  gte?: number;
}

/**
 * Qdrant Vector Store Adapter
 *
 * Features:
 * - Full CRUD operations for vector data
 * - Rich filtering with must/should/must_not conditions
 * - Multiple distance metrics (Cosine, Euclidean, Dot)
 * - Scalar and binary quantization support
 * - Named vectors (multiple vector fields per point)
 * - Shard key routing for multi-tenant scenarios
 * - Batch operations with automatic chunking
 *
 * Note: Requires @qdrant/js-client-rest to be installed:
 *   npm install @qdrant/js-client-rest
 */
export class QdrantAdapter extends BaseVectorStore<QdrantConfig> {
  private client: QdrantClient | null = null;
  private collectionCache: Map<string, CollectionInfo> = new Map();
  private clientFactory: QdrantClientFactory;

  // Reserved payload field names
  private static readonly CONTENT_FIELD = "_content";
  private static readonly NAMESPACE_FIELD = "_namespace";

  constructor(config: QdrantConfig) {
    super(config, "qdrant" as VectorStoreName);
    // Use injected client factory or default to dynamic import
    this.clientFactory = config.clientFactory || this.defaultClientFactory;
  }

  /**
   * Default client factory using dynamic import
   */
  private defaultClientFactory: QdrantClientFactory = async () => {
    try {
      const modulePath = "@qdrant/js-client-rest";
      const module = await import(/* @vite-ignore */ modulePath);
      return module.default || module;
    } catch {
      throw new Error("Qdrant client not found. Install @qdrant/js-client-rest: npm install @qdrant/js-client-rest");
    }
  };

  /**
   * Initialize connection to Qdrant
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      logger.debug("Qdrant already connected");
      return;
    }

    try {
      // Load Qdrant client via factory (injected or default)
      const qdrant = await this.clientFactory();

      // Build client configuration
      const clientConfig: QdrantClientConfig = {
        url: this.config.url || "http://localhost:6333",
        timeout: this.config.timeout || 30000,
      };

      // Add API key if provided
      if (this.config.apiKey) {
        clientConfig.apiKey = this.config.apiKey;
      }

      // Configure HTTPS
      if (this.config.https !== undefined) {
        clientConfig.https = this.config.https;
      }

      // Configure TLS checking
      if (this.config.checkTls !== undefined) {
        clientConfig.checkTls = this.config.checkTls;
      }

      // Create client
      this.client = new qdrant.QdrantClient(clientConfig);

      // Verify connection with health check
      await this.client.healthcheck();

      this.initialized = true;
      logger.debug("Qdrant connected successfully", {
        url: this.config.url,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to Qdrant: ${message}`);
    }
  }

  /**
   * Close connection to Qdrant
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      // Qdrant client doesn't have explicit disconnect
      this.client = null;
      this.initialized = false;
      this.collectionCache.clear();
      logger.debug("Qdrant disconnected");
    }
  }

  /**
   * Create a new index (Qdrant collection)
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const { name, dimension, metric = "cosine" } = config;
    const collectionName = this.sanitizeCollectionName(name);
    const indexOptions = config.config as QdrantIndexOptions | undefined;

    try {
      // Check if collection already exists
      const exists = await this.client!.collectionExists(collectionName);
      if (exists.exists) {
        logger.debug(`Collection ${collectionName} already exists`);
        return;
      }

      // Map NeuroLink metric to Qdrant distance
      const distanceMap: Record<SimilarityMetric, QdrantDistance> = {
        cosine: "Cosine",
        euclidean: "Euclid",
        dotProduct: "Dot",
      };

      // Build vectors configuration
      const vectorsConfig: VectorsConfig = {
        size: dimension,
        distance: indexOptions?.distance || distanceMap[metric] || "Cosine",
      };

      // Add on-disk storage if configured
      if (indexOptions?.onDisk !== undefined) {
        vectorsConfig.on_disk = indexOptions.onDisk;
      }

      // Add HNSW configuration if provided
      if (indexOptions?.hnsw) {
        vectorsConfig.hnsw_config = {
          m: indexOptions.hnsw.m,
          ef_construct: indexOptions.hnsw.efConstruct,
          full_scan_threshold: indexOptions.hnsw.fullScanThreshold,
          max_indexing_threads: indexOptions.hnsw.maxIndexingThreads,
          on_disk: indexOptions.hnsw.onDisk,
        };
      }

      // Add quantization if provided
      if (indexOptions?.quantization) {
        vectorsConfig.quantization_config = this.buildQuantizationConfig(indexOptions.quantization);
      }

      // Build collection parameters
      const createParams: CreateCollectionParams = {
        vectors: vectorsConfig,
      };

      // Add sharding configuration
      if (indexOptions?.shardNumber) {
        createParams.shard_number = indexOptions.shardNumber;
      }

      // Add replication configuration
      if (indexOptions?.replicationFactor) {
        createParams.replication_factor = indexOptions.replicationFactor;
      }

      // Add write consistency
      if (indexOptions?.writeConsistencyFactor || this.config.writeConsistencyFactor) {
        createParams.write_consistency_factor =
          indexOptions?.writeConsistencyFactor || this.config.writeConsistencyFactor;
      }

      // Add on-disk payload storage
      if (this.config.onDiskPayload) {
        createParams.on_disk_payload = true;
      }

      await this.client!.createCollection(collectionName, createParams);

      logger.debug(`Created Qdrant collection ${collectionName}`, {
        dimension,
        metric,
        distance: vectorsConfig.distance,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create index ${name}: ${message}`);
    }
  }

  /**
   * Delete an index (Qdrant collection)
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    const collectionName = this.sanitizeCollectionName(indexName);

    try {
      const exists = await this.client!.collectionExists(collectionName);
      if (!exists.exists) {
        logger.debug(`Collection ${collectionName} does not exist`);
        return;
      }

      await this.client!.deleteCollection(collectionName);
      this.collectionCache.delete(indexName);

      logger.debug(`Deleted Qdrant collection ${collectionName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to delete index ${indexName}: ${message}`);
    }
  }

  /**
   * List all indexes (Qdrant collections)
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    try {
      const result = await this.client!.getCollections();
      return (result.collections || []).map((c) => c.name);
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

    const collectionName = this.sanitizeCollectionName(indexName);

    try {
      const result = await this.client!.collectionExists(collectionName);
      return result.exists;
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

    const collectionName = this.sanitizeCollectionName(indexName);
    const namespace = options?.namespace || null;

    // Validate dimensions
    this.validateDimensions(records.map((r) => r.vector));

    try {
      // Use batch size from options or default
      const batchSize = options?.batchSize || 100;
      let upsertedCount = 0;

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);

        // Convert records to Qdrant points
        const points: QdrantPoint[] = batch.map((record) => ({
          id: this.toQdrantId(record.id),
          vector: record.vector,
          payload: {
            ...(record.metadata || {}),
            [QdrantAdapter.CONTENT_FIELD]: record.content || "",
            [QdrantAdapter.NAMESPACE_FIELD]: record.namespace || namespace || "",
          },
        }));

        // Build upsert parameters
        const upsertParams: UpsertParams = {
          wait: true,
          points,
        };

        // Add shard key if configured
        if (this.config.defaultShardKey) {
          upsertParams.shard_key_selector = this.config.defaultShardKey;
        }

        const result = await this.client!.upsert(collectionName, upsertParams);

        if (result.status === "completed" || result.status === "acknowledged") {
          upsertedCount += batch.length;
        }
      }

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
    const { vector, topK, minScore, filter, includeVectors = false, includeMetadata = true, namespace } = options;

    try {
      // Build search parameters
      const searchParams: SearchParams = {
        vector,
        limit: topK,
        with_payload: includeMetadata,
        with_vector: includeVectors,
      };

      // Add score threshold if provided
      if (minScore !== undefined) {
        searchParams.score_threshold = minScore;
      }

      // Build filter
      const qdrantFilter = this.buildFilter(filter, namespace);
      if (qdrantFilter) {
        searchParams.filter = qdrantFilter;
      }

      // Add shard key if configured
      if (this.config.defaultShardKey) {
        searchParams.shard_key_selector = this.config.defaultShardKey;
      }

      // Execute search
      const results = await this.client!.search(collectionName, searchParams);

      // Convert results to VectorQueryResult format
      return results.map((result) => {
        const queryResult: VectorQueryResult<TMetadata> = {
          id: String(result.id),
          score: result.score,
        };

        if (includeVectors && result.vector) {
          // Handle both single vector and named vectors
          queryResult.vector = Array.isArray(result.vector) ? result.vector : Object.values(result.vector)[0];
        }

        if (includeMetadata && result.payload) {
          // Extract content and metadata
          const {
            [QdrantAdapter.CONTENT_FIELD]: content,
            [QdrantAdapter.NAMESPACE_FIELD]: _,
            ...metadata
          } = result.payload;
          queryResult.content = content as string | undefined;
          queryResult.metadata = metadata as TMetadata;
        }

        return queryResult;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to query vectors: ${message}`);
    }
  }

  /**
   * Delete vectors from the collection
   */
  async delete(indexName: string, options: VectorDeleteOptions): Promise<{ deletedCount: number }> {
    this.ensureInitialized();

    const collectionName = this.sanitizeCollectionName(indexName);
    const { ids, filter, namespace, deleteAll } = options;

    try {
      let deletedCount = 0;

      // Build delete parameters
      const deleteParams: DeleteParams = {
        wait: true,
      };

      // Add shard key if configured
      if (this.config.defaultShardKey) {
        deleteParams.shard_key_selector = this.config.defaultShardKey;
      }

      if (deleteAll) {
        // Get count before deletion
        const countResult = await this.client!.count(collectionName, {
          filter: namespace
            ? {
                must: [
                  {
                    key: QdrantAdapter.NAMESPACE_FIELD,
                    match: { value: namespace },
                  },
                ],
              }
            : undefined,
        });
        deletedCount = countResult.count;

        // Delete by filter (all or by namespace)
        if (namespace) {
          deleteParams.filter = {
            must: [
              {
                key: QdrantAdapter.NAMESPACE_FIELD,
                match: { value: namespace },
              },
            ],
          };
        } else {
          // Delete all - use a filter that matches everything
          // Qdrant doesn't have a "delete all" so we use a workaround
          // We can use has_id with empty array negation, or just scroll and delete
          // For now, get all IDs and delete them
          const allPoints = await this.client!.scroll(collectionName, {
            limit: 10000,
            with_payload: false,
            with_vector: false,
          });
          if (allPoints.points.length > 0) {
            deleteParams.points = allPoints.points.map((p) => p.id);
          } else {
            return { deletedCount: 0 };
          }
        }
      } else if (ids && ids.length > 0) {
        // Delete by IDs
        deleteParams.points = ids.map((id) => this.toQdrantId(id));
        deletedCount = ids.length;
      } else if (filter) {
        // Get count before deletion
        const qdrantFilter = this.translateFilter(filter);
        if (qdrantFilter) {
          const filterWithNamespace = this.combineFilters(qdrantFilter as QdrantFilter, namespace);
          const countResult = await this.client!.count(collectionName, {
            filter: filterWithNamespace,
            exact: true,
          });
          deletedCount = countResult.count;
          deleteParams.filter = filterWithNamespace;
        }
      }

      // Execute delete
      if (deleteParams.points || deleteParams.filter) {
        await this.client!.delete(collectionName, deleteParams);
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
      // Get collection info
      const info = await this.client!.getCollection(collectionName);

      // Get vector count
      const vectorCount = info.points_count || info.vectors_count || 0;

      // Get dimension from vectors config
      let dimension: number | undefined;
      if (info.config?.params?.vectors) {
        const vectorsConfig = info.config.params.vectors;
        if (typeof vectorsConfig === "number") {
          dimension = vectorsConfig;
        } else if ("size" in vectorsConfig && typeof vectorsConfig.size === "number") {
          dimension = vectorsConfig.size;
        } else if (typeof vectorsConfig === "object") {
          // Named vectors - get the first one
          const firstVector = Object.values(vectorsConfig)[0];
          dimension = typeof firstVector === "object" ? firstVector?.size : undefined;
        }
      }

      // Estimate namespace count by querying distinct namespaces
      // Qdrant doesn't have a direct distinct count, so this is approximate
      let namespaceCount = 0;
      try {
        const scrollResult = await this.client!.scroll(collectionName, {
          limit: 1000,
          with_payload: true,
          with_vector: false,
        });
        const namespaces = new Set(
          scrollResult.points.map((p) => p.payload?.[QdrantAdapter.NAMESPACE_FIELD]).filter(Boolean),
        );
        namespaceCount = namespaces.size;
      } catch {
        // Ignore namespace count errors
      }

      return {
        vectorCount,
        dimension,
        namespaceCount,
        metrics: {
          status: info.status,
          segmentsCount: info.segments_count,
          distance: info.config?.params?.vectors
            ? "size" in info.config.params.vectors
              ? info.config.params.vectors.distance
              : Object.values(info.config.params.vectors)[0]?.distance
            : undefined,
          shardNumber: info.config?.params?.shard_number,
          replicationFactor: info.config?.params?.replication_factor,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get stats for ${indexName}: ${message}`);
    }
  }

  /**
   * Health check for Qdrant connection
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
          error: "Client not initialized",
        };
      }

      // Perform health check
      const _health = await this.client.healthcheck();

      return {
        healthy: true,
        status: "connected",
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
   * Translate abstract filter to Qdrant filter format
   */
  protected translateFilter<TMetadata extends UnknownRecord>(filter: MetadataFilter<TMetadata>): QdrantFilter | null {
    const must: QdrantCondition[] = [];
    const should: QdrantCondition[] = [];
    const mustNot: QdrantCondition[] = [];

    for (const [key, value] of Object.entries(filter)) {
      if (key === "$and" && Array.isArray(value)) {
        // AND conditions go into must
        for (const subFilter of value) {
          const translated = this.translateFilter(subFilter as MetadataFilter);
          if (translated) {
            must.push({ filter: translated });
          }
        }
      } else if (key === "$or" && Array.isArray(value)) {
        // OR conditions go into should
        for (const subFilter of value) {
          const translated = this.translateFilter(subFilter as MetadataFilter);
          if (translated) {
            should.push({ filter: translated });
          }
        }
      } else if (key === "$not" && typeof value === "object" && value !== null) {
        // NOT conditions go into must_not
        const translated = this.translateFilter(value as MetadataFilter);
        if (translated) {
          mustNot.push({ filter: translated });
        }
      } else if (this.isFieldFilter(value)) {
        // Field-level filter
        const conditions = this.translateFieldFilter(key, value as FieldFilter);
        must.push(...conditions);
      } else {
        // Simple equality
        must.push({
          key,
          match: { value: value as string | number | boolean },
        });
      }
    }

    // Build filter only if there are conditions
    if (must.length === 0 && should.length === 0 && mustNot.length === 0) {
      return null;
    }

    const qdrantFilter: QdrantFilter = {};
    if (must.length > 0) {
      qdrantFilter.must = must;
    }
    if (should.length > 0) {
      qdrantFilter.should = should;
    }
    if (mustNot.length > 0) {
      qdrantFilter.must_not = mustNot;
    }

    return qdrantFilter;
  }

  // ===================
  // QDRANT-SPECIFIC PUBLIC METHODS
  // ===================

  /**
   * Create an index with named vectors support
   * Allows storing multiple vector fields per point
   */
  async createIndexWithNamedVectors(
    name: string,
    vectors: Record<string, { dimension: number; metric?: SimilarityMetric }>,
    options?: QdrantIndexOptions,
  ): Promise<void> {
    this.ensureInitialized();

    const collectionName = this.sanitizeCollectionName(name);

    try {
      // Check if collection already exists
      const exists = await this.client!.collectionExists(collectionName);
      if (exists.exists) {
        logger.debug(`Collection ${collectionName} already exists`);
        return;
      }

      // Map NeuroLink metric to Qdrant distance
      const distanceMap: Record<SimilarityMetric, QdrantDistance> = {
        cosine: "Cosine",
        euclidean: "Euclid",
        dotProduct: "Dot",
      };

      // Build named vectors configuration
      const namedVectors: Record<string, VectorsConfig> = {};
      for (const [vectorName, config] of Object.entries(vectors)) {
        namedVectors[vectorName] = {
          size: config.dimension,
          distance: distanceMap[config.metric || "cosine"] || "Cosine",
        };
      }

      // Build collection parameters
      const createParams: CreateCollectionParams = {
        vectors: namedVectors,
      };

      // Add other options
      if (options?.shardNumber) {
        createParams.shard_number = options.shardNumber;
      }
      if (options?.replicationFactor) {
        createParams.replication_factor = options.replicationFactor;
      }
      if (this.config.onDiskPayload) {
        createParams.on_disk_payload = true;
      }

      await this.client!.createCollection(collectionName, createParams);

      logger.debug(`Created Qdrant collection ${collectionName} with named vectors`, {
        vectors: Object.keys(namedVectors),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create index with named vectors: ${message}`);
    }
  }

  /**
   * Upsert records with named vectors
   */
  async upsertWithNamedVectors<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    records: Array<{
      id: string;
      vectors: Record<string, number[]>;
      metadata?: TMetadata;
      content?: string;
      namespace?: string;
    }>,
    options?: VectorUpsertOptions,
  ): Promise<{ upsertedCount: number }> {
    this.ensureInitialized();

    if (records.length === 0) {
      return { upsertedCount: 0 };
    }

    const collectionName = this.sanitizeCollectionName(indexName);
    const namespace = options?.namespace || null;

    try {
      const batchSize = options?.batchSize || 100;
      let upsertedCount = 0;

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);

        const points: QdrantPoint[] = batch.map((record) => ({
          id: this.toQdrantId(record.id),
          vector: record.vectors,
          payload: {
            ...(record.metadata || {}),
            [QdrantAdapter.CONTENT_FIELD]: record.content || "",
            [QdrantAdapter.NAMESPACE_FIELD]: record.namespace || namespace || "",
          },
        }));

        const upsertParams: UpsertParams = {
          wait: true,
          points,
        };

        if (this.config.defaultShardKey) {
          upsertParams.shard_key_selector = this.config.defaultShardKey;
        }

        const result = await this.client!.upsert(collectionName, upsertParams);

        if (result.status === "completed" || result.status === "acknowledged") {
          upsertedCount += batch.length;
        }
      }

      logger.debug(`Upserted ${upsertedCount} records with named vectors to ${indexName}`);
      return { upsertedCount };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to upsert records with named vectors: ${message}`);
    }
  }

  /**
   * Query using a specific named vector
   */
  async queryNamedVector<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    vectorName: string,
    options: VectorQueryOptions<TMetadata>,
  ): Promise<VectorQueryResult<TMetadata>[]> {
    this.ensureInitialized();

    const collectionName = this.sanitizeCollectionName(indexName);
    const { vector, topK, minScore, filter, includeVectors = false, includeMetadata = true, namespace } = options;

    try {
      const searchParams: SearchParams = {
        vector: { name: vectorName, vector },
        limit: topK,
        with_payload: includeMetadata,
        with_vector: includeVectors ? [vectorName] : false,
      };

      if (minScore !== undefined) {
        searchParams.score_threshold = minScore;
      }

      const qdrantFilter = this.buildFilter(filter, namespace);
      if (qdrantFilter) {
        searchParams.filter = qdrantFilter;
      }

      if (this.config.defaultShardKey) {
        searchParams.shard_key_selector = this.config.defaultShardKey;
      }

      const results = await this.client!.search(collectionName, searchParams);

      return results.map((result) => {
        const queryResult: VectorQueryResult<TMetadata> = {
          id: String(result.id),
          score: result.score,
        };

        if (includeVectors && result.vector) {
          const namedVectors = result.vector as Record<string, number[]>;
          queryResult.vector = namedVectors[vectorName];
        }

        if (includeMetadata && result.payload) {
          const {
            [QdrantAdapter.CONTENT_FIELD]: content,
            [QdrantAdapter.NAMESPACE_FIELD]: _,
            ...metadata
          } = result.payload;
          queryResult.content = content as string | undefined;
          queryResult.metadata = metadata as TMetadata;
        }

        return queryResult;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to query named vector: ${message}`);
    }
  }

  /**
   * Scroll through all points in a collection
   */
  async scroll<TMetadata extends UnknownRecord = UnknownRecord>(
    indexName: string,
    options?: {
      limit?: number;
      offset?: string | number;
      filter?: MetadataFilter<TMetadata>;
      namespace?: string;
      includeVectors?: boolean;
      includeMetadata?: boolean;
    },
  ): Promise<{
    results: VectorQueryResult<TMetadata>[];
    nextOffset?: string | number;
  }> {
    this.ensureInitialized();

    const collectionName = this.sanitizeCollectionName(indexName);

    try {
      const scrollParams: ScrollParams = {
        limit: options?.limit || 100,
        with_payload: options?.includeMetadata !== false,
        with_vector: options?.includeVectors || false,
      };

      if (options?.offset !== undefined) {
        scrollParams.offset = options.offset;
      }

      const qdrantFilter = this.buildFilter(options?.filter, options?.namespace);
      if (qdrantFilter) {
        scrollParams.filter = qdrantFilter;
      }

      if (this.config.defaultShardKey) {
        scrollParams.shard_key_selector = this.config.defaultShardKey;
      }

      const result = await this.client!.scroll(collectionName, scrollParams);

      const results: VectorQueryResult<TMetadata>[] = result.points.map((point) => {
        const queryResult: VectorQueryResult<TMetadata> = {
          id: String(point.id),
          score: 1.0, // Scroll doesn't have scores
        };

        if (options?.includeVectors && point.vector) {
          queryResult.vector = Array.isArray(point.vector) ? point.vector : Object.values(point.vector)[0];
        }

        if (options?.includeMetadata !== false && point.payload) {
          const {
            [QdrantAdapter.CONTENT_FIELD]: content,
            [QdrantAdapter.NAMESPACE_FIELD]: _,
            ...metadata
          } = point.payload;
          queryResult.content = content as string | undefined;
          queryResult.metadata = metadata as TMetadata;
        }

        return queryResult;
      });

      return {
        results,
        nextOffset: result.next_page_offset,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to scroll: ${message}`);
    }
  }

  // ===================
  // PRIVATE HELPER METHODS
  // ===================

  /**
   * Sanitize collection name to be Qdrant-compatible
   */
  private sanitizeCollectionName(name: string): string {
    // Qdrant collection names can contain alphanumeric, underscore, hyphen
    return name.replace(/[^a-zA-Z0-9_-]/g, "_");
  }

  /**
   * Convert string ID to Qdrant-compatible ID
   * Qdrant supports both string and unsigned integer IDs
   */
  private toQdrantId(id: string): string | number {
    // If the ID is a pure number, return as number
    const numId = parseInt(id, 10);
    if (!isNaN(numId) && numId.toString() === id && numId >= 0) {
      return numId;
    }
    // Otherwise return as string (UUID or custom string)
    return id;
  }

  /**
   * Build Qdrant filter from metadata filter and namespace
   */
  private buildFilter<TMetadata extends UnknownRecord>(
    filter?: MetadataFilter<TMetadata>,
    namespace?: string,
  ): QdrantFilter | null {
    const conditions: QdrantCondition[] = [];

    // Add namespace filter
    if (namespace) {
      conditions.push({
        key: QdrantAdapter.NAMESPACE_FIELD,
        match: { value: namespace },
      });
    }

    // Add metadata filter
    if (filter) {
      const metadataFilter = this.translateFilter(filter);
      if (metadataFilter) {
        conditions.push({ filter: metadataFilter });
      }
    }

    if (conditions.length === 0) {
      return null;
    }

    return { must: conditions };
  }

  /**
   * Combine Qdrant filter with namespace
   */
  private combineFilters(filter: QdrantFilter, namespace?: string): QdrantFilter {
    if (!namespace) {
      return filter;
    }

    const namespaceCondition: QdrantCondition = {
      key: QdrantAdapter.NAMESPACE_FIELD,
      match: { value: namespace },
    };

    return {
      ...filter,
      must: [...(filter.must || []), namespaceCondition],
    };
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
   * Translate a field filter to Qdrant conditions
   */
  private translateFieldFilter(key: string, filter: FieldFilter): QdrantCondition[] {
    const conditions: QdrantCondition[] = [];

    for (const [op, val] of Object.entries(filter)) {
      switch (op) {
        case "$eq":
          conditions.push({
            key,
            match: { value: val as string | number | boolean },
          });
          break;
        case "$ne":
          // $ne is handled via must_not, but here we return it as a condition
          // The caller should handle must_not logic
          conditions.push({
            key,
            match: { except: [val as string | number] },
          });
          break;
        case "$gt":
          conditions.push({
            key,
            range: { gt: val as number },
          });
          break;
        case "$gte":
          conditions.push({
            key,
            range: { gte: val as number },
          });
          break;
        case "$lt":
          conditions.push({
            key,
            range: { lt: val as number },
          });
          break;
        case "$lte":
          conditions.push({
            key,
            range: { lte: val as number },
          });
          break;
        case "$in":
          if (Array.isArray(val)) {
            conditions.push({
              key,
              match: { any: val as (string | number)[] },
            });
          }
          break;
        case "$nin":
          if (Array.isArray(val)) {
            conditions.push({
              key,
              match: { except: val as (string | number)[] },
            });
          }
          break;
        case "$exists":
          if (val) {
            // Field should exist (not be null)
            conditions.push({
              is_null: { key },
            });
            // Note: This will be negated in must_not by the caller
          } else {
            // Field should not exist (be null)
            conditions.push({
              is_null: { key },
            });
          }
          break;
        case "$contains":
          conditions.push({
            key,
            match: { text: val as string },
          });
          break;
        case "$startsWith":
          // Qdrant text match with prefix
          conditions.push({
            key,
            match: { text: `${val}` },
          });
          break;
        case "$endsWith":
          // Qdrant text match with suffix
          conditions.push({
            key,
            match: { text: `${val}` },
          });
          break;
        default:
          // Unknown operator, treat as equality
          conditions.push({
            key,
            match: { value: val as string | number | boolean },
          });
      }
    }

    return conditions;
  }

  /**
   * Build quantization configuration
   */
  private buildQuantizationConfig(quantization: QdrantQuantization): QuantizationConfig {
    const config: QuantizationConfig = {};

    switch (quantization.type) {
      case "scalar":
        config.scalar = {
          type: quantization.scalar?.dataType || "int8",
          quantile: quantization.scalar?.quantile,
          always_ram: quantization.scalar?.alwaysRam,
        };
        break;
      case "binary":
        config.binary = {
          always_ram: quantization.binary?.alwaysRam,
        };
        break;
      case "product":
        config.product = {
          compression: quantization.product?.compression || "x8",
          always_ram: quantization.product?.alwaysRam,
        };
        break;
    }

    return config;
  }
}
