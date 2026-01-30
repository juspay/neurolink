/**
 * Redis Vector Store Adapter
 * Implements vector similarity search using Redis with RediSearch module
 *
 * Redis Stack provides vector similarity search through the RediSearch module
 * with support for FLAT (brute force) and HNSW (approximate) index algorithms.
 *
 * Features:
 * - FLAT index: Exact KNN search, higher accuracy, slower for large datasets
 * - HNSW index: Approximate search, faster for large datasets
 * - Hybrid queries combining vector similarity with metadata filters
 * - Support for cosine, euclidean (L2), and inner product (IP) distance metrics
 *
 * @see https://redis.io/docs/interact/search-and-query/search/vectors/
 */

import type { UnknownRecord } from "../../types/common.js";
import { logger } from "../../utils/logger.js";
import { BaseVectorStore } from "../BaseVectorStore.js";
import type {
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
  VectorStoreConfig,
  VectorStoreName,
} from "../types.js";

/**
 * Redis Vector Store configuration
 */
export type RedisVectorConfig = VectorStoreConfig & {
  /** Redis connection URL (e.g., redis://localhost:6379) */
  url?: string;
  /** Redis host (alternative to url) */
  host?: string;
  /** Redis port (default: 6379) */
  port?: number;
  /** Redis password */
  password?: string;
  /** Redis database number (default: 0) */
  database?: number;
  /** Key prefix for all vector data (default: "neurolink:vector:") */
  keyPrefix?: string;
  /** Connection timeout in ms (default: 10000) */
  connectionTimeout?: number;
  /** Command timeout in ms (default: 5000) */
  commandTimeout?: number;
  /** Enable TLS */
  tls?: boolean;
  /** TLS options */
  tlsOptions?: {
    rejectUnauthorized?: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };
  /** Cluster mode configuration */
  cluster?: {
    enabled: boolean;
    nodes?: Array<{ host: string; port: number }>;
  };
};

/**
 * Redis index algorithm type
 */
export type RedisIndexAlgorithm = "FLAT" | "HNSW";

/**
 * Redis-specific index configuration
 */
export type RedisIndexOptions = {
  /** Index algorithm (default: HNSW) */
  algorithm?: RedisIndexAlgorithm;
  /** HNSW specific options */
  hnsw?: {
    /** Number of maximum allowed outgoing edges (default: 16) */
    M?: number;
    /** Number of maximum allowed connections during construction (default: 200) */
    efConstruction?: number;
    /** Runtime parameter for query time accuracy/speed tradeoff (default: 10) */
    efRuntime?: number;
    /** Epsilon for distance calculation (default: 0.01) */
    epsilon?: number;
  };
  /** FLAT specific options */
  flat?: {
    /** Initial capacity (number of vectors to be indexed) */
    initialCapacity?: number;
    /** Block size for memory allocation */
    blockSize?: number;
  };
};

/**
 * Internal type for Redis client interface
 * Compatible with both 'redis' and 'ioredis' packages
 */
interface RedisClientInterface {
  connect?(): Promise<void>;
  quit(): Promise<unknown>;
  ping(): Promise<string>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<string | null>;
  del(...keys: string[]): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  hSet(key: string, field: string, value: string | Buffer): Promise<number>;
  hSet(key: string, fields: Record<string, string | Buffer>): Promise<number>;
  hGet(key: string, field: string): Promise<string | null>;
  hGetAll(key: string): Promise<Record<string, string>>;
  hDel(key: string, ...fields: string[]): Promise<number>;
  sendCommand(args: string[]): Promise<unknown>;
  isOpen?: boolean;
  status?: string;
}

/**
 * Index metadata stored in Redis
 */
interface RedisIndexMetadata {
  name: string;
  dimension: number;
  metric: SimilarityMetric;
  algorithm: RedisIndexAlgorithm;
  createdAt: string;
  vectorCount?: number;
}

