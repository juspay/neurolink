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

import { SpanKind, SpanStatusCode, type Span } from "@opentelemetry/api";
import { getModelId } from "../../providers/providerTypeUtils.js";
import { tracers } from "../../telemetry/tracers.js";
import type {
  StepResult,
  GenerateTextResult,
  UnknownRecord,
  ToolCallObject,
  AIProviderName,
  EnhancedGenerateResult,
  ExtendedTool,
  GenerateStopReason,
  NeuroLinkEvents,
  StandardRecord,
  TextGenerationOptions,
  ToolExecutionRecord,
  TypedEventEmitter,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { calculateCost } from "../../utils/pricing.js";
import { withProviderRetry } from "../../utils/providerRetry.js";
import { parseTimeout } from "../../utils/timeout.js";
import {
  calculateCacheSavingsPercent,
  extractCacheCreationTokens,
  extractCacheReadTokens,
  extractTokenUsage,
} from "../../utils/tokenUtils.js";
import {
  DEFAULT_MAX_STEPS,
  DEFAULT_WRAPUP_TIME_LEAD_MS,
} from "../constants.js";
import {} from "../../context/stepBudgetGuard.js";
import {
  isTemperatureDeprecatedError,
  isSchemaComplexityError,
  isToolsSchemaConflictError,
} from "./structuredOutputPolicy.js";
import {
  coerceJsonToSchema,
  recoverScalarRoot,
  schemaAccepts,
} from "../../utils/json/coerce.js";
import type { LanguageModel, ModelMessage, Tool } from "../../types/index.js";
import { NoObjectGeneratedError } from "../../utils/generationErrors.js";

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
 * Turn budget + wrap-up deadline (parity with the googleVertex native loops).
 * A deadline is engaged only when the caller expressed one: turnTimeoutMs
 * wins, else an explicit generate timeout. Callers that set neither keep the
 * pre-existing behaviour (no wrap-up; the outer defensive timeout in
 * executeStandardGenerateFlow still applies). With `wrapupTimeLeadMs` left of
 * the deadline, the loop stops offering tools (toolChoice: "none") so the
 * model spends the remaining budget producing a final answer instead of being
 * guillotined mid-tool-loop with all work discarded. The lead is clamped to a
 * quarter of the budget so short explicit timeouts (e.g. 30s) don't trigger
 * wrap-up on the very first step.
 *
 * `turnStartMs` anchors the deadline to the ORIGINAL generation start:
 * callGenerateText re-runs on executeGeneration's fallback retries
 * (structured-output conflict, temperature-deprecated) and provider retries,
 * and a deadline computed from Date.now() per attempt would hand each retry
 * a fresh budget — multiplying the caller's wall-clock cap.
 */
export function resolveTurnBudget(
  options: TextGenerationOptions,
  turnStartMs: number,
): {
  callerTimeoutMs: number | undefined;
  turnBudgetMs: number | undefined;
  wrapupLeadMs: number;
  turnDeadline: number | undefined;
} {
  const callerTimeoutMs = parseTimeout(options.timeout);
  const hasValidTurnTimeout =
    typeof options.turnTimeoutMs === "number" &&
    Number.isFinite(options.turnTimeoutMs) &&
    options.turnTimeoutMs > 0;
  if (options.turnTimeoutMs !== undefined && !hasValidTurnTimeout) {
    logger.warn(
      "[GenerationHandler] Ignoring invalid turnTimeoutMs — expected a positive number of milliseconds; falling back to the timeout option",
      { turnTimeoutMs: options.turnTimeoutMs },
    );
  }
  let turnBudgetMs = hasValidTurnTimeout
    ? options.turnTimeoutMs
    : callerTimeoutMs;
  let wrapupLeadMs = turnBudgetMs
    ? Math.min(
        options.wrapupTimeLeadMs ?? DEFAULT_WRAPUP_TIME_LEAD_MS,
        Math.floor(turnBudgetMs / 4),
      )
    : 0;
  // When the budget is DERIVED from the generate `timeout`, the hard abort in
  // executeStandardGenerateFlow fires at exactly callerTimeoutMs — the same
  // instant as the turn deadline. Wrap-up would engage at (deadline − lead)
  // but its final, tools-off generation then RACES the abort and loses on
  // slow models (observed: wrap-up engaged at T−lead, final answer killed at
  // exactly T → TimeoutError, all work discarded). Pull the turn deadline one
  // wrap-up lead earlier so the final generation runs in EXCLUSIVE margin
  // before the abort. An explicit turnTimeoutMs is left untouched — the
  // caller separated the two deadlines deliberately.
  if (!hasValidTurnTimeout && turnBudgetMs !== undefined && wrapupLeadMs > 0) {
    turnBudgetMs = turnBudgetMs - wrapupLeadMs;
    // Keep the quarter-budget clamp invariant against the reduced budget so
    // short timeouts still don't wrap up on the very first step.
    wrapupLeadMs = Math.min(wrapupLeadMs, Math.floor(turnBudgetMs / 4));
  }
  const turnDeadline = turnBudgetMs ? turnStartMs + turnBudgetMs : undefined;
  return { callerTimeoutMs, turnBudgetMs, wrapupLeadMs, turnDeadline };
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
    /**
     * The remaining, optional dependencies.
     *
     * Grouped rather than added as further positional parameters: the
     * constructor is already at the six-parameter cap, and both of these are
     * optional injection seams rather than required collaborators.
     *
     * `generateTextFn` exists because every other dependency of this class
     * arrives through the constructor while `generateText` was reached by
     * static import. `utils/generation.ts` is a bare re-export of `ai`, and an
     * ESM re-export cannot be substituted from a test, so asserting on the
     * arguments this class builds — the entire contract of the system-message
     * hoisting below — had no seam to work through. Production passes neither.
     */
    private readonly deps: {
      getEmitterFn?: () => TypedEventEmitter<NeuroLinkEvents> | undefined;
      // Local signature: the ai package's generateText is gone. Only tests
      // inject this; production always takes the native provider paths.
      generateTextFn?: (
        options: Record<string, unknown>,
      ) => Promise<GenerateTextResult<Record<string, Tool>, unknown>>;
    } = {},
  ) {}

  /**
   * Helper method to call generateText with optional structured output
   * @private
   */
  /**
   * The ai-package generate loop.
   *
   * Unreachable: every text provider now implements a native generate() and
   * none of them return here. That was established by trapping the seam —
   * replacing the ai package's generateText with a throwing stub left the full
   * provider matrix passing and zero cells reaching it — and non-text request
   * kinds return from runGenerateInActiveContext before this handler is
   * consulted.
   *
   * Kept as an explicit failure rather than deleted outright so a provider
   * added without a native generate() fails loudly here instead of silently
   * reintroducing a dependency on the removed package.
   */
  private async callGenerateText(
    _model: LanguageModel,
    _messages: ModelMessage[],
    _tools: Record<string, Tool>,
    _options: TextGenerationOptions,
    _callConfig: unknown,
  ): Promise<GenerateTextResult<Record<string, Tool>, unknown>> {
    throw new Error(
      "GenerationHandler.callGenerateText is no longer implemented: every provider must supply a native generate(). See docs/plans/2026-09-03-completing-the-ai-sdk-removal.md",
    );
  }

  async executeGeneration(
    model: LanguageModel,
    messages: ModelMessage[],
    tools: Record<string, Tool>,
    options: TextGenerationOptions,
  ): Promise<GenerateTextResult<Record<string, Tool>, unknown>> {
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
              this.callGenerateText(model, messages, tools, options, {
                shouldUseTools,
                includeStructuredOutput: true,
                turnStartMs: genStartTime,
              }),
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
                (step: StepResult<Record<string, Tool>>, i: number) => ({
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
          this.setUsageSpanAttributes(span, result);
          if (result.finishReason) {
            span.setAttribute(
              "gen_ai.response.finish_reason",
              result.finishReason,
            );
          }

          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          // Fall back to text-mode (no experimental_output) when structured
          // output + tools failed, in three cases:
          //   1. NoObjectGeneratedError — the SDK couldn't coerce the object.
          //   2. The provider rejected json-mode-with-tools outright (e.g. Groq:
          //      "json mode cannot be combined with tool/function calling").
          //   3. The provider rejected the schema as too complex for its
          //      constrained decoding (Vertex Gemini 400 "too many states") —
          //      deterministic, so re-sending the schema can never succeed.
          // In all cases we retry without structured output and let
          // formatEnhancedResult coerce the text response into valid JSON.
          const schemaTooComplex =
            useStructuredOutput && isSchemaComplexityError(error);
          const isStructuredOutputConflict =
            useStructuredOutput &&
            (error instanceof NoObjectGeneratedError ||
              isToolsSchemaConflictError(error) ||
              schemaTooComplex);
          if (isStructuredOutputConflict) {
            span.setAttribute("neurolink.has_fallback", true);

            // NLK-GAP-007: Record initial failure event before fallback retry
            span.addEvent("retry.initial_failure", {
              "error.message":
                error instanceof Error ? error.message : String(error),
              "retry.attempt": 1,
              "retry.reason":
                error instanceof NoObjectGeneratedError
                  ? "NoObjectGeneratedError_structured_output_fallback"
                  : schemaTooComplex
                    ? "schema_complexity_structured_output_fallback"
                    : "tools_schema_conflict_structured_output_fallback",
            });

            if (schemaTooComplex) {
              // warn (not debug): callers should simplify their schema — the
              // fallback keeps the turn alive but skips native enforcement.
              logger.warn(
                "[GenerationHandler] schema too complex for provider constrained decoding — retrying with prompt-based JSON",
                {
                  provider: this.providerName,
                  model: this.modelName,
                  error: error instanceof Error ? error.message : String(error),
                },
              );
            } else {
              logger.debug(
                "[GenerationHandler] structured-output conflict caught - falling back to manual JSON extraction",
                {
                  provider: this.providerName,
                  model: this.modelName,
                  error: error instanceof Error ? error.message : String(error),
                },
              );
            }

            // Retry without experimental_output - the formatEnhancedResult method
            // will extract JSON from the text response
            const result = await withProviderRetry(
              () =>
                this.callGenerateText(model, messages, tools, options, {
                  shouldUseTools,
                  // includeStructuredOutput intentionally omitted
                  includeStructuredOutput: false,
                  turnStartMs: genStartTime,
                }),
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

            this.setUsageSpanAttributes(span, result);
            if (result.finishReason) {
              span.setAttribute(
                "gen_ai.response.finish_reason",
                result.finishReason,
              );
            }

            span.setStatus({ code: SpanStatusCode.OK });
            return result;
          }

          // Retry once without `temperature` when the model deprecated it. The
          // newest Anthropic models (e.g. claude-opus-4-8 with tools + advanced
          // beta features) reject `temperature` — "`temperature` is deprecated
          // for this model." — in favour of reasoning-effort controls. Structured
          // output is already excluded for the native anthropic surface, so this
          // is the dominant failure mode for Opus there.
          if (
            isTemperatureDeprecatedError(error) &&
            typeof options.temperature === "number"
          ) {
            span.setAttribute("neurolink.has_fallback", true);
            span.addEvent("retry.initial_failure", {
              "error.message":
                error instanceof Error ? error.message : String(error),
              "retry.attempt": 1,
              "retry.reason": "temperature_deprecated",
            });
            logger.debug(
              "[GenerationHandler] temperature-deprecated error caught - retrying without temperature",
              {
                provider: this.providerName,
                model: this.modelName,
                error: error instanceof Error ? error.message : String(error),
              },
            );
            const result = await withProviderRetry(
              () =>
                this.callGenerateText(
                  model,
                  messages,
                  tools,
                  { ...options, temperature: undefined },
                  {
                    shouldUseTools,
                    // mirror the initial call; the structured-output policy still applies
                    includeStructuredOutput: true,
                    turnStartMs: genStartTime,
                  },
                ),
              span,
              "generateText(no-temperature)",
            );
            span.addEvent("retry.recovered", {
              "retry.attempts": 2,
              "retry.strategy": "temperature_omitted",
            });
            span.setAttribute("retry.count", 1);
            this.setUsageSpanAttributes(span, result);
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
  /**
   * Set gen_ai usage attributes + cache-aware cost on the span from the
   * CROSS-STEP aggregate (result.totalUsage). result.usage is the LAST step
   * only — using it undercounted every multi-step tool loop, and pricing the
   * raw cache-inclusive inputTokens without the cache fields billed cache
   * reads at the full input rate.
   */
  private setUsageSpanAttributes(
    span: Span,
    result: GenerateTextResult<Record<string, Tool>, unknown>,
  ): void {
    const aggregate = result.totalUsage ?? result.usage;
    if (!aggregate) {
      return;
    }
    span.setAttribute("gen_ai.usage.input_tokens", aggregate.inputTokens || 0);
    span.setAttribute(
      "gen_ai.usage.output_tokens",
      aggregate.outputTokens || 0,
    );
    // Cost on span so users can query "what did this trace cost?" —
    // extractTokenUsage rebases input onto the uncached remainder and
    // surfaces the cache fields so calculateCost prices each tier.
    const cost = calculateCost(
      this.providerName,
      this.modelName,
      extractTokenUsage(aggregate),
    );
    span.setAttribute("neurolink.cost", cost ?? 0);
  }

  private extractCacheMetricsFromProviderMetadata(
    generateResult: GenerateTextResult<Record<string, Tool>, unknown>,
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
    generateResult: GenerateTextResult<Record<string, Tool>, unknown>,
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
    generateResult: GenerateTextResult<Record<string, Tool>, unknown>,
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
    if (generateResult.steps && Array.isArray(generateResult.steps)) {
      const toolCallArgsMap = new Map<string, StandardRecord>();

      for (const step of generateResult.steps || []) {
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
            if (tcRecord.input) {
              // AI SDK v6 carries tool-call arguments as `input`.
              callArgs = tcRecord.input as StandardRecord;
            } else if (tcRecord.args) {
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
    generateResult: GenerateTextResult<Record<string, Tool>, unknown>,
    tools: Record<string, Tool>,
    toolsUsed: string[],
    toolExecutions: ToolExecutionRecord[],
    options: TextGenerationOptions,
  ): EnhancedGenerateResult {
    // Structured output check — schema alone is sufficient to activate
    const useStructuredOutput =
      !!options.schema ||
      options.output?.format === "json" ||
      options.output?.format === "structured";

    let content: string;
    let structuredData: unknown;
    let jsonRepaired = false;
    let jsonTruncated = false;
    // Strip an outer ```json fence and coerce raw model text into canonical
    // JSON. Object/array roots are recovered via balanced-scan + jsonrepair;
    // scalar JSON roots (string/number/bool) via plain JSON.parse. When
    // nothing JSON-shaped is recoverable, the raw text is returned unchanged,
    // structuredData stays unset, and a WARN makes the broken case observable.
    const coerceTextMode = (rawText: string): string => {
      const strippedText = rawText
        .replace(/^```(?:json)?\s*\n?/i, "")
        .replace(/\n?```\s*$/i, "")
        .trim();
      const coerced = coerceJsonToSchema(strippedText, options.schema);
      if (coerced) {
        structuredData = coerced.structuredData;
        if (coerced.repaired) {
          jsonRepaired = true;
        }
        if (coerced.truncated) {
          jsonTruncated = true;
        }
        return coerced.content;
      }
      const scalar = recoverScalarRoot(strippedText, options.schema);
      switch (scalar.kind) {
        case "empty":
          // A JSON-encoded empty string is an EMPTY completion, not a
          // recovered scalar — normalize to a true empty ('' content, no
          // structuredData) so callers' empty-response handling fires
          // instead of a literal '""' reaching the user.
          logger.warn(
            "[GenerationHandler] schema requested but the model returned an empty JSON string; normalizing to empty content",
            { provider: this.providerName, model: this.modelName },
          );
          return "";
        case "accepted":
          // A JSON scalar root is only real structured data when the caller's
          // schema actually accepts it. Under an OBJECT schema a recovered
          // string/number is the raw completion in disguise (the shape a
          // truncated response degrades to) — publishing it would hand the
          // caller a `structuredData` that violates the schema they passed.
          structuredData = scalar.value;
          return strippedText;
        case "rejected":
          logger.warn(
            "[GenerationHandler] recovered a JSON scalar the requested schema rejects; leaving structuredData unset",
            {
              provider: this.providerName,
              model: this.modelName,
              scalarType: typeof scalar.value,
            },
          );
          return strippedText;
        case "nullish":
        case "not-json":
          logger.warn(
            "[GenerationHandler] schema requested but no JSON could be recovered from model text; returning raw text",
            { provider: this.providerName, model: this.modelName },
          );
          return strippedText;
      }
    };
    if (useStructuredOutput) {
      try {
        const experimentalOutput = generateResult.experimental_output;
        // ai@6 generateText resolves `output ?? text()` internally, so a
        // result produced WITHOUT an output spec — the structured-output
        // fallback retry, or the tools↔schema exclusion path — no longer
        // throws here: `experimental_output` echoes the RAW MODEL TEXT.
        // Treating that echo as parsed schema output double-encodes the
        // content (JSON.stringify of a string) and, for an empty
        // completion, turns '' into the literal '""'. Detect the echo
        // (a string identical to the step text) and coerce it instead.
        const rawTextEcho =
          typeof experimentalOutput === "string" &&
          experimentalOutput === (generateResult.text ?? "");
        // The equality check above only catches an EXACT echo. On a multi-step
        // or truncated turn the echo can differ from `text` (a different step's
        // text, a fence, trailing whitespace), and a raw string would then be
        // published as `structuredData` under an object schema — the "returned
        // a string instead of the schema object" failure. A string is trusted
        // as structured output ONLY when the caller's schema accepts it
        // (string-root schemas keep working); otherwise it is coerced like any
        // other raw model text.
        const untrustedStringOutput =
          typeof experimentalOutput === "string" &&
          !!options.schema &&
          !schemaAccepts(options.schema, experimentalOutput);
        if (
          experimentalOutput !== undefined &&
          !rawTextEcho &&
          !untrustedStringOutput
        ) {
          // AI-SDK already parsed + schema-validated the object. Expose it
          // directly and serialise canonically — no hand-parsing needed.
          structuredData = experimentalOutput;
          content = JSON.stringify(experimentalOutput);
        } else {
          content = coerceTextMode(generateResult.text || "");
        }
      } catch (outputError) {
        // experimental_output is a getter that can throw NoObjectGeneratedError.
        logger.debug(
          "[GenerationHandler] experimental_output threw, falling back to text parsing",
          {
            error:
              outputError instanceof Error
                ? outputError.message
                : String(outputError),
          },
        );
        content = coerceTextMode(generateResult.text || "");
      }
    } else {
      content = generateResult.text;
    }

    // Tie the coercion repair to the provider's truncation signal: if the
    // response stopped on the token cap, treat the structured output as
    // truncated regardless of which coerce candidate won, and warn.
    if (useStructuredOutput && generateResult.finishReason === "length") {
      jsonTruncated = true;
      logger.warn(
        "[GenerationHandler] Structured output truncated by token cap (finishReason=length); increase maxTokens",
        { provider: this.providerName, model: this.modelName },
      );
    }

    // Extract usage with support for different formats and reasoning tokens.
    // totalUsage is the CROSS-STEP aggregate; generateResult.usage is the
    // LAST step only, which silently dropped every prior step of a
    // multi-step tool loop.
    const usage = extractTokenUsage(
      generateResult.totalUsage ?? generateResult.usage,
    );

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

    // stopReason / stepsUsed parity with the native loops (Vertex Gemini /
    // Claude / Bedrock): the AI-SDK loop path previously left both undefined,
    // so consumers could not distinguish a completed turn from one truncated
    // by the step cap or ended by the turn budget.
    const steps = (generateResult as { steps?: unknown[] }).steps;
    const stepsUsed = Array.isArray(steps) ? steps.length : undefined;
    const maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS;
    let stopReason: GenerateStopReason | undefined;
    if (
      (generateResult as { __nlTurnWrapup?: boolean }).__nlTurnWrapup === true
    ) {
      stopReason = "time-limit";
    } else if (
      stepsUsed !== undefined &&
      stepsUsed >= maxSteps &&
      generateResult.finishReason === "tool-calls"
    ) {
      stopReason = "step-cap";
    } else if (generateResult.finishReason === "error") {
      // Parity with resolveTurnStopReason (native loops): a turn that ended
      // on a provider "error" finish is not a completion. length /
      // content-filter DO map to "completed" — deliberately matching the
      // native contract, where truncation is signaled via finishReason /
      // rawFinishReason / jsonTruncated, never via stopReason.
      stopReason = "provider-error";
    } else if (stepsUsed !== undefined) {
      stopReason = "completed";
    }

    return {
      content,
      structuredData,
      usage,
      finishReason: generateResult.finishReason,
      stopReason,
      stepsUsed,
      jsonRepaired: jsonRepaired || undefined,
      jsonTruncated: jsonTruncated || undefined,
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
  analyzeAIResponse(rawResult: unknown): void {
    if (rawResult === null || typeof rawResult !== "object") {
      return;
    }
    const result = rawResult as Record<string, unknown>;
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
