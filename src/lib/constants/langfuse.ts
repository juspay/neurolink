import { SpanStatus } from "../types/index.js";

/** @description Langfuse OTLP ingestion endpoint path. */
export const TRACES_PATH = "/api/public/otel/v1/traces";

/** @description Langfuse health endpoint path. */
export const HEALTH_PATH = "/api/public/health";

/** @description Langfuse Cloud base URL used when none is configured. */
export const DEFAULT_BASE_URL = "https://cloud.langfuse.com";

/** @description Spans buffered before an automatic flush. */
export const DEFAULT_FLUSH_AT = 15;

/** @description Milliseconds between scheduled flushes. */
export const DEFAULT_FLUSH_INTERVAL_MS = 5_000;

/** @description Milliseconds before an export request is aborted. */
export const DEFAULT_TIMEOUT_MS = 30_000;

/** @description Milliseconds a flush or shutdown waits for delivery before it abandons what is still in flight. */
export const DEFAULT_FLUSH_BUDGET_MS = 3_000;

/** @description Maximum spans sent in one export request. */
export const MAX_SPANS_PER_REQUEST = 500;

/** @description Export requests to Langfuse in flight at once. Spans that end while every one is busy wait in the buffer. */
export const MAX_CONCURRENT_DELIVERIES = 4;

/** @description Spans that may wait for a delivery slot. Beyond it the oldest waiting spans are dropped and counted, so a Langfuse that stops answering cannot hold an unbounded backlog in memory. */
export const MAX_QUEUED_SPANS = 10_000;

/** @description Milliseconds between warn-level logs about waiting spans dropped for lack of a delivery slot. */
export const QUEUE_DROP_WARN_INTERVAL_MS = 60_000;

/** @description Longest `Retry-After` a 429 or 503 from Langfuse is waited out before the retry. */
export const MAX_EXPORT_RETRY_AFTER_MS = 60_000;

/** @description Maximum serialized bytes sent in one export request. */
export const MAX_BYTES_PER_REQUEST = 3_500_000;

/** @description Placeholder that replaces a value fully removed by the user's mask. */
export const FULLY_MASKED = "<fully masked>";

/** @description Span attributes holding trace and observation input or output, which the Langfuse exporter's mask and `redactIO` apply to. */
export const CONTENT_KEYS = new Set([
  "langfuse.observation.input",
  "langfuse.observation.output",
  "langfuse.trace.input",
  "langfuse.trace.output",
]);

/** @description Attribute prefixes whose values are metadata entries. */
export const METADATA_PREFIXES = [
  "langfuse.observation.metadata.",
  "langfuse.trace.metadata.",
];

/** @description Observation types that hold no model, usage or cost in Langfuse. GenAI model and usage keys on them are left out of the Langfuse export, so a request's generation stays its only priced record. */
export const UNPRICED_OBSERVATION_TYPES: ReadonlySet<string> = new Set([
  "span",
  "event",
]);

/** @description GenAI attributes Langfuse reads a model name from. */
export const MODEL_ATTRIBUTE_KEYS: ReadonlySet<string> = new Set([
  "gen_ai.request.model",
  "gen_ai.response.model",
]);

/** @description Prefix of the GenAI attributes Langfuse reads usage and cost from. */
export const USAGE_ATTRIBUTE_PREFIX = "gen_ai.usage.";

/** @description OTLP numeric status code for each span status. */
export const OTLP_STATUS_CODES: Record<SpanStatus, number> = {
  [SpanStatus.UNSET]: 0,
  [SpanStatus.WARNING]: 0,
  [SpanStatus.OK]: 1,
  [SpanStatus.ERROR]: 2,
};
