import {
  createNoopMeter,
  metrics,
  type Meter,
  type MeterProvider,
} from "@opentelemetry/api";
import type {
  AiMetricInstruments,
  MetricConnectionType,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import { startTelemetry } from "./telemetryStarter.js";

const METER_NAME = "neurolink-ai";

let boundProvider: MeterProvider | undefined;
let instruments: AiMetricInstruments | undefined;

// The API hands out its shared no-op meter until some MeterProvider, the
// host's or NeuroLink's own, is registered.
function isMetricsEnabled(meter: Meter): boolean {
  return (
    process.env.NEUROLINK_TELEMETRY_ENABLED === "true" ||
    Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT) ||
    meter !== createNoopMeter()
  );
}

function createInstruments(meter: Meter): AiMetricInstruments {
  return {
    meter,
    requests: meter.createCounter("ai_requests_total", {
      description: "Total number of AI requests",
    }),
    duration: meter.createHistogram("ai_request_duration_ms", {
      description: "AI request duration in milliseconds",
    }),
    tokens: meter.createCounter("ai_tokens_used_total", {
      description: "Total number of AI tokens used",
    }),
    cost: meter.createCounter("ai_cost_usd_total", {
      description: "Total accumulated AI cost in USD",
    }),
    providerErrors: meter.createCounter("ai_provider_errors_total", {
      description: "Total number of AI provider errors",
    }),
    mcpToolCalls: meter.createCounter("mcp_tool_calls_total", {
      description: "Total number of MCP tool calls",
    }),
    connections: meter.createCounter("connections_total", {
      description: "Total number of connections",
    }),
    responseTime: meter.createHistogram("response_time_ms", {
      description: "Response time in milliseconds",
    }),
    custom: new Map(),
  };
}

/**
 * The API hands out a no-op meter until a MeterProvider is registered and
 * never upgrades it, so instruments are bound to the provider that was
 * registered when they were created and rebuilt when it changes.
 */
function currentInstruments(): AiMetricInstruments {
  const provider = metrics.getMeterProvider();
  if (!instruments || provider !== boundProvider) {
    boundProvider = provider;
    instruments = createInstruments(provider.getMeter(METER_NAME));
  }
  return instruments;
}

/**
 * Metrics must never break the call they describe, and are recorded only when
 * a collector, a registered MeterProvider or `NEUROLINK_TELEMETRY_ENABLED=true`
 * asks for them.
 */
