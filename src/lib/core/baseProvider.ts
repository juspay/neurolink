import { z } from "zod";
import type {
  ZodUnknownSchema,
  ValidationSchema,
  StandardRecord,
} from "../types/typeAliases.js";
import type { Tool, LanguageModelV1 } from "ai";
import type {
  AIProvider,
  TextGenerationOptions,
  TextGenerationResult,
  EnhancedGenerateResult,
  AnalyticsData,
  AIProviderName,
  EvaluationData,
} from "../core/types.js";
import { MiddlewareFactory } from "../middleware/factory.js";
import type {
  MiddlewareFactoryOptions,
  MiddlewareConfig,
} from "../middleware/types.js";
import type { StreamOptions, StreamResult } from "../types/streamTypes.js";
import type { JsonValue, JsonObject, UnknownRecord } from "../types/common.js";
import type { ToolDefinition, ToolResult, ToolArgs } from "../types/tools.js";
import { logger } from "../utils/logger.js";
import { DEFAULT_MAX_STEPS, STEP_LIMITS } from "../core/constants.js";
import { directAgentTools } from "../agent/directTools.js";
import { getSafeMaxTokens } from "../utils/tokenLimits.js";
import { createTimeoutController, TimeoutError } from "../utils/timeout.js";
import { shouldDisableBuiltinTools } from "../utils/toolUtils.js";
import { buildMessagesArray } from "../utils/messageBuilder.js";
import type { GenerateResult } from "../types/generateTypes.js";
import type { NeuroLink } from "../neurolink.js";
import type { ExternalMCPToolInfo } from "../types/externalMcp.js";
import { getKeysAsString, getKeyCount } from "../utils/transformationUtils.js";
import {
  validateStreamOptions as validateStreamOpts,
  validateTextGenerationOptions,
  ValidationError,
  createValidationSummary,
} from "../utils/parameterValidation.js";

// Union type for tools that can be either AI SDK tools or external MCP tools
type ExtendedTool = Tool & Partial<ExternalMCPToolInfo>;

