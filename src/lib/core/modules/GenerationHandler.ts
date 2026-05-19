/**
 * Generation Handler Module
 *
 * Handles text generation execution, result formatting, and tool information extraction.
 * Extracted from BaseProvider to follow Single Responsibility Principle.
 *
 * Responsibilities:
 * - Generation execution with AI SDK
 * - Tool information extraction
 * - Result formatting and enhancement
 * - Response analysis and logging
 *
 * @module core/modules/GenerationHandler
 */

import { SpanKind, SpanStatusCode } from "@opentelemetry/api";
import { getModelId } from "../../providers/providerTypeUtils.js";
import { tracers } from "../../telemetry/tracers.js";
import type {
  UnknownRecord,
  ToolCallObject,
  AIProviderName,
  AISDKGenerateResult,
  EnhancedGenerateResult,
  ExtendedTool,
  NeuroLinkEvents,
  StandardRecord,
  TextGenerationOptions,
  TypedEventEmitter,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { emitToolEndFromStepFinish } from "../../utils/toolEndEmitter.js";
import { calculateCost } from "../../utils/pricing.js";
import { withProviderRetry } from "../../utils/providerRetry.js";
import {
  calculateCacheSavingsPercent,
  extractCacheCreationTokens,
  extractCacheReadTokens,
  extractTokenUsage,
} from "../../utils/tokenUtils.js";
import { DEFAULT_MAX_STEPS } from "../constants.js";
import type {
  LanguageModel,
  ModelMessage,
  PrepareStepFunction,
  Tool,
} from "../../types/index.js";
import { NoObjectGeneratedError } from "../../utils/generationErrors.js";
import { Output, stepCountIs } from "../../utils/tool.js";
import { generateText } from "../../utils/generation.js";

const genTracer = tracers.generation;

/**
 * Safely preview-serialize a value for debug logging.
 * Handles undefined, circular references, and non-serializable values.
 */
function safePreview(v: unknown): string {
  if (v === undefined) {
    return "";
  }
  try {
    const text = typeof v === "string" ? v : JSON.stringify(v);
    return (text ?? "").substring(0, 200);
  } catch {
    return "[unserializable]";
  }
}

/**
 * GenerationHandler class - Handles text generation operations for AI providers
 */
export class GenerationHandler {
  constructor(
    private readonly providerName: AIProviderName,
    private readonly modelName: string,
    private readonly supportsToolsFn: () => boolean,
    private readonly getTelemetryConfigFn: (
      options: TextGenerationOptions,
      type: string,
    ) =>
      | {
          isEnabled: boolean;
          functionId?: string;
          metadata?: Record<string, string | number | boolean>;
        }
      | undefined,
    private readonly handleToolStorageFn: (
      toolCalls: unknown[],
      toolResults: unknown[],
      options: TextGenerationOptions,
      timestamp: Date,
    ) => Promise<void>,
    private readonly getEmitterFn?: () =>
      | TypedEventEmitter<NeuroLinkEvents>
      | undefined,
  ) {}

  /**
   * Helper method to call generateText with optional structured output
   * @private
   */
  private async callGenerateText(
    model: LanguageModel,
    messages: ModelMessage[],
    tools: Record<string, Tool>,
    options: TextGenerationOptions,
    shouldUseTools: boolean,
    includeStructuredOutput: boolean,
  ): Promise<Awaited<ReturnType<typeof generateText>>> {
    // Check if this is a Google provider (for provider-specific options)
    const isGoogleProvider =
      this.providerName === "google-ai" || this.providerName === "vertex";

    // Check if this is an Anthropic provider (includes Vertex+Claude)
    const isAnthropicProvider =
      this.providerName === "anthropic" ||
      this.providerName === "bedrock" ||
      (this.providerName === "vertex" && this.modelName?.startsWith("claude-"));

    // Gemini 2.5 and earlier cannot use tools + structured JSON output simultaneously.
    // When both are requested on a Google provider, disable structured output (tools take priority).
    const wantsStructuredOutput =
      includeStructuredOutput &&
      (!!options.schema ||
        options.output?.format === "json" ||
        options.output?.format === "structured");
    const useStructuredOutput =
      wantsStructuredOutput &&
      !(isGoogleProvider && shouldUseTools && Object.keys(tools).length > 0);

    // Annotate the last tool with cache_control so the full tool-definition
    // block becomes a cache breakpoint for Anthropic-family providers.
    // Non-Anthropic providers harmlessly ignore unknown providerOptions.
    // Note: The AI SDK Tool type doesn't yet include providerOptions, so we
    // use a type assertion. The Anthropic adapter reads this at runtime.
    const toolsWithCache: Record<
      string,
      Tool & { providerOptions?: Record<string, unknown> }
    > = { ...tools };
    if (
      isAnthropicProvider &&
      shouldUseTools &&
      Object.keys(toolsWithCache).length > 0
    ) {
      const toolNames = Object.keys(toolsWithCache);
      const lastToolName = toolNames[toolNames.length - 1];
      if (lastToolName && toolsWithCache[lastToolName]) {
        const lastTool = toolsWithCache[lastToolName] as Tool & {
          providerOptions?: Record<string, unknown>;
        };
        toolsWithCache[lastToolName] = {
          ...lastTool,
          providerOptions: {
            ...(lastTool.providerOptions ?? {}),
            anthropic: { cacheControl: { type: "ephemeral" } },
          },
        };
      }
    }

    const prepareStep = options.prepareStep;

    return await generateText({
      model,
      messages,
      ...(shouldUseTools &&
        Object.keys(toolsWithCache).length > 0 && { tools: toolsWithCache }),
      stopWhen: stepCountIs(options.maxSteps ?? DEFAULT_MAX_STEPS),
      ...(shouldUseTools &&
        options.toolChoice && { toolChoice: options.toolChoice }),
      ...(prepareStep && {
        experimental_prepareStep: ((stepOptions) =>
          prepareStep({
            ...stepOptions,
            maxSteps: options.maxSteps ?? DEFAULT_MAX_STEPS,
          })) satisfies PrepareStepFunction,
      }),
      temperature: options.temperature,
      maxOutputTokens: options.maxTokens,
      maxRetries: 0, // NL11: Disable AI SDK's invisible internal retries; we handle retries with OTel instrumentation
      abortSignal: options.abortSignal,
      ...(useStructuredOutput &&
        options.schema && {
          experimental_output: Output.object({ schema: options.schema }),
        }),
      // Add thinking configuration for extended reasoning
      // Gemini 3 models use providerOptions.google.thinkingConfig with thinkingLevel
      // Gemini 2.5 models use thinkingBudget
      // Anthropic models use experimental_thinking with budgetTokens
      ...(options.thinkingConfig?.enabled && {
        // For Anthropic: experimental_thinking with budgetTokens
        ...(isAnthropicProvider &&
          options.thinkingConfig.budgetTokens &&
          !options.thinkingConfig.thinkingLevel && {
            experimental_thinking: {
              type: "enabled" as const,
              budgetTokens: options.thinkingConfig.budgetTokens,
            },
          }),
        // For Google Gemini 3: providerOptions with thinkingLevel
        // For Gemini 2.5: providerOptions with thinkingBudget
        ...(isGoogleProvider && {
          providerOptions: {
            google: {
              thinkingConfig: {
                ...(options.thinkingConfig.thinkingLevel && {
                  thinkingLevel: options.thinkingConfig.thinkingLevel,
                }),
                ...(options.thinkingConfig.budgetTokens &&
                  !options.thinkingConfig.thinkingLevel && {
                    thinkingBudget: options.thinkingConfig.budgetTokens,
                  }),
                includeThoughts: true,
              },
            },
          },
        }),
      }),
      experimental_telemetry: this.getTelemetryConfigFn(options, "generate"),
      onStepFinish: ({ toolCalls, toolResults }) => {
        logger.info("Tool execution completed", { toolResults, toolCalls });

        // Emit tool:end events for Pipeline B (metrics aggregator).
        // This surfaces AI-SDK-driven tool completions as telemetry events
        // so that tool spans are created even when the SDK runs tools
        // internally (gaps G5 / S2).
        emitToolEndFromStepFinish(
          this.getEmitterFn?.(),
          toolResults as Array<{
            toolName: string;
            output?: unknown;
            result?: unknown;
            error?: string;
          }>,
        );

        // Handle tool execution storage
        this.handleToolStorageFn(
          toolCalls,
          toolResults,
          options,
          new Date(),
        ).catch((error: unknown) => {
          logger.warn("[GenerationHandler] Failed to store tool executions", {
            provider: this.providerName,
            error: error instanceof Error ? error.message : String(error),
          });
        });
      },
    });
  }

  /**
   * Execute the generation with AI SDK
   */
  async executeGeneration(
    model: LanguageModel,
    messages: ModelMessage[],
    tools: Record<string, Tool>,
    options: TextGenerationOptions,
  ): Promise<Awaited<ReturnType<typeof generateText>>> {
    return genTracer.startActiveSpan(
      "neurolink.executeGeneration",
      { kind: SpanKind.INTERNAL },
      async (span) => {
        const shouldUseTools = !options.disableTools && this.supportsToolsFn();
        const toolCount = Object.keys(tools || {}).length;

        const useStructuredOutput =
          !!options.schema ||
          options.output?.format === "json" ||
          options.output?.format === "structured";

        span.setAttribute("gen_ai.system", this.providerName || "unknown");
        span.setAttribute("neurolink.structured_output", useStructuredOutput);
        span.setAttribute("neurolink.tool_count", toolCount);
        span.setAttribute("neurolink.message_count", messages.length);
        span.setAttribute(
          "gen_ai.request.model",
          getModelId(model, this.modelName || "unknown"),
        );

        const requestId =
          options.requestId ||
          ((options.context as Record<string, unknown>)?.requestId as string) ||
          "unknown";

        logger.info("[GenerationHandler] Calling generateText", {
          requestId,
          model: getModelId(model),
          messageCount: messages.length,
          toolCount,
          maxSteps: options.maxSteps,
          temperature: options.temperature,
        });

        if (logger.shouldLog("debug")) {
          try {
            logger.debug("[Observability] Full generateText parameters", {
              requestId,
              model: getModelId(model),
              messageCount: messages.length,
              messages: messages.map((msg, i) => ({
                index: i,
                role: msg.role,
                contentLength:
                  typeof msg.content === "string"
                    ? msg.content.length
                    : safePreview(msg.content).length,
                contentPreview:
                  typeof msg.content === "string"
                    ? msg.content.substring(0, 200)
                    : "[multimodal]",
              })),
              toolNames: Object.keys(tools || {}),
              toolCount,
              maxSteps: options.maxSteps,
              temperature: options.temperature,
              maxTokens: options.maxTokens,
            });
          } catch {
            // Ignore serialization errors in debug logging
          }
        }

        const genStartTime = Date.now();

        try {
          const result = await withProviderRetry(
            () =>
              this.callGenerateText(
                model,
                messages,
                tools,
                options,
                shouldUseTools,
                true, // includeStructuredOutput
              ),
            span,
            "generateText",
          );

          logger.info("[GenerationHandler] generateText returned", {
            requestId,
            durationMs: Date.now() - genStartTime,
            finishReason: result.finishReason,
            steps: result.steps?.length || 1,
            toolCallsTotal: result.toolCalls?.length || 0,
            responseChars: result.text?.length || 0,
          });

          if (logger.shouldLog("debug")) {
            logger.debug("[Observability] LLM response metadata", {
              requestId,
              responseLength: result.text?.length || 0,
              hasToolCalls: !!(result.toolCalls && result.toolCalls.length > 0),
              toolCallCount: result.toolCalls?.length || 0,
              toolNames: result.toolCalls?.map(
                (tc: { toolName: string }) => tc.toolName,
              ),
              finishReason: result.finishReason,
              stepCount: result.steps?.length || 0,
              steps: result.steps?.map(
                (
                  step: {
                    stepType?: string;
                    text?: string;
                    toolCalls?: Array<{ toolName: string }>;
                    toolResults?: Array<{ toolName: string }>;
                    finishReason?: string;
                  },
                  i: number,
                ) => ({
                  stepIndex: i,
                  stepType: step.stepType,
                  textLength: step.text?.length || 0,
                  toolCallCount: step.toolCalls?.length || 0,
                  toolNames: step.toolCalls?.map(
                    (tc: { toolName: string }) => tc.toolName,
                  ),
                  toolResultCount: step.toolResults?.length || 0,
                  finishReason: step.finishReason,
                }),
              ),
              usage: result.usage,
            });
          }

          // Set token usage and completion attributes on span
          if (result.usage) {
            span.setAttribute(
              "gen_ai.usage.input_tokens",
              result.usage.inputTokens || 0,
            );
            span.setAttribute(
              "gen_ai.usage.output_tokens",
              result.usage.outputTokens || 0,
            );
            // Cost on span so users can query "what did this trace cost?"
            const cost = calculateCost(this.providerName, this.modelName, {
              input: result.usage.inputTokens || 0,
              output: result.usage.outputTokens || 0,
              total:
                (result.usage.inputTokens || 0) +
                (result.usage.outputTokens || 0),
            });
            span.setAttribute("neurolink.cost", cost ?? 0);
          }
          if (result.finishReason) {
            span.setAttribute(
              "gen_ai.response.finish_reason",
              result.finishReason,
            );
          }

          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          // If NoObjectGeneratedError is thrown when using schema + tools together,
          // fall back to generating without experimental_output and extract JSON manually
          if (error instanceof NoObjectGeneratedError && useStructuredOutput) {
            span.setAttribute("neurolink.has_fallback", true);

            // NLK-GAP-007: Record initial failure event before fallback retry
            span.addEvent("retry.initial_failure", {
              "error.message": error.message,
              "retry.attempt": 1,
              "retry.reason":
                "NoObjectGeneratedError_structured_output_fallback",
            });

            logger.debug(
              "[GenerationHandler] NoObjectGeneratedError caught - falling back to manual JSON extraction",
              {
                provider: this.providerName,
                model: this.modelName,
                error: error.message,
              },
            );

            // Retry without experimental_output - the formatEnhancedResult method
            // will extract JSON from the text response
            const result = await withProviderRetry(
              () =>
                this.callGenerateText(
                  model,
                  messages,
                  tools,
                  options,
                  shouldUseTools,
                  false, // includeStructuredOutput - intentionally omitted
                ),
              span,
              "generateText(fallback)",
            );

            // NLK-GAP-007: Record recovery event after successful fallback
            span.addEvent("retry.recovered", {
              "retry.attempts": 2,
              "retry.strategy": "structured_output_disabled",
            });
            span.setAttribute("retry.count", 1);

            logger.info(
              "[GenerationHandler] generateText returned (fallback)",
              {
                requestId,
                durationMs: Date.now() - genStartTime,
                finishReason: result.finishReason,
                steps: result.steps?.length || 1,
                toolCallsTotal: result.toolCalls?.length || 0,
                responseChars: result.text?.length || 0,
              },
            );

            if (result.usage) {
              span.setAttribute(
                "gen_ai.usage.input_tokens",
                result.usage.inputTokens || 0,
              );
              span.setAttribute(
                "gen_ai.usage.output_tokens",
                result.usage.outputTokens || 0,
              );
              const fallbackCost = calculateCost(
                this.providerName,
                this.modelName,
                {
                  input: result.usage.inputTokens || 0,
                  output: result.usage.outputTokens || 0,
                  total:
                    (result.usage.inputTokens || 0) +
                    (result.usage.outputTokens || 0),
                },
              );
              span.setAttribute("neurolink.cost", fallbackCost ?? 0);
            }
            if (result.finishReason) {
              span.setAttribute(
                "gen_ai.response.finish_reason",
                result.finishReason,
              );
            }

            span.setStatus({ code: SpanStatusCode.OK });
            return result;
          }

          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : String(error),
          });
          // Re-throw other errors
          throw error;
        } finally {
          span.end();
        }
      },
    );
  }

  /**
   * Extract cache metrics from provider metadata (e.g. Anthropic's providerMetadata.anthropic)
   * The AI SDK's LanguageModelUsage only has inputTokens/outputTokens.
   * Cache metrics are surfaced via providerMetadata by provider-specific SDK adapters.
   */
  private extractCacheMetricsFromProviderMetadata(
    generateResult: Awaited<ReturnType<typeof generateText>>,
  ): {
    cacheCreationTokens?: number;
    cacheReadTokens?: number;
  } {
    const providerMeta = generateResult.providerMetadata as
      | Record<string, unknown>
      | undefined;
    if (!providerMeta) {
      return {};
    }

    // Anthropic surfaces cache metrics under providerMetadata.anthropic
    const anthropicMeta = providerMeta.anthropic as
      | Record<string, unknown>
      | undefined;
    if (anthropicMeta) {
      const cacheCreationTokens = extractCacheCreationTokens(
        anthropicMeta as Parameters<typeof extractCacheCreationTokens>[0],
      );
      const cacheReadTokens = extractCacheReadTokens(
        anthropicMeta as Parameters<typeof extractCacheReadTokens>[0],
      );
      return {
        ...(cacheCreationTokens !== undefined && { cacheCreationTokens }),
        ...(cacheReadTokens !== undefined && { cacheReadTokens }),
      };
    }

    return {};
  }

  /**
   * Log generation completion information
   */
  logGenerationComplete(
    generateResult: Awaited<ReturnType<typeof generateText>>,
  ): void {
    const cacheMetrics =
      this.extractCacheMetricsFromProviderMetadata(generateResult);

    if (logger.shouldLog("debug")) {
      logger.debug(`generateText completed`, {
        provider: this.providerName,
        model: this.modelName,
        responseLength: generateResult.text?.length || 0,
        toolResultsCount: generateResult.toolResults?.length || 0,
        finishReason: generateResult.finishReason,
        usage: generateResult.usage,
        ...(cacheMetrics.cacheCreationTokens !== undefined && {
          cacheCreationTokens: cacheMetrics.cacheCreationTokens,
        }),
        ...(cacheMetrics.cacheReadTokens !== undefined && {
          cacheReadTokens: cacheMetrics.cacheReadTokens,
        }),
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Extract tool information from generation result
   */
  extractToolInformation(
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

            const toolArgs: StandardRecord =
              (trRecord.args as StandardRecord | undefined) ??
              (trRecord.arguments as StandardRecord | undefined) ??
              (trRecord.parameters as StandardRecord | undefined) ??
              (trRecord.input as StandardRecord | undefined) ??
              toolCallArgsMap.get(toolId || toolName) ??
              {};

            toolExecutions.push({
              name: toolName,
              input: toolArgs,
              output:
                ((trRecord.output ?? trRecord.result) as unknown) ?? "success",
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
  formatEnhancedResult(
    generateResult: Awaited<ReturnType<typeof generateText>>,
    tools: Record<string, Tool>,
    toolsUsed: string[],
    toolExecutions: Array<{
      name: string;
      input: StandardRecord;
      output: unknown;
    }>,
    options: TextGenerationOptions,
  ): EnhancedGenerateResult {
    // Structured output check — schema alone is sufficient to activate
    const useStructuredOutput =
      !!options.schema ||
      options.output?.format === "json" ||
      options.output?.format === "structured";

    let content: string;
    if (useStructuredOutput) {
      try {
        const experimentalOutput = generateResult.experimental_output;
        if (experimentalOutput !== undefined) {
          content = JSON.stringify(experimentalOutput);
        } else {
          // Fall back to text parsing
          const rawText = generateResult.text || "";
          const strippedText = rawText
            .replace(/^```(?:json)?\s*\n?/i, "")
            .replace(/\n?```\s*$/i, "")
            .trim();
          content = strippedText;
        }
      } catch (outputError) {
        // experimental_output is a getter that can throw NoObjectGeneratedError
        // Fall back to text parsing when structured output fails
        logger.debug(
          "[GenerationHandler] experimental_output threw, falling back to text parsing",
          {
            error:
              outputError instanceof Error
                ? outputError.message
                : String(outputError),
          },
        );
        const rawText = generateResult.text || "";
        const strippedText = rawText
          .replace(/^```(?:json)?\s*\n?/i, "")
          .replace(/\n?```\s*$/i, "")
          .trim();
        content = strippedText;
      }
    } else {
      content = generateResult.text;
    }

    // Extract usage with support for different formats and reasoning tokens
    // Note: The AI SDK bundles thinking tokens into promptTokens for Google models.
    // Separate reasoningTokens tracking will work when/if the AI SDK adds support.
    const usage = extractTokenUsage(generateResult.usage);

    // Merge cache metrics from providerMetadata if not already present in usage
    // The AI SDK's LanguageModelUsage doesn't include cache tokens; they come from
    // provider-specific metadata (e.g. Anthropic's providerMetadata.anthropic)
    if (
      usage.cacheCreationTokens === undefined ||
      usage.cacheReadTokens === undefined
    ) {
      const cacheMetrics =
        this.extractCacheMetricsFromProviderMetadata(generateResult);
      if (
        usage.cacheCreationTokens === undefined &&
        cacheMetrics.cacheCreationTokens !== undefined
      ) {
        usage.cacheCreationTokens = cacheMetrics.cacheCreationTokens;
      }
      if (
        usage.cacheReadTokens === undefined &&
        cacheMetrics.cacheReadTokens !== undefined
      ) {
        usage.cacheReadTokens = cacheMetrics.cacheReadTokens;
      }
      // Recalculate cache savings if we added cache metrics
      if (usage.cacheReadTokens !== undefined) {
        const savingsPercent = calculateCacheSavingsPercent(
          usage.cacheReadTokens,
          usage.input,
        );
        if (savingsPercent !== undefined) {
          usage.cacheSavingsPercent = savingsPercent;
        }
      }
    }

    // Extract reasoning from AI SDK response (Anthropic thinking, Gemini thought, OpenAI o1)
    // Handle both string and array (AI SDK v5 returns string, v6 returns ReasoningOutput[])
    const rawReasoning = generateResult.reasoning;
    const reasoning: string | undefined = rawReasoning
      ? typeof rawReasoning === "string"
        ? rawReasoning
        : Array.isArray(rawReasoning)
          ? rawReasoning
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((r: any) =>
                typeof r === "string" ? r : (r.text ?? JSON.stringify(r)),
              )
              .join("\n")
          : String(rawReasoning)
      : undefined;
    const reasoningTokens: number | undefined = usage.reasoning ?? undefined;

    return {
      content,
      usage,
      finishReason: generateResult.finishReason,
      provider: this.providerName,
      model: this.modelName,
      reasoning,
      reasoningTokens,
      toolCalls: generateResult.toolCalls
        ? generateResult.toolCalls.map((tc: ToolCallObject) => ({
            toolCallId: tc.toolCallId || "unknown",
            toolName: tc.toolName || "unknown",
            args: tc.args || {},
          }))
        : [],
      toolResults: generateResult.toolResults ?? [],
      toolsUsed,
      toolExecutions,
      availableTools: Object.keys(tools).map((name) => {
        const tool = tools[name] as ExtendedTool;
        return {
          name,
          description: tool.description || "No description available",
          parameters: (tool.inputSchema as StandardRecord) || {},
          server: tool.serverId || "direct",
        };
      }),
    };
  }

  /**
   * Analyze AI response structure and log detailed debugging information
   */
  analyzeAIResponse(result: Record<string, unknown>): void {
    logger.debug("NeuroLink Raw AI Response Analysis", {
      provider: this.providerName,
      model: this.modelName,
      responseTextLength: (result.text as string)?.length || 0,
      responsePreview: (result.text as string)?.substring(0, 500) ?? "",
      finishReason: result.finishReason,
      usage: result.usage,
    });

    // Tool calls analysis
    const toolCallsAnalysis = {
      hasToolCalls: !!result.toolCalls,
      toolCallsLength: (result.toolCalls as unknown[])?.length || 0,
      toolCalls:
        (result.toolCalls as unknown[])?.map((toolCall, index) => {
          const tcRecord = toolCall as Record<string, unknown>;
          const toolName = tcRecord.toolName || tcRecord.name || "unknown";
          return {
            index: index + 1,
            toolName,
            toolId: tcRecord.toolCallId || tcRecord.id || "none",
            hasArgs: !!tcRecord.args,
            argsKeys:
              tcRecord.args && typeof tcRecord.args === "object"
                ? Object.keys(tcRecord.args as Record<string, unknown>)
                : [],
          };
        }) || [],
    };
    logger.debug("Tool Calls Analysis", toolCallsAnalysis);
  }
}
