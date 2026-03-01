/**
 * Tool Discovery Service
 * Automatically discovers and registers tools from external MCP servers
 * Handles tool validation, transformation, and lifecycle management
 */

import { EventEmitter } from "events";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { mcpLogger } from "../utils/logger.js";
import { globalCircuitBreakerManager } from "./mcpCircuitBreaker.js";
import type {
  ExternalMCPToolInfo,
  ExternalMCPToolResult,
} from "../types/externalMcp.js";
import type {
  MCPServerInfo,
  ToolDiscoveryResult,
  ExternalToolExecutionOptions,
  ToolValidationResult,
  ToolRegistryEvents,
} from "../types/mcpTypes.js";
import type { JsonObject, JsonValue } from "../types/common.js";
import { isObject, isNullish } from "../utils/typeUtils.js";
import {
  validateToolName,
  validateToolDescription,
} from "../utils/parameterValidation.js";
import { withTimeout } from "../utils/errorHandling.js";
import { SpanKind, SpanStatusCode } from "@opentelemetry/api";
import { tracers } from "../telemetry/tracers.js";

const mcpTracer = tracers.mcp;

/**
 * ToolDiscoveryService
 * Handles automatic tool discovery and registration from external MCP servers
 */
export class ToolDiscoveryService extends EventEmitter {
  private serverToolStorage = new Map<string, MCPServerInfo["tools"]>();
  private toolRegistry = new Map<string, ExternalMCPToolInfo>();
  private serverTools = new Map<string, Set<string>>();
  private discoveryInProgress = new Set<string>();

  constructor() {
    super();
  }

