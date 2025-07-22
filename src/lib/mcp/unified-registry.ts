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
  defaultToolRegistry,
} from "./tool-registry.js";
import {
  TransportManager,
  TransportConfigSchema,
} from "./transport-manager.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { ErrorManager } from "./error-manager.js";
import * as fs from "fs";
import * as path from "path";

/**
 * Unified registry combining multiple sources
 */
export class UnifiedMCPRegistry extends MCPToolRegistry {
  private autoDiscoveryEnabled = true;
  private autoDiscoveredServers: DiscoveredMCP[] = [];
  private manualServers: Map<string, any> = new Map();
  private availableServers: Set<string> = new Set();
  private transportManager: TransportManager;
  private activeConnections: Map<string, Client> = new Map();

  constructor(private errorManager: ErrorManager = new ErrorManager()) {
    super();
    this.transportManager = new TransportManager(this.errorManager);
  }

  /**
   * Initialize with auto-discovery and manual config
   */
  async initialize(options: DiscoveryOptions = {}): Promise<void> {
    unifiedRegistryLogger.info("Initializing unified MCP registry...");

    // Import ProviderRegistry to check options
    const { ProviderRegistry } = await import(
      "../factories/provider-registry.js"
    );
    const registryOptions = ProviderRegistry.getOptions();

    // Only load manual config if explicitly enabled (CLI mode)
    if (registryOptions.enableManualMCP) {
      unifiedRegistryLogger.info(
        "Manual MCP config enabled - loading .mcp-config.json",
      );
      await this.loadManualConfig();
      await this.connectManualServers();
    } else {
      unifiedRegistryLogger.debug(
        "Manual MCP config disabled - skipping .mcp-config.json",
      );
    }

    if (this.autoDiscoveryEnabled) {
      const result = await autoRegisterMCPServers(options);
      unifiedRegistryLogger.info(
        `Auto-discovery complete: ${result.registered} registered, ${result.failed} failed`,
      );

      // Register discovered plugins
      for (const plugin of result.plugins) {
        this.register(plugin as any);
        this.autoDiscoveredServers.push(plugin);
        this.availableServers.add(plugin.metadata.name);
      }
    }
  }

