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
  MCPServerMetadata,
  MCPServerRegistryEntry,
  MCPServerStatus,
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
  ErrorInfo as AnalyticsErrorInfo, // Renamed to avoid conflict with common.js ErrorInfo
  PerformanceMetrics,
  StreamAnalyticsData,
  TokenUsage,
} from "./analytics.js";
// Content types for multimodal support (includes multimodal re-exports for backward compatibility)
export * from "./content.js";
// Domain factory types
export type {
  DomainConfig,
  DomainConfigOptions,
  DomainEvaluationCriteria,
  DomainTemplate,
  DomainType,
  DomainValidationRule,
} from "./domainTypes.js";
// Evaluation types - NEW
export * from "./evaluation.js";
// Evaluation provider types - NEW
export * from "./evaluationProviders.js";
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
// Scorer types for evaluation system
export * from "./scorerTypes.js";
// SDK Types - Core types for external developers
// Note: sdkTypes.ts uses selective re-exports internally, so we use wildcard here
// The conflicts were from generateTypes and analytics which are now handled above
export * from "./sdkTypes.js";
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

// Context compaction types
export * from "./contextTypes.js";

// File reference types
export * from "./fileReferenceTypes.js";

// RAG types
export * from "./ragTypes.js";

// Conversation memory manager type
export * from "./conversationMemoryInterface.js";

// Custom storage config for Hippocampus memory (consumer-managed storage)
export type { StorageConfig } from "./conversation.js";

// Subscription types (Claude subscription tiers, authentication, usage tracking)
// NOTE: subscriptionTypes.ts re-exports auth types from ./authTypes.ts for
// backward compatibility. Import StoredOAuthTokens, TokenRefresher, etc.
// from authTypes.ts for new code.
export * from "./subscriptionTypes.js";

// Client SDK types (selective export to avoid collisions with existing types)
// Conflicting names are aliased with "Client" prefix.
export type {
  // Core config
  ClientConfig,
  RequestOptions as ClientRequestOptions,
  // Retry (conflicts with configTypes.ts RetryConfig)
  RetryConfig as ClientRetryConfig,
  // API response/error (ApiResponse conflicts with typeAliases.ts)
  ApiResponse as ClientApiResponse,
  ApiError as ClientApiError,
  // Provider status (conflicts with providers.ts ProviderStatus)
  ProviderStatus as ClientProviderStatus,
  // Streaming (StreamResult conflicts with streamTypes.ts)
  StreamEventType as ClientStreamEventType,
  StreamEvent as ClientStreamEvent,
  StreamCallbacks as ClientStreamCallbacks,
  StreamResult as ClientStreamResult,
  // Generation
  GenerateRequestOptions as ClientGenerateRequestOptions,
  GenerateResponse as ClientGenerateResponse,
  StreamRequestOptions as ClientStreamRequestOptions,
  // Agent
  AgentExecuteOptions as ClientAgentExecuteOptions,
  AgentExecuteResult as ClientAgentExecuteResult,
  AgentInfo as ClientAgentInfo,
  // Workflow
  WorkflowExecuteOptions as ClientWorkflowExecuteOptions,
  WorkflowExecuteResult as ClientWorkflowExecuteResult,
  WorkflowInfo as ClientWorkflowInfo,
  // Tool (conflicts with tools.ts ToolInfo)
  ToolInfo as ClientToolInfo,
  // Middleware (client HTTP middleware, distinct from AI SDK middleware)
  Middleware as ClientMiddleware,
  MiddlewareRequest as ClientMiddlewareRequest,
  MiddlewareResponse as ClientMiddlewareResponse,
  MiddlewareContext as ClientMiddlewareContext,
  // React hooks
  ChatMessage as ClientChatMessage,
  UseChatOptions,
  UseChatReturn,
  UseAgentOptions,
  UseAgentReturn,
  UseWorkflowOptions,
  UseWorkflowReturn,
  UseVoiceOptions,
  UseVoiceReturn,
  UseStreamOptions,
  UseStreamReturn,
  UseToolsOptions,
  UseToolsReturn,
  // AI SDK adapter
  LanguageModel as ClientLanguageModel,
  LanguageModelCallOptions as ClientLanguageModelCallOptions,
  LanguageModelResponse as ClientLanguageModelResponse,
  LanguageModelStreamResponse as ClientLanguageModelStreamResponse,
  NeuroLinkProviderOptions,
  ModelOptions as ClientModelOptions,
  // WebSocket
  WebSocketOptions as ClientWebSocketOptions,
  WebSocketState as ClientWebSocketState,
  WebSocketMessageHandler as ClientWebSocketMessageHandler,
  // Dedicated WS client types
  WSClientState,
  WSClientConfig,
  WSClientMessage,
  WSClientEventHandlers,
  // Voice
  SpeechRecognitionResult as ClientSpeechRecognitionResult,
  SpeechSynthesisOptions as ClientSpeechSynthesisOptions,
  // Authentication
  AuthConfig as ClientAuthConfig,
  OAuth2Config as ClientOAuth2Config,
  TokenRefreshResult as ClientTokenRefreshResult,
} from "./clientTypes.js";
export type { TokenRefresher } from "./subscriptionTypes.js";

