/**
 * Observability Configuration Types
 * These configs are passed from the parent application (e.g., Lighthouse)
 * to enable telemetry and observability features in Neurolink SDK
 */

import type { AttributeValue } from "@opentelemetry/api";
import type { SpanData } from "./span.js";

/**
 * Trace name format for Langfuse traces
 *
 * Controls how userId and operationName are combined to form the trace name.
 * Can be a predefined format string or a custom function.
 *
 * @example
 * // Predefined formats:
 * "userId:operationName" → "user@email.com:ai.streamText"
 * "operationName:userId" → "ai.streamText:user@email.com"
 * "operationName" → "ai.streamText"
 * "userId" → "user@email.com" (legacy)
 *
 * @example
 * // Custom function:
 * (ctx) => `[${ctx.operationName}] ${ctx.userId}`
 * // → "[ai.streamText] user@email.com"
 */
export type TraceNameFormat =
  | "userId:operationName"
  | "operationName:userId"
  | "operationName"
  | "userId"
  | ((context: { userId?: string; operationName?: string }) => string);

/**
 * Standard GenAI semantic convention attributes from OpenTelemetry
 * These are the attributes that Vercel AI SDK's experimental_telemetry creates
 * @see https://opentelemetry.io/docs/specs/semconv/gen-ai/
 */
export type LangfuseSpanAttributes = {
  // Core GenAI attributes
  "gen_ai.system"?: string;
  "gen_ai.request.model"?: string;
  "gen_ai.response.model"?: string;
  "gen_ai.request.max_tokens"?: number;
  "gen_ai.request.temperature"?: number;
  "gen_ai.request.top_p"?: number;
  "gen_ai.usage.input_tokens"?: number;
  "gen_ai.usage.output_tokens"?: number;
  "gen_ai.usage.total_tokens"?: number;
  "gen_ai.response.finish_reasons"?: string[];
  "gen_ai.prompt"?: string;
  "gen_ai.completion"?: string;

  // Vercel AI SDK specific attributes
  "ai.model.id"?: string;
  "ai.model.provider"?: string;
  "ai.operationId"?: string;
  "ai.telemetry.functionId"?: string;
  "ai.finishReason"?: string;
  "ai.usage.promptTokens"?: number;
  "ai.usage.completionTokens"?: number;

  // Allow additional custom attributes
  [key: string]: AttributeValue | undefined;
};

/**
 * Langfuse observability configuration
 */
