/**
 * NeuroLink MCP Client
 * Following Lighthouse's pattern for MCP tool registration and execution
 */

import { EventEmitter } from "events";
import type {
  NeuroLinkMCPTool,
  ToolResult,
  NeuroLinkExecutionContext,
} from "./factory.js";
import { logger } from "../utils/logger.js";

/**
 * MCP Client Configuration
 */
export interface MCPClientConfig {
  sessionId: string;
  userId?: string;
  aiProvider?: string;
  modelId?: string;
  logLevel?: "debug" | "info" | "warn" | "error";
}

/**
 * Registered Tool Interface
 */
interface RegisteredTool {
  name: string;
  originalName: string;
  serverId: string;
  execute: (
    params: unknown,
    context: NeuroLinkExecutionContext,
  ) => Promise<ToolResult>;
  description?: string;
  inputSchema?: unknown;
}

/**
 * NeuroLink MCP Client
 * Manages tool registration and execution following Lighthouse patterns
 */
export class NeuroLinkMCPClient extends EventEmitter {
  private tools: Map<string, RegisteredTool> = new Map();
  private config: MCPClientConfig;
  private executionCount = 0;
  private isConnected = false;

  constructor(config: MCPClientConfig) {
    super();
    this.config = config;
    this.isConnected = true;

    logger.info(`[MCP Client] Initialized for session ${config.sessionId}`, {
      userId: config.userId,
      aiProvider: config.aiProvider,
      modelId: config.modelId,
    });
  }

  /**
   * Register a tool with the MCP client
   * Following Lighthouse's pattern of namespacing tools with server ID
   */
  registerTool(
    toolName: string,
    execute: (name: string, params: Record<string, unknown>) => Promise<any>,
    description?: string,
    inputSchema?: unknown,
  ): void {
    // Parse server ID from tool name (format: serverId_toolName)
    const parts = toolName.split("_");
    const serverId = parts[0];
    const originalName = parts.slice(1).join("_");

    // Create registered tool
    const registeredTool: RegisteredTool = {
      name: toolName,
      originalName,
      serverId,
      execute: async (params: unknown, context: NeuroLinkExecutionContext) => {
        try {
          // Call the execute function with Lighthouse-style parameters
          const result = await execute(
            toolName,
            params as Record<string, unknown>,
          );

          // Handle different response formats
          if (result && typeof result === "object") {
            // If it's already in NeuroLink format
            if (
              "success" in result &&
              ("data" in result || "error" in result)
            ) {
              return result;
            }

            // If it's in Lighthouse format with content array
            if (
              result.content &&
              Array.isArray(result.content) &&
              result.content[0]?.text
            ) {
              try {
                const data = JSON.parse(result.content[0].text);
                return {
                  success: !result.isError,
                  data,
                  metadata: {
                    toolName,
                    serverId,
                    sessionId: context.sessionId,
                    timestamp: Date.now(),
                  },
                };
              } catch (parseError) {
                // If JSON parsing fails, return the text as-is
                return {
                  success: !result.isError,
                  data: { text: result.content[0].text },
                  metadata: {
                    toolName,
                    serverId,
                    sessionId: context.sessionId,
                    timestamp: Date.now(),
                  },
                };
              }
            }

            // If it has a direct text property
            if (result.text) {
              return {
                success: true,
                data: { text: result.text },
                metadata: {
                  toolName,
                  serverId,
                  sessionId: context.sessionId,
                  timestamp: Date.now(),
                },
              };
            }
          }

          return {
            success: false,
            error: "Invalid tool response format",
          };
        } catch (error) {
          logger.error(
            `[MCP Client] Tool execution failed: ${toolName}`,
            error,
          );
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      },
      description,
      inputSchema,
    };

    // Register the tool
    this.tools.set(toolName, registeredTool);

    logger.debug(`[MCP Client] Registered tool: ${toolName}`, {
      serverId,
      originalName,
      description,
    });

    // Emit tool registration event
    this.emit("tool:registered", {
      toolName,
      serverId,
      originalName,
    });
  }

  /**
   * Get all registered tools
   */
  getTools(): Record<string, { description?: string; inputSchema?: unknown }> {
    const tools: Record<
      string,
      { description?: string; inputSchema?: unknown }
    > = {};

    for (const [name, tool] of this.tools) {
      tools[name] = {
        description: tool.description,
        inputSchema: tool.inputSchema,
      };
    }

    return tools;
  }

  /**
   * Execute a tool by name
   */
  async executeTool(
    toolName: string,
    params: unknown,
    context?: Partial<NeuroLinkExecutionContext>,
  ): Promise<ToolResult> {
    const tool = this.tools.get(toolName);

    if (!tool) {
      return {
        success: false,
        error: `Tool not found: ${toolName}`,
      };
    }

    // Create full context
    const fullContext: NeuroLinkExecutionContext = {
      sessionId: this.config.sessionId,
      userId: this.config.userId,
      aiProvider: this.config.aiProvider,
      modelId: this.config.modelId,
      timestamp: Date.now(),
      ...context,
    };

    // Track execution
    this.executionCount++;
    const executionId = `exec-${this.executionCount}`;

    // Emit execution start event
    this.emit("tool:execute:start", {
      executionId,
      toolName,
      serverId: tool.serverId,
      params,
    });

    const startTime = Date.now();

    try {
      // Execute the tool
      const result = await tool.execute(params, fullContext);

      // Add execution metadata
      result.metadata = {
        ...result.metadata,
        executionId,
        executionTime: Date.now() - startTime,
      };

      // Emit execution complete event
      this.emit("tool:execute:complete", {
        executionId,
        toolName,
        serverId: tool.serverId,
        success: result.success,
        executionTime: result.metadata.executionTime,
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Emit execution error event
      this.emit("tool:execute:error", {
        executionId,
        toolName,
        serverId: tool.serverId,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          executionId,
          toolName,
          serverId: tool.serverId,
          executionTime,
        },
      };
    }
  }

  /**
   * Check if connected to MCP
   */
  isConnectedToMCP(): boolean {
    return this.isConnected;
  }

  /**
   * Disconnect from MCP
   */
  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.tools.clear();
    this.removeAllListeners();

    logger.info(
      `[MCP Client] Disconnected for session ${this.config.sessionId}`,
    );
  }

  /**
   * Get client statistics
   */
  getStats() {
    return {
      sessionId: this.config.sessionId,
      toolCount: this.tools.size,
      executionCount: this.executionCount,
      isConnected: this.isConnected,
      uptime: Date.now() - (this.startTime || Date.now()),
    };
  }

  private startTime = Date.now();
}

/**
 * Create a new MCP client instance
 */
export function createMCPClient(config: MCPClientConfig): NeuroLinkMCPClient {
  return new NeuroLinkMCPClient(config);
}
