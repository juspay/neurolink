import type { AIProviderName } from "../constants/enums.js";
import { CohereModels } from "../constants/enums.js";
import {
  AuthenticationError,
  InvalidModelError,
  ProviderError,
  RateLimitError,
} from "../types/index.js";
import type {
  NeurolinkCredentials,
  ProviderErrorRule,
} from "../types/index.js";
import {
  classifyProviderError,
  DEFAULT_ERROR_RULES,
} from "../utils/errorClassifier.js";
import { logger } from "../utils/logger.js";
import { redactUrlCredentials } from "../utils/logSanitize.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import {
  createCohereConfig,
  getProviderModel,
  validateApiKey,
} from "../utils/providerConfig.js";
import { createTimeoutController } from "../utils/timeout.js";
import { stripTrailingSlash } from "./openaiChatCompletionsClient.js";
import { OpenAIChatCompletionsProvider } from "./openaiChatCompletionsBase.js";

const COHERE_DEFAULT_BASE_URL = "https://api.cohere.com/compatibility/v1";

const getCohereApiKey = (): string => validateApiKey(createCohereConfig());

const getDefaultCohereModel = (): string =>
  getProviderModel("COHERE_MODEL", CohereModels.COMMAND_R_PLUS);

/**
 * Cohere Provider — direct HTTP, no AI SDK.
 *
 * Routes Command R / Command R+ chat completions through Cohere's
 * OpenAI-compatible endpoint at /compatibility/v1. All request/stream/
 * tool-loop orchestration lives in `OpenAIChatCompletionsProvider`; this
 * class only declares configuration and provider-specific error mapping.
 *
 * Embed v3 is exposed via `embed()` / `embedMany()` backed by a native
 * POST to /v2/embed (the compatibility path is chat-only).
 *
 * @see https://docs.cohere.com/docs/compatibility-api
 * @see https://docs.cohere.com/reference/embed
 */
