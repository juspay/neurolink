/**
 * NeuroLink SDK Core Types
 *
 * This file exposes ALL essential types that external developers need
 * when integrating with the NeuroLink SDK. Maximum type exposure for
 * comprehensive TypeScript support across the NeuroLink ecosystem.
 */

// Event system types - PRIORITY 2
export type {
  AnyFunction,
  AsyncFunction,
  NeuroLinkEvents,
  StreamEvent,
  SyncFunction,
  TypedEventEmitter,
} from "./common.js";
// Configuration types - PRIORITY 3
export type {
  AnalyticsConfig,
  BackupInfo,
  BackupMetadata,
  CacheConfig,
  ConfigUpdateOptions,
  ConfigValidationResult,
  FallbackConfig,
  NeuroLinkConfig,
  PerformanceConfig,
  ProviderConfig,
  RetryConfig,
  ToolConfig,
} from "./configTypes.js";
// Core streaming and tool execution types - PRIORITY 1
export type {
  AISDKUsage,
  AudioChunk,
  AudioInputSpec,
  EnhancedStreamProvider,
  PCMEncoding,
  ProgressCallback,
  ResponseMetadata,
  StreamAnalyticsCollector,
  StreamingMetadata,
  StreamingOptions,
  StreamingProgressData,
  StreamOptions,
  StreamResult,
  StreamTextResult,
  ToolCall as StreamToolCall, // Note: Renamed in main index to avoid conflict with tools.js ToolCall
  ToolCallResults,
  ToolCalls,
  ToolResult as StreamToolResult, // Note: Renamed in main index to avoid conflict with tools.js ToolResult
} from "./streamTypes.js";

// Tool system types are exported directly from tools.js via index.ts
// Do not re-export here to avoid duplicate export conflicts

// Analytics and monitoring types
export type { AnalyticsData, TokenUsage } from "./analytics.js";
// CLI types
export type {
  BaseCommandArgs,
  CommandResult,
  GenerateCommandArgs,
  GenerateResult as CLIGenerateResult,
  MCPCommandArgs,
  ModelsCommandArgs,
  StreamChunk,
} from "./cli.js";
// Essential utility types
export type {
  ErrorInfo,
  FunctionParameters,
  JsonArray,
  JsonObject,
  JsonValue,
  ProcessResult,
  Result,
  TestFunction,
  TestResult,
  Unknown,
  UnknownArray,
  UnknownRecord,
} from "./common.js";

// Content types for multimodal support
export type {
  Content,
  ImageContent,
  MultimodalMessage,
  ProcessedImage,
  ProviderImageFormat,
  ProviderMultimodalPayload,
  TextContent,
  VisionCapability,
} from "./content.js";
// Conversation Memory types
export type {
  ChatMessage,
  ConversationMemoryConfig,
  ConversationMemoryError,
  ConversationMemoryEvents,
  MessageContent,
  MultimodalChatMessage,
  RedisConversationObject,
  RedisStorageConfig,
  SessionIdentifier,
  SessionMemory,
  SessionMetadata,
  StoreConversationTurnOptions,
} from "./conversation.js";
// Domain types
export type {
  DomainConfig,
  DomainConfigOptions,
  DomainEvaluationCriteria,
  DomainTemplate,
  DomainType,
  DomainValidationRule,
} from "./domainTypes.js";
// Evaluation types
export type {
  EnhancedEvaluationResult,
  EvaluationContext,
  EvaluationCriteria,
  EvaluationData,
  EvaluationRequest,
} from "./evaluation.js";
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
// Generation types - Core generation interface
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
// MCP types - External MCP integration
export type {
  MCPConnectedServer,
  MCPDiscoveredServer,
  MCPExecutableTool,
  MCPServerCategory,
  MCPServerConnectionStatus,
  MCPServerMetadata,
  MCPServerRegistryEntry,
  MCPServerStatus,
  MCPToolInfo,
  MCPToolMetadata,
  MCPTransportType,
} from "./mcpTypes.js";
// Provider types - Complete provider interface
export type {
  AIModelProviderConfig,
  AISDKModel,
  ModelCapability,
  ModelFilter,
  ModelPricing,
  ModelResolutionContext,
  ModelStats,
  ModelUseCase,
  ProviderCapabilities,
  ProviderError,
  ProviderName,
} from "./providers.js";
// Task classification types
export type {
  ClassificationScores,
  ClassificationStats,
  ClassificationValidation,
  TaskClassification,
  TaskType,
} from "./taskClassificationTypes.js";
