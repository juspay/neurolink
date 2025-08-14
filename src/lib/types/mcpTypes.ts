/**
 * MCP Types for In-Memory Server Support
 * Enables various integrations to register tools directly
 */

import type { JsonValue, JsonObject } from "./common.js";

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
 * MCP Server Category Types - Organizational classification
 */
export type MCPServerCategory =
  | "external" // External process-based MCP servers
  | "in-memory" // In-memory tool registrations
  | "built-in" // Built-in NeuroLink tools
  | "user-defined" // Custom user tools
  | "custom" // Legacy alias for user-defined
  | "uncategorized"; // Fallback category

/**
 * Universal MCP Server - Unified configuration and runtime state
 * MCP 2024-11-05 specification compliant
 * Replaces both MCPServerInfo and MCPServerConfig
 */
export interface MCPServerInfo {
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
}

/**
 * MCP Server Status for CLI Operations - High Reusability
 */
export interface MCPServerStatus {
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
}

/**
 * Auto-discovered MCP Server - High Reusability
 */
export interface MCPDiscoveredServer {
  name: string;
  status: MCPServerConnectionStatus;
  source: string;
  transport: MCPTransportType;
  description?: string;
  url?: string;
  args?: string[];
  env?: Record<string, string>;
  metadata?: MCPServerMetadata;
}

/**
 * Connected MCP Server - High Reusability
 */
export interface MCPConnectedServer {
  name: string;
  transport: MCPTransportType;
  connected: boolean;
  description?: string;
  tools: MCPToolInfo[];
  lastSeen?: Date;
  connectionTime?: Date;
  metadata?: MCPServerMetadata;
}

/**
 * MCP Tool Information - High Reusability
 */
export interface MCPToolInfo {
  name: string;
  description: string;
  serverId: string;
  isExternal: boolean;
  isImplemented?: boolean;
  inputSchema?: JsonObject;
  outputSchema?: JsonObject;
  metadata?: MCPToolMetadata;
}

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

/**
 * Unified MCP Registry interface
 */
export interface UnifiedMCPRegistry {
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
}
