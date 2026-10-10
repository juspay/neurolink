import type { AIProviderName } from "../constants/enums.js";
import { VoyageModels } from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { isNeuroLink } from "../neurolink.js";
import { parseIndexedEmbeddingsResponse } from "./embeddingResponseParsing.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import {
  AuthenticationError,
  InvalidModelError,
  ProviderError,
  RateLimitError,
} from "../types/index.js";
import type {
  EmbedInput,
  NeurolinkCredentials,
  ProviderErrorRule,
  StreamOptions,
  StreamResult,
  ValidationSchema,
  VoyageEmbeddingsResponse,
} from "../types/index.js";
import { withTimeout } from "../utils/errorHandling.js";
import {
  classifyProviderError,
  DEFAULT_ERROR_RULES,
  messageNamesStatus,
  namesMissingModel,
} from "../utils/errorClassifier.js";
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
    // A status number counts only from the response status or where the text
    // writes it as a status (messageNamesStatus): a 400 whose body mentions
    // "429" or "404" — a count, an id — is not a rate limit or a missing model.
    const rules: ProviderErrorRule[] = [
      {
        match: (ctx) =>
          ctx.statusCode === 401 ||
          /unauthorized/i.test(ctx.message) ||
          /invalid_api_key/.test(ctx.message) ||
          messageNamesStatus(ctx.message, 401),
        errorClass: AuthenticationError,
        message:
          "Invalid Voyage AI API key. Get one at https://dash.voyageai.com/api-keys",
      },
      {
        match: (ctx) =>
          ctx.statusCode === 429 ||
          /rate limit/i.test(ctx.message) ||
          messageNamesStatus(ctx.message, 429),
        errorClass: RateLimitError,
        message: "Voyage AI rate limit exceeded. Back off and retry.",
      },
      {
        // A 404 is a missing model only when its text says so; a wrong base
        // URL answers 404 too and is left to the shared 404 rule below.
        match: (ctx) => namesMissingModel(ctx.message, ctx.statusCode),
        errorClass: InvalidModelError,
        message: () =>
          `Voyage AI model '${this.modelName}' not found. Browse https://docs.voyageai.com/docs/embeddings`,
      },
      ...DEFAULT_ERROR_RULES,
      {
        match: () => true,
        errorClass: ProviderError,
        message: (ctx) => `Voyage AI error: ${ctx.message}`,
      },
    ];
    return classifyProviderError(
      error,
      rules,
      this.providerName,
      this.modelName,
    );
  }

  // ===== Embedding implementations =====

  override async embed(
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
        Object.assign(
          new Error(`Voyage embeddings failed: ${response.status} — ${text}`),
          { status: response.status },
        ),
      );
    }

    const data = (await response.json()) as VoyageEmbeddingsResponse;
    // Sorts by index (Voyage returns out-of-order under some conditions) and
    // verifies complete 0..n-1 coverage (Voyage may return partial results
    // in edge-case error scenarios).
    return parseIndexedEmbeddingsResponse(
      data,
      inputs.length,
      "Voyage",
      (message) => new ProviderError(message, "voyage"),
    );
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
