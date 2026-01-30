/**
 * Vector Store Types for NeuroLink
 * Based on Mastra patterns with NeuroLink conventions
 */

import type { JsonValue, UnknownRecord } from "../types/common.js";

/**
 * Vector store provider names
 */
export enum VectorStoreName {
  PINECONE = "pinecone",
  QDRANT = "qdrant",
  CHROMA = "chroma",
  PGVECTOR = "pgvector",
  MONGODB = "mongodb",
  ELASTICSEARCH = "elasticsearch",
  OPENSEARCH = "opensearch",
  WEAVIATE = "weaviate",
  LANCE = "lance",
  DUCKDB = "duckdb",
  CLOUDFLARE = "cloudflare",
  UPSTASH = "upstash",
  ASTRA = "astra",
  COUCHBASE = "couchbase",
  LIBSQL = "libsql",
  SQLITE_VSS = "sqlite-vss",
  REDIS = "redis",
  MILVUS = "milvus",
  ZILLIZ = "zilliz",
  AZURE_AI_SEARCH = "azure-ai-search",
  VERTEX_VECTOR = "vertex-vector",
  AWS_OPENSEARCH = "aws-opensearch",
  VESPA = "vespa",
  MARQO = "marqo",
  FAISS = "faiss",
}

/**
 * Similarity metrics for vector search
 */
export type SimilarityMetric = "cosine" | "euclidean" | "dotProduct";

/**
 * Vector record with metadata
 */
export type VectorRecord<TMetadata extends UnknownRecord = UnknownRecord> = {
  /** Unique identifier for the vector */
  id: string;
  /** The embedding vector (array of numbers) */
  vector: number[];
  /** Optional metadata associated with the vector */
  metadata?: TMetadata;
  /** Optional text content that was embedded */
  content?: string;
  /** Optional namespace/collection for organization */
  namespace?: string;
};

/**
 * Query result from vector search
 */
export type VectorQueryResult<TMetadata extends UnknownRecord = UnknownRecord> =
  {
    /** Unique identifier */
    id: string;
    /** Similarity score (higher = more similar for cosine/dotProduct) */
    score: number;
    /** Original vector (if requested) */
    vector?: number[];
    /** Associated metadata */
    metadata?: TMetadata;
    /** Original content (if stored) */
    content?: string;
  };

/**
 * Index configuration for vector stores
 */
export type VectorIndexConfig = {
  /** Index/collection name */
  name: string;
  /** Vector dimension (e.g., 1536 for OpenAI ada-002) */
  dimension: number;
  /** Similarity metric */
  metric?: SimilarityMetric;
  /** Provider-specific configuration */
  config?: UnknownRecord;
};

/**
 * Query options for vector search
 */
export type VectorQueryOptions<
  TMetadata extends UnknownRecord = UnknownRecord,
> = {
  /** Query vector */
  vector: number[];
  /** Number of results to return */
  topK: number;
  /** Minimum similarity score threshold */
  minScore?: number;
  /** Metadata filter */
  filter?: MetadataFilter<TMetadata>;
  /** Include vectors in results */
  includeVectors?: boolean;
  /** Include metadata in results */
  includeMetadata?: boolean;
  /** Namespace to search within */
  namespace?: string;
};

/**
 * Upsert options
 */
export type VectorUpsertOptions = {
  /** Namespace for the vectors */
  namespace?: string;
  /** Batch size for large upserts */
  batchSize?: number;
};

/**
 * Delete options
 */
export type VectorDeleteOptions = {
  /** IDs to delete */
  ids?: string[];
  /** Filter to match records for deletion */
  filter?: MetadataFilter;
  /** Namespace to delete from */
  namespace?: string;
  /** Delete all records (use with caution) */
  deleteAll?: boolean;
};

/**
 * Vector store statistics
 */
export type VectorStoreStats = {
  /** Total number of vectors */
  vectorCount: number;
  /** Index size in bytes (if available) */
  indexSize?: number;
  /** Dimension of vectors */
  dimension?: number;
  /** Number of namespaces */
  namespaceCount?: number;
  /** Provider-specific metrics */
  metrics?: UnknownRecord;
};

/**
 * Vector store health status
 */
export type VectorStoreHealth = {
  /** Whether the store is healthy */
  healthy: boolean;
  /** Store status */
  status: "connected" | "disconnected" | "degraded" | "error";
  /** Response time in ms */
  latencyMs?: number;
  /** Error message if unhealthy */
  error?: string;
  /** Last health check timestamp */
  lastChecked: Date;
};

/**
 * Comparison operators for metadata filtering
 */
export type ComparisonOperator =
  | "$eq" // Equal
  | "$ne" // Not equal
  | "$gt" // Greater than
  | "$gte" // Greater than or equal
  | "$lt" // Less than
  | "$lte" // Less than or equal
  | "$in" // In array
  | "$nin" // Not in array
  | "$exists" // Field exists
  | "$contains" // String contains
  | "$startsWith" // String starts with
  | "$endsWith"; // String ends with

/**
 * Logical operators for combining filters
 */
export type LogicalOperator = "$and" | "$or" | "$not";

/**
 * Field-level filter condition
 */
export type FieldFilter = {
  [K in ComparisonOperator]?: JsonValue;
};

/**
 * Metadata filter for vector queries
 * Supports nested conditions and logical operators
 */
export type MetadataFilter<TMetadata extends UnknownRecord = UnknownRecord> = {
  [K in keyof TMetadata]?: TMetadata[K] | FieldFilter;
} & {
  $and?: MetadataFilter<TMetadata>[];
  $or?: MetadataFilter<TMetadata>[];
  $not?: MetadataFilter<TMetadata>;
};

/**
 * Configuration for vector store instances
 */
