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

// Config Manager export
export { NeuroLinkConfigManager as ConfigManager } from "./config/configManager.js";
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
  LangfuseSpanAttributes,
  ObservabilityConfig,
  OpenTelemetryConfig,
  TraceNameFormat,
} from "./types/observability.js";

export { buildObservabilityConfigFromEnv } from "./utils/observabilityHelpers.js";

import {
  createContextEnricher,
  flushOpenTelemetry,
  // Enhanced context and tracing
  getLangfuseContext,
  getLangfuseHealthStatus,
  getLangfuseSpanProcessor,
  // NEW EXPORTS - External TracerProvider Support
  getSpanProcessors,
  getTracer,
  getTracerProvider,
  initializeOpenTelemetry,
  isOpenTelemetryInitialized,
  isUsingExternalTracerProvider,
  setLangfuseContext,
  shutdownOpenTelemetry,
} from "./services/server/ai/observability/instrumentation.js";
import {
  getTelemetryStatus as getStatus,
  initializeTelemetry as init,
} from "./telemetry/index.js";

export {
  initializeOpenTelemetry,
  shutdownOpenTelemetry,
  flushOpenTelemetry,
  getLangfuseHealthStatus,
  setLangfuseContext,
  getLangfuseSpanProcessor,
  getTracerProvider,
  isOpenTelemetryInitialized,
  // NEW EXPORTS - External TracerProvider Support
  getSpanProcessors,
  createContextEnricher,
  isUsingExternalTracerProvider,
  // Enhanced context and tracing
  getLangfuseContext,
  getTracer,
};

// Analytics Middleware exports
export {
  clearAnalyticsMetrics,
  createAnalyticsMiddleware,
  getAnalyticsMetrics,
} from "./middleware/builtin/analytics.js";
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
  // MCP Server Factory
  createMCPServer,
  createOAuthProviderFromConfig,
  DEFAULT_HTTP_RETRY_CONFIG,
  DEFAULT_RATE_LIMIT_CONFIG,
  executeMCP,
  FileTokenStorage,
  getMCPStats,
  getServerInfo,
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
  validateServerTools,
  validateTool as validateMCPTool,
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
export { logger } from "./utils/logger.js";

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

// ============================================================================
// WORKFLOW ENGINE - Multi-Model Orchestration with Judge Scoring
// ============================================================================

/**
 * Workflow Engine for multi-model ensembles with judge-based evaluation
 *
 * Enables sophisticated AI orchestration patterns:
 * - Ensemble execution (parallel multi-model)
 * - Chain execution (sequential fallback)
 * - Adaptive execution (tier-based quality/cost optimization)
 * - Multi-judge voting for consensus
 *
 * @example
 * ```typescript
 * import { neurolink, CONSENSUS_3_WORKFLOW } from '@juspay/neurolink';
 *
 * // Use workflow via generate() with workflowConfig option
 * const result = await neurolink.generate({
 *   input: { text: 'Explain quantum computing' },
 *   workflowConfig: CONSENSUS_3_WORKFLOW,
 * });
 *
 * console.log('Best response:', result.content);
 * console.log('Selected model:', result.workflow?.selectedModel);
 * console.log('Total time:', result.workflow?.metrics?.totalTime);
 * ```
 */

// Core workflow types
export type {
  WorkflowConfig,
  WorkflowResult,
  ModelConfig,
  JudgeConfig,
  ModelGroup,
  EnsembleResponse,
  JudgeScores,
  MultiJudgeScores,
  WorkflowType,
  ExecutionStrategy,
  WorkflowValidationResult,
} from "./workflow/types.js";

// Workflow execution
export { runWorkflow } from "./workflow/core/workflowRunner.js";
export type { RunWorkflowOptions } from "./workflow/core/workflowRunner.js";

// Workflow registry
export {
  registerWorkflow,
  getWorkflow,
  listWorkflows,
  clearRegistry as clearWorkflowRegistry,
} from "./workflow/core/workflowRegistry.js";

