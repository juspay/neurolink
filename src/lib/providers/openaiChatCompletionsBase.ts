/**
 * Abstract base class for providers that talk to an OpenAI chat-completions
 * shaped HTTP endpoint. Owns the entire request/stream/tool-loop pipeline
 * so concrete providers only declare configuration + provider-specific
 * quirks (env var names, default model, error mapping).
 *
 * Currently extended by:
 *   - OpenAICompatibleProvider (generic /v1/chat/completions backend)
 *   - LiteLLMProvider          (LiteLLM proxy server)
 *   - DeepSeekProvider         (api.deepseek.com)
 *
 * Subclasses provide:
 *   - getProviderName() / getDefaultModel() / formatProviderError() (abstract)
 *   - optional overrides: getFallbackModelName, getFallbackModels,
 *     adjustBuildBodyOptions, onStreamStart, getAvailableModels
 *
 * Nothing here imports from "ai" or "@ai-sdk/*". The base class is a
 * direct HTTP client + multi-step tool-execution loop driven by SSE.
 */

import type { AIProviderName } from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
import { streamAnalyticsCollector } from "../core/streamAnalytics.js";
import type { NeuroLink } from "../neurolink.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import type {
  LanguageModel,
  ModelsResponse,
  OpenAICompatBuildBodyArgs,
  OpenAICompatChatChoice,
  OpenAICompatChatMessage,
  OpenAICompatChatRequest,
  OpenAICompatChatResponse,
  OpenAICompatChatTool,
  OpenAICompatMessage,
  OpenAICompatResponseFormat,
  OpenAICompatSSEResult,
  OpenAICompatStreamChunk,
  OpenAICompatStreamLifecycleListeners,
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
  ZodUnknownSchema,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { NoOutputGeneratedError } from "../utils/generationErrors.js";
