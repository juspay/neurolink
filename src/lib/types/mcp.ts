/**
 * MCP Types for In-Memory Server Support
 * Enables various integrations to register tools directly
 */

import type { JsonValue, JsonObject } from "./common.js";
import type { OAuthTokens } from "./auth.js";
import type { ExecutionContext, ToolInfo, ToolResult } from "./tools.js";

// Re-export OAuthTokens from canonical source (auth.ts)
export type { OAuthTokens } from "./auth.js";

/**
 * In-memory MCP server configuration
 */
// InMemoryMCPServerConfig has been removed.
// Replacement: Use MCPServerInfo for all in-memory server configuration needs.
// MCPServerInfo unifies configuration and runtime state, covering all fields previously in InMemoryMCPServerConfig.
// Migration: Update type references from InMemoryMCPServerConfig to MCPServerInfo and ensure all required fields are present.
// For detailed migration steps, see docs/mcp-migration.md or the MCP 2024-11-05 specification.

// InMemoryToolInfo has been eliminated – use ToolDefinition from types/tools.js instead
// InMemoryToolResult has been eliminated – use ToolResult from types/tools.js instead

/**
 * MCP Transport Types - Maximally Reusable
 */
export type MCPTransportType =
  | "stdio"
  | "sse"
  | "websocket"
  | "http"
  | "ws"
  | "tcp"
  | "unix";

/**
 * MCP Server Connection Status - Individual server status
 */
export type MCPServerConnectionStatus =
  | "initializing" // Server is being started
  | "connecting" // Attempting to connect
  | "connected" // Successfully connected and ready
  | "disconnected" // Cleanly disconnected
  | "failed" // Connection failed
  | "restarting" // Server is being restarted
  | "stopping" // Server is being stopped
  | "stopped"; // Server has been stopped

/**
 * MCP Server Category Types - Deployment and server type classification
 */
export type MCPServerCategory =
  | "external" // External process-based MCP servers
  | "in-memory" // In-memory tool registrations
  | "built-in" // Built-in NeuroLink tools
  | "user-defined" // Custom user tools
  | "custom" // Legacy alias for user-defined
  | "uncategorized"; // Fallback category

/**
 * MCP Server Domain Categories - Functional domain classification
 */
export type MCPServerDomainCategory =
  | "aiProviders"
  | "frameworks"
  | "development"
  | "business"
  | "content"
  | "data"
  | "integrations"
  | "automation"
  | "analysis"
  | "custom";

/**
 * Universal MCP Server - Unified configuration and runtime state
 * MCP 2024-11-05 specification compliant
 * Replaces both MCPServerInfo and MCPServerConfig
 */
export type MCPServerInfo = {
  // Core MCP-compliant fields (always required)
  id: string;
  name: string;
  description: string;
  transport: MCPTransportType;
  status: MCPServerConnectionStatus;

  // Tools array (always present, may be empty)
  tools: Array<{
    name: string;
    description: string;
    inputSchema?: object;
    execute?: (
      params: unknown,
      context?: unknown,
    ) => Promise<unknown> | unknown;
  }>;

  // Configuration fields (optional, for setup)
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>; // HTTP headers for authentication (HTTP/SSE/WebSocket)
  /** HTTP transport-specific options */
  httpOptions?: MCPHTTPTransportOptions;
  timeout?: number;
  retries?: number;
  error?: string;
  installed?: boolean; // CLI-specific

  // Process management fields (from ExternalMCPServerConfig)
  cwd?: string; // Working directory for the process
  autoRestart?: boolean; // Whether to automatically restart on failure
  healthCheckInterval?: number; // Health check interval in milliseconds

  /** Retry configuration for HTTP transport */
  retryConfig?: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
  };

  /** Rate limiting configuration for HTTP transport */
  rateLimiting?: {
    /** Maximum requests per minute (default: 60) */
    requestsPerMinute?: number;
    /** Maximum requests per hour (optional) */
    requestsPerHour?: number;
    /** Maximum burst size for token bucket (default: 10) */
    maxBurst?: number;
    /** Use token bucket algorithm (default: true) */
    useTokenBucket?: boolean;
  };

  // Tool filtering (blocklist for security/control)
  blockedTools?: string[]; // List of tool names to block from this server

  /** Authentication configuration for HTTP/SSE/WebSocket transports */
  auth?: {
    /** Authentication type */
    type: "oauth2" | "bearer" | "api-key";
    /** OAuth 2.1 configuration */
    oauth?: {
      /** OAuth client ID */
      clientId: string;
      /** OAuth client secret (optional for public clients with PKCE) */
      clientSecret?: string;
      /** Authorization endpoint URL */
      authorizationUrl: string;
      /** Token endpoint URL */
      tokenUrl: string;
      /** Redirect URI for OAuth callback */
      redirectUrl: string;
      /** OAuth scope (space-separated) */
      scope?: string;
      /** Enable PKCE (Proof Key for Code Exchange) - recommended for OAuth 2.1 */
      usePKCE?: boolean;
    };
    /** Bearer token for simple token authentication */
    token?: string;
    /** API key for API key authentication */
    apiKey?: string;
    /** Header name for API key (default: "X-API-Key") */
    apiKeyHeader?: string;
  };

  // Extensible metadata
  metadata?: {
    uptime?: number;
    toolCount?: number;
    category?: MCPServerCategory;
    provider?: string;
    version?: string;
    author?: string;
    tags?: string[];
    [key: string]: unknown;
  };
};

/**
 * HTTP Transport Options for fine-grained control
 */
export type MCPHTTPTransportOptions = {
  /** Connection timeout in milliseconds (default: 30000) */
  connectionTimeout?: number;
  /** Request timeout in milliseconds (default: 60000) */
  requestTimeout?: number;
  /** Idle timeout for connection pool (default: 120000) */
  idleTimeout?: number;
  /** Keep-alive timeout (default: 30000) */
  keepAliveTimeout?: number;
};

/**
 * MCP Server Status for CLI Operations - High Reusability
 */
export type MCPServerStatus = {
  /** Whether MCP is initialized */
  mcpInitialized: boolean;
  /** Total number of servers */
  totalServers: number;
  /** Number of available servers */
  availableServers: number;
  /** Number of auto-discovered servers */
  autoDiscoveredCount: number;
  /** Total number of tools */
  totalTools: number;
  /** Number of custom tools */
  customToolsCount: number;
  /** Number of in-memory servers */
  inMemoryServersCount: number;
  /** Error message */
  error?: string;
  /** Auto-discovered servers from various sources */
  autoDiscoveredServers?: MCPDiscoveredServer[];
  /** Currently connected servers */
  connectedServers: MCPConnectedServer[];
  /** Available tools across all servers */
  availableTools: MCPToolInfo[];
  /** Server registry entries */
  serverRegistry?: Record<string, MCPServerInfo>;
};

/**
 * Auto-discovered MCP Server - High Reusability
 */
