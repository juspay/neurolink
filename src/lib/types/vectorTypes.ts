/**
 * Core type definitions for Vector Store integrations
 * Following NeuroLink's established patterns from the provider system
 */

import type { UnknownRecord } from "./common.js";

/**
 * Vector store provider names
 * Enum following NeuroLink's AIProviderName pattern
 */
export enum VectorStoreName {
  // Cloud-native stores
  PINECONE = "pinecone",
  QDRANT = "qdrant",
  WEAVIATE = "weaviate",
  CLOUDFLARE = "cloudflare",
  UPSTASH = "upstash",
  ASTRA = "astra",

  // Database extensions
  PGVECTOR = "pgvector",
  MONGODB = "mongodb",
  ELASTICSEARCH = "elasticsearch",
  OPENSEARCH = "opensearch",
  COUCHBASE = "couchbase",

  // Embedded/local stores
  CHROMA = "chroma",
  LANCE = "lance",
  DUCKDB = "duckdb",
  LIBSQL = "libsql",

  // Enterprise solutions
  AZURE_AI_SEARCH = "azure-ai-search",
  VERTEX_VECTOR = "vertex-vector",
  AWS_OPENSEARCH = "aws-opensearch",
  MILVUS = "milvus",
  ZILLIZ = "zilliz",
  VESPA = "vespa",
  MARQO = "marqo",
}

/**
 * Similarity metrics for vector search
 */
export type SimilarityMetric = "cosine" | "euclidean" | "dotProduct";

/**
 * Vector record with metadata
 * Generic type for storing vectors with associated information
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
  /** Vector dimension (e.g., 1536 for OpenAI ada-002, 3072 for text-embedding-3-large) */
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
 * Delete operation result
 * Some providers cannot report exact deleted count for filter/deleteAll operations
 */
export type VectorDeleteResult = {
  /** Number of deleted records. undefined when provider cannot determine count */
  deletedCount: number | undefined;
  /** Whether the operation was acknowledged by the server */
  acknowledged?: boolean;
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
 * Base configuration for vector store instances
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

// Import the filter types for convenience
import type { MetadataFilter } from "./vectorFilterTypes.js";
export type { MetadataFilter };
