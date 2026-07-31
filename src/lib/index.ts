/**
 * NeuroLink AI Toolkit
 *
 * A unified AI provider interface with support for 13+ providers,
 * automatic fallback, streaming, MCP tool integration, HITL security,
 * Redis persistence, and enterprise-grade middleware.
 *
 * NeuroLink provides comprehensive AI functionality with battle-tested
 * patterns extracted from production systems at Juspay.
 *
 * @packageDocumentation
 * @module @juspay/neurolink
 * @category Core
 *
 * @example
 * ```typescript
 * import { NeuroLink } from '@juspay/neurolink';
 *
 * // Create NeuroLink instance
 * const neurolink = new NeuroLink();
 *
 * // Generate with any provider
 * const result = await neurolink.generate({
 *   input: { text: 'Explain quantum computing' },
 *   provider: 'vertex',
 *   model: 'gemini-3-flash'
 * });
 *
 * console.log(result.content);
 * ```
 *
 * @since 1.0.0
 */

// Core exports
import { AIProviderFactory } from "./core/factory.js";
export { AIProviderFactory };

export {
  AIProviderName,
  BedrockModels,
  OpenAIModels,
  VertexModels,
} from "./constants/enums.js";
// Dynamic Models exports
export { dynamicModelProvider } from "./core/dynamicModels.js";
// Tool Registration utility
export { validateTool } from "./sdk/toolRegistration.js";
// Export ALL types from the centralized type barrel
export * from "./types/index.js";
export type { DynamicModelConfig, ModelRegistry } from "./types/modelTypes.js";
// Utility exports
export {
  getAvailableProviders,
  getBestProvider,
  isValidProvider,
} from "./utils/providerUtils.js";

// Main NeuroLink wrapper class and diagnostic types
import { NeuroLink } from "./neurolink.js";
export { NeuroLink };
export type { MCPServerInfo } from "./types/mcpTypes.js";

// Observability configuration types
export type {
  LangfuseConfig,
  ObservabilityConfig,
  OpenTelemetryConfig,
} from "./types/observability.js";

export { buildObservabilityConfigFromEnv } from "./utils/observabilityHelpers.js";

import {
  flushOpenTelemetry,
  getLangfuseHealthStatus,
  initializeOpenTelemetry,
  setLangfuseContext,
  shutdownOpenTelemetry,
} from "./services/server/ai/observability/instrumentation.js";
import { getTelemetryStatus as getStatus, initializeTelemetry as init } from "./telemetry/index.js";

export {
  initializeOpenTelemetry,
  shutdownOpenTelemetry,
  flushOpenTelemetry,
  getLangfuseHealthStatus,
  setLangfuseContext,
};

export { MiddlewareFactory } from "./middleware/factory.js";
// Middleware exports
export type {
  MiddlewareConfig,
  MiddlewareContext,
  MiddlewareFactoryOptions,
  MiddlewarePreset,
  NeuroLinkMiddleware,
} from "./types/middlewareTypes.js";

// Version
export const VERSION = "1.0.0";

/**
 * Quick start factory function for creating AI provider instances.
 *
 * Creates a configured AI provider instance ready for immediate use.
 * Supports all 13 providers: OpenAI, Anthropic, Google AI Studio,
 * Google Vertex, AWS Bedrock, AWS SageMaker, Azure OpenAI, Hugging Face,
 * LiteLLM, Mistral, Ollama, OpenAI Compatible, and OpenRouter.
 *
 * @category Factory
 *
 * @param providerName - The AI provider name (e.g., 'bedrock', 'vertex', 'openai')
 * @param modelName - Optional model name to override provider default
 * @returns Promise resolving to configured AI provider instance
 *
 * @example Basic usage
 * ```typescript
 * import { createAIProvider } from '@juspay/neurolink';
 *
 * const provider = await createAIProvider('bedrock');
 * const result = await provider.stream({ input: { text: 'Hello, AI!' } });
 * ```
 *
 * @example With custom model
 * ```typescript
 * const provider = await createAIProvider('vertex', 'gemini-3-flash');
 * ```
 *
 * @see {@link AIProviderFactory.createProvider}
 * @see {@link NeuroLink} for the main SDK class
 * @since 1.0.0
 */
