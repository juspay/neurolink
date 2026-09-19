/**
 * Proxy Translation Engine
 *
 * Shared translation logic used by both Claude and OpenAI proxy routes.
 * Both formats follow the same pipeline:
 *   1. Parse request (format-specific, done by the caller)
 *   2. Loop through fallback attempts calling ctx.neurolink.stream()
 *   3. Serialize response (format-specific, via serializer/response builder)
 *
 * This module exports the helpers that were previously duplicated between
 * claudeProxyRoutes.ts and openaiProxyRoutes.ts, plus unified stream and
 * JSON handlers that accept a format discriminator.
 */

import {
  ClaudeStreamSerializer,
  generateToolUseId,
  serializeClaudeResponse,
} from "./claudeFormat.js";
import {
  buildGeminiResponse,
  createGeminiSerializerAdapter,
} from "./geminiFormat.js";
import {
  generateOpenAIToolCallId,
  OpenAIStreamSerializer,
  serializeOpenAIResponse,
} from "./openaiFormat.js";
import type { ProxyTracer } from "./proxyTracer.js";
import {
  prepareProxyRequestContext,
  ProxyContextPreflightError,
} from "./proxyContextPreflight.js";
import {
  reserveProxyTokenBudget,
  settleProxyTokenBudget,
  getProxyTokenBudgetPolicy,
  getProxyTokenBudgetSessionKey,
  getProxyTokenBudgetError,
} from "./proxyTokenBudget.js";
import {
  isProxyRequestFinalized,
  getProxyRequestAccounting,
  registerProxyResponseObserver,
} from "./proxyActivity.js";
import { getProxyUpstreamFailure } from "./proxyFailureDetails.js";
import { sanitizeForLog } from "../utils/logSanitize.js";
import { createProxyRouteBodyCapture } from "./proxyRouteBodyCapture.js";
import { DEFAULT_PROXY_MODEL_IDS } from "../constants/proxyModels.js";
import { logRequest, logRequestAttempt } from "./requestLogger.js";
import { buildClientAttribution } from "./clientAttribution.js";
import {
  recordAttempt,
  recordAttemptError,
  recordFinalError,
  recordFinalSuccess,
} from "./usageStats.js";
import type {
  InternalResult,
  RequestLogEntry,
  StreamResult,
  ProxyContextEvidence,
  ProxyTokenBudgetLease,
  ParsedClaudeRequest,
  ParsedGeminiRequest,
  ParsedOpenAIRequest,
  ProxyFormat,
  ProxyTranslationAttempt,
  ServerContext,
  StreamSerializerAdapter,
} from "../types/index.js";
import { raceWithAbort, withTimeout } from "../utils/async/withTimeout.js";

// Upper bound on a single translation attempt. Long enough for slow upstreams
// (Vertex/LiteLLM can take 60–90s on big requests) but short enough that a
// hung provider can't stall the request handler indefinitely.
const TRANSLATION_ATTEMPT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Extract text content from a stream chunk (handles various chunk formats).
 */
export function extractText(chunk: unknown): string | null {
  if (typeof chunk === "string") {
    return chunk;
  }

  if (chunk && typeof chunk === "object") {
    const c = chunk as Record<string, unknown>;

    // NeuroLink StreamResult chunk format: { content: string }
    if (typeof c.content === "string") {
      return c.content;
    }

    // Vercel AI SDK text delta format
    if (c.type === "text-delta" && typeof c.textDelta === "string") {
      return c.textDelta;
    }

    // Direct text field
    if (typeof c.text === "string") {
      return c.text;
    }
  }

  return null;
}

/** Extract tool call arguments from various shapes. */
export function extractToolArgs(toolCall: unknown): unknown {
  return (
    (toolCall as { args?: unknown }).args ??
    (toolCall as { parameters?: unknown }).parameters ??
    (toolCall as { input?: unknown }).input ??
    {}
  );
}

/** Check if there's meaningful output from translation. */
export function hasTranslatedOutput(
  collectedText: string,
  toolCalls: unknown[] | undefined,
): boolean {
  return collectedText.trim().length > 0 || (toolCalls?.length ?? 0) > 0;
}

/**
 * Normalize usage from various AI SDK / NeuroLink shapes.
 *
 * Handles:
 * - AI SDK v6: inputTokens / outputTokens
 * - AI SDK v4: promptTokens / completionTokens
 * - NeuroLink internal: input / output
 */
export function extractUsageFromStreamResult(usage: unknown): {
  input: number;
  output: number;
  total: number;
} {
  if (!usage || typeof usage !== "object") {
    return { input: 0, output: 0, total: 0 };
  }
  const u = usage as Record<string, unknown>;
  const input =
    (typeof u.inputTokens === "number" ? u.inputTokens : 0) ||
    (typeof u.promptTokens === "number" ? u.promptTokens : 0) ||
    (typeof u.input === "number" ? u.input : 0);
  const output =
    (typeof u.outputTokens === "number" ? u.outputTokens : 0) ||
    (typeof u.completionTokens === "number" ? u.completionTokens : 0) ||
    (typeof u.output === "number" ? u.output : 0);
  return { input, output, total: input + output };
}

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

/**
 * Detect which proxy format a request is using based on path and headers.
 */
export function detectProxyFormat(
  path: string,
  headers: Record<string, string>,
): ProxyFormat {
  // Path-based detection (primary, most reliable)
  if (path.includes("/chat/completions")) {
    return "openai";
  }
  if (path.includes("/messages")) {
    return "claude";
  }
  // Gemini CLI wire format: POST /v1beta/models/<model>:generateContent
  // (non-streaming) or :streamGenerateContent (streaming, selected via
  // ?alt=sse on ctx.query — not part of ctx.path, so it plays no role here).
  // Checked as two explicit suffixes: "streamGenerateContent" capitalizes
  // the "Generate" it shares with "generateContent", so
  // "streamGenerateContent".includes("generateContent") is false and a
  // single check would miss every streaming request.
  if (
    path.includes(":generateContent") ||
    path.includes(":streamGenerateContent")
  ) {
    return "gemini";
  }

  // Header-based fallback
  if (headers["anthropic-version"]) {
    return "claude";
  }
  if (headers["x-claude-code-session-id"]) {
    return "claude";
  }

  // Default to openai (more universal)
  return "openai";
}