export type LangfuseConfig = {
  /** Whether Langfuse is enabled */
  enabled: boolean;
  /** Langfuse public key */
  publicKey: string;
  /**
   * Langfuse secret key
   * @sensitive
   * WARNING: This is a sensitive credential. Handle securely.
   * Do NOT log, expose, or share this key. Follow best practices for secret management.
   */
  secretKey: string;
  /** Langfuse base URL (default: https://cloud.langfuse.com) */
  baseUrl?: string;
  /** Environment name (e.g., dev, staging, prod) */
  environment?: string;
  /** Release/version identifier */
  release?: string;
  /** Optional default user id to attach to spans */
  userId?: string;
  /** Optional default session id to attach to spans */
  sessionId?: string;

  // NEW FIELDS - External TracerProvider Support
  /**
   * If true, NeuroLink will NOT create or register its own TracerProvider.
   * Instead, it will only create the LangfuseSpanProcessor and ContextEnricher,
   * which the parent application must add to its own TracerProvider.
   *
   * Use this when your application already has OpenTelemetry instrumentation.
   *
   * @default false
   */
  useExternalTracerProvider?: boolean;

  /**
   * If true, NeuroLink will automatically detect if a TracerProvider is already
   * registered globally and skip its own registration to avoid conflicts.
   *
   * This is a convenience option that combines well with useExternalTracerProvider.
   *
   * @default false
   */
  autoDetectExternalProvider?: boolean;

  /**
   * If true, NeuroLink will NOT register its own LangfuseSpanProcessor with the
   * global TracerProvider when using external provider mode. Only the ContextEnricher
   * will be registered. Use this when the host application already registers a
   * LangfuseSpanProcessor (e.g., via a DeferredSpanProcessor) to prevent duplicate
   * trace exports to Langfuse.
   *
   * @default false
   */
  skipLangfuseSpanProcessor?: boolean;

  // Operation Name Support

  /**
   * Enable auto-detection of operation names from span names.
   *
   * When true (default), AI operation spans (ai.streamText, ai.generateText, etc.)
   * will have their operation name automatically extracted and included in the
   * trace name.
   *
   * @default true
   *
   * @example
   * // With auto-detection enabled (default):
   * // Span "ai.streamText" + userId "user@email.com"
   * // → Trace name: "user@email.com:ai.streamText"
   *
   * @example
   * // With auto-detection disabled:
   * // → Trace name: "user@email.com" (legacy behavior)
   */
  autoDetectOperationName?: boolean;

  /**
   * Format for trace names in Langfuse.
   *
   * Controls how userId and operationName are combined to form the trace name.
   * Can be a predefined format string or a custom function for full control.
   *
   * @default "userId:operationName"
   *
   * @example
   * // Predefined formats:
   * traceNameFormat: "userId:operationName" // "user@email.com:ai.streamText"
   * traceNameFormat: "operationName:userId" // "ai.streamText:user@email.com"
   * traceNameFormat: "operationName"        // "ai.streamText"
   * traceNameFormat: "userId"               // "user@email.com" (legacy)
   *
   * @example
   * // Custom function:
   * traceNameFormat: (ctx) => `[${ctx.operationName || 'unknown'}] ${ctx.userId}`
   * // → "[ai.streamText] user@email.com"
   */
  traceNameFormat?: TraceNameFormat;
};

/**
 * OpenTelemetry configuration
 */
export type OpenTelemetryConfig = {
  /** Whether OpenTelemetry is enabled */
  enabled: boolean;
  /** OTLP endpoint URL */
  endpoint?: string;
  /** Service name for traces */
  serviceName?: string;
  /** Service version */
  serviceVersion?: string;
};

/**
 * Complete observability configuration for Neurolink SDK
 */
export type ObservabilityConfig = {
  /** Langfuse configuration */
  langfuse?: LangfuseConfig;
  /** OpenTelemetry configuration */
  openTelemetry?: OpenTelemetryConfig;
};

// =============================================================================
// OBSERVABILITY MODULE TYPES (from retryPolicy.ts, samplers.ts, spanProcessor.ts)
// =============================================================================

/**
 * Retry policy type for observability exporters.
 */
export type RetryPolicy = {
  /** Policy name for identification */
  readonly name: string;

  /** Decide whether to retry */
  shouldRetry(context: RetryContext): RetryDecision;

  /** Maximum attempts allowed */
  readonly maxAttempts: number;

  /** Maximum total time allowed for retries */
  readonly maxTotalTimeMs: number;
};

/**
 * Sampler type for controlling which spans are exported.
 */
export type Sampler = {
  /** Sampler name for identification */
  readonly name: string;

  /** Determine if a span should be sampled */
  shouldSample(span: SpanData): boolean;

  /** Get sampling decision description */
  getDescription(): string;
};

/**
 * Span processor type for composable span processing pipelines.
 */
export type SpanProcessor = {
  /** Processor name for identification */
  readonly name: string;

  /** Process a span before export, returns null to drop the span */
  process(span: SpanData): SpanData | null;

  /** Optional async processing (for external lookups, etc.) */
  processAsync?(span: SpanData): Promise<SpanData | null>;

  /** Shutdown the processor (cleanup resources) */
  shutdown?(): Promise<void>;
};

// =============================================================================
// TRACE VIEW (moved from observability/metricsAggregator.ts)
// =============================================================================

/**
 * Hierarchical trace view grouping related spans
 */
export type TraceView = {
  /** Trace identifier shared by all spans in this trace */
  traceId: string;
  /** The root/parent span of this trace */
  rootSpan: SpanData;
  /** Child spans linked to the root */
  childSpans: SpanData[];
  /** Total duration from first to last span */
  totalDurationMs: number;
  /** Total number of spans in this trace */
  spanCount: number;
  /** Overall trace status */
  status: "ok" | "error" | "partial";
};

