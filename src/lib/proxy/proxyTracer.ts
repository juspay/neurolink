/**
 * Proxy Request Tracer
 *
 * Creates and manages OTel spans for the proxy request lifecycle.
 * Provides a clean API for claudeProxyRoutes to trace each phase:
 *   receive -> account_selection -> upstream (per retry) -> stream -> end
 *
 * Uses the existing instrumentation infrastructure:
 * - setLangfuseContext() for Langfuse enrichment
 * - OTel propagation API for context propagation to/from upstream
 * - SpanAttributes from spanTypes.ts for attribute naming
 * - calculateCost() from pricing.ts for cost tracking
 */

import {
  type Context,
  type Meter,
  type Span,
  SpanStatusCode,
  SpanKind,
  ROOT_CONTEXT,
  isSpanContextValid,
  propagation,
  context,
  metrics,
  trace,
} from "@opentelemetry/api";
import { PROXY_TRACER_SCOPE } from "../constants/telemetry.js";
import {
  ensureTelemetry,
  setLangfuseContext,
} from "../services/server/ai/observability/instrumentation.js";
import {
  spanContentAttribute,
  withoutSpanContent,
} from "../telemetry/attributes.js";
import {
  observationLevel,
  observe,
  observeTrace,
  usageDetails,
} from "../telemetry/observation.js";
import { generationName } from "../telemetry/observationNames.js";
import { recordAIRequest } from "../telemetry/aiMetrics.js";
import { proxyTokenUsage } from "./proxyTokenUsage.js";
import {
  calculateCost,
  hasPricing,
  isExactPricingMatch,
} from "../utils/pricing.js";
import { logger } from "../utils/logger.js";
import {
  registerProxyRequestTraceContext,
  releaseProxyRequestTraceContext,
} from "./proxyTraceContext.js";
import type {
  AccountSelectionContext,
  JsonValue,
  ObservationLevel,
  ProxyMetrics,
  ProxyRequestContext,
  ProxyRequestOrigin,
  ResponseInfoContext,
  UpstreamAttemptContext,
  UsageContext,
  ProxyUsageAttributionOptions,
  RuntimeRequestMetadata,
  ProxyLogTraceContext,
} from "../types/index.js";

// ---------------------------------------------------------------------------
// OTEL Metric Instruments — lazy singleton
//
// The MeterProvider is created by ensureTelemetry() (instrumentation.ts) when
// OTEL_EXPORTER_OTLP_ENDPOINT is set; `neurolink proxy start` calls it at
// startup, *after* module import time.  @opentelemetry/api v1.x getMeter()
// returns a NoopMeter if called before a real MeterProvider is set.  We
// therefore defer instrument creation until the first ProxyTracer.end()
// call, at which point the MeterProvider is registered.
// ---------------------------------------------------------------------------

let _metrics: ProxyMetrics | null = null;

function getProxyMetrics(): ProxyMetrics {
  if (_metrics) {
    return _metrics;
  }

  const meter: Meter = metrics.getMeter("proxy", "1.0.0");

  const createdMetrics: ProxyMetrics = {
    requestsTotal: meter.createCounter("proxy_requests_total", {
      description: "Total number of proxy requests",
      unit: "{request}",
    }),
    requestDuration: meter.createHistogram("proxy_request_duration_ms", {
      description: "Proxy request duration in milliseconds",
      unit: "ms",
    }),
    tokensInput: meter.createCounter("proxy_tokens_input", {
      description: "Total input tokens consumed via proxy",
      unit: "{token}",
    }),
    tokensOutput: meter.createCounter("proxy_tokens_output", {
      description: "Total output tokens produced via proxy",
      unit: "{token}",
    }),
    tokensCacheRead: meter.createCounter("proxy_tokens_cache_read", {
      description: "Total cache-read tokens via proxy",
      unit: "{token}",
    }),
    tokensCacheCreation: meter.createCounter("proxy_tokens_cache_creation", {
      description: "Total cache-creation tokens via proxy",
      unit: "{token}",
    }),
    tokensReasoning: meter.createCounter("proxy_tokens_reasoning", {
      description: "Total reasoning tokens via proxy",
      unit: "{token}",
    }),
    costTotal: meter.createCounter("proxy_cost_usd_total", {
      description: "Total estimated cost in USD",
      unit: "USD",
    }),
    errorsTotal: meter.createCounter("proxy_errors_total", {
      description: "Total proxy errors",
      unit: "{error}",
    }),
    retriesTotal: meter.createCounter("proxy_retries_total", {
      description: "Total upstream retry attempts",
      unit: "{retry}",
    }),
    modelSubstitutionTotal: meter.createCounter(
      "proxy_model_substitution_total",
      {
        description:
          "Total proxy requests where the response model differs from the requested model",
        unit: "{substitution}",
      },
    ),
    requestBodySize: meter.createHistogram("proxy_request_body_bytes", {
      description: "Request body size in bytes sent upstream",
      unit: "By",
    }),
    responseBodySize: meter.createHistogram("proxy_response_body_bytes", {
      description: "Response body size in bytes received from upstream",
      unit: "By",
    }),
    fallbackAttemptsTotal: meter.createCounter(
      "proxy_fallback_attempts_total",
      {
        description: "Total fallback provider attempts",
        unit: "{attempt}",
      },
    ),
    fallbackSuccessTotal: meter.createCounter("proxy_fallback_success_total", {
      description: "Total successful fallback provider responses",
      unit: "{success}",
    }),
    fallbackFailureTotal: meter.createCounter("proxy_fallback_failure_total", {
      description: "Total failed fallback provider responses",
      unit: "{failure}",
    }),
    schemaDegradedTotal: meter.createCounter(
      "proxy_codex_outbound_schema_degraded_total",
      {
        description:
          "Total Codex-outbound tool declarations whose JSON Schema needed flattening or lost a feature on the way to a Claude tool",
        unit: "{tool}",
      },
    ),
    unsupportedFieldTotal: meter.createCounter(
      "proxy_codex_outbound_unsupported_field_total",
      {
        description:
          "Total Codex-outbound request fields this repo cannot faithfully represent in the Claude request, dropped rather than failing the translation",
        unit: "{field}",
      },
    ),
  };

  _metrics = createdMetrics;
  return createdMetrics;
}

