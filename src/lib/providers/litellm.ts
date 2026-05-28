import { SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import type { AIProviderName } from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
import { streamAnalyticsCollector } from "../core/streamAnalytics.js";
import type { NeuroLink } from "../neurolink.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import type {
  LanguageModel,
  OpenAICompatChatChoice,
  OpenAICompatChatMessage,
  OpenAICompatChatResponse,
  OpenAICompatChatTool,
  OpenAICompatMessage,
  OpenAICompatSSEResult,
  OpenAICompatStreamChunk,
  OpenAICompatToolCallWire,
  OpenAICompatToolChoiceWire,
  OpenAICompatV3CallToolChoice,
  OpenAICompatV3CallTools,
  Schema,
  StreamLoopArgs,
  StreamOptions,
  StreamResult,
  Tool,
  ToolExecutionSummaryInternal,
  UnknownRecord,
  ZodUnknownSchema,
} from "../types/index.js";
import {
  AuthenticationError,
  InvalidModelError,
  ModelAccessDeniedError,
  NetworkError,
  ProviderError,
  RateLimitError,
  isModelAccessDeniedMessage,
  parseAllowedModels,
} from "../types/index.js";
import { isAbortError } from "../utils/errorHandling.js";
import { NoOutputGeneratedError } from "../utils/generationErrors.js";
import { logger } from "../utils/logger.js";
import {
  buildNoOutputSentinel,
  stampNoOutputSpan,
} from "../utils/noOutputSentinel.js";
import { calculateCost } from "../utils/pricing.js";
import { getProviderModel } from "../utils/providerConfig.js";
import {
  composeAbortSignals,
  createTimeoutController,
  mergeAbortSignals,
  TimeoutError,
} from "../utils/timeout.js";
import { emitToolEndFromStepFinish } from "../utils/toolEndEmitter.js";
import { resolveToolChoice } from "../utils/toolChoice.js";
import { transformToolExecutions } from "../utils/transformationUtils.js";
import {
  buildAPIError,
  buildBody,
  buildToolsForOpenAI,
  createChunkQueue,
  createDeferredAnalytics,
  mapNeuroLinkToolChoice,
  mergeUsage,
  messageBuilderToOpenAI,
  parseSSEStream,
  stringifyToolOutput,
  stripTrailingSlash,
  v3ResponseFormatToOpenAI,
  v3ToolChoiceToOpenAI,
  v3ToolsToOpenAI,
} from "./openaiChatCompletionsClient.js";

const streamTracer = trace.getTracer("neurolink.provider.litellm");

const FALLBACK_LITELLM_MODEL = "openai/gpt-4o-mini";

const getLiteLLMConfig = () => ({
  baseURL: process.env.LITELLM_BASE_URL || "http://localhost:4000",
  apiKey: process.env.LITELLM_API_KEY || "sk-anything",
});

/**
 * LiteLLM uses a 'provider/model' format. Override via LITELLM_MODEL env var.
 */
const getDefaultLiteLLMModel = (): string =>
  getProviderModel("LITELLM_MODEL", FALLBACK_LITELLM_MODEL);

const isGemini25Model = (modelName: string): boolean =>
  modelName.includes("gemini-2.5") || modelName.includes("gemini/2.5");

// =============================================================================
// Direct HTTP client for LiteLLM proxy.
//
// LiteLLM exposes the OpenAI chat-completions wire format, so all the
// wire-level converters and the SSE parser are shared with the
// openai-compatible provider via ./openaiChatCompletionsClient.ts. This
// file owns LiteLLM-specific behaviour: OTel span wrap with cost, model
// allowlist 403 → ModelAccessDeniedError, Gemini 2.5 maxTokens skip,
// model caching, and native /v1/embeddings.
// =============================================================================

/**
 * LiteLLM Provider — direct HTTP, no AI SDK. Talks to a LiteLLM proxy
 * server (or any deployment that speaks OpenAI chat-completions + the
 * `/v1/models` and `/v1/embeddings` endpoints).
 */
