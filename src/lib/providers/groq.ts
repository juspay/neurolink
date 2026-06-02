import type { AIProviderName } from "../constants/enums.js";
import { GroqModels } from "../constants/enums.js";
import {
  AuthenticationError,
  InvalidModelError,
  ProviderError,
  RateLimitError,
} from "../types/index.js";
import type { NeurolinkCredentials, UnknownRecord } from "../types/index.js";
import { logger } from "../utils/logger.js";
import {
  createGroqConfig,
  getProviderModel,
  validateApiKey,
} from "../utils/providerConfig.js";
import { TimeoutError } from "../utils/timeout.js";
import { OpenAIChatCompletionsProvider } from "./openaiChatCompletionsBase.js";

const GROQ_DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";

const getGroqApiKey = (): string => validateApiKey(createGroqConfig());

const getDefaultGroqModel = (): string =>
  getProviderModel("GROQ_MODEL", GroqModels.LLAMA_3_3_70B_VERSATILE);

/**
 * Groq Provider — direct HTTP, no AI SDK.
 *
 * Sub-100ms inference of Llama / Mistral / Gemma at api.groq.com/openai/v1
 * (OpenAI-compatible). Best for low-latency tier; trade-off vs other open
 * model hosts is throughput latency, not quality.
 *
 * All request/stream/tool-loop orchestration lives in
 * `OpenAIChatCompletionsProvider`; this class only declares configuration
 * and provider-specific error mapping.
 *
 * @see https://console.groq.com/docs/quickstart
 */
export class GroqProvider extends OpenAIChatCompletionsProvider {
  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["groq"],
  ) {
    const overrideApiKey = credentials?.apiKey?.trim();
    const apiKey =
      overrideApiKey && overrideApiKey.length > 0
        ? overrideApiKey
        : getGroqApiKey();
    const baseURL =
      credentials?.baseURL?.trim() ||
      process.env.GROQ_BASE_URL?.trim() ||
      GROQ_DEFAULT_BASE_URL;

    super("groq" as AIProviderName, modelName, sdk, { baseURL, apiKey });

    logger.debug("Groq Provider initialized", {
      modelName: this.modelName,
      providerName: this.providerName,
      baseURL: this.config.baseURL,
    });
  }

  protected getProviderName(): AIProviderName {
    return "groq" as AIProviderName;
  }

  protected getDefaultModel(): string {
    return getDefaultGroqModel();
  }

  protected getFallbackModelName(): string {
    return GroqModels.LLAMA_3_1_8B_INSTANT;
  }

  protected getFallbackModels(): string[] {
    return [
      GroqModels.LLAMA_3_3_70B_VERSATILE,
      GroqModels.LLAMA_3_1_8B_INSTANT,
      GroqModels.GEMMA_2_9B_IT,
      GroqModels.MIXTRAL_8X7B_32768,
      GroqModels.LLAMA_3_2_90B_VISION_PREVIEW,
      GroqModels.LLAMA_3_2_11B_VISION_PREVIEW,
    ];
  }

  protected formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new ProviderError(
        `Groq request timed out: ${error.message}`,
        "groq",
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
      message.includes("401") ||
      message.includes("invalid_api_key")
    ) {
      return new AuthenticationError(
        "Invalid Groq API key. Check GROQ_API_KEY. Get one at https://console.groq.com/keys",
        "groq",
      );
    }
    if (message.includes("rate limit") || message.includes("429")) {
      return new RateLimitError(
        "Groq rate limit exceeded. Free tier limits are tight; consider upgrading or backing off.",
        "groq",
      );
    }
    if (
      message.includes("model_not_found") ||
      message.includes("404") ||
      message.includes("model_decommissioned")
    ) {
      return new InvalidModelError(
        message.includes("model_decommissioned")
          ? `Groq model '${this.modelName}' was decommissioned. Pick a current model from https://console.groq.com/docs/models.`
          : `Groq model '${this.modelName}' not found. See https://console.groq.com/docs/models for the current catalog.`,
        "groq",
      );
    }
    return new ProviderError(`Groq error: ${message}`, "groq");
  }
}
