import { createOpenAI } from "@ai-sdk/openai";
import type { AIProviderName } from "../constants/enums.js";
import { TogetherAIModels } from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
import { streamAnalyticsCollector } from "../core/streamAnalytics.js";
import { isNeuroLink } from "../neurolink.js";
import { createLoggingFetch } from "../utils/loggingFetch.js";
import { tracers, ATTR, withClientStreamSpan } from "../telemetry/index.js";
import type {
  UnknownRecord,
  NeurolinkCredentials,
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
  createTogetherAIConfig,
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

const TOGETHER_DEFAULT_BASE_URL = "https://api.together.xyz/v1";

const getTogetherApiKey = (): string =>
  validateApiKey(createTogetherAIConfig());

const getDefaultTogetherModel = (): string =>
  getProviderModel(
    "TOGETHER_MODEL",
    TogetherAIModels.LLAMA_3_3_70B_INSTRUCT_TURBO,
  );

/**
 * Together AI Provider
 *
 * Hosted open-model gateway at api.together.xyz/v1 (OpenAI-compatible).
 * Llama / Mistral / Qwen / DeepSeek / Gemma / WizardLM available
 * server-less; pass any catalog id via `--model`.
 *
 * @see https://docs.together.ai/docs/openai-api-compatibility
 */
export class TogetherAIProvider extends BaseProvider {
  private model: LanguageModel;
  private apiKey: string;
  private baseURL: string;

  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["together"],
  ) {
    const validatedNeurolink = isNeuroLink(sdk) ? sdk : undefined;

    super(modelName, "together-ai" as AIProviderName, validatedNeurolink);

    const overrideApiKey = credentials?.apiKey?.trim();
    this.apiKey =
      overrideApiKey && overrideApiKey.length > 0
        ? overrideApiKey
        : getTogetherApiKey();
    this.baseURL =
      credentials?.baseURL ??
      process.env.TOGETHER_BASE_URL ??
      TOGETHER_DEFAULT_BASE_URL;

    const together = createOpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseURL,
      fetch: createLoggingFetch("together-ai"),
    });
    this.model = together.chat(this.modelName);

    logger.debug("Together AI Provider initialized", {
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
          [ATTR.GEN_AI_SYSTEM]: "together-ai",
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

    // Resolve per-call credentials first, then fall back to instance-level.
    const perCallCreds = options.credentials?.together;
    const effectiveApiKey = perCallCreds?.apiKey?.trim() || this.apiKey;
    const effectiveBaseURL = perCallCreds?.baseURL || this.baseURL;

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

      // When per-call credentials differ from instance, build a fresh client.
      const hasDifferentCreds =
        effectiveApiKey !== this.apiKey || effectiveBaseURL !== this.baseURL;
      const model = hasDifferentCreds
        ? createOpenAI({
            apiKey: effectiveApiKey,
            baseURL: effectiveBaseURL,
            fetch: createLoggingFetch("together-ai"),
          }).chat(this.modelName)
        : await this.getAISDKModelWithMiddleware(options);

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
              "[TogetherAIProvider] Failed to store tool executions",
              {
                provider: this.providerName,
                error: error instanceof Error ? error.message : String(error),
              },
            );
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
          requestId: `together-stream-${Date.now()}`,
          streamingMode: true,
        },
      );

      return {
        stream: transformedStream,
        provider: this.providerName,
        model: this.modelName,
        analytics: analyticsPromise,
        metadata: { startTime, streamId: `together-${Date.now()}` },
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
    return getDefaultTogetherModel();
  }

  protected getAISDKModel(): LanguageModel {
    return this.model;
  }

  protected formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new NetworkError(
        `Request timed out: ${error.message}`,
        "together-ai",
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
        "Invalid Together AI API key. Get one at https://api.together.xyz/settings/api-keys",
        "together-ai",
      );
    }
    if (message.includes("rate limit") || message.includes("429")) {
      return new RateLimitError(
        "Together AI rate limit exceeded. Back off and retry.",
        "together-ai",
      );
    }
    if (message.includes("model_not_found") || message.includes("404")) {
      return new InvalidModelError(
        `Together AI model '${this.modelName}' not found. Browse the catalog at https://api.together.xyz/models`,
        "together-ai",
      );
    }
    return new ProviderError(`Together AI error: ${message}`, "together-ai");
  }

  async validateConfiguration(): Promise<boolean> {
    return typeof this.apiKey === "string" && this.apiKey.trim().length > 0;
  }

  getConfiguration() {
    return {
      provider: this.providerName,
      model: this.modelName,
      defaultModel: getDefaultTogetherModel(),
      baseURL: this.baseURL,
    };
  }
}

export default TogetherAIProvider;
