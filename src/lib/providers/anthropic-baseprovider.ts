import { createAnthropic } from "@ai-sdk/anthropic";
import type { ZodType, ZodTypeDef } from "zod";
import { streamText, Output, type Schema, type LanguageModelV1 } from "ai";
import type {
  AIProviderName,
  TextGenerationOptions,
  EnhancedGenerateResult,
} from "../core/types.js";
import type { StreamOptions, StreamResult } from "../types/stream-types.js";
import { BaseProvider } from "../core/base-provider.js";
import { logger } from "../utils/logger.js";
import {
  createTimeoutController,
  TimeoutError,
  getDefaultTimeout,
} from "../utils/timeout.js";
import { DEFAULT_MAX_TOKENS } from "../core/constants.js";

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
    return process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";
  }

  /**
   * Returns the Vercel AI SDK model instance for Anthropic
   */
  protected getAISDKModel(): any {
    const apiKey = this.getApiKey();
    const anthropic = createAnthropic({ apiKey });
    return anthropic(this.modelName);
  }

  protected handleProviderError(error: any): Error {
    if (error instanceof TimeoutError) {
      return new Error(`Anthropic request timed out: ${error.message}`);
    }

    if (error?.status === 401) {
      return new Error(
        "Invalid Anthropic API key. Please check your ANTHROPIC_API_KEY environment variable.",
      );
    }

    if (error?.status === 429) {
      return new Error(
        "Anthropic rate limit exceeded. Please try again later.",
      );
    }

    if (error?.status === 400) {
      return new Error(
        `Anthropic bad request: ${error?.message || "Invalid request parameters"}`,
      );
    }

    return new Error(`Anthropic error: ${error?.message || "Unknown error"}`);
  }

  private getApiKey(): string {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        `❌ ANTHROPIC Provider Configuration Error

Missing required environment variables: ANTHROPIC_API_KEY

🔧 Step 1: Get Credentials
Get your API key from https://console.anthropic.com/

💡 Step 2: Add to your .env file (or export in CLI):
ANTHROPIC_API_KEY="sk-ant-your-anthropic-api-key"
# Optional:
ANTHROPIC_MODEL="claude-3-5-sonnet-20241022"
ANTHROPIC_BASE_URL="https://api.anthropic.com"

🚀 Step 3: Test the setup:
npx neurolink generate "Hello" --provider anthropic

📖 More info: https://docs.neurolink.dev/providers/anthropic`,
      );
    }
    return apiKey;
  }

  // executeGenerate removed - BaseProvider handles all generation with tools

  protected async executeStream(
    options: StreamOptions,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<StreamResult> {
    // Note: StreamOptions validation handled differently than TextGenerationOptions

    const apiKey = this.getApiKey();
    const anthropicClient = createAnthropic({ apiKey });
    const model = anthropicClient(this.modelName);

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
        maxTokens: options.maxTokens || DEFAULT_MAX_TOKENS,
        tools: options.tools,
        toolChoice: "auto",
        abortSignal: timeoutController?.controller.signal,
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
