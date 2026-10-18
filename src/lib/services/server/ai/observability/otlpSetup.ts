import { Agent as HttpAgent } from "node:http";
import { Agent as HttpsAgent } from "node:https";
import { metrics } from "@opentelemetry/api";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import type { Resource } from "@opentelemetry/resources";
import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import {
  BatchSpanProcessor,
  type SpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { OTEL_LOG_PREFIX } from "../../../../constants/telemetry.js";
import type { OtlpConnections } from "../../../../types/index.js";
import { logger } from "../../../../utils/logger.js";

// The exporters retry a 429, 502, 503 or 504 after a backoff and hand the retried
// request the time that was left before the backoff, not after it, so a retry
// into a collector that never answers outlives the flush budget by the backoff.
const CUT_AGAIN_MS = 100;

/**
 * @description Tracks the connections the OTLP exporters open, so a flush or shutdown that has run out of its budget can close them instead of leaving a request in flight that holds the process open.
 * @returns {OtlpConnections} The agent factory to give the exporters and the function that closes what they opened.
 */
export function createOtlpConnections(): OtlpConnections {
  const agents = new Set<HttpAgent | HttpsAgent>();
  const destroyAll = (): void => {
    for (const agent of agents) {
      agent.destroy();
    }
  };
  return {
    agentFor: (protocol) => {
      const agent =
        protocol === "https:"
          ? new HttpsAgent({ keepAlive: true })
          : new HttpAgent({ keepAlive: true });
      agents.add(agent);
      return agent;
    },
    cut: () => {
      destroyAll();
      setTimeout(destroyAll, CUT_AGAIN_MS).unref();
    },
  };
}

// The request timeout also bounds how long an exit flush can hold the process
// when the collector cannot be reached; the OTLP timeout variables still win.
function requestTimeout(
  signal: "TRACES" | "METRICS",
  budgetMs: number | undefined,
): number | undefined {
  return process.env.OTEL_EXPORTER_OTLP_TIMEOUT ||
    process.env[`OTEL_EXPORTER_OTLP_${signal}_TIMEOUT`]
    ? undefined
    : budgetMs;
}

/**
 * @description Builds a batching span processor that ships spans to an OTLP/HTTP endpoint.
 * @param endpoint {string} - OTLP base URL; `/v1/traces` is appended.
 * @param budgetMs {number | undefined} - Request timeout in milliseconds, used unless `OTEL_EXPORTER_OTLP_TIMEOUT` or `OTEL_EXPORTER_OTLP_TRACES_TIMEOUT` is set; the exporter's default when omitted.
 * @param connections {OtlpConnections | undefined} - Tracks the connections the exporter opens so they can be closed when a flush runs out of its budget.
 * @returns {SpanProcessor | null} The processor, or `null` (after a warning) when the exporter cannot be created.
 */
export function createOtlpSpanProcessor(
  endpoint: string,
  budgetMs?: number,
  connections?: OtlpConnections,
): SpanProcessor | null {
  try {
    return new BatchSpanProcessor(
      new OTLPTraceExporter({
        url: `${endpoint}/v1/traces`,
        timeoutMillis: requestTimeout("TRACES", budgetMs),
        ...(connections && { httpAgentOptions: connections.agentFor }),
      }),
      {
        maxQueueSize: 2048,
        maxExportBatchSize: 512,
        scheduledDelayMillis: 1000,
        exportTimeoutMillis: 30000,
      },
    );
  } catch (error) {
    logger.warn(`${OTEL_LOG_PREFIX} Failed to create OTLP trace exporter`, {
      error: error instanceof Error ? error.message : String(error),
      endpoint,
    });
    return null;
  }
}

/**
 * @description Builds a meter provider that exports metrics to an OTLP/HTTP endpoint and registers it as the global meter provider.
 * @param endpoint {string} - OTLP base URL; `/v1/metrics` is appended.
 * @param resource {Resource} - Resource describing the service.
 * @param budgetMs {number | undefined} - Request timeout in milliseconds, used unless `OTEL_EXPORTER_OTLP_TIMEOUT` or `OTEL_EXPORTER_OTLP_METRICS_TIMEOUT` is set; the exporter's default when omitted.
 * @param connections {OtlpConnections | undefined} - Tracks the connections the exporter opens so they can be closed when a flush runs out of its budget.
 * @returns {MeterProvider | null} The provider, or `null` (after a warning) when it cannot be created.
 */
export function createOtlpMeterProvider(
  endpoint: string,
  resource: Resource,
  budgetMs?: number,
  connections?: OtlpConnections,
): MeterProvider | null {
  try {
    const provider = new MeterProvider({
      resource,
      readers: [
        new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({
            url: `${endpoint}/v1/metrics`,
            timeoutMillis: requestTimeout("METRICS", budgetMs),
            ...(connections && { httpAgentOptions: connections.agentFor }),
          }),
          exportIntervalMillis: 15000,
          exportTimeoutMillis: 10000,
        }),
      ],
    });
    metrics.setGlobalMeterProvider(provider);
    return provider;
  } catch (error) {
    logger.warn(`${OTEL_LOG_PREFIX} Failed to create OTLP metric exporter`, {
      error: error instanceof Error ? error.message : String(error),
      endpoint,
    });
    return null;
  }
}