export async function createAIProvider(providerName?: string, modelName?: string) {
  return await AIProviderFactory.createProvider(providerName || "bedrock", modelName);
}

/**
 * Create provider with automatic fallback for production resilience.
 *
 * Creates both primary and fallback provider instances for high-availability
 * deployments. Automatically switches to fallback on primary provider failure.
 *
 * @category Factory
 *
 * @param primaryProvider - Primary AI provider name (default: 'bedrock')
 * @param fallbackProvider - Fallback AI provider name (default: 'vertex')
 * @param modelName - Optional model name for both providers
 * @returns Promise resolving to object with primary and fallback providers
 *
 * @example Production failover setup
 * ```typescript
 * import { createAIProviderWithFallback } from '@juspay/neurolink';
 *
 * const { primary, fallback } = await createAIProviderWithFallback('bedrock', 'vertex');
 *
 * try {
 *   const result = await primary.generate({ input: { text: 'Hello!' } });
 * } catch (error) {
 *   // Automatically use fallback
 *   const result = await fallback.generate({ input: { text: 'Hello!' } });
 * }
 * ```
 *
 * @example Multi-region setup
 * ```typescript
 * const { primary, fallback } = await createAIProviderWithFallback(
 *   'vertex',      // Primary: US region
 *   'bedrock',     // Fallback: Global
 *   'claude-3-sonnet'
 * );
 * ```
 *
 * @see {@link AIProviderFactory.createProviderWithFallback}
 * @since 1.0.0
 */
export async function createAIProviderWithFallback(
  primaryProvider?: string,
  fallbackProvider?: string,
  modelName?: string,
) {
  return await AIProviderFactory.createProviderWithFallback(
    primaryProvider || "bedrock",
    fallbackProvider || "vertex",
    modelName,
  );
}

/**
 * Create the best available provider based on environment configuration.
 *
 * Intelligently selects the best provider based on available API keys
 * in environment variables. Automatically detects and configures the
 * optimal provider without manual configuration.
 *
 * @category Factory
 *
 * @param requestedProvider - Optional preferred provider name
 * @param modelName - Optional model name
 * @returns Promise resolving to the best configured provider
 *
 * @example Automatic provider selection
 * ```typescript
 * import { createBestAIProvider } from '@juspay/neurolink';
 *
 * // Automatically uses provider with configured API key
 * const provider = await createBestAIProvider();
 * const result = await provider.generate({ input: { text: 'Hello!' } });
 * ```
 *
 * @example With provider preference
 * ```typescript
 * // Tries to use OpenAI, falls back to available provider
 * const provider = await createBestAIProvider('openai');
 * ```
 *
 * @remarks
 * Environment variables checked (in order):
 * - OPENAI_API_KEY
 * - ANTHROPIC_API_KEY
 * - GOOGLE_API_KEY
 * - VERTEX_PROJECT_ID + credentials
 * - AWS credentials for Bedrock
 * - And more...
 *
 * @see {@link AIProviderFactory.createBestProvider}
 * @see {@link getBestProvider} for provider detection utility
 * @since 1.0.0
 */
export async function createBestAIProvider(requestedProvider?: string, modelName?: string) {
  return await AIProviderFactory.createBestProvider(requestedProvider, modelName);
}

// ============================================================================
// VECTOR STORES - Unified Vector Database Integration
// ============================================================================

/**
 * Vector Store Integration
 *
 * Provides unified access to 22+ vector stores for RAG, semantic search,
 * and AI memory systems.
 *
 * @example
 * ```typescript
 * import { VectorStoreFactory, VectorStoreName } from '@juspay/neurolink';
 *
 * const store = await VectorStoreFactory.createStore(VectorStoreName.PGVECTOR, {
 *   connectionString: process.env.PGVECTOR_CONNECTION_STRING
 * });
 *
 * await store.connect();
 * await store.createIndex({ name: 'documents', dimension: 1536 });
 * ```
 */