// Pre-built workflows - Consensus
export {
  CONSENSUS_3_WORKFLOW,
  CONSENSUS_3_FAST_WORKFLOW,
  createConsensus3WithPrompt,
} from "./workflow/workflows/consensusWorkflow.js";

// Pre-built workflows - Fallback
export {
  FAST_FALLBACK_WORKFLOW,
  AGGRESSIVE_FALLBACK_WORKFLOW,
} from "./workflow/workflows/fallbackWorkflow.js";

// Pre-built workflows - Multi-judge
export {
  MULTI_JUDGE_5_WORKFLOW,
  MULTI_JUDGE_3_WORKFLOW,
  createMultiJudgeWorkflow,
} from "./workflow/workflows/multiJudgeWorkflow.js";

// Pre-built workflows - Adaptive
export {
  QUALITY_MAX_WORKFLOW,
  SPEED_FIRST_WORKFLOW,
  BALANCED_ADAPTIVE_WORKFLOW,
  createAdaptiveWorkflow,
} from "./workflow/workflows/adaptiveWorkflow.js";

// Validation and metrics
export { validateWorkflow } from "./workflow/utils/workflowValidation.js";

export {
  calculateModelMetrics,
  compareWorkflows,
  generateSummaryStats,
} from "./workflow/utils/workflowMetrics.js";

// Workflow constants
export {
  WORKFLOW_ENGINE_VERSION,
  DEFAULT_SCORE_SCALE,
} from "./workflow/index.js";

// ============================================================================
// SERVER ADAPTERS - HTTP API Framework Integration
// ============================================================================

// Server Types
export type {
  AgentExecuteRequest,
  AgentExecuteResponse,
  AuthConfig,
  AuthenticatedUser,
  AuthResult,
  AuthStrategy,
  BodyParserConfig,
  CacheConfig,
  CacheEntry,
  CacheStore,
  CORSConfig,
  // Route Types
  CreateRoutesOptions,
  DataEvent,
  DataStreamEvent,
  DataStreamEventType,
  DataStreamResponseConfig,
  DataStreamWriter,
  DataStreamWriterConfig,
  // Error Types
  ErrorCategoryType,
  ErrorEvent,
  ErrorResponse,
  ErrorSeverityType,
  FinishEvent,
  HealthResponse,
  HttpMethod,
  LoggingConfig,
  MCPServerStatusResponse,
  MiddlewareDefinition,
  MiddlewareHandler,
  OpenAPIGeneratorConfig,
  OpenAPISpec,
  PropertySchema,
  RateLimitConfig as ServerRateLimitConfig,
  RateLimitMiddlewareConfig,
  RateLimitStore,
  ReadyResponse,
  RequiredServerAdapterConfig,
  RouteDefinition,
  RouteGroup,
  RouteHandler,
  ServerAdapterConfig,
  ServerAdapterErrorCodeType,
  ServerAdapterErrorContext,
  ServerAdapterEvents,
  ServerAdapterFactoryOptions,
  ServerContext,
  ServerFramework,
  ServerResponse,
  ServerStatus,
  SSEWriteOptions,
  StreamingConfig,
  TextDeltaEvent,
  TextEndEvent,
  TextStartEvent,
  ToolCallEvent,
  ToolExecuteRequest,
  ToolExecuteResponse,
  ToolResultEvent,
  ValidationConfig,
  ValidationResult,
  ValidationSchema,
  WebSocketAuthConfig,
  // WebSocket Types
  WebSocketConfig,
  WebSocketConnection,
  WebSocketHandler,
  WebSocketMessage,
  WebSocketMessageType,
} from "./server/index.js";
/**
 * Server Adapters for exposing NeuroLink as HTTP APIs
 *
 * Supports multiple frameworks: Hono, Express, Fastify, Koa
 *
 * @example
 * ```typescript
 * import { NeuroLink } from '@juspay/neurolink';
 * import { createServer } from '@juspay/neurolink/server';
 *
 * const neurolink = new NeuroLink({ provider: 'openai' });
 * const server = await createServer(neurolink, {
 *   framework: 'hono',
 *   config: { port: 3000 }
 * });
 * await server.start();
 * ```
 */
