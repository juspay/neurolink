/**
 * External MCP Connector - High-level coordinator for external MCP server connections
 * Replaces ExternalMCPManager with proper MCP protocol implementation
 */

import { spawn } from 'child_process';
import { mcpLogger } from './logging.js';
import { MCPServerPool } from './mcp-server-pool.js';
import { MCPProtocolHandler } from './mcp-protocol-handler.js';
import { DynamicToolProxy } from './dynamic-tool-proxy.js';
import {
  ExternalMCPServerConfig,
  ConnectedServer,
  MCPTool,
  MCPConnectionError,
} from './types/mcp-protocol.js';

interface ConnectorOptions {
  enableValidation?: boolean; // Default: true
  maxRetries?: number; // Default: 3
  retryDelayMs?: number; // Default: 1000
  validateTimeout?: number; // Default: 10000
}

export class ExternalMCPConnector {
  private connectedServers = new Map<string, ConnectedServer>();
  private options: Required<ConnectorOptions>;

  constructor(
    private serverPool: MCPServerPool,
    private protocolHandler: MCPProtocolHandler,
    private toolProxy: DynamicToolProxy,
    options: ConnectorOptions = {}
  ) {
    this.options = {
      enableValidation: options.enableValidation ?? true, // Enable validation for reliable connections
      maxRetries: options.maxRetries ?? 3, // Standard retries for reliability
      retryDelayMs: options.retryDelayMs ?? 1000, // Standard retry delay
      validateTimeout: options.validateTimeout ?? 15000, // Longer timeout for external tools like sequential thinking
    };
  }

  /**
   * Connect to discovered MCP servers from auto-discovery
   */
  async connectDiscoveredServers(configs: ExternalMCPServerConfig[]): Promise<ConnectedServer[]> {
    mcpLogger.info(`[ExternalMCPConnector] Connecting to ${configs.length} discovered servers...`);

    const connectedServers: ConnectedServer[] = [];
    const connectionPromises = configs.map(config => 
      this.connectToServerWithRetry(config)
    );

    // Connect to all servers in parallel, but don't fail if some fail
    const results = await Promise.allSettled(connectionPromises);

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const config = configs[i];

      if (result.status === 'fulfilled' && result.value) {
        connectedServers.push(result.value);
        this.connectedServers.set(config.name, result.value);
        mcpLogger.info(`[ExternalMCPConnector] Successfully connected to: ${config.name}`);
      } else {
        const error = result.status === 'rejected' ? result.reason : 'Unknown error';
        mcpLogger.warn(`[ExternalMCPConnector] Failed to connect to ${config.name}:`, error);
        
        // Store failed connection for status tracking
        const failedServer: ConnectedServer = {
          name: config.name,
          instance: {
            id: `failed-${config.name}`,
            name: config.name,
            config,
            status: 'error',
            tools: [],
            lastUsed: Date.now(),
            errorCount: 1,
            maxErrors: 3,
          },
          toolCount: 0,
          status: 'error',
          lastError: error instanceof Error ? error.message : String(error),
        };
        
        this.connectedServers.set(config.name, failedServer);
      }
    }