export type MCPDiscoveredServer = {
  name: string;
  status: MCPServerConnectionStatus;
  source: string;
  transport: MCPTransportType;
  description?: string;
  url?: string;
  args?: string[];
  env?: Record<string, string>;
  metadata?: MCPServerMetadata;
};

/**
 * Connected MCP Server - High Reusability
 */
export type MCPConnectedServer = {
  name: string;
  transport: MCPTransportType;
  connected: boolean;
  description?: string;
  tools: MCPToolInfo[];
  lastSeen?: Date;
  connectionTime?: Date;
  metadata?: MCPServerMetadata;
};

/**
 * MCP Tool Information - High Reusability
 */
export type MCPToolInfo = {
  name: string;
  description: string;
  serverId: string;
  isExternal: boolean;
  isImplemented?: boolean;
  inputSchema?: JsonObject;
  outputSchema?: JsonObject;
  metadata?: MCPToolMetadata;
};

/**
 * MCP Executable Tool - Tool with execution capability
 * Extracted from MCPServerInfo.tools array for better readability
 */
export type MCPExecutableTool = MCPServerInfo["tools"][0];

/**
 * MCP Server Metadata - Extensible
 */
export type MCPServerMetadata = {
  [key: string]: JsonValue;
} & {
  provider?: string;
  version?: string;
  author?: string;
  category?: string;
  tags?: string[];
};

/**
 * MCP Tool Metadata - Extensible
 */
export type MCPToolMetadata = {
  [key: string]: JsonValue;
} & {
  category?: string;
  tags?: string[];
  complexity?: "simple" | "medium" | "complex";
  executionTime?: number;
};

/**
 * MCP Server Registry Entry - For Object.entries() usage
 */
export type MCPServerRegistryEntry = [string, MCPServerInfo];

export type MCPStatus = {
  mcpInitialized: boolean;
  totalServers: number;
  availableServers: number;
  autoDiscoveredCount: number;
  totalTools: number;
  autoDiscoveredServers: MCPServerInfo[];
  customToolsCount: number;
  inMemoryServersCount: number;
  externalMCPServersCount?: number;
  externalMCPConnectedCount?: number;
  externalMCPFailedCount?: number;
  externalMCPServers?: MCPServerInfo[];
  error?: string;
  [key: string]: unknown; // Allows runtime-added status fields from plugins/extensions
};

/**
 * Call record for circuit breaker statistics tracking.
 * Superset shape: MCP breaker uses {timestamp, success, duration};
 * RAG breaker also tracks `operationType` (optional, for routing and
 * metrics). Both import from here.
 */
export type CallRecord = {
  timestamp: number;
  success: boolean;
  duration: number;
  operationType?: string;
};

/**
 * Tool execution context - Rich context passed to every tool execution
 * Extracted from factory.ts for centralized type management
 * Following standard patterns for rich tool context
 */
export type NeuroLinkExecutionContext = {
  // Core identifiers
  sessionId?: string;
  userId?: string;

  // AI context
  aiProvider?: string;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;

  // Application context
  appId?: string;
  clientId?: string;
  clientVersion?: string;
  organizationId?: string;
  projectId?: string;

  // Environment context
  environment?: string;
  environmentType?: "development" | "staging" | "production";
  platform?: string;
  device?: string;
  browser?: string;
  userAgent?: string;

  // Framework Context
  frameworkType?: "react" | "vue" | "svelte" | "next" | "nuxt" | "sveltekit";

  // Tool Execution Context
  toolChain?: string[];
  parentToolId?: string;

  // Location context
  locale?: string;
  timezone?: string;
  ipAddress?: string;

  // Request context
  requestId?: string;
  timestamp?: number;

  // Security context
  permissions?: string[];
  features?: string[];
  enableDemoMode?: boolean;
  securityLevel?: "public" | "private" | "organization";

  // Extensible metadata
  metadata?: Record<string, unknown>;

  // Extension points for custom context
  [key: string]: unknown;
};

// ToolResult is imported from tools.ts and re-exported for convenience
export type { ToolResult } from "./tools.js";

/**
 * Unified MCP Registry type
 */
export type UnifiedMCPRegistry = {
  /**
   * Register an in-memory server
   */
  registerInMemoryServer(
    serverId: string,
    serverInfo: MCPServerInfo,
  ): Promise<void>;

  /**
   * Get all available tools
   */
  getAllTools(): Promise<MCPToolInfo[]>;

  /**
   * Execute a tool
   */
  executeTool(
    toolName: string,
    params: JsonObject,
    context: JsonObject,
  ): Promise<unknown>;

  /**
   * Check if connected to a server
   */
  isConnected(serverId: string): boolean;
};

// =============================================================================
// ADDITIONAL MCP INTERFACES (moved from individual MCP files for centralization)
// =============================================================================

import type { StandardRecord } from "./aliases.js";
import type {
  ExternalMCPToolInfo,
  ExternalMCPToolContext,
} from "./externalMcp.js";
import type { ElicitationContext, ElicitationType } from "./elicitation.js";

/**
 * NeuroLink MCP Tool Type - Standardized tool definition for MCP integration
 * Moved from src/lib/mcp/factory.ts
 */
export type NeuroLinkMCPTool = {
  /** Unique tool identifier for MCP registration and execution */
  name: string;

  /** Human-readable description of tool functionality */
  description: string;

  /** Optional category for tool organization and discovery */
  category?: string;

  /** Optional input schema for parameter validation (Zod or JSON Schema) */
  inputSchema?: unknown;

  /** Optional output schema for result validation */
  outputSchema?: unknown;

  /** Implementation status flag for development tracking */
  isImplemented?: boolean;

  /** Required permissions for tool execution in secured environments */
  permissions?: string[];

  /** Tool version for compatibility and update management */
  version?: string;

  /** Additional metadata for tool information and capabilities */
  metadata?: Record<string, unknown>;

  /**
   * Tool execution function with standardized signature
   */
  execute: (
    params: unknown,
    context: NeuroLinkExecutionContext,
  ) => Promise<ToolResult>;
};

/**
 * NeuroLink MCP Server Type - Standard compatible
 * Moved from src/lib/mcp/factory.ts
 */
export type NeuroLinkMCPServer = {
  // Server identification
  id: string;
  title: string;
  description?: string;
  version?: string;
  category?: MCPServerDomainCategory;
  visibility?: "public" | "private" | "organization";

  // Tool management
  tools: Record<string, NeuroLinkMCPTool>;

  // Tool registration method
  registerTool(tool: NeuroLinkMCPTool): NeuroLinkMCPServer;

  // Extension points
  metadata?: Record<string, unknown>;
  dependencies?: string[];
  capabilities?: string[];
};

/**
 * MCP Server Configuration for creation
 * Moved from src/lib/mcp/factory.ts
 */
export type MCPServerConfig = {
  id: string;
  title: string;
  description?: string;
  version?: string;
  category?: MCPServerDomainCategory;
  visibility?: "public" | "private" | "organization";
  metadata?: Record<string, unknown>;
  dependencies?: string[];
  capabilities?: string[];
};

/**
 * Discovered MCP server/plugin definition
 * Moved from src/lib/mcp/contracts/mcpContract.ts
 */
