import type { AIProviderName } from "../constants/enums.js";
import { CloudflareModels } from "../constants/enums.js";
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
  createCloudflareConfig,
  getProviderModel,
  validateApiKey,
} from "../utils/providerConfig.js";
import { TimeoutError } from "../utils/timeout.js";
import { OpenAIChatCompletionsProvider } from "./openaiChatCompletionsBase.js";

/**
 * Cloudflare Workers AI exposes an OpenAI-compatible endpoint scoped per
 * account: `https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/v1`.
 * The account id is required — without it the URL would 404.
 */
const buildCloudflareBaseURL = (accountId: string): string =>
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`;

const getCloudflareApiKey = (): string =>
  validateApiKey(createCloudflareConfig());

const getDefaultCloudflareModel = (): string =>
  getProviderModel("CLOUDFLARE_MODEL", CloudflareModels.LLAMA_3_3_70B_FAST);

/**
 * Cloudflare Workers AI Provider — direct HTTP, no AI SDK.
 *
 * Edge-served open models (Llama / Mistral / Qwen / Gemma) at
 * `https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/v1`
 * (OpenAI-compatible). Cheapest tier for high-volume usage.
 *
 * Required env: `CLOUDFLARE_API_KEY` + `CLOUDFLARE_ACCOUNT_ID`.
 *
 * All request/stream/tool-loop orchestration lives in
 * `OpenAIChatCompletionsProvider`; this class only declares configuration
 * and provider-specific error mapping.
 *
 * @see https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/
 */
export class CloudflareProvider extends OpenAIChatCompletionsProvider {
  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["cloudflare"],
  ) {
    const overrideApiKey = credentials?.apiKey?.trim();
    const apiKey =
      overrideApiKey && overrideApiKey.length > 0
        ? overrideApiKey
        : getCloudflareApiKey();

    const accountId = (
      credentials?.accountId ??
      process.env.CLOUDFLARE_ACCOUNT_ID ??
      ""
    ).trim();
    if (!accountId) {
      throw new Error(
        "CLOUDFLARE_ACCOUNT_ID is required (or pass credentials.cloudflare.accountId). Get the account id from https://dash.cloudflare.com/",
      );
    }
    const baseURL = credentials?.baseURL ?? buildCloudflareBaseURL(accountId);

    super("cloudflare" as AIProviderName, modelName, sdk, { baseURL, apiKey });

    logger.debug("Cloudflare Workers AI Provider initialized", {
      modelName: this.modelName,
      providerName: this.providerName,
      baseURL: this.config.baseURL,
    });
  }

  protected getProviderName(): AIProviderName {
    return "cloudflare" as AIProviderName;
  }

  protected getDefaultModel(): string {
    return getDefaultCloudflareModel();
  }

  protected getFallbackModelName(): string {
    return CloudflareModels.LLAMA_3_1_8B_FAST;
  }

  protected getFallbackModels(): string[] {
    return [
      CloudflareModels.LLAMA_3_3_70B_FAST,
      CloudflareModels.LLAMA_3_1_70B_INSTRUCT,
      CloudflareModels.LLAMA_3_1_8B_FAST,
      CloudflareModels.LLAMA_3_2_11B_VISION,
      CloudflareModels.MISTRAL_7B_INSTRUCT_V0_2,
      CloudflareModels.QWEN_1P5_14B_CHAT_AWQ,
    ];
  }

  protected formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new NetworkError(
        `Request timed out: ${error.message}`,
        "cloudflare",
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
        "Invalid Cloudflare API key. Use a token with Workers AI Read+Write scope. Get one at https://dash.cloudflare.com/profile/api-tokens",
        "cloudflare",
      );
    }
    if (message.includes("rate limit") || message.includes("429")) {
      return new RateLimitError(
        "Cloudflare Workers AI rate limit exceeded. Free-tier neurons reset daily.",
        "cloudflare",
      );
    }
    if (message.includes("model_not_found") || message.includes("404")) {
      return new InvalidModelError(
        `Cloudflare model '${this.modelName}' not found. Browse https://developers.cloudflare.com/workers-ai/models/`,
        "cloudflare",
      );
    }
    return new ProviderError(
      `Cloudflare Workers AI error: ${message}`,
      "cloudflare",
    );
  }
}
