import { trace, context } from "@opentelemetry/api";

/**
 * Extract the current OTel trace context for use by Pipeline B spans.
 * Returns undefined values when no OTel context is active, allowing
 * Pipeline B spans to share the same trace as Pipeline A spans.
 */
export function getActiveTraceContext(): {
  traceId?: string;
  parentSpanId?: string;
} {
  const activeSpan = trace.getSpan(context.active());
  if (!activeSpan) {
    return {};
  }
  const ctx = activeSpan.spanContext();
  // Invalid trace IDs are all zeros — don't use those
  if (!ctx.traceId || ctx.traceId === "00000000000000000000000000000000") {
    return {};
  }
  return { traceId: ctx.traceId, parentSpanId: ctx.spanId };
}
