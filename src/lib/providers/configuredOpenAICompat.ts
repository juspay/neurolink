import type { AIProviderName } from "../constants/enums.js";
import type {
  OpenAICompatCatalogEntry,
  OpenAICompatCredentials,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { redactUrlCredentials } from "../utils/logSanitize.js";
import {
  getProviderModel,
  resolveOpenAICompatConfig,
} from "../utils/providerConfig.js";
import { classifyProviderError } from "../utils/errorClassifier.js";
import { OpenAIChatCompletionsProvider } from "./openaiChatCompletionsBase.js";

/**
 * Generic OpenAI-compatible provider driven entirely by an
 * OpenAICompatCatalogEntry. Replaces a hand-written subclass for any
 * provider whose only differences from its siblings are credentials, base
 * URL, model defaults, and error-classification rules — see
 * OPENAI_COMPAT_CATALOG in openaiCompatCatalog.ts for the entries.
 *
 * If a provider needs a real hook override (adjustRequestBody,
 * adjustBodyAfter400, getChatCompletionsURL, getAuthHeaders,
 * suppressResponseFormatWithTools, ...) it does NOT belong in the catalog —
 * write a dedicated subclass instead (see deepseek.ts, azureOpenai.ts).
 */
export class ConfiguredOpenAICompatProvider extends OpenAIChatCompletionsProvider {
  private readonly entry: OpenAICompatCatalogEntry;

  constructor(
    entry: OpenAICompatCatalogEntry,
    modelName?: string,
    sdk?: unknown,
    credentials?: OpenAICompatCredentials,
  ) {
    const { apiKey, baseURL } = resolveOpenAICompatConfig(entry, credentials);
    // BaseProvider's constructor calls `this.getDefaultModel()` /
    // `this.getProviderName()` synchronously inside `super()`, before this
    // class's own constructor body (or field initializers) ever run — so
    // `this.entry` is not yet assigned at that point and those overrides
    // would read `undefined.modelEnvVar`. `entry.providerName` is always
    // defined, so passing it straight through makes the base constructor's
    // `providerName || this.getProviderName()` short-circuit; resolving the
    // model up front and always passing a truthy `modelName` does the same
    // for `getDefaultModel()`. Both overrides remain correct for any call
    // made after construction, once `this.entry` is set below.
    const resolvedModelName =
      modelName || getProviderModel(entry.modelEnvVar, entry.defaultModel);
    super(entry.providerName, resolvedModelName, sdk, { baseURL, apiKey });
    this.entry = entry;
    logger.debug(`${entry.configOptions.providerName} Provider initialized`, {
      modelName: this.modelName,
      providerName: this.providerName,
      baseURL: redactUrlCredentials(this.config.baseURL),
    });
  }

  protected getProviderName(): AIProviderName {
    return this.entry.providerName;
  }

  protected getDefaultModel(): string {
    return getProviderModel(this.entry.modelEnvVar, this.entry.defaultModel);
  }

  protected getFallbackModelName(): string {
    return this.entry.fallbackModelName;
  }

  protected getFallbackModels(): string[] {
    return this.entry.fallbackModels;
  }

  protected formatProviderError(error: unknown): Error {
    // classifyProviderError handles TimeoutError internally (always maps
    // to NetworkError, ahead of any rule table) — no local pre-check
    // needed or wanted here; see this task's design note.
    return classifyProviderError(
      error,
      this.entry.errorRules,
      this.entry.providerName,
      this.modelName,
    );
  }
}
