import { SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import type { AIProviderName } from "../constants/enums.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import type {
  OpenAICompatBuildBodyArgs,
  OpenAICompatStreamLifecycleListeners,
  UnknownRecord,
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
import { logger } from "../utils/logger.js";
import { redactUrlCredentials } from "../utils/logSanitize.js";
import { isGemini25Model as isCanonicalGemini25Model } from "../utils/modelDetection.js";
import { calculateCost } from "../utils/pricing.js";
import { getProviderModel } from "../utils/providerConfig.js";
import { createTimeoutController, TimeoutError } from "../utils/timeout.js";
import { stripTrailingSlash } from "./openaiChatCompletionsClient.js";
import { OpenAIChatCompletionsProvider } from "./openaiChatCompletionsBase.js";

const streamTracer = trace.getTracer("neurolink.provider.litellm");

const FALLBACK_LITELLM_MODEL = "openai/gpt-4o-mini";

const getLiteLLMConfig = () => ({
  baseURL: process.env.LITELLM_BASE_URL || "http://localhost:4000",
  apiKey: process.env.LITELLM_API_KEY || "sk-anything",
});

/**
 * LiteLLM uses a 'provider/model' format. Override via LITELLM_MODEL env var.
 */
const getDefaultLiteLLMModel = (): string =>
  getProviderModel("LITELLM_MODEL", FALLBACK_LITELLM_MODEL);

// LiteLLM model ids come in `provider/model` form (e.g. "google/gemini-2.5-flash").
// Strip the provider prefix and delegate to the canonical anchored-regex
// check in src/lib/utils/modelDetection.ts so the truth lives in one place.
const isGemini25Model = (modelName: string): boolean => {
  const lastSegment = modelName.includes("/")
    ? modelName.slice(modelName.lastIndexOf("/") + 1)
    : modelName;
  return isCanonicalGemini25Model(lastSegment);
};

/**
 * LiteLLM Provider — direct HTTP, no AI SDK. Talks to a LiteLLM proxy
 * server (or any deployment that speaks OpenAI chat-completions + the
 * `/v1/models` and `/v1/embeddings` endpoints).
 *
 * All request/stream/tool-loop orchestration lives in
 * `OpenAIChatCompletionsProvider`. This class adds LiteLLM-specific
 * behaviour: OTel span wrap with cost (`onStreamStart`), Gemini 2.5
 * maxTokens skip (`adjustBuildBodyOptions`), ModelAccessDeniedError on
 * 403, 10-minute model cache (`getAvailableModels`), `LITELLM_FALLBACK_MODELS`
 * env-driven fallback list, and native `/v1/embeddings`.
 */
export class LiteLLMProvider extends OpenAIChatCompletionsProvider {
  private static modelsCache: string[] = [];
  private static modelsCacheTime = 0;
  private static readonly MODELS_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: { apiKey?: string; baseURL?: string },
  ) {
    const envConfig = getLiteLLMConfig();
    super("litellm" as AIProviderName, modelName, sdk, {
      baseURL: credentials?.baseURL ?? envConfig.baseURL,
      apiKey: credentials?.apiKey ?? envConfig.apiKey,
    });

    logger.debug("LiteLLM Provider initialized", {
      modelName: this.modelName,
      provider: this.providerName,
      baseURL: redactUrlCredentials(this.config.baseURL),
    });
  }

  protected getProviderName(): AIProviderName {
    return "litellm" as AIProviderName;
  }

  protected getDefaultModel(): string {
    return getDefaultLiteLLMModel();
  }

  protected getFallbackModelName(): string {
    return FALLBACK_LITELLM_MODEL;
  }

  protected getFallbackModels(): string[] {
    return (
      process.env.LITELLM_FALLBACK_MODELS?.split(",")
        .map((m) => m.trim())
        .filter((m) => m.length > 0) || [
        "openai/gpt-4o",
        "anthropic/claude-3-haiku",
        "meta-llama/llama-3.1-8b-instruct",
        "google/gemini-2.5-flash",
      ]
    );
  }

  /**
   * Gemini 2.5 models on LiteLLM have a known compatibility issue with
   * `max_tokens` — strip it before the wire body is built. Applies to
   * both streaming and non-streaming paths.
   */
  protected adjustBuildBodyOptions(
    modelId: string,
    opts: OpenAICompatBuildBodyArgs["options"],
  ): OpenAICompatBuildBodyArgs["options"] {
    if (isGemini25Model(modelId) && opts.maxTokens !== undefined) {
      if (logger.shouldLog("debug")) {
        logger.debug(
          "LiteLLM: Skipping maxTokens for Gemini 2.5 model (known compatibility issue)",
          { modelId, requestedMaxTokens: opts.maxTokens },
        );
      }
      return { ...opts, maxTokens: undefined };
    }
    return opts;
  }

  /**
   * Wrap the stream in an OTel span to capture provider-level latency,
   * token usage, finish reason, and cost. Matches the pre-migration
   * behaviour where streamText was wrapped in `neurolink.provider.streamText`.
   */
  protected onStreamStart(
    modelId: string,
  ): OpenAICompatStreamLifecycleListeners | undefined {
    const span = streamTracer.startSpan("neurolink.provider.streamText", {
      kind: SpanKind.CLIENT,
      attributes: {
        "gen_ai.system": "litellm",
        "gen_ai.request.model": modelId,
      },
    });
    let spanEnded = false;
    const endSpan = () => {
      if (!spanEnded) {
        spanEnded = true;
        span.end();
      }
    };
    return {
      onUsage: (usage) => {
        span.setAttribute("gen_ai.usage.input_tokens", usage.promptTokens);
        span.setAttribute("gen_ai.usage.output_tokens", usage.completionTokens);
        const cost = calculateCost(this.providerName, this.modelName, {
          input: usage.promptTokens,
          output: usage.completionTokens,
          total: usage.totalTokens,
        });
        if (cost && cost > 0) {
          span.setAttribute("neurolink.cost", cost);
        }
      },
      onFinish: (reason, capturedError) => {
        span.setAttribute("gen_ai.response.finish_reason", reason || "unknown");
        if (reason === "error") {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message:
              capturedError instanceof Error
                ? capturedError.message
                : String(capturedError ?? "stream error"),
          });
        }
        endSpan();
      },
    };
  }

  public formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new NetworkError(
        `Request timed out: ${error.message}`,
        this.providerName,
      );
    }

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

      // Curator P1-1: detect "team not allowed to access model" responses and
      // surface as ModelAccessDeniedError with the allowed_models array parsed
      // from the body. Must run before the generic "API key" check because
      // LiteLLM phrases this as a 403 distinct from auth.
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
   * Get available models from LiteLLM proxy `/v1/models` endpoint.
   * Caches results for 10 minutes; falls back to env-driven list or a
   * minimal safe default if the API fetch fails.
   */
  async getAvailableModels(): Promise<string[]> {
    const now = Date.now();

    if (
      LiteLLMProvider.modelsCache.length > 0 &&
      now - LiteLLMProvider.modelsCacheTime <
        LiteLLMProvider.MODELS_CACHE_DURATION
    ) {
      logger.debug("[LiteLLMProvider.getAvailableModels] Using cached models", {
        cacheAge: Math.round((now - LiteLLMProvider.modelsCacheTime) / 1000),
        modelCount: LiteLLMProvider.modelsCache.length,
      });
      return LiteLLMProvider.modelsCache;
    }

    try {
      const dynamicModels = await this.fetchModelsFromAPI();
      if (dynamicModels.length > 0) {
        LiteLLMProvider.modelsCache = dynamicModels;
        LiteLLMProvider.modelsCacheTime = now;
        return dynamicModels;
      }
    } catch (error) {
      logger.warn(
        "[LiteLLMProvider.getAvailableModels] Failed to fetch models from API, using fallback",
        { error: error instanceof Error ? error.message : String(error) },
      );
    }

    return this.getFallbackModels();
  }

  private async fetchModelsFromAPI(): Promise<string[]> {
    const modelsUrl = `${stripTrailingSlash(this.config.baseURL)}/v1/models`;
    const proxyFetch = createProxyFetch();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await proxyFetch(modelsUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = (await response.json()) as {
        data?: Array<{ id?: string }>;
      };
      if (!Array.isArray(data.data)) {
        throw new Error("Invalid response format: expected data.data array");
      }
      return data.data
        .map((m) => m.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
        .sort();
    } catch (error) {
      if (isAbortError(error)) {
        throw new NetworkError(
          "Request timed out after 5 seconds",
          this.providerName,
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Generate an embedding for a single text input via native /v1/embeddings.
   */
  async embed(text: string, modelName?: string): Promise<number[]> {
    const embeddingModelName =
      modelName ||
      process.env.LITELLM_EMBEDDING_MODEL ||
      "gemini-embedding-001";
    const [embedding] = await this.callEmbeddings(
      embeddingModelName,
      [text],
      "embed",
    );
    return embedding;
  }

  /**
   * Generate embeddings for multiple text inputs via native /v1/embeddings.
   */
  async embedMany(texts: string[], modelName?: string): Promise<number[][]> {
    const embeddingModelName =
      modelName ||
      process.env.LITELLM_EMBEDDING_MODEL ||
      "gemini-embedding-001";
    return this.callEmbeddings(embeddingModelName, texts, "embedMany");
  }

  private async callEmbeddings(
    modelName: string,
    input: string[],
    operation: "embed" | "embedMany",
  ): Promise<number[][]> {
    const url = `${stripTrailingSlash(this.config.baseURL)}/embeddings`;
    const fetchImpl = createProxyFetch();
    const timeoutController = createTimeoutController(
      30_000,
      this.providerName,
      "generate",
    );
    try {
      const res = await fetchImpl(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          input: input.length === 1 ? input[0] : input,
        }),
        ...(timeoutController?.controller.signal
          ? { signal: timeoutController.controller.signal }
          : {}),
      });
      if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        const parsed = bodyText
          ? (JSON.parse(bodyText) as {
              error?: { message?: string };
            })
          : undefined;
        throw this.formatProviderError(
          new Error(
            parsed?.error?.message ||
              `LiteLLM ${operation} failed with status ${res.status}`,
          ),
        );
      }
      const json = (await res.json()) as {
        data?: Array<{ embedding?: number[] }>;
      };
      const embeddings = (json.data ?? [])
        .map((row) => row.embedding)
        .filter((e): e is number[] => Array.isArray(e));
      if (embeddings.length === 0) {
        throw new ProviderError(
          `LiteLLM ${operation} returned no embeddings`,
          this.providerName,
        );
      }
      return embeddings;
    } finally {
      timeoutController?.cleanup();
    }
  }
}
