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
   * Defaults to false (input/output are exported).
   */
  redactIO?: boolean;
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
