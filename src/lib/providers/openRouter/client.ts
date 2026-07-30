import { AIProviderName } from "../../constants/enums.js";
import {
  AuthenticationError,
  InvalidModelError,
  NetworkError,
  ProviderError,
  RateLimitError,
} from "../../types/index.js";
import type {
  NeurolinkCredentials,
  OpenRouterModelInfo,
  OpenRouterModelsResponse,
  UnknownRecord,
} from "../../types/index.js";
import { createProxyFetch } from "../../proxy/proxyFetch.js";
import { isAbortError } from "../../utils/errorHandling.js";
import { logger } from "../../utils/logger.js";
import { redactUrlCredentials } from "../../utils/logSanitize.js";
import { TimeoutError } from "../../utils/timeout.js";
import { OpenAIChatCompletionsProvider } from "../openaiChatCompletionsBase.js";
import { stripTrailingSlash } from "../openaiChatCompletionsClient.js";
import { getDefaultOpenRouterModel } from "./utils.js";

// OpenRouter's OpenAI-compatible gateway. `${baseURL}/chat/completions` and
// `${baseURL}/models` both resolve correctly off this root.
const OPENROUTER_DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const MODELS_DISCOVERY_TIMEOUT_MS = 5000; // 5 seconds for model discovery

const getOpenRouterApiKey = (): string => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY environment variable is required. " +
        "Get your API key at https://openrouter.ai/keys",
    );
  }
  return apiKey;
};

/**
 * OpenRouter Provider — direct HTTP, no AI SDK.
 *
 * OpenAI-compatible unified gateway to 300+ models from 60+ providers. All
 * request/stream/tool-loop orchestration lives in
 * `OpenAIChatCompletionsProvider`; this class declares configuration plus the
 * OpenRouter-specific behaviour:
 *
 *   1. Attribution headers — optional `HTTP-Referer` / `X-Title` (from
 *      `OPENROUTER_REFERER` / `OPENROUTER_APP_NAME`) are merged into every
 *      request via `getAuthHeaders` so usage shows up on the openrouter.ai
 *      activity dashboard.
 *   2. Per-model tool gating — OpenRouter proxies many models with varying
 *      tool support, so `supportsTools()` consults a cached capability set
 *      (populated by `cacheModelCapabilities()`) and falls back to a
 *      conservative known-capable pattern list.
 *   3. Dynamic model discovery — `getAvailableModels()` fetches the live
 *      `/models` list (10-minute cache) with a hardcoded fallback.
 *
 * @see https://openrouter.ai/docs
 */
export class OpenRouterProvider extends OpenAIChatCompletionsProvider {
  private readonly referer?: string;
  private readonly appName?: string;

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
    credentials?: NeurolinkCredentials["openrouter"],
  ) {
    // Trim the override before applying precedence. A blank/whitespace
    // `credentials.apiKey` must NOT bypass `getOpenRouterApiKey()` — that
    // would build a client with an unusable bearer token and fail at request
    // time with a confusing 401 instead of at construction time.
    const overrideApiKey = credentials?.apiKey?.trim();
    const apiKey =
      overrideApiKey && overrideApiKey.length > 0
        ? overrideApiKey
        : getOpenRouterApiKey();
    // Treat blank/whitespace overrides as unset so an empty
    // `credentials.baseURL` or `OPENROUTER_BASE_URL=` cannot silently override
    // the default with "" (mirrors the apiKey precedence above).
    const baseURL =
      credentials?.baseURL?.trim() ||
      process.env.OPENROUTER_BASE_URL?.trim() ||
      OPENROUTER_DEFAULT_BASE_URL;

    super(AIProviderName.OPENROUTER, modelName, sdk, { baseURL, apiKey });

    // Trim attribution values so whitespace-only env vars are not sent as
    // empty HTTP-Referer / X-Title headers.
    this.referer = process.env.OPENROUTER_REFERER?.trim() || undefined;
    this.appName = process.env.OPENROUTER_APP_NAME?.trim() || undefined;

    logger.debug("OpenRouter Provider initialized", {
      modelName: this.modelName,
      providerName: this.providerName,
      baseURL: redactUrlCredentials(this.config.baseURL),
    });
  }

  // ===========================================================================
  // Abstract hooks (required)
  // ===========================================================================

  protected getProviderName(): AIProviderName {
    return AIProviderName.OPENROUTER;
  }

  protected getDefaultModel(): string {
    return getDefaultOpenRouterModel();
  }

  protected formatProviderError(error: unknown): Error {
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

      // "No endpoints found" — model temporarily unavailable or unsupported
      // parameters. Distinct from tool errors: it can happen on any request
      // when the model has no available providers on OpenRouter.
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

  // ===========================================================================
  // Optional hooks — provider-specific quirks
  // ===========================================================================

  protected getFallbackModelName(): string {
    return getDefaultOpenRouterModel();
  }

  /**
   * Attribution headers are merged into every request alongside the bearer
   * token so OpenRouter can attribute usage on its activity dashboard.
   */
  protected getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = { ...super.getAuthHeaders() };
    if (this.referer) {
      headers["HTTP-Referer"] = this.referer;
    }
    if (this.appName) {
      headers["X-Title"] = this.appName;
    }
    return headers;
  }

  /**
   * OpenRouter proxies models with varying tool support. Use cached
   * capabilities when available (populated by `cacheModelCapabilities()`),
   * otherwise fall back to a conservative known-capable pattern list and
   * disable tools for unknown models.
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

  // ===========================================================================
  // Model discovery (OpenRouter /models endpoint)
  // ===========================================================================

  /**
   * Models/capabilities endpoint, derived from the configured `baseURL` so a
   * custom OpenRouter-compatible gateway is honoured for discovery too.
   */
  private getModelsUrl(): string {
    return `${stripTrailingSlash(this.config.baseURL)}/models`;
  }

  /**
   * Get available models from the OpenRouter `/models` endpoint, with a
   * 10-minute cache and a hardcoded fallback when the fetch fails.
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
    // `getDefaultOpenRouterModel()` — `anthropic/claude-sonnet-4.5` is the
    // current default and avoids the retired model.
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
   * Fetch available models from the OpenRouter `/models` endpoint.
   * @private
   */
  private async fetchModelsFromAPI(): Promise<string[]> {
    const functionTag = "OpenRouterProvider.fetchModelsFromAPI";

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      MODELS_DISCOVERY_TIMEOUT_MS,
    );

    try {
      const modelsUrl = this.getModelsUrl();
      logger.debug(`[${functionTag}] Fetching models from ${modelsUrl}`);

      const proxyFetch = createProxyFetch();
      const response = await proxyFetch(modelsUrl, {
        method: "GET",
        headers: {
          ...this.getAuthHeaders(),
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
   * Type guard to validate the models API response structure.
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
   * Fetch and cache model capabilities from the OpenRouter `/models` endpoint.
   * Call this to enable accurate per-model tool support detection.
   */
  async cacheModelCapabilities(): Promise<void> {
    const functionTag = "OpenRouterProvider.cacheModelCapabilities";

    if (OpenRouterProvider.capabilitiesCached) {
      return; // Already cached
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        MODELS_DISCOVERY_TIMEOUT_MS,
      );

      const proxyFetch = createProxyFetch();
      const response = await proxyFetch(this.getModelsUrl(), {
        method: "GET",
        headers: {
          ...this.getAuthHeaders(),
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
