/**
 * Unified MCP Registry - Combines Multiple Registration Sources
 */

import type {
  DiscoveredMCP,
  ExecutionContext,
} from "./contracts/mcp-contract.js";
import { MCPRegistry } from "./registry.js";
import {
  discoverMCPServers,
  autoRegisterMCPServers,
} from "./auto-discovery.js";
import type { DiscoveryOptions } from "./auto-discovery.js";
import { unifiedRegistryLogger } from "./logging.js";
import {
  MCPToolRegistry,
  type ToolInfo,
  type ToolExecutionResult,
} from "./tool-registry.js";
import type { ExternalMCPServerConfig as OldExternalMCPServerConfig } from "./external-client.js";
import type { ExternalMCPServerConfig } from "./types/mcp-protocol.js";

/**
 * Unified registry combining multiple sources
 */
export class UnifiedMCPRegistry extends MCPToolRegistry {
  private autoDiscoveryEnabled = true;
  private autoDiscoveredServers: DiscoveredMCP[] = [];
  private manualServers: Map<string, any> = new Map();
  private availableServers: Set<string> = new Set();
  public isInitialized = false;

  /**
   * Convert auto-discovered servers to ExternalMCPServerConfig format
   */
  private convertDiscoveredToExternalConfig(discoveredServers: DiscoveredMCP[]): ExternalMCPServerConfig[] {
    const externalConfigs: ExternalMCPServerConfig[] = [];
    
    for (const plugin of discoveredServers) {
      // Only process plugins that have external connection data
      if (plugin.external && plugin.external.command) {
        const config: ExternalMCPServerConfig = {
          name: plugin.metadata.name,
          command: plugin.external.command,
          args: plugin.external.args || [],
          transport: (plugin.external.transport as "stdio" | "sse") || "stdio",
          env: plugin.external.env,
          url: plugin.external.url,
          cwd: plugin.external.cwd,
        };
        
        externalConfigs.push(config);
        
        unifiedRegistryLogger.debug(
          `Converted discovered server to external config: ${config.name} (${config.command})`,
        );
      }
    }
    
    return externalConfigs;
  }

  /**
   * Initialize with auto-discovery AND external server configuration
   */
  async initialize(options: DiscoveryOptions = {}): Promise<void> {
    unifiedRegistryLogger.info("Initializing unified MCP registry...");

    // 1. Auto-discovery from other AI tools
    if (this.autoDiscoveryEnabled) {
      const result = await autoRegisterMCPServers(options);
      unifiedRegistryLogger.info(
        `Auto-discovery complete: ${result.registered} registered, ${result.failed} failed`,
      );

      // Register discovered plugins
      for (const plugin of result.plugins) {
        this.register(plugin);
        this.autoDiscoveredServers.push(plugin);
        this.availableServers.add(plugin.metadata.name);
      }
    }

    // 2. NEW: Load external MCP servers using new connector system
    try {
      unifiedRegistryLogger.info("Loading external MCP servers with new connector system...");
      
      // Initialize new MCP components
      const { MCPServerPool } = await import("./mcp-server-pool.js");
      const { MCPProtocolHandler } = await import("./mcp-protocol-handler.js");
      const { DynamicToolProxy } = await import("./dynamic-tool-proxy.js");
      const { ExternalMCPConnector } = await import("./external-mcp-connector.js");
      
      const serverPool = new MCPServerPool();
      const protocolHandler = new MCPProtocolHandler();
      const toolProxy = new DynamicToolProxy(serverPool, protocolHandler);
      const externalConnector = new ExternalMCPConnector(serverPool, protocolHandler, toolProxy);
      
      // Store instances for later access
      (this as any).serverPool = serverPool;
      (this as any).protocolHandler = protocolHandler;
      (this as any).toolProxy = toolProxy;
      (this as any).externalConnector = externalConnector;
      
      // Connect to auto-discovered external servers
      const discoveredExternalConfigs = this.convertDiscoveredToExternalConfig(this.autoDiscoveredServers)
        .filter(config => {
          // Temporarily exclude kite server due to connection issues
          if (config.name === 'kite') {
            unifiedRegistryLogger.warn(`Skipping problematic kite server to prevent interference with other servers`);
            return false;
          }
          return true;
        });
      
      if (discoveredExternalConfigs.length > 0) {
        unifiedRegistryLogger.info(
          `Connecting to ${discoveredExternalConfigs.length} auto-discovered external servers...`,
        );
        
        const connectedServers = await externalConnector.connectDiscoveredServers(discoveredExternalConfigs);
        
        // Register connected external servers
        for (const serverInfo of connectedServers) {
          this.manualServers.set(serverInfo.name, serverInfo);
          this.availableServers.add(serverInfo.name);
          
          unifiedRegistryLogger.debug(
            `Registered external server: ${serverInfo.name} with ${serverInfo.toolCount} tools`,
          );
        }
        
        unifiedRegistryLogger.info(
          `External server connection complete: ${connectedServers.length}/${discoveredExternalConfigs.length} servers connected`,
        );
      } else {
        unifiedRegistryLogger.info("No external servers discovered for connection");
      }
      
    } catch (error) {
      unifiedRegistryLogger.warn(
        "Failed to load external MCP servers with new connector:",
        error,
      );
    }
    
    // Mark as initialized
    this.isInitialized = true;
    unifiedRegistryLogger.info("Unified MCP registry initialization complete");
  }

