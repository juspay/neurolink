import type { AIProviderName } from "../constants/enums.js";
import { FireworksModels } from "../constants/enums.js";
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
  createFireworksConfig,
  getProviderModel,
  validateApiKey,
} from "../utils/providerConfig.js";
import { TimeoutError } from "../utils/timeout.js";
import { OpenAIChatCompletionsProvider } from "./openaiChatCompletionsBase.js";

const FIREWORKS_DEFAULT_BASE_URL = "https://api.fireworks.ai/inference/v1";

const getFireworksApiKey = (): string =>
  validateApiKey(createFireworksConfig());

const getDefaultFireworksModel = (): string =>
  getProviderModel("FIREWORKS_MODEL", FireworksModels.DEEPSEEK_V4_PRO);

/**
 * Fireworks AI Provider — direct HTTP, no AI SDK.
 *
 * Hosted open-model serving at api.fireworks.ai/inference/v1
 * (OpenAI-compatible). Best for low-latency at scale on Llama / Mixtral /
 * Qwen / DeepSeek. All request/stream/tool-loop orchestration lives in
 * `OpenAIChatCompletionsProvider`; this class only declares configuration
 * and provider-specific error mapping.
 *
 * @see https://docs.fireworks.ai/api-reference/introduction
 */
export class FireworksProvider extends OpenAIChatCompletionsProvider {
  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["fireworks"],
  ) {
    // Trim the override before applying precedence. A blank/whitespace
    // `credentials.apiKey` must NOT bypass the env key — that would build a
    // client with an unusable bearer token and fail at request time.
    const overrideApiKey = credentials?.apiKey?.trim();
    const apiKey =
      overrideApiKey && overrideApiKey.length > 0
        ? overrideApiKey
        : getFireworksApiKey();
    const baseURL =
      credentials?.baseURL?.trim() ||
      process.env.FIREWORKS_BASE_URL?.trim() ||
      FIREWORKS_DEFAULT_BASE_URL;

    super("fireworks" as AIProviderName, modelName, sdk, { baseURL, apiKey });

    logger.debug("Fireworks Provider initialized", {
      modelName: this.modelName,
      providerName: this.providerName,
      baseURL: this.config.baseURL,
    });
  }

  protected getProviderName(): AIProviderName {
    return "fireworks" as AIProviderName;
  }

  protected getDefaultModel(): string {
    return getDefaultFireworksModel();
  }

  protected getFallbackModelName(): string {
    return FireworksModels.DEEPSEEK_V4_PRO;
  }

  protected getFallbackModels(): string[] {
    return [
      FireworksModels.DEEPSEEK_V4_PRO,
      FireworksModels.GLM_5P1,
      FireworksModels.GLM_5,
      FireworksModels.KIMI_K2P6,
      FireworksModels.KIMI_K2P5,
      FireworksModels.GPT_OSS_120B,
    ];
  }

  protected formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new NetworkError(
        `Request timed out: ${error.message}`,
        "fireworks",
      );
    }
    const errorRecord = error as UnknownRecord;
    const message =
      typeof errorRecord?.message === "string"
        ? errorRecord.message
        : "Unknown error";
    if (
      message.includes("Invalid API key") ||
      message.includes("Authentication") ||
      message.includes("401")
    ) {
      return new AuthenticationError(
        "Invalid Fireworks API key. Get one at https://fireworks.ai/account/api-keys",
        "fireworks",
      );
    }
    if (message.includes("rate limit") || message.includes("429")) {
      return new RateLimitError(
        "Fireworks rate limit exceeded. Back off and retry.",
        "fireworks",
      );
    }
    if (message.includes("model_not_found") || message.includes("404")) {
      return new InvalidModelError(
        `Fireworks model '${this.modelName}' not found. Browse https://fireworks.ai/models`,
        "fireworks",
      );
    }
    return new ProviderError(`Fireworks error: ${message}`, "fireworks");
  }
}