// Proxy types (Claude API format, cloaking, routing, config, stats, server adapters)
export * from "./proxyTypes.js";

// Authentication types - Multi-provider auth system
export type {
  // Provider types
  AuthProviderType,
  AuthProviderConfig,
  MastraAuthProvider,
  BetterAuthConfig,
  Auth0Config,
  ClerkConfig,
  FirebaseConfig,
  SupabaseConfig,
  WorkOSConfig,
  JWTConfig,
  OAuth2Config,
  CognitoConfig,
  KeycloakConfig,
  CustomAuthConfig,
  BaseAuthProviderConfig,

  // User and session
  AuthUser,
  AuthSession,
  TokenType,

  // Token types
  TokenValidationResult as AuthTokenValidationResult,
  TokenClaims,
  JWK,
  JWKS,
  TokenRefreshResult,
  TokenValidationConfig,
  TokenExtractionConfig,

  // Session types
  SessionValidationResult,
  SessionStorage,

  // Authorization
  AuthorizationResult,

  // Context
  AuthRequestContext,
  AuthenticatedContext,

  // Configuration
  TokenExtractionStrategy,
  SessionConfig,
  SessionStorageType,
  RBACConfig,
  PermissionDefinition,
  AuthCacheConfig,

  // Middleware
  AuthMiddlewareOptions,
  AuthMiddlewareConfig,
  RBACMiddlewareConfig,

  // Error types
  AuthErrorCode,
  AuthErrorInfo,
  // Backward-compatible alias (was `AuthError as AuthErrorType`)
  AuthErrorInfo as AuthErrorType,

  // Event types
  AuthEventType,
  AuthEventData,
  AuthEventHandler,

  // Factory types
  AuthProviderFactoryFn,
  AuthProviderRegistration,

  // Health and events
  AuthHealthCheck,
  AuthProviderHealthCheck,
  AuthEvents,

  // Registry types (moved from AuthProviderRegistry.ts)
  AuthProviderMetadata,
  AuthProviderHealthStatus,

  // Composed sub-types
  AuthTokenValidator,
  AuthUserAuthorizer,
  AuthSessionManager,
  AuthRequestHandler,
  AuthUserManager,
  AuthLifecycle,
} from "./authTypes.js";

// Task Manager types
export type {
  Task,
  TaskDefinition,
  TaskSchedule,
  TaskScheduleType,
  CronSchedule,
  IntervalSchedule,
  OnceSchedule,
  TaskExecutionMode,
  TaskStatus,
  TaskRunResult,
  TaskRunError,
  TaskStore,
  TaskBackend,
  TaskBackendName,
  TaskManagerConfig,
  TaskRetentionConfig,
  ConversationEntry as TaskConversationEntry,
} from "./taskTypes.js";