  /**
   * Enable or disable auto-discovery
   */
  setAutoDiscovery(enabled: boolean): void {
    this.autoDiscoveryEnabled = enabled;
    unifiedRegistryLogger.info(
      `Auto-discovery ${enabled ? "enabled" : "disabled"}`,
    );
  }

  /**
   * Refresh discovery
   */
  async refresh(options: DiscoveryOptions = {}): Promise<void> {
    this.clear();
    this.autoDiscoveredServers = [];
    this.availableServers.clear();
    await this.initialize(options);
  }

  /**
   * Get total server count
   */
  getTotalServerCount(): number {
    return this.list().length + this.manualServers.size;
  }

  /**
   * Get available server count
   */
  getAvailableServerCount(): number {
    return this.availableServers.size;
  }

  /**
   * Get auto-discovered servers
   */
  getAutoDiscoveredServers(): DiscoveredMCP[] {
    return this.autoDiscoveredServers;
  }

  /**
   * Get manual servers
   */
  getManualServers(): Map<string, any> {
    return this.manualServers;
  }

  /**
   * List all tools from all registered plugins
   */
  async listAllTools(): Promise<ToolInfo[]> {
    const allTools: ToolInfo[] = [];
    const plugins = this.list();

    // Get tools from auto-discovered plugins
    for (const plugin of plugins) {
      try {
        // Get tools from plugin metadata if available
        const tools = await this.listTools();
        allTools.push(...tools);
      } catch (error) {
        unifiedRegistryLogger.warn(
          `Failed to get tools from ${plugin.metadata.name}:`,
          error,
        );
      }
    }

    // CRITICAL FIX: Also get tools from external MCP servers
    for (const [serverName, serverInfo] of this.manualServers) {
      try {
        if (serverInfo && serverInfo.server && typeof serverInfo.server.listTools === 'function') {
          const externalTools = await serverInfo.server.listTools();
          
          // Convert external tools to ToolInfo format
          const toolInfos: ToolInfo[] = externalTools.map((tool: any) => ({
            name: tool.name,
            description: tool.description || `Tool from external server ${serverName}`,
            server: serverName,
            category: tool.category || 'external',
            type: 'external-mcp'
          }));
          
          allTools.push(...toolInfos);
          
          unifiedRegistryLogger.debug(
            `Added ${toolInfos.length} tools from external server: ${serverName}`,
          );
        }
      } catch (error) {
        unifiedRegistryLogger.warn(
          `Failed to get tools from external server ${serverName}:`,
          error,
        );
      }
    }

    unifiedRegistryLogger.debug(
      `Total tools available: ${allTools.length} (including external MCP servers)`,
    );

    return allTools;
  }

