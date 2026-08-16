import type { AIProviderName } from "../../constants/enums.js";
import {
  AuthenticationError,
  InvalidModelError,
  NetworkError,
} from "../../types/index.js";
import type { ProviderErrorRule } from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { redactUrlCredentials } from "../../utils/logSanitize.js";
import {
  classifyProviderError,
  DEFAULT_ERROR_RULES,
} from "../../utils/errorClassifier.js";
import { OpenAIChatCompletionsProvider } from "../openaiChatCompletionsBase.js";

import { FALLBACK_OPENAI_COMPATIBLE_MODEL } from "./constants.js";
import {
  getDefaultOpenAICompatibleModel,
  getOpenAICompatibleConfig,
} from "./utils.js";

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
    const rules: ProviderErrorRule[] = [
      // Duck-typed timeout check (name === "TimeoutError" or a "Timeout"
      // substring) — broader than classifyProviderError's built-in
      // `instanceof TimeoutError` handling, so it's preserved as an
      // explicit rule rather than relying on the default.
      {
        match: (ctx) =>
          ctx.errorName === "TimeoutError" || /Timeout/.test(ctx.message),
        errorClass: NetworkError,
        message: (ctx) => `Request timed out: ${ctx.message}`,
      },
      {
        match: (ctx) => /ECONNREFUSED|Failed to fetch/i.test(ctx.message),
        errorClass: NetworkError,
        message: () =>
          `OpenAI Compatible endpoint not available. Please check your OPENAI_COMPATIBLE_BASE_URL: ${redactUrlCredentials(this.config.baseURL)}`,
      },
      {
        match: (ctx) =>
          ctx.statusCode === 401 ||
          /API_KEY_INVALID|Invalid API key|Unauthorized/i.test(ctx.message),
        errorClass: AuthenticationError,
        message:
          "Invalid OpenAI Compatible API key. Please check your OPENAI_COMPATIBLE_API_KEY environment variable.",
      },
      // "does not exist" isn't covered by DEFAULT_ERROR_RULES's
      // model_not_found/"model not found" pattern — preserved verbatim.
      {
        match: (ctx) =>
          /model/i.test(ctx.message) &&
          (/not found/i.test(ctx.message) ||
            /does not exist/i.test(ctx.message)),
        errorClass: InvalidModelError,
        message: (ctx) =>
          `Model '${ctx.modelName}' not available on OpenAI Compatible endpoint. ` +
          "Please check available models or use getAvailableModels() to see supported models.",
      },
      ...DEFAULT_ERROR_RULES,
    ];
    return classifyProviderError(
      error,
      rules,
      "openai-compatible",
      this.modelName,
    );
  }
}
