import { anthropic } from "@ai-sdk/anthropic";
import type { ZodType, ZodTypeDef } from "zod";
import { streamText, Output, type Schema, type LanguageModelV1 } from "ai";
import type {
  AIProviderName,
  TextGenerationOptions,
  EnhancedGenerateResult,
} from "../core/types.js";
import type { StreamOptions, StreamResult } from "../types/stream-types.js";
import type { Unknown, UnknownRecord } from "../types/common.js";
import { BaseProvider, type NeuroLinkSDK } from "../core/base-provider.js";
import { logger } from "../utils/logger.js";
import {
  createTimeoutController,
  TimeoutError,
  getDefaultTimeout,
} from "../utils/timeout.js";
import { DEFAULT_MAX_TOKENS } from "../core/constants.js";
import {
  validateApiKey,
  createAnthropicConfig,
  getProviderModel,
} from "../utils/providerConfig.js";

// Configuration helpers - now using consolidated utility
const getAnthropicApiKey = (): string => {
  return validateApiKey(createAnthropicConfig());
};

const getDefaultAnthropicModel = (): string => {
  return getProviderModel("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022");
};

/**
 * Anthropic Provider v2 - BaseProvider Implementation
 * Fixed syntax and enhanced with proper error handling
 */
export class AnthropicProvider extends BaseProvider {
  private model: LanguageModelV1;

  constructor(modelName?: string, sdk?: unknown) {
    super(
      modelName,
      "anthropic" as AIProviderName,
      sdk as NeuroLinkSDK | undefined,
    );

    // Initialize Anthropic model with API key validation
    const apiKey = getAnthropicApiKey();
    this.model = anthropic(this.modelName || getDefaultAnthropicModel());

    logger.debug("Anthropic Provider v2 initialized", {
      modelName: this.modelName,
      provider: this.providerName,
    });
  }

  protected getProviderName(): AIProviderName {
    return "anthropic" as AIProviderName;
  }

  protected getDefaultModel(): string {
    return getDefaultAnthropicModel();
  }

  /**
   * Returns the Vercel AI SDK model instance for Anthropic
   */
  protected getAISDKModel(): LanguageModelV1 {
    return this.model;
  }

  protected handleProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new Error(`Anthropic request timed out: ${error.message}`);
    }

    const errorRecord = error as UnknownRecord;
    if (
      (typeof errorRecord?.message === "string" &&
        errorRecord.message.includes("API_KEY_INVALID")) ||
      (typeof errorRecord?.message === "string" &&
        errorRecord.message.includes("Invalid API key"))
    ) {
      return new Error(
        "Invalid Anthropic API key. Please check your ANTHROPIC_API_KEY environment variable.",
      );
    }

    if (
      typeof errorRecord?.message === "string" &&
      errorRecord.message.includes("rate limit")
    ) {
      return new Error(
        "Anthropic rate limit exceeded. Please try again later.",
      );
    }

    const message =
      typeof errorRecord?.message === "string"
        ? errorRecord.message
        : "Unknown error";
    return new Error(`Anthropic error: ${message}`);
  }

  // executeGenerate removed - BaseProvider handles all generation with tools

  protected async executeStream(
    options: StreamOptions,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<StreamResult> {
    // Convert StreamOptions to TextGenerationOptions for validation
    const validationOptions: TextGenerationOptions = {
      prompt: options.input.text,
      systemPrompt: options.systemPrompt,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    };
    this.validateOptions(validationOptions);

    const timeout = this.getTimeout(options);
    const timeoutController = createTimeoutController(
      timeout,
      this.providerName,
      "stream",
    );

    try {
      const result = await streamText({
        model: this.model,
        prompt: options.input.text,
        system: options.systemPrompt || undefined,
        temperature: options.temperature,
        maxTokens: options.maxTokens || DEFAULT_MAX_TOKENS,
        abortSignal: timeoutController?.controller.signal,
      });

      timeoutController?.cleanup();

      // Transform string stream to content object stream
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
    } catch (error: unknown) {
      timeoutController?.cleanup();
      throw this.handleProviderError(error);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      getAnthropicApiKey();
      return true;
    } catch {
      return false;
    }
  }

  getModel(): LanguageModelV1 {
    return this.model;
  }
}

export default AnthropicProvider;
