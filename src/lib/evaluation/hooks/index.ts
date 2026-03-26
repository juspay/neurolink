/**
 * @file Hooks Index
 * Export all observability hooks
 */

export {
  createLangfuseAdapter,
  createMockLangfuseClient,
  LangfuseAdapter,
  type LangfuseAdapterConfig,
  type LangfuseClient,
  startLangfuseAdapter,
} from "./langfuseAdapter.js";
export {
  createConsoleLoggerHook,
  createMetricsCollectorHook,
  type EvaluationEvents,
  type EventHandler,
  ObservabilityHooks,
  observabilityHooks,
  pipelineToSpanAttributes,
  type SpanAttributes,
  scorerToSpanAttributes,
} from "./observabilityHooks.js";
