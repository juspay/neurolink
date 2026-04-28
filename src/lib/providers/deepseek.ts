import { createOpenAI } from "@ai-sdk/openai";
import { type LanguageModel, stepCountIs, streamText, type Tool } from "ai";
import type { AIProviderName } from "../constants/enums.js";
import { DeepSeekModels } from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
import { streamAnalyticsCollector } from "../core/streamAnalytics.js";
import type { NeuroLink } from "../neurolink.js";
import { createProxyFetch, maskProxyUrl } from "../proxy/proxyFetch.js";
import { tracers, ATTR, withClientSpan } from "../telemetry/index.js";
import type {
  UnknownRecord,
  NeurolinkCredentials,
  StreamOptions,
  StreamResult,
  ValidationSchema,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import {
  createDeepSeekConfig,
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
      // Don't fall back to the raw URL — that would defeat the redaction.
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

const DEEPSEEK_DEFAULT_BASE_URL = "https://api.deepseek.com";

const getDeepSeekApiKey = (): string => {
  return validateApiKey(createDeepSeekConfig());
};

const getDefaultDeepSeekModel = (): string => {
  return getProviderModel("DEEPSEEK_MODEL", DeepSeekModels.DEEPSEEK_CHAT);
};

/**
 * DeepSeek Provider
 * OpenAI-compatible chat completions; supports deepseek-chat (V3) and
 * deepseek-reasoner (R1, exposes reasoning_content).
 */
export class DeepSeekProvider extends BaseProvider {
  private model: LanguageModel;
  private apiKey: string;
  private baseURL: string;

  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["deepseek"],
  ) {
    const validatedNeurolink =
      sdk && typeof sdk === "object" && "getInMemoryServers" in sdk
        ? sdk
        : undefined;

    super(
      modelName,
      "deepseek" as AIProviderName,
      validatedNeurolink as NeuroLink | undefined,
    );

    // Trim the override before applying precedence. A blank/whitespace
    // `credentials.apiKey` should NOT bypass `getDeepSeekApiKey()` — that
    // would build a client with an unusable bearer token and fail at request
    // time with a confusing 401 instead of at construction time.
    const overrideApiKey = credentials?.apiKey?.trim();
    this.apiKey =
      overrideApiKey && overrideApiKey.length > 0
        ? overrideApiKey
        : getDeepSeekApiKey();
    this.baseURL =
      credentials?.baseURL ??
      process.env.DEEPSEEK_BASE_URL ??
      DEEPSEEK_DEFAULT_BASE_URL;

    const deepseek = createOpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseURL,
      fetch: makeLoggingFetch("deepseek"),
    });
    // .chat() returns a Chat Completions model. The default factory call
    // returns a Responses API model which OpenAI-compat providers don't implement.
    this.model = deepseek.chat(this.modelName);

    logger.debug("DeepSeek Provider initialized", {
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
          [ATTR.GEN_AI_SYSTEM]: "deepseek",
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

      const isReasoner = this.modelName === DeepSeekModels.DEEPSEEK_REASONER;
      const result = await streamText({
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
        // DeepSeek's `thinking` mode is opt-in for chat models — only enable
        // when the caller explicitly asks for it via `thinkingConfig.enabled`.
        // Forcing it on every chat call would trigger extended reasoning for
        // simple prompts (and ignore reasoner models which control it natively).
        providerOptions:
          !isReasoner && options.thinkingConfig?.enabled
            ? {
                openai: {
                  thinking: { type: "enabled" },
                },
              }
            : undefined,
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
            logger.warn("[DeepSeekProvider] Failed to store tool executions", {
              provider: this.providerName,
              error: error instanceof Error ? error.message : String(error),
            });
          });
        },
      });

      timeoutController?.cleanup();
      const transformedStream = this.createTextStream(result);
      const analyticsPromise = streamAnalyticsCollector.createAnalytics(
        this.providerName,
        this.modelName,
        toAnalyticsStreamResult(result),
        Date.now() - startTime,
        {
          requestId: `deepseek-stream-${Date.now()}`,
          streamingMode: true,
        },
      );

      return {
        stream: transformedStream,
        provider: this.providerName,
        model: this.modelName,
        analytics: analyticsPromise,
        metadata: { startTime, streamId: `deepseek-${Date.now()}` },
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
    return getDefaultDeepSeekModel();
  }

  protected getAISDKModel(): LanguageModel {
    return this.model;
  }

  protected formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new Error(`DeepSeek request timed out: ${error.message}`);
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
      return new Error(
        "Invalid DeepSeek API key. Please check your DEEPSEEK_API_KEY environment variable.",
      );
    }
    if (message.includes("rate limit") || message.includes("429")) {
      return new Error("DeepSeek rate limit exceeded");
    }
    if (
      message.includes("Insufficient Balance") ||
      message.includes("insufficient_balance") ||
      message.includes("402")
    ) {
      return new Error(
        "DeepSeek account has insufficient balance. Top up at https://platform.deepseek.com/usage",
      );
    }
    if (message.includes("model_not_found") || message.includes("404")) {
      return new Error(
        `DeepSeek model '${this.modelName}' not found. Use 'deepseek-chat' or 'deepseek-reasoner'.`,
      );
    }
    return new Error(`DeepSeek error: ${message}`);
  }

  async validateConfiguration(): Promise<boolean> {
    return typeof this.apiKey === "string" && this.apiKey.trim().length > 0;
  }

  getConfiguration() {
    return {
      provider: this.providerName,
      model: this.modelName,
      defaultModel: getDefaultDeepSeekModel(),
      baseURL: this.baseURL,
    };
  }
}

export default DeepSeekProvider;
