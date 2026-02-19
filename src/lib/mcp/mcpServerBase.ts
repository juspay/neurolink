/**
 * MCP Server Base Class
 *
 * Abstract base class for creating custom MCP servers with consistent patterns
 * for tool registration, execution, and lifecycle management.
 *
 * Implements Mastra-style MCPServerBase features including:
 * - Tool annotation support (readOnlyHint, destructiveHint, idempotentHint)
 * - Lifecycle hooks (onInit, onStart, onStop)
 * - Event emission for tool operations
 * - Conversion to MCPServerInfo format
 *
 * @module mcp/mcpServerBase
 * @since 8.39.0
 */

import { EventEmitter } from "events";
import type { JsonValue } from "../types/common.js";
import type {
  MCPServerInfo,
  MCPTransportType,
  MCPServerCategory,
  NeuroLinkExecutionContext,
  ToolResult,
} from "../types/mcpTypes.js";
import type { MCPToolAnnotations, MCPServerTool } from "./toolAnnotations.js";
import { withTimeout } from "../utils/async/withTimeout.js";
import { ErrorFactory } from "../utils/errorHandling.js";

/**
 * MCPServerBase configuration
 */
export type MCPServerBaseConfig = {
  /**
   * Unique server identifier
   */
  id: string;

  /**
   * Human-readable server name
   */
  name: string;

  /**
   * Server description
   */
  description?: string;

  /**
   * Server version
   */
  version?: string;

  /**
   * Server category for organization
   */
  category?: MCPServerCategory;

  /**
   * Transport protocol preference
   */
  transport?: MCPTransportType;

  /**
   * Custom metadata
   */
  metadata?: Record<string, JsonValue>;

  /**
   * Default timeout for tool execution in milliseconds (default: 30000)
   */
  defaultTimeoutMs?: number;

  /**
   * Global tool annotations applied to all tools
   */
  defaultAnnotations?: MCPToolAnnotations;
};

/**
 * Server lifecycle events
 */
export type MCPServerEvents = {
  toolRegistered: { toolName: string; tool: MCPServerTool };
  toolExecuted: { toolName: string; duration: number; success: boolean };
  toolError: { toolName: string; error: Error };
  serverReady: { tools: string[] };
  serverStopped: { reason?: string };
};

/**
 * Abstract base class for MCP servers
 *
 * Provides a foundation for creating custom MCP servers with consistent
 * patterns for tool registration, execution, and lifecycle management.
 *
 * @example
 * ```typescript
 * class MyCustomServer extends MCPServerBase {
 *   constructor() {
 *     super({
 *       id: "my-custom-server",
 *       name: "My Custom Server",
 *       description: "Provides custom functionality",
 *       category: "custom",
 *     });
 *
 *     // Register tools in constructor or init
 *     this.registerTool({
 *       name: "myTool",
 *       description: "Does something useful",
 *       annotations: {
 *         readOnlyHint: true,
 *         idempotentHint: true,
 *       },
 *       execute: async (params, context) => {
 *         return { success: true, data: "result" };
 *       },
 *     });
 *   }
 * }
 * ```
 */
export abstract class MCPServerBase extends EventEmitter {
  protected readonly config: Required<MCPServerBaseConfig>;
  protected readonly tools: Map<string, MCPServerTool> = new Map();
  protected isInitialized = false;
  protected isRunning = false;

  constructor(config: MCPServerBaseConfig) {
    super();

    // Apply defaults
    this.config = {
      id: config.id,
      name: config.name,
      description: config.description ?? "",
      version: config.version ?? "1.0.0",
      category: config.category ?? "custom",
      transport: config.transport ?? "stdio",
      metadata: config.metadata ?? {},
      defaultTimeoutMs: config.defaultTimeoutMs ?? 30_000,
      defaultAnnotations: config.defaultAnnotations ?? {},
    };
  }

  /**
   * Initialize the server
   * Override in subclasses for async initialization
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    await this.onInit();
    this.isInitialized = true;

    this.emit("serverReady", {
      tools: Array.from(this.tools.keys()),
    });
  }

  /**
   * Hook for subclass initialization
   * Override to perform async setup
   */
  protected async onInit(): Promise<void> {
    // Override in subclasses
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }

    if (this.isRunning) {
      return;
    }