import {
  buildNoOutputSentinel,
  stampNoOutputSpan,
} from "../utils/noOutputSentinel.js";
import {
  composeAbortSignals,
  createTimeoutController,
  mergeAbortSignals,
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
  ensureJsonWordInBody,
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

/**
 * Abstract HTTP+SSE provider for OpenAI chat-completions-shaped endpoints.
 */
export abstract class OpenAIChatCompletionsProvider extends BaseProvider {
  protected config: { baseURL: string; apiKey: string };
  protected resolvedModel?: string;

  constructor(
    providerName: AIProviderName,
    modelName: string | undefined,
    sdk: unknown,
    config: { baseURL: string; apiKey: string },
  ) {
    super(modelName, providerName, sdk as NeuroLink | undefined);
    this.config = config;
  }

  // ===========================================================================
  // Abstract hooks (subclass MUST implement)
  // ===========================================================================

  protected abstract getProviderName(): AIProviderName;
  protected abstract getDefaultModel(): string;
  protected abstract formatProviderError(error: unknown): Error;

  // ===========================================================================
  // Optional overridable hooks
  // ===========================================================================

  /**
   * Model name to return when `getDefaultModel()` is empty AND
   * auto-discovery via `/models` finds nothing. Default "gpt-3.5-turbo".
   */
  protected getFallbackModelName(): string {
    return "gpt-3.5-turbo";
  }

  /**
   * Hardcoded model names returned from `getAvailableModels()` when the
   * remote `/models` endpoint can't be reached. Default empty.
   */
  protected getFallbackModels(): string[] {
    return [];
  }

  /**
   * Hook to mutate the `buildBody` options before the wire body is
   * constructed. Default identity. Override for model-specific quirks
   * (e.g. LiteLLM's Gemini 2.5 maxTokens skip).
   */
  protected adjustBuildBodyOptions(
    _modelId: string,
    opts: OpenAICompatBuildBodyArgs["options"],
  ): OpenAICompatBuildBodyArgs["options"] {
    return opts;
  }

  /**
   * Hook to adjust the OpenAI `response_format` after it's converted from the
   * V3 responseFormat (non-streaming `doGenerate` path). Default identity.
   * Override for providers that don't support a given format type — e.g.
   * DeepSeek rejects `response_format: { type: "json_schema" }` ("This
   * response_format type is unavailable now"); the `@ai-sdk/openai-compatible`
   * path this replaced declared `supportsStructuredOutputs: false`, which
   * downgraded `json_schema` to `json_object`. Subclasses replicate that here.
   */
  protected adjustResponseFormat(
    rf: OpenAICompatResponseFormat | undefined,
    _modelId: string,
  ): OpenAICompatResponseFormat | undefined {
    return rf;
  }

  /**
   * Hook to adjust the fully-built wire request body before it is sent, on
   * both the streaming and non-streaming paths. Default identity. Override for
   * provider/model quirks that can't be expressed through buildBody options —
   * e.g. Azure's newer reasoning deployments (o-series, gpt-5+) reject
   * `max_tokens` and require `max_completion_tokens`.
   */
  protected adjustRequestBody(
    body: OpenAICompatChatRequest,
    _modelId: string,
  ): OpenAICompatChatRequest {
    return body;
  }

  /**
   * Hook called once at the start of every `executeStream` invocation.
   * Return lifecycle listeners (onUsage / onFinish) to receive deferred
   * analytics events as the stream progresses. Default returns undefined
   * (no extra wiring). LiteLLM uses this for the OTel span wrap with cost.
   */
  protected onStreamStart(
    _modelId: string,
  ): OpenAICompatStreamLifecycleListeners | undefined {
    return undefined;
  }

  /**
   * Returns true if `resolveModelName` should fall back to fetching
   * `getAvailableModels()` and picking the first one when no explicit
   * model is configured. Default true. Subclasses with a non-empty
   * `getDefaultModel()` will never hit this branch anyway.
   */
  protected shouldAutoDiscoverModel(): boolean {
    return true;
  }

  /**
   * Builds the chat-completions request URL for a model. Default is
   * `${baseURL}/chat/completions`. Override for providers with a different
   * routing scheme (e.g. Azure's deployment-based path + api-version query).
   */
  protected getChatCompletionsURL(_modelId: string): string {
    return `${stripTrailingSlash(this.config.baseURL)}/chat/completions`;
  }

  /**
   * Auth headers merged into every request. Default is a Bearer token.
   * Override for providers that authenticate differently (e.g. Azure, which
   * uses an `api-key` header instead of `Authorization: Bearer`).
   */
  protected getAuthHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.config.apiKey}` };
  }

  // ===========================================================================
  // Public/protected concrete methods (shared by all subclasses)
  // ===========================================================================

  supportsTools(): boolean {
    return true;
  }

  /**
   * Health-check hook — part of the documented public provider contract
   * (`docs/provider-integration/00-architecture.md`). Default returns true
   * when an apiKey is configured; local providers (LM Studio, llama.cpp)
   * override this to probe the server's `/models` endpoint.
   */
  async validateConfiguration(): Promise<boolean> {
    return (
      typeof this.config.apiKey === "string" &&
      this.config.apiKey.trim().length > 0
    );
  }

  /**
   * Snapshot of the provider's resolved configuration — part of the documented
   * public provider contract (`docs/provider-integration/00-architecture.md`).
   * Subclasses inherit this; override only to expose extra fields.
   */
  getConfiguration() {
    return {
      provider: this.providerName,
      model: this.modelName,
      defaultModel: this.getDefaultModel(),
      baseURL: this.config.baseURL,
    };
  }

  /**
   * Returns a minimal V3-shaped model used by BaseProvider's `generate()`
   * non-streaming path. Driven by the parent's `generateText`. The
   * streaming path bypasses this entirely.
   */
  protected async getAISDKModel(): Promise<LanguageModel> {
    const modelId = await this.resolveModelName();
    return this.buildDelegatingModel(modelId) as unknown as LanguageModel;
  }

  protected async resolveModelName(): Promise<string> {
    if (this.resolvedModel) {
      return this.resolvedModel;
    }
    const explicit = this.modelName || this.getDefaultModel();
    if (explicit && explicit.trim() !== "") {
      this.resolvedModel = explicit;
      if (this.modelName !== explicit) {
        this.refreshHandlersForModel(explicit);
      }
      return explicit;
    }
    if (this.shouldAutoDiscoverModel()) {
      try {
        const available = await this.getAvailableModels();
        if (available.length > 0) {
          this.resolvedModel = available[0];
          this.refreshHandlersForModel(available[0]);
          logger.info(
            `🔍 Auto-discovered model: ${available[0]} from ${available.length} available models`,
          );
          return available[0];
        }
      } catch (err) {
        logger.warn("Model auto-discovery failed, using fallback:", err);
      }
      // Auto-discovery was attempted but yielded no model (local server/model
      // not up yet, transient probe failure, …). Use the fallback for THIS
      // call but persist NOTHING — not `resolvedModel`, and not `this.modelName`
      // either. `refreshHandlersForModel()` sets `this.modelName = model`, which
      // the explicit branch above would then memoize on the next call, pinning
      // the instance to the fallback and defeating the retry. Returning the
      // bare fallback (it is still used as the wire `modelId`) lets a later
      // call re-probe once the server/model becomes available — matching the
      // pre-migration local providers.
      return this.getFallbackModelName();
    }
    // No auto-discovery for this provider — the fallback is stable, so memoize
    // it (and refresh handlers so telemetry/pricing reflect the resolved name).
    const fallback = this.getFallbackModelName();
    this.resolvedModel = fallback;
    this.refreshHandlersForModel(fallback);
    return fallback;
  }

  private buildDelegatingModel(modelId: string): unknown {
    const url = this.getChatCompletionsURL(modelId);
    const fetchImpl = createProxyFetch();
    const getAuthHeaders = this.getAuthHeaders.bind(this);
    const providerName = this.providerName;
    const adjustBuildBodyOptions = this.adjustBuildBodyOptions.bind(this);
    const adjustResponseFormat = this.adjustResponseFormat.bind(this);
    const adjustRequestBody = this.adjustRequestBody.bind(this);
    const getTimeoutForOptions = (
      opts: Record<string, unknown> | undefined,
    ): number => this.getTimeout((opts ?? {}) as never);

    return {
      specificationVersion: "v3",
      provider: providerName,
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
        const baseMessages = messageBuilderToOpenAI(
          options.prompt as OpenAICompatMessage[],
        );
        const responseFormat = options.responseFormat
          ? adjustResponseFormat(
              v3ResponseFormatToOpenAI(options.responseFormat),
              modelId,
            )
          : undefined;
        // ensureJsonWordInBody runs LAST — on the body after adjustRequestBody —
        // so the json_object word guard reflects whatever a subclass left on
        // the wire (it may rewrite response_format/messages), not an
        // intermediate state.
        const body = ensureJsonWordInBody(
          adjustRequestBody(
            buildBody({
              modelId,
              messages: baseMessages,
              options: adjustBuildBodyOptions(modelId, {
                maxTokens: options.maxOutputTokens,
                temperature: options.temperature,
                topP: options.topP,
                presencePenalty: options.presencePenalty,
                frequencyPenalty: options.frequencyPenalty,
                seed: options.seed,
                stopSequences: options.stopSequences,
              }),
              tools: v3ToolsToOpenAI(options.tools),
              ...(options.toolChoice
                ? { toolChoice: v3ToolChoiceToOpenAI(options.toolChoice) }
                : {}),
              streaming: false,
              ...(responseFormat ? { responseFormat } : {}),
            }),
            modelId,
          ),
        );
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
              ...getAuthHeaders(),
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
          `${providerName}: doStream is not implemented on the delegating model — the streaming path uses executeStream directly.`,
        );
      },
    };
  }

  /**
   * Streaming path — drives the chat-completions endpoint directly. No
   * streamText, no AI SDK orchestrator. Tool calls, multi-step loops,
   * telemetry, abort handling all inline.
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
    // Consumer-driven abort: fires when the async iterator is closed early
    // (caller breaks out of `for await`). Without this the background
    // `loopPromise` keeps reading SSE and running tools indefinitely.
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

    const url = this.getChatCompletionsURL(modelId);
    const fetchImpl = createProxyFetch();

    const maxSteps = options.maxSteps || DEFAULT_MAX_STEPS;
    const emitter = this.neurolink?.getEventEmitter();

    const toolsUsed: string[] = [];
    const toolExecutionSummaries: ToolExecutionSummaryInternal[] = [];

    const { usagePromise, finishPromise, resolveUsage, resolveFinish } =
      createDeferredAnalytics();
    const { pushChunk, nextChunk } = createChunkQueue();

    // Per-provider lifecycle hook (e.g. OTel span wrap for LiteLLM).
    const lifecycle = this.onStreamStart(modelId);

    const loopPromise = this.runStreamLoop({
      maxSteps,
      modelId,
      url,
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
    });

    // Closure-scoped capture: the runStreamLoop's catch block stashes the
    // underlying provider error here so we can pass it through to
    // buildNoOutputSentinel for richer telemetry (matches the pattern in
    // openAI.ts / litellm.ts where onError preserves the upstream cause).
    let capturedProviderError: unknown;
    // Parameter named `error` so the compiled `capturedProviderError = error`
    // assignment matches the regression-grep in test:context 6.14.
    const captureProviderError = (error: unknown) => {
      capturedProviderError = error;
    };

    if (lifecycle?.onUsage) {
      usagePromise.then(lifecycle.onUsage).catch(() => {
        // usage may never resolve if the stream is aborted before completion
      });
    }
    if (lifecycle?.onFinish) {
      finishPromise
        .then((reason) => lifecycle.onFinish?.(reason, capturedProviderError))
        .catch(() => {
          /* swallowed by design — see above */
        });
    }

    const providerName = this.providerName;
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
        // Surface any error that the loop threw after we drained the queue.
        await loopPromise;
        // No-output path: stream completed normally but yielded zero text.
        // Build an enriched sentinel + stamp the active OTel span so
        // Pipeline B (ContextEnricher) surfaces a WARNING-level Langfuse
        // observation instead of silently succeeding.
        if (contentYielded === 0 && toolsUsed.length === 0) {
          logger.warn(
            `${providerName}: Stream produced no output — emitting enriched sentinel`,
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
      model: modelId,
      analytics: streamAnalyticsCollector.createAnalytics(
        this.providerName,
        modelId,
        {
          textStream: (async function* () {})(),
          usage: usagePromise,
          finishReason: finishPromise,
        } as never,
        Date.now() - startTime,
        {
          requestId:
            (options as { requestId?: string }).requestId ??
            `${this.providerName}-stream-${Date.now()}`,
          streamingMode: true,
        },
      ),
      toolsUsed,
      metadata: {
        startTime,
        streamId: `${this.providerName}-${Date.now()}`,
      },
    };
    // Lazy getter: every read transforms the live `toolExecutionSummaries`
    // through the canonical `transformToolExecutions()` so consumers see
    // `{name, input, output, duration}[]` (codebase convention), while still
    // reflecting tools appended during streaming.
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
      logger.error(`${this.providerName}: Stream error`, {
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
    fetchImpl: typeof fetch;
    abortSignal: AbortSignal | undefined;
    options: StreamOptions;
    conversation: OpenAICompatChatMessage[];
    openAITools: OpenAICompatChatTool[] | undefined;
    openAIToolChoice: OpenAICompatToolChoiceWire | undefined;
    pushChunk: (chunk: OpenAICompatStreamChunk) => void;
  }): Promise<OpenAICompatSSEResult> {
    const body = ensureJsonWordInBody(
      this.adjustRequestBody(
        buildBody({
          modelId: args.modelId,
          messages: args.conversation,
          options: this.adjustBuildBodyOptions(args.modelId, args.options),
          tools: args.openAITools,
          ...(args.openAIToolChoice !== undefined
            ? { toolChoice: args.openAIToolChoice }
            : {}),
          streaming: true,
        }),
        args.modelId,
      ),
    );
    const res = await args.fetchImpl(args.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(body),
      ...(args.abortSignal ? { signal: args.abortSignal } : {}),
    });
    if (!res.ok) {
      throw await buildAPIError(args.url, body, res);
    }
    if (!res.body) {
      throw new Error(`${this.providerName}: stream response had no body`);
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
      logger.warn(
        `[${this.constructor.name}] Failed to store tool executions`,
        {
          provider: this.providerName,
          error: err instanceof Error ? err.message : String(err),
        },
      );
    }
  }

  /**
   * Default implementation hits `${baseURL}/models`. Subclasses with a
   * different endpoint path, caching, or fallback strategy should override.
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const modelsUrl = `${stripTrailingSlash(this.config.baseURL)}/models`;
      logger.debug(`Fetching available models from: ${modelsUrl}`);

      const proxyFetch = createProxyFetch();
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 5000);
      const response = await proxyFetch(modelsUrl, {
        headers: {
          ...this.getAuthHeaders(),
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });
      clearTimeout(t);

      if (!response.ok) {
        logger.warn(
          `Models endpoint returned ${response.status}: ${response.statusText}`,
        );
        return this.getFallbackModels();
      }

      const data: ModelsResponse = await response.json();

      if (!data.data || !Array.isArray(data.data)) {
        logger.warn("Invalid models response format");
        return this.getFallbackModels();
      }

      const models = data.data.map((model) => model.id).filter(Boolean);
      if (logger.shouldLog("debug")) {
        logger.debug(`Discovered ${models.length} models:`, models);
      }

      return models.length > 0 ? models : this.getFallbackModels();
    } catch (error) {
      logger.warn(
        `[${this.constructor.name}] Failed to fetch models from endpoint:`,
        error,
      );
      return this.getFallbackModels();
    }
  }

  async getFirstAvailableModel(): Promise<string> {
    const models = await this.getAvailableModels();
    return models[0] || this.getFallbackModelName();
  }
}
