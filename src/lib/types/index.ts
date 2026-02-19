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

// Workflow types
export * from "./workflowTypes.js";

// Context compaction types
export * from "./contextTypes.js";

// File reference types
export * from "./fileReferenceTypes.js";

// RAG types
export * from "./ragTypes.js";

// Conversation memory manager type
export * from "./conversationMemoryInterface.js";

// Custom storage config for Hippocampus memory (consumer-managed storage)
export type { CustomStorageConfig } from "./conversation.js";

// Subscription types (Claude subscription tiers, authentication, usage tracking)
export * from "./subscriptionTypes.js";
