[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SpanData

# Type Alias: SpanData

> **SpanData** = `object`

Defined in: [types/span.ts:195](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L195)

Complete span data structure

## Properties

### spanId

> **spanId**: `string`

Defined in: [types/span.ts:197](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L197)

Unique span identifier

---

### traceId

> **traceId**: `string`

Defined in: [types/span.ts:199](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L199)

Trace identifier for distributed tracing

---

### parentSpanId?

> `optional` **parentSpanId?**: `string`

Defined in: [types/span.ts:201](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L201)

Parent span ID for nested operations

---

### type

> **type**: [`SpanType`](../enumerations/SpanType.md)

Defined in: [types/span.ts:203](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L203)

Span type category

---

### name

> **name**: `string`

Defined in: [types/span.ts:205](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L205)

Human-readable span name

---

### startTime

> **startTime**: `string`

Defined in: [types/span.ts:207](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L207)

Start timestamp (ISO 8601)

---

### endTime?

> `optional` **endTime?**: `string`

Defined in: [types/span.ts:209](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L209)

End timestamp (ISO 8601)

---

### durationMs?

> `optional` **durationMs?**: `number`

Defined in: [types/span.ts:211](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L211)

Duration in milliseconds

---

### status

> **status**: [`SpanStatus`](../enumerations/SpanStatus.md)

Defined in: [types/span.ts:213](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L213)

Span status

---

### statusMessage?

> `optional` **statusMessage?**: `string`

Defined in: [types/span.ts:215](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L215)

Status message (for errors)

---

### attributes

> **attributes**: [`SpanAttributes`](SpanAttributes.md)

Defined in: [types/span.ts:217](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L217)

Span attributes/tags

---

### events

> **events**: [`SpanEvent`](SpanEvent.md)[]

Defined in: [types/span.ts:219](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L219)

Events within the span

---

### links

> **links**: [`SpanLink`](SpanLink.md)[]

Defined in: [types/span.ts:221](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L221)

Links to related spans