// ---------------------------------------------------------------------------
// Header redaction (mirrors requestLogger.ts patterns)
// ---------------------------------------------------------------------------

/** Headers whose values must always be fully redacted. */
const SENSITIVE_HEADER_NAMES = new Set([
  "authorization",
  "proxy-authorization",
  "x-api-key",
  "cookie",
  "set-cookie",
]);

/** Pattern matching header names likely to contain secrets. */
const SENSITIVE_HEADER_PATTERN = /token|secret|key|password|credential/i;

function redactHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const redacted: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (
      SENSITIVE_HEADER_NAMES.has(lower) ||
      SENSITIVE_HEADER_PATTERN.test(lower)
    ) {
      redacted[key] = "[REDACTED]";
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

/** Redact sensitive JSON fields in request/response bodies before logging. */
const SENSITIVE_BODY_KEYS =
  /api[_-]?key|token|secret|password|credential|authorization/i;
const envFlag = (name: string): string | undefined =>
  process.env[name]?.trim().toLowerCase();

/**
 * Request and response bodies, both as observation input and output and as raw
 * span events, are recorded only on an explicit
 * `NEUROLINK_PROXY_TRACE_BODY_LOGGING=true`, read per call. Bodies are the
 * most sensitive thing a proxy sees, so tracing the request alone never turns
 * them on.
 */
const bodyLoggingEnabled = (): boolean =>
  process.env.NEUROLINK_PROXY_TRACE_BODY_LOGGING === "true";

/** `NEUROLINK_RECORD_INPUTS=false` keeps request content out of every trace. */
const recordInputsEnabled = (): boolean =>
  envFlag("NEUROLINK_RECORD_INPUTS") !== "false";
const MAX_BODY_LOG_SIZE = Number.parseInt(
  process.env.NEUROLINK_PROXY_TRACE_BODY_LOG_BYTES ?? "8192",
  10,
);
const MAX_STREAM_EVENTS_TO_LOG = 200;

function redactBodyForLogging(body: string, maxLen = 8192): string {
  const truncated =
    body.length > maxLen ? body.slice(0, maxLen) + "…[truncated]" : body;
  try {
    const parsed = JSON.parse(truncated);
    function walk(obj: unknown): unknown {
      if (obj === null || typeof obj !== "object") {
        return obj;
      }
      if (Array.isArray(obj)) {
        return obj.map(walk);
      }
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        out[k] = SENSITIVE_BODY_KEYS.test(k) ? "[REDACTED]" : walk(v);
      }
      return out;
    }
    return JSON.stringify(walk(parsed));
  } catch {
    return truncated;
  }
}

function buildBodyEventAttributes(
  body: string,
): Record<string, string | number | boolean> {
  const redacted = redactBodyForLogging(body, MAX_BODY_LOG_SIZE);
  return {
    "proxy.body": redacted,
    "proxy.body.size": body.length,
    "proxy.body.logged": true,
    "proxy.body.truncated": body.length > MAX_BODY_LOG_SIZE,
  };
}

