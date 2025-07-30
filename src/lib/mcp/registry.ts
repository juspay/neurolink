/**
 * MCP Registry - Industry Standard Interface with camelCase
 */

import type {
  McpMetadata,
  DiscoveredMcp,
  ExecutionContext,
  ToolInfo,
} from "./contracts/mcpContract.js";
import type { UnknownRecord } from "../types/common.js";
import { registryLogger } from "../utils/logger.js";

/**
 * MCP Registry interface with optional methods for maximum flexibility
 */
export interface McpRegistry {
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
}

/**
 * Simple MCP registry for plugin management
 * Maintains backward compatibility with existing code
 */
export class MCPRegistry implements McpRegistry {
  public plugins = new Map<string, DiscoveredMcp>();

  /**
   * Register a plugin
   */
  register(plugin: DiscoveredMcp): void {
    this.plugins.set(plugin.metadata.name, plugin);
    registryLogger.info(`Registered plugin: ${plugin.metadata.name}`);
  }

  /**
   * Unregister a plugin
   */
  unregister(name: string): boolean {
    const removed = this.plugins.delete(name);
    if (removed) {
      registryLogger.info(`Unregistered plugin: ${name}`);
    }
    return removed;
  }

  /**
   * Get a plugin
   */
  get(name: string): DiscoveredMcp | undefined {
    return this.plugins.get(name);
  }

  /**
   * List all plugins
   */
  list(): DiscoveredMcp[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Check if plugin exists
   */
  has(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * Clear all plugins
   */
  clear(): void {
    this.plugins.clear();
    registryLogger.info("Registry cleared");
  }

  /**
   * Register a server (compatible with new interface)
   */
  async registerServer(
    serverId: string,
    serverConfig?: unknown,
    context?: ExecutionContext,
  ): Promise<void> {
    const plugin: DiscoveredMcp = {
      metadata: {
        name: serverId,
        description:
          typeof serverConfig === "object" && serverConfig
            ? ((serverConfig as UnknownRecord).description as string) ||
              "No description"
            : "No description",
      },
      tools:
        typeof serverConfig === "object" && serverConfig
          ? ((serverConfig as UnknownRecord).tools as UnknownRecord)
          : {},
      configuration:
        typeof serverConfig === "object" && serverConfig
          ? (serverConfig as Record<string, string | number | boolean>)
          : {},
    };

    this.register(plugin);
  }

  /**
   * Execute a tool (mock implementation for tests)
   */
  async executeTool<T = unknown>(
    toolName: string,
    args?: unknown,
    context?: ExecutionContext,
  ): Promise<T> {
    registryLogger.info(`Executing tool: ${toolName}`);
    return { result: `Mock execution of ${toolName}`, args } as T;
  }

  /**
   * List all tools (compatible with new interface)
   */
  async listTools(context?: ExecutionContext): Promise<ToolInfo[]> {
    const tools = this.list().map((plugin) => ({
      name: plugin.metadata.name,
      description: plugin.metadata.description || "No description",
      serverId: plugin.metadata.name,
      category: "general",
    }));
    return tools;
  }

  // Legacy methods for backward compatibility

  /**
   * Register a server (legacy sync version)
   */
  registerServerSync(plugin: DiscoveredMcp): void {
    this.register(plugin);
  }

  /**
   * Execute a tool (legacy sync version)
   */
  executeToolSync(toolName: string, args?: unknown): UnknownRecord {
    registryLogger.info(`Executing tool (sync): ${toolName}`);
    return { result: `Mock execution of ${toolName}`, args };
  }

  /**
   * List all tools (legacy sync version)
   */
  listToolsSync(): Array<{ name: string; description?: string }> {
    const tools = this.list().map((plugin) => ({
      name: plugin.metadata.name,
      description: plugin.metadata.description || "No description",
    }));
    return tools;
  }

  /**
   * List all registered server IDs
   *
   * Returns an array of server IDs that are currently registered in the MCP registry.
   * This complements listTools() by providing server-level information, while listTools()
   * provides tool-level information across all servers.
   *
   * @returns Array of registered server identifier strings
   * @see listTools() for getting detailed tool information from all servers
   * @see list() for getting complete server metadata objects
   *
   * @example
   * ```typescript
   * const serverIds = registry.listServers();
   * // ['ai-core', 'external-api', 'database-connector']
   *
   * // Compare with listTools() for comprehensive overview:
   * const servers = registry.listServers(); // ['server1', 'server2']
   * const tools = await registry.listTools(); // [{ name: 'tool1', serverId: 'server1' }, ...]
   * ```
   */
  listServers(): string[] {
    return Array.from(this.plugins.keys());
  }
}

/**
 * Enhanced MCP Registry implementation with config integration
 * Will be implemented in Phase 3.2
 */
export class McpRegistryImpl implements McpRegistry {
  private baseRegistry = new MCPRegistry();
  // Additional implementation will be added in Phase 3.2

  async registerServer(
    serverId: string,
    serverConfig?: unknown,
    context?: ExecutionContext,
  ): Promise<void> {
    return this.baseRegistry.registerServer(serverId, serverConfig, context);
  }

  async executeTool<T = unknown>(
    toolName: string,
    args?: unknown,
    context?: ExecutionContext,
  ): Promise<T> {
    return this.baseRegistry.executeTool<T>(toolName, args, context);
  }

  async listTools(context?: ExecutionContext): Promise<ToolInfo[]> {
    return this.baseRegistry.listTools(context);
  }
}
