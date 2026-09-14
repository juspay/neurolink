import {
  context,
  ROOT_CONTEXT,
  trace,
  isSpanContextValid,
} from "@opentelemetry/api";
import type { ProxyLogTraceContext } from "../types/index.js";

const requests = new Map<string, ProxyLogTraceContext>();

/** Correlation belongs to the in-flight HTTP request, not to an async callback. */
export function registerProxyRequestTraceContext(
  requestId: string,
  ids: ProxyLogTraceContext,
): void {
  requests.set(requestId, ids);
}

/** Release once transport and terminal accounting have settled. */
export function releaseProxyRequestTraceContext(requestId: string): void {
  requests.delete(requestId);
}

/** Internal fallback records share their parent request's trace. */
export function getProxyRequestTraceContext(requestId: string) {
  return (
    requests.get(requestId) ??
    requests.get(requestId.replace(/:codex-fallback$/, ""))
  );
}

/** Retain IDs and sampling flags before deferred processing leaves the request. */
export function resolveProxyLogTraceContext(record: {
  traceId?: unknown;
  spanId?: unknown;
  traceFlags?: unknown;
  requestId?: unknown;
}): ProxyLogTraceContext | undefined {
  const saved =
    typeof record.requestId === "string"
      ? getProxyRequestTraceContext(record.requestId)
      : undefined;
  const active = trace.getSpanContext(context.active());
  const ids =
    typeof record.traceId === "string" && typeof record.spanId === "string"
      ? { traceId: record.traceId, spanId: record.spanId }
      : (saved ?? active);
  if (!ids) {
    return undefined;
  }
  const traceFlags =
    typeof record.traceFlags === "number" &&
    Number.isInteger(record.traceFlags) &&
    record.traceFlags >= 0 &&
    record.traceFlags <= 255
      ? record.traceFlags
      : saved?.traceId === ids.traceId
        ? saved.traceFlags
        : active?.traceId === ids.traceId
          ? active.traceFlags
          : 0;
  const result = { ...ids, traceFlags };
  return isSpanContextValid(result)
    ? { traceId: result.traceId, spanId: result.spanId, traceFlags }
    : undefined;
}

/** Populate native OTLP correlation, including valid unsampled contexts. */
export function proxyLogContext(record: {
  traceId?: unknown;
  spanId?: unknown;
  traceFlags?: unknown;
  requestId?: unknown;
}) {
  const ids = resolveProxyLogTraceContext(record);
  return ids ? trace.setSpanContext(ROOT_CONTEXT, ids) : context.active();
}
