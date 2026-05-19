import type { AIProviderName } from "../constants/enums.js";
import { IdeogramModels } from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { isNeuroLink } from "../neurolink.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import type {
  EnhancedGenerateResult,
  IdeogramImageResponse,
  NeurolinkCredentials,
  StreamOptions,
  StreamResult,
  TextGenerationOptions,
  ValidationSchema,
} from "../types/index.js";
import {
  AuthenticationError,
  ProviderError,
  RateLimitError,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import {
  createIdeogramConfig,
  getProviderModel,
  validateApiKey,
} from "../utils/providerConfig.js";
import type { LanguageModel } from "../types/index.js";

const IDEOGRAM_DEFAULT_BASE_URL = "https://api.ideogram.ai";
const REQUEST_TIMEOUT_MS = 120_000;

const getIdeogramApiKey = (): string => validateApiKey(createIdeogramConfig());

const getDefaultIdeogramModel = (): string =>
  getProviderModel("IDEOGRAM_MODEL", IdeogramModels.IDEOGRAM_V3);

/**
 * Ideogram Provider — direct image generation with strong typography.
 *
 * Hits api.ideogram.ai/api/v1/ideogram-v3/generate. Returns image URLs;
 * we download and surface as base64 to keep the imageOutput contract
 * uniform across image-gen providers.
 *
 * @see https://developer.ideogram.ai/api-reference/api-reference/post-v-1-ideogram-v-3-generate
 */
export class IdeogramProvider extends BaseProvider {
  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly proxyFetch: typeof fetch;

  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["ideogram"],
  ) {
    const validatedNeurolink = isNeuroLink(sdk) ? sdk : undefined;

    super(modelName, "ideogram" as AIProviderName, validatedNeurolink);

    const overrideKey = credentials?.apiKey?.trim();
    this.apiKey =
      overrideKey && overrideKey.length > 0 ? overrideKey : getIdeogramApiKey();
    this.baseURL =
      credentials?.baseURL ??
      process.env.IDEOGRAM_BASE_URL ??
      IDEOGRAM_DEFAULT_BASE_URL;
    this.proxyFetch = createProxyFetch();

    logger.debug("Ideogram Provider initialized (image-gen only)", {
      modelName: this.modelName,
      baseURL: this.baseURL,
    });
  }

  protected getProviderName(): AIProviderName {
    return this.providerName;
  }

  protected getDefaultModel(): string {
    return getDefaultIdeogramModel();
  }

  override supportsTools(): boolean {
    return false;
  }

  protected getAISDKModel(): LanguageModel {
    throw new Error(
      "Ideogram is an image-generation-only provider; chat completions are not available.",
    );
  }

  protected async executeStream(
    _options: StreamOptions,
    _analysisSchema?: ValidationSchema,
  ): Promise<StreamResult> {
    throw new Error(
      "Ideogram is an image-generation-only provider; streaming chat is not available.",
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
        "Invalid Ideogram API key. Get one at https://developer.ideogram.ai/",
        "ideogram",
      );
    }
    if (
      message.includes("429") ||
      message.toLowerCase().includes("rate limit")
    ) {
      return new RateLimitError(
        "Ideogram rate limit exceeded. Back off and retry.",
        "ideogram",
      );
    }
    if (message.includes("safety") || message.includes("is_image_safe")) {
      return new ProviderError(
        "Ideogram declined the request due to safety filters. Adjust the prompt and retry.",
        "ideogram",
      );
    }
    return new ProviderError(`Ideogram error: ${message}`, "ideogram");
  }

  protected override async executeImageGeneration(
    options: TextGenerationOptions,
  ): Promise<EnhancedGenerateResult> {
    const startTime = Date.now();

    // Resolve per-call credentials first, then fall back to instance-level.
    const perCallCreds = options.credentials?.ideogram;
    const effectiveApiKey = perCallCreds?.apiKey?.trim() || this.apiKey;
    const effectiveBaseURL = perCallCreds?.baseURL || this.baseURL;

    const prompt = options.prompt ?? options.input?.text ?? "";
    if (!prompt.trim()) {
      throw new Error(
        "Ideogram image generation requires a prompt (input.text or prompt)",
      );
    }

    const extras = options as TextGenerationOptions & {
      aspectRatio?: string;
      negativePrompt?: string;
      seed?: number;
      style?: string;
      magicPrompt?: "AUTO" | "ON" | "OFF";
    };

    const body: Record<string, unknown> = {
      prompt,
      model: this.modelName,
      magic_prompt: extras.magicPrompt ?? "AUTO",
    };
    if (extras.aspectRatio) {
      body.aspect_ratio = extras.aspectRatio;
    }
    if (extras.negativePrompt) {
      body.negative_prompt = extras.negativePrompt;
    }
    if (extras.seed !== undefined) {
      body.seed = extras.seed;
    }
    if (extras.style) {
      body.style_type = extras.style;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await this.proxyFetch(
        `${effectiveBaseURL}/v1/ideogram-v3/generate`,
        {
          method: "POST",
          headers: {
            "Api-Key": effectiveApiKey,
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
            `Ideogram image-gen request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
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
        new Error(`Ideogram image-gen failed: ${response.status} — ${text}`),
      );
    }

    const data = (await response.json()) as IdeogramImageResponse;
    const url = data.data?.[0]?.url;
    if (!url) {
      throw new Error("Ideogram returned no image URL");
    }

    // Download the image and convert to base64 to match the imageOutput
    // contract used by other image-gen providers. Apply a 60s timeout so the
    // download cannot hang indefinitely.
    const dlController = new AbortController();
    const dlTimeoutId = setTimeout(() => dlController.abort(), 60_000);
    let dl: Response;
    try {
      dl = await this.proxyFetch(url, { signal: dlController.signal });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("Ideogram image download timed out after 60s", {
          cause: err,
        });
      }
      throw err;
    } finally {
      clearTimeout(dlTimeoutId);
    }
    if (!dl.ok) {
      throw new Error(`Failed to download Ideogram image: ${dl.status}`);
    }
    const buffer = Buffer.from(await dl.arrayBuffer());
    const base64 = buffer.toString("base64");

    const generationTimeMs = Date.now() - startTime;
    logger.info(
      `[IdeogramProvider] Generated image (${buffer.length} bytes) in ${generationTimeMs}ms — model ${this.modelName}`,
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
      defaultModel: getDefaultIdeogramModel(),
      baseURL: this.baseURL,
    };
  }
}

export default IdeogramProvider;
