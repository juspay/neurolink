import type { AIProviderName } from "../constants/enums.js";
import {
  AuthenticationError,
  InvalidModelError,
  NetworkError,
  ProviderError,
  RateLimitError,
} from "../types/index.js";
import type { UnknownRecord } from "../types/index.js";
import { logger } from "../utils/logger.js";
import { redactUrlCredentials } from "../utils/logSanitize.js";
import { TimeoutError } from "../utils/timeout.js";
import { OpenAIChatCompletionsProvider } from "./openaiChatCompletionsBase.js";

const FALLBACK_OPENAI_COMPATIBLE_MODEL = "gpt-3.5-turbo";

const getOpenAICompatibleConfig = () => {
  const baseURL = process.env.OPENAI_COMPATIBLE_BASE_URL;
  const apiKey = process.env.OPENAI_COMPATIBLE_API_KEY;

  if (!baseURL) {
    throw new Error(
      "OPENAI_COMPATIBLE_BASE_URL environment variable is required. " +
        "Please set it to your OpenAI-compatible endpoint (e.g., https://api.openrouter.ai/api/v1)",
    );
  }

  if (!apiKey) {
    throw new Error(
      "OPENAI_COMPATIBLE_API_KEY environment variable is required. " +
        "Please set it to your API key for the OpenAI-compatible service.",
    );
  }

  return { baseURL, apiKey };
};

const getDefaultOpenAICompatibleModel = (): string | undefined => {
  return process.env.OPENAI_COMPATIBLE_MODEL || undefined;
};

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
    if (error instanceof TimeoutError) {
      return new NetworkError(
        `Request timed out: ${error.message}`,
        "openai-compatible",
      );
    }

    const errorRecord = error as UnknownRecord;
    if (
      errorRecord?.name === "TimeoutError" ||
      (typeof errorRecord?.message === "string" &&
        errorRecord.message.includes("Timeout"))
    ) {
      return new NetworkError(
        `Request timed out: ${errorRecord?.message || "Unknown timeout"}`,
        "openai-compatible",
      );
    }

    if (typeof errorRecord?.message === "string") {
      if (
        errorRecord.message.includes("ECONNREFUSED") ||
        errorRecord.message.includes("Failed to fetch")
      ) {
        return new NetworkError(
          `OpenAI Compatible endpoint not available. Please check your OPENAI_COMPATIBLE_BASE_URL: ${redactUrlCredentials(this.config.baseURL)}`,
          "openai-compatible",
        );
      }

      if (
        errorRecord.message.includes("API_KEY_INVALID") ||
        errorRecord.message.includes("Invalid API key") ||
        errorRecord.message.includes("Unauthorized")
      ) {
        return new AuthenticationError(
          "Invalid OpenAI Compatible API key. Please check your OPENAI_COMPATIBLE_API_KEY environment variable.",
          "openai-compatible",
        );
      }

      if (errorRecord.message.includes("rate limit")) {
        return new RateLimitError(
          "OpenAI Compatible rate limit exceeded. Please try again later.",
          "openai-compatible",
        );
      }

      if (
        errorRecord.message.includes("model") &&
        (errorRecord.message.includes("not found") ||
          errorRecord.message.includes("does not exist"))
      ) {
        return new InvalidModelError(
          `Model '${this.modelName}' not available on OpenAI Compatible endpoint. ` +
            "Please check available models or use getAvailableModels() to see supported models.",
          "openai-compatible",
        );
      }
    }

    return new ProviderError(
      `OpenAI Compatible error: ${errorRecord?.message || "Unknown error"}`,
      "openai-compatible",
    );
  }
}
