import { createAnthropic } from "@ai-sdk/anthropic";
import { SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import type { ZodType } from "zod";
import { type AIProviderName, AnthropicModels } from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import {
  AuthenticationError,
  NetworkError,
  ProviderError,
  RateLimitError,
} from "../types/index.js";
import type { StreamOptions, StreamResult } from "../types/index.js";
import { logger } from "../utils/logger.js";
import {
  buildNoOutputSentinel,
  detectPostStreamNoOutput,
  stampNoOutputSpan,
} from "../utils/noOutputSentinel.js";
import { calculateCost } from "../utils/pricing.js";
import {
  createAnthropicBaseConfig,
  validateApiKey,
} from "../utils/providerConfig.js";
import {
  composeAbortSignals,
  createTimeoutController,
  TimeoutError,
} from "../utils/timeout.js";
import { resolveToolChoice } from "../utils/toolChoice.js";
import { getModelId } from "./providerTypeUtils.js";
import type { LanguageModel, Schema, Tool } from "../types/index.js";
import { NoOutputGeneratedError } from "../utils/generationErrors.js";
import { streamText } from "../utils/generation.js";

const streamTracer = trace.getTracer("neurolink.provider.anthropic");

/**
 * Anthropic provider implementation using BaseProvider pattern
 * Migrated from direct API calls to Vercel AI SDK (@ai-sdk/anthropic)
 * Follows exact Google AI interface patterns for compatibility
 */
export class AnthropicProviderV2 extends BaseProvider {
  constructor(modelName?: string) {
    super(modelName, "anthropic" as AIProviderName);
    logger.debug("AnthropicProviderV2 initialized", {
      model: this.modelName,
      provider: this.providerName,
    });
  }

  // ===================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // ===================

  protected getProviderName(): AIProviderName {
    return "anthropic" as AIProviderName;
  }

  protected getDefaultModel(): string {
    return process.env.ANTHROPIC_MODEL || AnthropicModels.CLAUDE_3_5_SONNET;
  }

  /**
   * Returns the Vercel AI SDK model instance for Anthropic
   */
  protected getAISDKModel(): LanguageModel {
    const apiKey = this.getApiKey();
    const anthropic = createAnthropic({ apiKey });
    return anthropic(this.modelName);
  }

  protected formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new NetworkError(
        `Request timed out: ${error.message}`,
        this.providerName,
      );
    }

    const errorWithStatus = error as { status?: number; message?: string };

    if (errorWithStatus?.status === 401) {
      return new AuthenticationError(
        "Invalid Anthropic API key. Please check your ANTHROPIC_API_KEY environment variable.",
        this.providerName,
      );
    }

    if (errorWithStatus?.status === 429) {
      return new RateLimitError(
        "Anthropic rate limit exceeded. Please try again later.",
        this.providerName,
      );
    }

    if (errorWithStatus?.status === 400) {
      return new ProviderError(
        `Bad request: ${errorWithStatus?.message || "Invalid request parameters"}`,
        this.providerName,
      );
    }

    return new ProviderError(
      `Anthropic error: ${errorWithStatus?.message || String(error) || "Unknown error"}`,
      this.providerName,
    );
  }

  // Configuration helper - now using consolidated utility
  private getApiKey(): string {
    return validateApiKey(createAnthropicBaseConfig());
  }

  // executeGenerate removed - BaseProvider handles all generation with tools

  protected async executeStream(
    options: StreamOptions,
    _analysisSchema?: ZodType | Schema<unknown>,
  ): Promise<StreamResult> {
    // Note: StreamOptions validation handled differently than TextGenerationOptions
    const model = await this.getAISDKModelWithMiddleware(options);

    const timeout = this.getTimeout(options);
    const timeoutController = createTimeoutController(
      timeout,
      this.providerName,
      "stream",
    );

    try {
      // Get tools - options.tools is pre-merged by BaseProvider.stream()
      const shouldUseTools = !options.disableTools && this.supportsTools();
      const tools = shouldUseTools
        ? (options.tools as Record<string, Tool>) || (await this.getAllTools())
        : {};

      // Wrap streamText in an OTel span to capture provider-level latency and token usage
      const streamSpan = streamTracer.startSpan(
        "neurolink.provider.streamText",
        {
          kind: SpanKind.CLIENT,
          attributes: {
            "gen_ai.system": "anthropic",
            "gen_ai.request.model": getModelId(
              model,
              this.modelName || "unknown",
            ),
          },
        },
      );

      // Reviewer follow-up: capture upstream provider errors via onError
      // so the post-stream NoOutput detect can propagate the real cause
      // into the sentinel's providerError / modelResponseRaw.
      let capturedProviderError: unknown;
      let result: ReturnType<typeof streamText>;
      try {
        result = streamText({
          model,
          prompt: options.input.text ?? "",
          system: options.systemPrompt,
          temperature: options.temperature,
          maxOutputTokens: options.maxTokens, // No default limit - unlimited unless specified
          maxRetries: 0, // NL11: Disable AI SDK's invisible internal retries; we handle retries with OTel instrumentation
          tools,
          toolChoice: resolveToolChoice(options, tools, shouldUseTools),
          abortSignal: composeAbortSignals(
            options.abortSignal,
            timeoutController?.controller.signal,
          ),
          experimental_telemetry:
            this.telemetryHandler.getTelemetryConfig(options),
          experimental_repairToolCall: this.getToolCallRepairFn(options),
          onError: (event: { error: unknown }) => {
            capturedProviderError = event.error;
            logger.error("AnthropicBaseProvider: Stream error", {
              error:
                event.error instanceof Error
                  ? event.error.message
                  : String(event.error),
            });
          },
          onStepFinish: ({ toolCalls, toolResults }) => {
            this.handleToolExecutionStorage(
              toolCalls,
              toolResults,
              options,
              new Date(),
            ).catch((error: unknown) => {
              logger.warn(
                "[AnthropicBaseProvider] Failed to store tool executions",
                {
                  provider: this.providerName,
                  error: error instanceof Error ? error.message : String(error),
                },
              );
            });
          },
        });
      } catch (err) {
        streamSpan.recordException(
          err instanceof Error ? err : new Error(String(err)),
        );
        streamSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: err instanceof Error ? err.message : String(err),
        });
        streamSpan.end();
        throw err;
      }

      // Collect token usage and finish reason asynchronously when the stream completes,
      // then end the span. This avoids blocking the stream consumer.
      Promise.resolve(result.usage)
        .then((usage) => {
          streamSpan.setAttribute(
            "gen_ai.usage.input_tokens",
            usage.inputTokens || 0,
          );
          streamSpan.setAttribute(
            "gen_ai.usage.output_tokens",
            usage.outputTokens || 0,
          );
          const cost = calculateCost(this.providerName, this.modelName, {
            input: usage.inputTokens || 0,
            output: usage.outputTokens || 0,
            total: (usage.inputTokens || 0) + (usage.outputTokens || 0),
          });
          if (cost && cost > 0) {
            streamSpan.setAttribute("neurolink.cost", cost);
          }
        })
        .catch(() => {
          // Usage may not be available if the stream is aborted
        });
      Promise.resolve(result.finishReason)
        .then((reason) => {
          streamSpan.setAttribute(
            "gen_ai.response.finish_reason",
            reason || "unknown",
          );
        })
        .catch(() => {
          // Finish reason may not be available if the stream is aborted
        });
      Promise.resolve(result.text)
        .then(() => {
          streamSpan.end();
        })
        .catch((err: unknown) => {
          streamSpan.setStatus({
            code: SpanStatusCode.ERROR,
            message: err instanceof Error ? err.message : String(err),
          });
          streamSpan.end();
        });

      timeoutController?.cleanup();

      // Transform string stream to content object stream (match Google AI pattern)
      const transformedStream = async function* () {
        let chunkCount = 0;
        try {
          for await (const chunk of result.textStream) {
            chunkCount++;
            yield { content: chunk };
          }
        } catch (streamError) {
          if (NoOutputGeneratedError.isInstance(streamError)) {
            logger.warn(
              "AnthropicBaseProvider: Stream produced no output (NoOutputGeneratedError) — caught from textStream",
            );
            const sentinel = await buildNoOutputSentinel(
              streamError,
              result,
              capturedProviderError,
            );
            stampNoOutputSpan(sentinel);
            yield sentinel as { content: string };
            return;
          }
          throw streamError;
        }
        // Curator P3-6 (round-2 fix): production trigger sets the error
        // on result.finishReason rejection, not on textStream iteration.
        // Surface that path here so the sentinel actually fires.
        if (chunkCount === 0) {
          const detected = await detectPostStreamNoOutput(
            result,
            capturedProviderError,
          );
          if (detected) {
            logger.warn(
              "AnthropicBaseProvider: Stream produced no output (NoOutputGeneratedError) — caught from finishReason rejection",
            );
            stampNoOutputSpan(detected.sentinel);
            yield detected.sentinel as { content: string };
          }
        }
      };

      return {
        stream: transformedStream(),
        provider: this.providerName,
        model: this.modelName,
      };
    } catch (error) {
      timeoutController?.cleanup();
      throw this.handleProviderError(error);
    }
  }
}

// Export for testing
export default AnthropicProviderV2;