function parseBody(body: string): JsonValue {
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

// ---------------------------------------------------------------------------
// Client app detection
// ---------------------------------------------------------------------------

function detectClientApp(userAgent?: string): string {
  if (!userAgent) {
    return "unknown";
  }
  if (userAgent.startsWith("claude-cli/")) {
    return "cli";
  }
  if (userAgent.startsWith("ai/")) {
    return "sdk";
  }
  return "unknown";
}

// ---------------------------------------------------------------------------
// ProxyTracer
// ---------------------------------------------------------------------------

class ProxyTracer {
  private readonly rootSpan: Span;
  private readonly traceContext: Context;
  private readonly proxyTracer = trace.getTracer(PROXY_TRACER_SCOPE);
  private readonly requestId: string;
  /**
   * Model used for costing. Starts as the model the client asked for and is
   * updated by setModelSubstitution(), so cost follows the model that actually
   * served the request rather than the one that was requested.
   */
  private model: string;
  /**
   * Provider used for costing. See ProxyRequestContext.provider. Mutable for
   * the same reason `model` is: a fallback can serve the request from a
   * different provider, and pricing has to follow it.
   */
  private billingProvider: string;
  private readonly startTime: number;
  private readonly isStream: boolean;
  private ended = false;
  private recordRequestMetrics = true;
  private recordUsageMetrics = true;

  private accountEmail?: string;
  private usage?: UsageContext;
  private mode: "full" | "passthrough" | "passthrough-cli" = "full";
  /** Where the Claude-shaped request originated, for cache/cost attribution. */
  private requestOrigin: ProxyRequestOrigin = "native";
  private readonly requestedModel: string;
  private input?: JsonValue;
  private output?: JsonValue | ResponseInfoContext["output"];
  /** The parsed response outranks the raw upstream body that arrives after it. */
  private outputIsParsed = false;
  /** A model call made through `runModelCall` records the generation. */
  private modelCallDelegated = false;
  /** That call's records carry no content; fixed when the call starts. */
  private modelContentWithheld = false;
  private responseModel?: string;
  private finishReason?: string;
  private firstOutputAt?: number;
  private upstreamStartedAt?: number;
  private cost?: number;
  private statusMessage?: string;

  private constructor(
    rootSpan: Span,
    traceContext: Context,
    requestId: string,
    model: string,
    stream: boolean,
    billingProvider: string,
  ) {
    this.rootSpan = rootSpan;
    this.traceContext = traceContext;
    this.requestId = requestId;
    this.model = model;
    this.requestedModel = model;
    this.billingProvider = billingProvider;
    this.startTime = Date.now();
    this.isStream = stream;
  }

  /**
   * Create a root span for a proxy request and set Langfuse context.
   *
   * If the incoming request carries a `traceparent` header, the root span
   * will be linked to the caller's trace via the OTel propagation API.
   */
  static startRequest(
    ctx: ProxyRequestContext,
    incomingHeaders?: Record<string, string>,
  ): ProxyTracer {
    // The proxy tracer is not a scrubbed tracer, so nothing else starts
    // telemetry before its first root span; without this an embedder that only
    // set the Langfuse keys loses that first request.
    ensureTelemetry();
    const tracer = trace.getTracer(PROXY_TRACER_SCOPE);

    // Extract parent context from incoming headers (Claude Code may send traceparent)
    let parentContext = context.active();
    if (incomingHeaders && !trace.getSpan(context.active())) {
      const headers = { ...incomingHeaders };
      if (headers["traceparent"]?.includes(", ")) {
        headers["traceparent"] = headers["traceparent"].split(", ")[0];
      }
      const extracted = trace.getSpanContext(
        propagation.extract(context.active(), headers),
      );
      if (extracted) {
        // Create a remote span context so the root span becomes a child of the caller
        parentContext = trace.setSpanContext(context.active(), extracted);
      }
    }

    const clientApp = ctx.clientApp ?? detectClientApp(ctx.userAgent);
    const sessionId =
      incomingHeaders?.["x-neurolink-session-id"] ?? ctx.sessionId;
    const traceContext = context.with(parentContext, () =>
      setLangfuseContext(
        {
          userId: incomingHeaders?.["x-neurolink-user-id"],
          sessionId,
          conversationId: incomingHeaders?.["x-neurolink-conversation-id"],
          requestId: ctx.requestId,
          traceName: `proxy:${ctx.model}`,
          metadata: {
            clientApp,
            stream: ctx.stream,
            toolCount: ctx.toolCount,
          },
        },
        () => context.active(),
      ),
    );

    // Model and usage are written under the gen_ai.* names collectors read
    // before as well as under proxy.*; Langfuse's export leaves the gen_ai.*
    // ones off this plain span, so the generation stays the priced record.
    const rootSpan = tracer.startSpan(
      "proxy.request",
      {
        attributes: {
          "proxy.request_id": ctx.requestId,
          "http.method": ctx.method,
          "http.target": ctx.path,
          "proxy.request.model": ctx.model,
          "gen_ai.request.model": ctx.model,
          "proxy.stream": ctx.stream,
          "proxy.tool_count": ctx.toolCount,
          "proxy.client_app": clientApp,
        },
      },
      traceContext,
    );
    // Marked at the start so a model call that ends before this span (the
    // translated path) is attached to it rather than to the span above it.
    observe(rootSpan, "span", {});

    if (ctx.userAgent) {
      rootSpan.setAttribute("http.user_agent", ctx.userAgent);
    }
    // Plain attributes for backends that index identity by key; Langfuse reads
    // the propagated user and session instead.
    for (const [key, value] of [
      ["neurolink.user_id", incomingHeaders?.["x-neurolink-user-id"]],
      ["neurolink.session_id", sessionId],
      [
        "neurolink.conversation_id",
        incomingHeaders?.["x-neurolink-conversation-id"],
      ],
    ] as const) {
      if (value) {
        rootSpan.setAttribute(key, value);
      }
    }
    if (ctx.toolNames && ctx.toolNames.length > 0) {
      // What the caller exposed to the model (tool catalogue for this request).
      rootSpan.setAttribute(
        "gen_ai.request.tool_names",
        JSON.stringify(ctx.toolNames),
      );
    }

    const instance = new ProxyTracer(
      rootSpan,
      trace.setSpan(traceContext, rootSpan),
      ctx.requestId,
      ctx.model,
      ctx.stream,
      ctx.provider ?? "anthropic",
    );
    instance.recordRequestMetrics = ctx.recordRequestMetrics !== false;
    instance.recordUsageMetrics =
      ctx.recordUsageMetrics ?? instance.recordRequestMetrics;

    return instance;
  }

  // -------------------------------------------------------------------------
  // Child spans
  // -------------------------------------------------------------------------

  /** Span covering the initial request receive and parse phase. */
  startReceive(): Span {
    return this.proxyTracer.startSpan(
      "proxy.receive",
      {
        attributes: {
          "proxy.request_id": this.requestId,
        },
      },
      this.traceContext,
    );
  }

  /** Span covering account selection logic (fill-first / round-robin). */
  startAccountSelection(): Span {
    return this.proxyTracer.startSpan(
      "proxy.account_selection",
      {
        attributes: {
          "proxy.request_id": this.requestId,
        },
      },
      this.traceContext,
    );
  }

  /** Span covering a single upstream attempt. One per retry. */
  startUpstreamAttempt(ctx: UpstreamAttemptContext): Span {
    this.upstreamStartedAt ??= Date.now();
    return this.proxyTracer.startSpan(
      "proxy.upstream",
      {
        attributes: {
          "proxy.request_id": this.requestId,
          "proxy.upstream.attempt": ctx.attempt,
          "proxy.upstream.account": ctx.account,
          "proxy.upstream.polyfill_headers": ctx.polyfillHeaders,
          "proxy.upstream.polyfill_body": ctx.polyfillBody,
          "http.url": ctx.upstreamUrl,
        },
      },
      this.traceContext,
    );
  }

  /** Span covering the SSE stream relay phase. */
  startStream(): Span {
    return this.proxyTracer.startSpan(
      "proxy.stream",
      {
        attributes: {
          "proxy.request_id": this.requestId,
          "proxy.request.model": this.model,
          "gen_ai.request.model": this.model,
        },
      },
      this.traceContext,
    );
  }

  /**
   * Run a model call inside this request's trace context, so the spans it
   * starts nest under the proxy root and carry the request's user and session.
   * That call's generation holds usage and cost, so the root records none of
   * its own. Its prompt and answer are request and response bodies, so its
   * records carry them only with `NEUROLINK_PROXY_TRACE_BODY_LOGGING=true`.
   */
  runModelCall<T>(fn: () => T): T {
    this.modelCallDelegated = true;
    this.modelContentWithheld = !bodyLoggingEnabled();
    return context.with(this.traceContext, () =>
      this.modelContentWithheld ? withoutSpanContent(fn) : fn(),
    );
  }

  /**
   * The delegated call's stream, read and closed under the same content rule:
   * the call records its answer while the stream is consumed, which happens
   * after `runModelCall` has returned.
   */
  modelStream<T>(iterator: AsyncIterator<T>): AsyncIterator<T> {
    if (!this.modelContentWithheld) {
      return iterator;
    }
    const close = iterator.return?.bind(iterator);
    return {
      next: (...value) => withoutSpanContent(() => iterator.next(...value)),
      ...(close && {
        return: (value) => withoutSpanContent(() => close(value)),
      }),
    };
  }

  // -------------------------------------------------------------------------
  // Attribute setters
  // -------------------------------------------------------------------------

  /** Record account selection outcome on the root span. */
  setAccountSelection(ctx: AccountSelectionContext): void {
    this.accountEmail = ctx.selectedAccount;
    this.rootSpan.setAttributes({
      "proxy.account.strategy": ctx.strategy,
      "proxy.account.total": ctx.accountsTotal,
      "proxy.account.healthy": ctx.accountsHealthy,
      "proxy.account.selected": ctx.selectedAccount,
      "proxy.account.type": ctx.accountType,
    });

    if (ctx.rateLimitBefore5h !== undefined) {
      this.rootSpan.setAttribute(
        "proxy.ratelimit.before.5h",
        ctx.rateLimitBefore5h,
      );
    }
    if (ctx.rateLimitBefore7d !== undefined) {
      this.rootSpan.setAttribute(
        "proxy.ratelimit.before.7d",
        ctx.rateLimitBefore7d,
      );
    }
  }

  /** Attribute fallback metrics to the account that actually served them. */
  setServedAccount(account: string, accountType: string): void {
    this.accountEmail = account;
    this.rootSpan.setAttributes({
      "proxy.account.served": account,
      "proxy.account.served_type": accountType,
    });
  }

  /**
   * Record where the Claude-shaped request this span covers originated, so
   * the token/cost counters below can be broken down by origin (e.g. to
   * measure Codex-fallback cache-hit rate separately from native traffic).
   */
  setRequestOrigin(origin: ProxyRequestOrigin): void {
    this.requestOrigin = origin;
    this.rootSpan.setAttribute("proxy.request_origin", origin);
  }

  /** Record token usage and cost on the root span. */
  setUsage(
    ctx: UsageContext,
    options: ProxyUsageAttributionOptions = {},
  ): void {
    if (options.recordMetrics !== undefined) {
      this.recordUsageMetrics = options.recordMetrics;
    }
    this.usage = ctx;

    const billingUsage = proxyTokenUsage(ctx);
    const totalTokens = billingUsage.total;

    // Custom token buckets are disjoint; standard GenAI input includes cache.
    this.rootSpan.setAttributes({
      "ai.tokens.input": billingUsage.input,
      "ai.tokens.output": ctx.outputTokens,
      "ai.tokens.total": totalTokens,
      // An unreported cache count is left off the span rather than written as
      // zero, which would read back as an observed cache miss.
      ...(ctx.cacheCreationTokensObserved === false
        ? {}
        : { "ai.tokens.cache_creation": ctx.cacheCreationTokens }),
      ...(ctx.cacheReadTokensObserved === false
        ? {}
        : { "ai.tokens.cache_read": ctx.cacheReadTokens }),
    });

    if (ctx.reasoningTokens !== undefined) {
      this.rootSpan.setAttribute("ai.tokens.reasoning", ctx.reasoningTokens);
    }

    this.rootSpan.setAttributes({
      "proxy.usage.input_tokens": totalTokens - ctx.outputTokens,
      "proxy.usage.output_tokens": ctx.outputTokens,
      "proxy.usage.total_tokens": totalTokens,
      "gen_ai.usage.input_tokens": totalTokens - ctx.outputTokens,
      "gen_ai.usage.output_tokens": ctx.outputTokens,
      "gen_ai.usage.total_tokens": totalTokens,
    });

    // Prefix-inferred prices are not an observed model rate. Keep provenance,
    // but emit an amount only when this model has an exact price-table entry.
    const pricingStatus = !hasPricing(this.billingProvider, this.model)
      ? "unavailable"
      : isExactPricingMatch(this.billingProvider, this.model)
        ? "exact"
        : "inferred";
    this.rootSpan.setAttributes({
      "ai.cost.basis": "api-equivalent",
      "ai.cost.pricing_status": pricingStatus,
    });
    if (pricingStatus === "exact") {
      const cost = calculateCost(
        this.billingProvider,
        this.model,
        billingUsage,
      );
      this.cost = cost;
      this.rootSpan.setAttributes({
        "ai.cost.total": cost,
        "ai.cost.currency": "USD",
      });
    }

    // Rate-limit utilisation after the request
    if (ctx.rateLimitAfter5h !== undefined) {
      this.rootSpan.setAttribute(
        "proxy.ratelimit.after.5h",
        ctx.rateLimitAfter5h,
      );
    }
    if (ctx.rateLimitAfter7d !== undefined) {
      this.rootSpan.setAttribute(
        "proxy.ratelimit.after.7d",
        ctx.rateLimitAfter7d,
      );
    }
  }

  /**
   * Record response-side details parsed from the upstream reply: the model
   * that actually answered, the finish reason, and which tools the model
   * invoked (tool_use blocks). Uses gen_ai.* semantic-convention attributes.
   */
  setResponseInfo(ctx: ResponseInfoContext): void {
    this.responseModel = ctx.responseModel ?? this.responseModel;
    this.finishReason = ctx.finishReason ?? this.finishReason;
    this.firstOutputAt = ctx.firstOutputAt ?? this.firstOutputAt;
    // A reply parsed to nothing (no content block, or an error before any)
    // is still parsed: the raw upstream text must not stand in for it.
    if (ctx.output !== undefined && this.recordsBodies()) {
      this.output = ctx.output;
      this.outputIsParsed = true;
    }
    if (ctx.responseModel) {
      this.rootSpan.setAttributes({
        "proxy.response.model": ctx.responseModel,
        "gen_ai.response.model": ctx.responseModel,
      });
    }
    if (ctx.finishReason) {
      this.rootSpan.setAttribute(
        "gen_ai.response.finish_reason",
        ctx.finishReason,
      );
    }
    if (ctx.stopSequence) {
      this.rootSpan.setAttribute(
        "gen_ai.response.stop_sequence",
        ctx.stopSequence,
      );
    }
    if (ctx.toolCalls && ctx.toolCalls.length > 0) {
      this.rootSpan.setAttributes({
        "gen_ai.response.tool_calls": JSON.stringify(ctx.toolCalls),
        "gen_ai.response.tool_call_count": ctx.toolCalls.length,
      });
      this.rootSpan.addEvent("proxy.response.tool_calls", {
        "gen_ai.response.tool_calls": JSON.stringify(ctx.toolCalls),
      });
    }
  }

  /** Record an error on the root span. */
  setError(errorType: string, errorMessage: string): void {
    this.statusMessage = `${errorType}: ${errorMessage}`;
    this.rootSpan.setAttributes({
      "error.type": errorType,
      "error.message": errorMessage,
      error: true,
    });
  }

  /** Record whether the request was handled in full or passthrough mode. */
  setMode(mode: "full" | "passthrough" | "passthrough-cli"): void {
    this.mode = mode;
    this.rootSpan.setAttribute("proxy.mode", mode);
  }

  /**
   * Record that the proxy substituted a different model than was requested.
   * Sets span attributes and increments the substitution metric counter.
   */
  setModelSubstitution(
    requestedModel: string,
    actualModel: string,
    actualProvider?: string,
  ): void {
    // Cost must follow the model that served the request, not the alias the
    // client typed — otherwise a claude-* alias routed to another provider is
    // billed at Claude rates. The provider has to move with it: leaving it at
    // the tracer's default means the substituted model is looked up in the
    // wrong pricing table, which yields no rate and so no charge at all.
    this.model = actualModel;
    if (actualProvider) {
      this.billingProvider = actualProvider;
    }
    this.rootSpan.setAttributes({
      "proxy.model_substituted": true,
      "proxy.original_model": requestedModel,
      "proxy.actual_model": actualModel,
      "proxy.response.model": actualModel,
      "gen_ai.response.model": actualModel,
      ...(actualProvider ? { "proxy.actual_provider": actualProvider } : {}),
    });
    if (this.recordRequestMetrics) {
      const m = getProxyMetrics();
      m.modelSubstitutionTotal.add(1, {
        requested_model: requestedModel,
        actual_model: actualModel,
      });
    }
  }

  setFallbackInfo(info: {
    triggered: boolean;
    provider?: string;
    model?: string;
    attemptCount: number;
    reason: string;
  }): void {
    if (!this.rootSpan) {
      return;
    }
    this.rootSpan.setAttributes({
      "proxy.fallback.triggered": info.triggered,
      ...(info.provider ? { "proxy.fallback.provider": info.provider } : {}),
      ...(info.model ? { "proxy.fallback.model": info.model } : {}),
      "proxy.fallback.attempt_count": info.attemptCount,
      "proxy.fallback.reason": info.reason,
    });
  }

  // -------------------------------------------------------------------------
  // Log payloads as span events
  // -------------------------------------------------------------------------

  /** Record the client request body as the input of the root and its generation. */
  setRequestInput(body: JsonValue): void {
    if (this.recordsBodies() && recordInputsEnabled()) {
      this.input = body;
    }
  }

  /** Log the incoming client request body (redacted). */
  logRequestBody(body: string): void {
    if (this.recordsBodies() && recordInputsEnabled()) {
      this.input = parseBody(body);
    }
    if (!bodyLoggingEnabled() || !recordInputsEnabled()) {
      this.rootSpan.addEvent("proxy.client.request_body", {
        "proxy.body.size": body.length,
        "proxy.body.logged": false,
      });
      return;
    }
    this.rootSpan.addEvent("proxy.client.request_body", {
      ...buildBodyEventAttributes(body),
    });
  }

  /** Log the incoming client request headers (redacted). */
  logRequestHeaders(headers: Record<string, string>): void {
    this.rootSpan.addEvent("proxy.client.request_headers", {
      "proxy.headers": JSON.stringify(redactHeaders(headers)),
    });
  }

  /** Log the upstream request body (redacted, as sent to Anthropic). */
  logUpstreamRequestBody(body: string): void {
    if (!bodyLoggingEnabled() || !recordInputsEnabled()) {
      this.rootSpan.addEvent("proxy.upstream.request_body", {
        "proxy.body.size": body.length,
        "proxy.body.logged": false,
      });
      return;
    }
    this.rootSpan.addEvent("proxy.upstream.request_body", {
      ...buildBodyEventAttributes(body),
    });
  }

  /** Log the upstream request headers (redacted). */
  logUpstreamRequestHeaders(headers: Record<string, string>): void {
    this.rootSpan.addEvent("proxy.upstream.request_headers", {
      "proxy.headers": JSON.stringify(redactHeaders(headers)),
    });
  }

  /** Log the upstream response headers (redacted). */
  logUpstreamResponseHeaders(headers: Record<string, string>): void {
    this.rootSpan.addEvent("proxy.upstream.response_headers", {
      "proxy.headers": JSON.stringify(redactHeaders(headers)),
    });
  }

  /** Log the upstream response body (redacted). */
  logUpstreamResponseBody(body: string): void {
    if (this.recordsBodies() && !this.outputIsParsed) {
      this.output = parseBody(body);
    }
    if (!bodyLoggingEnabled()) {
      this.rootSpan.addEvent("proxy.upstream.response_body", {
        "proxy.body.size": body.length,
        "proxy.body.logged": false,
      });
      return;
    }
    this.rootSpan.addEvent("proxy.upstream.response_body", {
      ...buildBodyEventAttributes(body),
    });
  }

  /** Log SSE stream events (each event has type, timestamp, data). */
  logStreamEvents(
    events: Array<{ type: string; timestamp: number; data: string }>,
  ): void {
    if (!bodyLoggingEnabled()) {
      this.rootSpan.addEvent("proxy.stream.events", {
        "proxy.stream.event_count": events.length,
        "proxy.body.logged": false,
      });
      return;
    }

    const truncated = events.length > MAX_STREAM_EVENTS_TO_LOG;
    const redactedEvents = events
      .slice(0, MAX_STREAM_EVENTS_TO_LOG)
      .map((event) => ({
        ...event,
        data: event.data
          ? redactBodyForLogging(event.data, MAX_BODY_LOG_SIZE)
          : "",
      }));
    if (truncated) {
      redactedEvents.push({
        type: "truncated",
        timestamp: Date.now(),
        data: "…[truncated]",
      });
    }

    this.rootSpan.addEvent("proxy.stream.events", {
      "proxy.stream.event_count": events.length,
      "proxy.stream.events": JSON.stringify(redactedEvents),
      "proxy.body.logged": true,
      "proxy.body.truncated": truncated,
    });
  }

  // -------------------------------------------------------------------------
  // Metric recording helpers
  // -------------------------------------------------------------------------

  /** Record an upstream retry attempt. */
  recordRetry(account: string, reason: string): void {
    this.statusMessage ??= `retried: ${reason}`;
    const m = getProxyMetrics();
    m.retriesTotal.add(1, {
      model: this.model,
      account,
      reason,
    });
  }

  /** Record request and/or response body sizes for bandwidth tracking. */
  recordBodySizes(requestBytes?: number, responseBytes?: number): void {
    const m = getProxyMetrics();
    const labels = {
      model: this.model,
      account: this.accountEmail ?? "unknown",
    };

    if (requestBytes !== undefined && requestBytes > 0) {
      m.requestBodySize.record(requestBytes, labels);
    }
    if (responseBytes !== undefined && responseBytes > 0) {
      m.responseBodySize.record(responseBytes, labels);
    }
  }

  // -------------------------------------------------------------------------
  // Context accessors
  // -------------------------------------------------------------------------

  /** Return the OTel trace/span IDs for this request (for log correlation). */
  getTraceContext(): ProxyLogTraceContext {
    const spanCtx = this.rootSpan.spanContext();
    return {
      traceId: spanCtx.traceId,
      spanId: spanCtx.spanId,
      traceFlags: spanCtx.traceFlags,
    };
  }

  /** Return the captured usage (set by setUsage). */
  getUsage(): UsageContext | undefined {
    return this.usage;
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  /** End the root span with final HTTP status and duration, and emit OTEL metrics. */
  end(responseStatus: number, durationMs: number): void {
    if (this.ended) {
      return;
    }
    this.ended = true;
    this.rootSpan.setAttributes({
      "http.status_code": responseStatus,
      "proxy.duration_ms": durationMs,
      "proxy.mode": this.mode,
      ...(this.accountEmail
        ? { "proxy.account": this.accountEmail }
        : undefined),
    });

    if (responseStatus >= 400) {
      this.rootSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: `HTTP ${responseStatus}`,
      });
    } else {
      this.rootSpan.setStatus({ code: SpanStatusCode.OK });
    }

    this.observeOutcome(responseStatus);
    this.rootSpan.end();

    if (!this.recordRequestMetrics && !this.recordUsageMetrics) {
      return;
    }

    // ---- Emit OTEL metrics (lazy-init instruments) ----
    const m = getProxyMetrics();
    const labels = {
      model: this.model,
      account: this.accountEmail ?? "unknown",
      status: String(responseStatus),
      stream: String(this.isStream),
      mode: this.mode,
    };

    if (this.recordRequestMetrics) {
      m.requestsTotal.add(1, labels);
      m.requestDuration.record(durationMs, labels);
    }

    // Token metrics (only if usage was captured)
    if (this.recordUsageMetrics && this.usage) {
      // `origin` is added to the label set only when it is not the default
      // "native" value, so every pre-existing series keeps its exact old
      // label set {model, account} when the Codex-outbound-fallback flag is
      // off (or simply unused) — Ruling 1's byte-for-byte requirement — and
      // no metric series is restarted for traffic this PR does not touch.
      const tokenLabels =
        this.requestOrigin === "native"
          ? { model: this.model, account: this.accountEmail ?? "unknown" }
          : {
              model: this.model,
              account: this.accountEmail ?? "unknown",
              origin: this.requestOrigin,
            };

      m.tokensInput.add(proxyTokenUsage(this.usage).input, tokenLabels);
      m.tokensOutput.add(this.usage.outputTokens, tokenLabels);
      // Skipped, not zeroed, when the provider reported no breakdown: a zero
      // here is read back as an observed cache miss and drags the measured
      // cache rate down by however many such replies arrive.
      if (this.usage.cacheReadTokensObserved !== false) {
        m.tokensCacheRead.add(this.usage.cacheReadTokens, tokenLabels);
      }
      if (this.usage.cacheCreationTokensObserved !== false) {
        m.tokensCacheCreation.add(this.usage.cacheCreationTokens, tokenLabels);
      }

      if (this.usage.reasoningTokens) {
        m.tokensReasoning.add(this.usage.reasoningTokens, tokenLabels);
      }

      // Cost
      const billingUsage = proxyTokenUsage(this.usage);

      const cost =
        isExactPricingMatch(this.billingProvider, this.model) &&
        hasPricing(this.billingProvider, this.model)
          ? calculateCost(this.billingProvider, this.model, billingUsage)
          : undefined;

      if (cost !== undefined) {
        m.costTotal.add(cost, tokenLabels);
      }

      recordAIRequest(
        this.billingProvider,
        this.model,
        billingUsage.total,
        durationMs,
        cost,
      );
    }

    // Error metrics
    if (this.recordRequestMetrics && responseStatus >= 400) {
      const errorType =
        responseStatus === 429
          ? "rate_limit"
          : responseStatus === 401
            ? "auth"
            : responseStatus >= 500
              ? "server"
              : "client";

      m.errorsTotal.add(1, {
        model: this.model,
        account: this.accountEmail ?? "unknown",
        error_type: errorType,
        status: String(responseStatus),
      });
    }
  }

  /** Bodies are only worth keeping while something is recording the span. */
  private recordsBodies(): boolean {
    return bodyLoggingEnabled() && this.rootSpan.isRecording();
  }

  private levelFor(responseStatus: number): ObservationLevel | undefined {
    if (responseStatus === 499) {
      return "WARNING";
    }
    if (responseStatus >= 400) {
      return "ERROR";
    }
    if (this.statusMessage) {
      return "WARNING";
    }
    return observationLevel(this.finishReason);
  }

  private observeOutcome(responseStatus: number): void {
    const level = this.levelFor(responseStatus);
    const statusMessage =
      this.statusMessage ??
      (responseStatus >= 400 ? `HTTP ${responseStatus}` : undefined);
    const io = {
      input:
        this.input === undefined ? undefined : spanContentAttribute(this.input),
      output:
        this.output === undefined
          ? undefined
          : spanContentAttribute(this.output),
    };
    observe(this.rootSpan, "span", {
      ...io,
      level,
      statusMessage,
      metadata: { account: this.accountEmail },
    });
    observeTrace(this.rootSpan, io);

    if (this.upstreamStartedAt === undefined || this.modelCallDelegated) {
      return;
    }
    const generation = this.proxyTracer.startSpan(
      generationName(this.isStream ? "stream" : "generate"),
      {
        startTime: this.upstreamStartedAt,
        attributes: { "proxy.request_id": this.requestId },
      },
      this.traceContext,
    );
    observe(generation, "generation", {
      ...io,
      model: this.responseModel ?? this.model,
      usageDetails: this.usage && usageDetails(proxyTokenUsage(this.usage)),
      costDetails: this.cost === undefined ? undefined : { total: this.cost },
      completionStartTime:
        this.firstOutputAt === undefined
          ? undefined
          : new Date(this.firstOutputAt),
      level,
      statusMessage,
      metadata: {
        provider: this.billingProvider,
        account: this.accountEmail,
        requestedModel: this.requestedModel,
        finishReason: this.finishReason,
      },
    });
    generation.end();
  }

  // -------------------------------------------------------------------------
  // Context propagation
  // -------------------------------------------------------------------------

  /**
   * Get trace context headers for propagation to the upstream Anthropic request.
   * Injects the current trace's `traceparent` / `tracestate` into a new header map.
   */
  getTraceHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    propagation.inject(this.traceContext, headers);
    return headers;
  }
}

