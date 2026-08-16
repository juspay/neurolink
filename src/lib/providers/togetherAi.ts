import type { AIProviderName } from "../constants/enums.js";
import { TogetherAIModels } from "../constants/enums.js";
import type {
  NeurolinkCredentials,
  ProviderErrorRule,
} from "../types/index.js";
import { AuthenticationError } from "../types/index.js";
import { logger } from "../utils/logger.js";
import { redactUrlCredentials } from "../utils/logSanitize.js";
import {
  classifyProviderError,
  DEFAULT_ERROR_RULES,
} from "../utils/errorClassifier.js";
import {
  createTogetherAIConfig,
  getProviderModel,
  validateApiKey,
} from "../utils/providerConfig.js";
import { OpenAIChatCompletionsProvider } from "./openaiChatCompletionsBase.js";

const TOGETHER_DEFAULT_BASE_URL = "https://api.together.xyz/v1";

const getTogetherApiKey = (): string =>
  validateApiKey(createTogetherAIConfig());

const getDefaultTogetherModel = (): string =>
  getProviderModel(
    "TOGETHER_MODEL",
    TogetherAIModels.LLAMA_3_3_70B_INSTRUCT_TURBO,
  );

/**
 * Together AI Provider — direct HTTP, no AI SDK.
 *
 * Hosted open-model gateway at api.together.xyz/v1 (OpenAI-compatible).
 * Llama / Mistral / Qwen / DeepSeek / Gemma / WizardLM available
 * server-less; pass any catalog id via `--model`.
 * All request/stream/tool-loop orchestration lives in
 * `OpenAIChatCompletionsProvider`; this class only declares configuration
 * and provider-specific error mapping.
 *
 * @see https://docs.together.ai/docs/openai-api-compatibility
 */
export class TogetherAIProvider extends OpenAIChatCompletionsProvider {
  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["together"],
  ) {
    const overrideApiKey = credentials?.apiKey?.trim();
    const apiKey =
      overrideApiKey && overrideApiKey.length > 0
        ? overrideApiKey
        : getTogetherApiKey();
    const baseURL =
      credentials?.baseURL?.trim() ||
      process.env.TOGETHER_BASE_URL?.trim() ||
      TOGETHER_DEFAULT_BASE_URL;

    super("together-ai" as AIProviderName, modelName, sdk, { baseURL, apiKey });

    logger.debug("Together AI Provider initialized", {
      modelName: this.modelName,
      providerName: this.providerName,
      baseURL: redactUrlCredentials(this.config.baseURL),
    });
  }

  protected getProviderName(): AIProviderName {
    return "together-ai" as AIProviderName;
  }

  protected getDefaultModel(): string {
    return getDefaultTogetherModel();
  }

  protected getFallbackModelName(): string {
    return TogetherAIModels.LLAMA_3_1_8B_INSTRUCT_TURBO;
  }

  protected getFallbackModels(): string[] {
    return [
      TogetherAIModels.LLAMA_3_3_70B_INSTRUCT_TURBO,
      TogetherAIModels.LLAMA_3_1_405B_INSTRUCT_TURBO,
      TogetherAIModels.LLAMA_3_1_70B_INSTRUCT_TURBO,
      TogetherAIModels.LLAMA_3_1_8B_INSTRUCT_TURBO,
      TogetherAIModels.MIXTRAL_8X22B_INSTRUCT,
      TogetherAIModels.QWEN_2_5_72B_INSTRUCT_TURBO,
      TogetherAIModels.DEEPSEEK_R1,
      TogetherAIModels.DEEPSEEK_V3,
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
          "Invalid Together AI API key. Get one at https://api.together.xyz/settings/api-keys",
      },
      ...DEFAULT_ERROR_RULES,
    ];
    return classifyProviderError(error, rules, "together-ai", this.modelName);
  }
}
