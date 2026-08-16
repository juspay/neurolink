import type { AIProviderName } from "../constants/enums.js";
import { FireworksModels } from "../constants/enums.js";
import { AuthenticationError } from "../types/index.js";
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
  createFireworksConfig,
  getProviderModel,
  validateApiKey,
} from "../utils/providerConfig.js";
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
      baseURL: redactUrlCredentials(this.config.baseURL),
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
    const rules: ProviderErrorRule[] = [
      {
        match: (ctx) =>
          ctx.statusCode === 401 ||
          /Invalid API key|Authentication/i.test(ctx.message),
        errorClass: AuthenticationError,
        message:
          "Invalid Fireworks API key. Get one at https://fireworks.ai/account/api-keys",
      },
      ...DEFAULT_ERROR_RULES,
    ];
    return classifyProviderError(error, rules, "fireworks", this.modelName);
  }
}