/**
 * Consecutive failures a configured fallback leg may accumulate before the
 * proxy says so out loud.
 *
 * A leg that is attempted and never succeeds is invisible today: the counters
 * record every attempt and every failure, but nothing reads them back, so the
 * condition surfaces only if an operator happens to query telemetry. Meanwhile
 * every request falls through to the next leg, which can bill on a different
 * account at a different rate, so the first symptom is a cost change rather
 * than an error. Twenty is low enough to catch a dead leg within seconds of
 * sustained traffic and high enough that ordinary account rotation or a brief
 * cooldown never trips it.
 */
const DEAD_FALLBACK_LEG_THRESHOLD = 20;

/**
 * Upper bound on tracked legs.
 *
 * Not every key comes from the configured chain. The auto-provider path records
 * `auto-provider/<requested model>`, and the requested model is whatever the
 * caller asked for, so a client that fails requests under varying model names
 * mints a new key each time. Without a bound these collections grow for the
 * lifetime of the process. The cap is far above any real fallback chain, so a
 * genuine leg is never evicted in practice.
 */
const MAX_TRACKED_FALLBACK_LEGS = 256;

/** Consecutive failures per `provider/model`, reset by any success. */
const fallbackFailureStreaks = new Map<string, number>();
/** Legs already reported, so a dead leg is stated once and not once per turn. */
const reportedDeadFallbackLegs = new Set<string>();

