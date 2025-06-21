/**
 * Core Plugin Manager
 * Enhanced plugin management with advanced lifecycle control
 */

import type {
  MCP,
  MCPMetadata,
  MCPConstructor,
  DiscoveredMCP,
  PluginLoadResult,
  PluginDiscoveryResult,
  PluginExecutionResult,
  ExecutionContext,
} from "../contracts/mcp-contract.js";
import { mcpLogger } from "../logging.js";

/**
 * Enhanced plugin manager with core functionality
 */
export class CorePluginManager {
  private plugins = new Map<string, MCP>();
  private constructors = new Map<string, MCPConstructor>();
  private metadata = new Map<string, MCPMetadata>();

  /**
   * Load a plugin from constructor
   */
  async loadPlugin(
    name: string,
    Constructor: MCPConstructor,
    config: any,
  ): Promise<PluginLoadResult> {
    try {
      const instance = new Constructor();
      await instance.initialize(config);

      this.plugins.set(name, instance);
      this.constructors.set(name, Constructor);
      this.metadata.set(name, instance.getMetadata());

      mcpLogger.info(`[CorePluginManager] Loaded plugin: ${name}`);

      return {
        success: true,
        plugin: instance,
      };
    } catch (error) {
      mcpLogger.error(
        `[CorePluginManager] Failed to load plugin ${name}:`,
        error,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Execute a plugin operation
   */
  async executePlugin<T = any>(
    name: string,
    context: ExecutionContext,
    args: any,
  ): Promise<PluginExecutionResult<T>> {
    const startTime = Date.now();

    try {
      const plugin = this.plugins.get(name);
      if (!plugin) {
        throw new Error(`Plugin ${name} not loaded`);
      }

      const result = await plugin.execute(context, args);
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        result,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      mcpLogger.error(
        `[CorePluginManager] Plugin execution failed for ${name}:`,
        error,
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      };
    }
  }

  /**
   * Get plugin instance
   */
  getPlugin(name: string): MCP | undefined {
    return this.plugins.get(name);
  }

  /**
   * Get plugin metadata
   */
  getPluginMetadata(name: string): MCPMetadata | undefined {
    return this.metadata.get(name);
  }

  /**
   * List all loaded plugins
   */
  listPlugins(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (plugin) {
      await plugin.dispose();
      this.plugins.delete(name);
      this.constructors.delete(name);
      this.metadata.delete(name);
      mcpLogger.info(`[CorePluginManager] Unloaded plugin: ${name}`);
    }
  }

  /**
   * Dispose all plugins
   */
  async dispose(): Promise<void> {
    const pluginNames = Array.from(this.plugins.keys());

    for (const name of pluginNames) {
      await this.unloadPlugin(name);
    }

    mcpLogger.info("[CorePluginManager] All plugins disposed");
  }
}

/**
 * Default core plugin manager instance
 */
export const corePluginManager = new CorePluginManager();
