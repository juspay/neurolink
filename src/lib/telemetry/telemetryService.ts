import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  metrics,
  trace,
  type Meter,
  type Tracer,
  type Counter,
  type Histogram,
} from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
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
  private sdk?: NodeSDK;
  private enabled: boolean = false;
  private initialized: boolean = false;
  private meter?: Meter;
  private tracer?: Tracer;

  // Optional Metrics (only created when enabled)
  private aiRequestCounter?: Counter;
  private aiRequestDuration?: Histogram;
  private aiTokensUsed?: Counter;
  private aiProviderErrors?: Counter;
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
      process.env.NEUROLINK_TELEMETRY_ENABLED === "true" ||
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT !== undefined
    );
  }

  private initializeTelemetry(): void {
    try {
      const resource = resourceFromAttributes({
        [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || "neurolink-ai",
        [ATTR_SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION || "3.0.1",
      });

      this.sdk = new NodeSDK({
        resource,
        // Note: Metric reader configured separately
        instrumentations: [getNodeAutoInstrumentations()],
      });

      this.meter = metrics.getMeter("neurolink-ai");
      this.tracer = trace.getTracer("neurolink-ai");

      this.initializeMetrics();

      logger.debug(
        "[Telemetry] Initialized with endpoint:",
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      );
    } catch (error) {
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

    try {
      await this.sdk?.start();
      this.initialized = true;
      logger.debug("[Telemetry] SDK started successfully");
    } catch (error) {
      logger.error("[Telemetry] Failed to start SDK:", error);
      this.enabled = false;
      this.initialized = false;
    }
  }

  // AI Operation Tracing (NO-OP when disabled)
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
    if (this.enabled && this.sdk) {
      try {
        await this.sdk.shutdown();
        this.initialized = false;
        logger.debug("[Telemetry] SDK shutdown completed");
      } catch (error) {
        logger.error("[Telemetry] Error during shutdown:", error);
      }
    }
  }
}
