/**
 * NeuroLink External MCP Manager
 * Manages external MCP servers and bridges them into the NeuroLink factory ecosystem
 * Reads .mcp-config.json and spawns external clients
 */

import { readFile } from "fs/promises";
import { resolve, join } from "path";
import {
  ExternalMCPClient,
  createExternalMCPClient,
} from "./external-client.js";
import { createMCPServer } from "./factory.js";
import type {
  NeuroLinkMCPServer,
  NeuroLinkMCPTool,
  NeuroLinkExecutionContext,
  ToolResult,
} from "./factory.js";
import { MCPToolRegistry } from "./tool-registry.js";
import { mcpLogger as logger } from "./logging.js";

/**
 * MCP Configuration structure
 */
interface MCPConfig {
  mcpServers: Record<
    string,
    {
      name: string;
      command: string;
      args: string[];
      transport: "stdio";
      env?: Record<string, string>;
    }
  >;
  autoDiscovery?: {
    enabled: boolean;
    autoRegister: boolean;
  };
  defaultRegistry?: {
    enabled: boolean;
    includeBuiltInTools: boolean;
  };
}

/**
 * External server connection info
 */
interface ExternalServerInfo {
  name: string;
  client: ExternalMCPClient;
  server: NeuroLinkMCPServer;
  status: "connecting" | "connected" | "disconnected" | "error";
  lastError?: string;
  toolCount: number;
  retryCount: number;
}

/**
 * External MCP Manager
 * Bridges external MCP servers into NeuroLink's factory pattern ecosystem
 */
export class ExternalMCPManager {
  private servers = new Map<string, ExternalServerInfo>();
  private registry: MCPToolRegistry;
  private configPath: string;
  private config: MCPConfig | null = null;
  private isInitialized = false;

  constructor(configPath?: string, registry?: MCPToolRegistry) {
    this.configPath = configPath || ".mcp-config.json";
    this.registry = registry || new MCPToolRegistry();
  }

  /**
   * Initialize the external MCP manager
   * Reads config and connects to all external servers
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.debug("[External MCP Manager] Already initialized");
      return;
    }

    try {
      logger.info("[External MCP Manager] Initializing...");

      // Load configuration
      await this.loadConfig();

      if (!this.config?.mcpServers) {
        logger.warn("[External MCP Manager] No MCP servers configured");
        this.isInitialized = true;
        return;
      }

      // Connect to all configured servers
      const serverNames = Object.keys(this.config.mcpServers);
      logger.info(
        `[External MCP Manager] Connecting to ${serverNames.length} external servers: ${serverNames.join(", ")}`,
      );

      const connectionPromises = serverNames.map((serverName) =>
        this.connectToServer(serverName).catch((error) => {
          logger.error(
            `[External MCP Manager] Failed to connect to ${serverName}:`,
            error,
          );
          return null;
        }),
      );

      const results = await Promise.allSettled(connectionPromises);
      const connected = results.filter(
        (r) => r.status === "fulfilled" && r.value !== null,
      ).length;

      logger.info(
        `[External MCP Manager] Connected to ${connected}/${serverNames.length} external servers`,
      );
      this.isInitialized = true;
    } catch (error) {
      logger.error("[External MCP Manager] Initialization failed:", error);
      throw error;
    }
  }

  /**
   * Load MCP configuration from file
   */
  private async loadConfig(): Promise<void> {
    try {
      const configFile = resolve(this.configPath);
      const configData = await readFile(configFile, "utf-8");
      this.config = JSON.parse(configData);

      logger.debug("[External MCP Manager] Config loaded:", {
        serversCount: Object.keys(this.config?.mcpServers || {}).length,
        autoDiscovery: this.config?.autoDiscovery?.enabled,
      });
    } catch (error) {
      if ((error as any).code === "ENOENT") {
        logger.warn(
          `[External MCP Manager] Config file not found: ${this.configPath}`,
        );
        this.config = { mcpServers: {} };
      } else {
        logger.error("[External MCP Manager] Failed to load config:", error);
        throw error;
      }
    }
  }

  /**
   * Connect to a specific external server
   */
  async connectToServer(
    serverName: string,
  ): Promise<ExternalServerInfo | null> {
    if (!this.config?.mcpServers[serverName]) {
      throw new Error(`Server configuration not found: ${serverName}`);
    }

    const serverConfig = this.config.mcpServers[serverName];

    try {
      logger.info(`[External MCP Manager] Connecting to server: ${serverName}`);

      // Create external client
      const client = createExternalMCPClient({
        name: serverName,
        command: serverConfig.command,
        args: serverConfig.args,
        transport: serverConfig.transport,
        env: serverConfig.env,
      });

      // Create server info
      const serverInfo: ExternalServerInfo = {
        name: serverName,
        client,
        server: createMCPServer({
          id: `external-${serverName}`,
          title: `External ${serverConfig.name || serverName}`,
          description: `External MCP server: ${serverName}`,
          category: "integrations",
          visibility: "private",
          metadata: {
            external: true,
            transport: "stdio",
            command: serverConfig.command,
            args: serverConfig.args,
          },
        }),
        status: "connecting",
        toolCount: 0,
        retryCount: 0,
      };

      // Setup event handlers
      client.on("connected", () => {
        logger.info(`[External MCP Manager] Connected to ${serverName}`);
        serverInfo.status = "connected";
        this.registerServerTools(serverInfo);
      });

      client.on("disconnected", () => {
        logger.warn(`[External MCP Manager] Disconnected from ${serverName}`);
        serverInfo.status = "disconnected";
        // TODO: Implement reconnection logic
      });

      client.on("error", (error) => {
        logger.error(`[External MCP Manager] Error from ${serverName}:`, error);
        serverInfo.status = "error";
        serverInfo.lastError = error.message;
      });

      // Store server info
      this.servers.set(serverName, serverInfo);

      // Connect to the server
      await client.connect();

      return serverInfo;
    } catch (error) {
      logger.error(
        `[External MCP Manager] Failed to connect to ${serverName}:`,
        error,
      );

      const serverInfo: ExternalServerInfo = {
        name: serverName,
        client: null as any,
        server: null as any,
        status: "error",
        lastError: error instanceof Error ? error.message : String(error),
        toolCount: 0,
        retryCount: 0,
      };

      this.servers.set(serverName, serverInfo);
      return null;
    }
  }