// ---------------------------------------------------------------------------
// Provider/model-specific overrides for translated requests
// ---------------------------------------------------------------------------

function shouldOmitImagesForTarget(provider?: string, model?: string): boolean {
  // `open-large` in our LiteLLM setup handles text and tools, but returns an
  // empty completion when binary images are forwarded. Claude Code already
  // includes textual image markers in the prompt, so dropping only the binary
  // image payload keeps the request usable instead of breaking fallback.
  return provider === "litellm" && model === "open-large";
}

function shouldOmitThinkingConfigForTarget(
  provider?: string,
  model?: string,
): boolean {
  // LiteLLM speaks an OpenAI-shaped API and does not understand the Anthropic
  // `thinkingConfig` block — always strip it for litellm targets.
  if (provider === "litellm") {
    return true;
  }
  // For Vertex, only Gemini 2.5+ and 3.x support thinking on the wire.
  // Other Vertex models (text-bison, older Gemini, Claude-on-Vertex) reject
  // it, so omit for anything outside that allow-list.
  if (provider === "vertex") {
    const m = model?.toLowerCase() ?? "";
    return !/gemini-(2\.5|3)/.test(m);
  }
  // Other providers (anthropic, openai, etc.) either support it natively or
  // ignore unknown fields — pass it through.
  return false;
}

// ---------------------------------------------------------------------------
// Unified options builder
// ---------------------------------------------------------------------------

/**
 * Build options for ctx.neurolink.stream() from a parsed request
 * and an optional provider/model override.
 *
 * Works for ParsedClaudeRequest, ParsedOpenAIRequest and
 * ParsedGeminiRequest. The differences are Claude-specific fields (topK,
 * thinkingConfig), safely absent on OpenAI/Gemini parsed requests, and
 * toolChoice/toolChoiceName, absent on Gemini parsed requests — Gemini's
 * parser always emits tools: {} (see geminiFormat.ts's parseGeminiRequest),
 * so toolNames.length is always 0 below and disableTools is set instead.
 */
export function buildTranslationOptions(
  parsed: ParsedClaudeRequest | ParsedOpenAIRequest | ParsedGeminiRequest,
  overrides: { provider?: string; model?: string } = {},
): Record<string, unknown> {
  const historyMessages = parsed.conversationMessages.slice(0, -1);
  const toolNames = Object.keys(parsed.tools);

  // Claude-specific fields: topK and thinkingConfig
  const claudeParsed = parsed as Partial<ParsedClaudeRequest>;
  const images = shouldOmitImagesForTarget(overrides.provider, overrides.model)
    ? []
    : parsed.images;
  const thinkingConfig =
    claudeParsed.thinkingConfig &&
    !shouldOmitThinkingConfigForTarget(overrides.provider, overrides.model)
      ? claudeParsed.thinkingConfig
      : undefined;

  // toolChoice/toolChoiceName exist on ParsedClaudeRequest and
  // ParsedOpenAIRequest but not on ParsedGeminiRequest — go through the same
  // Partial-cast pattern as claudeParsed above so a Gemini request just sees
  // both as undefined instead of failing to compile.
  const toolChoiceParsed = parsed as Partial<ParsedOpenAIRequest>;
  const toolChoice = toolChoiceParsed.toolChoiceName
    ? { type: "tool" as const, toolName: toolChoiceParsed.toolChoiceName }
    : toolChoiceParsed.toolChoice;

  return {
    input: {
      text: parsed.prompt,
      ...(images.length > 0 ? { images } : {}),
    },
    ...(overrides.provider ? { provider: overrides.provider } : {}),
    ...(overrides.model ? { model: overrides.model } : {}),
    systemPrompt: parsed.systemPrompt,
    ...(parsed.maxTokens !== undefined ? { maxTokens: parsed.maxTokens } : {}),
    ...(parsed.temperature !== undefined
      ? { temperature: parsed.temperature }
      : {}),
    ...(parsed.topP !== undefined ? { topP: parsed.topP } : {}),
    ...(claudeParsed.topK !== undefined ? { topK: claudeParsed.topK } : {}),
    ...(parsed.stopSequences?.length
      ? { stopSequences: parsed.stopSequences }
      : {}),
    ...(thinkingConfig ? { thinkingConfig } : {}),
    ...(toolNames.length === 0 ? { disableTools: true } : {}),
    ...(toolNames.length > 0
      ? {
          tools: parsed.tools,
          toolFilter: toolNames,
        }
      : {}),
    ...(toolChoice ? { toolChoice } : {}),
    ...(historyMessages.length > 0
      ? { conversationMessages: historyMessages }
      : {}),
    disableInternalFallback: true,
    skipToolPromptInjection: true,
    maxSteps: 1,
  };
}

// ---------------------------------------------------------------------------
// Serializer adapter — normalizes differences between Claude and OpenAI
// stream serializers behind a common interface.
// ---------------------------------------------------------------------------

function createClaudeSerializerAdapter(model: string): StreamSerializerAdapter {
  const inner = new ClaudeStreamSerializer(model, 0);
  return {
    start: () => inner.start(),
    pushDelta: (text) => inner.pushDelta(text),
    pushToolUse: (id, name, input) => inner.pushToolUse(id, name, input),
    finish: (finishReason, usage) => inner.finish(usage.output, finishReason),
    emitError: (message) => inner.emitError(500, message),
  };
}

