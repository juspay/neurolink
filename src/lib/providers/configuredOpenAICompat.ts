import type { AIProviderName } from "../constants/enums.js";
import type {
  OpenAICompatCatalogEntry,
  OpenAICompatChatMessage,
  OpenAICompatChatRequest,
  OpenAICompatCredentials,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { redactUrlCredentials } from "../utils/logSanitize.js";
import {
  getProviderModel,
  resolveOpenAICompatConfig,
} from "../utils/providerConfig.js";
import { classifyProviderError } from "../utils/errorClassifier.js";
import { TimeoutError } from "../utils/timeout.js";
import { OpenAIChatCompletionsProvider } from "./openaiChatCompletionsBase.js";

/**
 * Collapse OpenAI's `content` union down to the plain string that
 * string-only vendors accept. Image parts carry no string representation and
 * are dropped — a provider that cannot accept a content array cannot accept
 * inline images either.
 */
const flattenMessageContent = (
  content: OpenAICompatChatMessage["content"],
): string => {
  if (typeof content === "string") {
    return content;
  }
  // An assistant message with tool_calls legitimately has null content;
  // the empty string is its string-only equivalent.
  if (content === null || content === undefined) {
    return "";
  }
  return content
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");
};

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
 *
 * The exception is a WIRE DIALECT: a vendor that speaks OpenAI for ordinary
 * chat but encodes one part of the request differently. Expressing that as
 * data (the catalog's `messageContentFormat`) keeps the provider a
 * one-JSON-file entry instead of promoting it to a hand-written subclass
 * over a single incompatibility.
 *
 * Today that is Cloudflare Workers AI, whose OpenAI-compatible endpoint
 * accepts `messages[].content` only as a plain string — never the
 * content-parts array OpenAI allows, and never the `null` that OpenAI uses
 * on an assistant message carrying tool_calls. Its schema rejects both with
 * HTTP 400 ("Type mismatch of '/messages/N/content'"). That bites precisely
 * on the second turn of a tool call, so single-turn chat looks healthy while
 * every tool round-trip fails. Normalizing content to a string below is the
 * whole fix: tools, tool_choice, the `tool` role and `tool_calls` are all
 * accepted as-is.
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

  /**
   * The catalog's `capabilities.tools` is the vendor's own answer, probed on
   * the wire when the entry was written; the model registry (the base
   * default) knows nothing about Tier-2 models and answers "supported" for
   * every unknown id. A vendor that declares tools: false must never receive
   * a `tools` array — Mancer's free model rejects one with 400 — so the
   * declaration wins here and the registry is only consulted otherwise.
   * Like the other entry-reading overrides above, this runs only after
   * construction: BaseProvider merely closes over it for GenerationHandler.
   */
  supportsTools(): boolean {
    if (this.entry.supportsTools === false) {
      return false;
    }
    return super.supportsTools();
  }

  protected adjustRequestBody(
    body: OpenAICompatChatRequest,
    modelId: string,
  ): OpenAICompatChatRequest {
    const adjusted = super.adjustRequestBody(body, modelId);
    if (this.entry.messageContentFormat !== "string") {
      return adjusted;
    }
    return {
      ...adjusted,
      messages: adjusted.messages.map((message) => ({
        ...message,
        content: flattenMessageContent(message.content),
      })),
    };
  }

  protected formatProviderError(error: unknown): Error {
    // classifyProviderError hard-codes TimeoutError -> NetworkError ahead
    // of any rule table and does not allow a per-provider override. An
    // entry can opt out of that default via timeoutErrorClass (currently
    // only Groq, reproducing its pre-migration subclass's own TimeoutError
    // interception) — checked here, before ever reaching the shared
    // classifier, so every other entry still gets its unmodified default.
    if (error instanceof TimeoutError && this.entry.timeoutErrorClass) {
      return new this.entry.timeoutErrorClass(
        `${this.entry.configOptions.providerName} request timed out: ${error.message}`,
        this.entry.providerName,
      );
    }
    return classifyProviderError(
      error,
      this.entry.errorRules,
      this.entry.providerName,
      this.modelName,
    );
  }
}
