/**
 * NeuroLink Unified MCP Registry System
 * Combines manual configuration, auto-discovery, and default tool registry
 * Provides intelligent server selection with configurable priorities
 */

import fs from "fs";
import path from "path";
import { z } from "zod";
import {
  discoverMCPServers,
  autoRegisterMCPServers,
  type DiscoveryOptions,
} from "./auto-discovery.js";
import {
  defaultToolRegistry,
  MCPToolRegistry,
  type ToolSearchCriteria,
} from "./registry.js";
import type {
  NeuroLinkMCPServer,
  NeuroLinkExecutionContext,
  ToolResult,
} from "./factory.js";
import { unifiedRegistryLogger } from "./logging.js";

/**
 * MCP Server Configuration from manual .mcp-config.json
 */
export interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  transport: "stdio" | "sse";
  url?: string;
}

/**
 * Enhanced MCP configuration with auto-discovery settings
 */
export interface EnhancedMCPConfig {
  mcpServers: Record<string, MCPServerConfig>;
  autoDiscovery?: {
    enabled?: boolean;
    sources?: string[];
    autoRegister?: boolean;
    excludeServers?: string[];
    preferManualConfig?: boolean;
  };
  defaultRegistry?: {
    enabled?: boolean;
    includeBuiltInTools?: boolean;
  };
}

/**
 * Server source information
 */
export interface ServerSource {
  type: "manual" | "auto" | "default";
  priority: number;
  metadata?: Record<string, unknown>;
}

/**
 * Unified server entry
 */
export interface UnifiedServerEntry {
  id: string;
  config?: MCPServerConfig;
  server?: NeuroLinkMCPServer;
  source: ServerSource;
  status: "available" | "unavailable" | "unknown" | "activated";
}

/**
 * Unified execution options
 */
export interface UnifiedExecutionOptions {
  preferredSource?: "manual" | "auto" | "default";
  fallbackEnabled?: boolean;
  validateBeforeExecution?: boolean;
  timeoutMs?: number;
}

/**
 * Unified MCP Registry that combines all sources
 */
export class UnifiedMCPRegistry {
  private configPath: string;
  private config: EnhancedMCPConfig;
  private manualServers: Map<string, UnifiedServerEntry> = new Map();
  private autoServers: Map<string, UnifiedServerEntry> = new Map();
  private defaultServers: Map<string, UnifiedServerEntry> = new Map();
  private autoRegistryInstance: MCPToolRegistry;
  private lastAutoDiscovery: number = 0;
  private autoDiscoveryCacheMs: number = 30000; // 30 seconds
  private _isInitialized: boolean = false;

  constructor(configPath?: string) {
    this.configPath =
      configPath || path.join(process.cwd(), ".mcp-config.json");
    this.config = this.loadConfig();
    this.autoRegistryInstance = new MCPToolRegistry();
  }

  /**
   * Check if the registry has been initialized
   */
  get isInitialized(): boolean {
    return this._isInitialized;
  }

  /**
   * Load MCP configuration with defaults
   */
  private loadConfig(): EnhancedMCPConfig {
    const defaultConfig: EnhancedMCPConfig = {
      mcpServers: {},
      autoDiscovery: {
        enabled: true,
        sources: ["claude", "vscode", "cursor", "windsurf"],
        autoRegister: true,
        excludeServers: [],
        preferManualConfig: true,
      },
      defaultRegistry: {
        enabled: true,
        includeBuiltInTools: true,
      },
    };

    if (!fs.existsSync(this.configPath)) {
      return defaultConfig;
    }

    try {
      const content = fs.readFileSync(this.configPath, "utf-8");
      const userConfig = JSON.parse(content);

      // Merge with defaults
      return {
        ...defaultConfig,
        ...userConfig,
        autoDiscovery: {
          ...defaultConfig.autoDiscovery,
          ...userConfig.autoDiscovery,
        },
        defaultRegistry: {
          ...defaultConfig.defaultRegistry,
          ...userConfig.defaultRegistry,
        },
      };
    } catch (error) {
      unifiedRegistryLogger.warn(
        `Failed to load config from ${this.configPath}, using defaults:`,
        error,
      );
      return defaultConfig;
    }
  }

