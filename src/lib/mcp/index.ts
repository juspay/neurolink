/**
 * MCP Ecosystem - Main Export
 * Universal AI Development Platform with Extensible Plugin Architecture
 * Implementation based on research blueprint
 *
 * Enhanced in Phase 8.39.0 with:
 * - MCPServerBase - Abstract base class for creating MCP servers
 * - Tool Annotations - Enhanced tool hints and metadata
 * - Elicitation Protocol - Interactive tool input during execution
 * - Multi-Server Manager - Load balancing and coordination
 * - Enhanced Tool Discovery - Advanced search and filtering
 */
import type { McpMetadata } from "../types/mcpTypes.js";
import { ErrorFactory } from "../utils/errorHandling.js";

// HTTP Transport types - exported from centralized types
export type {
  AuthorizationUrlResult,
  HTTPRetryConfig,
  MCPOAuthConfig,
  OAuthClientInformation,
  OAuthTokens,
  RateLimitConfig,
  TokenExchangeRequest,
  TokenStorage,
} from "../types/mcpTypes.js";
export { mcpLogger } from "../utils/logger.js";
// MCP Server Factory
export {
  createMCPServer,
  getServerInfo,
  validateServerTools,
  validateTool,
} from "./factory.js";
// OAuth Authentication
export {
  calculateExpiresAt,
  createOAuthProviderFromConfig,
  FileTokenStorage,
  InMemoryTokenStorage,
  isTokenExpired,
  NeuroLinkOAuthProvider,
} from "./auth/index.js";
// HTTP Rate Limiter
export {
  DEFAULT_RATE_LIMIT_CONFIG,
  globalRateLimiterManager,
  HTTPRateLimiter,
  RateLimiterManager,
} from "./httpRateLimiter.js";
// HTTP Retry Handler
export {
  DEFAULT_HTTP_RETRY_CONFIG,
  isRetryableHTTPError,
  isRetryableStatusCode,
  withHTTPRetry,
} from "./httpRetryHandler.js";

// Circuit Breaker
export {
  CircuitBreakerManager,
  globalCircuitBreakerManager,
  MCPCircuitBreaker,
} from "./mcpCircuitBreaker.js";
// Core MCP Components
export { MCPToolRegistry } from "./toolRegistry.js";
export { ExternalServerManager } from "./externalServerManager.js";
export { MCPClientFactory } from "./mcpClientFactory.js";

// ========================================
// MCP ENHANCEMENTS (Phase 8.39.0)
// ========================================

export type {
  ExposableAgent,
  ExposableWorkflow,
  ExposureOptions,
  ExposureResult,
} from "./agentExposure.js";
// Agent and Workflow Exposure
export {
  AgentExposureManager,
  exposeAgentAsTool,
  exposeAgentsAsTools,
  exposeWorkflowAsTool,
  exposeWorkflowsAsTools,
  globalAgentExposureManager,
} from "./agentExposure.js";
export type {
  ConfirmationElicitation,
  Elicitation,
  ElicitationContext,
  ElicitationHandler,
  ElicitationManagerConfig,
  ElicitationRequest,
  ElicitationResponse,
  ElicitationType,
  FileElicitation,
  FormElicitation,
  FormField,
  MultiSelectElicitation,
  SecretElicitation,
  SelectElicitation,
  SelectOption,
  TextElicitation,
} from "./elicitation/index.js";

// Elicitation Protocol - Manager
export {
  ElicitationManager,
  globalElicitationManager,
} from "./elicitation/index.js";
export type {
  ElicitationCancelMessage,
  ElicitationCancelParams,
  ElicitationProtocolAdapterConfig,
  ElicitationProtocolHandler,
  ElicitationProtocolMessage,
  ElicitationProtocolMessageType,
  ElicitationProtocolPayload,
  ElicitationRequestMessage,
  ElicitationRequestParams,
  ElicitationResponseMessage,
  ElicitationResponseParams,
} from "./elicitationProtocol.js";

