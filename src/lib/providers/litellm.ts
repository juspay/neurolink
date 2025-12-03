import { createOpenAI } from "@ai-sdk/openai";
import type { ZodType, ZodTypeDef } from "zod";
import { streamText, Output, type Schema, type LanguageModelV1 } from "ai";
import { AIProviderName } from "../constants/enums.js";
import type { StreamOptions, StreamResult } from "../types/streamTypes.js";
import type { UnknownRecord } from "../types/common.js";
import type { NeuroLink } from "../neurolink.js";
import { BaseProvider } from "../core/baseProvider.js";
import { logger } from "../utils/logger.js";
import { createTimeoutController, TimeoutError } from "../utils/timeout.js";
import { getProviderModel } from "../utils/providerConfig.js";
import { streamAnalyticsCollector } from "../core/streamAnalytics.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
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
    analysisSchema?: ZodType<unknown, ZodTypeDef, unknown> | Schema<unknown>,
  ): Promise<StreamResult> {
    this.validateStreamOptions(options);

    const startTime = Date.now();
    let chunkCount = 0; // Track chunk count for debugging
    const timeout = this.getTimeout(options);
    const timeoutController = createTimeoutController(
      timeout,
      this.providerName,
      "stream",
    );

    try {
      // Build message array from options with multimodal support
      // Using protected helper from BaseProvider to eliminate code duplication
      const messages = await this.buildMessagesForStream(options);

      const model = await this.getAISDKModelWithMiddleware(options); // This is where network connection happens!

      // Get all available tools (direct + MCP + external) for streaming - matching Vertex pattern
      const shouldUseTools = !options.disableTools && this.supportsTools();
      const tools = shouldUseTools ? await this.getAllTools() : {};

      logger.debug(`LiteLLM: Tools for streaming`, {
        shouldUseTools,
        toolCount: Object.keys(tools).length,
        toolNames: Object.keys(tools),
      });

      // Model-specific maxTokens handling - Gemini 2.5 models have issues with maxTokens
      const modelName = this.modelName || getDefaultLiteLLMModel();
      const isGemini25Model =
        modelName.includes("gemini-2.5") || modelName.includes("gemini/2.5");
      const maxTokens = isGemini25Model ? undefined : options.maxTokens;

      if (isGemini25Model && options.maxTokens) {
        logger.debug(
          `LiteLLM: Skipping maxTokens for Gemini 2.5 model (known compatibility issue)`,
          {
            modelName,
            requestedMaxTokens: options.maxTokens,
          },
        );
      }

      // Build complete stream options with proper typing - matching Vertex pattern
      let streamOptions: Parameters<typeof streamText>[0] = {
        model: model,
        messages: messages,
        temperature: options.temperature,
        ...(maxTokens && { maxTokens }), // Conditionally include maxTokens
        ...(shouldUseTools &&
          Object.keys(tools).length > 0 && {
            tools,
            toolChoice: "auto",
            maxSteps: options.maxSteps || DEFAULT_MAX_STEPS,
          }),
        abortSignal: timeoutController?.controller.signal,

        onError: (event: { error: unknown }) => {
          const error = event.error;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger.error(`LiteLLM: Stream error`, {
            provider: this.providerName,
            modelName: this.modelName,
            error: errorMessage,
            chunkCount,
          });
        },

        onFinish: (event: {
          finishReason: string;
          usage: Record<string, unknown>;
          text?: string;
        }) => {
          logger.debug(`LiteLLM: Stream finished`, {
            finishReason: event.finishReason,
            totalChunks: chunkCount,
          });
        },

        onChunk: () => {
          chunkCount++;
        },

        onStepFinish: ({ toolCalls, toolResults }) => {
          logger.info("Tool execution completed", { toolResults, toolCalls });

          this.handleToolExecutionStorage(
            toolCalls,
            toolResults,
            options,
            new Date(),
          ).catch((error: unknown) => {
            logger.warn("LiteLLMProvider] Failed to store tool executions", {
              provider: this.providerName,
              error: error instanceof Error ? error.message : String(error),
            });
          });
        },
      };

      // Add analysisSchema support if provided
      if (analysisSchema) {
        try {
          streamOptions = {
            ...streamOptions,
            experimental_output: Output.object({
              schema: analysisSchema,
            }),
          };
        } catch (error) {
          logger.warn("Schema application failed, continuing without schema", {
            error: String(error),
          });
        }
      }

      const result = await streamText(streamOptions);

      timeoutController?.cleanup();

      // Transform stream to content object stream using fullStream (handles both text and tool calls)
      // Note: fullStream includes tool results, textStream only has text
      const transformedStream = (async function* () {
        // Try fullStream first (handles both text and tool calls), fallback to textStream
        const streamToUse = result.fullStream || result.textStream;

        for await (const chunk of streamToUse) {
          // Handle different chunk types from fullStream
          if (chunk && typeof chunk === "object") {
            // Check for error chunks first (critical error handling)
            if ("type" in chunk && chunk.type === "error") {
              const errorChunk = chunk as {
                type: "error";
                error: Record<string, unknown>;
              };
              logger.error(`LiteLLM: Error chunk received:`, {
                errorType: errorChunk.type,
                errorDetails: errorChunk.error,
              });
              throw new Error(
                `LiteLLM streaming error: ${
                  (errorChunk.error as Record<string, unknown>)?.message ||
                  "Unknown error"
                }`,
              );
            }

            if ("textDelta" in chunk) {
              // Text delta from fullStream
              const textDelta = (chunk as { textDelta: string }).textDelta;
              if (textDelta) {
                yield { content: textDelta };
              }
            } else if (chunk.type === "tool-call-streaming-start") {
              // Tool call streaming start event - log for debugging
              const toolCall = chunk as {
                type: "tool-call-streaming-start";
                toolCallId: string;
                toolName: string;
              };
              logger.debug("LiteLLM: Tool call streaming start", {
                toolCallId: toolCall.toolCallId,
                toolName: toolCall.toolName,
              });
            }
          } else if (typeof chunk === "string") {
            // Direct string chunk from textStream fallback
            yield { content: chunk };
          }
        }
      })();

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
        stream: transformedStream,
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
