import type { AIProviderName } from "../constants/enums.js";
import type { NeurolinkCredentials } from "../types/index.js";
import { logger } from "../utils/logger.js";
import { redactUrlCredentials } from "../utils/logSanitize.js";
import { OpenAIChatCompletionsProvider } from "./openaiChatCompletionsBase.js";
import { classifyWithProviderRules } from "./rules/errorRules.js";
import { getProviderErrorRules } from "./rules/registry.js";

const LM_STUDIO_ERROR_RULES = getProviderErrorRules("lm-studio");

const LM_STUDIO_DEFAULT_BASE_URL = "http://localhost:1234/v1";
const LM_STUDIO_PLACEHOLDER_KEY = "lm-studio";
const FALLBACK_MODEL = "local-model";

const getLmStudioBaseURL = (): string => {
  return process.env.LM_STUDIO_BASE_URL || LM_STUDIO_DEFAULT_BASE_URL;
};

/**
 * LM Studio Provider — direct HTTP, no AI SDK.
 *
 * Wraps the LM Studio local server (https://lmstudio.ai/) which exposes an
 * OpenAI-compatible API at http://localhost:1234/v1 by default.
 * Auto-discovers the loaded model via /v1/models if no model is specified.
 * All request/stream/tool-loop orchestration lives in
 * `OpenAIChatCompletionsProvider`; this class only declares configuration
 * and provider-specific error mapping.
 *
 * @see https://lmstudio.ai/
 */
export class LMStudioProvider extends OpenAIChatCompletionsProvider {
  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["lmStudio"],
  ) {
    // LM Studio's local server doesn't authenticate, but the base HTTP client
    // requires an apiKey. Allow override via credentials/env for users who
    // run LM Studio behind an auth-proxying reverse-proxy.
    const apiKey =
      credentials?.apiKey ??
      process.env.LM_STUDIO_API_KEY ??
      LM_STUDIO_PLACEHOLDER_KEY;
    const baseURL = credentials?.baseURL ?? getLmStudioBaseURL();

    super("lm-studio" as AIProviderName, modelName, sdk, { baseURL, apiKey });

    logger.debug("LM Studio Provider initialized", {
      modelName: this.modelName,
      providerName: this.providerName,
      baseURL: redactUrlCredentials(this.config.baseURL),
    });
  }

  protected getProviderName(): AIProviderName {
    return "lm-studio" as AIProviderName;
  }

  protected getDefaultModel(): string {
    return process.env.LM_STUDIO_MODEL || "";
  }

  protected getFallbackModelName(): string {
    return FALLBACK_MODEL;
  }

  protected formatProviderError(error: unknown): Error {
    return classifyWithProviderRules(
      error,
      LM_STUDIO_ERROR_RULES,
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

  async validateConfiguration(): Promise<boolean> {
    return this.probeModelsEndpoint(
      this.config.apiKey && this.config.apiKey !== LM_STUDIO_PLACEHOLDER_KEY
        ? { Authorization: `Bearer ${this.config.apiKey}` }
        : {},
    );
  }

  getConfiguration() {
    return {
      provider: this.providerName,
      model: this.modelName || this.resolvedModel || FALLBACK_MODEL,
      defaultModel: this.getDefaultModel(),
      baseURL: this.config.baseURL,
    };
  }
}
