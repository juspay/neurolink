import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { ZodType } from "zod";
import { AIProviderName } from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
import { streamAnalyticsCollector } from "../core/streamAnalytics.js";
import type { NeuroLink } from "../neurolink.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import type {
  UnknownRecord,
  OpenRouterConfig,
  OpenRouterModelInfo,
  OpenRouterModelsResponse,
  StreamOptions,
  StreamResult,
  StreamTextResult,
} from "../types/index.js";
import {
  AuthenticationError,
  InvalidModelError,
  NetworkError,
  ProviderError,
  RateLimitError,
} from "../types/index.js";
import { isAbortError } from "../utils/errorHandling.js";
import { emitToolEndFromStepFinish } from "../utils/toolEndEmitter.js";
import { logger } from "../utils/logger.js";
import {
  buildNoOutputSentinel,
  detectPostStreamNoOutput,
  stampNoOutputSpan,
} from "../utils/noOutputSentinel.js";
import { getProviderModel } from "../utils/providerConfig.js";
import {
  composeAbortSignals,
  createTimeoutController,
  TimeoutError,
} from "../utils/timeout.js";
import { resolveToolChoice } from "../utils/toolChoice.js";
import type { LanguageModel, Schema, Tool } from "../types/index.js";
import { NoOutputGeneratedError } from "../utils/generationErrors.js";
import { Output, stepCountIs } from "../utils/tool.js";
import { streamText } from "../utils/generation.js";

// Constants
const MODELS_DISCOVERY_TIMEOUT_MS = 5000; // 5 seconds for model discovery

// Configuration helpers
const getOpenRouterConfig = (): OpenRouterConfig => {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY environment variable is required. " +
        "Get your API key at https://openrouter.ai/keys",
    );
  }

  return {
    apiKey,
    referer: process.env.OPENROUTER_REFERER,
    appName: process.env.OPENROUTER_APP_NAME,
  };
};

/**
 * Returns the default model name for OpenRouter.
 *
 * OpenRouter uses a 'provider/model' format for model names.
 * For example:
 *   - 'anthropic/claude-sonnet-4.5'
 *   - 'openai/gpt-4o'
 *   - 'google/gemini-2.5-flash'
 *   - 'meta-llama/llama-3-70b-instruct'
 *
 * The previous default `anthropic/claude-3-5-sonnet` was retired by OpenRouter
 * in late 2025 and now returns "No endpoints found for model" for every
 * caller. Default bumped to the current Anthropic mainline (Claude Sonnet
 * 4.5) so callers without an `OPENROUTER_MODEL` env var don't hit a dead
 * model. Must stay aligned with the registry default in
 * `src/lib/factories/providerRegistry.ts` and `PROVIDER_DEFAULTS` in
 * `src/lib/utils/modelChoices.ts`.
 *
 * You can override the default by setting the OPENROUTER_MODEL environment variable.
 */
const getDefaultOpenRouterModel = (): string => {
  return getProviderModel("OPENROUTER_MODEL", "anthropic/claude-sonnet-4.5");
};

/**
 * OpenRouter Provider - BaseProvider Implementation
 * Provides access to 300+ models from 60+ providers via OpenRouter unified gateway
 */
export class OpenRouterProvider extends BaseProvider {
  private model: LanguageModel;
  private openRouterClient: ReturnType<typeof createOpenRouter>;
  private config: OpenRouterConfig;

