/**
 * External MCP Server Types
 * Comprehensive type system for external MCP server integration
 * Following MCP 2024-11-05 specification
 */

import type { JsonValue, JsonObject } from "./common.js";
import type { ChildProcess } from "child_process";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
/**
 * Supported MCP transport protocols
 */
export type MCPTransportType = "stdio" | "sse" | "websocket";

/**
 * External MCP server configuration for process spawning
 */
export type ExternalMCPServerConfig = {
  /** Unique identifier for the server */
  id: string;

  /** Command to execute (e.g., 'npx', 'node', 'python') */
  command: string;

  /** Arguments to pass to the command */
  args: string[];

  /** Environment variables for the process */
  env?: Record<string, string>;

  /** Transport protocol to use */
  transport: MCPTransportType;

  /** Connection timeout in milliseconds (default: 10000) */
  timeout?: number;

  /** Maximum retry attempts for connection (default: 3) */
  retries?: number;

  /** Health check interval in milliseconds (default: 30000) */
  healthCheckInterval?: number;

  /** Whether to automatically restart on failure (default: true) */
  autoRestart?: boolean;

  /** Working directory for the process */
  cwd?: string;

  /** URL for SSE/WebSocket transports */
  url?: string;

  /** Additional metadata */
  metadata?: Record<string, JsonValue>;
};

/**
 * Runtime state of an external MCP server instance
 */
export type ExternalMCPServerInstance = {
  /** Server configuration */
  config: ExternalMCPServerConfig;

  /** Child process (for stdio transport) */
  process: ChildProcess | null;

  /** MCP client instance */
  client: Client | null;

  /** Transport instance */
  transport: Transport | null;

  /** Current server status */
  status: ExternalMCPServerStatus;

  /** Last error message if any */
  lastError?: string;

  /** When the server was started */
  startTime?: Date;

  /** When the server was last seen healthy */
  lastHealthCheck?: Date;

  /** Number of reconnection attempts */
  reconnectAttempts: number;

  /** Maximum reconnection attempts before giving up */
  maxReconnectAttempts: number;

  /** Available tools from this server */
  tools: Map<string, ExternalMCPToolInfo>;

  /** Cached tools array for ZERO conversion - MCP format */
  toolsArray?: Array<{
    name: string;
    description: string;
    inputSchema?: object;
  }>;

  /** Server capabilities reported by MCP */
  capabilities?: Record<string, JsonValue>;

  /** Health monitoring timer */
  healthTimer?: NodeJS.Timeout;

  /** Restart backoff timer */
  restartTimer?: NodeJS.Timeout;

  /** Performance metrics */
  metrics: {
    totalConnections: number;
    totalDisconnections: number;
    totalErrors: number;
    totalToolCalls: number;
    averageResponseTime: number;
    lastResponseTime: number;
  };
};

/**
 * External MCP server status states
 */
export type ExternalMCPServerStatus =
  | "initializing" // Server is being started
  | "connecting" // Attempting to connect
  | "connected" // Successfully connected and ready
  | "disconnected" // Cleanly disconnected
  | "failed" // Connection failed
  | "restarting" // Server is being restarted
  | "stopping" // Server is being stopped
  | "stopped"; // Server has been stopped

/**
 * Tool information from external MCP server
 */
export type ExternalMCPToolInfo = {
  /** Tool name */
  name: string;

  /** Tool description */
  description: string;

  /** Server ID that provides this tool */
  serverId: string;

  /** Input schema (JSON Schema) */
  inputSchema?: JsonObject;

  /** Whether the tool is currently available */
  isAvailable: boolean;

  /** Tool metadata */
  metadata?: Record<string, JsonValue>;

  /** When the tool was last successfully called */
  lastCalled?: Date;

  /** Tool execution statistics */
  stats: {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    averageExecutionTime: number;
    lastExecutionTime: number;
  };
};

/**
 * External MCP server health status
 */