export type DiscoveredMcp<TTools = StandardRecord> = {
  metadata: McpMetadata;
  tools?: TTools;
  capabilities?: string[];
  version?: string;
  configuration?: Record<string, string | number | boolean>;
  [key: string]: unknown; // Generic extensibility
};

/**
 * MCP server metadata
 * Moved from src/lib/mcp/contracts/mcpContract.ts
 */
export type McpMetadata = {
  name: string;
  description?: string;
  version?: string;
  author?: string;
  homepage?: string;
  repository?: string;
  category?: string; // Server category (e.g., "ai-tools", "database", "api")
};

/**
 * Tool discovery result
 * Moved from src/lib/mcp/toolDiscoveryService.ts
 */
export type ToolDiscoveryResult = {
  /** Whether discovery was successful */
  success: boolean;

  /** Number of tools discovered */
  toolCount: number;

  /** Discovered tools */
  tools: ExternalMCPToolInfo[];

  /** Error message if failed */
  error?: string;

  /** Discovery duration in milliseconds */
  duration: number;

  /** Server ID */
  serverId: string;
};

/**
 * External MCP tool execution options
 * Moved from src/lib/mcp/toolDiscoveryService.ts
 */
export type ExternalToolExecutionOptions = {
  /** Execution timeout in milliseconds */
  timeout?: number;

  /** Additional context for execution */
  context?: Partial<ExternalMCPToolContext>;

  /** Whether to validate input parameters */
  validateInput?: boolean;

  /** Whether to validate output */
  validateOutput?: boolean;
};

/**
 * Tool validation result
 * Moved from src/lib/mcp/toolDiscoveryService.ts
 */
export type ToolValidationResult = {
  /** Whether the tool is valid */
  isValid: boolean;

  /** Validation errors */
  errors: string[];

  /** Validation warnings */
  warnings: string[];

  /** Tool metadata */
  metadata?: {
    category?: string;
    complexity?: "simple" | "moderate" | "complex";
    requiresAuth?: boolean;
    isDeprecated?: boolean;
  };
};

/**
 * Tool registry events
 * Moved from src/lib/mcp/toolDiscoveryService.ts
 */
export type ToolRegistryEvents = {
  toolRegistered: {
    serverId: string;
    toolName: string;
    toolInfo: ExternalMCPToolInfo;
    timestamp: Date;
  };

  toolUnregistered: {
    serverId: string;
    toolName: string;
    timestamp: Date;
  };

  toolExecuted: {
    serverId: string;
    toolName: string;
    success: boolean;
    duration: number;
    timestamp: Date;
  };

  discoveryStarted: {
    serverId: string;
    timestamp: Date;
  };

  discoveryCompleted: {
    serverId: string;
    toolCount: number;
    duration: number;
    timestamp: Date;
  };

  discoveryFailed: {
    serverId: string;
    error: string;
    timestamp: Date;
  };
};

/**
 * Circuit breaker states
 * Moved from src/lib/mcp/mcpCircuitBreaker.ts
 */
export type CircuitBreakerState = "closed" | "open" | "half-open";

/**
 * Circuit breaker configuration
 * Moved from src/lib/mcp/mcpCircuitBreaker.ts
 */
export type CircuitBreakerConfig = {
  /** Number of failures before opening the circuit */
  failureThreshold: number;

  /** Time to wait before attempting reset (milliseconds) */
  resetTimeout: number;

  /** Maximum calls allowed in half-open state */
  halfOpenMaxCalls: number;

  /** Timeout for individual operations (milliseconds) */
  operationTimeout: number;

  /** Minimum number of calls before calculating failure rate */
  minimumCallsBeforeCalculation: number;

  /** Window size for calculating failure rate (milliseconds) */
  statisticsWindowSize: number;
};

/**
 * Circuit breaker statistics
 * Moved from src/lib/mcp/mcpCircuitBreaker.ts
 */
export type CircuitBreakerStats = {
  /** Current state */
  state: CircuitBreakerState;

  /** Total number of calls */
  totalCalls: number;

  /** Number of successful calls */
  successfulCalls: number;

  /** Number of failed calls */
  failedCalls: number;

  /** Current failure rate (0-1) */
  failureRate: number;

  /** Calls in current time window */
  windowCalls: number;

  /** Last state change timestamp */
  lastStateChange: Date;

  /** Next retry time (for open state) */
  nextRetryTime?: Date;

  /** Half-open call count */
  halfOpenCalls: number;
};

/**
 * Circuit breaker events
 * Moved from src/lib/mcp/mcpCircuitBreaker.ts
 */
export type CircuitBreakerEvents = {
  stateChange: {
    oldState: CircuitBreakerState;
    newState: CircuitBreakerState;
    reason: string;
    timestamp: Date;
  };

  callSuccess: {
    duration: number;
    timestamp: Date;
  };

  callFailure: {
    error: string;
    duration: number;
    timestamp: Date;
  };

  circuitOpen: {
    failureRate: number;
    totalCalls: number;
    timestamp: Date;
  };

  circuitHalfOpen: {
    timestamp: Date;
  };

  circuitClosed: {
    timestamp: Date;
  };
};

/**
 * MCP Registry type with optional methods for maximum flexibility
 * Moved from src/lib/mcp/registry.ts
 */
export type McpRegistry = {
  // All methods optional (maximum flexibility)
  registerServer?(
    serverId: string,
    serverConfig?: unknown,
    context?: ExecutionContext,
  ): Promise<void>;
  executeTool?<T = unknown>(
    toolName: string,
    args?: unknown,
    context?: ExecutionContext,
  ): Promise<T>;
  listTools?(context?: ExecutionContext): Promise<ToolInfo[]>;
};

/**
 * MCP client creation result
 * Moved from src/lib/mcp/mcpClientFactory.ts
 */
export type MCPClientResult = {
  /** Whether client creation was successful */
  success: boolean;

  /** Created client instance */
  client?: import("@modelcontextprotocol/sdk/client/index.js").Client;

  /** Created transport instance */
  transport?: import("@modelcontextprotocol/sdk/shared/transport.js").Transport;

  /** Created process (for stdio transport) */
  process?: import("child_process").ChildProcess;

  /** Error message if failed */
  error?: string;

  /** Creation duration in milliseconds */
  duration: number;

  /** Server capabilities reported during handshake */
  capabilities?: import("@modelcontextprotocol/sdk/types.js").ClientCapabilities;
};

/**
 * Flexible validation result
 * Moved from src/lib/mcp/flexibleToolValidator.ts
 */
export type FlexibleValidationResult = {
  /** Whether validation passed */
  isValid: boolean;

  /** Validation error message (for simple cases) */
  error?: string;

  /** Validation warnings */
  warnings?: string[];

  /** Normalized parameters (if valid) */
  normalizedParams?: Record<string, unknown>;

  /** Validation metadata */
  metadata?: {
    validationTime?: number;
    validator?: string;
    schema?: string;
  };
};

