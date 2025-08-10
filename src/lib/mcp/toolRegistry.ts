/**
 * MCP Tool Registry - Extended Registry with Tool Management
 * Updated to match industry standard camelCase interfaces
 */

import type {
  DiscoveredMcp,
  ExecutionContext,
  ToolInfo,
} from "./contracts/mcpContract.js";
import type { ToolResult } from "./factory.js";
import type { JsonValue, UnknownRecord } from "../types/common.js";
import { MCPRegistry } from "./registry.js";
import { registryLogger } from "../utils/logger.js";
import { randomUUID } from "crypto";
import { directAgentTools } from "../agent/directTools.js";

interface ToolImplementation {
  execute: (
    params: unknown,
    context?: ExecutionContext,
  ) => Promise<unknown> | unknown;
  description?: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
  category?: string;
  permissions?: string[];
}

interface ServerRegistration {
  id?: string;
  serverId?: string;
  description?: string;
  title?: string;
  category?: string;
  tools?: Record<string, ToolImplementation>;
  configuration?: Record<string, unknown>;
}

// Use the compatible ToolResult from factory.ts
export type ToolExecutionResult = ToolResult;

/**
 * Tool execution options
 */
export interface ToolExecutionOptions {
  timeout?: number;
  retries?: number;
  context?: ExecutionContext;
  preferredSource?: string;
  fallbackEnabled?: boolean;
  validateBeforeExecution?: boolean;
  timeoutMs?: number;
}

export class MCPToolRegistry extends MCPRegistry {
  private tools: Map<string, ToolInfo> = new Map();
  private toolImpls: Map<string, ToolImplementation> = new Map(); // Store actual tool implementations
  private toolExecutionStats: Map<
    string,
    { count: number; totalTime: number }
  > = new Map();

  constructor() {
    super();
    // Auto-register direct tools on initialization
    this.registerDirectTools();
  }

  /**
   * Register all direct tools from directAgentTools
   */
  private registerDirectTools(): void {
    registryLogger.debug("Auto-registering direct tools...");

    for (const [toolName, toolDef] of Object.entries(directAgentTools)) {
      const toolId = `direct.${toolName}`;
      const toolInfo: ToolInfo = {
        name: toolName,
        description: toolDef.description || `Direct tool: ${toolName}`,
        inputSchema: {},
        serverId: "direct",
        category: "built-in",
      };

      this.tools.set(toolId, toolInfo);
      this.toolImpls.set(toolId, {
        execute: async (params: unknown, context?: ExecutionContext) => {
          try {
            // Direct tools from AI SDK expect their specific parameter structure
            // Each tool validates its own parameters, so we safely pass them through
            const result = await (
              toolDef.execute as (
                params: unknown,
                ctx: unknown,
              ) => Promise<unknown>
            )(params, {
              toolCallId: context?.sessionId || "unknown",
              messages: [],
            });

            // Return the result wrapped in our standard format
            return {
              success: true,
              data: result,
              metadata: {
                toolName,
                serverId: "direct",
                executionTime: 0,
              },
            };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : String(error),
              metadata: {
                toolName,
                serverId: "direct",
                executionTime: 0,
              },
            };
          }
        },
        description: toolDef.description,
        inputSchema: {},
      });

      registryLogger.debug(`Registered direct tool: ${toolName} as ${toolId}`);
    }

