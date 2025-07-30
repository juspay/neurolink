import { openai } from "@ai-sdk/openai";
import type { ZodType, ZodTypeDef } from "zod";
import { streamText, Output, type Schema, type LanguageModelV1 } from "ai";
import { AIProviderName } from "../core/types.js";
import type { StreamOptions, StreamResult } from "../types/stream-types.js";
import { BaseProvider } from "../core/base-provider.js";
import { logger } from "../utils/logger.js";
import {
  createTimeoutController,
  TimeoutError,
  getDefaultTimeout,
} from "../utils/timeout.js";
import { DEFAULT_MAX_TOKENS } from "../core/constants.js";
import type { UnknownRecord } from "../types/common.js";
import {
  validateApiKey,
  createOpenAIConfig,
  getProviderModel,
} from "../utils/providerConfig.js";

// Configuration helpers - now using consolidated utility
const getOpenAIApiKey = (): string => {
  return validateApiKey(createOpenAIConfig());
};

const getOpenAIModel = (): string => {
  return getProviderModel("OPENAI_MODEL", "gpt-4o");
};

/**
 * OpenAI Provider v2 - BaseProvider Implementation
 * Migrated to use factory pattern with exact Google AI provider pattern
 */
export class OpenAIProvider extends BaseProvider {
  private model: LanguageModelV1;

  constructor(modelName?: string) {
    super(modelName, AIProviderName.OPENAI);

    // Set OpenAI API key as environment variable (required by @ai-sdk/openai)
    process.env.OPENAI_API_KEY = getOpenAIApiKey();

    // Initialize model
    this.model = openai(this.modelName);

    logger.debug("OpenAIProviderV2 initialized", {
      model: this.modelName,
      provider: this.providerName,
    });
  }

  // ===================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // ===================

  protected getProviderName(): AIProviderName {
    return AIProviderName.OPENAI;
  }

  protected getDefaultModel(): string {
    return getOpenAIModel();
  }

  /**
   * Returns the Vercel AI SDK model instance for OpenAI
   */
  protected getAISDKModel(): LanguageModelV1 {
    return this.model;
  }

  protected handleProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new Error(`OpenAI request timed out: ${error.message}`);
    }

    const errorObj = error as UnknownRecord;
    const message =
      errorObj?.message && typeof errorObj.message === "string"
        ? errorObj.message
        : "Unknown error";

    if (
      message.includes("API_KEY_INVALID") ||
      message.includes("Invalid API key")
    ) {
      return new Error(
        "Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.",
      );
    }

    if (message.includes("rate limit")) {
      return new Error("OpenAI rate limit exceeded. Please try again later.");
    }

    return new Error(`OpenAI error: ${message}`);
  }

  /**
   * executeGenerate method removed - generation is now handled by BaseProvider.
   * For details on the changes and migration steps, refer to the BaseProvider documentation
   * and the migration guide in the project repository.
   */

  protected async executeStream(
    options: StreamOptions,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<StreamResult> {
    this.validateStreamOptions(options);

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
        system: options.systemPrompt,
        temperature: options.temperature,
        maxTokens: options.maxTokens || DEFAULT_MAX_TOKENS,
        tools: options.tools,
        toolChoice: "auto",
        abortSignal: timeoutController?.controller.signal,
      });

      timeoutController?.cleanup();

      // Transform stream to match StreamResult interface
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

  // ===================
  // PRIVATE VALIDATION METHODS
  // ===================

  private validateStreamOptions(options: StreamOptions): void {
    if (!options.input?.text || options.input.text.trim().length === 0) {
      throw new Error("Input text is required and cannot be empty");
    }
  }
}

// Export for factory registration
export default OpenAIProvider;
