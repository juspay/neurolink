import { context, SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import { directAgentTools } from "../agent/directTools.js";
import type { AIProviderName } from "../constants/enums.js";
import { defaultProviderFor } from "../factories/mediaHandlerCatalog.js";
import { PROVIDER_DESCRIPTORS_BY_NAME } from "../factories/providerDescriptors.js";
import type { EvaluationData } from "../index.js";
import { MiddlewareFactory } from "../middleware/factory.js";
import { modelSupports } from "../models/modelRegistry.js";
import type { NeuroLink } from "../neurolink.js";
import { resolveRequestKind } from "./resolveRequestKind.js";
import { ATTR, tracers } from "../telemetry/index.js";
import type {
  JsonValue,
  UnknownRecord,
  LifecycleMiddlewareConfig,
  MiddlewareFactoryOptions,
  OptionsWithLifecycleMiddleware,
  StreamOptions,
  StreamResult,
  AIProvider,
  AnalyticsData,
  EnhancedGenerateResult,
  TTSChunk,
  TTSMetadata,
  TTSResult,
  TextGenerationOptions,
  TextGenerationResult,
  StandardRecord,
  ToolExecutionRecord,
  ValidationSchema,
  ZodUnknownSchema,
  EmbedInput,
} from "../types/index.js";
import {
  ERROR_CODES,
  isAbortError,
  NeuroLinkError,
} from "../utils/errorHandling.js";
import { ProviderError } from "../types/index.js";
import { sanitizeErrorCause } from "../utils/logSanitize.js";
import { createAnalytics as buildAnalytics } from "./analytics.js";
import { ErrorCategory, ErrorSeverity } from "../constants/enums.js";
import {
  duckTypedStatusCode,
  extractRetryAfterMsFromError,
} from "../utils/providerRetry.js";
import {
  hasLifecycleErrorFired,
  markLifecycleErrorFired,
} from "../utils/lifecycleCallbacks.js";
import { resolveLifecycleTimeoutMs } from "../utils/lifecycleTimeout.js";
import { logger } from "../utils/logger.js";
import { interleaveTTSStream } from "../utils/ttsStream.js";
import {
  attachStreamCancel,
  cancelStream,
  releaseIterator,
} from "../utils/streamCancellation.js";
import {
  TimeoutError as AsyncTimeoutError,
  withTimeoutFn,
} from "../utils/async/withTimeout.js";
import {
  composeAbortSignals,
  createTimeoutController,
  TimeoutError,
} from "../utils/timeout.js";
import { shouldDisableBuiltinTools } from "../utils/toolUtils.js";
import { getKeyCount, getKeysAsString } from "../utils/transformationUtils.js";
import {
  ToolExecutionRecorder,
  resolveToolExecutionRecords,
} from "./toolExecutionRecorder.js";
import { TTS_ERROR_CODES, TTSProcessor } from "../utils/ttsProcessor.js";
import {
  executeVideoAnalysis,
  hasVideoFrames,
} from "../utils/videoAnalysisProcessor.js";
import { dedupeTools } from "./toolDedup.js";
import { resolveToolPolicy, toolNameMatcher } from "../tools/toolPolicy.js";
import { applyToolGate } from "../tools/toolGate.js";
import {
  partitionToolsForDiscovery,
  isDiscoveryMetaTool,
  LARGE_CATALOG_WARN_THRESHOLD,
} from "../tools/toolDiscovery.js";
import { GenerationHandler } from "./modules/GenerationHandler.js";
// Import modules for composition
import { MessageBuilder } from "./modules/MessageBuilder.js";
import { StreamHandler } from "./modules/StreamHandler.js";

import { TelemetryHandler } from "./modules/TelemetryHandler.js";
import { ToolsManager } from "./modules/ToolsManager.js";
import { Utilities } from "./modules/Utilities.js";
import type {
  LanguageModel,
  ModelMessage,
  RawUsageObject,
  ResolvedToolPolicy,
  Tool,
  TokenUsage,
  ToolCallRepairFunction,
  ToolDedupConfig,
  ToolSet,
} from "../types/index.js";
import { generateText } from "../utils/generation.js";
import { extractTokenUsage } from "../utils/tokenUtils.js";

/**
 * Read the consumer-facing lifecycle callbacks buried inside a request's
 * middleware blob. The parameter is `unknown` on purpose: request options
 * arrive as several structurally-unrelated shapes (StreamOptions,
 * TextGenerationOptions), and the lifecycle branch is an optional add-on
 * none of them declare — a single structural view keeps the read cast-free
 * at every call site.
 */
function getLifecycleMiddlewareConfig(
  options: unknown,
): LifecycleMiddlewareConfig | undefined {
  return (options as OptionsWithLifecycleMiddleware | undefined)?.middleware
    ?.middlewareConfig?.lifecycle?.config;
}

/**
 * Abstract base class for all AI providers
 * Tools are integrated as first-class citizens - always available by default
 */
/**
 * Marks an error as already run through `formatProviderError`.
 *
 * `handleProviderError` is NOT idempotent — measured: feeding its own output back in
 * degrades a specific classification into a generic one, because it copies `statusCode`
 * onto the formatted error, so a second pass re-matches the bare 429 rule while the more
 * specific rule (which keyed on the raw body) no longer can:
 *
 *   pass 1  ProviderError  "[openai] OpenAI quota exhausted — this will not resolve by retrying..."
 *   pass 2  RateLimitError "[openai] OpenAI rate limit exceeded. Please try again later."
 *
 * Since the stream path can now reach a classifier that other paths already reached, that
 * second pass became possible and had to be made impossible.
 *
 * Same `Symbol.for` stamping technique as `utils/lifecycleCallbacks.ts` and for the same
 * reason: it survives across module copies where a closed-over WeakSet would not, and a
 * frozen error degrades to one extra classification rather than a throw.
 */
const PROVIDER_ERROR_CLASSIFIED = Symbol.for(
  "neurolink.providerErrorClassified",
);

function markProviderErrorClassified(error: unknown): void {
  if (error === null || typeof error !== "object") {
    return;
  }
  try {
    Object.defineProperty(error, PROVIDER_ERROR_CLASSIFIED, {
      value: true,
      enumerable: false,
      writable: false,
      configurable: false,
    });
  } catch {
    // Non-extensible error — worst case is one redundant classification.
  }
}

function isProviderErrorClassified(error: unknown): boolean {
  if (error === null || typeof error !== "object") {
    return false;
  }
  return (error as Record<symbol, unknown>)[PROVIDER_ERROR_CLASSIFIED] === true;
}

export abstract class BaseProvider implements AIProvider {
  // Not `readonly` because providers that auto-discover the model from a
  // /v1/models endpoint (lm-studio, llamacpp) need to update modelName after
  // construction so handlers (TelemetryHandler, MessageBuilder) cache the
  // resolved name. All other providers treat this as effectively readonly.
  protected modelName: string;
  protected readonly providerName: AIProviderName;
  protected readonly defaultTimeout: number = 30000; // 30 seconds
  protected middlewareOptions?: MiddlewareFactoryOptions; // TODO(#1576): Implement global level middlewares that can be used

  // Tools are conditionally included based on centralized configuration
  protected readonly directTools = shouldDisableBuiltinTools()
    ? {}
    : directAgentTools;
  protected mcpTools?: Record<string, Tool>; // MCP tools loaded dynamically when available
  protected customTools?: Map<string, unknown>; // Custom tools from registerTool()
  protected toolExecutor?: (
    toolName: string,
    params: unknown,
  ) => Promise<unknown>; // Tool executor from setupToolExecutor
  protected sessionId?: string;
  protected userId?: string;
  protected neurolink?: NeuroLink; // Reference to actual NeuroLink instance for MCP tools

  /** @internal Trace context propagated from NeuroLink SDK for span hierarchy */
  protected _traceContext: { traceId: string; parentSpanId: string } | null =
    null;

  setTraceContext(ctx: { traceId: string; parentSpanId: string } | null): void {
    this._traceContext = ctx;
  }

  // Composition modules - Single Responsibility Principle
  // Handlers below are not `readonly` so that providers which auto-discover
  // their model after construction (lm-studio, llamacpp) can rebuild them
  // via `refreshHandlersForModel(...)` and propagate the resolved name into
  // pricing / telemetry / span attributes. All other providers leave these
  // alone.
  private messageBuilder: MessageBuilder;
  private streamHandler: StreamHandler;
  private generationHandler: GenerationHandler;
  protected telemetryHandler: TelemetryHandler;
  private utilities: Utilities;
  private readonly toolsManager: ToolsManager;

  constructor(
    modelName?: string,
    providerName?: AIProviderName,
    neurolink?: NeuroLink,
    middleware?: MiddlewareFactoryOptions,
  ) {
    this.modelName = modelName || this.getDefaultModel();
    this.providerName = providerName || this.getProviderName();
    this.neurolink = neurolink;
    this.middlewareOptions = middleware;

    // Initialize composition modules
    this.messageBuilder = new MessageBuilder(this.providerName, this.modelName);
    this.streamHandler = new StreamHandler(this.providerName, this.modelName);
    this.telemetryHandler = new TelemetryHandler(
      this.providerName,
      this.modelName,
      this.neurolink,
    );
    this.generationHandler = new GenerationHandler(
      this.providerName,
      this.modelName,
      () => this.supportsTools(),
      (options, type) =>
        this.telemetryHandler.getTelemetryConfig(
          options,
          type as "stream" | "generate",
        ),
      (toolCalls, toolResults, options, timestamp) =>
        this.handleToolExecutionStorage(
          toolCalls,
          toolResults,
          options,
          timestamp,
        ),
      { getEmitterFn: () => this.neurolink?.getEventEmitter() },
    );
    this.utilities = new Utilities(
      this.providerName,
      this.modelName,
      this.defaultTimeout,
      this.middlewareOptions,
    );
    this.toolsManager = new ToolsManager(
      this.providerName,
      this.directTools,
      this.neurolink,
      {
        isZodSchema: (schema) => this.isZodSchema(schema),
        convertToolResult: (result) => this.convertToolResult(result),
        createPermissiveZodSchema: () => this.createPermissiveZodSchema(),
        fixSchemaForOpenAIStrictMode: (schema) =>
          this.fixSchemaForOpenAIStrictMode(schema),
      },
    );
  }

  /**
   * Update modelName and rebuild composition handlers with the new value.
   *
   * Auto-discovery providers (lm-studio, llamacpp) call this once they have
   * resolved the loaded model from `/v1/models`. Without this, handlers
   * (TelemetryHandler, MessageBuilder, ...) keep the pre-discovery name and
   * pricing / span / log metadata reports the stale value.
   */
  protected refreshHandlersForModel(model: string): void {
    this.modelName = model;
    trace
      .getSpan(context.active())
      ?.setAttribute(ATTR.GEN_AI_MODEL, this.modelName);
    this.messageBuilder = new MessageBuilder(this.providerName, this.modelName);
    this.streamHandler = new StreamHandler(this.providerName, this.modelName);
    this.telemetryHandler = new TelemetryHandler(
      this.providerName,
      this.modelName,
      this.neurolink,
    );
    this.generationHandler = new GenerationHandler(
      this.providerName,
      this.modelName,
      () => this.supportsTools(),
      (options, type) =>
        this.telemetryHandler.getTelemetryConfig(
          options,
          type as "stream" | "generate",
        ),
      (toolCalls, toolResults, options, timestamp) =>
        this.handleToolExecutionStorage(
          toolCalls,
          toolResults,
          options,
          timestamp,
        ),
      { getEmitterFn: () => this.neurolink?.getEventEmitter() },
    );
    this.utilities = new Utilities(
      this.providerName,
      this.modelName,
      this.defaultTimeout,
      this.middlewareOptions,
    );
  }

  /**
   * Check if this provider supports tool/function calling
   * Override in subclasses to disable tools for specific providers or models
   * @returns the current model's registered capability, or true when unknown
   */
  supportsTools(): boolean {
    return modelSupports("functionCalling", this.providerName, this.modelName);
  }

  /**
   * Apply the shared tool gate and optionally report registry-backed
   * suppression at the request entry point.
   */
  private shouldUseTools(
    options: { disableTools?: boolean },
    warnWhenUnsupported = false,
  ): boolean {
    if (options.disableTools) {
      return false;
    }

    const supportsTools = this.supportsTools();
    if (!supportsTools && warnWhenUnsupported) {
      logger.warn(
        `Tools disabled for ${this.providerName}/${this.modelName} because the model does not support function calling`,
        {
          provider: this.providerName,
          model: this.modelName,
        },
      );
    }

    return supportsTools;
  }

  // ===================
  // PUBLIC API METHODS
  // ===================

  /**
   * Primary streaming method - implements AIProvider interface
   * When tools are involved, falls back to generate() with synthetic streaming
   */
  async stream(
    optionsOrPrompt: StreamOptions | string,
    analysisSchema?: ValidationSchema,
  ): Promise<StreamResult> {
    // Runtime model limits must land before normalizeStreamOptions resolves
    // maxTokens (getSafeMaxTokens consults the discovered output ceiling).
    await this.ensureModelLimits();
    let options = this.normalizeStreamOptions(optionsOrPrompt);

    logger.info(`Starting stream`, {
      provider: this.providerName,
      hasTools: !options.disableTools && this.supportsTools(),
      disableTools: !!options.disableTools,
      supportsTools: this.supportsTools(),
      inputLength: options.input?.text?.length || 0,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      timestamp: Date.now(),
    });

    // ===== EARLY MULTIMODAL DETECTION =====
    // #1259: audioFiles was missing here while videoFiles was present, so an
    // audio-only stream skipped this branch entirely.
    const hasFileInput =
      !!options.input?.files?.length ||
      !!options.input?.videoFiles?.length ||
      !!options.input?.audioFiles?.length;
    if (hasFileInput) {
      // ===== VIDEO ANALYSIS DETECTION =====
      // Check if video frames are present and handle with fake streaming
      const messages = await this.buildMessagesForStream(options);
      if (hasVideoFrames(messages)) {
        logger.info(
          `Video frames detected in stream, using fake streaming for video analysis`,
          {
            provider: this.providerName,
            model: this.modelName,
          },
        );
        // Note: executeFakeStreaming() owns its own catch that fires the
        // consumer-supplied onError before re-throwing through
        // handleProviderError(), so we do not need to wrap again here —
        // doing so would route the error through handleProviderError()
        // twice (and risk a double-fire onError without the shared
        // lifecycle-fired WeakSet mark).
        const fakeResult = await this.executeFakeStreaming(
          options,
          analysisSchema,
        );
        return this.wrapStreamWithLifecycleCallbacks(fakeResult, options);
      }
    }

    // CRITICAL: Image generation models don't support real streaming
    // Force fake streaming for image models to ensure image output is yielded.
    // resolveRequestKind() skips this path when the caller explicitly requests
    // non-image output (e.g. JSON analysis) so dual-mode models like
    // gemini-3.1-flash-image-preview can still perform text/structured
    // generation — see its doc comment for the full precedence table.
    const requestKind = resolveRequestKind(options, this.modelName);

    if (requestKind === "image") {
      logger.info(`Image model detected, forcing fake streaming`, {
        provider: this.providerName,
        model: this.modelName,
        reason:
          "Image generation requires fake streaming to yield image output",
      });

      // Skip real streaming, go directly to fake streaming.
      // executeFakeStreaming() owns its own catch + lifecycle fire, so
      // wrapping again here would double-route through handleProviderError().
      const fakeResult = await this.executeFakeStreaming(
        options,
        analysisSchema,
      );
      return this.wrapStreamWithLifecycleCallbacks(fakeResult, options);
    }

    // Central tool merge: Pre-merge base tools (MCP/built-in) with user-provided
    // tools (e.g. RAG tools) into options.tools. This way, every provider's
    // executeStream() can simply use options.tools (or getAllTools() + options.tools)
    // and get the complete tool set without needing per-provider merge logic.
    if (this.shouldUseTools(options, true)) {
      const mergedTools = await this.getToolsForStream(options);
      options = { ...options, tools: mergedTools };
    } else {
      options = { ...options, tools: {} };
    }

    // CRITICAL FIX: Always prefer real streaming over fake streaming
    // Try real streaming first, use fake streaming only as fallback
    try {
      logger.debug(`Attempting real streaming`, {
        provider: this.providerName,
        timestamp: Date.now(),
      });

      const realStreamResult = await this.executeStream(
        options,
        analysisSchema,
      );

      logger.info(`Real streaming succeeded`, {
        provider: this.providerName,
        timestamp: Date.now(),
      });

      // Wire lifecycle callbacks (onChunk/onFinish/onError) on the user-
      // facing StreamResult.stream. The AI-SDK lifecycle middleware only
      // sees AI-SDK-internal chunks via streamText/wrapLanguageModel, so
      // providers with custom HTTP streaming (Ollama, llama.cpp's /api,
      // anything that doesn't go through streamText) bypass it. Wrapping
      // here makes the callbacks fire for every provider, regardless of
      // streaming implementation.
      return this.wrapStreamWithLifecycleCallbacks(realStreamResult, options);
    } catch (realStreamError) {
      // The fallback is BROAD, not narrow: only the terminal errors listed
      // below (abort, timeout, 401/403, quota, rate limit, authentication)
      // re-throw. Every other failure — including a genuine configuration or
      // programming error — is masked as a degraded fake stream whenever
      // tools are enabled. Narrowing this to "streaming with tools is
      // unsupported" failures would change behaviour for every provider at
      // once, so it needs its own characterization PR first; until then this
      // comment records what the code does, not what a narrower design would.
      const errMsg =
        realStreamError instanceof Error
          ? realStreamError.message
          : String(realStreamError);
      const errName =
        realStreamError instanceof Error ? realStreamError.name : "";
      if (
        errName === "AbortError" ||
        errMsg.includes("abort") ||
        errMsg.includes("timeout") ||
        errMsg.includes("401") ||
        errMsg.includes("403") ||
        errMsg.includes("quota") ||
        errMsg.includes("rate limit") ||
        errMsg.includes("authentication")
      ) {
        await this.fireLifecycleErrorCallback(options, realStreamError);
        throw this.handleProviderError(realStreamError);
      }

      logger.warn(
        `Real streaming failed for ${this.providerName}, falling back to fake streaming:`,
        {
          error: errMsg,
          timestamp: Date.now(),
        },
      );

      // Fallback to fake streaming only if real streaming fails AND tools
      // are enabled. executeFakeStreaming() owns its own catch + lifecycle
      // fire, so a fake-streaming failure here surfaces through that path
      // without needing an outer wrap (which would double-route through
      // handleProviderError()).
      if (!options.disableTools && this.supportsTools()) {
        const fakeResult = await this.executeFakeStreaming(
          options,
          analysisSchema,
        );
        return this.wrapStreamWithLifecycleCallbacks(fakeResult, options);
      } else {
        // If real streaming failed and no tools are enabled, fire onError
        // before re-throwing so consumer-supplied callbacks see the failure.
        await this.fireLifecycleErrorCallback(options, realStreamError);
        // If real streaming failed and no tools are enabled, re-throw the original error
        logger.error(
          `Real streaming failed for ${this.providerName}:`,
          realStreamError,
        );
        throw this.handleProviderError(realStreamError);
      }
    }
  }

  /**
   * Wrap a StreamResult with consumer-facing lifecycle callbacks.
   *
   * `options.onChunk`, `options.onFinish`, `options.onError` are translated
   * by NeuroLink.applyStreamLifecycleMiddleware() into
   * `options.middleware.middlewareConfig.lifecycle.config`. The AI SDK's
   * lifecycle middleware only sees these via the wrapped LanguageModel —
   * which is bypassed by providers that stream via raw HTTP fetch (Ollama
   * over /api/chat, custom OpenAI-compatible servers, etc). Wrapping the
   * user-facing stream here ensures the callbacks fire regardless of the
   * underlying transport.
   */
  private wrapStreamWithLifecycleCallbacks(
    result: StreamResult,
    options: StreamOptions,
  ): StreamResult {
    const lifecycle = getLifecycleMiddlewareConfig(options);

    // No early return when there are no callbacks. This wrapper is the only point
    // every provider's stream passes through unconditionally (the real-streaming path
    // plus all three fake-streaming paths), and returning `result` untouched here is
    // exactly why a provider error that surfaces during ITERATION reached the consumer
    // unclassified: the object handed back was the provider's own generator, by
    // reference, and every layer below is a proven passthrough. The callbacks below are
    // each individually guarded, so with none registered this only adds the catch.
    const { onChunk, onFinish, onError } = lifecycle ?? {};
    const startTime = Date.now();
    const originalStream = result.stream;
    // Lifecycle callbacks are awaited with a bounded deadline so callers
    // observe ordering guarantees (onChunk/onFinish/onError have all
    // settled by the time `for await` returns / throws). The previous
    // fire-and-forget pattern left async work running past stream close,
    // creating races during cleanup. The deadline is configurable via
    // `lifecycle.timeoutMs` (per-call) or `NEUROLINK_LIFECYCLE_TIMEOUT_MS`
    // (env / CLI surface) — see `resolveLifecycleTimeoutMs`.
    const timeoutMs = resolveLifecycleTimeoutMs(lifecycle);
    const safeFire = async (
      fn: () => unknown,
      label: string,
    ): Promise<void> => {
      try {
        await withTimeoutFn(
          async () => {
            const ret = fn();
            if (ret && typeof (ret as Promise<unknown>).then === "function") {
              await ret;
            }
          },
          timeoutMs,
          `[lifecycle] ${label} callback exceeded ${timeoutMs}ms`,
        );
      } catch (e) {
        logger.warn(`[lifecycle] ${label} callback error:`, e);
      }
    };

    // Arrow, like `safeFire` above: the generator is a plain function expression, so
    // `this` is not bound inside it.
    const classifyStreamError = (e: unknown): Error =>
      this.classifyStreamError(e);

    // Hold the upstream iterator rather than letting `for await` create one
    // internally, so the cancel hook below can close it directly. Iterating
    // `upstreamIterable` is equivalent to iterating `originalStream` — same
    // iterator, same early-exit `return()` semantics — it just leaves a handle
    // reachable from outside the generator.
    const upstreamIterator = originalStream[Symbol.asyncIterator]();
    const upstreamIterable = {
      [Symbol.asyncIterator]: () => upstreamIterator,
    };

    const wrappedStream = (async function* () {
      let accumulated = "";
      let seq = 0;
      try {
        for await (const chunk of upstreamIterable) {
          const textPart =
            chunk &&
            typeof chunk === "object" &&
            "content" in chunk &&
            typeof (chunk as { content: unknown }).content === "string"
              ? ((chunk as { content: string }).content as string)
              : "";
          // Only fire onChunk for actual text deltas. Non-text chunks
          // (image, tts_audio) would otherwise produce empty text-delta
          // events that consumers must filter out themselves.
          if (onChunk && textPart) {
            const currentSeq = seq++;
            await safeFire(
              () =>
                onChunk({
                  type: "text-delta",
                  textDelta: textPart,
                  sequenceNumber: currentSeq,
                }),
              "onChunk",
            );
          }
          if (textPart) {
            accumulated += textPart;
          }
          yield chunk;
        }
        if (onFinish) {
          await safeFire(
            () =>
              onFinish({
                text: accumulated,
                duration: Date.now() - startTime,
              }),
            "onFinish",
          );
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        if (onError && !hasLifecycleErrorFired(err)) {
          // Mark before firing so a higher layer that also routes through
          // fireLifecycleErrorCallback (or its own lifecycle wrapper) with
          // the same error instance won't double-fire onError. Mirrors the
          // pattern in fireLifecycleErrorCallback below.
          markLifecycleErrorFired(err);
          await safeFire(
            () =>
              onError({
                error: err,
                duration: Date.now() - startTime,
                recoverable: false,
              }),
            "onError",
          );
        }
        throw classifyStreamError(err);
      }
    })();

    // A consumer that breaks out of the stream cannot reach this generator
    // through `.return()` while it is parked awaiting the provider — that
    // request queues behind the in-flight `next()`. The hook closes the
    // upstream directly and forwards the request to any wrapper below, so
    // abandoning a stream really does release the provider connection.
    attachStreamCancel(wrappedStream, () => {
      cancelStream(originalStream);
      releaseIterator(upstreamIterator);
    });

    return { ...result, stream: wrappedStream };
  }

  /**
   * Fire the consumer-supplied onError callback before throwing. Used in
   * error branches inside stream() that re-throw without emitting any
   * stream chunks (which would otherwise hide the failure from a caller
   * that supplied `onError`).
   */
  private async fireLifecycleErrorCallback(
    options: StreamOptions | TextGenerationOptions,
    error: unknown,
  ): Promise<void> {
    const err = error instanceof Error ? error : new Error(String(error));
    // The AI-SDK lifecycle middleware stamps errors it has already
    // surfaced (Symbol.for("neurolink.onErrorFired"); see
    // utils/lifecycleCallbacks.ts). Skip here so consumers don't receive
    // duplicate onError events for the same failure.
    if (hasLifecycleErrorFired(err)) {
      return;
    }
    const lifecycle = getLifecycleMiddlewareConfig(options);
    const onError = lifecycle?.onError;
    if (!onError) {
      return;
    }
    // Set the marker before invoking so a sync re-entry (or a concurrent
    // dispatch path) can't double-fire onError for the same error object.
    markLifecycleErrorFired(err);
    // Fire the consumer's onError with a bounded deadline AND await its
    // completion — callers can now `await fireLifecycleErrorCallback(...)`
    // to guarantee the consumer's async onError settles before the
    // surrounding stream() / executeFakeStreaming() rethrows. Deadline is
    // configurable via `lifecycle.timeoutMs` or the
    // `NEUROLINK_LIFECYCLE_TIMEOUT_MS` env var.
    const timeoutMs = resolveLifecycleTimeoutMs(lifecycle);
    try {
      await withTimeoutFn(
        async () => {
          // Capturing `onError` into a const above means TypeScript sees the
          // narrowing past the early-return, so no non-null assertion needed
          // here — and the callback identity is stable across the timeout
          // boundary even if the caller mutates `lifecycle.onError` mid-call.
          const ret = onError({
            error: err,
            duration: 0,
            recoverable: false,
          });
          if (ret && typeof (ret as Promise<unknown>).then === "function") {
            await ret;
          }
        },
        timeoutMs,
        `[lifecycle] onError callback exceeded ${timeoutMs}ms`,
      );
    } catch (e) {
      logger.warn("[lifecycle] onError callback error:", e);
    }
  }

  /**
   * Build the fake-stream output and apply the same incremental TTS wrapper
   * used by the standard NeuroLink stream path.
   */
  private createFakeStreamingOutput(
    result: EnhancedGenerateResult | null,
    options: StreamOptions,
    onTTSComplete?: (result: TTSResult | undefined) => void,
  ): AsyncIterable<
    | { content: string }
    | {
        type: "image";
        imageOutput: NonNullable<EnhancedGenerateResult["imageOutput"]>;
      }
    | { type: "tts_audio"; audio: TTSChunk }
  > {
    const incrementalTTS = options.tts?.enabled === true;
    const source = (async function* () {
      if (result?.content) {
        const words = result.content.split(/(\s+)/);
        let buffer = "";

        for (let i = 0; i < words.length; i++) {
          buffer += words[i];
          const shouldYield =
            i === words.length - 1 ||
            buffer.length > 50 ||
            /[.!?;,]\s*$/.test(buffer);
          if (shouldYield && buffer.trim()) {
            yield { content: buffer };
            buffer = "";
            await new Promise((resolve) => {
              setTimeout(resolve, Math.random() * 9 + 1);
            });
          }
        }

        if (buffer.trim()) {
          yield { content: buffer };
        }
      }

      if (result?.imageOutput) {
        yield { type: "image" as const, imageOutput: result.imageOutput };
      }

      if (result?.audio && !incrementalTTS) {
        yield {
          type: "tts_audio" as const,
          audio: {
            data: result.audio.buffer,
            format: result.audio.format,
            index: 0,
            isFinal: true,
            cumulativeSize: result.audio.size,
            voice: result.audio.voice,
            sampleRate: result.audio.sampleRate,
          },
        };
      }
    })();

    if (!incrementalTTS || !options.tts) {
      return source;
    }

    return interleaveTTSStream({
      stream: source,
      provider: options.tts.provider ?? options.provider ?? this.providerName,
      options: options.tts,
      onComplete: onTTSComplete,
    });
  }

  /**
   * Execute fake streaming - extracted method for reusability
   */
  private async executeFakeStreaming(
    options: StreamOptions,
    analysisSchema?: ValidationSchema,
  ): Promise<StreamResult> {
    try {
      logger.info(`Starting fake streaming with tools`, {
        provider: this.providerName,
        supportsTools: this.supportsTools(),
        timestamp: Date.now(),
      });

      // Convert stream options to text generation options
      const textOptions: TextGenerationOptions = {
        prompt: options.input?.text || "",
        input: options.input,
        systemPrompt: options.systemPrompt,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        tools: options.tools, // 🔧 FIX: Pass user-provided tools (including RAG tools) to generation pipeline
        disableTools: !!options.disableTools,
        maxSteps: options.maxSteps || 5,
        provider: options.provider as AIProviderName | undefined,
        model: options.model,
        region: options.region, // Pass region for Vertex AI
        // 🔧 FIX: Include analytics and evaluation options from stream options
        enableAnalytics: options.enableAnalytics,
        enableEvaluation: options.enableEvaluation,
        evaluationDomain: options.evaluationDomain,
        toolUsageContext: options.toolUsageContext,
        context: options.context as Record<string, JsonValue> | undefined,
        csvOptions: options.csvOptions,
        pdfOptions: options.pdfOptions,
        // Forward abort, tool filtering, and timeout options to prevent
        // silent bypass when falling back from real streaming to fake streaming
        abortSignal: options.abortSignal,
        toolFilter: options.toolFilter,
        excludeTools: options.excludeTools,
        skipToolPromptInjection: options.skipToolPromptInjection,
        timeout: options.timeout,
        stt: options.stt,
        // Streaming TTS is synthesized incrementally by
        // createFakeStreamingOutput; do not let generate() perform a duplicate
        // input- or whole-response synthesis first.
        tts: options.tts?.enabled ? undefined : options.tts,
      };

      logger.debug(`Calling generate for fake streaming`, {
        provider: this.providerName,
        maxSteps: textOptions.maxSteps,
        disableTools: textOptions.disableTools,
        timestamp: Date.now(),
      });

      const result = await this.generate(textOptions, analysisSchema);
      logger.info(`Generate completed for fake streaming`, {
        provider: this.providerName,
        hasContent: !!result?.content,
        contentLength: result?.content?.length || 0,
        toolsUsed: result?.toolsUsed?.length || 0,
        hasImageOutput: !!result?.imageOutput,
        timestamp: Date.now(),
      });

      const incrementalTTS = options.tts?.enabled === true;
      const ttsProvider =
        options.tts?.provider ?? options.provider ?? this.providerName;
      const ttsStartedAt = Date.now();
      let resolveAudio: ((value: TTSResult | undefined) => void) | undefined;
      let audioSettled = false;
      const audio = incrementalTTS
        ? new Promise<TTSResult | undefined>((resolve) => {
            resolveAudio = resolve;
          }).catch(() => undefined)
        : undefined;
      const ttsMetadata: TTSMetadata | undefined = incrementalTTS
        ? {
            attempted: TTSProcessor.supports(ttsProvider),
            success: false,
          }
        : result?.ttsMetadata;
      const onTTSComplete = incrementalTTS
        ? (
            ttsResult: TTSResult | undefined,
            error?: NonNullable<TTSMetadata["error"]>,
          ) => {
            if (audioSettled) {
              return;
            }
            audioSettled = true;
            if (ttsMetadata) {
              ttsMetadata.success =
                error === undefined && ttsResult !== undefined;
              if (error) {
                ttsMetadata.error = error;
              } else {
                delete ttsMetadata.error;
              }
              ttsMetadata.latency = Date.now() - ttsStartedAt;
            }
            resolveAudio?.(ttsResult);
          }
        : undefined;

      // Create a synthetic stream from the generate result that simulates progressive delivery
      return {
        stream: this.createFakeStreamingOutput(result, options, onTTSComplete),
        usage: result?.usage,
        provider: result?.provider,
        model: result?.model,
        toolCalls: result?.toolCalls?.map((call) => ({
          toolName: call.toolName,
          parameters: call.args,
          id: call.toolCallId,
        })),
        toolResults: result?.toolResults
          ? result.toolResults.map((tr) => ({
              toolName: ((tr as UnknownRecord).toolName as string) || "unknown",
              status: (((tr as UnknownRecord).status as string) === "error"
                ? "failure"
                : "success") as "success" | "failure",
              result:
                (tr as UnknownRecord).output ?? (tr as UnknownRecord).result,
              error: (tr as UnknownRecord).error as string | undefined,
            }))
          : undefined,
        // 🔧 FIX: Include analytics and evaluation from generate result
        analytics: result?.analytics,
        evaluation: result?.evaluation,
        audio,
        ttsMetadata,
      };
    } catch (error) {
      logger.error(
        `Fake streaming fallback failed for ${this.providerName}:`,
        error,
      );
      // Fire the consumer-supplied onError BEFORE re-throwing through
      // handleProviderError() so callers using onChunk/onFinish/onError
      // get notified even when fake-streaming setup (message build, image
      // adapter, etc.) fails synchronously. Awaited so the consumer's
      // async onError fully settles before we rethrow. The shared
      // lifecycle-fired WeakSet mark prevents double-fire if a wrapper
      // layer also handles this.
      await this.fireLifecycleErrorCallback(options, error);
      throw this.handleProviderError(error);
    }
  }

  /**
   * Apply per-call tool filtering (whitelist/blacklist) to a tools record.
   *
   * All filtering surfaces are merged into one ResolvedToolPolicy by
   * `resolveToolPolicy()` — per-call `toolFilter` (whitelist),
   * `enabledToolNames` (merged into the whitelist, as its docs always
   * promised), `excludeTools` (denylist, applied after the whitelist), and
   * the instance-level `tools` config (enabled/include/exclude, `*` globs) —
   * then applied by `applyToolGate()`. This is the single filter semantics
   * for every generate/stream path.
   */
  private getToolPolicy(options: {
    toolFilter?: string[];
    excludeTools?: string[];
    enabledToolNames?: string[];
    disableTools?: boolean;
  }): ResolvedToolPolicy {
    return resolveToolPolicy({
      options: {
        // Defense-in-depth: both current call sites already zero the tool
        // record via shouldUseTools before the gate runs, but forwarding
        // disableTools makes the gate self-sufficient for any future call
        // site that forgets the upstream check.
        disableTools: options.disableTools,
        toolFilter: options.toolFilter,
        excludeTools: options.excludeTools,
        enabledToolNames: options.enabledToolNames,
      },
      instanceConfig: this.neurolink?.getToolsConfig(),
      builtinToolNames: Object.keys(this.directTools ?? {}),
    });
  }

  private applyToolFiltering(
    tools: Record<string, Tool>,
    options: {
      toolFilter?: string[];
      excludeTools?: string[];
      enabledToolNames?: string[];
      toolChoice?: unknown;
      disableTools?: boolean;
    },
  ): Record<string, Tool> {
    const policy = this.getToolPolicy(options);

    // Check whether the dedup pass is requested — even when no whitelist/
    // denylist is set we still need to run the dedup pass if enabled.
    const dedupConfig = this.neurolink?.getToolDedupConfig();
    const hasDedupEnabled =
      dedupConfig !== undefined && dedupConfig.enabled === true;

    const beforeCount = Object.keys(tools).length;
    const filtered = applyToolGate(tools, policy);

    const afterCount = Object.keys(filtered).length;
    if (beforeCount !== afterCount) {
      logger.debug(`Tool filtering applied`, {
        provider: this.providerName,
        beforeCount,
        afterCount,
        policySources: policy.sources,
        toolFilter: options.toolFilter,
        excludeTools: options.excludeTools,
        enabledToolNames: options.enabledToolNames,
      });
    }

    if (!hasDedupEnabled || dedupConfig === undefined) {
      return this.sortToolRecord(filtered);
    }

    const deduped = this.applyDedupPass(filtered, dedupConfig);

    // A forced toolChoice must survive dedup: keep-first can collapse the
    // forced tool into an earlier near-identical signature, and the provider
    // would then reject the request for naming an unknown tool. Restore it
    // from the pre-dedup record (whitelisted names are already safe — the
    // gate runs before dedup, so a whitelist leaves no duplicate to lose to).
    const forcedName = (
      options.toolChoice as { type?: string; toolName?: string } | undefined
    )?.toolName;
    if (
      typeof forcedName === "string" &&
      !Object.hasOwn(deduped, forcedName) &&
      Object.hasOwn(filtered, forcedName)
    ) {
      deduped[forcedName] = filtered[forcedName];
      logger.debug(
        `Restored toolChoice-forced tool removed by signature dedup`,
        { provider: this.providerName, toolName: forcedName },
      );
    }

    return this.sortToolRecord(deduped);
  }

  /**
   * Deterministic name-sorted key order. External MCP servers connect and
   * discover in parallel, so insertion order varies across process restarts;
   * providers serialize this record in key order (and Anthropic pins its
   * cache_control breakpoint to the LAST tool), so an unstable order silently
   * busts provider prompt caches. Runs AFTER the dedup pass — dedup's
   * keep-first policy must see phase order (built-ins first) so duplicate
   * winners don't flip when an MCP tool name sorts earlier.
   */
  private sortToolRecord(tools: Record<string, Tool>): Record<string, Tool> {
    // Null prototype: a tool named "__proto__" must become an own entry, not
    // a prototype mutation that silently drops the tool.
    const sorted: Record<string, Tool> = Object.create(null) as Record<
      string,
      Tool
    >;
    for (const name of Object.keys(tools).sort()) {
      sorted[name] = tools[name];
    }
    return sorted;
  }

  /**
   * On-demand discovery (`tools.discovery: true`): defer external MCP tool
   * schemas behind one `search_tools` meta-tool. Built-in tools, per-call
   * tools, explicitly whitelisted tools, and session-pinned (previously
   * discovered) tools always stay hot. No-op when discovery is off — with a
   * one-time WARN when the catalog is large enough that selection accuracy
   * measurably degrades.
   */
  private async applyToolDiscovery(
    toolsInput: Record<string, Tool>,
    options: TextGenerationOptions | StreamOptions,
  ): Promise<Record<string, Tool>> {
    // Strip a stale meta-tool left by a previous resolution pass (the
    // stream → generate fallback re-enters resolution with options.tools
    // already partitioned). Discovery re-partitions against the fresh merged
    // record below; without this, the collision guard would see our own
    // meta-tool and skip partitioning, shipping the full catalog AND a stale
    // search_tools closure. Real user tools named "search_tools" are not
    // marked and are left untouched.
    let tools = toolsInput;
    if (isDiscoveryMetaTool(tools["search_tools"])) {
      const { search_tools: _stale, ...rest } = tools;
      tools = rest;
    }

    const toolCount = Object.keys(tools).length;
    const policy = this.getToolPolicy(options);

    if (!policy.discovery) {
      if (toolCount > LARGE_CATALOG_WARN_THRESHOLD) {
        this.warnLargeCatalogOnce(toolCount);
      }
      return tools;
    }

    const externalTools = this.neurolink?.getExternalMCPTools() ?? [];
    if (externalTools.length === 0) {
      return tools;
    }

    // Session pinning requires a caller-provided sessionId. Without one there
    // is no session identity — pinning to a shared fallback key would leak
    // one caller's discoveries into every other caller of a shared instance
    // and monotonically defeat deferral, so pins are simply not persisted.
    const rawSessionId = (
      options.context as Record<string, unknown> | undefined
    )?.sessionId;
    const sessionKey =
      typeof rawSessionId === "string" && rawSessionId.length > 0
        ? rawSessionId
        : typeof rawSessionId === "number"
          ? String(rawSessionId)
          : undefined;
    const pinnedNames =
      (sessionKey ? this.neurolink?.getDiscoveryPins(sessionKey) : undefined) ??
      new Set<string>();
    const perCallNames = new Set(Object.keys(options.tools ?? {}));
    // Explicitly requested tools stay hot. Allowlist entries may be globs
    // (e.g. toolFilter: ["github*"]), so match with the same pattern matcher
    // the gate uses — a Set of pattern STRINGS would defer glob-whitelisted
    // tools the gate deliberately kept.
    const explicitPatterns = [
      ...(options.toolFilter ?? []),
      ...((options as { enabledToolNames?: string[] }).enabledToolNames ?? []),
    ];
    // A toolChoice that forces a named tool must never see that tool
    // deferred — the provider would reject the request (unknown tool name).
    const toolChoice = (
      options as { toolChoice?: { type?: string; toolName?: string } }
    ).toolChoice;
    if (toolChoice && typeof toolChoice.toolName === "string") {
      explicitPatterns.push(toolChoice.toolName);
    }
    const explicitMatcher =
      explicitPatterns.length > 0 ? toolNameMatcher(explicitPatterns) : null;

    const deferrableNames = externalTools
      .map((t) => t.name)
      .filter(
        (name) =>
          name in tools &&
          !perCallNames.has(name) &&
          !(explicitMatcher ? explicitMatcher(name) : false),
      );

    return partitionToolsForDiscovery(tools, {
      deferrableNames,
      pinnedNames,
      onHydrate: (names) => {
        if (sessionKey) {
          this.neurolink?.pinDiscoveredTools(sessionKey, names);
        }
      },
    });
  }

  private static warnedLargeCatalog = false;

  private warnLargeCatalogOnce(toolCount: number): void {
    if (BaseProvider.warnedLargeCatalog) {
      return;
    }
    BaseProvider.warnedLargeCatalog = true;
    logger.warn(
      `[ToolDiscovery] ${toolCount} tools are being sent in full on every request (~${Math.round((toolCount * 175) / 100) / 10}K tokens). Tool-selection accuracy degrades past 30-50 tools — consider enabling on-demand discovery: new NeuroLink({ tools: { discovery: true } })`,
      { toolCount, provider: this.providerName },
    );
  }

  /**
   * Opt-in signature dedup — runs AFTER whitelist/blacklist filtering and
   * BEFORE the tool set reaches the provider call.  Fails open: any error
   * inside dedupeTools returns the original filtered set unchanged.
   */
  private applyDedupPass(
    filtered: Record<string, Tool>,
    dedupConfig: ToolDedupConfig,
  ): Record<string, Tool> {
    const { tools: dedupedTools, removed } = dedupeTools(filtered, dedupConfig);
    if (removed.length > 0 && logger.shouldLog("debug")) {
      logger.debug(`Tool signature dedup removed duplicates`, {
        provider: this.providerName,
        removedCount: removed.length,
        removed: removed.map((r) => ({
          name: r.name,
          duplicateOf: r.duplicateOf,
          similarity: r.similarity,
        })),
      });
    }
    return dedupedTools;
  }

  /**
   * Prepare generation context including tools and model
   */
  private async prepareGenerationContext(
    options: TextGenerationOptions,
  ): Promise<{
    tools: Record<string, Tool>;
    model: LanguageModel;
  }> {
    const shouldUseTools = this.shouldUseTools(options, true);
    const baseTools = shouldUseTools ? await this.getAllTools() : {};
    let tools = shouldUseTools
      ? {
          ...baseTools,
          ...(options.tools || {}),
        }
      : {};

    // Apply per-call tool filtering (whitelist/blacklist)
    tools = this.applyToolFiltering(tools, options);

    // Per-call execution capture: wrap every executable tool so real
    // params/results/timing surface on result.toolExecutions. Must run
    // BEFORE discovery — search_tools hydration mutates the discovery
    // record in place, so tools hydrated mid-turn stay wrapped.
    tools = this.wrapToolsForExecutionCapture(tools, options);

    // On-demand discovery: defer external MCP schemas behind search_tools
    tools = await this.applyToolDiscovery(tools, options);

    logger.debug(`Final tools prepared for AI`, {
      provider: this.providerName,
      directTools: getKeyCount(baseTools),
      directToolNames: getKeysAsString(baseTools),
      externalTools: getKeyCount(options.tools || {}),
      externalToolNames: getKeysAsString(options.tools || {}),
      totalTools: getKeyCount(tools),
      totalToolNames: getKeysAsString(tools),
      shouldUseTools,
      timestamp: Date.now(),
    });

    const model = await this.getAISDKModelWithMiddleware(options);
    return { tools, model };
  }

  /**
   * Get merged tools for streaming: combines base tools (MCP/built-in) with
   * user-provided tools (e.g., RAG tools passed via options.tools).
   *
   * This is the canonical tool-merge pattern for executeStream() implementations.
   * All providers should call this instead of getAllTools() directly.
   */
  protected async getToolsForStream(
    options: StreamOptions | TextGenerationOptions,
  ): Promise<Record<string, Tool>> {
    const shouldUseTools = this.shouldUseTools(options);
    if (!shouldUseTools) {
      return {};
    }
    const baseTools = await this.getAllTools();
    const externalTools = (options.tools || {}) as Record<string, Tool>;
    let merged = { ...baseTools, ...externalTools };

    // Apply per-call tool filtering (whitelist/blacklist)
    merged = this.applyToolFiltering(merged, options);

    // Per-call execution capture (native loops obtain their tools here, so
    // this single wrap covers the Gemini/Anthropic native paths too). Must
    // run BEFORE discovery so tools hydrated mid-turn stay wrapped.
    merged = this.wrapToolsForExecutionCapture(merged, options);

    // On-demand discovery: defer external MCP schemas behind search_tools
    merged = await this.applyToolDiscovery(merged, options);

    logger.debug(`Tools prepared for streaming`, {
      provider: this.providerName,
      baseToolCount: Object.keys(baseTools).length,
      externalToolCount: Object.keys(externalTools).length,
      totalToolCount: Object.keys(merged).length,
    });

    return merged;
  }

  /**
   * Create (or reuse) the per-call ToolExecutionRecorder and wrap the final
   * tool record with it. The recorder rides on the options object so provider
   * loops and result assembly observe the same capture state; wrapping is
   * idempotent, so paths that re-enter (stream→generate fallback) never
   * double-record.
   */
  protected wrapToolsForExecutionCapture(
    tools: Record<string, Tool>,
    options: StreamOptions | TextGenerationOptions,
  ): Record<string, Tool> {
    if (Object.keys(tools).length === 0) {
      return tools;
    }
    let recorder = ToolExecutionRecorder.from(options);
    if (!recorder) {
      recorder = new ToolExecutionRecorder(
        (options as TextGenerationOptions).toolExecutionCapture,
      );
      recorder.attachTo(options);
    }
    return recorder.wrapTools(tools);
  }

  /**
   * Build messages array for generation - delegated to MessageBuilder
   */
  private async buildMessages(
    options: TextGenerationOptions,
  ): Promise<ModelMessage[]> {
    return this.messageBuilder.buildMessages(options);
  }

  /**
   * Build messages array for streaming operations - delegated to MessageBuilder
   * This is a protected helper method that providers can use to build messages
   * with automatic multimodal detection, eliminating code duplication
   *
   * @param options - Stream options or text generation options
   * @returns Promise resolving to ModelMessage array ready for AI SDK
   */
  protected async buildMessagesForStream(
    options: StreamOptions | TextGenerationOptions,
  ): Promise<ModelMessage[]> {
    return this.messageBuilder.buildMessagesForStream(options);
  }

  /**
   * Execute the generation with AI SDK - delegated to GenerationHandler
   */
  private async executeGeneration(
    model: LanguageModel,
    messages: ModelMessage[],
    tools: Record<string, Tool>,
    options: TextGenerationOptions,
  ): Promise<Awaited<ReturnType<typeof generateText>>> {
    return this.generationHandler.executeGeneration(
      model,
      messages,
      tools,
      options,
    );
  }

  /**
   * Log generation completion information - delegated to GenerationHandler
   */
  private logGenerationComplete(
    generateResult: Awaited<ReturnType<typeof generateText>>,
  ): void {
    this.generationHandler.logGenerationComplete(generateResult);
  }

  /**
   * Record performance metrics - delegated to TelemetryHandler
   */
  private async recordPerformanceMetrics(
    usage: RawUsageObject | undefined,
    responseTime: number,
  ): Promise<void> {
    await this.telemetryHandler.recordPerformanceMetrics(usage, responseTime);
  }

  /**
   * Extract tool information from generation result - delegated to GenerationHandler
   */
  private extractToolInformation(
    generateResult: Awaited<ReturnType<typeof generateText>>,
  ): {
    toolsUsed: string[];
    toolExecutions: Array<{
      name: string;
      input: StandardRecord;
      output: unknown;
    }>;
  } {
    return this.generationHandler.extractToolInformation(generateResult);
  }

  /**
   * Format the enhanced result - delegated to GenerationHandler
   */
  private formatEnhancedResult(
    generateResult: Awaited<ReturnType<typeof generateText>>,
    tools: Record<string, Tool>,
    toolsUsed: string[],
    toolExecutions: ToolExecutionRecord[],
    options: TextGenerationOptions,
  ): EnhancedGenerateResult {
    return this.generationHandler.formatEnhancedResult(
      generateResult,
      tools,
      toolsUsed,
      toolExecutions,
      options,
    );
  }

  /**
   * Analyze AI response structure and log detailed debugging information - delegated to GenerationHandler
   */
  private analyzeAIResponse(result: unknown): void {
    this.generationHandler.analyzeAIResponse(result);
  }

  /**
   * Text generation method - implements AIProvider interface
   * Tools are always available unless explicitly disabled
   *
   * Supports Text-to-Speech (TTS) audio generation in two modes:
   * 1. Direct synthesis (default): TTS synthesizes the input text without AI generation
   * 2. AI response synthesis: TTS synthesizes the AI-generated response after generation
   *
   * When TTS is enabled with useAiResponse=false (default), the method returns early with
   * only the audio result, skipping AI generation entirely for optimal performance.
   *
   * When TTS is enabled with useAiResponse=true, the method performs full AI generation
   * and then synthesizes the AI response to audio.
   *
   * @param optionsOrPrompt - Generation options or prompt string
   * @param _analysisSchema - Optional analysis schema (not used)
   * @returns Enhanced result with optional audio field containing TTSResult
   *
   * IMPLEMENTATION NOTE: Uses streamText() under the hood and accumulates results
   * for consistency and better performance
   */
  /**
   * Ensure runtime-discovered model limits (context window, output-token
   * ceiling) are registered before any budget math runs. Generation
   * pipelines await this BEFORE `checkContextBudget`, and generate()/stream()
   * await it before options normalization so `getSafeMaxTokens` sees the
   * discovered output ceiling.
   *
   * Default no-op. Providers with a runtime discovery source override it
   * (e.g. LiteLLM's `/model/info`). Implementations must NEVER reject —
   * discovery failure degrades to the static defaults.
   */
  async ensureModelLimits(): Promise<void> {}

  async generate(
    optionsOrPrompt: TextGenerationOptions | string,
    _analysisSchema?: ValidationSchema,
  ): Promise<EnhancedGenerateResult | null> {
    // Runtime model limits must land before normalizeTextOptions resolves
    // maxTokens (getSafeMaxTokens consults the discovered output ceiling).
    await this.ensureModelLimits();
    const options = this.normalizeTextOptions(optionsOrPrompt);
    this.validateOptions(options);
    const startTime = Date.now();

    // OTEL span for provider-level generate tracing
    // Use startActiveSpan pattern via context.with() so child spans become descendants
    const otelSpan = tracers.provider.startSpan("neurolink.provider.generate", {
      kind: SpanKind.CLIENT,
      attributes: {
        [ATTR.GEN_AI_SYSTEM]: this.providerName || "unknown",
        [ATTR.GEN_AI_MODEL]: this.modelName || options.model || "unknown",
        [ATTR.GEN_AI_OPERATION]: "generate",
        [ATTR.NL_PROVIDER]: this.providerName || "unknown",
      },
    });
    // Set this span as the active context so child spans (GenerationHandler, etc.) become descendants
    const activeCtx = trace.setSpan(context.active(), otelSpan);
    const otelSpanState = { ended: false };

    return await context.with(activeCtx, async () =>
      this.runGenerateInActiveContext(
        options,
        startTime,
        otelSpan,
        otelSpanState,
      ),
    );
  }
  /**
   * Alias for generate method - implements AIProvider interface
   */
  async gen(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: ValidationSchema,
  ): Promise<EnhancedGenerateResult | null> {
    return this.generate(optionsOrPrompt, analysisSchema);
  }

  private async runGenerateInActiveContext(
    options: TextGenerationOptions,
    startTime: number,
    otelSpan: ReturnType<typeof tracers.provider.startSpan>,
    otelSpanState: { ended: boolean },
  ): Promise<EnhancedGenerateResult | null> {
    try {
      // Single source of truth for "what kind of request is this" — see
      // resolveRequestKind's doc comment for the full precedence table.
      const requestKind = resolveRequestKind(options, this.modelName);

      if (requestKind === "video") {
        return await this.handleVideoGeneration(options, startTime);
      }

      if (requestKind === "image") {
        logger.info(
          `Image generation model detected, routing to executeImageGeneration`,
          {
            provider: this.providerName,
            model: this.modelName,
          },
        );

        const imageResult = await this.executeImageGeneration(options);
        return await this.enhanceResult(imageResult, options, startTime);
      }

      if (requestKind === "tts-direct") {
        return this.handleDirectTTSSynthesis(options, startTime);
      }

      const { tools, model } = await this.prepareGenerationContext(options);
      const messages = await this.buildMessages(options);
      const videoFrameResult = await this.handleVideoFrameGeneration(
        options,
        messages,
        model,
        startTime,
      );
      if (videoFrameResult) {
        return videoFrameResult;
      }

      return await this.executeStandardGenerateFlow(
        options,
        startTime,
        model,
        messages,
        tools,
      );
    } catch (error) {
      otelSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      otelSpan.end();
      otelSpanState.ended = true;

      if (isAbortError(error)) {
        logger.info(`Generate aborted for ${this.providerName}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      } else {
        logger.error(`Generate failed for ${this.providerName}:`, error);
      }
      throw this.handleProviderError(error);
    } finally {
      if (!otelSpanState.ended) {
        otelSpan.setStatus({ code: SpanStatusCode.OK });
        otelSpan.end();
      }
    }
  }

  protected async handleDirectTTSSynthesis(
    options: TextGenerationOptions,
    startTime: number,
  ): Promise<EnhancedGenerateResult> {
    const textToSynthesize = options.prompt ?? options.input?.text ?? "";
    const baseResult: EnhancedGenerateResult = {
      content: textToSynthesize,
      provider: options.provider ?? this.providerName,
      model: this.modelName,
      usage: { input: 0, output: 0, total: 0 },
    };

    const ttsOptions = options.tts;
    if (!ttsOptions) {
      return this.enhanceResult(baseResult, options, startTime);
    }

    const ttsStartTime = Date.now();
    const ttsProvider =
      ttsOptions.provider ?? options.provider ?? this.providerName;
    const ttsTimeout = this.getTimeout(options);
    try {
      baseResult.audio = await withTimeoutFn(
        () =>
          TTSProcessor.synthesize(textToSynthesize, ttsProvider, ttsOptions),
        ttsTimeout,
        `TTS synthesis timed out after ${ttsTimeout}ms for provider "${ttsProvider}"`,
      );
      baseResult.ttsMetadata = {
        attempted: true,
        success: true,
        latency: Date.now() - ttsStartTime,
      };
    } catch (ttsError) {
      const latency = Date.now() - ttsStartTime;
      const error = this.getTTSErrorDetails(ttsError);
      baseResult.ttsMetadata = {
        attempted: true,
        success: false,
        error,
        latency,
      };
      this.telemetryHandler.recordTTSFailure(ttsProvider, error, latency);
      logger.error(
        `TTS synthesis failed in Mode 1 (direct input synthesis):`,
        ttsError,
      );
    }

    return this.enhanceResult(baseResult, options, startTime);
  }

  private async handleVideoFrameGeneration(
    options: TextGenerationOptions,
    messages: ModelMessage[],
    model: LanguageModel,
    startTime: number,
  ): Promise<EnhancedGenerateResult | null> {
    if (!hasVideoFrames(messages)) {
      return null;
    }
    // Bug 2 fix: callers requesting structured output (schema or explicit
    // output.format) must NOT be hijacked into the prose-returning video
    // analysis path. Without this gate, schema/format are silently dropped
    // whenever messages contain >=3 image parts.
    if (options.schema !== undefined || options.output?.format !== undefined) {
      logger.info(
        "[VideoFrameGen] Skipping video-frame analysis route; caller requested structured output",
        {
          provider: this.providerName,
          model: this.modelName,
          hasSchema: options.schema !== undefined,
          outputFormat: options.output?.format,
        },
      );
      return null;
    }

    const videoAnalysisResult = await executeVideoAnalysis(messages, {
      provider: options.provider,
      providerName: this.providerName,
      region: options.region,
    });
    const userText = messages
      .filter((m) => m.role === "user")
      .flatMap((m) =>
        Array.isArray(m.content)
          ? m.content
              .filter(
                (p): p is { type: "text"; text: string } => p.type === "text",
              )
              .map((p) => p.text)
          : [typeof m.content === "string" ? m.content : ""],
      )
      .filter(Boolean)
      .join("\n")
      .trim();

    let formattedContent = videoAnalysisResult;
    let usage = { input: 0, output: 0, total: 0 };

    if (options.systemPrompt) {
      try {
        const formattingPrompt = userText
          ? `The user asked: "${userText}"\n\nHere is the video/image analysis result from the visual analysis system:\n\n${videoAnalysisResult}\n\nBased on this analysis, provide your response.`
          : `Here is a video/image analysis result from the visual analysis system:\n\n${videoAnalysisResult}\n\nBased on this analysis, provide your response.`;

        logger.debug("[VideoAnalysis] Formatting via Claude", {
          userTextLength: userText.length,
          analysisLength: videoAnalysisResult.length,
        });

        const formattedResult = await generateText({
          model,
          system: options.systemPrompt,
          messages: [{ role: "user" as const, content: formattingPrompt }],
          maxOutputTokens: options.maxTokens || 8192,
          temperature: 0.3,
          abortSignal: options.abortSignal,
          experimental_telemetry: this.telemetryHandler?.getTelemetryConfig(
            options,
            "generate",
          ),
        });
        formattedContent = formattedResult.text;
        usage = extractTokenUsage(
          formattedResult.totalUsage ?? formattedResult.usage,
        );

        logger.debug("[VideoAnalysis] Claude formatting complete", {
          formattedLength: formattedContent.length,
          usage,
        });
      } catch (error) {
        logger.warn(
          "[VideoAnalysis] Claude formatting failed, using raw Gemini output",
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }

    return this.enhanceResult(
      {
        content: formattedContent,
        provider: options.provider ?? this.providerName,
        model: this.modelName,
        usage,
      },
      options,
      startTime,
    );
  }

  private async executeStandardGenerateFlow(
    options: TextGenerationOptions,
    startTime: number,
    model: LanguageModel,
    messages: ModelMessage[],
    tools: Record<string, Tool>,
  ): Promise<EnhancedGenerateResult> {
    // Apply a defensive default timeout when the caller didn't pass one.
    // Without this guard, AI SDK's generateText() will wait forever on
    // an upstream that accepts the connection but never produces a response
    // (observed against the litellm gateway when a request triggers the
    // team-access denial path — connection stays open, no response is sent,
    // and the matrix test hangs the entire suite). Callers can still pass
    // a larger value (e.g. video generation passes 10 min).
    //
    // A provider descriptor may declare a LARGER generate budget than the
    // 3-min floor (litellm: 300s — slow proxied models routinely need more
    // than 180s end-to-end even while streaming). The declared value only
    // ever raises the default, never lowers it: several descriptors carry
    // aspirational sub-180s numbers (openai 30s, bedrock 45s) that were
    // never enforced on this path, and enforcing them now would break
    // long-running generations that have always been allowed.
    const descriptorGenerateMs = PROVIDER_DESCRIPTORS_BY_NAME.get(
      this.providerName,
    )?.timeouts?.generateMs;
    const effectiveTimeout =
      options.timeout ?? Math.max(descriptorGenerateMs ?? 0, 180_000);
    const timeoutController = createTimeoutController(
      effectiveTimeout,
      this.providerName,
      "generate",
    );
    const composedSignal = composeAbortSignals(
      options.abortSignal,
      timeoutController?.controller.signal,
    );
    const composedOptions = composedSignal
      ? { ...options, abortSignal: composedSignal }
      : options;

    let generateResult: Awaited<ReturnType<typeof generateText>>;
    try {
      generateResult = await this.executeGeneration(
        model,
        messages,
        tools,
        composedOptions,
      );
    } finally {
      timeoutController?.cleanup();
    }

    this.analyzeAIResponse(generateResult);
    this.logGenerationComplete(generateResult);
    const responseTime = Date.now() - startTime;

    const { toolsUsed, toolExecutions } =
      this.extractToolInformation(generateResult);
    // Prefer the per-call recorder's real records (params/result/timing per
    // execution); fall back to a conversion of the step-extraction entries
    // for tools the recorder could not wrap (provider-executed tools).
    const toolExecutionRecords = resolveToolExecutionRecords(
      options,
      toolExecutions,
    );
    let enhancedResult = this.formatEnhancedResult(
      generateResult,
      tools,
      toolsUsed,
      toolExecutionRecords,
      options,
    );

    // Recorded AFTER formatEnhancedResult so telemetry sees the same usage
    // the caller gets: the cross-step aggregate (totalUsage, not last-step
    // usage) WITH the providerMetadata cache merge applied — otherwise
    // providers whose cache data lives only in providerMetadata would have
    // their cache tokens billed at the full input rate in OTEL metrics,
    // diverging from analytics.cost.
    await this.recordPerformanceMetrics(enhancedResult.usage, responseTime);
    enhancedResult = await this.synthesizeAIResponseIfNeeded(
      enhancedResult,
      options,
    );

    const finalResult = await this.enhanceResult(
      enhancedResult,
      options,
      startTime,
    );
    return finalResult;
  }

  protected async synthesizeAIResponseIfNeeded(
    enhancedResult: EnhancedGenerateResult,
    options: TextGenerationOptions,
  ): Promise<EnhancedGenerateResult> {
    if (!options.tts?.enabled || !options.tts?.useAiResponse) {
      return enhancedResult;
    }

    const ttsOptions = options.tts;
    const aiResponse = enhancedResult.content;
    const ttsProvider =
      ttsOptions.provider ?? options.provider ?? this.providerName;
    if (!aiResponse || !ttsProvider) {
      logger.warn(`TTS synthesis skipped despite being enabled`, {
        provider: this.providerName,
        hasAiResponse: !!aiResponse,
        aiResponseLength: aiResponse?.length ?? 0,
        hasProvider: !!ttsProvider,
        ttsConfig: {
          enabled: options.tts?.enabled,
          useAiResponse: options.tts?.useAiResponse,
        },
        reason: !aiResponse
          ? "AI response is empty or undefined"
          : "Provider is missing",
      });
      return {
        ...enhancedResult,
        ttsMetadata: {
          attempted: false,
          success: false,
        },
      };
    }

    const ttsStartTime = Date.now();
    const ttsTimeout = this.getTimeout(options);
    try {
      const ttsResult = await withTimeoutFn(
        () => TTSProcessor.synthesize(aiResponse, ttsProvider, ttsOptions),
        ttsTimeout,
        `TTS synthesis timed out after ${ttsTimeout}ms for provider "${ttsProvider}"`,
      );
      return {
        ...enhancedResult,
        audio: ttsResult,
        ttsMetadata: {
          attempted: true,
          success: true,
          latency: Date.now() - ttsStartTime,
        },
      };
    } catch (ttsError) {
      const latency = Date.now() - ttsStartTime;
      const error = this.getTTSErrorDetails(ttsError);
      this.telemetryHandler.recordTTSFailure(ttsProvider, error, latency);
      logger.error(
        `TTS synthesis failed in Mode 2 (AI response synthesis):`,
        ttsError,
      );
      return {
        ...enhancedResult,
        ttsMetadata: {
          attempted: true,
          success: false,
          error,
          latency,
        },
      };
    }
  }

  /**
   * Build the public TTS failure detail.
   *
   * The message is redacted through the shared `sanitizeErrorCause` before it
   * leaves this method. It used to be an internal value that only reached the
   * logger; it is now carried on `result.ttsMetadata` and therefore reaches
   * SDK callers, who may forward it to an end user. Provider errors quote the
   * request URL often enough that a key in a query string is a real vector —
   * `redactUrlsInText` strips exactly that while leaving a bare URL readable,
   * so the diagnosis survives and the credential does not.
   */
  private getTTSErrorDetails(
    error: unknown,
  ): NonNullable<TTSMetadata["error"]> {
    const safeMessage = sanitizeErrorCause(error).message;

    if (error instanceof AsyncTimeoutError) {
      return {
        code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
        message: safeMessage,
        retriable: true,
      };
    }

    if (error instanceof NeuroLinkError) {
      return {
        code: error.code,
        message: safeMessage,
        retriable: error.retriable,
      };
    }

    return {
      code: TTS_ERROR_CODES.SYNTHESIS_FAILED,
      message: safeMessage,
    };
  }

  /**
   * BACKWARD COMPATIBILITY: Legacy generateText method
   * Converts EnhancedGenerateResult to TextGenerationResult format
   * Ensures existing scripts using createAIProvider().generateText() continue to work
   */
  async generateText(
    options: TextGenerationOptions,
  ): Promise<TextGenerationResult> {
    // Validate required parameters for backward compatibility - support both prompt and input.text
    const promptText = options.prompt || options.input?.text;
    if (
      !promptText ||
      typeof promptText !== "string" ||
      promptText.trim() === ""
    ) {
      throw new Error(
        "GenerateText options must include prompt or input.text as a non-empty string",
      );
    }

    // Call the main generate method
    const result = await this.generate(options);

    if (!result) {
      throw new Error("Generation failed: No result returned");
    }

    // Convert EnhancedGenerateResult to TextGenerationResult format
    return {
      content: result.content || "",
      provider: result.provider || this.providerName,
      model: result.model || this.modelName,
      usage: result.usage || {
        input: 0,
        output: 0,
        total: 0,
      },
      responseTime: 0, // BaseProvider doesn't track response time directly
      toolsUsed: result.toolsUsed || [],
      // Map ToolExecutionRecord entries to the legacy TextGenerationResult
      // shape: real timing and error status now come from the records.
      toolExecutions: result.toolExecutions?.map((te) => ({
        toolName: te.toolName,
        executionTime: te.durationMs,
        success: !te.isError,
      })),
      enhancedWithTools: !!(result.toolsUsed && result.toolsUsed.length > 0),
      analytics: result.analytics,
      evaluation: result.evaluation,
      audio: result.audio,
      // Forward reasoning fields populated by GenerationHandler from AI-SDK
      // reasoning parts (DeepSeek `reasoning_content`, Anthropic thinking,
      // Gemini thought parts, OpenAI o1).
      reasoning: result.reasoning,
      reasoningTokens: result.reasoningTokens,
    };
  }

  /**
   * Generate embeddings for text
   *
   * This is a default implementation that throws an error.
   * Providers that support embeddings (OpenAI, Google Vertex, Amazon Bedrock)
   * should override this method with their specific implementation.
   *
   * @param input - Text string or EmbedInput with text/image/mimeType
   * @param _modelName - Optional embedding model name (provider-specific)
   * @returns Promise resolving to the embedding vector (array of numbers)
   * @throws Error if the provider does not support embeddings
   *
   * @example
   * ```typescript
   * const provider = await ProviderFactory.createProvider('openai', 'text-embedding-3-small');
   * const embedding = await provider.embed('Hello world');
   * console.log(embedding); // [0.123, -0.456, ...]
   *
   * // Multi-modal embedding (Bedrock Titan Image / Nova)
   * const multiEmbedding = await provider.embed({ text: "a photo", image: imageBuffer, mimeType: "image/png" });
   * ```
   */
  async embed(
    input: string | EmbedInput,
    _modelName?: string,
  ): Promise<number[]> {
    const textLength =
      typeof input === "string" ? input.length : (input.text?.length ?? 0);
    logger.warn(
      `embed() called on ${this.providerName} which does not have a native implementation`,
      {
        textLength,
      },
    );
    throw new Error(
      `Embedding generation is not supported by the ${this.providerName} provider. ` +
        `Supported providers: openai, vertex/google, bedrock, cohere, voyage, jina. ` +
        `Use an embedding model like text-embedding-3-small (OpenAI), text-embedding-004 (Vertex), ` +
        `embed-english-v3.0 (Cohere), voyage-3 (Voyage), jina-embeddings-v3 (Jina), ` +
        `or amazon.titan-embed-text-v2:0 (Bedrock).`,
    );
  }

  /**
   * Generate embeddings for multiple texts in a single batch
   *
   * This is a default implementation that throws an error.
   * Providers that support embeddings should override this method.
   * The AI SDK's embedMany automatically handles chunking for models with batch limits.
   *
   * @param texts - The texts to embed
   * @param _modelName - Optional embedding model name (provider-specific)
   * @returns Promise resolving to an array of embedding vectors
   * @throws Error if the provider does not support embeddings
   */
  async embedMany(texts: string[], _modelName?: string): Promise<number[][]> {
    logger.warn(
      `embedMany() called on ${this.providerName} which does not have a native implementation`,
      {
        count: texts.length,
      },
    );
    throw new Error(
      `Batch embedding generation is not supported by the ${this.providerName} provider. ` +
        `Supported providers: openai, googleAiStudio, vertex/google, bedrock, cohere, voyage, jina. ` +
        `Use an embedding model like text-embedding-3-small (OpenAI), gemini-embedding-001 (Google AI), ` +
        `text-embedding-004 (Vertex), embed-english-v3.0 (Cohere), voyage-3 (Voyage), ` +
        `jina-embeddings-v3 (Jina), or amazon.titan-embed-text-v2:0 (Bedrock).`,
    );
  }

  /**
   * Get the default embedding model for this provider
   *
   * Override in subclasses to provide provider-specific defaults.
   * Returns undefined for providers that don't support embeddings.
   *
   * @returns The default embedding model name, or undefined if not supported
   */
  protected getDefaultEmbeddingModel(): string | undefined {
    // Default implementation returns undefined - providers override this
    return undefined;
  }

  // ===================
  // ===================
  // BZ-665: Schema-driven tool call repair
  // ===================

  /**
   * Create an `experimental_repairToolCall` handler for streamText/generateText.
   * Dynamically reads the tool's JSON schema to repair wrong names and params.
   * Returns undefined when repair is disabled via options.
   */
  protected getToolCallRepairFn(
    options?: StreamOptions | TextGenerationOptions,
  ): ToolCallRepairFunction<ToolSet> | undefined {
    if (
      (options as Record<string, unknown> | undefined)?.disableToolCallRepair
    ) {
      return undefined;
    }
    // Lazy import to avoid circular dependency at module load time
    return (async (...args: Parameters<ToolCallRepairFunction<ToolSet>>) => {
      const { createToolCallRepair } =
        await import("../utils/toolCallRepair.js");
      return createToolCallRepair()(...args);
    }) as ToolCallRepairFunction<ToolSet>;
  }

  // ABSTRACT METHODS - MUST BE IMPLEMENTED BY SUBCLASSES
  // ===================

  /**
   * Opt-in streaming hook. A provider that produces an async iterable of text
   * chunks plus promises for how the turn ended implements this and gets a
   * working `executeStream` for free.
   *
   * Deliberately optional rather than abstract: every provider that already
   * overrides `executeStream` directly — the older and still perfectly valid
   * pattern — never needs it.
   *
   * `finishReason` and `usage` are promises because both are only knowable
   * once the underlying stream has finished. Resolve them when it does; the
   * default `executeStream` chains off them rather than waiting for a
   * consumer, so they must settle even if nobody drains the stream.
   */
  protected doStream?(options: StreamOptions): Promise<{
    stream: AsyncIterable<{ content: string }>;
    finishReason: Promise<string>;
    usage: Promise<{ inputTokens: number; outputTokens: number }>;
    warnings?: string[];
  }>;

  /**
   * Provider-specific streaming implementation (only used when tools are
   * disabled).
   *
   * This used to be `protected abstract`, which meant a provider had exactly
   * two options: write the whole adapter by hand, or not stream at all. The
   * failure mode that produced was SageMaker's — a complete, working
   * `doStream` sitting one property access away from an `executeStream` that
   * unconditionally threw "not yet fully implemented". Providers that
   * implement `doStream` now inherit a correct implementation, and providers
   * that override this method are unaffected.
   */
  protected async executeStream(
    options: StreamOptions,
    _analysisSchema?: ValidationSchema,
  ): Promise<StreamResult> {
    if (!this.doStream) {
      throw new NeuroLinkError({
        code: ERROR_CODES.INVALID_CONFIGURATION,
        message: `${this.providerName} cannot stream: it neither implements doStream() nor overrides executeStream()`,
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.CRITICAL,
        retriable: false,
        context: { provider: this.providerName, model: this.modelName },
      });
    }

    const startTime = Date.now();
    const { stream, finishReason, usage, warnings } =
      await this.doStream(options);

    if (warnings?.length) {
      logger.warn(`[${this.providerName}] doStream reported warnings`, {
        provider: this.providerName,
        count: warnings.length,
      });
    }

    // `metadata` is handed back by reference and filled in when the turn
    // ends — the documented contract for background-loop streams, since a
    // result-object spread would snapshot a top-level getter before the
    // stream has produced anything.
    const metadata: NonNullable<StreamResult["metadata"]> = {
      startTime,
      streamId: `${this.providerName}-${startTime}`,
    };

    // Chained off the provider's own promises rather than off the consumer
    // draining the stream. Binding analytics to a stream iterator's finally
    // block means a caller that awaits analytics without iterating waits
    // forever, because a generator body does not run until it is iterated.
    const analytics = (async () => {
      const [resolvedFinishReason, resolvedUsage] = await Promise.all([
        finishReason,
        usage,
      ]);
      metadata.finishReason = resolvedFinishReason;
      metadata.rawFinishReason = resolvedFinishReason;
      return buildAnalytics(
        this.providerName,
        this.modelName || this.getDefaultModel(),
        {
          usage: {
            input: resolvedUsage.inputTokens,
            output: resolvedUsage.outputTokens,
            total: resolvedUsage.inputTokens + resolvedUsage.outputTokens,
          },
          stopReason: resolvedFinishReason,
        },
        Date.now() - startTime,
        { streamingMode: true },
      );
    })();

    return {
      stream,
      model: this.modelName || this.getDefaultModel(),
      provider: this.getProviderName(),
      analytics,
      metadata,
    };
  }

  /**
   * Get the provider name
   */
  protected abstract getProviderName(): AIProviderName;

  /**
   * Get the default model for this provider
   */
  protected abstract getDefaultModel(): string;

  /**
   * REQUIRED: Every provider MUST implement this method
   * Returns the Vercel AI SDK model instance for this provider
   */
  protected abstract getAISDKModel(): LanguageModel | Promise<LanguageModel>;

  /**
   * Get AI SDK model with middleware applied
   * This method wraps the base model with any configured middleware
   * TODO(#1576): Implement global level middlewares that can be used
   */
  protected async getAISDKModelWithMiddleware(
    options: TextGenerationOptions | StreamOptions = {},
  ): Promise<LanguageModel> {
    // Get the base model
    const baseModel = await this.getAISDKModel();

    logger.debug(`Retrieved base model for ${this.providerName}`, {
      provider: this.providerName,
      model: this.modelName,
      hasMiddlewareConfig: !!this.middlewareOptions,
      timestamp: Date.now(),
    });

    // Check if middleware should be applied
    const middlewareOptions = this.extractMiddlewareOptions(options);

    logger.debug(`Middleware extraction result`, {
      provider: this.providerName,
      model: this.modelName,
      middlewareOptions,
    });

    if (!middlewareOptions) {
      return baseModel;
    }

    try {
      logger.debug(`Applying middleware to ${this.providerName} model`, {
        provider: this.providerName,
        model: this.modelName,
        middlewareOptions,
      });
      // Create a new factory instance with the specified options
      const factory = new MiddlewareFactory(middlewareOptions);

      // Create middleware context
      const context = factory.createContext(
        this.providerName,
        this.modelName,
        options as Record<string, unknown>,
        {
          sessionId: this.sessionId,
          userId: this.userId,
        },
      );

      // Apply middleware to the model
      const wrappedModel = factory.applyMiddleware(
        baseModel,
        context,
        middlewareOptions,
      );

      logger.debug(`Applied middleware to ${this.providerName} model`, {
        provider: this.providerName,
        model: this.modelName,
        hasMiddleware: true,
      });

      return wrappedModel;
    } catch (error) {
      logger.warn(
        `Failed to apply middleware to ${this.providerName}, using base model`,
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );

      // Return base model on middleware failure to maintain functionality
      return baseModel;
    }
  }

  /**
   * Extract middleware options - delegated to Utilities
   */
  private extractMiddlewareOptions(
    options: TextGenerationOptions | StreamOptions,
  ): MiddlewareFactoryOptions | null {
    return this.utilities.extractMiddlewareOptions(options);
  }

  // ===================
  // TOOL MANAGEMENT
  // ===================

  /**
   * Check if a schema is a Zod schema - delegated to Utilities
   */
  private isZodSchema(schema: unknown): boolean {
    return this.utilities.isZodSchema(schema);
  }

  /**
   * Convert tool execution result - delegated to Utilities
   */
  private async convertToolResult(result: unknown): Promise<unknown> {
    return this.utilities.convertToolResult(result);
  }

  /**
   * Fix JSON Schema for OpenAI strict mode - delegated to Utilities
   */
  private fixSchemaForOpenAIStrictMode(
    schema: Record<string, unknown>,
  ): Record<string, unknown> {
    return this.utilities.fixSchemaForOpenAIStrictMode(schema);
  }

  /**
   * Get all available tools - delegated to ToolsManager
   */
  protected async getAllTools(): Promise<Record<string, Tool>> {
    return this.toolsManager.getAllTools();
  }

  /**
   * Calculate actual cost - delegated to TelemetryHandler
   */
  private async calculateActualCost(usage: TokenUsage): Promise<number> {
    return this.telemetryHandler.calculateActualCost(usage);
  }

  /**
   * Create a permissive Zod schema - delegated to Utilities
   */
  private createPermissiveZodSchema(): ZodUnknownSchema {
    return this.utilities.createPermissiveZodSchema();
  }

  /**
   * Set session context for MCP tools - delegated to ToolsManager
   */
  public setSessionContext(sessionId?: string, userId?: string): void {
    this.sessionId = sessionId;
    this.userId = userId;
    this.toolsManager.setSessionContext(sessionId, userId);
  }

  /**
   * Provider-specific error formatting.
   * Subclasses implement this to produce human-readable error messages
   * (e.g., "❌ Google Vertex AI Provider Error\n\n...").
   */
  protected abstract formatProviderError(error: unknown): Error;

  /**
   * Handle provider errors with abort passthrough.
   * AbortErrors are never wrapped — they must propagate with their
   * original identity so that isAbortError() can detect them in
   * retry/fallback loops (directProviderGeneration, performMCPGenerationRetries).
   */
  /**
   * Classify an error that escaped while the consumer was ITERATING a stream.
   *
   * `stream()` only awaits the CONSTRUCTION of the provider's stream object, and a provider
   * that discovers its failure lazily throws on first pull instead — so the raw upstream
   * error reached the consumer with no provider tag and no classification, while the same
   * failure through `generate()` was classified normally. Measured on OpenAI:
   *
   *   streaming      "You have no credits remaining."
   *   non-streaming  "[openai] OpenAI quota exhausted — this will not resolve by retrying..."
   *
   * Three guards. Only the third is load-bearing against today's code; the first two are
   * deliberate depth against a hazard that is real but not currently reachable. Measured,
   * rather than assumed — see the note after the list.
   *
   * 1. ALREADY STAMPED — everything that went through `handleProviderError` carries the mark,
   *    including the two formatters whose results escape the ProviderError hierarchy
   *    (`amazonSagemaker` returns SageMakerError, `replicate` returns NeuroLinkError; both
   *    extend Error directly). Without this they would be classified a second time and
   *    degraded.
   * 2. ALREADY A ProviderError — covers providers that call `formatProviderError` DIRECTLY,
   *    bypassing `handleProviderError` and therefore the stamp. Anthropic does this in its
   *    own streaming catch (`anthropic/client.ts`), and its result is a ProviderError.
   * 3. HAS AN HTTP STATUS — without this, an ordinary bug is relabelled as a provider
   *    failure. `classifyProviderError` ends in an unconditional catch-all
   *    (`utils/errorClassifier.ts`: `if (!rule) return new ProviderError(...)`) that is not
   *    gated on the error having come off the wire. Measured with the guard absent:
   *      TypeError "Cannot read properties of undefined (reading 'content')"
   *        became  ProviderError "[openai] openai error: Cannot read properties of undefined..."
   *    which would hide a real defect behind a plausible provider message.
   *
   * WHY 1 AND 2 ARE NOT CURRENTLY REACHABLE, and why they stay anyway. A statusCode is
   * attached to a formatted error in exactly one place — `handleProviderError` below — and
   * that same method applies the stamp. So a ProviderError carrying a status is always
   * stamped (caught by guard 1's own condition), and a ProviderError produced by a direct
   * `formatProviderError` call carries no status, so guard 3 already returns it untouched.
   * Verified by disabling guards 1 and 2 together, rebuilding, and re-running: the mocked
   * provider contract suite stayed 64/64 and a mocked Anthropic streaming 429 was
   * byte-identical (`RateLimitError`, one `[anthropic]` prefix).
   *
   * They remain because the hazard they cover is measured and real: `handleProviderError`
   * is NOT idempotent — it copies statusCode onto its own output, so a second pass
   * re-matches the bare 429 rule and DEGRADES the classification:
   *   pass 1  ProviderError  "...quota exhausted — this will not resolve by retrying..."
   *   pass 2  RateLimitError "...rate limit exceeded..."
   * The day any provider attaches a status to an error it formats itself, guard 3 stops
   * covering that case and this degradation becomes live. Cheap insurance, not dead code —
   * but do not cite guards 1 and 2 as proven-by-failure the way guard 3 is.
   */
  protected classifyStreamError(error: unknown): Error {
    const err = error instanceof Error ? error : new Error(String(error));
    if (isProviderErrorClassified(err) || err instanceof ProviderError) {
      return err;
    }
    if (duckTypedStatusCode(err) === undefined) {
      return err;
    }
    return this.handleProviderError(err);
  }

  protected handleProviderError(error: unknown): Error {
    if (isAbortError(error)) {
      // Preserve AbortError identity — never wrap in provider-specific formatting
      return error instanceof Error
        ? error
        : new DOMException("The operation was aborted", "AbortError");
    }

    // Already formatted by this method — hand it straight back. Formatting is
    // NOT idempotent: formatProviderError prepends the provider tag every time,
    // so a second pass produces
    //   "[vertex] Google Vertex AI error: [vertex] Google Vertex AI error: ..."
    // and, when a rule matched on statusCode the first time, can also DEGRADE
    // the classification (a specific "quota exhausted" ProviderError re-matching
    // the bare 429 rule as a generic RateLimitError) because the block below
    // copies statusCode onto its own output.
    //
    // A single Vertex failure reaches here FIVE times for one logical error;
    // this makes calls 2..5 cheap pass-throughs. `instanceof Error` rather than
    // a cast: nothing but an Error is ever stamped, and an unstamped value
    // simply falls through to formatting, which is the safe direction.
    if (error instanceof Error && isProviderErrorClassified(error)) {
      return error;
    }

    const formatted = this.formatProviderError(error);

    // Preserve transport retry metadata across formatting. Provider
    // formatters return fresh Error instances (RateLimitError, NetworkError,
    // …) that would otherwise destroy the classification upper layers need:
    // performMCPGenerationRetries' isRetryable/status checks and
    // providerRetry's Retry-After extraction. Copied generically so every
    // provider's 429/5xx keeps its status and server-requested delay.
    if (error && typeof error === "object" && formatted !== error) {
      const src = error as { isRetryable?: unknown };
      const dst = formatted as Error & {
        statusCode?: number;
        isRetryable?: boolean;
        retryAfterMs?: number;
      };
      const statusCode = duckTypedStatusCode(error);
      if (statusCode !== undefined && dst.statusCode === undefined) {
        dst.statusCode = statusCode;
      }
      if (
        typeof src.isRetryable === "boolean" &&
        dst.isRetryable === undefined
      ) {
        dst.isRetryable = src.isRetryable;
      }
      if (dst.retryAfterMs === undefined) {
        const retryAfterMs = extractRetryAfterMsFromError(error);
        if (retryAfterMs !== undefined) {
          dst.retryAfterMs = retryAfterMs;
        }
      }
    }

    // Preserve the lifecycle-fired mark across formatting:
    // fireLifecycleErrorCallback() marks the ORIGINAL error in the shared
    // WeakSet, but formatProviderError() typically returns a new Error
    // instance. Re-mark the formatted error so a higher layer (e.g.
    // NeuroLink.stream()'s top-level catch + applyStreamLifecycleMiddleware)
    // doesn't fire onError a second time for the same failure.
    if (hasLifecycleErrorFired(error)) {
      markLifecycleErrorFired(formatted);
    }

    // P3 fix: Classify error and set error.type on the active OTel span
    try {
      const activeSpan = trace.getSpan(context.active());
      if (activeSpan) {
        let errorType = "provider_error";
        const errName = formatted?.constructor?.name ?? "";
        if (errName === "RateLimitError") {
          errorType = "rate_limit";
        } else if (errName === "AuthenticationError") {
          errorType = "auth_failure";
        } else if (errName === "NetworkError") {
          errorType = "network";
        } else if (errName === "InvalidModelError") {
          errorType = "invalid_model";
        } else if (errName === "TimeoutError") {
          errorType = "timeout";
        }
        activeSpan.setAttribute("error.type", errorType);
        if (formatted instanceof Error) {
          activeSpan.setAttribute(
            "error.message",
            formatted.message.substring(0, 500),
          );
        }
      }
    } catch {
      // Non-blocking — telemetry failures shouldn't mask the original error
    }

    // Stamp AFTER formatting so any later catch site can tell this error has
    // already been classified. Deliberately not applied to the AbortError
    // passthrough above — that returns the original error untouched.
    markProviderErrorClassified(formatted);
    return formatted;
  }

  /**
   * Image generation method. Providers that support it should override this.
   * By default, it throws an error indicating that the functionality is not supported.
   * @param _options The generation options.
   * @returns A promise that resolves to the generation result.
   */
  protected async executeImageGeneration(
    _options: TextGenerationOptions,
  ): Promise<EnhancedGenerateResult> {
    throw new Error(
      `Image generation is not supported by the ${this.providerName} provider or the selected model.`,
    );
  }

  // ===================
  // CONSOLIDATED PROVIDER METHODS - MOVED FROM INDIVIDUAL PROVIDERS
  // ===================

  /**
   * Execute operation with timeout and proper cleanup
   * Consolidates identical timeout handling from 8/10 providers
   */
  protected async executeWithTimeout<T>(
    operation: () => Promise<T>,
    options: { timeout?: number | string; operationType?: string },
  ): Promise<T> {
    const timeout = this.getTimeout(
      options as StreamOptions | TextGenerationOptions,
    );
    const timeoutController = createTimeoutController(
      timeout,
      this.providerName,
      (options.operationType as "generate" | "stream") || "generate",
    );

    try {
      if (timeoutController) {
        return await Promise.race([
          operation(),
          new Promise<never>((_, reject) => {
            timeoutController.controller.signal.addEventListener(
              "abort",
              () => {
                reject(
                  new TimeoutError(
                    `${this.providerName} operation timed out`,
                    timeoutController.timeoutMs,
                    this.providerName,
                    (options.operationType as "generate" | "stream") ||
                      "generate",
                  ),
                );
              },
            );
          }),
        ]);
      } else {
        return await operation();
      }
    } finally {
      timeoutController?.cleanup();
    }
  }

  /**
   * Validate stream options - delegated to StreamHandler
   */
  protected validateStreamOptions(options: StreamOptions): void {
    this.streamHandler.validateStreamOptions(options);
  }

  /**
   * Create text stream transformation - delegated to StreamHandler.
   * Reviewer follow-up: forwards the optional `getUnderlyingError`
   * callback so providers can capture upstream errors via
   * `streamText`'s `onError` and have them flow into the
   * NoOutputGeneratedError sentinel's `providerError` /
   * `modelResponseRaw`.
   */
  protected createTextStream(
    result: {
      textStream: AsyncIterable<string>;
      finishReason?: Promise<unknown> | unknown;
      totalUsage?: Promise<unknown> | unknown;
    },
    getUnderlyingError?: () => unknown,
  ): AsyncGenerator<
    { content: string } | import("../types/index.js").StreamNoOutputSentinel
  > {
    return this.streamHandler.createTextStream(result, getUnderlyingError);
  }

  /**
   * Create standardized stream result - delegated to StreamHandler
   */
  protected createStreamResult(
    stream: AsyncGenerator<{ content: string }>,
    additionalProps: Partial<StreamResult> = {},
  ): StreamResult {
    return this.streamHandler.createStreamResult(stream, additionalProps);
  }

  /**
   * Create stream analytics - delegated to StreamHandler
   */
  protected async createStreamAnalytics(
    result: UnknownRecord,
    startTime: number,
    options: StreamOptions,
  ): Promise<UnknownRecord | undefined> {
    return this.streamHandler.createStreamAnalytics(result, startTime, options);
  }

  /**
   * Handle common error patterns - delegated to Utilities
   */
  protected handleCommonErrors(error: unknown): Error | null {
    return this.utilities.handleCommonErrors(error);
  }

  /**
   * Set up tool executor - delegated to ToolsManager
   * @param sdk - The NeuroLinkSDK instance for tool execution
   * @param functionTag - Function name for logging
   */
  setupToolExecutor(
    sdk: {
      customTools: Map<string, unknown>;
      executeTool: (toolName: string, params: unknown) => Promise<unknown>;
    },
    functionTag: string,
  ): void {
    this.toolsManager.setupToolExecutor(sdk, functionTag);
  }

  // ===================
  // TEMPLATE METHODS - COMMON FUNCTIONALITY
  // ===================

  /**
   * Normalize text generation options - delegated to Utilities
   */
  protected normalizeTextOptions(
    optionsOrPrompt: TextGenerationOptions | string,
  ): TextGenerationOptions {
    return this.utilities.normalizeTextOptions(optionsOrPrompt);
  }

  /**
   * Normalize stream options - delegated to Utilities
   */
  protected normalizeStreamOptions(
    optionsOrPrompt: StreamOptions | string,
  ): StreamOptions {
    return this.utilities.normalizeStreamOptions(optionsOrPrompt);
  }

  protected async enhanceResult(
    result: EnhancedGenerateResult,
    options: TextGenerationOptions,
    startTime: number,
  ): Promise<EnhancedGenerateResult> {
    const responseTime = Date.now() - startTime;

    // CRITICAL FIX: Store imageOutput separately to ensure it's preserved
    const imageOutput = result.imageOutput;

    let enhancedResult = { ...result };

    if (options.enableAnalytics) {
      try {
        const analytics = await this.createAnalytics(
          result,
          responseTime,
          options,
        );
        // Preserve ALL fields including imageOutput when adding analytics
        enhancedResult = { ...enhancedResult, analytics, imageOutput };
      } catch (error) {
        logger.warn(
          `Analytics creation failed for ${this.providerName}:`,
          error,
        );
      }
    }

    if (options.enableEvaluation) {
      try {
        const evaluation = await this.createEvaluation(result, options);
        // Preserve ALL fields including imageOutput when adding evaluation
        enhancedResult = { ...enhancedResult, evaluation, imageOutput };
      } catch (error) {
        logger.warn(
          `Evaluation creation failed for ${this.providerName}:`,
          error,
        );
      }
    }

    // CRITICAL FIX: Always restore imageOutput if it existed in the original result
    if (imageOutput) {
      enhancedResult.imageOutput = imageOutput;
    }
    return enhancedResult;
  }

  /**
   * Handle video generation mode
   *
   * Generates video from input image + text prompt using Vertex AI Veo 3.1.
   *
   * @param options - Text generation options with video configuration
   * @param startTime - Generation start timestamp for metrics
   * @returns Enhanced result with video data
   *
   * @example
   * ```typescript
   * const result = await provider.generate({
   *   input: { text: "Product showcase", images: [imageBuffer] },
   *   output: { mode: "video", video: { resolution: "1080p" } }
   * });
   * // result.video contains the generated video
   * ```
   */
  // eslint-disable-next-line max-lines-per-function
  protected async handleVideoGeneration(
    options: TextGenerationOptions,
    startTime: number,
  ): Promise<EnhancedGenerateResult> {
    // Dynamic imports to avoid loading video dependencies unless needed.
    // Pull VideoError + VIDEO_ERROR_CODES from VideoProcessor (which already
    // re-exports both) so non-vertex routes don't carry a direct dependency
    // on the Vertex adapter's module.
    const { VideoProcessor, VideoError, VIDEO_ERROR_CODES } =
      await import("../utils/videoProcessor.js");
    const {
      validateVideoGenerationInput,
      validateImageForVideo,
      validateDirectorModeInput,
    } = await import("../utils/parameterValidation.js");
    const { ErrorFactory } = await import("../utils/errorHandling.js");

    // Build GenerateOptions for validation
    const generateOptions = {
      input: options.input || { text: options.prompt || "" },
      output: options.output,
      provider: options.provider,
      model: options.model,
    };

    // ===== DIRECTOR MODE =====
    // Route to Director pipeline when segments are provided
    if (
      generateOptions.input?.segments &&
      Array.isArray(generateOptions.input.segments) &&
      generateOptions.input.segments.length > 0
    ) {
      // Type narrowing: segments is guaranteed to exist here
      const segments = generateOptions.input.segments;

      const directorValidation = validateDirectorModeInput(generateOptions);
      if (!directorValidation.isValid) {
        throw ErrorFactory.invalidParameters(
          "director-mode",
          new Error(
            directorValidation.errors
              .map((e: { message: string }) => e.message)
              .join("; "),
          ),
          { errors: directorValidation.errors },
        );
      }

      if (directorValidation.warnings.length > 0) {
        for (const warning of directorValidation.warnings) {
          logger.warn(`Director Mode warning: ${warning}`);
        }
      }

      const { executeDirectorPipeline, DIRECTOR_PIPELINE_TIMEOUT_MS } =
        await import("../adapters/video/directorPipeline.js");

      // Use caller's timeout if provided, otherwise use default Director timeout
      const directorTimeout = options.timeout ?? DIRECTOR_PIPELINE_TIMEOUT_MS;

      const videoResult = await this.executeWithTimeout(
        () =>
          executeDirectorPipeline(
            segments,
            generateOptions.output?.video ?? {},
            generateOptions.output?.director ?? {},
            options.region,
          ),
        { timeout: directorTimeout, operationType: "generate" },
      );

      // Build content summary with metadata
      const joinedPrompts = generateOptions.input.segments
        .map((s: { prompt: string }) => s.prompt)
        .join(" → ");
      const segmentCount =
        videoResult.metadata?.segmentCount ??
        generateOptions.input.segments.length;
      const transitionCount =
        videoResult.metadata?.transitionCount ?? Math.max(0, segmentCount - 1);
      const totalDuration = videoResult.metadata?.duration ?? 0;
      const contentSummary = `${joinedPrompts} — duration: ${totalDuration}s, segments: ${segmentCount}, transitions: ${transitionCount}`;

      const baseResult: EnhancedGenerateResult = {
        content: contentSummary,
        provider: "vertex",
        model: options.model || "veo-3.1-generate-001",
        usage: { input: 0, output: 0, total: 0 },
        video: videoResult,
      };

      return await this.enhanceResult(baseResult, options, startTime);
    }

    // ===== STANDARD SINGLE-CLIP VIDEO GENERATION =====
    // Validate video generation input
    const validation = validateVideoGenerationInput(generateOptions);
    if (!validation.isValid) {
      throw ErrorFactory.invalidParameters(
        "video-generation",
        new Error(validation.errors.map((e) => e.message).join("; ")),
        { errors: validation.errors },
      );
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      for (const warning of validation.warnings) {
        logger.warn(`Video generation warning: ${warning}`);
      }
    }

    // Extract image from input
    const imageInput = options.input?.images?.[0];
    if (!imageInput) {
      throw new VideoError({
        code: VIDEO_ERROR_CODES.INVALID_INPUT,
        message:
          "Video generation requires an input image. Provide via input.images array.",
        retriable: false,
        context: { field: "input.images" },
      });
    }

    // Timeout for image IO operations (15 seconds)
    const IMAGE_IO_TIMEOUT_MS = 15000;

    // Load image buffer if path/URL
    let imageBuffer: Buffer;
    if (typeof imageInput === "string") {
      if (
        imageInput.startsWith("http://") ||
        imageInput.startsWith("https://")
      ) {
        // URL - fetch the image with timeout
        logger.debug("Fetching image from URL for video generation", {
          url: imageInput.substring(0, 100),
        });
        let response: Response;
        try {
          response = await this.executeWithTimeout(() => fetch(imageInput), {
            timeout: IMAGE_IO_TIMEOUT_MS,
            operationType: "generate", // Part of video generation flow
          });
        } catch (error) {
          throw new VideoError({
            code: VIDEO_ERROR_CODES.INVALID_INPUT,
            message: `Failed to fetch image from URL: ${error instanceof Error ? error.message : "Request timed out"}`,
            retriable: true,
            context: { url: imageInput, timeout: IMAGE_IO_TIMEOUT_MS },
            originalError: error instanceof Error ? error : undefined,
          });
        }
        if (!response.ok) {
          throw new VideoError({
            code: VIDEO_ERROR_CODES.INVALID_INPUT,
            message: `Failed to fetch image from URL: ${response.status} ${response.statusText}`,
            retriable: response.status >= 500,
            context: { url: imageInput, status: response.status },
          });
        }
        imageBuffer = Buffer.from(await response.arrayBuffer());
      } else {
        // File path - read from disk with timeout
        logger.debug("Reading image from path for video generation", {
          path: imageInput,
        });
        const fs = await import("node:fs/promises");
        try {
          imageBuffer = await this.executeWithTimeout(
            () => fs.readFile(imageInput),
            { timeout: IMAGE_IO_TIMEOUT_MS, operationType: "generate" }, // Part of video generation flow
          );
        } catch (error) {
          throw new VideoError({
            code: VIDEO_ERROR_CODES.INVALID_INPUT,
            message: `Failed to read image file: ${error instanceof Error ? error.message : String(error)}`,
            retriable: false,
            context: { path: imageInput, timeout: IMAGE_IO_TIMEOUT_MS },
            originalError: error instanceof Error ? error : undefined,
          });
        }
      }
    } else if (Buffer.isBuffer(imageInput)) {
      imageBuffer = imageInput;
    } else if (typeof imageInput === "object" && "data" in imageInput) {
      // ImageWithAltText type
      const imgData = imageInput.data;
      if (typeof imgData === "string") {
        imageBuffer = Buffer.from(imgData, "base64");
      } else if (Buffer.isBuffer(imgData)) {
        imageBuffer = imgData;
      } else {
        throw new VideoError({
          code: VIDEO_ERROR_CODES.INVALID_INPUT,
          message: "ImageWithAltText.data must be a base64 string or Buffer.",
          retriable: false,
          context: { field: "input.images[0].data", type: typeof imgData },
        });
      }
    } else {
      throw new VideoError({
        code: VIDEO_ERROR_CODES.INVALID_INPUT,
        message:
          "Invalid image input type. Provide Buffer, path string, URL, or ImageWithAltText.",
        retriable: false,
        context: { field: "input.images[0]", type: typeof imageInput },
      });
    }

    // Validate image format and size (for Buffer inputs)
    const imageValidation = validateImageForVideo(imageBuffer);
    if (imageValidation) {
      throw ErrorFactory.invalidParameters(
        "video-generation",
        new Error(imageValidation.message),
        {
          field: "input.images[0]",
          validation: imageValidation,
        },
      );
    }

    // Get prompt text
    const prompt = options.prompt || options.input?.text || "";

    // Honor output.video.provider — when omitted, fall back to the
    // catalog-derived default (currently "vertex") for backward
    // compatibility with the original implementation.
    const requestedProvider =
      options.output?.video?.provider ?? defaultProviderFor("video");

    if (!VideoProcessor.supports(requestedProvider)) {
      throw new VideoError({
        code: VIDEO_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
        message: `Video provider "${requestedProvider}" is not registered. Available: ${VideoProcessor.listProviders().join(", ")}`,
        retriable: false,
        context: {
          provider: requestedProvider,
          available: VideoProcessor.listProviders(),
        },
      });
    }

    // Resolve the model name without hardcoding a Vertex default for
    // non-Vertex routes. Precedence: caller-supplied output.video.model,
    // then options.model (LLM-level field that the caller may have repurposed
    // for video), then the Vertex Veo default but only when we're actually
    // calling Vertex. Otherwise leave it null at this stage and let the
    // handler's metadata fill it in below.
    const requestedVideoModel = options.output?.video?.model;
    const resolvedRequestModel =
      requestedVideoModel ??
      options.model ??
      (requestedProvider === "vertex" ? "veo-3.1-generate-001" : undefined);

    logger.info("Starting video generation", {
      provider: requestedProvider,
      ...(resolvedRequestModel ? { model: resolvedRequestModel } : {}),
      promptLength: prompt.length,
      imageSize: imageBuffer.length,
      resolution: options.output?.video?.resolution || "720p",
      duration: options.output?.video?.length || 6,
    });

    // Dispatch through the central VideoProcessor — picks up vertex,
    // kling, runway, replicate (or any custom handler) registered via
    // ProviderRegistry / VideoProcessor.registerHandler(). Wrap in the
    // shared timeout helper so standard video gen honors the caller's
    // timeout the same way director mode does (see above ~Line 2062).
    const videoTimeout = options.timeout ?? 600_000; // 10 min default
    // Thread the caller's cancellation signal into the handler chain —
    // output.video.abortSignal (video-scoped) wins over the request-level
    // options.abortSignal, matching the general per-field precedence.
    const videoAbortSignal =
      options.output?.video?.abortSignal ?? options.abortSignal;
    const videoResult = await this.executeWithTimeout(
      () =>
        VideoProcessor.generate(requestedProvider, {
          ...(options.output?.video ?? {}),
          image: imageBuffer,
          prompt,
          region: options.region,
          abortSignal: videoAbortSignal,
        }),
      { timeout: videoTimeout, operationType: "generate" },
    );

    // Prefer the handler's own model id (more accurate — it knows the exact
    // checkpoint that ran). Fall back to the request-time value, and finally
    // to the Vertex default only when we're on the Vertex route.
    const responseModel =
      videoResult.metadata?.model ??
      resolvedRequestModel ??
      (requestedProvider === "vertex" ? "veo-3.1-generate-001" : "unknown");

    logger.info("Video generation complete", {
      provider: requestedProvider,
      model: responseModel,
      videoSize: videoResult.data.length,
      duration: videoResult.metadata?.duration,
      processingTime: videoResult.metadata?.processingTime,
    });

    // Build result
    const baseResult: EnhancedGenerateResult = {
      content: prompt, // Echo the prompt as content
      provider: requestedProvider,
      model: responseModel,
      usage: { input: 0, output: 0, total: 0 },
      video: videoResult,
    };

    return await this.enhanceResult(baseResult, options, startTime);
  }

  /**
   * Create analytics - delegated to TelemetryHandler
   */
  protected async createAnalytics(
    result: EnhancedGenerateResult,
    responseTime: number,
    options: TextGenerationOptions,
  ): Promise<AnalyticsData> {
    return this.telemetryHandler.createAnalytics(
      result,
      responseTime,
      options.context,
    );
  }

  /**
   * Create evaluation - delegated to TelemetryHandler
   */
  protected async createEvaluation(
    result: EnhancedGenerateResult,
    options: TextGenerationOptions,
  ): Promise<EvaluationData> {
    return this.telemetryHandler.createEvaluation(result, options);
  }

  /**
   * Validate text generation options - delegated to Utilities
   */
  protected validateOptions(options: TextGenerationOptions): void {
    this.utilities.validateOptions(options);
  }

  /**
   * Get provider information - delegated to Utilities
   */
  protected getProviderInfo(): { provider: string; model: string } {
    return this.utilities.getProviderInfo();
  }

  /**
   * Get timeout value in milliseconds - delegated to Utilities
   */
  public getTimeout(options: TextGenerationOptions | StreamOptions): number {
    return this.utilities.getTimeout(options);
  }

  /**
   * Check if tool executions should be stored and handle storage
   */
  protected async handleToolExecutionStorage(
    toolCalls: unknown[],
    toolResults: unknown[],
    options: TextGenerationOptions | StreamOptions,
    currentTime: Date,
  ): Promise<void> {
    return this.telemetryHandler.handleToolExecutionStorage(
      toolCalls,
      toolResults,
      options,
      currentTime,
    );
  }

  /**
   * Utility method to chunk large prompts into smaller pieces
   * @param prompt The prompt to chunk
   * @param maxChunkSize Maximum size per chunk (default: 900,000 characters)
   * @param overlap Overlap between chunks to maintain context (default: 100 characters)
   * @returns Array of prompt chunks
   */
  static chunkPrompt(
    prompt: string,
    maxChunkSize: number = 900000,
    overlap: number = 100,
  ): string[] {
    if (prompt.length <= maxChunkSize) {
      return [prompt];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < prompt.length) {
      const end = Math.min(start + maxChunkSize, prompt.length);
      chunks.push(prompt.slice(start, end));

      // Break if we've reached the end
      if (end >= prompt.length) {
        break;
      }

      // Move start forward, accounting for overlap
      const nextStart = end - overlap;

      // Ensure we make progress (avoid infinite loops)
      if (nextStart <= start) {
        start = end;
      } else {
        start = Math.max(nextStart, 0);
      }
    }

    return chunks;
  }
}
