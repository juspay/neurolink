import { createOpenAI } from "@ai-sdk/openai";
import {
  type LanguageModel,
  NoOutputGeneratedError,
  type Schema,
  stepCountIs,
  streamText,
  type Tool,
} from "ai";
import type { AIProviderName } from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
import { streamAnalyticsCollector } from "../core/streamAnalytics.js";
import type { NeuroLink } from "../neurolink.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import type { UnknownRecord } from "../types/common.js";
import type { StepFinishEvent } from "../types/index.js";
import type { ModelsResponse } from "../types/providers.js";
import type { StreamOptions, StreamResult } from "../types/streamTypes.js";
import type { ZodUnknownSchema } from "../types/typeAliases.js";
import { logger } from "../utils/logger.js";
import {
  composeAbortSignals,
  createTimeoutController,
  TimeoutError,
} from "../utils/timeout.js";
import { resolveToolChoice } from "../utils/toolChoice.js";
import { toAnalyticsStreamResult } from "./providerTypeUtils.js";

// Constants
const FALLBACK_OPENAI_COMPATIBLE_MODEL = "gpt-3.5-turbo";

// Configuration helpers
const getOpenAICompatibleConfig = () => {
  const baseURL = process.env.OPENAI_COMPATIBLE_BASE_URL;
  const apiKey = process.env.OPENAI_COMPATIBLE_API_KEY;

  if (!baseURL) {
    throw new Error(
      "OPENAI_COMPATIBLE_BASE_URL environment variable is required. " +
        "Please set it to your OpenAI-compatible endpoint (e.g., https://api.openrouter.ai/api/v1)",
    );
  }

  if (!apiKey) {
    throw new Error(
      "OPENAI_COMPATIBLE_API_KEY environment variable is required. " +
        "Please set it to your API key for the OpenAI-compatible service.",
    );
  }

  return {
    baseURL,
    apiKey,
  };
};

/**
 * Returns the default model name for OpenAI Compatible endpoints.
 *
 * Returns undefined if no model is specified via OPENAI_COMPATIBLE_MODEL environment variable,
 * which triggers auto-discovery from the /v1/models endpoint.
 */
const getDefaultOpenAICompatibleModel = (): string | undefined => {
  return process.env.OPENAI_COMPATIBLE_MODEL || undefined;
};

// ModelsResponse type now imported from ../types/providerSpecific.js

/**
 * OpenAI Compatible Provider - BaseProvider Implementation
 * Provides access to one of the OpenAI-compatible endpoint (OpenRouter, vLLM, LiteLLM, etc.)
 */
