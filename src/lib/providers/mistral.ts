import { createMistral } from "@ai-sdk/mistral";
import { streamText, type LanguageModelV1 } from "ai";
import type { ValidationSchema } from "../types/typeAliases.js";
import type { AIProviderName } from "../types/index.js";
import type { StreamOptions, StreamResult } from "../types/streamTypes.js";
import type { UnknownRecord } from "../types/common.js";
import type { NeuroLink } from "../neurolink.js";
import { BaseProvider } from "../core/baseProvider.js";
import { logger } from "../utils/logger.js";
import { createTimeoutController, TimeoutError } from "../utils/timeout.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
import {
  validateApiKey,
  createMistralConfig,
  getProviderModel,
} from "../utils/providerConfig.js";
import { streamAnalyticsCollector } from "../core/streamAnalytics.js";
import { buildMessagesArray } from "../utils/messageBuilder.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";

// Configuration helpers - now using consolidated utility
const getMistralApiKey = (): string => {
  return validateApiKey(createMistralConfig());
};

const getDefaultMistralModel = (): string => {
  return getProviderModel("MISTRAL_MODEL", "mistral-large-latest");
};

/**
 * Mistral AI Provider v2 - BaseProvider Implementation
 * Supports official AI-SDK integration with all Mistral models
 */
export class MistralProvider extends BaseProvider {
  private model: LanguageModelV1;

  constructor(modelName?: string, sdk?: unknown) {
    // Type guard for NeuroLink parameter validation
    const validatedNeurolink =
      sdk && typeof sdk === "object" && "getInMemoryServers" in sdk
        ? sdk
        : undefined;

    super(
      modelName,
      "mistral" as AIProviderName,
      validatedNeurolink as NeuroLink | undefined,
    );

    // Initialize Mistral model with API key validation and proxy support
    const apiKey = getMistralApiKey();
    const mistral = createMistral({
      apiKey: apiKey,
      fetch: createProxyFetch(),
    });
    this.model = mistral(this.modelName);

    logger.debug("Mistral Provider v2 initialized", {
      modelName: this.modelName,
      providerName: this.providerName,
    });
  }

  // generate() method is inherited from BaseProvider; this provider uses the base implementation for generation with tools

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
      const messages = buildMessagesArray(options);
      const model = await this.getAISDKModelWithMiddleware(options); // This is where network connection happens!
      const result = await streamText({
        model,
        messages: messages,
        temperature: options.temperature,
        maxTokens: options.maxTokens, // No default limit - unlimited unless specified
        tools,
        maxSteps: options.maxSteps || DEFAULT_MAX_STEPS,
        toolChoice: shouldUseTools ? "auto" : "none",
        abortSignal: timeoutController?.controller.signal,
        onStepFinish: ({ toolCalls, toolResults }) => {
          this.handleToolExecutionStorage(
            toolCalls,
            toolResults,
            options,
          ).catch((error: unknown) => {
            logger.warn("[MistralProvider] Failed to store tool executions", {
              provider: this.providerName,
              error: error instanceof Error ? error.message : String(error),
            });
          });
        },
      });

      timeoutController?.cleanup();

      // Transform string stream to content object stream using BaseProvider method
      const transformedStream = this.createTextStream(result);

      // Create analytics promise that resolves after stream completion
      const analyticsPromise = streamAnalyticsCollector.createAnalytics(
        this.providerName,
        this.modelName,
        result,
        Date.now() - startTime,
        {
          requestId: `mistral-stream-${Date.now()}`,
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
          streamId: `mistral-${Date.now()}`,
        },
      };
    } catch (error) {
      timeoutController?.cleanup();
      throw this.handleProviderError(error);
    }
  }

  // ===================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // ===================

  public getProviderName(): AIProviderName {
    return this.providerName;
  }

  public getDefaultModel(): string {
    return getDefaultMistralModel();
  }

  /**
   * Returns the Vercel AI SDK model instance for Mistral
   */
  public getAISDKModel(): LanguageModelV1 {
    return this.model;
  }

  public handleProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new Error(`Mistral request timed out: ${error.message}`);
    }

    const errorRecord = error as UnknownRecord;
    const message =
      typeof errorRecord?.message === "string"
        ? errorRecord.message
        : "Unknown error";

    if (
      message.includes("API_KEY_INVALID") ||
      message.includes("Invalid API key")
    ) {
      return new Error(
        "Invalid Mistral API key. Please check your MISTRAL_API_KEY environment variable.",
      );
    }

    if (message.includes("Rate limit exceeded")) {
      return new Error("Mistral rate limit exceeded");
    }

    return new Error(`Mistral error: ${message}`);
  }

  /**
   * Validate provider configuration
   */
  async validateConfiguration(): Promise<boolean> {
    try {
      getMistralApiKey();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get provider-specific configuration
   */
  getConfiguration() {
    return {
      provider: this.providerName,
      model: this.modelName,
      defaultModel: getDefaultMistralModel(),
    };
  }
}

export default MistralProvider;