// ============================================================================
// HTTP TRANSPORT TYPES - OAuth 2.1, Rate Limiting, Retry Configuration
// ============================================================================

// OAuthTokens — canonical definition in auth.ts

/**
 * Token storage type for OAuth 2.1 authentication
 * Implementations can use in-memory, file-based, or external storage
 */
export type TokenStorage = {
  /**
   * Get stored tokens for a server
   * @param serverId - Unique identifier for the MCP server
   * @returns Stored tokens or null if not found
   */
  getTokens(serverId: string): Promise<OAuthTokens | null>;

  /**
   * Save tokens for a server
   * @param serverId - Unique identifier for the MCP server
   * @param tokens - OAuth tokens to store
   */
  saveTokens(serverId: string, tokens: OAuthTokens): Promise<void>;

  /**
   * Delete stored tokens for a server
   * @param serverId - Unique identifier for the MCP server
   */
  deleteTokens(serverId: string): Promise<void>;

  /**
   * Check if tokens exist for a server
   * @param serverId - Unique identifier for the MCP server
   * @returns True if tokens exist
   */
  hasTokens?(serverId: string): Promise<boolean>;

  /**
   * Clear all stored tokens
   */
  clearAll?(): Promise<void>;
};

/**
 * OAuth 2.1 configuration for MCP servers
 */
export type MCPOAuthConfig = {
  /** OAuth client ID */
  clientId: string;
  /** OAuth client secret (optional for public clients with PKCE) */
  clientSecret?: string;
  /** Authorization endpoint URL */
  authorizationUrl: string;
  /** Token endpoint URL */
  tokenUrl: string;
  /** Redirect URI for OAuth callback */
  redirectUrl: string;
  /** OAuth scope (space-separated) */
  scope?: string;
  /** Enable PKCE (Proof Key for Code Exchange) - recommended for OAuth 2.1 */
  usePKCE?: boolean;
  /** Additional authorization parameters */
  additionalParams?: Record<string, string>;
};

/**
 * OAuth client information returned to MCP SDK
 */
export type OAuthClientInformation = {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
};

/**
 * Authorization URL result from OAuth flow
 */
export type AuthorizationUrlResult = {
  url: string;
  state: string;
  codeVerifier?: string;
};

/**
 * Token exchange request for OAuth code exchange
 */
export type TokenExchangeRequest = {
  code: string;
  state: string;
  codeVerifier?: string;
};

/**
 * Token bucket rate limit configuration options for HTTP transport
 */
export type TokenBucketRateLimitConfig = {
  /** Maximum requests per window */
  requestsPerWindow: number;
  /** Window size in milliseconds (default: 60000 = 1 minute) */
  windowMs: number;
  /** Use token bucket algorithm (default: true) */
  useTokenBucket: boolean;
  /** Token refill rate (tokens per second, for token bucket) */
  refillRate: number;
  /** Maximum burst size (for token bucket) */
  maxBurst: number;
};

/**
 * HTTP retry configuration for MCP transport
 */
export type HTTPRetryConfig = {
  /** Maximum retry attempts (default: 3) */
  maxAttempts: number;
  /** Initial delay in ms (default: 1000) */
  initialDelay: number;
  /** Maximum delay in ms (default: 30000) */
  maxDelay: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier: number;
  /** HTTP status codes that trigger retry */
  retryableStatusCodes: number[];
};

/**
 * PKCE (Proof Key for Code Exchange) challenge data for OAuth 2.1 authentication
 * Used internally by OAuth client providers to generate and store PKCE parameters
 */
export type PKCEChallenge = {
  /** Random code verifier string (43-128 characters, URL-safe) */
  codeVerifier: string;
  /** SHA-256 hash of code verifier, base64url encoded */
  codeChallenge: string;
  /** Challenge method - always "S256" per OAuth 2.1 specification */
  codeChallengeMethod: "S256";
};

/**
 * Rate limiter statistics for monitoring and debugging HTTP transport rate limiting
 * Provides insight into token bucket state and queue status
 */
export type RateLimiterStats = {
  /** Current number of available tokens */
  tokens: number;
  /** Maximum burst size (token capacity) */
  maxBurst: number;
  /** Token refill rate (tokens per second) */
  refillRate: number;
  /** Number of requests waiting in queue */
  queueLength: number;
  /** Timestamp of last token refill */
  lastRefill: Date;
};

/**
 * Token response from OAuth server
 * Standard OAuth 2.0/2.1 token endpoint response structure
 * Used internally by NeuroLinkOAuthProvider for token exchange and refresh
 */
export type TokenResponse = {
  /** Access token for API authentication */
  access_token: string;
  /** Refresh token for obtaining new access tokens (optional) */
  refresh_token?: string;
  /** Token lifetime in seconds (optional) */
  expires_in?: number;
  /** Token type (typically "Bearer") */
  token_type: string;
  /** OAuth scope granted (optional, space-separated) */
  scope?: string;
};

// =============================================================================
// MCP TOOL ANNOTATIONS (moved from mcp/toolAnnotations.ts)
// =============================================================================

/**
 * Tool annotation metadata for MCP tools.
 * Provides hints to AI models about tool behavior and safety.
 */
export type MCPToolAnnotations = {
  /** Human-readable title for the tool */
  title?: string;
  /** Whether the tool only reads data without side effects */
  readOnlyHint?: boolean;
  /** Whether the tool performs destructive operations */
  destructiveHint?: boolean;
  /** Whether the tool can be safely retried without side effects */
  idempotentHint?: boolean;
  /** Whether the tool requires user confirmation before execution */
  requiresConfirmation?: boolean;
  /** Whether the tool operates on an open world of resources */
  openWorldHint?: boolean;
  /** Custom tags for categorization and filtering */
  tags?: string[];
  /** Estimated execution time in milliseconds */
  estimatedDuration?: number;
  /** Rate limit hint (calls per minute) */
  rateLimitHint?: number;
  /** Cost hint (arbitrary units for comparison) */
  costHint?: number;
  /** Complexity level for UI display */
  complexity?: "simple" | "medium" | "complex";
  /** Whether tool execution should be audited/logged */
  auditRequired?: boolean;
  /** Security classification for the tool */
  securityLevel?: "public" | "internal" | "restricted";
};

/**
 * Enhanced tool definition with annotations.
 */
export type MCPServerTool = {
  name: string;
  description: string;
  inputSchema?: JsonObject;
  outputSchema?: JsonObject;
  annotations?: MCPToolAnnotations;
  execute: (
    params: unknown,
    context?: NeuroLinkExecutionContext,
  ) => Promise<ToolResult | unknown>;
  metadata?: Record<string, unknown>;
};

// =============================================================================
// MCP SERVER BASE CONFIG / EVENTS (moved from mcp/mcpServerBase.ts)
// =============================================================================

/**
 * Base configuration for an MCP server.
 */
