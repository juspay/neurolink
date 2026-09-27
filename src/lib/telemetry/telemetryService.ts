import {
  context,
  metrics,
  trace,
  type Meter,
  type Tracer,
  type Counter,
  type Histogram,
} from "@opentelemetry/api";
// The heavy OTel SDK packages below (sdk-trace-base, the OTLP trace
// exporter, resources, semantic-conventions) are loaded with `await
// import(...)` inside initializeTelemetry(), so requiring this module
// doesn't pull them in for processes that never enable telemetry. Only the
// type used in a field annotation is imported here, statically — it is
// erased at build time and never triggers the runtime import; the actual
// class comes from the dynamic import's own namespace.
import type { BasicTracerProvider } from "@opentelemetry/sdk-trace-base";
import { logger } from "../utils/logger.js";
import type { HealthMetrics } from "../types/index.js";

export class TelemetryService {
  private static instance: TelemetryService;
  private tracerProvider?: BasicTracerProvider;
  private enabled: boolean = false;
  private initialized: boolean = false;
  private usingExternalTracerProvider: boolean = false;
  private meter?: Meter;
  private tracer?: Tracer;

  // Optional Metrics (only created when enabled)
  private aiRequestCounter?: Counter;
  private aiRequestDuration?: Histogram;
  private aiTokensUsed?: Counter;
  private aiProviderErrors?: Counter;
  private aiCostUsd?: Counter;
  private mcpToolCalls?: Counter;
  private connectionCounter?: Counter;
  private responseTimeHistogram?: Histogram;

  // Runtime metrics tracking
  private activeConnectionCount: number = 0;
  private errorCount: number = 0;
  private requestCount: number = 0;
  private totalResponseTime: number = 0;
  private responseTimeCount: number = 0;

  // Async-init readiness + buffering. Instruments above are constructed by
  // an async initializeTelemetry() that the constructor fires but does not
  // await (see getInstance()'s comment). A recording call can therefore
  // legitimately arrive while telemetry is enabled but the instruments
  // don't exist yet — that is NOT the same as telemetry being disabled, so
  // it must not be dropped silently. `pendingCalls` buffers the OTEL side
  // effect of such a call (never the whole method — see each recordX
  // method's emitX split) until `markReady()` drains it. The cap and
  // rate-limited warning below exist only for a pathological case (init
  // that never resolves); the common case drains within milliseconds.
  private static readonly MAX_PENDING_CALLS = 200;
  private pendingCalls: Array<() => void> = [];
  private isReady = false;
  private droppedPendingCallWarned = false;
  /** The in-flight (or already-settled) async init. Never rejects — see
   * initializeTelemetry()'s catch block, which always resolves normally.
   * `initialize()`/`shutdown()` await it so they don't race construction. */
  private readyPromise?: Promise<void>;

  private constructor() {
    // Check if telemetry is enabled
    this.enabled = this.isTelemetryEnabled();

    if (this.enabled) {
      // initializeTelemetry() is async — it dynamically imports the OTel
      // SDK packages and constructs the tracer/meter/instruments — but it
      // is fired here WITHOUT an await. The constructor itself must stay
      // fully synchronous and non-yielding, because getInstance() below is
      // a plain, synchronous check-then-assign with no await in between.
      // That is only race-free as long as nothing here yields control back
      // to the event loop before `TelemetryService.instance` is assigned.
      // Awaiting anything in the constructor (or making getInstance()
      // async) would let two concurrent getInstance() callers both observe
      // "not yet assigned" and each construct their own instance — the
      // exact double-construction race that
      // observability/instrumentation.ts's initializeOpenTelemetry() already
      // hit and had to fix with a shared in-flight promise (see the
      // "Initialize OpenTelemetry once and let concurrent callers share the
      // work" comment there). Do not reintroduce it here.
      this.readyPromise = this.initializeTelemetry();
    } else {
      logger.debug(
        "[Telemetry] Disabled - set NEUROLINK_TELEMETRY_ENABLED=true or configure OTEL_EXPORTER_OTLP_ENDPOINT to enable",
      );
    }
  }