/**
 * Redis Vector Store Adapter
 *
 * Implements vector similarity search using RediSearch module commands:
 * - FT.CREATE: Create a search index with vector field
 * - FT.SEARCH: Query vectors with KNN and hybrid filtering
 * - FT.INFO: Get index information
 * - FT.DROPINDEX: Delete an index
 *
 * Note: Requires Redis Stack or Redis with RediSearch module loaded.
 * Install Redis Stack: https://redis.io/docs/getting-started/install-stack/
 */
export class RedisVectorAdapter extends BaseVectorStore<RedisVectorConfig> {
  private client: RedisClientInterface | null = null;
  private indexMetadataCache: Map<string, RedisIndexMetadata> = new Map();
  private readonly keyPrefix: string;

  constructor(config: RedisVectorConfig) {
    super(config, "redis" as VectorStoreName);
    this.keyPrefix = config.keyPrefix || "neurolink:vector:";
  }

  /**
   * Initialize connection to Redis
   */
  async connect(): Promise<void> {
    if (this.initialized) {
      logger.debug("Redis Vector Store already connected");
      return;
    }

    try {
      // Dynamically import redis client
      const redisClient = await this.loadRedisDriver();

      // Build connection options
      const connectionOptions = this.buildConnectionOptions();

      // Create and connect client
      this.client = redisClient.createClient(connectionOptions) as RedisClientInterface;

      // Handle connection events
      if (this.client.connect) {
        await this.client.connect();
      }

      // Verify connection with ping
      await this.client.ping();

      // Verify RediSearch module is loaded
      await this.verifyRedisSearch();

      // Load existing index metadata
      await this.loadIndexMetadata();

      this.initialized = true;
      logger.debug("Redis Vector Store connected successfully", {
        url: this.config.url || `${this.config.host}:${this.config.port}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to Redis Vector Store: ${message}`);
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
        this.client = null;
        this.initialized = false;
        this.indexMetadataCache.clear();
        logger.debug("Redis Vector Store disconnected");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to disconnect from Redis: ${message}`);
      }
    }
  }

  /**
   * Create a new vector index using FT.CREATE
   */
  async createIndex(config: VectorIndexConfig): Promise<void> {
    this.ensureInitialized();

    const { name, dimension, metric = "cosine", config: indexConfig } = config;
    const redisOptions = (indexConfig as RedisIndexOptions) || {};
    const algorithm = redisOptions.algorithm || "HNSW";
    const indexName = this.getIndexName(name);
    const keyPattern = this.getKeyPattern(name);

    try {
      // Build FT.CREATE command
      const distanceMetric = this.mapMetricToRedis(metric);
      const createArgs = [
        "FT.CREATE",
        indexName,
        "ON",
        "HASH",
        "PREFIX",
        "1",
        keyPattern,
        "SCHEMA",
        // Vector field
        "vector",
        "VECTOR",
        algorithm,
        // Algorithm-specific parameters
        ...this.buildAlgorithmParams(algorithm, dimension, distanceMetric, redisOptions),
        // Metadata fields for filtering
        "id",
        "TAG",
        "SORTABLE",
        "content",
        "TEXT",
        "namespace",
        "TAG",
        "SORTABLE",
        "metadata",
        "TEXT",
        "createdAt",
        "NUMERIC",
        "SORTABLE",
      ];

      await this.client!.sendCommand(createArgs);

      // Store index metadata
      const metadata: RedisIndexMetadata = {
        name,
        dimension,
        metric,
        algorithm,
        createdAt: new Date().toISOString(),
      };

      await this.saveIndexMetadata(name, metadata);
      this.indexMetadataCache.set(name, metadata);

      logger.debug(`Created Redis vector index ${name}`, {
        dimension,
        metric,
        algorithm,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Check if index already exists
      if (message.includes("Index already exists")) {
        logger.debug(`Index ${name} already exists`);
        return;
      }
      throw new Error(`Failed to create index ${name}: ${message}`);
    }
  }

  /**
   * Delete an index using FT.DROPINDEX
   */
  async deleteIndex(indexName: string): Promise<void> {
    this.ensureInitialized();

    const redisIndexName = this.getIndexName(indexName);

    try {
      // Drop the index (DD flag also deletes the associated documents)
      await this.client!.sendCommand(["FT.DROPINDEX", redisIndexName, "DD"]);

      // Remove metadata
      await this.deleteIndexMetadata(indexName);
      this.indexMetadataCache.delete(indexName);

      logger.debug(`Deleted Redis vector index ${indexName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Ignore if index doesn't exist
      if (message.includes("Unknown Index name")) {
        logger.debug(`Index ${indexName} does not exist`);
        return;
      }
      throw new Error(`Failed to delete index ${indexName}: ${message}`);
    }
  }

  /**
   * List all vector indexes
   */
  async listIndexes(): Promise<string[]> {
    this.ensureInitialized();

    try {
      // Get all FT indexes
      const result = (await this.client!.sendCommand(["FT._LIST"])) as string[];

      // Filter to only our indexes and strip prefix
      const prefix = this.getIndexName("");
      return result
        .filter((name) => name.startsWith(prefix))
        .map((name) => name.slice(prefix.length));
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
      const redisIndexName = this.getIndexName(indexName);
      await this.client!.sendCommand(["FT.INFO", redisIndexName]);
      return true;
    } catch {
      return false;
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

    const namespace = options?.namespace || "";

    // Validate dimensions
    if (records.length > 0) {
      const meta = this.indexMetadataCache.get(indexName);
      if (meta) {
        this.validateDimensions(
          records.map((r) => r.vector),
          meta.dimension,
        );
      } else {
        this.validateDimensions(records.map((r) => r.vector));
      }
    }

    try {
      let upsertedCount = 0;

      for (const record of records) {
        const key = this.getRecordKey(indexName, record.id);

        // Convert vector to bytes (FLOAT32)
        const vectorBytes = this.vectorToBuffer(record.vector);

        // Build fields for HSET
        const fields: Record<string, string | Buffer> = {
          id: record.id,
          vector: vectorBytes,
          namespace: record.namespace || namespace,
          createdAt: Date.now().toString(),
        };

        if (record.content) {
          fields.content = record.content;
        }

        if (record.metadata) {
          fields.metadata = JSON.stringify(record.metadata);
        }

        // Use HSET to store the vector and metadata
        await this.client!.hSet(key, fields);
        upsertedCount++;
      }

      logger.debug(`Upserted ${upsertedCount} records to ${indexName}`);
      return { upsertedCount };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to upsert records: ${message}`);
    }
  }

  /**
   * Query vectors by similarity using FT.SEARCH with KNN
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

    const redisIndexName = this.getIndexName(indexName);

    try {
      // Build the query string
      const queryParts: string[] = [];

      // Add namespace filter if specified
      if (namespace) {
        queryParts.push(`@namespace:{${this.escapeTagValue(namespace)}}`);
      }

      // Add metadata filter if specified
      if (filter) {
        const filterQuery = this.translateFilter(filter);
        if (filterQuery && filterQuery !== "*") {
          queryParts.push(filterQuery);
        }
      }

      // Build the base query
      let queryString: string;
      if (queryParts.length > 0) {
        // Hybrid query: filter + KNN
        queryString = `(${queryParts.join(" ")})=>[KNN ${topK} @vector $BLOB AS score]`;
      } else {
        // Pure KNN query
        queryString = `*=>[KNN ${topK} @vector $BLOB AS score]`;
      }

      // Convert vector to buffer for query
      const vectorBytes = this.vectorToBuffer(vector);

      // Build FT.SEARCH command
      const searchArgs = [
        "FT.SEARCH",
        redisIndexName,
        queryString,
        "PARAMS",
        "2",
        "BLOB",
        vectorBytes.toString("binary"),
        "SORTBY",
        "score",
        "DIALECT",
        "2",
      ];

      // Add return fields
      const returnFields = ["id", "score", "content", "namespace"];
      if (includeMetadata) {
        returnFields.push("metadata");
      }
      if (includeVectors) {
        returnFields.push("vector");
      }
      searchArgs.push("RETURN", returnFields.length.toString(), ...returnFields);

      // Execute search
      const result = (await this.client!.sendCommand(searchArgs)) as unknown[];

      // Parse results
      return this.parseSearchResults<TMetadata>(
        result,
        minScore,
        includeVectors,
        includeMetadata,
      );
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

    try {
      let deletedCount = 0;

      if (deleteAll) {
        // Delete all records in the index
        const pattern = this.getRecordKey(indexName, "*");
        const keys = await this.client!.keys(pattern);

        if (namespace) {
          // Filter by namespace
          for (const key of keys) {
            const recordNs = await this.client!.hGet(key, "namespace");
            if (recordNs === namespace) {
              await this.client!.del(key);
              deletedCount++;
            }
          }
        } else {
          // Delete all
          if (keys.length > 0) {
            deletedCount = await this.client!.del(...keys);
          }
        }
      } else if (ids && ids.length > 0) {
        // Delete by IDs
        const keys = ids.map((id) => this.getRecordKey(indexName, id));
        deletedCount = await this.client!.del(...keys);
      } else if (filter) {
        // Delete by filter - need to search first then delete
        const redisIndexName = this.getIndexName(indexName);
        const filterQuery = this.translateFilter(filter);

        // Search for matching documents
        const searchResult = (await this.client!.sendCommand([
          "FT.SEARCH",
          redisIndexName,
          filterQuery || "*",
          "NOCONTENT",
          "LIMIT",
          "0",
          "10000", // Reasonable limit
        ])) as unknown[];

        // First element is count, rest are document keys
        if (Array.isArray(searchResult) && searchResult.length > 1) {
          const keysToDelete = searchResult.slice(1) as string[];
          if (keysToDelete.length > 0) {
            deletedCount = await this.client!.del(...keysToDelete);
          }
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
   * Get index statistics using FT.INFO
   */
  async getStats(indexName: string): Promise<VectorStoreStats> {
    this.ensureInitialized();

    const redisIndexName = this.getIndexName(indexName);

    try {
      const info = (await this.client!.sendCommand([
        "FT.INFO",
        redisIndexName,
      ])) as unknown[];

      // Parse FT.INFO response (alternating key-value pairs)
      const infoMap = this.parseInfoResponse(info);

      const meta = this.indexMetadataCache.get(indexName);

      // Count namespaces by scanning keys (may be slow for large datasets)
      let namespaceCount = 0;
      try {
        const pattern = this.getRecordKey(indexName, "*");
        const keys = await this.client!.keys(pattern);
        const namespaces = new Set<string>();
        for (const key of keys.slice(0, 1000)) {
          // Sample first 1000
          const ns = await this.client!.hGet(key, "namespace");
          if (ns) namespaces.add(ns);
        }
        namespaceCount = namespaces.size;
      } catch {
        // Ignore namespace counting errors
      }

      return {
        vectorCount: parseInt(infoMap.num_docs || "0", 10),
        indexSize: parseInt(infoMap.inverted_sz_mb || "0", 10) * 1024 * 1024,
        dimension: meta?.dimension,
        namespaceCount,
        metrics: {
          metric: meta?.metric || "cosine",
          algorithm: meta?.algorithm || "HNSW",
          indexing: infoMap.indexing === "1",
          numRecords: parseInt(infoMap.num_records || "0", 10),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get stats for ${indexName}: ${message}`);
    }
  }

  /**
   * Translate abstract filter to Redis query format
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
        conditions.push(`(${subConditions.join(" ")})`);
      } else if (key === "$or" && Array.isArray(value)) {
        const subConditions = value.map((f) =>
          this.translateFilter(f as MetadataFilter),
        );
        conditions.push(`(${subConditions.join(" | ")})`);
      } else if (
        key === "$not" &&
        typeof value === "object" &&
        value !== null
      ) {
        const subQuery = this.translateFilter(value as MetadataFilter);
        conditions.push(`-${subQuery}`);
      } else if (this.isFieldFilter(value)) {
        const fieldQuery = this.translateFieldFilter(
          key,
          value as unknown as FieldFilter,
        );
        if (fieldQuery) {
          conditions.push(fieldQuery);
        }
      } else {
        // Simple equality - use TAG for exact match
        conditions.push(`@${key}:{${this.escapeTagValue(String(value))}}`);
      }
    }

    return conditions.length > 0 ? conditions.join(" ") : "*";
  }

  // ===================
  // PRIVATE HELPER METHODS
  // ===================

  /**
   * Load Redis driver dynamically
   */
  private async loadRedisDriver(): Promise<{
    createClient: (options: unknown) => RedisClientInterface;
  }> {
    try {
      // Try to load the 'redis' package first
      const modulePath = "redis";
      const module = await import(/* @vite-ignore */ modulePath);
      return module;
    } catch {
      try {
        // Fall back to 'ioredis'
        const modulePath = "ioredis";
        const ioredis = await import(/* @vite-ignore */ modulePath);
        return {
          createClient: (options: unknown) => {
            const opts = options as Record<string, unknown>;
            const socket = opts.socket as Record<string, unknown> | undefined;
            return new ioredis.default({
              host: (socket?.host as string | undefined) || (opts.host as string | undefined),
              port: (socket?.port as number | undefined) || (opts.port as number | undefined),
              password: opts.password as string | undefined,
              db: opts.database as number | undefined,
              lazyConnect: true,
            } as unknown) as unknown as RedisClientInterface;
          },
        };
      } catch {
        throw new Error(
          "Redis driver not found. Install redis or ioredis: npm install redis",
        );
      }
    }
  }

  /**
   * Build connection options for Redis client
   */
  private buildConnectionOptions(): Record<string, unknown> {
    const options: Record<string, unknown> = {};

    if (this.config.url) {
      options.url = this.config.url;
    } else {
      options.socket = {
        host: this.config.host || "localhost",
        port: this.config.port || 6379,
        connectTimeout: this.config.connectionTimeout || 10000,
      };
    }

    if (this.config.password) {
      options.password = this.config.password;
    }

    if (this.config.database !== undefined) {
      options.database = this.config.database;
    }

    if (this.config.tls && this.config.tlsOptions) {
      options.socket = {
        ...(options.socket as Record<string, unknown>),
        tls: true,
        ...this.config.tlsOptions,
      };
    }

    if (this.config.commandTimeout) {
      options.commandsQueueMaxLength = this.config.commandTimeout;
    }

    return options;
  }

  /**
   * Verify RediSearch module is available
   */
  private async verifyRedisSearch(): Promise<void> {
    try {
      // Try to list indexes - will fail if RediSearch not loaded
      await this.client!.sendCommand(["FT._LIST"]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        message.includes("unknown command") ||
        message.includes("ERR unknown")
      ) {
        throw new Error(
          "RediSearch module not loaded. Please install Redis Stack or load the RediSearch module.",
        );
      }
      throw error;
    }
  }

  /**
   * Load existing index metadata from Redis
   */
  private async loadIndexMetadata(): Promise<void> {
    try {
      const metadataKey = `${this.keyPrefix}:_metadata`;
      const data = await this.client!.hGetAll(metadataKey);

      for (const [name, json] of Object.entries(data)) {
        try {
          const metadata = JSON.parse(json) as RedisIndexMetadata;
          this.indexMetadataCache.set(name, metadata);
        } catch {
          // Ignore invalid metadata
        }
      }
    } catch {
      // Ignore errors loading metadata
    }
  }

  /**
   * Save index metadata to Redis
   */
  private async saveIndexMetadata(
    name: string,
    metadata: RedisIndexMetadata,
  ): Promise<void> {
    try {
      const metadataKey = `${this.keyPrefix}:_metadata`;
      await this.client!.hSet(metadataKey, name, JSON.stringify(metadata));
    } catch {
      // Ignore errors saving metadata
    }
  }

  /**
   * Delete index metadata from Redis
   */
  private async deleteIndexMetadata(name: string): Promise<void> {
    try {
      const metadataKey = `${this.keyPrefix}:_metadata`;
      await this.client!.hDel(metadataKey, name);
    } catch {
      // Ignore errors deleting metadata
    }
  }

  /**
   * Get the full Redis index name
   */
  private getIndexName(name: string): string {
    return `${this.keyPrefix}idx:${name}`;
  }

  /**
   * Get the key pattern for an index's documents
   */
  private getKeyPattern(indexName: string): string {
    return `${this.keyPrefix}doc:${indexName}:`;
  }

  /**
   * Get the full Redis key for a record
   */
  private getRecordKey(indexName: string, recordId: string): string {
    return `${this.keyPrefix}doc:${indexName}:${recordId}`;
  }

  /**
   * Map NeuroLink similarity metric to Redis distance metric
   */
  private mapMetricToRedis(
    metric: SimilarityMetric,
  ): "COSINE" | "L2" | "IP" {
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
   * Build algorithm-specific parameters for FT.CREATE
   */
  private buildAlgorithmParams(
    algorithm: RedisIndexAlgorithm,
    dimension: number,
    metric: "COSINE" | "L2" | "IP",
    options: RedisIndexOptions,
  ): string[] {
    const params: string[] = [];

    if (algorithm === "HNSW") {
      const hnsw = options.hnsw || {};
      params.push(
        "6", // Number of following params (DIM, DISTANCE_METRIC, TYPE, plus optional)
        "TYPE",
        "FLOAT32",
        "DIM",
        dimension.toString(),
        "DISTANCE_METRIC",
        metric,
      );

      // Add optional HNSW params
      if (hnsw.M !== undefined) {
        params.push("M", hnsw.M.toString());
      }
      if (hnsw.efConstruction !== undefined) {
        params.push("EF_CONSTRUCTION", hnsw.efConstruction.toString());
      }
      if (hnsw.efRuntime !== undefined) {
        params.push("EF_RUNTIME", hnsw.efRuntime.toString());
      }

      // Update param count (first element)
      params[0] = (6 + (params.length - 7)).toString();
    } else {
      // FLAT algorithm
      const flat = options.flat || {};
      params.push(
        "6", // Number of following params
        "TYPE",
        "FLOAT32",
        "DIM",
        dimension.toString(),
        "DISTANCE_METRIC",
        metric,
      );

      if (flat.initialCapacity !== undefined) {
        params.push("INITIAL_CAP", flat.initialCapacity.toString());
        params[0] = "8";
      }
      if (flat.blockSize !== undefined) {
        params.push("BLOCK_SIZE", flat.blockSize.toString());
        params[0] = (parseInt(params[0], 10) + 2).toString();
      }
    }

    return params;
  }

  /**
   * Convert vector array to FLOAT32 buffer
   */
  private vectorToBuffer(vector: number[]): Buffer {
    const buffer = Buffer.alloc(vector.length * 4);
    for (let i = 0; i < vector.length; i++) {
      buffer.writeFloatLE(vector[i], i * 4);
    }
    return buffer;
  }

  /**
   * Convert FLOAT32 buffer to vector array
   */
  private bufferToVector(buffer: Buffer | string): number[] {
    const buf =
      typeof buffer === "string" ? Buffer.from(buffer, "binary") : buffer;
    const vector: number[] = [];
    for (let i = 0; i < buf.length; i += 4) {
      vector.push(buf.readFloatLE(i));
    }
    return vector;
  }

  /**
   * Escape special characters in TAG values
   */
  private escapeTagValue(value: string): string {
    // Escape special characters for Redis TAG queries
    return value
      .replace(/[,.<>{}[\]"':;!@#$%^&*()\-+=~`\\|/]/g, "\\$&")
      .replace(/\s+/g, "\\ ");
  }

  /**
   * Parse FT.SEARCH results
   */
  private parseSearchResults<TMetadata extends UnknownRecord>(
    result: unknown[],
    minScore: number | undefined,
    includeVectors: boolean,
    includeMetadata: boolean,
  ): VectorQueryResult<TMetadata>[] {
    const results: VectorQueryResult<TMetadata>[] = [];

    if (!Array.isArray(result) || result.length < 1) {
      return results;
    }

    // First element is total count
    // Subsequent elements are [key, fields, key, fields, ...]
    for (let i = 1; i < result.length; i += 2) {
      const _key = result[i] as string;
      const fields = result[i + 1] as unknown[];

      if (!Array.isArray(fields)) continue;

      // Parse field pairs
      const fieldMap: Record<string, string> = {};
      for (let j = 0; j < fields.length; j += 2) {
        const fieldName = fields[j] as string;
        const fieldValue = fields[j + 1] as string;
        fieldMap[fieldName] = fieldValue;
      }

      // Get score and convert (Redis returns distance, lower is better)
      const distance = parseFloat(fieldMap.score || "0");
      // For cosine and IP, convert distance to similarity (1 - distance for cosine)
      const score = 1 - distance;

      // Apply minimum score filter
      if (minScore !== undefined && score < minScore) {
        continue;
      }

      const queryResult: VectorQueryResult<TMetadata> = {
        id: fieldMap.id || "",
        score,
        content: fieldMap.content || undefined,
      };

      if (includeVectors && fieldMap.vector) {
        queryResult.vector = this.bufferToVector(fieldMap.vector);
      }

      if (includeMetadata && fieldMap.metadata) {
        try {
          queryResult.metadata = JSON.parse(fieldMap.metadata) as TMetadata;
        } catch {
          // Ignore parse errors
        }
      }

      results.push(queryResult);
    }

    return results;
  }

  /**
   * Parse FT.INFO response to map
   */
  private parseInfoResponse(info: unknown[]): Record<string, string> {
    const map: Record<string, string> = {};
    for (let i = 0; i < info.length; i += 2) {
      const key = String(info[i]);
      const value = info[i + 1];
      map[key] = typeof value === "object" ? JSON.stringify(value) : String(value);
    }
    return map;
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
   * Translate a field filter to Redis query syntax
   */
  private translateFieldFilter(key: string, filter: FieldFilter): string {
    const conditions: string[] = [];

    for (const [op, val] of Object.entries(filter)) {
      switch (op) {
        case "$eq":
          conditions.push(`@${key}:{${this.escapeTagValue(String(val))}}`);
          break;
        case "$ne":
          conditions.push(`-@${key}:{${this.escapeTagValue(String(val))}}`);
          break;
        case "$gt":
          conditions.push(`@${key}:[(${val} +inf]`);
          break;
        case "$gte":
          conditions.push(`@${key}:[${val} +inf]`);
          break;
        case "$lt":
          conditions.push(`@${key}:[-inf (${val}]`);
          break;
        case "$lte":
          conditions.push(`@${key}:[-inf ${val}]`);
          break;
        case "$in":
          if (Array.isArray(val)) {
            const values = val.map((v) => this.escapeTagValue(String(v)));
            conditions.push(`@${key}:{${values.join("|")}}`);
          }
          break;
        case "$nin":
          if (Array.isArray(val)) {
            const values = val.map((v) => this.escapeTagValue(String(v)));
            conditions.push(`-@${key}:{${values.join("|")}}`);
          }
          break;
        case "$exists":
          if (val) {
            conditions.push(`@${key}:*`);
          } else {
            conditions.push(`-@${key}:*`);
          }
          break;
        case "$contains":
          conditions.push(`@${key}:*${this.escapeTagValue(String(val))}*`);
          break;
        case "$startsWith":
          conditions.push(`@${key}:${this.escapeTagValue(String(val))}*`);
          break;
        case "$endsWith":
          conditions.push(`@${key}:*${this.escapeTagValue(String(val))}`);
          break;
        default:
          // Unknown operator, treat as equality
          conditions.push(`@${key}:{${this.escapeTagValue(String(val))}}`);
      }
    }

    return conditions.join(" ");
  }
}