    registryLogger.debug(
      `Auto-registered ${Object.keys(directAgentTools).length} direct tools`,
    );
  }

  /**
   * Register a server with its tools (updated signature)
   */
  async registerServer(
    serverOrId: string | ServerRegistration,
    serverConfig?: unknown,
    context?: ExecutionContext,
  ): Promise<void> {
    let serverId: string;
    let plugin: DiscoveredMcp;

    if (typeof serverOrId === "string") {
      // Original behavior: register by ID and config
      serverId = serverOrId;
      registryLogger.info(`Registering server by ID: ${serverId}`);

      plugin = {
        metadata: {
          name: serverId,
          description:
            typeof serverConfig === "object" && serverConfig
              ? (serverConfig as ServerRegistration).description ||
                "No description"
              : "No description",
        },
        tools:
          typeof serverConfig === "object" && serverConfig
            ? (serverConfig as ServerRegistration).tools
            : {},
        configuration:
          typeof serverConfig === "object" && serverConfig
            ? (serverConfig as Record<string, string | number | boolean>)
            : {},
      };
    } else {
      // New behavior: register server object
      const server = serverOrId;
      serverId = String(server.id || server.serverId || "unknown-server");
      registryLogger.info(`Registering server object: ${serverId}`);

      plugin = {
        metadata: {
          name: serverId,
          description: String(
            server.description || server.title || "No description",
          ),
          category: String(server.category || ""),
        },
        tools: server.tools || {},
        configuration:
          (server.configuration as Record<string, string | number | boolean>) ||
          {},
      };
    }

    // Call the parent register method
    this.register(plugin);

    // Extract tools from server info if available
    const tools = plugin.tools || {};
    registryLogger.debug(
      `Registering ${Object.keys(tools).length} tools for server ${serverId}:`,
      Object.keys(tools),
    );

    for (const [toolName, toolDef] of Object.entries(tools)) {
      const toolId = `${serverId}.${toolName}`;
      const toolInfo = {
        name: toolName,
        description: (toolDef as ToolImplementation)?.description,
        inputSchema: (toolDef as ToolImplementation)?.inputSchema as
          | Record<string, unknown>
          | undefined,
        outputSchema: (toolDef as ToolImplementation)?.outputSchema as
          | Record<string, unknown>
          | undefined,
        serverId,
        category: (toolDef as ToolImplementation)?.category || "general",
        permissions: (toolDef as ToolImplementation)?.permissions || [],
      };

      // Register only with fully-qualified toolId to avoid collisions
      this.tools.set(toolId, toolInfo);

      // Store the actual tool implementation for execution using toolId as key
      this.toolImpls.set(toolId, toolDef as ToolImplementation);

      registryLogger.debug(
        `Registered tool '${toolName}' with execute function:`,
        typeof (toolDef as ToolImplementation)?.execute,
      );
    }
  }

  /**
   * Execute a tool with enhanced context
   */
  async executeTool<T = unknown>(
    toolName: string,
    args?: unknown,
    context?: ExecutionContext,
  ): Promise<T> {
    const startTime = Date.now();

    try {
      registryLogger.info(`Executing tool: ${toolName}`);

      // Try to find the tool by fully-qualified name first
      let tool = this.tools.get(toolName);

      // If not found, search for tool by name across all entries (for backward compatibility)
      let toolId = toolName;
      if (!tool) {
        for (const [candidateToolId, toolInfo] of this.tools.entries()) {
          if (toolInfo.name === toolName) {
            tool = toolInfo;
            toolId = candidateToolId;
            break;
          }
        }
      }

      if (!tool) {
        throw new Error(`Tool '${toolName}' not found in registry`);
      }

      // Create execution context if not provided
      const execContext: ExecutionContext = {
        sessionId: context?.sessionId || randomUUID(),
        userId: context?.userId,
        ...context,
      };

      // Get the tool implementation using the resolved toolId
      const toolImpl = this.toolImpls.get(toolId);
      registryLogger.debug(
        `Looking for tool '${toolName}' (toolId: '${toolId}'), found: ${!!toolImpl}, type: ${typeof toolImpl?.execute}`,
      );
      registryLogger.debug(
        `Available tools:`,
        Array.from(this.toolImpls.keys()),
      );

      if (!toolImpl || typeof toolImpl?.execute !== "function") {
        throw new Error(
          `Tool '${toolName}' implementation not found or not executable`,
        );
      }

      // Execute the actual tool
      registryLogger.debug(`Executing tool '${toolName}' with args:`, args);
      const toolResult = await toolImpl.execute(args, execContext);

      // Add metadata to the tool result (don't double-wrap)
      const toolResultObj = toolResult as unknown as ToolResult;
      const result = {
        ...toolResultObj,
        usage: {
          ...(toolResultObj.usage || {}),
          executionTime: Date.now() - startTime,
        },
        metadata: {
          ...(toolResultObj.metadata || {}),
          toolName,
          serverId: tool.serverId,
          sessionId: execContext.sessionId,
          executionTime: Date.now() - startTime,
        },
      } as T;

      // Update statistics
      const duration = Date.now() - startTime;
      this.updateStats(toolName, duration);

      registryLogger.debug(
        `Tool '${toolName}' executed successfully in ${duration}ms`,
      );
      return result;
    } catch (error) {
      registryLogger.error(`Tool execution failed: ${toolName}`, error);

      // Return error in ToolResult format
      const errorResult = {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error),
        usage: {
          executionTime: Date.now() - startTime,
        },
        metadata: {
          toolName,
          sessionId: context?.sessionId,
        },
      } as T;

      return errorResult;
    }
  }

  /**
   * List all available tools (updated signature with filtering)
   */
  // Method overloads to support both interfaces
  async listTools(): Promise<ToolInfo[]>;
  async listTools(context: ExecutionContext): Promise<ToolInfo[]>;
  async listTools(filter: {
    category?: string;
    serverId?: string;
    serverCategory?: string;
    permissions?: string[];
    context?: ExecutionContext;
  }): Promise<ToolInfo[]>;
  async listTools(
    filterOrContext?:
      | {
          category?: string;
          serverId?: string;
          serverCategory?: string;
          permissions?: string[];
          context?: ExecutionContext;
        }
      | ExecutionContext,
  ): Promise<ToolInfo[]> {
    // FIXED: Return unique tools (avoid duplicates from dual registration)
    const uniqueTools = new Map<string, ToolInfo>();

    for (const tool of this.tools.values()) {
      const key = `${tool.serverId || "unknown"}.${tool.name}`;
      if (!uniqueTools.has(key)) {
        uniqueTools.set(key, tool);
      }
    }

    let result = Array.from(uniqueTools.values());

    // Determine if parameter is a filter object or just context
    let filter:
      | {
          category?: string;
          serverId?: string;
          serverCategory?: string;
          permissions?: string[];
          context?: ExecutionContext;
        }
      | undefined;

    if (filterOrContext) {
      // Check if it's a filter object (has filter-specific properties) or just context
      if ("sessionId" in filterOrContext || "userId" in filterOrContext) {
        // It's an ExecutionContext, treat as no filter
        filter = undefined;
      } else {
        // It's a filter object
        filter = filterOrContext as UnknownRecord;
      }
    }

    // Apply filters if provided
    if (filter) {
      if (filter.category) {
        result = result.filter((tool) => tool.category === filter.category);
      }

      if (filter.serverId) {
        result = result.filter((tool) => tool.serverId === filter.serverId);
      }

      if (filter.serverCategory) {
        result = result.filter((tool) => {
          const server = this.get(tool.serverId || "");
          return server?.metadata?.category === filter.serverCategory;
        });
      }

      if (filter.permissions && filter.permissions.length > 0) {
        result = result.filter((tool) => {
          const toolPermissions =
            (tool as ToolInfo & { permissions?: string[] }).permissions || [];
          return filter.permissions!.some((perm) =>
            toolPermissions.includes(perm),
          );
        });
      }
    }

    registryLogger.debug(
      `Listed ${result.length} unique tools (${filter ? "filtered" : "unfiltered"})`,
    );
    return result;
  }

  /**
   * Get tool information with server details
   */
  getToolInfo(
    toolName: string,
  ): { tool: ToolInfo; server: { id: string } } | undefined {
    // Try to find the tool by fully-qualified name first
    let tool = this.tools.get(toolName);

    // If not found, search for tool by name across all entries (for backward compatibility)
    if (!tool) {
      for (const toolInfo of this.tools.values()) {
        if (toolInfo.name === toolName) {
          tool = toolInfo;
          break;
        }
      }
    }
    if (!tool) {
      return undefined;
    }

    return {
      tool,
      server: {
        id: tool.serverId || "unknown-server",
      },
    };
  }

  /**
   * Update execution statistics
   */
  private updateStats(toolName: string, executionTime: number): void {
    const stats = this.toolExecutionStats.get(toolName) || {
      count: 0,
      totalTime: 0,
    };

    stats.count += 1;
    stats.totalTime += executionTime;

    this.toolExecutionStats.set(toolName, stats);
  }

  /**
   * Get execution statistics
   */
  getExecutionStats(): Record<
    string,
    { count: number; averageTime: number; totalTime: number }
  > {
    const result: Record<
      string,
      { count: number; averageTime: number; totalTime: number }
    > = {};

    for (const [toolName, stats] of this.toolExecutionStats.entries()) {
      result[toolName] = {
        count: stats.count,
        totalTime: stats.totalTime,
        averageTime: stats.totalTime / stats.count,
      };
    }

    return result;
  }

  /**
   * Clear execution statistics
   */
  clearStats(): void {
    this.toolExecutionStats.clear();
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: string): ToolInfo[] {
    // Return unique tools by fully-qualified toolId
    const uniqueTools = new Map<string, ToolInfo>();
    for (const [toolId, tool] of this.tools.entries()) {
      if (tool.category === category && !uniqueTools.has(toolId)) {
        uniqueTools.set(toolId, tool);
      }
    }
    return Array.from(uniqueTools.values());
  }

  /**
   * Check if tool exists
   */
  hasTool(toolName: string): boolean {
    // Check by fully-qualified name first, then fallback to any matching tool name
    if (this.tools.has(toolName)) {
      return true;
    }
    for (const tool of this.tools.values()) {
      if (tool.name === toolName) {
        return true;
      }
    }
    return false;
  }

  /**
   * Remove a tool
   */
  removeTool(toolName: string): boolean {
    // Remove by fully-qualified name first, then fallback to any matching tool name
    let removed = false;
    if (this.tools.has(toolName)) {
      this.tools.delete(toolName);
      this.toolExecutionStats.delete(toolName);
      registryLogger.info(`Removed tool: ${toolName}`);
      removed = true;
    } else {
      // Remove all tools with matching name
      for (const [toolId, tool] of Array.from(this.tools.entries())) {
        if (tool.name === toolName) {
          this.tools.delete(toolId);
          this.toolExecutionStats.delete(toolId);
          registryLogger.info(`Removed tool: ${toolId}`);
          removed = true;
        }
      }
    }
    return removed;
  }

  /**
   * Get tool count
   */
  getToolCount(): number {
    return this.tools.size;
  }

  /**
   * Get comprehensive statistics
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
    const servers = this.list(); // Get all registered servers
    const allTools = Array.from(this.tools.values());

    // Count servers by category
    const serversByCategory: Record<string, number> = {};
    for (const server of servers) {
      const category = server.metadata?.category || "uncategorized";
      serversByCategory[category] = (serversByCategory[category] || 0) + 1;
    }

    // Count tools by category
    const toolsByCategory: Record<string, number> = {};
    for (const tool of allTools) {
      const category = tool.category || "uncategorized";
      toolsByCategory[category] = (toolsByCategory[category] || 0) + 1;
    }

    return {
      totalServers: servers.length,
      totalTools: allTools.length,
      serversByCategory,
      toolsByCategory,
      executionStats: this.getExecutionStats(),
    };
  }

  /**
   * Unregister a server
   */
  unregisterServer(serverId: string): boolean {
    // Remove all tools for this server
    const removedTools: string[] = [];
    for (const [toolId, tool] of this.tools.entries()) {
      if (tool.serverId === serverId) {
        this.tools.delete(toolId);
        removedTools.push(toolId);
      }
    }

    // Remove from parent registry
    const removed = this.unregister(serverId);

    registryLogger.info(
      `Unregistered server ${serverId}, removed ${removedTools.length} tools`,
    );
    return removed;
  }
}

// Create default instance
export const toolRegistry = new MCPToolRegistry();
export const defaultToolRegistry = toolRegistry;

// Export ToolInfo for other modules
export type { ToolInfo } from "./contracts/mcpContract.js";
