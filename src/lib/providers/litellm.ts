import { createOpenAI } from "@ai-sdk/openai";
import type { ZodType, ZodTypeDef } from "zod";
import { streamText, type Schema, type LanguageModelV1 } from "ai";
import type { AIProviderName } from "../types/index.js";
import type { StreamOptions, StreamResult } from "../types/streamTypes.js";
import type { UnknownRecord } from "../types/common.js";
import type { NeuroLink } from "../neurolink.js";
import { BaseProvider } from "../core/baseProvider.js";
import { logger } from "../utils/logger.js";
import { createTimeoutController, TimeoutError } from "../utils/timeout.js";
import { getProviderModel } from "../utils/providerConfig.js";
import { streamAnalyticsCollector } from "../core/streamAnalytics.js";
import { buildMessagesArray } from "../utils/messageBuilder.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";

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

  // Cache for available models to avoid repeated API calls
  private static modelsCache: string[] = [];
  private static modelsCacheTime = 0;
  private static readonly MODELS_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  constructor(modelName?: string, sdk?: unknown) {
    super(modelName, "litellm" as AIProviderName, sdk as NeuroLink | undefined);

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
      fetch: createProxyFetch(),
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

  public handleProviderError(error: unknown): Error {
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
    _analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
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
      // Build message array from options
      const messages = buildMessagesArray(options);
      const model = await this.getAISDKModelWithMiddleware(options); // This is where network connection happens!

      const result = streamText({
        model: model,
        messages: messages,
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
            logger.warn("LiteLLMProvider] Failed to store tool executions", {
              provider: this.providerName,
              error: error instanceof Error ? error.message : String(error),
            });
          });
        },
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
   * Dynamically fetches from /v1/models endpoint with caching and fallback
   */
  async getAvailableModels(): Promise<string[]> {
    const functionTag = "LiteLLMProvider.getAvailableModels";
    const now = Date.now();

    // Check if cached models are still valid
    if (
      LiteLLMProvider.modelsCache.length > 0 &&
      now - LiteLLMProvider.modelsCacheTime <
        LiteLLMProvider.MODELS_CACHE_DURATION
    ) {
      logger.debug(`[${functionTag}] Using cached models`, {
        cacheAge: Math.round((now - LiteLLMProvider.modelsCacheTime) / 1000),
        modelCount: LiteLLMProvider.modelsCache.length,
      });
      return LiteLLMProvider.modelsCache;
    }

    // Try to fetch models dynamically
    try {
      const dynamicModels = await this.fetchModelsFromAPI();
      if (dynamicModels.length > 0) {
        // Cache successful result
        LiteLLMProvider.modelsCache = dynamicModels;
        LiteLLMProvider.modelsCacheTime = now;

        logger.debug(`[${functionTag}] Successfully fetched models from API`, {
          modelCount: dynamicModels.length,
        });
        return dynamicModels;
      }
    } catch (error) {
      logger.warn(
        `[${functionTag}] Failed to fetch models from API, using fallback`,
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }

    // Fallback to hardcoded list if API fetch fails
    const fallbackModels = process.env.LITELLM_FALLBACK_MODELS?.split(",").map(
      (m) => m.trim(),
    ) || [
      "openai/gpt-4o", // minimal safe baseline
      "anthropic/claude-3-haiku",
      "meta-llama/llama-3.1-8b-instruct",
      "google/gemini-2.5-flash",
    ];

    logger.debug(`[${functionTag}] Using fallback model list`, {
      modelCount: fallbackModels.length,
    });

    return fallbackModels;
  }

  /**
   * Fetch available models from LiteLLM proxy /v1/models endpoint
   * @private
   */
  private async fetchModelsFromAPI(): Promise<string[]> {
    const functionTag = "LiteLLMProvider.fetchModelsFromAPI";
    const config = getLiteLLMConfig();
    const modelsUrl = `${config.baseURL}/v1/models`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      logger.debug(`[${functionTag}] Fetching models from ${modelsUrl}`);

      const proxyFetch = createProxyFetch();
      const response = await proxyFetch(modelsUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Parse OpenAI-compatible models response
      if (data && Array.isArray(data.data)) {
        const models = data.data
          .map((model: unknown) =>
            typeof model === "object" &&
            model !== null &&
            "id" in model &&
            typeof (model as { id?: unknown }).id === "string"
              ? (model as { id: string }).id
              : undefined,
          )
          .filter(
            (id: string | undefined) => typeof id === "string" && id.length > 0,
          )
          .sort();

        logger.debug(`[${functionTag}] Successfully parsed models`, {
          totalModels: models.length,
          sampleModels: models.slice(0, 5),
        });

        return models;
      } else {
        throw new Error("Invalid response format: expected data.data array");
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timed out after 5 seconds");
      }

      throw error;
    }
  }
}
