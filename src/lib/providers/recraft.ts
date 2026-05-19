import type { AIProviderName } from "../constants/enums.js";
import { RecraftModels } from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { isNeuroLink } from "../neurolink.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import type {
  EnhancedGenerateResult,
  NeurolinkCredentials,
  RecraftImageResponse,
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
import {
  createRecraftConfig,
  getProviderModel,
  validateApiKey,
} from "../utils/providerConfig.js";
import { MAX_IMAGE_BYTES, readBoundedBuffer } from "../utils/sizeGuard.js";
import { assertSafeUrl } from "../utils/ssrfGuard.js";
import type { LanguageModel } from "../types/index.js";

const RECRAFT_DEFAULT_BASE_URL = "https://external.api.recraft.ai/v1";
const REQUEST_TIMEOUT_MS = 120_000;

const getRecraftApiKey = (): string => validateApiKey(createRecraftConfig());

const getDefaultRecraftModel = (): string =>
  getProviderModel("RECRAFT_MODEL", RecraftModels.RECRAFT_V3);

/**
 * Recraft Provider — image generation with vector / illustration focus.
 *
 * Hits external.api.recraft.ai/v1/images/generations (OpenAI-compat
 * shape). Returns either url or b64_json; we convert URL → base64 for
 * the uniform imageOutput contract.
 *
 * @see https://www.recraft.ai/docs
 */
export class RecraftProvider extends BaseProvider {
  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly proxyFetch: typeof fetch;

  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["recraft"],
  ) {
    const validatedNeurolink = isNeuroLink(sdk) ? sdk : undefined;

    super(modelName, "recraft" as AIProviderName, validatedNeurolink);

    const overrideKey = credentials?.apiKey?.trim();
    this.apiKey =
      overrideKey && overrideKey.length > 0 ? overrideKey : getRecraftApiKey();
    this.baseURL =
      credentials?.baseURL ??
      process.env.RECRAFT_BASE_URL ??
      RECRAFT_DEFAULT_BASE_URL;
    this.proxyFetch = createProxyFetch();

    logger.debug("Recraft Provider initialized (image-gen only)", {
      modelName: this.modelName,
      baseURL: this.baseURL,
    });
  }

  protected getProviderName(): AIProviderName {
    return this.providerName;
  }

  protected getDefaultModel(): string {
    return getDefaultRecraftModel();
  }

  override supportsTools(): boolean {
    return false;
  }

  protected getAISDKModel(): LanguageModel {
    throw new Error(
      "Recraft is an image-generation-only provider; chat completions are not available.",
    );
  }

  protected async executeStream(
    _options: StreamOptions,
    _analysisSchema?: ValidationSchema,
  ): Promise<StreamResult> {
    throw new Error(
      "Recraft is an image-generation-only provider; streaming chat is not available.",
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
        "Invalid Recraft API key. Get one at https://www.recraft.ai/api",
        "recraft",
      );
    }
    if (
      message.includes("429") ||
      message.toLowerCase().includes("rate limit")
    ) {
      return new RateLimitError(
        "Recraft rate limit exceeded. Back off and retry.",
        "recraft",
      );
    }
    if (message.includes("404") || message.includes("model_not_found")) {
      return new InvalidModelError(
        `Recraft model '${this.modelName}' not found. Use recraftv3, recraftv3-svg, or recraftv2.`,
        "recraft",
      );
    }
    return new ProviderError(`Recraft error: ${message}`, "recraft");
  }

  protected override async executeImageGeneration(
    options: TextGenerationOptions,
  ): Promise<EnhancedGenerateResult> {
    const startTime = Date.now();

    // Resolve per-call credentials first, then fall back to instance-level.
    const perCallCreds = options.credentials?.recraft;
    const effectiveApiKey = perCallCreds?.apiKey?.trim() || this.apiKey;
    const effectiveBaseURL = perCallCreds?.baseURL || this.baseURL;

    const prompt = options.prompt ?? options.input?.text ?? "";
    if (!prompt.trim()) {
      throw new Error(
        "Recraft image generation requires a prompt (input.text or prompt)",
      );
    }

    const extras = options as TextGenerationOptions & {
      negativePrompt?: string;
      style?: string;
      styleId?: string;
      size?: string;
    };

    const body: Record<string, unknown> = {
      model: options.model ?? this.modelName,
      prompt,
      n: 1,
      response_format: "b64_json",
    };
    if (extras.negativePrompt) {
      body.negative_prompt = extras.negativePrompt;
    }
    if (extras.style) {
      body.style = extras.style;
    }
    if (extras.styleId) {
      body.style_id = extras.styleId;
    }
    if (extras.size) {
      body.size = extras.size;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await this.proxyFetch(
        `${effectiveBaseURL}/images/generations`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${effectiveApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        },
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw this.formatProviderError(
          new Error(
            `Recraft image-gen request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
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
        new Error(`Recraft image-gen failed: ${response.status} — ${text}`),
      );
    }

    const data = (await response.json()) as RecraftImageResponse;
    const entry = data.data?.[0];
    if (!entry) {
      throw new Error("Recraft returned no image data");
    }

    let base64: string;
    if (entry.b64_json) {
      base64 = entry.b64_json;
    } else if (entry.url) {
      // Guard the API-returned URL before fetching (provider-returned URLs
      // carry the same SSRF risk as caller-supplied ones).
      await assertSafeUrl(entry.url);
      // Fallback URL download — apply a 60s timeout so it cannot hang indefinitely.
      const dlController = new AbortController();
      const dlTimeoutId = setTimeout(() => dlController.abort(), 60_000);
      let dl: Response;
      try {
        dl = await this.proxyFetch(entry.url, { signal: dlController.signal });
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          throw new Error("Recraft image download timed out after 60s", {
            cause: err,
          });
        }
        throw err;
      } finally {
        clearTimeout(dlTimeoutId);
      }
      if (!dl.ok) {
        throw new Error(`Failed to download Recraft image: ${dl.status}`);
      }
      const dlBuf = await readBoundedBuffer(
        dl,
        MAX_IMAGE_BYTES,
        "Recraft image",
      );
      base64 = dlBuf.toString("base64");
    } else {
      throw new Error("Recraft response missing both b64_json and url");
    }

    const generationTimeMs = Date.now() - startTime;
    logger.info(
      `[RecraftProvider] Generated image (${base64.length} base64 chars) in ${generationTimeMs}ms — model ${this.modelName}`,
    );

    return {
      content: prompt,
      provider: this.providerName,
      model: this.modelName,
      // output: 1000 = sentinel for per-image pricing (see pricing.ts)
      usage: { input: 0, output: 1000, total: 1000 },
      imageOutput: { base64 },
    };
  }

  async validateConfiguration(): Promise<boolean> {
    return typeof this.apiKey === "string" && this.apiKey.trim().length > 0;
  }

  getConfiguration() {
    return {
      provider: this.providerName,
      model: this.modelName,
      defaultModel: getDefaultRecraftModel(),
      baseURL: this.baseURL,
    };
  }
}

export default RecraftProvider;
