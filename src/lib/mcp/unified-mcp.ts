/**
 * NeuroLink Unified MCP System
 * Combines internal MCP servers with external MCP server integration
 * Single initialization point for the complete MCP ecosystem
 */

import { MCPToolRegistry } from "./tool-registry.js";
import { ExternalMCPManager } from "./external-manager.js";
import { aiCoreServer } from "./servers/ai-providers/ai-core-server.js";
import type {
  NeuroLinkExecutionContext,
  ToolResult,
  NeuroLinkMCPServer,
} from "./factory.js";
import { mcpLogger as logger } from "./logging.js";

/**
 * Unified MCP System Options
 */
export interface UnifiedMCPOptions {
  configPath?: string;
  enableExternalServers?: boolean;
  enableInternalServers?: boolean;
  autoInitialize?: boolean;
  registry?: MCPToolRegistry;
}

/**
 * Unified MCP System Status
 */
export interface UnifiedMCPStatus {
  isInitialized: boolean;
  internalServers: {
    count: number;
    tools: number;
  };
  externalServers: {
    configured: number;
    connected: number;
    tools: number;
  };
  totalTools: number;
  registryStats: any;
}

/**
 * Unified MCP System
 * Central hub for managing both internal and external MCP servers
 */
export class UnifiedMCPSystem {
  private registry: MCPToolRegistry;
  private externalManager: ExternalMCPManager;
  private internalServers: NeuroLinkMCPServer[] = [];
  private isInitialized = false;
  private options: Required<UnifiedMCPOptions>;

  constructor(options: UnifiedMCPOptions = {}) {
    this.options = {
      configPath: ".neuro.config.json",
      enableExternalServers: true,
      enableInternalServers: true,
      autoInitialize: false,
      registry: new MCPToolRegistry(),
      ...options,
    };

    this.registry = this.options.registry;
    this.externalManager = new ExternalMCPManager(
      this.options.configPath,
      this.registry,
    );
  }

  /**
   * Initialize the unified MCP system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.debug("[Unified MCP] Already initialized");
      return;
    }

    try {
      logger.info("[Unified MCP] Initializing unified MCP system...");
      const startTime = Date.now();

      // Initialize internal servers first
      if (this.options.enableInternalServers) {
        await this.initializeInternalServers();
      }

      // Initialize external servers
      if (this.options.enableExternalServers) {
        await this.initializeExternalServers();
      }

      this.isInitialized = true;
      const initTime = Date.now() - startTime;

      const status = this.getStatus();
      const currentStatus = await this.getStatus();
      logger.info(`[Unified MCP] Initialization complete in ${initTime}ms`, {
        totalTools: currentStatus.totalTools,
        internalServers: currentStatus.internalServers.count,
        externalServers: currentStatus.externalServers.connected,
      });
    } catch (error) {
      logger.error("[Unified MCP] Initialization failed:", error);
      throw error;
    }
  }

  /**
   * Initialize internal MCP servers
   */
  private async initializeInternalServers(): Promise<void> {
    try {
      logger.info("[Unified MCP] Initializing internal servers...");

      // Register AI Core Server (with 10 tools)
      await this.registry.registerServer("ai-core", aiCoreServer);
      this.internalServers.push(aiCoreServer);

      // TODO: Add other internal servers here as they are created
      // await this.registry.registerServer(utilityServer);
      // this.internalServers.push(utilityServer);

      const totalInternalTools = this.internalServers.reduce(
        (sum, server) => sum + Object.keys(server.tools).length,
        0,
      );

      logger.info(
        `[Unified MCP] Registered ${this.internalServers.length} internal servers with ${totalInternalTools} tools`,
      );
    } catch (error) {
      logger.error(
        "[Unified MCP] Failed to initialize internal servers:",
        error,
      );
      throw error;
    }
  }

  /**
   * Initialize external MCP servers
   */
  private async initializeExternalServers(): Promise<void> {
    try {
      logger.info("[Unified MCP] Initializing external servers...");

      await this.externalManager.initialize();

      const connectedServers = this.externalManager.getConnectedServers();
      const totalExternalTools = connectedServers.reduce(
        (sum, server) => sum + server.toolCount,
        0,
      );

      logger.info(
        `[Unified MCP] Connected to ${connectedServers.length} external servers with ${totalExternalTools} tools`,
      );
    } catch (error) {
      logger.warn(
        "[Unified MCP] External server initialization failed (continuing without external servers):",
        error,
      );
      // Don't throw here - external servers are optional
    }
  }

