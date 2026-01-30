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

// Export ALL types from the centralized type barrel
export * from "./types/index.js";

// Tool Registration utility
export { validateTool } from "./sdk/toolRegistration.js";

export {
  AIProviderName,
  BedrockModels,
  OpenAIModels,
  VertexModels,
} from "./constants/enums.js";

// Utility exports
export {
  getBestProvider,
  getAvailableProviders,
  isValidProvider,
} from "./utils/providerUtils.js";

// Dynamic Models exports
export { dynamicModelProvider } from "./core/dynamicModels.js";
export type { DynamicModelConfig, ModelRegistry } from "./types/modelTypes.js";

// Main NeuroLink wrapper class and diagnostic types
import { NeuroLink } from "./neurolink.js";
export { NeuroLink };
export type { MCPServerInfo } from "./types/mcpTypes.js";

// Observability configuration types
export type {
  ObservabilityConfig,
  LangfuseConfig,
  OpenTelemetryConfig,
} from "./types/observability.js";

export { buildObservabilityConfigFromEnv } from "./utils/observabilityHelpers.js";

import {
  initializeOpenTelemetry,
  shutdownOpenTelemetry,
  flushOpenTelemetry,
  getLangfuseHealthStatus,
  setLangfuseContext,
} from "./services/server/ai/observability/instrumentation.js";
import {
  initializeTelemetry as init,
  getTelemetryStatus as getStatus,
} from "./telemetry/index.js";

export {
  initializeOpenTelemetry,
  shutdownOpenTelemetry,
  flushOpenTelemetry,
  getLangfuseHealthStatus,
  setLangfuseContext,
};

