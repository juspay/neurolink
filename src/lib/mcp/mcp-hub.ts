/**
 * MCP Hub - Centralized MCP Connection Management
 * Based on production patterns from Cline and Gemini CLI
 */

import { EventEmitter } from 'events';
import { mcpLogger } from './logging.js';
import {
  MCPProtocolError,
  MCPTimeoutError,
} from './types/mcp-protocol.js';
import type {
  ExternalMCPServerConfig,
  MCPServerInstance,
  MCPTool,
  MCPToolResult,
} from './types/mcp-protocol.js';
import { toolValidator, ToolExecutionContext, classifyTool } from './tool-validation.js';
import { performanceManager, PerformanceMetrics } from './performance-manager.js';
import { loadHierarchicalConfig, MCPConfiguration } from '../config/hierarchical-config.js';

// Transport abstraction - will be implemented in separate files
export interface MCPTransport {
  readonly type: 'stdio' | 'sse' | 'http';
  readonly status: 'connecting' | 'connected' | 'disconnected' | 'error';
  connect(): Promise<void>;
  close(): Promise<void>;
  send(message: any): Promise<void>;
  onMessage(handler: (message: any) => void): void;
  onError(handler: (error: Error) => void): void;
  onClose(handler: () => void): void;
}

export interface MCPClient {
  readonly status: 'initializing' | 'ready' | 'error' | 'closed';
  initialize(): Promise<void>;
  close(): Promise<void>;
  listTools(): Promise<MCPTool[]>;
  callTool(name: string, args: Record<string, any>): Promise<MCPToolResult>;
  request(method: string, params: any, timeout?: number): Promise<any>;
}

export interface MCPConnection {
  readonly id: string;
  readonly server: ExternalMCPServerConfig & {
    status: 'disconnected' | 'connecting' | 'connected' | 'error';
    errorMessages: string[];
    lastConnected?: Date;
    tools: MCPTool[];
  };
  readonly transport?: MCPTransport; // Optional since new client manages transport internally
  readonly client: MCPClient;
  readonly createdAt: Date;
  lastUsed: Date;
}

interface MCPHubEvents {
  'connection-status-changed': [string, 'disconnected' | 'connecting' | 'connected' | 'error'];
  'server-error': [string, Error];
  'tools-updated': [string, MCPTool[]];
  'connection-added': [MCPConnection];
  'connection-removed': [string];
}

interface MCPHubOptions {
  maxConnections?: number;
  connectionTimeout?: number;
  toolTimeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  cleanupInterval?: number;
  maxIdleTime?: number;
}

/**
 * Centralized MCP Hub managing all server connections
 */
export class MCPHub extends EventEmitter<MCPHubEvents> {
  private connections = new Map<string, MCPConnection>();
  private connectionIdCounter = 1;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private readonly options: Required<MCPHubOptions>;

  constructor(options: MCPHubOptions = {}) {
    super();
    
    this.options = {
      maxConnections: options.maxConnections ?? 20,
      connectionTimeout: options.connectionTimeout ?? 30000,
      toolTimeout: options.toolTimeout ?? 60000,
      retryAttempts: options.retryAttempts ?? 3,
      retryDelay: options.retryDelay ?? 2000,
      cleanupInterval: options.cleanupInterval ?? 60000,
      maxIdleTime: options.maxIdleTime ?? 300000, // 5 minutes
    };

    this.startCleanupTimer();
    this.setupProcessHandlers();
  }

