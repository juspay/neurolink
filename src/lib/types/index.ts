/**
 * Centralized type exports for NeuroLink
 */

// Constants and enums
export { AIProviderName } from "../constants/enums.js";
// CLI types
export * from "./cli.js";
// Common utility types
export * from "./common.js";
// Configuration types
export type {
  AnalyticsConfig,
  BackupInfo,
  BackupMetadata,
  CacheConfig,
  ConfigUpdateOptions,
  ConfigValidationResult,
  FallbackConfig,
  MCPEnhancementsConfig,
  NeuroLinkConfig,
  PerformanceConfig,
  RetryConfig,
  ToolConfig,
} from "./configTypes.js";
// External MCP types
export type {
  ExternalMCPConfigValidation,
  ExternalMCPManagerConfig,
  ExternalMCPOperationResult,
  ExternalMCPServerEvents,
  ExternalMCPServerHealth,
  ExternalMCPServerInstance,
  ExternalMCPServerStatus,
  ExternalMCPToolContext,
  ExternalMCPToolInfo,
  ExternalMCPToolResult,
} from "./externalMcp.js";
// Artifact store types
export type {
  ArtifactMeta,
  ArtifactRef,
  ArtifactStore,
} from "./artifactTypes.js";
// MCP output normalizer types
export type {
  McpOutputContext,
  McpOutputNormalizerConfig,
  McpOutputStrategy,
  NormalizedMcpOutput,
} from "./mcpOutputTypes.js";
// MCP domain types
export type {
  AuthorizationUrlResult,
  CircuitBreakerConfig,
  CircuitBreakerEvents,
  CircuitBreakerState,
  CircuitBreakerStats,
  DiscoveredMcp,
  ExternalToolExecutionOptions,
  FlexibleValidationResult,
  HTTPRetryConfig,
  MCPClientResult,
  MCPConnectedServer,
  MCPDiscoveredServer,
  MCPExecutableTool,
  MCPOAuthConfig,
  MCPServerCategory,
  MCPServerConfig,
  MCPServerConnectionStatus,
  MCPServerInfo,
  MCPServerMetadata,
  MCPServerRegistryEntry,
  MCPServerStatus,
  MCPStatus,
  MCPToolInfo,
  MCPToolMetadata,
  MCPTransportType,
  McpMetadata,
  McpRegistry,
  NeuroLinkExecutionContext,
  NeuroLinkMCPServer,
  // Additional MCP types (moved from individual MCP files)
  NeuroLinkMCPTool,
  OAuthClientInformation,
  // HTTP Transport types (OAuth, Rate Limiting, Retry)
  OAuthTokens as McpOAuthTokens,
  RateLimitConfig,
  TokenBucketRateLimitConfig,
  TokenExchangeRequest,
  TokenStorage,
  ToolDiscoveryResult,
  ToolRegistryEvents,
  ToolValidationResult,
} from "./mcpTypes.js";
// Model/Provider domain types
export type {
  ModelCapability,
  ModelFilter,
  ModelPricing,
  ModelResolutionContext,
  ModelStats,
  ModelUseCase,
} from "./providers.js";
// Provider types
export * from "./providers.js";
// Task classification types
export * from "./taskClassificationTypes.js";
// Tool system types
export * from "./tools.js";
// Type aliases - only export non-duplicate types that are commonly used
export type {
  OptionalStandardRecord,
  OptionalValidationSchema,
  StandardRecord,
  ValidationSchema,
  ZodToJsonSchemaInput,
  ZodUnknownSchema,
} from "./typeAliases.js";

// Stream/Tool domain types are exported via wildcard from ./streamTypes.js

