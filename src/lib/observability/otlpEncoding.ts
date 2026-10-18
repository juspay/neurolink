import { LangfuseOtelSpanAttributes } from "@langfuse/tracing";
import {
  MAX_BYTES_PER_REQUEST,
  MAX_SPANS_PER_REQUEST,
  MODEL_ATTRIBUTE_KEYS,
  OTLP_STATUS_CODES,
  UNPRICED_OBSERVATION_TYPES,
  USAGE_ATTRIBUTE_PREFIX,
} from "../constants/langfuse.js";
import type {
  LangfuseAttributePolicy,
  OtlpAnyValue,
  OtlpEncodedSpan,
  OtlpKeyValue,
  OtlpScopeSpans,
  OtlpSpan,
  OtlpTraceRequest,
  SpanAttributes,
  SpanAttributeValue,
  SpanData,
} from "../types/index.js";
import { SpanStatus } from "../types/index.js";
import { protectAttributes } from "./langfuseMasking.js";

const SPAN_KIND_INTERNAL = 1;
const FALLBACK_SERVICE_NAME = "service";
const SCOPE_NAME = "sdk";

function toNanos(iso: string): string {
  return (BigInt(Date.parse(iso)) * 1_000_000n).toString();
}

function toOtlpValue(value: SpanAttributeValue): OtlpAnyValue {
  if (typeof value === "boolean") {
    return { boolValue: value };
  }
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { intValue: String(value) }
      : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(toOtlpValue) } };
  }
  return { stringValue: String(value) };
}

/**
 * @description Encodes attributes as OTLP/JSON key-values, dropping `undefined` and `null` entries.
 * @param attributes {SpanAttributes} - Attribute record to encode.
 * @returns {OtlpKeyValue[]} One typed key-value per kept attribute.
 */
export function toOtlpAttributes(attributes: SpanAttributes): OtlpKeyValue[] {
  return Object.entries(attributes)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => ({ key, value: toOtlpValue(value) }));
}

// The proxy root also carries gen_ai model and usage keys for collectors;
// Langfuse would price it a second time next to the request's generation.
function withoutUnpricedUsage(attributes: SpanAttributes): SpanAttributes {
  const type = attributes[LangfuseOtelSpanAttributes.OBSERVATION_TYPE];
  if (typeof type !== "string" || !UNPRICED_OBSERVATION_TYPES.has(type)) {
    return attributes;
  }
  return Object.fromEntries(
    Object.entries(attributes).filter(
      ([key]) =>
        !MODEL_ATTRIBUTE_KEYS.has(key) &&
        !key.startsWith(USAGE_ATTRIBUTE_PREFIX),
    ),
  );
}

/**
 * @description Encodes one span as OTLP/JSON, applying the exporter's attribute policy to its attributes (its events and status message are sent as they are), leaving GenAI model and usage keys off a plain span or event observation, and keeping the span's links and nanosecond times. Every span is sent as kind INTERNAL, as Langfuse has always received it.
 * @param span {SpanData} - Span to encode.
 * @param policy {LangfuseAttributePolicy} - Environment, release, redaction and mask settings.
 * @returns {OtlpSpan} The span in the shape Langfuse's ingestion endpoint reads.
 */
export function toOtlpSpan(
  span: SpanData,
  policy: LangfuseAttributePolicy,
): OtlpSpan {
  const failed = span.status === SpanStatus.ERROR;
  return {
    traceId: span.traceId,
    spanId: span.spanId,
    ...(span.parentSpanId && { parentSpanId: span.parentSpanId }),
    name: span.name,
    kind: SPAN_KIND_INTERNAL,
    startTimeUnixNano: span.startTimeUnixNano ?? toNanos(span.startTime),
    endTimeUnixNano:
      span.endTimeUnixNano ?? toNanos(span.endTime ?? span.startTime),
    attributes: toOtlpAttributes(
      protectAttributes(withoutUnpricedUsage(span.attributes), policy),
    ),
    events: span.events.map((event) => ({
      name: event.name,
      timeUnixNano: event.timestampUnixNano ?? toNanos(event.timestamp),
      attributes: toOtlpAttributes(event.attributes ?? {}),
    })),
    links: span.links.map((link) => ({
      traceId: link.traceId,
      spanId: link.spanId,
      attributes: toOtlpAttributes(link.attributes ?? {}),
    })),
    status: {
      code: OTLP_STATUS_CODES[span.status],
      ...(failed && span.statusMessage && { message: span.statusMessage }),
    },
  };
}

/**
 * @description Encodes a span together with the resource it was produced under, falling back to a generic service name for a span that carries none, and the instrumentation scope `sdk` that the Langfuse request has always named.
 * @param span {SpanData} - Span to encode.
 * @param policy {LangfuseAttributePolicy} - Environment, release, redaction and mask settings.
 * @returns {OtlpEncodedSpan} The encoded span with its resource and scope.
 */
export function toOtlpEncodedSpan(
  span: SpanData,
  policy: LangfuseAttributePolicy,
): OtlpEncodedSpan {
  return {
    span: toOtlpSpan(span, policy),
    resource: toOtlpAttributes(
      span.resource ?? { "service.name": FALLBACK_SERVICE_NAME },
    ),
    scope: { name: SCOPE_NAME },
  };
}

/**
 * @description Builds an OTLP/JSON export request, grouping spans under the resource and instrumentation scope they were produced under.
 * @param items {OtlpEncodedSpan[]} - Encoded spans, in export order.
 * @returns {OtlpTraceRequest} The request body, with one `resourceSpans` entry per distinct resource and one `scopeSpans` entry per distinct scope within it.
 */
export function toOtlpRequest(items: OtlpEncodedSpan[]): OtlpTraceRequest {
  const resources = new Map<
    string,
    { resource: OtlpKeyValue[]; scopes: Map<string, OtlpScopeSpans> }
  >();
  for (const { span, resource, scope } of items) {
    const resourceKey = JSON.stringify(resource);
    const group = resources.get(resourceKey) ?? {
      resource,
      scopes: new Map(),
    };
    resources.set(resourceKey, group);
    const scopeKey = `${scope.name}\u0000${scope.version ?? ""}`;
    const scoped = group.scopes.get(scopeKey) ?? { scope, spans: [] };
    group.scopes.set(scopeKey, scoped);
    scoped.spans.push(span);
  }
  return {
    resourceSpans: [...resources.values()].map((group) => ({
      resource: { attributes: group.resource },
      scopeSpans: [...group.scopes.values()],
    })),
  };
}

/**
 * @description Splits encoded spans into request-sized batches, bounded by span count and serialized bytes.
 * @param items {OtlpEncodedSpan[]} - Encoded spans, in export order.
 * @returns {OtlpEncodedSpan[][]} Batches that each fit one export request; a single oversized span still gets its own batch.
 */
export function chunkOtlpSpans(items: OtlpEncodedSpan[]): OtlpEncodedSpan[][] {
  const chunks: OtlpEncodedSpan[][] = [];
  let current: OtlpEncodedSpan[] = [];
  let bytes = 0;
  for (const item of items) {
    const size = Buffer.byteLength(JSON.stringify(item.span));
    if (
      current.length > 0 &&
      (current.length >= MAX_SPANS_PER_REQUEST ||
        bytes + size > MAX_BYTES_PER_REQUEST)
    ) {
      chunks.push(current);
      current = [];
      bytes = 0;
    }
    current.push(item);
    bytes += size;
  }
  if (current.length > 0) {
    chunks.push(current);
  }
  return chunks;
}
