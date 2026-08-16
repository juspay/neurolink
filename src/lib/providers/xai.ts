import type { AIProviderName } from "../constants/enums.js";
import { XaiModels } from "../constants/enums.js";
import { AuthenticationError, ProviderError } from "../types/index.js";
import type {
  NeurolinkCredentials,
  ProviderErrorRule,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { redactUrlCredentials } from "../utils/logSanitize.js";
import {
  classifyProviderError,
  DEFAULT_ERROR_RULES,
} from "../utils/errorClassifier.js";
import {
  createXaiConfig,
  getProviderModel,
  validateApiKey,
} from "../utils/providerConfig.js";
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
      baseURL: redactUrlCredentials(this.config.baseURL),
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
    const rules: ProviderErrorRule[] = [
      {
        match: (ctx) =>
          ctx.statusCode === 401 ||
          /Invalid API key|Authentication|invalid_api_key/i.test(ctx.message),
        errorClass: AuthenticationError,
        message:
          "Invalid xAI API key. Please check your XAI_API_KEY environment variable. Get one at https://console.x.ai/",
      },
      {
        match: (ctx) => /insufficient_quota|quota exceeded/i.test(ctx.message),
        errorClass: ProviderError,
        message:
          "xAI account has insufficient quota. Top up at https://console.x.ai/",
      },
      ...DEFAULT_ERROR_RULES,
    ];
    return classifyProviderError(error, rules, "xai", this.modelName);
  }
}
