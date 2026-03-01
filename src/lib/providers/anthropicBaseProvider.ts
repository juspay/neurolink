import { createAnthropic } from "@ai-sdk/anthropic";
import type { ZodType, ZodTypeDef } from "zod";
import { streamText, type Schema, type LanguageModelV1, type Tool } from "ai";
import { trace, SpanKind, SpanStatusCode } from "@opentelemetry/api";
import { AIProviderName, AnthropicModels } from "../constants/enums.js";
import type { StreamOptions, StreamResult } from "../types/streamTypes.js";
import { BaseProvider } from "../core/baseProvider.js";
import {
  AuthenticationError,
  NetworkError,
  ProviderError,
  RateLimitError,
} from "../types/errors.js";
import { logger } from "../utils/logger.js";
import { calculateCost } from "../utils/pricing.js";
import {
  composeAbortSignals,
  createTimeoutController,
  TimeoutError,
} from "../utils/timeout.js";
import {
  validateApiKey,
  createAnthropicBaseConfig,
} from "../utils/providerConfig.js";

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
  protected getAISDKModel(): LanguageModelV1 {
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
    _analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
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
            "gen_ai.request.model":
              model.modelId || this.modelName || "unknown",
          },
        },
      );

      let result: ReturnType<typeof streamText>;
      try {
        result = streamText({
          model,
          prompt: options.input.text,
          system: options.systemPrompt,
          temperature: options.temperature,
          maxTokens: options.maxTokens, // No default limit - unlimited unless specified
          maxRetries: 0, // NL11: Disable AI SDK's invisible internal retries; we handle retries with OTel instrumentation
          tools,
          toolChoice: shouldUseTools ? "auto" : "none",
          abortSignal: composeAbortSignals(
            options.abortSignal,
            timeoutController?.controller.signal,
          ),
          experimental_telemetry:
            this.telemetryHandler.getTelemetryConfig(options),
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
      result.usage
        .then((usage) => {
          streamSpan.setAttribute(
            "gen_ai.usage.input_tokens",
            usage.promptTokens || 0,
          );
          streamSpan.setAttribute(
            "gen_ai.usage.output_tokens",
            usage.completionTokens || 0,
          );
          const cost = calculateCost(this.providerName, this.modelName, {
            input: usage.promptTokens || 0,
            output: usage.completionTokens || 0,
            total: (usage.promptTokens || 0) + (usage.completionTokens || 0),
          });
          if (cost && cost > 0) {
            streamSpan.setAttribute("neurolink.cost", cost);
          }
        })
        .catch(() => {
          // Usage may not be available if the stream is aborted
        });
      result.finishReason
        .then((reason) => {
          streamSpan.setAttribute(
            "gen_ai.response.finish_reason",
            reason || "unknown",
          );
        })
        .catch(() => {
          // Finish reason may not be available if the stream is aborted
        });
      result.text
        .then(() => {
          streamSpan.end();
        })
        .catch((err) => {
          streamSpan.setStatus({
            code: SpanStatusCode.ERROR,
            message: err instanceof Error ? err.message : String(err),
          });
          streamSpan.end();
        });

      timeoutController?.cleanup();

      // Transform string stream to content object stream (match Google AI pattern)
      const transformedStream = async function* () {
        for await (const chunk of result.textStream) {
          yield { content: chunk };
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
