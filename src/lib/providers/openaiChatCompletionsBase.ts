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

import { trace } from "@opentelemetry/api";
import type { AIProviderName } from "../constants/enums.js";
import {
  getAvailableInputTokens,
  getRuntimeContextWindow,
  getRuntimeOutputCeiling,
  registerRuntimeContextWindow,
} from "../constants/contextWindows.js";
import { guardOpenAICompatConversation } from "../context/openaiCompatLoopGuard.js";
import {
  isContextOverflowError,
  parseProviderOverflowDetails,
} from "../context/errorDetection.js";
import { ContextBudgetExceededError } from "../context/errors.js";
import { BaseProvider } from "../core/baseProvider.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
import { streamAnalyticsCollector } from "../core/streamAnalytics.js";
import type { NeuroLink } from "../neurolink.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import type {
  DeferredUsage,
  LanguageModel,
  LanguageModelV3StreamPart,
  LanguageModelV3,
  LanguageModelV3CallOptions,
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
  EnhancedGenerateResult,
  GenerateStopReason,
  TextGenerationOptions,
  ValidationSchema,
  StreamOptions,
  StreamResult,
  Tool,
  ToolExecutionSummaryInternal,
  ZodUnknownSchema,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { redactUrlCredentials } from "../utils/logSanitize.js";