export {
  type AstraConfig,
  AstraStore,
  type AwsOpensearchConfig,
  AwsOpensearchStore,
  type AzureAiSearchConfig,
  // Enterprise store implementations
  AzureAiSearchStore,
  // Core classes
  BaseVectorStore,
  binaryQuantize,
  type ChromaConfig,
  // Embedded store implementations
  ChromaStore,
  type CloudflareVectorizeConfig,
  CloudflareVectorizeStore,
  type CouchbaseConfig,
  CouchbaseStore,
  cosineSimilarity,
  type DuckDBConfig,
  type DuckDBFilterResult,
  DuckDBStore,
  dotProduct,
  type ElasticsearchConfig,
  // Database store implementations
  ElasticsearchStore,
  euclideanDistance,
  type HybridSearchOptions,
  hammingDistance,
  type LanceConfig,
  LanceStore,
  type LibSQLConfig,
  type LibSQLFilterResult,
  LibSQLStore,
  linearCombination,
  type MarqoConfig,
  MarqoStore,
  type MilvusConfig,
  MilvusStore,
  type MongoDBConfig,
  MongoDBStore,
  maximalMarginalRelevance,
  normalizeScores,
  type OpenSearchConfig,
  OpenSearchStore,
  type PgvectorConfig,
  type PgvectorFilterResult,
  PgvectorStore,
  type PineconeConfig,
  // Cloud store implementations
  PineconeStore,
  processBatches,
  type QdrantConfig,
  QdrantStore,
  type RankedResult,
  type RRFOptions,
  // Search optimization
  reciprocalRankFusion,
  rescoreResults,
  type SparseSearchResult,
  scalarQuantize,
  sparseToRankingMap,
  splitIntoBatches,
  toRankingMap,
  translateToAstra,
  translateToAwsOpensearch,
  translateToAzureAiSearch,
  // Filter translation utilities
  translateToChroma,
  translateToCloudflare,
  translateToCouchbase,
  translateToDuckDB,
  translateToElasticsearch,
  translateToLance,
  translateToLibSQL,
  translateToMarqo,
  translateToMilvus,
  translateToMongoDB,
  translateToOpenSearch,
  translateToPgvector,
  translateToPinecone,
  translateToQdrant,
  translateToUpstash,
  translateToVertexVectorSearch,
  translateToVespa,
  translateToWeaviate,
  type UpstashConfig,
  UpstashStore,
  // Types re-exported for convenience
  type VectorStoreConfig,
  VectorStoreFactory,
  VectorStoreRegistry,
  type VertexVectorSearchConfig,
  VertexVectorSearchStore,
  type VespaConfig,
  VespaStore,
  type WeaviateConfig,
  WeaviateStore,
  type ZillizConfig,
  ZillizStore,
  zScoreNormalize,
} from "./stores/index.js";

// ============================================================================
// VECTOR STORE ADAPTERS - 22 Vector Store Implementations
// ============================================================================

/**
 * Advanced Vector Store Adapters
 *
 * Additional vector store adapters with Factory+Registry pattern for
 * comprehensive vector database support across cloud, database, embedded,
 * and enterprise platforms.
 *
 * @example
 * ```typescript
 * import {
 *   VectorStoreFactory as VSFactory,
 *   VectorStoreRegistry as VSRegistry,
 *   PineconeAdapter,
 *   QdrantAdapter,
 *   ChromaAdapter
 * } from '@juspay/neurolink';
 *
 * // Use Factory pattern
 * const store = await VSFactory.create('pinecone', {
 *   apiKey: process.env.PINECONE_API_KEY
 * });
 *
 * // Or use adapters directly
 * const qdrant = new QdrantAdapter({ url: 'http://localhost:6333' });
 * ```
 */