/**
 * Record a streak, evicting the least recently touched leg past the cap.
 *
 * `Map` and `Set` iterate in insertion order and re-setting an existing key does
 * not move it, so a key is deleted before being re-added. That makes recency the
 * eviction order and keeps a leg that is actively failing from being dropped in
 * favour of a stale one.
 */
function touchFallbackLegStreak(legKey: string, streak: number): void {
  fallbackFailureStreaks.delete(legKey);
  fallbackFailureStreaks.set(legKey, streak);
  while (fallbackFailureStreaks.size > MAX_TRACKED_FALLBACK_LEGS) {
    const oldest = fallbackFailureStreaks.keys().next();
    if (oldest.done) {
      break;
    }
    fallbackFailureStreaks.delete(oldest.value);
    reportedDeadFallbackLegs.delete(oldest.value);
  }
}

/**
 * Report a fallback leg that has stopped serving, and its recovery.
 *
 * Deliberately keyed per leg rather than globally: a second leg going dark must
 * still be reported while the first is known dead.
 */
function trackFallbackLegHealth(
  legKey: string,
  status: "success" | "failure",
  errorMessage: string | undefined,
): void {
  if (status === "success") {
    fallbackFailureStreaks.delete(legKey);
    if (reportedDeadFallbackLegs.delete(legKey)) {
      logger.always(
        `[proxy] fallback ${legKey} is serving again after being reported dead`,
      );
    }
    return;
  }
  const streak = (fallbackFailureStreaks.get(legKey) ?? 0) + 1;
  touchFallbackLegStreak(legKey, streak);
  if (streak < DEAD_FALLBACK_LEG_THRESHOLD) {
    return;
  }
  if (reportedDeadFallbackLegs.has(legKey)) {
    return;
  }
  // Marked reported only once the report is out. Marking first meant a throwing
  // logger — swallowed by the caller's catch — silenced the leg permanently,
  // which is the one outcome this whole mechanism exists to prevent.
  logger.always(
    `[proxy] fallback ${legKey} has failed ${streak} consecutive attempts with ` +
      `no success — this leg is not serving. Traffic is falling through to the ` +
      `next leg in the chain, which may bill differently. Check the account's ` +
      `quota and credentials` +
      (errorMessage ? `; last error: ${errorMessage.slice(0, 200)}` : ""),
  );
  reportedDeadFallbackLegs.add(legKey);
}

