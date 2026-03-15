/**
 * Observability Module
 * Multi-platform observability with OpenTelemetry integration
 */

// Core - Registry with singleton pattern
export {
  ExporterRegistry,
  getExporterRegistry,
  resetExporterRegistry,
} from "./exporterRegistry.js";
export { ArizeExporter } from "./exporters/arizeExporter.js";

// Exporters
export { BaseExporter, NoOpExporter } from "./exporters/baseExporter.js";
export { BraintrustExporter } from "./exporters/braintrustExporter.js";
export { DatadogExporter } from "./exporters/datadogExporter.js";
export { LaminarExporter } from "./exporters/laminarExporter.js";
export { LangfuseExporter } from "./exporters/langfuseExporter.js";
export { LangSmithExporter } from "./exporters/langsmithExporter.js";
export { OtelExporter } from "./exporters/otelExporter.js";
export { PostHogExporter } from "./exporters/posthogExporter.js";
export { SentryExporter } from "./exporters/sentryExporter.js";
// Metrics Aggregation with singleton pattern
export {
  getMetricsAggregator,
  type LatencyStats,
  MetricsAggregator,
  type MetricsAggregatorConfig,
  type MetricsSummary,
  type ModelCostStats,
  type ProviderCostStats,
  resetMetricsAggregator,
  type TimeWindowStats,
} from "./metricsAggregator.js";
export { OtelBridge } from "./otelBridge.js";
// Retry Policies
export {
  BaseRetryPolicy,
  CircuitBreakerAwarePolicy,
  ExponentialBackoffPolicy,
  FixedDelayPolicy,
  LinearBackoffPolicy,
  NoRetryPolicy,
  type RetryContext,
  type RetryDecision,
  RetryExecutor,
  type RetryPolicy,
  RetryPolicyFactory,
} from "./retryPolicy.js";
// Sampling
export {
  AlwaysSampler,
  AttributeBasedSampler,
  CompositeSampler,
  CustomSampler,
  ErrorOnlySampler,
  NeverSampler,
  PrioritySampler,
  RatioSampler,
  type Sampler,
  SamplerFactory,
  TraceIdRatioSampler,
} from "./sampling/samplers.js";
// Span Processing
export {
  AttributeEnrichmentProcessor,
  BatchProcessor,
  CompositeProcessor,
  FilterProcessor,
  PassThroughProcessor,
  RedactionProcessor,
  type SpanProcessor,
  SpanProcessorFactory,
  TruncationProcessor,
} from "./spanProcessor.js";
export {
  enrichSpanWithTokenUsage,
  getTokenTracker,
  type ModelPricing,
  type ModelTokenStats,
  type ProviderTokenStats,
  resetTokenTracker,
  TokenTracker,
  type TokenUsageStats,
} from "./tokenTracker.js";
export type {
  ArizeExporterConfig,
  BraintrustExporterConfig,
  DatadogExporterConfig,
  ExportError,
  ExporterConfig,
  ExporterHealthStatus,
  ExporterPlugin,
  ExportResult,
  ExtendedObservabilityConfig,
  LaminarExporterConfig,
  LangfuseExporterConfig,
  LangSmithExporterConfig,
  OtelExporterConfig,
  OtelProtocol,
  PostHogExporterConfig,
  SamplerConfig,
  SamplingRule,
  SentryExporterConfig,
} from "./types/exporterTypes.js";
export type { TraceView } from "./metricsAggregator.js";
// Types
export {
  AGENT_ATTRIBUTES,
  GENAI_ATTRIBUTES,
  type LangfuseSpan,
  type LangSmithRun,
  type OtelSpan,
  type SpanAttributes,
  type SpanData,
  type SpanEvent,
  type SpanLink,
  SpanStatus,
  SpanType,
} from "./types/spanTypes.js";
// Utilities
export { SpanSerializer } from "./utils/spanSerializer.js";