  /**
   * Load servers from .mcp-config.json
   */
  private async loadManualConfig(): Promise<void> {
    const configPath = path.join(process.cwd(), ".mcp-config.json");

    try {
      await fs.promises.access(configPath, fs.constants.F_OK);
    } catch {
      unifiedRegistryLogger.debug("No .mcp-config.json found");
      return;
    }

    try {
      const configContent = await fs.promises.readFile(configPath, "utf-8");
      const config = JSON.parse(configContent);

      if (!config.mcpServers) {
        unifiedRegistryLogger.debug("No mcpServers section in config");
        return;
      }

      unifiedRegistryLogger.info(
        `Loading ${Object.keys(config.mcpServers).length} servers from .mcp-config.json`,
      );

      for (const [serverId, serverConfig] of Object.entries(
        config.mcpServers,
      )) {
        try {
          // Convert server config to DiscoveredMCP format
          const discoveredMcp: DiscoveredMCP = {
            metadata: {
              name: serverId,
              version: "1.0.0",
              main: "index.js",
              engine: { neurolink: ">=4.0.0" },
              description: `MCP server: ${serverId}`,
              permissions: ["filesystem", "network"],
            },
            entryPath: (serverConfig as any).command || "npx",
            source: "project" as const,
            constructor: undefined,
          };

          // Register the server
          this.register(discoveredMcp as any);
          this.manualServers.set(serverId, serverConfig);
          this.availableServers.add(serverId);

          unifiedRegistryLogger.debug(`Registered manual server: ${serverId}`);
        } catch (error) {
          unifiedRegistryLogger.error(
            `Failed to register server ${serverId}:`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      unifiedRegistryLogger.info(
        `Manual config loaded: ${this.manualServers.size} servers registered`,
      );
    } catch (error) {
      unifiedRegistryLogger.error(
        "Failed to load manual config:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Connect to manually configured servers
   */
  private async connectManualServers(): Promise<void> {
    for (const [serverId, serverConfig] of this.manualServers.entries()) {
      try {
        unifiedRegistryLogger.info(`Connecting to manual server: ${serverId}`);

        // Use addExternalServer method which properly establishes connections
        await this.addExternalServer(serverId, {
          type: "stdio" as const,
          command: (serverConfig as any).command || "npx",
          args: (serverConfig as any).args || [],
          env: (serverConfig as any).env,
        });

        unifiedRegistryLogger.info(
          `Successfully connected manual server: ${serverId}`,
        );
      } catch (error) {
        unifiedRegistryLogger.error(
          `Failed to connect manual server ${serverId}:`,
          error instanceof Error ? error.message : String(error),
        );
        // Remove from available servers if connection fails
        this.availableServers.delete(serverId);
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

    try {
      // FIXED: Get built-in tools from defaultToolRegistry where they are actually registered
      const builtInTools = await defaultToolRegistry.listTools();
      allTools.push(
        ...builtInTools.map((tool) => ({
          ...tool,
          id: tool.name,
          serverId: tool.serverId || "built-in",
          source: "built-in",
          isExternal: false,
        })),
      );

      unifiedRegistryLogger.debug(
        `Found ${builtInTools.length} built-in tools from defaultToolRegistry`,
      );
    } catch (error) {
      unifiedRegistryLogger.warn("Failed to get built-in tools:", error);
    }

    // FIXED: Get tools from external servers with proper error handling
    // Use the internal plugin registry for accurate server listing
    const plugins = Array.from(this.plugins.values());
    const externalToolPromises: Promise<void>[] = [];

    for (const plugin of plugins) {
      if (
        plugin.metadata?.name &&
        this.availableServers.has(plugin.metadata.name)
      ) {
        const connection = this.activeConnections.get(plugin.metadata.name);
        if (connection) {
          externalToolPromises.push(
            connection
              .listTools()
              .then((response) => {
                const serverTools = response.tools || [];
                allTools.push(
                  ...serverTools.map((tool) => ({
                    name: tool.name,
                    description: tool.description,
                    inputSchema: tool.inputSchema,
                    serverId: plugin.metadata.name,
                    id: `${plugin.metadata.name}.${tool.name}`,
                    source: "external",
                    isExternal: true,
                  })),
                );
                unifiedRegistryLogger.debug(
                  `Found ${serverTools.length} tools from ${plugin.metadata.name}`,
                );
              })
              .catch((error) => {
                unifiedRegistryLogger.warn(
                  `Failed to get tools from ${plugin.metadata.name}:`,
                  error,
                );
              }),
          );
        }
      }
    }

    await Promise.all(externalToolPromises);

    unifiedRegistryLogger.info(`Total tools available: ${allTools.length}`);
    return allTools;
  }

  /**
   * Execute a tool through the registry with fallback to direct MCP execution
   */
  async executeTool<T = unknown>(
    toolName: string,
    args?: unknown,
    context?: ExecutionContext,
  ): Promise<T> {
    unifiedRegistryLogger.info(`Executing tool: ${toolName}`);

    // STEP 1: Try built-in tools first from defaultToolRegistry
    try {
      const result = await defaultToolRegistry.executeTool<T>(
        toolName,
        args,
        context,
      );
      unifiedRegistryLogger.info(
        `Tool ${toolName} executed successfully via defaultToolRegistry`,
      );
      return result;
    } catch (builtInError: any) {
      unifiedRegistryLogger.debug(
        `Built-in tool execution failed: ${builtInError.message}`,
      );
    }

    // STEP 2: Try external MCP servers
    try {
      const result = await this.executeToolViaMCPServer<T>(
        toolName,
        args,
        context,
      );
      unifiedRegistryLogger.info(
        `Tool ${toolName} executed successfully via external MCP server`,
      );
      return result;
    } catch (externalError: any) {
      unifiedRegistryLogger.debug(
        `External MCP execution failed: ${externalError.message}`,
      );
    }

    // STEP 3: Comprehensive error with available tools
    const availableTools = await this.listAllTools();
    const toolNames = availableTools.map((t) => t.name).join(", ");
    const builtInTools = availableTools
      .filter((t) => !t.isExternal)
      .map((t) => t.name)
      .join(", ");
    const externalTools = availableTools
      .filter((t) => t.isExternal)
      .map((t) => `${t.serverId}.${t.name}`)
      .join(", ");

    const errorMessage = [
      `Tool '${toolName}' not found in any registry.`,
      `Available built-in tools: ${builtInTools || "none"}`,
      `Available external tools: ${externalTools || "none"}`,
      `Connected servers: ${Array.from(this.availableServers).join(", ") || "none"}`,
    ].join("\n");

    throw new Error(errorMessage);
  }

  /**
   * Execute tool via direct MCP server connection (fallback)
   */
  private async executeToolViaMCPServer<T = unknown>(
    toolName: string,
    args?: unknown,
    context?: ExecutionContext,
  ): Promise<T> {
    const configPath = path.join(process.cwd(), ".mcp-config.json");

    if (!fs.existsSync(configPath)) {
      throw new Error(
        `Tool '${toolName}' not found and no .mcp-config.json for fallback`,
      );
    }

    const configContent = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(configContent);

    if (!config.mcpServers) {
      throw new Error(`Tool '${toolName}' not found and no servers configured`);
    }

    // Try each configured server
    const errors: string[] = [];
    for (const [serverId, serverConfig] of Object.entries(config.mcpServers)) {
      try {
        unifiedRegistryLogger.debug(
          `Trying tool ${toolName} on server ${serverId}`,
        );

        // Import the executeMCPTool function
        const { executeMCPTool } = await import("../../cli/commands/mcp.js");
        const result = await executeMCPTool(
          serverConfig as any,
          toolName,
          args || {},
        );

        // Convert to ToolResult format
        const toolResult = {
          success: true,
          data: result,
          metadata: { toolName, serverId, sessionId: context?.sessionId },
        };

        unifiedRegistryLogger.info(
          `Tool ${toolName} executed successfully via server ${serverId}`,
        );
        return toolResult as T;
      } catch (serverError) {
        const errorMsg =
          serverError instanceof Error
            ? serverError.message
            : String(serverError);
        errors.push(`${serverId}: ${errorMsg}`);
        unifiedRegistryLogger.debug(
          `Tool ${toolName} failed on server ${serverId}: ${errorMsg}`,
        );
      }
    }

    throw new Error(
      `Tool '${toolName}' not found on any configured MCP server. Errors: ${errors.join("; ")}`,
    );
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
   * Get registry statistics (override parent method)
   */
  getStats(): {
    totalServers: number;
    totalTools: number;
    serversByCategory: Record<string, number>;
    toolsByCategory: Record<string, number>;
    executionStats: Record<
      string,
      { count: number; averageTime: number; totalTime: number }
    >;
  } {
    // Return full stats interface as expected by MCPOrchestrator
    return super.getStats();
  }

  /**
   * Get detailed registry statistics
   */
  async getDetailedStats(): Promise<{
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
      const source = (plugin as any).source || "unknown";
      bySource[source] = (bySource[source] || 0) + 1;

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
   * Add external MCP server programmatically
   *
   * @param serverId - Unique server identifier
   * @param config - Server configuration (stdio, sse, or http)
   */
  async addExternalServer(
    serverId: string,
    config: {
      type: "stdio" | "sse" | "http";
      command?: string;
      args?: string[];
      env?: Record<string, string>;
      cwd?: string;
      url?: string;
      headers?: Record<string, string>;
      timeout?: number;
    },
  ): Promise<void> {
    unifiedRegistryLogger.info(
      `Adding external server: ${serverId} (${config.type})`,
    );

    // Create server metadata
    const serverMeta: DiscoveredMCP = {
      metadata: {
        name: serverId,
        version: "1.0.0",
        main: "index.js",
        engine: { neurolink: ">=4.0.0" },
        description: `External ${config.type} server: ${serverId}`,
        permissions: ["network", "filesystem"],
      },
      entryPath: "",
      source: "installed",
      constructor: undefined,
    };

    // Register in internal registry
    this.register(serverMeta as any);
    this.manualServers.set(serverId, config);
    this.availableServers.add(serverId);

    // Establish actual connection to make server immediately reachable
    try {
      // Validate config for stdio transport (most common case)
      if (config.type === "stdio" && !config.command) {
        throw new Error("Command is required for stdio transport");
      }

      // Create transport with proper type validation
      // Validate config shape before creating transport
      const validatedConfig = TransportConfigSchema.parse(config);
      const transport =
        await this.transportManager.createTransport(validatedConfig);
      const client = new Client(
        {
          name: "neurolink-client",
          version: "4.1.0",
        },
        {
          capabilities: {
            tools: {},
            logging: {},
          },
        },
      );

      // Connect the client
      await client.connect(transport);
      this.activeConnections.set(serverId, client);

      unifiedRegistryLogger.info(
        `Successfully connected to external server: ${serverId}`,
      );
      unifiedRegistryLogger.info(
        `Successfully added external server: ${serverId}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      unifiedRegistryLogger.warn(
        `Failed to establish connection to ${serverId}: ${errorMessage}. Server registered but not connected.`,
      );
      unifiedRegistryLogger.info(
        `Successfully registered external server: ${serverId} but connection failed.`,
      );
    }
  }

  /**
   * Get active connection for a server
   */
  getConnection(serverId: string): Client | undefined {
    return this.activeConnections.get(serverId);
  }

  /**
   * Check if server is actively connected
   */
  isConnected(serverId: string): boolean {
    return this.activeConnections.has(serverId);
  }

  /**
   * Clear all registries and active connections (synchronous, preserves base API contract)
   */
  /**
   * Clear registries without closing connections (internal use)
   */
  private clearRegistriesOnly(): void {
    super.clear();
    this.autoDiscoveredServers = [];
    this.manualServers.clear();
    this.availableServers.clear();
  }

  /**
   * Clear all registries and initiate async connection cleanup
   */
  clear(): void {
    // Close all active connections before clearing registries to prevent resource leaks
    const closePromises: Promise<void>[] = [];
    for (const [serverId, client] of this.activeConnections) {
      closePromises.push(
        client.close().catch((error) => {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          unifiedRegistryLogger.warn(
            `Failed to close connection for ${serverId}: ${errorMessage}`,
          );
        }),
      );
    }

    // Handle async cleanup without blocking synchronous clear()
    Promise.allSettled(closePromises).then(() => {
      this.activeConnections.clear();
    });

    // Clear registries after initiating connection cleanup
    this.clearRegistriesOnly();
  }

  /**
   * Clear all registries and close active connections asynchronously
   */
  async clearAsync(): Promise<void> {
    // Close all active connections first
    for (const [serverId, client] of this.activeConnections) {
      try {
        await client.close();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        unifiedRegistryLogger.warn(
          `Failed to close connection for ${serverId}: ${errorMessage}`,
        );
      }
    }
    this.activeConnections.clear();

    // Clear registries without attempting to close connections again
    this.clearRegistriesOnly();
  }
}

/**
 * Default unified registry instance
 */
export const unifiedRegistry = new UnifiedMCPRegistry();