  /**
   * Add a new MCP server connection
   */
  async addConnection(config: ExternalMCPServerConfig): Promise<MCPConnection> {
    mcpLogger.info(`[MCPHub] Adding connection for server: ${config.name}`);

    // Check if connection already exists
    const existingConnection = this.findConnectionByName(config.name);
    if (existingConnection) {
      if (existingConnection.server.status === 'connected') {
        mcpLogger.debug(`[MCPHub] Reusing existing connection for: ${config.name}`);
        existingConnection.lastUsed = new Date();
        return existingConnection;
      } else {
        // Remove broken connection
        await this.removeConnection(existingConnection.id);
      }
    }

    // Check connection limit
    if (this.connections.size >= this.options.maxConnections) {
      await this.cleanupIdleConnections();
      if (this.connections.size >= this.options.maxConnections) {
        throw new Error(`Maximum connections (${this.options.maxConnections}) reached`);
      }
    }

    const connectionId = `mcp-conn-${this.connectionIdCounter++}`;
    
    // Create client with config (transport is created internally)
    const client = await this.createClient(config);

    const connection: MCPConnection = {
      id: connectionId,
      server: {
        ...config,
        status: 'disconnected',
        errorMessages: [],
        tools: [],
      },
      client,
      createdAt: new Date(),
      lastUsed: new Date(),
    };

    // Set up event handlers
    this.setupConnectionHandlers(connection);

    // Store connection
    this.connections.set(connectionId, connection);

    try {
      // Connect and initialize
      await this.connectServer(connection);
      
      this.emit('connection-added', connection);
      mcpLogger.info(`[MCPHub] Successfully added connection: ${config.name}`);
      
      return connection;
    } catch (error) {
      // Cleanup on failure
      await this.removeConnection(connectionId);
      throw error;
    }
  }

