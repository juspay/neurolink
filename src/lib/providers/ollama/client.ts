import type { AIProviderName } from "../../constants/enums.js";
import { modelConfig } from "../../core/modelConfiguration.js";
import { createProxyFetch } from "../../proxy/proxyFetch.js";
import type {
  EmbedInput,
  NeurolinkCredentials,
  StreamOptions,
  TextGenerationOptions,
} from "../../types/index.js";
import { ProviderError } from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { redactUrlCredentials } from "../../utils/logSanitize.js";
import { createTimeoutController, parseTimeout } from "../../utils/timeout.js";
import { OpenAIChatCompletionsProvider } from "../openaiChatCompletionsBase.js";
import { stripTrailingSlash } from "../openaiChatCompletionsClient.js";
import { DEFAULT_OLLAMA_MODEL } from "./constants.js";
import { classifyWithProviderRules } from "../rules/errorRules.js";
import { getFallbackModel } from "../rules/fallbackModel.js";
import { getProviderErrorRules } from "../rules/registry.js";

const OLLAMA_ERROR_RULES = getProviderErrorRules("ollama");

// Ollama serves its OpenAI-compatible surface under `/v1` (/v1/chat/completions,
// /v1/models, /v1/embeddings). The base client appends `/chat/completions` to
// config.baseURL, so the base URL must already carry the `/v1` suffix.
const OLLAMA_DEFAULT_BASE_URL = "http://localhost:11434/v1";
// Local Ollama ignores the Authorization header, but the base HTTP client
// requires a non-empty apiKey. A real key (OLLAMA_API_KEY) is only needed for
// Ollama Cloud / an auth-proxying reverse proxy.
const OLLAMA_PLACEHOLDER_KEY = "ollama";
const FALLBACK_OLLAMA_MODEL = getFallbackModel("ollama");
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
    return classifyWithProviderRules(
      error,
      OLLAMA_ERROR_RULES,
      this.providerName,
      this.modelName,
      {
        vars: () => ({
          model: `${this.modelName}`,
          baseURL: redactUrlCredentials(this.config.baseURL),
          fallbackModel: FALLBACK_OLLAMA_MODEL,
        }),
      },
    );
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
   * Local models are slow; the base defaults Ollama generation to 5 minutes
   * and streaming idle time to 2 minutes, and honors a per-call `options.timeout`.
   * Preserve the legacy `OLLAMA_TIMEOUT` env override, applied only
   * when no explicit per-call timeout is set. Parsed with the shared
   * `parseTimeout` so both millisecond numbers ("240000") and duration strings
   * ("4m", "30s") work; a malformed value is ignored in favour of the default.
   */
  public getTimeout(
    options: TextGenerationOptions | StreamOptions,
    operation: "generate" | "stream" = "generate",
  ): number {
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
    return super.getTimeout(options, operation);
  }

  /**
   * Health check: probe `/v1/models` and require at least one installed model.
   * A reachable server with zero models would let `resolveModelName()` fall
   * back to a model that the first real request can't serve, so report unusable.
   */
  async validateConfiguration(): Promise<boolean> {
    return this.probeModelsEndpoint(this.getAuthHeaders());
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
  async embed(
    input: string | EmbedInput,
    modelName?: string,
  ): Promise<number[]> {
    if (typeof input !== "string" && input.image) {
      throw new ProviderError(
        `${this.providerName} does not support image embeddings; provide text input`,
        this.providerName,
      );
    }

    const text = typeof input === "string" ? input : (input.text ?? "");
    const embeddingModel =
      modelName ||
      process.env.OLLAMA_EMBEDDING_MODEL ||
      DEFAULT_EMBEDDING_MODEL;
    const rows = await this.callEmbeddings(embeddingModel, [text], "embed");
    const [embedding] = this.requireEmbeddings(rows, 1, embeddingModel);
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
    const rows = await this.callEmbeddings(embeddingModel, texts, "embedMany");
    return this.requireEmbeddings(rows, texts.length, embeddingModel);
  }

  /**
   * One non-empty vector per input, or fail: a dropped or empty row would
   * pair later texts with the wrong vectors, or score 0 downstream.
   */
  private requireEmbeddings(
    rows: Array<number[] | undefined>,
    inputCount: number,
    modelName: string,
  ): number[][] {
    if (rows.length !== inputCount) {
      logger.error("Embedding response held the wrong number of vectors", {
        provider: this.providerName,
        model: modelName,
        expected: inputCount,
        received: rows.length,
      });
      throw new ProviderError(
        `Embedding response held ${rows.length} vectors for ${inputCount} texts`,
        this.providerName,
      );
    }
    return rows.map((values, index) => {
      if (!values || values.length === 0) {
        logger.error("Embedding returned no values", {
          provider: this.providerName,
          model: modelName,
          index,
        });
        throw new ProviderError(
          `Embedding for the text at index ${index} came back without values`,
          this.providerName,
        );
      }
      return values;
    });
  }

  private async callEmbeddings(
    modelName: string,
    input: string[],
    operation: "embed" | "embedMany",
  ): Promise<Array<number[] | undefined>> {
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
      const rows = (json.data ?? []).map((row) =>
        Array.isArray(row.embedding) ? row.embedding : undefined,
      );
      if (rows.length === 0) {
        throw new ProviderError(
          `Ollama ${operation} returned no embeddings`,
          "ollama",
        );
      }
      return rows;
    } finally {
      timeoutController?.cleanup();
    }
  }
}
