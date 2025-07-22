/**
 * NeuroLink MCP-Aware AI Provider
 * Integrates MCP tools with AI providers following Lighthouse's pattern
 */

import type {
  AIProvider,
  TextGenerationOptions,
  EnhancedGenerateResult,
} from "../core/types.js";
import type { Schema } from "ai";
import type { GenerateResult } from "../types/generate-types.js";
import type { ZodType, ZodTypeDef } from "zod";
import { getMCPManager } from "../mcp/manager.js";
import { initializeMCPTools } from "../mcp/initialize-tools.js";
import type { NeuroLinkExecutionContext } from "../mcp/factory.js";
import { logger } from "../utils/logger.js";
import { v4 as uuidv4 } from "uuid";
import type { StreamOptions, StreamResult } from "../types/stream-types.js";

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

  /**
   * PRIMARY METHOD: Stream content using AI (recommended for new code)
   * Future-ready for multi-modal capabilities with current text focus
   */
  async stream(
    optionsOrPrompt: StreamOptions | string,
    analysisSchema?: any,
  ): Promise<StreamResult> {
    const functionTag = "MCPAwareProvider.stream";
    const startTime = Date.now();

    // Parse parameters - support both string and options object
    const options =
      typeof optionsOrPrompt === "string"
        ? { input: { text: optionsOrPrompt } }
        : optionsOrPrompt;

    // Validate input
    if (
      !options?.input?.text ||
      typeof options.input.text !== "string" ||
      options.input.text.trim() === ""
    ) {
      throw new Error(
        "Stream options must include input.text as a non-empty string",
      );
    }

    // Use base provider's stream implementation
    const baseResult = await this.baseProvider.stream(options);

    if (!baseResult) {
      throw new Error("No stream response received from provider");
    }

    // Return the result with MCP metadata
    return {
      ...baseResult,
      provider: "mcp",
      model: options.model || "unknown",
      metadata: {
        streamId: `mcp-${Date.now()}`,
        startTime,
      },
    };
  }

  async generate(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<GenerateResult> {
    // Ensure MCP is initialized
    await this.initializeMCP();

    // Parse options
    const options =
      typeof optionsOrPrompt === "string"
        ? { prompt: optionsOrPrompt }
        : optionsOrPrompt;

    // Validate prompt is provided
    if (!options.prompt || options.prompt.trim() === "") {
      throw new Error(
        "MCP Provider requires a valid prompt. Please provide a non-empty prompt string.",
      );
    }

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
      const response = await this.baseProvider.generate(
        {
          ...options,
          prompt: enhancedPrompt,
        },
        analysisSchema,
      );

      if (!response) {
        return {
          content: "No response generated",
          provider: "mcp",
          model: "unknown",
        };
      }

      // Check if response includes tool invocation
      const toolMatch = response.content.match(
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

        const finalResponse = await this.baseProvider.generate(
          {
            ...options,
            prompt: finalPrompt,
          },
          analysisSchema,
        );

        if (!finalResponse) {
          return {
            content: "Tool execution failed",
            provider: "mcp",
            model: "unknown",
          };
        }

        // Return response (tool usage is tracked internally)
        return finalResponse;
      }

      return response;
    }

    // Regular generation without tools
    const result = await this.baseProvider.generate(options);
    if (!result) {
      return {
        content: "Base provider returned no result",
        provider: "mcp",
        model: "unknown",
      };
    }
    return result;
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

  /**
   * Alias for generate() - CLI-SDK consistency
   */

  /**
   * Short alias for generate() - CLI-SDK consistency
   */
  async gen(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: any,
  ): Promise<EnhancedGenerateResult | null> {
    return this.generate(optionsOrPrompt, analysisSchema);
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