  /**
   * Remove a connection by ID
   */
  async removeConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      mcpLogger.debug(`[MCPHub] Connection not found for removal: ${connectionId}`);
      return;
    }

    mcpLogger.info(`[MCPHub] Removing connection: ${connection.server.name}`);

    try {
      // Close client and transport gracefully
      await this.closeConnection(connection);
    } catch (error) {
      mcpLogger.error(`[MCPHub] Error during connection cleanup: ${connection.server.name}`, error);
    }

    // Remove from tracking
    this.connections.delete(connectionId);
    this.emit('connection-removed', connectionId);
    
    mcpLogger.info(`[MCPHub] Connection removed: ${connection.server.name}`);
  }

  /**
   * Get all active connections
   */
  getConnections(): MCPConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connection by server name
   */
  getConnectionByName(serverName: string): MCPConnection | undefined {
    return this.findConnectionByName(serverName);
  }

  /**
   * Call a tool on a specific server with validation, caching, and safety checks
   */
  async callTool(
    serverName: string, 
    toolName: string, 
    args: Record<string, any> = {},
    context: ToolExecutionContext = {}
  ): Promise<MCPToolResult> {
    const connection = this.findConnectionByName(serverName);
    if (!connection) {
      throw new Error(`Server "${serverName}" not found`);
    }

    if (connection.server.status !== 'connected') {
      throw new Error(`Server "${serverName}" not connected (status: ${connection.server.status})`);
    }

    // Find the tool definition for validation
    const tool = connection.server.tools.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool "${toolName}" not found on server "${serverName}"`);
    }

    // Validate tool arguments
    const argsValidation = toolValidator.validateToolArgs(tool, args);
    if (!argsValidation.valid) {
      const errorMessages = argsValidation.errors.map(e => e.message).join(', ');
      throw new Error(`Tool argument validation failed: ${errorMessages}`);
    }

    // Check tool safety and permissions
    const safetyCheck = toolValidator.shouldAllowExecution(tool, args, context);
    if (!safetyCheck.allowed) {
      if (safetyCheck.requiresConfirmation) {
        mcpLogger.warn(`[MCPHub] Tool ${toolName} requires confirmation: ${safetyCheck.reason}`);
        // In a production system, this would prompt for user confirmation
        // For now, we'll log and continue for non-destructive operations
        const safety = classifyTool(tool);
        if (safety.category === 'dangerous') {
          throw new Error(`Tool execution blocked: ${safetyCheck.reason}`);
        }
      } else {
        throw new Error(`Tool execution blocked: ${safetyCheck.reason}`);
      }
    }

    // Update last used time
    connection.lastUsed = new Date();

    // Use performance manager for caching and metrics
    return performanceManager.executeWithCache(
      serverName,
      toolName,
      args,
      async () => {
        try {
          mcpLogger.debug(`[MCPHub] Calling tool ${toolName} on ${serverName}`);
          
          // Transport is now managed internally by the client
          const result = await connection.client.callTool(toolName, args);
          
          // For tools like sequential thinking, stderr content is handled by the client
          // The official SDK provides all necessary output in the result
          if (false) { // Disabled since transport is internal
            // Stderr handling is no longer needed with official SDK
          }
          
          mcpLogger.debug(`[MCPHub] Tool call successful: ${toolName} on ${serverName}`);
          
          // Sanitize result based on tool safety classification
          const sanitizedResult = toolValidator.sanitizeToolResult(result, tool);
          return sanitizedResult;
        } catch (error) {
          mcpLogger.error(`[MCPHub] Tool call failed: ${toolName} on ${serverName}`, error);
          
          // Mark server as error if it's a connection issue
          if (error instanceof MCPProtocolError || error instanceof MCPTimeoutError) {
            await this.handleConnectionError(connection, error);
          }
          
          throw error;
        }
      }
    );
  }

  /**
   * List all available tools across all connected servers
   */
  getAllTools(): Array<MCPTool & { serverName: string }> {
    const allTools: Array<MCPTool & { serverName: string }> = [];
    
    for (const connection of this.connections.values()) {
      if (connection.server.status === 'connected') {
        for (const tool of connection.server.tools) {
          allTools.push({
            ...tool,
            serverName: connection.server.name,
          });
        }
      }
    }
    
    return allTools;
  }

  /**
   * Get connection statistics
   */
  getStats() {
    const stats = {
      totalConnections: this.connections.size,
      byStatus: {
        connected: 0,
        connecting: 0,
        disconnected: 0,
        error: 0,
      },
      totalTools: 0,
      serverNames: [] as string[],
    };

    for (const connection of this.connections.values()) {
      stats.byStatus[connection.server.status]++;
      stats.totalTools += connection.server.tools.length;
      stats.serverNames.push(connection.server.name);
    }

    return stats;
  }

  /**
   * Shutdown all connections
   */
  async shutdown(): Promise<void> {
    mcpLogger.info('[MCPHub] Shutting down all connections...');

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    const connectionIds = Array.from(this.connections.keys());
    await Promise.all(connectionIds.map(id => this.removeConnection(id)));

    this.removeAllListeners();
    mcpLogger.info('[MCPHub] Shutdown complete');
  }

  // Private helper methods

  private findConnectionByName(serverName: string): MCPConnection | undefined {
    for (const connection of this.connections.values()) {
      if (connection.server.name === serverName) {
        return connection;
      }
    }
    return undefined;
  }

  private async createTransport(config: ExternalMCPServerConfig): Promise<MCPTransport> {
    switch (config.transport) {
      case 'stdio':
        const { StdioTransport } = await import('./transports/stdio-transport.js');
        return new StdioTransport(config);
      case 'sse':
        // TODO: Implement SSE transport
        throw new Error('SSE transport not yet implemented');
      default:
        throw new Error(`Unsupported transport type: ${config.transport}`);
    }
  }

  private async createClient(config: ExternalMCPServerConfig): Promise<MCPClient> {
    const { StandardMCPClient } = await import('./mcp-client.js');
    
    // Convert config to client options
    const clientOptions = {
      type: config.transport as 'stdio' | 'sse' | 'streamableHttp',
      command: config.command,
      args: config.args,
      cwd: config.cwd,
      env: config.env,
      url: config.url,
      headers: config.headers,
      timeout: 60000, // 60s for sequential thinking and other complex tools
    };
    
    return new StandardMCPClient(config.name, clientOptions);
  }

  private setupConnectionHandlers(connection: MCPConnection): void {
    // The new client manages transport internally
    // Event handling will be done through the client status changes
    mcpLogger.debug(`[MCPHub] Set up connection handlers for ${connection.server.name}`);
  }

  private async connectServer(connection: MCPConnection): Promise<void> {
    connection.server.status = 'connecting';
    this.emit('connection-status-changed', connection.server.name, 'connecting');

    try {
      // Initialize client (transport is handled internally)
      await connection.client.initialize();
      
      // Load tools
      const tools = await connection.client.listTools();
      connection.server.tools = tools;
      
      // Mark as connected
      connection.server.status = 'connected';
      connection.server.lastConnected = new Date();
      connection.server.errorMessages = []; // Clear errors on successful connection
      
      this.emit('connection-status-changed', connection.server.name, 'connected');
      this.emit('tools-updated', connection.server.name, tools);
      
      mcpLogger.info(`[MCPHub] Server connected: ${connection.server.name} (${tools.length} tools)`);
    } catch (error) {
      await this.handleConnectionError(connection, error);
      throw error;
    }
  }

  private async closeConnection(connection: MCPConnection): Promise<void> {
    try {
      // Close client first
      if (connection.client.status !== 'closed') {
        await connection.client.close();
      }
    } catch (error) {
      mcpLogger.error(`[MCPHub] Error closing client for ${connection.server.name}:`, error);
    }

    // Transport is managed internally by the client

    connection.server.status = 'disconnected';
    this.emit('connection-status-changed', connection.server.name, 'disconnected');
  }

  private async handleConnectionError(connection: MCPConnection, error: any): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    connection.server.errorMessages.push(`${new Date().toISOString()}: ${errorMessage}`);
    
    // Keep only last 10 error messages
    if (connection.server.errorMessages.length > 10) {
      connection.server.errorMessages = connection.server.errorMessages.slice(-10);
    }

    connection.server.status = 'error';
    this.emit('connection-status-changed', connection.server.name, 'error');
    this.emit('server-error', connection.server.name, error);
    
    mcpLogger.error(`[MCPHub] Connection error for ${connection.server.name}: ${errorMessage}`);
  }

  private handleConnectionClose(connection: MCPConnection): void {
    if (connection.server.status !== 'error') {
      connection.server.status = 'disconnected';
      this.emit('connection-status-changed', connection.server.name, 'disconnected');
    }
    mcpLogger.info(`[MCPHub] Connection closed: ${connection.server.name}`);
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupIdleConnections().catch(error => {
        mcpLogger.error('[MCPHub] Cleanup timer error:', error);
      });
    }, this.options.cleanupInterval);
  }

  private async cleanupIdleConnections(): Promise<void> {
    const now = new Date();
    const connectionsToRemove: string[] = [];

    for (const [connectionId, connection] of this.connections) {
      const idleTime = now.getTime() - connection.lastUsed.getTime();
      
      if (idleTime > this.options.maxIdleTime) {
        connectionsToRemove.push(connectionId);
      }
    }

    if (connectionsToRemove.length > 0) {
      mcpLogger.debug(`[MCPHub] Cleaning up ${connectionsToRemove.length} idle connections`);
      
      for (const connectionId of connectionsToRemove) {
        await this.removeConnection(connectionId);
      }
    }
  }

  private setupProcessHandlers(): void {
    const shutdown = async () => {
      await this.shutdown();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    process.on('exit', () => {
      // Synchronous cleanup only
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer);
      }
    });
  }

  // Enhanced methods based on VS Code and GitHub patterns

  /**
   * Load configuration from hierarchical sources
   */
  async loadHierarchicalConfiguration(projectRoot?: string): Promise<MCPConfiguration> {
    try {
      return await loadHierarchicalConfig(projectRoot);
    } catch (error) {
      mcpLogger.error('[MCPHub] Failed to load hierarchical configuration:', error);
      return { servers: {} };
    }
  }

  /**
   * Validate all tools on all connected servers
   */
  async validateAllTools(): Promise<{ valid: boolean; results: Array<{ server: string; tool: string; valid: boolean; errors: string[] }> }> {
    const results: Array<{ server: string; tool: string; valid: boolean; errors: string[] }> = [];
    let allValid = true;

    for (const connection of this.connections.values()) {
      for (const tool of connection.server.tools) {
        const validation = toolValidator.validateToolSchema(tool);
        
        results.push({
          server: connection.server.name,
          tool: tool.name,
          valid: validation.valid,
          errors: validation.errors.map(e => e.message)
        });

        if (!validation.valid) {
          allValid = false;
        }
      }
    }

    return { valid: allValid, results };
  }

  /**
   * Get performance metrics for all tool executions
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return performanceManager.getPerformanceMetrics();
  }

  /**
   * Get tool-specific performance metrics
   */
  getToolMetrics(serverName: string, toolName: string): any {
    return performanceManager.getToolMetrics(serverName, toolName);
  }

  /**
   * Get all available tools with their safety classifications
   */
  getAllToolsWithSafety(): Array<{ 
    server: string; 
    tool: MCPTool; 
    safety: ReturnType<typeof classifyTool>;
    validation: ReturnType<typeof toolValidator.validateToolSchema>;
  }> {
    const toolsWithSafety: Array<{ 
      server: string; 
      tool: MCPTool; 
      safety: ReturnType<typeof classifyTool>;
      validation: ReturnType<typeof toolValidator.validateToolSchema>;
    }> = [];

    for (const connection of this.connections.values()) {
      for (const tool of connection.server.tools) {
        toolsWithSafety.push({
          server: connection.server.name,
          tool,
          safety: classifyTool(tool),
          validation: toolValidator.validateToolSchema(tool)
        });
      }
    }

    return toolsWithSafety;
  }

  /**
   * Find tools by natural language description
   */
  findToolsByDescription(query: string): Array<{ server: string; tool: MCPTool; relevance: number }> {
    const results: Array<{ server: string; tool: MCPTool; relevance: number }> = [];
    const queryLower = query.toLowerCase();

    for (const connection of this.connections.values()) {
      for (const tool of connection.server.tools) {
        const toolText = `${tool.name} ${tool.description}`.toLowerCase();
        
        // Simple relevance scoring based on keyword matches
        const words = queryLower.split(/\s+/);
        let relevance = 0;
        
        for (const word of words) {
          if (word.length > 2) { // Skip very short words
            if (toolText.includes(word)) {
              relevance += 1;
              // Bonus for exact matches in name
              if (tool.name.toLowerCase().includes(word)) {
                relevance += 2;
              }
            }
          }
        }

        if (relevance > 0) {
          results.push({
            server: connection.server.name,
            tool,
            relevance
          });
        }
      }
    }

    // Sort by relevance (highest first)
    return results.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Reset performance metrics and caches
   */
  resetPerformanceData(): void {
    performanceManager.reset();
    mcpLogger.info('[MCPHub] Performance data reset');
  }

  /**
   * Get comprehensive system status
   */
  getSystemStatus(): {
    connections: number;
    connectedServers: number;
    totalTools: number;
    performance: PerformanceMetrics;
    errors: Array<{ server: string; errors: string[] }>;
  } {
    const connectedServers = Array.from(this.connections.values())
      .filter(conn => conn.server.status === 'connected').length;
    
    const totalTools = Array.from(this.connections.values())
      .reduce((total, conn) => total + conn.server.tools.length, 0);

    const errors = Array.from(this.connections.values())
      .filter(conn => conn.server.errorMessages.length > 0)
      .map(conn => ({
        server: conn.server.name,
        errors: conn.server.errorMessages
      }));

    return {
      connections: this.connections.size,
      connectedServers,
      totalTools,
      performance: this.getPerformanceMetrics(),
      errors
    };
  }
}

/**
 * Global MCP Hub instance
 */
export const globalMCPHub = new MCPHub();