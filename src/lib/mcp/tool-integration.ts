/**
 * MCP Tool Integration Layer
 * Connects MCP tools to NeuroLink AI providers following Lighthouse patterns
 */

import { mcpConfig } from "./config.js";
import type {
  NeuroLinkExecutionContext,
  ToolResult,
  NeuroLinkMCPTool,
} from "./factory.js";
import { logger } from "../utils/logger.js";
import { MCPToolRegistry } from "./tool-registry.js";

/**
 * Tool Integration System
 * Provides natural language tool discovery and execution
 */
export class MCPToolIntegration {
  private registry: MCPToolRegistry;
  private context: NeuroLinkExecutionContext;

  constructor(context?: Partial<NeuroLinkExecutionContext>) {
    this.registry = new MCPToolRegistry();
    this.context = {
      sessionId: context?.sessionId || `session-${Date.now()}`,
      userId: context?.userId || "anonymous",
      aiProvider: context?.aiProvider || "unknown",
      ...context,
      // Ensure secureFS is properly typed
      secureFS: context?.secureFS || {
        readFile: async () => {
          throw new Error("secureFS not configured");
        },
        writeFile: async () => {
          throw new Error("secureFS not configured");
        },
        readdir: async () => {
          throw new Error("secureFS not configured");
        },
        stat: async () => {
          throw new Error("secureFS not configured");
        },
        mkdir: async () => {
          throw new Error("secureFS not configured");
        },
        exists: async () => false,
        rmdir: async () => {
          throw new Error("secureFS not configured");
        },
        unlink: async () => {
          throw new Error("secureFS not configured");
        },
      },
    } as NeuroLinkExecutionContext;

    // Initialize with all active servers
    this.initializeTools();
  }

  /**
   * Initialize tools from all active servers
   */
  private async initializeTools() {
    const servers = await mcpConfig.getServers();

    for (const server of servers) {
      await this.registry.registerServer(
        server.id || (server as any).name || "unknown",
        server,
      );
    }

    const tools = await this.registry.listTools();
    logger.debug("[Tool Integration] Initialized with servers:", {
      serverCount: servers.length,
      toolCount: tools.length,
    });
  }

  /**
   * Get all available tools
   */
  getAvailableTools() {
    return this.registry.listTools();
  }

  /**
   * Find tools that match a query
   */
  async findTools(query: string): Promise<
    Array<{
      name: string;
      description: string;
      serverId: string;
      relevance: number;
    }>
  > {
    const allTools = await this.registry.listTools();
    const queryLower = query.toLowerCase();
    const results = [];

    for (const toolInfo of allTools) {
      let relevance = 0;

      // Check tool name
      if (toolInfo.name.toLowerCase().includes(queryLower)) {
        relevance += 10;
      }

      // Check tool description
      if (toolInfo.description?.toLowerCase().includes(queryLower)) {
        relevance += 5;
      }

      // Check category if present (category might not exist on ToolInfo)
      // if (toolInfo.category?.toLowerCase().includes(queryLower)) {
      //   relevance += 3;
      // }

      if (relevance > 0) {
        results.push({
          name: toolInfo.name,
          description: toolInfo.description || "No description available",
          serverId: toolInfo.server || "unknown",
          relevance,
        });
      }
    }

    // Sort by relevance
    return results.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Execute a tool by name
   */
  async executeTool(
    toolName: string,
    params: any,
    serverId?: string,
  ): Promise<ToolResult> {
    try {
      // If serverId is provided, use qualified name
      const qualifiedName = serverId ? `${serverId}.${toolName}` : toolName;

      const result = await this.registry.executeTool(
        qualifiedName,
        params,
        this.context,
      );

      return result;
    } catch (error) {
      logger.error("[Tool Integration] Tool execution failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          toolName,
          serverId,
          timestamp: Date.now(),
        },
      };
    }
  }

  /**
   * Enhance AI prompt with tool context
   */
  async createToolAwarePrompt(userPrompt: string): Promise<string> {
    const tools = await this.getAvailableTools();
    const toolDescriptions = tools
      .map((t: any) => `- ${t.name}: ${t.description}`)
      .join("\n");

    return `${userPrompt}

Available tools:
${toolDescriptions}

You can use these tools to provide more accurate and real-time information.`;
  }

  /**
   * Analyze AI response for tool usage requests
   */
  analyzeForToolUsage(aiResponse: string): Array<{
    toolName: string;
    params: any;
    confidence: number;
  }> {
    const toolRequests = [];

    // Simple pattern matching for tool requests
    // This can be enhanced with more sophisticated NLP
    const toolPattern = /<tool[^>]*>([^<]+)<\/tool>/g;
    let match;

    while ((match = toolPattern.exec(aiResponse)) !== null) {
      try {
        const toolData = JSON.parse(match[1]);
        toolRequests.push({
          toolName: toolData.name,
          params: toolData.params || {},
          confidence: 1.0,
        });
      } catch (error) {
        logger.warn(
          "[Tool Integration] Failed to parse tool request:",
          match[1],
        );
      }
    }

    return toolRequests;
  }

  /**
   * Update context for tool execution
   */
  updateContext(updates: Partial<NeuroLinkExecutionContext>) {
    this.context = {
      ...this.context,
      ...updates,
    };
  }
}

/**
 * Create a global tool integration instance
 * This can be initialized once and reused
 */
let globalToolIntegration: MCPToolIntegration | null = null;

export function getToolIntegration(
  context?: Partial<NeuroLinkExecutionContext>,
): MCPToolIntegration {
  if (!globalToolIntegration) {
    globalToolIntegration = new MCPToolIntegration(context);
  } else if (context) {
    globalToolIntegration.updateContext(context);
  }

  return globalToolIntegration;
}

/**
 * Initialize MCP tools for a session
 * Following Lighthouse's initialization pattern
 */
export async function initializeMCPTools(
  sessionId: string,
  context?: Partial<NeuroLinkExecutionContext>,
): Promise<MCPToolIntegration> {
  const integration = getToolIntegration({
    sessionId,
    ...context,
  });

  logger.debug(
    "[Tool Integration] MCP tools initialized for session:",
    sessionId,
  );

  return integration;
}
