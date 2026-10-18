/** @description Smallest per-string character budget when trimming span payloads. */
export const MIN_STRING_BUDGET_CHARS = 64;

/** @description Base64 payload length above which a value is treated as binary and replaced. */
export const BINARY_PAYLOAD_MIN_CHARS = 1_024;

/** @description Placeholder written when a span value cannot be serialized. */
export const UNSERIALIZABLE_VALUE = "[unserializable]";

/** @description Object keys whose values are treated as binary payloads. */
export const BINARY_KEYS = new Set([
  "data",
  "image",
  "bytes",
  "base64",
  "b64json",
]);

/** @description Placeholder that replaces a masked credential in span content. */
export const REDACTED_VALUE = "[REDACTED]";

/** @description Finish reasons that mark a completed model call as a Langfuse warning. */
export const WARNING_FINISH_REASONS = new Set([
  "length",
  "max_tokens",
  "content-filter",
  "content_filter",
  "abort",
  "aborted",
  "no-output",
]);

/** @description Room for the "...[truncated N chars]" note, kept outside the opening a cap preserves. */
export const TRUNCATION_NOTE_ALLOWANCE_CHARS = 48;

/** @description Name of the OpenTelemetry context key that carries a trace's full metadata. */
export const TRACE_METADATA_CONTEXT_KEY = "neurolink.trace.metadata";

/** @description Log prefix for NeuroLink's OpenTelemetry setup. */
export const OTEL_LOG_PREFIX = "[OpenTelemetry]";

/** @description Most open and most ended spans the exporter span processor remembers for re-parenting; the oldest are forgotten first. */
export const MAX_REMEMBERED_SPANS = 5_000;

/** @description Most redacted span attribute strings remembered so `observe` does not redact them a second time. */
export const MAX_REDACTED_ATTRIBUTES = 64;

/** @description Span attribute that keeps a wrapper span out of every exporter. */
export const INTERNAL_SPAN_ATTRIBUTE = "langfuse.internal";

/** @description Instrumentation scope of the proxy's tracer. Of the proxy's spans only the ones it marks as observations (the request root and its generation) reach the exporters, although its spans also carry `gen_ai.*` keys for collectors. */
export const PROXY_TRACER_SCOPE = "neurolink.proxy";
