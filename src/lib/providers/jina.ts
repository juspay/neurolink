import type { AIProviderName } from "../constants/enums.js";
import { JinaModels } from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { isNeuroLink } from "../neurolink.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import type {
  JinaEmbeddingsResponse,
  JinaRerankResponse,
  NeurolinkCredentials,
  StreamOptions,
  StreamResult,
  ValidationSchema,
} from "../types/index.js";
import {
  AuthenticationError,
  InvalidModelError,
  ProviderError,
  RateLimitError,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import {
  createJinaConfig,
  getProviderModel,
  validateApiKey,
} from "../utils/providerConfig.js";
import type { LanguageModel } from "../types/index.js";

const JINA_DEFAULT_BASE_URL = "https://api.jina.ai/v1";
const REQUEST_TIMEOUT_MS = 60_000;

const getJinaApiKey = (): string => validateApiKey(createJinaConfig());

const getDefaultJinaModel = (): string =>
  getProviderModel("JINA_MODEL", JinaModels.JINA_EMBEDDINGS_V3);

/**
 * Jina AI Provider — embeddings + reranking.
 *
 * Native API at api.jina.ai/v1. Chat / streaming / tool calling are not
 * supported. Use `embed()` / `embedMany()` for embeddings, or call
 * `rerank()` directly for retrieval reranking (Jina's strength).
 *
 * @see https://jina.ai/embeddings/
 */
export class JinaProvider extends BaseProvider {
  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly proxyFetch: typeof fetch;

  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["jina"],
  ) {
    const validatedNeurolink = isNeuroLink(sdk) ? sdk : undefined;

    super(modelName, "jina" as AIProviderName, validatedNeurolink);

    const overrideKey = credentials?.apiKey?.trim();
    this.apiKey =
      overrideKey && overrideKey.length > 0 ? overrideKey : getJinaApiKey();
    this.baseURL =
      credentials?.baseURL ??
      process.env.JINA_BASE_URL ??
      JINA_DEFAULT_BASE_URL;
    this.proxyFetch = createProxyFetch();

    logger.debug("Jina Provider initialized (embeddings + reranking)", {
      modelName: this.modelName,
      baseURL: this.baseURL,
    });
  }

  protected getProviderName(): AIProviderName {
    return this.providerName;
  }

  protected getDefaultModel(): string {
    return getDefaultJinaModel();
  }

  override supportsTools(): boolean {
    return false;
  }

  protected override getDefaultEmbeddingModel(): string | undefined {
    return getDefaultJinaModel();
  }

  protected getAISDKModel(): LanguageModel {
    throw new Error(
      "Jina AI is an embeddings + reranking provider; chat completions are not available. Use `embed()` / `embedMany()` / `rerank()`.",
    );
  }

  protected async executeStream(
    _options: StreamOptions,
    _analysisSchema?: ValidationSchema,
  ): Promise<StreamResult> {
    throw new Error(
      "Jina AI is an embeddings + reranking provider; streaming chat is not available.",
    );
  }

  protected formatProviderError(error: unknown): Error {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "Unknown error";
    if (
      message.includes("401") ||
      message.toLowerCase().includes("unauthorized")
    ) {
      return new AuthenticationError(
        "Invalid Jina AI API key. Get one at https://jina.ai/?sui=apikey",
        "jina",
      );
    }
    if (
      message.includes("429") ||
      message.toLowerCase().includes("rate limit")
    ) {
      return new RateLimitError(
        "Jina AI rate limit exceeded. Back off and retry.",
        "jina",
      );
    }
    if (
      message.includes("404") ||
      message.toLowerCase().includes("model_not_found")
    ) {
      return new InvalidModelError(
        `Jina AI model '${this.modelName}' not found. See https://jina.ai/embeddings/`,
        "jina",
      );
    }
    return new ProviderError(`Jina AI error: ${message}`, "jina");
  }

  override async embed(text: string, modelName?: string): Promise<number[]> {
    const vectors = await this.callEmbeddings([text], modelName);
    if (!vectors[0]) {
      throw new Error("Jina AI returned no embedding for the provided text");
    }
    return vectors[0];
  }

  override async embedMany(
    texts: string[],
    modelName?: string,
  ): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }
    return this.callEmbeddings(texts, modelName);
  }

  /**
   * Rerank a list of documents against a query.
   *
   * Returns the documents sorted by relevance (highest first), with
   * score and original index preserved so callers can map back.
   *
   * Note: not exposed on `BaseProvider` — accessed by casting to
   * `JinaProvider` or via the dedicated rerank route on the public API
   * (`POST /api/agent/rerank` in the server module, when added).
   *
   * Per-call credentials can be supplied via `options.credentials?.jina`,
   * overriding the instance-level credentials for this request only.
   */
  async rerank(
    query: string,
    documents: string[],
    options: {
      model?: string;
      topN?: number;
      credentials?: NeurolinkCredentials["jina"];
    } = {},
  ): Promise<{ index: number; score: number; document: string }[]> {
    if (documents.length === 0) {
      return [];
    }
    const model =
      options.model ?? JinaModels.JINA_RERANKER_V2_BASE_MULTILINGUAL;

    // Resolve per-call credentials first, then fall back to instance-level.
    const perCallCreds = options.credentials;
    const effectiveApiKey = perCallCreds?.apiKey?.trim() || this.apiKey;
    const effectiveBaseURL = perCallCreds?.baseURL || this.baseURL;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await this.proxyFetch(`${effectiveBaseURL}/rerank`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${effectiveApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          query,
          documents,
          top_n: options.topN ?? documents.length,
        }),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw this.formatProviderError(
          new Error(
            `Jina rerank request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
          ),
        );
      }
      throw this.formatProviderError(err);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const text = await response.text();
      throw this.formatProviderError(
        new Error(`Jina rerank failed: ${response.status} — ${text}`),
      );
    }

    const data = (await response.json()) as JinaRerankResponse;
    return (data.results ?? []).map((r) => ({
      index: r.index,
      score: r.relevance_score,
      document: documents[r.index] ?? r.document?.text ?? "",
    }));
  }

  private async callEmbeddings(
    inputs: string[],
    modelName?: string,
    credentials?: NeurolinkCredentials["jina"],
  ): Promise<number[][]> {
    const model = modelName ?? this.modelName;

    // Resolve per-call credentials first, then fall back to instance-level.
    const effectiveApiKey = credentials?.apiKey?.trim() || this.apiKey;
    const effectiveBaseURL = credentials?.baseURL || this.baseURL;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await this.proxyFetch(`${effectiveBaseURL}/embeddings`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${effectiveApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: inputs,
          model,
        }),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw this.formatProviderError(
          new Error(
            `Jina embeddings request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
          ),
        );
      }
      throw this.formatProviderError(err);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const text = await response.text();
      throw this.formatProviderError(
        new Error(`Jina embeddings failed: ${response.status} — ${text}`),
      );
    }

    const data = (await response.json()) as JinaEmbeddingsResponse;
    if (!data.data || data.data.length === 0) {
      throw new Error("Jina embeddings response missing data");
    }

    // Validate that the response covers all requested inputs.
    if (data.data.length !== inputs.length) {
      throw new Error(
        `Jina embeddings response count mismatch: expected ${inputs.length}, got ${data.data.length}`,
      );
    }

    // Sort by index and verify sequential coverage (0 … n-1).
    const sorted = data.data.slice().sort((a, b) => a.index - b.index);
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].index !== i) {
        throw new Error(
          `Jina embeddings response has unexpected index ordering: position ${i} has index ${sorted[i].index}`,
        );
      }
    }

    return sorted.map((d) => d.embedding);
  }

  async validateConfiguration(): Promise<boolean> {
    return typeof this.apiKey === "string" && this.apiKey.trim().length > 0;
  }

  getConfiguration() {
    return {
      provider: this.providerName,
      model: this.modelName,
      defaultModel: getDefaultJinaModel(),
      baseURL: this.baseURL,
    };
  }
}

export default JinaProvider;