/** Leg failure classes the fallback paths put in brackets before a message. */
const FALLBACK_ERROR_CLASSES = new Set([
  "unknown",
  "unavailable",
  "rate_limit",
  "context_overflow",
  "empty_response",
  "schema_mismatch",
  "provider_quota",
]);

/**
 * A metric label from a fixed set: an error message is unbounded cardinality
 * and can echo the prompt or a credential.
 */
function fallbackErrorLabel(errorMessage: string | undefined): string {
  if (errorMessage === undefined) {
    return "unknown";
  }
  const named = /^\[([a-z_]+)\]/.exec(errorMessage)?.[1];
  return named !== undefined && FALLBACK_ERROR_CLASSES.has(named)
    ? named
    : "other";
}

export function recordFallbackAttempt(attrs: {
  provider: string;
  model: string;
  status: "success" | "failure";
  errorMessage?: string;
  durationMs: number;
  /** Namespaces the leg-health key for a fallback direction other than the
   *  existing Claude-engine chain (e.g. `"codex-outbound"`), so a dead-leg
   *  alert for `anthropic/claude-...` reached via Codex-outbound fallback
   *  never merges its failure streak with the same provider/model reached
   *  through the Claude engine's own configured chain. Omitted entirely by
   *  every existing call site, which keeps their leg key exactly as before. */
  direction?: string;
}): void {
  // Leg health is tracked outside the metrics try/catch: a telemetry failure
  // must not be the reason an operator never hears that a leg is dead.
  try {
    trackFallbackLegHealth(
      attrs.direction
        ? `${attrs.direction}:${attrs.provider}/${attrs.model}`
        : `${attrs.provider}/${attrs.model}`,
      attrs.status,
      attrs.errorMessage,
    );
  } catch {
    // Never let health reporting break a request.
  }
  try {
    const m = getProxyMetrics();
    const labels = { provider: attrs.provider, model: attrs.model };
    m.fallbackAttemptsTotal.add(1, labels);
    if (attrs.status === "success") {
      m.fallbackSuccessTotal.add(1, labels);
    } else {
      m.fallbackFailureTotal.add(1, {
        ...labels,
        error: fallbackErrorLabel(attrs.errorMessage),
      });
    }
  } catch {
    // metrics are best-effort
  }
}