  /**
   * Register tools from an external server with the NeuroLink registry
   */
  private async registerServerTools(
    serverInfo: ExternalServerInfo,
  ): Promise<void> {
    try {
      const tools = serverInfo.client.getNeuroLinkTools();

      // Register each tool with the server
      for (const [toolName, tool] of Object.entries(tools)) {
        serverInfo.server.registerTool(tool);
      }

      serverInfo.toolCount = Object.keys(tools).length;

      // Register the server with the registry
      await this.registry.registerServer(serverInfo.name, serverInfo);

      logger.info(
        `[External MCP Manager] Registered ${serverInfo.toolCount} tools from ${serverInfo.name}`,
      );
    } catch (error) {
      logger.error(
        `[External MCP Manager] Failed to register tools from ${serverInfo.name}:`,
        error,
      );
    }
  }

  /**
   * Get all connected external servers
   */
  getConnectedServers(): ExternalServerInfo[] {
    return Array.from(this.servers.values()).filter(
      (s) => s.status === "connected",
    );
  }

  /**
   * Get server status
   */
  getServerStatus(serverName: string): ExternalServerInfo | undefined {
    return this.servers.get(serverName);
  }

  /**
   * Get all server statuses
   */
  getAllServerStatuses(): Record<string, ExternalServerInfo> {
    const statuses: Record<string, ExternalServerInfo> = {};
    for (const [name, info] of this.servers) {
      statuses[name] = {
        ...info,
        // Don't include the actual client/server objects in status
        client: undefined as any,
        server: undefined as any,
      };
    }
    return statuses;
  }

  /**
   * Execute a tool on any connected server
   */
  async executeTool(
    toolName: string,
    params: any,
    context: NeuroLinkExecutionContext,
  ): Promise<ToolResult> {
    // Use the registry to execute the tool
    return this.registry.executeTool(toolName, params, context);
  }

  /**
   * List all available tools from external servers
   */
  listExternalTools() {
    return this.registry.listTools();
  }

  /**
   * Get registry instance
   */
  getRegistry(): MCPToolRegistry {
    return this.registry;
  }

  /**
   * Disconnect from a specific server
   */
  async disconnectServer(serverName: string): Promise<boolean> {
    const serverInfo = this.servers.get(serverName);
    if (!serverInfo || !serverInfo.client) {
      return false;
    }

    try {
      await serverInfo.client.disconnect();
      this.registry.unregisterServer(`external-${serverName}`);
      this.servers.delete(serverName);

      logger.info(`[External MCP Manager] Disconnected from ${serverName}`);
      return true;
    } catch (error) {
      logger.error(
        `[External MCP Manager] Failed to disconnect from ${serverName}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Disconnect from all servers
   */
  async disconnectAll(): Promise<void> {
    logger.info(
      "[External MCP Manager] Disconnecting from all external servers",
    );

    const disconnectPromises = Array.from(this.servers.keys()).map(
      (serverName) => this.disconnectServer(serverName),
    );

    await Promise.allSettled(disconnectPromises);
    this.servers.clear();
    this.isInitialized = false;
  }

  /**
   * Refresh connections - reload config and reconnect
   */
  async refresh(): Promise<void> {
    logger.info("[External MCP Manager] Refreshing connections");

    await this.disconnectAll();
    await this.initialize();
  }

  /**
   * Get comprehensive status
   */
  getStatus() {
    const servers = Array.from(this.servers.values());

    return {
      isInitialized: this.isInitialized,
      configPath: this.configPath,
      totalServers: servers.length,
      connected: servers.filter((s) => s.status === "connected").length,
      connecting: servers.filter((s) => s.status === "connecting").length,
      disconnected: servers.filter((s) => s.status === "disconnected").length,
      errors: servers.filter((s) => s.status === "error").length,
      totalTools: servers.reduce((sum, s) => sum + s.toolCount, 0),
      servers: this.getAllServerStatuses(),
    };
  }
}

/**
 * Default external MCP manager instance
 */
export const defaultExternalMCPManager = new ExternalMCPManager();

/**
 * Initialize external MCP servers with default manager
 */
export async function initializeExternalMCP(
  configPath?: string,
): Promise<void> {
  if (configPath) {
    const manager = new ExternalMCPManager(configPath);
    await manager.initialize();
    return;
  }

  await defaultExternalMCPManager.initialize();
}

/**
 * Get the default external MCP manager
 */
export function getExternalMCPManager(): ExternalMCPManager {
  return defaultExternalMCPManager;
}
