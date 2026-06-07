import type { AIProviderName } from "../constants/enums.js";
import { OllamaModels } from "../constants/enums.js";
import { modelConfig } from "../core/modelConfiguration.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import type {
  ModelsResponse,
  NeurolinkCredentials,
  StreamOptions,
  TextGenerationOptions,
  UnknownRecord,
} from "../types/index.js";
import {
  InvalidModelError,
  NetworkError,
  ProviderError,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { redactUrlCredentials } from "../utils/logSanitize.js";
import {
  createTimeoutController,
  parseTimeout,
  TimeoutError,
} from "../utils/timeout.js";
import { OpenAIChatCompletionsProvider } from "./openaiChatCompletionsBase.js";
import { stripTrailingSlash } from "./openaiChatCompletionsClient.js";

// Ollama serves its OpenAI-compatible surface under `/v1` (/v1/chat/completions,
// /v1/models, /v1/embeddings). The base client appends `/chat/completions` to
// config.baseURL, so the base URL must already carry the `/v1` suffix.
const OLLAMA_DEFAULT_BASE_URL = "http://localhost:11434/v1";
// Local Ollama ignores the Authorization header, but the base HTTP client
// requires a non-empty apiKey. A real key (OLLAMA_API_KEY) is only needed for
// Ollama Cloud / an auth-proxying reverse proxy.
const OLLAMA_PLACEHOLDER_KEY = "ollama";
// Default model must match the registry default (providerRegistry.ts advertises
// `OllamaModels.LLAMA3_2_LATEST`) so getConfiguration()/resolveModelName() agree
// with what the registry reports.
const DEFAULT_OLLAMA_MODEL = OllamaModels.LLAMA3_2_LATEST;
const FALLBACK_OLLAMA_MODEL = "llama3.1:8b";
const DEFAULT_EMBEDDING_MODEL = "nomic-embed-text";
const EMBEDDINGS_TIMEOUT_MS = 30_000;

const getDefaultOllamaModel = (): string =>
  process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;

/**
 * Resolve and normalize the Ollama base URL to the OpenAI-compatible root.
 * Precedence: credentials override → `OLLAMA_BASE_URL` → default. A bare host
 * (the historical `OLLAMA_BASE_URL=http://localhost:11434` form) is accepted
 * and gets `/v1` appended for backward compatibility; an already-`/v1` base is
 * left untouched. Blank/whitespace overrides fall through (cohort guard).
 */
const resolveOllamaBaseURL = (override?: string): string => {
  const raw =
    override?.trim() ||
    process.env.OLLAMA_BASE_URL?.trim() ||
    OLLAMA_DEFAULT_BASE_URL;
  const trimmed = stripTrailingSlash(raw);
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
};

/**
 * Ollama Provider — direct HTTP, no AI SDK.
 *
 * Wraps a local (or remote/Cloud) Ollama server via its OpenAI-compatible
 * `/v1` API. All request / stream / multi-step tool-loop orchestration lives
 * in `OpenAIChatCompletionsProvider`; this class declares configuration plus
 * the Ollama-specific behaviour:
 *
 *   1. `/v1` base-URL normalization (accepts a bare `OLLAMA_BASE_URL` host).
 *   2. No-auth-by-default with an optional `OLLAMA_API_KEY` for Ollama Cloud.
 *   3. Configurable per-model tool gating via `OLLAMA_TOOL_CAPABLE_MODELS` /
 *      `modelConfig` (`supportsTools`).
 *   4. Elevated request timeout for slow large local models (5-minute base
 *      default, overridable via `OLLAMA_TIMEOUT`).
 *   5. Native `/v1/embeddings` (`embed` / `embedMany`).
 *   6. Rich, actionable error mapping (`ollama serve` / `ollama pull` hints).
 *
 * Model discovery uses the base's `/v1/models` probe (Ollama supports it).
 *
 * @see https://docs.ollama.com/api/openai-compatibility
 */
export class OllamaProvider extends OpenAIChatCompletionsProvider {
  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["ollama"],
  ) {
    const baseURL = resolveOllamaBaseURL(credentials?.baseURL);
    const apiKey =
      credentials?.apiKey?.trim() ||
      process.env.OLLAMA_API_KEY?.trim() ||
      OLLAMA_PLACEHOLDER_KEY;

    super("ollama" as AIProviderName, modelName, sdk, { baseURL, apiKey });

    logger.debug("Ollama Provider initialized", {
      modelName: this.modelName,
      providerName: this.providerName,
      baseURL: redactUrlCredentials(this.config.baseURL),
    });
  }

  // ===========================================================================
  // Abstract hooks (required)
  // ===========================================================================

  protected getProviderName(): AIProviderName {
    return "ollama" as AIProviderName;
  }

  protected getDefaultModel(): string {
    return getDefaultOllamaModel();
  }

  protected getFallbackModelName(): string {
    return FALLBACK_OLLAMA_MODEL;
  }

  protected formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new NetworkError(
        `Ollama request timed out. The model may be loading or the request is too large.`,
        "ollama",
      );
    }
    const errorRecord = error as UnknownRecord;
    const message =
      typeof errorRecord?.message === "string"
        ? errorRecord.message
        : "Unknown error";
    const cause = (errorRecord?.cause as UnknownRecord) ?? {};
    const code = (errorRecord?.code ?? cause?.code) as string | undefined;

    if (
      code === "ECONNREFUSED" ||
      message.includes("ECONNREFUSED") ||
      message.includes("Failed to fetch") ||
      message.includes("fetch failed")
    ) {
      return new NetworkError(
        `Cannot connect to Ollama at ${redactUrlCredentials(this.config.baseURL)}. ` +
          `Install Ollama (https://ollama.com), start it with 'ollama serve', then try again.`,
        "ollama",
      );
    }
    // The base client (buildAPIError) attaches statusCode + responseBody to
    // HTTP failures. Distinguish a genuine missing-model error (give 'ollama
    // pull' guidance) from a bare endpoint-mismatch 404 (wrong base URL / not
    // the OpenAI-compatible /v1 surface) so the advice is actionable. Match on
    // wording, not a bare "404" substring, to avoid misclassifying unrelated
    // messages that merely contain those digits.
    const statusCode =
      typeof errorRecord?.statusCode === "number"
        ? errorRecord.statusCode
        : undefined;
    const responseBody =
      typeof errorRecord?.responseBody === "string"
        ? errorRecord.responseBody
        : "";
    const haystack = `${message} ${responseBody}`.toLowerCase();
    const looksLikeMissingModel =
      haystack.includes("model_not_found") ||
      (haystack.includes("model") && haystack.includes("not found"));

    if (looksLikeMissingModel) {
      return new InvalidModelError(
        `Ollama model '${this.modelName}' is not available locally. ` +
          `Pull it first with 'ollama pull ${this.modelName}' (or try '${FALLBACK_OLLAMA_MODEL}'); ` +
          `list installed models with 'ollama list'.`,
        "ollama",
      );
    }
    if (statusCode === 404 || haystack.includes("status 404")) {
      return new ProviderError(
        `Ollama returned HTTP 404 from ${redactUrlCredentials(this.config.baseURL)}. ` +
          `Verify the base URL serves the OpenAI-compatible /v1 API and that the ` +
          `model is installed ('ollama list').`,
        "ollama",
      );
    }
    return new ProviderError(`Ollama error: ${message}`, "ollama");
  }

  // ===========================================================================
  // Optional hooks — Ollama-specific behaviour
  // ===========================================================================

  /**
   * Ollama proxies many local models with varying tool support. When
   * `OLLAMA_TOOL_CAPABLE_MODELS` (or `modelConfig`'s
   * `modelBehavior.toolCapableModels`) is configured, gate tools on a
   * substring match against the current model; with no list configured,
   * assume tools are supported (don't disable on absent evidence).
   */
  supportsTools(): boolean {
    const modelName = (this.modelName ?? getDefaultOllamaModel()).toLowerCase();
    const ollamaConfig = modelConfig.getProviderConfiguration("ollama");
    const toolCapableModels =
      (ollamaConfig?.modelBehavior?.toolCapableModels as string[]) || [];

    if (toolCapableModels.length === 0) {
      return true;
    }

    const isToolCapable = toolCapableModels.some((capableModel) =>
      modelName.includes(capableModel.toLowerCase()),
    );
    if (!isToolCapable) {
      logger.debug("Ollama tool calling disabled", {
        model: this.modelName,
        reason: "Model not in OLLAMA_TOOL_CAPABLE_MODELS list",
      });
    }
    return isToolCapable;
  }

  /**
   * Local models are slow; the base already defaults Ollama to a 5-minute
   * timeout and honors a per-call `options.timeout`. Preserve the legacy
   * `OLLAMA_TIMEOUT` env override for callers who relied on it, applied only
   * when no explicit per-call timeout is set. Parsed with the shared
   * `parseTimeout` so both millisecond numbers ("240000") and duration strings
   * ("4m", "30s") work; a malformed value is ignored in favour of the default.
   */
  public getTimeout(options: TextGenerationOptions | StreamOptions): number {
    if (options.timeout === undefined || options.timeout === null) {
      const envTimeout = process.env.OLLAMA_TIMEOUT?.trim();
      if (envTimeout) {
        try {
          const parsed = parseTimeout(envTimeout);
          if (parsed !== undefined && parsed > 0) {
            return parsed;
          }
        } catch {
          logger.debug(
            `Ignoring invalid OLLAMA_TIMEOUT='${envTimeout}'; using the default. ` +
              `Use a millisecond number (240000) or a duration like '4m' / '30s'.`,
          );
        }
      }
    }
    return super.getTimeout(options);
  }

  /**
   * Health check: probe `/v1/models` and require at least one installed model.
   * A reachable server with zero models would let `resolveModelName()` fall
   * back to a model that the first real request can't serve, so report unusable.
   */
  async validateConfiguration(): Promise<boolean> {
    try {
      const url = `${stripTrailingSlash(this.config.baseURL)}/models`;
      const proxyFetch = createProxyFetch();
      const r = await proxyFetch(url, {
        headers: {
          ...this.getAuthHeaders(),
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(5000),
      });
      if (!r.ok) {
        return false;
      }
      const data = (await r.json().catch(() => null)) as ModelsResponse | null;
      return Boolean(
        data?.data?.some(
          (m) => typeof m?.id === "string" && m.id.trim().length > 0,
        ),
      );
    } catch (error) {
      logger.debug("Ollama validateConfiguration probe failed", {
        baseURL: redactUrlCredentials(this.config.baseURL),
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  getConfiguration() {
    return {
      provider: this.providerName,
      model: this.modelName || this.resolvedModel || getDefaultOllamaModel(),
      defaultModel: getDefaultOllamaModel(),
      baseURL: this.config.baseURL,
    };
  }

  // ===========================================================================
  // Embeddings — native POST /v1/embeddings
  // ===========================================================================

  /**
   * Generate an embedding for a single text input via native /v1/embeddings.
   * Uses `OLLAMA_EMBEDDING_MODEL` (default `nomic-embed-text`); the embedding
   * model must be pulled locally (`ollama pull nomic-embed-text`).
   */
  async embed(text: string, modelName?: string): Promise<number[]> {
    const embeddingModel =
      modelName ||
      process.env.OLLAMA_EMBEDDING_MODEL ||
      DEFAULT_EMBEDDING_MODEL;
    const [embedding] = await this.callEmbeddings(
      embeddingModel,
      [text],
      "embed",
    );
    return embedding;
  }

  /**
   * Generate embeddings for multiple text inputs via native /v1/embeddings.
   */
  async embedMany(texts: string[], modelName?: string): Promise<number[][]> {
    const embeddingModel =
      modelName ||
      process.env.OLLAMA_EMBEDDING_MODEL ||
      DEFAULT_EMBEDDING_MODEL;
    return this.callEmbeddings(embeddingModel, texts, "embedMany");
  }

  private async callEmbeddings(
    modelName: string,
    input: string[],
    operation: "embed" | "embedMany",
  ): Promise<number[][]> {
    const url = `${stripTrailingSlash(this.config.baseURL)}/embeddings`;
    const fetchImpl = createProxyFetch();
    const timeoutController = createTimeoutController(
      EMBEDDINGS_TIMEOUT_MS,
      this.providerName,
      "generate",
    );
    try {
      const res = await fetchImpl(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.getAuthHeaders(),
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
        // Guard JSON.parse: a reverse proxy / gateway in front of Ollama can
        // return a non-JSON error body (HTML 5xx page, plain text). Degrade to
        // the status-based fallback message instead of throwing a SyntaxError.
        let parsed: { error?: { message?: string } } | undefined;
        if (bodyText) {
          try {
            parsed = JSON.parse(bodyText) as { error?: { message?: string } };
          } catch {
            parsed = undefined;
          }
        }
        throw this.formatProviderError(
          new Error(
            parsed?.error?.message ||
              `Ollama ${operation} failed with status ${res.status}`,
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
          `Ollama ${operation} returned no embeddings`,
          "ollama",
        );
      }
      return embeddings;
    } finally {
      timeoutController?.cleanup();
    }
  }
}
