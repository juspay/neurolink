import { z } from "zod";
import type { ZodType, ZodTypeDef } from "zod";
import type { Schema } from "ai";
import type { Tool, LanguageModelV1 } from "ai";
import type {
  AIProvider,
  TextGenerationOptions,
  EnhancedGenerateResult,
  AnalyticsData,
  AIProviderName,
  EvaluationData,
} from "../core/types.js";
import type { StreamOptions, StreamResult } from "../types/streamTypes.js";
import type { JsonValue, UnknownRecord } from "../types/common.js";
import type { ToolCall, ToolResult } from "../types/tools.js";
import type { TokenUsage } from "../types/providers.js";
import { logger } from "../utils/logger.js";
import { SYSTEM_LIMITS, DEFAULT_MAX_STEPS } from "../core/constants.js";
import { directAgentTools } from "../agent/directTools.js";
import { getSafeMaxTokens } from "../utils/tokenLimits.js";
import { createTimeoutController, TimeoutError } from "../utils/timeout.js";
import { shouldDisableBuiltinTools } from "../utils/toolUtils.js";

// Type definition for JSON Schema objects
interface JSONSchemaProperty {
  type?: string;
  description?: string;
  enum?: unknown[];
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  [key: string]: unknown;
}

interface JSONSchema {
  type?: string;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  [key: string]: unknown;
}

