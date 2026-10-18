/**
 * Observability Configuration Types
 * These configs are passed from the parent application (e.g., Lighthouse)
 * to enable telemetry and observability features in Neurolink SDK
 */

import type {
  AttributeValue,
  Counter,
  Histogram,
  Meter,
} from "@opentelemetry/api";
import type { JsonValue, RawUsageObject, Unknown } from "./common.js";
import type { SpanData } from "./span.js";

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
 * @description Langfuse exporter options. Every field falls back to its `LANGFUSE_*` environment variable when omitted.
 */
export type NeurolinkLangfuseConfig = {
  /** `false` keeps Langfuse export off although keys are present; any other value, or leaving it out, leaves it on. */
  enabled?: boolean;
  /** Project public key; defaults to `LANGFUSE_PUBLIC_KEY`. */
  publicKey?: string;
  /** Project secret key; defaults to `LANGFUSE_SECRET_KEY`. */
  secretKey?: string;
  /** Langfuse host; defaults to `LANGFUSE_BASE_URL`, then Langfuse Cloud. */
  baseUrl?: string;
  /** Environment name on Langfuse traces; defaults to `LANGFUSE_TRACING_ENVIRONMENT`. The OTLP resource's `deployment.environment` also falls back to `LANGFUSE_ENVIRONMENT`, then `PUBLIC_APP_ENVIRONMENT`. */
  environment?: string;
  /** Release identifier on Langfuse traces; defaults to `LANGFUSE_RELEASE`. The OTLP resource's `service.version` also falls back to `PUBLIC_APP_VERSION`. */
  release?: string;
  /** Applied to input, output and metadata before they are sent to Langfuse. It does not reach other exporters, the OTLP export, `getSpans()` or error text. */
  mask?: (params: { data: JsonValue }) => JsonValue;
  /** Leaves input and output out of what is sent to Langfuse. It does not reach other exporters, the OTLP export, `getSpans()` or error text. */
  redactIO?: boolean;
  /** Milliseconds a flush or shutdown waits for the Langfuse exporter before it drops what is still in flight; defaults to 3000. */
  flushBudgetMs?: number;
  /** `"immediate"` sends every span as it ends; `"batched"` (default) queues them. */
  exportMode?: "batched" | "immediate";
  /** Spans queued before a batch is sent; defaults to 15. */
  flushAt?: number;
  /** Seconds between batch sends; defaults to 5. */
  flushInterval?: number;
};

/**
 * @description Kind of connection counted by the `connections_total` metric.
 */
export type MetricConnectionType = "websocket" | "sse" | "http";

/**
 * @description The OpenTelemetry instruments behind NeuroLink's `ai_*`, `mcp_*`, `connections_total`, `response_time_ms` and `custom_*` metrics, created on one meter.
 */
export type AiMetricInstruments = {
  meter: Meter;
  requests: Counter;
  duration: Histogram;
  tokens: Counter;
  cost: Counter;
  providerErrors: Counter;
  mcpToolCalls: Counter;
  connections: Counter;
  responseTime: Histogram;
  custom: Map<string, Counter | Histogram>;
};

/**
 * @description Observability configuration for the NeuroLink SDK. Langfuse turns on automatically when `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` are set and `LANGFUSE_ENABLED` is not `false`, `0`, `off` or `no`; `false` turns it off.
 */
export type ObservabilityConfig = {
  /** `false` disables Langfuse, `true` or an options object enables it. */
  langfuse?: boolean | NeurolinkLangfuseConfig;
};

/**
 * @description Per-call trace attributes propagated to every span created inside the call.
 */