// =============================================================================
// LANGFUSE CONTEXT (moved from services/server/ai/observability/instrumentation.ts)
// =============================================================================

/**
 * Extended context for Langfuse spans.
 * Supports all Langfuse trace attributes for rich observability.
 */
export type LangfuseContext = {
  userId?: string | null;
  sessionId?: string | null;
  /** Conversation/thread identifier for grouping related traces */
  conversationId?: string | null;
  /** Request identifier for correlating with application logs */
  requestId?: string | null;
  /** Custom trace name for better organization in Langfuse UI */
  traceName?: string | null;
  /** Custom metadata to attach to spans */
  metadata?: Record<string, unknown> | null;
  /**
   * Explicit operation name (e.g., "ai.streamText", "chat", "embeddings").
   * If set, overrides auto-detection from the span name.
   */
  operationName?: string | null;
  /**
   * Override global autoDetectOperationName setting for this context.
   * When undefined, uses the global setting (defaults to true).
   */
  autoDetectOperationName?: boolean;
  /**
   * Custom attributes to set on all spans within this context.
   * These attributes are propagated to every span created within the
   * AsyncLocalStorage context.
   */
  customAttributes?: Record<string, string | number | boolean>;
};

/**
 * Latency statistics with percentile calculations
 */

export type LatencyStats = {
  /** Minimum latency in milliseconds */
  min: number;
  /** Maximum latency in milliseconds */
  max: number;
  /** Mean/average latency in milliseconds */
  mean: number;
  /** Median latency (p50) in milliseconds */
  median: number;
  /** 50th percentile latency in milliseconds */
  p50: number;
  /** 75th percentile latency in milliseconds */
  p75: number;
  /** 90th percentile latency in milliseconds */
  p90: number;
  /** 95th percentile latency in milliseconds */
  p95: number;
  /** 99th percentile latency in milliseconds */
  p99: number;
  /** Standard deviation in milliseconds */
  stdDev: number;
  /** Total number of samples */
  count: number;
};

/**
 * Cost breakdown by provider
 */

export type ProviderCostStats = {
  provider: string;
  totalCost: number;
  requestCount: number;
  avgCostPerRequest: number;
  inputCost: number;
  outputCost: number;
};

/**
 * Cost breakdown by model
 */

export type ModelCostStats = {
  model: string;
  provider: string;
  totalCost: number;
  requestCount: number;
  avgCostPerRequest: number;
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
};

/**
 * Aggregated metrics summary
 */

export type MetricsSummary = {
  /** Total number of spans tracked */
  totalSpans: number;
  /** Number of successful spans */
  successfulSpans: number;
  /** Number of failed spans */
  failedSpans: number;
  /** Overall success rate (0-1) */
  successRate: number;
  /** Latency statistics */
  latency: LatencyStats;
  /** Token usage statistics */
  tokens: TokenUsageStats;
  /** Cost by provider */
  costByProvider: ProviderCostStats[];
  /** Cost by model */
  costByModel: ModelCostStats[];
  /** Total cost across all providers */
  totalCost: number;
  /** Span count by type */
  spansByType: Record<string, number>;
  /** Timestamp of first span */
  firstSpanTime?: Date;
  /** Timestamp of last span */
  lastSpanTime?: Date;
  /** Tracking duration in milliseconds */
  trackingDurationMs?: number;
};

/**
 * Result of a retry decision
 */

export type RetryDecision = {
  /** Whether to retry */
  shouldRetry: boolean;
  /** Delay before retry in milliseconds */
  delayMs: number;
  /** Reason for the decision */
  reason: string;
};

/**
 * Context for retry decision making
 */

export type RetryContext = {
  /** Current attempt number (0-indexed) */
  attempt: number;
  /** The error that triggered the retry */
  error: Error;
  /** Total elapsed time since first attempt */
  elapsedMs: number;
  /** Operation name for logging */
  operationName: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
};