export class OpenAICompatibleProvider extends BaseProvider {
  private model?: LanguageModel;
  private config: { baseURL: string; apiKey: string };
  private discoveredModel?: string;
  private customOpenAI: ReturnType<typeof createOpenAI>;

  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: { apiKey?: string; baseURL?: string },
  ) {
    super(
      modelName,
      "openai-compatible" as AIProviderName,
      sdk as NeuroLink | undefined,
    );

    // Build config: prefer credentials over env vars to avoid throwing when env vars are absent
    if (credentials?.apiKey && credentials?.baseURL) {
      this.config = {
        apiKey: credentials.apiKey,
        baseURL: credentials.baseURL,
      };
    } else {
      const envConfig = getOpenAICompatibleConfig(); // throws if env vars missing
      this.config = {
        apiKey: credentials?.apiKey ?? envConfig.apiKey,
        baseURL: credentials?.baseURL ?? envConfig.baseURL,
      };
    }

    // Create OpenAI SDK instance configured for custom endpoint
    // This allows us to use OpenAI-compatible API by simply changing the baseURL
    this.customOpenAI = createOpenAI({
      baseURL: this.config.baseURL,
      apiKey: this.config.apiKey,
      fetch: createProxyFetch(),
    });

    logger.debug("OpenAI Compatible Provider initialized", {
      modelName: this.modelName,
      provider: this.providerName,
      baseURL: this.config.baseURL,
    });
  }

  protected getProviderName(): AIProviderName {
    return "openai-compatible" as AIProviderName;
  }

  protected getDefaultModel(): string {
    // Return empty string when no model is explicitly configured to enable auto-discovery
    return getDefaultOpenAICompatibleModel() || "";
  }

  /**
   * Returns the Vercel AI SDK model instance for OpenAI Compatible endpoints
   * Handles auto-discovery if no model was specified
   */
  protected async getAISDKModel(): Promise<LanguageModel> {
    // If model instance doesn't exist yet, create it
    if (!this.model) {
      let modelToUse: string;

      // Check if a model was explicitly specified via constructor or env var
      const explicitModel = this.modelName || getDefaultOpenAICompatibleModel();

      // Treat empty string as no model specified (trigger auto-discovery)
      if (explicitModel && explicitModel.trim() !== "") {
        // Use the explicitly specified model
        modelToUse = explicitModel;
        logger.debug(`Using specified model: ${modelToUse}`);
      } else {
        // No model specified, auto-discover from endpoint
        try {
          const availableModels = await this.getAvailableModels();
          if (availableModels.length > 0) {
            this.discoveredModel = availableModels[0];
            modelToUse = this.discoveredModel;
            logger.info(
              `🔍 Auto-discovered model: ${modelToUse} from ${availableModels.length} available models`,
            );
          } else {
            // Fall back to a common default if no models discovered
            modelToUse = FALLBACK_OPENAI_COMPATIBLE_MODEL;
            logger.warn(`No models discovered, using fallback: ${modelToUse}`);
          }
        } catch (error) {
          logger.warn("Model auto-discovery failed, using fallback:", error);
          modelToUse = FALLBACK_OPENAI_COMPATIBLE_MODEL;
        }
      }

      // Create the model instance
      this.model = this.customOpenAI(modelToUse);
    }

    return this.model;
  }

  protected formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new Error(`OpenAI Compatible request timed out: ${error.message}`);
    }

    // Check for timeout by error name and message as fallback
    const errorRecord = error as UnknownRecord;
    if (
      errorRecord?.name === "TimeoutError" ||
      (typeof errorRecord?.message === "string" &&
        errorRecord.message.includes("Timeout"))
    ) {
      return new Error(
        `OpenAI Compatible request timed out: ${errorRecord?.message || "Unknown timeout"}`,
      );
    }

    if (typeof errorRecord?.message === "string") {
      if (
        errorRecord.message.includes("ECONNREFUSED") ||
        errorRecord.message.includes("Failed to fetch")
      ) {
        return new Error(
          `OpenAI Compatible endpoint not available. Please check your OPENAI_COMPATIBLE_BASE_URL: ${this.config.baseURL}`,
        );
      }

      if (
        errorRecord.message.includes("API_KEY_INVALID") ||
        errorRecord.message.includes("Invalid API key") ||
        errorRecord.message.includes("Unauthorized")
      ) {
        return new Error(
          "Invalid OpenAI Compatible API key. Please check your OPENAI_COMPATIBLE_API_KEY environment variable.",
        );
      }

      if (errorRecord.message.includes("rate limit")) {
        return new Error(
          "OpenAI Compatible rate limit exceeded. Please try again later.",
        );
      }

      if (
        errorRecord.message.includes("model") &&
        (errorRecord.message.includes("not found") ||
          errorRecord.message.includes("does not exist"))
      ) {
        return new Error(
          `Model '${this.modelName}' not available on OpenAI Compatible endpoint. ` +
            "Please check available models or use getAvailableModels() to see supported models.",
        );
      }
    }

    return new Error(
      `OpenAI Compatible error: ${errorRecord?.message || "Unknown error"}`,
    );
  }

  /**
   * OpenAI Compatible endpoints support tools for compatible models
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
    _analysisSchema?: ZodUnknownSchema | Schema<unknown>,
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
      // Get tools - options.tools is pre-merged by BaseProvider.stream()
      const shouldUseTools = !options.disableTools && this.supportsTools();
      const tools = shouldUseTools
        ? (options.tools as Record<string, Tool>) || (await this.getAllTools())
        : {};

      // Build message array from options with multimodal support
      // Using protected helper from BaseProvider to eliminate code duplication
      const messages = await this.buildMessagesForStream(options);

      const model = await this.getAISDKModelWithMiddleware(options); // This is where network connection happens!
      const result = streamText({
        model,
        messages: messages,
        ...(options.maxTokens !== null && options.maxTokens !== undefined
          ? { maxOutputTokens: options.maxTokens }
          : {}),
        ...(options.temperature !== null && options.temperature !== undefined
          ? { temperature: options.temperature }
          : {}),
        tools,
        toolChoice: resolveToolChoice(options, tools, shouldUseTools),
        stopWhen: stepCountIs(options.maxSteps || DEFAULT_MAX_STEPS),
        abortSignal: composeAbortSignals(
          options.abortSignal,
          timeoutController?.controller.signal,
        ),
        experimental_telemetry:
          this.telemetryHandler.getTelemetryConfig(options),
        onStepFinish: (event: StepFinishEvent) => {
          this.handleToolExecutionStorage(
            [...event.toolCalls],
            [...event.toolResults],
            options,
            new Date(),
          ).catch((error: unknown) => {
            logger.warn(
              "[OpenAiCompatibleProvider] Failed to store tool executions",
              {
                provider: this.providerName,
                error: error instanceof Error ? error.message : String(error),
              },
            );
          });
        },
      });

      timeoutController?.cleanup();

      // Transform stream to match StreamResult interface
      const transformedStream = async function* () {
        try {
          for await (const chunk of result.textStream) {
            yield { content: chunk };
          }
        } catch (streamError) {
          // AI SDK v6 throws NoOutputGeneratedError when the stream produced no output.
          if (NoOutputGeneratedError.isInstance(streamError)) {
            logger.warn(
              "OpenAI-compatible: Stream produced no output (NoOutputGeneratedError)",
            );
            return;
          }
          throw streamError;
        }
      };

      // Create analytics promise that resolves after stream completion
      const analyticsPromise = streamAnalyticsCollector.createAnalytics(
        this.providerName,
        this.modelName,
        toAnalyticsStreamResult(result),
        Date.now() - startTime,
        {
          requestId: `openai-compatible-stream-${Date.now()}`,
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
          streamId: `openai-compatible-${Date.now()}`,
        },
      };
    } catch (error) {
      timeoutController?.cleanup();
      throw this.handleProviderError(error);
    }
  }

  /**
   * Get available models from OpenAI Compatible endpoint
   *
   * Fetches from the /v1/models endpoint to discover available models.
   * This is useful for auto-discovery when no model is specified.
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const modelsUrl = new URL("/v1/models", this.config.baseURL).toString();
      logger.debug(`Fetching available models from: ${modelsUrl}`);

      const proxyFetch = createProxyFetch();
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 5000);
      const response = await proxyFetch(modelsUrl, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });
      clearTimeout(t);

      if (!response.ok) {
        logger.warn(
          `Models endpoint returned ${response.status}: ${response.statusText}`,
        );
        return this.getFallbackModels();
      }

      const data: ModelsResponse = await response.json();

      if (!data.data || !Array.isArray(data.data)) {
        logger.warn("Invalid models response format");
        return this.getFallbackModels();
      }

      const models = data.data.map((model) => model.id).filter(Boolean);
      logger.debug(`Discovered ${models.length} models:`, models);

      return models.length > 0 ? models : this.getFallbackModels();
    } catch (error) {
      logger.warn(
        `Failed to fetch models from OpenAI Compatible endpoint:`,
        error,
      );
      return this.getFallbackModels();
    }
  }

  /**
   * Get the first available model for auto-selection
   */
  async getFirstAvailableModel(): Promise<string> {
    const models = await this.getAvailableModels();
    return models[0] || FALLBACK_OPENAI_COMPATIBLE_MODEL;
  }

  /**
   * Fallback models when discovery fails
   */
  private getFallbackModels(): string[] {
    return [
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4-turbo",
      FALLBACK_OPENAI_COMPATIBLE_MODEL,
      "claude-3-5-sonnet",
      "claude-3-haiku",
      "gemini-pro",
    ];
  }
}
