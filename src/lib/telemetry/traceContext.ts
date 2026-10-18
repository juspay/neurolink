import { trace, context } from "@opentelemetry/api";

/**
 * Extract the current OTel trace context for the in-process span records
 * (`SpanSerializer`), so they carry the traceId of the exported OTEL trace.
 * Returns undefined values when no OTel context is active.
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
