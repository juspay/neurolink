import {
  context,
  metrics,
  trace,
  type Meter,
  type Tracer,
  type Counter,
  type Histogram,
} from "@opentelemetry/api";
import {
  BasicTracerProvider,
  BatchSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { logger } from "../utils/logger.js";

export type HealthMetrics = {
  timestamp: number;
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
  activeConnections: number;
  errorRate: number;
  averageResponseTime: number;
};

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

  private constructor() {
    // Check if telemetry is enabled
    this.enabled = this.isTelemetryEnabled();

    if (this.enabled) {
      this.initializeTelemetry();
    } else {
      logger.debug(
        "[Telemetry] Disabled - set NEUROLINK_TELEMETRY_ENABLED=true or configure OTEL_EXPORTER_OTLP_ENDPOINT to enable",
      );
    }
  }

  static getInstance(): TelemetryService {
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
        _delegate?: { constructor?: { name?: string } };
      } | null;

      if (!provider) {
        return false;
      }

      const delegateName = provider._delegate?.constructor?.name || "";
      if (delegateName && delegateName !== "NoopTracerProvider") {
        return true;
      }

      const providerName = provider.constructor?.name || "";
      return (
        providerName !== "ProxyTracerProvider" &&
        providerName !== "NoopTracerProvider"
      );
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

  private initializeTelemetry(): void {
    try {
      if (this.hasExternalTracerProvider()) {
        this.adoptExternalTracerProvider(
          "global tracer provider already registered",
        );
        return;
      }

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
        return;
      }

      logger.error("[Telemetry] Failed to initialize:", error);
      this.enabled = false;
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

  async initialize(): Promise<void> {
    if (!this.enabled) {
      return;
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

    if (!this.enabled || !this.aiRequestCounter) {
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

    if (!this.enabled || !this.aiProviderErrors) {
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
    if (!this.enabled || !this.mcpToolCalls) {
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

    if (!this.enabled || !this.connectionCounter) {
      return;
    }

    this.connectionCounter.add(1, { connection_type: type });
  }

  recordConnectionClosed(type: "websocket" | "sse" | "http"): void {
    // Track runtime metrics
    this.activeConnectionCount = Math.max(0, this.activeConnectionCount - 1);

    if (!this.enabled || !this.connectionCounter) {
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

    if (!this.enabled || !this.responseTimeHistogram) {
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
    if (!this.enabled || !this.meter) {
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
    if (!this.enabled || !this.meter) {
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
