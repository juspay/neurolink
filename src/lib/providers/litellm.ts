import { createOpenAI } from "@ai-sdk/openai";
import { SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import type { ZodType } from "zod";
import type { AIProviderName } from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
import { streamAnalyticsCollector } from "../core/streamAnalytics.js";
import type { NeuroLink } from "../neurolink.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import type {
  UnknownRecord,
  StreamOptions,
  StreamResult,
  StreamTextResult,
  StreamToolCall,
  StreamToolResult,
} from "../types/index.js";
import {
  AuthenticationError,
  InvalidModelError,
  ModelAccessDeniedError,
  NetworkError,
  ProviderError,
  RateLimitError,
  isModelAccessDeniedMessage,
  parseAllowedModels,
} from "../types/index.js";
import { isAbortError } from "../utils/errorHandling.js";
import { emitToolEndFromStepFinish } from "../utils/toolEndEmitter.js";
import { logger } from "../utils/logger.js";
import {
  buildNoOutputSentinel,
  detectPostStreamNoOutput,
  stampNoOutputSpan,
} from "../utils/noOutputSentinel.js";
import { calculateCost } from "../utils/pricing.js";
import { getProviderModel } from "../utils/providerConfig.js";
import {
  composeAbortSignals,
  createTimeoutController,
  TimeoutError,
  withTimeout,
} from "../utils/timeout.js";
import { resolveToolChoice } from "../utils/toolChoice.js";
import { getModelId } from "./providerTypeUtils.js";
import type { LanguageModel, Schema, Tool } from "../types/index.js";
import { NoOutputGeneratedError } from "../utils/generationErrors.js";
import { Output, stepCountIs } from "../utils/tool.js";
import { streamText } from "../utils/generation.js";