function createOpenAISerializerAdapter(model: string): StreamSerializerAdapter {
  const inner = new OpenAIStreamSerializer(model);
  return {
    start: () => inner.start(),
    pushDelta: (text) => inner.pushDelta(text),
    pushToolUse: (id, name, input) => inner.pushToolUse(id, name, input),
    finish: (finishReason, usage) => inner.finish(finishReason, usage),
    emitError: (message) => inner.emitError(message),
  };
}

function generateToolId(format: ProxyFormat): string {
  return format === "claude" ? generateToolUseId() : generateOpenAIToolCallId();
}

function defaultFinishReason(format: ProxyFormat): string {
  return format === "claude" ? "end_turn" : "stop";
}

/** Preserve unknown usage as absent; zero is only reported when observed. */
function translationUsage(
  result: StreamResult | undefined,
): Partial<RequestLogEntry> {
  const raw = result?.usage as Record<string, unknown> | undefined;
  if (!raw) {
    return {};
  }
  const number = (...values: unknown[]) =>
    values.find(
      (value) =>
        typeof value === "number" && Number.isFinite(value) && value >= 0,
    ) as number | undefined;
  const details = raw.outputTokenDetails as Record<string, unknown> | undefined;
  const inputs = raw.inputTokenDetails as Record<string, unknown> | undefined;
  // NeuroLink TokenUsage uses disjoint input/cache buckets for every provider.
  // Raw AI SDK usage instead includes cached input in inputTokens. Preserve
  // that distinction for both cost metrics and token-budget settlement.
  const inputIncludesCachedTokens =
    typeof raw.inputIncludesCachedTokens === "boolean"
      ? raw.inputIncludesCachedTokens
      : raw.cacheReadTokens === undefined &&
        raw.cacheCreationTokens === undefined &&
        (raw.cachedInputTokens !== undefined || inputs !== undefined);
  return {
    inputIncludesCachedTokens,
    inputTokens: number(raw.inputTokens, raw.promptTokens, raw.input),
    outputTokens: number(raw.outputTokens, raw.completionTokens, raw.output),
    cacheReadTokens: number(
      raw.cacheReadTokens,
      raw.cachedInputTokens,
      inputs?.cacheReadTokens,
    ),
    cacheCreationTokens: number(
      raw.cacheCreationTokens,
      inputs?.cacheWriteTokens,
    ),
    reasoningTokens: number(
      raw.reasoningTokens,
      raw.reasoning,
      details?.reasoningTokens,
    ),
  };
}