import { NoOutputGeneratedError } from "../utils/generationErrors.js";
import {
  buildNoOutputSentinel,
  stampNoOutputSpan,
} from "../utils/noOutputSentinel.js";
import {
  composeAbortSignalsScoped,
  createTimeoutController,
  mergeAbortSignals,
} from "../utils/timeout.js";
import { emitToolEndFromStepFinish } from "../utils/toolEndEmitter.js";
import { resolveRequestKind } from "../core/resolveRequestKind.js";
import {
  appendJsonSchemaInstruction,
  hasNativeDoGenerate,
  runNativeGenerateLoop,
} from "../core/nativeGenerateLoop.js";
import { resolveToolExecutionRecords } from "../core/toolExecutionRecorder.js";
import { convertZodToJsonSchema } from "../utils/schemaConversion.js";
import { coerceJsonToSchema, schemaAccepts } from "../utils/json/coerce.js";
import { resolveToolChoice } from "../utils/toolChoice.js";
import { transformToolExecutions } from "../utils/transformationUtils.js";
import { withProviderRetry } from "../utils/providerRetry.js";
import {
  isSchemaComplexityError,
  isToolsSchemaConflictError,
} from "../core/modules/structuredOutputPolicy.js";
import { resolveDeferredTool } from "../tools/toolDiscovery.js";
import {
  buildAPIError,
  buildBody,
  buildToolsForOpenAI,
  buildWireToolNameMaps,
  createDeferredAnalytics,
  ensureJsonWordInBody,
  estimateWireTokens,
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
import { createStreamChannel } from "../core/streamChannel.js";

/**
 * Safety margin (tokens) when fitting `max_tokens` to a runtime-discovered
 * context window: the char-based input estimate and the backend's own prompt
 * framing differ by a few hundred tokens, so an exact fit would still 400.
 */
const WINDOW_FIT_MARGIN_TOKENS = 512;

/**
 * Abstract HTTP+SSE provider for OpenAI chat-completions-shaped endpoints.
 */

/**
 * Did the model's text yield an object the caller's schema accepts?
 *
 * This is the trigger for the prompt-side structured-output fallback. It asks
 * the question the ai-package's structured-output parser used to ask by
 * throwing: did the native `response_format` attempt actually produce the
 * object. A schema we cannot validate with accepts everything, so an unknown
 * schema never forces a pointless second request.
 */
const yieldsSchemaValidObject = (
  text: string,
  schema: ValidationSchema,
): boolean => {
  const coerced = coerceJsonToSchema(text, schema);
  return coerced !== null && schemaAccepts(schema, coerced.structuredData);
};

// Pull one native chunk at a time and forward cancellation to its iterator.
const chunksToV3Stream = (
  source: AsyncIterable<OpenAICompatStreamChunk>,
  completion: Promise<LanguageModelV3StreamPart>,
  cancel: () => void,
): ReadableStream<LanguageModelV3StreamPart> => {
  const iterator = source[Symbol.asyncIterator]();
  return new ReadableStream<LanguageModelV3StreamPart>({
    async pull(controller) {
      try {
        const next = await iterator.next();
        if (next.done) {
          controller.enqueue(await completion);
          controller.close();
        } else if (next.value.reasoning) {
          controller.enqueue({
            type: "reasoning-delta",
            delta: next.value.reasoning,
          });
        } else {
          controller.enqueue({ type: "text-delta", delta: next.value.content });
        }
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel() {
      cancel();
      await iterator.return?.();
    },
  });
};

async function* v3StreamToChunks(
  stream: ReadableStream<LanguageModelV3StreamPart>,
  onFinish: (
    part: Extract<LanguageModelV3StreamPart, { type: "finish" }>,
  ) => void,
): AsyncIterable<OpenAICompatStreamChunk> {
  const reader = stream.getReader();
  let done = false;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) {
        done = true;
        return;
      }
      const part = next.value;
      if (part.type === "text-delta") {
        yield { content: part.delta };
      } else if (part.type === "reasoning-delta") {
        yield { content: "", reasoning: part.delta };
      } else if (part.type === "finish") {
        onFinish(part);
      } else if (part.type === "error") {
        throw part.error;
      }
    }
  } finally {
    try {
      if (!done) {
        await reader.cancel();
      }
    } finally {
      reader.releaseLock();
    }
  }
}

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
  /**
   * Feed the catalog's `fallbacks` to BaseProvider's invalid-model retry, so
   * a default the vendor has retired degrades to the next live model in the
   * entry instead of failing the call outright.
   */
  protected getModelFallbacks(): string[] {
    return this.getFallbackModels();
  }

  /**
   * `resolvedModel` memoizes the first id this provider resolved, and
   * getAISDKModel() builds its wire model from that memo rather than from
   * `modelName`. Leaving it stale here silently defeats the invalid-model
   * fallback: modelName advances to the next candidate while every request
   * still carries the retired id, so each retry fails for the same reason
   * the first attempt did.
   */
  protected refreshHandlersForModel(model: string): void {
    this.resolvedModel = model;
    super.refreshHandlersForModel(model);
  }

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
   * When true (default), `response_format` is NOT sent on requests that carry
   * tools. The AI SDK sets responseFormat on EVERY step of a tool loop, and
   * generic/proxy backends (LiteLLM→vllm/GLM, openai-compatible, local
   * servers) may silently honor it over tool calling — answering with
   * final-shape JSON on step 1 instead of running the agentic loop. No error
   * is raised, so the runtime tools↔schema conflict detector cannot catch it.
   * The schema is still enforced post-hoc (GenerationHandler coerces the final
   * text against it) — the same contract as the Gemini tools↔schema exclusion.
   * Mirrors the streaming path, which never sends response_format.
   *
   * Backends with first-party support for tools + json_schema in one request
   * (OpenAI, Azure OpenAI) override this to false.
   */
  protected suppressResponseFormatWithTools(): boolean {
    return true;
  }

  /**
   * When true, `doGenerate` puts `stream: true` on the wire and aggregates
   * the SSE stream into the SAME complete result the JSON wire returns —
   * callers still get one awaited result with structuredData coercion, tool
   * calls, finish reason and usage intact. Bytes then flow continuously, so
   * proxy/tunnel idle limits (e.g. Cloudflare's ~100s 524 on tunneled
   * gateways) cannot kill a slow completion, and the request timeout is
   * re-armed on every chunk (idle semantics) instead of capping total
   * duration. Default false: some OpenAI-compatible backends mishandle
   * `stream_options` or omit usage on streams, so each provider opts in
   * deliberately. LiteLLM overrides this to true.
   */
  protected useStreamingWireForGenerate(): boolean {
    return false;
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
   * Hook called when a request fails with HTTP 400. Return a modified body to
   * retry ONCE with it; return undefined (default) to propagate the error
   * unchanged. Applies on both the non-streaming doGenerate path and the
   * streaming path. NVIDIA NIM uses this to strip `chat_template` /
   * `chat_template_kwargs.reasoning_budget` when a model server rejects them,
   * restoring the pre-migration fetch-level retry behavior.
   */
  protected adjustBodyAfter400(
    _body: OpenAICompatChatRequest,
    _error: Error & { statusCode?: number; responseBody?: string },
  ): OpenAICompatChatRequest | undefined {
    return undefined;
  }

  /**
   * Fit the outgoing `max_tokens` to what the target deployment can actually
   * accept, using ONLY runtime-discovered limits — static table values are
   * guesses, and hard-enforcing a guess would falsely reject requests the
   * real deployment accepts:
   *
   *   effective = min(requested, discovered output ceiling,
   *                   discovered window − estimated input − margin)
   *
   * Returns the caller's value untouched when nothing was discovered, and
   * `undefined` when the caller sent nothing and no ceiling is known (the
   * wire then omits max_tokens and the backend applies its own default — no
   * invented numbers). Throws ContextBudgetExceededError when the estimated
   * input ALONE exceeds a discovered window: that request cannot succeed,
   * and failing fast with honest numbers beats a guaranteed provider 400
   * (plus any proxy-side fallback cascade) after a full round-trip.
   */
  protected resolveWireMaxTokens(
    modelId: string,
    requested: number | undefined,
    messages: ReadonlyArray<OpenAICompatChatMessage>,
    tools: OpenAICompatChatTool[] | undefined,
  ): number | undefined {
    const ceiling = getRuntimeOutputCeiling(this.providerName, modelId);
    let effective = requested;
    if (
      ceiling !== undefined &&
      (effective === undefined || effective > ceiling)
    ) {
      if (effective !== undefined) {
        logger.debug(
          `${this.providerName}: clamping max_tokens ${effective} to the advertised ${modelId} output ceiling ${ceiling}`,
        );
      }
      effective = ceiling;
    }
    const window = getRuntimeContextWindow(this.providerName, modelId);
    if (window !== undefined) {
      const estimatedInput = estimateWireTokens(
        messages,
        tools,
        this.providerName,
      );
      const fit = window - estimatedInput - WINDOW_FIT_MARGIN_TOKENS;
      if (fit <= 0) {
        throw new ContextBudgetExceededError(
          `Estimated input (${estimatedInput} tokens) alone exceeds the ` +
            `${this.providerName}/${modelId} context window advertised by ` +
            `the serving infrastructure (${window} tokens). Reduce the ` +
            `prompt/conversation size — no max_tokens value can make this ` +
            `request fit.`,
          {
            estimatedTokens: estimatedInput,
            availableTokens: Math.max(0, window - WINDOW_FIT_MARGIN_TOKENS),
            stagesUsed: [],
            breakdown: {},
          },
        );
      }
      if (effective !== undefined && effective > fit) {
        logger.warn(
          `${this.providerName}: max_tokens ${effective} cannot fit the ` +
            `${modelId} window (${window}) with ~${estimatedInput} input ` +
            `tokens — re-fitting to ${fit}`,
        );
        effective = fit;
      }
    }
    return effective;
  }

  /**
   * Learn from a provider context-overflow 400 and, when possible, produce a
   * corrected body for the one-shot retry slot. Two dynamic effects, zero
   * static data:
   *
   *  - the window stated in the error is registered with the runtime
   *    resolver, so every later budget check / compaction / max_tokens fit
   *    uses the backend's own number — self-healing even when a discovery
   *    endpoint (`/model/info`) is absent or unauthorized;
   *  - when the error also states the real input size (vllm/LiteLLM
   *    phrasing) and the body carried `max_tokens`, it is re-fit to
   *    `window − input − margin` and the request retried once.
   *
   * Returns undefined when the error is not an overflow, or when no smaller
   * `max_tokens` can make the request fit (input alone too large) — the
   * original error then propagates unchanged.
   */
  private correctBodyAfterContextOverflow(
    body: OpenAICompatChatRequest,
    error: Error & { statusCode?: number; responseBody?: string },
  ): OpenAICompatChatRequest | undefined {
    if (!isContextOverflowError(error)) {
      return undefined;
    }
    const details =
      parseProviderOverflowDetails(error) ??
      parseProviderOverflowDetails(error.responseBody);
    if (!details || details.budgetTokens <= 0) {
      return undefined;
    }
    registerRuntimeContextWindow(
      this.providerName,
      body.model,
      details.budgetTokens,
    );
    // When the body carried no max_tokens (server-defaulted output), the
    // vllm/LiteLLM phrasing still states what the backend counted — use it
    // so those requests get a re-fit retry too instead of propagating.
    const previousMaxTokens =
      typeof body.max_tokens === "number"
        ? body.max_tokens
        : details.requestedOutputTokens;
    if (previousMaxTokens === undefined || details.actualTokens <= 0) {
      return undefined;
    }
    const refit =
      details.budgetTokens - details.actualTokens - WINDOW_FIT_MARGIN_TOKENS;
    if (refit <= 0 || refit >= previousMaxTokens) {
      return undefined;
    }
    logger.warn(
      `${this.providerName}: ${body.model} rejected the request as over-window — retrying once with max_tokens re-fit from the provider's own numbers`,
      {
        window: details.budgetTokens,
        inputTokens: details.actualTokens,
        previousMaxTokens,
        refitMaxTokens: refit,
      },
    );
    return { ...body, max_tokens: refit };
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
   * Shared local-runtime reachability probe: GET `${baseURL}/models` with a
   * short timeout, requiring at least one model entry with a non-empty id.
   * Local providers (Ollama, LM Studio, llama.cpp) call this from their own
   * validateConfiguration() override instead of relying on the base class's
   * "apiKey is a non-empty string" default, which can't detect an
   * unreachable local server.
   */
  protected async probeModelsEndpoint(
    headers: Record<string, string> = {},
  ): Promise<boolean> {
    try {
      const url = `${stripTrailingSlash(this.config.baseURL)}/models`;
      const proxyFetch = createProxyFetch();
      const response = await proxyFetch(url, {
        headers: { ...headers, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        return false;
      }
      const data = (await response
        .json()
        .catch(() => null)) as ModelsResponse | null;
      return Boolean(
        data?.data?.some(
          (m) => typeof m?.id === "string" && m.id.trim().length > 0,
        ),
      );
    } catch (error) {
      logger.debug(`[${this.constructor.name}] probeModelsEndpoint failed`, {
        baseURL: redactUrlCredentials(this.config.baseURL),
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
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
    // buildDelegatingModel returns `unknown`, so this is a single
    // unknown-to-target assertion.
    return this.buildDelegatingModel(modelId) as LanguageModel;
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
    const adjustBodyAfter400 = this.adjustBodyAfter400.bind(this);
    const correctBodyAfterContextOverflow =
      this.correctBodyAfterContextOverflow.bind(this);
    const resolveWireMaxTokens = this.resolveWireMaxTokens.bind(this);
    const suppressResponseFormatWithTools =
      this.suppressResponseFormatWithTools.bind(this);
    const useStreamingWireForGenerate =
      this.useStreamingWireForGenerate.bind(this);
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
        // Wire-name mapping: only materializes when at least one tool name
        // is outside the OpenAI-compatible alphabet (see
        // buildWireToolNameMaps) — the common all-valid case is a no-op.
        const wireNameMaps = buildWireToolNameMaps(
          (options.tools ?? [])
            .filter((t) => t.type === "function")
            .map((t) => t.name),
        );
        const baseMessages = messageBuilderToOpenAI(
          options.prompt as OpenAICompatMessage[],
          wireNameMaps?.toWire,
        );
        const hasTools =
          Array.isArray(options.tools) && options.tools.length > 0;
        const responseFormat =
          options.responseFormat &&
          !(hasTools && suppressResponseFormatWithTools())
            ? adjustResponseFormat(
                v3ResponseFormatToOpenAI(options.responseFormat),
                modelId,
              )
            : undefined;
        // ensureJsonWordInBody runs LAST — on the body after adjustRequestBody —
        // so the json_object word guard reflects whatever a subclass left on
        // the wire (it may rewrite response_format/messages), not an
        // intermediate state.
        const wireTools = v3ToolsToOpenAI(options.tools, wireNameMaps?.toWire);
        // Fit max_tokens to the runtime-discovered output ceiling and
        // context window (no-op when nothing was discovered).
        const wireMaxTokens = resolveWireMaxTokens(
          modelId,
          options.maxOutputTokens,
          baseMessages,
          wireTools,
        );
        // SSE wire for generate (opt-in per provider): stream on the wire,
        // aggregate below into the same complete response the JSON wire
        // yields. See useStreamingWireForGenerate.
        const sseWire = useStreamingWireForGenerate();
        const body = ensureJsonWordInBody(
          adjustRequestBody(
            buildBody({
              modelId,
              messages: baseMessages,
              options: adjustBuildBodyOptions(modelId, {
                maxTokens: wireMaxTokens,
                temperature: options.temperature,
                topP: options.topP,
                presencePenalty: options.presencePenalty,
                frequencyPenalty: options.frequencyPenalty,
                seed: options.seed,
                stopSequences: options.stopSequences,
              }),
              tools: wireTools,
              ...(options.toolChoice
                ? {
                    toolChoice: v3ToolChoiceToOpenAI(
                      options.toolChoice,
                      wireNameMaps?.toWire,
                    ),
                  }
                : {}),
              streaming: sseWire,
              ...(responseFormat ? { responseFormat } : {}),
            }),
            modelId,
          ),
        );
        // Per-step timeout: the AI-SDK V3 call options never carry `timeout`,
        // so resolving from them always returned the provider default — a
        // caller's explicit `timeout: "15m"` bounded the outer loop but each
        // step request stayed capped at the default (litellm: 5m). The
        // orchestrator forwards the caller's resolved timeout via
        // providerOptions.neurolink.timeoutMs; prefer it when present.
        const nlStepTimeoutMs = (
          options.providerOptions as
            | { neurolink?: { timeoutMs?: number } }
            | undefined
        )?.neurolink?.timeoutMs;
        const timeoutController = createTimeoutController(
          typeof nlStepTimeoutMs === "number"
            ? nlStepTimeoutMs
            : getTimeoutForOptions(options),
          providerName,
          "generate",
        );
        // Scoped composition: a plain AbortSignal.any per step accumulates
        // registrations on the long-lived generate-call signal for the whole
        // turn (MaxListenersExceededWarning at 10+ steps); dispose() detaches
        // this step's listeners the moment the request settles.
        const { signal: composedSignal, dispose: disposeComposedSignal } =
          composeAbortSignalsScoped(
            options.abortSignal,
            timeoutController?.controller.signal,
          );
        let json: OpenAICompatChatResponse;
        // Whether the response we end up consuming is SSE. Starts as the
        // provider's wire preference; the 400 fallback below can flip it
        // when a backend rejects `stream`/`stream_options` outright.
        let wireIsStreaming = sseWire;
        try {
          let res = await fetchImpl(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...getAuthHeaders(),
            },
            body: JSON.stringify(body),
            ...(composedSignal ? { signal: composedSignal } : {}),
          });
          if (!res.ok) {
            const apiErr = await buildAPIError(url, body, res);
            // One-shot 400 retry. The overflow corrector runs FIRST (it can
            // re-fit max_tokens from the provider's own numbers and also
            // self-heals the runtime window registry); its output then feeds
            // a subclass hook that may strip a rejected field (e.g. NIM's
            // chat_template / reasoning_budget), so a body that needs BOTH
            // fixes gets both — a plain `??` between the two would let
            // whichever ran first silently win and drop the other's fix. The
            // retry runs under the SAME timeout controller as the first
            // attempt, so the configured timeout caps the overall call —
            // matching the streaming path, which reuses its composed signal
            // for the retry.
            const typedErr = apiErr as Error & {
              statusCode?: number;
              responseBody?: string;
            };
            let retryBody =
              res.status === 400
                ? (() => {
                    const overflowCorrected = correctBodyAfterContextOverflow(
                      body,
                      typedErr,
                    );
                    return (
                      adjustBodyAfter400(overflowCorrected ?? body, typedErr) ??
                      overflowCorrected
                    );
                  })()
                : undefined;
            // SSE-wire net: a backend that rejects streaming itself (the 400
            // names `stream`/`stream_options`) gets ONE retry on the plain
            // JSON wire. Gated on the error text so a genuine bad request
            // isn't replayed just to fail identically a second time.
            if (
              !retryBody &&
              sseWire &&
              res.status === 400 &&
              /stream/i.test(typedErr.responseBody ?? "")
            ) {
              const {
                stream: _stream,
                stream_options: _streamOptions,
                ...jsonWireBody
              } = body;
              retryBody = jsonWireBody;
              wireIsStreaming = false;
            }
            if (!retryBody) {
              throw apiErr;
            }
            res = await fetchImpl(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...getAuthHeaders(),
              },
              body: JSON.stringify(retryBody),
              ...(composedSignal ? { signal: composedSignal } : {}),
            });
            if (!res.ok) {
              throw await buildAPIError(url, retryBody, res);
            }
          }
          // Body read stays INSIDE the timeout window: it previously ran
          // after cleanup(), so a response whose headers arrived but whose
          // body stalled mid-transfer was bounded by nothing but the caller's
          // outer wall-clock.
          if (wireIsStreaming) {
            if (!res.body) {
              throw new Error(
                `${providerName}: streaming generate response had no body`,
              );
            }
            // Idle-timeout semantics: every raw chunk re-arms the timeout,
            // so the configured window bounds silence, not total duration —
            // the whole point of the SSE wire is that a slow-but-alive
            // completion keeps the connection (and the timer) fed.
            const monitored = timeoutController
              ? res.body.pipeThrough(
                  new TransformStream<Uint8Array, Uint8Array>({
                    transform(chunk, controller) {
                      timeoutController.reset();
                      controller.enqueue(chunk);
                    },
                  }),
                )
              : res.body;
            const sse = await parseSSEStream(monitored, () => {});
            // Re-shape the aggregate into the JSON-wire response so every
            // line below this point (content parts, finish-reason mapping,
            // usage clamping, response metadata) is shared verbatim between
            // the two wires and cannot drift.
            json = {
              ...(sse.id ? { id: sse.id } : {}),
              ...(sse.model ? { model: sse.model } : {}),
              choices: [
                {
                  index: 0,
                  message: {
                    role: "assistant",
                    content: sse.text.length > 0 ? sse.text : null,
                    ...(sse.reasoning ? { reasoning: sse.reasoning } : {}),
                    ...(sse.toolCalls.size > 0
                      ? {
                          tool_calls: [...sse.toolCalls.values()].map((tc) => ({
                            id: tc.id,
                            type: "function" as const,
                            function: {
                              name: tc.name,
                              arguments: tc.argsBuffered,
                            },
                          })),
                        }
                      : {}),
                  },
                  finish_reason: sse.finishReason ?? "stop",
                },
              ],
              ...(sse.usage ? { usage: sse.usage } : {}),
            };
          } else {
            json = (await res.json()) as OpenAICompatChatResponse;
          }
        } finally {
          timeoutController?.cleanup();
          disposeComposedSignal();
        }
        const choice = json.choices?.[0];
        const text =
          (typeof choice?.message?.content === "string"
            ? choice.message.content
            : "") ?? "";
        const content: Array<{ type: string } & Record<string, unknown>> = [];
        // Reasoner-model output (DeepSeek `reasoning_content`, gateway
        // `reasoning`) becomes a V3 reasoning part ahead of the text part —
        // GenerationHandler joins reasoning parts into `result.reasoning`.
        // `||` so an empty-string reasoning_content falls through to a
        // non-empty `reasoning` field instead of shadowing it.
        const reasoningText =
          choice?.message?.reasoning_content || choice?.message?.reasoning;
        if (typeof reasoningText === "string" && reasoningText.length > 0) {
          content.push({ type: "reasoning", text: reasoningText });
        }
        if (text.length > 0) {
          content.push({ type: "text", text });
        }
        for (const tc of choice?.message?.tool_calls ?? []) {
          content.push({
            type: "tool-call",
            toolCallId: tc.id,
            // Reverse-map wire names so tool lookup/execution and results
            // reported to the caller use the registered names.
            toolName:
              wireNameMaps?.fromWire.get(tc.function.name) ?? tc.function.name,
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
              // cached_tokens is OVERLAPPING (a subset of prompt_tokens), so
              // noCache is the remainder and cacheRead is clamped to the
              // prompt total — some gateways report inconsistent usage where
              // cached_tokens exceeds prompt_tokens (mirrors the
              // reasoning_tokens clamp on the output side below).
              noCache:
                json.usage?.prompt_tokens !== undefined &&
                json.usage?.prompt_tokens_details?.cached_tokens !== undefined
                  ? Math.max(
                      0,
                      json.usage.prompt_tokens -
                        json.usage.prompt_tokens_details.cached_tokens,
                    )
                  : json.usage?.prompt_tokens,
              cacheRead:
                json.usage?.prompt_tokens !== undefined &&
                json.usage?.prompt_tokens_details?.cached_tokens !== undefined
                  ? Math.min(
                      json.usage.prompt_tokens_details.cached_tokens,
                      json.usage.prompt_tokens,
                    )
                  : json.usage?.prompt_tokens_details?.cached_tokens,
              // OpenAI-style APIs do not report cache writes.
              cacheWrite: undefined,
            },
            outputTokens: {
              total: json.usage?.completion_tokens,
              // Clamped at 0 — some gateways report inconsistent usage where
              // reasoning_tokens exceeds completion_tokens.
              text:
                json.usage?.completion_tokens !== undefined &&
                json.usage?.completion_tokens_details?.reasoning_tokens !==
                  undefined
                  ? Math.max(
                      0,
                      json.usage.completion_tokens -
                        json.usage.completion_tokens_details.reasoning_tokens,
                    )
                  : json.usage?.completion_tokens,
              reasoning:
                json.usage?.completion_tokens_details?.reasoning_tokens,
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
  /**
   * Native non-streaming generate.
   *
   * Drives the SAME `doGenerate` the ai loop drove — `buildDelegatingModel`'s,
   * reached through `getAISDKModel()` — and supplies only the multi-step tool
   * iteration around it. That matters: `doGenerate` is where the JSON-versus-SSE
   * wire choice lives (`useStreamingWireForGenerate()`, false by default), along
   * with the 400 retry, the context-overflow refit and the invalid-model
   * fallback. An earlier attempt ran generate through the STREAMING loop
   * instead and silently began sending `stream: true` on a path that had always
   * sent plain JSON; ten providers returned empty content against a
   * non-streaming body and a stream-rejecting backend failed outright. Loop
   * around doGenerate, never around streamOneStep.
   *
   * Tool turns are appended in the message-builder shape, which
   * `messageBuilderToOpenAI` already round-trips: an assistant message carrying
   * `tool-call` parts, then one `tool` message of `tool-result` parts.
   */
  override async generate(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: ValidationSchema,
  ): Promise<EnhancedGenerateResult | null> {
    await this.ensureModelLimits();
    const options = this.normalizeTextOptions(optionsOrPrompt);
    if (resolveRequestKind(options, this.modelName) !== "text") {
      return super.generate(options, analysisSchema);
    }
    this.validateOptions(options);
    const mergedTools = await this.getToolsForStream(options);
    // Reuse BaseProvider's invalid-model fallback. Overriding generate() skips
    // it otherwise, and a retired default stops degrading to the next live
    // model in the catalog entry.
    const callerOwnsFallback =
      "disableInternalFallback" in options &&
      options.disableInternalFallback === true;
    // The native loop bypasses BaseProvider.executeGeneration, so the turn
    // budget has to be composed here or it stops existing for this provider.
    return this.runGenerateWithModelFallback(
      () =>
        this.withTurnTimeout(
          { ...options, tools: mergedTools },
          this.getDescriptorGenerateMs(),
          (timedOptions) => this.executeNativeGenerate(timedOptions),
        ),
      callerOwnsFallback,
    );
  }

  private async executeNativeGenerate(
    options: TextGenerationOptions,
  ): Promise<EnhancedGenerateResult> {
    const startTime = Date.now();
    const modelId = await this.resolveModelName();
    // Middleware must wrap the model here. The native loop bypasses
    // BaseProvider.executeGeneration, and with it the only place middleware was
    // ever applied — a probe showed a caller's wrapGenerate running zero times
    // on every native provider while their onFinish still fired, because
    // onFinish had been special-cased and nothing else had.
    const model = await this.getAISDKModelWithMiddleware(options);
    // Runtime guard rather than an assertion: `LanguageModel` is a union that
    // includes a bare string id, and a double assertion through unknown is
    // banned by Critical Rule 14.
    if (!hasNativeDoGenerate(model)) {
      throw this.handleProviderError(
        new Error(`${this.providerName}: model handle exposes no doGenerate()`),
      );
    }
    const doGenerate = model.doGenerate.bind(model);

    const shouldUseTools = !options.disableTools && this.supportsTools();
    const toolsRecord = shouldUseTools
      ? (options.tools as Record<string, Tool>) || (await this.getAllTools())
      : {};

    // v3 tool shape — the same one doGenerate already converts internally.
    const v3Tools = shouldUseTools
      ? Object.entries(toolsRecord).map(([name, t]) => {
          const tool = t as { description?: string; inputSchema?: unknown };
          return {
            type: "function" as const,
            name,
            description: tool.description ?? "",
            inputSchema: (tool.inputSchema
              ? convertZodToJsonSchema(tool.inputSchema as never)
              : { type: "object", properties: {} }) as Record<string, unknown>,
          };
        })
      : undefined;
    const hasTools = !!v3Tools && v3Tools.length > 0;

    // Structured output rides response_format, which is what Output.object did
    // on the ai path. Suppressed where the provider says the combination with
    // tools is rejected.
    const responseFormat =
      options.schema && !(hasTools && this.suppressResponseFormatWithTools())
        ? {
            type: "json" as const,
            schema: convertZodToJsonSchema(
              options.schema as ZodUnknownSchema,
            ) as Record<string, unknown>,
          }
        : undefined;

    const conversation = (await this.buildMessagesForStream(
      options as StreamOptions,
    )) as Array<Record<string, unknown>>;

    const toolExecutionSummaries: ToolExecutionSummaryInternal[] = [];
    const runLoop = (
      conv: Array<Record<string, unknown>>,
      format: typeof responseFormat,
    ) =>
      runNativeGenerateLoop(
        {
          doGenerate,
          conversation: conv,
          ...(v3Tools ? { tools: v3Tools } : {}),
          toolsRecord,
          ...(hasTools && options.toolChoice
            ? { toolChoice: resolveToolChoice(options, toolsRecord, true) }
            : {}),
          // The per-call `timeout` keeps its per-MODEL-CALL meaning once
          // `turnTimeoutMs` owns the whole-turn deadline, and it reaches the
          // model layer only through this channel. Without it each step fell
          // back to the provider default, so a caller asking for a short
          // per-call timeout got the default on every request.
          ...(typeof options.timeout === "number"
            ? {
                providerOptions: {
                  neurolink: { timeoutMs: options.timeout },
                },
              }
            : {}),
          ...(format ? { responseFormat: format } : {}),
          maxSteps: options.maxSteps || DEFAULT_MAX_STEPS,
          ...(options.maxTokens ? { maxOutputTokens: options.maxTokens } : {}),
          ...(options.temperature !== undefined
            ? { temperature: options.temperature }
            : {}),
          ...(options.abortSignal ? { abortSignal: options.abortSignal } : {}),
          ...(options.toolTimeoutMs !== undefined
            ? { toolTimeoutMs: options.toolTimeoutMs }
            : {}),
          // withProviderRetry + handleProviderError are what the ai loop
          // supplied around each call: without them a 429 surfaces as a raw
          // upstream string instead of a RateLimitError, and a throttle is
          // never retried.
          runStep: (call) =>
            withProviderRetry<Record<string, unknown>>(
              call,
              trace.getActiveSpan() ?? undefined,
              `${this.providerName} generate`,
            ).catch((err) => {
              throw this.handleProviderError(err);
            }),
        },
        toolExecutionSummaries,
      );

    // Structured output rides `response_format` first. When a vendor rejects
    // that outright — a tools/JSON-mode conflict, or a schema its constrained
    // decoder will not accept — the recovery is to ask for the same object in
    // words instead: drop `response_format` and spell the JSON Schema into the
    // system prompt, letting coerceJsonToSchema recover the object from text.
    //
    // Ported from GenerationHandler's `promptJsonInstruction` fallback, which
    // runs this on the ai-package path. That path is unreachable for every
    // provider driven by this loop — GMI Cloud's MiniMax endpoint, the one it
    // was written for, is a Tier-2 catalog provider on this very base class —
    // so without this the recovery would simply not happen for it.
    let loop: Awaited<ReturnType<typeof runNativeGenerateLoop>>;
    try {
      loop = await runLoop(conversation, responseFormat);
    } catch (error) {
      const recoverable =
        responseFormat !== undefined &&
        (isToolsSchemaConflictError(error) || isSchemaComplexityError(error));
      if (!recoverable) {
        throw error;
      }
      logger.warn(
        `[${this.providerName}] provider rejected response_format — retrying with the schema in the system prompt`,
        { provider: this.providerName, model: modelId },
      );
      loop = await runLoop(
        appendJsonSchemaInstruction(conversation, responseFormat.schema),
        undefined,
      );
    }

    // The vendor can also IGNORE `response_format` and answer in prose without
    // erroring at all — GMI Cloud's MiniMax endpoint does exactly that, and it
    // is the case the fallback was written for. On the ai-package path the
    // structured-output parser threw on the unparseable answer, so the catch
    // above was reached; the native loop has no such parser, so the silent
    // case sailed through and handed the caller prose. Same recovery, keyed on
    // the result rather than on an exception.
    if (
      responseFormat !== undefined &&
      options.schema !== undefined &&
      !yieldsSchemaValidObject(loop.text, options.schema as ValidationSchema)
    ) {
      logger.warn(
        `[${this.providerName}] response_format did not yield a schema-valid object — retrying with the schema in the system prompt`,
        { provider: this.providerName, model: modelId },
      );
      loop = await runLoop(
        appendJsonSchemaInstruction(conversation, responseFormat.schema),
        undefined,
      );
    }
    const { text, finishReason, toolsUsed } = loop;
    const inputTokens = loop.inputTokens;
    const outputTokens = loop.outputTokens;

    // stopReason / stepsUsed parity with the other native loops (Vertex
    // Gemini / Claude / Bedrock) and with the ai-package path this replaced.
    // Without them a consumer cannot tell a completed turn from one the step
    // cap truncated: the turn that ends on a `tool-calls` finish with the
    // budget spent is exactly the case the caller configured `maxSteps` to
    // bound, and reporting it as a plain completion hides that.
    const stepsUsed = loop.steps;
    const stopReason: GenerateStopReason =
      stepsUsed >= (options.maxSteps || DEFAULT_MAX_STEPS) &&
      finishReason === "tool-calls"
        ? "step-cap"
        : finishReason === "error"
          ? "provider-error"
          : "completed";

    const enhanced: EnhancedGenerateResult = {
      content: text,
      provider: this.providerName,
      model: modelId,
      finishReason,
      stopReason,
      stepsUsed,
      usage: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens,
        // doGenerate reads prompt_tokens_details.cached_tokens, and the loop
        // carries the counters out; discarding them here billed cached input
        // at the full rate in calculateCost and made cache effectiveness
        // invisible. Anthropic's native path already forwards both.
        ...(loop.cacheReadTokens
          ? { cacheReadTokens: loop.cacheReadTokens }
          : {}),
        ...(loop.cacheWriteTokens
          ? { cacheCreationTokens: loop.cacheWriteTokens }
          : {}),
      },
      responseTime: Date.now() - startTime,
      toolsUsed,
      toolExecutions: resolveToolExecutionRecords(
        options,
        transformToolExecutions(toolExecutionSummaries),
      ),
      enhancedWithTools: toolsUsed.length > 0,
    };

    return this.finalizeNativeGenerate(enhanced, options, startTime);
  }

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
    let wireNameMaps: ReturnType<typeof buildWireToolNameMaps>;
    let openAITools: OpenAICompatChatTool[] | undefined;
    let openAIToolChoice: OpenAICompatToolChoiceWire | undefined;
    // The prompt is kept in its pre-wire shape. Model middleware transforms
    // `params.prompt`, and the conversion to the chat-completions wire format
    // has to happen AFTER that or the transform would be discarded.
    let promptMessages: OpenAICompatMessage[];
    try {
      modelId = await this.resolveModelName();
      const shouldUseTools = !options.disableTools && this.supportsTools();
      toolsRecord = shouldUseTools
        ? (options.tools as Record<string, Tool>) || (await this.getAllTools())
        : {};
      // Wire-name mapping: only materializes when a registered tool name is
      // outside the OpenAI-compatible alphabet (see buildWireToolNameMaps).
      wireNameMaps = shouldUseTools
        ? buildWireToolNameMaps(Object.keys(toolsRecord))
        : undefined;
      openAITools = shouldUseTools
        ? buildToolsForOpenAI(toolsRecord, wireNameMaps?.toWire)
        : undefined;
      openAIToolChoice = mapNeuroLinkToolChoice(
        resolveToolChoice(options, toolsRecord, shouldUseTools),
        wireNameMaps?.toWire,
      );

      promptMessages = (await this.buildMessagesForStream(
        options,
      )) as OpenAICompatMessage[];
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
    const channel = createStreamChannel<OpenAICompatStreamChunk>();

    // Per-provider lifecycle hook (e.g. OTel span wrap for LiteLLM).
    const lifecycle = this.onStreamStart(modelId);

    // Model middleware on the streaming path.
    //
    // The base model below is not `buildDelegatingModel()`'s — that one's
    // `doGenerate` is a single wire call and its `doStream` is a stub. This
    // one's `doStream` starts the real multi-step stream loop, which is what
    // "produce the stream for this request" means here. Wrapping it gives the
    // streaming path the contract the generate path has always had:
    // `transformParams` can rewrite the prompt before a byte is sent, and
    // `wrapStream` can observe, filter, or replace the stream outright.
    //
    // Honoured on the way back in: `prompt`, `maxOutputTokens`, `temperature`
    // and `topP`. `tools` is offered read-only — a middleware that rewrites it
    // gets a WARN rather than a silent drop, because re-deriving the wire tool
    // list here would diverge from `buildToolsForOpenAI`.
    const v3Tools = openAITools?.map((t) => ({
      type: "function" as const,
      name: t.function.name,
      description: t.function.description,
      inputSchema: t.function.parameters,
    }));
    const v3Params: LanguageModelV3CallOptions = {
      prompt: promptMessages as LanguageModelV3CallOptions["prompt"],
      ...(v3Tools ? { tools: v3Tools } : {}),
      ...(options.maxTokens !== undefined
        ? { maxOutputTokens: options.maxTokens }
        : {}),
      ...(options.temperature !== undefined
        ? { temperature: options.temperature }
        : {}),
      ...(options.topP !== undefined ? { topP: options.topP } : {}),
    };

    let loopPromise: Promise<unknown> | undefined;
    const providerNameForLoop = this.providerName;
    const streamBaseModel: LanguageModelV3 = {
      specificationVersion: "v3" as const,
      provider: providerNameForLoop,
      modelId,
      supportedUrls: {},
      doGenerate: async (params) => {
        const model = await this.getAISDKModel();
        if (typeof model === "string") {
          throw new Error("Native model handle required");
        }
        return model.doGenerate(params);
      },
      doStream: async (params) => {
        if (params?.tools !== undefined && params.tools !== v3Tools) {
          logger.warn(
            `${providerNameForLoop}: middleware rewrote 'tools' on the streaming path; tool rewrites are not applied to the wire request yet — the original tool list was sent.`,
          );
        }
        const transformedPrompt = Array.isArray(params?.prompt)
          ? (params.prompt as OpenAICompatMessage[])
          : promptMessages;
        const conversation = messageBuilderToOpenAI(
          transformedPrompt,
          wireNameMaps?.toWire,
        );
        const sampled: StreamOptions = {
          ...options,
          ...(typeof params?.maxOutputTokens === "number"
            ? { maxTokens: params.maxOutputTokens }
            : {}),
          ...(typeof params?.temperature === "number"
            ? { temperature: params.temperature }
            : {}),
          ...(typeof params?.topP === "number" ? { topP: params.topP } : {}),
        };
        loopPromise = this.runStreamLoop({
          maxSteps,
          modelId,
          url,
          fetchImpl,
          abortSignal,
          options: sampled,
          conversation,
          openAITools,
          openAIToolChoice,
          toolsRecord,
          toolNameFromWire: wireNameMaps?.fromWire,
          emitter,
          toolsUsed,
          toolExecutionSummaries,
          pushChunk: channel.push,
          closeChannel: channel.close,
          resolveUsage,
          resolveFinish,
        });
        const completion: Promise<LanguageModelV3StreamPart> = loopPromise.then(
          () =>
            Promise.all([usagePromise, finishPromise]).then(
              ([usage, reason]) => ({
                type: "finish" as const,
                finishReason: { unified: reason },
                usage: {
                  inputTokens: {
                    total: usage.promptTokens,
                    cacheRead: usage.cacheReadTokens,
                  },
                  outputTokens: { total: usage.completionTokens },
                },
              }),
            ),
        );
        // The producer can reject before the consumer pulls its terminal event.
        void completion.catch(() => undefined);
        return {
          stream: chunksToV3Stream(channel.iterable, completion, () =>
            consumerAbortController.abort(),
          ),
        };
      },
    };

    // A middleware chain that blocks (guardrails' precall path) returns its own
    // stream without calling `doStream`, so the loop may never start. Every
    // later reader of `loopPromise` has to tolerate that.
    let chunkSource: AsyncIterable<OpenAICompatStreamChunk>;
    try {
      const wrappedStreamModel = await this.applyMiddlewareToModel(
        streamBaseModel,
        options,
      );
      if (typeof wrappedStreamModel === "string") {
        throw new Error("Native stream model handle required");
      }
      const { stream } = await wrappedStreamModel.doStream(v3Params);
      chunkSource = v3StreamToChunks(stream, (part) => {
        if (!loopPromise) {
          const input = part.usage.inputTokens.total ?? 0;
          const output = part.usage.outputTokens.total ?? 0;
          resolveUsage({
            promptTokens: input,
            completionTokens: output,
            totalTokens: input + output,
          });
          resolveFinish(part.finishReason.unified);
        }
      });
    } catch (error) {
      consumerAbortController.abort();
      channel.close();
      timeoutController?.cleanup();
      throw error;
    }

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
        for await (const chunk of chunkSource) {
          if (
            "content" in chunk &&
            typeof chunk.content === "string" &&
            chunk.content.length > 0
          ) {
            contentYielded++;
          }
          yield chunk;
        }
        // Surface any error that the loop threw after we drained the channel.
        // `loopPromise` is undefined when a middleware blocked the request
        // before `doStream` ran, in which case there is no loop to surface.
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
        if (!loopPromise) {
          resolveUsage({
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
          });
          resolveFinish("stop");
        }
        timeoutController?.cleanup();
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
      ?.finally(() => timeoutController?.cleanup())
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
      toolNameFromWire,
      emitter,
      toolsUsed,
      toolExecutionSummaries,
      pushChunk,
      closeChannel,
      resolveUsage,
      resolveFinish,
    } = args;

    // Hoisted above the try so the catch can resolve the usage accumulated
    // by steps that completed BEFORE the failure — those steps were billed.
    let stepFinish: OpenAICompatChatChoice["finish_reason"] = null;
    let stepUsage: OpenAICompatChatResponse["usage"] | undefined;
    // Aggregated DeferredUsage from whatever accumulated in stepUsage.
    // prompt_tokens is OVERLAPPING with cached_tokens (a subset), so the
    // uncached remainder goes in promptTokens and the cached part in
    // cacheReadTokens — the non-overlapping convention extractTokenUsage
    // and calculateCost expect. reasoning_tokens stays a subset of
    // completionTokens (informational).
    const toDeferredUsage = (): DeferredUsage => {
      const promptTokens = stepUsage?.prompt_tokens ?? 0;
      const completionTokens = stepUsage?.completion_tokens ?? 0;
      const cachedTokens = Math.min(
        stepUsage?.prompt_tokens_details?.cached_tokens ?? 0,
        promptTokens,
      );
      // Clamped like cached_tokens above: reasoning is a SUBSET of
      // completion_tokens, but some gateways report inconsistent values.
      const reasoningTokens = Math.min(
        Math.max(
          0,
          stepUsage?.completion_tokens_details?.reasoning_tokens ?? 0,
        ),
        completionTokens,
      );
      return {
        promptTokens: promptTokens - cachedTokens,
        completionTokens,
        // Gateways that omit total_tokens must not collapse to 0.
        totalTokens: stepUsage?.total_tokens || promptTokens + completionTokens,
        ...(cachedTokens > 0 ? { cacheReadTokens: cachedTokens } : {}),
        ...(reasoningTokens > 0 ? { reasoningTokens } : {}),
      };
    };
    try {
      // May grow mid-turn: hydrated tools with wire-unsafe names need
      // reverse-mapping even when the initial name set required none.
      let effectiveToolNameFromWire = toolNameFromWire;
      // The provider's REAL prompt-token count for the previous step, used to
      // calibrate the guard's char-based estimate for free, paired with the
      // guard's own estimate for that same request — a ratio between counts of
      // two different payloads would be meaningless.
      let lastObservedPromptTokens: number | undefined;
      let lastSentEstimate: number | undefined;

      for (let step = 0; step < maxSteps; step++) {
        // Mid-turn discovery sync: search_tools (tools.discovery) hydrates
        // new tools into toolsRecord between steps. Dispatch already re-reads
        // the record — this block makes the request DECLARE them so the model
        // can call them, keeping the wire-name round-trip intact.
        if (openAITools) {
          const declared = new Set(
            openAITools.map(
              (t) =>
                effectiveToolNameFromWire?.get(t.function.name) ??
                t.function.name,
            ),
          );
          const hydrated = Object.fromEntries(
            Object.entries(toolsRecord).filter(([name]) => !declared.has(name)),
          );
          if (Object.keys(hydrated).length > 0) {
            // Seed with the wire names already declared this turn — mapping
            // only the hydrated subset could otherwise re-issue a wire name
            // an earlier tool claimed (sanitized or literal), making the
            // reverse mapping ambiguous.
            const extraMaps = buildWireToolNameMaps(
              Object.keys(hydrated),
              new Set(openAITools.map((t) => t.function.name)),
            );
            if (extraMaps) {
              effectiveToolNameFromWire ??= new Map<string, string>();
              for (const [wireName, registryName] of extraMaps.fromWire) {
                effectiveToolNameFromWire.set(wireName, registryName);
              }
            }
            openAITools.push(
              ...(buildToolsForOpenAI(hydrated, extraMaps?.toWire) ?? []),
            );
            logger.info(
              `${this.providerName}: ${Object.keys(hydrated).length} tool(s) hydrated mid-turn via discovery: ${Object.keys(hydrated).join(", ")}`,
            );
          }
        }
        // In-turn context guard. This loop appends an assistant tool-call
        // message plus one tool message per result on every step — growth the
        // pre-dispatch budget check never sees. Without this, a long agentic
        // run walks into a provider "context length exceeded" and loses every
        // completed step. Shares its reclaim policy with the other provider
        // loops via loopGuardCore; returns undefined (leaving `conversation`
        // byte-identical) whenever the request still fits, so a loop that fits
        // never pays a prompt-cache invalidation.
        const guarded = guardOpenAICompatConversation({
          conversation,
          availableInputTokens: getAvailableInputTokens(
            this.providerName,
            modelId,
            options.maxTokens ?? undefined,
          ),
          // Tool definitions ride outside the message array. Passing an empty
          // message list yields the tools-only overhead, and reuses the same
          // estimator the wire path already trusts.
          fixedOverheadTokens: estimateWireTokens(
            [],
            openAITools,
            this.providerName,
          ),
          provider: this.providerName,
          observedPromptTokens: lastObservedPromptTokens,
          // Both halves of the calibration ratio must describe the same
          // request: the tokens the provider reported, and this guard's own
          // estimate for what was sent to earn them.
          previousSentEstimate: lastSentEstimate,
          onSentEstimate: (tokens) => {
            lastSentEstimate = tokens;
          },
        });
        if (guarded) {
          conversation.length = 0;
          conversation.push(...guarded);
        }

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
        lastObservedPromptTokens = stepResult.usage?.prompt_tokens;
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
          toolNameFromWire: effectiveToolNameFromWire,
          emitter,
          toolsUsed,
          toolExecutionSummaries,
          options,
        });
      }

      resolveUsage(toDeferredUsage());
      resolveFinish(stepFinish ?? "stop");
      closeChannel();
      return {
        finishReason: stepFinish ?? "stop",
        usage: stepUsage,
      };
    } catch (err) {
      logger.error(`${this.providerName}: Stream error`, {
        error: err instanceof Error ? err.message : String(err),
      });
      // Steps that completed before the failure were billed — report them
      // instead of zeroing the whole turn.
      resolveUsage(toDeferredUsage());
      resolveFinish("error");
      closeChannel();
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
    // Per-step max_tokens fit: the conversation grows every step of the
    // tool loop, so the window fit is recomputed per request (no-op when
    // nothing was runtime-discovered).
    const wireMaxTokens = this.resolveWireMaxTokens(
      args.modelId,
      args.options.maxTokens ?? undefined,
      args.conversation,
      args.openAITools,
    );
    const stepOptions =
      wireMaxTokens !== args.options.maxTokens
        ? { ...args.options, maxTokens: wireMaxTokens }
        : args.options;
    const body = ensureJsonWordInBody(
      this.adjustRequestBody(
        buildBody({
          modelId: args.modelId,
          messages: args.conversation,
          options: this.adjustBuildBodyOptions(args.modelId, stepOptions),
          tools: args.openAITools,
          ...(args.openAIToolChoice !== undefined
            ? { toolChoice: args.openAIToolChoice }
            : {}),
          streaming: true,
        }),
        args.modelId,
      ),
    );
    // The initial fetch gets 429/5xx retry-with-backoff via the same
    // primitive the non-streaming path already uses (withProviderRetry).
    // `doFetch` throws the classified APIError (buildAPIError attaches
    // .statusCode + .responseHeaders, which withProviderRetry's duck-typing
    // reads directly) so a non-ok response is what drives the retry
    // decision, not a return value.
    const doFetch = async (): Promise<Response> => {
      const attemptRes = await args.fetchImpl(args.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify(body),
        ...(args.abortSignal ? { signal: args.abortSignal } : {}),
      });
      if (!attemptRes.ok) {
        throw await buildAPIError(args.url, body, attemptRes);
      }
      return attemptRes;
    };

    let res: Response;
    try {
      res = await withProviderRetry(
        doFetch,
        trace.getActiveSpan() ?? undefined,
        `${this.providerName} stream`,
      );
    } catch (err) {
      // The one-shot 400 context-overflow fallback lives outside
      // withProviderRetry (400 isn't retryable there anyway — see
      // isRetryableProviderError), so it fires on the classified error's
      // .statusCode. The raw Response is no longer in scope here: it was
      // consumed inside doFetch's closure, either returned on success or
      // discarded after buildAPIError read its body on failure.
      const apiErr = err as Error & {
        statusCode?: number;
        responseBody?: string;
      };
      // Overflow corrector first (re-fits max_tokens from the provider's own
      // numbers + self-heals the window registry); its output then feeds the
      // subclass hook (e.g. NIM strips chat_template / reasoning_budget when
      // a model rejects them), so a body needing BOTH fixes gets both — a
      // plain `??` between the two would let whichever ran first silently
      // win and drop the other's fix.
      const retryBody =
        apiErr.statusCode === 400
          ? (() => {
              const overflowCorrected = this.correctBodyAfterContextOverflow(
                body,
                apiErr,
              );
              return (
                this.adjustBodyAfter400(overflowCorrected ?? body, apiErr) ??
                overflowCorrected
              );
            })()
          : undefined;
      if (!retryBody) {
        throw apiErr;
      }
      res = await args.fetchImpl(args.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify(retryBody),
        ...(args.abortSignal ? { signal: args.abortSignal } : {}),
      });
      if (!res.ok) {
        throw await buildAPIError(args.url, retryBody, res);
      }
    }
    if (!res.body) {
      throw new Error(`${this.providerName}: stream response had no body`);
    }
    return parseSSEStream(
      res.body,
      (delta) => {
        args.pushChunk({ content: delta });
      },
      (reasoningDelta) => {
        // Reasoning rides alongside an empty `content` so plain-text
        // consumers (which only read chunk.content) are unaffected.
        args.pushChunk({ content: "", reasoning: reasoningDelta });
      },
    );
  }

  private async executeToolBatch(args: {
    stepResult: OpenAICompatSSEResult;
    conversation: OpenAICompatChatMessage[];
    toolsRecord: Record<string, Tool>;
    toolNameFromWire?: Map<string, string>;
    emitter: ReturnType<NeuroLink["getEventEmitter"]> | undefined;
    toolsUsed: string[];
    toolExecutionSummaries: ToolExecutionSummaryInternal[];
    options: StreamOptions;
  }): Promise<void> {
    const {
      stepResult,
      conversation,
      toolsRecord,
      toolNameFromWire,
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
      // The model calls tools by their WIRE names; execution, events, and
      // reporting use the registered names (reverse-mapped when a wire-name
      // map is in effect — see buildWireToolNameMaps).
      const registryName = toolNameFromWire?.get(t.name) ?? t.name;
      // Live record lookup, then deferred-catalog auto-hydration: with
      // tools.discovery on, the model may call a cataloged tool it never
      // loaded via search_tools — that's a real tool, not a hallucination.
      const toolDef =
        toolsRecord[registryName] ??
        resolveDeferredTool(toolsRecord, registryName);
      emitter?.emit("tool:start", {
        toolName: registryName,
        toolCallId: t.id,
        input,
      });
      if (!toolDef || typeof toolDef.execute !== "function") {
        errorMsg = `Tool '${registryName}' is not registered.`;
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
      toolsUsed.push(registryName);
      toolExecutionSummaries.push({
        toolCallId: t.id,
        toolName: registryName,
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