// Interface for AI SDK generate result with steps
interface AISDKGenerateResult {
  text: string;
  toolCalls?: Array<{
    toolName?: string;
    name?: string;
    [key: string]: unknown;
  }>;
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
// Dynamic imports to break circular dependency
// import { evaluateResponse } from "../core/evaluation.js";
// import { getAvailableFunctionTools } from "../mcp/functionCalling.js";
// Analytics helper will be dynamically imported when needed

/**
 * Interface for SDK with in-memory MCP servers
 */
export interface NeuroLinkSDK {
  getInMemoryServers?: () => Map<
    string,
    {
      server: {
        title?: string;
        description?: string;
        tools?: Map<string, ToolInfo> | Record<string, ToolInfo>;
      };
      category?: string;
      metadata?: UnknownRecord;
    }
  >;
  getAllAvailableTools?: () => Promise<
    Array<{
      name: string;
      toolName?: string;
      description?: string;
      inputSchema?: unknown;
      serverId?: string;
      category?: string;
    }>
  >;
  executeTool?: (toolName: string, args: unknown) => Promise<unknown>;
}

/**
 * Interface for tool information in MCP servers
 */
interface ToolInfo {
  description?: string;
  inputSchema?: ZodType<JsonValue>;
  parameters?: ZodType<JsonValue>;
  execute: (
    args: JsonValue,
  ) => Promise<JsonValue | ToolResult> | JsonValue | ToolResult;
  isImplemented?: boolean;
  metadata?: UnknownRecord;
}

/**
 * Validates if a result contains a valid toolsObject structure
 * @param result - The result object to validate
 * @returns true if the result contains a valid toolsObject, false otherwise
 */
function isValidToolsObject(
  result: UnknownRecord,
): result is UnknownRecord & { toolsObject: Record<string, unknown> } {
  return (
    result !== null &&
    typeof result === "object" &&
    "toolsObject" in result &&
    result.toolsObject !== null &&
    typeof result.toolsObject === "object" &&
    Object.keys(result.toolsObject as Record<string, unknown>).length > 0
  );
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
  protected sessionId?: string;
  protected userId?: string;
  protected sdk?: NeuroLinkSDK; // Reference to NeuroLink SDK instance for custom tools

  constructor(
    modelName?: string,
    providerName?: AIProviderName,
    sdk?: NeuroLinkSDK,
  ) {
    this.modelName = modelName || this.getDefaultModel();
    this.providerName = providerName || this.getProviderName();
    this.sdk = sdk;
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
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
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
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<EnhancedGenerateResult | null> {
    const options = this.normalizeTextOptions(optionsOrPrompt);
    const startTime = Date.now();

    try {
      // Import generateText dynamically to avoid circular dependencies
      const { generateText } = await import("ai");

      // Get ALL available tools (direct + MCP when available)
      const shouldUseTools = !options.disableTools && this.supportsTools();

      logger.debug(`[BaseProvider] Tools check for ${this.providerName}:`, {
        disableTools: options.disableTools,
        supportsTools: this.supportsTools(),
        shouldUseTools,
      });

      const tools = shouldUseTools ? await this.getAllTools() : {};

      logger.debug(
        `[BaseProvider.generate] Tools for ${this.providerName}: ${Object.keys(tools).join(", ")}`,
      );

      // EVERY provider uses Vercel AI SDK - no exceptions
      const model = await this.getAISDKModel(); // This method is now REQUIRED

      const result = await generateText({
        model,
        prompt: options.prompt || options.input?.text || "",
        system: options.systemPrompt,
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
        input: Record<string, unknown>;
        output: unknown;
        duration: number;
      }> = [];

      // Extract tool executions from AI SDK result steps

      // Extract tool executions from steps (where tool results are stored)
      if (
        (result as unknown as AISDKGenerateResult).steps &&
        Array.isArray((result as unknown as AISDKGenerateResult).steps)
      ) {
        for (const step of (result as unknown as AISDKGenerateResult).steps ||
          []) {
          // Focus only on tool results (which have complete execution data)
          // Tool calls are just the requests, tool results contain the actual execution data
          if (step?.toolResults && Array.isArray(step.toolResults)) {
            for (const toolResult of step.toolResults) {
              const trRecord = toolResult as UnknownRecord;

              toolExecutions.push({
                name: (trRecord.toolName as string) || "unknown",
                input: (trRecord.args as Record<string, unknown>) || {},
                output: (trRecord.result as unknown) || "success",
                duration: 0, // AI SDK doesn't track duration
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
                ((tc as UnknownRecord).args as Record<string, unknown>) ||
                ((tc as UnknownRecord).parameters as Record<string, unknown>) ||
                {},
            }))
          : [],
        toolResults: result.toolResults as ToolResult[],
        toolsUsed: uniqueToolsUsed,
        toolExecutions, // ✅ Add extracted tool executions
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
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<EnhancedGenerateResult | null> {
    return this.generate(optionsOrPrompt, analysisSchema);
  }

  // ===================
  // ABSTRACT METHODS - MUST BE IMPLEMENTED BY SUBCLASSES
  // ===================

  /**
   * Provider-specific streaming implementation (only used when tools are disabled)
   */
  protected abstract executeStream(
    options: StreamOptions,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
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
      sdkAvailable: !!this.sdk,
      sdkType: typeof this.sdk,
      directToolsCount: Object.keys(this.directTools).length,
    });
    logger.debug(
      `[BaseProvider] Direct tools: ${Object.keys(this.directTools).join(", ")}`,
    );

    // Add custom tools from SDK if available
    logger.debug(
      `[BaseProvider] Checking SDK: ${!!this.sdk}, has getInMemoryServers: ${this.sdk && typeof this.sdk.getInMemoryServers}`,
    );
    if (this.sdk && typeof this.sdk.getInMemoryServers === "function") {
      logger.debug(`[BaseProvider] SDK check passed, loading custom tools`);
      try {
        const inMemoryServers = this.sdk.getInMemoryServers!();
        logger.debug(`[BaseProvider] Got servers:`, inMemoryServers.size);
        logger.debug(
          `[BaseProvider] Loading custom tools from SDK, found ${inMemoryServers.size} servers`,
        );
        if (inMemoryServers && inMemoryServers.size > 0) {
          // Convert in-memory server tools to AI SDK format
          for (const [serverId, serverConfig] of inMemoryServers) {
            const server = serverConfig.server;
            if (server && server.tools) {
              // Handle both Map and object formats
              const toolEntries =
                server.tools instanceof Map
                  ? Array.from(server.tools.entries())
                  : Object.entries(server.tools || {});

              for (const [toolName, toolInfo] of toolEntries as [
                string,
                ToolInfo,
              ][]) {
                if (toolInfo && typeof toolInfo.execute === "function") {
                  logger.debug(
                    `[BaseProvider] Converting custom tool: ${toolName}`,
                  );

                  try {
                    // Convert to AI SDK tool format
                    const { tool: createAISDKTool } = await import("ai");

                    tools[toolName] = createAISDKTool({
                      description: toolInfo.description || `Tool ${toolName}`,
                      parameters:
                        toolInfo.inputSchema ||
                        toolInfo.parameters ||
                        z.object({}),
                      execute: async (args) => {
                        const result = await toolInfo.execute(args);

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

    // Load MCP tools from SDK if available
    if (this.sdk && typeof this.sdk.getAllAvailableTools === "function") {
      logger.debug(`[BaseProvider] Loading MCP tools from SDK`);
      try {
        const availableTools = await this.sdk.getAllAvailableTools();
        logger.debug(`[BaseProvider] Found ${availableTools.length} MCP tools`);

        // Convert MCP tools to AI SDK format
        const { tool: createAISDKTool } = await import("ai");

        for (const mcpTool of availableTools) {
          try {
            const toolName = mcpTool.name || mcpTool.toolName;
            if (!toolName) {
              continue;
            }

            logger.debug(`[BaseProvider] Converting MCP tool: ${toolName}`);

            // Create proper Zod schema for tool parameters
            let parameterSchema;
            try {
              if (
                mcpTool.inputSchema &&
                typeof mcpTool.inputSchema === "object"
              ) {
                // Convert MCP input schema to Zod schema
                parameterSchema = z.object({});
                const schema = mcpTool.inputSchema as JSONSchema;
                if (schema.properties) {
                  const zodProps: Record<string, z.ZodTypeAny> = {};
                  for (const [propName, propDef] of Object.entries(
                    schema.properties,
                  )) {
                    // Simple type mapping - can be enhanced
                    if (propDef.type === "string") {
                      zodProps[propName] = z.string().optional();
                    } else if (propDef.type === "number") {
                      zodProps[propName] = z.number().optional();
                    } else if (propDef.type === "boolean") {
                      zodProps[propName] = z.boolean().optional();
                    } else {
                      zodProps[propName] = z.unknown().optional();
                    }
                  }
                  parameterSchema = z.object(zodProps);
                }
              } else {
                parameterSchema = z.object({});
              }
            } catch (schemaError) {
              logger.debug(
                `[BaseProvider] Failed to convert schema for ${toolName}, using empty schema:`,
                schemaError,
              );
              parameterSchema = z.object({});
            }

            tools[toolName] = createAISDKTool({
              description: mcpTool.description || `MCP tool: ${toolName}`,
              parameters: parameterSchema,
              execute: async (args) => {
                logger.debug(
                  `[BaseProvider] Executing MCP tool: ${toolName}`,
                  args,
                );

                // Execute via toolRegistry
                if (this.sdk && typeof this.sdk.executeTool === "function") {
                  const result = await this.sdk.executeTool(toolName, args);
                  logger.debug(
                    `[BaseProvider] MCP tool ${toolName} result:`,
                    result,
                  );
                  return result;
                }

                throw new Error(
                  `Cannot execute MCP tool ${toolName}: SDK not available`,
                );
              },
            });

            logger.debug(
              `[BaseProvider] Successfully converted MCP tool: ${toolName}`,
            );
          } catch (toolConversionError) {
            logger.error(
              `[BaseProvider] Failed to convert MCP tool: ${mcpTool.name}`,
              toolConversionError,
            );
          }
        }
      } catch (error) {
        logger.debug(
          `[BaseProvider] Failed to load MCP tools: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Legacy MCP tools support (keep for compatibility)
    if (!this.mcpTools) {
      this.mcpTools = {};
    }
    if (this.mcpTools) {
      Object.assign(tools, this.mcpTools);
    }

    logger.debug(
      `[BaseProvider] getAllTools returning tools: ${Object.keys(tools).join(", ")}`,
    );

    return tools;
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
    if (!options.input?.text || options.input.text.trim().length === 0) {
      throw new Error("Input text is required and cannot be empty");
    }

    if (options.temperature !== undefined) {
      if (options.temperature < 0 || options.temperature > 2) {
        throw new Error("temperature must be between 0 and 2");
      }
    }

    if (options.maxTokens !== undefined) {
      if (options.maxTokens < 1) {
        throw new Error("maxTokens must be at least 1");
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
      const analytics = await createAnalytics(
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
    // Type guard to check for setToolExecutor method
    function hasSetToolExecutor(obj: unknown): obj is {
      setToolExecutor: (
        executor: (toolName: string, params: unknown) => Promise<unknown>,
      ) => void;
    } {
      return (
        typeof obj === "object" &&
        obj !== null &&
        typeof (obj as { setToolExecutor?: unknown }).setToolExecutor ===
          "function"
      );
    }

    if (!hasSetToolExecutor(this)) {
      logger.warn(
        `[${functionTag}] Provider does not support setToolExecutor - tools will not be executed`,
        {
          hasProvider: true,
          providerType: this.constructor.name,
          availableCustomTools: sdk.customTools.size,
        },
      );
      return;
    }

    logger.debug(`[${functionTag}] Setting up tool executor for provider`, {
      providerType: this.constructor.name,
      availableCustomTools: sdk.customTools.size,
    });

    // Set up tool executor to handle actual tool calls
    this.setToolExecutor(async (toolName: string, params: unknown) => {
      logger.debug(
        `[${functionTag}] AI provider requesting tool execution: ${toolName}`,
        {
          toolName,
          params,
          availableCustomTools: sdk.customTools.size,
          hasRequestedTool: sdk.customTools.has(toolName),
        },
      );

      try {
        // Execute the tool using NeuroLink's executeTool method
        const result = await sdk.executeTool(toolName, params);

        logger.debug(
          `[${functionTag}] Tool execution successful: ${toolName}`,
          {
            toolName,
            result:
              typeof result === "object"
                ? JSON.stringify(result).substring(0, 200)
                : result,
            resultType: typeof result,
          },
        );

        return result;
      } catch (error) {
        logger.error(`[${functionTag}] Tool execution failed: ${toolName}`, {
          toolName,
          error: error instanceof Error ? error.message : String(error),
          params,
        });
        throw error;
      }
    });
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
    // 🔧 EDGE CASE: Basic prompt validation
    if (!options.prompt || options.prompt.trim().length === 0) {
      throw new Error("Prompt is required and cannot be empty");
    }

    // 🔧 EDGE CASE: Handle very large prompts (>1M characters)
    if (options.prompt.length > SYSTEM_LIMITS.MAX_PROMPT_LENGTH) {
      throw new Error(
        `Prompt too large: ${options.prompt.length} characters (max: ${SYSTEM_LIMITS.MAX_PROMPT_LENGTH}). Consider breaking into smaller chunks. Use BaseProvider.chunkPrompt(prompt, maxSize, overlap) static method for chunking.`,
      );
    }

    // 🔧 EDGE CASE: Validate token limits
    if (options.maxTokens && options.maxTokens > 200000) {
      throw new Error(
        `Max tokens too high: ${options.maxTokens} (recommended max: 200,000). This may cause timeouts or API errors.`,
      );
    }

    if (options.maxTokens && options.maxTokens < 1) {
      throw new Error("Max tokens must be at least 1");
    }

    // 🔧 EDGE CASE: Validate temperature range
    if (options.temperature !== undefined) {
      if (options.temperature < 0 || options.temperature > 2) {
        throw new Error(
          `Temperature must be between 0 and 2, got: ${options.temperature}`,
        );
      }
    }

    // 🔧 EDGE CASE: Validate timeout values
    if (options.timeout !== undefined) {
      const timeoutMs =
        typeof options.timeout === "string"
          ? parseInt(options.timeout, 10)
          : options.timeout;

      if (isNaN(timeoutMs) || timeoutMs < 1000) {
        throw new Error(
          `Timeout must be at least 1000ms (1 second), got: ${options.timeout}`,
        );
      }

      if (timeoutMs > SYSTEM_LIMITS.LONG_TIMEOUT_WARNING) {
        logger.warn(
          `⚠️ Very long timeout: ${timeoutMs}ms. This may cause the CLI to hang.`,
        );
      }
    }

    // 🔧 EDGE CASE: Validate maxSteps for tool execution
    if (options.maxSteps !== undefined && options.maxSteps > 20) {
      throw new Error(
        `Max steps too high: ${options.maxSteps} (recommended max: 20). This may cause long execution times.`,
      );
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