/** Shared request owner, independent of a consumer asking for another chunk. */
function createTranslationRequest(args: {
  ctx: ServerContext;
  requestModel: string;
  parsed: ParsedClaudeRequest | ParsedOpenAIRequest | ParsedGeminiRequest;
  tracer?: ProxyTracer;
  requestStartTime: number;
  stream: boolean;
}) {
  const { ctx, requestModel, parsed, tracer, requestStartTime, stream } = args;
  const capture = createProxyRouteBodyCapture(
    ctx,
    requestModel,
    stream,
    requestStartTime,
  );
  if (!ctx.path.endsWith("/v1/messages")) {
    capture.request();
  }
  const controller = new AbortController();
  const signal = ctx.abortSignal
    ? AbortSignal.any([ctx.abortSignal, controller.signal])
    : controller.signal;
  let result: StreamResult | undefined;
  let contextPreflight: ProxyContextEvidence | undefined;
  let budgetLease: ProxyTokenBudgetLease | undefined;
  let budgetSettlement: Promise<void> | undefined;
  let terminalWork: Promise<void> | undefined;
  let attempt: ProxyTranslationAttempt | undefined;
  let iterator: AsyncIterator<unknown> | undefined;
  let firstUsefulOutputMs: number | undefined;
  let finalized = false;
  let upstreamDispatched = false;
  const evidence = () => ({
    model: result?.model ?? attempt?.model ?? "unknown",
    servingModelStatus: result?.model
      ? ("observed" as const)
      : ("unavailable" as const),
    requestedModel: requestModel,
    provider: result?.provider ?? attempt?.provider,
    accountKey: `${result?.provider ?? attempt?.provider ?? "auto"}:sdk-unattributed`,
    contextPreflight,
    tokenBudget: budgetLease ? { ...budgetLease.snapshot } : undefined,
    // The SDK does not expose a credential/account identity. Never invent one
    // from a provider label or conflate different providers as one account.
    account: "unknown",
    accountType: "translation",
    accountIdentityStatus: "unavailable" as const,
    ...translationUsage(result),
  });
  const finalize = (
    status: number,
    errorType?: string,
    message?: string,
    errorCode?: string,
    retryable?: boolean,
  ) => {
    if (finalized) {
      return;
    }
    finalized = true;
    if (isProxyRequestFinalized(ctx.requestId)) {
      signal.removeEventListener("abort", onAbort);
      tracer?.end(status, Date.now() - requestStartTime);
      return;
    }
    signal.removeEventListener("abort", onAbort);
    const e = evidence();
    if (tracer && e.model !== requestModel) {
      tracer.setModelSubstitution(requestModel, e.model, e.provider);
    }
    if (e.inputTokens !== undefined && e.outputTokens !== undefined) {
      tracer?.setUsage({
        inputTokens: e.inputTokens,
        outputTokens: e.outputTokens,
        cacheReadTokens: e.cacheReadTokens ?? 0,
        cacheCreationTokens: e.cacheCreationTokens ?? 0,
        inputIncludesCachedTokens: e.inputIncludesCachedTokens,
        reasoningTokens: e.reasoningTokens,
      });
      tracer?.recordMetrics();
    }
    const ownsClientOutcome =
      getProxyRequestAccounting(ctx.requestId)?.accountingScope !== "internal";
    if (errorType) {
      tracer?.setError(errorType, message?.slice(0, 500) ?? errorType);
      if (ownsClientOutcome) {
        recordFinalError(
          status,
          attempt?.label ?? "translation",
          "translation",
          {
            requestId: ctx.requestId,
            errorType,
            terminalOutcome: errorType,
            message,
          },
        );
      }
    } else if (ownsClientOutcome) {
      recordFinalSuccess(attempt?.label ?? "translation", "translation");
    }
    tracer?.end(status, Date.now() - requestStartTime);
    void logRequest({
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
      method: ctx.method,
      path: ctx.path,
      stream,
      toolCount: Object.keys(parsed.tools).length,
      ...e,
      ...buildClientAttribution(ctx.headers),
      responseStatus: status,
      responseTimeMs: Date.now() - requestStartTime,
      errorType,
      errorCode,
      retryable,
      errorMessage: message?.slice(0, 500),
      firstUsefulOutputMs,
      firstUsefulOutputStatus:
        firstUsefulOutputMs === undefined ? "no_useful_output" : "observed",
      ...tracer?.getTraceContext(),
    });
  };
  const cleanupIterator = () => {
    if (iterator?.return) {
      void withTimeout(
        Promise.resolve().then(() => iterator?.return?.()),
        1000,
        "Translation cancellation timed out",
      ).catch(() => undefined);
    }
  };
  const settleBudget = (dispatched = upstreamDispatched): Promise<void> => {
    if (!budgetLease) {
      return Promise.resolve();
    }
    if (budgetSettlement) {
      return budgetSettlement;
    }
    const usage = evidence();
    const observed =
      usage.inputTokens !== undefined && usage.outputTokens !== undefined
        ? usage.inputTokens +
          usage.outputTokens +
          (usage.inputIncludesCachedTokens
            ? 0
            : (usage.cacheReadTokens ?? 0) + (usage.cacheCreationTokens ?? 0))
        : undefined;
    budgetSettlement = dispatched
      ? settleProxyTokenBudget(budgetLease, observed)
      : budgetLease.cancelBeforeDispatch();
    return budgetSettlement;
  };
  const onAbort = () => {
    const timeout = signal.reason?.name === "TimeoutError";
    cleanupIterator();
    terminalWork = settleBudget()
      .catch(() => undefined)
      .then(() => {
        finalize(
          timeout ? 504 : 499,
          timeout ? "upstream_timeout" : "client_cancelled",
          timeout
            ? "Request deadline exceeded"
            : "Client cancelled the response",
        );
      });
  };
  registerProxyResponseObserver(ctx.metadata, {
    onTerminal: () => terminalWork,
  });
  signal.addEventListener("abort", onAbort, { once: true });
  if (signal.aborted) {
    onAbort();
  }
  return {
    signal,
    capture,
    evidence,
    finalize,
    settleBudget,
    abandon() {
      // The outer Claude fallback chain owns the final response. Preserve this
      // attempt's observed evidence without finalizing or borrowing another
      // provider's account, model, or usage when that chain is exhausted.
      ctx.metadata.sdkFallbackFailure = evidence();
      signal.removeEventListener("abort", onAbort);
      cleanupIterator();
    },
    stream,
    cancel(reason?: unknown) {
      controller.abort(reason);
    },
    output() {
      firstUsefulOutputMs ??= Date.now() - requestStartTime;
    },
    setAttempt(value: ProxyTranslationAttempt) {
      upstreamDispatched = false;
      attempt = value;
      result = undefined;
      budgetLease = undefined;
      budgetSettlement = undefined;
      contextPreflight = undefined;
      if (!stream) {
        firstUsefulOutputMs = undefined;
      }
      iterator = undefined;
    },
    markDispatched() {
      upstreamDispatched = true;
    },
    setBudget(value: ProxyTokenBudgetLease) {
      budgetLease = value;
    },
    setContext(value: ProxyContextEvidence) {
      contextPreflight = value;
    },
    setResult(value: StreamResult) {
      result = value;
    },
    setIterator(value: AsyncIterator<unknown>) {
      iterator = value;
    },
    cleanupIterator,
  };
}

/** An attempt deadline covers setup AND stream consumption and aborts the SDK. */
async function* runTranslationAttempts(args: {
  ctx: ServerContext;
  format: ProxyFormat;
  parsed: ParsedClaudeRequest | ParsedOpenAIRequest | ParsedGeminiRequest;
  attempts: ProxyTranslationAttempt[];
  requestStartTime: number;
  request: ReturnType<typeof createTranslationRequest>;
  options?: Parameters<ServerContext["neurolink"]["stream"]>[0];
  attemptTimeoutMs?: number;
}): AsyncGenerator<
  { text?: string; result?: StreamResult; reset?: boolean; admitted?: boolean },
  void