// Interface for AI SDK generate result with steps (extends GenerateResult)
interface AISDKGenerateResult extends GenerateResult {
  steps?: Array<{
    toolCalls?: Array<{
      toolName?: string;
      name?: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

/**
 * Abstract base class for all AI providers
 * Tools are integrated as first-class citizens - always available by default
 */
export abstract class BaseProvider implements AIProvider {
  protected readonly modelName: string;
  protected readonly providerName: AIProviderName;
  protected readonly defaultTimeout: number = 30000; // 30 seconds

  // Tools are conditionally included based on centralized configuration
  protected readonly directTools = shouldDisableBuiltinTools()
    ? {}
    : directAgentTools;
  protected mcpTools?: Record<string, Tool>; // MCP tools loaded dynamically when available
  protected customTools?: Map<string, unknown>; // Custom tools from registerTool()
  protected toolExecutor?: (
    toolName: string,
    params: unknown,
  ) => Promise<unknown>; // Tool executor from setupToolExecutor
  protected sessionId?: string;
  protected userId?: string;
  protected neurolink?: NeuroLink; // Reference to actual NeuroLink instance for MCP tools

  constructor(
    modelName?: string,
    providerName?: AIProviderName,
    neurolink?: NeuroLink,
  ) {
    this.modelName = modelName || this.getDefaultModel();
    this.providerName = providerName || this.getProviderName();
    this.neurolink = neurolink;
  }

  /**
   * Check if this provider supports tool/function calling
   * Override in subclasses to disable tools for specific providers or models
   * @returns true by default, providers can override to return false
   */
  supportsTools(): boolean {
    return true;
  }

  // ===================
  // PUBLIC API METHODS
  // ===================

  /**
   * Primary streaming method - implements AIProvider interface
   * When tools are involved, falls back to generate() with synthetic streaming
   */
  async stream(
    optionsOrPrompt: StreamOptions | string,
    analysisSchema?: ValidationSchema,
  ): Promise<StreamResult> {
    const options = this.normalizeStreamOptions(optionsOrPrompt);

    // CRITICAL FIX: Always prefer real streaming over fake streaming
    // Try real streaming first, use fake streaming only as fallback
    try {
      const realStreamResult = await this.executeStream(
        options,
        analysisSchema,
      );

      // If real streaming succeeds, return it (with tools support via Vercel AI SDK)
      return realStreamResult;
    } catch (realStreamError) {
      logger.warn(
        `Real streaming failed for ${this.providerName}, falling back to fake streaming:`,
        realStreamError,
      );

      // Fallback to fake streaming only if real streaming fails AND tools are enabled
      if (!options.disableTools && this.supportsTools()) {
        try {
          // Convert stream options to text generation options
          const textOptions: TextGenerationOptions = {
            prompt: options.input?.text || "",
            systemPrompt: options.systemPrompt,
            temperature: options.temperature,
            maxTokens: options.maxTokens,
            disableTools: false,
            maxSteps: options.maxSteps || 5,
            provider: options.provider as AIProviderName | undefined,
            model: options.model,
            // 🔧 FIX: Include analytics and evaluation options from stream options
            enableAnalytics: options.enableAnalytics,
            enableEvaluation: options.enableEvaluation,
            evaluationDomain: options.evaluationDomain,
            toolUsageContext: options.toolUsageContext,
            context: options.context as Record<string, JsonValue> | undefined,
          };

          const result = await this.generate(textOptions, analysisSchema);

          // Create a synthetic stream from the generate result that simulates progressive delivery
          return {
            stream: (async function* () {
              if (result?.content) {
                // Split content into words for more natural streaming
                const words = result.content.split(/(\s+)/); // Keep whitespace
                let buffer = "";

                for (let i = 0; i < words.length; i++) {
                  buffer += words[i];

                  // Yield chunks of roughly 5-10 words or at punctuation
                  const shouldYield =
                    i === words.length - 1 || // Last word
                    buffer.length > 50 || // Buffer getting long
                    /[.!?;,]\s*$/.test(buffer); // End of sentence/clause

                  if (shouldYield && buffer.trim()) {
                    yield { content: buffer };
                    buffer = "";

                    // Small delay to simulate streaming (1-10ms)
                    await new Promise((resolve) =>
                      setTimeout(resolve, Math.random() * 9 + 1),
                    );
                  }
                }

                // Yield all remaining content
                if (buffer.trim()) {
                  yield { content: buffer };
                }
              }
            })(),
            usage: result?.usage,
            provider: result?.provider,
            model: result?.model,
            toolCalls: result?.toolCalls?.map((call) => ({
              toolName: call.toolName,
              parameters: call.args,
              id: call.toolCallId,
            })),
            toolResults: result?.toolResults
              ? result.toolResults.map((tr) => ({
                  toolName:
                    ((tr as UnknownRecord).toolName as string) || "unknown",
                  status: (((tr as UnknownRecord).status as string) === "error"
                    ? "failure"
                    : "success") as "success" | "failure",
                  result: (tr as UnknownRecord).result,
                  error: (tr as UnknownRecord).error as string | undefined,
                }))
              : undefined,
            // 🔧 FIX: Include analytics and evaluation from generate result
            analytics: result?.analytics,
            evaluation: result?.evaluation,
          };
        } catch (error) {
          logger.error(
            `Fake streaming fallback failed for ${this.providerName}:`,
            error,
          );
          throw this.handleProviderError(error);
        }
      } else {
        // If real streaming failed and no tools are enabled, re-throw the original error
        logger.error(
          `Real streaming failed for ${this.providerName}:`,
          realStreamError,
        );
        throw this.handleProviderError(realStreamError);
      }
    }
  }

  /**
   * Text generation method - implements AIProvider interface
   * Tools are always available unless explicitly disabled
   */
  async generate(
    optionsOrPrompt: TextGenerationOptions | string,
    _analysisSchema?: ValidationSchema,
  ): Promise<EnhancedGenerateResult | null> {
    const options = this.normalizeTextOptions(optionsOrPrompt);

    // Validate options before proceeding
    this.validateOptions(options);

    const startTime = Date.now();

    try {
      // Import generateText dynamically to avoid circular dependencies
      const { generateText } = await import("ai");

      // Get ALL available tools (direct + MCP + external from options)
      const shouldUseTools = !options.disableTools && this.supportsTools();
      const baseTools = shouldUseTools ? await this.getAllTools() : {};
      const tools = shouldUseTools
        ? {
            ...baseTools,
            ...(options.tools || {}), // Include external tools passed from NeuroLink
          }
        : {};
      logger.debug(`[BaseProvider.generate] Tools for ${this.providerName}:`, {
        directTools: getKeyCount(baseTools),
        directToolNames: getKeysAsString(baseTools),
        externalTools: getKeyCount(options.tools || {}),
        externalToolNames: getKeysAsString(options.tools || {}),
        totalTools: getKeyCount(tools),
        totalToolNames: getKeysAsString(tools),
      });

      // EVERY provider uses Vercel AI SDK - no exceptions
      const model = await this.getAISDKModel(); // This method is now REQUIRED

      // Build proper message array with conversation history
      const messages = buildMessagesArray(options);

      const result = await generateText({
        model,
        messages: messages,
        tools,
        maxSteps: options.maxSteps || DEFAULT_MAX_STEPS,
        toolChoice: shouldUseTools ? "auto" : "none",
        temperature: options.temperature,
        maxTokens: options.maxTokens || 8192,
      });

      // Extract tool names from tool calls for tracking
      // AI SDK puts tool calls in steps array for multi-step generation
      const toolsUsed: string[] = [];

      // First check direct tool calls (fallback)
      if (result.toolCalls && result.toolCalls.length > 0) {
        toolsUsed.push(
          ...result.toolCalls.map((tc) => {
            return (
              ((tc as UnknownRecord).toolName as string) ||
              ((tc as UnknownRecord).name as string) ||
              "unknown"
            );
          }),
        );
      }

      // Then check steps for tool calls (primary source for multi-step)
      if (
        (result as unknown as AISDKGenerateResult).steps &&
        Array.isArray((result as unknown as AISDKGenerateResult).steps)
      ) {
        for (const step of (result as unknown as AISDKGenerateResult).steps ||
          []) {
          if (step?.toolCalls && Array.isArray(step.toolCalls)) {
            toolsUsed.push(
              ...step.toolCalls.map((tc) => {
                return tc.toolName || tc.name || "unknown";
              }),
            );
          }
        }
      }

      // Remove duplicates
      const uniqueToolsUsed = [...new Set(toolsUsed)];

      // ✅ Extract tool executions from AI SDK result
      const toolExecutions: Array<{
        name: string;
        input: StandardRecord;
        output: unknown;
      }> = [];

      // Create a map of tool calls to their arguments for matching with results
      const toolCallArgsMap = new Map<string, StandardRecord>();

      // Extract tool executions from AI SDK result steps
      if (
        (result as unknown as AISDKGenerateResult).steps &&
        Array.isArray((result as unknown as AISDKGenerateResult).steps)
      ) {
        for (const step of (result as unknown as AISDKGenerateResult).steps ||
          []) {
          // First, collect tool calls and their arguments
          if (step?.toolCalls && Array.isArray(step.toolCalls)) {
            for (const toolCall of step.toolCalls) {
              const tcRecord = toolCall as UnknownRecord;
              const toolName =
                (tcRecord.toolName as string) ||
                (tcRecord.name as string) ||
                "unknown";
              const toolId =
                (tcRecord.toolCallId as string) ||
                (tcRecord.id as string) ||
                toolName;

              // Extract arguments from tool call
              let callArgs: StandardRecord = {};
              if (tcRecord.args) {
                callArgs = tcRecord.args as StandardRecord;
              } else if (tcRecord.arguments) {
                callArgs = tcRecord.arguments as StandardRecord;
              } else if (tcRecord.parameters) {
                callArgs = tcRecord.parameters as StandardRecord;
              }

              toolCallArgsMap.set(toolId, callArgs);
              toolCallArgsMap.set(toolName, callArgs); // Also map by name as fallback
            }
          }

          // Then, process tool results and match with call arguments
          if (step?.toolResults && Array.isArray(step.toolResults)) {
            for (const toolResult of step.toolResults) {
              const trRecord = toolResult as UnknownRecord;
              const toolName = (trRecord.toolName as string) || "unknown";
              const toolId =
                (trRecord.toolCallId as string) || (trRecord.id as string);

              // Try to get arguments from the tool result first
              let toolArgs: StandardRecord = {};

              if (trRecord.args) {
                toolArgs = trRecord.args as StandardRecord;
              } else if (trRecord.arguments) {
                toolArgs = trRecord.arguments as StandardRecord;
              } else if (trRecord.parameters) {
                toolArgs = trRecord.parameters as StandardRecord;
              } else if (trRecord.input) {
                toolArgs = trRecord.input as StandardRecord;
              } else {
                // Fallback: get arguments from the corresponding tool call
                toolArgs = toolCallArgsMap.get(toolId || toolName) || {};
              }

              toolExecutions.push({
                name: toolName,
                input: toolArgs,
                output: (trRecord.result as unknown) || "success",
              });
            }
          }
        }
      }

      // Format the result with tool executions included
      const enhancedResult: EnhancedGenerateResult = {
        content: result.text,
        usage: {
          inputTokens: result.usage?.promptTokens || 0,
          outputTokens: result.usage?.completionTokens || 0,
          totalTokens: result.usage?.totalTokens || 0,
        },
        provider: this.providerName,
        model: this.modelName,
        toolCalls: result.toolCalls
          ? result.toolCalls.map((tc) => ({
              toolCallId:
                ((tc as UnknownRecord).toolCallId as string) ||
                ((tc as UnknownRecord).id as string) ||
                "unknown",
              toolName:
                ((tc as UnknownRecord).toolName as string) ||
                ((tc as UnknownRecord).name as string) ||
                "unknown",
              args:
                ((tc as UnknownRecord).args as StandardRecord) ||
                ((tc as UnknownRecord).parameters as StandardRecord) ||
                {},
            }))
          : [],
        toolResults: result.toolResults as ToolResult[],
        toolsUsed: uniqueToolsUsed,
        toolExecutions, // ✅ Add extracted tool executions
        availableTools: Object.keys(tools).map((name) => {
          const tool = tools[name] as ExtendedTool;
          return {
            name,
            description: tool.description || "No description available",
            parameters: tool.parameters || {},
            server: tool.serverId || "direct",
          };
        }),
      };

      // Enhanced result with analytics and evaluation
      return await this.enhanceResult(enhancedResult, options, startTime);
    } catch (error) {
      logger.error(`Generate failed for ${this.providerName}:`, error);
      throw this.handleProviderError(error);
    }
  }
  /**
   * Alias for generate method - implements AIProvider interface
   */
  async gen(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: ValidationSchema,
  ): Promise<EnhancedGenerateResult | null> {
    return this.generate(optionsOrPrompt, analysisSchema);
  }

  /**
   * BACKWARD COMPATIBILITY: Legacy generateText method
   * Converts EnhancedGenerateResult to TextGenerationResult format
   * Ensures existing scripts using createAIProvider().generateText() continue to work
   */
  async generateText(
    options: TextGenerationOptions,
  ): Promise<TextGenerationResult> {
    // Validate required parameters for backward compatibility
    if (
      !options.prompt ||
      typeof options.prompt !== "string" ||
      options.prompt.trim() === ""
    ) {
      throw new Error(
        "GenerateText options must include prompt as a non-empty string",
      );
    }

    // Call the main generate method
    const result = await this.generate(options);

    if (!result) {
      throw new Error("Generation failed: No result returned");
    }

    // Convert EnhancedGenerateResult to TextGenerationResult format
    return {
      content: result.content || "",
      provider: result.provider || this.providerName,
      model: result.model || this.modelName,
      usage: result.usage || {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      responseTime: 0, // BaseProvider doesn't track response time directly
      toolsUsed: result.toolsUsed || [],
      enhancedWithTools: !!(result.toolsUsed && result.toolsUsed.length > 0),
      analytics: result.analytics,
      evaluation: result.evaluation,
    };
  }

  // ===================
  // ABSTRACT METHODS - MUST BE IMPLEMENTED BY SUBCLASSES
  // ===================

  /**
   * Provider-specific streaming implementation (only used when tools are disabled)
   */
  protected abstract executeStream(
    options: StreamOptions,
    analysisSchema?: ValidationSchema,
  ): Promise<StreamResult>;

  /**
   * Get the provider name
   */
  protected abstract getProviderName(): AIProviderName;

  /**
   * Get the default model for this provider
   */
  protected abstract getDefaultModel(): string;

  /**
   * REQUIRED: Every provider MUST implement this method
   * Returns the Vercel AI SDK model instance for this provider
   */
  protected abstract getAISDKModel():
    | LanguageModelV1
    | Promise<LanguageModelV1>;

  /**
   * Get AI SDK model with middleware applied
   * This method wraps the base model with any configured middleware
   */
  protected async getAISDKModelWithMiddleware(
    options: TextGenerationOptions | StreamOptions = {},
  ): Promise<LanguageModelV1> {
    // Get the base model
    const baseModel = await this.getAISDKModel();

    // Check if middleware should be applied
    const middlewareOptions = this.extractMiddlewareOptions(options);
    if (!middlewareOptions || this.shouldSkipMiddleware(options)) {
      return baseModel;
    }

    try {
      // Create middleware context
      const context = MiddlewareFactory.createContext(
        this.providerName,
        this.modelName,
        options as Record<string, unknown>,
        {
          sessionId: this.sessionId,
          userId: this.userId,
        },
      );

      // Apply middleware to the model
      const wrappedModel = MiddlewareFactory.applyMiddleware(
        baseModel,
        context,
        middlewareOptions,
      );

      logger.debug(`Applied middleware to ${this.providerName} model`, {
        provider: this.providerName,
        model: this.modelName,
        hasMiddleware: true,
      });

      return wrappedModel;
    } catch (error) {
      logger.warn(
        `Failed to apply middleware to ${this.providerName}, using base model`,
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );

      // Return base model on middleware failure to maintain functionality
      return baseModel;
    }
  }

  /**
   * Extract middleware options from generation options
   */
  private extractMiddlewareOptions(
    options: TextGenerationOptions | StreamOptions,
  ): MiddlewareFactoryOptions | null {
    // Check for middleware configuration in options
    const optionsRecord = options as Record<string, unknown>;
    const middlewareConfig = optionsRecord.middlewareConfig as
      | Record<string, MiddlewareConfig>
      | undefined;
    const enabledMiddleware = optionsRecord.enabledMiddleware as
      | string[]
      | undefined;
    const disabledMiddleware = optionsRecord.disabledMiddleware as
      | string[]
      | undefined;
    const preset = optionsRecord.middlewarePreset as string | undefined;

    // If no middleware configuration is present, return null
    if (
      !middlewareConfig &&
      !enabledMiddleware &&
      !disabledMiddleware &&
      !preset
    ) {
      return null;
    }

    return {
      middlewareConfig,
      enabledMiddleware,
      disabledMiddleware,
      preset,
      global: {
        collectStats: true,
        continueOnError: true,
      },
    };
  }

  /**
   * Determine if middleware should be skipped for this request
   */
  private shouldSkipMiddleware(
    options: TextGenerationOptions | StreamOptions,
  ): boolean {
    // Skip middleware if explicitly disabled
    if ((options as Record<string, unknown>).disableMiddleware === true) {
      return true;
    }

    // Skip middleware for tool-disabled requests to avoid conflicts
    if (options.disableTools === true) {
      return true;
    }

    return false;
  }

  // ===================
  // TOOL MANAGEMENT
  // ===================

  /**
   * Get all available tools - direct tools are ALWAYS available
   * MCP tools are added when available (without blocking)
   */
  protected async getAllTools(): Promise<Record<string, Tool>> {
    const tools: Record<string, Tool> = {
      ...this.directTools, // Always include direct tools
    };

    logger.debug(`[BaseProvider] getAllTools called for ${this.providerName}`, {
      neurolinkAvailable: !!this.neurolink,
      neurolinkType: typeof this.neurolink,
      directToolsCount: getKeyCount(this.directTools),
    });
    logger.debug(
      `[BaseProvider] Direct tools: ${getKeysAsString(this.directTools)}`,
    );

    // Add custom tools from setupToolExecutor if available
    if (this.customTools && this.customTools.size > 0) {
      logger.debug(
        `[BaseProvider] Loading ${this.customTools.size} custom tools from setupToolExecutor`,
      );

      for (const [toolName, toolDef] of this.customTools.entries()) {
        logger.debug(`[BaseProvider] Processing custom tool: ${toolName}`, {
          toolDef: typeof toolDef,
          hasExecute:
            toolDef && typeof toolDef === "object" && "execute" in toolDef,
          hasName: toolDef && typeof toolDef === "object" && "name" in toolDef,
        });

        if (
          toolDef &&
          typeof toolDef === "object" &&
          "execute" in toolDef &&
          typeof (toolDef as StandardRecord).execute === "function"
        ) {
          try {
            const { tool: createAISDKTool } = await import("ai");

            const typedToolDef = toolDef as {
              name: string;
              description?: string;
              inputSchema?: unknown;
              execute: Function;
            };

            tools[toolName] = createAISDKTool({
              description:
                typedToolDef.description || `Custom tool ${toolName}`,
              parameters: z.object({}), // Use empty schema for custom tools
              execute: async (params) => {
                logger.debug(
                  `[BaseProvider] Executing custom tool: ${toolName}`,
                  { params },
                );

                try {
                  // Use the tool executor if available (from setupToolExecutor)
                  let result;
                  if (this.toolExecutor) {
                    result = await this.toolExecutor(toolName, params);
                  } else {
                    result = await typedToolDef.execute(params);
                  }

                  // Log successful execution
                  logger.debug(
                    `[BaseProvider] Tool execution successful: ${toolName}`,
                    {
                      resultType: typeof result,
                      hasResult: result !== null && result !== undefined,
                      toolName,
                    },
                  );

                  return result;
                } catch (error) {
                  logger.warn(
                    `[BaseProvider] Tool execution failed: ${toolName}`,
                    {
                      error:
                        error instanceof Error ? error.message : String(error),
                      params,
                      toolName,
                    },
                  );

                  // GENERIC ERROR HANDLING FOR ALL MCP TOOLS:
                  // Return a generic error object that works with any MCP server
                  // The AI can interpret this and try different approaches
                  return {
                    _neurolinkToolError: true,
                    toolName: toolName,
                    error:
                      error instanceof Error ? error.message : String(error),
                    timestamp: new Date().toISOString(),
                    params: params,
                    // Keep it simple - just indicate an error occurred
                    message: `Error calling ${toolName}: ${error instanceof Error ? error.message : String(error)}`,
                  };
                }
              },
            });

            logger.debug(
              `[BaseProvider] Successfully added custom tool: ${toolName}`,
            );
          } catch (error) {
            logger.error(
              `[BaseProvider] Failed to add custom tool: ${toolName}`,
              error,
            );
          }
        } else {
          logger.warn(
            `[BaseProvider] Invalid custom tool format: ${toolName}`,
            {
              toolDef: typeof toolDef,
              hasExecute:
                toolDef && typeof toolDef === "object" && "execute" in toolDef,
              executeType:
                toolDef && typeof toolDef === "object" && "execute" in toolDef
                  ? typeof (toolDef as StandardRecord).execute
                  : "N/A",
            },
          );
        }
      }
    }

    // Add custom tools from NeuroLink if available
    logger.debug(
      `[BaseProvider] Checking NeuroLink: ${!!this.neurolink}, has getInMemoryServers: ${this.neurolink && typeof this.neurolink.getInMemoryServers}`,
    );
    if (
      this.neurolink &&
      typeof this.neurolink.getInMemoryServers === "function"
    ) {
      logger.debug(
        `[BaseProvider] NeuroLink check passed, loading custom tools`,
      );
      try {
        const inMemoryServers = this.neurolink.getInMemoryServers();
        logger.debug(`[BaseProvider] Got servers:`, inMemoryServers.size);
        logger.debug(
          `[BaseProvider] Loading custom tools from SDK, found ${inMemoryServers.size} servers`,
        );
        if (inMemoryServers && inMemoryServers.size > 0) {
          // Convert in-memory server tools to AI SDK format
          for (const [_serverId, serverConfig] of inMemoryServers) {
            if (serverConfig && serverConfig.tools) {
              // Handle tools array from MCPServerInfo
              const toolEntries = serverConfig.tools.map((tool) => [
                tool.name,
                tool,
              ]);

              for (const [toolName, toolInfo] of toolEntries as [
                string,
                ToolDefinition,
              ][]) {
                if (toolInfo && typeof toolInfo.execute === "function") {
                  logger.debug(
                    `[BaseProvider] Converting custom tool: ${toolName}`,
                  );

                  try {
                    // Convert to AI SDK tool format
                    const { tool: createAISDKTool } = await import("ai");

                    // Validate optional schemas if present (accept Zod or plain JSON schema objects)
                    const isZodSchema = (s: unknown): boolean =>
                      typeof s === "object" &&
                      s !== null &&
                      // Most Zod schemas have an internal _def and a parse method
                      typeof (s as { parse?: unknown }).parse === "function";

                    tools[toolName] = createAISDKTool({
                      description: toolInfo.description || `Tool ${toolName}`,
                      parameters: isZodSchema(toolInfo.parameters)
                        ? (toolInfo.parameters as z.ZodSchema)
                        : z.object({}),
                      execute: async (params) => {
                        const result = await toolInfo.execute(
                          params as ToolArgs,
                        );

                        // Handle MCP-style results
                        if (
                          result &&
                          typeof result === "object" &&
                          "success" in result
                        ) {
                          if (result.success) {
                            return result.data;
                          } else {
                            const errorMsg =
                              typeof result.error === "string"
                                ? result.error
                                : "Tool execution failed";
                            throw new Error(errorMsg);
                          }
                        }
                        return result;
                      },
                    });
                  } catch (toolCreationError) {
                    logger.error(
                      `Failed to create tool: ${toolName}`,
                      toolCreationError,
                    );
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        logger.debug(
          `Failed to load custom tools for ${this.providerName}:`,
          error,
        );
        // Not an error - custom tools are optional
      }
    }

    if (
      this.neurolink &&
      typeof this.neurolink.getExternalMCPTools === "function"
    ) {
      try {
        logger.debug(
          `[BaseProvider] Loading external MCP tools from NeuroLink via direct tool access`,
        );

        const externalTools = this.neurolink.getExternalMCPTools() || [];

        logger.debug(
          `[BaseProvider] Found ${externalTools.length} external MCP tools`,
        );

        for (const tool of externalTools) {
          logger.debug(
            `[BaseProvider] Converting external MCP tool: ${tool.name}`,
          );

          try {
            // Convert to AI SDK tool format
            const { tool: createAISDKTool } = await import("ai");

            tools[tool.name] = createAISDKTool({
              description: tool.description || `External MCP tool ${tool.name}`,
              parameters: await this.convertMCPSchemaToZod(
                tool.inputSchema as StandardRecord | undefined,
              ),
              execute: async (params) => {
                logger.debug(
                  `[BaseProvider] Executing external MCP tool: ${tool.name}`,
                  { params },
                );

                // Execute via NeuroLink's direct tool execution
                if (
                  this.neurolink &&
                  typeof this.neurolink.executeExternalMCPTool === "function"
                ) {
                  return await this.neurolink.executeExternalMCPTool(
                    tool.serverId || "unknown",
                    tool.name,
                    params as JsonObject,
                  );
                } else {
                  throw new Error(
                    `Cannot execute external MCP tool: NeuroLink executeExternalMCPTool not available`,
                  );
                }
              },
            });

            logger.debug(
              `[BaseProvider] Successfully added external MCP tool: ${tool.name}`,
            );
          } catch (toolCreationError) {
            logger.error(
              `Failed to create external MCP tool: ${tool.name}`,
              toolCreationError,
            );
          }
        }

        logger.debug(`[BaseProvider] External MCP tools loading complete`, {
          totalToolsAdded: externalTools.length,
        });
      } catch (error) {
        logger.error(
          `[BaseProvider] Failed to load external MCP tools for ${this.providerName}:`,
          error,
        );
        // Not an error - external tools are optional
      }
    } else {
      logger.debug(`[BaseProvider] No external MCP tool interface available`, {
        hasNeuroLink: !!this.neurolink,
        hasGetExternalMCPTools:
          this.neurolink &&
          typeof this.neurolink.getExternalMCPTools === "function",
      });
    }

    // MCP tools loading simplified - removed functionCalling dependency
    if (!this.mcpTools) {
      // Set empty tools object - MCP tools are handled at a higher level
      this.mcpTools = {};
    }

    // Add MCP tools if available
    if (this.mcpTools) {
      Object.assign(tools, this.mcpTools);
    }

    logger.debug(
      `[BaseProvider] getAllTools returning tools: ${getKeysAsString(tools)}`,
    );

    return tools;
  }

  /**
   * Convert MCP JSON Schema to Zod schema for AI SDK tools
   * Handles common MCP schema patterns safely
   */
  private async convertMCPSchemaToZod(
    inputSchema?: StandardRecord,
  ): Promise<ZodUnknownSchema> {
    const { z } = await import("zod");

    if (!inputSchema || typeof inputSchema !== "object") {
      return z.object({});
    }

    try {
      const schema = inputSchema as StandardRecord;
      const zodFields: Record<string, ZodUnknownSchema> = {};

      // Handle JSON Schema properties
      if (schema.properties && typeof schema.properties === "object") {
        const required = new Set(
          Array.isArray(schema.required) ? schema.required : [],
        );

        for (const [propName, propDef] of Object.entries(schema.properties)) {
          const prop = propDef as StandardRecord;
          let zodType: ZodUnknownSchema;

          // Convert based on JSON Schema type
          switch (prop.type) {
            case "string":
              zodType = z.string();
              if (prop.description && typeof prop.description === "string") {
                zodType = zodType.describe(prop.description);
              }
              break;
            case "number":
            case "integer":
              zodType = z.number();
              if (prop.description && typeof prop.description === "string") {
                zodType = zodType.describe(prop.description);
              }
              break;
            case "boolean":
              zodType = z.boolean();
              if (prop.description && typeof prop.description === "string") {
                zodType = zodType.describe(prop.description);
              }
              break;
            case "array":
              zodType = z.array(z.unknown());
              if (prop.description && typeof prop.description === "string") {
                zodType = zodType.describe(prop.description);
              }
              break;
            case "object":
              zodType = z.object({});
              if (prop.description && typeof prop.description === "string") {
                zodType = zodType.describe(prop.description);
              }
              break;
            default:
              // Unknown type, use string as fallback
              zodType = z.string();
              if (prop.description && typeof prop.description === "string") {
                zodType = zodType.describe(prop.description);
              }
          }

          // Make optional if not required
          if (!required.has(propName)) {
            zodType = zodType.optional();
          }

          zodFields[propName] = zodType;
        }
      }

      return getKeyCount(zodFields) > 0 ? z.object(zodFields) : z.object({});
    } catch (error) {
      logger.warn(
        `Failed to convert MCP schema to Zod, using empty schema:`,
        error,
      );
      return z.object({});
    }
  }

  /**
   * Set session context for MCP tools
   */
  public setSessionContext(sessionId?: string, userId?: string): void {
    this.sessionId = sessionId;
    this.userId = userId;
  }

  /**
   * Provider-specific error handling
   */
  protected abstract handleProviderError(error: unknown): Error;

  // ===================
  // CONSOLIDATED PROVIDER METHODS - MOVED FROM INDIVIDUAL PROVIDERS
  // ===================

  /**
   * Execute operation with timeout and proper cleanup
   * Consolidates identical timeout handling from 8/10 providers
   */
  protected async executeWithTimeout<T>(
    operation: () => Promise<T>,
    options: { timeout?: number | string; operationType?: string },
  ): Promise<T> {
    const timeout = this.getTimeout(
      options as StreamOptions | TextGenerationOptions,
    );
    const timeoutController = createTimeoutController(
      timeout,
      this.providerName,
      (options.operationType as "generate" | "stream") || "generate",
    );

    try {
      if (timeoutController) {
        return await Promise.race([
          operation(),
          new Promise<never>((_, reject) => {
            timeoutController.controller.signal.addEventListener(
              "abort",
              () => {
                reject(
                  new TimeoutError(
                    `${this.providerName} operation timed out`,
                    timeoutController.timeoutMs,
                    this.providerName,
                    (options.operationType as "generate" | "stream") ||
                      "generate",
                  ),
                );
              },
            );
          }),
        ]);
      } else {
        return await operation();
      }
    } finally {
      timeoutController?.cleanup();
    }
  }

  /**
   * Validate stream options - consolidates validation from 7/10 providers
   */
  protected validateStreamOptions(options: StreamOptions): void {
    const validation = validateStreamOpts(options);

    if (!validation.isValid) {
      const summary = createValidationSummary(validation);
      throw new ValidationError(
        `Stream options validation failed: ${summary}`,
        "options",
        "VALIDATION_FAILED",
        validation.suggestions,
      );
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      logger.warn("Stream options validation warnings:", validation.warnings);
    }

    // Additional BaseProvider-specific validation
    if (options.maxSteps !== undefined) {
      if (
        options.maxSteps < STEP_LIMITS.min ||
        options.maxSteps > STEP_LIMITS.max
      ) {
        throw new ValidationError(
          `maxSteps must be between ${STEP_LIMITS.min} and ${STEP_LIMITS.max}`,
          "maxSteps",
          "OUT_OF_RANGE",
          [
            `Use a value between ${STEP_LIMITS.min} and ${STEP_LIMITS.max} for optimal performance`,
          ],
        );
      }
    }
  }

  /**
   * Create text stream transformation - consolidates identical logic from 7/10 providers
   */
  protected createTextStream(result: {
    textStream: AsyncIterable<string>;
  }): AsyncGenerator<{ content: string }> {
    return (async function* () {
      for await (const chunk of result.textStream) {
        yield { content: chunk };
      }
    })();
  }

  /**
   * Create standardized stream result - consolidates result structure
   */
  protected createStreamResult(
    stream: AsyncGenerator<{ content: string }>,
    additionalProps: Partial<StreamResult> = {},
  ): StreamResult {
    return {
      stream,
      provider: this.providerName,
      model: this.modelName,
      ...additionalProps,
    };
  }

  /**
   * Create stream analytics - consolidates analytics from 4/10 providers
   */
  protected async createStreamAnalytics(
    result: UnknownRecord,
    startTime: number,
    options: StreamOptions,
  ): Promise<UnknownRecord | undefined> {
    try {
      const { createAnalytics } = await import("./analytics.js");
      const analytics = createAnalytics(
        this.providerName,
        this.modelName,
        result,
        Date.now() - startTime,
        {
          requestId: `${this.providerName}-stream-${Date.now()}`,
          streamingMode: true,
          ...options.context,
        },
      );
      return analytics as unknown as UnknownRecord;
    } catch (error) {
      logger.warn(`Analytics creation failed for ${this.providerName}:`, error);
      return undefined;
    }
  }

  /**
   * Handle common error patterns - consolidates error handling from multiple providers
   */
  protected handleCommonErrors(error: unknown): Error | null {
    if (error instanceof TimeoutError) {
      return new Error(
        `${this.providerName} request timed out after ${error.timeout}ms. Consider increasing timeout or using a lighter model.`,
      );
    }

    const message = error instanceof Error ? error.message : String(error);

    // Common API key errors
    if (
      message.includes("API_KEY_INVALID") ||
      message.includes("Invalid API key") ||
      message.includes("authentication") ||
      message.includes("unauthorized")
    ) {
      return new Error(
        `Invalid API key for ${this.providerName}. Please check your API key environment variable.`,
      );
    }

    // Common rate limit errors
    if (
      message.includes("rate limit") ||
      message.includes("quota") ||
      message.includes("429")
    ) {
      return new Error(
        `Rate limit exceeded for ${this.providerName}. Please wait before making more requests.`,
      );
    }

    return null; // Not a common error, let provider handle it
  }

  /**
   * Set up tool executor for a provider to enable actual tool execution
   * Consolidates identical setupToolExecutor logic from neurolink.ts (used in 4 places)
   * @param sdk - The NeuroLinkSDK instance for tool execution
   * @param functionTag - Function name for logging
   */
  setupToolExecutor(
    sdk: {
      customTools: Map<string, unknown>;
      executeTool: (toolName: string, params: unknown) => Promise<unknown>;
    },
    functionTag: string,
  ): void {
    // Store custom tools for use in getAllTools()
    this.customTools = sdk.customTools;
    this.toolExecutor = sdk.executeTool;

    logger.debug(`[${functionTag}] Setting up tool executor for provider`, {
      providerType: this.constructor.name,
      availableCustomTools: sdk.customTools.size,
      customToolsStored: !!this.customTools,
      toolExecutorStored: !!this.toolExecutor,
    });

    // Note: Tool execution will be handled through getAllTools() -> AI SDK tools
    // The custom tools are converted to AI SDK format in getAllTools() method
  }

  // ===================
  // TEMPLATE METHODS - COMMON FUNCTIONALITY
  // ===================

  protected normalizeTextOptions(
    optionsOrPrompt: TextGenerationOptions | string,
  ): TextGenerationOptions {
    if (typeof optionsOrPrompt === "string") {
      const safeMaxTokens = getSafeMaxTokens(this.providerName, this.modelName);
      return {
        prompt: optionsOrPrompt,
        provider: this.providerName,
        model: this.modelName,
        maxTokens: safeMaxTokens,
      };
    }

    // Handle both prompt and input.text formats
    const prompt = optionsOrPrompt.prompt || optionsOrPrompt.input?.text || "";
    const modelName = optionsOrPrompt.model || this.modelName;
    const providerName = optionsOrPrompt.provider || this.providerName;

    // Apply safe maxTokens based on provider and model
    const safeMaxTokens = getSafeMaxTokens(
      providerName,
      modelName,
      optionsOrPrompt.maxTokens,
    );

    return {
      ...optionsOrPrompt,
      prompt,
      provider: providerName,
      model: modelName,
      maxTokens: safeMaxTokens,
    };
  }

  protected normalizeStreamOptions(
    optionsOrPrompt: StreamOptions | string,
  ): StreamOptions {
    if (typeof optionsOrPrompt === "string") {
      const safeMaxTokens = getSafeMaxTokens(this.providerName, this.modelName);
      return {
        input: { text: optionsOrPrompt },
        provider: this.providerName,
        model: this.modelName,
        maxTokens: safeMaxTokens,
      };
    }

    const modelName = optionsOrPrompt.model || this.modelName;
    const providerName = optionsOrPrompt.provider || this.providerName;

    // Apply safe maxTokens based on provider and model
    const safeMaxTokens = getSafeMaxTokens(
      providerName,
      modelName,
      optionsOrPrompt.maxTokens,
    );

    return {
      ...optionsOrPrompt,
      provider: providerName,
      model: modelName,
      maxTokens: safeMaxTokens,
    };
  }

  protected async enhanceResult(
    result: EnhancedGenerateResult,
    options: TextGenerationOptions,
    startTime: number,
  ): Promise<EnhancedGenerateResult> {
    const responseTime = Date.now() - startTime;
    let enhancedResult = { ...result };

    if (options.enableAnalytics) {
      try {
        logger.debug(`Creating analytics for ${this.providerName}...`);
        const analytics = await this.createAnalytics(
          result,
          responseTime,
          options,
        );
        logger.debug(`Analytics created:`, analytics);
        enhancedResult = { ...enhancedResult, analytics };
      } catch (error) {
        logger.warn(
          `Analytics creation failed for ${this.providerName}:`,
          error,
        );
      }
    }

    if (options.enableEvaluation) {
      try {
        const evaluation = await this.createEvaluation(result, options);
        enhancedResult = { ...enhancedResult, evaluation };
      } catch (error) {
        logger.warn(
          `Evaluation creation failed for ${this.providerName}:`,
          error,
        );
      }
    }

    return enhancedResult;
  }

  protected async createAnalytics(
    result: EnhancedGenerateResult,
    responseTime: number,
    options: TextGenerationOptions,
  ): Promise<AnalyticsData> {
    const { createAnalytics } = await import("./analytics.js");
    return createAnalytics(
      this.providerName,
      this.modelName,
      result,
      responseTime,
      options.context,
    );
  }

  protected async createEvaluation(
    result: EnhancedGenerateResult,
    options: TextGenerationOptions,
  ): Promise<EvaluationData> {
    const { evaluateResponse } = await import("../core/evaluation.js");
    const evaluation = await evaluateResponse(result.content, options.prompt);
    return evaluation as EvaluationData;
  }

  protected validateOptions(options: TextGenerationOptions): void {
    const validation = validateTextGenerationOptions(options);

    if (!validation.isValid) {
      const summary = createValidationSummary(validation);
      throw new ValidationError(
        `Text generation options validation failed: ${summary}`,
        "options",
        "VALIDATION_FAILED",
        validation.suggestions,
      );
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      logger.warn(
        "Text generation options validation warnings:",
        validation.warnings,
      );
    }

    // Additional BaseProvider-specific validation
    if (options.maxSteps !== undefined) {
      if (
        options.maxSteps < STEP_LIMITS.min ||
        options.maxSteps > STEP_LIMITS.max
      ) {
        throw new ValidationError(
          `maxSteps must be between ${STEP_LIMITS.min} and ${STEP_LIMITS.max}`,
          "maxSteps",
          "OUT_OF_RANGE",
          [
            `Use a value between ${STEP_LIMITS.min} and ${STEP_LIMITS.max} for optimal performance`,
          ],
        );
      }
    }
  }

  protected getProviderInfo(): { provider: string; model: string } {
    return {
      provider: this.providerName,
      model: this.modelName,
    };
  }
  /**
   * Get timeout value in milliseconds
   */
  public getTimeout(options: TextGenerationOptions | StreamOptions): number {
    if (!options.timeout) {
      return this.defaultTimeout;
    }

    if (typeof options.timeout === "number") {
      return options.timeout;
    }

    // Parse string timeout (e.g., '30s', '2m', '1h')
    const timeoutStr = options.timeout.toLowerCase();
    const value = parseInt(timeoutStr);

    if (timeoutStr.includes("h")) {
      return value * 60 * 60 * 1000;
    } else if (timeoutStr.includes("m")) {
      return value * 60 * 1000;
    } else if (timeoutStr.includes("s")) {
      return value * 1000;
    }

    return this.defaultTimeout;
  }

  /**
   * Utility method to chunk large prompts into smaller pieces
   * @param prompt The prompt to chunk
   * @param maxChunkSize Maximum size per chunk (default: 900,000 characters)
   * @param overlap Overlap between chunks to maintain context (default: 100 characters)
   * @returns Array of prompt chunks
   */
  static chunkPrompt(
    prompt: string,
    maxChunkSize: number = 900000,
    overlap: number = 100,
  ): string[] {
    if (prompt.length <= maxChunkSize) {
      return [prompt];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < prompt.length) {
      const end = Math.min(start + maxChunkSize, prompt.length);
      chunks.push(prompt.slice(start, end));

      // Break if we've reached the end
      if (end >= prompt.length) {
        break;
      }

      // Move start forward, accounting for overlap
      const nextStart = end - overlap;

      // Ensure we make progress (avoid infinite loops)
      if (nextStart <= start) {
        start = end;
      } else {
        start = Math.max(nextStart, 0);
      }
    }

    return chunks;
  }
}