/**
 * Records one Codex-outbound tool-declaration schema degradation (a
 * `$ref`/`$defs` flatten that hit a circular reference, a dropped `strict`
 * flag, or a custom grammar tool wrapped into a one-string schema). `reason`
 * is a short, stable label — never the schema or tool-name text itself, so a
 * call site cannot accidentally leak request payload into a metric label.
 */
export function recordCodexOutboundSchemaDegraded(attrs: {
  toolName: string;
  reason: string;
}): void {
  try {
    const m = getProxyMetrics();
    m.schemaDegradedTotal.add(1, {
      toolName: attrs.toolName.slice(0, 100),
      reason: attrs.reason.slice(0, 100),
    });
  } catch {
    // metrics are best-effort
  }
}

/**
 * Records one Codex-outbound request field dropped during translation
 * because this repo has no faithful Claude-request representation for it
 * (e.g. a malformed `function_call.arguments` string wrapped instead of
 * parsed). Mirrors `recordCodexOutboundSchemaDegraded`'s label discipline.
 */
export function recordCodexOutboundUnsupportedField(attrs: {
  field: string;
  reason: string;
}): void {
  try {
    const m = getProxyMetrics();
    m.unsupportedFieldTotal.add(1, {
      field: attrs.field.slice(0, 100),
      reason: attrs.reason.slice(0, 100),
    });
  } catch {
    // metrics are best-effort
  }
}

