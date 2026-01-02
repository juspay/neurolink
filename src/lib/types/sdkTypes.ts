/**
 * NeuroLink SDK Core Types
 *
 * This file exposes ALL essential types that external developers need
 * when integrating with the NeuroLink SDK. Maximum type exposure for
 * comprehensive TypeScript support across the NeuroLink ecosystem.
 */

// Core streaming and tool execution types - PRIORITY 1
export type {
  StreamResult,
  StreamingProgressData,
  StreamingMetadata,
  ProgressCallback,
  ToolCall as StreamToolCall, // Note: Renamed in main index to avoid conflict with tools.js ToolCall
  ToolResult as StreamToolResult, // Note: Renamed in main index to avoid conflict with tools.js ToolResult
  ToolCallResults,
  ToolCalls,
  StreamOptions,
  StreamingOptions,
  EnhancedStreamProvider,
  StreamTextResult,
  AISDKUsage,
  StreamAnalyticsCollector,
  ResponseMetadata,
  AudioInputSpec,
  AudioChunk,
  PCMEncoding,
} from "./streamTypes.js";

// Event system types - PRIORITY 2
export type {
  TypedEventEmitter,
  NeuroLinkEvents,
  StreamEvent,
  AsyncFunction,
  SyncFunction,
  AnyFunction,
} from "./common.js";

// Configuration types - PRIORITY 3
export type {
  NeuroLinkConfig,
  ProviderConfig,
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

// Tool system types are exported directly from tools.js via index.ts
// Do not re-export here to avoid duplicate export conflicts

// Provider types - Complete provider interface
export type {
  AISDKModel,
  ProviderError,
  AIModelProviderConfig,
  ProviderName,
  ModelCapability,
  ModelUseCase,
  ModelFilter,
  ModelResolutionContext,
  ModelStats,
  ModelPricing,
  ProviderCapabilities,
} from "./providers.js";

// Generation types - Core generation interface
export type {
  GenerateOptions,
  GenerateResult as GenerateApiResult, // Renamed to avoid conflict with cli.js GenerateResult
  UnifiedGenerationOptions,
  EnhancedProvider,
  FactoryEnhancedProvider,
  TextGenerationOptions,
  TextGenerationResult,
  EnhancedGenerateResult,
} from "./generateTypes.js";

// Analytics and monitoring types
export type { TokenUsage, AnalyticsData } from "./analytics.js";

// Content types for multimodal support
export type {
  TextContent,
  ImageContent,
  Content,
  VisionCapability,
  ProviderImageFormat,
  ProcessedImage,
  MultimodalMessage,
  ProviderMultimodalPayload,
} from "./content.js";

// MCP types - External MCP integration
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

// CLI types
export type {
  BaseCommandArgs,
  GenerateCommandArgs,
  MCPCommandArgs,
  ModelsCommandArgs,
  CommandResult,
  GenerateResult as CLIGenerateResult,
  StreamChunk,
} from "./cli.js";

// Essential utility types
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

// Evaluation types
export type {
  EvaluationData,
  EvaluationContext,
  EnhancedEvaluationResult,
  EvaluationRequest,
  EvaluationCriteria,
} from "./evaluation.js";

// Task classification types
export type {
  TaskType,
  TaskClassification,
  ClassificationScores,
  ClassificationStats,
  ClassificationValidation,
} from "./taskClassificationTypes.js";

// Domain types
export type {
  DomainType,
  DomainConfig,
  DomainTemplate,
  DomainConfigOptions,
  DomainEvaluationCriteria,
  DomainValidationRule,
} from "./domainTypes.js";

// Conversation Memory types
export type {
  ConversationMemoryConfig,
  SessionMemory,
  ChatMessage,
  MessageContent,
  MultimodalChatMessage,
  ConversationMemoryEvents,
  ConversationMemoryError,
  SessionIdentifier,
  SessionMetadata,
  RedisConversationObject,
  RedisStorageConfig,
} from "./conversation.js";
