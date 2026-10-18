import type { Agent as HttpAgent } from "node:http";
import type { Agent as HttpsAgent } from "node:https";
import type { JsonValue } from "./common.js";
import type { SpanAttributes } from "./span.js";

/**
 * Exporter configuration types
 * Following NeuroLink's type conventions
 */

/**
 * Base configuration for all exporters
 */
export type ExporterConfig = {
  /** Whether the exporter is enabled */
  enabled: boolean;
  /** Maximum spans to buffer before auto-flush */
  maxBufferSize?: number;
  /** Flush interval in milliseconds */
  flushIntervalMs?: number;
  /** Request timeout in milliseconds */
  timeoutMs?: number;
  /** Number of retry attempts */
  retries?: number;
  /** Custom headers for HTTP requests */
  headers?: Record<string, string>;
  /** Environment name (dev, staging, prod) */
  environment?: string;
  /** Service/application version */
  version?: string;
};

/**
 * Export error details
 */
export type ExportError = {
  spanId: string;
  error: string;
  retryable: boolean;
};

/**
 * Export result with status and metadata
 */
export type ExportResult = {
  success: boolean;
  exportedCount: number;
  failedCount: number;
  errors?: ExportError[];
  durationMs: number;
};

/**
 * Exporter health status
 */
export type ExporterHealthStatus = {
  healthy: boolean;
  name: string;
  latencyMs?: number;
  lastExportTime?: number;
  pendingSpans: number;
  errors?: string[];
};

/**
 * Point-in-time state of one registered exporter, as `getTelemetryStatus()` and
 * the CLI status commands report it. `pendingSpans` counts spans queued and not
 * yet handed to the network; `deliveredSpans` and `failedSpans` count what the
 * backend accepted and what was dropped since the process started.
 */
export type ExporterStatus = {
  name: string;
  enabled: boolean;
  healthy: boolean;
  pendingSpans: number;
  deliveredSpans: number;
  failedSpans: number;
  /** ISO timestamp of the last export that delivered spans */
  lastExportTime?: string;
  errors?: string[];
};

/**
 * What an exporter has delivered and dropped, and why its latest delivery
 * failed, as `getStatuses()` reports it.
 */
export type ExporterDeliveryCounts = {
  delivered: number;
  failed: number;
  lastError: string | undefined;
};

/**
 * Langfuse exporter configuration
 */
export type LangfuseExporterConfig = ExporterConfig & {
  publicKey: string;
  /**
   * @sensitive
   * WARNING: This is a sensitive credential. Handle securely.
   */
  secretKey: string;
  baseUrl?: string;
  release?: string;
  /**
   * When true, `input` and `output` fields are omitted from exported spans and
   * generations. Enable in compliance-sensitive deployments where prompt/response
   * content is considered PII or subject to data-minimisation requirements.
   * Defaults to false (input/output are exported). It acts on what this
   * exporter sends to Langfuse and nowhere else.
   */
  redactIO?: boolean;
  /**
   * Applied to input, output and metadata before they are sent to Langfuse.
   * When it throws, the value is replaced by `<fully masked>`. It acts on what
   * this exporter sends and nowhere else: not on other exporters, the OTLP
   * export, `getSpans()` or error text.
   */
  mask?: (params: { data: JsonValue }) => JsonValue;
  /**
   * Milliseconds `flush()` and `shutdown()` wait for delivery before they
   * give up on what is still in flight and drop it. Defaults to 3000.
   */
  flushBudgetMs?: number;
};

/**
 * LangSmith exporter configuration
 */
export type LangSmithExporterConfig = ExporterConfig & {
  /**
   * @sensitive
   * WARNING: This is a sensitive credential. Handle securely.
   */
  apiKey: string;
  projectName?: string;
  endpoint?: string;
};

/**
 * Datadog exporter configuration
 */
export type DatadogExporterConfig = ExporterConfig & {
  /**
   * @sensitive
   * WARNING: This is a sensitive credential. Handle securely.
   */
  apiKey: string;
  appKey?: string;
  /** Datadog site: us1, us3, us5, eu1, ap1 */
  site?: string;
  service?: string;
  source?: string;
};

/**
 * Sentry exporter configuration
 */
export type SentryExporterConfig = ExporterConfig & {
  /**
   * @sensitive
   * WARNING: This is a sensitive credential. Handle securely.
   */
  dsn: string;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
  release?: string;
};

/**
 * Braintrust exporter configuration
 */
export type BraintrustExporterConfig = ExporterConfig & {
  /**
   * @sensitive
   * WARNING: This is a sensitive credential. Handle securely.
   */
  apiKey: string;
  projectName: string;
  endpoint?: string;
};

/**
 * Arize exporter configuration
 */
export type ArizeExporterConfig = ExporterConfig & {
  /**
   * @sensitive
   * WARNING: This is a sensitive credential. Handle securely.
   */
  spaceKey: string;
  /**
   * @sensitive
   * WARNING: This is a sensitive credential. Handle securely.
   */
  apiKey: string;
  modelId?: string;
  modelVersion?: string;
};

/**
 * PostHog exporter configuration
 */
export type PostHogExporterConfig = ExporterConfig & {
  /**
   * @sensitive
   * WARNING: This is a sensitive credential. Handle securely.
   */
  apiKey: string;
  host?: string;
  personalApiKey?: string;
};

/**
 * Laminar exporter configuration
 */
export type LaminarExporterConfig = ExporterConfig & {
  /**
   * @sensitive
   * WARNING: This is a sensitive credential. Handle securely.
   */
  apiKey: string;
  projectApiKey?: string;
  baseUrl?: string;
};

