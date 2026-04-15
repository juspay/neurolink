/**
 * NeuroLink AI Toolkit
 *
 * A unified AI provider interface with support for 14+ providers,
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
 *   model: 'gemini-3-flash-preview'
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

export { GoogleTTSHandler } from "./adapters/tts/googleTTSHandler.js";
// Config Manager export
export { NeuroLinkConfigManager as ConfigManager } from "./config/configManager.js";

// Core Infrastructure exports (factory + registry patterns)
export {
  BaseFactory,
  BaseRegistry,
  NeuroLinkFeatureError,
  createErrorFactory,
  withRetry,
  TypedEventEmitter,
} from "./core/infrastructure/index.js";
// ============================================================================
// CLIENT SDK EXPORTS - Type-safe API access for browser and Node.js
// Note: React hooks are NOT re-exported here. Import from '@juspay/neurolink/client'.
// ============================================================================

export {
  // HTTP Client
  NeuroLinkClient,
  createClient,
  NeuroLinkApiError,
  // AI SDK Adapter
  NeuroLinkLanguageModel,
  NeuroLinkAIProvider,
  createNeuroLinkProvider,
  createNeuroLinkModel,
  createStreamingResponse,
  neurolink as neuroLinkAIInstance,
  // Interceptors
  createApiKeyAuthInterceptor,
  createBearerAuthInterceptor,
  createDynamicAuthInterceptor,
  createLoggingInterceptor,
  createRetryInterceptor,
  createRateLimitInterceptor,
  createRequestTransformInterceptor,
  createResponseTransformInterceptor,
  createCacheInterceptor,
  createTimeoutInterceptor,
  createErrorHandlerInterceptor,
  composeMiddleware,
  conditionalMiddleware,
  // Streaming Client
  SSEClient,
  WebSocketStreamingClient,
  createStreamingClient,
  createAsyncStream,
  collectStream,
  // Authentication
  OAuth2TokenManager,
  JWTTokenManager,
  createApiKeyMiddleware,
  createBearerTokenMiddleware,
  createTokenManagerMiddleware,
  createAuthWithRetryMiddleware,
  createMultiAuthMiddleware,
  OAuth2Error,
  OAuth2AuthError,
  TokenRefreshError,
  decodeJWTPayload,
  isJWTExpired,
  getJWTExpiry,
  getApiKeyFromEnv,
  // Errors
  ErrorCode as ClientErrorCode,
  NeuroLinkError as ClientNeuroLinkError,
  HttpError,
  ClientRateLimitError,
  ClientValidationError,
  ClientAuthenticationError,
  ClientAuthorizationError,
  NotFoundError,
  ClientNetworkError,
  ClientTimeoutError,
  ClientConnectionError,
  AbortError,
  ClientConfigurationError,
  StreamError,
  ClientProviderError,
  ContextLengthError,
  ContentFilterError,
  createErrorFromResponse,
  createErrorFromNative,
  mapStatusToErrorCode,
  isRetryableStatus,
  isRetryableError,
  isNeuroLinkError,
  isApiError,
} from "./client/index.js";

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
// Error utilities
export { isAbortError } from "./utils/errorHandling.js";
// Pricing utilities
export { calculateCost, hasPricing } from "./utils/pricing.js";
// Utility exports
export {
  getAvailableProviders,
  getBestProvider,
  isValidProvider,
} from "./utils/providerUtils.js";
// TTS utilities
export { TTSProcessor } from "./utils/ttsProcessor.js";

// Main NeuroLink wrapper class and diagnostic types
import { NeuroLink } from "./neurolink.js";
export { NeuroLink };

// Observability configuration types

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
  isLangfuseInternalSpan,
  isOpenTelemetryInitialized,
  isUsingExternalTracerProvider,
  langfuseShouldExportSpan,
  runWithCurrentLangfuseContext,
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
  // Host-processor filter helpers — reuse NeuroLink's internal-span filtering
  // when the host app registers its own LangfuseSpanProcessor.
  isLangfuseInternalSpan,
  langfuseShouldExportSpan,
  // Enhanced context and tracing
  getLangfuseContext,
  getTracer,
  // ALS context propagation helper
  runWithCurrentLangfuseContext,
};

// Analytics Middleware exports
export {
  clearAnalyticsMetrics,
  createAnalyticsMiddleware,
  getAnalyticsMetrics,
} from "./middleware/builtin/analytics.js";
export { createLifecycleMiddleware } from "./middleware/builtin/lifecycle.js";
export { MiddlewareFactory } from "./middleware/factory.js";
export { ExporterRegistry } from "./observability/exporterRegistry.js";
export { NoOpExporter } from "./observability/exporters/baseExporter.js";
// Observability modules and types
export {
  getMetricsAggregator,
  MetricsAggregator,
  resetMetricsAggregator,
} from "./observability/metricsAggregator.js";
export {
  AlwaysSampler,
  NeverSampler,
} from "./observability/sampling/samplers.js";
export { TokenTracker } from "./observability/tokenTracker.js";
export { GENAI_ATTRIBUTES, SpanStatus, SpanType } from "./types/index.js";
export { SpanSerializer } from "./observability/utils/spanSerializer.js";
// Middleware exports

// Version
export const VERSION = "1.0.0";

// ============================================================================
// Dynamic Arguments
// ============================================================================
//
// Dynamic arguments let you pass functions instead of static values to
// generate() and stream(). Resolution happens automatically before
// provider dispatch. Pass dynamicContext inline for per-request
// user/tenant/session context that dynamic functions can read.
//
// Example:
//   await neurolink.generate({
//     input: { text: "Hello" },
//     model: (ctx) => ctx.requestContext.tenant?.plan === "enterprise"
//       ? "gpt-4o" : "gpt-4o-mini",
//     dynamicContext: { tenant: { id: "t1", plan: "enterprise" } },
//   });
// ============================================================================

/**
 * Quick start factory function for creating AI provider instances.
 *
 * Creates a configured AI provider instance ready for immediate use.
 * Supports 14+ providers: OpenAI, Anthropic, Google AI Studio,
 * Google Vertex, AWS Bedrock, AWS SageMaker, Azure OpenAI, Hugging Face,
 * LiteLLM, Mistral, Ollama, OpenAI Compatible, OpenRouter, and more.
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
 * const provider = await createAIProvider('vertex', 'gemini-3-flash-preview');
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
  CircuitBreakerOpenError,
  MCPCircuitBreaker,
  mcpLogger,
  NeuroLinkOAuthProvider,
  RateLimiterManager,
  validateServerTools,
  validateTool as validateMCPTool,
  withHTTPRetry,
  // Core MCP Components
  MCPToolRegistry,
  ExternalServerManager,
  MCPClientFactory,
  // MCP Enhancements - Routing, Caching, Batching
  ToolRouter,
  createToolRouter,
  DEFAULT_ROUTER_CONFIG,
  ToolCache,
  createToolCache,
  DEFAULT_CACHE_CONFIG,
  ToolResultCache,
  createToolResultCache,
  RequestBatcher,
  ToolCallBatcher,
  createRequestBatcher,
  createToolCallBatcher,
  DEFAULT_BATCH_CONFIG,
  // MCP Enhancements - Tool Annotations
  inferAnnotations,
  createAnnotatedTool,
  validateAnnotations,
  filterToolsByAnnotations,
  mergeAnnotations,
  getAnnotationSummary,
  requiresConfirmation,
  isSafeToRetry,
  getToolSafetyLevel,
  // MCP Enhancements - Elicitation
  ElicitationManager,
  globalElicitationManager,
  // MCP Enhancements - Enhanced Tool Discovery
  EnhancedToolDiscovery,
  // MCP Enhancements - Registry Client
  MCPRegistryClient,
  globalMCPRegistryClient,
  getWellKnownServer,
  getAllWellKnownServers,
  // MCP Enhancements - Server Base
  MCPServerBase,
  // MCP Enhancements - Multi-Server Manager
  MultiServerManager,
  globalMultiServerManager,
  // MCP Enhancements - Agent Exposure
  AgentExposureManager,
  exposeAgentAsTool,
  exposeAgentsAsTools,
  exposeWorkflowAsTool,
  exposeWorkflowsAsTools,
  globalAgentExposureManager,
  // MCP Enhancements - Server Capabilities
  ServerCapabilitiesManager,
  createTextResource,
  createJsonResource,
  createPrompt,
  // MCP Enhancements - Tool Converter
  neuroLinkToolToMCP,
  mcpToolToNeuroLink,
  batchConvertToMCP,
  batchConvertToNeuroLink,
  sanitizeToolName,
  validateToolName,
  createToolFromFunction,
  mcpProtocolToolToServerTool,
  serverToolToMCPProtocol,
  TOOL_COMPATIBILITY,
  // MCP Enhancements - Tool Integration
  ToolIntegrationManager,
  globalToolIntegrationManager,
  wrapToolWithElicitation,
  wrapToolsWithElicitation,
  createElicitationContext,
  confirmationMiddleware,
  validationMiddleware,
  loggingMiddleware,
  createRetryMiddleware,
  createTimeoutMiddleware,
  createToolMiddlewareChain,
  // MCP Enhancements - Elicitation Protocol
  ElicitationProtocolAdapter,
  globalElicitationProtocol,
  isElicitationProtocolMessage,
  protocolMessageToElicitation,
  elicitationResponseToProtocol,
  createElicitationRequest,
  createElicitationResponse,
  createElicitationCancel,
  createTextInputRequest,
  createSelectRequest,
  createConfirmationRequest,
  createFormRequest,
} from "./mcp/index.js";

export { logger } from "./utils/logger.js";
export { getPoolStats } from "./utils/redis.js";

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
// EVALUATION SYSTEM - Comprehensive Response Evaluation & Scoring
// ============================================================================

/**
 * Evaluation System Exports
 *
 * A comprehensive evaluation framework for assessing AI response quality,
 * with support for RAGAS-style metrics, custom scorers, and pipeline-based evaluation.
 *
 * @example
 * ```typescript
 * import {
 *   Evaluator,
 *   ScorerRegistry,
 *   EvaluationPipeline,
 *   createFaithfulnessScorer,
 *   createAnswerRelevancyScorer,
 * } from '@juspay/neurolink';
 *
 * // Create a pipeline with multiple scorers
 * const pipeline = new EvaluationPipeline({
 *   scorers: [
 *     createFaithfulnessScorer({ model: 'gpt-4' }),
 *     createAnswerRelevancyScorer({ model: 'gpt-4' }),
 *   ],
 * });
 *
 * // Run evaluation
 * const result = await pipeline.evaluate({
 *   question: 'What is quantum computing?',
 *   answer: 'Quantum computing uses quantum mechanics...',
 *   context: ['Quantum computing is a type of computation...'],
 * });
 * ```
 */
