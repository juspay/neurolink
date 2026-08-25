import { SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import type { AIProviderName } from "../../constants/enums.js";
import {
  registerRuntimeContextWindow,
  registerRuntimeOutputCeiling,
} from "../../constants/contextWindows.js";
import { createProxyFetch } from "../../proxy/proxyFetch.js";
import type {
  OpenAICompatBuildBodyArgs,
  OpenAICompatStreamLifecycleListeners,
  ProviderErrorRule,
  UnknownRecord,
} from "../../types/index.js";
import {
  AuthenticationError,
  InvalidModelError,
  ModelAccessDeniedError,
  NetworkError,
  ProviderError,
  RateLimitError,
  isModelAccessDeniedMessage,
  parseAllowedModels,
} from "../../types/index.js";
import {
  classifyProviderError,
  DEFAULT_ERROR_RULES,
} from "../../utils/errorClassifier.js";
import { isAbortError } from "../../utils/errorHandling.js";
import { logger } from "../../utils/logger.js";
import { redactUrlCredentials } from "../../utils/logSanitize.js";
import { isGemini25Model as isCanonicalGemini25Model } from "../../utils/modelDetection.js";
import { calculateCost } from "../../utils/pricing.js";
import { getProviderModel } from "../../utils/providerConfig.js";
import { createTimeoutController } from "../../utils/timeout.js";
import { stripTrailingSlash } from "../openaiChatCompletionsClient.js";
import { OpenAIChatCompletionsProvider } from "../openaiChatCompletionsBase.js";

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

/** Cache period for `/model/info` limit discovery (same as the models list). */
const MODEL_INFO_CACHE_DURATION = 10 * 60 * 1000;

/** In-flight `/model/info` discovery per base URL — dedupes concurrent callers. */
const modelInfoInFlight = new Map<string, Promise<void>>();

/** Last successful `/model/info` discovery per base URL. */
const modelInfoLastSuccess = new Map<string, number>();

/**
 * Discovered limits per base URL. The runtime registries key by
 * (provider, model) only — budget call sites carry no deployment identity —
 * so when a process talks to MULTIPLE proxies that share a model-group name,
 * registrations use the MIN across every discovered deployment: budgets stay
 * safe for all of them instead of last-writer-wins silently overstating one.
 * Single-proxy processes (the normal case) are unaffected.
 */
const modelInfoLimitsByURL = new Map<
  string,
  Map<string, { maxInputTokens?: number; maxOutputTokens?: number }>
>();

/** Test hook: reset the discovery caches (state is module-global). */
export function clearLiteLLMModelLimitsCache(): void {
  modelInfoInFlight.clear();
  modelInfoLastSuccess.clear();
  modelInfoLimitsByURL.clear();
}

/**
 * Fetch `GET /model/info` and map model group name → advertised limits
 * (`model_info.max_input_tokens` / `model_info.max_output_tokens`).
 * A model group can appear once per underlying deployment; the SMALLEST
 * advertised value wins per field so budgets are safe for every replica.
 */
async function fetchLiteLLMModelLimits(
  baseURL: string,
  apiKey: string,
): Promise<Map<string, { maxInputTokens?: number; maxOutputTokens?: number }>> {
  const infoUrl = `${baseURL}/model/info`;
  const proxyFetch = createProxyFetch();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await proxyFetch(infoUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = (await response.json()) as {
      data?: Array<{
        model_name?: string;
        model_info?: { max_input_tokens?: number; max_output_tokens?: number };
      }>;
    };
    const isUsable = (v: unknown): v is number =>
      typeof v === "number" && Number.isFinite(v) && v > 0;
    const limits = new Map<
      string,
      { maxInputTokens?: number; maxOutputTokens?: number }
    >();
    for (const entry of data.data ?? []) {
      const model = entry?.model_name;
      if (typeof model !== "string" || model.length === 0) {
        continue;
      }
      const maxInput = entry?.model_info?.max_input_tokens;
      const maxOutput = entry?.model_info?.max_output_tokens;
      if (!isUsable(maxInput) && !isUsable(maxOutput)) {
        continue;
      }
      const existing = limits.get(model) ?? {};
      if (isUsable(maxInput)) {
        existing.maxInputTokens =
          existing.maxInputTokens === undefined
            ? maxInput
            : Math.min(existing.maxInputTokens, maxInput);
      }
      if (isUsable(maxOutput)) {
        existing.maxOutputTokens =
          existing.maxOutputTokens === undefined
            ? maxOutput
            : Math.min(existing.maxOutputTokens, maxOutput);
      }
      limits.set(model, existing);
    }
    return limits;
  } catch (error) {
    if (isAbortError(error)) {
      throw new NetworkError(
        "Request timed out after 5 seconds",
        "litellm" as AIProviderName,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Discover real per-model limits from the LiteLLM proxy's `GET /model/info`
 * and register them with the runtime resolvers: `max_input_tokens` → context
 * window, `max_output_tokens` → output ceiling. The static table only has a
 * one-size litellm `_default` (128K) while proxied models range from 8K to
 * 2M — budget checks, compaction, and max_tokens clamping need the real
 * numbers.
 *
 * Awaitable and deduped per base URL: generation pipelines await this (via
 * `LiteLLMProvider.ensureModelLimits`) BEFORE any budget math, so even the
 * FIRST call in a fresh process budgets against real windows — the previous
 * constructor-scoped fire-and-forget lost that race every time, and a
 * budget-blocked call then prevented the discovery that would have unblocked
 * it. Never rejects: any failure (endpoint absent, auth, timeout) is logged
 * at debug, leaves the static defaults in force, and allows a retry on the
 * next call.
 */
export function ensureLiteLLMModelLimits(
  baseURL: string,
  apiKey: string,
): Promise<void> {
  const key = stripTrailingSlash(baseURL);
  const lastSuccess = modelInfoLastSuccess.get(key) ?? 0;
  if (Date.now() - lastSuccess < MODEL_INFO_CACHE_DURATION) {
    return Promise.resolve();
  }
  const inFlight = modelInfoInFlight.get(key);
  if (inFlight) {
    return inFlight;
  }
  const discovery = fetchLiteLLMModelLimits(key, apiKey)
    .then((limits) => {
      modelInfoLimitsByURL.set(key, limits);
      // Min-merge across every base URL discovered so far (see
      // modelInfoLimitsByURL) before registering.
      const merged = new Map<
        string,
        { maxInputTokens?: number; maxOutputTokens?: number }
      >();
      for (const urlLimits of modelInfoLimitsByURL.values()) {
        for (const [model, modelLimits] of urlLimits) {
          const existing = merged.get(model) ?? {};
          if (modelLimits.maxInputTokens !== undefined) {
            existing.maxInputTokens =
              existing.maxInputTokens === undefined
                ? modelLimits.maxInputTokens
                : Math.min(existing.maxInputTokens, modelLimits.maxInputTokens);
          }
          if (modelLimits.maxOutputTokens !== undefined) {
            existing.maxOutputTokens =
              existing.maxOutputTokens === undefined
                ? modelLimits.maxOutputTokens
                : Math.min(
                    existing.maxOutputTokens,
                    modelLimits.maxOutputTokens,
                  );
          }
          merged.set(model, existing);
        }
      }
      for (const [model, modelLimits] of merged) {
        if (modelLimits.maxInputTokens !== undefined) {
          registerRuntimeContextWindow(
            "litellm",
            model,
            modelLimits.maxInputTokens,
          );
        }
        if (modelLimits.maxOutputTokens !== undefined) {
          registerRuntimeOutputCeiling(
            "litellm",
            model,
            modelLimits.maxOutputTokens,
          );
        }
      }
      modelInfoLastSuccess.set(key, Date.now());
      if (limits.size > 0) {
        logger.debug(
          "[LiteLLM] Registered runtime model limits from /model/info",
          { baseURL: redactUrlCredentials(key), models: limits.size },
        );
      }
    })
    .catch((error) => {
      logger.debug(
        "[LiteLLM] /model/info discovery failed; static context-window defaults remain in force",
        { error: error instanceof Error ? error.message : String(error) },
      );
    })
    .finally(() => {
      modelInfoInFlight.delete(key);
    });
  modelInfoInFlight.set(key, discovery);
  return discovery;
}

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

    // Warm the model-limit discovery early (deduped per base URL). The
    // generation pipelines still AWAIT ensureModelLimits() before budget
    // math — this fire-and-forget only shaves latency off that first await.
    void ensureLiteLLMModelLimits(this.config.baseURL, this.config.apiKey);

    logger.debug("LiteLLM Provider initialized", {
      modelName: this.modelName,
      provider: this.providerName,
      baseURL: redactUrlCredentials(this.config.baseURL),
    });
  }

  /**
   * Awaitable model-limit discovery — generation pipelines call this before
   * budget checks so window/output-ceiling math uses the proxy's real
   * numbers (see BaseProvider.ensureModelLimits). Deduped and cached per
   * base URL; never rejects (failure degrades to static defaults).
   */
  async ensureModelLimits(): Promise<void> {
    await ensureLiteLLMModelLimits(this.config.baseURL, this.config.apiKey);
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
   * generate() rides the SSE wire for LiteLLM: deployments commonly sit
   * behind proxies/tunnels (e.g. Cloudflare, which 524s an origin that is
   * silent for ~100s), and a non-streaming completion from a slow model
   * sends nothing until it is fully done. Streaming keeps bytes flowing for
   * the whole generation while the base class aggregates into the same
   * complete result — structuredData coercion, tool calls, stopReason,
   * usage and the JSON damage flags are unchanged for callers.
   * Escape hatch: NEUROLINK_LITELLM_SSE_GENERATE=false restores the plain
   * JSON wire.
   */
  protected useStreamingWireForGenerate(): boolean {
    return process.env.NEUROLINK_LITELLM_SSE_GENERATE !== "false";
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
        // promptTokens is the uncached remainder — the attribute reports the
        // full prompt (uncached + cache read/creation), and the cache fields
        // let calculateCost price tiers.
        span.setAttribute(
          "gen_ai.usage.input_tokens",
          usage.promptTokens +
            (usage.cacheReadTokens ?? 0) +
            (usage.cacheCreationTokens ?? 0),
        );
        span.setAttribute("gen_ai.usage.output_tokens", usage.completionTokens);
        const cost = calculateCost(this.providerName, modelId, {
          input: usage.promptTokens,
          output: usage.completionTokens,
          total: usage.totalTokens,
          ...(usage.cacheReadTokens
            ? { cacheReadTokens: usage.cacheReadTokens }
            : {}),
          ...(usage.cacheCreationTokens
            ? { cacheCreationTokens: usage.cacheCreationTokens }
            : {}),
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
    // Curator P1-1: detect "team not allowed to access model" responses and
    // surface as ModelAccessDeniedError with the allowed_models array parsed
    // from the body. Must run before classification (not just before the
    // "API key" rule) because ModelAccessDeniedError's constructor takes an
    // `{ provider, requestedModel, allowedModels }` options object rather
    // than the `(message, provider?)` shape ProviderErrorRule expects, so it
    // can't be expressed as a declarative rule. No realistic overlap with the
    // timeout/ECONNREFUSED checks below (disjoint wording), so running this
    // first is behaviorally identical to the original nesting order.
    const errorRecord = error as UnknownRecord;
    if (
      typeof errorRecord?.message === "string" &&
      isModelAccessDeniedMessage(errorRecord.message)
    ) {
      return new ModelAccessDeniedError(errorRecord.message, {
        provider: this.providerName,
        requestedModel: this.modelName,
        allowedModels: parseAllowedModels(errorRecord.message),
      });
    }

    const rules: ProviderErrorRule[] = [
      // Duck-typed timeout detection (name === "TimeoutError" OR message
      // contains "timeout") distinct from the `instanceof TimeoutError` check
      // classifyProviderError already performs first — preserved because
      // some rejection paths produce a plain object/Error with that shape
      // rather than a real TimeoutError instance.
      {
        match: (ctx) =>
          ctx.errorName === "TimeoutError" || /timeout/i.test(ctx.message),
        errorClass: NetworkError,
        message: (ctx) => `Request timed out: ${ctx.message}`,
      },
      {
        match: (ctx) => /ECONNREFUSED|Failed to fetch/.test(ctx.message),
        errorClass: NetworkError,
        // Name the base URL this instance actually dialed — per-request
        // credentials can override LITELLM_BASE_URL, and an error pointing
        // at the env value sends the caller debugging the wrong host.
        message: () =>
          "LiteLLM proxy server not available. Please start the LiteLLM proxy server at " +
          redactUrlCredentials(this.config.baseURL),
      },
      {
        match: (ctx) => /API_KEY_INVALID|Invalid API key/.test(ctx.message),
        errorClass: AuthenticationError,
        message:
          "Invalid LiteLLM configuration. Please check your LITELLM_API_KEY environment variable.",
      },
      {
        match: (ctx) => /rate limit/i.test(ctx.message),
        errorClass: RateLimitError,
        message: "LiteLLM rate limit exceeded. Please try again later.",
      },
      {
        match: (ctx) =>
          /model/i.test(ctx.message) && /not found/i.test(ctx.message),
        errorClass: InvalidModelError,
        message: () =>
          `Model '${this.modelName}' not available in LiteLLM proxy. ` +
          "Please check your LiteLLM configuration and ensure the model is configured.",
      },
      ...DEFAULT_ERROR_RULES,
    ];
    return classifyProviderError(
      error,
      rules,
      this.providerName,
      this.modelName,
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
    // Tolerate a `/v1`-suffixed base URL. Chat appends /chat/completions, so
    // deployments are commonly configured with base = https://host/v1 — but
    // appending /v1/models to that yields /v1/v1/models, which LiteLLM 404s,
    // and discovery silently degrades to the hardcoded fallback list.
    const root = stripTrailingSlash(this.config.baseURL).replace(/\/v1$/, "");
    const modelsUrl = `${root}/v1/models`;
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
