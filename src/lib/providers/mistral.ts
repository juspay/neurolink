import type { AIProviderName } from "../constants/enums.js";
import { MistralModels } from "../constants/enums.js";
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
  createMistralConfig,
  getProviderModel,
  validateApiKey,
} from "../utils/providerConfig.js";
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
    const rules: ProviderErrorRule[] = [
      {
        match: (ctx) =>
          ctx.statusCode === 401 ||
          /API_KEY_INVALID|Invalid API key|Unauthorized/i.test(ctx.message),
        errorClass: AuthenticationError,
        message:
          "Invalid Mistral API key. Please check your MISTRAL_API_KEY environment variable.",
      },
      ...DEFAULT_ERROR_RULES,
    ];
    return classifyProviderError(error, rules, "mistral", this.modelName);
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
