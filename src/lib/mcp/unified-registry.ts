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

/**
 * Unified registry combining multiple sources
 */
export class UnifiedMCPRegistry extends MCPToolRegistry {
  private autoDiscoveryEnabled = true;
  private autoDiscoveredServers: DiscoveredMCP[] = [];
  private manualServers: Map<string, any> = new Map();
  private availableServers: Set<string> = new Set();

  /**
   * Initialize with auto-discovery
   */
  async initialize(options: DiscoveryOptions = {}): Promise<void> {
    unifiedRegistryLogger.info("Initializing unified MCP registry...");

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

    return allTools;
  }

  /**
   * Execute a tool through the registry
   */
  async executeTool(
    toolName: string,
    args: any,
    context: ExecutionContext,
  ): Promise<ToolExecutionResult> {
    unifiedRegistryLogger.info(`Executing tool: ${toolName}`);
    return super.executeTool(toolName, args, context);
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

    return {
      total: plugins.length,
      bySource,
      byType,
      manual: { servers: this.manualServers.size },
      auto: { servers: this.autoDiscoveredServers.length },
      tools: 0, // Will be populated when tools are registered
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