> {
  const { ctx, parsed, attempts, request, requestStartTime } = args;
  let lastError: unknown = new Error("No translation providers succeeded");
  let outputVisible = false;
  for (let index = 0; index < attempts.length; index++) {
    request.signal.throwIfAborted();
    const attempt = attempts[index];
    const started = Date.now();
    const deadline = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const signal = AbortSignal.any([request.signal, deadline.signal]);
    request.setAttempt(attempt);
    yield { reset: true };
    let status = 200;
    let errorType: string | undefined;
    let errorMessage: string | undefined;
    let errorCode: string | undefined;
    let lease: ProxyTokenBudgetLease | undefined;
    let dispatched = false;
    let denied = false;
    let failureRetryable: boolean | undefined;
    let sdkResponse: ReturnType<typeof request.capture.accumulator> | undefined;
    try {
      const options = {
        ...buildTranslationOptions(parsed, {
          provider: attempt.provider,
          model: attempt.model,
        }),
        ...args.options,
        abortSignal: signal,
      };
      const prepared = prepareProxyRequestContext({
        provider: attempt.provider ?? "auto",
        model: attempt.model ?? parsed.model,
        body: options,
        toolReferenceBody: ctx.body,
        maxOutputTokens: parsed.maxTokens,
      });
      request.setContext(prepared.evidence);
      const reservation = reserveProxyTokenBudget({
        provider: attempt.provider ?? "auto",
        accountKey: `${attempt.provider ?? "auto"}:sdk-unattributed`,
        sessionKey: getProxyTokenBudgetSessionKey(new Headers(ctx.headers)),
        requestId: ctx.requestId,
        reservationTokens: prepared.totalTokensReservation,
        policy: getProxyTokenBudgetPolicy(),
        estimateProvenance: "context_preflight",
      });
      // A cancelled RPC may still grant a lease: release it before dispatch.
      void reservation.then(
        (value) => {
          if (signal.aborted && !dispatched) {
            void value.cancelBeforeDispatch().catch(() => undefined);
          }
        },
        () => undefined,
      );
      lease = await raceWithAbort(reservation, signal);
      request.setBudget(lease);
      signal.throwIfAborted();
      // Resolve local admission before any HTTP 200/SSE headers are committed.
      // No provider is started until the consumer asks for output.
      yield { admitted: true };
      signal.throwIfAborted();
      timer = setTimeout(() => {
        const error = new DOMException(
          "Translation attempt deadline exceeded",
          "TimeoutError",
        );
        deadline.abort(error);
        // Once output has reached the client, a timeout is terminal even if
        // downstream pulls have stopped. Before output, only this attempt
        // expires so a configured fallback can still run on the same request.
        if (outputVisible) {
          request.cancel(error);
        }
      }, args.attemptTimeoutMs ?? TRANSLATION_ATTEMPT_TIMEOUT_MS);
      timer.unref?.();
      dispatched = true;
      request.markDispatched();
      sdkResponse = request.capture.accumulator(
        "sdk_response",
        "text/event-stream",
        index + 1,
      );
      request.capture.log({
        phase: "sdk_request",
        contentType: "application/json",
        body: {
          ...prepared.body,
          abortSignal: undefined,
          tools:
            !("tools" in prepared.body) || prepared.body.tools === undefined
              ? undefined
              : Object.fromEntries(
                  Object.entries(
                    (prepared.body.tools ?? {}) as typeof parsed.tools,
                  ).map(([name, tool]) => [
                    name,
                    {
                      description: tool.description,
                      inputSchema:
                        tool.inputSchema &&
                        typeof tool.inputSchema === "object" &&
                        "jsonSchema" in tool.inputSchema
                          ? tool.inputSchema.jsonSchema
                          : tool.inputSchema,
                    },
                  ]),
                ),
        },
        attempt: index + 1,
        metadata: {
          representation: "neurolink_sdk_options",
          omittedRuntimeFields: ["abortSignal", "tools.*.execute"],
          schemaRepresentation: "json_schema",
          wireCapture: false,
        },
      });
      recordAttempt(attempt.label ?? "translation", "translation");
      const result = await raceWithAbort(
        ctx.neurolink.stream(
          prepared.body as Parameters<typeof ctx.neurolink.stream>[0],
        ),
        signal,
      );
      request.setResult(result);
      const iterator = (result.stream as AsyncIterable<unknown>)[
        Symbol.asyncIterator
      ]();
      request.setIterator(iterator);
      let hasText = false;
      while (true) {
        const next = await raceWithAbort(
          Promise.resolve(iterator.next()),
          signal,
        );
        if (next.done) {
          break;
        }
        sdkResponse?.appendEvent(next.value);
        const text = extractText(next.value);
        if (text) {
          hasText ||= text.trim().length > 0;
          // Any delivered text prevents replay, including whitespace.
          outputVisible = request.stream;
          request.output();
          yield { text };
        }
      }
      sdkResponse?.appendEvent({
        model: result.model,
        provider: result.provider,
        usage: result.usage,
        toolCalls: result.toolCalls,
        finishReason: result.finishReason,
      });
      if (!hasText && !result.toolCalls?.length) {
        throw new Error(
          `Translated provider ${attempt.label} returned no content or tool calls`,
        );
      }
      if (result.toolCalls?.length) {
        request.output();
      }
      // Provider work is complete before downstream terminal frames are read.
      // Slow clients must not retain provider admission or trigger an upstream timeout.
      clearTimeout(timer);
      await request.settleBudget();
      yield { result };
      return;
    } catch (error) {
      lastError =
        deadline.signal.aborted && !request.signal.aborted
          ? deadline.signal.reason
          : error;
      const budgetError = getProxyTokenBudgetError(error);
      const failure = getProxyUpstreamFailure(error);
      failureRetryable = failure?.retryable;
      denied =
        !!budgetError ||
        error instanceof ProxyContextPreflightError ||
        failure?.retryable === false;
      const timeout =
        deadline.signal.reason?.name === "TimeoutError" ||
        request.signal.reason?.name === "TimeoutError";
      status =
        budgetError?.status ??
        (error instanceof ProxyContextPreflightError
          ? error.status
          : timeout
            ? 504
            : request.signal.aborted
              ? 499
              : (failure?.status ?? 502));
      errorCode =
        budgetError?.code ??
        (error instanceof ProxyContextPreflightError
          ? error.code
          : failure?.code);
      errorType = budgetError
        ? "token_budget_rejected"
        : error instanceof ProxyContextPreflightError
          ? "context_preflight_rejected"
          : timeout
            ? "upstream_timeout"
            : request.signal.aborted
              ? "client_cancelled"
              : outputVisible
                ? "stream_error"
                : "generation_error";
      if (budgetError) {
        request.finalize(
          budgetError.status,
          "token_budget_rejected",
          budgetError.message,
          budgetError.code,
          false,
        );
      }
      if (error instanceof ProxyContextPreflightError) {
        if (error.evidence) {
          request.setContext(error.evidence);
        }
        request.finalize(status, errorType, error.message, error.code, false);
      }
      errorMessage =
        failure?.message ??
        sanitizeForLog(
          lastError instanceof Error ? lastError.message : String(lastError),
          500,
        );
      if (dispatched) {
        recordAttemptError(
          attempt.label ?? "translation",
          "translation",
          status,
        );
      }
      if (request.signal.aborted || outputVisible || denied) {
        throw lastError;
      }
    } finally {
      sdkResponse?.finish(status);
      clearTimeout(timer);
      // Free provider work even if it ignores iterator.return during a stall.
      deadline.abort();
      request.cleanupIterator();
      if (lease) {
        try {
          await request.settleBudget(dispatched);
        } catch (error) {
          errorCode ??= getProxyTokenBudgetError(error)?.code;
        }
      }
      void logRequestAttempt({
        timestamp: new Date().toISOString(),
        requestId: ctx.requestId,
        attempt: index + 1,
        method: ctx.method,
        path: ctx.path,
        stream: request.stream,
        toolCount: Object.keys(parsed.tools).length,
        ...request.evidence(),
        upstreamDispatched: dispatched,
        responseStatus: status,
        responseTimeMs: Date.now() - requestStartTime,
        attemptDurationMs: Date.now() - started,
        errorType,
        errorCode,
        errorMessage,
        retryable:
          failureRetryable ??
          (!denied &&
            !request.signal.aborted &&
            !outputVisible &&
            index + 1 < attempts.length),
      });
    }
  }
  throw lastError;
}

