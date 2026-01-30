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
export { type WeaviateConfig, WeaviateStore } from "./cloud/weaviate.js";
export { type UpstashConfig, UpstashStore } from "./cloud/upstash.js";
export {
  type CloudflareVectorizeConfig,
  CloudflareVectorizeStore,
} from "./cloud/cloudflareVectorize.js";
export { type AstraConfig, AstraStore } from "./cloud/datastaxAstra.js";
// Database store implementations
export {
  type ElasticsearchConfig,
  ElasticsearchStore,
} from "./database/elasticsearch.js";
export { type MongoDBConfig, MongoDBStore } from "./database/mongodb.js";
export {
  type OpenSearchConfig,
  OpenSearchStore,
} from "./database/opensearch.js";
export { type PgvectorConfig, PgvectorStore } from "./database/pgvector.js";
// Embedded store implementations
export { type ChromaConfig, ChromaStore } from "./embedded/chroma.js";
export { type DuckDBConfig, DuckDBStore } from "./embedded/duckdb.js";
export { type LanceConfig, LanceStore } from "./embedded/lance.js";
export { type LibSQLConfig, LibSQLStore } from "./embedded/libsql.js";
// Enterprise store implementations
export {
  type AzureAiSearchConfig,
  AzureAiSearchStore,
} from "./enterprise/azureAiSearch.js";
export {
  type VertexVectorSearchConfig,
  VertexVectorSearchStore,
} from "./enterprise/vertexVectorSearch.js";
export {
  type AwsOpensearchConfig,
  AwsOpensearchStore,
} from "./enterprise/awsOpensearch.js";
export {
  type CouchbaseConfig,
  CouchbaseStore,
} from "./enterprise/couchbase.js";
export { type VespaConfig, VespaStore } from "./enterprise/vespa.js";
export { type MarqoConfig, MarqoStore } from "./enterprise/marqo.js";
export { type MilvusConfig, MilvusStore } from "./enterprise/milvus.js";
export { type ZillizConfig, ZillizStore } from "./enterprise/zilliz.js";
// Filter translation utilities
export {
  type DuckDBFilterResult,
  type LibSQLFilterResult,
  type PgvectorFilterResult,
  translateToChroma,
  translateToDuckDB,
  translateToElasticsearch,
  translateToLance,
  translateToLibSQL,
  translateToMilvus,
  translateToMongoDB,
  translateToOpenSearch,
  translateToPgvector,
  translateToPinecone,
  translateToQdrant,
  translateToWeaviate,
  translateToAzureAiSearch,
  translateToVertexVectorSearch,
  translateToAwsOpensearch,
  translateToCouchbase,
  translateToVespa,
  translateToMarqo,
  translateToUpstash,
  translateToCloudflare,
  translateToAstra,
} from "./filterTranslator.js";
export { VectorStoreFactory } from "./vectorStoreFactory.js";
export { VectorStoreRegistry } from "./vectorStoreRegistry.js";

// Search optimization utilities
export {
  // Reciprocal Rank Fusion
  reciprocalRankFusion,
  toRankingMap,
  sparseToRankingMap,
  type RRFOptions,
  type RankedResult,
  type SparseSearchResult,
  // Linear combination
  linearCombination,
  type HybridSearchOptions,
  // Score normalization
  normalizeScores,
  zScoreNormalize,
  // Distance/similarity functions
  cosineSimilarity,
  euclideanDistance,
  dotProduct,
  // Reranking and diversification
  rescoreResults,
  maximalMarginalRelevance,
  // Batch utilities
  splitIntoBatches,
  processBatches,
  // Quantization utilities
  scalarQuantize,
  binaryQuantize,
  hammingDistance,
} from "./searchOptimization.js";
