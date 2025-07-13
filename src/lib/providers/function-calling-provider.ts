/**
 * Enhanced AI Provider with Real Function Calling Support
 * Integrates MCP tools directly with AI SDK's function calling capabilities
 * This is the missing piece that enables true AI function calling!
 */

import type {
  AIProvider,
  TextGenerationOptions,
  EnhancedGenerateResult,
} from "../core/types.js";
import {
  streamText as aiStreamText,
  generateText as aiGenerate,
  Output,
  type Schema,
  type Tool,
} from "ai";
import type { GenerateResult } from "../types/generate-types.js";
import type { ZodType, ZodTypeDef } from "zod";
import {
  getAvailableFunctionTools,
  executeFunctionCall,
  isFunctionCallingAvailable,
} from "../mcp/function-calling.js";
import { createExecutionContext } from "../mcp/context-manager.js";
import type { NeuroLinkExecutionContext } from "../mcp/factory.js";
import { mcpLogger } from "../mcp/logging.js";
import { DEFAULT_MAX_TOKENS } from "../core/constants.js";
import type { StreamOptions, StreamResult } from "../types/stream-types.js";

/**
 * Enhanced provider that enables real function calling with MCP tools
 */
export class FunctionCallingProvider implements AIProvider {
  private baseProvider: AIProvider;
  private enableFunctionCalling: boolean;
  private sessionId: string;
  private userId: string;

  constructor(
    baseProvider: AIProvider,
    options: {
      enableFunctionCalling?: boolean;
      sessionId?: string;
      userId?: string;
    } = {},
  ) {
    this.baseProvider = baseProvider;
    this.enableFunctionCalling = options.enableFunctionCalling ?? true;
    this.sessionId = options.sessionId || `function-calling-${Date.now()}`;
    this.userId = options.userId || "function-calling-user";
  }

  /**
   * PRIMARY METHOD: Stream content using AI (recommended for new code)
   * Future-ready for multi-modal capabilities with current text focus
   */
  async stream(
    optionsOrPrompt: StreamOptions | string,
    analysisSchema?: any,
  ): Promise<StreamResult> {
    const functionTag = "FunctionCallingProvider.stream";
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

    // Return the result with function-calling metadata
    return {
      ...baseResult,
      provider: "function-calling",
      model: options.model || "unknown",
      metadata: {
        streamId: `function-calling-${Date.now()}`,
        startTime,
      },
    };
  }

