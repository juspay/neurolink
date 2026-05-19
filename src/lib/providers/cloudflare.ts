import { createOpenAI } from "@ai-sdk/openai";
import type { AIProviderName } from "../constants/enums.js";
import { CloudflareModels } from "../constants/enums.js";
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
  createCloudflareConfig,
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
 * Cloudflare Workers AI exposes an OpenAI-compatible endpoint scoped per
 * account: `https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/v1`.
 * The account id is required — without it the URL would 404.
 */
const buildCloudflareBaseURL = (accountId: string): string =>
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`;

const getCloudflareApiKey = (): string =>
  validateApiKey(createCloudflareConfig());

const getDefaultCloudflareModel = (): string =>
  getProviderModel("CLOUDFLARE_MODEL", CloudflareModels.LLAMA_3_3_70B_FAST);

/**
 * Cloudflare Workers AI Provider
 *
 * Edge-served open models (Llama / Mistral / Qwen / Gemma) at
 * `https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/v1`
 * (OpenAI-compatible). Cheapest tier for high-volume usage.
 *
 * Required env: `CLOUDFLARE_API_KEY` + `CLOUDFLARE_ACCOUNT_ID`.
 *
 * @see https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/
 */
export class CloudflareProvider extends BaseProvider {
  private model: LanguageModel;
  private apiKey: string;
  private baseURL: string;

  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["cloudflare"],
  ) {
    const validatedNeurolink = isNeuroLink(sdk) ? sdk : undefined;

    super(modelName, "cloudflare" as AIProviderName, validatedNeurolink);

    const overrideApiKey = credentials?.apiKey?.trim();
    this.apiKey =
      overrideApiKey && overrideApiKey.length > 0
        ? overrideApiKey
        : getCloudflareApiKey();

    const accountId = (
      credentials?.accountId ??
      process.env.CLOUDFLARE_ACCOUNT_ID ??
      ""
    ).trim();
    if (!accountId) {
      throw new Error(
        "CLOUDFLARE_ACCOUNT_ID is required (or pass credentials.cloudflare.accountId). Get the account id from https://dash.cloudflare.com/",
      );
    }
    this.baseURL = credentials?.baseURL ?? buildCloudflareBaseURL(accountId);

    const cloudflare = createOpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseURL,
      fetch: createLoggingFetch("cloudflare"),
    });
    this.model = cloudflare.chat(this.modelName);

    logger.debug("Cloudflare Workers AI Provider initialized", {
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
          [ATTR.GEN_AI_SYSTEM]: "cloudflare",
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
              "[CloudflareProvider] Failed to store tool executions",
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
          requestId: `cloudflare-stream-${Date.now()}`,
          streamingMode: true,
        },
      );

      return {
        stream: transformedStream,
        provider: this.providerName,
        model: this.modelName,
        analytics: analyticsPromise,
        metadata: { startTime, streamId: `cloudflare-${Date.now()}` },
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
    return getDefaultCloudflareModel();
  }

  protected getAISDKModel(): LanguageModel {
    return this.model;
  }

  protected formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new NetworkError(
        `Request timed out: ${error.message}`,
        "cloudflare",
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
        "Invalid Cloudflare API key. Use a token with Workers AI Read+Write scope. Get one at https://dash.cloudflare.com/profile/api-tokens",
        "cloudflare",
      );
    }
    if (message.includes("rate limit") || message.includes("429")) {
      return new RateLimitError(
        "Cloudflare Workers AI rate limit exceeded. Free-tier neurons reset daily.",
        "cloudflare",
      );
    }
    if (message.includes("model_not_found") || message.includes("404")) {
      return new InvalidModelError(
        `Cloudflare model '${this.modelName}' not found. Browse https://developers.cloudflare.com/workers-ai/models/`,
        "cloudflare",
      );
    }
    return new ProviderError(
      `Cloudflare Workers AI error: ${message}`,
      "cloudflare",
    );
  }

  async validateConfiguration(): Promise<boolean> {
    return typeof this.apiKey === "string" && this.apiKey.trim().length > 0;
  }

  getConfiguration() {
    return {
      provider: this.providerName,
      model: this.modelName,
      defaultModel: getDefaultCloudflareModel(),
      baseURL: this.baseURL,
    };
  }
}

export default CloudflareProvider;
