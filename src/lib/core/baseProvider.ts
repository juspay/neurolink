import { z } from "zod";
import type {
  ZodUnknownSchema,
  ValidationSchema,
  StandardRecord,
} from "../types/typeAliases.js";
import type { Tool, LanguageModelV1, CoreMessage } from "ai";
import { generateText } from "ai";
import type {
  AIProvider,
  TextGenerationOptions,
  TextGenerationResult,
  EnhancedGenerateResult,
  AnalyticsData,
  AIProviderName,
  ExtendedTool,
  AISDKGenerateResult,
} from "../types/index.js";
import type { EvaluationData } from "../index.js";
import { MiddlewareFactory } from "../middleware/factory.js";
import type { MiddlewareFactoryOptions } from "../types/middlewareTypes.js";
import type { StreamOptions, StreamResult } from "../types/streamTypes.js";
import type { JsonValue, JsonObject, UnknownRecord } from "../types/common.js";
import type { ToolResult, ToolArgs } from "../types/tools.js";
import type { TextContent, ImageContent } from "../types/content.js";
import { logger } from "../utils/logger.js";
import { DEFAULT_MAX_STEPS, STEP_LIMITS } from "../core/constants.js";
import { directAgentTools } from "../agent/directTools.js";
import { getSafeMaxTokens } from "../utils/tokenLimits.js";
import { createTimeoutController, TimeoutError } from "../utils/timeout.js";
import { shouldDisableBuiltinTools } from "../utils/toolUtils.js";
import {
  buildMessagesArray,
  buildMultimodalMessagesArray,
} from "../utils/messageBuilder.js";
import type { NeuroLink } from "../neurolink.js";
import { getKeysAsString, getKeyCount } from "../utils/transformationUtils.js";
import {
  validateStreamOptions as validateStreamOpts,
  validateTextGenerationOptions,
  ValidationError,
  createValidationSummary,
} from "../utils/parameterValidation.js";
import { convertJsonSchemaToZod } from "../utils/schemaConversion.js";
import {
  recordProviderPerformanceFromMetrics,
  getPerformanceOptimizedProvider,
} from "./evaluationProviders.js";
import { modelConfig } from "./modelConfiguration.js";

// Provider types moved to ../types/providers.js

/**
 * Multimodal input type for options that may contain images or content arrays
 */
type MultimodalInput = {
  text: string;
  images?: Array<Buffer | string>;
  content?: Array<TextContent | ImageContent>;
};

/**
 * Tool call object interface for type-safe access to tool call properties
 */
interface ToolCallObject extends UnknownRecord {
  toolName?: string;
  name?: string;
  toolCallId?: string;
  id?: string;
  args?: UnknownRecord;
  arguments?: UnknownRecord;
  parameters?: UnknownRecord;
}

/**
 * Abstract base class for all AI providers
 * Tools are integrated as first-class citizens - always available by default
 */