function record(write: (current: AiMetricInstruments) => void): void {
  try {
    startTelemetry();
    const current = currentInstruments();
    if (isMetricsEnabled(current.meter)) {
      write(current);
    }
  } catch (error) {
    logger.debug("[Telemetry] Recording a metric failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function durationBucket(durationMs: number): string {
  if (durationMs < 100) {
    return "fast";
  }
  if (durationMs < 500) {
    return "medium";
  }
  if (durationMs < 1000) {
    return "slow";
  }
  return "very_slow";
}

function statusBucket(durationMs: number): string {
  if (durationMs < 200) {
    return "excellent";
  }
  if (durationMs < 500) {
    return "good";
  }
  if (durationMs < 1000) {
    return "acceptable";
  }
  return "poor";
}

/**
 * @description Counts one AI request with its duration, tokens and, when known, cost, labelled by provider and model.
 * @param provider {string} - Provider that served the request.
 * @param model {string} - Model that served the request.
 * @param tokens {number} - Total tokens used.
 * @param durationMs {number} - Request duration in milliseconds.
 * @param cost {number | undefined} - Cost in USD; omitted or non-positive values add nothing to the cost counter.
 * @returns {void} Nothing.
 */
export function recordAIRequest(
  provider: string,
  model: string,
  tokens: number,
  durationMs: number,
  cost?: number,
): void {
  record((current) => {
    const labels = { provider, model };
    current.requests.add(1, labels);
    current.duration.record(durationMs, labels);
    current.tokens.add(tokens, labels);
    if (cost !== undefined && Number.isFinite(cost) && cost > 0) {
      current.cost.add(cost, labels);
    }
  });
}

/**
 * The `message` label from a bounded set: the HTTP status the error carries,
 * never its text, which is unbounded cardinality and can carry a credential.
 */
function errorMessageLabel(error: Error): string {
  const status: unknown =
    Reflect.get(error, "status") ?? Reflect.get(error, "statusCode");
  return typeof status === "number" &&
    Number.isInteger(status) &&
    status >= 100 &&
    status <= 599
    ? `HTTP ${status}`
    : "unspecified";
}

/**
 * @description Counts one AI provider error, labelled by provider, error name and a bounded `message`: the HTTP status the error carries (`HTTP 429`), or `unspecified`, never the message text.
 * @param provider {string} - Provider that failed.
 * @param error {Error} - The failure.
 * @returns {void} Nothing.
 */
export function recordAIError(provider: string, error: Error): void {
  record((current) => {
    current.providerErrors.add(1, {
      provider,
      error: error.name,
      message: errorMessageLabel(error),
    });
  });
}

/**
 * @description Counts one MCP tool call, labelled by tool, outcome and a duration bucket (`fast`, `medium`, `slow`, `very_slow`).
 * @param toolName {string} - Name of the tool.
 * @param durationMs {number} - Call duration in milliseconds.
 * @param success {boolean} - `false` for a thrown error and for a resolved MCP error result.
 * @returns {void} Nothing.
 */
export function recordMCPToolCall(
  toolName: string,
  durationMs: number,
  success: boolean,
): void {
  record((current) => {
    current.mcpToolCalls.add(1, {
      tool: toolName,
      success: success.toString(),
      duration_bucket: durationBucket(durationMs),
    });
  });
}

/**
 * @description Counts one opened connection, labelled by its type.
 * @param type {MetricConnectionType} - `websocket`, `sse` or `http`.
 * @returns {void} Nothing.
 */
export function recordConnection(type: MetricConnectionType): void {
  record((current) => {
    current.connections.add(1, { connection_type: type });
  });
}

/**
 * @description Records one server response time, labelled by endpoint, method and a status bucket (`excellent`, `good`, `acceptable`, `poor`).
 * @param endpoint {string} - Route that answered.
 * @param method {string} - HTTP method.
 * @param durationMs {number} - Response time in milliseconds.
 * @returns {void} Nothing.
 */
export function recordResponseTime(
  endpoint: string,
  method: string,
  durationMs: number,
): void {
  record((current) => {
    current.responseTime.record(durationMs, {
      endpoint,
      method,
      status_bucket: statusBucket(durationMs),
    });
  });
}

/**
 * @description Adds to a counter named `custom_<name>`, created on first use.
 * @param name {string} - Metric name without the `custom_` prefix.
 * @param value {number} - Amount to add.
 * @param labels {Record<string, string> | undefined} - Series labels.
 * @returns {void} Nothing.
 */
export function recordCustomMetric(
  name: string,
  value: number,
  labels?: Record<string, string>,
): void {
  record((current) => {
    const key = `custom_${name}`;
    const existing = current.custom.get(key);
    const counter =
      existing && "add" in existing
        ? existing
        : current.meter.createCounter(key, {
            description: `Custom metric: ${name}`,
          });
    current.custom.set(key, counter);
    counter.add(value, labels ?? {});
  });
}

/**
 * @description Records into a histogram named `custom_<name>_histogram`, created on first use.
 * @param name {string} - Metric name without the `custom_` prefix and `_histogram` suffix.
 * @param value {number} - Value to record.
 * @param labels {Record<string, string> | undefined} - Series labels.
 * @returns {void} Nothing.
 */
export function recordCustomHistogram(
  name: string,
  value: number,
  labels?: Record<string, string>,
): void {
  record((current) => {
    const key = `custom_${name}_histogram`;
    const existing = current.custom.get(key);
    const histogram =
      existing && "record" in existing
        ? existing
        : current.meter.createHistogram(key, {
            description: `Custom histogram: ${name}`,
          });
    current.custom.set(key, histogram);
    histogram.record(value, labels ?? {});
  });
}