export type NeurolinkTraceContext = {
  /** End user the trace belongs to. */
  userId?: string | null;
  /** Session that groups related traces. */
  sessionId?: string | null;
  /** Conversation identifier, recorded as trace metadata. */
  conversationId?: string | null;
  /** Request identifier, recorded as trace metadata. */
  requestId?: string | null;
  /** Trace name shown in Langfuse. */
  traceName?: string | null;
  /** Trace tags. */
  tags?: string[];
  /** Trace metadata; values up to 200 characters once stringified are on every observation, longer values and arrays only on the trace. */
  metadata?: Record<string, SpanContent | undefined>;
  /** Name of the root observation of this `generate` or `stream` call; not propagated to child observations and not the trace name. */
  observationName?: string | null;
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

/** A model request serialized onto a span: the system prompt plus messages, or a bare prompt. */
export type SpanModelRequest = {
  system?: unknown;
  messages?: readonly unknown[];
  prompt?: string;
};

export type GenerationOperation = "generate" | "stream";

/** @description Any value a span attribute can carry: JSON, or an object serialized on the way out. */
export type SpanContent = JsonValue | object;

/** @description Observation kinds Langfuse renders a span as. */
export type ObservationType =
  | "span"
  | "generation"
  | "event"
  | "embedding"
  | "agent"
  | "tool"
  | "chain"
  | "retriever"
  | "evaluator"
  | "guardrail";

/** @description Severity of an observation. */
export type ObservationLevel = "DEBUG" | "DEFAULT" | "WARNING" | "ERROR";

/** @description Attributes stamped on an observation span by `observe`. */
export type ObservationAttributes = {
  input?: Unknown;
  output?: Unknown;
  metadata?: Record<string, SpanContent | undefined>;
  level?: ObservationLevel;
  statusMessage?: string;
  completionStartTime?: Date;
  model?: string;
  modelParameters?: Record<string, string | number>;
  usageDetails?: Record<string, number>;
  costDetails?: Record<string, number>;
};

/** @description Trace-level input, output and per-key metadata recorded by `observeTrace`. */
export type TraceContent = Pick<ObservationAttributes, "input" | "output"> & {
  metadata?: Record<string, SpanContent | undefined>;
};

/** @description A tool call as a provider, the agentic loop or a tool execution names its fields. */
export type AssistantToolCall = {
  id?: string;
  toolCallId?: string;
  name?: string;
  toolName?: string;
  args?: SpanContent;
  input?: SpanContent;
  arguments?: SpanContent;
  function?: { name?: string; arguments?: SpanContent };
};

/** @description A model response split into text, reasoning and tool calls. */
export type AssistantReply = {
  text?: string;
  reasoning?: string;
  toolCalls?: AssistantToolCall[];
};

/** @description A model response as plain text, a structured reply, or message or content-part arrays. */
export type AssistantOutput = string | AssistantReply | object[];

/** @description A tool call in OpenAI chat shape, as Langfuse renders it. */
export type ObservationToolCall = {
  id?: string;
  type: "function";
  function: { name?: string; arguments: string };
};

/**
 * @description One model request as a Langfuse generation. Every field is optional so the request half and the response half can be recorded separately.
 */
export type GenerationRecord = {
  /** Public API the call serves; inferred from the enclosing span when unset. */
  operation?: GenerationOperation;
  /** Provider name, used with the model to price the call. */
  provider?: string;
  /** Model the request asked for. */
  model?: string;
  /** Model the response says served it, when the API reports one. */
  responseModel?: string;
  /** Sampling and thinking parameters sent; undefined entries are dropped. */
  modelParameters?: Record<string, string | number | undefined>;
  /** System prompt and messages, or the bare prompt, sent. */
  input?: SpanModelRequest;
  /** Text and tool calls returned. */
  output?: AssistantOutput;
  /** Token usage in any naming convention `extractTokenUsage` reads. */
  usage?: RawUsageObject | null;
  /** Provider finish reason. */
  finishReason?: string;
  /** Whether the caller aborted the call before it finished. */
  aborted?: boolean;
  /** When the first chunk of a streamed response arrived. */
  completionStartTime?: Date;
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
  /** Marks the span as an observation of this type when it starts, which is what sends it to the exporters. Without it a span is exported only if its own code marks it with `observe`. */
  observationType?: ObservationType;
  kind?: import("@opentelemetry/api").SpanKind;
  attributes?: Record<string, string | number | boolean | undefined>;
  /** Marks a thrown error as an expected skip whose Langfuse level the span set itself, so `withSpan` keeps it instead of raising ERROR. */
  expectedFailure?: (error: unknown) => boolean;
  /** Keeps the span out of the active context, so spans started inside `fn` parent to the nearest ancestor that is exported. */
  detached?: boolean;
  /**
   * With `detached`, lets the span be the active, exported root of its trace
   * when no span is active, so what it wraps stays in one trace instead of
   * each child starting its own. With an active ancestor it stays detached.
   */
  rootWhenOrphaned?: boolean;
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
