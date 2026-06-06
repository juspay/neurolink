import type { AIProviderName } from "../constants/enums.js";
import { NvidiaNimModels } from "../constants/enums.js";
import type {
  NeurolinkCredentials,
  NvidiaNimExtraBody,
  OpenAICompatBuildBodyArgs,
  UnknownRecord,
} from "../types/index.js";
import {
  AuthenticationError,
  InvalidModelError,
  NetworkError,
  ProviderError,
  RateLimitError,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { redactUrlCredentials } from "../utils/logSanitize.js";
import {
  createNvidiaNimConfig,
  getProviderModel,
  validateApiKey,
} from "../utils/providerConfig.js";
import { TimeoutError } from "../utils/timeout.js";
import { OpenAIChatCompletionsProvider } from "./openaiChatCompletionsBase.js";

/**
 * Decide whether a NIM 400 response body is a rejection of the named
 * field (as opposed to an unrelated 400 that happens to mention the
 * field name — e.g. when the user's prompt is echoed back inside the
 * error envelope).
 *
 * A rejection requires both:
 *   - the field name appears in the body, and
 *   - a rejection keyword (`unsupported`, `not supported`, `unknown`,
 *     `invalid`, `unrecognized`, `does not support`) appears within
 *     80 characters of any occurrence.
 *
 * The 80-character window is loose enough to absorb NIM's "Unsupported
 * argument: `chat_template`" framing and tight enough that a 1KB error
 * body mentioning the field once in a code sample plus an unrelated
 * "invalid" elsewhere won't trigger a strip.
 */
const NIM_REJECTION_KEYWORDS = [
  "unsupported",
  "not supported",
  "does not support",
  "unrecognized",
  "unknown field",
  "unknown parameter",
  "unknown argument",
  "invalid field",
  "invalid parameter",
  "invalid argument",
];

const isNimFieldRejection = (body: string, field: string): boolean => {
  if (!body) {
    return false;
  }
  const lower = body.toLowerCase();
  const fieldLower = field.toLowerCase();
  let idx = lower.indexOf(fieldLower);
  while (idx !== -1) {
    const windowStart = Math.max(0, idx - 80);
    const windowEnd = Math.min(lower.length, idx + fieldLower.length + 80);
    const slice = lower.slice(windowStart, windowEnd);
    if (NIM_REJECTION_KEYWORDS.some((kw) => slice.includes(kw))) {
      return true;
    }
    idx = lower.indexOf(fieldLower, idx + fieldLower.length);
  }
  return false;
};

/**
 * Strip an offending field from a JSON request body and return the rebuilt
 * stringified body. Returns `null` if the body isn't JSON-parseable or the
 * field isn't present (signal: nothing to retry).
 */
const stripFieldFromJsonBody = (
  body: string,
  field: "reasoning_budget" | "chat_template",
): string | null => {
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    let mutated = false;
    if (field === "chat_template" && "chat_template" in parsed) {
      delete parsed.chat_template;
      mutated = true;
    }
    if (field === "reasoning_budget") {
      const kw = parsed.chat_template_kwargs as
        | Record<string, unknown>
        | undefined;
      if (kw && "reasoning_budget" in kw) {
        delete kw.reasoning_budget;
        mutated = true;
        if (Object.keys(kw).length === 0) {
          delete parsed.chat_template_kwargs;
        }
      }
    }
    if (!mutated) {
      return null;
    }
    return JSON.stringify(parsed);
  } catch {
    return null;
  }
};

const NVIDIA_NIM_DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1";