  /**
   * Execute a tool from any registered server
   */
  async executeTool(
    toolName: string,
    params: any,
    context: NeuroLinkExecutionContext,
  ): Promise<ToolResult> {
    if (!this.isInitialized) {
      throw new Error(
        "Unified MCP system not initialized. Call initialize() first.",
      );
    }

    return this.registry.executeTool(toolName, params, context);
  }

  /**
   * List all available tools
   */
  async listTools(criteria?: any) {
    // CRITICAL FIX: Use listAllTools if available (UnifiedMCPRegistry)
    if (typeof (this.registry as any).listAllTools === 'function') {
      return (this.registry as any).listAllTools();
    }
    return this.registry.listTools();
  }

  /**
   * Get tool information
   */
  getToolInfo(toolName: string) {
    return this.registry.getToolInfo(toolName);
  }

  /**
   * Get registry instance
   */
  getRegistry(): MCPToolRegistry {
    return this.registry;
  }

  /**
   * Get external manager instance
   */
  getExternalManager(): ExternalMCPManager {
    return this.externalManager;
  }

  /**
   * Get comprehensive status
   */
  async getStatus(): Promise<UnifiedMCPStatus> {
    const registryStats = await this.registry.getStats();
    const externalStatus = this.externalManager.getStatus();

    const internalToolCount = this.internalServers.reduce(
      (sum, server) => sum + Object.keys(server.tools).length,
      0,
    );

    return {
      isInitialized: this.isInitialized,
      internalServers: {
        count: this.internalServers.length,
        tools: internalToolCount,
      },
      externalServers: {
        configured: externalStatus.totalServers,
        connected: externalStatus.connected,
        tools: externalStatus.totalTools,
      },
      totalTools: registryStats.totalTools,
      registryStats,
    };
  }

  /**
   * Refresh external connections
   */
  async refreshExternalServers(): Promise<void> {
    if (!this.options.enableExternalServers) {
      return;
    }

    logger.info("[Unified MCP] Refreshing external servers...");
    await this.externalManager.refresh();
  }

  /**
   * Shutdown the unified MCP system
   */
  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    logger.info("[Unified MCP] Shutting down unified MCP system...");

    try {
      // Disconnect external servers
      await this.externalManager.disconnectAll();

      // Clear registry
      this.registry.clear();

      // Clear internal servers
      this.internalServers = [];

      this.isInitialized = false;
      logger.info("[Unified MCP] Shutdown complete");
    } catch (error) {
      logger.error("[Unified MCP] Shutdown failed:", error);
      throw error;
    }
  }

  /**
   * Check if system is initialized
   */
  isSystemInitialized(): boolean {
    return this.isInitialized;
  }
}

/**
 * Default unified MCP system instance
 */
export const defaultUnifiedMCP = new UnifiedMCPSystem({
  autoInitialize: false,
});

/**
 * Initialize the default unified MCP system
 */
export async function initializeMCP(
  options?: UnifiedMCPOptions,
): Promise<UnifiedMCPSystem> {
  if (options) {
    const customSystem = new UnifiedMCPSystem(options);
    await customSystem.initialize();
    return customSystem;
  }

  if (!defaultUnifiedMCP.isSystemInitialized()) {
    await defaultUnifiedMCP.initialize();
  }

  return defaultUnifiedMCP;
}

/**
 * Get the default unified MCP system
 */
export function getMCPSystem(): UnifiedMCPSystem {
  return defaultUnifiedMCP;
}

/**
 * Execute a tool using the default system
 */
export async function executeMCPTool(
  toolName: string,
  params: any,
  context: NeuroLinkExecutionContext,
): Promise<ToolResult> {
  return defaultUnifiedMCP.executeTool(toolName, params, context);
}

/**
 * List all available MCP tools
 */
export function listMCPTools(criteria?: any) {
  return defaultUnifiedMCP.listTools(criteria);
}

/**
 * Get MCP tool information
 */
export function getMCPToolInfo(toolName: string) {
  return defaultUnifiedMCP.getToolInfo(toolName);
}

/**
 * Get unified MCP system status
 */
export async function getMCPStatus(): Promise<UnifiedMCPStatus> {
  return await defaultUnifiedMCP.getStatus();
}