  /**
   * Discover tools from an external MCP server
   */
  async discoverTools(
    serverId: string,
    client: Client,
    timeout = 10000,
  ): Promise<ToolDiscoveryResult> {
    const startTime = Date.now();

    try {
      // Prevent concurrent discovery for same server
      if (this.discoveryInProgress.has(serverId)) {
        return {
          success: false,
          error: `Discovery already in progress for server: ${serverId}`,
          toolCount: 0,
          tools: [],
          duration: Date.now() - startTime,
          serverId,
        };
      }

      this.discoveryInProgress.add(serverId);

      mcpLogger.info(
        `[ToolDiscoveryService] Starting tool discovery for server: ${serverId}`,
      );

      // Create circuit breaker for tool discovery
      const circuitBreaker = globalCircuitBreakerManager.getBreaker(
        `tool-discovery-${serverId}`,
        {
          failureThreshold: 2,
          resetTimeout: 60000,
          operationTimeout: timeout,
        },
      );

      // Discover tools with circuit breaker protection
      const tools = await circuitBreaker.execute(async () => {
        return await this.performToolDiscovery(serverId, client, timeout);
      });

      // Register discovered tools
      const registeredTools = await this.registerDiscoveredTools(
        serverId,
        tools,
      );

      const result: ToolDiscoveryResult = {
        success: true,
        toolCount: registeredTools.length,
        tools: registeredTools,
        duration: Date.now() - startTime,
        serverId,
      };

      // Emit discovery completed event
      this.emit("discoveryCompleted", {
        serverId,
        toolCount: registeredTools.length,
        duration: result.duration,
        timestamp: new Date(),
      } satisfies ToolRegistryEvents["discoveryCompleted"]);

      mcpLogger.info(
        `[ToolDiscoveryService] Discovery completed for ${serverId}: ${registeredTools.length} tools`,
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      mcpLogger.error(
        `[ToolDiscoveryService] Discovery failed for ${serverId}:`,
        error,
      );

      // Emit discovery failed event
      this.emit("discoveryFailed", {
        serverId,
        error: errorMessage,
        timestamp: new Date(),
      } satisfies ToolRegistryEvents["discoveryFailed"]);

      return {
        success: false,
        error: errorMessage,
        toolCount: 0,
        tools: [],
        duration: Date.now() - startTime,
        serverId,
      };
    } finally {
      this.discoveryInProgress.delete(serverId);
    }
  }

  /**
   * Perform the actual tool discovery
   */
  private async performToolDiscovery(
    serverId: string,
    client: Client,
    timeout: number,
  ): Promise<Tool[]> {
    // List tools from the MCP server
    const listToolsPromise = client.listTools();
    const timeoutPromise = this.createTimeoutPromise<never>(
      timeout,
      "Tool discovery timeout",
    );

    const result = await Promise.race([listToolsPromise, timeoutPromise]);

    if (!result || !result.tools) {
      throw new Error("No tools returned from server");
    }

    mcpLogger.debug(
      `[ToolDiscoveryService] Discovered ${result.tools.length} tools from ${serverId}`,
    );

    return result.tools;
  }

  /**
   * Register discovered tools
   */
  private async registerDiscoveredTools(
    serverId: string,
    tools: Tool[],
  ): Promise<ExternalMCPToolInfo[]> {
    const registeredTools: ExternalMCPToolInfo[] = [];

    // Clear existing tools for this server
    this.clearServerTools(serverId);

    for (const tool of tools) {
      try {
        const toolInfo = await this.createToolInfo(serverId, tool);
        const validation = this.validateTool(toolInfo);

        if (!validation.isValid) {
          mcpLogger.warn(
            `[ToolDiscoveryService] Skipping invalid tool ${tool.name} from ${serverId}:`,
            validation.errors,
          );
          continue;
        }

        // Apply validation metadata
        if (validation.metadata) {
          toolInfo.metadata = {
            ...toolInfo.metadata,
            ...validation.metadata,
          };
        }

        // Register the tool
        const toolKey = this.createToolKey(serverId, tool.name);
        this.toolRegistry.set(toolKey, toolInfo);

        if (!this.serverToolStorage.has(serverId)) {
          this.serverToolStorage.set(serverId, []);
        }
        const serverTools = this.serverToolStorage.get(serverId);
        if (!serverTools) {
          throw new Error(`Server tools storage not found for ${serverId}`);
        }
        // Add tool if not already present
        if (!serverTools.find((t) => t.name === tool.name)) {
          serverTools.push({
            name: tool.name,
            description: tool.description || "",
            inputSchema: tool.inputSchema,
          });
        }

        // Track server tools (legacy)
        if (!this.serverTools.has(serverId)) {
          this.serverTools.set(serverId, new Set());
        }
        const serverToolSet = this.serverTools.get(serverId);
        if (serverToolSet) {
          serverToolSet.add(tool.name);
        }

        registeredTools.push(toolInfo);

        // Emit tool registered event
        this.emit("toolRegistered", {
          serverId,
          toolName: tool.name,
          toolInfo,
          timestamp: new Date(),
        } satisfies ToolRegistryEvents["toolRegistered"]);

        mcpLogger.debug(
          `[ToolDiscoveryService] Registered tool: ${tool.name} from ${serverId}`,
        );
      } catch (error) {
        mcpLogger.error(
          `[ToolDiscoveryService] Failed to register tool ${tool.name} from ${serverId}:`,
          error,
        );
      }
    }

    return registeredTools;
  }

  /**
   * Create tool info from MCP tool definition
   */
  private async createToolInfo(
    serverId: string,
    tool: Tool,
  ): Promise<ExternalMCPToolInfo> {
    return {
      name: tool.name,
      description: tool.description || "No description provided",
      serverId,
      inputSchema: tool.inputSchema as JsonObject,
      isAvailable: true,
      stats: {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        averageExecutionTime: 0,
        lastExecutionTime: 0,
      },
      metadata: {
        category: this.inferToolCategory(tool),
        version: "1.0.0",
        deprecated: false,
      },
    };
  }

  /**
   * Infer tool category from tool definition
   */
  private inferToolCategory(tool: Tool): string {
    const name = tool.name.toLowerCase();
    const description = (tool.description || "").toLowerCase();

    // Common patterns for categorization
    if (name.includes("git") || description.includes("git")) {
      return "version-control";
    }
    if (
      name.includes("file") ||
      name.includes("read") ||
      name.includes("write")
    ) {
      return "file-system";
    }
    if (
      name.includes("api") ||
      name.includes("http") ||
      name.includes("request")
    ) {
      return "api";
    }
    if (
      name.includes("data") ||
      name.includes("query") ||
      name.includes("search")
    ) {
      return "data";
    }
    if (
      name.includes("auth") ||
      name.includes("login") ||
      name.includes("token")
    ) {
      return "authentication";
    }
    if (
      name.includes("deploy") ||
      name.includes("build") ||
      name.includes("ci")
    ) {
      return "deployment";
    }

    return "general";
  }

  /**
   * Validate a tool
   */
  private validateTool(toolInfo: ExternalMCPToolInfo): ToolValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Use centralized validation for name
    const nameError = validateToolName(toolInfo.name);
    if (nameError) {
      errors.push(nameError.message);
    }

    // Use centralized validation for description
    const descriptionError = validateToolDescription(toolInfo.description);
    if (descriptionError) {
      warnings.push(descriptionError.message);
    }

    if (!toolInfo.serverId) {
      errors.push("Server ID is required");
    }

    // Schema validation
    if (toolInfo.inputSchema) {
      try {
        JSON.stringify(toolInfo.inputSchema);
      } catch {
        errors.push("Input schema is not valid JSON");
      }
    }

    // Infer metadata
    const metadata: ToolValidationResult["metadata"] = {
      category:
        typeof toolInfo.metadata?.category === "string"
          ? toolInfo.metadata.category
          : "general",
      complexity: this.inferComplexity(toolInfo),
      requiresAuth: this.inferAuthRequirement(toolInfo),
      isDeprecated:
        typeof toolInfo.metadata?.deprecated === "boolean"
          ? toolInfo.metadata.deprecated
          : false,
    };

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata,
    };
  }

  /**
   * Infer tool complexity
   */
  private inferComplexity(
    toolInfo: ExternalMCPToolInfo,
  ): "simple" | "moderate" | "complex" {
    const schema = toolInfo.inputSchema;

    if (!schema || !schema.properties) {
      return "simple";
    }

    const propertyCount = Object.keys(schema.properties).length;

    if (propertyCount <= 2) {
      return "simple";
    } else if (propertyCount <= 5) {
      return "moderate";
    } else {
      return "complex";
    }
  }

  /**
   * Infer if tool requires authentication
   */
  private inferAuthRequirement(toolInfo: ExternalMCPToolInfo): boolean {
    const name = toolInfo.name.toLowerCase();
    const description = toolInfo.description.toLowerCase();

    return (
      name.includes("auth") ||
      name.includes("login") ||
      name.includes("token") ||
      description.includes("authentication") ||
      description.includes("credentials") ||
      description.includes("permission")
    );
  }

  /**
   * Execute a tool
   */
  async executeTool(
    toolName: string,
    serverId: string,
    client: Client,
    parameters: JsonObject,
    options: ExternalToolExecutionOptions = {},
  ): Promise<ExternalMCPToolResult> {
    const startTime = Date.now();

    try {
      const toolKey = this.createToolKey(serverId, toolName);
      const toolInfo = this.toolRegistry.get(toolKey);

      if (!toolInfo) {
        throw new Error(
          `Tool '${toolName}' not found for server '${serverId}'`,
        );
      }

      if (!toolInfo.isAvailable) {
        throw new Error(`Tool '${toolName}' is not available`);
      }

      // Validate input parameters if requested
      if (options.validateInput !== false) {
        this.validateToolParameters(toolInfo, parameters);
      }

      mcpLogger.debug(
        `[ToolDiscoveryService] Executing tool: ${toolName} on ${serverId}`,
        {
          parameters,
        },
      );

      // Create circuit breaker for tool execution
      const circuitBreaker = globalCircuitBreakerManager.getBreaker(
        `tool-execution-${serverId}-${toolName}`,
        {
          failureThreshold: 3,
          resetTimeout: 30000,
          operationTimeout: options.timeout || 30000,
        },
      );

      // Execute tool with circuit breaker protection
      const result = await circuitBreaker.execute(async () => {
        return mcpTracer.startActiveSpan(
          "neurolink.mcp.callTool",
          {
            kind: SpanKind.CLIENT,
            attributes: {
              "mcp.server_id": serverId,
              "mcp.tool_name": toolName,
              "mcp.timeout_ms": options.timeout || 30000,
            },
          },
          async (callSpan) => {
            try {
              const timeout = options.timeout || 30000;
              const callResult = await withTimeout(
                client.callTool({
                  name: toolName,
                  arguments: parameters,
                }),
                timeout,
                new Error(`Tool execution timeout: ${toolName}`),
              );
              callSpan.setStatus({ code: SpanStatusCode.OK });
              return callResult;
            } catch (err) {
              callSpan.setStatus({
                code: SpanStatusCode.ERROR,
                message: (err as Error).message,
              });
              callSpan.recordException(err as Error);
              throw err;
            } finally {
              callSpan.end();
            }
          },
        );
      });

      const duration = Date.now() - startTime;

      // Update tool statistics
      this.updateToolStats(toolKey, true, duration);

      // Validate output if requested
      if (options.validateOutput !== false) {
        this.validateToolOutput(result);
      }

      mcpLogger.debug(
        `[ToolDiscoveryService] Tool execution completed: ${toolName}`,
        {
          duration,
          hasContent: !!result.content,
        },
      );

      return {
        success: true,
        data: result,
        duration,
        metadata: {
          toolName,
          serverId,
          timestamp: Date.now(),
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Update tool statistics
      const toolKey = this.createToolKey(serverId, toolName);
      this.updateToolStats(toolKey, false, duration);

      mcpLogger.error(
        `[ToolDiscoveryService] Tool execution failed: ${toolName}`,
        error,
      );

      return {
        success: false,
        error: errorMessage,
        duration,
        metadata: {
          toolName,
          serverId,
          timestamp: Date.now(),
        },
      };
    }
  }

  /**
   * Validate tool parameters
   */
  private validateToolParameters(
    toolInfo: ExternalMCPToolInfo,
    parameters: JsonObject,
  ): void {
    if (!toolInfo.inputSchema) {
      return; // No schema to validate against
    }

    // Basic validation - check required properties
    const schema = toolInfo.inputSchema;
    if (schema.required && Array.isArray(schema.required)) {
      for (const requiredProp of schema.required) {
        if (typeof requiredProp === "string" && !(requiredProp in parameters)) {
          throw new Error(`Missing required parameter: ${requiredProp}`);
        }
      }
    }

    // Type validation for properties
    if (schema.properties) {
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        if (propName in parameters) {
          this.validateParameterType(
            propName,
            parameters[propName],
            propSchema as JsonObject,
          );
        }
      }
    }
  }

  /**
   * Validate parameter type
   */
  private validateParameterType(
    name: string,
    value: JsonValue,
    schema: JsonObject,
  ): void {
    if (!schema.type) {
      return; // No type constraint
    }

    const expectedType = schema.type as string;
    const actualType = typeof value;

    switch (expectedType) {
      case "string":
        if (actualType !== "string") {
          throw new Error(
            `Parameter '${name}' must be a string, got ${actualType}`,
          );
        }
        break;
      case "number":
        if (actualType !== "number") {
          throw new Error(
            `Parameter '${name}' must be a number, got ${actualType}`,
          );
        }
        break;
      case "boolean":
        if (actualType !== "boolean") {
          throw new Error(
            `Parameter '${name}' must be a boolean, got ${actualType}`,
          );
        }
        break;
      case "array":
        if (!Array.isArray(value)) {
          throw new Error(
            `Parameter '${name}' must be an array, got ${actualType}`,
          );
        }
        break;
      case "object":
        if (actualType !== "object" || value === null || Array.isArray(value)) {
          throw new Error(
            `Parameter '${name}' must be an object, got ${actualType}`,
          );
        }
        break;
    }
  }

  /**
   * Validate tool output with enhanced type safety
   */
  private validateToolOutput(result: unknown): void {
    // GENERIC ERROR HANDLING FOR ALL MCP TOOLS
    // Different MCP servers return different error formats, so we should be permissive
    // and let the AI handle any response format instead of throwing errors

    // Only throw for truly invalid responses (null/undefined)
    if (isNullish(result)) {
      mcpLogger.debug(
        "[ToolDiscoveryService] Tool returned null/undefined, treating as empty response",
      );
      // Even null responses can be valid for some tools - don't throw
      return;
    }

    // Log what we received for debugging, but don't validate specific formats
    mcpLogger.debug("[ToolDiscoveryService] Tool response received", {
      type: typeof result,
      isArray: Array.isArray(result),
      isObject: isObject(result),
      hasKeys: isObject(result) ? Object.keys(result as object).length : 0,
      fullResponse: result, // Log the complete response, not a truncated sample
    });

    // COMPLETELY PERMISSIVE APPROACH:
    // - Any response format is valid (objects, strings, arrays, booleans, numbers)
    // - Even error responses are passed to the AI to handle
    // - The AI can interpret error messages and retry with different approaches
    // - This works with any MCP server regardless of their response format

    // No validation or throwing - let the AI handle everything
    return;
  }

  /**
   * Update tool statistics
   */
  private updateToolStats(
    toolKey: string,
    success: boolean,
    duration: number,
  ): void {
    const toolInfo = this.toolRegistry.get(toolKey);
    if (!toolInfo) {
      return;
    }

    toolInfo.stats.totalCalls++;
    toolInfo.lastCalled = new Date();
    toolInfo.stats.lastExecutionTime = duration;

    if (success) {
      toolInfo.stats.successfulCalls++;
    } else {
      toolInfo.stats.failedCalls++;
    }

    // Update average execution time
    const totalTime =
      toolInfo.stats.averageExecutionTime * (toolInfo.stats.totalCalls - 1) +
      duration;
    toolInfo.stats.averageExecutionTime = totalTime / toolInfo.stats.totalCalls;
  }

  /**
   * Get tool by name and server
   */
  getTool(toolName: string, serverId: string): ExternalMCPToolInfo | undefined {
    const toolKey = this.createToolKey(serverId, toolName);
    return this.toolRegistry.get(toolKey);
  }

  /**
   * Get all tools for a server
   */
  getServerTools(serverId: string): ExternalMCPToolInfo[] {
    const serverTools = this.serverToolStorage.get(serverId);
    if (serverTools) {
      return serverTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        serverId,
        inputSchema: tool.inputSchema as JsonObject,
        isAvailable: true,
        stats: {
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          averageExecutionTime: 0,
          lastExecutionTime: 0,
        },
      }));
    }

    // Fallback to legacy storage
    const tools: ExternalMCPToolInfo[] = [];
    const serverToolNames = this.serverTools.get(serverId);

    if (serverToolNames) {
      for (const toolName of serverToolNames) {
        const toolKey = this.createToolKey(serverId, toolName);
        const toolInfo = this.toolRegistry.get(toolKey);
        if (toolInfo) {
          tools.push(toolInfo);
        }
      }
    }

    return tools;
  }

  /**
   * Get all registered tools
   */
  getAllTools(): ExternalMCPToolInfo[] {
    const allTools: ExternalMCPToolInfo[] = [];

    // Add tools from server-based storage (preferred)
    for (const [serverId, serverTools] of this.serverToolStorage.entries()) {
      for (const tool of serverTools) {
        allTools.push({
          name: tool.name,
          description: tool.description,
          serverId,
          inputSchema: tool.inputSchema as JsonObject,
          isAvailable: true,
          stats: {
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            averageExecutionTime: 0,
            lastExecutionTime: 0,
          },
        });
      }
    }

    // Fallback to legacy storage for any tools not in server-based storage
    const legacyTools = Array.from(this.toolRegistry.values()).filter(
      (tool) =>
        !allTools.some(
          (t) => t.name === tool.name && t.serverId === tool.serverId,
        ),
    );

    return [...allTools, ...legacyTools];
  }

  /**
   * Clear tools for a server
   */
  clearServerTools(serverId: string): void {
    const serverTools = this.serverToolStorage.get(serverId);
    if (serverTools) {
      // Emit unregistered events for server-based tools
      for (const tool of serverTools) {
        this.emit("toolUnregistered", {
          serverId,
          toolName: tool.name,
          timestamp: new Date(),
        } satisfies ToolRegistryEvents["toolUnregistered"]);
      }
      this.serverToolStorage.delete(serverId);
    }

    // Legacy cleanup
    const serverToolNames = this.serverTools.get(serverId);
    if (serverToolNames) {
      for (const toolName of serverToolNames) {
        const toolKey = this.createToolKey(serverId, toolName);
        this.toolRegistry.delete(toolKey);

        // Emit tool unregistered event (only if not already emitted above)
        if (!serverTools || !serverTools.find((t) => t.name === toolName)) {
          this.emit("toolUnregistered", {
            serverId,
            toolName,
            timestamp: new Date(),
          } satisfies ToolRegistryEvents["toolUnregistered"]);
        }
      }

      this.serverTools.delete(serverId);
    }

    mcpLogger.debug(
      `[ToolDiscoveryService] Cleared tools for server: ${serverId}`,
    );
  }

  /**
   * Update tool availability
   */
  updateToolAvailability(
    toolName: string,
    serverId: string,
    isAvailable: boolean,
  ): void {
    const toolKey = this.createToolKey(serverId, toolName);
    const toolInfo = this.toolRegistry.get(toolKey);

    if (toolInfo) {
      toolInfo.isAvailable = isAvailable;
      mcpLogger.debug(
        `[ToolDiscoveryService] Updated availability for ${toolName}: ${isAvailable}`,
      );
    }
  }

  /**
   * Create tool key for registry
   */
  private createToolKey(serverId: string, toolName: string): string {
    return `${serverId}:${toolName}`;
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise<T>(
    timeout: number,
    message: string,
  ): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(message));
      }, timeout);
    });
  }

  /**
   * Destroy the tool discovery service and clean up all resources
   * This method should be called when the service is no longer needed
   * to prevent memory leaks from accumulated event listeners
   *
   * @example
   * ```typescript
   * const service = new ToolDiscoveryService();
   * // ... use the service ...
   * service.destroy(); // Clean up when done
   * ```
   */
  destroy(): void {
    mcpLogger.debug("[ToolDiscoveryService] Starting cleanup...");

    // Clear all event listeners to prevent memory leaks
    this.removeAllListeners();

    // Clear all internal data structures
    this.serverToolStorage.clear();
    this.toolRegistry.clear();
    this.serverTools.clear();
    this.discoveryInProgress.clear();

    mcpLogger.debug("[ToolDiscoveryService] Destroyed and cleaned up");
  }

  /**
   * Reset statistics for all tools
   * This clears execution counts, timing data, and other statistics
   * while preserving the tool registrations themselves
   */
  resetStatistics(): void {
    for (const toolInfo of this.toolRegistry.values()) {
      toolInfo.stats = {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        averageExecutionTime: 0,
        lastExecutionTime: 0,
      };
      toolInfo.lastCalled = undefined;
    }
    mcpLogger.debug("[ToolDiscoveryService] Statistics reset for all tools");
  }

  /**
   * Get the count of active event listeners
   * Useful for monitoring potential memory leaks
   */
  getListenerCount(): number {
    const events = [
      "discoveryCompleted",
      "discoveryFailed",
      "toolRegistered",
      "toolUnregistered",
    ];
    let total = 0;
    for (const event of events) {
      total += this.listenerCount(event);
    }
    return total;
  }

  /**
   * Get discovery statistics
   */
  getStatistics(): {
    totalTools: number;
    availableTools: number;
    unavailableTools: number;
    totalServers: number;
    toolsByServer: Record<string, number>;
    toolsByCategory: Record<string, number>;
  } {
    const toolsByServer: Record<string, number> = {};
    const toolsByCategory: Record<string, number> = {};
    let availableTools = 0;
    let unavailableTools = 0;

    for (const toolInfo of this.toolRegistry.values()) {
      // Count by server
      toolsByServer[toolInfo.serverId] =
        (toolsByServer[toolInfo.serverId] || 0) + 1;

      // Count by category
      const category =
        typeof toolInfo.metadata?.category === "string"
          ? toolInfo.metadata.category
          : "unknown";
      toolsByCategory[category] = (toolsByCategory[category] || 0) + 1;

      // Count availability
      if (toolInfo.isAvailable) {
        availableTools++;
      } else {
        unavailableTools++;
      }
    }

    return {
      totalTools: this.toolRegistry.size,
      availableTools,
      unavailableTools,
      totalServers: this.serverTools.size,
      toolsByServer,
      toolsByCategory,
    };
  }
}
