import type { AIProviderName } from "../../constants/enums.js";
import { logger } from "../../utils/logger.js";
import { redactUrlCredentials } from "../../utils/logSanitize.js";
import { OpenAIChatCompletionsProvider } from "../openaiChatCompletionsBase.js";

import { FALLBACK_OPENAI_COMPATIBLE_MODEL } from "./constants.js";
import {
  getDefaultOpenAICompatibleModel,
  getOpenAICompatibleConfig,
} from "./utils.js";
import { classifyWithProviderRules } from "../rules/errorRules.js";
import { getProviderErrorRules } from "../rules/registry.js";

const OPENAI_COMPATIBLE_ERROR_RULES =
  getProviderErrorRules("openai-compatible");

/**
 * OpenAI Compatible Provider — direct HTTP, no AI SDK.
 *
 * Talks to any OpenAI chat-completions-shaped endpoint (LiteLLM, vLLM,
 * OpenRouter, etc.). All request/stream/tool-loop orchestration lives in
 * `OpenAIChatCompletionsProvider`. This class just declares config and
 * provider-specific error mapping.
 */
export class OpenAICompatibleProvider extends OpenAIChatCompletionsProvider {
  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: { apiKey?: string; baseURL?: string },
  ) {
    const resolved =
      credentials?.apiKey && credentials?.baseURL
        ? { apiKey: credentials.apiKey, baseURL: credentials.baseURL }
        : (() => {
            const env = getOpenAICompatibleConfig();
            return {
              apiKey: credentials?.apiKey ?? env.apiKey,
              baseURL: credentials?.baseURL ?? env.baseURL,
            };
          })();
    super("openai-compatible" as AIProviderName, modelName, sdk, resolved);

    logger.debug("OpenAI Compatible Provider initialized", {
      modelName: this.modelName,
      provider: this.providerName,
      baseURL: redactUrlCredentials(this.config.baseURL),
    });
  }

  protected getProviderName(): AIProviderName {
    return "openai-compatible" as AIProviderName;
  }

  protected getDefaultModel(): string {
    return getDefaultOpenAICompatibleModel() || "";
  }

  protected getFallbackModelName(): string {
    return FALLBACK_OPENAI_COMPATIBLE_MODEL;
  }

  protected getFallbackModels(): string[] {
    return [
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4-turbo",
      FALLBACK_OPENAI_COMPATIBLE_MODEL,
      "claude-3-5-sonnet",
      "claude-3-haiku",
      "gemini-pro",
    ];
  }

  protected formatProviderError(error: unknown): Error {
    return classifyWithProviderRules(
      error,
      OPENAI_COMPATIBLE_ERROR_RULES,
      this.providerName,
      this.modelName,
      {
        vars: () => ({
          model: `${this.modelName}`,
          baseURL: redactUrlCredentials(this.config.baseURL),
        }),
      },
    );
  }
}