    mcpLogger.info(`[ExternalMCPConnector] Connected to ${connectedServers.length}/${configs.length} servers`);
    return connectedServers;
  }

  /**
   * Connect to a single server with retry logic
   */
  private async connectToServerWithRetry(config: ExternalMCPServerConfig): Promise<ConnectedServer | null> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        mcpLogger.debug(`[ExternalMCPConnector] Connection attempt ${attempt}/${this.options.maxRetries} for: ${config.name}`);
        
        // Validate server config first
        if (this.options.enableValidation) {
          await this.validateServerConfig(config);
        }

        // Connect to server
        const connectedServer = await this.connectToServer(config);
        
        if (connectedServer) {
          mcpLogger.info(`[ExternalMCPConnector] Connected to ${config.name} on attempt ${attempt}`);
          return connectedServer;
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        mcpLogger.debug(`[ExternalMCPConnector] Attempt ${attempt} failed for ${config.name}:`, lastError);

        // Wait before retry (except on last attempt)
        if (attempt < this.options.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.options.retryDelayMs));
        }
      }
    }

    throw lastError || new Error(`Failed to connect to ${config.name} after ${this.options.maxRetries} attempts`);
  }

  /**
   * Connect to a single MCP server
   */
  private async connectToServer(config: ExternalMCPServerConfig): Promise<ConnectedServer> {
    mcpLogger.debug(`[ExternalMCPConnector] Connecting to server: ${config.name}`);

    try {
      // Validate server configuration if validation is enabled
      if (this.options.enableValidation) {
        await this.validateServerConfig(config);
      }

      // Get server instance from pool
      const serverInstance = await this.serverPool.getServer(config);

      // Initialize server if needed
      if (!serverInstance.capabilities) {
        await this.protocolHandler.initialize(serverInstance);
      }

      // Get available tools
      const tools = await this.protocolHandler.listTools(serverInstance);

      // Register tools with the dynamic tool proxy
      for (const tool of tools) {
        this.toolProxy.registerExternalTool(config, tool);
      }

      // Create connected server info
      const connectedServer: ConnectedServer = {
        name: config.name,
        instance: serverInstance,
        toolCount: tools.length,
        status: 'connected',
      };

      mcpLogger.info(`[ExternalMCPConnector] Successfully connected to ${config.name} with ${tools.length} tools`);
      return connectedServer;

    } catch (error) {
      mcpLogger.error(`[ExternalMCPConnector] Failed to connect to ${config.name}:`, error);
      throw new MCPConnectionError(
        `Connection failed: ${error instanceof Error ? error.message : String(error)}`,
        config.name,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Validate server configuration before attempting connection
   */
  async validateServerConfig(config: ExternalMCPServerConfig): Promise<boolean> {
    mcpLogger.debug(`[ExternalMCPConnector] Validating config for: ${config.name}`);

    // Basic validation
    if (!config.name || !config.command) {
      throw new Error(`Invalid server config: missing name or command`);
    }

    if (config.transport !== 'stdio' && config.transport !== 'sse') {
      throw new Error(`Unsupported transport type: ${config.transport}`);
    }

    // For stdio transport, validate command exists
    if (config.transport === 'stdio') {
      try {
        await this.validateCommandExists(config.command);
      } catch (error) {
        throw new Error(`Command validation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // For SSE transport, validate URL
    if (config.transport === 'sse' && !config.url) {
      throw new Error(`SSE transport requires URL`);
    }

    mcpLogger.debug(`[ExternalMCPConnector] Config validation passed for: ${config.name}`);
    return true;
  }

  /**
   * Validate that a command exists and is executable
   */
  private async validateCommandExists(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // spawn is imported at the top of the file
      
      const timeout = setTimeout(() => {
        reject(new Error(`Command validation timeout: ${command}`));
      }, this.options.validateTimeout);

      try {
        // Try spawning with minimal args to check if command exists
        const testProcess = spawn(command, [], {
          stdio: 'ignore',
          timeout: this.options.validateTimeout,
        });

        testProcess.on('spawn', () => {
          clearTimeout(timeout);
          testProcess.kill();
          resolve();
        });

        testProcess.on('error', (error: any) => {
          clearTimeout(timeout);
          if (error.message.includes('ENOENT')) {
            reject(new Error(`Command not found: ${command}`));
          } else {
            reject(new Error(`Command error: ${error.message}`));
          }
        });

      } catch (error) {
        clearTimeout(timeout);
        reject(new Error(`Failed to validate command: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
  }

  /**
   * Get all available tools from connected servers
   */
  async getAvailableTools(): Promise<Record<string, any>> {
    mcpLogger.debug('[ExternalMCPConnector] Getting available tools from all connected servers');

    // Get tools from the dynamic tool proxy
    const tools = this.toolProxy.getAllTools();

    mcpLogger.debug(`[ExternalMCPConnector] Found ${Object.keys(tools).length} available external tools`);
    return tools;
  }

  /**
   * Get connected server information
   */
  getConnectedServers(): ConnectedServer[] {
    return Array.from(this.connectedServers.values()).filter(server => server.status === 'connected');
  }

  /**
   * Get server by name
   */
  getServer(serverName: string): ConnectedServer | undefined {
    return this.connectedServers.get(serverName);
  }

  /**
   * Reconnect to a specific server
   */
  async reconnectServer(serverName: string): Promise<ConnectedServer | null> {
    const existingServer = this.connectedServers.get(serverName);
    if (!existingServer) {
      throw new Error(`Server not found: ${serverName}`);
    }

    mcpLogger.info(`[ExternalMCPConnector] Reconnecting to server: ${serverName}`);

    try {
      // Remove existing server
      this.connectedServers.delete(serverName);

      // Reconnect
      const reconnectedServer = await this.connectToServer(existingServer.instance.config);
      this.connectedServers.set(serverName, reconnectedServer);

      return reconnectedServer;

    } catch (error) {
      mcpLogger.error(`[ExternalMCPConnector] Failed to reconnect to ${serverName}:`, error);
      
      // Restore error state
      existingServer.status = 'error';
      existingServer.lastError = error instanceof Error ? error.message : String(error);
      this.connectedServers.set(serverName, existingServer);
      
      throw error;
    }
  }

  /**
   * Disconnect from a specific server
   */
  async disconnectServer(serverName: string): Promise<void> {
    const server = this.connectedServers.get(serverName);
    if (!server) {
      mcpLogger.debug(`[ExternalMCPConnector] Server not found for disconnect: ${serverName}`);
      return;
    }

    mcpLogger.info(`[ExternalMCPConnector] Disconnecting from server: ${serverName}`);

    try {
      // Shutdown protocol handler for this server
      if (server.instance.status === 'ready') {
        await this.protocolHandler.shutdown(server.instance);
      }

      // Terminate server in pool
      await this.serverPool.terminateServer(server.instance.id);

      // Remove tools from proxy
      const toolKeys = this.toolProxy.getToolKeys().filter(key => key.startsWith(serverName));
      for (const toolKey of toolKeys) {
        this.toolProxy.unregisterTool(toolKey);
      }

      // Remove from connected servers
      this.connectedServers.delete(serverName);

    } catch (error) {
      mcpLogger.error(`[ExternalMCPConnector] Error during disconnect of ${serverName}:`, error);
      // Continue with cleanup even if there are errors
    }
  }

  /**
   * Disconnect from all servers
   */
  async disconnect(): Promise<void> {
    mcpLogger.info('[ExternalMCPConnector] Disconnecting from all servers...');

    const serverNames = Array.from(this.connectedServers.keys());
    await Promise.all(serverNames.map(name => this.disconnectServer(name)));

    // Clear tool proxy
    this.toolProxy.clearAllTools();

    mcpLogger.info('[ExternalMCPConnector] Disconnected from all servers');
  }

  /**
   * Get connector statistics
   */
  getStats() {
    const serversByStatus: Record<string, number> = {};
    let totalTools = 0;

    for (const server of this.connectedServers.values()) {
      serversByStatus[server.status] = (serversByStatus[server.status] || 0) + 1;
      totalTools += server.toolCount;
    }

    return {
      totalServers: this.connectedServers.size,
      connectedServers: this.getConnectedServers().length,
      serversByStatus,
      totalTools,
      toolProxyStats: this.toolProxy.getStats(),
    };
  }

  /**
   * Health check for all connected servers
   */
  async healthCheck(): Promise<{ serverName: string; healthy: boolean; error?: string }[]> {
    mcpLogger.debug('[ExternalMCPConnector] Running health check on all servers');

    const healthResults: { serverName: string; healthy: boolean; error?: string }[] = [];

    for (const [serverName, server] of this.connectedServers) {
      try {
        if (server.status === 'connected' && server.instance.status === 'ready') {
          // Try listing tools as a health check
          await this.protocolHandler.listTools(server.instance);
          healthResults.push({ serverName, healthy: true });
        } else {
          healthResults.push({ 
            serverName, 
            healthy: false, 
            error: `Server status: ${server.status}` 
          });
        }
      } catch (error) {
        healthResults.push({ 
          serverName, 
          healthy: false, 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return healthResults;
  }
}