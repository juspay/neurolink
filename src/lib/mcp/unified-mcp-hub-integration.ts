/**
 * Integration layer between new MCP Hub and existing UnifiedMCPRegistry
 * This provides backward compatibility while using the new architecture
 */

import { globalMCPHub, type MCPConnection } from './mcp-hub.js';
import type { 
  DiscoveredMCP,
  ExecutionContext,
} from './contracts/mcp-contract.js';
import type { 
  ToolInfo,
  ToolExecutionResult,
} from './tool-registry.js';
import type { ExternalMCPServerConfig } from './types/mcp-protocol.js';
import { mcpLogger } from './logging.js';

/**
 * Enhanced MCP Registry using the new hub architecture
 */
export class HubBasedMCPRegistry {
  private isInitialized = false;
  private discoveredServers: DiscoveredMCP[] = [];

  constructor() {
    // Set up hub event listeners
    globalMCPHub.on('connection-status-changed', (serverName, status) => {
      mcpLogger.info(`[HubBasedMCPRegistry] Server ${serverName} status changed to: ${status}`);
    });

    globalMCPHub.on('server-error', (serverName, error) => {
      mcpLogger.error(`[HubBasedMCPRegistry] Server ${serverName} error:`, error);
    });

    globalMCPHub.on('tools-updated', (serverName, tools) => {
      mcpLogger.debug(`[HubBasedMCPRegistry] Tools updated for ${serverName}: ${tools.length} tools`);
    });
  }

  /**
   * Initialize the registry with auto-discovered servers
   */
  async initialize(discoveredServers: DiscoveredMCP[] = []): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    mcpLogger.info('[HubBasedMCPRegistry] Initializing with new MCP Hub architecture...');

    this.discoveredServers = discoveredServers;

    // Convert discovered servers to hub-compatible configs
    const externalConfigs = this.convertDiscoveredToHubConfigs(discoveredServers);

    // Add connections to the hub
    const connectionPromises = externalConfigs.map(async (config) => {
      try {
        const connection = await globalMCPHub.addConnection(config);
        mcpLogger.info(`[HubBasedMCPRegistry] Successfully connected to: ${config.name}`);
        return connection;
      } catch (error) {
        mcpLogger.error(`[HubBasedMCPRegistry] Failed to connect to ${config.name}:`, error);
        return null;
      }
    });

    const connections = await Promise.allSettled(connectionPromises);
    
    const successfulConnections = connections
      .filter((result): result is PromiseFulfilledResult<MCPConnection | null> => 
        result.status === 'fulfilled' && result.value !== null)
      .map(result => result.value!);

    mcpLogger.info(
      `[HubBasedMCPRegistry] Initialization complete: ${successfulConnections.length}/${externalConfigs.length} servers connected`
    );