// File processor types — re-exported from the single source of truth (processors/base/types.ts)
// Note: RetryConfig renamed to avoid conflict with configTypes.ts RetryConfig
// Note: FileProcessingResult renamed to avoid conflict with fileTypes.ts FileProcessingResult
export type {
  BatchProcessingSummary,
  ExcelWorksheet,
  FailedFileInfo,
  FileInfo,
  FileProcessingError,
  FileProcessingResult as ProcessorFileResult,
  FileProcessorConfig,
  FileWarning,
  JsonTypeGuard,
  OperationResult,
  ProcessedConfig,
  ProcessedExcel,
  ProcessedFileBase,
  ProcessedFileInfo,
  ProcessedHtml,
  ProcessedJson,
  ProcessedMarkdown,
  ProcessedOpenDocument,
  ProcessedRtf,
  ProcessedSourceCode,
  ProcessedSvg,
  ProcessedText,
  ProcessedWord,
  ProcessedYaml,
  ProcessOptions,
  ProcessorInfo,
  ProcessorMatch,
  ProcessorPriorityKey,
  ProcessorPriorityValue,
  RegistryOptions,
  RegistryProcessResult,
  RetryConfig as ProcessorRetryConfig,
  SkippedFileInfo,
  UnsupportedFileError,
} from "../processors/base/types.js";
export { PROCESSOR_PRIORITIES } from "../processors/base/types.js";
// Action types
export type {
  ActionAWSConfig,
  ActionCommentResult,
  ActionEvaluation,
  ActionExecutionResult,
  ActionGoogleCloudConfig,
  ActionInputs,
  ActionInputValidation,
  ActionMultimodalInputs,
  ActionOutput,
  ActionProviderKeys,
  ActionThinkingConfig,
  ActionTokenUsage,
  CliAnalytics,
  CliEvaluation,
  CliResponse,
  CliTokenUsage,
  ProviderKeyMapping,
} from "./actionTypes.js";
// Analytics types - NEW (selective export to avoid ErrorInfo conflict with common.js)
export type {
  AnalyticsData,
  AnalyticsErrorInfo,
  PerformanceMetrics,
  StreamAnalyticsData,
  TokenUsage,
} from "./analytics.js";
// Content types for multimodal support (direct export from canonical source)
export * from "./multimodal.js";
// Authentication types - Multi-provider auth system
export type {
  Auth0Config,
  AuthCacheConfig,
  // Error types
  AuthErrorCode,
  AuthErrorInfo,
  // Backward-compatible alias (was `AuthError as AuthErrorType`)
  AuthErrorInfo as AuthErrorType,
  AuthEventData,
  AuthEventHandler,
  AuthEvents,
  // Event types
  AuthEventType,
  AuthenticatedContext,
  // Health and events
  AuthHealthCheck,
  AuthLifecycle,
  AuthMiddlewareConfig,
  // Middleware
  AuthMiddlewareOptions,
  // Authorization
  AuthorizationResult,
  AuthProviderConfig,
  // Factory types
  AuthProviderFactoryFn,
  AuthProviderHealthCheck,
  AuthProviderHealthStatus,
  // Registry types (moved from AuthProviderRegistry.ts)
  AuthProviderMetadata,
  AuthProviderRegistration,
  // Provider types
  AuthProviderType,
  // Context
  AuthRequestContext,
  AuthRequestHandler,
  AuthSession,
  AuthSessionManager,
  // Composed sub-types
  AuthTokenValidator,
  // User and session
  AuthUser,
  AuthUserAuthorizer,
  AuthUserManager,
  BaseAuthProviderConfig,
  BetterAuthConfig,
  ClerkConfig,
  CognitoConfig,
  CustomAuthConfig,
  FirebaseConfig,
  JWK,
  JWKS,
  JWTConfig,
  KeycloakConfig,
  MastraAuthProvider,
  OAuth2Config,
  PermissionDefinition,
  RBACConfig,
  RBACMiddlewareConfig,
  SessionConfig,
  SessionStorage,
  SessionStorageType,
  // Session types
  SessionValidationResult,
  SupabaseConfig,
  TokenClaims,
  TokenExtractionConfig,
  // Configuration
  TokenExtractionStrategy,
  TokenRefreshResult,
  TokenType,
  TokenValidationConfig,
  // Token types
  TokenValidationResult as AuthTokenValidationResult,
  WorkOSConfig,
} from "./authTypes.js";
// Autoresearch types
export type {
  AutoresearchEmitter,
  AutoresearchErrorEvent,
  AutoresearchEventMap,
  AutoresearchEventName,
  AutoresearchExperimentCompletedEvent,
  AutoresearchExperimentStartedEvent,
  AutoresearchInitializedEvent,
  AutoresearchMetricImprovedEvent,
  AutoresearchPhaseChangedEvent,
  AutoresearchResumedEvent,
  AutoresearchRevertEvent,
  AutoresearchRevertFailedEvent,
  AutoresearchStateUpdatedEvent,
  ExperimentPhase,
  ExperimentRecord,
  ExperimentStats,
  ExperimentStatus,
  ExperimentSummary,
  MemoryMetricConfig,
  MetricConfig,
  MetricDirection,
  PhaseToolPolicy,
  ResearchConfig,
  ResearchState,
  ResearchWorkerConfig,
} from "./autoresearchTypes.js";
export { AUTORESEARCH_DEFAULTS } from "./autoresearchTypes.js";
// Client SDK types (selective export to avoid collisions with existing types)
// Conflicting names are aliased with "Client" prefix.
export type {
  // Agent
  AgentExecuteOptions as ClientAgentExecuteOptions,
  AgentExecuteResult as ClientAgentExecuteResult,
  AgentInfo as ClientAgentInfo,
  ApiError as ClientApiError,
  // Authentication
  AuthConfig as ClientAuthConfig,
  // API response/error (ApiResponse conflicts with typeAliases.ts)
  ClientApiResponse,
  // React hooks
  ClientChatMessage,
  // Core config
  ClientConfig,
  ClientMiddlewareContext,
  ClientOAuth2Config,
  // Provider status (conflicts with providers.ts ProviderStatus)
  ClientProviderStatus,
  // Retry (conflicts with configTypes.ts RetryConfig)
  ClientRetryConfig,
  ClientStreamEvent,
  ClientStreamResult,
  ClientTokenRefreshResult,
  // Generation
  GenerateRequestOptions as ClientGenerateRequestOptions,
  GenerateResponse as ClientGenerateResponse,
  // AI SDK adapter
  LanguageModel as ClientLanguageModel,
  LanguageModelCallOptions as ClientLanguageModelCallOptions,
  LanguageModelResponse as ClientLanguageModelResponse,
  LanguageModelStreamResponse as ClientLanguageModelStreamResponse,
  // Middleware (client HTTP middleware, distinct from AI SDK middleware)
  Middleware as ClientMiddleware,
  MiddlewareRequest as ClientMiddlewareRequest,
  MiddlewareResponse as ClientMiddlewareResponse,
  ModelOptions as ClientModelOptions,
  NeuroLinkProviderOptions,
  RequestOptions as ClientRequestOptions,
  // Voice
  SpeechRecognitionResult as ClientSpeechRecognitionResult,
  SpeechSynthesisOptions as ClientSpeechSynthesisOptions,
  StreamCallbacks as ClientStreamCallbacks,
  // Streaming (StreamResult conflicts with streamTypes.ts)
  StreamEventType as ClientStreamEventType,
  StreamRequestOptions as ClientStreamRequestOptions,
  // Tool (conflicts with tools.ts ToolInfo)
  ToolInfo as ClientToolInfo,
  UseAgentOptions,
  UseAgentReturn,
  UseChatOptions,
  UseChatReturn,
  UseStreamOptions,
  UseStreamReturn,
  UseToolsOptions,
  UseToolsReturn,
  UseVoiceOptions,
  UseVoiceReturn,
  UseWorkflowOptions,
  UseWorkflowReturn,
  WebSocketMessageHandler as ClientWebSocketMessageHandler,
  // WebSocket
  WebSocketOptions as ClientWebSocketOptions,
  WebSocketState as ClientWebSocketState,
  // Workflow
  WorkflowExecuteOptions as ClientWorkflowExecuteOptions,
  WorkflowExecuteResult as ClientWorkflowExecuteResult,
  WorkflowInfo as ClientWorkflowInfo,
  WSClientConfig,
  WSClientEventHandlers,
  WSClientMessage,
  // Dedicated WS client types
  WSClientState,
} from "./clientTypes.js";
// Content types: canonical source is ./multimodal.js (already exported above).
// ./content.js re-exports from multimodal for backward compat but is NOT
// re-exported here to avoid duplicate symbol collisions.
// Context compaction types
export * from "./contextTypes.js";
// Conversation types (selective to avoid collisions)
export type {
  ConversationData,
  ConversationSummary,
  NeurolinkOptions,
  StorageConfig,
} from "./conversation.js";
// Conversation memory manager type
export * from "./conversationMemoryInterface.js";
// Domain factory types
export type {
  DomainConfig,
  DomainConfigOptions,
  DomainEvaluationCriteria,
  DomainTemplate,
  DomainType,
  DomainValidationRule,
} from "./domainTypes.js";
// Error classes
export {
  AuthenticationError,
  AuthorizationError,
  NetworkError,
  RateLimitError,
} from "./errors.js";
// Evaluation types - NEW
export * from "./evaluation.js";
// Evaluation provider types - NEW
export * from "./evaluationProviders.js";
// File reference types
export * from "./fileReferenceTypes.js";
// File detection and processing types
export * from "./fileTypes.js";
// Generate types - NEW (selective export to avoid GenerateResult conflict with cli.js)
export type {
  AdditionalMemoryUser,
  EnhancedGenerateResult,
  EnhancedProvider,
  FactoryEnhancedProvider,
  GenerateOptions,
  GenerateResult as GenerateApiResult, // Renamed to avoid conflict with cli.js GenerateResult
  TextGenerationOptions,
  TextGenerationResult,
  UnifiedGenerationOptions,
} from "./generateTypes.js";
// HITL (Human-in-the-Loop) types
export * from "./hitlTypes.js";
// Middleware Types - Middleware system types
export * from "./middlewareTypes.js";
// Model types - NEW
export * from "./modelTypes.js";
// Proxy types (Claude API format, cloaking, routing, config, stats, server adapters)
export * from "./proxyTypes.js";

