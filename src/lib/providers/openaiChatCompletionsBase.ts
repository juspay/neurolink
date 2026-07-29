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
import {
  getRuntimeContextWindow,
  getRuntimeOutputCeiling,
  registerRuntimeContextWindow,
} from "../constants/contextWindows.js";
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
  composeAbortSignalsScoped,
  createTimeoutController,
  mergeAbortSignals,
} from "../utils/timeout.js";
import { emitToolEndFromStepFinish } from "../utils/toolEndEmitter.js";
import { resolveToolChoice } from "../utils/toolChoice.js";
import { transformToolExecutions } from "../utils/transformationUtils.js";
import { resolveDeferredTool } from "../tools/toolDiscovery.js";
import {
  buildAPIError,
  buildBody,
  buildToolsForOpenAI,
  buildWireToolNameMaps,
  createChunkQueue,
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

/**
 * Safety margin (tokens) when fitting `max_tokens` to a runtime-discovered
 * context window: the char-based input estimate and the backend's own prompt
 * framing differ by a few hundred tokens, so an exact fit would still 400.
 */
const WINDOW_FIT_MARGIN_TOKENS = 512;

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
              streaming: false,
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
            // self-heals the runtime window registry); otherwise a subclass
            // may strip a rejected field and return a modified body (e.g.
            // NIM's chat_template / reasoning_budget). The retry runs under
            // the SAME timeout controller as the first attempt, so the
            // configured timeout caps the overall call — matching the
            // streaming path, which reuses its composed signal for the retry.
            const retryBody =
              res.status === 400
                ? (correctBodyAfterContextOverflow(
                    body,
                    apiErr as Error & {
                      statusCode?: number;
                      responseBody?: string;
                    },
                  ) ??
                  adjustBodyAfter400(
                    body,
                    apiErr as Error & {
                      statusCode?: number;
                      responseBody?: string;
                    },
                  ))
                : undefined;
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
          json = (await res.json()) as OpenAICompatChatResponse;
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
    let conversation: OpenAICompatChatMessage[];
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

      const initialMessages = await this.buildMessagesForStream(options);
      conversation = messageBuilderToOpenAI(
        initialMessages as OpenAICompatMessage[],
        wireNameMaps?.toWire,
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
      toolNameFromWire: wireNameMaps?.fromWire,
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
      toolNameFromWire,
      emitter,
      toolsUsed,
      toolExecutionSummaries,
      pushChunk,
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
          toolNameFromWire: effectiveToolNameFromWire,
          emitter,
          toolsUsed,
          toolExecutionSummaries,
          options,
        });
      }

      resolveUsage(toDeferredUsage());
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
      // Steps that completed before the failure were billed — report them
      // instead of zeroing the whole turn.
      resolveUsage(toDeferredUsage());
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
    let res = await args.fetchImpl(args.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(body),
      ...(args.abortSignal ? { signal: args.abortSignal } : {}),
    });
    if (!res.ok) {
      const apiErr = await buildAPIError(args.url, body, res);
      // One-shot 400 retry — overflow corrector first (re-fits max_tokens
      // from the provider's own numbers + self-heals the window registry),
      // then the subclass hook (e.g. NIM strips chat_template /
      // reasoning_budget when a model rejects them).
      const retryBody =
        res.status === 400
          ? (this.correctBodyAfterContextOverflow(
              body,
              apiErr as Error & { statusCode?: number; responseBody?: string },
            ) ??
            this.adjustBodyAfter400(
              body,
              apiErr as Error & { statusCode?: number; responseBody?: string },
            ))
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