export {
  // Validation
  AgentExecuteRequestSchema,
  AlreadyRunningError,
  AuthenticationError,
  AuthorizationError,
  // Framework Adapters
  BaseServerAdapter,
  ConfigurationError,
  // Routes
  createAgentRoutes,
  createAgentWebSocketHandler,
  createAllRoutes,
  // Middleware
  createAuthMiddleware,
  createCacheInvalidator,
  createCacheMiddleware,
  createCompressionMiddleware,
  createDataStreamResponse,
  // Streaming
  createDataStreamWriter,
  createErrorHandlingMiddleware,
  createErrorResponse,
  createFieldValidator,
  createHealthRoutes,
  createLoggingMiddleware,
  createMCPRoutes,
  createMemoryRoutes,
  createNDJSONHeaders,
  createOpenAPIGenerator,
  createRateLimitMiddleware,
  createRequestIdMiddleware,
  createRequestValidationMiddleware,
  createRoleMiddleware,
  createSecurityHeadersMiddleware,
  // Server Factory
  createServer,
  createSlidingWindowRateLimitMiddleware,
  createSSEHeaders,
  createTimingMiddleware,
  createToolRoutes,
  DataStreamResponse,
  // Error Constants
  ErrorCategory,
  ErrorRecoveryStrategies,
  ErrorSeverity,
  ExpressServerAdapter,
  FastifyServerAdapter,
  generateOpenAPIFromConfig,
  generateOpenAPISpec,
  HandlerError,
  HonoServerAdapter,
  InMemoryCacheStore,
  InMemoryRateLimitStore,
  InvalidAuthenticationError,
  KoaServerAdapter,
  MissingDependencyError,
  NotRunningError,
  // OpenAPI
  OpenAPIGenerator,
  pipeAsyncIterableToDataStream,
  RateLimitError,
  RouteConflictError,
  RouteNotFoundError,
  registerAllRoutes,
  // Errors
  ServerAdapterError,
  ServerAdapterErrorCode,
  ServerAdapterFactory,
  ServerNameParamSchema,
  ServerRateLimitError,
  ServerStartError,
  ServerStopError,
  ServerValidationError,
  SessionIdParamSchema,
  StreamAbortedError,
  StreamingError,
  TimeoutError,
  ToolArgumentsSchema,
  ToolExecuteRequestSchema,
  ToolNameParamSchema,
  ToolSearchQuerySchema,
  ValidationError,
  validateParams,
  validateQuery,
  validateRequest,
  WebSocketConnectionError,
  // WebSocket
  WebSocketConnectionManager,
  WebSocketError,
  WebSocketMessageRouter,
  wrapError,
} from "./server/index.js";

// ============================================================================
// RAG DOCUMENT PROCESSING - Retrieval-Augmented Generation
// ============================================================================