/**
 * OpenTelemetry protocol types
 */
export type OtelProtocol = "http" | "grpc" | "zipkin";

/**
 * OpenTelemetry exporter configuration
 */
export type OtelExporterConfig = ExporterConfig & {
  endpoint: string;
  protocol?: OtelProtocol;
  serviceName?: string;
  serviceVersion?: string;
  resourceAttributes?: Record<string, string>;
  compression?: "gzip" | "none";
};

/**
 * Exporter plugin interface for custom exporters
 */
export type ExporterPlugin = {
  name: string;
  version: string;
  create(config: ExporterConfig): unknown;
};

/**
 * Extended observability configuration for NeuroLink SDK
 */
export type ExtendedObservabilityConfig = {
  /** Langfuse configuration */
  langfuse?: LangfuseExporterConfig;
  /** LangSmith configuration */
  langsmith?: LangSmithExporterConfig;
  /** Datadog configuration */
  datadog?: DatadogExporterConfig;
  /** Sentry configuration */
  sentry?: SentryExporterConfig;
  /** Braintrust configuration */
  braintrust?: BraintrustExporterConfig;
  /** Arize configuration */
  arize?: ArizeExporterConfig;
  /** PostHog configuration */
  posthog?: PostHogExporterConfig;
  /** Laminar configuration */
  laminar?: LaminarExporterConfig;
  /** OpenTelemetry configuration */
  openTelemetry?: OtelExporterConfig;
  /** Sampling configuration */
  sampling?: SamplerConfig;
};

/**
 * Sampler configuration — discriminated union keyed on `type`.
 * Each variant carries only the fields relevant to that sampler.
 */
export type SamplerConfig =
  | { type: "always" }
  | { type: "never" }
  | { type: "ratio"; ratio: number }
  | { type: "trace-id-ratio"; ratio: number }
  | { type: "attribute-based"; rules: SamplingRule[]; defaultRatio?: number }
  | { type: "priority"; rules: SamplingRule[]; defaultRatio?: number }
  | { type: "error-only" }
  | { type: "custom"; rules?: SamplingRule[]; defaultRatio?: number };

/**
 * Sampling rule definition
 */
export type SamplingRule = {
  /** Rule name for identification */
  name: string;
  /** Conditions that must match (AND logic) */
  conditions: Record<string, unknown>;
  /** Whether to sample if conditions match */
  sample: boolean;
  /** Optional priority (higher = evaluated first) */
  priority?: number;
};

/** @description A span attribute value as `SpanData` carries it before OTLP encoding. */
export type SpanAttributeValue = SpanAttributes[string];

/** @description An OTLP/JSON attribute value. */
export type OtlpAnyValue =
  | { boolValue: boolean }
  | { intValue: string }
  | { doubleValue: number }
  | { stringValue: string }
  | { arrayValue: { values: OtlpAnyValue[] } };

/** @description An OTLP/JSON attribute. */
export type OtlpKeyValue = { key: string; value: OtlpAnyValue };

/** @description How `createExporterSpanProcessor` treats the exporters of its registry. */
export type ExporterSpanProcessorOptions = {
  /** Whether the processor's `shutdown()` also shuts down the registry's exporters. Defaults to `true`; `false` flushes them and leaves them running. */
  shutdownExporters?: boolean;
};

/** @description An OTLP/JSON link from one span to another. */
export type OtlpLink = {
  traceId: string;
  spanId: string;
  attributes: OtlpKeyValue[];
};

/** @description An OTLP/JSON span as Langfuse's ingestion endpoint reads it. */
export type OtlpSpan = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: number;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes: OtlpKeyValue[];
  events: {
    name: string;
    timeUnixNano: string;
    attributes: OtlpKeyValue[];
  }[];
  links?: OtlpLink[];
  status: { code: number; message?: string };
};

/** @description An encoded span together with the resource and instrumentation scope it was produced under. */
export type OtlpEncodedSpan = {
  span: OtlpSpan;
  resource: OtlpKeyValue[];
  scope: { name: string; version?: string };
};

/** @description The spans one instrumentation scope produced, as an OTLP/JSON request groups them. */
export type OtlpScopeSpans = {
  scope: { name: string; version?: string };
  spans: OtlpSpan[];
};

/** @description An OTLP/JSON trace export request body. */
export type OtlpTraceRequest = {
  resourceSpans: {
    resource: { attributes: OtlpKeyValue[] };
    scopeSpans: OtlpScopeSpans[];
  }[];
};

/** @description What one delivery attempt of a batch to Langfuse achieved. */
export type LangfuseDeliveryReport = {
  delivered: number;
  rejected: number;
  droppedIds: string[];
  error?: string;
};

/** @description How Langfuse answered one export request: it took the spans (some perhaps rejected) or it did not take them. */
export type LangfusePostOutcome =
  | { accepted: true; rejected: number }
  | { accepted: false };

/** @description What the Langfuse exporter adds to, masks in and removes from span attributes before sending. */
export type LangfuseAttributePolicy = Pick<
  LangfuseExporterConfig,
  "environment" | "release" | "mask"
> & {
  redactIO: boolean;
};

/** @description The connections NeuroLink's OTLP exporters open, which a flush that has run out of its budget can close. */
export type OtlpConnections = {
  /** Hands an exporter the agent it opens its connections with. */
  agentFor: (protocol: string) => HttpAgent | HttpsAgent;
  /** Closes every connection now, and again once a retry that was asleep at that moment has sent. */
  cut: () => void;
};
