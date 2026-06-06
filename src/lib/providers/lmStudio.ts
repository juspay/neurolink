import type { AIProviderName } from "../constants/enums.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import type {
  ModelsResponse,
  NeurolinkCredentials,
  UnknownRecord,
} from "../types/index.js";
import {
  InvalidModelError,
  NetworkError,
  ProviderError,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { redactUrlCredentials } from "../utils/logSanitize.js";
import { TimeoutError } from "../utils/timeout.js";
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
    if (error instanceof TimeoutError) {
      return new NetworkError(
        `Request timed out: ${error.message}`,
        "lm-studio",
      );
    }
    const errorRecord = error as UnknownRecord;
    const message =
      typeof errorRecord?.message === "string"
        ? errorRecord.message
        : "Unknown error";
    const cause = (errorRecord?.cause as UnknownRecord) ?? {};
    const code = (errorRecord?.code ?? cause?.code) as string | undefined;

    if (
      code === "ECONNREFUSED" ||
      message.includes("ECONNREFUSED") ||
      message.includes("Failed to fetch") ||
      message.includes("fetch failed")
    ) {
      return new NetworkError(
        `LM Studio server not reachable at ${redactUrlCredentials(this.config.baseURL)}. ` +
          `Open the LM Studio app, load a model, and click "Start Server".`,
        "lm-studio",
      );
    }
    if (message.includes("model_not_found") || message.includes("404")) {
      return new InvalidModelError(
        `LM Studio model '${this.modelName}' is not loaded. Load it in the LM Studio app first.`,
        "lm-studio",
      );
    }
    return new ProviderError(`LM Studio error: ${message}`, "lm-studio");
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      const url = `${this.config.baseURL.replace(/\/$/, "")}/models`;
      const proxyFetch = createProxyFetch();
      const r = await proxyFetch(url, {
        headers:
          this.config.apiKey && this.config.apiKey !== LM_STUDIO_PLACEHOLDER_KEY
            ? { Authorization: `Bearer ${this.config.apiKey}` }
            : undefined,
        signal: AbortSignal.timeout(5000),
      });
      if (!r.ok) {
        return false;
      }
      // A 200 with an empty data array means LM Studio is up but no model is
      // loaded — `resolveModelName()` will fall back to FALLBACK_MODEL and the
      // first real request will fail. Require at least one loaded model so
      // health checks honestly reflect whether the provider is usable.
      const data = (await r.json().catch(() => null)) as ModelsResponse | null;
      return Boolean(
        data?.data?.some(
          (m) => typeof m?.id === "string" && m.id.trim().length > 0,
        ),
      );
    } catch {
      return false;
    }
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