export {
  // Main Evaluator
  Evaluator,
  // Factory and Registry
  EvaluationAggregator,
  EvaluatorFactory,
  getEvaluatorFactory,
  getEvaluatorRegistry,
  // Error utilities
  evaluationErrors,
  isRetryableEvaluationError,
  isEvaluationError,
  createEvaluationFailedError,
  createParseError,
  createStrategyNotFoundError,
  createProviderError,
  createMaxRetriesExceededError,
  createBatchEvaluationError,
  createConfigurationError,
  contextToErrorContext,
  // Hooks
  createLangfuseAdapter,
  createMockLangfuseClient,
  startLangfuseAdapter,
  createConsoleLoggerHook,
  createMetricsCollectorHook,
  ObservabilityHooks,
  observabilityHooks,
  pipelineToSpanAttributes,
  scorerToSpanAttributes,
  // Pipeline
  createAndInitializePipeline,
  createPipeline,
  EvaluationPipeline,
  PipelineBuilder,
  Pipelines,
  CODE_GENERATION_PIPELINE,
  COMPREHENSIVE_PIPELINE,
  CUSTOMER_SUPPORT_PIPELINE,
  getPreset,
  getPresetNames,
  MINIMAL_PIPELINE,
  QUALITY_PIPELINE,
  RAG_PIPELINE,
  SAFETY_PIPELINE,
  SUMMARIZATION_PIPELINE,
  // Strategies
  BatchStrategy,
  createBatchStrategy,
  evaluateBatch,
  streamBatchEvaluation,
  createSamplingStrategy,
  DEFAULT_SAMPLING_CONFIG,
  SamplingStrategies,
  SamplingStrategy,
  // Reporting
  createMetricsCollector,
  globalMetricsCollector,
  MetricsCollector,
  createReportGenerator,
  ReportGenerator,
  Reports,
  // Scorers - Base
  BaseScorer,
  DEFAULT_SCORE_SCALE as EVAL_DEFAULT_SCORE_SCALE,
  // Scorers - Custom utilities
  composeScorers,
  createConditionalScorer,
  createFunctionScorer,
  createInvertedScorer,
  createKeywordScorer,
  createRegexScorer,
  createScorerMetadata,
  createSimpleLengthScorer,
  // Scorers - LLM-based
  AnswerRelevancyScorer,
  createAnswerRelevancyScorer,
  BaseLLMScorer,
  DEFAULT_LLM_SCORER_CONFIG,
  BiasDetectionScorer,
  createBiasDetectionScorer,
  ContextPrecisionScorer,
  createContextPrecisionScorer,
  ContextRelevancyScorer,
  createContextRelevancyScorer,
  createFaithfulnessScorer,
  FaithfulnessScorer,
  createHallucinationScorer,
  HallucinationScorer,
  createPromptAlignmentScorer,
  PromptAlignmentScorer,
  createSummarizationScorer,
  SummarizationScorer,
  createToneConsistencyScorer,
  ToneConsistencyScorer,
  createToxicityScorer,
  ToxicityScorer,
  // Scorers - Rule-based
  BaseRuleScorer,
  DEFAULT_RULE_SCORER_CONFIG,
  createContentSimilarityScorer,
  createFormatScorer,
  FormatScorerPresets,
  createKeywordCoverageScorer,
  createLengthScorer,
  LengthScorerPresets,
  // Scorers - Builder & Registry
  ScorerBuilder,
  Scorers,
  ScorerRegistry,
} from "./evaluation/index.js";

