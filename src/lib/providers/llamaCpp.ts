import type { AIProviderName } from "../constants/enums.js";
import { NetworkError, ProviderError } from "../types/index.js";
import type {
  NeurolinkCredentials,
  ProviderErrorRule,
  UnknownRecord,
} from "../types/index.js";
import {
  classifyProviderError,
  DEFAULT_ERROR_RULES,
} from "../utils/errorClassifier.js";
import { logger } from "../utils/logger.js";
import { redactUrlCredentials } from "../utils/logSanitize.js";
import { OpenAIChatCompletionsProvider } from "./openaiChatCompletionsBase.js";

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
          `llama.cpp server not reachable at ${redactUrlCredentials(this.config.baseURL)}. ` +
          "Start it with: ./llama-server -m model.gguf --port 8080",
      },
      {
        match: (ctx) => /400/.test(ctx.message),
        errorClass: ProviderError,
        message:
          "llama.cpp rejected the request. Common cause: model doesn't support tools (start llama-server with --jinja for tool support).",
      },
      ...DEFAULT_ERROR_RULES,
    ];
    return classifyProviderError(error, rules, "llamacpp", this.modelName);
  }
}
