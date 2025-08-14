/**
 * Tool Discovery Service
 * Automatically discovers and registers tools from external MCP servers
 * Handles tool validation, transformation, and lifecycle management
 */

import { EventEmitter } from "events";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { mcpLogger } from "../utils/logger.js";
import {
  MCPCircuitBreaker,
  globalCircuitBreakerManager,
} from "./mcpCircuitBreaker.js";
import type {
  ExternalMCPServerInstance,
  ExternalMCPToolInfo,
  ExternalMCPServerEvents,
  ExternalMCPToolResult,
  ExternalMCPToolContext,
} from "../types/externalMcp.js";
import type { JsonObject, JsonValue } from "../types/common.js";

/**
 * Tool discovery result
 */
export interface ToolDiscoveryResult {
  /** Whether discovery was successful */
  success: boolean;

  /** Number of tools discovered */
  toolCount: number;

  /** Discovered tools */
  tools: ExternalMCPToolInfo[];

  /** Error message if failed */
  error?: string;

  /** Discovery duration in milliseconds */
  duration: number;

  /** Server ID */
  serverId: string;
}

/**
 * Tool execution options
 */
export interface ToolExecutionOptions {
  /** Execution timeout in milliseconds */
  timeout?: number;

  /** Additional context for execution */
  context?: Partial<ExternalMCPToolContext>;

  /** Whether to validate input parameters */
  validateInput?: boolean;

  /** Whether to validate output */
  validateOutput?: boolean;
}

/**
 * Tool validation result
 */
export interface ToolValidationResult {
  /** Whether the tool is valid */
  isValid: boolean;

  /** Validation errors */
  errors: string[];

  /** Validation warnings */
  warnings: string[];

  /** Tool metadata */
  metadata?: {
    category?: string;
    complexity?: "simple" | "moderate" | "complex";
    requiresAuth?: boolean;
    isDeprecated?: boolean;
  };
}

/**
 * Tool registry events
 */
export interface ToolRegistryEvents {
  toolRegistered: {
    serverId: string;
    toolName: string;
    toolInfo: ExternalMCPToolInfo;
    timestamp: Date;
  };

  toolUnregistered: {
    serverId: string;
    toolName: string;
    timestamp: Date;
  };

  toolUpdated: {
    serverId: string;
    toolName: string;
    oldInfo: ExternalMCPToolInfo;
    newInfo: ExternalMCPToolInfo;
    timestamp: Date;
  };

  discoveryCompleted: {
    serverId: string;
    toolCount: number;
    duration: number;
    timestamp: Date;
  };

  discoveryFailed: {
    serverId: string;
    error: string;
    timestamp: Date;
  };
}

/**
 * ToolDiscoveryService
 * Handles automatic tool discovery and registration from external MCP servers
 */
export class ToolDiscoveryService extends EventEmitter {
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

        // Track server tools
        if (!this.serverTools.has(serverId)) {
          this.serverTools.set(serverId, new Set());
        }
        this.serverTools.get(serverId)!.add(tool.name);

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

    // Basic validation
    if (!toolInfo.name || toolInfo.name.trim().length === 0) {
      errors.push("Tool name is required");
    }

    if (toolInfo.name && !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(toolInfo.name)) {
      errors.push(
        "Tool name must start with a letter and contain only letters, numbers, underscores, and hyphens",
      );
    }

    if (!toolInfo.description || toolInfo.description.trim().length === 0) {
      warnings.push("Tool description is empty");
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
    options: ToolExecutionOptions = {},
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
        const timeout = options.timeout || 30000;
        const executePromise = client.callTool({
          name: toolName,
          arguments: parameters,
        });

        const timeoutPromise = this.createTimeoutPromise<never>(
          timeout,
          `Tool execution timeout: ${toolName}`,
        );

        return await Promise.race([executePromise, timeoutPromise]);
      });

      const duration = Date.now() - startTime;

      // Update tool statistics
      this.updateToolStats(toolKey, true, duration);

      // Validate output if requested
      if (options.validateOutput !== false && result) {
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
   * Validate tool output
   */
  private validateToolOutput(result: any): void {
    // Basic output validation
    if (!result) {
      throw new Error("Tool returned no result");
    }

    // Check for error indicators
    if (result.error) {
      throw new Error(`Tool execution error: ${result.error}`);
    }

    if (result.isError === true) {
      throw new Error("Tool execution failed");
    }
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
    return Array.from(this.toolRegistry.values());
  }

  /**
   * Clear tools for a server
   */
  clearServerTools(serverId: string): void {
    const serverToolNames = this.serverTools.get(serverId);

    if (serverToolNames) {
      for (const toolName of serverToolNames) {
        const toolKey = this.createToolKey(serverId, toolName);
        this.toolRegistry.delete(toolKey);

        // Emit tool unregistered event
        this.emit("toolUnregistered", {
          serverId,
          toolName,
          timestamp: new Date(),
        } satisfies ToolRegistryEvents["toolUnregistered"]);
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