// ============================================================================
// BACKWARD COMPATIBILITY: Legacy generateText Function Exports
// ============================================================================

// Export legacy types for backward compatibility

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

// Workflow registry
export {
  clearRegistry as clearWorkflowRegistry,
  getWorkflow,
  listWorkflows,
  registerWorkflow,
} from "./workflow/core/workflowRegistry.js";
// Workflow execution
export { runWorkflow } from "./workflow/core/workflowRunner.js";
// Workflow constants
export {
  DEFAULT_SCORE_SCALE,
  WORKFLOW_ENGINE_VERSION,
} from "./workflow/index.js";
// Core workflow types
export {
  calculateModelMetrics,
  compareWorkflows,
  generateSummaryStats,
} from "./workflow/utils/workflowMetrics.js";
// Validation and metrics
export { validateWorkflow } from "./workflow/utils/workflowValidation.js";

// Pre-built workflows - Adaptive
export {
  BALANCED_ADAPTIVE_WORKFLOW,
  createAdaptiveWorkflow,
  QUALITY_MAX_WORKFLOW,
  SPEED_FIRST_WORKFLOW,
} from "./workflow/workflows/adaptiveWorkflow.js";
// Pre-built workflows - Consensus
export {
  CONSENSUS_3_FAST_WORKFLOW,
  CONSENSUS_3_WORKFLOW,
  createConsensus3WithPrompt,
} from "./workflow/workflows/consensusWorkflow.js";
// Pre-built workflows - Fallback
export {
  AGGRESSIVE_FALLBACK_WORKFLOW,
  FAST_FALLBACK_WORKFLOW,
} from "./workflow/workflows/fallbackWorkflow.js";
// Pre-built workflows - Multi-judge
export {
  createMultiJudgeWorkflow,
  MULTI_JUDGE_3_WORKFLOW,
  MULTI_JUDGE_5_WORKFLOW,
} from "./workflow/workflows/multiJudgeWorkflow.js";

