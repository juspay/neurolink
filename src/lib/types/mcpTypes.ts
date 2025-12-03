/**
 * MCP Types for In-Memory Server Support
 * Enables various integrations to register tools directly
 */

import type { JsonValue, JsonObject } from "./common.js";
import type { ExecutionContext, ToolInfo } from "./tools.js";

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
  timeout?: number;
  retries?: number;
  error?: string;
  installed?: boolean; // CLI-specific

  // Process management fields (from ExternalMCPServerConfig)
  cwd?: string; // Working directory for the process
  autoRestart?: boolean; // Whether to automatically restart on failure
  healthCheckInterval?: number; // Health check interval in milliseconds

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
 * Call record for circuit breaker statistics tracking
 * Extracted from mcpCircuitBreaker.ts for centralized type management
 */
export type CallRecord = {
  timestamp: number;
  success: boolean;
  duration: number;
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

/**
 * Tool execution result - Standardized result format
 */
export type ToolResult = {
  success: boolean;
  data?: unknown;
  error?: string | Error;
  usage?: {
    tokens?: number;
    cost?: number;
    provider?: string;
    model?: string;
    executionTime?: number;
  };
  metadata?: {
    toolName?: string;
    serverId?: string;
    serverTitle?: string;
    sessionId?: string;
    timestamp?: number;
    executionTime?: number;
    executionId?: string;
    [key: string]: unknown;
  };
};

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

import type { StandardRecord } from "./typeAliases.js";

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
  tools: import("./externalMcp.js").ExternalMCPToolInfo[];

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
  context?: Partial<import("./externalMcp.js").ExternalMCPToolContext>;

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
    toolInfo: import("./externalMcp.js").ExternalMCPToolInfo;
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