    this.isInitialized = true;
  }

  /**
   * List all available tools from all connected servers
   */
  async listAllTools(): Promise<ToolInfo[]> {
    const allTools = globalMCPHub.getAllTools();
    
    return allTools.map((tool, index) => ({
      id: `${tool.serverName}-${tool.name}`,
      name: tool.name,
      description: tool.description || `Tool from server ${tool.serverName}`,
      server: tool.serverName,
      serverId: tool.serverName,
      source: 'auto' as const, // External MCP servers are auto-discovered
      inputSchema: tool.inputSchema,
      isImplemented: true,
    }));
  }

  /**
   * Execute a tool through the hub
   */
  async executeTool(
    toolName: string,
    args: any,
    context: ExecutionContext
  ): Promise<ToolExecutionResult> {
    mcpLogger.info(`[HubBasedMCPRegistry] Executing tool: ${toolName}`);
    
    const startTime = Date.now();

    try {
      // Parse tool name to extract server and tool
      const { serverName, actualToolName } = this.parseToolName(toolName);
      
      if (!serverName) {
        throw new Error(`Could not determine server for tool: ${toolName}`);
      }

      // Execute through the hub
      const result = await globalMCPHub.callTool(serverName, actualToolName, args);
      
      const executionTime = Date.now() - startTime;
      
      mcpLogger.info(`[HubBasedMCPRegistry] Tool execution successful: ${toolName} (${executionTime}ms)`);

      return {
        success: true,
        data: this.processToolResult(result),
        metadata: {
          toolName,
          executionTime,
          timestamp: Date.now(),
          serverName,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      mcpLogger.error(`[HubBasedMCPRegistry] Tool execution failed: ${toolName} (${executionTime}ms)`, error);
      
      throw new Error(`Tool ${toolName} execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get registry statistics
   */
  getStats() {
    const hubStats = globalMCPHub.getStats();
    
    return {
      total: hubStats.totalConnections,
      bySource: { 'auto-discovery': this.discoveredServers.length },
      byType: { 'external-mcp': hubStats.totalConnections },
      manual: { servers: 0 },
      auto: { servers: hubStats.totalConnections },
      tools: hubStats.totalTools,
      connections: hubStats,
    };
  }

  /**
   * Get connection by server name
   */
  getConnection(serverName: string): MCPConnection | undefined {
    return globalMCPHub.getConnectionByName(serverName);
  }

  /**
   * Refresh connections
   */
  async refresh(): Promise<void> {
    mcpLogger.info('[HubBasedMCPRegistry] Refreshing connections...');
    
    // For now, we'll keep existing connections and just reinitialize
    // In the future, we could implement smart refresh logic
    this.isInitialized = false;
    await this.initialize(this.discoveredServers);
  }

  /**
   * Shutdown all connections
   */
  async shutdown(): Promise<void> {
    mcpLogger.info('[HubBasedMCPRegistry] Shutting down...');
    await globalMCPHub.shutdown();
    this.isInitialized = false;
  }

  // Private helper methods

  private convertDiscoveredToHubConfigs(discoveredServers: DiscoveredMCP[]): ExternalMCPServerConfig[] {
    const configs: ExternalMCPServerConfig[] = [];
    
    for (const plugin of discoveredServers) {
      if (plugin.external && plugin.external.command) {
        // Skip problematic servers (like kite) that cause issues
        if (plugin.metadata.name === 'kite') {
          mcpLogger.warn(`[HubBasedMCPRegistry] Skipping problematic server: ${plugin.metadata.name}`);
          continue;
        }

        const config: ExternalMCPServerConfig = {
          name: plugin.metadata.name,
          command: plugin.external.command,
          args: plugin.external.args || [],
          transport: (plugin.external.transport as "stdio" | "sse") || "stdio",
          env: plugin.external.env,
          url: plugin.external.url,
          cwd: plugin.external.cwd,
        };
        
        configs.push(config);
        
        mcpLogger.debug(
          `[HubBasedMCPRegistry] Converted discovered server: ${config.name} (${config.command})`
        );
      }
    }
    
    return configs;
  }

  private parseToolName(toolName: string): { serverName: string | null, actualToolName: string } {
    // Handle different tool naming patterns
    
    // Pattern 1: mcp_ext_serverName_toolName
    if (toolName.startsWith('mcp_ext_')) {
      const parts = toolName.substring(8).split('_');
      if (parts.length >= 2) {
        const serverName = parts[0];
        const actualToolName = parts.slice(1).join('_');
        return { serverName, actualToolName };
      }
    }
    
    // Pattern 2: serverName.toolName
    if (toolName.includes('.')) {
      const [serverName, ...toolParts] = toolName.split('.');
      const actualToolName = toolParts.join('.');
      return { serverName, actualToolName };
    }
    
    // Pattern 3: Find server that has this tool
    const allTools = globalMCPHub.getAllTools();
    const matchingTool = allTools.find(tool => tool.name === toolName);
    
    if (matchingTool) {
      return { 
        serverName: matchingTool.serverName, 
        actualToolName: toolName 
      };
    }
    
    // Fallback: try to find any server with a tool that matches
    for (const tool of allTools) {
      if (tool.name.includes(toolName) || toolName.includes(tool.name)) {
        return { 
          serverName: tool.serverName, 
          actualToolName: tool.name 
        };
      }
    }
    
    return { serverName: null, actualToolName: toolName };
  }

  private processToolResult(result: any): any {
    // Process MCP tool result similar to DynamicToolProxy
    if (!result) {
      return null;
    }

    // Handle MCP tool result format
    if (result.content && Array.isArray(result.content)) {
      const contents = result.content;
      
      // If there's only one text content, return it directly
      if (contents.length === 1 && contents[0].type === 'text') {
        return contents[0].text;
      }

      // For multiple contents, combine them
      const textContents = contents
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .filter(Boolean);

      if (textContents.length === 1) {
        return textContents[0];
      } else if (textContents.length > 1) {
        return textContents.join('\\n\\n');
      }

      // For non-text content, return structured data
      return contents;
    }

    // Handle direct result
    if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') {
      return result;
    }

    // For objects, try to extract meaningful data
    if (typeof result === 'object') {
      // Common patterns in MCP results
      if (result.text) return result.text;
      if (result.content) return result.content;
      if (result.data) return result.data;
      if (result.result) return result.result;
      
      // Return the whole object if no specific pattern matches
      return result;
    }

    return result;
  }
}

/**
 * Create a global instance of the hub-based registry
 */
export const hubBasedRegistry = new HubBasedMCPRegistry();