  /**
   * Generate text with real function calling support
   */
  async generate(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<GenerateResult> {
    const options =
      typeof optionsOrPrompt === "string"
        ? { prompt: optionsOrPrompt }
        : optionsOrPrompt;

    const functionTag = "FunctionCallingProvider.generate";

    // If function calling is disabled, use base provider
    if (!this.enableFunctionCalling) {
      mcpLogger.debug(
        `[${functionTag}] Function calling disabled, using base provider`,
      );
      const result = await this.baseProvider.generate(options, analysisSchema);
      if (!result) {
        return {
          content: "No response generated",
          provider: "function-calling",
          model: "unknown",
        };
      }
      return result;
    }

    try {
      // Check if function calling is available
      const functionsAvailable = await isFunctionCallingAvailable();
      if (!functionsAvailable) {
        mcpLogger.debug(
          `[${functionTag}] No functions available, using base provider`,
        );
        const result = await this.baseProvider.generate(
          options,
          analysisSchema,
        );
        if (!result) {
          return {
            content: "No response generated",
            provider: "function-calling",
            model: "unknown",
          };
        }
        return result;
      }

      // Get available function tools
      const { tools, toolMap } = await getAvailableFunctionTools();
      if (tools.length === 0) {
        mcpLogger.debug(
          `[${functionTag}] No tools available, using base provider`,
        );
        const result = await this.baseProvider.generate(
          options,
          analysisSchema,
        );
        if (!result) {
          return {
            content: "No response generated",
            provider: "function-calling",
            model: "unknown",
          };
        }
        return result;
      }

      mcpLogger.debug(
        `[${functionTag}] Function calling enabled with ${tools.length} tools`,
      );

      // Create execution context
      const context = createExecutionContext({
        sessionId: this.sessionId,
        userId: this.userId,
        aiProvider: this.baseProvider.constructor.name,
      });

      // Use the AI SDK's native function calling by calling generate directly
      // We need to get the underlying model from the base provider
      const result = await this.generateWithTools(
        options,
        tools,
        toolMap,
        context,
        analysisSchema,
      );

      if (!result) {
        return {
          content: "No response generated",
          provider: "function-calling",
          model: "unknown",
        };
      }

      // Enhance result with function calling metadata
      const enhancedResult = {
        ...result,
        functionCallingEnabled: true,
        availableFunctions: tools.length,
        mcpIntegration: {
          sessionId: this.sessionId,
          functionCallsSupported: true,
          toolsRegistered: tools.length,
        },
      };

      mcpLogger.debug(
        `[${functionTag}] Function-calling generation completed with ${result.toolCalls?.length || 0} tool calls`,
      );
      return enhancedResult as GenerateResult;
    } catch (error) {
      mcpLogger.warn(
        `[${functionTag}] Function calling failed, using base provider:`,
        error,
      );
      const result = await this.baseProvider.generate(options, analysisSchema);
      if (!result) {
        return {
          content: "No response generated",
          provider: "function-calling",
          model: "unknown",
        };
      }
      return result;
    }
  }

  /**
   * Generate text using AI SDK's native function calling
   */
  private async generateWithTools(
    options: TextGenerationOptions,
    tools: Tool[],
    toolMap: Map<string, { serverId: string; toolName: string }>,
    context: NeuroLinkExecutionContext,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<GenerateResult> {
    const functionTag = "FunctionCallingProvider.generateWithTools";

    try {
      // Convert our tools to AI SDK format with proper execution
      const toolsWithExecution = this.convertToAISDKTools(
        tools,
        toolMap,
        context,
      );

      mcpLogger.debug(
        `[${functionTag}] Calling AI SDK generate with ${Object.keys(toolsWithExecution).length} tools and maxSteps: 5`,
      );
      mcpLogger.debug(
        `[${functionTag}] Sanitized tool names:`,
        Object.keys(toolsWithExecution),
      );

      // Log the first few tools to debug the issue
      const toolNames = Object.keys(toolsWithExecution);
      mcpLogger.debug(
        `[${functionTag}] First 5 tool names:`,
        toolNames.slice(0, 5),
      );

      // Get the model from base provider (this requires accessing the private model property)
      // For now, we'll create the model directly based on the provider type
      // This is a temporary solution until we have proper model access
      const modelInfo = await this.getModelFromProvider();

      if (!modelInfo) {
        mcpLogger.warn(
          `[${functionTag}] Could not get model from provider, falling back to base provider`,
        );
        const result = await this.baseProvider.generate(
          options,
          analysisSchema,
        );
        if (!result) {
          return {
            content: "No response generated",
            provider: "function-calling",
            model: "unknown",
          };
        }
        return result;
      }

      // Use AI SDK's generate directly with tools
      const generateOptions: Parameters<typeof aiGenerate>[0] = {
        model: modelInfo.model,
        prompt: options.prompt,
        system: options.systemPrompt || "You are a helpful AI assistant.",
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
        tools: toolsWithExecution,
        toolChoice: "auto", // Let the AI decide when to use tools
        maxSteps: 5, // CRITICAL: Enable multi-turn tool execution
      };

      // Add experimental_output if schema is provided
      if (analysisSchema) {
        generateOptions.experimental_output = Output.object({
          schema: analysisSchema,
        });
      }

      const result = await aiGenerate(generateOptions);

      mcpLogger.debug(`[${functionTag}] AI SDK generate completed`, {
        toolCalls: result.toolCalls?.length || 0,
        finishReason: result.finishReason,
        usage: result.usage,
      });

      return {
        content: result.text,
        provider: "function-calling",
        model: "unknown",
        usage: result.usage
          ? {
              inputTokens: result.usage.promptTokens,
              outputTokens: result.usage.completionTokens,
              totalTokens: result.usage.totalTokens,
            }
          : undefined,
        responseTime: 0,
        toolsUsed: result.toolCalls?.map((tc) => tc.toolName) || [],
        toolExecutions: [],
        enhancedWithTools: (result.toolCalls?.length || 0) > 0,
        availableTools: [],
      };
    } catch (error) {
      mcpLogger.error(
        `[${functionTag}] Failed to generate text with tools:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get the model from the base provider
   * This is a temporary solution - ideally we'd have a getModel() method on AIProvider
   */
  private async getModelFromProvider(): Promise<{ model: any } | null> {
    const functionTag = "FunctionCallingProvider.getModelFromProvider";

    try {
      // Try to access the model property if it exists
      const provider = this.baseProvider as any;

      // Check if provider has a model property
      if (provider.model) {
        mcpLogger.debug(`[${functionTag}] Found model property on provider`);
        return { model: provider.model };
      }

      // Check if provider has a getModel method
      if (typeof provider.getModel === "function") {
        mcpLogger.debug(`[${functionTag}] Found getModel method on provider`);
        const model = await provider.getModel();
        return { model };
      }

      mcpLogger.warn(`[${functionTag}] Could not find model on provider`);
      return null;
    } catch (error) {
      mcpLogger.error(
        `[${functionTag}] Error getting model from provider:`,
        error,
      );
      return null;
    }
  }

  /**
   * Sanitize tool name to comply with AI provider requirements
   */
  private sanitizeToolName(name: string): string {
    // Replace any character that's not alphanumeric, underscore, dot, or dash
    // Also ensure it starts with a letter or underscore
    let sanitized = name.replace(/[^a-zA-Z0-9_.-]/g, "_");

    // If it doesn't start with a letter or underscore, prepend an underscore
    if (!/^[a-zA-Z_]/.test(sanitized)) {
      sanitized = "_" + sanitized;
    }

    // Ensure it's not longer than 64 characters
    if (sanitized.length > 64) {
      sanitized = sanitized.substring(0, 64);
    }

    return sanitized;
  }

  /**
   * Convert our tools to AI SDK format with proper execution
   */
  private convertToAISDKTools(
    tools: Tool[],
    toolMap: Map<string, { serverId: string; toolName: string }>,
    context: NeuroLinkExecutionContext,
  ): Record<string, Tool> {
    const functionTag = "FunctionCallingProvider.convertToAISDKTools";
    const convertedTools: Record<string, Tool> = {};
    const sanitizedNameMap = new Map<string, string>(); // Maps sanitized names back to original

    // Convert the toolMap to easily access by index
    const toolInfoArray = Array.from(toolMap.entries());

    tools.forEach((tool, index) => {
      // Use the actual tool name from the map for better debugging
      const [mapKey, toolInfo] = toolInfoArray[index] || [
        `tool_${index}`,
        null,
      ];
      // Use the already sanitized mapKey instead of re-sanitizing the raw toolName
      const sanitizedToolName = mapKey;
      const originalToolName = toolInfo ? toolInfo.toolName : `tool_${index}`;

      // Store the mapping for later reference
      sanitizedNameMap.set(sanitizedToolName, originalToolName);

      // Create a version with actual MCP execution
      convertedTools[sanitizedToolName] = {
        description: tool.description,
        parameters: tool.parameters,
        execute: async (args: Record<string, unknown>) => {
          // Debug logging only in debug mode
          if (process.env.NEUROLINK_DEBUG === "true") {
            const providerName = this.baseProvider.constructor.name;
            mcpLogger.debug(`Tool execution - Provider: ${providerName}`);
            mcpLogger.debug(
              `Tool: ${sanitizedToolName} (original: ${originalToolName})`,
            );
            mcpLogger.debug("Args received:", args);
          }

          mcpLogger.debug(
            `[${functionTag}] Executing MCP tool: ${sanitizedToolName} (original: ${originalToolName}, ${toolInfo?.serverId}.${toolInfo?.toolName})`,
            args,
          );

          try {
            if (toolInfo) {
              const mcpToolName = `${toolInfo.serverId}.${toolInfo.toolName}`;

              // Log execution details in debug mode only
              if (process.env.NEUROLINK_DEBUG === "true") {
                mcpLogger.debug("Calling executeFunctionCall with:", {
                  mcpToolName,
                  args,
                });
              }

              const result = await executeFunctionCall(
                mcpToolName,
                args,
                context,
              );

              if (process.env.NEUROLINK_DEBUG === "true") {
                mcpLogger.debug("Tool execution result:", {
                  success: result.success,
                  hasData: !!result.data,
                  error: result.error,
                });
              }

              mcpLogger.debug(
                `[${functionTag}] Tool execution result for ${sanitizedToolName}:`,
                {
                  success: result.success,
                  hasData: !!result.data,
                  error: result.error,
                },
              );

              if (result.success) {
                return (
                  result.data || {
                    success: true,
                    message: "Tool executed successfully",
                  }
                );
              } else {
                return { error: result.error || "Tool execution failed" };
              }
            }

            // Fallback execution - Tool info not found
            mcpLogger.warn(
              `[${functionTag}] Tool info not found for ${sanitizedToolName}, using fallback`,
            );
            return { success: false, error: "Tool mapping not found" };
          } catch (error) {
            if (process.env.NEUROLINK_DEBUG === "true") {
              mcpLogger.debug("Tool execution error:", error);
            }
            mcpLogger.error(
              `[${functionTag}] Tool execution failed for ${sanitizedToolName}:`,
              error,
            );
            return {
              error: error instanceof Error ? error.message : String(error),
            };
          }
        },
      };
    });

    mcpLogger.debug(
      `[${functionTag}] Converted ${Object.keys(convertedTools).length} tools for AI SDK:`,
      Object.keys(convertedTools),
    );

    // Log first tool details for debugging in debug mode only
    if (process.env.NEUROLINK_DEBUG === "true") {
      const firstToolName = Object.keys(convertedTools)[0];
      if (firstToolName) {
        mcpLogger.debug("First tool details:", {
          name: firstToolName,
          description: convertedTools[firstToolName].description,
          parameters: convertedTools[firstToolName].parameters,
        });
      }
    }

    return convertedTools;
  }

  /**
   * Create function-aware system prompt
   */
  private createFunctionAwareSystemPrompt(
    originalPrompt: string | undefined,
    tools: Array<{ description?: string }>,
  ): string {
    const basePrompt = originalPrompt || "You are a helpful AI assistant.";

    if (tools.length === 0) {
      return basePrompt;
    }

    const functionList = tools
      .map(
        (tool, index) =>
          `${index + 1}. ${tool.description || "No description available"}`,
      )
      .join("\n");

    return `${basePrompt}

IMPORTANT: You have access to ${tools.length} specialized functions that can provide real-time information and capabilities:

${functionList}

CRITICAL INSTRUCTIONS:
- When asked about the current time, date, or timezone, you MUST use the time/date functions
- When asked to list files or access the filesystem, you MUST use the filesystem functions
- When asked about system information, you MUST use the appropriate system functions
- DO NOT say "I cannot access" or "I don't have access" - you DO have access through these functions
- Always use available functions instead of providing placeholder or estimated information

These functions provide accurate, real-time data. Use them actively to enhance your responses.`;
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
 * Create a function-calling enhanced version of any AI provider
 */
export function createFunctionCallingProvider(
  baseProvider: AIProvider,
  options?: {
    enableFunctionCalling?: boolean;
    sessionId?: string;
    userId?: string;
  },
): AIProvider {
  return new FunctionCallingProvider(baseProvider, options);
}

/**
 * Enhanced MCP Provider Factory that creates function-calling enabled providers
 */
export function createMCPAwareProviderV3(
  baseProvider: AIProvider,
  options: {
    providerName?: string;
    modelName?: string;
    enableMCP?: boolean;
    enableFunctionCalling?: boolean;
    sessionId?: string;
    userId?: string;
  } = {},
): AIProvider {
  const functionTag = "createMCPAwareProviderV3";

  // If MCP is disabled, return base provider
  if (options.enableMCP === false) {
    mcpLogger.debug(`[${functionTag}] MCP disabled, returning base provider`);
    return baseProvider;
  }

  // Create function-calling enhanced provider
  const enhancedProvider = createFunctionCallingProvider(baseProvider, {
    enableFunctionCalling: options.enableFunctionCalling,
    sessionId: options.sessionId,
    userId: options.userId,
  });

  mcpLogger.debug(
    `[${functionTag}] Created MCP-aware provider with function calling`,
    {
      providerName: options.providerName,
      enableFunctionCalling: options.enableFunctionCalling !== false,
    },
  );

  return enhancedProvider;
}
