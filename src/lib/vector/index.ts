/**
 * Vector Store Module
 * Exports for vector store integrations
 */

// Types
export * from "./types.js";

// Base class
export { BaseVectorStore } from "./BaseVectorStore.js";

// Factory and Registry
export { VectorStoreFactory, VectorStoreFactoryImpl } from "./VectorStoreFactory.js";
export { VectorStoreRegistry, VectorStoreRegistryImpl } from "./VectorStoreRegistry.js";

// Adapters
export { SQLiteVSSAdapter } from "./adapters/SQLiteVSSAdapter.js";
export { LibSQLAdapter } from "./adapters/LibSQLAdapter.js";
export type { LibSQLConfig } from "./adapters/LibSQLAdapter.js";
export { DuckDBAdapter } from "./adapters/DuckDBAdapter.js";
export { CloudflareVectorizeAdapter } from "./adapters/CloudflareVectorizeAdapter.js";
export type { CloudflareVectorizeConfig } from "./adapters/CloudflareVectorizeAdapter.js";
export { MongoDBAtlasAdapter } from "./adapters/MongoDBAtlasAdapter.js";
export type { MongoDBAtlasConfig } from "./adapters/MongoDBAtlasAdapter.js";
export { OpenSearchAdapter } from "./adapters/OpenSearchAdapter.js";
export type { OpenSearchConfig, OpenSearchClient } from "./adapters/OpenSearchAdapter.js";
export { MilvusAdapter } from "./adapters/MilvusAdapter.js";
export type {
  MilvusConfig,
  MilvusIndexType,
  MilvusIndexParams,
  MilvusSearchParams,
} from "./adapters/MilvusAdapter.js";
export { UpstashVectorAdapter } from "./adapters/UpstashVectorAdapter.js";
export type { UpstashVectorConfig } from "./adapters/UpstashVectorAdapter.js";
export { VertexVectorSearchAdapter } from "./adapters/VertexVectorSearchAdapter.js";
export type { VertexVectorSearchConfig } from "./adapters/VertexVectorSearchAdapter.js";
export { ElasticsearchAdapter } from "./adapters/ElasticsearchAdapter.js";
export type { ElasticsearchConfig } from "./adapters/ElasticsearchAdapter.js";
export { AstraDBAdapter } from "./adapters/AstraDBAdapter.js";
export type { AstraDBConfig } from "./adapters/AstraDBAdapter.js";
export { AzureAISearchAdapter } from "./adapters/AzureAISearchAdapter.js";
export type { AzureAISearchConfig } from "./adapters/AzureAISearchAdapter.js";
export { LanceDBAdapter } from "./adapters/LanceDBAdapter.js";
export { CouchbaseAdapter } from "./adapters/CouchbaseAdapter.js";
export type { CouchbaseConfig } from "./adapters/CouchbaseAdapter.js";
export { ZillizAdapter } from "./adapters/ZillizAdapter.js";
export type { ZillizConfig } from "./adapters/ZillizAdapter.js";
export { WeaviateAdapter } from "./adapters/WeaviateAdapter.js";
export type { WeaviateConfig, WeaviateClientFactory } from "./adapters/WeaviateAdapter.js";
export { RedisVectorAdapter } from "./adapters/RedisVectorAdapter.js";
export type {
  RedisVectorConfig,
  RedisIndexAlgorithm,
  RedisIndexOptions,
} from "./adapters/RedisVectorAdapter.js";
export { ChromaAdapter } from "./adapters/ChromaAdapter.js";
export type { ChromaConfig } from "./adapters/ChromaAdapter.js";
export { PgvectorAdapter } from "./adapters/PgvectorAdapter.js";
export type {
  PgvectorConfig,
  PgvectorSSLConfig,
  PgvectorIndexType,
  PgvectorIndexOptions,
} from "./adapters/PgvectorAdapter.js";
export { QdrantAdapter } from "./adapters/QdrantAdapter.js";
export type {
  QdrantConfig,
  QdrantDistance,
  QdrantIndexOptions,
  QdrantQuantization,
  QdrantSearchParams,
  QdrantClientFactory,
} from "./adapters/QdrantAdapter.js";
export { FaissAdapter } from "./adapters/FaissAdapter.js";
export type { FaissConfig } from "./adapters/FaissAdapter.js";
export { PineconeAdapter } from "./adapters/PineconeAdapter.js";
export type {
  PineconeConfig,
  PineconeServerlessSpec,
  PineconePodsSpec,
  PineconeIndexSpec,
  PineconeIndexOptions,
  SparseVector,
  PineconeClientFactory,
} from "./adapters/PineconeAdapter.js";