function buildTranslationErrorPayload(
  format: ProxyFormat,
  status: number,
  clientMessage: string,
  code?: string,
  retryable?: boolean,
) {
  return format === "gemini"
    ? {
        error: {
          code: status,
          status:
            status === 400
              ? "INVALID_ARGUMENT"
              : status === 403
                ? "PERMISSION_DENIED"
                : status === 429
                  ? "RESOURCE_EXHAUSTED"
                  : "UNAVAILABLE",
          message: clientMessage,
          ...(code ? { reason: code } : {}),
          ...(retryable !== undefined ? { retryable } : {}),
        },
      }
    : format === "claude"
      ? {
          type: "error",
          error: {
            type:
              status === 400
                ? "invalid_request_error"
                : status === 403
                  ? "permission_error"
                  : status === 429
                    ? "rate_limit_error"
                    : "api_error",
            message: clientMessage,
            ...(code ? { code } : {}),
            ...(retryable !== undefined ? { retryable } : {}),
          },
        }
      : {
          error: {
            type:
              status === 400
                ? "invalid_request_error"
                : status === 403
                  ? "permission_error"
                  : status === 429
                    ? "rate_limit_error"
                    : "server_error",
            message: clientMessage,
            ...(code ? { code } : {}),
            ...(retryable !== undefined ? { retryable } : {}),
          },
        };
}