export type ExternalMCPServerHealth = {
  /** Server ID */
  serverId: string;

  /** Whether the server is healthy */
  isHealthy: boolean;

  /** Current status */
  status: ExternalMCPServerStatus;

  /** When the health check was performed */
  checkedAt: Date;

  /** Response time for health check */
  responseTime?: number;

  /** Number of available tools */
  toolCount: number;

  /** Any health issues detected */
  issues: string[];

  /** Performance metrics */
  performance: {
    uptime: number;
    memoryUsage?: number;
    cpuUsage?: number;
    averageResponseTime: number;
  };
};

/**
 * External MCP server configuration validation result
 */
export type ExternalMCPConfigValidation = {
  /** Whether the configuration is valid */
  isValid: boolean;

  /** Validation errors */
  errors: string[];

  /** Validation warnings */
  warnings: string[];

  /** Suggestions for improvement */
  suggestions: string[];
};

/**
 * External MCP server operation result
 */
export type ExternalMCPOperationResult<T = unknown> = {
  /** Whether the operation was successful */
  success: boolean;

  /** Result data if successful */
  data?: T;

  /** Error message if failed */
  error?: string;

  /** Server ID */
  serverId?: string;

  /** Operation duration in milliseconds */
  duration?: number;

  /** Additional metadata */
  metadata?: {
    timestamp: number;
    operation: string;
    [key: string]: JsonValue;
  };
};

/**
 * External MCP tool execution context
 */
export type ExternalMCPToolContext = {
  /** Execution session ID */
  sessionId: string;

  /** User ID if available */
  userId?: string;

  /** Server ID executing the tool */
  serverId: string;

  /** Tool name being executed */
  toolName: string;

  /** Execution timeout in milliseconds */
  timeout?: number;

  /** Additional context data */
  metadata?: Record<string, JsonValue>;
};

/**
 * External MCP tool execution result
 */
export type ExternalMCPToolResult = {
  /** Whether the execution was successful */
  success: boolean;

  /** Result data if successful */
  data?: unknown;

  /** Error message if failed */
  error?: string;

  /** Execution duration in milliseconds */
  duration: number;

  /** Tool execution metadata */
  metadata?: {
    toolName: string;
    serverId: string;
    timestamp: number;
    [key: string]: JsonValue;
  };
};

/**
 * External MCP server events
 */
export type ExternalMCPServerEvents = {
  /** Server status changed */
  statusChanged: {
    serverId: string;
    oldStatus: ExternalMCPServerStatus;
    newStatus: ExternalMCPServerStatus;
    timestamp: Date;
  };

  /** Server connected successfully */
  connected: {
    serverId: string;
    toolCount: number;
    timestamp: Date;
  };

  /** Server disconnected */
  disconnected: {
    serverId: string;
    reason?: string;
    timestamp: Date;
  };

  /** Server failed */
  failed: {
    serverId: string;
    error: string;
    timestamp: Date;
  };

  /** Tool discovered */
  toolDiscovered: {
    serverId: string;
    toolName: string;
    toolInfo: ExternalMCPToolInfo;
    timestamp: Date;
  };

  /** Tool removed */
  toolRemoved: {
    serverId: string;
    toolName: string;
    timestamp: Date;
  };

  /** Health check completed */
  healthCheck: {
    serverId: string;
    health: ExternalMCPServerHealth;
    timestamp: Date;
  };
};

/**
 * External MCP manager configuration
 */
export type ExternalMCPManagerConfig = {
  /** Maximum number of concurrent servers */
  maxServers?: number;

  /** Default timeout for operations */
  defaultTimeout?: number;

  /** Default health check interval */
  defaultHealthCheckInterval?: number;

  /** Whether to enable automatic restart */
  enableAutoRestart?: boolean;

  /** Maximum restart attempts per server */
  maxRestartAttempts?: number;

  /** Restart backoff multiplier */
  restartBackoffMultiplier?: number;

  /** Whether to enable performance monitoring */
  enablePerformanceMonitoring?: boolean;

  /** Log level for external MCP operations */
  logLevel?: "debug" | "info" | "warn" | "error";
};

// Note: In Phase 2, these interfaces will be consolidated into MCPServerInfo