export class CohereProvider extends OpenAIChatCompletionsProvider {
  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["cohere"],
  ) {
    const overrideApiKey = credentials?.apiKey?.trim();
    const apiKey =
      overrideApiKey && overrideApiKey.length > 0
        ? overrideApiKey
        : getCohereApiKey();
    const baseURL =
      credentials?.baseURL?.trim() ||
      process.env.COHERE_BASE_URL?.trim() ||
      COHERE_DEFAULT_BASE_URL;

    super("cohere" as AIProviderName, modelName, sdk, { baseURL, apiKey });

    logger.debug("Cohere Provider initialized", {
      modelName: this.modelName,
      providerName: this.providerName,
      baseURL: redactUrlCredentials(this.config.baseURL),
    });
  }

  protected getProviderName(): AIProviderName {
    return "cohere" as AIProviderName;
  }

  protected getDefaultModel(): string {
    return getDefaultCohereModel();
  }

  protected getFallbackModelName(): string {
    return CohereModels.COMMAND_R;
  }

  protected getFallbackModels(): string[] {
    return [
      CohereModels.COMMAND_A,
      CohereModels.COMMAND_A_REASONING,
      CohereModels.COMMAND_R_PLUS,
      CohereModels.COMMAND_R,
      CohereModels.COMMAND_R7B,
    ];
  }

  protected formatProviderError(error: unknown): Error {
    const rules: ProviderErrorRule[] = [
      // "invalid api token" is checked lowercase (case-sensitive substring, as
      // in the original) — deliberately NOT normalized to match the family's
      // more common "Invalid API key" capitalization, since Cohere's actual
      // wire message differs.
      {
        match: (ctx) =>
          /invalid api token|Authentication|401|invalid_api_token/.test(
            ctx.message,
          ),
        errorClass: AuthenticationError,
        message:
          "Invalid Cohere API key. Check COHERE_API_KEY. Get one at https://dashboard.cohere.com/api-keys",
      },
      {
        match: (ctx) => /rate limit|429/.test(ctx.message),
        errorClass: RateLimitError,
        message: "Cohere rate limit exceeded. Back off and retry.",
      },
      {
        match: (ctx) => /model_not_found|404/.test(ctx.message),
        errorClass: InvalidModelError,
        message: () =>
          `Cohere model '${this.modelName}' not found. Use command-r, command-r-plus, or command-r7b-12-2024.`,
      },
      {
        match: (ctx) => /trial limit|trial_limit/.test(ctx.message),
        errorClass: ProviderError,
        message:
          "Cohere trial usage limit exceeded. Upgrade at https://dashboard.cohere.com/billing.",
      },
      ...DEFAULT_ERROR_RULES,
    ];
    return classifyProviderError(error, rules, "cohere", this.modelName);
  }

  async validateConfiguration(): Promise<boolean> {
    return (
      typeof this.config.apiKey === "string" &&
      this.config.apiKey.trim().length > 0
    );
  }

  getConfiguration() {
    return {
      provider: this.providerName,
      model: this.modelName,
      defaultModel: getDefaultCohereModel(),
      baseURL: this.config.baseURL,
    };
  }

  /**
   * Default embedding model for Cohere.
   */
  protected getDefaultEmbeddingModel(): string {
    return CohereModels.EMBED_ENGLISH_V3;
  }

  /**
   * Generate an embedding for a single text via Cohere's native /v2/embed
   * endpoint. Returns the float[] embedding vector.
   *
   * The shared OpenAI-compatible /compatibility/v1 path is chat-only; embed
   * lives on the native API (POST /v2/embed). Documented at
   * https://docs.cohere.com/reference/embed.
   */
  async embed(text: string, modelName?: string): Promise<number[]> {
    const vectors = await this.embedMany([text], modelName);
    if (!vectors[0]) {
      throw new ProviderError(
        "Cohere /v2/embed returned no embeddings.",
        "cohere",
      );
    }
    return vectors[0];
  }

  /**
   * Batch embedding via Cohere's native /v2/embed endpoint. Cohere caps at
   * 96 inputs per request; larger batches are chunked.
   *
   * Partial failures are not surfaced: if any chunk request fails the whole
   * call rejects and already-embedded chunks are discarded — callers should
   * retry the full input.
   */
  async embedMany(texts: string[], modelName?: string): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }
    const model = modelName ?? this.getDefaultEmbeddingModel();
    // Strip the compatibility suffix to reach the native API root.
    const baseUrl = stripTrailingSlash(
      this.config.baseURL.replace(/\/compatibility\/v\d+\/?$/, ""),
    );
    const url = `${baseUrl}/v2/embed`;

    const BATCH_SIZE = 96;
    const results: number[][] = [];
    const fetchImpl = createProxyFetch();

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const timeoutController = createTimeoutController(
        30_000,
        this.providerName,
        "generate",
      );
      try {
        const response = await fetchImpl(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            texts: batch,
            input_type: "search_document",
            embedding_types: ["float"],
          }),
          ...(timeoutController?.controller.signal
            ? { signal: timeoutController.controller.signal }
            : {}),
        });
        if (!response.ok) {
          const body = await response.text().catch(() => "");
          throw this.formatProviderError(
            new Error(
              `Cohere /v2/embed failed: ${response.status} — ${body.slice(0, 500)}`,
            ),
          );
        }
        const json = (await response.json()) as {
          embeddings?: { float?: number[][] } | number[][];
        };
        const floatVecs =
          (json.embeddings as { float?: number[][] })?.float ??
          (Array.isArray(json.embeddings) ? json.embeddings : undefined);
        if (!floatVecs || floatVecs.length !== batch.length) {
          throw new ProviderError(
            `Cohere /v2/embed returned ${floatVecs?.length ?? 0} embeddings for ${batch.length} inputs.`,
            "cohere",
          );
        }
        results.push(...floatVecs);
      } finally {
        timeoutController?.cleanup();
      }
    }
    return results;
  }
}
