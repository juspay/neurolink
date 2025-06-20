/**
 * Enhanced AI Provider with Real Function Calling Support
 * Integrates MCP tools directly with AI SDK's function calling capabilities
 * This is the missing piece that enables true AI function calling!
 */

import type {
  AIProvider,
  TextGenerationOptions,
  StreamTextOptions,
} from "../core/types.js";
import {
  generateText as aiGenerateText,
  streamText as aiStreamText,
  Output,
  type GenerateTextResult,
  type StreamTextResult,
  type ToolSet,
  type Schema,
  type Tool,
} from "ai";
import type { ZodType, ZodTypeDef } from "zod";
import {
  getAvailableFunctionTools,
  executeFunctionCall,
  isFunctionCallingAvailable,
} from "../mcp/function-calling.js";
import { createExecutionContext } from "../mcp/context-manager.js";
import type { NeuroLinkExecutionContext } from "../mcp/factory.js";
import { mcpLogger } from "../mcp/logging.js";

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
   * Generate text with real function calling support
   */
  async generateText(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<GenerateTextResult<ToolSet, unknown> | null> {
    const options =
      typeof optionsOrPrompt === "string"
        ? { prompt: optionsOrPrompt }
        : optionsOrPrompt;

    const functionTag = "FunctionCallingProvider.generateText";

    // If function calling is disabled, use base provider
    if (!this.enableFunctionCalling) {
      mcpLogger.debug(
        `[${functionTag}] Function calling disabled, using base provider`,
      );
      return this.baseProvider.generateText(options, analysisSchema);
    }

    try {
      // Check if function calling is available
      const functionsAvailable = await isFunctionCallingAvailable();
      if (!functionsAvailable) {
        mcpLogger.debug(
          `[${functionTag}] No functions available, using base provider`,
        );
        return this.baseProvider.generateText(options, analysisSchema);
      }

      // Get available function tools
      const { tools, toolMap } = await getAvailableFunctionTools();
      if (tools.length === 0) {
        mcpLogger.debug(
          `[${functionTag}] No tools available, using base provider`,
        );
        return this.baseProvider.generateText(options, analysisSchema);
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

      // Use the AI SDK's native function calling by calling generateText directly
      // We need to get the underlying model from the base provider
      const result = await this.generateTextWithTools(
        options,
        tools,
        toolMap,
        context,
        analysisSchema,
      );

      if (!result) {
        return null;
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
      return enhancedResult as GenerateTextResult<ToolSet, unknown>;
    } catch (error) {
      mcpLogger.warn(
        `[${functionTag}] Function calling failed, using base provider:`,
        error,
      );
      return this.baseProvider.generateText(options, analysisSchema);
    }
  }

  /**
   * Generate text using AI SDK's native function calling
   */
  private async generateTextWithTools(
    options: TextGenerationOptions,
    tools: Tool[],
    toolMap: Map<string, { serverId: string; toolName: string }>,
    context: NeuroLinkExecutionContext,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<GenerateTextResult<ToolSet, unknown> | null> {
    const functionTag = "FunctionCallingProvider.generateTextWithTools";

    try {
      // Convert our tools to AI SDK format with proper execution
      const toolsWithExecution = this.convertToAISDKTools(
        tools,
        toolMap,
        context,
      );

      mcpLogger.debug(
        `[${functionTag}] Calling AI SDK generateText with ${Object.keys(toolsWithExecution).length} tools and maxSteps: 5`,
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
        return this.baseProvider.generateText(options, analysisSchema);
      }

      // Use AI SDK's generateText directly with tools
      const generateOptions: Parameters<typeof aiGenerateText>[0] = {
        model: modelInfo.model,
        prompt: options.prompt,
        system: options.systemPrompt || "You are a helpful AI assistant.",
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 500,
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

      const result = await aiGenerateText(generateOptions);

      mcpLogger.debug(`[${functionTag}] AI SDK generateText completed`, {
        toolCalls: result.toolCalls?.length || 0,
        finishReason: result.finishReason,
        usage: result.usage,
      });

      return result;
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
          // Enhanced debug logging for Gemini debugging
          const providerName = this.baseProvider.constructor.name;
          console.log(`[GEMINI DEBUG] Provider: ${providerName}`);
          console.log(
            `[GEMINI DEBUG] Tool: ${sanitizedToolName} (original: ${originalToolName})`,
          );
          console.log(
            `[GEMINI DEBUG] Args received:`,
            JSON.stringify(args, null, 2),
          );
          console.log(`[GEMINI DEBUG] Args type:`, typeof args);
          console.log(`[GEMINI DEBUG] Args keys:`, Object.keys(args));

          mcpLogger.debug(
            `[${functionTag}] Executing MCP tool: ${sanitizedToolName} (original: ${originalToolName}, ${toolInfo?.serverId}.${toolInfo?.toolName})`,
            args,
          );

          try {
            if (toolInfo) {
              const mcpToolName = `${toolInfo.serverId}.${toolInfo.toolName}`;

              // Log exactly what we're sending to executeFunctionCall
              console.log(`[GEMINI DEBUG] Calling executeFunctionCall with:`);
              console.log(`[GEMINI DEBUG] - mcpToolName:`, mcpToolName);
              console.log(`[GEMINI DEBUG] - args:`, args);

              const result = await executeFunctionCall(
                mcpToolName,
                args,
                context,
              );

              console.log(`[GEMINI DEBUG] Tool execution result:`, {
                success: result.success,
                hasData: !!result.data,
                error: result.error,
                data: result.data,
              });

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
            console.log(`[GEMINI DEBUG] Tool execution error:`, error);
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

    // Log first tool details for debugging
    const firstToolName = Object.keys(convertedTools)[0];
    if (firstToolName) {
      console.log(`[GEMINI DEBUG] First tool details:`);
      console.log(`[GEMINI DEBUG] - Name:`, firstToolName);
      console.log(
        `[GEMINI DEBUG] - Description:`,
        convertedTools[firstToolName].description,
      );
      console.log(
        `[GEMINI DEBUG] - Parameters:`,
        convertedTools[firstToolName].parameters,
      );
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
   * Stream text with function calling support
   */
  async streamText(
    optionsOrPrompt: StreamTextOptions | string,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<StreamTextResult<ToolSet, unknown> | null> {
    const options =
      typeof optionsOrPrompt === "string"
        ? { prompt: optionsOrPrompt }
        : optionsOrPrompt;

    const functionTag = "FunctionCallingProvider.streamText";

    // If function calling is disabled, use base provider
    if (!this.enableFunctionCalling) {
      mcpLogger.debug(
        `[${functionTag}] Function calling disabled, using base provider`,
      );
      return this.baseProvider.streamText(options, analysisSchema);
    }

    try {
      // Check if function calling is available
      const functionsAvailable = await isFunctionCallingAvailable();
      if (!functionsAvailable) {
        mcpLogger.debug(
          `[${functionTag}] No functions available, using base provider`,
        );
        return this.baseProvider.streamText(options, analysisSchema);
      }

      // Get available function tools
      const { tools } = await getAvailableFunctionTools();
      if (tools.length === 0) {
        mcpLogger.debug(
          `[${functionTag}] No tools available, using base provider`,
        );
        return this.baseProvider.streamText(options, analysisSchema);
      }

      mcpLogger.debug(
        `[${functionTag}] Streaming with ${tools.length} functions available`,
      );

      // Enhance system prompt
      const enhancedSystemPrompt = this.createFunctionAwareSystemPrompt(
        options.systemPrompt,
        tools,
      );

      // Stream with enhanced prompt
      return this.baseProvider.streamText(
        {
          ...options,
          systemPrompt: enhancedSystemPrompt,
        },
        analysisSchema,
      );
    } catch (error) {
      mcpLogger.warn(
        `[${functionTag}] Function calling failed, using base provider:`,
        error,
      );
      return this.baseProvider.streamText(options, analysisSchema);
    }
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
