import type { AIProviderName } from "../constants/enums.js";
import { VoyageModels } from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { isNeuroLink } from "../neurolink.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import {
  AuthenticationError,
  InvalidModelError,
  ProviderError,
  RateLimitError,
} from "../types/index.js";
import type {
  NeurolinkCredentials,
  StreamOptions,
  StreamResult,
  ValidationSchema,
  VoyageEmbeddingsResponse,
} from "../types/index.js";
import { withTimeout } from "../utils/errorHandling.js";
import { logger } from "../utils/logger.js";
import {
  createVoyageConfig,
  getProviderModel,
  validateApiKey,
} from "../utils/providerConfig.js";
import type { LanguageModel } from "../types/index.js";

const VOYAGE_DEFAULT_BASE_URL = "https://api.voyageai.com/v1";
const REQUEST_TIMEOUT_MS = 60_000;

const getVoyageApiKey = (): string => validateApiKey(createVoyageConfig());

const getDefaultVoyageModel = (): string =>
  getProviderModel("VOYAGE_MODEL", VoyageModels.VOYAGE_3_5);

/**
 * Voyage AI Provider — embedding-only.
 *
 * Top-tier RAG embedder. Native API at api.voyageai.com/v1/embeddings.
 * Chat / streaming / tool calling are not supported — `executeStream` and
 * `getAISDKModel` throw a friendly error so callers get an actionable
 * message instead of a runtime crash deep in the streaming layer.
 *
 * @see https://docs.voyageai.com/docs/embeddings
 */
export class VoyageProvider extends BaseProvider {
  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly proxyFetch: typeof fetch;

  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["voyage"],
  ) {
    const validatedNeurolink = isNeuroLink(sdk) ? sdk : undefined;

    super(modelName, "voyage" as AIProviderName, validatedNeurolink);

    const overrideKey = credentials?.apiKey?.trim();
    this.apiKey =
      overrideKey && overrideKey.length > 0 ? overrideKey : getVoyageApiKey();
    this.baseURL =
      credentials?.baseURL ??
      process.env.VOYAGE_BASE_URL ??
      VOYAGE_DEFAULT_BASE_URL;
    this.proxyFetch = createProxyFetch();

    logger.debug("Voyage Provider initialized (embeddings only)", {
      modelName: this.modelName,
      baseURL: this.baseURL,
    });
  }

  // ===== Required abstract overrides =====

  protected getProviderName(): AIProviderName {
    return this.providerName;
  }

  protected getDefaultModel(): string {
    return getDefaultVoyageModel();
  }

  override supportsTools(): boolean {
    return false;
  }

  protected override getDefaultEmbeddingModel(): string | undefined {
    return getDefaultVoyageModel();
  }

  /**
   * Voyage is embedding-only — chat models do not exist on this endpoint.
   * Caller surface stays consistent: returns an `AbortError`-shaped failure
   * via `BaseProvider.handleProviderError`, not a TypeScript-level cast.
   */
  protected getAISDKModel(): LanguageModel {
    throw new ProviderError(
      "Voyage AI is an embedding-only provider; chat completions are not available. Use `embed()` or `embedMany()` instead, or pick a different provider for `generate()` / `stream()`.",
      "voyage",
    );
  }

  protected async executeStream(
    _options: StreamOptions,
    _analysisSchema?: ValidationSchema,
  ): Promise<StreamResult> {
    throw new ProviderError(
      "Voyage AI is an embedding-only provider; streaming chat is not available. Use `embed()` / `embedMany()`, or pick another provider for `stream()`.",
      "voyage",
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
      message.toLowerCase().includes("unauthorized") ||
      message.includes("invalid_api_key")
    ) {
      return new AuthenticationError(
        "Invalid Voyage AI API key. Get one at https://dash.voyageai.com/api-keys",
        "voyage",
      );
    }
    if (
      message.includes("429") ||
      message.toLowerCase().includes("rate limit")
    ) {
      return new RateLimitError(
        "Voyage AI rate limit exceeded. Back off and retry.",
        "voyage",
      );
    }
    if (
      message.includes("404") ||
      message.toLowerCase().includes("model_not_found")
    ) {
      return new InvalidModelError(
        `Voyage AI model '${this.modelName}' not found. Browse https://docs.voyageai.com/docs/embeddings`,
        "voyage",
      );
    }
    return new ProviderError(`Voyage AI error: ${message}`, "voyage");
  }

  // ===== Embedding implementations =====

  override async embed(text: string, modelName?: string): Promise<number[]> {
    const vectors = await this.callEmbeddings([text], modelName);
    if (!vectors[0]) {
      throw new ProviderError(
        "Voyage AI returned no embedding for the provided text",
        "voyage",
      );
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
    // Voyage AI's /embeddings endpoint accepts up to 128 inputs per request.
    // Split larger payloads into sequential batches to avoid API rejection.
    const VOYAGE_MAX_BATCH_SIZE = 128;
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += VOYAGE_MAX_BATCH_SIZE) {
      const batch = texts.slice(i, i + VOYAGE_MAX_BATCH_SIZE);
      const vectors = await this.callEmbeddings(batch, modelName);
      out.push(...vectors);
    }
    return out;
  }

  /**
   * POST /embeddings — Voyage accepts up to 128 inputs per request.
   * Caller batches above that (see `embedMany`).
   */
  private async callEmbeddings(
    inputs: string[],
    modelName?: string,
  ): Promise<number[][]> {
    const model = modelName ?? this.modelName;

    let response: Response;
    try {
      response = await withTimeout(
        this.proxyFetch(`${this.baseURL}/embeddings`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input: inputs,
            model,
          }),
        }),
        REQUEST_TIMEOUT_MS,
        new ProviderError(
          `Voyage embeddings request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
          "voyage",
        ),
      );
    } catch (err: unknown) {
      // Re-throw typed provider errors produced by withTimeout (ProviderError
      // subclasses: AuthenticationError, RateLimitError, InvalidModelError)
      // so they are not double-wrapped by formatProviderError.
      if (err instanceof ProviderError) {
        throw err;
      }
      throw this.formatProviderError(err);
    }

    if (!response.ok) {
      const text = await response.text();
      throw this.formatProviderError(
        new Error(`Voyage embeddings failed: ${response.status} — ${text}`),
      );
    }

    const data = (await response.json()) as VoyageEmbeddingsResponse;
    if (!data.data || data.data.length === 0) {
      throw new ProviderError(
        "Voyage embeddings response missing data",
        "voyage",
      );
    }

    // Validate that the response covers all requested inputs.
    // Voyage may return partial results in edge-case error scenarios.
    if (data.data.length !== inputs.length) {
      throw new ProviderError(
        `Voyage embeddings response count mismatch: expected ${inputs.length}, got ${data.data.length}`,
        "voyage",
      );
    }

    // Sort by index (Voyage returns out-of-order under some conditions)
    // and drop to a flat number[][] result.
    const sorted = data.data.slice().sort((a, b) => a.index - b.index);

    // Verify that index coverage is complete (0 … n-1).
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].index !== i) {
        throw new ProviderError(
          `Voyage embeddings response has unexpected index ordering: position ${i} has index ${sorted[i].index}`,
          "voyage",
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
      defaultModel: getDefaultVoyageModel(),
      baseURL: this.baseURL,
    };
  }
}

export default VoyageProvider;