  // Cache for available models to avoid repeated API calls
  private static modelsCache: string[] = [];
  private static modelsCacheTime = 0;
  private static readonly MODELS_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  // Cache for model capabilities (which models support tools)
  private static toolCapableModels: Set<string> = new Set();
  private static capabilitiesCached = false;

  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: { apiKey?: string; baseURL?: string },
  ) {
    super(modelName, AIProviderName.OPENROUTER, sdk as NeuroLink | undefined);

    // Build config: prefer credentials over env vars to avoid throwing when env vars are absent
    if (credentials?.apiKey) {
      this.config = {
        apiKey: credentials.apiKey,
        referer: process.env.OPENROUTER_REFERER,
        appName: process.env.OPENROUTER_APP_NAME,
      };
    } else {
      this.config = getOpenRouterConfig(); // throws if OPENROUTER_API_KEY missing
    }
    const config = this.config;

    // Build headers for attribution on openrouter.ai/activity dashboard
    const headers: Record<string, string> = {};
    if (config.referer) {
      headers["HTTP-Referer"] = config.referer;
    }
    if (config.appName) {
      headers["X-Title"] = config.appName;
    }

    // Create OpenRouter client with optional attribution headers
    this.openRouterClient = createOpenRouter({
      apiKey: config.apiKey,
      ...(credentials?.baseURL ? { baseURL: credentials.baseURL } : {}),
      ...(Object.keys(headers).length > 0 && { headers }),
    });

    // Initialize model with OpenRouter client
    // OpenRouterChatLanguageModel implements LanguageModelV3 which is part of the LanguageModel union
    this.model = this.openRouterClient(
      this.modelName || getDefaultOpenRouterModel(),
    );

    logger.debug("OpenRouter Provider initialized", {
      modelName: this.modelName,
      provider: this.providerName,
    });
  }

  protected getProviderName(): AIProviderName {
    return AIProviderName.OPENROUTER;
  }

  protected getDefaultModel(): string {
    return getDefaultOpenRouterModel();
  }

  /**
   * Returns the Vercel AI SDK model instance for OpenRouter
   */
  protected getAISDKModel(): LanguageModel {
    return this.model;
  }

  public formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new NetworkError(
        `Request timed out: ${error.message}`,
        "openrouter",
      );
    }

    // Check for timeout by error name and message as fallback
    const errorRecord = error as UnknownRecord;
    if (
      errorRecord?.name === "TimeoutError" ||
      (typeof errorRecord?.message === "string" &&
        errorRecord.message.includes("Timeout"))
    ) {
      return new NetworkError(
        `Request timed out: ${errorRecord?.message || "Unknown timeout"}`,
        "openrouter",
      );
    }
    if (typeof errorRecord?.message === "string") {
      if (
        errorRecord.message.includes("ECONNREFUSED") ||
        errorRecord.message.includes("Failed to fetch")
      ) {
        return new NetworkError(
          "OpenRouter API not available. Please check your network connection and try again.",
          "openrouter",
        );
      }

      if (
        errorRecord.message.includes("API_KEY_INVALID") ||
        errorRecord.message.includes("Invalid API key") ||
        errorRecord.message.includes("invalid_api_key") ||
        errorRecord.message.includes("Unauthorized")
      ) {
        return new AuthenticationError(
          "Invalid OpenRouter API key. Please check your OPENROUTER_API_KEY environment variable. " +
            "Get your key at https://openrouter.ai/keys",
          "openrouter",
        );
      }

      if (errorRecord.message.includes("rate limit")) {
        return new RateLimitError(
          "OpenRouter rate limit exceeded. Please try again later or upgrade your account at https://openrouter.ai/credits",
          "openrouter",
        );
      }

      if (
        errorRecord.message.includes("model") &&
        errorRecord.message.includes("not found")
      ) {
        return new InvalidModelError(
          `Model '${this.modelName}' not available on OpenRouter. ` +
            "Browse available models at https://openrouter.ai/models",
          "openrouter",
        );
      }

      if (errorRecord.message.includes("insufficient_credits")) {
        return new ProviderError(
          "Insufficient OpenRouter credits. Add credits at https://openrouter.ai/credits",
          "openrouter",
        );
      }

      // "No endpoints found" — model temporarily unavailable or unsupported parameters
      // This is distinct from tool errors: it can happen on any request when the
      // model has no available providers on OpenRouter (e.g., free-tier model down).
      if (errorRecord.message.includes("No endpoints found")) {
        return new InvalidModelError(
          `No endpoints found for model '${this.modelName}' on OpenRouter. ` +
            "The model may be temporarily unavailable or does not support the requested parameters. " +
            "Try a different model or check availability at https://openrouter.ai/models",
          "openrouter",
        );
      }

      // Tool/function calling errors
      if (
        errorRecord.message.includes("tool use") ||
        errorRecord.message.includes("tool_use") ||
        errorRecord.message.includes("function_call") ||
        errorRecord.message.includes("tools are not supported")
      ) {
        return new ProviderError(
          `Model '${this.modelName}' does not support tool calling. ` +
            "Use a tool-capable model like:\n" +
            "  • google/gemini-2.0-flash-exp:free (free)\n" +
            "  • meta-llama/llama-3.3-70b-instruct:free (free)\n" +
            "  • anthropic/claude-3.7-sonnet (paid)\n" +
            "  • openai/gpt-4o (paid)\n" +
            "Or use --disableTools flag. " +
            "See all tool-capable models at https://openrouter.ai/models?supported_parameters=tools",
          "openrouter",
        );
      }
    }

    return new ProviderError(
      `OpenRouter error: ${errorRecord?.message || "Unknown error"}`,
      "openrouter",
    );
  }

  /**
   * OpenRouter supports tools for compatible models
   * Checks cached model capabilities or uses known patterns as fallback
   */
  supportsTools(): boolean {
    const modelName = this.modelName || getDefaultOpenRouterModel();

    // If we have cached capabilities, use them
    if (OpenRouterProvider.capabilitiesCached) {
      const supported = OpenRouterProvider.toolCapableModels.has(modelName);
      logger.debug("OpenRouter: Tool support check (cached)", {
        model: modelName,
        supportsTools: supported,
      });
      return supported;
    }

    // Fallback: Known tool-capable model patterns (conservative list)
    const knownToolCapablePatterns = [
      "anthropic/claude",
      "openai/gpt-4",
      "openai/gpt-3.5",
      "openai/o1",
      "openai/o3",
      "openai/o4",
      "google/gemini",
      "google/gemma-3",
      "mistralai/mistral-large",
      "mistralai/mistral-small",
      "mistralai/devstral",
      "meta-llama/llama-3.3",
      "meta-llama/llama-3.2",
      "qwen/qwen3",
      "nvidia/nemotron",
    ];

    const isKnownCapable = knownToolCapablePatterns.some((pattern) =>
      modelName.toLowerCase().includes(pattern.toLowerCase()),
    );

    if (isKnownCapable) {
      logger.debug("OpenRouter: Tool support enabled (pattern match)", {
        model: modelName,
      });
      return true;
    }

    // For unknown models, warn and disable tools (safe default)
    logger.warn("OpenRouter: Unknown model tool capability, disabling tools", {
      model: modelName,
      suggestion:
        "Use a known tool-capable model like anthropic/claude-3.7-sonnet, openai/gpt-4o, or google/gemini-2.0-flash-exp:free",
    });
    return false;
  }

  /**
   * Provider-specific streaming implementation
   * Note: This is only used when tools are disabled
   */
  protected async executeStream(
    options: StreamOptions,
    analysisSchema?: ZodType | Schema<unknown>,
  ): Promise<StreamResult> {
    this.validateStreamOptions(options);

    const startTime = Date.now();
    let chunkCount = 0; // Track chunk count for debugging
    // Reviewer follow-up: capture upstream provider errors via onError so
    // the post-stream NoOutput detect can propagate the *real* cause
    // (e.g. content_filter, provider crash) into the sentinel's
    // providerError / modelResponseRaw instead of the AI SDK's generic
    // "No output generated" message.
    let capturedProviderError: unknown;
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

      const model = await this.getAISDKModelWithMiddleware(options);

      // Get all available tools (direct + MCP + external) for streaming
      // BaseProvider.stream() pre-merges base tools + external tools into options.tools
      const shouldUseTools = !options.disableTools && this.supportsTools();
      const tools: Record<string, Tool> = shouldUseTools
        ? (options.tools as Record<string, Tool>) || (await this.getAllTools())
        : {};

      logger.debug(`OpenRouter: Tools for streaming`, {
        shouldUseTools,
        toolCount: Object.keys(tools).length,
        toolNames: Object.keys(tools),
      });

      // Build complete stream options with proper typing
      // Note: maxRetries set to 0 for OpenRouter free tier to prevent SDK's quick retries
      // from consuming rate limits. Our test suite handles retries with appropriate delays.
      let streamOptions: Parameters<typeof streamText>[0] = {
        model: model,
        messages: messages,
        temperature: options.temperature,
        maxRetries: 0, // Disable SDK retries - let caller handle rate limit retries with delays
        // AI SDK v6 renamed `maxTokens` to `maxOutputTokens` — using the old
        // name here is a silent no-op, so OpenRouter sees no cap and applies
        // the model's full output max (typically 64K+ tokens) to its pre-bill
        // affordability check. That trips "This request requires more credits"
        // even on cheap models when the account balance is low.
        ...(options.maxTokens && { maxOutputTokens: options.maxTokens }),
        ...(shouldUseTools &&
          Object.keys(tools).length > 0 && {
            tools,
            toolChoice: resolveToolChoice(options, tools, shouldUseTools),
            stopWhen: stepCountIs(options.maxSteps || DEFAULT_MAX_STEPS),
          }),
        abortSignal: composeAbortSignals(
          options.abortSignal,
          timeoutController?.controller.signal,
        ),
        experimental_telemetry:
          this.telemetryHandler.getTelemetryConfig(options),
        experimental_repairToolCall: this.getToolCallRepairFn(options),

        onError: (event: { error: unknown }) => {
          const error = event.error;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          // Reviewer follow-up: propagate the captured error to the
          // post-stream NoOutput sentinel so telemetry sees the real
          // provider cause instead of "No output generated".
          capturedProviderError = error;
          logger.error(`OpenRouter: Stream error`, {
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
          logger.debug(`OpenRouter: Stream finished`, {
            finishReason: event.finishReason,
            totalChunks: chunkCount,
          });
        },

        onChunk: () => {
          chunkCount++;
        },

        onStepFinish: ({ toolCalls, toolResults }) => {
          emitToolEndFromStepFinish(
            this.neurolink?.getEventEmitter(),
            toolResults as Array<{
              toolName: string;
              output?: unknown;
              result?: unknown;
              error?: string;
            }>,
          );
          logger.info("Tool execution completed", {
            toolCallCount: toolCalls?.length || 0,
            toolResultCount: toolResults?.length || 0,
            toolNames: toolCalls?.map(
              (tc: { toolName: string }) => tc.toolName,
            ),
          });

          this.handleToolExecutionStorage(
            toolCalls,
            toolResults,
            options,
            new Date(),
          ).catch((error: unknown) => {
            logger.warn("OpenRouterProvider: Failed to store tool executions", {
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

      // Guard against NoOutputGeneratedError becoming an unhandled rejection.
      Promise.resolve(result.text)
        .catch((err: unknown) => {
          logger.debug(
            "Stream text promise rejected (expected for empty streams)",
            {
              error: err instanceof Error ? err.message : String(err),
            },
          );
        })
        .finally(() => timeoutController?.cleanup());

      // Transform stream to content object stream using fullStream (handles both text and tool calls)
      const transformedStream = (async function* () {
        // Reviewer follow-up: gate the post-stream NoOutput detect on
        // *content yielded*, not raw chunk count. AI SDK fullStream emits
        // control events ({ type: "start" }, "step-start", etc.) before
        // any text-delta — those incremented `chunkCount` and made the
        // post-stream check dead even when zero text was produced.
        let contentYielded = 0;
        try {
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
                logger.error(`OpenRouter: Error chunk received:`, {
                  errorType: errorChunk.type,
                  errorDetails: errorChunk.error,
                });
                throw new Error(
                  `OpenRouter streaming error: ${
                    (errorChunk.error as Record<string, unknown>)?.message ||
                    "Unknown error"
                  }`,
                );
              }

              if ("textDelta" in chunk) {
                // Text delta from fullStream
                const textDelta = (chunk as { textDelta: string }).textDelta;
                if (textDelta) {
                  contentYielded++;
                  yield { content: textDelta };
                }
              } else if (
                "type" in chunk &&
                chunk.type === "tool-call" &&
                "toolCallId" in chunk
              ) {
                // Tool call event - log for debugging
                const toolCallId = String(chunk.toolCallId);
                const toolName =
                  "toolName" in chunk ? String(chunk.toolName) : "unknown";
                logger.debug("OpenRouter: Tool call", {
                  toolCallId,
                  toolName,
                });
              }
            } else if (typeof chunk === "string") {
              // Direct string chunk from textStream fallback
              contentYielded++;
              yield { content: chunk };
            }
          }
        } catch (streamError) {
          if (NoOutputGeneratedError.isInstance(streamError)) {
            logger.warn(
              "OpenRouter: Stream produced no output (NoOutputGeneratedError) — caught from textStream",
            );
            const sentinel = await buildNoOutputSentinel(
              streamError,
              result,
              capturedProviderError,
            );
            stampNoOutputSpan(sentinel);
            yield sentinel as { content: string };
            return;
          }
          throw streamError;
        }
        // Curator P3-6 (round-2 fix): production trigger comes through
        // result.finishReason rejection, not textStream throws.
        if (contentYielded === 0) {
          const detected = await detectPostStreamNoOutput(
            result,
            capturedProviderError,
          );
          if (detected) {
            logger.warn(
              "OpenRouter: Stream produced no output (NoOutputGeneratedError) — caught from finishReason rejection",
            );
            stampNoOutputSpan(detected.sentinel);
            yield detected.sentinel as { content: string };
          }
        }
      })();

      // Create analytics promise that resolves after stream completion
      const analyticsPromise = streamAnalyticsCollector.createAnalytics(
        this.providerName,
        this.modelName,
        result as StreamTextResult,
        Date.now() - startTime,
        {
          requestId: `openrouter-stream-${Date.now()}`,
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
          streamId: `openrouter-${Date.now()}`,
        },
      };
    } catch (error) {
      timeoutController?.cleanup();
      throw this.handleProviderError(error);
    }
  }

  /**
   * Get available models from OpenRouter API
   * Dynamically fetches from /api/v1/models endpoint with caching and fallback
   */
  async getAvailableModels(): Promise<string[]> {
    const functionTag = "OpenRouterProvider.getAvailableModels";
    const now = Date.now();

    // Check if cached models are still valid
    if (
      OpenRouterProvider.modelsCache.length > 0 &&
      now - OpenRouterProvider.modelsCacheTime <
        OpenRouterProvider.MODELS_CACHE_DURATION
    ) {
      logger.debug(`[${functionTag}] Using cached models`, {
        cacheAge: Math.round((now - OpenRouterProvider.modelsCacheTime) / 1000),
        modelCount: OpenRouterProvider.modelsCache.length,
      });
      return OpenRouterProvider.modelsCache;
    }

    // Try to fetch models dynamically
    try {
      const dynamicModels = await this.fetchModelsFromAPI();
      if (dynamicModels.length > 0) {
        // Cache successful result
        OpenRouterProvider.modelsCache = dynamicModels;
        OpenRouterProvider.modelsCacheTime = now;

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

    // Fallback to hardcoded list if API fetch fails. Aligned with
    // `getDefaultOpenRouterModel()` — `anthropic/claude-3-5-sonnet` was
    // retired by OpenRouter late 2025 and would return a dead model here.
    const fallbackModels = [
      // Anthropic Claude models
      "anthropic/claude-3.7-sonnet",
      "anthropic/claude-3-5-haiku",
      "anthropic/claude-3-opus",
      // OpenAI models
      "openai/gpt-4o",
      "openai/gpt-4o-mini",
      "openai/gpt-4-turbo",
      // Google models
      "google/gemini-2.0-flash",
      "google/gemini-1.5-pro",
      // Meta Llama models
      "meta-llama/llama-3.1-70b-instruct",
      "meta-llama/llama-3.1-8b-instruct",
      // Mistral models
      "mistralai/mistral-large",
      "mistralai/mixtral-8x7b-instruct",
    ];

    logger.debug(`[${functionTag}] Using fallback model list`, {
      modelCount: fallbackModels.length,
    });

    return fallbackModels;
  }

  /**
   * Fetch available models from OpenRouter API /api/v1/models endpoint
   * @private
   */
  private async fetchModelsFromAPI(): Promise<string[]> {
    const functionTag = "OpenRouterProvider.fetchModelsFromAPI";
    const config = this.config;
    const modelsUrl = "https://openrouter.ai/api/v1/models";

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      MODELS_DISCOVERY_TIMEOUT_MS,
    );

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

      // Parse OpenRouter models response with type guard
      if (!this.isValidModelsResponse(data)) {
        throw new Error("Invalid response format: expected data.data array");
      }

      const models = (data as OpenRouterModelsResponse).data
        .map((model: OpenRouterModelInfo) => model.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
        .sort();

      logger.debug(`[${functionTag}] Successfully parsed models`, {
        totalModels: models.length,
        sampleModels: models.slice(0, 5),
      });

      return models;
    } catch (error) {
      clearTimeout(timeoutId);

      if (isAbortError(error)) {
        throw new Error(
          `Request timed out after ${MODELS_DISCOVERY_TIMEOUT_MS / 1000} seconds`,
          { cause: error },
        );
      }

      throw error;
    }
  }

  /**
   * Type guard to validate the models API response structure
   * @private
   */
  private isValidModelsResponse(
    data: unknown,
  ): data is OpenRouterModelsResponse {
    return (
      data !== null &&
      typeof data === "object" &&
      "data" in data &&
      Array.isArray((data as { data: unknown }).data)
    );
  }

  /**
   * Fetch and cache model capabilities from OpenRouter API
   * Call this to enable accurate tool support detection
   */
  async cacheModelCapabilities(): Promise<void> {
    const functionTag = "OpenRouterProvider.cacheModelCapabilities";

    if (OpenRouterProvider.capabilitiesCached) {
      return; // Already cached
    }

    try {
      const config = this.config;
      const modelsUrl = "https://openrouter.ai/api/v1/models";

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        MODELS_DISCOVERY_TIMEOUT_MS,
      );

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

      if (!this.isValidModelsResponse(data)) {
        throw new Error("Invalid response format");
      }

      // Extract tool-capable models
      const toolCapable = new Set<string>();
      for (const model of data.data) {
        if (model.id && model.supported_parameters?.includes("tools")) {
          toolCapable.add(model.id);
        }
      }

      OpenRouterProvider.toolCapableModels = toolCapable;
      OpenRouterProvider.capabilitiesCached = true;

      logger.debug(`[${functionTag}] Cached model capabilities`, {
        totalModels: data.data.length,
        toolCapableCount: toolCapable.size,
      });
    } catch (error) {
      logger.warn(
        `[${functionTag}] Failed to cache capabilities, using fallback patterns`,
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      // Don't set capabilitiesCached - let it use fallback patterns
    }
  }
}