export class LiteLLMProvider extends BaseProvider {
  private config: { baseURL: string; apiKey: string };
  private credentials?: { apiKey?: string; baseURL?: string };
  private resolvedModel?: string;

  private static modelsCache: string[] = [];
  private static modelsCacheTime = 0;
  private static readonly MODELS_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: { apiKey?: string; baseURL?: string },
  ) {
    super(modelName, "litellm" as AIProviderName, sdk as NeuroLink | undefined);

    this.credentials = credentials;
    const envConfig = getLiteLLMConfig();
    this.config = {
      baseURL: credentials?.baseURL ?? envConfig.baseURL,
      apiKey: credentials?.apiKey ?? envConfig.apiKey,
    };

    logger.debug("LiteLLM Provider initialized", {
      modelName: this.modelName,
      provider: this.providerName,
      baseURL: this.config.baseURL,
    });
  }

  protected getProviderName(): AIProviderName {
    return "litellm" as AIProviderName;
  }

  protected getDefaultModel(): string {
    return getDefaultLiteLLMModel();
  }

  /**
   * Abstract from BaseProvider — used by the parent's generate() path which
   * still goes through `generateText`. Returns a thin LanguageModelV3-shaped
   * object that delegates to the same HTTP helpers used by executeStream.
   */
  protected async getAISDKModel(): Promise<LanguageModel> {
    const modelId = await this.resolveModelName();
    return this.buildDelegatingModel(modelId) as unknown as LanguageModel;
  }

  private async resolveModelName(): Promise<string> {
    if (this.resolvedModel) {
      return this.resolvedModel;
    }
    const explicit = this.modelName || getDefaultLiteLLMModel();
    if (explicit && explicit.trim() !== "") {
      this.resolvedModel = explicit;
      if (this.modelName !== explicit) {
        this.refreshHandlersForModel(explicit);
      }
      return explicit;
    }
    this.resolvedModel = FALLBACK_LITELLM_MODEL;
    this.refreshHandlersForModel(FALLBACK_LITELLM_MODEL);
    return FALLBACK_LITELLM_MODEL;
  }

  /**
   * Returns a minimal V3-shaped model. Only used by BaseProvider's
   * `generate()` non-streaming path which still relies on the parent's
   * `generateText`. The streaming path bypasses this entirely.
   */
  private buildDelegatingModel(modelId: string): unknown {
    const url = `${stripTrailingSlash(this.config.baseURL)}/chat/completions`;
    const fetchImpl = createProxyFetch();
    const apiKey = this.config.apiKey;
    const providerName = this.providerName;
    const getTimeoutForOptions = (
      opts: Record<string, unknown> | undefined,
    ): number => this.getTimeout((opts ?? {}) as never);
    const gemini25Skip = isGemini25Model(modelId);

    return {
      specificationVersion: "v3",
      provider: "litellm",
      modelId,
      supportedUrls: {},
      doGenerate: async (
        options: {
          prompt: unknown[];
          abortSignal?: AbortSignal;
          maxOutputTokens?: number;
          temperature?: number;
          topP?: number;
          presencePenalty?: number;
          frequencyPenalty?: number;
          seed?: number;
          stopSequences?: string[];
          tools?: OpenAICompatV3CallTools;
          toolChoice?: OpenAICompatV3CallToolChoice;
          responseFormat?: {
            type: "text" | "json";
            schema?: Record<string, unknown>;
            name?: string;
            description?: string;
          };
        } & Record<string, unknown>,
      ) => {
        const messages = messageBuilderToOpenAI(
          options.prompt as OpenAICompatMessage[],
        );
        const body = buildBody({
          modelId,
          messages,
          options: {
            maxTokens: gemini25Skip ? undefined : options.maxOutputTokens,
            temperature: options.temperature,
            topP: options.topP,
            presencePenalty: options.presencePenalty,
            frequencyPenalty: options.frequencyPenalty,
            seed: options.seed,
            stopSequences: options.stopSequences,
          },
          tools: v3ToolsToOpenAI(options.tools),
          ...(options.toolChoice
            ? { toolChoice: v3ToolChoiceToOpenAI(options.toolChoice) }
            : {}),
          streaming: false,
          ...(options.responseFormat
            ? {
                responseFormat: v3ResponseFormatToOpenAI(
                  options.responseFormat,
                ),
              }
            : {}),
        });
        const timeoutController = createTimeoutController(
          getTimeoutForOptions(options),
          providerName,
          "generate",
        );
        const composedSignal = composeAbortSignals(
          options.abortSignal,
          timeoutController?.controller.signal,
        );
        let res: Response;
        try {
          res = await fetchImpl(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(body),
            ...(composedSignal ? { signal: composedSignal } : {}),
          });
        } finally {
          timeoutController?.cleanup();
        }
        if (!res.ok) {
          throw await buildAPIError(url, body, res);
        }
        const json = (await res.json()) as OpenAICompatChatResponse;
        const choice = json.choices?.[0];
        const text =
          (typeof choice?.message?.content === "string"
            ? choice.message.content
            : "") ?? "";
        const content: Array<{ type: string } & Record<string, unknown>> = [];
        if (text.length > 0) {
          content.push({ type: "text", text });
        }
        for (const tc of choice?.message?.tool_calls ?? []) {
          content.push({
            type: "tool-call",
            toolCallId: tc.id,
            toolName: tc.function.name,
            input: tc.function.arguments ?? "",
          });
        }
        const rawFinish = choice?.finish_reason;
        const unified =
          rawFinish === "length"
            ? "length"
            : rawFinish === "tool_calls" || rawFinish === "function_call"
              ? "tool-calls"
              : rawFinish === "content_filter"
                ? "content-filter"
                : "stop";
        return {
          content,
          finishReason: { unified, raw: rawFinish ?? "stop" },
          usage: {
            inputTokens: {
              total: json.usage?.prompt_tokens,
              noCache: json.usage?.prompt_tokens,
              cacheRead: undefined,
              cacheWrite: undefined,
            },
            outputTokens: {
              total: json.usage?.completion_tokens,
              text: json.usage?.completion_tokens,
              reasoning: undefined,
            },
          },
          warnings: [],
          request: { body },
          response: {
            ...(json.id ? { id: json.id } : {}),
            ...(json.model ? { modelId: json.model } : {}),
            headers: {},
            body: json,
          },
        };
      },
      doStream: () => {
        throw new Error(
          "litellm: doStream is not implemented on the delegating model — the streaming path uses executeStream directly.",
        );
      },
    };
  }

  public formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new NetworkError(
        `Request timed out: ${error.message}`,
        this.providerName,
      );
    }

    const errorRecord = error as UnknownRecord;
    if (
      errorRecord?.name === "TimeoutError" ||
      (typeof errorRecord?.message === "string" &&
        errorRecord.message.toLowerCase().includes("timeout"))
    ) {
      return new NetworkError(
        `Request timed out: ${errorRecord?.message || "Unknown timeout"}`,
        this.providerName,
      );
    }
    if (typeof errorRecord?.message === "string") {
      if (
        errorRecord.message.includes("ECONNREFUSED") ||
        errorRecord.message.includes("Failed to fetch")
      ) {
        return new NetworkError(
          "LiteLLM proxy server not available. Please start the LiteLLM proxy server at " +
            `${process.env.LITELLM_BASE_URL || "http://localhost:4000"}`,
          this.providerName,
        );
      }

      // Curator P1-1: detect "team not allowed to access model" responses and
      // surface as ModelAccessDeniedError with the allowed_models array parsed
      // from the body. Must run before the generic "API key" check because
      // LiteLLM phrases this as a 403 distinct from auth.
      if (isModelAccessDeniedMessage(errorRecord.message)) {
        return new ModelAccessDeniedError(errorRecord.message, {
          provider: this.providerName,
          requestedModel: this.modelName,
          allowedModels: parseAllowedModels(errorRecord.message),
        });
      }

      if (
        errorRecord.message.includes("API_KEY_INVALID") ||
        errorRecord.message.includes("Invalid API key")
      ) {
        return new AuthenticationError(
          "Invalid LiteLLM configuration. Please check your LITELLM_API_KEY environment variable.",
          this.providerName,
        );
      }

      if (errorRecord.message.toLowerCase().includes("rate limit")) {
        return new RateLimitError(
          "LiteLLM rate limit exceeded. Please try again later.",
          this.providerName,
        );
      }

      if (
        errorRecord.message.toLowerCase().includes("model") &&
        errorRecord.message.toLowerCase().includes("not found")
      ) {
        return new InvalidModelError(
          `Model '${this.modelName}' not available in LiteLLM proxy. ` +
            "Please check your LiteLLM configuration and ensure the model is configured.",
          this.providerName,
        );
      }
    }

    return new ProviderError(
      `LiteLLM error: ${errorRecord?.message || "Unknown error"}`,
      this.providerName,
    );
  }

  supportsTools(): boolean {
    return true;
  }

  /**
   * Streaming path — drives the LiteLLM proxy directly. No streamText, no
   * AI SDK orchestrator. Tool calls, multi-step loops, telemetry, abort
   * handling all inline. OTel span captures gen_ai.system + cost.
   */
  protected async executeStream(
    options: StreamOptions,
    _analysisSchema?: ZodUnknownSchema | Schema<unknown>,
  ): Promise<StreamResult> {
    this.validateStreamOptions(options);

    const startTime = Date.now();
    const timeout = this.getTimeout(options);
    const timeoutController = createTimeoutController(
      timeout,
      this.providerName,
      "stream",
    );
    const consumerAbortController = new AbortController();
    const abortSignal = mergeAbortSignals([
      options.abortSignal,
      timeoutController?.controller.signal,
      consumerAbortController.signal,
    ]).signal;

    let modelId: string;
    let toolsRecord: Record<string, Tool>;
    let openAITools: OpenAICompatChatTool[] | undefined;
    let openAIToolChoice: OpenAICompatToolChoiceWire | undefined;
    let conversation: OpenAICompatChatMessage[];
    try {
      modelId = await this.resolveModelName();
      const shouldUseTools = !options.disableTools && this.supportsTools();
      toolsRecord = shouldUseTools
        ? (options.tools as Record<string, Tool>) || (await this.getAllTools())
        : {};
      openAITools = shouldUseTools
        ? buildToolsForOpenAI(toolsRecord)
        : undefined;
      openAIToolChoice = mapNeuroLinkToolChoice(
        resolveToolChoice(options, toolsRecord, shouldUseTools),
      );

      const initialMessages = await this.buildMessagesForStream(options);
      conversation = messageBuilderToOpenAI(
        initialMessages as OpenAICompatMessage[],
      );
    } catch (setupErr) {
      timeoutController?.cleanup();
      throw setupErr;
    }

    const url = `${stripTrailingSlash(this.config.baseURL)}/chat/completions`;
    const fetchImpl = createProxyFetch();

    const maxSteps = options.maxSteps || DEFAULT_MAX_STEPS;
    const emitter = this.neurolink?.getEventEmitter();

    const toolsUsed: string[] = [];
    const toolExecutionSummaries: ToolExecutionSummaryInternal[] = [];

    const { usagePromise, finishPromise, resolveUsage, resolveFinish } =
      createDeferredAnalytics();
    const { pushChunk, nextChunk } = createChunkQueue();

    // Wrap the stream in an OTel span to capture provider-level latency,
    // token usage, finish reason, and cost. Matches the pre-migration
    // behaviour where streamText was wrapped in `neurolink.provider.streamText`.
    const streamSpan = streamTracer.startSpan("neurolink.provider.streamText", {
      kind: SpanKind.CLIENT,
      attributes: {
        "gen_ai.system": "litellm",
        "gen_ai.request.model": modelId,
      },
    });

    // Model-specific maxTokens handling — Gemini 2.5 models have known issues
    // with maxTokens being forwarded. Mutate a shallow copy so the original
    // StreamOptions reference downstream (analytics, telemetry) is unchanged.
    const requestOptions: StreamOptions = isGemini25Model(modelId)
      ? { ...options, maxTokens: undefined }
      : options;
    if (
      requestOptions !== options &&
      options.maxTokens &&
      logger.shouldLog("debug")
    ) {
      logger.debug(
        `LiteLLM: Skipping maxTokens for Gemini 2.5 model (known compatibility issue)`,
        { modelId, requestedMaxTokens: options.maxTokens },
      );
    }

    const loopPromise = this.runStreamLoop({
      maxSteps,
      modelId,
      url,
      apiKey: this.config.apiKey,
      fetchImpl,
      abortSignal,
      options: requestOptions,
      conversation,
      openAITools,
      openAIToolChoice,
      toolsRecord,
      emitter,
      toolsUsed,
      toolExecutionSummaries,
      pushChunk,
      resolveUsage,
      resolveFinish,
    });

    // Wire the OTel span lifecycle to the deferred analytics promises.
    let capturedProviderError: unknown;
    const captureProviderError = (error: unknown) => {
      capturedProviderError = error;
    };

    usagePromise
      .then((usage) => {
        streamSpan.setAttribute(
          "gen_ai.usage.input_tokens",
          usage.promptTokens,
        );
        streamSpan.setAttribute(
          "gen_ai.usage.output_tokens",
          usage.completionTokens,
        );
        const cost = calculateCost(this.providerName, this.modelName, {
          input: usage.promptTokens,
          output: usage.completionTokens,
          total: usage.totalTokens,
        });
        if (cost && cost > 0) {
          streamSpan.setAttribute("neurolink.cost", cost);
        }
      })
      .catch(() => {
        // usage may never resolve if the stream is aborted before completion
      });
    finishPromise
      .then((reason) => {
        streamSpan.setAttribute(
          "gen_ai.response.finish_reason",
          reason || "unknown",
        );
        if (reason === "error") {
          streamSpan.setStatus({
            code: SpanStatusCode.ERROR,
            message:
              capturedProviderError instanceof Error
                ? capturedProviderError.message
                : String(capturedProviderError ?? "stream error"),
          });
        }
        streamSpan.end();
      })
      .catch(() => {
        streamSpan.end();
      });

    const transformedStream = async function* () {
      let contentYielded = 0;
      try {
        for (;;) {
          const chunk = await nextChunk();
          if ("done" in chunk) {
            break;
          }
          if (
            "content" in chunk &&
            typeof chunk.content === "string" &&
            chunk.content.length > 0
          ) {
            contentYielded++;
          }
          yield chunk;
        }
        await loopPromise;
        if (contentYielded === 0 && toolsUsed.length === 0) {
          logger.warn(
            "LiteLLM: Stream produced no output — emitting enriched sentinel",
          );
          const fauxNoOutput = new NoOutputGeneratedError({
            message: "Stream produced no output",
          });
          const sentinel = await buildNoOutputSentinel(
            fauxNoOutput,
            undefined,
            capturedProviderError,
          );
          stampNoOutputSpan(sentinel);
          yield sentinel as { content: string };
        }
      } catch (streamError) {
        if (NoOutputGeneratedError.isInstance(streamError)) {
          const sentinel = await buildNoOutputSentinel(
            streamError,
            undefined,
            capturedProviderError,
          );
          stampNoOutputSpan(sentinel);
          yield sentinel as { content: string };
          return;
        }
        const sentinel = await buildNoOutputSentinel(
          streamError,
          undefined,
          capturedProviderError,
        );
        stampNoOutputSpan(sentinel);
        yield sentinel as { content: string };
        throw streamError;
      } finally {
        if (!consumerAbortController.signal.aborted) {
          consumerAbortController.abort();
        }
      }
    };

    const result: StreamResult = {
      stream: transformedStream(),
      provider: this.providerName,
      model: this.modelName,
      analytics: streamAnalyticsCollector.createAnalytics(
        this.providerName,
        this.modelName,
        {
          textStream: (async function* () {})(),
          usage: usagePromise,
          finishReason: finishPromise,
        } as never,
        Date.now() - startTime,
        {
          requestId:
            (options as { requestId?: string }).requestId ??
            `litellm-stream-${Date.now()}`,
          streamingMode: true,
        },
      ),
      toolsUsed,
      metadata: {
        startTime,
        streamId: `litellm-${Date.now()}`,
      },
    };
    Object.defineProperty(result, "toolExecutions", {
      enumerable: true,
      configurable: true,
      get: () =>
        transformToolExecutions(
          toolExecutionSummaries.map((s) => ({
            toolName: s.toolName,
            input: s.input,
            output: s.output,
            duration: s.endTime.getTime() - s.startTime.getTime(),
          })),
        ),
    });

    loopPromise
      .finally(() => timeoutController?.cleanup())
      .catch((error) => {
        captureProviderError(error);
      });

    return result;
  }

  private async runStreamLoop(args: StreamLoopArgs): Promise<{
    finishReason: string;
    usage: OpenAICompatChatResponse["usage"];
  }> {
    const {
      maxSteps,
      modelId,
      url,
      apiKey,
      fetchImpl,
      abortSignal,
      options,
      conversation,
      openAITools,
      openAIToolChoice,
      toolsRecord,
      emitter,
      toolsUsed,
      toolExecutionSummaries,
      pushChunk,
      resolveUsage,
      resolveFinish,
    } = args;

    try {
      let stepFinish: OpenAICompatChatChoice["finish_reason"] = null;
      let stepUsage: OpenAICompatChatResponse["usage"] | undefined;

      for (let step = 0; step < maxSteps; step++) {
        const stepResult = await this.streamOneStep({
          modelId,
          url,
          apiKey,
          fetchImpl,
          abortSignal,
          options,
          conversation,
          openAITools,
          openAIToolChoice,
          pushChunk,
        });
        stepFinish = stepResult.finishReason;
        if (stepResult.usage) {
          stepUsage = mergeUsage(stepUsage, stepResult.usage);
        }

        if (stepResult.toolCalls.size === 0) {
          break;
        }

        await this.executeToolBatch({
          stepResult,
          conversation,
          toolsRecord,
          emitter,
          toolsUsed,
          toolExecutionSummaries,
          options,
        });
      }

      resolveUsage({
        promptTokens: stepUsage?.prompt_tokens ?? 0,
        completionTokens: stepUsage?.completion_tokens ?? 0,
        totalTokens: stepUsage?.total_tokens ?? 0,
      });
      resolveFinish(stepFinish ?? "stop");
      pushChunk({ done: true });
      return {
        finishReason: stepFinish ?? "stop",
        usage: stepUsage,
      };
    } catch (err) {
      logger.error("LiteLLM: Stream error", {
        error: err instanceof Error ? err.message : String(err),
      });
      resolveUsage({ promptTokens: 0, completionTokens: 0, totalTokens: 0 });
      resolveFinish("error");
      pushChunk({ done: true });
      throw err;
    }
  }

  private async streamOneStep(args: {
    modelId: string;
    url: string;
    apiKey: string;
    fetchImpl: typeof fetch;
    abortSignal: AbortSignal | undefined;
    options: StreamOptions;
    conversation: OpenAICompatChatMessage[];
    openAITools: OpenAICompatChatTool[] | undefined;
    openAIToolChoice: OpenAICompatToolChoiceWire | undefined;
    pushChunk: (chunk: OpenAICompatStreamChunk) => void;
  }): Promise<OpenAICompatSSEResult> {
    const body = buildBody({
      modelId: args.modelId,
      messages: args.conversation,
      options: args.options,
      tools: args.openAITools,
      ...(args.openAIToolChoice !== undefined
        ? { toolChoice: args.openAIToolChoice }
        : {}),
      streaming: true,
    });
    const res = await args.fetchImpl(args.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${args.apiKey}`,
      },
      body: JSON.stringify(body),
      ...(args.abortSignal ? { signal: args.abortSignal } : {}),
    });
    if (!res.ok) {
      throw await buildAPIError(args.url, body, res);
    }
    if (!res.body) {
      throw new Error("litellm: stream response had no body");
    }
    return parseSSEStream(res.body, (delta) => {
      args.pushChunk({ content: delta });
    });
  }

  private async executeToolBatch(args: {
    stepResult: OpenAICompatSSEResult;
    conversation: OpenAICompatChatMessage[];
    toolsRecord: Record<string, Tool>;
    emitter: ReturnType<NeuroLink["getEventEmitter"]> | undefined;
    toolsUsed: string[];
    toolExecutionSummaries: ToolExecutionSummaryInternal[];
    options: StreamOptions;
  }): Promise<void> {
    const {
      stepResult,
      conversation,
      toolsRecord,
      emitter,
      toolsUsed,
      toolExecutionSummaries,
      options,
    } = args;

    const toolCallsForMessage: OpenAICompatToolCallWire[] = [];
    for (const [, t] of stepResult.toolCalls) {
      toolCallsForMessage.push({
        id: t.id,
        type: "function",
        function: { name: t.name, arguments: t.argsBuffered },
      });
    }
    conversation.push({
      role: "assistant",
      content: stepResult.text.length > 0 ? stepResult.text : null,
      tool_calls: toolCallsForMessage,
    });

    for (const [, t] of stepResult.toolCalls) {
      const startedAt = new Date();
      let input: unknown;
      try {
        input = JSON.parse(t.argsBuffered || "{}");
      } catch {
        input = t.argsBuffered;
      }
      let output: unknown;
      let errorMsg: string | undefined;
      const toolDef = toolsRecord[t.name];
      emitter?.emit("tool:start", {
        toolName: t.name,
        toolCallId: t.id,
        input,
      });
      if (!toolDef || typeof toolDef.execute !== "function") {
        errorMsg = `Tool '${t.name}' is not registered.`;
        output = { error: errorMsg };
      } else {
        try {
          output = await toolDef.execute(input as never, {} as never);
        } catch (err) {
          errorMsg = err instanceof Error ? err.message : String(err);
          output = { error: errorMsg };
        }
      }
      const endedAt = new Date();
      toolsUsed.push(t.name);
      toolExecutionSummaries.push({
        toolCallId: t.id,
        toolName: t.name,
        input,
        output,
        ...(errorMsg ? { error: errorMsg } : {}),
        startTime: startedAt,
        endTime: endedAt,
      });
      conversation.push({
        role: "tool",
        tool_call_id: t.id,
        content: stringifyToolOutput(output),
      });
    }

    const justExecuted = toolExecutionSummaries.slice(
      -stepResult.toolCalls.size,
    );
    emitToolEndFromStepFinish(
      emitter,
      justExecuted.map((s) => ({
        toolName: s.toolName,
        output: s.output,
        ...(s.error ? { error: s.error } : {}),
      })),
    );
    try {
      await this.handleToolExecutionStorage(
        justExecuted.map((s) => ({
          toolCallId: s.toolCallId,
          toolName: s.toolName,
          input: s.input as never,
          output: s.output,
        })) as never,
        justExecuted.map((s) => ({
          toolCallId: s.toolCallId,
          toolName: s.toolName,
          output: s.output,
        })) as never,
        options,
        new Date(),
      );
    } catch (err) {
      logger.warn("[LiteLLMProvider] Failed to store tool executions", {
        provider: this.providerName,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Generate an embedding for a single text input via native /v1/embeddings.
   */
  async embed(text: string, modelName?: string): Promise<number[]> {
    const embeddingModelName =
      modelName ||
      process.env.LITELLM_EMBEDDING_MODEL ||
      "gemini-embedding-001";

    const [embedding] = await this.callEmbeddings(
      embeddingModelName,
      [text],
      "embed",
    );
    return embedding;
  }

  /**
   * Generate embeddings for multiple text inputs via native /v1/embeddings.
   */
  async embedMany(texts: string[], modelName?: string): Promise<number[][]> {
    const embeddingModelName =
      modelName ||
      process.env.LITELLM_EMBEDDING_MODEL ||
      "gemini-embedding-001";

    return this.callEmbeddings(embeddingModelName, texts, "embedMany");
  }

  private async callEmbeddings(
    modelName: string,
    input: string[],
    operation: "embed" | "embedMany",
  ): Promise<number[][]> {
    const url = `${stripTrailingSlash(this.config.baseURL)}/embeddings`;
    const fetchImpl = createProxyFetch();
    const timeoutController = createTimeoutController(
      30_000,
      this.providerName,
      "generate",
    );
    try {
      const res = await fetchImpl(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          input: input.length === 1 ? input[0] : input,
        }),
        ...(timeoutController?.controller.signal
          ? { signal: timeoutController.controller.signal }
          : {}),
      });
      if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        const parsed = bodyText
          ? (JSON.parse(bodyText) as {
              error?: { message?: string };
            })
          : undefined;
        return this.formatProviderError(
          new Error(
            parsed?.error?.message ||
              `LiteLLM ${operation} failed with status ${res.status}`,
          ),
        );
      }
      const json = (await res.json()) as {
        data?: Array<{ embedding?: number[] }>;
      };
      const embeddings = (json.data ?? [])
        .map((row) => row.embedding)
        .filter((e): e is number[] => Array.isArray(e));
      if (embeddings.length === 0) {
        throw new ProviderError(
          `LiteLLM ${operation} returned no embeddings`,
          this.providerName,
        );
      }
      return embeddings;
    } finally {
      timeoutController?.cleanup();
    }
  }

  /**
   * Get available models from LiteLLM proxy `/v1/models` endpoint.
   * Caches results for 10 minutes; falls back to env-driven list or a
   * minimal safe default if the API fetch fails.
   */
  async getAvailableModels(): Promise<string[]> {
    const now = Date.now();

    if (
      LiteLLMProvider.modelsCache.length > 0 &&
      now - LiteLLMProvider.modelsCacheTime <
        LiteLLMProvider.MODELS_CACHE_DURATION
    ) {
      logger.debug("[LiteLLMProvider.getAvailableModels] Using cached models", {
        cacheAge: Math.round((now - LiteLLMProvider.modelsCacheTime) / 1000),
        modelCount: LiteLLMProvider.modelsCache.length,
      });
      return LiteLLMProvider.modelsCache;
    }

    try {
      const dynamicModels = await this.fetchModelsFromAPI();
      if (dynamicModels.length > 0) {
        LiteLLMProvider.modelsCache = dynamicModels;
        LiteLLMProvider.modelsCacheTime = now;
        return dynamicModels;
      }
    } catch (error) {
      logger.warn(
        "[LiteLLMProvider.getAvailableModels] Failed to fetch models from API, using fallback",
        { error: error instanceof Error ? error.message : String(error) },
      );
    }

    return this.getFallbackModels();
  }

  async getFirstAvailableModel(): Promise<string> {
    const models = await this.getAvailableModels();
    return models[0] || FALLBACK_LITELLM_MODEL;
  }

  private getFallbackModels(): string[] {
    return (
      process.env.LITELLM_FALLBACK_MODELS?.split(",")
        .map((m) => m.trim())
        .filter((m) => m.length > 0) || [
        "openai/gpt-4o",
        "anthropic/claude-3-haiku",
        "meta-llama/llama-3.1-8b-instruct",
        "google/gemini-2.5-flash",
      ]
    );
  }

  private async fetchModelsFromAPI(): Promise<string[]> {
    const modelsUrl = `${stripTrailingSlash(this.config.baseURL)}/v1/models`;
    const proxyFetch = createProxyFetch();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await proxyFetch(modelsUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = (await response.json()) as {
        data?: Array<{ id?: string }>;
      };
      if (!Array.isArray(data.data)) {
        throw new Error("Invalid response format: expected data.data array");
      }
      return data.data
        .map((m) => m.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
        .sort();
    } catch (error) {
      if (isAbortError(error)) {
        throw new NetworkError(
          "Request timed out after 5 seconds",
          this.providerName,
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
