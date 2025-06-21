/**
 * MCP Tool Registry - Extended Registry with Tool Management
 */

import type {
  DiscoveredMCP,
  ExecutionContext,
} from "./contracts/mcp-contract.js";
import type { ToolResult } from "./factory.js";
import { MCPRegistry } from "./registry.js";
import { registryLogger } from "./logging.js";

export interface ToolInfo {
  id: string;
  name: string;
  description?: string;
  inputSchema?: any;
  outputSchema?: any;
  serverId: string;
  source: "manual" | "auto" | "default";
  isImplemented?: boolean;
  server?: string; // Alias for serverId for backward compatibility
}

// Use the compatible ToolResult from factory.ts
export type ToolExecutionResult = ToolResult;

export class MCPToolRegistry extends MCPRegistry {
  private tools: Map<string, ToolInfo> = new Map();
  private toolExecutionStats: Map<
    string,
    { count: number; totalTime: number }
  > = new Map();

  /**
   * Register a server with its tools
   */
  async registerServer(serverId: string, serverInfo: any): Promise<void> {
    registryLogger.info(`Registering server: ${serverId}`);

    // Extract tools from server info if available
    if (serverInfo.tools) {
      for (const [toolName, toolDef] of Object.entries(serverInfo.tools)) {
        const toolId = `${serverId}.${toolName}`;
        this.tools.set(toolId, {
          id: toolId,
          name: toolName,
          description: (toolDef as any).description,
          inputSchema: (toolDef as any).inputSchema,
          outputSchema: (toolDef as any).outputSchema,
          serverId,
          server: serverId, // Backward compatibility alias
          source: "manual",
          isImplemented: true,
        });
      }
    }
  }

  /**
   * Unregister a server and its tools
   */
  async unregisterServer(serverId: string): Promise<void> {
    registryLogger.info(`Unregistering server: ${serverId}`);

    // Remove all tools for this server
    for (const [toolId, toolInfo] of this.tools) {
      if (toolInfo.serverId === serverId) {
        this.tools.delete(toolId);
        this.toolExecutionStats.delete(toolId);
      }
    }
  }

  /**
   * Execute a tool
   */
  async executeTool(
    toolName: string,
    args: any,
    context: ExecutionContext,
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
      const toolInfo = this.getToolInfo(toolName);
      if (!toolInfo) {
        throw new Error(`Tool not found: ${toolName}`);
      }

      registryLogger.info(`Executing tool: ${toolName}`);

      // Get the plugin that provides this tool
      const plugin = this.get(toolInfo.serverId);
      if (!plugin) {
        throw new Error(`Plugin not found for tool: ${toolName}`);
      }

      // Execute through the plugin (stub implementation)
      const result = {
        success: true,
        data: `Tool ${toolInfo.name} executed with args: ${JSON.stringify(args)}`,
      };

      const executionTime = Date.now() - startTime;
      this.updateStats(toolName, executionTime);

      return {
        success: true,
        data: result,
        metadata: {
          toolName,
          executionTime,
          timestamp: Date.now(),
        },
      };
    } catch (error) {
      registryLogger.error(`Tool execution failed: ${toolName}`, error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: {
          toolName,
          executionTime: Date.now() - startTime,
          timestamp: Date.now(),
        },
      };
    }
  }

  /**
   * List all available tools
   */
  async listTools(): Promise<ToolInfo[]> {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool information
   */
  getToolInfo(toolName: string): ToolInfo | undefined {
    return this.tools.get(toolName);
  }

  /**
   * Update execution statistics
   */
  private updateStats(toolName: string, executionTime: number): void {
    const stats = this.toolExecutionStats.get(toolName) || {
      count: 0,
      totalTime: 0,
    };
    stats.count++;
    stats.totalTime += executionTime;
    this.toolExecutionStats.set(toolName, stats);
  }

  /**
   * Get tool execution statistics
   */
  getToolStats(toolName?: string): any {
    if (toolName) {
      const stats = this.toolExecutionStats.get(toolName);
      return stats
        ? {
            ...stats,
            averageTime: stats.totalTime / stats.count,
          }
        : null;
    }

    // Return all stats
    const allStats: any = {};
    for (const [tool, stats] of this.toolExecutionStats) {
      allStats[tool] = {
        ...stats,
        averageTime: stats.totalTime / stats.count,
      };
    }
    return allStats;
  }

  /**
   * Get tool execution statistics
   */
  async getStats(): Promise<any> {
    const tools = await this.listTools();
    return {
      totalTools: tools.length,
      totalExecutions: Array.from(this.toolExecutionStats.values()).reduce(
        (acc, stats) => acc + stats.count,
        0,
      ),
    };
  }

  /**
   * Clear all tools and stats
   */
  clear(): void {
    super.clear();
    this.tools.clear();
    this.toolExecutionStats.clear();
  }
}

// Export singleton instance
export const toolRegistry = new MCPToolRegistry();

// Additional exports for backward compatibility
export const defaultToolRegistry = toolRegistry;

// Export tool execution options type
export interface ToolExecutionOptions {
  preferredSource?: string;
  fallbackEnabled?: boolean;
  validateBeforeExecution?: boolean;
  timeoutMs?: number;
}