export type MCPServerBaseConfig = {
  /** Unique server identifier */
  id: string;
  /** Human-readable server name */
  name: string;
  /** Server description */
  description?: string;
  /** Server version */
  version?: string;
  /** Server category for organization */
  category?: MCPServerCategory;
  /** Transport protocol preference */
  transport?: MCPTransportType;
  /** Custom metadata */
  metadata?: Record<string, JsonValue>;
  /** Default timeout for tool execution in milliseconds (default: 30000) */
  defaultTimeoutMs?: number;
  /** Global tool annotations applied to all tools */
  defaultAnnotations?: MCPToolAnnotations;
};

/**
 * Server lifecycle events.
 */
export type MCPServerEvents = {
  toolRegistered: { toolName: string; tool: MCPServerTool };
  toolExecuted: { toolName: string; duration: number; success: boolean };
  toolError: { toolName: string; error: Error };
  serverReady: { tools: string[] };
  serverStopped: { reason?: string };
};

/**
 * Agent definition for MCP exposure
 */

export type ExposableAgent = {
  /**
   * Unique agent identifier
   */
  id: string;

  /**
   * Human-readable agent name
   */
  name: string;

  /**
   * Agent description for AI models
   */
  description: string;

  /**
   * Input schema for the agent
   */
  inputSchema?: JsonObject;

  /**
   * Output schema for the agent
   */
  outputSchema?: JsonObject;

  /**
   * Agent execution function
   */
  execute: (
    input: unknown,
    context?: NeuroLinkExecutionContext,
  ) => Promise<unknown>;

  /**
   * Additional agent metadata
   */
  metadata?: {
    version?: string;
    author?: string;
    category?: string;
    tags?: string[];
    estimatedDuration?: number;
    costHint?: number;
  };
};

/**
 * Workflow definition for MCP exposure
 */

export type ExposableWorkflow = {
  /**
   * Unique workflow identifier
   */
  id: string;

  /**
   * Human-readable workflow name
   */
  name: string;

  /**
   * Workflow description
   */
  description: string;

  /**
   * Workflow steps (for documentation)
   */
  steps?: Array<{
    id: string;
    name: string;
    description?: string;
  }>;

  /**
   * Input schema for the workflow
   */
  inputSchema?: JsonObject;

  /**
   * Output schema for the workflow
   */
  outputSchema?: JsonObject;

  /**
   * Workflow execution function
   */
  execute: (
    input: unknown,
    context?: NeuroLinkExecutionContext,
  ) => Promise<unknown>;

  /**
   * Workflow metadata
   */
  metadata?: {
    version?: string;
    author?: string;
    category?: string;
    tags?: string[];
    estimatedDuration?: number;
    retriable?: boolean;
    idempotent?: boolean;
  };
};

/**
 * Options for exposing agents/workflows as MCP tools
 */

export type ExposureOptions = {
  /**
   * Prefix for tool names
   */
  prefix?: string;

  /**
   * Default annotations for all exposed tools
   */
  defaultAnnotations?: MCPToolAnnotations;

  /**
   * Whether to include metadata in tool description
   */
  includeMetadataInDescription?: boolean;

  /**
   * Custom name transformer
   */
  nameTransformer?: (name: string) => string;

  /**
   * Add execution context wrapper
   */
  wrapWithContext?: boolean;

  /**
   * Timeout for agent/workflow execution (ms)
   */
  executionTimeout?: number;

  /**
   * Enable execution logging
   */
  enableLogging?: boolean;
};

/**
 * Exposure result
 */

export type ExposureResult = {
  /**
   * Generated MCP tool
   */
  tool: MCPServerTool;

  /**
   * Original source type
   */
  sourceType: "agent" | "workflow";

  /**
   * Original source ID
   */
  sourceId: string;

  /**
   * Generated tool name
   */
  toolName: string;
};

/**
 * MCP elicitation protocol message types
 */

export type ElicitationProtocolMessageType =
  | "elicitation/request"
  | "elicitation/response"
  | "elicitation/cancel";

/**
 * Request params type
 */

export type ElicitationRequestParams = {
  type: ElicitationType;
  message: string;
  toolName: string;
  serverId?: string;
  timeout?: number;
  optional?: boolean;
  defaultValue?: JsonValue;
  options?: Record<string, JsonValue>;
};

/**
 * Response params type
 */

export type ElicitationResponseParams = {
  requestId: string;
  responded: boolean;
  value?: JsonValue;
  cancelled?: boolean;
  timedOut?: boolean;
  error?: string;
};

/**
 * Cancel params type
 */

export type ElicitationCancelParams = {
  requestId: string;
  reason?: string;
};

/**
 * Base protocol message structure
 */

export type ElicitationProtocolMessage = {
  jsonrpc: "2.0";
  id: string;
  method: ElicitationProtocolMessageType;
  params:
    | ElicitationRequestParams
    | ElicitationResponseParams
    | ElicitationCancelParams;
};

/**
 * Elicitation request protocol message
 */

export type ElicitationRequestMessage = {
  jsonrpc: "2.0";
  id: string;
  method: "elicitation/request";
  params: ElicitationRequestParams;
};

/**
 * Elicitation response protocol message
 */

export type ElicitationResponseMessage = {
  jsonrpc: "2.0";
  id: string;
  method: "elicitation/response";
  params: ElicitationResponseParams;
};

/**
 * Elicitation cancel protocol message
 */

export type ElicitationCancelMessage = {
  jsonrpc: "2.0";
  id: string;
  method: "elicitation/cancel";
  params: ElicitationCancelParams;
};

/**
 * Protocol message union type
 */

export type ElicitationProtocolPayload =
  | ElicitationRequestMessage
  | ElicitationResponseMessage
  | ElicitationCancelMessage;

/**
 * Protocol handler function type
 */

export type ElicitationProtocolHandler = (
  message: ElicitationProtocolPayload,
) => Promise<ElicitationProtocolPayload | void>;

/**
 * Protocol adapter configuration
 */

export type ElicitationProtocolAdapterConfig = {
  manager?: import("../mcp/elicitation/elicitationManager.js").ElicitationManager;
  defaultTimeout?: number;
  enableLogging?: boolean;
  customHandler?: ElicitationProtocolHandler;
};

/**
 * Enhanced tool info with annotations
 */

export type EnhancedToolInfo = ExternalMCPToolInfo & {
  annotations?: MCPToolAnnotations;
  version?: string;
  compatibleWith?: string[];
  aliases?: string[];
  examples?: Array<{
    name: string;
    description: string;
    params: JsonObject;
  }>;
};

/**
 * Tool search criteria
 */

export type ToolSearchCriteria = {
  /**
   * Search by name (partial match)
   */
  name?: string;

  /**
   * Search by description (keyword match)
   */
  description?: string;

  /**
   * Filter by server IDs
   */
  serverIds?: string[];

  /**
   * Filter by category
   */
  category?: string;

  /**
   * Filter by tags
   */
  tags?: string[];

  /**
   * Filter by annotation flags
   */
  annotations?: Partial<MCPToolAnnotations>;

  /**
   * Include unavailable tools
   */
  includeUnavailable?: boolean;

  /**
   * Maximum results
   */
  limit?: number;

  /**
   * Sort by field
   */
  sortBy?: "name" | "calls" | "successRate" | "avgExecutionTime";

  /**
   * Sort direction
   */
  sortDirection?: "asc" | "desc";
};