export abstract class BaseProvider implements AIProvider {
  protected readonly modelName: string;
  protected readonly providerName: AIProviderName;
  protected readonly defaultTimeout: number = 30000; // 30 seconds
  protected middlewareOptions?: MiddlewareFactoryOptions; // TODO: Implement global level middlewares that can be used

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
    middleware?: MiddlewareFactoryOptions,
  ) {
    this.modelName = modelName || this.getDefaultModel();
    this.providerName = providerName || this.getProviderName();
    this.neurolink = neurolink;
    this.middlewareOptions = middleware;
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

    logger.info(`Starting stream`, {
      provider: this.providerName,
      hasTools: !options.disableTools && this.supportsTools(),
      disableTools: !!options.disableTools,
      supportsTools: this.supportsTools(),
      inputLength: options.input?.text?.length || 0,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      timestamp: Date.now(),
    });

    // CRITICAL FIX: Always prefer real streaming over fake streaming
    // Try real streaming first, use fake streaming only as fallback
    try {
      logger.debug(`Attempting real streaming`, {
        provider: this.providerName,
        timestamp: Date.now(),
      });

      const realStreamResult = await this.executeStream(
        options,
        analysisSchema,
      );

      logger.info(`Real streaming succeeded`, {
        provider: this.providerName,
        timestamp: Date.now(),
      });

      // If real streaming succeeds, return it (with tools support via Vercel AI SDK)
      return realStreamResult;
    } catch (realStreamError) {
      logger.warn(
        `Real streaming failed for ${this.providerName}, falling back to fake streaming:`,
        {
          error:
            realStreamError instanceof Error
              ? realStreamError.message
              : String(realStreamError),
          timestamp: Date.now(),
        },
      );

      // Fallback to fake streaming only if real streaming fails AND tools are enabled
      if (!options.disableTools && this.supportsTools()) {
        try {
          logger.info(`Starting fake streaming with tools`, {
            provider: this.providerName,
            supportsTools: this.supportsTools(),
            timestamp: Date.now(),
          });

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

          logger.debug(`Calling generate for fake streaming`, {
            provider: this.providerName,
            maxSteps: textOptions.maxSteps,
            disableTools: textOptions.disableTools,
            timestamp: Date.now(),
          });

          const result = await this.generate(textOptions, analysisSchema);

          logger.info(`Generate completed for fake streaming`, {
            provider: this.providerName,
            hasContent: !!result?.content,
            contentLength: result?.content?.length || 0,
            toolsUsed: result?.toolsUsed?.length || 0,
            timestamp: Date.now(),
          });

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
                    await new Promise((resolve, reject) => {
                      const timeoutId = setTimeout(
                        resolve,
                        Math.random() * 9 + 1,
                      );
                      // Handle potential timeout issues
                      if (!timeoutId) {
                        reject(new Error("Failed to create timeout"));
                      }
                    }).catch((err) => {
                      logger.error("Error in streaming delay:", err);
                    });
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
   * Prepare generation context including tools and model
   */
  private async prepareGenerationContext(
    options: TextGenerationOptions,
  ): Promise<{
    tools: Record<string, Tool>;
    model: LanguageModelV1;
  }> {
    const shouldUseTools = !options.disableTools && this.supportsTools();
    const baseTools = shouldUseTools ? await this.getAllTools() : {};
    const tools = shouldUseTools
      ? {
          ...baseTools,
          ...(options.tools || {}),
        }
      : {};

    logger.debug(`Final tools prepared for AI`, {
      provider: this.providerName,
      directTools: getKeyCount(baseTools),
      directToolNames: getKeysAsString(baseTools),
      externalTools: getKeyCount(options.tools || {}),
      externalToolNames: getKeysAsString(options.tools || {}),
      totalTools: getKeyCount(tools),
      totalToolNames: getKeysAsString(tools),
      shouldUseTools,
      timestamp: Date.now(),
    });

    const model = await this.getAISDKModelWithMiddleware(options);
    return { tools, model };
  }

  /**
   * Build messages array for generation
   */
  private async buildMessages(
    options: TextGenerationOptions,
  ): Promise<CoreMessage[]> {
    const hasMultimodalInput = (opts: TextGenerationOptions): boolean => {
      const input = opts.input as MultimodalInput | undefined;
      const hasImages = !!input?.images?.length;
      const hasContent = !!input?.content?.length;
      return hasImages || hasContent;
    };

    let messages;
    if (hasMultimodalInput(options)) {
      if (process.env.NEUROLINK_DEBUG === "true") {
        logger.debug(
          "Detected multimodal input, using multimodal message builder",
        );
      }

      const input = options.input as MultimodalInput | undefined;
      const multimodalOptions = {
        input: {
          text: options.prompt || options.input?.text || "",
          images: input?.images,
          content: input?.content,
        },
        provider: options.provider,
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        systemPrompt: options.systemPrompt,
        enableAnalytics: options.enableAnalytics,
        enableEvaluation: options.enableEvaluation,
        context: options.context,
      };

      messages = await buildMultimodalMessagesArray(
        multimodalOptions,
        this.providerName,
        this.modelName,
      );
    } else {
      if (process.env.NEUROLINK_DEBUG === "true") {
        logger.debug(
          "No multimodal input detected, using standard message builder",
        );
      }
      messages = buildMessagesArray(options);
    }

    // Convert messages to Vercel AI SDK format
    return messages.map((msg) => {
      if (typeof msg.content === "string") {
        return {
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content,
        } as CoreMessage;
      } else {
        return {
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content.map((item) => {
            if (item.type === "text") {
              return { type: "text", text: item.text || "" };
            } else if (item.type === "image") {
              return { type: "image", image: item.image || "" };
            }
            return item;
          }),
        } as CoreMessage;
      }
    });
  }

  /**
   * Execute the generation with AI SDK
   */
  private async executeGeneration(
    model: LanguageModelV1,
    messages: CoreMessage[],
    tools: Record<string, Tool>,
    options: TextGenerationOptions,
  ): Promise<Awaited<ReturnType<typeof generateText>>> {
    const shouldUseTools = !options.disableTools && this.supportsTools();

    return await generateText({
      model,
      messages,
      tools,
      maxSteps: options.maxSteps || DEFAULT_MAX_STEPS,
      toolChoice: shouldUseTools ? "auto" : "none",
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      onStepFinish: ({ toolCalls, toolResults }) => {
        logger.info("Tool execution completed", { toolResults, toolCalls });

        // Handle tool execution storage
        this.handleToolExecutionStorage(toolCalls, toolResults, options).catch(
          (error: unknown) => {
            logger.warn("[BaseProvider] Failed to store tool executions", {
              provider: this.providerName,
              error: error instanceof Error ? error.message : String(error),
            });
          },
        );
      },
    });
  }

  /**
   * Log generation completion information
   */
  private logGenerationComplete(
    generateResult: Awaited<ReturnType<typeof generateText>>,
  ): void {
    logger.debug(`generateText completed`, {
      provider: this.providerName,
      model: this.modelName,
      responseLength: generateResult.text?.length || 0,
      toolResultsCount: generateResult.toolResults?.length || 0,
      finishReason: generateResult.finishReason,
      usage: generateResult.usage,
      timestamp: Date.now(),
    });
  }

  /**
   * Record performance metrics
   */
  private async recordPerformanceMetrics(
    usage:
      | { promptTokens: number; completionTokens: number; totalTokens: number }
      | undefined,
    responseTime: number,
  ): Promise<void> {
    try {
      const actualCost = await this.calculateActualCost(
        usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      );

      recordProviderPerformanceFromMetrics(this.providerName, {
        responseTime,
        tokensGenerated: usage?.totalTokens || 0,
        cost: actualCost,
        success: true,
      });

      const optimizedProvider = getPerformanceOptimizedProvider("speed");
      logger.debug(`🚀 Performance recorded for ${this.providerName}:`, {
        responseTime: `${responseTime}ms`,
        tokens: usage?.totalTokens || 0,
        estimatedCost: `$${actualCost.toFixed(6)}`,
        recommendedSpeedProvider: optimizedProvider?.provider || "none",
      });
    } catch (perfError) {
      logger.warn("⚠️ Performance recording failed:", perfError);
    }
  }

  /**
   * Extract tool information from generation result
   */
  private extractToolInformation(
    generateResult: Awaited<ReturnType<typeof generateText>>,
  ): {
    toolsUsed: string[];
    toolExecutions: Array<{
      name: string;
      input: StandardRecord;
      output: unknown;
    }>;
  } {
    const toolsUsed: string[] = [];
    const toolExecutions: Array<{
      name: string;
      input: StandardRecord;
      output: unknown;
    }> = [];

    // Extract tool names from tool calls
    if (generateResult.toolCalls && generateResult.toolCalls.length > 0) {
      toolsUsed.push(
        ...generateResult.toolCalls.map((tc: ToolCallObject) => {
          return tc.toolName || tc.name || "unknown";
        }),
      );
    }

    // Extract from steps
    if (
      (generateResult as unknown as AISDKGenerateResult).steps &&
      Array.isArray((generateResult as unknown as AISDKGenerateResult).steps)
    ) {
      const toolCallArgsMap = new Map<string, StandardRecord>();

      for (const step of (generateResult as unknown as AISDKGenerateResult)
        .steps || []) {
        // Collect tool calls and their arguments
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

            toolsUsed.push(toolName);

            let callArgs: StandardRecord = {};
            if (tcRecord.args) {
              callArgs = tcRecord.args as StandardRecord;
            } else if (tcRecord.arguments) {
              callArgs = tcRecord.arguments as StandardRecord;
            } else if (tcRecord.parameters) {
              callArgs = tcRecord.parameters as StandardRecord;
            }

            toolCallArgsMap.set(toolId, callArgs);
            toolCallArgsMap.set(toolName, callArgs);
          }
        }

        // Process tool results
        if (step?.toolResults && Array.isArray(step.toolResults)) {
          for (const toolResult of step.toolResults) {
            const trRecord = toolResult as UnknownRecord;
            const toolName = (trRecord.toolName as string) || "unknown";
            const toolId =
              (trRecord.toolCallId as string) || (trRecord.id as string);

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

    return { toolsUsed: [...new Set(toolsUsed)], toolExecutions };
  }

  /**
   * Format the enhanced result
   */
  private formatEnhancedResult(
    generateResult: Awaited<ReturnType<typeof generateText>>,
    tools: Record<string, Tool>,
    toolsUsed: string[],
    toolExecutions: Array<{
      name: string;
      input: StandardRecord;
      output: unknown;
    }>,
  ): EnhancedGenerateResult {
    return {
      content: generateResult.text,
      usage: {
        input: generateResult.usage?.promptTokens || 0,
        output: generateResult.usage?.completionTokens || 0,
        total: generateResult.usage?.totalTokens || 0,
      },
      provider: this.providerName,
      model: this.modelName,
      toolCalls: generateResult.toolCalls
        ? generateResult.toolCalls.map((tc: ToolCallObject) => ({
            toolCallId: tc.toolCallId || "unknown",
            toolName: tc.toolName || "unknown",
            args: tc.args || {},
          }))
        : [],
      toolResults: (generateResult.toolResults as ToolResult[]) || [],
      toolsUsed,
      toolExecutions,
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
  }

  /**
   * Analyze AI response structure and log detailed debugging information
   * Extracted from generate method to reduce complexity
   */
  private analyzeAIResponse(result: Record<string, unknown>): void {
    // 🔧 NEUROLINK RAW AI RESPONSE TRACE: Log everything about the raw AI response before parameter extraction
    logger.debug("NeuroLink Raw AI Response Analysis", {
      provider: this.providerName,
      model: this.modelName,
      responseTextLength: (result.text as string)?.length || 0,
      responsePreview: (result.text as string)?.substring(0, 500) + "...",
      finishReason: result.finishReason,
      usage: result.usage,
    });

    // 🔧 NEUROLINK TOOL CALLS ANALYSIS: Analyze raw tool calls structure
    const toolCallsAnalysis = {
      hasToolCalls: !!result.toolCalls,
      toolCallsLength: (result.toolCalls as unknown[])?.length || 0,
      toolCalls:
        (result.toolCalls as unknown[])?.map((toolCall, index) => {
          const tcRecord = toolCall as Record<string, unknown>;
          const toolName = tcRecord.toolName || tcRecord.name || "unknown";
          const isTargetTool =
            toolName.toString().includes("SuccessRateSRByTime") ||
            toolName.toString().includes("juspay-analytics");
          return {
            index: index + 1,
            toolName,
            toolId: tcRecord.toolCallId || tcRecord.id || "none",
            hasArgs: !!tcRecord.args,
            argsKeys:
              tcRecord.args && typeof tcRecord.args === "object"
                ? Object.keys(tcRecord.args as Record<string, unknown>)
                : [],
            isTargetTool,
            ...(isTargetTool && {
              targetToolDetails: {
                argsType: typeof tcRecord.args,
                startTime:
                  (tcRecord.args as Record<string, unknown>)?.startTime ||
                  "MISSING",
                endTime:
                  (tcRecord.args as Record<string, unknown>)?.endTime ||
                  "MISSING",
              },
            }),
          };
        }) || [],
    };
    logger.debug("Tool Calls Analysis", toolCallsAnalysis);

    // 🔧 NEUROLINK STEPS ANALYSIS: Analyze steps structure (AI SDK multi-step format)
    const steps = result.steps;
    const stepsAnalysis = {
      hasSteps: !!steps,
      stepsLength: Array.isArray(steps) ? steps.length : 0,
      steps: Array.isArray(steps)
        ? steps.map((step, stepIndex) => ({
            stepIndex: stepIndex + 1,
            hasToolCalls: !!step.toolCalls,
            toolCallsLength: step.toolCalls?.length || 0,
            hasToolResults: !!step.toolResults,
            toolResultsLength: step.toolResults?.length || 0,
            targetToolsInStep:
              step.toolCalls
                ?.filter((tc: Record<string, unknown>) => {
                  const toolName = tc.toolName || tc.name || "unknown";
                  return (
                    toolName.toString().includes("SuccessRateSRByTime") ||
                    toolName.toString().includes("juspay-analytics")
                  );
                })
                .map((tc: Record<string, unknown>) => ({
                  toolName: tc.toolName || tc.name,
                  hasArgs: !!tc.args,
                  argsKeys:
                    tc.args && typeof tc.args === "object"
                      ? Object.keys(tc.args as Record<string, unknown>)
                      : [],
                  startTime: (tc.args as Record<string, unknown>)?.startTime,
                  endTime: (tc.args as Record<string, unknown>)?.endTime,
                })) || [],
          }))
        : [],
    };
    logger.debug("[BaseProvider] Steps Analysis", stepsAnalysis);

    // 🔧 NEUROLINK TOOL RESULTS ANALYSIS: Analyze top-level tool results
    const toolResultsAnalysis = {
      hasToolResults: !!result.toolResults,
      toolResultsLength: (result.toolResults as unknown[])?.length || 0,
      toolResults:
        (result.toolResults as unknown[])?.map((toolResult, index) => ({
          index: index + 1,
          toolName:
            (toolResult as Record<string, unknown>).toolName || "unknown",
          hasResult: !!(toolResult as Record<string, unknown>).result,
          hasError: !!(toolResult as Record<string, unknown>).error,
        })) || [],
    };
    logger.debug("[BaseProvider] Tool Results Analysis", toolResultsAnalysis);
    logger.debug("[BaseProvider] NeuroLink Raw AI Response Analysis Complete");
  }

  /**
   * Text generation method - implements AIProvider interface
   * Tools are always available unless explicitly disabled
   * IMPLEMENTATION NOTE: Uses streamText() under the hood and accumulates results
   * for consistency and better performance
   */
  async generate(
    optionsOrPrompt: TextGenerationOptions | string,
    _analysisSchema?: ValidationSchema,
  ): Promise<EnhancedGenerateResult | null> {
    const options = this.normalizeTextOptions(optionsOrPrompt);
    this.validateOptions(options);
    const startTime = Date.now();

    try {
      const { tools, model } = await this.prepareGenerationContext(options);
      const messages = await this.buildMessages(options);
      const generateResult = await this.executeGeneration(
        model,
        messages,
        tools,
        options,
      );

      this.analyzeAIResponse(
        generateResult as unknown as Record<string, unknown>,
      );
      this.logGenerationComplete(generateResult);

      const responseTime = Date.now() - startTime;
      await this.recordPerformanceMetrics(generateResult.usage, responseTime);

      const { toolsUsed, toolExecutions } =
        this.extractToolInformation(generateResult);
      const enhancedResult = this.formatEnhancedResult(
        generateResult,
        tools,
        toolsUsed,
        toolExecutions,
      );

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
    // Validate required parameters for backward compatibility - support both prompt and input.text
    const promptText = options.prompt || options.input?.text;
    if (
      !promptText ||
      typeof promptText !== "string" ||
      promptText.trim() === ""
    ) {
      throw new Error(
        "GenerateText options must include prompt or input.text as a non-empty string",
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
        input: 0,
        output: 0,
        total: 0,
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
   * TODO: Implement global level middlewares that can be used
   */
  protected async getAISDKModelWithMiddleware(
    options: TextGenerationOptions | StreamOptions = {},
  ): Promise<LanguageModelV1> {
    // Get the base model
    const baseModel = await this.getAISDKModel();

    logger.debug(`Retrieved base model for ${this.providerName}`, {
      provider: this.providerName,
      model: this.modelName,
      hasMiddlewareConfig: !!this.middlewareOptions,
      timestamp: Date.now(),
    });

    // Check if middleware should be applied
    const middlewareOptions = this.extractMiddlewareOptions(options);

    logger.debug(`Middleware extraction result`, {
      provider: this.providerName,
      model: this.modelName,
      middlewareOptions,
    });

    if (!middlewareOptions) {
      return baseModel;
    }

    try {
      logger.debug(`Applying middleware to ${this.providerName} model`, {
        provider: this.providerName,
        model: this.modelName,
        middlewareOptions,
      });
      // Create a new factory instance with the specified options
      const factory = new MiddlewareFactory(middlewareOptions);

      // Create middleware context
      const context = factory.createContext(
        this.providerName,
        this.modelName,
        options as Record<string, unknown>,
        {
          sessionId: this.sessionId,
          userId: this.userId,
        },
      );

      // Apply middleware to the model
      const wrappedModel = factory.applyMiddleware(
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
   * Extract middleware options from generation options. This is the single
   * source of truth for deciding if middleware should be applied.
   */
  private extractMiddlewareOptions(
    options: TextGenerationOptions | StreamOptions,
  ): MiddlewareFactoryOptions | null {
    // 1. Determine effective middleware config: per-request overrides global.
    const middlewareOpts =
      (options as { middleware?: MiddlewareFactoryOptions }).middleware ??
      this.middlewareOptions;
    if (!middlewareOpts) {
      return null;
    }

    // 2. The middleware property must be an object with configuration.
    if (typeof middlewareOpts !== "object" || middlewareOpts === null) {
      return null;
    }

    // 3. Check if the middleware object has any actual configuration keys.
    const fullOpts = middlewareOpts as MiddlewareFactoryOptions;
    const hasArray = (arr?: unknown[]) => Array.isArray(arr) && arr.length > 0;
    const hasConfig =
      !!fullOpts.middlewareConfig ||
      hasArray(fullOpts.enabledMiddleware) ||
      hasArray(fullOpts.disabledMiddleware) ||
      !!fullOpts.preset ||
      hasArray(fullOpts.middleware);

    if (!hasConfig) {
      return null;
    }

    // 4. Return the formatted options if configuration is present.
    return {
      ...fullOpts,
      global: {
        collectStats: true,
        continueOnError: true,
        ...(fullOpts.global || {}),
      },
    };
  }

  // ===================
  // TOOL MANAGEMENT
  // ===================

  /**
   * Check if a schema is a Zod schema
   */
  private isZodSchema(schema: unknown): boolean {
    return (
      typeof schema === "object" &&
      schema !== null &&
      // Most Zod schemas have an internal _def and a parse method
      typeof (schema as { parse?: unknown }).parse === "function"
    );
  }

  /**
   * Convert tool execution result from MCP format to standard format
   * Handles tool failures gracefully to prevent stream termination
   */
  private async convertToolResult(result: unknown): Promise<unknown> {
    // Handle MCP-style results
    if (result && typeof result === "object" && "success" in result) {
      const mcpResult = result as {
        success: boolean;
        data?: unknown;
        error?: unknown;
      };
      if (mcpResult.success) {
        return mcpResult.data;
      } else {
        // Instead of throwing, return a structured error result
        // This prevents tool failures from terminating streams
        const errorMsg =
          typeof mcpResult.error === "string"
            ? mcpResult.error
            : "Tool execution failed";

        // Log the error for debugging but don't throw
        logger.warn(`Tool execution failed: ${errorMsg}`);

        // Return error as structured data that can be processed by the AI
        return {
          isError: true,
          error: errorMsg,
          content: [
            {
              type: "text",
              text: `Tool execution failed: ${errorMsg}`,
            },
          ],
        };
      }
    }
    return result;
  }

  /**
   * Create a custom tool from tool definition
   */
  private async createCustomToolFromDefinition(
    toolName: string,
    toolInfo: {
      execute: (params: ToolArgs) => Promise<unknown>;
      description?: string;
      parameters?: unknown;
      inputSchema?: unknown;
    },
  ): Promise<Tool | null> {
    try {
      logger.debug(`[BaseProvider] Converting custom tool: ${toolName}`);

      // Convert to AI SDK tool format
      const { tool: createAISDKTool } = await import("ai");
      const { z } = await import("zod");

      let finalSchema: z.ZodSchema;
      const schemaSource = toolInfo.parameters || toolInfo.inputSchema;

      if (this.isZodSchema(schemaSource)) {
        finalSchema = schemaSource as z.ZodSchema;
        logger.debug(
          `[BaseProvider] ${toolName}: Using existing Zod schema from ${toolInfo.parameters ? "parameters" : "inputSchema"} field`,
        );
      } else if (schemaSource && typeof schemaSource === "object") {
        logger.debug(
          `[BaseProvider] ${toolName}: Converting JSON Schema to Zod from ${toolInfo.parameters ? "parameters" : "inputSchema"} field`,
        );
        finalSchema = convertJsonSchemaToZod(
          schemaSource as Record<string, unknown>,
        );
      } else {
        finalSchema = z.object({});
        logger.debug(
          `[BaseProvider] ${toolName}: No schema found, using empty object`,
        );
      }

      return createAISDKTool({
        description: toolInfo.description || `Tool ${toolName}`,
        parameters: finalSchema,
        execute: async (params) => {
          const startTime = Date.now();
          let executionId: string | undefined;

          if (this.neurolink?.emitToolStart) {
            executionId = this.neurolink.emitToolStart(
              toolName,
              params,
              startTime,
            );
            logger.debug(
              `Custom tool:start emitted via NeuroLink for ${toolName}`,
              {
                toolName,
                executionId,
                input: params,
                hasNativeEmission: true,
              },
            );
          }

          try {
            // 🔧 PARAMETER FLOW TRACING - Before NeuroLink executeTool call
            logger.debug(
              `About to call NeuroLink executeTool for ${toolName}`,
              {
                toolName,
                paramsBeforeExecution: {
                  type: typeof params,
                  isNull: params === null,
                  isUndefined: params === undefined,
                  isEmpty:
                    params &&
                    typeof params === "object" &&
                    Object.keys(params as object).length === 0,
                  keys:
                    params && typeof params === "object"
                      ? Object.keys(params as object)
                      : "NOT_OBJECT",
                  keysLength:
                    params && typeof params === "object"
                      ? Object.keys(params as object).length
                      : 0,
                },
                executorInfo: {
                  hasExecutor: typeof toolInfo.execute === "function",
                  executorType: typeof toolInfo.execute,
                },
                timestamp: Date.now(),
                phase: "BEFORE_NEUROLINK_EXECUTE",
              },
            );

            const result = await toolInfo.execute(params as ToolArgs);

            // 🔧 PARAMETER FLOW TRACING - After NeuroLink executeTool call
            logger.debug(`NeuroLink executeTool completed for ${toolName}`, {
              toolName,
              resultInfo: {
                type: typeof result,
                isNull: result === null,
                isUndefined: result === undefined,
                hasError:
                  result && typeof result === "object" && "error" in result,
              },
              timestamp: Date.now(),
              phase: "AFTER_NEUROLINK_EXECUTE",
            });

            const convertedResult = await this.convertToolResult(result);
            const endTime = Date.now();

            // 🔧 NATIVE NEUROLINK EVENT EMISSION - Tool End (Success)
            if (this.neurolink?.emitToolEnd) {
              this.neurolink.emitToolEnd(
                toolName,
                convertedResult,
                undefined, // no error
                startTime,
                endTime,
                executionId,
              );
              logger.debug(
                `Custom tool:end emitted via NeuroLink for ${toolName}`,
                {
                  toolName,
                  executionId,
                  duration: endTime - startTime,
                  hasResult: convertedResult !== undefined,
                  hasNativeEmission: true,
                },
              );
            }

            return convertedResult;
          } catch (error) {
            const endTime = Date.now();
            const errorMsg =
              error instanceof Error ? error.message : String(error);

            // 🔧 NATIVE NEUROLINK EVENT EMISSION - Tool End (Error)
            if (this.neurolink?.emitToolEnd) {
              this.neurolink.emitToolEnd(
                toolName,
                undefined, // no result
                errorMsg,
                startTime,
                endTime,
                executionId,
              );
              logger.info(
                `Custom tool:end error emitted via NeuroLink for ${toolName}`,
                {
                  toolName,
                  executionId,
                  duration: endTime - startTime,
                  error: errorMsg,
                  hasNativeEmission: true,
                },
              );
            }
            throw error;
          }
        },
      });
    } catch (toolCreationError) {
      logger.error(`Failed to create tool: ${toolName}`, toolCreationError);
      return null;
    }
  }

  /**
   * Process direct tools with event emission wrapping
   */
  private async processDirectTools(tools: Record<string, Tool>): Promise<void> {
    if (!this.directTools || Object.keys(this.directTools).length === 0) {
      return;
    }

    logger.debug(
      `Loading ${Object.keys(this.directTools).length} direct tools with event emission`,
    );

    for (const [toolName, directTool] of Object.entries(this.directTools)) {
      logger.debug(`Processing direct tool: ${toolName}`, {
        toolName,
        hasExecute:
          directTool &&
          typeof directTool === "object" &&
          "execute" in directTool,
        hasDescription:
          directTool &&
          typeof directTool === "object" &&
          "description" in directTool,
      });

      // Wrap the direct tool's execute function with event emission
      if (
        directTool &&
        typeof directTool === "object" &&
        "execute" in directTool
      ) {
        const originalExecute = (
          directTool as { execute: (params: unknown) => Promise<unknown> }
        ).execute;

        // Create a new tool with wrapped execute function
        tools[toolName] = {
          ...(directTool as Tool),
          execute: async (params: unknown) => {
            // 🔧 EMIT TOOL START EVENT - Bedrock-compatible format
            if (this.neurolink?.getEventEmitter) {
              const emitter = this.neurolink.getEventEmitter();
              emitter.emit("tool:start", { tool: toolName, input: params });
              logger.debug(`Direct tool:start event emitted for ${toolName}`, {
                toolName,
                input: params,
                hasEmitter: !!emitter,
              });
            }

            try {
              const result = await originalExecute(params);

              // 🔧 EMIT TOOL END EVENT - Bedrock-compatible format
              if (this.neurolink?.getEventEmitter) {
                const emitter = this.neurolink.getEventEmitter();
                emitter.emit("tool:end", { tool: toolName, result });
                logger.debug(`Direct tool:end event emitted for ${toolName}`, {
                  toolName,
                  result:
                    typeof result === "string"
                      ? result.substring(0, 100)
                      : JSON.stringify(result).substring(0, 100),
                  hasEmitter: !!emitter,
                });
              }

              return result;
            } catch (error) {
              // 🔧 EMIT TOOL END EVENT FOR ERROR - Bedrock-compatible format
              if (this.neurolink?.getEventEmitter) {
                const emitter = this.neurolink.getEventEmitter();
                const errorMsg =
                  error instanceof Error ? error.message : String(error);
                emitter.emit("tool:end", { tool: toolName, error: errorMsg });
                logger.debug(
                  `Direct tool:end error event emitted for ${toolName}`,
                  {
                    toolName,
                    error: errorMsg,
                    hasEmitter: !!emitter,
                  },
                );
              }
              throw error;
            }
          },
        } as Tool;
      } else {
        // Fallback: include tool as-is if it doesn't have execute function
        tools[toolName] = directTool as Tool;
      }
    }

    logger.debug(`Direct tools processing complete`, {
      directToolsProcessed: Object.keys(this.directTools).length,
    });
  }

  /**
   * Process custom tools from setupToolExecutor
   */
  private async processCustomTools(tools: Record<string, Tool>): Promise<void> {
    if (!this.customTools || this.customTools.size === 0) {
      return;
    }

    logger.debug(
      `[BaseProvider] Loading ${this.customTools.size} custom tools from setupToolExecutor`,
    );

    for (const [toolName, toolDef] of this.customTools.entries()) {
      logger.debug(`Processing custom tool: ${toolName}`, {
        toolDef: typeof toolDef,
        hasExecute:
          toolDef && typeof toolDef === "object" && "execute" in toolDef,
        hasName: toolDef && typeof toolDef === "object" && "name" in toolDef,
      });

      // Validate tool definition has required execute function
      const toolInfo =
        (toolDef as Record<string, unknown> | undefined) ||
        ({} as Record<string, unknown>);
      if (toolInfo && typeof toolInfo.execute === "function") {
        const tool = await this.createCustomToolFromDefinition(
          toolName,
          toolInfo as {
            execute: (params: ToolArgs) => Promise<unknown>;
            description?: string;
            parameters?: unknown;
            inputSchema?: unknown; // Support MCPExecutableTool format
          },
        );
        if (tool) {
          tools[toolName] = tool;
        }
      }
    }

    logger.debug(`[BaseProvider] Custom tools processing complete`, {
      customToolsProcessed: this.customTools.size,
    });
  }

  /**
   * Create an external MCP tool
   */
  private async createExternalMCPTool(tool: {
    name: string;
    description?: string;
    inputSchema?: StandardRecord;
    serverId?: string;
  }): Promise<Tool | null> {
    try {
      logger.debug(`[BaseProvider] Converting external MCP tool: ${tool.name}`);

      // Convert to AI SDK tool format
      const { tool: createAISDKTool } = await import("ai");

      return createAISDKTool({
        description: tool.description || `External MCP tool ${tool.name}`,
        parameters: this.createPermissiveZodSchema(),
        execute: async (params) => {
          logger.debug(`Executing external MCP tool: ${tool.name}`, {
            toolName: tool.name,
            serverId: tool.serverId,
            params: JSON.stringify(params),
            paramsType: typeof params,
            hasNeurolink: !!this.neurolink,
            hasExecuteFunction:
              this.neurolink &&
              typeof this.neurolink.executeExternalMCPTool === "function",
            timestamp: Date.now(),
          });

          // 🔧 EMIT TOOL START EVENT - Bedrock-compatible format
          if (this.neurolink?.getEventEmitter) {
            const emitter = this.neurolink.getEventEmitter();
            emitter.emit("tool:start", { tool: tool.name, input: params });
            logger.debug(`tool:start event emitted for ${tool.name}`, {
              toolName: tool.name,
              input: params,
              hasEmitter: !!emitter,
            });
          }

          // Execute via NeuroLink's direct tool execution
          if (
            this.neurolink &&
            typeof this.neurolink.executeExternalMCPTool === "function"
          ) {
            try {
              const result = await this.neurolink.executeExternalMCPTool(
                tool.serverId || "unknown",
                tool.name,
                params as JsonObject,
              );

              // 🔧 EMIT TOOL END EVENT - Bedrock-compatible format
              if (this.neurolink?.getEventEmitter) {
                const emitter = this.neurolink.getEventEmitter();
                emitter.emit("tool:end", { tool: tool.name, result });
                logger.debug(`tool:end event emitted for ${tool.name}`, {
                  toolName: tool.name,
                  result:
                    typeof result === "string"
                      ? result.substring(0, 100)
                      : JSON.stringify(result).substring(0, 100),
                  hasEmitter: !!emitter,
                });
              }

              logger.debug(`External MCP tool executed: ${tool.name}`, {
                toolName: tool.name,
                result:
                  typeof result === "string"
                    ? result.substring(0, 200)
                    : JSON.stringify(result).substring(0, 200),
                resultType: typeof result,
                timestamp: Date.now(),
              });

              return result;
            } catch (mcpError) {
              // 🔧 EMIT TOOL END EVENT FOR ERROR - Bedrock-compatible format
              if (this.neurolink?.getEventEmitter) {
                const emitter = this.neurolink.getEventEmitter();
                const errorMsg =
                  mcpError instanceof Error
                    ? mcpError.message
                    : String(mcpError);
                emitter.emit("tool:end", { tool: tool.name, error: errorMsg });
                logger.debug(`tool:end error event emitted for ${tool.name}`, {
                  toolName: tool.name,
                  error: errorMsg,
                  hasEmitter: !!emitter,
                });
              }

              logger.error(`External MCP tool failed: ${tool.name}`, {
                toolName: tool.name,
                serverId: tool.serverId,
                error:
                  mcpError instanceof Error
                    ? mcpError.message
                    : String(mcpError),
                errorStack:
                  mcpError instanceof Error ? mcpError.stack : undefined,
                params: JSON.stringify(params),
                timestamp: Date.now(),
              });
              throw mcpError;
            }
          } else {
            const error = `Cannot execute external MCP tool: NeuroLink executeExternalMCPTool not available`;

            // 🔧 EMIT TOOL END EVENT FOR ERROR - Bedrock-compatible format
            if (this.neurolink?.getEventEmitter) {
              const emitter = this.neurolink.getEventEmitter();
              emitter.emit("tool:end", { tool: tool.name, error });
              logger.debug(`tool:end error event emitted for ${tool.name}`, {
                toolName: tool.name,
                error,
                hasEmitter: !!emitter,
              });
            }

            logger.error(`${error}`, {
              toolName: tool.name,
              hasNeurolink: !!this.neurolink,
              neurolinkType: typeof this.neurolink,
              timestamp: Date.now(),
            });
            throw new Error(error);
          }
        },
      });
    } catch (toolCreationError) {
      logger.error(
        `Failed to create external MCP tool: ${tool.name}`,
        toolCreationError,
      );
      return null;
    }
  }

  /**
   * Process external MCP tools
   */
  private async processExternalMCPTools(
    tools: Record<string, Tool>,
  ): Promise<void> {
    if (
      !this.neurolink ||
      typeof this.neurolink.getExternalMCPTools !== "function"
    ) {
      logger.debug(`[BaseProvider] No external MCP tool interface available`, {
        hasNeuroLink: !!this.neurolink,
        hasGetExternalMCPTools:
          this.neurolink &&
          typeof this.neurolink.getExternalMCPTools === "function",
      });
      return;
    }

    try {
      logger.debug(
        `[BaseProvider] Loading external MCP tools for ${this.providerName}`,
      );

      const externalTools = await this.neurolink.getExternalMCPTools();
      logger.debug(
        `[BaseProvider] Found ${externalTools.length} external MCP tools`,
      );

      for (const tool of externalTools) {
        const mcpTool = await this.createExternalMCPTool(tool);
        if (mcpTool) {
          tools[tool.name] = mcpTool;
          logger.debug(
            `[BaseProvider] Successfully added external MCP tool: ${tool.name}`,
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
  }

  /**
   * Process MCP tools integration
   */
  private async processMCPTools(tools: Record<string, Tool>): Promise<void> {
    // MCP tools loading simplified - removed functionCalling dependency
    if (!this.mcpTools) {
      // Set empty tools object - MCP tools are handled at a higher level
      this.mcpTools = {};
    }

    // Add MCP tools if available
    if (this.mcpTools) {
      Object.assign(tools, this.mcpTools);
    }
  }

  /**
   * Get all available tools - direct tools are ALWAYS available
   * MCP tools are added when available (without blocking)
   */
  protected async getAllTools(): Promise<Record<string, Tool>> {
    // Start with wrapped direct tools that emit events
    const tools: Record<string, Tool> = {};

    // Wrap direct tools with event emission
    await this.processDirectTools(tools);

    logger.debug(`[BaseProvider] getAllTools called for ${this.providerName}`, {
      neurolinkAvailable: !!this.neurolink,
      neurolinkType: typeof this.neurolink,
      directToolsCount: getKeyCount(this.directTools),
    });
    logger.debug(
      `[BaseProvider] Direct tools: ${getKeysAsString(this.directTools)}`,
    );

    // Process all tool types using dedicated helper methods
    await this.processCustomTools(tools);
    await this.processExternalMCPTools(tools);
    await this.processMCPTools(tools);

    logger.debug(
      `[BaseProvider] getAllTools returning tools: ${getKeysAsString(tools)}`,
    );

    return tools;
  }

  /**
   * Calculate actual cost based on token usage and provider configuration
   */
  private async calculateActualCost(usage: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  }): Promise<number> {
    try {
      const costInfo = modelConfig.getCostInfo(
        this.providerName,
        this.modelName,
      );
      if (!costInfo) {
        return 0; // No cost info available
      }

      const promptTokens = usage?.promptTokens || 0;
      const completionTokens = usage?.completionTokens || 0;

      // Calculate cost per 1K tokens
      const inputCost = (promptTokens / 1000) * costInfo.input;
      const outputCost = (completionTokens / 1000) * costInfo.output;

      return inputCost + outputCost;
    } catch (error) {
      logger.debug(`Cost calculation failed for ${this.providerName}:`, error);
      return 0; // Fallback to 0 on any error
    }
  }

  /**
   * Create a permissive Zod schema that accepts all parameters as-is
   */
  private createPermissiveZodSchema(): ZodUnknownSchema {
    // Create a permissive record that accepts any object structure
    // This allows all parameters to pass through without validation issues
    return z.record(z.unknown()).transform((data: Record<string, unknown>) => {
      // Return the data as-is to preserve all parameter information
      return data;
    });
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

    // CRITICAL FIX: Preserve the entire input object for multimodal support
    // This ensures images and content arrays are not lost during normalization
    const normalizedOptions: TextGenerationOptions = {
      ...optionsOrPrompt,
      prompt,
      provider: providerName,
      model: modelName,
      maxTokens: safeMaxTokens,
    };

    // Ensure input object is preserved if it exists (for multimodal support)
    if (optionsOrPrompt.input) {
      normalizedOptions.input = {
        ...optionsOrPrompt.input,
        text: prompt, // Ensure text is consistent
      };
    }

    return normalizedOptions;
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
    const context = {
      userQuery: options.prompt || options.input?.text || "Generated response",
      aiResponse: result.content,
      context: options.context,
      primaryDomain: options.evaluationDomain,
      assistantRole: "AI assistant",
      conversationHistory: options.conversationHistory?.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      toolUsage: options.toolUsageContext
        ? [
            {
              toolName: options.toolUsageContext,
              input: {},
              output: {},
              executionTime: 0,
            },
          ]
        : undefined,
      expectedOutcome: options.expectedOutcome,
      evaluationCriteria: options.evaluationCriteria,
    };
    const evaluation = await evaluateResponse(context);
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
   * Check if tool executions should be stored and handle storage
   */
  protected async handleToolExecutionStorage(
    toolCalls: unknown[],
    toolResults: unknown[],
    options: TextGenerationOptions | StreamOptions,
  ): Promise<void> {
    // Check if tools are not empty
    const hasToolData =
      (toolCalls && toolCalls.length > 0) ||
      (toolResults && toolResults.length > 0);

    // Check if NeuroLink instance is available and has tool execution storage
    const hasStorageAvailable =
      this.neurolink?.isToolExecutionStorageAvailable();

    // Early return if storage is not available or no tool data
    if (!hasStorageAvailable || !hasToolData || !this.neurolink) {
      return;
    }

    const sessionId =
      (options.context?.sessionId as string) ||
      (options as unknown as { sessionId?: string }).sessionId ||
      `session-${Date.now()}`;
    const userId =
      (options.context?.userId as string) ||
      (options as unknown as { userId?: string }).userId;

    try {
      await this.neurolink.storeToolExecutions(
        sessionId,
        userId,
        toolCalls as Array<{
          toolCallId?: string;
          toolName?: string;
          args?: Record<string, unknown>;
          [key: string]: unknown;
        }>,
        toolResults as Array<{
          toolCallId?: string;
          result?: unknown;
          error?: string;
          [key: string]: unknown;
        }>,
      );
    } catch (error) {
      logger.warn("[BaseProvider] Failed to store tool executions", {
        provider: this.providerName,
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - tool storage failures shouldn't break generation
    }
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