/**
 * Token usage statistics by provider
 */
export type ProviderTokenStats = {
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  requestCount: number;
};

/**
 * Token usage statistics by model
 */
export type ModelTokenStats = {
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  requestCount: number;
  avgTokensPerRequest: number;
};

/**
 * Aggregated token usage statistics
 */
export type TokenUsageStats = {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  reasoningTokens: number;
  totalCost: number;
  byProvider: Map<string, ProviderTokenStats>;
  byModel: Map<string, ModelTokenStats>;
  bySpanType: Map<string, number>;
};

export type HealthMetrics = {
  timestamp: number;
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
  activeConnections: number;
  errorRate: number;
  averageResponseTime: number;
};

export type SpanOptions = {
  name: string;
  tracer: import("@opentelemetry/api").Tracer;
  kind?: import("@opentelemetry/api").SpanKind;
  attributes?: Record<string, string | number | boolean | undefined>;
};

// =============================================================================
// METRICS TRACE CONTEXT (from neurolink.ts)
// =============================================================================

/** Trace + parent span IDs used to correlate metric records with spans. */
export type MetricsTraceContext = {
  traceId: string;
  parentSpanId: string;
};

// =============================================================================
// EXPORTER REGISTRY CIRCUIT BREAKER (from observability/exporterRegistry.ts)
// =============================================================================

/**
 * Runtime state for the observability exporter circuit breaker.
 * Prefixed to disambiguate from the richer MCP CircuitBreakerState in mcp.ts.
 */
export type ObservabilityCircuitBreakerState = {
  failures: number;
  lastFailure: number;
  state: "closed" | "open" | "half-open";
};

/**
 * Minimal config for the observability exporter circuit breaker.
 * Prefixed to disambiguate from the richer MCP CircuitBreakerConfig in mcp.ts.
 */
export type ObservabilityCircuitBreakerConfig = {
  failureThreshold: number;
  resetTimeout: number;
};

// =============================================================================
// SENTRY EXPORTER (from observability/exporters/sentryExporter.ts)
// =============================================================================

/** Minimal view of the dynamically-imported @sentry/node module. */
export type SentryModule = {
  init: (options: {
    dsn: string;
    tracesSampleRate: number;
    release?: string;
    environment: string;
  }) => void;
  withScope: (callback: (scope: SentryScope) => void) => void;
  captureException: (error: Error) => void;
  startInactiveSpan: (options: {
    name: string;
    op: string;
    startTime: number;
    attributes?: Record<string, unknown>;
  }) => { end: (timestamp?: number) => void };
  flush: (timeout: number) => Promise<boolean>;
  close: (timeout: number) => Promise<boolean>;
};

/** Sentry scope surface used by SentryExporter.withScope callbacks. */
export type SentryScope = {
  setTags: (tags: Record<string, string>) => void;
  setContext: (name: string, context: Record<string, unknown>) => void;
  setUser: (user: { id: string }) => void;
};

// =============================================================================
// METRICS AGGREGATOR (from observability/metricsAggregator.ts)
// =============================================================================

/** Aggregated metrics for a single time window. */
export type TimeWindowStats = {
  windowStart: Date;
  windowEnd: Date;
  windowDurationMs: number;
  requestCount: number;
  errorCount: number;
  successRate: number;
  throughput: number;
  latency: LatencyStats;
  tokens: TokenUsageStats;
  costByProvider: Map<string, ProviderCostStats>;
  costByModel: Map<string, ModelCostStats>;
};

/** Configuration for MetricsAggregator. */
export type MetricsAggregatorConfig = {
  maxSpansRetained?: number;
  enableTimeWindows?: boolean;
  timeWindowMs?: number;
  maxTimeWindows?: number;
};

// =============================================================================
// TOKEN TRACKER (from observability/tokenTracker.ts)
// =============================================================================

/**
 * Per-million-token pricing used by the observability TokenTracker.
 * Prefixed to disambiguate from the richer providers.ts ModelPricing.
 */
export type ObservabilityModelPricing = {
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  cachedInputPricePerMillion?: number;
};