/**
 * Tool search result
 */

export type ToolSearchResult = {
  tools: EnhancedToolInfo[];
  totalCount: number;
  criteria: ToolSearchCriteria;
  executionTime: number;
};

/**
 * Tool compatibility check result
 */

export type CompatibilityCheckResult = {
  compatible: boolean;
  issues: string[];
  warnings: string[];
  recommendations: string[];
};

/**
 * Registry source types
 */

export type RegistrySourceType =
  | "official" // Official MCP registry
  | "npm" // NPM packages
  | "github" // GitHub repositories
  | "custom";

/**
 * Registry entry for an MCP server
 */

export type McpRegistryEntry = {
  /**
   * Unique identifier
   */
  id: string;

  /**
   * Server name
   */
  name: string;

  /**
   * Server description
   */
  description: string;

  /**
   * Server version
   */
  version: string;

  /**
   * Author or maintainer
   */
  author?: string;

  /**
   * License
   */
  license?: string;

  /**
   * Homepage URL
   */
  homepage?: string;

  /**
   * Repository URL
   */
  repository?: string;

  /**
   * NPM package name (if applicable)
   */
  npmPackage?: string;

  /**
   * Installation command
   */
  installCommand?: string;

  /**
   * Command to run the server
   */
  command?: string;

  /**
   * Command arguments
   */
  args?: string[];

  /**
   * Required environment variables
   */
  requiredEnvVars?: string[];

  /**
   * Supported transport types
   */
  transports?: MCPTransportType[];

  /**
   * Server categories
   */
  categories?: string[];

  /**
   * Server tags
   */
  tags?: string[];

  /**
   * Tool names provided by the server
   */
  tools?: string[];

  /**
   * Download count (popularity metric)
   */
  downloads?: number;

  /**
   * Star count (if from GitHub)
   */
  stars?: number;

  /**
   * Last updated date
   */
  lastUpdated?: string;

  /**
   * Verification status
   */
  verified?: boolean;

  /**
   * Custom metadata
   */
  metadata?: JsonObject;
};

/**
 * Registry configuration
 */

export type RegistryConfig = {
  /**
   * Registry type
   */
  type: RegistrySourceType;

  /**
   * Registry URL or identifier
   */
  url?: string;

  /**
   * Authentication token
   */
  authToken?: string;

  /**
   * Request timeout in milliseconds
   */
  timeout?: number;

  /**
   * Enable caching
   */
  enableCache?: boolean;

  /**
   * Cache TTL in milliseconds
   */
  cacheTTL?: number;
};

/**
 * Search options for registry queries
 */

export type RegistrySearchOptions = {
  /**
   * Search query (name, description, tags)
   */
  query?: string;

  /**
   * Filter by categories
   */
  categories?: string[];

  /**
   * Filter by tags
   */
  tags?: string[];

  /**
   * Filter by transport type
   */
  transport?: MCPTransportType;

  /**
   * Only verified servers
   */
  verifiedOnly?: boolean;

  /**
   * Sort by field
   */
  sortBy?: "name" | "downloads" | "stars" | "lastUpdated";

  /**
   * Sort direction
   */
  sortDirection?: "asc" | "desc";

  /**
   * Maximum results
   */
  limit?: number;

  /**
   * Offset for pagination
   */
  offset?: number;
};

/**
 * Search result
 */

