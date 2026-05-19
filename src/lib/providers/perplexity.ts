import { createOpenAI } from "@ai-sdk/openai";
import type { AIProviderName } from "../constants/enums.js";
import { PerplexityModels } from "../constants/enums.js";
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
  createPerplexityConfig,
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

const PERPLEXITY_DEFAULT_BASE_URL = "https://api.perplexity.ai";

const getPerplexityApiKey = (): string =>
  validateApiKey(createPerplexityConfig());

const getDefaultPerplexityModel = (): string =>
  getProviderModel("PERPLEXITY_MODEL", PerplexityModels.SONAR);

/**
 * Perplexity Provider
 *
 * Sonar models with built-in web grounding. OpenAI-compatible chat
 * completions at api.perplexity.ai. Best for queries that need fresh
 * web context (search-augmented answers + citations).
 *
 * @see https://docs.perplexity.ai/api-reference/chat-completions
 */
export class PerplexityProvider extends BaseProvider {
  private model: LanguageModel;
  private apiKey: string;
  private baseURL: string;

  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["perplexity"],
  ) {
    const validatedNeurolink = isNeuroLink(sdk) ? sdk : undefined;

    super(modelName, "perplexity" as AIProviderName, validatedNeurolink);

    const overrideApiKey = credentials?.apiKey?.trim();
    this.apiKey =
      overrideApiKey && overrideApiKey.length > 0
        ? overrideApiKey
        : getPerplexityApiKey();
    this.baseURL =
      credentials?.baseURL ??
      process.env.PERPLEXITY_BASE_URL ??
      PERPLEXITY_DEFAULT_BASE_URL;

    const perplexity = createOpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseURL,
      fetch: createLoggingFetch("perplexity"),
    });
    this.model = perplexity.chat(this.modelName);

    logger.debug("Perplexity Provider initialized", {
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
          [ATTR.GEN_AI_SYSTEM]: "perplexity",
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
    const perCallCreds = options.credentials?.perplexity;
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
      // Perplexity Sonar's tool support is limited; default to disabled when
      // not explicitly requested by the caller. The web-grounding signal is
      // baked into the model itself, not exposed as tool calls.
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
            fetch: createLoggingFetch("perplexity"),
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
              "[PerplexityProvider] Failed to store tool executions",
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
          requestId: `perplexity-stream-${Date.now()}`,
          streamingMode: true,
        },
      );

      return {
        stream: transformedStream,
        provider: this.providerName,
        model: this.modelName,
        analytics: analyticsPromise,
        metadata: { startTime, streamId: `perplexity-${Date.now()}` },
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
    return getDefaultPerplexityModel();
  }

  protected getAISDKModel(): LanguageModel {
    return this.model;
  }

  protected formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new NetworkError(
        `Request timed out: ${error.message}`,
        "perplexity",
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
        "Invalid Perplexity API key. Get one at https://www.perplexity.ai/settings/api",
        "perplexity",
      );
    }
    if (message.includes("rate limit") || message.includes("429")) {
      return new RateLimitError(
        "Perplexity rate limit exceeded. Back off and retry.",
        "perplexity",
      );
    }
    if (message.includes("model_not_found") || message.includes("404")) {
      return new InvalidModelError(
        `Perplexity model '${this.modelName}' not found. Use sonar, sonar-pro, sonar-reasoning, sonar-reasoning-pro, or sonar-deep-research.`,
        "perplexity",
      );
    }
    return new ProviderError(`Perplexity error: ${message}`, "perplexity");
  }

  async validateConfiguration(): Promise<boolean> {
    return typeof this.apiKey === "string" && this.apiKey.trim().length > 0;
  }

  getConfiguration() {
    return {
      provider: this.providerName,
      model: this.modelName,
      defaultModel: getDefaultPerplexityModel(),
      baseURL: this.baseURL,
    };
  }
}

export default PerplexityProvider;
