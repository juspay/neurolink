import type { AIProviderName } from "../constants/enums.js";
import { TogetherAIModels } from "../constants/enums.js";
import type { NeurolinkCredentials, UnknownRecord } from "../types/index.js";
import {
  AuthenticationError,
  InvalidModelError,
  NetworkError,
  ProviderError,
  RateLimitError,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import {
  createTogetherAIConfig,
  getProviderModel,
  validateApiKey,
} from "../utils/providerConfig.js";
import { TimeoutError } from "../utils/timeout.js";
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
      baseURL: this.config.baseURL,
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
    if (error instanceof TimeoutError) {
      return new NetworkError(
        `Request timed out: ${error.message}`,
        "together-ai",
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
        "Invalid Together AI API key. Get one at https://api.together.xyz/settings/api-keys",
        "together-ai",
      );
    }
    if (message.includes("rate limit") || message.includes("429")) {
      return new RateLimitError(
        "Together AI rate limit exceeded. Back off and retry.",
        "together-ai",
      );
    }
    if (message.includes("model_not_found") || message.includes("404")) {
      return new InvalidModelError(
        `Together AI model '${this.modelName}' not found. Browse the catalog at https://api.together.xyz/models`,
        "together-ai",
      );
    }
    return new ProviderError(`Together AI error: ${message}`, "together-ai");
  }
}