const streamTracer = trace.getTracer("neurolink.provider.litellm");

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
  private model: LanguageModel;
  private credentials?: { apiKey?: string; baseURL?: string };

  // Cache for available models to avoid repeated API calls
  private static modelsCache: string[] = [];
  private static modelsCacheTime = 0;
  private static readonly MODELS_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: { apiKey?: string; baseURL?: string },
  ) {
    super(modelName, "litellm" as AIProviderName, sdk as NeuroLink | undefined);

    // Store per-request credentials for use in embed/embedMany/fetchModelsFromAPI
    this.credentials = credentials;

    // Initialize LiteLLM using OpenAI SDK with explicit configuration
    const config = getLiteLLMConfig();

    // Create OpenAI SDK instance configured for LiteLLM proxy
    // LiteLLM acts as a proxy server that implements the OpenAI-compatible API.
    // To communicate with LiteLLM instead of the default OpenAI endpoint, we use createOpenAI
    // with a custom baseURL and apiKey. This ensures all requests are routed through the LiteLLM
    // proxy, allowing access to multiple models and custom authentication.
    const customOpenAI = createOpenAI({
      baseURL: credentials?.baseURL ?? config.baseURL,
      apiKey: credentials?.apiKey ?? config.apiKey,
      fetch: createProxyFetch(),
    });

    this.model = customOpenAI.chat(this.modelName || getDefaultLiteLLMModel());

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
  protected getAISDKModel(): LanguageModel {
    return this.model;
  }

  public formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new NetworkError(
        `Request timed out: ${error.message}`,
        this.providerName,
      );
    }

    // Check for timeout by error name and message as fallback
    const errorRecord = error as UnknownRecord;
    if (
      errorRecord?.name === "TimeoutError" ||
      (typeof errorRecord?.message === "string" &&
        errorRecord.message.toLowerCase().includes("timeout"))
    ) {
      return new NetworkError(
        `Request timed out: ${errorRecord?.message || "Unknown timeout"}`,
        this.providerName,
      );
    }
    if (typeof errorRecord?.message === "string") {
      if (
        errorRecord.message.includes("ECONNREFUSED") ||
        errorRecord.message.includes("Failed to fetch")
      ) {
        return new NetworkError(
          "LiteLLM proxy server not available. Please start the LiteLLM proxy server at " +
            `${process.env.LITELLM_BASE_URL || "http://localhost:4000"}`,
          this.providerName,
        );
      }

      // Curator P1-1: detect "team not allowed to access model" responses
      // and surface as ModelAccessDeniedError with the allowed_models array
      // parsed from the body. Must run before the generic "API key" check
      // because LiteLLM phrases this as a 403 distinct from auth.
      if (isModelAccessDeniedMessage(errorRecord.message)) {
        return new ModelAccessDeniedError(errorRecord.message, {
          provider: this.providerName,
          requestedModel: this.modelName,
          allowedModels: parseAllowedModels(errorRecord.message),
        });
      }

      if (
        errorRecord.message.includes("API_KEY_INVALID") ||
        errorRecord.message.includes("Invalid API key")
      ) {
        return new AuthenticationError(
          "Invalid LiteLLM configuration. Please check your LITELLM_API_KEY environment variable.",
          this.providerName,
        );
      }

      if (errorRecord.message.toLowerCase().includes("rate limit")) {
        return new RateLimitError(
          "LiteLLM rate limit exceeded. Please try again later.",
          this.providerName,
        );
      }

      if (
        errorRecord.message.toLowerCase().includes("model") &&
        errorRecord.message.toLowerCase().includes("not found")
      ) {
        return new InvalidModelError(
          `Model '${this.modelName}' not available in LiteLLM proxy. ` +
            "Please check your LiteLLM configuration and ensure the model is configured.",
          this.providerName,
        );
      }
    }

    return new ProviderError(
      `LiteLLM error: ${errorRecord?.message || "Unknown error"}`,
      this.providerName,
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
    analysisSchema?: ZodType | Schema<unknown>,
  ): Promise<StreamResult> {
    this.validateStreamOptions(options);

    const startTime = Date.now();
    let chunkCount = 0; // Track chunk count for debugging
    // Reviewer follow-up: capture upstream provider errors via onError so
    // the post-stream NoOutput detect can propagate the *real* cause
    // (content_filter, provider crash, etc.) into the sentinel's
    // providerError / modelResponseRaw instead of "No output generated".
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

      const model = await this.getAISDKModelWithMiddleware(options); // This is where network connection happens!

      // Get tools - options.tools is pre-merged by BaseProvider.stream()
      const shouldUseTools = !options.disableTools && this.supportsTools();
      const tools = shouldUseTools
        ? (options.tools as Record<string, Tool>) || (await this.getAllTools())
        : {};

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
          emitToolEndFromStepFinish(
            this.neurolink?.getEventEmitter(),
            toolResults as Array<{
              toolName: string;
              output?: unknown;
              result?: unknown;
              error?: string;
            }>,
          );
          logger.info("Tool execution completed", { toolResults, toolCalls });

          for (const toolCall of toolCalls) {
            collectedToolCalls.push({
              toolCallId: toolCall.toolCallId,
              toolName: toolCall.toolName,
              args:
                (toolCall as { args?: Record<string, unknown> }).args ??
                (toolCall as { input?: Record<string, unknown> }).input ??
                (toolCall as { parameters?: Record<string, unknown> })
                  .parameters ??
                {},
            });
          }

          for (const toolResult of toolResults) {
            const rawToolResult = toolResult as {
              output?: unknown;
              result?: unknown;
              error?: string;
              toolCallId?: string;
            };
            collectedToolResults.push({
              toolName: toolResult.toolName,
              status: rawToolResult.error ? "failure" : "success",
              output:
                ((rawToolResult.output ??
                  rawToolResult.result) as StreamToolResult["output"]) ??
                undefined,
              error: rawToolResult.error,
              id: rawToolResult.toolCallId ?? toolResult.toolName,
            });
          }

          this.handleToolExecutionStorage(
            toolCalls,
            toolResults,
            options,
            new Date(),
          ).catch((error: unknown) => {
            logger.warn("[LiteLLMProvider] Failed to store tool executions", {
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

      // Wrap streamText in an OTel span to capture provider-level latency, token usage, and cost
      const streamSpan = streamTracer.startSpan(
        "neurolink.provider.streamText",
        {
          kind: SpanKind.CLIENT,
          attributes: {
            "gen_ai.system": "litellm",
            "gen_ai.request.model": getModelId(
              model,
              this.modelName || "unknown",
            ),
          },
        },
      );

      let result: ReturnType<typeof streamText>;
      const collectedToolCalls: StreamToolCall[] = [];
      const collectedToolResults: StreamToolResult[] = [];
      try {
        result = streamText(streamOptions);
      } catch (streamError) {
        streamSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message:
            streamError instanceof Error
              ? streamError.message
              : String(streamError),
        });
        streamSpan.end();
        throw streamError;
      }

      // Collect token usage, cost, and finish reason asynchronously when the stream completes,
      // then end the span. This avoids blocking the stream consumer.
      Promise.resolve(result.usage)
        .then((usage) => {
          streamSpan.setAttribute(
            "gen_ai.usage.input_tokens",
            usage.inputTokens || 0,
          );
          streamSpan.setAttribute(
            "gen_ai.usage.output_tokens",
            usage.outputTokens || 0,
          );
          const cost = calculateCost(this.providerName, this.modelName, {
            input: usage.inputTokens || 0,
            output: usage.outputTokens || 0,
            total: (usage.inputTokens || 0) + (usage.outputTokens || 0),
          });
          if (cost && cost > 0) {
            streamSpan.setAttribute("neurolink.cost", cost);
          }
        })
        .catch(() => {
          // Usage may not be available if the stream is aborted
        });
      Promise.resolve(result.finishReason)
        .then((reason) => {
          streamSpan.setAttribute(
            "gen_ai.response.finish_reason",
            reason || "unknown",
          );
        })
        .catch(() => {
          // Finish reason may not be available if the stream is aborted
        });
      Promise.resolve(result.text)
        .then(() => {
          streamSpan.end();
        })
        .catch((err: unknown) => {
          streamSpan.setStatus({
            code: SpanStatusCode.ERROR,
            message: err instanceof Error ? err.message : String(err),
          });
          streamSpan.end();
        });

      timeoutController?.cleanup();

      const transformedStream = this.createLiteLLMTransformedStream(
        result,
        () => capturedProviderError,
      );

      // Create analytics promise that resolves after stream completion
      const analyticsPromise = streamAnalyticsCollector.createAnalytics(
        this.providerName,
        this.modelName,
        result as StreamTextResult,
        Date.now() - startTime,
        {
          requestId:
            (options as { requestId?: string }).requestId ??
            `litellm-stream-${Date.now()}`,
          streamingMode: true,
        },
      );

      return {
        stream: transformedStream,
        provider: this.providerName,
        model: this.modelName,
        ...(shouldUseTools && {
          toolCalls: collectedToolCalls,
          toolResults: collectedToolResults,
        }),
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

  private async *createLiteLLMTransformedStream(
    result: ReturnType<typeof streamText>,
    getCapturedProviderError?: () => unknown,
  ): AsyncGenerator<{ content: string }> {
    // Reviewer follow-up: gate the post-stream NoOutput detect on
    // *content yielded*, not raw chunk count. AI SDK fullStream emits
    // control events ({ type: "start" }, "step-start", etc.) before any
    // text-delta — those incremented chunkCount and made the post-stream
    // detect dead even when zero text was produced.
    let contentYielded = 0;
    try {
      const streamToUse = result.fullStream || result.textStream;

      for await (const chunk of streamToUse) {
        if (chunk && typeof chunk === "object") {
          if ("type" in chunk && chunk.type === "error") {
            const errorChunk = chunk as {
              type: "error";
              error: Record<string, unknown>;
            };
            logger.error(`LiteLLM: Error chunk received:`, {
              errorType: errorChunk.type,
              errorDetails: errorChunk.error,
            });
            throw this.formatProviderError(
              new Error(
                `LiteLLM streaming error: ${(errorChunk.error as Record<string, unknown>)?.message || "Unknown error"}`,
              ),
            );
          }

          if ("textDelta" in chunk) {
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
            logger.debug("LiteLLM: Tool call", {
              toolCallId: String(chunk.toolCallId),
              toolName:
                "toolName" in chunk ? String(chunk.toolName) : "unknown",
            });
          }
        } else if (typeof chunk === "string") {
          contentYielded++;
          yield { content: chunk };
        }
      }
    } catch (streamError) {
      if (NoOutputGeneratedError.isInstance(streamError)) {
        logger.warn(
          "LiteLLM: Stream produced no output (NoOutputGeneratedError) — caught from textStream",
        );
        // Yield the enriched sentinel so downstream telemetry has
        // finishReason / usage / providerError. Match the other
        // providers' pattern: yield + return (no throw). NeuroLink's
        // iteration fallback at neurolink.ts only fires for
        // looksLikeModelAccessDenied errors, so a NoOutput throw here
        // would NOT trigger any fallback — and it would mask the
        // already-yielded sentinel from consumers expecting a clean
        // stream. The sentinel itself signals the no-output condition.
        const sentinel = await buildNoOutputSentinel(
          streamError,
          result,
          getCapturedProviderError?.(),
        );
        stampNoOutputSpan(sentinel);
        yield sentinel as { content: string };
        return;
      }
      throw streamError;
    }
    // Curator P3-6 (round-2 fix): production trigger sets the error on
    // result.finishReason rejection (NOT thrown from textStream).
    // Surface that path here, matching the catch above (yield + return).
    if (contentYielded === 0) {
      const detected = await detectPostStreamNoOutput(
        result,
        getCapturedProviderError?.(),
      );
      if (detected) {
        logger.warn(
          "LiteLLM: Stream produced no output (NoOutputGeneratedError) — caught from finishReason rejection",
        );
        stampNoOutputSpan(detected.sentinel);
        yield detected.sentinel as { content: string };
      }
    }
  }

  /**
   * Generate an embedding for a single text input
   * Uses the LiteLLM proxy with OpenAI-compatible embedding API
   */
  async embed(text: string, modelName?: string): Promise<number[]> {
    const { embed: aiEmbed } = await import("../utils/generation.js");
    const { createOpenAI } = await import("@ai-sdk/openai");
    const config = getLiteLLMConfig();
    const embeddingModelName =
      modelName ||
      process.env.LITELLM_EMBEDDING_MODEL ||
      "gemini-embedding-001";

    const customOpenAI = createOpenAI({
      baseURL: this.credentials?.baseURL ?? config.baseURL,
      apiKey: this.credentials?.apiKey ?? config.apiKey,
      fetch: createProxyFetch(),
    });

    const embeddingModel = customOpenAI.textEmbeddingModel(embeddingModelName);
    // Wrap in withTimeout so stalled upstream embedding requests abort instead
    // of hanging forever. 30s matches the default for embedding endpoints
    // across the OpenAI-compatible cluster.
    const result = await withTimeout(
      aiEmbed({ model: embeddingModel, value: text }),
      30_000,
      "litellm",
      "generate",
    );
    return result.embedding;
  }

  /**
   * Generate embeddings for multiple text inputs
   * Uses the LiteLLM proxy with OpenAI-compatible embedding API
   */
  async embedMany(texts: string[], modelName?: string): Promise<number[][]> {
    const { embedMany: aiEmbedMany } = await import("../utils/generation.js");
    const { createOpenAI } = await import("@ai-sdk/openai");
    const config = getLiteLLMConfig();
    const embeddingModelName =
      modelName ||
      process.env.LITELLM_EMBEDDING_MODEL ||
      "gemini-embedding-001";

    const customOpenAI = createOpenAI({
      baseURL: this.credentials?.baseURL ?? config.baseURL,
      apiKey: this.credentials?.apiKey ?? config.apiKey,
      fetch: createProxyFetch(),
    });

    const embeddingModel = customOpenAI.textEmbeddingModel(embeddingModelName);
    // Wrap in withTimeout so a single slow batch doesn't hang indefinitely.
    const result = await withTimeout(
      aiEmbedMany({ model: embeddingModel, values: texts }),
      30_000,
      "litellm",
      "generate",
    );
    return result.embeddings;
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
    const fallbackModels = process.env.LITELLM_FALLBACK_MODELS?.split(",")
      .map((m) => m.trim())
      .filter((m) => m.length > 0) || [
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
    const resolvedBaseURL = this.credentials?.baseURL ?? config.baseURL;
    const resolvedApiKey = this.credentials?.apiKey ?? config.apiKey;
    const modelsUrl = `${resolvedBaseURL}/v1/models`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      logger.debug(`[${functionTag}] Fetching models from ${modelsUrl}`);

      const proxyFetch = createProxyFetch();
      const response = await proxyFetch(modelsUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${resolvedApiKey}`,
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

      if (isAbortError(error)) {
        throw new NetworkError(
          "Request timed out after 5 seconds",
          this.providerName,
        );
      }

      throw error;
    }
  }
}