export type RegistrySearchResult = {
  entries: McpRegistryEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

/**
 * Registry client configuration
 */

export type MCPRegistryClientConfig = {
  /**
   * Default registries to use
   */
  registries?: RegistryConfig[];

  /**
   * Enable automatic caching
   */
  enableCache?: boolean;

  /**
   * Default cache TTL
   */
  defaultCacheTTL?: number;

  /**
   * Request timeout
   */
  timeout?: number;

  /**
   * User agent string
   */
  userAgent?: string;
};

/**
 * Load balancing strategies
 */

export type LoadBalancingStrategy =
  | "round-robin" // Rotate through servers
  | "least-loaded" // Prefer server with fewest active requests
  | "random" // Random selection
  | "weighted" // Weighted random based on priority
  | "failover-only";

/**
 * Server weight for weighted load balancing
 */

export type ServerWeight = {
  serverId: string;
  weight: number; // 0-100, higher = more traffic
  priority: number; // Lower = higher priority for failover
};

/**
 * Server group definition
 */

export type ServerGroup = {
  /**
   * Group identifier
   */
  id: string;

  /**
   * Human-readable name
   */
  name: string;

  /**
   * Description of the group
   */
  description?: string;

  /**
   * Server IDs in this group
   */
  servers: string[];

  /**
   * Load balancing strategy for this group
   */
  strategy: LoadBalancingStrategy;

  /**
   * Weights for weighted strategy
   */
  weights?: ServerWeight[];

  /**
   * Whether to enable health-aware routing
   */
  healthAware?: boolean;

  /**
   * Minimum healthy servers before alerting
   */
  minHealthyServers?: number;
};

/**
 * Unified tool entry from multiple servers
 */

export type UnifiedTool = {
  /**
   * Tool name
   */
  name: string;

  /**
   * Tool description
   */
  description: string;

  /**
   * Servers that provide this tool
   */
  servers: Array<{
    serverId: string;
    serverName: string;
    inputSchema?: JsonObject;
    priority: number;
  }>;

  /**
   * Whether this tool has naming conflicts
   */
  hasConflict: boolean;

  /**
   * Preferred server for this tool
   */
  preferredServerId?: string;
};

/**
 * Multi-server manager configuration
 */

export type MultiServerManagerConfig = {
  /**
   * Default load balancing strategy
   */
  defaultStrategy?: LoadBalancingStrategy;

  /**
   * Enable health-aware routing by default
   */
  healthAwareRouting?: boolean;

  /**
   * Health check interval in milliseconds
   */
  healthCheckInterval?: number;

  /**
   * Maximum retries on failover
   */
  maxFailoverRetries?: number;

  /**
   * Tool namespace separator
   */
  namespaceSeparator?: string;

  /**
   * Enable automatic tool namespace prefixing
   */
  autoNamespace?: boolean;

  /**
   * Conflict resolution strategy.
   * Reserved for future conflict resolution strategy — currently stored but not
   * consumed by any routing or tool-merge logic.
   */
  conflictResolution?: "first-wins" | "last-wins" | "namespace" | "explicit";
};

/**
 * MCP Resource definition
 */

export type MCPResource = {
  /**
   * Unique resource URI
   */
  uri: string;

  /**
   * Human-readable name
   */
  name: string;

  /**
   * Resource description
   */
  description?: string;

  /**
   * MIME type of the resource content
   */
  mimeType?: string;

  /**
   * Resource size in bytes (if known)
   */
  size?: number;

  /**
   * Whether the resource content can change
   */
  dynamic?: boolean;

  /**
   * Resource annotations/metadata
   */
  annotations?: {
    /**
     * Audience description
     */
    audience?: string[];
    /**
     * Priority hint (0-1)
     */
    priority?: number;
  };
};

/**
 * Resource content returned when reading a resource
 */

export type ResourceContent = {
  /**
   * Resource URI
   */
  uri: string;

  /**
   * MIME type
   */
  mimeType?: string;

  /**
   * Text content (for text/* MIME types)
   */
  text?: string;

  /**
   * Binary content as base64 (for non-text MIME types)
   */
  blob?: string;
};

/**
 * Resource reader function type
 */

export type ResourceReader = (
  uri: string,
  context?: JsonObject,
) => Promise<ResourceContent>;

/**
 * Registered resource with reader
 */

export type RegisteredResource = MCPResource & {
  reader: ResourceReader;
};

/**
 * MCP Prompt definition
 */

export type MCPPrompt = {
  /**
   * Unique prompt name
   */
  name: string;

  /**
   * Human-readable description
   */
  description?: string;

  /**
   * Prompt arguments schema
   */
  arguments?: Array<{
    /**
     * Argument name
     */
    name: string;
    /**
     * Argument description
     */
    description?: string;
    /**
     * Whether the argument is required
     */
    required?: boolean;
  }>;
};

/**
 * Prompt message content
 */

export type PromptMessage = {
  /**
   * Message role
   */
  role: "user" | "assistant";

  /**
   * Message content
   */
  content: {
    type: "text" | "image" | "resource";
    text?: string;
    data?: string;
    mimeType?: string;
    uri?: string;
  };
};

/**
 * Result of getting a prompt
 */

export type PromptResult = {
  /**
   * Optional description
   */
  description?: string;

  /**
   * Prompt messages
   */
  messages: PromptMessage[];
};

/**
 * Prompt generator function type
 */

export type PromptGenerator = (
  args: Record<string, JsonValue>,
  context?: JsonObject,
) => Promise<PromptResult>;

/**
 * Registered prompt with generator
 */

export type RegisteredPrompt = MCPPrompt & {
  generator: PromptGenerator;
};

/**
 * Resource subscription callback
 */

export type ResourceSubscriptionCallback = (
  uri: string,
  content: ResourceContent,
) => void | Promise<void>;

/**
 * Server capabilities configuration
 */

export type ServerCapabilitiesConfig = {
  /**
   * Enable resource support
   */
  resources?: boolean;

  /**
   * Enable prompt support
   */
  prompts?: boolean;

  /**
   * Enable resource subscriptions
   */
  resourceSubscriptions?: boolean;
};

/**
 * NeuroLink internal tool format
 */

export type NeuroLinkTool = {
  /**
   * Tool name
   */
  name: string;

  /**
   * Tool description
   */
  description: string;

  /**
   * Input parameters schema
   */
  parameters?: JsonObject;

  /**
   * Tool execution function
   */
  execute: (
    params: unknown,
    context?: NeuroLinkExecutionContext,
  ) => Promise<ToolResult | unknown>;

  /**
   * Category for organization
   */
  category?: string;

  /**
   * Tags for filtering
   */
  tags?: string[];

  /**
   * Whether the tool is async
   */
  isAsync?: boolean;

  /**
   * Custom metadata
   */
  metadata?: Record<string, JsonValue>;
};

/**
 * MCP protocol tool format (from @modelcontextprotocol/sdk)
 */

export type MCPProtocolTool = {
  /**
   * Tool name
   */
  name: string;

  /**
   * Tool description
   */
  description?: string;

  /**
   * JSON Schema for input
   */
  inputSchema: {
    type: "object";
    properties?: Record<string, JsonObject>;
    required?: string[];
  };

  /**
   * Optional annotations (MCP 2024-11-05+)
   */
  annotations?: {
    title?: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
};

/**
 * Tool converter options
 */

export type ToolConverterOptions = {
  /**
   * Automatically infer annotations from tool definition
   */
  inferAnnotations?: boolean;

  /**
   * Default annotations to apply
   */
  defaultAnnotations?: MCPToolAnnotations;

  /**
   * Whether to preserve original metadata
   */
  preserveMetadata?: boolean;

  /**
   * Namespace prefix for tool names
   */
  namespacePrefix?: string;
};

/**
 * Tool execution context with elicitation support
 */

export type EnhancedExecutionContext = NeuroLinkExecutionContext & {
  /**
   * Elicitation context for interactive input
   */
  elicitation: ElicitationContext;

  /**
   * Tool metadata
   */
  toolMeta: {
    name: string;
    serverId?: string;
    annotations?: MCPToolAnnotations;
  };
};

/**
 * Tool wrapper options
 */

export type ToolWrapperOptions = {
  /**
   * Elicitation manager to use
   */
  elicitationManager?: import("../mcp/elicitation/elicitationManager.js").ElicitationManager;

  /**
   * Auto-confirm destructive operations
   */
  autoConfirmDestructive?: boolean;

  /**
   * Default timeout for elicitations
   */
  elicitationTimeout?: number;

  /**
   * Enable logging
   */
  enableLogging?: boolean;
};

/**
 * Tool execution middleware
 */

export type ToolMiddleware = (
  tool: MCPServerTool,
  params: unknown,
  context: EnhancedExecutionContext,
  next: () => Promise<ToolResult | unknown>,
) => Promise<ToolResult | unknown>;

/**
 * Batch configuration options
 */

export type BatchConfig = {
  /**
   * Maximum number of requests to batch together (default: 10)
   */
  maxBatchSize: number;

  /**
   * Maximum time to wait for a full batch in milliseconds (default: 100ms)
   */
  maxWaitMs: number;

  /**
   * Enable parallel execution of batched requests (default: true).
   * Reserved for future parallel batch execution; currently stored but not read.
   */
  enableParallel?: boolean;

  /**
   * Maximum concurrent batches in flight (default: 5)
   */
  maxConcurrentBatches?: number;

  /**
   * Group requests by server ID (default: true)
   */
  groupByServer?: boolean;
};

/**
 * Batch execution result
 */

export type BatchResult<T> = {
  id: string;
  success: boolean;
  result?: T;
  error?: Error;
  executionTime: number;
};

/**
 * Batch executor function type
 */

export type BatchExecutor<T> = (
  requests: Array<{ tool: string; args: unknown; serverId?: string }>,
) => Promise<Array<{ success: boolean; result?: T; error?: Error }>>;

/**
 * Batcher events
 */

export type BatcherEvents<T> = {
  batchStarted: { batchId: string; size: number };
  batchCompleted: { batchId: string; results: BatchResult<T>[] };
  batchFailed: { batchId: string; error: Error };
  requestQueued: { requestId: string; queueSize: number };
  flushTriggered: { reason: "size" | "timeout" | "manual"; queueSize: number };
};

/**
 * Cache eviction strategy
 */

export type CacheStrategy = "lru" | "fifo" | "lfu";

/**
 * Cache configuration options
 */

export type McpCacheConfig = {
  /**
   * Time-to-live in milliseconds (default: 5 minutes)
   */
  ttl: number;

  /**
   * Maximum number of entries (default: 500)
   */
  maxSize: number;

  /**
   * Eviction strategy (default: 'lru')
   */
  strategy: CacheStrategy;

  /**
   * Enable automatic cleanup of expired entries
   */
  enableAutoCleanup?: boolean;

  /**
   * Cleanup interval in milliseconds (default: 60 seconds)
   */
  cleanupInterval?: number;

  /**
   * Namespace for cache keys (optional)
   */
  namespace?: string;
};

/**
 * Cache statistics
 */

export type CacheStats = {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  maxSize: number;
  hitRate: number;
};

/**
 * Cache events
 */

export type CacheEvents = {
  hit: { key: string; value: unknown };
  miss: { key: string };
  set: { key: string; value: unknown; ttl: number };
  evict: { key: string; reason: "expired" | "capacity" | "manual" };
  clear: { entriesRemoved: number };
};

/**
 * Routing strategy types
 */

export type RoutingStrategy =
  | "round-robin" // Distribute evenly across servers
  | "least-loaded" // Route to server with fewest active connections
  | "capability-based" // Route based on server capabilities/features
  | "affinity" // Route based on session/user affinity
  | "priority" // Route based on server priority weights
  | "random";

/**
 * Server routing weight configuration
 */

export type McpServerWeight = {
  serverId: string;
  weight: number; // 0-100, higher = more traffic
  capabilities?: string[];
};

/**
 * Category to server mapping
 */

export type CategoryMapping = {
  category: string;
  serverIds: string[];
  priority?: number;
};

/**
 * Affinity rule for session-based routing
 */

export type AffinityRule = {
  key: string; // e.g., "sessionId", "userId"
  serverId: string;
  expiresAt?: number;
};

/**
 * Tool Router configuration
 */

export type ToolRouterConfig = {
  /**
   * Primary routing strategy
   */
  strategy: RoutingStrategy;

  /**
   * Enable session/user affinity for consistent routing
   */
  enableAffinity?: boolean;

  /**
   * Category to server mapping for capability-based routing
   */
  categoryMapping?: Record<string, string[]>;

  /**
   * Server weights for priority-based routing
   */
  serverWeights?: McpServerWeight[];

  /**
   * Fallback strategy if primary fails
   */
  fallbackStrategy?: RoutingStrategy;

  /**
   * Maximum retries for failed routes
   */
  maxRetries?: number;

  /**
   * Health check interval in milliseconds
   */
  healthCheckInterval?: number;

  /**
   * Affinity TTL in milliseconds (default: 30 minutes)
   */
  affinityTtl?: number;
};

/**
 * Routing decision result
 */

export type RoutingDecision = {
  serverId: string;
  strategy: RoutingStrategy;
  confidence: number; // 0-1, how confident the router is in this decision
  alternates?: string[]; // Fallback servers
  reason?: string;
};

/**
 * Tool Router events
 */

export type ToolRouterEvents = {
  routeDecision: {
    toolName: string;
    decision: RoutingDecision;
  };
  routeFailed: {
    toolName: string;
    error: Error;
    attemptedServers: string[];
  };
  affinitySet: {
    key: string;
    serverId: string;
  };
  affinityExpired: {
    key: string;
  };
  healthUpdate: {
    serverId: string;
    healthy: boolean;
  };
};

/**
 * MCP Tool type with annotations
 */

export type MCPTool = ToolInfo & {
  annotations?: MCPToolAnnotations;
  serverId?: string;
  category?: string;
};

// =============================================================================
// REQUEST BATCHER (from mcp/batching/requestBatcher.ts)
// =============================================================================

/** Pending request in the batcher queue. */
export type PendingRequest<T = unknown> = {
  id: string;
  tool: string;
  args: unknown;
  serverId?: string;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  addedAt: number;
};

// =============================================================================
// TOOL CACHE (from mcp/caching/toolCache.ts)
// =============================================================================

/**
 * Cached entry held by ToolCache. Named McpCacheEntry to disambiguate from
 * the response-caching middleware's CacheEntry in server.ts (Rule 9).
 */
export type McpCacheEntry<T = unknown> = {
  value: T;
  expires: number;
  createdAt: number;
  accessedAt: number;
  accessCount: number;
  key: string;
};

// =============================================================================
// MULTI-SERVER MANAGER (from mcp/multiServerManager.ts)
// =============================================================================

/** Runtime metrics tracked per MCP server by MultiServerManager. */
export type ServerMetrics = {
  activeRequests: number;
  totalRequests: number;
  completedRequests: number;
  averageResponseTime: number;
  errorRate: number;
  lastHealthCheck?: Date;
  isHealthy: boolean;
};

// =============================================================================
// AI WORKFLOW TOOLS (from mcp/servers/aiProviders/aiWorkflowTools.ts)
// =============================================================================

/** Synthesized test case produced by the AI workflow test-generator. */
export type WorkflowTestCase = {
  name: string;
  type: string;
  code: string;
  description: string;
  assertions: number;
};

/** Result of the code-refactoring AI workflow. */
export type RefactoringResult = {
  refactoredCode: string;
  changes: string[];
  improvements: string[];
  metrics: {
    linesReduced: number;
    complexityReduction: number;
    readabilityScore: number;
  };
};

/** Result of the AI documentation-generation workflow. */
export type DocumentationResult = {
  documentation: string;
  sections: string[];
  examples: string[];
  coverage: number;
};

/** Result of the AI debugging workflow. */
export type DebugResult = {
  issues: Array<{
    type: string;
    severity: "low" | "medium" | "high";
    description: string;
    location?: string;
  }>;
  suggestions: string[];
  possibleCauses: string[];
  fixedOutput?: string;
};

// =============================================================================
// AI ANALYSIS TOOLS (from mcp/servers/aiProviders/aiAnalysisTools.ts)
// =============================================================================

/** Provider name accepted by the AI analysis MCP tools. */
export type AiAnalysisProvider =
  | "openai"
  | "bedrock"
  | "vertex"
  | "anthropic"
  | "google-ai"
  | "azure"
  | "huggingface"
  | "ollama"
  | "mistral";

/** Parsed input for the analyze-ai-usage MCP tool. */
export type AnalyzeUsageParams = {
  sessionId?: string;
  timeRange: "1h" | "24h" | "7d" | "30d";
  provider?: AiAnalysisProvider;
  includeTokenBreakdown: boolean;
  includeCostEstimation: boolean;
};

/** Parsed input for the benchmark-provider-performance MCP tool. */
export type BenchmarkParams = {
  providers?: AiAnalysisProvider[];
  testPrompts?: string[];
  iterations: number;
  metrics: Array<"latency" | "quality" | "cost" | "tokens">;
  maxTokens: number;
};

/** Parsed input for the optimize-prompt-parameters MCP tool. */
export type OptimizeParametersParams = {
  prompt: string;
  provider?: AiAnalysisProvider;
  targetLength?: number;
  style: "creative" | "balanced" | "precise" | "factual";
  optimizeFor: "speed" | "quality" | "cost" | "tokens";
  iterations: number;
};
