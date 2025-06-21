/**
 * MCP Ecosystem Integration - Bridge Between Research Blueprint and NeuroLink
 * Provides unified interface for plugin management and execution
 */

import { pluginManager, PluginManager } from "./plugin-manager.js";
import { SecurityManager } from "./security-manager.js";
import { MCP } from "./contracts/mcp-contract.js";
import type {
  MCPMetadata,
  ExecutionContext,
} from "./contracts/mcp-contract.js";
import { mcpLogger } from "./logging.js";
import { tool } from "ai";
import { z } from "zod";

/**
 * MCP Ecosystem - Main Interface for Plugin Operations
 */
export class MCPEcosystem {
  private static instance: MCPEcosystem;
  private securityManager: SecurityManager;
  private initialized = false;

  private constructor() {
    this.securityManager = new SecurityManager("moderate");
  }

  static getInstance(): MCPEcosystem {
    if (!MCPEcosystem.instance) {
      MCPEcosystem.instance = new MCPEcosystem();
    }
    return MCPEcosystem.instance;
  }

  /**
   * Initialize the MCP ecosystem
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    mcpLogger.info("[MCPEcosystem] Initializing MCP ecosystem...");

    await pluginManager.initialize();
    this.initialized = true;

    const stats = pluginManager.getDiscoveryStats();
    mcpLogger.info("[MCPEcosystem] MCP ecosystem initialized", stats);
  }

  /**
   * List all available MCPs
   */
  async list(): Promise<MCPMetadata[]> {
    await this.ensureInitialized();
    return pluginManager.listDiscovered();
  }

  /**
   * Get metadata for a specific MCP
   */
  async getMetadata(name: string): Promise<MCPMetadata | null> {
    await this.ensureInitialized();
    return pluginManager.getMetadata(name);
  }

  /**
   * Create and execute an MCP instance
   */
  async execute<T = any>(
    name: string,
    config: any,
    args: any,
    context?: {
      sessionId?: string;
      userId?: string;
    },
  ): Promise<T> {
    await this.ensureInitialized();

    const functionTag = "MCPEcosystem.execute";

    try {
      // Get MCP metadata for permissions
      const metadata = await this.getMetadata(name);
      if (!metadata) {
        throw new Error(`MCP ${name} not found`);
      }

      // Create execution context
      const executionContext = this.securityManager.createExecutionContext(
        context?.sessionId || `mcp-${Date.now()}`,
        context?.userId || "mcp-user",
        metadata.permissions,
        config?.basePath,
      );

      // Create MCP instance
      const mcpInstance = await pluginManager.createInstance<MCP>(
        name,
        config,
      );

      // Execute the MCP
      mcpLogger.debug(`[${functionTag}] Executing ${name}`, { args });
      const result = await mcpInstance.execute(executionContext, args);

      mcpLogger.debug(`[${functionTag}] ${name} execution completed`, {
        success: true,
        resultType: typeof result,
      });

      return result;
    } catch (error) {
      mcpLogger.error(`[${functionTag}] ${name} execution failed:`, error);
      throw error;
    }
  }

  /**
   * Execute filesystem operations using FileSystemMCP
   */
  async filesystem(operation: {
    action: "readFile" | "writeFile" | "listFiles" | "createDir";
    path: string;
    content?: string;
    basePath?: string;
  }): Promise<any> {
    return this.execute(
      "@neurolink-mcp/filesystem",
      { basePath: operation.basePath || process.cwd() },
      {
        operation: operation.action,
        path: operation.path,
        content: operation.content,
      },
    );
  }

  /**
   * Get ecosystem statistics
   */
  async getStats(): Promise<{
    initialized: boolean;
    pluginsDiscovered: number;
    pluginsBySource: Record<string, number>;
    availablePlugins: string[];
  }> {
    const available = await this.list();

    return {
      initialized: this.initialized,
      pluginsDiscovered: available.length,
      pluginsBySource: pluginManager.getDiscoveryStats(),
      availablePlugins: available.map((p) => p.name),
    };
  }

  /**
   * Create an MCP instance for direct use
   */
  async createInstance<T extends MCP>(name: string, config: any): Promise<T> {
    await this.ensureInitialized();

    const metadata = await this.getMetadata(name);
    if (!metadata) {
      throw new Error(`MCP ${name} not found`);
    }

    return pluginManager.createInstance<T>(name, config);
  }

  /**
   * Create execution context for manual MCP usage
   */
  createExecutionContext(
    sessionId: string,
    userId: string,
    permissions: string[],
    basePath?: string,
  ): ExecutionContext {
    return this.securityManager.createExecutionContext(
      sessionId,
      userId,
      permissions,
      basePath,
    );
  }

  /**
   * Ensure ecosystem is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Get all tools formatted for AI providers
   */
  async getToolsForAI(): Promise<any> {
    await this.ensureInitialized();
    const plugins = await this.list();
    const tools: any = {};

    for (const plugin of plugins) {
      // This is a simplified representation. A real implementation
      // would parse the plugin's metadata to get tool definitions.
      if (plugin.name.includes("filesystem")) {
        tools["filesystem_list"] = tool({
          description: "List files in a directory",
          parameters: z.object({
            path: z.string().describe("The path to list files from"),
          }),
          execute: async ({ path }) =>
            this.filesystem({ action: "listFiles", path }),
        });
      }
    }
    return tools;
  }

  /**
   * Dispose of all resources
   */
  async dispose(): Promise<void> {
    await pluginManager.dispose();
    this.initialized = false;
  }
}

// Export singleton instance
export const mcpEcosystem = MCPEcosystem.getInstance();

// Export for NeuroLink SDK integration
export type {
  MCPMetadata,
  ExecutionContext,
} from "./contracts/mcp-contract.js";