// Elicitation Protocol - Protocol Layer
export {
  createConfirmationRequest,
  createElicitationCancel,
  createElicitationRequest,
  createElicitationResponse,
  createFormRequest,
  createSelectRequest,
  createTextInputRequest,
  ElicitationProtocolAdapter,
  elicitationResponseToProtocol,
  globalElicitationProtocol,
  isElicitationProtocolMessage,
  protocolMessageToElicitation,
} from "./elicitationProtocol.js";
export type {
  CompatibilityCheckResult,
  EnhancedToolInfo,
  ToolSearchCriteria,
  ToolSearchResult,
} from "./enhancedToolDiscovery.js";
// Enhanced Tool Discovery
export { EnhancedToolDiscovery } from "./enhancedToolDiscovery.js";
export type {
  MCPRegistryClientConfig,
  RegistryConfig,
  RegistryEntry,
  RegistrySearchOptions,
  RegistrySearchResult,
  RegistrySourceType,
} from "./mcpRegistryClient.js";
// MCP Registry Client
export {
  getAllWellKnownServers,
  getWellKnownServer,
  globalMCPRegistryClient,
  MCPRegistryClient,
} from "./mcpRegistryClient.js";
export type {
  MCPServerBaseConfig,
  MCPServerEvents,
  MCPServerTool,
  MCPToolAnnotations,
} from "./mcpServerBase.js";
// MCP Server Base Class
export { MCPServerBase } from "./mcpServerBase.js";
export type {
  LoadBalancingStrategy,
  MultiServerManagerConfig,
  ServerGroup,
  ServerWeight,
  UnifiedTool,
} from "./multiServerManager.js";
// Multi-Server Manager
export {
  globalMultiServerManager,
  MultiServerManager,
} from "./multiServerManager.js";
export type {
  MCPPrompt,
  MCPResource,
  PromptGenerator,
  PromptMessage,
  PromptResult,
  RegisteredPrompt,
  RegisteredResource,
  ResourceContent,
  ResourceReader,
  ResourceSubscriptionCallback,
  ServerCapabilitiesConfig,
} from "./serverCapabilities.js";
// Server Capabilities (Resources and Prompts)
export {
  createJsonResource,
  createPrompt,
  createTextResource,
  ServerCapabilitiesManager,
} from "./serverCapabilities.js";
// Tool Annotations System
export {
  createAnnotatedTool,
  filterToolsByAnnotations,
  getAnnotationSummary,
  getToolSafetyLevel,
  inferAnnotations,
  isSafeToRetry,
  mergeAnnotations,
  requiresConfirmation,
  validateAnnotations,
} from "./toolAnnotations.js";
export type {
  MCPProtocolTool,
  NeuroLinkTool,
  ToolConverterOptions,
} from "./toolConverter.js";
// Tool Converter Utilities
export {
  batchConvertToMCP,
  batchConvertToNeuroLink,
  createToolFromFunction,
  mcpProtocolToolToServerTool,
  mcpToolToNeuroLink,
  neuroLinkToolToMCP,
  sanitizeToolName,
  serverToolToMCPProtocol,
  TOOL_COMPATIBILITY,
  validateToolName,
} from "./toolConverter.js";
export type {
  EnhancedExecutionContext,
  ToolMiddleware,
  ToolWrapperOptions,
} from "./toolIntegration.js";
// Tool Integration with Elicitation
export {
  confirmationMiddleware,
  createElicitationContext,
  createRetryMiddleware,
  createTimeoutMiddleware,
  createToolMiddlewareChain,
  globalToolIntegrationManager,
  loggingMiddleware,
  ToolIntegrationManager,
  validationMiddleware,
  wrapToolsWithElicitation,
  wrapToolWithElicitation,
} from "./toolIntegration.js";

// ========================================
// ADVANCED MCP LAYERS (Phase 8.40.0)
// ========================================

export type {
  BatchConfig,
  BatchExecutor,
  BatcherEvents,
  BatchResult,
} from "./batching/index.js";
// Request Batcher - Efficient batch processing
export {
  createRequestBatcher,
  createToolCallBatcher,
  DEFAULT_BATCH_CONFIG,
  RequestBatcher,
  ToolCallBatcher,
} from "./batching/index.js";
export type {
  CacheConfig,
  CacheEvents,
  CacheStats,
  CacheStrategy,
} from "./caching/index.js";
// Tool Cache - Result and response caching
export {
  createToolCache,
  createToolResultCache,
  DEFAULT_CACHE_CONFIG,
  ToolCache,
  ToolResultCache,
} from "./caching/index.js";
export type {
  AffinityRule,
  CategoryMapping,
  MCPTool,
  RoutingDecision,
  RoutingStrategy,
  ServerWeight as RouterServerWeight,
  ToolRouterConfig,
  ToolRouterEvents,
} from "./routing/index.js";
// Tool Router - Intelligent routing for multi-server environments
export {
  createToolRouter,
  DEFAULT_ROUTER_CONFIG,
  ToolRouter,
} from "./routing/index.js";

/**
 * Initialize the MCP ecosystem - simplified
 */
export async function initializeMCPEcosystem(): Promise<void> {
  // Simplified initialization - no complex ecosystem needed
  return Promise.resolve();
}

/**
 * List available MCPs - simplified
 */
export async function listMCPs(): Promise<McpMetadata[]> {
  return [];
}

/**
 * Execute an MCP operation - simplified
 */
export async function executeMCP<T = unknown>(
  _name: string,
  _config: unknown,
  _args: unknown,
  _context?: {
    sessionId?: string;
    userId?: string;
  },
): Promise<T> {
  throw ErrorFactory.invalidConfiguration(
    "executeMCP",
    "Direct legacy MCP execution is deprecated. Use the new module APIs (createMCPServer, MultiServerManager, ToolRouter, etc.) instead.",
  );
}

/**
 * Get MCP ecosystem statistics - simplified
 */
export async function getMCPStats(): Promise<{
  initialized: boolean;
  pluginsDiscovered: number;
  pluginsBySource: Record<string, number>;
  availablePlugins: string[];
}> {
  return {
    initialized: false,
    pluginsDiscovered: 0,
    pluginsBySource: {},
    availablePlugins: [],
  };
}
