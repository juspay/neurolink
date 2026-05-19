import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { AIProviderName } from "../constants/enums.js";
import { NvidiaNimModels } from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
import { streamAnalyticsCollector } from "../core/streamAnalytics.js";
import type { NeuroLink } from "../neurolink.js";
import { isNeuroLink } from "../neurolink.js";
import { createProxyFetch, maskProxyUrl } from "../proxy/proxyFetch.js";
import { tracers, ATTR, withClientStreamSpan } from "../telemetry/index.js";
import type {
  UnknownRecord,
  NeurolinkCredentials,
  NvidiaNimExtraBody,
  StreamOptions,
  StreamResult,
  ValidationSchema,
} from "../types/index.js";
import {
  AuthenticationError,
  InvalidModelError,
  NetworkError,
  ProviderError,
  RateLimitError,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import {
  createNvidiaNimConfig,
  getProviderModel,
  validateApiKey,
} from "../utils/providerConfig.js";
import {
  composeAbortSignals,
  createTimeoutController,
  TimeoutError,
} from "../utils/timeout.js";
import { emitToolEndFromStepFinish } from "../utils/toolEndEmitter.js";
import { resolveToolChoice } from "../utils/toolChoice.js";
import { toAnalyticsStreamResult } from "./providerTypeUtils.js";
import type { LanguageModel, Tool } from "../types/index.js";
import { stepCountIs } from "../utils/tool.js";
import { streamText } from "../utils/generation.js";

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

const makeLoggingFetch = (provider: string): typeof fetch => {
  const base = createProxyFetch();
  return (async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const reqSize =
      init?.body && typeof init.body === "string" ? init.body.length : 0;
    let response = await base(input, init);

    // Generic NIM 400 retry-strip: works for BOTH generate and stream paths.
    // NIM sometimes returns HTTP 400 when a model rejects `reasoning_budget`
    // or `chat_template`. The stream path already retries by reconstructing
    // its provider options; this fetch-level retry is the symmetric fix for
    // generate (and any other transport that lands here).
    //
    // We require BOTH (a) the offending field name AND (b) a rejection
    // keyword (unsupported / not supported / unknown / invalid /
    // unrecognized / does not support) within 80 chars of it. Without the
    // rejection-keyword guard, an unrelated 400 whose error body happened
    // to mention `chat_template` (e.g. the user prompt got echoed back)
    // would cause us to silently strip a field the user actually wanted
    // sent, and either succeed for the wrong reason or fail with a
    // misleading error.
    if (
      response.status === 400 &&
      typeof init?.body === "string" &&
      init.body.length > 0
    ) {
      const cloned = response.clone();
      const body = await cloned.text().catch(() => "");
      let retryBody: string | null = null;
      let stripped: "reasoning_budget" | "chat_template" | null = null;
      if (isNimFieldRejection(body, "reasoning_budget")) {
        retryBody = stripFieldFromJsonBody(init.body, "reasoning_budget");
        stripped = "reasoning_budget";
      } else if (isNimFieldRejection(body, "chat_template")) {
        retryBody = stripFieldFromJsonBody(init.body, "chat_template");
        stripped = "chat_template";
      }
      if (retryBody !== null && stripped !== null) {
        logger.warn(
          `[${provider}] NIM rejected ${stripped}; retrying with field stripped`,
        );
        response = await base(input, { ...init, body: retryBody });
      }
    }

    if (!response.ok) {
      // If maskProxyUrl can't safely sanitize the URL (returns null), don't
      // log the raw URL — that defeats the redaction. Use a placeholder so
      // operators still get the warning without leaking credentials.
      const safeUrl = maskProxyUrl(url) ?? "<redacted>";
      if (process.env.NEUROLINK_DEBUG_HTTP === "1") {
        const clone = response.clone();
        const body = await clone.text().catch(() => "<unreadable>");
        logger.warn(`[${provider}] upstream ${response.status}`, {
          url: safeUrl,
          body: body.slice(0, 800),
          reqSize,
        });
      } else {
        logger.warn(
          `[${provider}] upstream ${response.status} url=${safeUrl} reqSize=${reqSize}`,
        );
      }
    }
    return response;
  }) as typeof fetch;
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

const stripReasoningBudget = (body: NvidiaNimExtraBody): NvidiaNimExtraBody => {
  const cloned: NvidiaNimExtraBody = { ...body };
  if (cloned.chat_template_kwargs) {
    const { reasoning_budget: _ignored, ...rest } = cloned.chat_template_kwargs;
    cloned.chat_template_kwargs = rest;
    if (Object.keys(cloned.chat_template_kwargs).length === 0) {
      delete cloned.chat_template_kwargs;
    }
  }
  return cloned;
};

const stripChatTemplate = (body: NvidiaNimExtraBody): NvidiaNimExtraBody => {
  const { chat_template: _ignored, ...rest } = body;
  return rest;
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
 * NVIDIA NIM Provider
 * Wraps NVIDIA's hosted (or self-hosted) inference endpoints via OpenAI-compat.
 * Passes NIM-specific extras (top_k, min_p, repetition_penalty,
 * chat_template_kwargs.reasoning_budget) via providerOptions.openai.body.
 * Implements one-retry-on-400 to drop unsupported extras gracefully.
 */
export class NvidiaNimProvider extends BaseProvider {
  private model: LanguageModel;
  private apiKey: string;
  private baseURL: string;

  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["nvidiaNim"],
  ) {
    const validatedNeurolink = isNeuroLink(sdk) ? sdk : undefined;

    super(
      modelName,
      "nvidia-nim" as AIProviderName,
      validatedNeurolink as NeuroLink | undefined,
    );

    // Trim the override before applying precedence. A blank/whitespace
    // `credentials.apiKey` should NOT bypass `getNimApiKey()` — that would
    // build a client with an unusable bearer token and fail at request time
    // with a confusing 401 instead of at construction time.
    const overrideApiKey = credentials?.apiKey?.trim();
    this.apiKey =
      overrideApiKey && overrideApiKey.length > 0
        ? overrideApiKey
        : getNimApiKey();
    this.baseURL =
      credentials?.baseURL ??
      process.env.NVIDIA_NIM_BASE_URL ??
      NVIDIA_NIM_DEFAULT_BASE_URL;

    // We deliberately use `@ai-sdk/openai-compatible` rather than
    // `@ai-sdk/openai`. Two upstream behaviors of `@ai-sdk/openai` break us:
    //   1. It always sends `response_format: { type: "json_schema" }` when a
    //      schema is provided. Most NIM-served chat models don't enforce
    //      json_schema strictly — the schema goes through but `result.object`
    //      stays empty because the SDK never gets the typed response back.
    //   2. It does not parse the `reasoning_content` field that NIM-hosted
    //      reasoning models (deepseek-r1, qwq, llama-nemotron-ultra) emit,
    //      so chain-of-thought is silently dropped.
    // `@ai-sdk/openai-compatible` honors `supportsStructuredOutputs: false`
    // (falls back to `{ type: "json_object" }` and injects the schema into
    // the prompt — works across the entire NIM model fleet) and parses both
    // `choice.message.reasoning_content` and `delta.reasoning_content` into
    // the SDK-standard `reasoning` part. NIM-specific extras (`min_tokens`,
    // `chat_template_kwargs.reasoning_budget`, `chat_template`) are still
    // injected via `providerOptions.openai.body` in `executeStreamInner`.
    const nim = createOpenAICompatible({
      name: "nvidia-nim",
      apiKey: this.apiKey,
      baseURL: this.baseURL,
      fetch: makeLoggingFetch("nvidia-nim"),
      supportsStructuredOutputs: false,
      includeUsage: true,
    });
    this.model = nim.chatModel(this.modelName);

    logger.debug("NVIDIA NIM Provider initialized", {
      modelName: this.modelName,
      providerName: this.providerName,
      baseURL: this.baseURL,
    });
  }

  protected async executeStream(
    options: StreamOptions,
    _analysisSchema?: ValidationSchema,
  ): Promise<StreamResult> {
    return withClientStreamSpan(
      {
        name: "neurolink.provider.stream",
        tracer: tracers.provider,
        attributes: {
          [ATTR.GEN_AI_SYSTEM]: "nvidia-nim",
          [ATTR.GEN_AI_MODEL]: this.modelName,
          [ATTR.GEN_AI_OPERATION]: "stream",
          [ATTR.NL_STREAM_MODE]: true,
        },
      },
      async () => this.executeStreamInner(options),
      (r) => r.stream,
      (r, wrapped) => ({ ...r, stream: wrapped }),
    );
  }

  private async executeStreamInner(
    options: StreamOptions,
  ): Promise<StreamResult> {
    this.validateStreamOptions(options);

    const startTime = Date.now();
    const timeout = this.getTimeout(options);
    const timeoutController = createTimeoutController(
      timeout,
      this.providerName,
      "stream",
    );

    try {
      const shouldUseTools = !options.disableTools && this.supportsTools();
      const tools = shouldUseTools
        ? (options.tools as Record<string, Tool>) || (await this.getAllTools())
        : {};

      const messages = await this.buildMessagesForStream(options);
      const model = await this.getAISDKModelWithMiddleware(options);

      // Callers pass `thinkingLevel` directly on generate/stream options
      // (matching Anthropic / Gemini 2.5+ / Gemini 3 conventions). Fall back
      // to the legacy `thinkingConfig.thinkingLevel` shape for compatibility.
      const tl =
        (options as { thinkingLevel?: string }).thinkingLevel ??
        options.thinkingConfig?.thinkingLevel;
      const thinkingEnabled = tl !== undefined && tl !== "minimal";
      let extraBody = buildNvidiaNimExtraBody(
        thinkingEnabled,
        options.maxTokens,
      );

      // Inline the retry-strip union — CLAUDE.md rule 2 forbids type aliases
      // outside src/lib/types/. The two literals match the 400 error keys NIM
      // returns for the only two extras we know how to drop and retry.
      const callStream = (
        body: NvidiaNimExtraBody,
        stripped: Array<"reasoning_budget" | "chat_template"> = [],
      ) =>
        streamText({
          model,
          messages,
          temperature: options.temperature,
          maxOutputTokens: options.maxTokens,
          tools,
          stopWhen: stepCountIs(options.maxSteps || DEFAULT_MAX_STEPS),
          toolChoice: resolveToolChoice(options, tools, shouldUseTools),
          abortSignal: composeAbortSignals(
            options.abortSignal,
            timeoutController?.controller.signal,
          ),
          providerOptions: (() => {
            // StreamOptions doesn't formally type providerOptions but the
            // upstream Vercel AI SDK accepts it. Read it via an indexed access
            // and merge with NIM extras instead of overwriting any per-call
            // openai.body.
            const callerBase =
              ((options as unknown as Record<string, unknown>)
                .providerOptions as Record<string, unknown> | undefined) ?? {};
            const callerOpenai =
              (callerBase.openai as Record<string, unknown> | undefined) ?? {};
            const callerBody =
              (callerOpenai.body as Record<string, unknown> | undefined) ?? {};
            // Per-call overrides win over env/NIM defaults — defaults first,
            // overrides last. chat_template_kwargs is merged shallowly too so
            // a request that only sets `reasoning_budget` doesn't drop the
            // env-driven `thinking: true` flag (and vice versa).
            const defaultsBody = body as unknown as Record<string, unknown>;
            const mergedBody: Record<string, unknown> = {
              ...defaultsBody,
              ...callerBody,
            };
            const mergedKwargs: Record<string, unknown> = {
              ...((defaultsBody.chat_template_kwargs as
                | Record<string, unknown>
                | undefined) ?? {}),
              ...((callerBody.chat_template_kwargs as
                | Record<string, unknown>
                | undefined) ?? {}),
            };
            // Apply retry-strip AFTER merging so caller-supplied copies of
            // the offending field are also dropped (otherwise the retry would
            // re-send the field that NIM just rejected).
            if (stripped.includes("chat_template")) {
              delete mergedBody.chat_template;
            }
            if (stripped.includes("reasoning_budget")) {
              delete mergedKwargs.reasoning_budget;
            }
            if (Object.keys(mergedKwargs).length > 0) {
              mergedBody.chat_template_kwargs = mergedKwargs;
            } else {
              delete mergedBody.chat_template_kwargs;
            }
            if (
              Object.keys(callerBase).length === 0 &&
              Object.keys(mergedBody).length === 0
            ) {
              return undefined;
            }
            return {
              ...callerBase,
              openai: {
                ...callerOpenai,
                body: mergedBody,
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any;
          })(),
          experimental_telemetry:
            this.telemetryHandler.getTelemetryConfig(options),
          experimental_repairToolCall: this.getToolCallRepairFn(options),
          onStepFinish: ({ toolCalls, toolResults }) => {
            emitToolEndFromStepFinish(
              this.neurolink?.getEventEmitter(),
              toolResults as Array<{
                toolName: string;
                output?: unknown;
                result?: unknown;
                error?: string;
              }>,
            );
            this.handleToolExecutionStorage(
              toolCalls,
              toolResults,
              options,
              new Date(),
            ).catch((error: unknown) => {
              logger.warn(
                "[NvidiaNimProvider] Failed to store tool executions",
                {
                  provider: this.providerName,
                  error: error instanceof Error ? error.message : String(error),
                },
              );
            });
          },
        });

      let result: Awaited<ReturnType<typeof callStream>>;
      try {
        result = await callStream(extraBody);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        const status = (error as { statusCode?: number })?.statusCode;
        if (status === 400) {
          const lower = errMsg.toLowerCase();
          if (lower.includes("reasoning_budget")) {
            logger.warn("NIM rejected reasoning_budget; retrying without it");
            extraBody = stripReasoningBudget(extraBody);
            result = await callStream(extraBody, ["reasoning_budget"]);
          } else if (lower.includes("chat_template")) {
            logger.warn("NIM rejected chat_template; retrying without it");
            extraBody = stripChatTemplate(extraBody);
            result = await callStream(extraBody, ["chat_template"]);
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }

      timeoutController?.cleanup();
      const transformedStream = this.createTextStream(result);
      const analyticsPromise = streamAnalyticsCollector.createAnalytics(
        this.providerName,
        this.modelName,
        toAnalyticsStreamResult(result),
        Date.now() - startTime,
        {
          requestId: `nvidia-nim-stream-${Date.now()}`,
          streamingMode: true,
        },
      );

      return {
        stream: transformedStream,
        provider: this.providerName,
        model: this.modelName,
        analytics: analyticsPromise,
        metadata: { startTime, streamId: `nvidia-nim-${Date.now()}` },
      };
    } catch (error) {
      timeoutController?.cleanup();
      throw this.handleProviderError(error);
    }
  }

  protected getProviderName(): AIProviderName {
    return this.providerName;
  }

  protected getDefaultModel(): string {
    return getDefaultNimModel();
  }

  protected getAISDKModel(): LanguageModel {
    return this.model;
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
    return typeof this.apiKey === "string" && this.apiKey.trim().length > 0;
  }

  getConfiguration() {
    return {
      provider: this.providerName,
      model: this.modelName,
      defaultModel: getDefaultNimModel(),
      baseURL: this.baseURL,
    };
  }
}

export default NvidiaNimProvider;
