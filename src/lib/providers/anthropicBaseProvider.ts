import { createAnthropic } from "@ai-sdk/anthropic";
import type { ZodType, ZodTypeDef } from "zod";
import { streamText, type Schema, type LanguageModelV1 } from "ai";
import type { AIProviderName } from "../types/index.js";
import { AnthropicModels } from "../types/index.js";
import type { StreamOptions, StreamResult } from "../types/streamTypes.js";
import { BaseProvider } from "../core/baseProvider.js";
import { logger } from "../utils/logger.js";
import { createTimeoutController, TimeoutError } from "../utils/timeout.js";
import {
  validateApiKey,
  createAnthropicBaseConfig,
} from "../utils/providerConfig.js";

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

  protected handleProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new Error(`Anthropic request timed out: ${error.message}`);
    }

    const errorWithStatus = error as { status?: number; message?: string };

    if (errorWithStatus?.status === 401) {
      return new Error(
        "Invalid Anthropic API key. Please check your ANTHROPIC_API_KEY environment variable.",
      );
    }

    if (errorWithStatus?.status === 429) {
      return new Error(
        "Anthropic rate limit exceeded. Please try again later.",
      );
    }

    if (errorWithStatus?.status === 400) {
      return new Error(
        `Anthropic bad request: ${errorWithStatus?.message || "Invalid request parameters"}`,
      );
    }

    return new Error(
      `Anthropic error: ${errorWithStatus?.message || String(error) || "Unknown error"}`,
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
      const result = await streamText({
        model,
        prompt: options.input.text,
        system: options.systemPrompt,
        temperature: options.temperature,
        maxTokens: options.maxTokens, // No default limit - unlimited unless specified
        tools: options.tools,
        toolChoice: "auto",
        abortSignal: timeoutController?.controller.signal,
        onStepFinish: ({ toolCalls, toolResults }) => {
          this.handleToolExecutionStorage(
            toolCalls,
            toolResults,
            options,
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
