/**
 * MCP Types for In-Memory Server Support
 * Enables Lighthouse and other integrations to register tools directly
 */

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
    [key: string]: any;
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
  execute: (params: any) => Promise<InMemoryToolResult> | InMemoryToolResult;

  /**
   * Input parameter schema (Zod or JSON Schema)
   */
  inputSchema?: any;

  /**
   * Whether the tool is implemented (default: true)
   */
  isImplemented?: boolean;

  /**
   * Optional metadata
   */
  metadata?: Record<string, any>;
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
  data?: any;

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
    [key: string]: any;
  };
}

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
  getAllTools(): Promise<
    Array<{
      name: string;
      serverId: string;
      description: string;
      isExternal: boolean;
    }>
  >;

  /**
   * Execute a tool
   */
  executeTool(toolName: string, params: any, context: any): Promise<any>;

  /**
   * Check if connected to a server
   */
  isConnected(serverId: string): boolean;
}
