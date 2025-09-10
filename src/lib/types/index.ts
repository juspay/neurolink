/**
 * Centralized type exports for NeuroLink
 */

// Common utility types
export * from "./common.js";

// Tool system types
export * from "./tools.js";

// Provider types
export * from "./providers.js";

// CLI types
export * from "./cli.js";

// Task classification types
export * from "./taskClassificationTypes.js";

// Configuration types
export type {
  NeuroLinkConfig,
  PerformanceConfig,
  CacheConfig,
  FallbackConfig,
  RetryConfig,
  AnalyticsConfig,
  ToolConfig,
  BackupInfo,
  BackupMetadata,
  ConfigValidationResult,
  ConfigUpdateOptions,
} from "./configTypes.js";

// Re-export commonly used types for convenience
export type {
  Unknown,
  UnknownRecord,
  UnknownArray,
  JsonValue,
  JsonObject,
  JsonArray,
  ErrorInfo,
  Result,
  FunctionParameters,
} from "./common.js";

export type {
  ToolArgs,
  ToolContext,
  ToolResult,
  ToolDefinition,
  SimpleTool,
  AvailableTool,
  ToolExecution,
} from "./tools.js";

export type {
  AISDKModel,
  ProviderError,
  AIModelProviderConfig,
} from "./providers.js";

export type {
  BaseCommandArgs,
  GenerateCommandArgs,
  MCPCommandArgs,
  ModelsCommandArgs,
  CommandResult,
  GenerateResult,
  StreamChunk,
} from "./cli.js";

export type {
  TaskType,
  TaskClassification,
  ClassificationScores,
  ClassificationStats,
  ClassificationValidation,
} from "./taskClassificationTypes.js";

// MCP domain types
export type {
  MCPTransportType,
  MCPServerConnectionStatus,
  MCPServerCategory,
  MCPServerStatus,
  MCPDiscoveredServer,
  MCPConnectedServer,
  MCPToolInfo,
  MCPExecutableTool,
  MCPServerMetadata,
  MCPToolMetadata,
  MCPServerRegistryEntry,
} from "./mcpTypes.js";

// External MCP types
export type {
  ExternalMCPServerInstance,
  ExternalMCPServerStatus,
  ExternalMCPToolInfo,
  ExternalMCPServerHealth,
  ExternalMCPConfigValidation,
  ExternalMCPOperationResult,
  ExternalMCPToolContext,
  ExternalMCPToolResult,
  ExternalMCPServerEvents,
  ExternalMCPManagerConfig,
} from "./externalMcp.js";

// Model/Provider domain types
export type {
  ModelCapability,
  ModelUseCase,
  ModelFilter,
  ModelResolutionContext,
  ModelStats,
  ModelPricing,
} from "./providers.js";

// Stream/Tool domain types are exported via wildcard from ./streamTypes.js

// Domain factory types
export type {
  DomainType,
  DomainConfig,
  DomainTemplate,
  DomainConfigOptions,
  DomainEvaluationCriteria,
  DomainValidationRule,
} from "./domainTypes.js";

// Generate types - NEW
export * from "./generateTypes.js";

// Stream types - NEW (selective export to avoid conflicts)
export type {
  StreamingProgressData,
  StreamingMetadata,
  ProgressCallback,
  ToolCall as StreamToolCall, // Renamed to avoid conflict with tools.js ToolCall
  ToolResult as StreamToolResult, // Renamed to avoid conflict with tools.js ToolResult
  ToolCallResults,
  ToolCalls,
  StreamOptions,
  StreamingOptions,
  StreamResult,
  EnhancedStreamProvider,
} from "./streamTypes.js";

// Analytics types - NEW
export * from "./analytics.js";

// Evaluation types - NEW
export * from "./evaluation.js";

// Model types - NEW
export * from "./modelTypes.js";

// Service types - NEW
export * from "./serviceTypes.js";

// Evaluation provider types - NEW
export * from "./evaluationProviders.js";
