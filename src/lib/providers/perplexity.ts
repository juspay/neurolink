import type { AIProviderName } from "../constants/enums.js";
import { PerplexityModels } from "../constants/enums.js";
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
  createPerplexityConfig,
  getProviderModel,
  validateApiKey,
} from "../utils/providerConfig.js";
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
 * web context (search-augmented answers). Citation data, if the API returns
 * any, is not extracted or exposed by this provider.
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
    const rules: ProviderErrorRule[] = [
      {
        match: (ctx) =>
          ctx.statusCode === 401 ||
          /Invalid API key|Authentication/i.test(ctx.message),
        errorClass: AuthenticationError,
        message:
          "Invalid Perplexity API key. Get one at https://www.perplexity.ai/settings/api",
      },
      ...DEFAULT_ERROR_RULES,
    ];
    return classifyProviderError(error, rules, "perplexity", this.modelName);
  }
}