function buildTranslationErrorResponse(
  format: ProxyFormat,
  status: number,
  clientMessage: string,
  code?: string,
  capture?: ReturnType<typeof createProxyRouteBodyCapture>,
  retryable?: boolean,
): Response {
  const payload = buildTranslationErrorPayload(
    format,
    status,
    clientMessage,
    code,
    retryable,
  );
  capture?.json(payload, status);
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Demand-driven serialization; a slow reader cannot grow an unbounded queue. */
export async function handleTranslatedStreamRequest(args: {
  ctx: ServerContext;
  format: ProxyFormat;
  requestModel: string;
  parsed: ParsedClaudeRequest | ParsedOpenAIRequest | ParsedGeminiRequest;
  attempts: ProxyTranslationAttempt[];
  tracer?: ProxyTracer;
  requestStartTime: number;
  /** Preserve outer fallback choice until first upstream output exists. */
  prefetchFirstOutput?: boolean;
  options?: Parameters<ServerContext["neurolink"]["stream"]>[0];
  attemptTimeoutMs?: number;
}): Promise<Response> {
  const { format, requestModel } = args;
  const request = createTranslationRequest({ ...args, stream: true });
  const serializer =
    format === "claude"
      ? createClaudeSerializerAdapter(requestModel)
      : format === "gemini"
        ? createGeminiSerializerAdapter(requestModel)
        : createOpenAISerializerAdapter(requestModel);
  let visible = false;
  const source = runTranslationAttempts({ ...args, request });
  let primed: Awaited<ReturnType<typeof source.next>> | undefined;
  try {
    do {
      primed = await source.next();
    } while (
      primed.done === false &&
      (primed.value.reset ||
        (args.prefetchFirstOutput && primed.value.admitted))
    );
  } catch (error) {
    if (args.prefetchFirstOutput) {
      request.abandon();
      throw error;
    }
    const budgetError = getProxyTokenBudgetError(error);
    const failure = getProxyUpstreamFailure(error);
    const status =
      budgetError?.status ??
      (error instanceof ProxyContextPreflightError
        ? error.status
        : (failure?.status ?? 502));
    const code =
      budgetError?.code ??
      (error instanceof ProxyContextPreflightError
        ? error.code
        : failure?.code);
    const message =
      budgetError?.message ??
      (error instanceof ProxyContextPreflightError
        ? error.message
        : "Upstream generation failed");
    request.finalize(
      status,
      "generation_error",
      failure?.message ?? message,
      code,
      failure?.retryable,
    );
    return buildTranslationErrorResponse(
      format,
      status,
      message,
      code,
      request.capture,
      failure?.retryable,
    );
  }
  async function* output(): AsyncGenerator<
    {
      text?: string;
      result?: StreamResult;
      reset?: boolean;
      admitted?: boolean;
    },
    void
  > {
    if (primed?.done === false) {
      yield primed.value;
    }
    yield* source;
  }
  async function* frames() {
    try {
      yield* serializer.start();
      for await (const item of output()) {
        if (item.text !== undefined) {
          visible = true;
          yield* serializer.pushDelta(item.text);
        }
        if (item.result) {
          for (const tool of item.result.toolCalls ?? []) {
            visible = true;
            yield* serializer.pushToolUse(
              tool.toolCallId || generateToolId(format),
              tool.toolName || "unknown",
              extractToolArgs(tool),
            );
          }
          yield* serializer.finish(
            item.result.finishReason ?? defaultFinishReason(format),
            extractUsageFromStreamResult(item.result.usage),
          );
        }
      }
      request.finalize(200);
    } catch (error) {
      if (request.signal.aborted) {
        return;
      }
      const failure = getProxyUpstreamFailure(error);
      const status =
        error instanceof Error && error.name === "TimeoutError"
          ? 504
          : (failure?.status ?? 502);
      const message =
        failure?.message ??
        sanitizeForLog(
          error instanceof Error ? error.message : String(error),
          500,
        );
      request.finalize(
        status,
        status === 504
          ? "upstream_timeout"
          : visible
            ? "stream_error"
            : "generation_error",
        message,
        failure?.code,
        failure?.retryable,
      );
      if (failure) {
        const payload = buildTranslationErrorPayload(
          format,
          status,
          "Upstream generation failed",
          failure.code,
          failure.retryable,
        );
        yield `${format === "claude" ? "event: error\n" : ""}data: ${JSON.stringify(payload)}\n\n`;
      } else {
        yield* serializer.emitError("Upstream generation failed");
      }
    }
  }
  const iterator = frames();
  const encoder = new TextEncoder();
  const clientCapture = request.capture.accumulator(
    "client_response",
    "text/event-stream",
  );
  let ended = false;
  let pending: Promise<IteratorResult<string>> | undefined;
  let streamController: ReadableStreamDefaultController<Uint8Array>;
  const onAbort = () => {
    clientCapture.finish(
      request.signal.reason?.name === "TimeoutError" ? 504 : 499,
    );
    ended = true;
    streamController?.error(
      request.signal.reason ??
        new DOMException("Client disconnected", "AbortError"),
    );
    void source.return().catch(() => undefined);
    void iterator.return().catch(() => undefined);
  };
  const stream = new ReadableStream<Uint8Array>(
    {
      start(controller) {
        streamController = controller;
        request.signal.addEventListener("abort", onAbort, { once: true });
        if (request.signal.aborted) {
          onAbort();
        }
      },
      async pull(controller) {
        if (ended) {
          return;
        }
        pending ??= iterator.next();
        // Keepalives use the same pull slot as data, so they cannot bypass backpressure.
        let heartbeat: ReturnType<typeof setTimeout> | undefined;
        try {
          const next = await Promise.race([
            pending,
            new Promise<null>((resolve) => {
              heartbeat = setTimeout(() => resolve(null), 15000);
              heartbeat.unref?.();
            }),
          ]);
          if (ended) {
            return;
          }
          if (next === null) {
            const bytes = encoder.encode(": keep-alive\n\n");
            clientCapture.append(bytes);
            controller.enqueue(bytes);
            return;
          }
          pending = undefined;
          if (next.done) {
            ended = true;
            request.signal.removeEventListener("abort", onAbort);
            clientCapture.finish(200);
            controller.close();
          } else {
            const bytes = encoder.encode(next.value);
            clientCapture.append(bytes);
            controller.enqueue(bytes);
          }
        } catch (error) {
          if (!ended) {
            clientCapture.finish(502);
            ended = true;
            controller.error(error);
          }
        } finally {
          if (heartbeat) {
            clearTimeout(heartbeat);
          }
        }
      },
      cancel(reason) {
        clientCapture.finish(499);
        ended = true;
        request.signal.removeEventListener("abort", onAbort);
        request.cancel(reason);
        void iterator.return().catch(() => undefined);
      },
    },
    { highWaterMark: 0 },
  );
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  });
}

export async function handleTranslatedJsonRequest(args: {
  ctx: ServerContext;
  format: ProxyFormat;
  requestModel: string;
  parsed: ParsedClaudeRequest | ParsedOpenAIRequest | ParsedGeminiRequest;
  attempts: ProxyTranslationAttempt[];
  tracer?: ProxyTracer;
  requestStartTime: number;
  terminalFailureStatus?: number;
  deferFinalOnError?: boolean;
  options?: Parameters<ServerContext["neurolink"]["stream"]>[0];
  attemptTimeoutMs?: number;
}): Promise<unknown> {
  const request = createTranslationRequest({ ...args, stream: false });
  let content = "";
  let result: StreamResult | undefined;
  try {
    for await (const item of runTranslationAttempts({ ...args, request })) {
      if (item.reset) {
        content = "";
      }
      if (item.text !== undefined) {
        content += item.text;
      }
      if (item.result) {
        result = item.result;
      }
    }
    request.signal.throwIfAborted();
    request.finalize(200);
    const usage = result?.usage
      ? extractUsageFromStreamResult(result.usage)
      : undefined;
    const internal: InternalResult = {
      content,
      model: result?.model,
      finishReason: result?.finishReason ?? defaultFinishReason(args.format),
      usage,
      toolCalls: result?.toolCalls as InternalResult["toolCalls"],
    };
    const response =
      args.format === "claude"
        ? serializeClaudeResponse(internal, args.requestModel)
        : args.format === "gemini"
          ? buildGeminiResponse(
              content,
              internal.finishReason ?? defaultFinishReason(args.format),
              usage ?? { input: 0, output: 0, total: 0 },
              internal.model ?? args.requestModel,
              internal.toolCalls,
            )
          : serializeOpenAIResponse(internal, args.requestModel);
    request.capture.json(response, 200);
    return response;
  } catch (error) {
    if (args.deferFinalOnError && !request.signal.aborted) {
      request.abandon();
      throw error;
    }
    const failure = getProxyUpstreamFailure(error);
    const message =
      failure?.message ??
      sanitizeForLog(
        error instanceof Error ? error.message : String(error),
        500,
      );
    const budgetError = getProxyTokenBudgetError(error);
    const timeout =
      request.signal.reason?.name === "TimeoutError" ||
      (error instanceof Error && error.name === "TimeoutError");
    const status =
      budgetError?.status ??
      (error instanceof ProxyContextPreflightError
        ? error.status
        : timeout
          ? 504
          : request.signal.aborted
            ? 499
            : (failure?.status ?? args.terminalFailureStatus ?? 502));
    const code =
      budgetError?.code ??
      (error instanceof ProxyContextPreflightError
        ? error.code
        : failure?.code);
    request.finalize(
      status,
      timeout
        ? "upstream_timeout"
        : request.signal.aborted
          ? "client_cancelled"
          : "generation_error",
      message,
      code,
      failure?.retryable,
    );
    const clientMessage =
      budgetError?.message ??
      (error instanceof ProxyContextPreflightError
        ? error.message
        : "Upstream generation failed");
    return buildTranslationErrorResponse(
      args.format,
      status,
      clientMessage,
      code,
      request.capture,
      failure?.retryable,
    );
  }
}

