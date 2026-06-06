import { SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import type { AIProviderName } from "../constants/enums.js";
import { AIProviderName as AIProviderNameEnum } from "../constants/enums.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import type {
  EnhancedGenerateResult,
  NeurolinkCredentials,
  OpenAICompatStreamLifecycleListeners,
  TextGenerationOptions,
  UnknownRecord,
} from "../types/index.js";
import {
  AuthenticationError,
  InvalidModelError,
  NetworkError,
  ProviderError,
  RateLimitError,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { redactUrlCredentials } from "../utils/logSanitize.js";
import { calculateCost } from "../utils/pricing.js";
import {
  createOpenAIConfig,
  getProviderModel,
  validateApiKey,
} from "../utils/providerConfig.js";
import { MAX_IMAGE_BYTES, readBoundedBuffer } from "../utils/sizeGuard.js";
import { assertSafeUrl } from "../utils/ssrfGuard.js";
import { createTimeoutController, TimeoutError } from "../utils/timeout.js";
import { stripTrailingSlash } from "./openaiChatCompletionsClient.js";
import { OpenAIChatCompletionsProvider } from "./openaiChatCompletionsBase.js";

const OPENAI_DEFAULT_BASE_URL = "https://api.openai.com/v1";

/**
 * Resolve the effective OpenAI base URL from optional credential / env
 * overrides, falling back to the official API host.
 *
 * - Blank or whitespace-only overrides are treated as unset, so a bare
 *   `OPENAI_BASE_URL=` cannot silently override the default with "".
 * - The official OpenAI REST API lives under `/v1`. Setup guidance has long
 *   shown `OPENAI_BASE_URL="https://api.openai.com"` (no path); consumed
 *   verbatim that builds `https://api.openai.com/chat/completions` and 404s.
 *   When the canonical host is supplied without a path, append `/v1`. Custom
 *   proxy hosts (LiteLLM, gateways, …) are left exactly as provided.
 */
const resolveOpenAIBaseURL = (
  credentialBaseURL?: string,
  envBaseURL?: string,
): string => {
  const resolved =
    [credentialBaseURL, envBaseURL]
      .map((v) => v?.trim())
      .find((v): v is string => !!v && v.length > 0) ?? OPENAI_DEFAULT_BASE_URL;

  try {
    const url = new URL(resolved);
    const hasPath = url.pathname && url.pathname !== "/";
    if (url.hostname === "api.openai.com" && !hasPath) {
      url.pathname = "/v1";
      return stripTrailingSlash(url.toString());
    }
  } catch {
    // Not a parseable absolute URL — return the override verbatim.
  }
  return resolved;
};

const getOpenAIApiKey = (): string => validateApiKey(createOpenAIConfig());

const getOpenAIModel = (): string => getProviderModel("OPENAI_MODEL", "gpt-4o");

const streamTracer = trace.getTracer("neurolink.provider.openai");

/**
 * OpenAI Provider — direct HTTP, no AI SDK.
 *
 * OpenAI chat completions at api.openai.com/v1. All request / stream /
 * tool-loop orchestration lives in `OpenAIChatCompletionsProvider`; this
 * class adds:
 *   - OTel span wrap with cost (`onStreamStart`)
 *   - Native `/v1/embeddings` (`embed` / `embedMany`)
 *   - Image generation via `/v1/images/generations` (`executeImageGeneration`)
 *   - OpenAI-specific error mapping (`formatProviderError`)
 *
 * @see https://platform.openai.com/docs/api-reference
 */
export class OpenAIProvider extends OpenAIChatCompletionsProvider {
  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["openai"],
  ) {
    const overrideApiKey = credentials?.apiKey?.trim();
    const apiKey =
      overrideApiKey && overrideApiKey.length > 0
        ? overrideApiKey
        : getOpenAIApiKey();
    const baseURL = resolveOpenAIBaseURL(
      credentials?.baseURL,
      process.env.OPENAI_BASE_URL,
    );

    super(AIProviderNameEnum.OPENAI, modelName, sdk, { baseURL, apiKey });

    logger.debug("OpenAIProvider initialized", {
      model: this.modelName,
      providerName: this.providerName,
      baseURL: redactUrlCredentials(this.config.baseURL),
    });
  }

  // ===========================================================================
  // Abstract hook implementations
  // ===========================================================================

  protected getProviderName(): AIProviderName {
    return AIProviderNameEnum.OPENAI;
  }

  protected getDefaultModel(): string {
    return getOpenAIModel();
  }

  public formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new NetworkError(error.message, this.providerName);
    }

    const errorObj = error as UnknownRecord;
    const message =
      errorObj?.message && typeof errorObj.message === "string"
        ? errorObj.message
        : "Unknown error";
    const errorType =
      errorObj?.type && typeof errorObj.type === "string"
        ? errorObj.type
        : undefined;
    const statusCode =
      typeof errorObj?.status === "number"
        ? errorObj.status
        : typeof errorObj?.statusCode === "number"
          ? errorObj.statusCode
          : undefined;

    // Curator P1-1 / Reviewer Finding #4: only the explicit auth markers
    // map to AuthenticationError. Earlier we treated every
    // `invalid_request_error` as an auth failure — that's OpenAI's catch-all
    // for any bad request (unsupported parameter, malformed JSON, etc.) and
    // mislabelled them as "invalid API key". Use credential-specific
    // signals only.
    if (
      message.includes("API_KEY_INVALID") ||
      message.includes("Invalid API key") ||
      message.includes("Incorrect API key") ||
      message.includes("invalid_api_key") ||
      errorType === "invalid_api_key" ||
      statusCode === 401
    ) {
      return new AuthenticationError(
        message.includes("Incorrect API key") ||
          message.includes("Invalid API key")
          ? message
          : "Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.",
        this.providerName,
      );
    }

    if (
      message.includes("rate limit") ||
      errorType === "rate_limit_error" ||
      statusCode === 429
    ) {
      return new RateLimitError(
        "OpenAI rate limit exceeded. Please try again later.",
        this.providerName,
      );
    }

    if (message.includes("model_not_found")) {
      return new InvalidModelError(
        `Model not found: ${this.modelName}`,
        this.providerName,
      );
    }

    // Generic provider error
    return new ProviderError(`OpenAI error: ${message}`, this.providerName);
  }

  // ===========================================================================
  // Optional hook overrides
  // ===========================================================================

  /**
   * Wrap the stream in an OTel span to capture provider-level latency,
   * token usage, finish reason, and cost. Mirrors the pre-migration
   * `streamText`-span behaviour.
   */
  protected onStreamStart(
    modelId: string,
  ): OpenAICompatStreamLifecycleListeners | undefined {
    const span = streamTracer.startSpan("neurolink.provider.streamText", {
      kind: SpanKind.CLIENT,
      attributes: {
        "gen_ai.system": "openai",
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

  // ===========================================================================
  // Embeddings — native POST /v1/embeddings
  // ===========================================================================

  /**
   * Default embedding model, overridable via OPENAI_EMBEDDING_MODEL env var.
   */
  protected getDefaultEmbeddingModel(): string {
    return process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
  }

  /**
   * Generate an embedding for a single text input via native /v1/embeddings.
   *
   * @param text - The text to embed
   * @param modelName - The embedding model to use (default: text-embedding-3-small)
   * @returns Promise resolving to the embedding vector
   */
  async embed(text: string, modelName?: string): Promise<number[]> {
    const embeddingModelName = modelName || this.getDefaultEmbeddingModel();

    logger.debug("Generating embedding", {
      provider: this.providerName,
      model: embeddingModelName,
      textLength: text.length,
    });

    try {
      const [embedding] = await this.callEmbeddings(
        embeddingModelName,
        [text],
        "embed",
      );
      logger.debug("Embedding generated successfully", {
        provider: this.providerName,
        model: embeddingModelName,
        embeddingDimension: embedding.length,
      });
      return embedding;
    } catch (error) {
      logger.error("Embedding generation failed", {
        error: error instanceof Error ? error.message : String(error),
        model: embeddingModelName,
        textLength: text.length,
      });
      throw this.handleProviderError(error);
    }
  }

  /**
   * Generate embeddings for multiple texts in a single batch via native /v1/embeddings.
   *
   * @param texts - The texts to embed
   * @param modelName - The embedding model to use (default: text-embedding-3-small)
   * @returns Promise resolving to an array of embedding vectors
   */
  async embedMany(texts: string[], modelName?: string): Promise<number[][]> {
    const embeddingModelName = modelName || this.getDefaultEmbeddingModel();

    logger.debug("Generating batch embeddings", {
      provider: this.providerName,
      model: embeddingModelName,
      count: texts.length,
    });

    try {
      const embeddings = await this.callEmbeddings(
        embeddingModelName,
        texts,
        "embedMany",
      );
      logger.debug("Batch embeddings generated successfully", {
        provider: this.providerName,
        model: embeddingModelName,
        count: embeddings.length,
        embeddingDimension: embeddings[0]?.length,
      });
      return embeddings;
    } catch (error) {
      logger.error("Batch embedding generation failed", {
        error: error instanceof Error ? error.message : String(error),
        model: embeddingModelName,
        count: texts.length,
      });
      throw this.handleProviderError(error);
    }
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
        let message = `OpenAI ${operation} failed with status ${res.status}`;
        let errorType: string | undefined;
        if (bodyText) {
          try {
            const parsed = JSON.parse(bodyText) as {
              error?: { message?: string; type?: string };
            };
            if (parsed.error?.message) {
              message = parsed.error.message;
            }
            errorType = parsed.error?.type;
          } catch {
            // Non-JSON error body — keep the status-based message.
          }
        }
        // Throw a raw, annotated error so the public embed/embedMany catch
        // formats it exactly once via handleProviderError(), preserving
        // status-based classification (401 -> auth, 429 -> rate limit, …).
        throw Object.assign(new Error(message), {
          status: res.status,
          type: errorType,
        });
      }
      const json = (await res.json()) as {
        data?: Array<{ embedding?: number[] }>;
      };
      const embeddings = (json.data ?? [])
        .map((row) => row.embedding)
        .filter((e): e is number[] => Array.isArray(e));
      if (embeddings.length === 0) {
        throw new ProviderError(
          `OpenAI ${operation} returned no embeddings`,
          this.providerName,
        );
      }
      return embeddings;
    } finally {
      timeoutController?.cleanup();
    }
  }

  // ===========================================================================
  // Image generation — native POST /v1/images/generations
  // ===========================================================================

  /**
   * Image generation via the OpenAI Images API (`/v1/images/generations`).
   *
   * Supports `gpt-image-1`, `dall-e-3`, and `dall-e-2`. The three models
   * differ in which body params they accept:
   *
   * - `gpt-image-1` returns base64 by default; does NOT accept `response_format`.
   * - `dall-e-3` / `dall-e-2` accept `response_format: "b64_json"` to get base64.
   * - `dall-e-2` does NOT accept `quality` / `style`.
   *
   * The model is taken from `options.model || this.modelName`.
   *
   * @see https://platform.openai.com/docs/api-reference/images/create
   */
  protected override async executeImageGeneration(
    options: TextGenerationOptions,
  ): Promise<EnhancedGenerateResult> {
    const startTime = Date.now();
    const prompt = options.prompt ?? options.input?.text ?? "";
    if (!prompt.trim()) {
      throw new Error(
        "OpenAI image generation requires a prompt (input.text or prompt)",
      );
    }

    const model = options.model ?? this.modelName;
    const baseURL = stripTrailingSlash(
      this.config.baseURL ?? OPENAI_DEFAULT_BASE_URL,
    );

    // Image-gen extras live on `options` but are not part of the strict
    // TextGenerationOptions shape — cast to a permissive type to read them.
    const extras = options as TextGenerationOptions & {
      aspectRatio?: string;
      numberOfImages?: number;
      quality?: string;
      style?: string;
      size?: string;
    };

    // Map aspect ratio to OpenAI's `size` parameter. gpt-image-1 supports
    // 1024x1024 / 1024x1536 / 1536x1024 / auto; dall-e-3 supports
    // 1024x1024 / 1792x1024 / 1024x1792; dall-e-2 supports 256x256 /
    // 512x512 / 1024x1024. We pick safe defaults and let users override
    // via `extras.size` directly.
    const size =
      extras.size ?? this.aspectRatioToOpenAISize(extras.aspectRatio, model);

    // Clamp n per-model: gpt-image-1 and dall-e-3 only support n=1;
    // dall-e-2 supports n=1..10; default to 1 for any future models.
    const rawN = extras.numberOfImages ?? 1;
    let clampedN: number;
    if (model === "gpt-image-1" || model.startsWith("dall-e-3")) {
      clampedN = 1;
    } else if (model.startsWith("dall-e-2")) {
      clampedN = Math.min(Math.max(rawN, 1), 10);
    } else {
      clampedN = 1;
    }
    const n = clampedN;

    const body: Record<string, unknown> = {
      model,
      prompt,
      n,
      size,
    };

    if (model === "gpt-image-1") {
      // gpt-image-1 always returns base64; rejects `response_format`.
      if (extras.quality) {
        body.quality = extras.quality;
      }
    } else if (model.startsWith("dall-e-3")) {
      body.response_format = "b64_json";
      if (extras.quality) {
        body.quality = extras.quality;
      }
      if (extras.style) {
        body.style = extras.style;
      }
    } else {
      // dall-e-2 (and forward-compat default).
      body.response_format = "b64_json";
    }

    const REQUEST_TIMEOUT_MS = 120_000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      const proxyFetch = createProxyFetch();
      response = await proxyFetch(`${baseURL}/images/generations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(
          `OpenAI image generation timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
          { cause: err },
        );
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `OpenAI image generation failed: ${response.status} — ${text}`,
      );
    }

    const data = (await response.json()) as {
      created?: number;
      data?: Array<{
        b64_json?: string;
        url?: string;
        revised_prompt?: string;
      }>;
    };

    const first = data.data?.[0];
    if (!first) {
      throw new Error("OpenAI image generation returned no images");
    }

    let base64: string | undefined = first.b64_json;
    // dall-e-2 with `response_format: "b64_json"` should always include
    // b64_json. If a hosted URL came back instead (e.g. older keys, or
    // url-mode), download it inline so callers always get base64.
    if (!base64 && first.url) {
      // Guard the API-returned URL before fetching (provider-returned URLs
      // carry the same SSRF risk as caller-supplied ones).
      await assertSafeUrl(first.url);
      const proxyFetch = createProxyFetch();
      const dlController = new AbortController();
      const dlTimeoutId = setTimeout(() => dlController.abort(), 60_000);
      let imgResp: Response;
      try {
        imgResp = await proxyFetch(first.url, { signal: dlController.signal });
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          throw new Error("OpenAI image URL download timed out after 60s", {
            cause: err,
          });
        }
        throw err;
      } finally {
        clearTimeout(dlTimeoutId);
      }
      if (!imgResp.ok) {
        throw new Error(
          `OpenAI image generation: failed to fetch hosted URL ${first.url} (${imgResp.status})`,
        );
      }
      const buf = await readBoundedBuffer(
        imgResp,
        MAX_IMAGE_BYTES,
        "OpenAI image fallback",
      );
      base64 = buf.toString("base64");
    }

    if (!base64) {
      throw new Error(
        "OpenAI image generation returned neither b64_json nor a URL",
      );
    }

    const generationTimeMs = Date.now() - startTime;
    logger.info(
      `[OpenAIProvider] Generated image (${base64.length} base64 chars) in ${generationTimeMs}ms — model ${model}`,
    );

    return {
      content: first.revised_prompt ?? prompt,
      provider: this.providerName,
      model,
      usage: { input: 0, output: 0, total: 0 },
      imageOutput: { base64 },
    };
  }

  /**
   * Map a NeuroLink-style aspect ratio (e.g. "16:9") to the OpenAI
   * `size` parameter accepted by the active image model. Falls back to
   * the per-model square default when the ratio is unknown.
   */
  private aspectRatioToOpenAISize(
    aspectRatio: string | undefined,
    model: string,
  ): string {
    if (model === "gpt-image-1") {
      if (aspectRatio === "16:9" || aspectRatio === "3:2") {
        return "1536x1024";
      }
      if (aspectRatio === "9:16" || aspectRatio === "2:3") {
        return "1024x1536";
      }
      return "1024x1024";
    }
    if (model.startsWith("dall-e-3")) {
      if (aspectRatio === "16:9" || aspectRatio === "3:2") {
        return "1792x1024";
      }
      if (aspectRatio === "9:16" || aspectRatio === "2:3") {
        return "1024x1792";
      }
      return "1024x1024";
    }
    // dall-e-2 — only square sizes supported.
    return "1024x1024";
  }
}