export {
  AstraDBAdapter,
  type AstraDBConfig,
  // Enterprise adapters
  AzureAISearchAdapter,
  type AzureAISearchConfig as AzureSearchAdapterConfig,
  // Core classes (aliased to avoid conflicts with stores/ exports)
  BaseVectorStore as VectorBaseStore,
  // Embedded/Local adapters
  ChromaAdapter,
  type ChromaConfig as ChromaAdapterConfig,
  CloudflareVectorizeAdapter,
  type CloudflareVectorizeConfig as CloudflareAdapterConfig,
  CouchbaseAdapter,
  type CouchbaseConfig as CouchbaseAdapterConfig,
  DuckDBAdapter,
  ElasticsearchAdapter,
  type ElasticsearchConfig as ElasticsearchAdapterConfig,
  FaissAdapter,
  type FaissConfig as FaissAdapterConfig,
  LanceDBAdapter,
  LibSQLAdapter,
  type LibSQLConfig as LibSQLAdapterConfig,
  MilvusAdapter,
  type MilvusConfig as MilvusAdapterConfig,
  type MilvusIndexParams,
  type MilvusIndexType,
  type MilvusSearchParams,
  MongoDBAtlasAdapter,
  type MongoDBAtlasConfig,
  OpenSearchAdapter,
  type OpenSearchClient,
  type OpenSearchConfig as OpenSearchAdapterConfig,
  // Database adapters
  PgvectorAdapter,
  type PgvectorConfig as PgvectorAdapterConfig,
  type PgvectorIndexOptions,
  type PgvectorIndexType,
  type PgvectorSSLConfig,
  // Cloud adapters
  PineconeAdapter,
  type PineconeClientFactory,
  type PineconeConfig as PineconeAdapterConfig,
  type PineconeIndexOptions,
  type PineconeIndexSpec,
  type PineconePodsSpec,
  type PineconeServerlessSpec,
  QdrantAdapter,
  type QdrantClientFactory,
  type QdrantConfig as QdrantAdapterConfig,
  type QdrantDistance,
  type QdrantIndexOptions,
  type QdrantQuantization,
  type QdrantSearchParams,
  type RedisIndexAlgorithm,
  type RedisIndexOptions,
  RedisVectorAdapter,
  type RedisVectorConfig,
  type SparseVector,
  SQLiteVSSAdapter,
  UpstashVectorAdapter,
  type UpstashVectorConfig,
  VectorStoreFactory as VectorAdapterFactory,
  VectorStoreFactoryImpl,
  VectorStoreRegistry as VectorAdapterRegistry,
  VectorStoreRegistryImpl,
  VertexVectorSearchAdapter,
  type VertexVectorSearchConfig as VertexSearchAdapterConfig,
  WeaviateAdapter,
  type WeaviateClientFactory,
  type WeaviateConfig as WeaviateAdapterConfig,
  ZillizAdapter,
  type ZillizConfig as ZillizAdapterConfig,
} from "./vector/index.js";

// Re-export vector types
export type {
  MetadataFilter,
  SimilarityMetric,
  VectorDeleteOptions,
  VectorIndexConfig,
  VectorQueryOptions,
  VectorQueryResult,
  VectorRecord,
  VectorStoreConfig as VectorAdapterStoreConfig,
  VectorStoreHealth,
  VectorStoreName,
  VectorStoreStats,
  VectorUpsertOptions,
} from "./vector/types.js";

// ============================================================================
// EMBEDDING PROVIDERS - Multi-Provider Embedding Generation
// ============================================================================

/**
 * Embedding Provider Integration
 *
 * Provides unified access to embedding providers for text-to-vector
 * conversion, supporting OpenAI, Cohere, Voyage AI, and more.
 *
 * @example
 * ```typescript
 * import { createEmbeddingProvider, EmbeddingProviderName } from '@juspay/neurolink';
 *
 * const embedder = await createEmbeddingProvider('openai', {
 *   apiKey: process.env.OPENAI_API_KEY
 * });
 *
 * const result = await embedder.embed('Hello, world!');
 * console.log(result.embedding); // [0.123, 0.456, ...]
 * ```
 */
export {
  // Core classes
  BaseEmbeddingProvider,
  CohereEmbeddingProvider,
  // Convenience functions
  createEmbeddingProvider,
  // Constants
  EMBEDDING_MODELS,
  EMBEDDING_PRESETS,
  EmbeddingProviderFactory,
  EmbeddingProviderRegistry,
  embedText,
  embedTexts,
  getEmbeddingModelInfo,
  getModelsForProvider,
  // Provider implementations
  OpenAIEmbeddingProvider,
  VoyageEmbeddingProvider,
} from "./embeddings/index.js";

// ============================================================================
// MCP PLUGIN ECOSYSTEM - Universal AI Development Platform
// ============================================================================

/**
 * MCP (Model Context Protocol) Plugin Ecosystem
 *
 * Extensible plugin architecture based on research blueprint for
 * transforming NeuroLink into a Universal AI Development Platform.
 *
 * @example
 * ```typescript
 * import { mcpEcosystem, readFile, writeFile } from '@juspay/neurolink';
 *
 * // Initialize the ecosystem
 * await mcpEcosystem.initialize();
 *
 * // List available plugins
 * const plugins = await mcpEcosystem.list();
 *
 * // Use filesystem operations
 * const content = await readFile('README.md');
 * await writeFile('output.txt', 'Hello from MCP!');
 * ```
 */
