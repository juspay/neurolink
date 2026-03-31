/**
 * Proxy Request Tracer
 *
 * Creates and manages OTel spans for the proxy request lifecycle.
 * Provides a clean API for claudeProxyRoutes to trace each phase:
 *   receive -> account_selection -> upstream (per retry) -> stream -> end
 *
 * Uses the existing instrumentation infrastructure:
 * - getTracer() from instrumentation.ts for span creation
 * - setLangfuseContext() for Langfuse enrichment
 * - OtelBridge for context propagation to/from upstream
 * - SpanAttributes from spanTypes.ts for attribute naming
 * - calculateCost() from pricing.ts for cost tracking
 * - TelemetryService for metrics recording
 */

import {
  type Counter,
  type Histogram,
  type Meter,
  type Span,
  SpanStatusCode,
  context,
  metrics,
  trace,
} from "@opentelemetry/api";
import {
  getTracer,
  setLangfuseContext,
} from "../services/server/ai/observability/instrumentation.js";
import { OtelBridge } from "../observability/otelBridge.js";
import { calculateCost } from "../utils/pricing.js";
import { TelemetryService } from "../telemetry/telemetryService.js";
import { logger } from "../utils/logger.js";

const LOG_PREFIX = "[ProxyTracer]";

// ---------------------------------------------------------------------------
// OTEL Metric Instruments — lazy singleton
//
// The MeterProvider is registered in initializeOpenTelemetry() which runs
// *after* module import time.  @opentelemetry/api v1.x getMeter() returns a
// NoopMeter if called before a real MeterProvider is set.  We therefore
// defer instrument creation until the first ProxyTracer.end() call, at which
// point the MeterProvider is guaranteed to be registered.
// ---------------------------------------------------------------------------

type ProxyMetrics = {
  requestsTotal: Counter;
  requestDuration: Histogram;
  tokensInput: Counter;
  tokensOutput: Counter;
  tokensCacheRead: Counter;
  tokensCacheCreation: Counter;
  tokensReasoning: Counter;
  costTotal: Counter;
  errorsTotal: Counter;
  retriesTotal: Counter;
  modelSubstitutionTotal: Counter;
  requestBodySize: Histogram;
  responseBodySize: Histogram;
};

let _metrics: ProxyMetrics | null = null;

function getProxyMetrics(): ProxyMetrics {
  if (_metrics) {
    return _metrics;
  }

  const meter: Meter = metrics.getMeter("neurolink.proxy", "1.0.0");

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
  };

  _metrics = createdMetrics;
  return createdMetrics;
}

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------

type ProxyRequestContext = {
  requestId: string;
  method: string;
  path: string;
  model: string;
  stream: boolean;
  toolCount: number;
  sessionId?: string;
  userAgent?: string;
  clientApp?: string;
};

type AccountSelectionContext = {
  strategy: string;
  accountsTotal: number;
  accountsHealthy: number;
  selectedAccount: string;
  accountType: string;
  rateLimitBefore5h?: number;
  rateLimitBefore7d?: number;
};

type UpstreamAttemptContext = {
  attempt: number;
  account: string;
  polyfillHeaders: boolean;
  polyfillBody: boolean;
  upstreamUrl: string;
};

