import type { AIProviderName } from "../constants/enums.js";
import type { NeurolinkCredentials } from "../types/index.js";
import { logger } from "../utils/logger.js";
import { redactUrlCredentials } from "../utils/logSanitize.js";
import { OpenAIChatCompletionsProvider } from "./openaiChatCompletionsBase.js";
import { classifyWithProviderRules } from "./rules/errorRules.js";
import { getProviderErrorRules } from "./rules/registry.js";

const LLAMACPP_ERROR_RULES = getProviderErrorRules("llamacpp");

const LLAMACPP_DEFAULT_BASE_URL = "http://localhost:8080/v1";
const LLAMACPP_PLACEHOLDER_KEY = "llamacpp";

const getLlamaCppBaseURL = (): string => {
  return process.env.LLAMACPP_BASE_URL || LLAMACPP_DEFAULT_BASE_URL;
};

/**
 * llama.cpp Provider — direct HTTP, no AI SDK.
 *
 * Wraps a llama-server process (https://github.com/ggerganov/llama.cpp) that
 * exposes an OpenAI-compatible API at http://localhost:8080/v1 by default.
 * llama-server hosts ONE model loaded at startup; /v1/models returns just that.
 * All request/stream/tool-loop orchestration lives in
 * `OpenAIChatCompletionsProvider`; this class only declares configuration
 * and provider-specific error mapping.
 *
 * @see https://github.com/ggerganov/llama.cpp
 */
export class LlamaCppProvider extends OpenAIChatCompletionsProvider {
  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["llamacpp"],
  ) {
    const baseURL = credentials?.baseURL?.trim() || getLlamaCppBaseURL();
    // llama-server doesn't authenticate, but the base class requires an
    // apiKey. Allow override via credentials/env for users who run
    // llama-server behind an auth-proxying reverse-proxy.
    const apiKey =
      credentials?.apiKey?.trim() ||
      process.env.LLAMACPP_API_KEY ||
      LLAMACPP_PLACEHOLDER_KEY;

    super("llamacpp" as AIProviderName, modelName, sdk, { baseURL, apiKey });

    logger.debug("llama.cpp Provider initialized", {
      modelName: this.modelName,
      providerName: this.providerName,
      baseURL: redactUrlCredentials(this.config.baseURL),
    });
  }

  async validateConfiguration(): Promise<boolean> {
    return this.probeModelsEndpoint(this.getAuthHeaders());
  }

  protected getProviderName(): AIProviderName {
    return "llamacpp" as AIProviderName;
  }

  protected getDefaultModel(): string {
    return process.env.LLAMACPP_MODEL || "";
  }

  protected getFallbackModelName(): string {
    return "loaded-model";
  }

  protected getFallbackModels(): string[] {
    return ["loaded-model"];
  }

  protected formatProviderError(error: unknown): Error {
    return classifyWithProviderRules(
      error,
      LLAMACPP_ERROR_RULES,
      this.providerName,
      this.modelName,
      { vars: () => ({ baseURL: redactUrlCredentials(this.config.baseURL) }) },
    );
  }
}
