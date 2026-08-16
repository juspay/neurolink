import type { AIProviderName } from "../constants/enums.js";
import { DeepSeekModels } from "../constants/enums.js";
import {
  AuthenticationError,
  InvalidModelError,
  ProviderError,
} from "../types/index.js";
import type {
  NeurolinkCredentials,
  OpenAICompatResponseFormat,
  ProviderErrorRule,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { redactUrlCredentials } from "../utils/logSanitize.js";
import {
  classifyProviderError,
  DEFAULT_ERROR_RULES,
} from "../utils/errorClassifier.js";
import {
  createDeepSeekConfig,
  getProviderModel,
  validateApiKey,
} from "../utils/providerConfig.js";
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
 *   2. Reasoning support — `reasoning_content` (deepseek-reasoner / R1) is
 *      surfaced automatically by the native base client: streamed deltas
 *      arrive as `{ content: "", reasoning }` chunks and the non-streaming
 *      result carries `result.reasoning`. The opt-in `thinking` request
 *      param (non-reasoner chat models) still needs thinking-signal plumbing
 *      and is tracked as a follow-up. All other behavior is preserved.
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
      baseURL: redactUrlCredentials(this.config.baseURL),
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
    const rules: ProviderErrorRule[] = [
      {
        match: (ctx) =>
          ctx.statusCode === 401 ||
          /Invalid API key|Authentication/i.test(ctx.message),
        errorClass: AuthenticationError,
        message:
          "Invalid DeepSeek API key. Please check your DEEPSEEK_API_KEY environment variable.",
      },
      {
        match: (ctx) =>
          ctx.statusCode === 402 ||
          /Insufficient Balance|insufficient_balance/i.test(ctx.message),
        errorClass: ProviderError,
        message:
          "DeepSeek account has insufficient balance. Top up at https://platform.deepseek.com/usage",
      },
      {
        match: (ctx) => /model_not_found/i.test(ctx.message),
        errorClass: InvalidModelError,
        message: (ctx) =>
          `DeepSeek model '${ctx.modelName}' not found. Use 'deepseek-chat' or 'deepseek-reasoner'.`,
      },
      ...DEFAULT_ERROR_RULES,
    ];
    return classifyProviderError(error, rules, "deepseek", this.modelName);
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
