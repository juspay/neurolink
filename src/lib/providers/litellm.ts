import { openai, createOpenAI } from "@ai-sdk/openai";
import type { ZodType, ZodTypeDef } from "zod";
import { streamText, Output, type Schema, type LanguageModelV1 } from "ai";
import type {
  AIProviderName,
  TextGenerationOptions,
  EnhancedGenerateResult,
} from "../core/types.js";
import type { StreamOptions, StreamResult } from "../types/streamTypes.js";
import type { Unknown, UnknownRecord } from "../types/common.js";
import { BaseProvider, type NeuroLinkSDK } from "../core/baseProvider.js";
import { logger } from "../utils/logger.js";
import {
  createTimeoutController,
  TimeoutError,
  getDefaultTimeout,
} from "../utils/timeout.js";
import { DEFAULT_MAX_TOKENS } from "../core/constants.js";
import { validateApiKey, getProviderModel } from "../utils/providerConfig.js";
import { streamAnalyticsCollector } from "../core/streamAnalytics.js";

// Configuration helpers
const getLiteLLMConfig = () => {
  return {
    baseURL: process.env.LITELLM_BASE_URL || "http://localhost:4000",
    apiKey: process.env.LITELLM_API_KEY || "sk-anything",
  };
};

/**
 * Returns the default model name for LiteLLM.
 *
 * LiteLLM uses a 'provider/model' format for model names.
 * For example:
 *   - 'openai/gpt-4o-mini'
 *   - 'openai/gpt-3.5-turbo'
 *   - 'anthropic/claude-3-sonnet-20240229'
 *   - 'google/gemini-pro'
 *
 * You can override the default by setting the LITELLM_MODEL environment variable.
 */
const getDefaultLiteLLMModel = (): string => {
  return getProviderModel("LITELLM_MODEL", "openai/gpt-4o-mini");
};

/**
 * LiteLLM Provider - BaseProvider Implementation
 * Provides access to 100+ models via LiteLLM proxy server
 */
export class LiteLLMProvider extends BaseProvider {
  private model: LanguageModelV1;

  constructor(modelName?: string, sdk?: unknown) {
    super(
      modelName,
      "litellm" as AIProviderName,
      sdk as NeuroLinkSDK | undefined,
    );

    // Initialize LiteLLM using OpenAI SDK with explicit configuration
    const config = getLiteLLMConfig();

    // Create OpenAI SDK instance configured for LiteLLM proxy
    // LiteLLM acts as a proxy server that implements the OpenAI-compatible API.
    // To communicate with LiteLLM instead of the default OpenAI endpoint, we use createOpenAI
    // with a custom baseURL and apiKey. This ensures all requests are routed through the LiteLLM
    // proxy, allowing access to multiple models and custom authentication.
    const customOpenAI = createOpenAI({
      baseURL: config.baseURL,
      apiKey: config.apiKey,
    });

    this.model = customOpenAI(this.modelName || getDefaultLiteLLMModel());

    logger.debug("LiteLLM Provider initialized", {
      modelName: this.modelName,
      provider: this.providerName,
      baseURL: config.baseURL,
    });
  }

  protected getProviderName(): AIProviderName {
    return "litellm" as AIProviderName;
  }

  protected getDefaultModel(): string {
    return getDefaultLiteLLMModel();
  }

  /**
   * Returns the Vercel AI SDK model instance for LiteLLM
   */
  protected getAISDKModel(): LanguageModelV1 {
    return this.model;
  }

  protected handleProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new Error(`LiteLLM request timed out: ${error.message}`);
    }

    // Check for timeout by error name and message as fallback
    const errorRecord = error as UnknownRecord;
    if (
      errorRecord?.name === "TimeoutError" ||
      (typeof errorRecord?.message === "string" &&
        errorRecord.message.includes("Timeout"))
    ) {
      return new Error(
        `LiteLLM request timed out: ${errorRecord?.message || "Unknown timeout"}`,
      );
    }
    if (typeof errorRecord?.message === "string") {
      if (
        errorRecord.message.includes("ECONNREFUSED") ||
        errorRecord.message.includes("Failed to fetch")
      ) {
        return new Error(
          "LiteLLM proxy server not available. Please start the LiteLLM proxy server at " +
            `${process.env.LITELLM_BASE_URL || "http://localhost:4000"}`,
        );
      }

      if (
        errorRecord.message.includes("API_KEY_INVALID") ||
        errorRecord.message.includes("Invalid API key")
      ) {
        return new Error(
          "Invalid LiteLLM configuration. Please check your LITELLM_API_KEY environment variable.",
        );
      }

      if (errorRecord.message.includes("rate limit")) {
        return new Error(
          "LiteLLM rate limit exceeded. Please try again later.",
        );
      }

      if (
        errorRecord.message.includes("model") &&
        errorRecord.message.includes("not found")
      ) {
        return new Error(
          `Model '${this.modelName}' not available in LiteLLM proxy. ` +
            "Please check your LiteLLM configuration and ensure the model is configured.",
        );
      }
    }

    return new Error(
      `LiteLLM error: ${errorRecord?.message || "Unknown error"}`,
    );
  }

  /**
   * LiteLLM supports tools for compatible models
   */
  supportsTools(): boolean {
    return true;
  }

  /**
   * Provider-specific streaming implementation
   * Note: This is only used when tools are disabled
   */
  protected async executeStream(
    options: StreamOptions,
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<StreamResult> {
    this.validateStreamOptions(options);

    const startTime = Date.now();
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

      // Create analytics promise that resolves after stream completion
      const analyticsPromise = streamAnalyticsCollector.createAnalytics(
        this.providerName,
        this.modelName,
        result,
        Date.now() - startTime,
        {
          requestId: `litellm-stream-${Date.now()}`,
          streamingMode: true,
        },
      );

      return {
        stream: transformedStream(),
        provider: this.providerName,
        model: this.modelName,
        analytics: analyticsPromise,
        metadata: {
          startTime,
          streamId: `litellm-${Date.now()}`,
        },
      };
    } catch (error) {
      timeoutController?.cleanup();
      throw this.handleProviderError(error);
    }
  }

  /**
   * Get available models from LiteLLM proxy server
   *
   * TODO: Implement dynamic fetching from LiteLLM's /v1/models endpoint.
   * Currently returns a hardcoded list of commonly available models.
   *
   * Implementation would involve:
   * 1. Fetch from `${baseURL}/v1/models`
   * 2. Parse response to extract model IDs
   * 3. Handle network errors gracefully
   * 4. Cache results to avoid repeated API calls
   */
  async getAvailableModels(): Promise<string[]> {
    // Hardcoded list of commonly available models
    // TODO: Replace with dynamic fetch from LiteLLM proxy /v1/models endpoint
    return [
      "openai/gpt-4o",
      "openai/gpt-4o-mini",
      "anthropic/claude-3-5-sonnet",
      "anthropic/claude-3-haiku",
      "google/gemini-2.0-flash",
      "mistral/mistral-large",
      "mistral/mistral-medium",
    ];
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
