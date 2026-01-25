/**
 * Vector Store Module - Main Exports
 * Provides unified access to 22+ vector store implementations
 */

export type {
  ComparisonOperator,
  FieldFilter,
  LogicalOperator,
  MetadataFilter,
} from "../types/vectorFilterTypes.js";
// Re-export types for convenience
export type {
  SimilarityMetric,
  VectorDeleteOptions,
  VectorIndexConfig,
  VectorQueryOptions,
  VectorQueryResult,
  VectorRecord,
  VectorStoreHealth,
  VectorStoreName,
  VectorStoreStats,
  VectorUpsertOptions,
} from "../types/vectorTypes.js";
// Core exports
export { BaseVectorStore, type VectorStoreConfig } from "./baseVectorStore.js";
// Cloud store implementations
export { type PineconeConfig, PineconeStore } from "./cloud/pinecone.js";
export { type QdrantConfig, QdrantStore } from "./cloud/qdrant.js";
// Database store implementations
export { type PgvectorConfig, PgvectorStore } from "./database/pgvector.js";
// Embedded store implementations
export { type ChromaConfig, ChromaStore } from "./embedded/chroma.js";
// Filter translation utilities
export {
  type PgvectorFilterResult,
  translateToChroma,
  translateToMilvus,
  translateToPgvector,
  translateToPinecone,
  translateToQdrant,
  translateToWeaviate,
} from "./filterTranslator.js";
export { VectorStoreFactory } from "./vectorStoreFactory.js";
export { VectorStoreRegistry } from "./vectorStoreRegistry.js";