// Middleware exports
export type {
  NeuroLinkMiddleware,
  MiddlewareContext,
  MiddlewareFactoryOptions,
  MiddlewarePreset,
  MiddlewareConfig,
} from "./types/middlewareTypes.js";
export { MiddlewareFactory } from "./middleware/factory.js";

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
export async function createAIProvider(
  providerName?: string,
  modelName?: string,
) {
  return await AIProviderFactory.createProvider(
    providerName || "bedrock",
    modelName,
  );
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
export async function createBestAIProvider(
  requestedProvider?: string,
  modelName?: string,
) {
  return await AIProviderFactory.createBestProvider(
    requestedProvider,
    modelName,
  );
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
  // Core classes
  BaseVectorStore,
  VectorStoreFactory,
  VectorStoreRegistry,
  // Cloud store implementations
  PineconeStore,
  type PineconeConfig,
  QdrantStore,
  type QdrantConfig,
  WeaviateStore,
  type WeaviateConfig,
  UpstashStore,
  type UpstashConfig,
  CloudflareVectorizeStore,
  type CloudflareVectorizeConfig,
  AstraStore,
  type AstraConfig,
  // Database store implementations
  ElasticsearchStore,
  type ElasticsearchConfig,
  MongoDBStore,
  type MongoDBConfig,
  OpenSearchStore,
  type OpenSearchConfig,
  PgvectorStore,
  type PgvectorConfig,
  // Embedded store implementations
  ChromaStore,
  type ChromaConfig,
  DuckDBStore,
  type DuckDBConfig,
  LanceStore,
  type LanceConfig,
  LibSQLStore,
  type LibSQLConfig,
  // Enterprise store implementations
  AzureAiSearchStore,
  type AzureAiSearchConfig,
  VertexVectorSearchStore,
  type VertexVectorSearchConfig,
  AwsOpensearchStore,
  type AwsOpensearchConfig,
  CouchbaseStore,
  type CouchbaseConfig,
  VespaStore,
  type VespaConfig,
  MarqoStore,
  type MarqoConfig,
  MilvusStore,
  type MilvusConfig,
  ZillizStore,
  type ZillizConfig,
  // Filter translation utilities
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
  type DuckDBFilterResult,
  type LibSQLFilterResult,
  type PgvectorFilterResult,
  // Search optimization
  reciprocalRankFusion,
  linearCombination,
  cosineSimilarity,
  euclideanDistance,
  dotProduct,
  rescoreResults,
  maximalMarginalRelevance,
  normalizeScores,
  zScoreNormalize,
  scalarQuantize,
  binaryQuantize,
  hammingDistance,
  splitIntoBatches,
  processBatches,
  toRankingMap,
  sparseToRankingMap,
  // Types re-exported for convenience
  type VectorStoreConfig,
  type RRFOptions,
  type RankedResult,
  type SparseSearchResult,
  type HybridSearchOptions,
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
  // Core classes (aliased to avoid conflicts with stores/ exports)
  BaseVectorStore as VectorBaseStore,
  VectorStoreFactory as VectorAdapterFactory,
  VectorStoreFactoryImpl,
  VectorStoreRegistry as VectorAdapterRegistry,
  VectorStoreRegistryImpl,
  // Cloud adapters
  PineconeAdapter,
  type PineconeConfig as PineconeAdapterConfig,
  type PineconeServerlessSpec,
  type PineconePodsSpec,
  type PineconeIndexSpec,
  type PineconeIndexOptions,
  type SparseVector,
  type PineconeClientFactory,
  QdrantAdapter,
  type QdrantConfig as QdrantAdapterConfig,
  type QdrantDistance,
  type QdrantIndexOptions,
  type QdrantQuantization,
  type QdrantSearchParams,
  type QdrantClientFactory,
  WeaviateAdapter,
  type WeaviateConfig as WeaviateAdapterConfig,
  type WeaviateClientFactory,
  AstraDBAdapter,
  type AstraDBConfig,
  UpstashVectorAdapter,
  type UpstashVectorConfig,
  CloudflareVectorizeAdapter,
  type CloudflareVectorizeConfig as CloudflareAdapterConfig,
  // Database adapters
  PgvectorAdapter,
  type PgvectorConfig as PgvectorAdapterConfig,
  type PgvectorSSLConfig,
  type PgvectorIndexType,
  type PgvectorIndexOptions,
  ElasticsearchAdapter,
  type ElasticsearchConfig as ElasticsearchAdapterConfig,
  OpenSearchAdapter,
  type OpenSearchConfig as OpenSearchAdapterConfig,
  type OpenSearchClient,
  MongoDBAtlasAdapter,
  type MongoDBAtlasConfig,
  RedisVectorAdapter,
  type RedisVectorConfig,
  type RedisIndexAlgorithm,
  type RedisIndexOptions,
  // Embedded/Local adapters
  ChromaAdapter,
  type ChromaConfig as ChromaAdapterConfig,
  FaissAdapter,
  type FaissConfig as FaissAdapterConfig,
  SQLiteVSSAdapter,
  LibSQLAdapter,
  type LibSQLConfig as LibSQLAdapterConfig,
  DuckDBAdapter,
  LanceDBAdapter,
  // Enterprise adapters
  AzureAISearchAdapter,
  type AzureAISearchConfig as AzureSearchAdapterConfig,
  VertexVectorSearchAdapter,
  type VertexVectorSearchConfig as VertexSearchAdapterConfig,
  MilvusAdapter,
  type MilvusConfig as MilvusAdapterConfig,
  type MilvusIndexType,
  type MilvusIndexParams,
  type MilvusSearchParams,
  CouchbaseAdapter,
  type CouchbaseConfig as CouchbaseAdapterConfig,
  ZillizAdapter,
  type ZillizConfig as ZillizAdapterConfig,
} from "./vector/index.js";

// Re-export vector types
export type {
  VectorStoreType,
  VectorMetadata,
  VectorSearchResult,
  VectorStoreConfig as VectorAdapterStoreConfig,
  CreateIndexOptions,
  SearchOptions,
  VectorEntry,
  IndexInfo,
  IndexStats,
  BatchOperationResult,
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
  EmbeddingProviderFactory,
  EmbeddingProviderRegistry,
  // Provider implementations
  OpenAIEmbeddingProvider,
  CohereEmbeddingProvider,
  VoyageEmbeddingProvider,
  // Convenience functions
  createEmbeddingProvider,
  embedText,
  embedTexts,
  // Constants
  EMBEDDING_MODELS,
  EMBEDDING_PRESETS,
  getEmbeddingModelInfo,
  getModelsForProvider,
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
  // Core MCP ecosystem
  // Simplified MCP exports
  initializeMCPEcosystem,
  listMCPs,
  executeMCP,
  getMCPStats,
  mcpLogger,
  // HTTP Transport utilities
  HTTPRateLimiter,
  RateLimiterManager,
  globalRateLimiterManager,
  DEFAULT_RATE_LIMIT_CONFIG,
  DEFAULT_HTTP_RETRY_CONFIG,
  isRetryableStatusCode,
  isRetryableHTTPError,
  withHTTPRetry,
  // OAuth Authentication
  InMemoryTokenStorage,
  FileTokenStorage,
  isTokenExpired,
  calculateExpiresAt,
  NeuroLinkOAuthProvider,
  createOAuthProviderFromConfig,
  // Circuit Breaker
  MCPCircuitBreaker,
  CircuitBreakerManager,
  globalCircuitBreakerManager,
} from "./mcp/index.js";

export type {
  McpMetadata,
  DiscoveredMcp,
  // HTTP Transport types
  RateLimitConfig,
  HTTPRetryConfig,
  OAuthTokens,
  TokenStorage,
  MCPOAuthConfig,
  OAuthClientInformation,
  AuthorizationUrlResult,
  TokenExchangeRequest,
} from "./types/mcpTypes.js";

export type {
  ExecutionContext,
  ToolInfo,
  ToolExecutionResult,
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
  TextGenerationOptions,
  TextGenerationResult,
  AnalyticsData,
  EvaluationData,
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
