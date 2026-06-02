import type { AIProviderName } from "../constants/enums.js";
import { XaiModels } from "../constants/enums.js";
import {
  AuthenticationError,
  InvalidModelError,
  NetworkError,
  ProviderError,
  RateLimitError,
} from "../types/index.js";
import type { NeurolinkCredentials, UnknownRecord } from "../types/index.js";
import { logger } from "../utils/logger.js";
import {
  createXaiConfig,
  getProviderModel,
  validateApiKey,
} from "../utils/providerConfig.js";
import { TimeoutError } from "../utils/timeout.js";
import { OpenAIChatCompletionsProvider } from "./openaiChatCompletionsBase.js";

const XAI_DEFAULT_BASE_URL = "https://api.x.ai/v1";

const getXaiApiKey = (): string => validateApiKey(createXaiConfig());

const getDefaultXaiModel = (): string =>
  getProviderModel("XAI_MODEL", XaiModels.GROK_3);

/**
 * xAI Grok Provider — direct HTTP, no AI SDK.
 *
 * OpenAI-compatible chat completions at api.x.ai/v1 (Grok family:
 * grok-3, grok-3-mini, grok-2-latest, grok-2-vision-latest, grok-beta).
 * All request/stream/tool-loop orchestration lives in
 * `OpenAIChatCompletionsProvider`; this class only declares configuration
 * and provider-specific error mapping.
 *
 * @see https://docs.x.ai/api
 */
export class XaiProvider extends OpenAIChatCompletionsProvider {
  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["xai"],
  ) {
    // Trim the override before applying precedence. A blank/whitespace
    // `credentials.apiKey` must NOT bypass the env key — that would build a
    // client with an unusable bearer token and fail at request time.
    const overrideApiKey = credentials?.apiKey?.trim();
    const apiKey =
      overrideApiKey && overrideApiKey.length > 0
        ? overrideApiKey
        : getXaiApiKey();
    const baseURL =
      credentials?.baseURL?.trim() ||
      process.env.XAI_BASE_URL?.trim() ||
      XAI_DEFAULT_BASE_URL;

    super("xai" as AIProviderName, modelName, sdk, { baseURL, apiKey });

    logger.debug("xAI Provider initialized", {
      modelName: this.modelName,
      providerName: this.providerName,
      baseURL: this.config.baseURL,
    });
  }

  protected getProviderName(): AIProviderName {
    return "xai" as AIProviderName;
  }

  protected getDefaultModel(): string {
    return getDefaultXaiModel();
  }

  protected getFallbackModelName(): string {
    return XaiModels.GROK_3_MINI;
  }

  protected getFallbackModels(): string[] {
    return [
      XaiModels.GROK_3,
      XaiModels.GROK_3_MINI,
      XaiModels.GROK_2_LATEST,
      XaiModels.GROK_2_VISION_LATEST,
      XaiModels.GROK_BETA,
    ];
  }

  protected formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new NetworkError(`Request timed out: ${error.message}`, "xai");
    }
    const errorRecord = error as UnknownRecord;
    const message =
      typeof errorRecord?.message === "string"
        ? errorRecord.message
        : "Unknown error";

    if (
      message.includes("Invalid API key") ||
      message.includes("Authentication") ||
      message.includes("401") ||
      message.includes("invalid_api_key")
    ) {
      return new AuthenticationError(
        "Invalid xAI API key. Please check your XAI_API_KEY environment variable. Get one at https://console.x.ai/",
        "xai",
      );
    }
    if (message.includes("rate limit") || message.includes("429")) {
      return new RateLimitError(
        "xAI rate limit exceeded. Back off and retry.",
        "xai",
      );
    }
    if (message.includes("model_not_found") || message.includes("404")) {
      return new InvalidModelError(
        `xAI model '${this.modelName}' not found. Use grok-2-latest, grok-3, grok-3-mini, grok-2-vision-latest, or grok-beta.`,
        "xai",
      );
    }
    if (
      message.includes("insufficient_quota") ||
      message.includes("quota exceeded")
    ) {
      return new ProviderError(
        "xAI account has insufficient quota. Top up at https://console.x.ai/",
        "xai",
      );
    }
    return new ProviderError(`xAI error: ${message}`, "xai");
  }
}
