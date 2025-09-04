import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type LanguageModelV1 } from "ai";
import type { ValidationSchema } from "../types/typeAliases.js";
import { AIProviderName } from "../types/index.js";
import type { StreamOptions, StreamResult } from "../types/streamTypes.js";
import { BaseProvider } from "../core/baseProvider.js";
import { logger } from "../utils/logger.js";
import { createTimeoutController, TimeoutError } from "../utils/timeout.js";
import {
  AuthenticationError,
  InvalidModelError,
  NetworkError,
  ProviderError,
  RateLimitError,
} from "../types/errors.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
import type { UnknownRecord } from "../types/common.js";
import type { NeuroLink } from "../neurolink.js";
import {
  validateApiKey,
  createOpenAIConfig,
  getProviderModel,
} from "../utils/providerConfig.js";
import { streamAnalyticsCollector } from "../core/streamAnalytics.js";
import { buildMessagesArray } from "../utils/messageBuilder.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";

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

  constructor(modelName?: string, neurolink?: NeuroLink) {
    super(modelName || getOpenAIModel(), AIProviderName.OPENAI, neurolink);

    // Initialize OpenAI provider with proxy support
    const openai = createOpenAI({
      apiKey: getOpenAIApiKey(),
      fetch: createProxyFetch(),
    });

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
      throw new NetworkError(error.message, this.providerName);
    }

    const errorObj = error as UnknownRecord;
    const message =
      errorObj?.message && typeof errorObj.message === "string"
        ? errorObj.message
        : "Unknown error";
    const errorType =
      errorObj?.type && typeof errorObj.type === "string"
        ? errorObj.type
        : undefined;

    if (
      message.includes("API_KEY_INVALID") ||
      message.includes("Invalid API key") ||
      errorType === "invalid_api_key"
    ) {
      throw new AuthenticationError(
        "Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.",
        this.providerName,
      );
    }

    if (message.includes("rate limit") || errorType === "rate_limit_error") {
      throw new RateLimitError(
        "OpenAI rate limit exceeded. Please try again later.",
        this.providerName,
      );
    }

    if (message.includes("model_not_found")) {
      throw new InvalidModelError(
        `Model not found: ${this.modelName}`,
        this.providerName,
      );
    }

    // Generic provider error
    throw new ProviderError(`OpenAI error: ${message}`, this.providerName);
  }

  /**
   * executeGenerate method removed - generation is now handled by BaseProvider.
   * For details on the changes and migration steps, refer to the BaseProvider documentation
   * and the migration guide in the project repository.
   */

  protected async executeStream(
    options: StreamOptions,
    _analysisSchema?: ValidationSchema,
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
      // Get tools consistently with generate method
      const shouldUseTools = !options.disableTools && this.supportsTools();
      const tools = shouldUseTools ? await this.getAllTools() : {};

      // Build message array from options
      const messages = buildMessagesArray(options);

      const result = await streamText({
        model: this.model,
        messages: messages,
        temperature: options.temperature,
        maxTokens: options.maxTokens, // No default limit - unlimited unless specified
        tools,
        maxSteps: options.maxSteps || DEFAULT_MAX_STEPS,
        toolChoice: shouldUseTools ? "auto" : "none",
        abortSignal: timeoutController?.controller.signal,
      });

      timeoutController?.cleanup();

      // Transform stream to match StreamResult interface using BaseProvider method
      const transformedStream = this.createTextStream(result);

      // Create analytics promise that resolves after stream completion
      const analyticsPromise = streamAnalyticsCollector.createAnalytics(
        this.providerName,
        this.modelName,
        result,
        Date.now() - startTime,
        {
          requestId: `openai-stream-${Date.now()}`,
          streamingMode: true,
        },
      );

      return {
        stream: transformedStream,
        provider: this.providerName,
        model: this.modelName,
        analytics: analyticsPromise,
        metadata: {
          startTime,
          streamId: `openai-${Date.now()}`,
        },
      };
    } catch (error) {
      timeoutController?.cleanup();
      throw this.handleProviderError(error);
    }
  }
}

// Export for factory registration
export default OpenAIProvider;