  /**
   * Save configuration to file
   */
  private saveConfig(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      unifiedRegistryLogger.error(
        `Failed to save config to ${this.configPath}:`,
        error,
      );
    }
  }

  /**
   * Initialize the unified registry by loading all server sources
   */
  async initialize(): Promise<void> {
    if (this._isInitialized) {
      return; // Already initialized
    }

    unifiedRegistryLogger.debug("Initializing unified registry...");

    // 1. Load manual servers
    await this.loadManualServers();

    // 2. Auto-discover servers if enabled
    if (this.config.autoDiscovery?.enabled) {
      await this.loadAutoDiscoveredServers();
    }

    // 3. Load default registry tools if enabled
    if (this.config.defaultRegistry?.enabled) {
      await this.loadDefaultRegistryTools();
    }

    // 4. Lazy activation - mark all discovered servers as available but test on demand
    await this.markServersAsAvailable();

    this._isInitialized = true;
    unifiedRegistryLogger.info(
      `Initialization complete: ${this.getTotalServerCount()} servers discovered (${this.getAvailableServerCount()} marked as available)`,
    );
  }

  /**
   * Mark all discovered servers as available for lazy activation
   */
  private async markServersAsAvailable(): Promise<void> {
    unifiedRegistryLogger.debug(
      "Marking discovered servers as available for lazy activation...",
    );

    // Mark manual servers as available
    for (const [serverId, entry] of this.manualServers.entries()) {
      if (entry.config) {
        entry.status = "available"; // Will be tested on first use
        unifiedRegistryLogger.debug(
          `Marked manual server '${serverId}' as available`,
        );
      }
    }

    // Mark auto-discovered servers as available
    for (const [serverId, entry] of this.autoServers.entries()) {
      if (entry.config) {
        entry.status = "available"; // Will be tested on first use
        unifiedRegistryLogger.debug(
          `Marked auto-discovered server '${serverId}' as available`,
        );
      }
    }

    const availableCount = this.getAvailableServerCount();
    unifiedRegistryLogger.info(
      `Marked ${availableCount} servers as available for lazy activation`,
    );
  }

  /**
   * Load manual servers from configuration
   */
  private async loadManualServers(): Promise<void> {
    this.manualServers.clear();

    for (const [serverId, serverConfig] of Object.entries(
      this.config.mcpServers,
    )) {
      const entry: UnifiedServerEntry = {
        id: serverId,
        config: serverConfig,
        source: {
          type: "manual",
          priority: 10, // Highest priority
          metadata: { configPath: this.configPath },
        },
        status: "unknown",
      };

      this.manualServers.set(serverId, entry);
    }

    unifiedRegistryLogger.debug(
      `Loaded ${this.manualServers.size} manual servers`,
    );
  }

  /**
   * Load auto-discovered servers
   */
  private async loadAutoDiscoveredServers(): Promise<void> {
    // Check cache
    if (Date.now() - this.lastAutoDiscovery < this.autoDiscoveryCacheMs) {
      unifiedRegistryLogger.debug("Using cached auto-discovery results");
      return;
    }

    try {
      const discoveryOptions: DiscoveryOptions = {
        searchGlobal: true,
        searchWorkspace: true,
        searchCommonPaths: true,
        includeInactive: true,
        preferredTools: this.config.autoDiscovery?.sources || [],
      };

      unifiedRegistryLogger.debug(
        "Starting auto-discovery with options:",
        discoveryOptions,
      );
      const discoveryResult = await discoverMCPServers(discoveryOptions);

      unifiedRegistryLogger.debug(
        `Auto-discovery completed: found ${discoveryResult.discovered.length} servers, ${discoveryResult.errors.length} errors`,
      );

      // Clear previous auto-discovered servers
      this.autoServers.clear();

      // Auto-register discovered servers
      if (this.config.autoDiscovery?.autoRegister) {
        unifiedRegistryLogger.debug("Auto-registering discovered servers...");
        const registrationResult = await autoRegisterMCPServers(
          this.autoRegistryInstance,
          discoveryOptions,
        );

        unifiedRegistryLogger.debug(
          `Auto-registered ${registrationResult.registered.length} servers, ` +
            `${registrationResult.failed.length} failed`,
        );
      }

      // Add discovered servers to registry
      let addedCount = 0;
      let skippedCount = 0;
      for (const discoveredServer of discoveryResult.discovered) {
        // Skip if manually configured and preferManualConfig is true
        if (
          this.config.autoDiscovery?.preferManualConfig &&
          this.manualServers.has(discoveredServer.id)
        ) {
          unifiedRegistryLogger.debug(
            `Skipping auto-discovered '${discoveredServer.id}' - manual config takes precedence`,
          );
          skippedCount++;
          continue;
        }

        // Skip if explicitly excluded
        if (
          this.config.autoDiscovery?.excludeServers?.includes(
            discoveredServer.id,
          )
        ) {
          unifiedRegistryLogger.debug(
            `Skipping excluded server '${discoveredServer.id}'`,
          );
          continue;
        }

        const entry: UnifiedServerEntry = {
          id: discoveredServer.id,
          config: {
            name: discoveredServer.id,
            command: discoveredServer.command,
            args: discoveredServer.args,
            env: discoveredServer.env,
            cwd: discoveredServer.cwd,
            transport: "stdio",
          },
          source: {
            type: "auto",
            priority: 7, // Medium priority
            metadata: {
              discoverySource: discoveredServer.source,
              configPath: discoveredServer.configPath,
            },
          },
          status: "unknown",
        };

        this.autoServers.set(discoveredServer.id, entry);
        addedCount++;
      }

      this.lastAutoDiscovery = Date.now();
      unifiedRegistryLogger.debug(
        `Auto-discovery complete: added ${addedCount} servers, skipped ${skippedCount}, total auto servers: ${this.autoServers.size}`,
      );
    } catch (error) {
      unifiedRegistryLogger.error(`Auto-discovery failed: ${error}`);
    }
  }

  /**
   * Load default registry tools
   */
  private async loadDefaultRegistryTools(): Promise<void> {
    if (!this.config.defaultRegistry?.includeBuiltInTools) {
      return;
    }

    this.defaultServers.clear();

    // Ensure built-in NeuroLink servers are initialized
    try {
      const { initializeNeuroLinkMCP, isNeuroLinkMCPInitialized } =
        await import("./initialize.js");
      if (!isNeuroLinkMCPInitialized()) {
        unifiedRegistryLogger.debug(
          "Initializing built-in NeuroLink MCP servers...",
        );
        await initializeNeuroLinkMCP();
      }
    } catch (error) {
      unifiedRegistryLogger.warn(
        "Failed to initialize built-in NeuroLink MCP servers:",
        error,
      );
    }

    // Get tools from default registry
    const tools = defaultToolRegistry.listTools();
    const serverGroups = new Map<
      string,
      Array<{ name: string; description?: string; category?: string }>
    >();

    // Group tools by server
    for (const tool of tools) {
      if (!serverGroups.has(tool.server)) {
        serverGroups.set(tool.server, []);
      }
      serverGroups.get(tool.server)!.push(tool);
    }

    // Create server entries for each server
    for (const [serverId, serverTools] of serverGroups) {
      const entry: UnifiedServerEntry = {
        id: serverId,
        source: {
          type: "default",
          priority: 5, // Lowest priority
          metadata: { toolCount: serverTools.length },
        },
        status: "available",
      };

      this.defaultServers.set(serverId, entry);
    }

    unifiedRegistryLogger.debug(
      `Loaded ${this.defaultServers.size} default registry servers with ${tools.length} total tools`,
    );
  }

  /**
   * Execute a tool using unified registry with fallback
   */
  async executeTool(
    toolName: string,
    params: unknown,
    context: NeuroLinkExecutionContext,
    options: UnifiedExecutionOptions = {},
  ): Promise<ToolResult> {
    const {
      preferredSource,
      fallbackEnabled = true,
      validateBeforeExecution = true,
      timeoutMs = 30000,
    } = options;

    // Determine execution order based on preferences and tool type
    const executionOrder = this.getExecutionOrder(preferredSource, toolName);

    for (const sourceType of executionOrder) {
      try {
        const result = await this.executeFromSource(
          sourceType,
          toolName,
          params,
          context,
          { timeoutMs, validateBeforeExecution },
        );

        if (result.success || !fallbackEnabled) {
          return result;
        }

        unifiedRegistryLogger.debug(
          `Execution failed from ${sourceType}, trying next source...`,
        );
      } catch (error) {
        unifiedRegistryLogger.debug(
          `Error executing from ${sourceType}: ${error}`,
        );

        if (!fallbackEnabled) {
          throw error;
        }
      }
    }

    // All sources failed
    throw new Error(
      `Tool '${toolName}' execution failed from all available sources`,
    );
  }

  /**
   * Execute tool from specific source
   */
  private async executeFromSource(
    sourceType: "manual" | "auto" | "default",
    toolName: string,
    params: unknown,
    context: NeuroLinkExecutionContext,
    options: { timeoutMs: number; validateBeforeExecution: boolean },
  ): Promise<ToolResult> {
    switch (sourceType) {
      case "manual":
        return this.executeFromManualConfig(toolName, params, context, options);
      case "auto":
        return this.executeFromAutoRegistry(toolName, params, context, options);
      case "default":
        return this.executeFromDefaultRegistry(
          toolName,
          params,
          context,
          options,
        );
      default:
        throw new Error(`Unknown source type: ${sourceType}`);
    }
  }

  /**
   * Execute tool from manual configuration
   */
  private async executeFromManualConfig(
    toolName: string,
    params: unknown,
    context: NeuroLinkExecutionContext,
    options: { timeoutMs: number; validateBeforeExecution: boolean },
  ): Promise<ToolResult> {
    // Find manual servers that might have this tool
    for (const [serverId, serverEntry] of this.manualServers) {
      if (!serverEntry.config) {
        continue;
      }

      try {
        unifiedRegistryLogger.debug(
          `Trying tool '${toolName}' on manual server '${serverId}'...`,
        );

        // First, try to lazy activate the server if not already activated
        if (serverEntry.status !== "activated") {
          unifiedRegistryLogger.debug(
            `Lazy activating manual server '${serverId}'...`,
          );

          // Add timeout to prevent hanging on server activation
          const activated = await Promise.race([
            this.lazyActivateServer(serverId, serverEntry),
            new Promise<boolean>((resolve) => {
              const timer = setTimeout(() => resolve(false), 3000); // 3 second timeout
              timer.unref();
            }),
          ]);

          if (!activated) {
            unifiedRegistryLogger.debug(
              `Failed to activate manual server '${serverId}' within timeout`,
            );
            continue;
          }
        }

        // If server is activated and has a server instance, use it
        if (serverEntry.status === "activated" && serverEntry.server) {
          unifiedRegistryLogger.debug(
            `Using activated server instance for '${toolName}' on '${serverId}'`,
          );

          // Check if the tool exists on this server
          const tool = serverEntry.server.tools[toolName];
          if (tool) {
            // Execute using the activated server instance
            const result = await tool.execute(params, context);

            unifiedRegistryLogger.debug(
              `Successfully executed '${toolName}' on activated server '${serverId}'`,
            );

            return {
              success: true,
              data: result,
              metadata: {
                toolName,
                serverId,
                sessionId: context.sessionId,
                timestamp: Date.now(),
                executionTime: 0,
              },
            };
          } else {
            unifiedRegistryLogger.debug(
              `Tool '${toolName}' not found on activated server '${serverId}'`,
            );
            continue;
          }
        }

        // Fallback: execute directly if activation failed but server config exists
        unifiedRegistryLogger.debug(
          `Fallback: executing '${toolName}' directly on manual server '${serverId}'`,
        );
        const result = await this.executeMCPTool(
          serverEntry.config,
          toolName,
          params,
          options.timeoutMs,
        );

        unifiedRegistryLogger.debug(
          `Successfully executed '${toolName}' on manual server '${serverId}' (direct)`,
        );

        return {
          success: true,
          data: result,
          metadata: {
            toolName,
            serverId,
            sessionId: context.sessionId,
            timestamp: Date.now(),
            executionTime: 0,
          },
        };
      } catch (error) {
        unifiedRegistryLogger.debug(
          `Failed to execute '${toolName}' on manual server '${serverId}': ${error instanceof Error ? error.message : String(error)}`,
        );
        continue;
      }
    }

    throw new Error(`Tool '${toolName}' not found on any manual servers`);
  }

  /**
   * Execute MCP tool using manual server configuration
   */
  private async executeMCPTool(
    serverConfig: MCPServerConfig,
    toolName: string,
    toolParams: unknown,
    timeoutMs: number = 10000,
  ): Promise<unknown> {
    const { spawn } = await import("child_process");

    if (serverConfig.transport === "stdio") {
      const child = spawn(serverConfig.command, serverConfig.args || [], {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, ...serverConfig.env },
        cwd: serverConfig.cwd,
      });

      return new Promise((resolve, reject) => {
        let isResolved = false;

        const cleanup = () => {
          if (!isResolved) {
            isResolved = true;
            try {
              child.kill("SIGTERM");
              setTimeout(() => {
                if (!child.killed) {
                  child.kill("SIGKILL");
                }
              }, 1000);
            } catch {
              // Ignore cleanup errors
            }
          }
        };

        const timeout = setTimeout(() => {
          cleanup();
          reject(
            new Error(
              `Timeout executing MCP tool '${toolName}' after ${timeoutMs}ms`,
            ),
          );
        }, timeoutMs);

        const resolveOnce = (value: unknown) => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeout);
            cleanup();
            resolve(value);
          }
        };

        const rejectOnce = (error: Error) => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(timeout);
            cleanup();
            reject(error);
          }
        };

        let responseData = "";
        let initialized = false;
        let initTimeout: NodeJS.Timeout | undefined;

        child.stdout?.on("data", (data) => {
          responseData += data.toString();

          try {
            const lines = responseData.split("\n");
            for (const line of lines) {
              if (line.trim() && line.includes('"result"')) {
                const response = JSON.parse(line.trim());

                if (response.id === 1 && response.result?.capabilities) {
                  // Initialize successful, clear init timeout and send notifications/initialized
                  if (initTimeout) {
                    clearTimeout(initTimeout);
                  }
                  initialized = true;

                  // Send notifications/initialized first
                  const initializedNotification = {
                    jsonrpc: "2.0",
                    method: "notifications/initialized",
                  };
                  child.stdin?.write(
                    JSON.stringify(initializedNotification) + "\n",
                  );

                  // Then execute the tool
                  const toolCallRequest = {
                    jsonrpc: "2.0",
                    id: 2,
                    method: "tools/call",
                    params: {
                      name: toolName,
                      arguments: toolParams,
                    },
                  };
                  child.stdin?.write(JSON.stringify(toolCallRequest) + "\n");
                } else if (response.id === 2) {
                  if (response.result) {
                    // Extract the text content from MCP result format
                    if (
                      response.result.content &&
                      Array.isArray(response.result.content)
                    ) {
                      const textContent = response.result.content.find(
                        (item: { type: string; text?: string }) =>
                          item.type === "text",
                      );
                      if (textContent) {
                        try {
                          resolveOnce(JSON.parse(textContent.text));
                        } catch {
                          resolveOnce(textContent.text);
                        }
                      } else {
                        resolveOnce(response.result);
                      }
                    } else {
                      resolveOnce(response.result);
                    }
                  } else if (response.error) {
                    rejectOnce(
                      new Error(
                        `MCP Error: ${response.error.message || "Unknown error"}`,
                      ),
                    );
                  } else {
                    rejectOnce(new Error("Unknown MCP response format"));
                  }
                  return;
                }
              } else if (line.trim() && line.includes('"error"')) {
                const response = JSON.parse(line.trim());
                if (response.error) {
                  rejectOnce(
                    new Error(
                      `MCP Error: ${response.error.message || "Unknown error"}`,
                    ),
                  );
                  return;
                }
              }
            }
          } catch (parseError) {
            // Continue parsing - don't fail on parse errors
            unifiedRegistryLogger.debug(
              `Parse error (continuing): ${parseError}`,
            );
          }
        });

        child.stderr?.on("data", (data) => {
          const output = data.toString();
          if (
            output.includes("running on stdio") ||
            output.includes("Allowed directories")
          ) {
            unifiedRegistryLogger.debug(`MCP server status: ${output.trim()}`);

            // Start initialization once server is ready (only if not already initialized)
            if (!initialized) {
              initialized = true;
              if (initTimeout) {
                clearTimeout(initTimeout);
              }

              setTimeout(() => {
                const initRequest = {
                  jsonrpc: "2.0",
                  id: 1,
                  method: "initialize",
                  params: {
                    protocolVersion: "2024-11-05",
                    capabilities: {},
                    clientInfo: {
                      name: "neurolink-unified-registry",
                      version: "1.0.0",
                    },
                  },
                };
                try {
                  child.stdin?.write(JSON.stringify(initRequest) + "\n");
                } catch (writeError) {
                  rejectOnce(
                    new Error(`Failed to write to MCP server: ${writeError}`),
                  );
                }
              }, 200);
            }
          } else {
            unifiedRegistryLogger.error(`MCP Server Error: ${output.trim()}`);
          }
        });

        child.on("error", (error) => {
          rejectOnce(new Error(`MCP server spawn error: ${error.message}`));
        });

        child.on("exit", (code, signal) => {
          if (!isResolved) {
            rejectOnce(
              new Error(
                `MCP server exited unexpectedly with code ${code}, signal ${signal}`,
              ),
            );
          }
        });

        child.on("close", (code) => {
          if (!isResolved) {
            rejectOnce(
              new Error(`MCP server closed unexpectedly with code ${code}`),
            );
          }
        });
      });
    }

    throw new Error("SSE transport not yet implemented for unified registry");
  }

  /**
   * Execute tool from auto-registered servers
   */
  private async executeFromAutoRegistry(
    toolName: string,
    params: unknown,
    context: NeuroLinkExecutionContext,
    options: { timeoutMs: number; validateBeforeExecution: boolean },
  ): Promise<ToolResult> {
    return this.autoRegistryInstance.executeTool(toolName, params, context, {
      validateInput: options.validateBeforeExecution,
      validatePermissions: options.validateBeforeExecution,
      timeoutMs: options.timeoutMs,
    });
  }

  /**
   * Execute tool from default registry
   */
  private async executeFromDefaultRegistry(
    toolName: string,
    params: unknown,
    context: NeuroLinkExecutionContext,
    options: { timeoutMs: number; validateBeforeExecution: boolean },
  ): Promise<ToolResult> {
    return defaultToolRegistry.executeTool(toolName, params, context, {
      validateInput: options.validateBeforeExecution,
      validatePermissions: options.validateBeforeExecution,
      timeoutMs: options.timeoutMs,
    });
  }

  /**
   * Get execution order based on preferences and tool type
   */
  private getExecutionOrder(
    preferredSource?: "manual" | "auto" | "default",
    toolName?: string,
  ): Array<"manual" | "auto" | "default"> {
    // For AI-related tools, prioritize built-in NeuroLink tools first
    const aiToolNames = [
      "generate-text",
      "select-provider",
      "check-provider-status",
      "analyze-ai-usage",
      "benchmark-provider-performance",
      "optimize-prompt-parameters",
      "generate-test-cases",
      "refactor-code",
      "generate-documentation",
      "debug-ai-output",
      "get-current-time",
      "format-text",
    ];

    // Built-in utility tools that should use default registry to avoid hanging
    const builtinUtilityTools = [
      "calculate-date-difference",
      "format-number",
      "get-current-time",
    ];

    const isAITool = toolName && aiToolNames.includes(toolName);
    const isBuiltinTool = toolName && builtinUtilityTools.includes(toolName);

    unifiedRegistryLogger.debug(
      `Tool: ${toolName}, isAITool: ${isAITool}, isBuiltinTool: ${isBuiltinTool}, preferredSource: ${preferredSource}`,
    );

    // For builtin utility tools, always prioritize default registry to avoid hanging manual servers
    if (isBuiltinTool) {
      const builtinOrder: Array<"manual" | "auto" | "default"> = [
        "default",
        "auto",
        "manual",
      ];
      unifiedRegistryLogger.debug(
        `Using builtin tool execution order: [${builtinOrder.join(", ")}]`,
      );
      return builtinOrder;
    }

    // Default order prioritizes built-in AI tools for AI-related commands
    const defaultOrder: Array<"manual" | "auto" | "default"> = isAITool
      ? ["default", "manual", "auto"] // AI tools: try built-in first
      : ["manual", "auto", "default"]; // Other tools: try manual config first

    if (!preferredSource) {
      unifiedRegistryLogger.debug(
        `Using default execution order: [${defaultOrder.join(", ")}]`,
      );
      return defaultOrder;
    }

    // Put preferred source first
    const order = [preferredSource];
    for (const source of defaultOrder) {
      if (source !== preferredSource) {
        order.push(source);
      }
    }

    unifiedRegistryLogger.debug(
      `Using custom execution order: [${order.join(", ")}]`,
    );
    return order;
  }

  /**
   * List all available tools from all sources
   */
  async listAllTools(
    criteria: ToolSearchCriteria & {
      source?: "manual" | "auto" | "default";
    } = {},
  ): Promise<
    Array<{
      name: string;
      server: string;
      source: "manual" | "auto" | "default";
      description?: string;
      category?: string;
      isImplemented?: boolean;
    }>
  > {
    const tools: Array<{
      name: string;
      server: string;
      source: "manual" | "auto" | "default";
      description?: string;
      category?: string;
      isImplemented?: boolean;
    }> = [];

    // Add tools from each source based on criteria
    if (!criteria.source || criteria.source === "manual") {
      // For manual servers, just list placeholders without trying to activate
      // Activation will happen on-demand during tool execution
      for (const [serverId, entry] of this.manualServers) {
        if (entry.status === "activated" && entry.server) {
          // Get tools from already activated servers
          const serverTools = Object.values(entry.server.tools);
          tools.push(
            ...serverTools.map(
              (tool: { name: string; description?: string }) => ({
                name: tool.name,
                server: serverId,
                source: "manual" as const,
                description: tool.description,
                category: "manual",
                isImplemented: true,
              }),
            ),
          );
        } else {
          // Add placeholder for non-activated servers (no activation attempt)
          tools.push({
            name: `${serverId}-placeholder`,
            server: serverId,
            source: "manual" as const,
            description: `Manual server: ${serverId} (not activated)`,
            category: "manual",
            isImplemented: false,
          });
        }
      }
    }

    if (!criteria.source || criteria.source === "auto") {
      // For auto-discovered servers, don't try to activate them all during listing
      // Instead, just show placeholder tools and activate on demand
      for (const [serverId, entry] of this.autoServers) {
        if (entry.status === "activated" && entry.server) {
          // Get tools from already activated server
          const serverTools = Object.values(entry.server.tools);
          tools.push(
            ...serverTools.map(
              (tool: { name: string; description?: string }) => ({
                name: tool.name,
                server: serverId,
                source: "auto" as const,
                description: tool.description,
                category: "auto",
                isImplemented: true,
              }),
            ),
          );
        } else if (entry.status === "available") {
          // For available but not activated servers, add placeholder tools
          const serverName = entry.config?.name || serverId;
          tools.push({
            name: `${serverName}-tools`,
            server: serverId,
            source: "auto" as const,
            description: `Tools from ${serverName} server (will be activated on first use)`,
            category: "auto-placeholder",
            isImplemented: false,
          });
        }
      }

      // Also include default auto registry tools
      const autoTools = this.autoRegistryInstance.listTools(criteria);
      tools.push(
        ...autoTools.map((tool) => ({
          ...tool,
          source: "auto" as const,
        })),
      );
    }

    if (!criteria.source || criteria.source === "default") {
      const defaultTools = defaultToolRegistry.listTools(criteria);
      tools.push(
        ...defaultTools.map((tool) => ({
          ...tool,
          source: "default" as const,
        })),
      );
    }

    return tools;
  }

  /**
   * List all servers from all sources
   */
  listAllServers(): UnifiedServerEntry[] {
    const servers: UnifiedServerEntry[] = [];

    // Add servers from all sources
    servers.push(...Array.from(this.manualServers.values()));
    servers.push(...Array.from(this.autoServers.values()));
    servers.push(...Array.from(this.defaultServers.values()));

    // Sort by priority (higher priority first)
    return servers.sort((a, b) => b.source.priority - a.source.priority);
  }

  /**
   * Get total server count across all sources
   */
  getTotalServerCount(): number {
    return (
      this.manualServers.size + this.autoServers.size + this.defaultServers.size
    );
  }

  /**
   * Add a manual server configuration
   */
  addManualServer(serverId: string, config: MCPServerConfig): void {
    this.config.mcpServers[serverId] = config;
    this.saveConfig();

    const entry: UnifiedServerEntry = {
      id: serverId,
      config,
      source: {
        type: "manual",
        priority: 10,
        metadata: { configPath: this.configPath },
      },
      status: "unknown",
    };

    this.manualServers.set(serverId, entry);
    unifiedRegistryLogger.info(`Added manual server: ${serverId}`);
  }

  /**
   * Remove a manual server configuration
   */
  removeManualServer(serverId: string): boolean {
    if (this.config.mcpServers[serverId]) {
      delete this.config.mcpServers[serverId];
      this.saveConfig();
      this.manualServers.delete(serverId);
      unifiedRegistryLogger.info(`Removed manual server: ${serverId}`);
      return true;
    }
    return false;
  }

  /**
   * Update auto-discovery configuration
   */
  updateAutoDiscoveryConfig(
    config: Partial<EnhancedMCPConfig["autoDiscovery"]>,
  ): void {
    this.config.autoDiscovery = {
      ...this.config.autoDiscovery,
      ...config,
    };
    this.saveConfig();
    unifiedRegistryLogger.info("Updated auto-discovery configuration");
  }

  /**
   * Force refresh of auto-discovered servers
   */
  async refreshAutoDiscovery(): Promise<void> {
    this.lastAutoDiscovery = 0; // Reset cache
    await this.loadAutoDiscoveredServers();
  }

  /**
   * Get current configuration
   */
  getConfig(): EnhancedMCPConfig {
    return { ...this.config };
  }

  /**
   * Get registry statistics
   */
  getStats() {
    return {
      manual: {
        servers: this.manualServers.size,
        tools: 0, // Would be calculated from actual manual servers
      },
      auto: {
        servers: this.autoServers.size,
        tools: this.autoRegistryInstance.listTools().length,
      },
      default: {
        servers: this.defaultServers.size,
        tools: defaultToolRegistry.listTools().length,
      },
      total: {
        servers: this.getTotalServerCount(),
        tools:
          this.autoRegistryInstance.listTools().length +
          defaultToolRegistry.listTools().length +
          this.getActivatedToolCount(),
      },
    };
  }

  /**
   * Get auto-discovered servers
   */
  getAutoDiscoveredServers(): Map<string, UnifiedServerEntry> {
    return this.autoServers;
  }

  /**
   * Get manual servers
   */
  getManualServers(): Map<string, UnifiedServerEntry> {
    return this.manualServers;
  }

  /**
   * Get server summary with counts and status
   */
  getServerSummary() {
    return {
      manual: {
        servers: this.manualServers.size,
        tools: this.autoRegistryInstance.listTools().length,
      },
      auto: {
        servers: this.autoServers.size,
        tools: this.autoRegistryInstance.listTools().length,
      },
      default: {
        servers: this.defaultServers.size,
        tools: defaultToolRegistry.listTools().length,
      },
      total: {
        servers: this.getTotalServerCount(),
        tools:
          this.autoRegistryInstance.listTools().length +
          defaultToolRegistry.listTools().length +
          this.getActivatedToolCount(),
      },
    };
  }

  /**
   * Activate discovered servers by testing connectivity and loading available tools
   */
  private async activateDiscoveredServers(): Promise<void> {
    unifiedRegistryLogger.debug("Activating discovered servers...");

    // const activationPromises: Promise<void>[] = [];
    const maxConcurrentActivations = 3; // Reduced from 5 to 3 to avoid overwhelming system

    // Collect all servers to activate (manual + auto-discovered)
    const serversToActivate = [
      ...Array.from(this.manualServers.entries()),
      ...Array.from(this.autoServers.entries()),
    ];

    unifiedRegistryLogger.debug(
      `Found ${serversToActivate.length} servers to activate`,
    );

    // Process servers in batches
    for (
      let i = 0;
      i < serversToActivate.length;
      i += maxConcurrentActivations
    ) {
      const batch = serversToActivate.slice(i, i + maxConcurrentActivations);

      unifiedRegistryLogger.debug(
        `Activating batch ${Math.floor(i / maxConcurrentActivations) + 1}: servers ${i + 1}-${Math.min(i + maxConcurrentActivations, serversToActivate.length)}`,
      );

      const batchPromises = batch.map(async ([serverId, entry]) => {
        try {
          await this.activateServer(serverId, entry);
        } catch (error) {
          unifiedRegistryLogger.warn(
            `Failed to activate server '${serverId}': ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      });

      await Promise.allSettled(batchPromises);
    }

    const availableCount = this.getAvailableServerCount();
    unifiedRegistryLogger.info(
      `Server activation complete: ${availableCount} servers activated`,
    );
  }

  /**
   * Activate a single server by testing connectivity and loading tools
   */
  private async activateServer(
    serverId: string,
    entry: UnifiedServerEntry,
  ): Promise<void> {
    if (!entry.config) {
      return; // Skip servers without config (default registry servers)
    }

    const activationTimeout = 5000; // Reduced from 10 seconds to 5 seconds

    try {
      // Test server connectivity with timeout
      const isConnected = await Promise.race([
        this.testServerConnectivity(entry.config),
        new Promise<boolean>((_, reject) =>
          setTimeout(
            () => reject(new Error("Activation timeout")),
            activationTimeout,
          ),
        ),
      ]);

      if (isConnected) {
        // Try to load tools from the server
        const tools = await this.loadServerTools(entry.config);

        if (tools && tools.length > 0) {
          entry.status = "activated"; // Changed from 'available' to 'activated'
          entry.server = await this.createServerInstance(
            serverId,
            entry.config,
            tools,
          );

          // Register tools with the auto registry instance
          if (entry.server) {
            await this.autoRegistryInstance.registerServer(entry.server);
          }

          unifiedRegistryLogger.debug(
            `Activated server '${serverId}' with ${tools.length} tools`,
          );
        } else {
          entry.status = "unavailable";
          unifiedRegistryLogger.debug(
            `Server '${serverId}' connected but no tools available`,
          );
        }
      } else {
        entry.status = "unavailable";
        unifiedRegistryLogger.debug(
          `Server '${serverId}' connectivity test failed`,
        );
      }
    } catch (error) {
      entry.status = "unavailable";
      unifiedRegistryLogger.debug(
        `Server '${serverId}' activation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Test server connectivity
   */
  private async testServerConnectivity(
    serverConfig: MCPServerConfig,
  ): Promise<boolean> {
    try {
      const { spawn } = await import("child_process");

      if (serverConfig.transport === "stdio") {
        return new Promise<boolean>((resolve) => {
          let resolved = false;
          let child: import("child_process").ChildProcess;

          // Much shorter timeout for basic connectivity test
          const timeout = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              if (child) {
                this.cleanupChildProcess(child);
              }
              resolve(false);
            }
          }, 2000); // Reduced from 5000ms to 2000ms

          // CRITICAL FIX: Unref the timeout to prevent event loop hanging
          timeout.unref();

          const safeResolve = (value: boolean) => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              if (child) {
                this.cleanupChildProcess(child);
              }
              resolve(value);
            }
          };

          child = spawn(serverConfig.command, serverConfig.args || [], {
            stdio: ["pipe", "pipe", "pipe"],
            env: { ...process.env, ...serverConfig.env },
            cwd: serverConfig.cwd,
          });

          // CRITICAL FIX: Unref the child process to prevent event loop hanging
          child.unref();

          child.on("spawn", () => {
            safeResolve(true);
          });

          child.on("error", (error) => {
            // Log specific error types that are common
            if (error.message.includes("ENOENT")) {
              unifiedRegistryLogger.debug(
                `Server command not found: ${serverConfig.command}`,
              );
            }
            safeResolve(false);
          });

          child.on("exit", () => {
            safeResolve(true); // If it exits cleanly, consider it working
          });
        });
      }

      // TODO: Add SSE transport connectivity testing
      return false;
    } catch (error) {
      unifiedRegistryLogger.debug(
        `Connectivity test error for ${serverConfig.command}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  /**
   * Load tools from a server
   */
  private async loadServerTools(
    serverConfig: MCPServerConfig,
  ): Promise<
    Array<{ name: string; description: string; inputSchema?: unknown }>
  > {
    try {
      const { spawn } = await import("child_process");

      if (serverConfig.transport === "stdio") {
        return new Promise<
          Array<{ name: string; description: string; inputSchema?: unknown }>
        >((resolve, reject) => {
          const child = spawn(serverConfig.command, serverConfig.args || [], {
            stdio: ["pipe", "pipe", "pipe"],
            env: { ...process.env, ...serverConfig.env },
            cwd: serverConfig.cwd,
          });

          // CRITICAL FIX: Unref the child process to prevent event loop hanging
          child.unref();

          const timeout = setTimeout(() => {
            this.cleanupChildProcess(child);
            reject(new Error("Tool loading timeout"));
          }, 8000);

          // CRITICAL FIX: Unref the timeout to prevent event loop hanging
          timeout.unref();

          let responseData = "";
          let initialized = false;
          let resolved = false;

          const safeResolve = (
            result: Array<{
              name: string;
              description: string;
              inputSchema?: unknown;
            }>,
          ) => {
            if (resolved) {
              return;
            }
            resolved = true;
            clearTimeout(timeout);
            this.cleanupChildProcess(child);
            resolve(result);
          };

          const safeReject = (error: Error) => {
            if (resolved) {
              return;
            }
            resolved = true;
            clearTimeout(timeout);
            this.cleanupChildProcess(child);
            reject(error);
          };

          // Handle server status messages on stderr
          child.stderr?.on("data", (data) => {
            const output = data.toString();
            if (
              output.includes("running on stdio") ||
              output.includes("Allowed directories")
            ) {
              unifiedRegistryLogger.debug(
                `MCP server status: ${output.trim()}`,
              );

              // Start initialization once server is ready
              if (!initialized) {
                initialized = true;
                // Use unref timeout for non-critical initialization delay
                const initTimeout = setTimeout(() => {
                  const initRequest = {
                    jsonrpc: "2.0",
                    id: 1,
                    method: "initialize",
                    params: {
                      protocolVersion: "2024-11-05",
                      capabilities: { tools: {} },
                      clientInfo: { name: "neurolink", version: "1.0.0" },
                    },
                  };
                  child.stdin?.write(JSON.stringify(initRequest) + "\n");
                }, 200);
                initTimeout.unref();
              }
            }
          });

          child.stdout?.on("data", (data) => {
            responseData += data.toString();

            const lines = responseData.split("\n");
            for (const line of lines) {
              if (line.trim() && line.includes('"result"')) {
                try {
                  const response = JSON.parse(line.trim());

                  if (response.id === 1 && response.result?.capabilities) {
                    // Initialize successful, send notifications/initialized
                    const initializedNotification = {
                      jsonrpc: "2.0",
                      method: "notifications/initialized",
                    };
                    child.stdin?.write(
                      JSON.stringify(initializedNotification) + "\n",
                    );

                    // Then list tools with unref timeout
                    const toolsTimeout = setTimeout(() => {
                      const listToolsRequest = {
                        jsonrpc: "2.0",
                        id: 2,
                        method: "tools/list",
                      };
                      child.stdin?.write(
                        JSON.stringify(listToolsRequest) + "\n",
                      );
                    }, 100);
                    toolsTimeout.unref();
                  } else if (response.id === 2 && response.result?.tools) {
                    safeResolve(response.result.tools || []);
                    return;
                  }
                } catch {
                  // Ignore JSON parsing errors for this line
                }
              }
            }
          });

          child.on("error", (error) => {
            safeReject(new Error(`Server process error: ${error.message}`));
          });

          child.on("exit", (code) => {
            if (!resolved) {
              safeReject(new Error(`Server exited with code ${code}`));
            }
          });
        });
      }

      return [];
    } catch (error) {
      unifiedRegistryLogger.debug(
        `loadServerTools error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  /**
   * Properly cleanup child process and its streams to prevent hanging
   */
  private cleanupChildProcess(
    child: import("child_process").ChildProcess,
  ): void {
    try {
      // First, close stdin explicitly to prevent PIPEWRAP handle retention
      if (child.stdin && !child.stdin.destroyed) {
        child.stdin.end(); // Close stdin explicitly first
        child.stdin.destroy();
      }

      // Destroy stdout/stderr streams to release handles
      if (child.stdout && !child.stdout.destroyed) {
        child.stdout.destroy();
      }
      if (child.stderr && !child.stderr.destroyed) {
        child.stderr.destroy();
      }

      // Kill the process if still running
      if (!child.killed) {
        child.kill("SIGTERM");

        // Force kill after 1 second if SIGTERM doesn't work
        const forceKillTimeout = setTimeout(() => {
          if (!child.killed) {
            child.kill("SIGKILL");
          }
        }, 1000);
        forceKillTimeout.unref();
      }
    } catch (error) {
      // Ignore cleanup errors
      unifiedRegistryLogger.debug(
        `Child process cleanup error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Create a server instance from config and tools
   */
  private async createServerInstance(
    serverId: string,
    config: MCPServerConfig,
    tools: Array<{ name: string; description: string; inputSchema?: unknown }>,
  ): Promise<NeuroLinkMCPServer | undefined> {
    try {
      const { createMCPServer } = await import("./factory.js");

      const server = createMCPServer({
        id: serverId,
        title: config.name || serverId,
        description: `Auto-discovered MCP server from ${config.command}`,
        category: "automation",
        version: "1.0.0",
        capabilities: ["tools"],
      });

      // Register discovered tools with direct MCP execution
      for (const tool of tools) {
        if (tool.name && tool.description) {
          server.registerTool({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema
              ? z.object(tool.inputSchema as Record<string, z.ZodTypeAny>)
              : z.record(z.unknown()).optional(),
            execute: async (
              params: unknown,
              context: NeuroLinkExecutionContext,
            ): Promise<ToolResult> => {
              const startTime = Date.now();
              try {
                unifiedRegistryLogger.debug(
                  `Executing external MCP tool ${tool.name} on server ${serverId}`,
                );

                // Execute tool directly on external MCP server
                const result = await this.executeMCPTool(
                  config,
                  tool.name,
                  params,
                );
                const executionTime = Date.now() - startTime;

                return {
                  success: true,
                  data: result,
                  metadata: {
                    toolName: tool.name,
                    serverId: serverId,
                    sessionId: context.sessionId,
                    timestamp: Date.now(),
                    executionTime,
                    isExternalMCP: true,
                  },
                };
              } catch (error) {
                const executionTime = Date.now() - startTime;
                const errorMessage =
                  error instanceof Error ? error.message : String(error);

                unifiedRegistryLogger.debug(
                  `External MCP tool execution failed: ${errorMessage}`,
                );

                return {
                  success: false,
                  error: `External MCP tool '${tool.name}' failed: ${errorMessage}`,
                  metadata: {
                    toolName: tool.name,
                    serverId: serverId,
                    sessionId: context.sessionId,
                    timestamp: Date.now(),
                    executionTime,
                    isExternalMCP: true,
                    error: errorMessage,
                  },
                };
              }
            },
          });
        }
      }

      return server;
    } catch (error) {
      unifiedRegistryLogger.debug(
        `Failed to create server instance: ${error instanceof Error ? error.message : String(error)}`,
      );
      return undefined;
    }
  }

  /**
   * Get count of activated servers
   */
  getAvailableServerCount(): number {
    let count = 0;

    for (const entry of this.manualServers.values()) {
      if (entry.status === "activated") {
        // Changed from 'available' to 'activated'
        count++;
      }
    }

    for (const entry of this.autoServers.values()) {
      if (entry.status === "activated") {
        // Changed from 'available' to 'activated'
        count++;
      }
    }

    for (const entry of this.defaultServers.values()) {
      if (entry.status === "activated") {
        // Changed from 'available' to 'activated'
        count++;
      }
    }

    return count;
  }

  /**
   * Get count of tools from activated servers
   */
  private getActivatedToolCount(): number {
    let count = 0;

    for (const entry of this.manualServers.values()) {
      if (entry.status === "activated" && entry.server) {
        count += Object.keys(entry.server.tools).length;
      }
    }

    for (const entry of this.autoServers.values()) {
      if (entry.status === "activated" && entry.server) {
        count += Object.keys(entry.server.tools).length;
      }
    }

    return count;
  }

  /**
   * Activate a server on-demand when its tools are first requested
   */
  async lazyActivateServer(
    serverId: string,
    entry: UnifiedServerEntry,
  ): Promise<boolean> {
    if (entry.status === "activated" || !entry.config) {
      return entry.status === "activated";
    }

    unifiedRegistryLogger.debug(`Lazy activating server '${serverId}'...`);

    try {
      // Handle known servers with predefined tools (bypass hanging tool discovery)
      if (
        serverId === "filesystem" &&
        entry.config.command === "mcp-server-filesystem"
      ) {
        unifiedRegistryLogger.debug(
          `Using predefined tools for filesystem server '${serverId}'`,
        );

        // Quick connectivity test first
        const isConnected = await Promise.race([
          this.testServerConnectivity(entry.config),
          new Promise<boolean>((resolve) =>
            setTimeout(() => resolve(false), 1500),
          ),
        ]);

        if (isConnected) {
          // Create predefined filesystem tools with correct tool names from the actual MCP server
          const predefinedTools = [
            {
              name: "list_directory",
              description:
                "Get a detailed listing of all files and directories in a specified path. Results clearly distinguish between files and directories with [FILE] and [DIR] prefixes.",
              inputSchema: {
                type: "object",
                properties: {
                  path: {
                    type: "string",
                    description: "Path to list directory contents from",
                  },
                },
                required: ["path"],
              },
            },
            {
              name: "read_file",
              description:
                "Read the complete contents of a file from the file system. Handles various text encodings and provides detailed error messages if the file cannot be read.",
              inputSchema: {
                type: "object",
                properties: {
                  path: {
                    type: "string",
                    description: "Path to the file to read",
                  },
                },
                required: ["path"],
              },
            },
            {
              name: "write_file",
              description:
                "Create a new file or completely overwrite an existing file with new content. Use with caution as it will overwrite existing files without warning.",
              inputSchema: {
                type: "object",
                properties: {
                  path: {
                    type: "string",
                    description: "Path to the file to write",
                  },
                  content: {
                    type: "string",
                    description: "Content to write to the file",
                  },
                },
                required: ["path", "content"],
              },
            },
            {
              name: "create_directory",
              description:
                "Create a new directory or ensure a directory exists. Can create multiple nested directories in one operation.",
              inputSchema: {
                type: "object",
                properties: {
                  path: {
                    type: "string",
                    description: "Path to the directory to create",
                  },
                },
                required: ["path"],
              },
            },
            {
              name: "search_files",
              description:
                "Recursively search for files and directories matching a pattern. Searches through all subdirectories from the starting path.",
              inputSchema: {
                type: "object",
                properties: {
                  path: {
                    type: "string",
                    description: "Starting path to search from",
                  },
                  pattern: {
                    type: "string",
                    description: "Pattern to search for",
                  },
                },
                required: ["path", "pattern"],
              },
            },
          ];

          entry.status = "activated";
          entry.server = await this.createServerInstance(
            serverId,
            entry.config,
            predefinedTools,
          );

          if (entry.server) {
            await this.autoRegistryInstance.registerServer(entry.server);
          }

          unifiedRegistryLogger.debug(
            `Lazy activated filesystem server '${serverId}' with ${predefinedTools.length} predefined tools`,
          );
          return true;
        }
      }

      // Original logic for other servers
      // Quick connectivity test with short timeout
      const isConnected = await Promise.race([
        this.testServerConnectivity(entry.config),
        new Promise<boolean>((resolve) =>
          setTimeout(() => resolve(false), 1500),
        ),
      ]);

      if (isConnected) {
        // Try to load tools
        const tools = await this.loadServerTools(entry.config);

        if (tools && tools.length > 0) {
          entry.status = "activated";
          entry.server = await this.createServerInstance(
            serverId,
            entry.config,
            tools,
          );

          if (entry.server) {
            await this.autoRegistryInstance.registerServer(entry.server);
          }

          unifiedRegistryLogger.debug(
            `Lazy activated server '${serverId}' with ${tools.length} tools`,
          );
          return true;
        }
      }

      entry.status = "unavailable";
      unifiedRegistryLogger.debug(
        `Server '${serverId}' lazy activation failed`,
      );
      return false;
    } catch (error) {
      entry.status = "unavailable";
      unifiedRegistryLogger.debug(
        `Server '${serverId}' lazy activation error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }
}

/**
 * Default unified registry instance
 */
export const defaultUnifiedRegistry = new UnifiedMCPRegistry();