export type VectorStoreConfig = {
  /** Store name for identification */
  name?: string;
  /** Connection timeout in ms */
  timeout?: number;
  /** Maximum retries for operations */
  maxRetries?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Provider-specific configuration */
  [key: string]: unknown;
};

/**
 * SQLite-VSS specific configuration
 */
export type SQLiteVSSConfig = VectorStoreConfig & {
  /** Path to SQLite database file */
  databasePath: string;
  /** Use in-memory database (overrides databasePath) */
  inMemory?: boolean;
  /** Connection timeout in ms (default: 30000) */
  connectionTimeout?: number;
  /** Use WAL mode for better concurrency (default: true) */
  walMode?: boolean;
  /** Enable foreign keys (default: false) */
  foreignKeys?: boolean;
  /** Busy timeout in ms (default: 5000) */
  busyTimeout?: number;
};

/**
 * LibSQL/Turso specific configuration
 * LibSQL is a SQLite fork with native vector support
 * Supports local, remote (Turso cloud), and embedded-replica modes
 */
export type LibSQLConfig = VectorStoreConfig & {
  /**
   * Connection mode:
   * - local: Local file-based database
   * - remote: Turso cloud connection (requires url + authToken)
   * - replica: Embedded replica (local + sync to Turso)
   */
  mode: "local" | "remote" | "replica";
  /** Database file path for local/replica mode */
  databasePath?: string;
  /** Turso database URL for remote/replica mode (e.g., "libsql://your-db.turso.io") */
  url?: string;
  /** Turso auth token for remote/replica mode */
  authToken?: string;
  /** Sync interval in ms for replica mode (default: 60000) */
  syncInterval?: number;
  /** Encryption key for local database (optional) */
  encryptionKey?: string;
};

/**
 * DuckDB specific configuration
 */
export type DuckDBConfig = VectorStoreConfig & {
  /** Path to DuckDB database file */
  databasePath: string;
  /** Use in-memory database (overrides databasePath) */
  inMemory?: boolean;
  /** Connection timeout in ms (default: 30000) */
  connectionTimeout?: number;
  /** Read-only mode (default: false) */
  readOnly?: boolean;
  /** Number of threads for parallel execution (default: auto) */
  threads?: number;
  /** Memory limit (e.g., "4GB") */
  memoryLimit?: string;
};

/**
 * LanceDB specific configuration
 * Supports both local file storage and cloud storage (S3, Azure, GCS)
 */
export type LanceDBConfig = VectorStoreConfig & {
  /**
   * Database URI - can be local path or cloud storage URL
   * Examples:
   * - Local: "/path/to/lancedb" or "./data/lancedb"
   * - S3: "s3://bucket-name/path"
   * - S3 with DynamoDB (concurrent writes): "s3+ddb://bucket/path?ddbTableName=my-table"
   * - Azure: "az://container/path"
   * - GCS: "gs://bucket/path"
   */
  uri: string;
  /**
   * Storage options for cloud providers
   * For S3: awsAccessKeyId, awsSecretAccessKey, awsSessionToken, region, endpoint
   * For Azure: azureStorageAccountName, azureStorageAccountKey
   * For GCS: serviceAccountKey
   */
  storageOptions?: {
    /** AWS access key ID for S3 */
    awsAccessKeyId?: string;
    /** AWS secret access key for S3 */
    awsSecretAccessKey?: string;
    /** AWS session token for S3 */
    awsSessionToken?: string;
    /** AWS region for S3 */
    region?: string;
    /** Custom endpoint for S3-compatible storage */
    endpoint?: string;
    /** Azure storage account name */
    azureStorageAccountName?: string;
    /** Azure storage account key */
    azureStorageAccountKey?: string;
    /** GCS service account key (JSON string) */
    serviceAccountKey?: string;
    /** Additional provider-specific options */
    [key: string]: string | undefined;
  };
  /** Read consistency level - use "strong" for read-after-write consistency */
  readConsistency?: "eventual" | "strong";
  /** Connection timeout in ms (default: 30000) */
  connectionTimeout?: number;
};

/**
 * Redis Vector Store configuration
 * Uses RediSearch module for vector similarity search
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
 * Redis-specific index configuration options
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
 * Faiss-specific configuration
 * Facebook AI Similarity Search for high-performance local vector search
 */
export type FaissConfig = VectorStoreConfig & {
  /** Directory for index persistence (default: "./faiss-data") */
  indexPath?: string;
  /** Index type (default: "flat") */
  indexType?: "flat" | "ivf" | "hnsw" | "ivf-pq";
  /** Number of clusters for IVF indexes (default: 100) */
  nlist?: number;
  /** Number of clusters to search for IVF (default: 10) */
  nprobe?: number;
  /** HNSW build parameter - max number of connections per layer */
  efConstruction?: number;
  /** HNSW search parameter - size of dynamic candidate list */
  efSearch?: number;
  /** Enable GPU if available (requires faiss-gpu) */
  useGpu?: boolean;
  /** Distance metric type (default: "L2") */
  metricType?: "L2" | "IP";
  /** Number of sub-quantizers for IVF-PQ (default: 8) */
  numSubQuantizers?: number;
  /** Number of bits per sub-quantizer for IVF-PQ (default: 8) */
  bitsPerCode?: number;
  /** M parameter for HNSW (default: 32) */
  hnswM?: number;
};

/**
 * Vector store metadata for registry
 */
export type VectorStoreMetadata = {
  /** Category of the store */
  category: "cloud-native" | "database" | "embedded" | "enterprise" | "specialized";
  /** Supported similarity metrics */
  metrics: SimilarityMetric[];
  /** Whether namespaces are supported */
  supportsNamespaces: boolean;
  /** Whether metadata filtering is supported */
  supportsFiltering: boolean;
  /** Description of the store */
  description: string;
};