/** Reset leg-health state between tests. */
export const __fallbackLegHealthTestHooks = {
  threshold: DEAD_FALLBACK_LEG_THRESHOLD,
  maxTrackedLegs: MAX_TRACKED_FALLBACK_LEGS,
  trackedCount: (): number => fallbackFailureStreaks.size,
  reset: (): void => {
    fallbackFailureStreaks.clear();
    reportedDeadFallbackLegs.clear();
  },
  streakOf: (legKey: string): number => fallbackFailureStreaks.get(legKey) ?? 0,
  isReported: (legKey: string): boolean => reportedDeadFallbackLegs.has(legKey),
};

export { ProxyTracer };

/** Standard SERVER span covers every proxy door, including parsing and admission failures. */
export function startProxyHttpTrace(
  metadata: RuntimeRequestMetadata,
  headers: Record<string, string>,
) {
  try {
    ensureTelemetry();
    const normalizedHeaders = { ...headers };
    if (normalizedHeaders.traceparent?.includes(",")) {
      normalizedHeaders.traceparent = normalizedHeaders.traceparent
        .split(",", 1)[0]
        .trim();
    }
    const parent = propagation.extract(ROOT_CONTEXT, normalizedHeaders);
    const span = trace.getTracer(PROXY_TRACER_SCOPE).startSpan(
      "proxy.http.request",
      {
        kind: SpanKind.SERVER,
        attributes: {
          "http.request.method": metadata.method,
          "url.path": metadata.path,
          "proxy.request_id": metadata.requestId,
        },
      },
      parent,
    );
    const spanContext = span.spanContext();
    if (isSpanContextValid(spanContext)) {
      metadata.traceId = spanContext.traceId;
      metadata.spanId = spanContext.spanId;
      metadata.traceFlags = spanContext.traceFlags;
      registerProxyRequestTraceContext(metadata.requestId, {
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
        traceFlags: spanContext.traceFlags,
      });
    }
    const active = trace.setSpan(parent, span);
    let ended = false;
    return {
      run: <T>(fn: () => T): T => context.with(active, fn),
      end: (status: number, outcome: string, errorType?: string): void => {
        if (ended) {
          return;
        }
        ended = true;
        try {
          span.setAttributes({
            "http.response.status_code": status,
            "proxy.terminal_outcome": outcome,
            ...(errorType ? { "error.type": errorType } : {}),
          });
          if (
            status >= 500 ||
            outcome === "stream_error" ||
            outcome === "unknown"
          ) {
            span.setStatus({ code: SpanStatusCode.ERROR });
          }
          span.end();
        } catch {
          // Telemetry must not interrupt transport cleanup.
        } finally {
          releaseProxyRequestTraceContext(metadata.requestId);
        }
      },
    };
  } catch {
    releaseProxyRequestTraceContext(metadata.requestId);
    return { run: <T>(fn: () => T): T => fn(), end: () => undefined };
  }
}
