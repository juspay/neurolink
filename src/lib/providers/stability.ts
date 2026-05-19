import type { AIProviderName } from "../constants/enums.js";
import { StabilityModels } from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { isNeuroLink } from "../neurolink.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import type {
  EnhancedGenerateResult,
  NeurolinkCredentials,
  StabilityImageResponse,
  StreamOptions,
  StreamResult,
  TextGenerationOptions,
  ValidationSchema,
} from "../types/index.js";
import {
  AuthenticationError,
  InvalidModelError,
  ProviderError,
  RateLimitError,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { getProviderModel } from "../utils/providerConfig.js";
import type { LanguageModel } from "../types/index.js";

const STABILITY_DEFAULT_BASE_URL = "https://api.stability.ai";
const REQUEST_TIMEOUT_MS = 120_000;

/**
 * Returns the Stability AI API key from env vars, or `undefined` when none
 * is set.  The constructor stores `undefined` instead of throwing so that
 * callers who only supply per-call credentials via `options.credentials` can
 * still instantiate the provider.  Validation is deferred to the actual
 * call site inside `executeImageGeneration`.
 */
const getStabilityApiKeyOptional = (): string | undefined =>
  (
    process.env.STABILITY_API_KEY ??
    process.env.STABILITY_AI_API_KEY ??
    ""
  ).trim() || undefined;

const getDefaultStabilityModel = (): string =>
  getProviderModel("STABILITY_MODEL", StabilityModels.STABLE_IMAGE_ULTRA);

/**
 * Stability AI Provider — direct image generation.
 *
 * Hits api.stability.ai/v2beta/stable-image/generate/{model}. Returns
 * base64 PNG. No chat / streaming / tool calling.
 *
 * The constructor no longer throws when `STABILITY_API_KEY` is absent so
 * that per-call credentials (passed via `options.credentials.stability`) can
 * be used without requiring a global env var at startup.
 *
 * @see https://platform.stability.ai/docs/api-reference
 */
export class StabilityProvider extends BaseProvider {
  private readonly apiKey: string | undefined;
  private readonly baseURL: string;
  private readonly proxyFetch: typeof fetch;

  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["stability"],
  ) {
    const validatedNeurolink = isNeuroLink(sdk) ? sdk : undefined;

    super(modelName, "stability" as AIProviderName, validatedNeurolink);

    const overrideKey = credentials?.apiKey?.trim();
    this.apiKey =
      overrideKey && overrideKey.length > 0
        ? overrideKey
        : getStabilityApiKeyOptional();
    this.baseURL =
      credentials?.baseURL ??
      process.env.STABILITY_BASE_URL ??
      STABILITY_DEFAULT_BASE_URL;
    this.proxyFetch = createProxyFetch();

    logger.debug("Stability AI Provider initialized (image-gen only)", {
      modelName: this.modelName,
      baseURL: this.baseURL,
    });
  }

  protected getProviderName(): AIProviderName {
    return this.providerName;
  }

  protected getDefaultModel(): string {
    return getDefaultStabilityModel();
  }

  override supportsTools(): boolean {
    return false;
  }

  protected getAISDKModel(): LanguageModel {
    throw new Error(
      "Stability AI is an image-generation-only provider; chat completions are not available.",
    );
  }

  protected async executeStream(
    _options: StreamOptions,
    _analysisSchema?: ValidationSchema,
  ): Promise<StreamResult> {
    throw new Error(
      "Stability AI is an image-generation-only provider; streaming chat is not available. Use generate({output:{format:'binary'}}) with a Stable Image / SD 3.5 model.",
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
        "Invalid Stability AI API key. Get one at https://platform.stability.ai/account/keys",
        "stability",
      );
    }
    if (
      message.includes("429") ||
      message.toLowerCase().includes("rate limit")
    ) {
      return new RateLimitError(
        "Stability AI rate limit exceeded. Back off and retry.",
        "stability",
      );
    }
    if (
      message.includes("content_filtered") ||
      message.includes("CONTENT_FILTERED")
    ) {
      return new ProviderError(
        "Stability AI declined the request due to content policy. Adjust the prompt and retry.",
        "stability",
      );
    }
    if (message.includes("404")) {
      return new InvalidModelError(
        `Stability AI model '${this.modelName}' not found. Use stable-image-ultra, stable-image-core, sd3.5-large, sd3.5-large-turbo, or sd3.5-medium.`,
        "stability",
      );
    }
    return new ProviderError(`Stability AI error: ${message}`, "stability");
  }

  protected override async executeImageGeneration(
    options: TextGenerationOptions,
  ): Promise<EnhancedGenerateResult> {
    const startTime = Date.now();

    // Resolve per-call credentials first, then fall back to instance-level.
    const perCallCreds = options.credentials?.stability;
    const resolvedApiKey = perCallCreds?.apiKey?.trim() || this.apiKey;
    if (!resolvedApiKey) {
      throw new Error(
        "Stability AI API key is required. Set STABILITY_API_KEY or pass credentials.stability.apiKey per-call.",
      );
    }
    const effectiveApiKey = resolvedApiKey;
    const effectiveBaseURL = perCallCreds?.baseURL || this.baseURL;

    const prompt = options.prompt ?? options.input?.text ?? "";
    if (!prompt.trim()) {
      throw new Error(
        "Stability AI image generation requires a prompt (input.text or prompt)",
      );
    }

    // Stability's URL slugs are `ultra` / `core` / `sd3` — not the user-facing
    // `stable-image-ultra` / `stable-image-core` model identifiers we expose
    // via StabilityModels. Map both shapes onto the actual path here.
    const modelPath = this.modelName.startsWith("sd3.5-")
      ? "sd3"
      : this.modelName === "stable-image-ultra"
        ? "ultra"
        : this.modelName === "stable-image-core"
          ? "core"
          : this.modelName;

    // Image-gen extras live in `output` / image-specific fields. Cast
    // to a permissive shape so we can read aspectRatio / negativePrompt
    // / seed without polluting TextGenerationOptions.
    const extras = options as TextGenerationOptions & {
      aspectRatio?: string;
      negativePrompt?: string;
      seed?: number;
    };
    const form = new FormData();
    form.append("prompt", prompt);
    form.append("output_format", "png");
    if (extras.aspectRatio) {
      form.append("aspect_ratio", String(extras.aspectRatio));
    }
    if (extras.negativePrompt) {
      form.append("negative_prompt", extras.negativePrompt);
    }
    if (this.modelName.startsWith("sd3.5-")) {
      form.append("model", this.modelName);
    }
    if (extras.seed !== undefined) {
      form.append("seed", String(extras.seed));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await this.proxyFetch(
        `${effectiveBaseURL}/v2beta/stable-image/generate/${modelPath}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${effectiveApiKey}`,
            Accept: "application/json", // base64 in body
          },
          body: form,
          signal: controller.signal,
        },
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw this.formatProviderError(
          new Error(
            `Stability image-gen request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
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
        new Error(`Stability image-gen failed: ${response.status} — ${text}`),
      );
    }

    const data = (await response.json()) as StabilityImageResponse;
    if (!data.image) {
      throw new Error(
        `Stability AI returned no image (finish_reason: ${data.finish_reason ?? "unknown"})`,
      );
    }

    const generationTimeMs = Date.now() - startTime;
    logger.info(
      `[StabilityProvider] Generated image (${data.image.length} base64 chars) in ${generationTimeMs}ms — model ${this.modelName}`,
    );

    return {
      content: prompt,
      provider: this.providerName,
      model: this.modelName,
      // output: 1000 = sentinel for per-image pricing (see pricing.ts)
      usage: { input: 0, output: 1000, total: 1000 },
      imageOutput: { base64: data.image },
    };
  }

  async validateConfiguration(): Promise<boolean> {
    return this.apiKey !== undefined && this.apiKey.trim().length > 0;
  }

  getConfiguration() {
    return {
      provider: this.providerName,
      model: this.modelName,
      defaultModel: getDefaultStabilityModel(),
      baseURL: this.baseURL,
    };
  }
}

export default StabilityProvider;