  /**
   * Execute a tool through the registry (including external MCP servers)
   */
  async executeTool(
    toolName: string,
    args: any,
    context: ExecutionContext,
  ): Promise<ToolExecutionResult> {
    unifiedRegistryLogger.info(`[UnifiedRegistry] Executing tool: ${toolName} with args:`, args);
    
    const startTime = Date.now();
    
    // NEW: Try external MCP servers through dynamic tool proxy FIRST
    if ((this as any).toolProxy) {
      try {
        const toolProxy = (this as any).toolProxy;
        const availableTools = toolProxy.getToolKeys();
        
        // Check if this is an external tool (either by prefix or by checking available tools)
        const isExternalTool = toolName.startsWith('mcp_ext_') || 
          availableTools.some((key: string) => key === toolName || `mcp_ext_${key.replace('.', '_')}` === toolName);
        
        if (isExternalTool) {
          // Find the exact tool key
          let actualToolKey = toolName;
          if (toolName.startsWith('mcp_ext_')) {
            // Already prefixed, find matching tool
            const unprefixed = toolName.substring(8).replace('_', '.');
            if (availableTools.includes(unprefixed)) {
              actualToolKey = unprefixed;
            }
          } else {
            // Check if this tool exists in our proxy
            if (availableTools.includes(toolName)) {
              actualToolKey = toolName;
            }
          }
          
          const toolInfo = toolProxy.getToolInfo(actualToolKey);
          if (toolInfo) {
            unifiedRegistryLogger.debug(`[UnifiedRegistry] Executing external tool via proxy: ${actualToolKey}`);
            
            // Execute through dynamic tool proxy
            const result = await toolInfo.aiSDKTool.execute(args);
            
            const executionTime = Date.now() - startTime;
            unifiedRegistryLogger.info(`[UnifiedRegistry] External tool execution successful: ${toolName} (${executionTime}ms)`);
            
            return {
              success: true,
              data: result,
              metadata: {
                toolName,
                executionTime,
                timestamp: Date.now(),
                serverName: toolInfo.serverConfig.name,
              },
            };
          }
        }
      } catch (error) {
        unifiedRegistryLogger.warn(`[UnifiedRegistry] External tool execution failed for ${toolName}:`, error);
        // Continue to fallback methods
      }
    }

    // Fallback: Try the standard registry execution (auto-discovered internal tools)
    if (!toolName.startsWith('mcp_ext_')) {
      try {
        const result = await super.executeTool(toolName, args, context);
        if (result.success) {
          const executionTime = Date.now() - startTime;
          unifiedRegistryLogger.info(`[UnifiedRegistry] Internal tool execution successful: ${toolName} (${executionTime}ms)`);
          return result;
        }
      } catch (error) {
        unifiedRegistryLogger.debug(
          `Standard execution failed for ${toolName}:`,
          error,
        );
      }
    }

    // If we get here, tool execution failed
    const executionTime = Date.now() - startTime;
    throw new Error(`Tool ${toolName} not found in any registry or external server (${executionTime}ms)`);
  }

  /**
   * Lazily activate a server by ID
   */
  async lazyActivateServer(serverId: string): Promise<boolean> {
    unifiedRegistryLogger.info(`Lazy activating server: ${serverId}`);

    // Check if already activated
    if (this.availableServers.has(serverId)) {
      return true;
    }

    // Try to find and activate
    const plugin = this.get(serverId);
    if (plugin) {
      try {
        // Mark as available (initialization happens elsewhere)
        this.availableServers.add(serverId);
        return true;
      } catch (error) {
        unifiedRegistryLogger.error(
          `Failed to activate server ${serverId}:`,
          error,
        );
      }
    }

    return false;
  }

  /**
   * Register a manual server
   */
  registerManualServer(id: string, server: any): void {
    this.manualServers.set(id, server);
    this.availableServers.add(id);
  }

  /**
   * Get registry statistics
   */
  async getStats(): Promise<{
    total: number;
    bySource: Record<string, number>;
    byType: Record<string, number>;
    manual?: { servers: number };
    auto?: { servers: number };
    tools?: number;
  }> {
    const plugins = this.list();
    const bySource: Record<string, number> = {};
    const byType: Record<string, number> = {};

    for (const plugin of plugins) {
      bySource[plugin.source] = (bySource[plugin.source] || 0) + 1;

      // Extract type from name or metadata
      const type =
        plugin.metadata.name.split("/")[1]?.split("-")[0] || "unknown";
      byType[type] = (byType[type] || 0) + 1;
    }

    // CRITICAL FIX: Count tools from all sources
    let totalTools = 0;
    
    // Count tools from auto-discovered plugins
    const registryTools = await this.listTools();
    totalTools += registryTools.length;
    
    // Count tools from external MCP servers
    for (const [serverName, serverInfo] of this.manualServers) {
      if (serverInfo && serverInfo.toolCount) {
        totalTools += serverInfo.toolCount;
      }
    }

    return {
      total: plugins.length + this.manualServers.size,
      bySource,
      byType,
      manual: { servers: this.manualServers.size },
      auto: { servers: this.autoDiscoveredServers.length },
      tools: totalTools,
    };
  }

  /**
   * Clear all registries
   */
  clear(): void {
    super.clear();
    this.autoDiscoveredServers = [];
    this.manualServers.clear();
    this.availableServers.clear();
  }
}

/**
 * Default unified registry instance
 */
export const unifiedRegistry = new UnifiedMCPRegistry();

/**
 * Get or create unified registry singleton with auto-discovery initialized
 */
export async function getOrCreateUnifiedRegistry(): Promise<UnifiedMCPRegistry> {
  if (!unifiedRegistry.isInitialized) {
    await unifiedRegistry.initialize();
  }
  return unifiedRegistry;
}