export {
  CircuitBreakerManager,
  calculateExpiresAt,
  createOAuthProviderFromConfig,
  DEFAULT_HTTP_RETRY_CONFIG,
  DEFAULT_RATE_LIMIT_CONFIG,
  executeMCP,
  FileTokenStorage,
  getMCPStats,
  globalCircuitBreakerManager,
  globalRateLimiterManager,
  // HTTP Transport utilities
  HTTPRateLimiter,
  // OAuth Authentication
  InMemoryTokenStorage,
  // Core MCP ecosystem
  // Simplified MCP exports
  initializeMCPEcosystem,
  isRetryableHTTPError,
  isRetryableStatusCode,
  isTokenExpired,
  listMCPs,
  // Circuit Breaker
  MCPCircuitBreaker,
  mcpLogger,
  NeuroLinkOAuthProvider,
  RateLimiterManager,
  withHTTPRetry,
} from "./mcp/index.js";

export type {
  AuthorizationUrlResult,
  DiscoveredMcp,
  HTTPRetryConfig,
  MCPOAuthConfig,
  McpMetadata,
  OAuthClientInformation,
  OAuthTokens,
  // HTTP Transport types
  RateLimitConfig,
  TokenExchangeRequest,
  TokenStorage,
} from "./types/mcpTypes.js";

export type {
  ExecutionContext,
  ToolExecutionResult,
  ToolInfo,
} from "./types/tools.js";

export type { LogLevel } from "./types/utilities.js";

// ============================================================================
// REAL-TIME SERVICES & TELEMETRY - Enterprise Platform Features
// ============================================================================

// Real-time Services (Phase 1) - Basic SSE functionality only
// export { createEnhancedChatService } from './chat/index.js';
// export type * from './services/types.js';

// Optional Telemetry (Phase 2) - Telemetry service initialization
export async function initializeTelemetry(): Promise<boolean> {
  try {
    const result = await init();
    return !!result;
  } catch {
    return false;
  }
}

export async function getTelemetryStatus(): Promise<{
  enabled: boolean;
  initialized: boolean;
  endpoint?: string;
  service?: string;
  version?: string;
}> {
  return getStatus();
}

// ============================================================================
// BACKWARD COMPATIBILITY: Legacy generateText Function Exports
// ============================================================================

// Export legacy types for backward compatibility
export type {
  AnalyticsData,
  EvaluationData,
  TextGenerationOptions,
  TextGenerationResult,
} from "./types/index.js";

/**
 * Legacy generateText function for backward compatibility.
 *
 * Provides standalone text generation function for existing code.
 * For new code, use {@link NeuroLink.generate} instead which provides
 * more features including streaming, tools, and structured output.
 *
 * @category Legacy
 * @deprecated Use {@link NeuroLink.generate} for new code
 *
 * @param options - Text generation options
 * @param options.prompt - Input prompt text
 * @param options.provider - AI provider name (e.g., 'bedrock', 'openai')
 * @param options.model - Model name to use
 * @param options.temperature - Sampling temperature (0-2)
 * @param options.maxTokens - Maximum tokens to generate
 * @returns Promise resolving to text generation result with content and metadata
 *
 * @example Basic text generation
 * ```typescript
 * import { generateText } from '@juspay/neurolink';
 *
 * const result = await generateText({
 *   prompt: 'Explain quantum computing in simple terms',
 *   provider: 'bedrock',
 *   model: 'claude-3-sonnet'
 * });
 * console.log(result.content);
 * ```
 *
 * @example With temperature control
 * ```typescript
 * const result = await generateText({
 *   prompt: 'Write a creative story',
 *   provider: 'openai',
 *   temperature: 1.5,
 *   maxTokens: 500
 * });
 * ```
 *
 * @see {@link NeuroLink.generate} for modern API with more features
 * @since 1.0.0
 */
export async function generateText(
  options: import("./types/index.js").TextGenerationOptions,
): Promise<import("./types/index.js").TextGenerationResult> {
  // Create instance on-demand without auto-instantiation
  const neurolink = new NeuroLink();
  return await neurolink.generateText(options);
}
