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
import type { UnknownRecord, JsonValue } from "../types/common.js";
import type { ZodUnknownSchema } from "../types/typeAliases.js";
import type { MCPServerInfo, MCPServerCategory } from "../types/mcpTypes.js";
import { MCPRegistry } from "./registry.js";
import { registryLogger } from "../utils/logger.js";
import { randomUUID } from "crypto";
import { shouldDisableBuiltinTools } from "../utils/toolUtils.js";
import { directAgentTools } from "../agent/directTools.js";
import { detectCategory, createMCPServerInfo } from "../utils/mcpDefaults.js";

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
  private builtInServerInfos: MCPServerInfo[] = []; // DIRECT storage for MCPServerInfo

  constructor() {
    super();
    // 🔧 CONDITIONAL: Only auto-register direct tools if not disabled via configuration
    if (!shouldDisableBuiltinTools()) {
      this.registerDirectTools();
    } else {
      registryLogger.debug("Built-in direct tools disabled via configuration");
    }
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
        category: detectCategory({ isBuiltIn: true, serverId: "direct" }),
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
   * Register a server with its tools - ONLY accepts MCPServerInfo (zero conversions)
   */
  async registerServer(
    serverInfo: MCPServerInfo,
    context?: ExecutionContext,
  ): Promise<void>;
  async registerServer(
    serverId: string,
    serverConfig?: unknown,
    context?: ExecutionContext,
  ): Promise<void>;
  async registerServer(
    serverInfoOrId: MCPServerInfo | string,
    serverConfigOrContext?: unknown | ExecutionContext,
    context?: ExecutionContext,
  ): Promise<void> {
    // Handle both signatures for backward compatibility
    let serverInfo: MCPServerInfo;
    let finalContext: ExecutionContext | undefined;

    if (typeof serverInfoOrId === "string") {
      // Legacy signature: registerServer(serverId, serverConfig, context)
      const serverId = serverInfoOrId;
      finalContext = context;

      // Convert legacy call to MCPServerInfo format using smart defaults
      serverInfo = createMCPServerInfo({
        id: serverId,
        name: serverId,
        tools: [],
        isExternal: true,
      });
    } else {
      // New signature: registerServer(serverInfo, context)
      serverInfo = serverInfoOrId;
      finalContext = serverConfigOrContext as ExecutionContext | undefined;
    }
    const serverId = serverInfo.id;
    registryLogger.info(`Registering MCPServerInfo directly: ${serverId}`);

    // Use MCPServerInfo.tools array directly - ZERO conversions!
    const toolsObject: Record<string, ToolImplementation> = {};
    for (const tool of serverInfo.tools) {
      toolsObject[tool.name] = {
        execute:
          tool.execute ||
          (async () => {
            throw new Error(`Tool ${tool.name} has no execute function`);
          }),
        description: tool.description,
        inputSchema: tool.inputSchema,
        category: detectCategory({
          existingCategory: serverInfo.metadata?.category,
          serverId: serverInfo.id,
        }),
      };
    }

    const plugin: DiscoveredMcp = {
      metadata: {
        name: serverInfo.name,
        description: serverInfo.description,
        category: detectCategory({
          existingCategory: serverInfo.metadata?.category,
          serverId: serverInfo.id,
        }),
      },
      tools: toolsObject,
      configuration: {},
    };

    // Call the parent register method
    this.register(plugin);

    // Use MCPServerInfo.tools array directly - ZERO conversions!
    const tools = serverInfo.tools;
    registryLogger.debug(
      `Registering ${tools.length} tools for server ${serverId}:`,
      tools.map((t) => t.name),
    );

    for (const tool of tools) {
      // For custom tools, use just the tool name to avoid redundant serverId.toolName format
      // For other tools, use fully-qualified serverId.toolName to avoid collisions
      const isCustomTool = serverId.startsWith("custom-tool-");
      const toolId = isCustomTool ? tool.name : `${serverId}.${tool.name}`;
      const toolInfo = {
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema as Record<string, unknown> | undefined,
        outputSchema: undefined, // MCPServerInfo.tools doesn't have outputSchema
        serverId,
        category: detectCategory({
          existingCategory: serverInfo.metadata?.category,
          serverId: serverInfo.id,
        }),
        permissions: [], // MCPServerInfo.tools doesn't have permissions
      };

      // Register only with fully-qualified toolId to avoid collisions
      this.tools.set(toolId, toolInfo);

      // Store the actual tool implementation for execution using toolId as key
      this.toolImpls.set(toolId, {
        execute:
          tool.execute ||
          (async () => {
            throw new Error(`Tool ${tool.name} has no execute function`);
          }),
        description: tool.description,
        inputSchema: tool.inputSchema,
        category: detectCategory({
          existingCategory: serverInfo.metadata?.category,
          serverId: serverInfo.id,
        }),
      });

      registryLogger.debug(
        `Registered tool '${tool.name}' with execute function:`,
        typeof tool.execute,
      );
    }

    // Store MCPServerInfo directly - NO recreation needed!
    if (tools.length > 0) {
      const category = detectCategory({
        existingCategory: serverInfo.metadata?.category,
        serverId: serverInfo.id,
      });

      // Only store in builtInServerInfos if it's a real in-memory MCP server
      // Do NOT create fake servers for built-in direct tools
      if (category === "in-memory") {
        // Use the original MCPServerInfo directly - ZERO conversions!
        this.builtInServerInfos.push(serverInfo);

        registryLogger.debug(
          `Added ${category} server to builtInServerInfos: ${serverId} with ${tools.length} tools`,
        );
      }
    }
  }

  /**
   * Execute a tool with enhanced context and automatic result wrapping
   *
   * This method handles both raw return values and ToolResult objects:
   * - Raw values (primitives, objects) are automatically wrapped in ToolResult format
   * - Existing ToolResult objects are enhanced with execution metadata
   * - All results include execution timing and context information
   *
   * @param toolName - Name of the tool to execute
   * @param args - Parameters to pass to the tool execution function
   * @param context - Execution context with session, user, and environment info
   * @returns Promise resolving to ToolResult object with data, metadata, and usage info
   * @throws Error if tool is not found or execution fails
   *
   * @example
   * ```typescript
   * // Tool that returns raw value
   * const result = await toolRegistry.executeTool("calculator", { a: 5, b: 3, op: "add" });
   * // result.data === 8, result.metadata contains execution info
   *
   * // Tool that returns ToolResult
   * const result = await toolRegistry.executeTool("complexTool", { input: "test" });
   * // result is enhanced ToolResult with additional metadata
   * ```
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

      // Properly wrap raw results in ToolResult format
      let result: ToolResult;

      // Check if result is already a ToolResult object
      if (
        toolResult &&
        typeof toolResult === "object" &&
        "success" in toolResult &&
        typeof (toolResult as ToolResult).success === "boolean"
      ) {
        // Result is already a ToolResult, enhance with metadata
        const toolResultObj = toolResult as ToolResult;
        result = {
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
        };
      } else {
        // Result is a raw value, wrap it in ToolResult format
        result = {
          success: true,
          data: toolResult,
          usage: {
            executionTime: Date.now() - startTime,
          },
          metadata: {
            toolName,
            serverId: tool.serverId,
            sessionId: execContext.sessionId,
            executionTime: Date.now() - startTime,
          },
        };
      }

      // Update statistics
      const duration = Date.now() - startTime;
      this.updateStats(toolName, duration);

      registryLogger.debug(
        `Tool '${toolName}' executed successfully in ${duration}ms`,
      );
      return result as T;
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
   * Get built-in servers
   * @returns Array of MCPServerInfo for built-in tools
   */
  getBuiltInServerInfos(): MCPServerInfo[] {
    return this.builtInServerInfos;
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
    // Check by fully-qualified name first, then fallback to first matching tool name
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
   * Register a tool with implementation directly
   * This is used for external MCP server tools
   */
  registerTool(
    toolId: string,
    toolInfo: ToolInfo,
    toolImpl: ToolImplementation,
  ): void {
    registryLogger.debug(`Registering tool: ${toolId}`);

    // Import validation functions synchronously - they are pure functions
    let validateTool: (name: string, tool: unknown) => void;
    let isToolNameAvailable: (name: string) => boolean;
    let suggestToolNames: (name: string) => string[];

    try {
      // Try ES module import first
      const toolRegistrationModule = require("../sdk/toolRegistration.js");
      ({ validateTool, isToolNameAvailable, suggestToolNames } =
        toolRegistrationModule);
    } catch (error) {
      // Fallback: skip validation if import fails (graceful degradation)
      registryLogger.warn(
        "Tool validation module not available, skipping advanced validation",
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      // Create minimal validation functions
      validateTool = () => {}; // No-op
      isToolNameAvailable = () => true; // Allow all names
      suggestToolNames = () => ["alternative_tool"];
    }

    // Check if tool name is available (not reserved)
    if (!isToolNameAvailable(toolId)) {
      const suggestions = suggestToolNames(toolId);
      registryLogger.error(
        `Tool registration failed for ${toolId}: Name not available`,
      );
      throw new Error(
        `Tool name '${toolId}' is not available (reserved or invalid format). ` +
          `Suggested alternatives: ${suggestions.slice(0, 3).join(", ")}`,
      );
    }

    // Create a simplified tool object for validation
    const toolForValidation = {
      description: toolInfo.description || "",
      execute: async () => "" as JsonValue,
      parameters: undefined as ZodUnknownSchema | undefined,
      metadata: {
        category: toolInfo.category,
        serverId: toolInfo.serverId,
      },
    };

    // Use comprehensive validation logic
    try {
      validateTool(toolId, toolForValidation);
    } catch (error) {
      registryLogger.error(
        `Tool registration failed for ${toolId}:`,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }

    this.tools.set(toolId, toolInfo);
    this.toolImpls.set(toolId, toolImpl);

    registryLogger.debug(`Successfully registered tool: ${toolId}`);
  }

  /**
   * Remove a tool
   */
  removeTool(toolName: string): boolean {
    // Remove by fully-qualified name first, then fallback to first matching tool name
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
      const category =
        server.metadata?.category || ("uncategorized" as MCPServerCategory);
      serversByCategory[category] = (serversByCategory[category] || 0) + 1;
    }

    // Count tools by category
    const toolsByCategory: Record<string, number> = {};
    for (const tool of allTools) {
      const category = tool.category || ("uncategorized" as MCPServerCategory);
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

    // Remove from builtInServerInfos storage
    const originalLength = this.builtInServerInfos.length;
    this.builtInServerInfos = this.builtInServerInfos.filter(
      (server) => server.id !== serverId,
    );
    const removedFromBuiltIn = originalLength > this.builtInServerInfos.length;

    // Remove from parent registry
    const removed = this.unregister(serverId);

    registryLogger.info(
      `Unregistered server ${serverId}, removed ${removedTools.length} tools${
        removedFromBuiltIn ? " and server from builtInServerInfos" : ""
      }`,
    );
    return removed;
  }
}

// Create default instance
export const toolRegistry = new MCPToolRegistry();
export const defaultToolRegistry = toolRegistry;

// Export ToolInfo for other modules
export type { ToolInfo } from "./contracts/mcpContract.js";