type UsageContext = {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  reasoningTokens?: number;
  rateLimitAfter5h?: number;
  rateLimitAfter7d?: number;
};

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
const BODY_LOGGING_ENABLED =
  process.env.NEUROLINK_PROXY_TRACE_BODY_LOGGING === "true";
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
  private readonly proxyTracer = getTracer("neurolink.proxy");
  private readonly bridge = new OtelBridge();
  private readonly requestId: string;
  private readonly model: string;
  private readonly startTime: number;
  private readonly isStream: boolean;

  private accountEmail?: string;
  private usage?: UsageContext;
  private mode: "full" | "passthrough" | "passthrough-cli" = "full";

  private constructor(
    rootSpan: Span,
    requestId: string,
    model: string,
    stream: boolean,
  ) {
    this.rootSpan = rootSpan;
    this.requestId = requestId;
    this.model = model;
    this.startTime = Date.now();
    this.isStream = stream;
  }

  /**
   * Create a root span for a proxy request and set Langfuse context.
   *
   * If the incoming request carries a `traceparent` header, the root span
   * will be linked to the caller's trace via OtelBridge.extractContext().
   */
  static startRequest(
    ctx: ProxyRequestContext,
    incomingHeaders?: Record<string, string>,
  ): ProxyTracer {
    const tracer = getTracer("neurolink.proxy");

    // Extract parent context from incoming headers (Claude Code may send traceparent)
    let parentContext = context.active();
    if (incomingHeaders) {
      const bridge = new OtelBridge();
      const extracted = bridge.extractContext(incomingHeaders);
      if (extracted) {
        // Create a remote span context so the root span becomes a child of the caller
        parentContext = trace.setSpanContext(context.active(), extracted);
      }
    }

    const clientApp = ctx.clientApp ?? detectClientApp(ctx.userAgent);

    const rootSpan = tracer.startSpan(
      "proxy.request",
      {
        attributes: {
          "proxy.request_id": ctx.requestId,
          "http.method": ctx.method,
          "http.target": ctx.path,
          "gen_ai.request.model": ctx.model,
          "proxy.stream": ctx.stream,
          "proxy.tool_count": ctx.toolCount,
          "proxy.client_app": clientApp,
        },
      },
      parentContext,
    );

    if (ctx.sessionId) {
      rootSpan.setAttribute("session.id", ctx.sessionId);
    }
    if (ctx.userAgent) {
      rootSpan.setAttribute("http.user_agent", ctx.userAgent);
    }

    // Read x-neurolink-* context headers from calling SDK (e.g., Curator)
    const nlSessionId = incomingHeaders?.["x-neurolink-session-id"];
    const nlUserId = incomingHeaders?.["x-neurolink-user-id"];
    const nlConversationId = incomingHeaders?.["x-neurolink-conversation-id"];

    if (nlSessionId) {
      rootSpan.setAttribute("neurolink.session_id", nlSessionId);
    }
    if (nlUserId) {
      rootSpan.setAttribute("neurolink.user_id", nlUserId);
    }
    if (nlConversationId) {
      rootSpan.setAttribute("neurolink.conversation_id", nlConversationId);
    }

    const instance = new ProxyTracer(
      rootSpan,
      ctx.requestId,
      ctx.model,
      ctx.stream,
    );

    // Set Langfuse context (fire-and-forget — non-blocking)
    // Prefer NeuroLink session/user from calling SDK over Claude Code session
    setLangfuseContext({
      sessionId: nlSessionId ?? ctx.sessionId,
      userId: nlUserId,
      conversationId: nlConversationId,
      requestId: ctx.requestId,
      traceName: `proxy:${ctx.model}`,
      operationName: "proxy.request",
      metadata: {
        clientApp,
        stream: ctx.stream,
        toolCount: ctx.toolCount,
      },
    }).catch((err) => {
      logger.debug(`${LOG_PREFIX} Failed to set Langfuse context`, {
        error: err instanceof Error ? err.message : String(err),
      });
    });

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
      trace.setSpan(context.active(), this.rootSpan),
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
      trace.setSpan(context.active(), this.rootSpan),
    );
  }

  /** Span covering a single upstream attempt. One per retry. */
  startUpstreamAttempt(ctx: UpstreamAttemptContext): Span {
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
      trace.setSpan(context.active(), this.rootSpan),
    );
  }

  /** Span covering the SSE stream relay phase. */
  startStream(): Span {
    return this.proxyTracer.startSpan(
      "proxy.stream",
      {
        attributes: {
          "proxy.request_id": this.requestId,
          "gen_ai.request.model": this.model,
        },
      },
      trace.setSpan(context.active(), this.rootSpan),
    );
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

    // Update Langfuse context with account as userId
    setLangfuseContext({ userId: ctx.selectedAccount }).catch(() => {
      // Non-fatal
    });
  }

  /** Record token usage and cost on the root span. */
  setUsage(ctx: UsageContext): void {
    this.usage = ctx;

    const totalTokens =
      ctx.inputTokens +
      ctx.outputTokens +
      ctx.cacheCreationTokens +
      ctx.cacheReadTokens +
      (ctx.reasoningTokens ?? 0);

    // NeuroLink-format token attributes (from SpanAttributes)
    this.rootSpan.setAttributes({
      "ai.tokens.input": ctx.inputTokens,
      "ai.tokens.output": ctx.outputTokens,
      "ai.tokens.total": totalTokens,
      "ai.tokens.cache_creation": ctx.cacheCreationTokens,
      "ai.tokens.cache_read": ctx.cacheReadTokens,
    });

    if (ctx.reasoningTokens !== undefined) {
      this.rootSpan.setAttribute("ai.tokens.reasoning", ctx.reasoningTokens);
    }

    // GenAI semantic convention attributes (for Langfuse compatibility)
    this.rootSpan.setAttributes({
      "gen_ai.usage.input_tokens": ctx.inputTokens,
      "gen_ai.usage.output_tokens": ctx.outputTokens,
      "gen_ai.usage.total_tokens": totalTokens,
    });

    // Cost calculation via pricing.ts
    const cost = calculateCost("anthropic", this.model, {
      input: ctx.inputTokens,
      output: ctx.outputTokens,
      total: totalTokens,
      cacheCreationTokens: ctx.cacheCreationTokens,
      cacheReadTokens: ctx.cacheReadTokens,
    });

    if (cost > 0) {
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

  /** Record an error on the root span. */
  setError(errorType: string, errorMessage: string): void {
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
  setModelSubstitution(requestedModel: string, actualModel: string): void {
    this.rootSpan.setAttributes({
      "proxy.model_substituted": true,
      "proxy.original_model": requestedModel,
      "proxy.actual_model": actualModel,
      "gen_ai.response.model": actualModel,
    });
    const m = getProxyMetrics();
    m.modelSubstitutionTotal.add(1, {
      requested_model: requestedModel,
      actual_model: actualModel,
    });
  }

  // -------------------------------------------------------------------------
  // Log payloads as span events
  // -------------------------------------------------------------------------

  /** Log the incoming client request body (redacted). */
  logRequestBody(body: string): void {
    if (!BODY_LOGGING_ENABLED) {
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
    if (!BODY_LOGGING_ENABLED) {
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
    if (!BODY_LOGGING_ENABLED) {
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
    if (!BODY_LOGGING_ENABLED) {
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
  getTraceContext(): { traceId: string; spanId: string } {
    const spanCtx = this.rootSpan.spanContext();
    return {
      traceId: spanCtx.traceId,
      spanId: spanCtx.spanId,
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

    this.rootSpan.end();

    // ---- Emit OTEL metrics (lazy-init instruments) ----
    const m = getProxyMetrics();
    const labels = {
      model: this.model,
      account: this.accountEmail ?? "unknown",
      status: String(responseStatus),
      stream: String(this.isStream),
      mode: this.mode,
    };

    m.requestsTotal.add(1, labels);
    m.requestDuration.record(durationMs, labels);

    // Token metrics (only if usage was captured)
    if (this.usage) {
      const tokenLabels = {
        model: this.model,
        account: this.accountEmail ?? "unknown",
      };

      m.tokensInput.add(this.usage.inputTokens, tokenLabels);
      m.tokensOutput.add(this.usage.outputTokens, tokenLabels);
      m.tokensCacheRead.add(this.usage.cacheReadTokens, tokenLabels);
      m.tokensCacheCreation.add(this.usage.cacheCreationTokens, tokenLabels);

      if (this.usage.reasoningTokens) {
        m.tokensReasoning.add(this.usage.reasoningTokens, tokenLabels);
      }

      // Cost
      const totalTokens =
        this.usage.inputTokens +
        this.usage.outputTokens +
        this.usage.cacheCreationTokens +
        this.usage.cacheReadTokens +
        (this.usage.reasoningTokens ?? 0);

      const cost = calculateCost("anthropic", this.model, {
        input: this.usage.inputTokens,
        output: this.usage.outputTokens,
        total: totalTokens,
        cacheCreationTokens: this.usage.cacheCreationTokens,
        cacheReadTokens: this.usage.cacheReadTokens,
      });

      if (cost > 0) {
        m.costTotal.add(cost, tokenLabels);
      }
    }

    // Error metrics
    if (responseStatus >= 400) {
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

  /** Record metrics via TelemetryService (call after setUsage). */
  recordMetrics(): void {
    if (!this.usage) {
      return;
    }

    const totalTokens =
      this.usage.inputTokens +
      this.usage.outputTokens +
      this.usage.cacheCreationTokens +
      this.usage.cacheReadTokens +
      (this.usage.reasoningTokens ?? 0);

    const durationMs = Date.now() - this.startTime;

    const cost = calculateCost("anthropic", this.model, {
      input: this.usage.inputTokens,
      output: this.usage.outputTokens,
      total: totalTokens,
      cacheCreationTokens: this.usage.cacheCreationTokens,
      cacheReadTokens: this.usage.cacheReadTokens,
    });

    TelemetryService.getInstance().recordAIRequest(
      "anthropic",
      this.model,
      totalTokens,
      durationMs,
      cost > 0 ? cost : undefined,
    );
  }

  // -------------------------------------------------------------------------
  // Context propagation
  // -------------------------------------------------------------------------

  /**
   * Get trace context headers for propagation to the upstream Anthropic request.
   * Injects the current trace's `traceparent` / `tracestate` into a new header map.
   */
  getTraceHeaders(): Record<string, string> {
    return this.bridge.injectContext(
      {},
      trace.setSpan(context.active(), this.rootSpan),
    );
  }
}

export { ProxyTracer };
export type {
  ProxyRequestContext,
  AccountSelectionContext,
  UpstreamAttemptContext,
  UsageContext,
};
