/**
 * NeuroLink MCP-Aware AI Provider
 * Integrates MCP tools with AI providers following Lighthouse's pattern
 */

import type {
  AIProvider,
  TextGenerationOptions,
  StreamTextOptions,
} from "../core/types.js";
import type { StreamTextResult, ToolSet, Schema, GenerateTextResult } from "ai";
import type { ZodType, ZodTypeDef } from "zod";
import { getMCPManager } from "../mcp/manager.js";
import { initializeMCPTools } from "../mcp/initialize-tools.js";
import type { NeuroLinkExecutionContext } from "../mcp/factory.js";
import { logger } from "../utils/logger.js";
import { v4 as uuidv4 } from "uuid";

/**
 * MCP-Aware Provider Configuration
 */
export interface MCPProviderConfig {
  baseProvider: AIProvider;
  providerName?: string;
  modelName?: string;
  enableMCP?: boolean;
  sessionId?: string;
  userId?: string;
  organizationId?: string;
}

/**
 * MCP-Aware AI Provider
 * Wraps any AI provider with MCP tool capabilities
 */
export class MCPAwareProvider implements AIProvider {
  private baseProvider: AIProvider;
  private config: MCPProviderConfig;
  private sessionId: string;
  private mcpInitialized = false;

  constructor(config: MCPProviderConfig) {
    this.baseProvider = config.baseProvider;
    this.config = config;
    this.sessionId = config.sessionId || uuidv4();
  }

  /**
   * Initialize MCP tools for this session
   */
  private async initializeMCP(): Promise<void> {
    if (this.mcpInitialized || this.config.enableMCP === false) {
      return;
    }

    try {
      // Get or create MCP client for this session
      const mcpClient = getMCPManager(this.sessionId, {
        userId: this.config.userId || "anonymous",
        aiProvider: this.config.providerName || "unknown",
        modelId: this.config.modelName,
      });

      // Create execution context
      const context: NeuroLinkExecutionContext = {
        sessionId: this.sessionId,
        userId: this.config.userId || "anonymous",
        organizationId: this.config.organizationId || "default",
        aiProvider: this.config.providerName || "unknown",
        modelId: this.config.modelName,
        timestamp: Date.now(),
        // Required properties
        secureFS: {
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
        },
        path: {
          join: (...paths: string[]) => require("path").join(...paths),
          resolve: (...paths: string[]) => require("path").resolve(...paths),
          relative: (from: string, to: string) =>
            require("path").relative(from, to),
          dirname: (path: string) => require("path").dirname(path),
          basename: (path: string, ext?: string) =>
            require("path").basename(path, ext),
        },
        grantedPermissions: [],
        log: console.log,
      };

      // Initialize all MCP tools
      initializeMCPTools(this.sessionId, mcpClient, context);

      this.mcpInitialized = true;

      const tools = mcpClient.getTools();
      const toolCount = Object.keys(tools).length;

      logger.info(
        `[MCP Provider] Initialized ${toolCount} tools for session ${this.sessionId}`,
      );
    } catch (error) {
      logger.error(
        `[MCP Provider] Failed to initialize MCP for session ${this.sessionId}`,
        error,
      );
      // Continue without MCP tools if initialization fails
    }
  }

  async generateText(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<GenerateTextResult<ToolSet, unknown> | null> {
    // Ensure MCP is initialized
    await this.initializeMCP();

    // Parse options
    const options =
      typeof optionsOrPrompt === "string"
        ? { prompt: optionsOrPrompt }
        : optionsOrPrompt;

    // Check if prompt requests tool usage
    const needsTools = this.detectToolRequest(options.prompt);

    if (needsTools && this.mcpInitialized) {
      // Get MCP client
      const mcpClient = getMCPManager(this.sessionId);

      // Create enhanced prompt with available tools
      const tools = mcpClient.getTools();
      const toolList = Object.keys(tools)
        .map((name) => {
          const tool = tools[name];
          return `- ${name}: ${tool.description || "No description"}`;
        })
        .join("\n");

      const enhancedPrompt = `${options.prompt}

Available tools:
${toolList}

To use a tool, respond with:
TOOL: <tool_name>
PARAMS: <json_params>

Otherwise, provide a direct response.`;

      // Generate response with enhanced prompt
      const response = await this.baseProvider.generateText(
        {
          ...options,
          prompt: enhancedPrompt,
        },
        analysisSchema,
      );

      if (!response) {
        return null;
      }

      // Check if response includes tool invocation
      const toolMatch = response.text.match(
        /TOOL:\s*(\S+)\s*\nPARAMS:\s*({.*})/s,
      );

      if (toolMatch) {
        const toolName = toolMatch[1];
        const toolParams = JSON.parse(toolMatch[2]);

        // Execute tool
        const toolResult = await mcpClient.executeTool(toolName, toolParams);

        // Generate final response with tool result
        const finalPrompt = `${options.prompt}

Tool ${toolName} was executed with result:
${JSON.stringify(toolResult, null, 2)}

Please provide a response based on this information.`;

        const finalResponse = await this.baseProvider.generateText(
          {
            ...options,
            prompt: finalPrompt,
          },
          analysisSchema,
        );

        if (!finalResponse) {
          return null;
        }

        // Return response (tool usage is tracked internally)
        return finalResponse;
      }

      return response;
    }

    // Regular generation without tools
    return this.baseProvider.generateText(options);
  }

  async streamText(
    optionsOrPrompt: StreamTextOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<StreamTextResult<ToolSet, unknown> | null> {
    // For now, streaming doesn't support tool usage
    // This matches Lighthouse's approach where MCP is used for non-streaming requests
    return this.baseProvider.streamText(optionsOrPrompt, analysisSchema);
  }

  /**
   * Detect if the prompt is requesting tool usage
   */
  private detectToolRequest(prompt: string): boolean {
    const toolKeywords = [
      "use tool",
      "call tool",
      "execute tool",
      "run tool",
      "invoke tool",
      "what tools",
      "available tools",
      "list tools",
    ];

    const lowerPrompt = prompt.toLowerCase();
    return toolKeywords.some((keyword) => lowerPrompt.includes(keyword));
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    if (!this.mcpInitialized) {
      return null;
    }

    const mcpClient = getMCPManager(this.sessionId);
    return mcpClient.getStats();
  }

  /**
   * Clean up session
   */
  async cleanup(): Promise<void> {
    if (this.mcpInitialized) {
      const { removeMCPManager } = await import("../mcp/manager.js");
      await removeMCPManager(this.sessionId);
      this.mcpInitialized = false;
    }
  }
}

/**
 * Create an MCP-aware provider
 */
export function createMCPAwareProvider(
  baseProvider: AIProvider,
  config?: Partial<MCPProviderConfig>,
): MCPAwareProvider {
  return new MCPAwareProvider({
    baseProvider,
    enableMCP: true,
    ...config,
  });
}

/**
 * Check if a provider is MCP-aware
 */
export function isMCPAwareProvider(
  provider: AIProvider,
): provider is MCPAwareProvider {
  return provider instanceof MCPAwareProvider;
}
