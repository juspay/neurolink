/**
 * MCP Registry - Plugin Registration and Management
 */

import type { MCPMetadata, DiscoveredMCP } from "./contracts/mcp-contract.js";
import { registryLogger } from "./logging.js";

/**
 * Simple MCP registry for plugin management
 */
export class MCPRegistry {
  private plugins = new Map<string, DiscoveredMCP>();

  /**
   * Register a plugin
   */
  register(plugin: DiscoveredMCP): void {
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
  get(name: string): DiscoveredMCP | undefined {
    return this.plugins.get(name);
  }

  /**
   * List all plugins
   */
  list(): DiscoveredMCP[] {
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
}

/**
 * Default registry instance
 */
export const mcpRegistry = new MCPRegistry();

// Type aliases for backward compatibility
export type MCPToolRegistry = MCPRegistry;
export const defaultToolRegistry = mcpRegistry;

// Additional exports for compatibility
export { mcpRegistry as defaultMCPRegistry };

// Export tool execution options type
export interface ToolExecutionOptions {
  preferredSource?: string;
  fallbackEnabled?: boolean;
  validateBeforeExecution?: boolean;
  timeoutMs?: number;
}
