/**
 * Vector Store Adapters
 * Export all vector store adapter implementations
 */

// SQLite-VSS Adapter
export { SQLiteVSSAdapter } from "./SQLiteVSSAdapter.js";

// Milvus Adapter
export { MilvusAdapter } from "./MilvusAdapter.js";
export type {
  MilvusConfig,
  MilvusIndexType,
  MilvusIndexParams,
  MilvusSearchParams,
} from "./MilvusAdapter.js";

// Weaviate Adapter
export { WeaviateAdapter } from "./WeaviateAdapter.js";
export type { WeaviateConfig } from "./WeaviateAdapter.js";

// Zilliz Adapter
export { ZillizAdapter } from "./ZillizAdapter.js";
export type { ZillizConfig } from "./ZillizAdapter.js";

// pgvector (PostgreSQL) Adapter
export { PgvectorAdapter } from "./PgvectorAdapter.js";
export type {
  PgvectorConfig,
  PgvectorSSLConfig,
  PgvectorIndexType,
  PgvectorIndexOptions,
} from "./PgvectorAdapter.js";

// Faiss Adapter
export { FaissAdapter } from "./FaissAdapter.js";
export type { FaissConfig } from "./FaissAdapter.js";

// Qdrant Adapter
export { QdrantAdapter } from "./QdrantAdapter.js";
export type {
  QdrantConfig,
  QdrantDistance,
  QdrantIndexOptions,
  QdrantQuantization,
  QdrantSearchParams,
  QdrantClientFactory,
} from "./QdrantAdapter.js";

// Pinecone Adapter
export { PineconeAdapter } from "./PineconeAdapter.js";
export type {
  PineconeConfig,
  PineconeServerlessSpec,
  PineconePodsSpec,
  PineconeIndexSpec,
  PineconeIndexOptions,
  SparseVector,
  PineconeClientFactory,
} from "./PineconeAdapter.js";
