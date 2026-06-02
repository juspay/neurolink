import type { AIProviderName } from "../constants/enums.js";
import { DeepSeekModels } from "../constants/enums.js";
import {
  AuthenticationError,
  InvalidModelError,
  NetworkError,
  ProviderError,
  RateLimitError,
} from "../types/index.js";
import type {
  NeurolinkCredentials,
  OpenAICompatResponseFormat,
  UnknownRecord,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import {
  createDeepSeekConfig,
  getProviderModel,
  validateApiKey,
} from "../utils/providerConfig.js";
import { TimeoutError } from "../utils/timeout.js";
import { OpenAIChatCompletionsProvider } from "./openaiChatCompletionsBase.js";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

const getDeepSeekApiKey = (): string => {
  return validateApiKey(createDeepSeekConfig());
};

const getDefaultDeepSeekModel = (): string => {
  return getProviderModel("DEEPSEEK_MODEL", DeepSeekModels.DEEPSEEK_CHAT);
};

/**
 * DeepSeek Provider — direct HTTP, no AI SDK.
 *
 * OpenAI-compatible chat completions at api.deepseek.com (deepseek-chat /
 * deepseek-reasoner). All request/stream/tool-loop orchestration lives in
 * `OpenAIChatCompletionsProvider`; this class declares configuration and
 * provider-specific quirks:
 *
 *   1. Structured-output downgrade — DeepSeek rejects `response_format:
 *      { type: "json_schema" }` ("This response_format type is unavailable
 *      now"), so `adjustResponseFormat` downgrades it to `json_object` —
 *      matching the `supportsStructuredOutputs: false` behaviour of the
 *      `@ai-sdk/openai-compatible` path this migration replaced. The base
 *      client injects the literal "json" word the API requires for that mode.
 *
 *   2. Reasoning support — the opt-in `thinking` request param (non-reasoner
 *      chat models) and `reasoning_content` surfacing (deepseek-reasoner / R1)
 *      both require plumbing the thinking signal and the reasoning delta
 *      through the native base client. That plumbing isn't in place yet, so
 *      neither is wired here; it is tracked as a base-client follow-up. All
 *      other behavior is preserved.
 *
 * @see https://api-docs.deepseek.com
 */
export class DeepSeekProvider extends OpenAIChatCompletionsProvider {
  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["deepseek"],
  ) {
    // Trim the override before applying precedence. A blank/whitespace
    // `credentials.apiKey` must NOT bypass `getDeepSeekApiKey()` — that
    // would build a client with an unusable bearer token and fail at
    // request time with a confusing 401 instead of at construction time.
    const overrideApiKey = credentials?.apiKey?.trim();
    const apiKey =
      overrideApiKey && overrideApiKey.length > 0
        ? overrideApiKey
        : getDeepSeekApiKey();
    // Treat blank/whitespace overrides as unset so an empty
    // `credentials.baseURL` or `DEEPSEEK_BASE_URL=` cannot silently override
    // the default with "" (mirrors the apiKey precedence above).
    const baseURL =
      credentials?.baseURL?.trim() ||
      process.env.DEEPSEEK_BASE_URL?.trim() ||
      DEEPSEEK_BASE_URL;

    super("deepseek" as AIProviderName, modelName, sdk, { baseURL, apiKey });

    logger.debug("DeepSeek Provider initialized", {
      modelName: this.modelName,
      providerName: this.providerName,
      baseURL: this.config.baseURL,
    });
  }

  // ===========================================================================
  // Abstract hooks (required)
  // ===========================================================================

  protected getProviderName(): AIProviderName {
    return "deepseek" as AIProviderName;
  }

  protected getDefaultModel(): string {
    return getDefaultDeepSeekModel();
  }

  protected formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new NetworkError(
        `Request timed out: ${error.message}`,
        "deepseek",
      );
    }
    const errorRecord = error as UnknownRecord;
    const message =
      typeof errorRecord?.message === "string"
        ? errorRecord.message
        : "Unknown error";

    if (
      message.includes("Invalid API key") ||
      message.includes("Authentication") ||
      message.includes("401")
    ) {
      return new AuthenticationError(
        "Invalid DeepSeek API key. Please check your DEEPSEEK_API_KEY environment variable.",
        "deepseek",
      );
    }
    if (message.includes("rate limit") || message.includes("429")) {
      return new RateLimitError("DeepSeek rate limit exceeded", "deepseek");
    }
    if (
      message.includes("Insufficient Balance") ||
      message.includes("insufficient_balance") ||
      message.includes("402")
    ) {
      return new ProviderError(
        "DeepSeek account has insufficient balance. Top up at https://platform.deepseek.com/usage",
        "deepseek",
      );
    }
    if (message.includes("model_not_found") || message.includes("404")) {
      return new InvalidModelError(
        `DeepSeek model '${this.modelName}' not found. Use 'deepseek-chat' or 'deepseek-reasoner'.`,
        "deepseek",
      );
    }
    return new ProviderError(`DeepSeek error: ${message}`, "deepseek");
  }

  // ===========================================================================
  // Optional hooks — provider-specific quirks
  // ===========================================================================

  protected getFallbackModelName(): string {
    return DeepSeekModels.DEEPSEEK_CHAT;
  }

  protected getFallbackModels(): string[] {
    return [DeepSeekModels.DEEPSEEK_CHAT, DeepSeekModels.DEEPSEEK_REASONER];
  }

  /**
   * DeepSeek's /chat/completions rejects `response_format: { type:
   * "json_schema" }` outright ("This response_format type is unavailable
   * now"). The `@ai-sdk/openai-compatible` provider this migration replaced
   * ran with `supportsStructuredOutputs: false`, which downgraded structured-
   * output requests to `{ type: "json_object" }`. Replicate that downgrade so
   * `generate({ schema })` keeps working. (DeepSeek's json_object mode also
   * requires the word "json" somewhere in the messages; the base client's
   * `ensureJsonWordInBody` injects a minimal instruction when the prompt
   * lacks it.)
   */
  protected adjustResponseFormat(
    rf: OpenAICompatResponseFormat | undefined,
    _modelId: string,
  ): OpenAICompatResponseFormat | undefined {
    if (rf?.type === "json_schema") {
      return { type: "json_object" };
    }
    return rf;
  }
}