// ============================================================================
// SERVER ADAPTERS - HTTP API Framework Integration
// ============================================================================

// Server Types

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
  RAGCircuitBreakerManager,
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

// Legacy RAGAS evaluation classes are now exported from the unified
// evaluation block above (via ./evaluation/index.js barrel).
// ContextBuilder is the only class not covered by the barrel export.
export { ContextBuilder } from "./evaluation/contextBuilder.js";

// ============================================================================
// AUTHENTICATION PROVIDERS - Multi-provider Auth Integration
// ============================================================================
// Single-sourced from ./auth/index.js.  Only aliases that differ from the
// canonical export name are listed explicitly; everything else is re-exported
// as-is.

export {
  // Factory & Registry
  AuthProviderFactory,
  createAuthProvider,
  AuthProviderRegistry,
  // Unified error factory
  AuthError as AuthErrorFactory,
  AuthErrorCodes,
  // Base Provider
  BaseAuthProvider,
  InMemorySessionStorage,
  AuthProviderError,
  // Auth Middleware (aliased to avoid conflict with server createAuthMiddleware)
  createAuthMiddleware as createAuthProviderMiddleware,
  createRBACMiddleware,
  createProtectedMiddleware,
  createExpressAuthMiddleware,
  createRequestContext,
  extractToken,
  AuthMiddlewareError,
  AuthMiddlewareErrorCodes,
  // Rate Limiting Middleware
  UserRateLimiter,
  MemoryRateLimitStorage,
  RedisRateLimitStorage,
  createRateLimitByUserMiddleware,
  createAuthenticatedRateLimitMiddleware,
  createRateLimitStorage,
  // Session Management
  SessionManager,
  MemorySessionStorage,
  RedisSessionStorage,
  createSessionStorage,
  // Auth Context
  AuthContextHolder,
  globalAuthContext,
  getAuthContext,
  getCurrentUser,
  getCurrentSession,
  isAuthenticated,
  hasRole,
  hasAnyRole,
  hasPermission,
  hasAllPermissions,
  requireAuth,
  requireRole,
  requirePermission,
  requireUser,
  runWithAuthContext,
  createAuthenticatedContext,
  // Request Context
  RequestContext,
  NEUROLINK_RESOURCE_ID_KEY,
  NEUROLINK_THREAD_ID_KEY,
  // Server Bridge
  createAuthValidatorFromProvider,
} from "./auth/index.js";