    await this.onStart();
    this.isRunning = true;
  }

  /**
   * Hook for subclass start logic
   */
  protected async onStart(): Promise<void> {
    // Override in subclasses
  }

  /**
   * Stop the server
   */
  async stop(reason?: string): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    await this.onStop();
    this.isRunning = false;

    this.emit("serverStopped", { reason });
  }

  /**
   * Hook for subclass stop logic
   */
  protected async onStop(): Promise<void> {
    // Override in subclasses
  }

  /**
   * Register a tool with the server
   */
  registerTool(tool: MCPServerTool): this {
    // Validate tool
    this.validateTool(tool);

    // Merge with default annotations
    const mergedTool: MCPServerTool = {
      ...tool,
      annotations: {
        ...this.config.defaultAnnotations,
        ...tool.annotations,
      },
    };

    this.tools.set(tool.name, mergedTool);

    this.emit("toolRegistered", {
      toolName: tool.name,
      tool: mergedTool,
    });

    return this;
  }

  /**
   * Register multiple tools at once
   */
  registerTools(tools: MCPServerTool[]): this {
    for (const tool of tools) {
      this.registerTool(tool);
    }
    return this;
  }

  /**
   * Validate tool configuration
   */
  protected validateTool(tool: MCPServerTool): void {
    if (!tool.name || typeof tool.name !== "string") {
      throw ErrorFactory.invalidConfiguration(
        "tool.name",
        "Tool name is required and must be a string",
      );
    }

    if (tool.name.length > 64) {
      throw ErrorFactory.invalidConfiguration(
        "tool.name",
        "Tool name must be 64 characters or less",
        { toolName: tool.name },
      );
    }

    if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(tool.name)) {
      throw ErrorFactory.invalidConfiguration(
        "tool.name",
        "Tool name must start with a letter or underscore and contain only alphanumeric characters, underscores, and hyphens",
        { toolName: tool.name },
      );
    }

    if (!tool.description || typeof tool.description !== "string") {
      throw ErrorFactory.invalidConfiguration(
        "tool.description",
        "Tool description is required and must be a string",
        { toolName: tool.name },
      );
    }

    if (typeof tool.execute !== "function") {
      throw ErrorFactory.invalidConfiguration(
        "tool.execute",
        "Tool execute function is required",
        { toolName: tool.name },
      );
    }

    if (this.tools.has(tool.name)) {
      throw ErrorFactory.invalidConfiguration(
        "tool.name",
        `Tool '${tool.name}' is already registered`,
        { toolName: tool.name },
      );
    }
  }

  /**
   * Execute a tool by name
   */
  async executeTool(
    toolName: string,
    params: unknown,
    context?: NeuroLinkExecutionContext,
  ): Promise<ToolResult> {
    const tool = this.tools.get(toolName);

    if (!tool) {
      return {
        success: false,
        error: `Tool '${toolName}' not found on server '${this.config.id}'`,
        metadata: {
          toolName,
          serverId: this.config.id,
        },
      };
    }

    const startTime = Date.now();
    const toolTimeoutMs = this.config.defaultTimeoutMs ?? 30_000;

    try {
      const result = await withTimeout(
        tool.execute(params, context ?? {}),
        toolTimeoutMs,
        ErrorFactory.toolTimeout(toolName, toolTimeoutMs).message,
      );
      const duration = Date.now() - startTime;

      this.emit("toolExecuted", {
        toolName,
        duration,
        success: true,
      });

      // Ensure result conforms to ToolResult
      if (this.isToolResult(result)) {
        return {
          ...result,
          metadata: {
            ...result.metadata,
            toolName,
            serverId: this.config.id,
            executionTime: duration,
          },
        };
      }

      return {
        success: true,
        data: result,
        metadata: {
          toolName,
          serverId: this.config.id,
          executionTime: duration,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.emit("toolError", {
        toolName,
        error: error instanceof Error ? error : new Error(String(error)),
      });

      this.emit("toolExecuted", {
        toolName,
        duration,
        success: false,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          toolName,
          serverId: this.config.id,
          executionTime: duration,
        },
      };
    }
  }

  /**
   * Type guard to check if result is a ToolResult
   */
  private isToolResult(result: unknown): result is ToolResult {
    return (
      result !== null &&
      typeof result === "object" &&
      "success" in result &&
      typeof (result as ToolResult).success === "boolean"
    );
  }

  /**
   * Get all registered tools
   */
  getTools(): MCPServerTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get a specific tool by name
   */
  getTool(name: string): MCPServerTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool exists
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Remove a tool
   */
  removeTool(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Get server info in MCPServerInfo format
   */
  toServerInfo(): MCPServerInfo {
    return {
      id: this.config.id,
      name: this.config.name,
      description: this.config.description,
      transport: this.config.transport,
      status: this.isRunning ? "connected" : "stopped",
      tools: this.getTools().map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema as object | undefined,
        execute: (params: unknown, context?: unknown) =>
          this.executeTool(
            tool.name,
            params,
            context as NeuroLinkExecutionContext | undefined,
          ),
      })),
      metadata: {
        ...this.config.metadata,
        category: this.config.category,
        version: this.config.version,
      },
    };
  }

  /**
   * Get tools filtered by annotations
   */
  getToolsByAnnotation(
    annotation: keyof MCPToolAnnotations,
    value: boolean | string | number | string[],
  ): MCPServerTool[] {
    return this.getTools().filter((tool) => {
      const annotationValue = tool.annotations?.[annotation];
      if (Array.isArray(value) && Array.isArray(annotationValue)) {
        return value.some((v) =>
          (annotationValue as string[]).includes(v as string),
        );
      }
      return annotationValue === value;
    });
  }

  /**
   * Get read-only tools
   */
  getReadOnlyTools(): MCPServerTool[] {
    return this.getToolsByAnnotation("readOnlyHint", true);
  }

  /**
   * Get destructive tools
   */
  getDestructiveTools(): MCPServerTool[] {
    return this.getToolsByAnnotation("destructiveHint", true);
  }

  /**
   * Get idempotent tools
   */
  getIdempotentTools(): MCPServerTool[] {
    return this.getToolsByAnnotation("idempotentHint", true);
  }

  /**
   * Get tools that require confirmation
   */
  getToolsRequiringConfirmation(): MCPServerTool[] {
    return this.getToolsByAnnotation("requiresConfirmation", true);
  }

  /**
   * Server identification
   */
  get id(): string {
    return this.config.id;
  }

  get name(): string {
    return this.config.name;
  }

  get description(): string {
    return this.config.description;
  }

  get version(): string {
    return this.config.version;
  }

  get category(): MCPServerCategory {
    return this.config.category;
  }

  /**
   * Check if server is initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Check if server is running
   */
  get running(): boolean {
    return this.isRunning;
  }
}

// Re-export types from toolAnnotations for convenience
export type { MCPToolAnnotations, MCPServerTool } from "./toolAnnotations.js";
