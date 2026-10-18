[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SpanData

# Type Alias: SpanData

> **SpanData** = `object`

Complete span data structure

## Properties

### spanId

> **spanId**: `string`

Unique span identifier

---

### traceId

> **traceId**: `string`

Trace identifier for distributed tracing

---

### parentSpanId?

> `optional` **parentSpanId?**: `string`

Parent span ID for nested operations

---

### type

> **type**: [`SpanType`](../enumerations/SpanType.md)

Span type category

---

### name

> **name**: `string`

Human-readable span name

---

### startTime

> **startTime**: `string`

Start timestamp (ISO 8601)

---

### endTime?

> `optional` **endTime?**: `string`

End timestamp (ISO 8601)

---

### startTimeUnixNano?

> `optional` **startTimeUnixNano?**: `string`

Start as nanoseconds since the Unix epoch (decimal string); finer than `startTime`

---

### endTimeUnixNano?

> `optional` **endTimeUnixNano?**: `string`

End as nanoseconds since the Unix epoch (decimal string); finer than `endTime`

---

### durationMs?

> `optional` **durationMs?**: `number`

Duration in milliseconds

---

### kind?

> `optional` **kind?**: `number`

OpenTelemetry span kind: 0 internal, 1 server, 2 client, 3 producer, 4 consumer

---

### resource?

> `optional` **resource?**: [`SpanAttributes`](SpanAttributes.md)

Attributes of the resource that produced the span, such as `service.name`

---

### scope?

> `optional` **scope?**: [`SpanScope`](SpanScope.md)

Instrumentation scope that created the span

---

### status

> **status**: [`SpanStatus`](../enumerations/SpanStatus.md)

Span status

---

### statusMessage?

> `optional` **statusMessage?**: `string`

Status message (for errors)

---

### attributes

> **attributes**: [`SpanAttributes`](SpanAttributes.md)

Span attributes/tags

---

### events

> **events**: [`SpanEvent`](SpanEvent.md)[]

Events within the span

---

### links

> **links**: [`SpanLink`](SpanLink.md)[]

Links to related spans