// RAG types
export * from "./ragTypes.js";
// Scorer types for evaluation system
export * from "./scorerTypes.js";
// SDK Types - Core types for external developers
// Note: sdkTypes.ts uses selective re-exports internally, so we use wildcard here
// The conflicts were from generateTypes and analytics which are now handled above
export * from "./sdkTypes.js";
// Server adapter types (selective export to avoid naming conflicts)
export type {
  AgentExecuteRequest,
  AgentExecuteResponse,
  AuthConfig as ServerAuthConfig,
  AuthenticatedUser,
  AuthStrategy,
  BodyParserConfig,
  CORSConfig,
  DataStreamWriter,
  EmbedManyRequest,
  EmbedManyResponse,
  EmbedRequest,
  EmbedResponse,
  ErrorCategory,
  ErrorCategoryType,
  ErrorSeverity,
  ErrorSeverityType,
  HealthResponse,
  HttpMethod,
  LoggingConfig,
  MCPServerStatusResponse,
  MiddlewareDefinition,
  MiddlewareHandler,
  RateLimitConfig as ServerRateLimitConfig,
  ReadyResponse,
  RedactionConfig,
  RequiredBodyParserConfig,
  RequiredCORSConfig,
  RequiredLoggingConfig,
  RequiredRateLimitConfig,
  RequiredRedactionConfig,
  RequiredServerAdapterConfig,
  RequiredShutdownConfig,
  RouteDefinition,
  RouteDeprecation,
  RouteGroup,
  RouteHandler,
  ServerAdapterConfig,
  ServerAdapterErrorCode,
  ServerAdapterErrorCodeType,
  ServerAdapterErrorContext,
  ServerAdapterEvents,
  ServerAdapterFactoryOptions,
  ServerContext,
  ServerFramework,
  ServerLifecycleState,
  ServerResponse,
  ServerStatus,
  ShutdownConfig,
  SSEWriteOptions,
  StreamingConfig,
  ToolExecuteRequest,
  ToolExecuteResponse,
  TrackedConnection,
  WebSocketConfig,
  WebSocketConnection,
  WebSocketHandler,
  WebSocketMessage,
  WebSocketMessageType,
} from "./serverTypes.js";
// Service types - NEW
export * from "./serviceTypes.js";
// Stream types - NEW (selective export to avoid conflicts)
export type {
  EnhancedStreamProvider,
  ProgressCallback,
  StreamingMetadata,
  StreamingOptions,
  StreamingProgressData,
  StreamOptions,
  StreamResult,
  ToolCall as StreamToolCall, // Renamed to avoid conflict with tools.js ToolCall
  ToolCallResults,
  ToolCalls,
  ToolResult as StreamToolResult, // Renamed to avoid conflict with tools.js ToolResult
} from "./streamTypes.js";
export type { TokenRefresher } from "./subscriptionTypes.js";
// Subscription types (Claude subscription tiers, authentication, usage tracking)
// NOTE: subscriptionTypes.ts re-exports auth types from ./authTypes.ts for
// backward compatibility. Import StoredOAuthTokens, TokenRefresher, etc.
// from authTypes.ts for new code.
export * from "./subscriptionTypes.js";
// Task Manager types
export type {
  AutoresearchTaskConfig,
  ConversationEntry as TaskConversationEntry,
  CronSchedule,
  IntervalSchedule,
  OnceSchedule,
  ScheduledTaskType,
  Task,
  TaskBackend,
  TaskBackendName,
  TaskDefinition,
  TaskExecutionMode,
  TaskManagerConfig,
  TaskRetentionConfig,
  TaskRunError,
  TaskRunResult,
  TaskSchedule,
  TaskScheduleType,
  TaskStatus,
  TaskStore,
  WorkerState,
} from "./taskTypes.js";
export { TASK_DEFAULTS } from "./taskTypes.js";
// TTS (Text-to-Speech) types
export * from "./ttsTypes.js";
// Utilities Types - Utility module types (selective export to avoid conflicts)
export * from "./utilities.js";
// Workflow types (ScoreResult aliased to avoid collision with scorerTypes.ts ScoreResult)
export type {
  AggregatedUsage,
  ConditioningConfig,
  ConditionOptions,
  ConditionResult,
  EnsembleExecutionResult,
  EnsembleResponse,
  ExecuteEnsembleOptions,
  ExecuteLayerOptions,
  ExecuteModelOptions,
  ExecutionConfig,
  ExecutionStrategy,
  JudgeConfig,
  JudgeOutputFormat,
  JudgeScores,
  LayerExecutionResult,
  ListOptions,
  ModelGroup,
  MultiJudgeScores,
  ParsedJudgeResponse,
  RegisterOptions,
  RegisterResult,
  RegistryEntry,
  RegistryStats,
  ScoreOptions,
  ScoreResult as WorkflowScoreResult,
  SummaryStats,
  ToneAdjustment,
  ValidationIssues,
  WorkflowAnalytics,
  WorkflowComparison,
  WorkflowConfig,
  WorkflowErrorDetails,
  WorkflowEvaluationData,
  WorkflowExecutionMetrics,
  WorkflowGenerateOptions,
  WorkflowInput,
  WorkflowMetadata,
  WorkflowModelConfig,
  WorkflowResult,
  WorkflowType,
  WorkflowValidationError,
  WorkflowValidationResult,
  WorkflowValidationWarning,
} from "./workflowTypes.js";
export { WorkflowError } from "./workflowTypes.js";