// Export RAG types
export type {
  // Chunker configs
  BaseChunkerConfig,
  BM25Result,
  CharacterChunkerConfig,
  Chunk,
  ChunkingStrategy,
  ChunkMetadata,
  ChunkParams,
  CitationFormat,
  // Context
  ContextAssemblyOptions,
  ContextWindow,
  CSVLoaderOptions,
  // Document types
  DocumentType,
  EmbeddingModelConfig,
  ExtractionResult,
  // Metadata types
  ExtractParams,
  GenerationModelConfig,
  GraphChunk,
  GraphEdge,
  GraphEmbedding,
  // Graph RAG
  GraphNode,
  GraphQueryParams,
  GraphRAGConfig,
  GraphStats,
  HTMLChunkerConfig,
  // Hybrid search
  HybridSearchConfig,
  HybridSearchResult,
  IngestOptions,
  JSONChunkerConfig,
  LaTeXChunkerConfig,
  // Loader options
  LoaderOptions,
  MarkdownChunkerConfig,
  MDocumentConfig,
  MetadataFilter,
  PDFLoaderOptions,
  PipelineStats,
  QueryOptions as RAGQueryOptions,
  // CLI
  RAGCommandArgs,
  // RAG Integration
  RAGConfig,
  // Pipeline
  RAGPipelineConfig,
  RAGResponse,
  RankedNode,
  RecursiveChunkerConfig,
  // Reranker
  RerankerConfig,
  RerankerOptions,
  RerankResult,
  SemanticChunkerConfig,
  SentenceChunkerConfig,
  TokenChunkerConfig,
  VectorQueryResponse,
  VectorQueryResult,
  VectorQueryToolConfig,
  // Vector types
  VectorStore,
  WebLoaderOptions,
} from "./rag/index.js";
/**
 * RAG (Retrieval-Augmented Generation) Document Processing
 *
 * Comprehensive RAG system with document loading, chunking, embedding,
 * retrieval, and context assembly capabilities.
 *
 * @example
 * ```typescript
 * import {
 *   MDocument,
 *   loadDocument,
 *   RAGPipeline,
 *   ChunkerRegistry
 * } from '@juspay/neurolink';
 *
 * // Load and process a document
 * const doc = await loadDocument('/path/to/document.md');
 * await doc.chunk({ strategy: 'markdown', config: { maxSize: 1000 } });
 *
 * // Use the full RAG pipeline
 * const pipeline = new RAGPipeline({
 *   embeddingModel: { provider: 'openai', modelName: 'text-embedding-3-small' },
 *   generationModel: { provider: 'openai', modelName: 'gpt-4o-mini' }
 * });
 * await pipeline.ingest(['./docs/*.md']);
 * const response = await pipeline.query('What are the key features?');
 * console.log(response.answer);
 * ```
 */
export {
  // Pipeline
  assembleContext,
  // Reranker
  batchRerank,
  // Chunking
  CharacterChunker,
  ChunkerRegistry,
  CohereRelevanceScorer,
  CrossEncoderReranker,
  // Document Processing
  CSVLoader,
  chunkText,
  createChunker,
  createContextWindow,
  // Retrieval
  createHybridSearch,
  createRAGPipeline,
  createVectorQueryTool,
  // Resilience
  executeWithCircuitBreaker,
  // Metadata Extraction
  extractMetadata,
  formatContextWithCitations,
  // Graph RAG
  GraphRAG,
  getAvailableStrategies,
  getCircuitBreaker,
  getDefaultChunkerConfig,
  getRecommendedStrategy,
  HTMLChunker,
  HTMLLoader,
  InMemoryBM25Index,
  InMemoryVectorStore,
  JSONChunker as RAGJSONChunker,
  JSONLoader,
  LaTeXChunker,
  LLMMetadataExtractor,
  linearCombination,
  loadDocument,
  loadDocuments,
  MarkdownChunker,
  MarkdownLoader,
  MDocument,
  PDFLoader,
  // RAG Integration for generate/stream
  prepareRAGTool,
  processDocument,
  RAGCircuitBreaker,
  type RAGCircuitBreakerConfig,
  type RAGCircuitBreakerEvents,
  RAGCircuitBreakerManager,
  type RAGCircuitBreakerStats,
  RAGPipeline,
  RAGRetryHandler,
  RecursiveChunker,
  ragCircuitBreakerManager,
  reciprocalRankFusion,
  rerank,
  SemanticChunker,
  SentenceChunker,
  simpleRerank,
  summarizeContext,
  TextLoader,
  TokenChunker,
  WebLoader,
} from "./rag/index.js";
