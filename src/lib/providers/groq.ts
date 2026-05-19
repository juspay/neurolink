import { createOpenAI } from "@ai-sdk/openai";
import type { AIProviderName } from "../constants/enums.js";
import { GroqModels } from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
import { streamAnalyticsCollector } from "../core/streamAnalytics.js";
import { isNeuroLink } from "../neurolink.js";
import { createLoggingFetch } from "../utils/loggingFetch.js";
import { tracers, ATTR, withClientStreamSpan } from "../telemetry/index.js";
import {
  AuthenticationError,
  InvalidModelError,
  ProviderError,
  RateLimitError,
} from "../types/index.js";
import type {
  UnknownRecord,
  NeurolinkCredentials,
  StreamOptions,
  StreamResult,
  ValidationSchema,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import {
  createGroqConfig,
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
import type { LanguageModel } from "../types/index.js";
import { stepCountIs } from "../utils/tool.js";
import { streamText } from "../utils/generation.js";

const GROQ_DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";

const getGroqApiKey = (): string => validateApiKey(createGroqConfig());

const getDefaultGroqModel = (): string =>
  getProviderModel("GROQ_MODEL", GroqModels.LLAMA_3_3_70B_VERSATILE);

/**
 * Groq Provider
 *
 * Sub-100ms inference of Llama / Mistral / Gemma at api.groq.com/openai/v1
 * (OpenAI-compatible). Best for low-latency tier; trade-off vs other open
 * model hosts is throughput latency, not quality.
 *
 * @see https://console.groq.com/docs/quickstart
 */
export class GroqProvider extends BaseProvider {
  private model: LanguageModel;
  private apiKey: string;
  private baseURL: string;

  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["groq"],
  ) {
    const validatedNeurolink = isNeuroLink(sdk) ? sdk : undefined;

    super(modelName, "groq" as AIProviderName, validatedNeurolink);

    const overrideApiKey = credentials?.apiKey?.trim();
    this.apiKey =
      overrideApiKey && overrideApiKey.length > 0
        ? overrideApiKey
        : getGroqApiKey();
    this.baseURL =
      credentials?.baseURL ??
      process.env.GROQ_BASE_URL ??
      GROQ_DEFAULT_BASE_URL;

    const groq = createOpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseURL,
      fetch: createLoggingFetch("groq"),
    });
    this.model = groq.chat(this.modelName);

    logger.debug("Groq Provider initialized", {
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
          [ATTR.GEN_AI_SYSTEM]: "groq",
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
    const perCallCreds = options.credentials?.groq;
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
      // Use the canonical BaseProvider helper: merges base tools (MCP/built-in)
      // with user-provided tools (RAG, etc.) and applies per-call filtering.
      const shouldUseTools = !options.disableTools && this.supportsTools();
      const tools = await this.getToolsForStream(options);

      const messages = await this.buildMessagesForStream(options);

      // When per-call credentials differ from instance, build a fresh client.
      const hasDifferentCreds =
        effectiveApiKey !== this.apiKey || effectiveBaseURL !== this.baseURL;
      const model = hasDifferentCreds
        ? createOpenAI({
            apiKey: effectiveApiKey,
            baseURL: effectiveBaseURL,
            fetch: createLoggingFetch("groq"),
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
            logger.warn("[GroqProvider] Failed to store tool executions", {
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
          requestId: `groq-stream-${Date.now()}`,
          streamingMode: true,
        },
      );

      return {
        stream: transformedStream,
        provider: this.providerName,
        model: this.modelName,
        analytics: analyticsPromise,
        metadata: { startTime, streamId: `groq-${Date.now()}` },
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
    return getDefaultGroqModel();
  }

  protected getAISDKModel(): LanguageModel {
    return this.model;
  }

  protected formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new ProviderError(
        `Groq request timed out: ${error.message}`,
        "groq",
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
      message.includes("401") ||
      message.includes("invalid_api_key")
    ) {
      return new AuthenticationError(
        "Invalid Groq API key. Check GROQ_API_KEY. Get one at https://console.groq.com/keys",
        "groq",
      );
    }
    if (message.includes("rate limit") || message.includes("429")) {
      return new RateLimitError(
        "Groq rate limit exceeded. Free tier limits are tight; consider upgrading or backing off.",
        "groq",
      );
    }
    if (
      message.includes("model_not_found") ||
      message.includes("404") ||
      message.includes("model_decommissioned")
    ) {
      return new InvalidModelError(
        message.includes("model_decommissioned")
          ? `Groq model '${this.modelName}' was decommissioned. Pick a current model from https://console.groq.com/docs/models.`
          : `Groq model '${this.modelName}' not found. See https://console.groq.com/docs/models for the current catalog.`,
        "groq",
      );
    }
    return new ProviderError(`Groq error: ${message}`, "groq");
  }

  async validateConfiguration(): Promise<boolean> {
    return typeof this.apiKey === "string" && this.apiKey.trim().length > 0;
  }

  getConfiguration() {
    return {
      provider: this.providerName,
      model: this.modelName,
      defaultModel: getDefaultGroqModel(),
      baseURL: this.baseURL,
    };
  }
}

export default GroqProvider;