// ---------------------------------------------------------------------------
// Models list handler
// ---------------------------------------------------------------------------

/**
 * Build the /v1/models response in OpenAI list format.
 * Used by both Claude and OpenAI proxy routes.
 */
export function buildModelsListResponse(modelRouter?: {
  getModelMappings?: () => Array<{ from: string }>;
  getPassthroughModels?: () => string[];
}): {
  object: string;
  data: Array<{
    id: string;
    object: string;
    created: number;
    owned_by: string;
  }>;
} {
  const models: Array<{
    id: string;
    object: string;
    created: number;
    owned_by: string;
  }> = [];

  if (modelRouter) {
    const mappings = modelRouter.getModelMappings?.() ?? [];
    for (const m of mappings) {
      models.push({
        id: m.from,
        object: "model",
        created: 0,
        owned_by: "neurolink",
      });
    }

    const passthroughModels = modelRouter.getPassthroughModels?.() ?? [];
    for (const id of passthroughModels) {
      models.push({
        id,
        object: "model",
        created: 0,
        owned_by: "neurolink",
      });
    }
  }

  // Always include a default entry if nothing else is configured
  if (models.length === 0) {
    for (const id of DEFAULT_PROXY_MODEL_IDS) {
      models.push({
        id,
        object: "model",
        created: 0,
        owned_by: "neurolink",
      });
    }
  }

  return {
    object: "list",
    data: models,
  };
}

/**
 * Build an Anthropic-shaped `/v1/models` list response.
 *
 * Used by the Claude-compatible route so Anthropic SDK consumers receive
 * the schema they expect:
 *   { data: [{type, id, display_name, created_at}], first_id, last_id, has_more }
 *
 * The OpenAI route continues to use {@link buildModelsListResponse} for the
 * OpenAI list shape.
 */
export function buildAnthropicModelsListResponse(modelRouter?: {
  getModelMappings?: () => Array<{ from?: string }>;
  getPassthroughModels?: () => string[];
}): {
  data: Array<{
    type: "model";
    id: string;
    display_name: string;
    created_at: string;
  }>;
  first_id: string | null;
  last_id: string | null;
  has_more: boolean;
} {
  const ids: string[] = [];

  if (modelRouter) {
    const mappings = modelRouter.getModelMappings?.() ?? [];
    for (const m of mappings) {
      if (m.from) {
        ids.push(m.from);
      }
    }
    const passthrough = modelRouter.getPassthroughModels?.() ?? [];
    for (const id of passthrough) {
      ids.push(id);
    }
  }

  if (ids.length === 0) {
    ids.push(...DEFAULT_PROXY_MODEL_IDS);
  }

  // Deduplicate while preserving order — multiple router sources can publish
  // the same id (e.g. both an explicit mapping and a passthrough entry).
  const seen = new Set<string>();
  const unique = ids.filter((id) => {
    if (seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });

  const data = unique.map((id) => ({
    type: "model" as const,
    id,
    display_name: humanizeModelId(id),
    // Anthropic uses ISO-8601 timestamps. We don't have a real creation date
    // for proxy-published models, so anchor to the epoch — clients that care
    // about ordering have `first_id`/`last_id` instead.
    created_at: new Date(0).toISOString(),
  }));

  return {
    data,
    first_id: data[0]?.id ?? null,
    last_id: data[data.length - 1]?.id ?? null,
    has_more: false,
  };
}

/** Best-effort pretty name for a model id (e.g. `claude-3-5-haiku-20241022` -> `Claude 3.5 Haiku`). */
function humanizeModelId(id: string): string {
  // Drop the trailing date suffix if present (e.g. -20241022).
  const base = id.replace(/-\d{8}$/, "");
  // claude-3-5-haiku → ["claude", "3", "5", "haiku"] → "Claude 3.5 Haiku"
  const parts = base.split("-");
  const numericVersion: string[] = [];
  const words: string[] = [];
  for (const p of parts) {
    if (
      /^\d+$/.test(p) &&
      words.length > 0 &&
      words[0].toLowerCase() === "claude"
    ) {
      numericVersion.push(p);
    } else {
      words.push(p.charAt(0).toUpperCase() + p.slice(1));
    }
  }
  const versionPart =
    numericVersion.length > 0 ? ` ${numericVersion.join(".")}` : "";
  return words.length > 0
    ? `${words[0]}${versionPart}${words.slice(1).length ? " " + words.slice(1).join(" ") : ""}`
    : id;
}
