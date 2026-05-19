import { createOpenAI } from "@ai-sdk/openai";
import type { AIProviderName } from "../constants/enums.js";
import { CohereModels } from "../constants/enums.js";
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
  createCohereConfig,
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
 * Cohere uses an OpenAI-compatible endpoint at /compatibility/v1 that
 * accepts the same chat-completions shape. Embeddings + Rerank live on
 * the native API and are not exposed through this LLM provider class
 * (use the Cohere SDK directly or the embed/rerank routes when added).
 */
const COHERE_DEFAULT_BASE_URL = "https://api.cohere.com/compatibility/v1";

const getCohereApiKey = (): string => validateApiKey(createCohereConfig());

const getDefaultCohereModel = (): string =>
  getProviderModel("COHERE_MODEL", CohereModels.COMMAND_R_PLUS);

/**
 * Cohere Provider
 *
 * Routes Command R / Command R+ chat completions through Cohere's OpenAI-
 * compatible endpoint. Embed v3 and Rerank v3 are top-tier for RAG but are
 * accessed via the Cohere native SDK / dedicated embedding routes (out of
 * scope for the LLM provider).
 *
 * @see https://docs.cohere.com/docs/compatibility-api
 */
export class CohereProvider extends BaseProvider {
  private model: LanguageModel;
  private apiKey: string;
  private baseURL: string;

  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["cohere"],
  ) {
    const validatedNeurolink = isNeuroLink(sdk) ? sdk : undefined;

    super(modelName, "cohere" as AIProviderName, validatedNeurolink);

    const overrideApiKey = credentials?.apiKey?.trim();
    this.apiKey =
      overrideApiKey && overrideApiKey.length > 0
        ? overrideApiKey
        : getCohereApiKey();
    this.baseURL =
      credentials?.baseURL ??
      process.env.COHERE_BASE_URL ??
      COHERE_DEFAULT_BASE_URL;

    const cohere = createOpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseURL,
      fetch: createLoggingFetch("cohere"),
    });
    this.model = cohere.chat(this.modelName);

    logger.debug("Cohere Provider initialized", {
      modelName: this.modelName,
      providerName: this.providerName,
      baseURL: this.baseURL,
    });
  }

  protected async executeStream(
    options: StreamOptions,
    _analysisSchema?: ValidationSchema,
  ): Promise<StreamResult> {
    // withClientStreamSpan: keeps the span open until the consumer reaches
    // end-of-stream / error, so the recorded duration reflects the actual
    // stream lifetime instead of just setup.
    return withClientStreamSpan(
      {
        name: "neurolink.provider.stream",
        tracer: tracers.provider,
        attributes: {
          [ATTR.GEN_AI_SYSTEM]: "cohere",
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
    const perCallCreds = options.credentials?.cohere;
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
            fetch: createLoggingFetch("cohere"),
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
            logger.warn("[CohereProvider] Failed to store tool executions", {
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
          requestId: `cohere-stream-${Date.now()}`,
          streamingMode: true,
        },
      );

      return {
        stream: transformedStream,
        provider: this.providerName,
        model: this.modelName,
        analytics: analyticsPromise,
        metadata: { startTime, streamId: `cohere-${Date.now()}` },
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
    return getDefaultCohereModel();
  }

  protected getAISDKModel(): LanguageModel {
    return this.model;
  }

  protected formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new NetworkError(`Request timed out: ${error.message}`, "cohere");
    }
    const errorRecord = error as UnknownRecord;
    const message =
      typeof errorRecord?.message === "string"
        ? errorRecord.message
        : "Unknown error";

    if (
      message.includes("invalid api token") ||
      message.includes("Authentication") ||
      message.includes("401") ||
      message.includes("invalid_api_token")
    ) {
      return new AuthenticationError(
        "Invalid Cohere API key. Check COHERE_API_KEY. Get one at https://dashboard.cohere.com/api-keys",
        "cohere",
      );
    }
    if (message.includes("rate limit") || message.includes("429")) {
      return new RateLimitError(
        "Cohere rate limit exceeded. Back off and retry.",
        "cohere",
      );
    }
    if (message.includes("model_not_found") || message.includes("404")) {
      return new InvalidModelError(
        `Cohere model '${this.modelName}' not found. Use command-r, command-r-plus, or command-r7b-12-2024.`,
        "cohere",
      );
    }
    if (message.includes("trial limit") || message.includes("trial_limit")) {
      return new ProviderError(
        "Cohere trial usage limit exceeded. Upgrade at https://dashboard.cohere.com/billing.",
        "cohere",
      );
    }
    return new ProviderError(`Cohere error: ${message}`, "cohere");
  }

  async validateConfiguration(): Promise<boolean> {
    return typeof this.apiKey === "string" && this.apiKey.trim().length > 0;
  }

  getConfiguration() {
    return {
      provider: this.providerName,
      model: this.modelName,
      defaultModel: getDefaultCohereModel(),
      baseURL: this.baseURL,
    };
  }

  /**
   * Default embedding model for Cohere.
   */
  protected getDefaultEmbeddingModel(): string {
    return CohereModels.EMBED_ENGLISH_V3;
  }

  /**
   * Generate an embedding for a single text via Cohere's native /v2/embed
   * endpoint. Returns the float[] embedding vector.
   *
   * The shared OpenAI-compatible /compatibility/v1 path is chat-only; embed
   * lives on the native API (POST /v2/embed). Documented at
   * https://docs.cohere.com/reference/embed.
   */
  async embed(text: string, modelName?: string): Promise<number[]> {
    const vectors = await this.embedMany([text], modelName);
    if (!vectors[0]) {
      throw new ProviderError(
        "Cohere /v2/embed returned no embeddings.",
        "cohere",
      );
    }
    return vectors[0];
  }

  /**
   * Batch embedding via Cohere's native /v2/embed endpoint. Cohere caps at
   * 96 inputs per request; larger batches are chunked.
   */
  async embedMany(texts: string[], modelName?: string): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }
    const model = modelName ?? this.getDefaultEmbeddingModel();
    const baseUrl = this.baseURL.replace(/\/compatibility\/v\d+\/?$/, "");
    const url = `${baseUrl}/v2/embed`;

    const BATCH_SIZE = 96;
    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          texts: batch,
          input_type: "search_document",
          embedding_types: ["float"],
        }),
      });
      if (!response.ok) {
        const body = await response.text();
        throw this.formatProviderError(
          new Error(
            `Cohere /v2/embed failed: ${response.status} — ${body.slice(0, 500)}`,
          ),
        );
      }
      const json = (await response.json()) as {
        embeddings?: { float?: number[][] } | number[][];
      };
      const floatVecs =
        (json.embeddings as { float?: number[][] })?.float ??
        (Array.isArray(json.embeddings) ? json.embeddings : undefined);
      if (!floatVecs || floatVecs.length !== batch.length) {
        throw new ProviderError(
          `Cohere /v2/embed returned ${floatVecs?.length ?? 0} embeddings for ${batch.length} inputs.`,
          "cohere",
        );
      }
      results.push(...floatVecs);
    }
    return results;
  }
}

export default CohereProvider;
