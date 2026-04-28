import { createOpenAI } from "@ai-sdk/openai";
import { type LanguageModel, stepCountIs, streamText, type Tool } from "ai";
import type { AIProviderName } from "../constants/enums.js";
import { NvidiaNimModels } from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
import { streamAnalyticsCollector } from "../core/streamAnalytics.js";
import type { NeuroLink } from "../neurolink.js";
import { createProxyFetch, maskProxyUrl } from "../proxy/proxyFetch.js";
import { tracers, ATTR, withClientSpan } from "../telemetry/index.js";
import type {
  UnknownRecord,
  NeurolinkCredentials,
  NvidiaNimExtraBody,
  StreamOptions,
  StreamResult,
  ValidationSchema,
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
    const response = await base(input, init);
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
import { resolveToolChoice } from "../utils/toolChoice.js";
import { toAnalyticsStreamResult } from "./providerTypeUtils.js";

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
    const validatedNeurolink =
      sdk && typeof sdk === "object" && "getInMemoryServers" in sdk
        ? sdk
        : undefined;

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

    const nim = createOpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseURL,
      fetch: makeLoggingFetch("nvidia-nim"),
    });
    // .chat() — NIM exposes /v1/chat/completions, not /v1/responses
    this.model = nim.chat(this.modelName);

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
    return withClientSpan(
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
      return new Error(`NVIDIA NIM request timed out: ${error.message}`);
    }
    const errorRecord = error as UnknownRecord;
    const message =
      typeof errorRecord?.message === "string"
        ? errorRecord.message
        : "Unknown error";

    if (
      message.includes("Invalid API key") ||
      message.includes("401") ||
      message.includes("Unauthorized")
    ) {
      return new Error(
        "Invalid NVIDIA NIM API key. Get one at https://build.nvidia.com/settings/api-keys",
      );
    }
    if (message.includes("rate limit") || message.includes("429")) {
      return new Error("NVIDIA NIM rate limit exceeded");
    }
    if (message.includes("404") || message.includes("model_not_found")) {
      return new Error(
        `NVIDIA NIM model '${this.modelName}' not available. Browse the catalog at https://build.nvidia.com/models`,
      );
    }
    if (message.includes("quota") || message.includes("403")) {
      return new Error("NVIDIA NIM quota exceeded for your account");
    }
    return new Error(`NVIDIA NIM error: ${message}`);
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