  static getInstance(): TelemetryService {
    // Synchronous check-then-assign — see the constructor's comment above
    // for why this must never gain an await before the assignment.
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
    }
    return TelemetryService.instance;
  }

  private isTelemetryEnabled(): boolean {
    return (
      this.hasExternalTracerProvider() ||
      process.env.NEUROLINK_TELEMETRY_ENABLED === "true" ||
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT !== undefined
    );
  }

  private hasExternalTracerProvider(): boolean {
    try {
      const provider = trace.getTracerProvider() as {
        constructor?: { name?: string };
        getDelegate?: () => { constructor?: { name?: string } } | null;
        _delegate?: { constructor?: { name?: string } };
      } | null;

      if (!provider) {
        return false;
      }

      const providerName = provider.constructor?.name || "";
      if (
        providerName &&
        providerName !== "ProxyTracerProvider" &&
        providerName !== "NoopTracerProvider"
      ) {
        return true;
      }

      const delegate =
        typeof provider.getDelegate === "function"
          ? provider.getDelegate()
          : provider._delegate;
      const delegateName = delegate?.constructor?.name || "";
      return Boolean(delegateName && delegateName !== "NoopTracerProvider");
    } catch (error) {
      logger.warn("[Telemetry] Failed checking for external TracerProvider", {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  private adoptExternalTracerProvider(reason: string): void {
    this.usingExternalTracerProvider = true;
    this.tracerProvider = undefined;
    this.meter = metrics.getMeter("neurolink-ai");
    this.tracer = trace.getTracer("neurolink-ai");
    this.initializeMetrics();

    logger.debug("[Telemetry] Reusing externally managed TracerProvider", {
      reason,
      endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    });
  }

  private async initializeTelemetry(): Promise<void> {
    try {
      if (this.hasExternalTracerProvider()) {
        this.adoptExternalTracerProvider(
          "global tracer provider already registered",
        );
        this.markReady();
        return;
      }

      const [
        { BasicTracerProvider, BatchSpanProcessor },
        { OTLPTraceExporter },
        { resourceFromAttributes },
        { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION },
      ] = await Promise.all([
        import("@opentelemetry/sdk-trace-base"),
        import("@opentelemetry/exporter-trace-otlp-http"),
        import("@opentelemetry/resources"),
        import("@opentelemetry/semantic-conventions"),
      ]);

      const resource = resourceFromAttributes({
        [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || "neurolink-ai",
        [ATTR_SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION || "3.0.1",
      });

      const exporter = new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT
          ? `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`
          : undefined,
      });

      this.tracerProvider = new BasicTracerProvider({
        resource,
        spanProcessors: [new BatchSpanProcessor(exporter)],
      });
      this.meter = metrics.getMeter("neurolink-ai");
      this.tracer = this.tracerProvider.getTracer("neurolink-ai");

      this.initializeMetrics();
      this.markReady();

      logger.debug("[Telemetry] Initialized local telemetry exporter", {
        endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
        globalTracerProviderOwnedBy: "observability/instrumentation",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isDuplicateRegistration =
        errorMessage.includes("duplicate registration") ||
        errorMessage.includes("already registered") ||
        errorMessage.includes("already set");

      if (isDuplicateRegistration && this.hasExternalTracerProvider()) {
        this.adoptExternalTracerProvider(
          "duplicate global tracer registration detected",
        );
        this.markReady();
        return;
      }

      logger.error("[Telemetry] Failed to initialize:", error);
      this.enabled = false;
      // No instruments exist and none ever will for this instance — there
      // is nothing left to drain a buffered call against, so the buffer is
      // cleared rather than drained. Every recording method's `!this.enabled`
      // guard now makes it a no-op anyway.
      this.discardPendingCalls();
    }
  }

  private initializeMetrics(): void {
    if (!this.enabled || !this.meter) {
      return;
    }

    this.aiRequestCounter = this.meter.createCounter("ai_requests_total", {
      description: "Total number of AI requests",
    });

    this.aiRequestDuration = this.meter.createHistogram(
      "ai_request_duration_ms",
      {
        description: "AI request duration in milliseconds",
      },
    );

    this.aiTokensUsed = this.meter.createCounter("ai_tokens_used_total", {
      description: "Total number of AI tokens used",
    });

    this.aiCostUsd = this.meter.createCounter("ai_cost_usd_total", {
      description: "Total accumulated AI cost in USD",
    });

    this.aiProviderErrors = this.meter.createCounter(
      "ai_provider_errors_total",
      {
        description: "Total number of AI provider errors",
      },
    );

    this.mcpToolCalls = this.meter.createCounter("mcp_tool_calls_total", {
      description: "Total number of MCP tool calls",
    });

    this.connectionCounter = this.meter.createCounter("connections_total", {
      description: "Total number of connections",
    });

    this.responseTimeHistogram = this.meter.createHistogram(
      "response_time_ms",
      {
        description: "Response time in milliseconds",
      },
    );
  }

  // ============================================================
  // Pending-call buffer (see the field comment above pendingCalls)
  // ============================================================

  private bufferPendingCall(call: () => void): void {
    if (this.pendingCalls.length >= TelemetryService.MAX_PENDING_CALLS) {
      // Drop the oldest, not the newest — recent calls are more likely to
      // still matter to whoever is about to read a dashboard.
      this.pendingCalls.shift();
      if (!this.droppedPendingCallWarned) {
        this.droppedPendingCallWarned = true;
        logger.warn(
          `[Telemetry] Pending metric buffer exceeded ${TelemetryService.MAX_PENDING_CALLS} entries — dropping the oldest buffered call(s). Logged once, not per drop: telemetry initialization may be unusually slow or stalled.`,
        );
      }
    }
    this.pendingCalls.push(call);
  }

  /** Instruments now exist — drain anything buffered while we waited, in
   * order, then flip fully sync for every call after this one. */
  private markReady(): void {
    this.isReady = true;
    if (this.pendingCalls.length === 0) {
      return;
    }
    const buffered = this.pendingCalls;
    this.pendingCalls = [];
    for (const call of buffered) {
      try {
        call();
      } catch (error) {
        logger.warn(
          "[Telemetry] A buffered metric call failed during drain:",
          error,
        );
      }
    }
  }

  private discardPendingCalls(): void {
    this.pendingCalls = [];
  }

  async initialize(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    // The tracer/meter/instruments are constructed asynchronously (see the
    // constructor's comment). Wait for that to settle before inspecting
    // usingExternalTracerProvider/tracerProvider below, so this method's
    // behavior doesn't depend on how many event-loop ticks have passed
    // since getInstance() was called — without this, a caller invoking
    // initialize() right after getInstance() would almost always observe
    // `!this.tracerProvider` and return early, silently skipping the
    // AsyncLocalStorageContextManager registration below.
    if (this.readyPromise) {
      await this.readyPromise;
    }

    if (this.usingExternalTracerProvider) {
      this.initialized = true;
      logger.debug(
        "[Telemetry] External TracerProvider already initialized by host",
      );
      return;
    }

    if (!this.tracerProvider) {
      this.initialized = true;
      logger.debug(
        "[Telemetry] Tracer provider already prepared during constructor",
      );
      return;
    }

    try {
      // Register AsyncLocalStorage context manager for proper parent-child
      // span relationships across async boundaries (required for startActiveSpan)
      try {
        const { AsyncLocalStorageContextManager } =
          await import("@opentelemetry/context-async-hooks");
        context.setGlobalContextManager(
          new AsyncLocalStorageContextManager().enable(),
        );
      } catch {
        // context-async-hooks not installed — context propagation
        // will use the default (noop) manager
      }

      this.initialized = true;
      logger.debug("[Telemetry] Tracer provider started successfully");
    } catch (error) {
      logger.error("[Telemetry] Failed to start:", error);
      this.enabled = false;
      this.initialized = false;
    }
  }

  // AI Operation Tracing (NO-OP when disabled)
  /**
   * @deprecated Vercel AI SDK's experimental_telemetry creates ai.generateText/ai.streamText
   * spans automatically via OpenTelemetry. Using this method would create duplicate spans.
   * Kept for potential future use with non-Vercel providers (e.g., Amazon Bedrock).
   * See: TelemetryHandler.getTelemetryConfig() for the active telemetry path.
   */
  async traceAIRequest<T>(
    provider: string,
    operation: () => Promise<T>,
    operationType: string = "generate_text",
  ): Promise<T> {
    if (!this.enabled || !this.tracer) {
      return await operation();
    }

    const span = this.tracer.startSpan(`ai.${provider}.${operationType}`, {
      attributes: {
        "ai.provider": provider,
        "ai.operation": operationType,
      },
    });

    try {
      const result = await operation();
      span.setStatus({ code: 1 }); // OK
      return result;
    } catch (error) {
      span.setStatus({
        code: 2,
        message: error instanceof Error ? error.message : "Unknown error",
      }); // ERROR
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  // Metrics Recording (NO-OP when disabled)
  recordAIRequest(
    provider: string,
    model: string,
    tokens: number,
    duration: number,
    cost?: number,
  ): void {
    // Track runtime metrics
    this.requestCount++;
    this.totalResponseTime += duration;
    this.responseTimeCount++;

    if (!this.enabled) {
      return;
    }

    if (!this.isReady) {
      // Instruments aren't constructed yet — buffer the OTEL side effect
      // only (emitAIRequest), never this whole method: the runtime
      // counters above must fire exactly once per call, not again when the
      // buffer drains.
      this.bufferPendingCall(() =>
        this.emitAIRequest(provider, model, tokens, duration, cost),
      );
      return;
    }

    this.emitAIRequest(provider, model, tokens, duration, cost);
  }

  private emitAIRequest(
    provider: string,
    model: string,
    tokens: number,
    duration: number,
    cost?: number,
  ): void {
    if (!this.aiRequestCounter) {
      return;
    }

    const labels = { provider, model };

    this.aiRequestCounter.add(1, labels);
    this.aiRequestDuration?.record(duration, labels);
    this.aiTokensUsed?.add(tokens, labels);

    if (cost !== undefined && Number.isFinite(cost) && cost > 0) {
      this.aiCostUsd?.add(cost, labels);
    }
  }

  recordAIError(provider: string, error: Error): void {
    // Track runtime metrics
    this.errorCount++;

    if (!this.enabled) {
      return;
    }

    if (!this.isReady) {
      this.bufferPendingCall(() => this.emitAIError(provider, error));
      return;
    }

    this.emitAIError(provider, error);
  }

  private emitAIError(provider: string, error: Error): void {
    if (!this.aiProviderErrors) {
      return;
    }

    this.aiProviderErrors.add(1, {
      provider,
      error: error.name,
      message: error.message.substring(0, 100), // Limit message length
    });
  }

  recordMCPToolCall(
    toolName: string,
    duration: number,
    success: boolean,
  ): void {
    if (!this.enabled) {
      return;
    }

    if (!this.isReady) {
      this.bufferPendingCall(() =>
        this.emitMCPToolCall(toolName, duration, success),
      );
      return;
    }

    this.emitMCPToolCall(toolName, duration, success);
  }

  private emitMCPToolCall(
    toolName: string,
    duration: number,
    success: boolean,
  ): void {
    if (!this.mcpToolCalls) {
      return;
    }

    this.mcpToolCalls.add(1, {
      tool: toolName,
      success: success.toString(),
      duration_bucket: this.getDurationBucket(duration),
    });
  }

  recordConnection(type: "websocket" | "sse" | "http"): void {
    // Track runtime metrics
    this.activeConnectionCount++;

    if (!this.enabled) {
      return;
    }

    if (!this.isReady) {
      this.bufferPendingCall(() => this.emitConnection(type));
      return;
    }

    this.emitConnection(type);
  }

  private emitConnection(type: "websocket" | "sse" | "http"): void {
    if (!this.connectionCounter) {
      return;
    }

    this.connectionCounter.add(1, { connection_type: type });
  }

  recordConnectionClosed(type: "websocket" | "sse" | "http"): void {
    // Track runtime metrics
    this.activeConnectionCount = Math.max(0, this.activeConnectionCount - 1);

    if (!this.enabled) {
      return;
    }

    if (!this.isReady) {
      this.bufferPendingCall(() => this.emitConnectionClosed(type));
      return;
    }

    this.emitConnectionClosed(type);
  }

  private emitConnectionClosed(type: "websocket" | "sse" | "http"): void {
    if (!this.connectionCounter) {
      return;
    }

    // Optionally record disconnection metrics if needed
    this.connectionCounter.add(-1, {
      connection_type: type,
      event: "disconnect",
    });
  }

  recordResponseTime(endpoint: string, method: string, duration: number): void {
    // Track runtime metrics
    this.totalResponseTime += duration;
    this.responseTimeCount++;

    if (!this.enabled) {
      return;
    }

    if (!this.isReady) {
      this.bufferPendingCall(() =>
        this.emitResponseTime(endpoint, method, duration),
      );
      return;
    }

    this.emitResponseTime(endpoint, method, duration);
  }

  private emitResponseTime(
    endpoint: string,
    method: string,
    duration: number,
  ): void {
    if (!this.responseTimeHistogram) {
      return;
    }

    this.responseTimeHistogram.record(duration, {
      endpoint,
      method,
      status_bucket: this.getStatusBucket(duration),
    });
  }

  // Custom Metrics
  recordCustomMetric(
    name: string,
    value: number,
    labels?: Record<string, string>,
  ): void {
    if (!this.enabled) {
      return;
    }

    if (!this.isReady) {
      this.bufferPendingCall(() => this.emitCustomMetric(name, value, labels));
      return;
    }

    this.emitCustomMetric(name, value, labels);
  }

  private emitCustomMetric(
    name: string,
    value: number,
    labels?: Record<string, string>,
  ): void {
    if (!this.meter) {
      return;
    }

    const counter = this.meter.createCounter(`custom_${name}`, {
      description: `Custom metric: ${name}`,
    });

    counter.add(value, labels || {});
  }

  recordCustomHistogram(
    name: string,
    value: number,
    labels?: Record<string, string>,
  ): void {
    if (!this.enabled) {
      return;
    }

    if (!this.isReady) {
      this.bufferPendingCall(() =>
        this.emitCustomHistogram(name, value, labels),
      );
      return;
    }

    this.emitCustomHistogram(name, value, labels);
  }

  private emitCustomHistogram(
    name: string,
    value: number,
    labels?: Record<string, string>,
  ): void {
    if (!this.meter) {
      return;
    }

    const histogram = this.meter.createHistogram(`custom_${name}_histogram`, {
      description: `Custom histogram: ${name}`,
    });

    histogram.record(value, labels || {});
  }

  // Health Checks
  async getHealthMetrics(): Promise<HealthMetrics> {
    const memoryUsage = process.memoryUsage();

    // Calculate error rate as percentage of errors vs total requests
    const errorRate =
      this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;

    // Calculate average response time
    const averageResponseTime =
      this.responseTimeCount > 0
        ? this.totalResponseTime / this.responseTimeCount
        : 0;

    return {
      timestamp: Date.now(),
      memoryUsage,
      uptime: process.uptime(),
      activeConnections: this.activeConnectionCount,
      errorRate: Math.round(errorRate * 100) / 100, // Round to 2 decimal places
      averageResponseTime: Math.round(averageResponseTime * 100) / 100, // Round to 2 decimal places
    };
  }

  // Telemetry Status
  isEnabled(): boolean {
    return this.enabled;
  }

  getStatus(): {
    enabled: boolean;
    initialized: boolean;
    endpoint?: string;
    service?: string;
    version?: string;
  } {
    return {
      enabled: this.enabled,
      initialized: this.initialized,
      endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      service: process.env.OTEL_SERVICE_NAME || "neurolink-ai",
      version: process.env.OTEL_SERVICE_VERSION || "3.0.1",
    };
  }

  // Helper methods
  private getDurationBucket(duration: number): string {
    if (duration < 100) {
      return "fast";
    }
    if (duration < 500) {
      return "medium";
    }
    if (duration < 1000) {
      return "slow";
    }
    return "very_slow";
  }

  private getStatusBucket(duration: number): string {
    if (duration < 200) {
      return "excellent";
    }
    if (duration < 500) {
      return "good";
    }
    if (duration < 1000) {
      return "acceptable";
    }
    return "poor";
  }

  // Cleanup
  async shutdown(): Promise<void> {
    // See initialize()'s comment: wait for the async instrument
    // construction to settle before deciding whether there is a
    // tracerProvider to shut down. Without this, a shutdown() called
    // immediately after getInstance() would see no tracerProvider yet and
    // no-op, while construction — which is already in flight — finishes
    // moments later and leaves a live exporter (with its background flush
    // timers) behind with nothing left to ever shut it down.
    if (this.readyPromise) {
      await this.readyPromise;
    }

    if (
      this.enabled &&
      this.tracerProvider &&
      !this.usingExternalTracerProvider
    ) {
      try {
        await this.tracerProvider.shutdown();
        this.initialized = false;
        logger.debug("[Telemetry] Tracer provider shutdown completed");
      } catch (error) {
        logger.error("[Telemetry] Error during shutdown:", error);
      }
    }
  }
}
