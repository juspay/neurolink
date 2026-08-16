import type { AIProviderName } from "../constants/enums.js";
import type {
  NeurolinkCredentials,
  ProviderErrorRule,
  UnknownRecord,
} from "../types/index.js";
import { InvalidModelError, NetworkError } from "../types/index.js";
import {
  classifyProviderError,
  DEFAULT_ERROR_RULES,
} from "../utils/errorClassifier.js";
import { logger } from "../utils/logger.js";
import { redactUrlCredentials } from "../utils/logSanitize.js";
import { OpenAIChatCompletionsProvider } from "./openaiChatCompletionsBase.js";

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
    // `code`/`cause.code` aren't part of ProviderErrorContext, so they're read
    // off the raw error here (mirrors ollama's `responseBody` extraction) for
    // the ECONNREFUSED rule below, which the pre-migration code also checked
    // via a duck-typed error code in addition to the message text.
    const errorRecord = error as UnknownRecord;
    const cause = (errorRecord?.cause as UnknownRecord) ?? {};
    const code = (errorRecord?.code ?? cause?.code) as string | undefined;

    const rules: ProviderErrorRule[] = [
      {
        match: (ctx) =>
          code === "ECONNREFUSED" ||
          /ECONNREFUSED|Failed to fetch|fetch failed/.test(ctx.message),
        errorClass: NetworkError,
        message: () =>
          `LM Studio server not reachable at ${redactUrlCredentials(this.config.baseURL)}. ` +
          `Open the LM Studio app, load a model, and click "Start Server".`,
      },
      {
        match: (ctx) => /model_not_found|404/.test(ctx.message),
        errorClass: InvalidModelError,
        message: () =>
          `LM Studio model '${this.modelName}' is not loaded. Load it in the LM Studio app first.`,
      },
      ...DEFAULT_ERROR_RULES,
    ];
    return classifyProviderError(error, rules, "lm-studio", this.modelName);
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