const envInt = (k: string): number | undefined => {
  const v = process.env[k];
  if (!v) {
    return undefined;
  }
  const parsed = Number.parseInt(v, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};
const envFloat = (k: string): number | undefined => {
  const v = process.env[k];
  if (!v) {
    return undefined;
  }
  const parsed = Number.parseFloat(v);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const buildNvidiaNimExtraBody = (
  thinkingEnabled: boolean,
  maxTokens: number | undefined,
): NvidiaNimExtraBody => {
  const extra: NvidiaNimExtraBody = {};

  const topK = envInt("NVIDIA_NIM_TOP_K");
  if (topK !== undefined && topK !== -1) {
    extra.top_k = topK;
  }

  const minP = envFloat("NVIDIA_NIM_MIN_P");
  if (minP !== undefined && minP !== 0) {
    extra.min_p = minP;
  }

  const repPenalty = envFloat("NVIDIA_NIM_REPETITION_PENALTY");
  if (repPenalty !== undefined && repPenalty !== 1) {
    extra.repetition_penalty = repPenalty;
  }

  const minTokens = envInt("NVIDIA_NIM_MIN_TOKENS");
  if (minTokens !== undefined && minTokens !== 0) {
    extra.min_tokens = minTokens;
  }

  const chatTemplate = process.env.NVIDIA_NIM_CHAT_TEMPLATE;
  if (chatTemplate) {
    extra.chat_template = chatTemplate;
  }

  if (thinkingEnabled) {
    extra.chat_template_kwargs = {
      thinking: true,
      enable_thinking: true,
      ...(maxTokens ? { reasoning_budget: maxTokens } : {}),
    };
  }

  return extra;
};

const getNimApiKey = (): string => {
  return validateApiKey(createNvidiaNimConfig());
};

const getDefaultNimModel = (): string => {
  return getProviderModel(
    "NVIDIA_NIM_MODEL",
    NvidiaNimModels.LLAMA_3_3_70B_INSTRUCT,
  );
};

/**
 * NVIDIA NIM Provider — native HTTP+SSE, no AI SDK.
 *
 * Wraps NVIDIA's hosted (or self-hosted) inference endpoints.
 * Passes NIM-specific extras (top_k, min_p, repetition_penalty,
 * chat_template_kwargs.reasoning_budget) via adjustBuildBodyOptions.
 * reasoning_content surfacing is a pending base-client follow-up (not emitted natively yet); all other behavior is preserved.
 *
 * @see https://docs.api.nvidia.com/nim/reference/
 */
export class NvidiaNimProvider extends OpenAIChatCompletionsProvider {
  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["nvidiaNim"],
  ) {
    // Trim the override before applying precedence. A blank/whitespace
    // `credentials.apiKey` should NOT bypass `getNimApiKey()` — that would
    // build a client with an unusable bearer token and fail at request time
    // with a confusing 401 instead of at construction time.
    const overrideApiKey = credentials?.apiKey?.trim();
    const apiKey =
      overrideApiKey && overrideApiKey.length > 0
        ? overrideApiKey
        : getNimApiKey();
    const baseURL =
      credentials?.baseURL ??
      process.env.NVIDIA_NIM_BASE_URL ??
      NVIDIA_NIM_DEFAULT_BASE_URL;

    super("nvidia-nim" as AIProviderName, modelName, sdk, { baseURL, apiKey });

    logger.debug("NVIDIA NIM Provider initialized", {
      modelName: this.modelName,
      providerName: this.providerName,
      baseURL: redactUrlCredentials(this.config.baseURL),
    });
  }

  protected getProviderName(): AIProviderName {
    return "nvidia-nim" as AIProviderName;
  }

  protected getDefaultModel(): string {
    return getDefaultNimModel();
  }

  /**
   * Inject NIM-specific body fields (top_k, min_p, repetition_penalty,
   * min_tokens, chat_template, chat_template_kwargs) into the wire body.
   *
   * The base passes the full StreamOptions as `opts` at runtime (typed
   * narrowly as OpenAICompatBuildBodyArgs["options"] for standard fields).
   * We access thinkingLevel via an indexed-access cast since the runtime
   * value is the full StreamOptions object.
   */
  protected adjustBuildBodyOptions(
    _modelId: string,
    opts: OpenAICompatBuildBodyArgs["options"],
  ): OpenAICompatBuildBodyArgs["options"] & Record<string, unknown> {
    // The runtime value of opts is the full StreamOptions; TypeScript types
    // it narrowly so we cast to access NIM-specific thinking fields.
    const fullOpts = opts as OpenAICompatBuildBodyArgs["options"] &
      Record<string, unknown>;
    const thinkingConfigRaw = fullOpts.thinkingConfig as
      | { thinkingLevel?: string }
      | undefined;
    const tl =
      (fullOpts.thinkingLevel as string | undefined) ??
      thinkingConfigRaw?.thinkingLevel;
    const thinkingEnabled = tl !== undefined && tl !== "minimal";
    const maxTokens =
      typeof fullOpts.maxTokens === "number" ? fullOpts.maxTokens : undefined;

    const extra = buildNvidiaNimExtraBody(thinkingEnabled, maxTokens);

    return { ...opts, ...extra };
  }

  protected formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new NetworkError(
        `Request timed out: ${error.message}`,
        "nvidia-nim",
      );
    }
    const errorRecord = error as UnknownRecord;
    const message =
      typeof errorRecord?.message === "string"
        ? errorRecord.message
        : "Unknown error";

    // NIM canonically returns HTTP 401/Unauthorized for invalid API keys,
    // but its OpenAI-compatible gateway sometimes surfaces a bare 400 +
    // "Bad Request" with no body details for both malformed-credentials
    // and bad-parameter cases. Because the two are indistinguishable from
    // the message alone, we DON'T promote bare 400/Bad Request to "invalid
    // key" here — that would mis-classify legitimate parameter errors
    // (e.g. unsupported `reasoning_budget`, unsupported `chat_template`)
    // as auth failures. Tests that probe the auth path (K1) detect
    // "bad request" / "400" themselves; tests that probe parameter retry
    // (K5) need the original "Bad Request" message to surface.
    if (
      message.includes("Invalid API key") ||
      message.includes("401") ||
      message.includes("Unauthorized")
    ) {
      return new AuthenticationError(
        "Invalid NVIDIA NIM API key. Get one at https://build.nvidia.com/settings/api-keys",
        "nvidia-nim",
      );
    }
    if (message.includes("rate limit") || message.includes("429")) {
      return new RateLimitError("NVIDIA NIM rate limit exceeded", "nvidia-nim");
    }
    if (message.includes("404") || message.includes("model_not_found")) {
      return new InvalidModelError(
        `NVIDIA NIM model '${this.modelName}' not available. Browse the catalog at https://build.nvidia.com/models`,
        "nvidia-nim",
      );
    }
    if (message.includes("quota") || message.includes("403")) {
      return new ProviderError(
        "NVIDIA NIM quota exceeded for your account",
        "nvidia-nim",
      );
    }
    return new ProviderError(`NVIDIA NIM error: ${message}`, "nvidia-nim");
  }

  async validateConfiguration(): Promise<boolean> {
    return (
      typeof this.config.apiKey === "string" &&
      this.config.apiKey.trim().length > 0
    );
  }

  getConfiguration() {
    return {
      provider: this.providerName,
      model: this.modelName,
      defaultModel: getDefaultNimModel(),
      baseURL: this.config.baseURL,
    };
  }
}

// Exported for test suites that probe NIM's 400-retry behaviour directly.
export { isNimFieldRejection, stripFieldFromJsonBody };
