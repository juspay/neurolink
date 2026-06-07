import type { AIProviderName } from "../constants/enums.js";
import { MistralModels } from "../constants/enums.js";
import {
  AuthenticationError,
  InvalidModelError,
  NetworkError,
  ProviderError,
  RateLimitError,
} from "../types/index.js";
import type { NeurolinkCredentials, UnknownRecord } from "../types/index.js";
import { logger } from "../utils/logger.js";
import { redactUrlCredentials } from "../utils/logSanitize.js";
import {
  createMistralConfig,
  getProviderModel,
  validateApiKey,
} from "../utils/providerConfig.js";
import { TimeoutError } from "../utils/timeout.js";
import { OpenAIChatCompletionsProvider } from "./openaiChatCompletionsBase.js";

const MISTRAL_DEFAULT_BASE_URL = "https://api.mistral.ai/v1";

const getMistralApiKey = (): string => {
  return validateApiKey(createMistralConfig());
};

const getDefaultMistralModel = (): string => {
  // Vision-capable Mistral Small (June 2025) with multimodal support.
  return getProviderModel("MISTRAL_MODEL", MistralModels.MISTRAL_SMALL_2506);
};

/**
 * Mistral AI Provider — direct HTTP, no AI SDK.
 *
 * OpenAI-compatible chat completions at api.mistral.ai/v1. All request/stream/
 * tool-loop orchestration lives in `OpenAIChatCompletionsProvider`; this class
 * only declares configuration and the provider-specific error mapping.
 *
 * Mistral's `/chat/completions` accepts `response_format: { type:
 * "json_schema" }` on current models (mistral-small-2506 and newer), so no
 * structured-output downgrade is needed — the base client's default
 * pass-through is correct.
 *
 * @see https://docs.mistral.ai/api/
 */
export class MistralProvider extends OpenAIChatCompletionsProvider {
  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["mistral"],
  ) {
    // Trim the override before applying precedence. A blank/whitespace
    // `credentials.apiKey` must NOT bypass `getMistralApiKey()` — that would
    // build a client with an unusable bearer token and fail at request time
    // with a confusing 401 instead of at construction time.
    const overrideApiKey = credentials?.apiKey?.trim();
    const apiKey =
      overrideApiKey && overrideApiKey.length > 0
        ? overrideApiKey
        : getMistralApiKey();
    // Treat blank/whitespace overrides as unset so an empty
    // `credentials.baseURL` or `MISTRAL_BASE_URL=` cannot silently override
    // the default with "" (mirrors the apiKey precedence above).
    const baseURL =
      credentials?.baseURL?.trim() ||
      process.env.MISTRAL_BASE_URL?.trim() ||
      MISTRAL_DEFAULT_BASE_URL;

    super("mistral" as AIProviderName, modelName, sdk, { baseURL, apiKey });

    logger.debug("Mistral Provider initialized", {
      modelName: this.modelName,
      providerName: this.providerName,
      baseURL: redactUrlCredentials(this.config.baseURL),
    });
  }

  // ===========================================================================
  // Abstract hooks (required)
  // ===========================================================================

  protected getProviderName(): AIProviderName {
    return "mistral" as AIProviderName;
  }

  protected getDefaultModel(): string {
    return getDefaultMistralModel();
  }

  protected formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new NetworkError(`Request timed out: ${error.message}`, "mistral");
    }
    const errorRecord = error as UnknownRecord;
    const message =
      typeof errorRecord?.message === "string"
        ? errorRecord.message
        : "Unknown error";

    if (
      message.includes("API_KEY_INVALID") ||
      message.includes("Invalid API key") ||
      message.includes("Unauthorized") ||
      message.includes("401")
    ) {
      return new AuthenticationError(
        "Invalid Mistral API key. Please check your MISTRAL_API_KEY environment variable.",
        "mistral",
      );
    }
    if (
      message.includes("rate limit") ||
      message.includes("Rate limit") ||
      message.includes("429")
    ) {
      return new RateLimitError("Mistral rate limit exceeded", "mistral");
    }
    if (message.includes("model_not_found") || message.includes("404")) {
      return new InvalidModelError(
        `Mistral model '${this.modelName}' not found.`,
        "mistral",
      );
    }
    return new ProviderError(`Mistral error: ${message}`, "mistral");
  }

  // ===========================================================================
  // Optional hooks
  // ===========================================================================

  protected getFallbackModelName(): string {
    return MistralModels.MISTRAL_SMALL_2506;
  }

  protected getFallbackModels(): string[] {
    return [
      MistralModels.MISTRAL_SMALL_2506,
      MistralModels.MISTRAL_LARGE_LATEST,
    ];
  }
}
