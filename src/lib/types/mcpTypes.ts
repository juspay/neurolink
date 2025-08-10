/**
 * MCP Types for In-Memory Server Support
 * Enables various integrations to register tools directly
 */

import type { JsonValue, JsonObject } from "./common.js";

/**
 * In-memory MCP server configuration
 */
export interface InMemoryMCPServerConfig {
  /**
   * The actual server instance with tools
   */
  server: {
    /**
     * Server title for display
     */
    title?: string;

    /**
     * Map of tool name to tool implementation
     */
    tools: Map<string, InMemoryToolInfo> | Record<string, InMemoryToolInfo>;

    /**
     * Optional server description
     */
    description?: string;
  };

  /**
   * Category for grouping tools
   */
  category?: string;

  /**
   * Metadata about the server
   */
  metadata?: {
    provider?: string;
    version?: string;
    author?: string;
    [key: string]: unknown;
  };
}

/**
 * In-memory tool information
 */
export interface InMemoryToolInfo {
  /**
   * Tool description
   */
  description: string;

  /**
   * Tool execution function
   */
  execute: (
    params: unknown,
  ) => Promise<InMemoryToolResult> | InMemoryToolResult;

  /**
   * Input parameter schema (Zod or JSON Schema)
   */
  inputSchema?: unknown;

  /**
   * Whether the tool is implemented (default: true)
   */
  isImplemented?: boolean;

  /**
   * Optional metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Result from in-memory tool execution
 */
export interface InMemoryToolResult {
  /**
   * Whether execution was successful
   */
  success: boolean;

  /**
   * Result data if successful
   */
  data?: unknown;

  /**
   * Error message if failed
   */
  error?: string;

  /**
   * Optional metadata about execution
   */
  metadata?: {
    executionTime?: number;
    toolName?: string;
    serverId?: string;
    [key: string]: unknown;
  };
}

/**
 * MCP Transport Types - Maximally Reusable
 */
export type MCPTransportType = "stdio" | "websocket" | "tcp" | "unix";

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
  /** Error message if any */
  error?: string;
  /** Auto-discovered servers from various sources */
  autoDiscoveredServers?: MCPDiscoveredServer[];
  /** Currently connected servers */
  connectedServers: MCPConnectedServer[];
  /** Available tools across all servers */
  availableTools: MCPToolInfo[];
  /** Server registry entries */
  serverRegistry?: Record<string, MCPServerConfig>;
}

/**
 * Auto-discovered MCP Server - High Reusability
 */
export interface MCPDiscoveredServer {
  name: string;
  status: "connected" | "disconnected" | "error" | "pending" | "failed";
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
 * MCP Server Configuration - Maximally Reusable
 */
export interface MCPServerConfig {
  name: string;
  transport: MCPTransportType;
  description?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  timeout?: number;
  retries?: number;
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
export type MCPServerRegistryEntry = [string, MCPServerConfig];

/**
 * Unified MCP Registry interface
 */
export interface UnifiedMCPRegistry {
  /**
   * Register an in-memory server
   */
  registerInMemoryServer(
    serverId: string,
    config: InMemoryMCPServerConfig,
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
  ): Promise<InMemoryToolResult>;

  /**
   * Check if connected to a server
   */
  isConnected(serverId: string): boolean;
}
