import type { AIProviderName } from "../constants/enums.js";
import { PerplexityModels } from "../constants/enums.js";
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
  createPerplexityConfig,
  getProviderModel,
  validateApiKey,
} from "../utils/providerConfig.js";
import { TimeoutError } from "../utils/timeout.js";
import { OpenAIChatCompletionsProvider } from "./openaiChatCompletionsBase.js";

const PERPLEXITY_DEFAULT_BASE_URL = "https://api.perplexity.ai";

const getPerplexityApiKey = (): string =>
  validateApiKey(createPerplexityConfig());

const getDefaultPerplexityModel = (): string =>
  getProviderModel("PERPLEXITY_MODEL", PerplexityModels.SONAR);

/**
 * Perplexity Provider — direct HTTP, no AI SDK.
 *
 * Sonar models with built-in web grounding. OpenAI-compatible chat
 * completions at api.perplexity.ai. Best for queries that need fresh
 * web context (search-augmented answers + citations).
 *
 * All request/stream/tool-loop orchestration lives in
 * `OpenAIChatCompletionsProvider`; this class only declares configuration
 * and provider-specific error mapping.
 *
 * @see https://docs.perplexity.ai/api-reference/chat-completions
 */
export class PerplexityProvider extends OpenAIChatCompletionsProvider {
  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["perplexity"],
  ) {
    const overrideApiKey = credentials?.apiKey?.trim();
    const apiKey =
      overrideApiKey && overrideApiKey.length > 0
        ? overrideApiKey
        : getPerplexityApiKey();
    const baseURL =
      credentials?.baseURL?.trim() ||
      process.env.PERPLEXITY_BASE_URL?.trim() ||
      PERPLEXITY_DEFAULT_BASE_URL;

    super("perplexity" as AIProviderName, modelName, sdk, { baseURL, apiKey });

    logger.debug("Perplexity Provider initialized", {
      modelName: this.modelName,
      providerName: this.providerName,
      baseURL: redactUrlCredentials(this.config.baseURL),
    });
  }

  protected getProviderName(): AIProviderName {
    return "perplexity" as AIProviderName;
  }

  protected getDefaultModel(): string {
    return getDefaultPerplexityModel();
  }

  protected getFallbackModels(): string[] {
    return [
      PerplexityModels.SONAR,
      PerplexityModels.SONAR_PRO,
      PerplexityModels.SONAR_REASONING,
      PerplexityModels.SONAR_REASONING_PRO,
      PerplexityModels.SONAR_DEEP_RESEARCH,
    ];
  }

  protected formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new NetworkError(
        `Request timed out: ${error.message}`,
        "perplexity",
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
        "Invalid Perplexity API key. Get one at https://www.perplexity.ai/settings/api",
        "perplexity",
      );
    }
    if (message.includes("rate limit") || message.includes("429")) {
      return new RateLimitError(
        "Perplexity rate limit exceeded. Back off and retry.",
        "perplexity",
      );
    }
    if (message.includes("model_not_found") || message.includes("404")) {
      return new InvalidModelError(
        `Perplexity model '${this.modelName}' not found. Use sonar, sonar-pro, sonar-reasoning, sonar-reasoning-pro, or sonar-deep-research.`,
        "perplexity",
      );
    }
    return new ProviderError(`Perplexity error: ${message}`, "perplexity");
  }
}
