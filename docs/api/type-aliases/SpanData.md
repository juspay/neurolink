[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SpanData

# Type Alias: SpanData

> **SpanData** = `object`

Defined in: [types/span.ts:184](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L184)

Complete span data structure

## Properties

### spanId

> **spanId**: `string`

Defined in: [types/span.ts:186](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L186)

Unique span identifier

---

### traceId

> **traceId**: `string`

Defined in: [types/span.ts:188](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L188)

Trace identifier for distributed tracing

---

### parentSpanId?

> `optional` **parentSpanId?**: `string`

Defined in: [types/span.ts:190](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L190)

Parent span ID for nested operations

---

### type

> **type**: [`SpanType`](../enumerations/SpanType.md)

Defined in: [types/span.ts:192](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L192)

Span type category

---

### name

> **name**: `string`

Defined in: [types/span.ts:194](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L194)

Human-readable span name

---

### startTime

> **startTime**: `string`

Defined in: [types/span.ts:196](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L196)

Start timestamp (ISO 8601)

---

### endTime?

> `optional` **endTime?**: `string`

Defined in: [types/span.ts:198](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L198)

End timestamp (ISO 8601)

---

### durationMs?

> `optional` **durationMs?**: `number`

Defined in: [types/span.ts:200](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L200)

Duration in milliseconds

---

### status

> **status**: [`SpanStatus`](../enumerations/SpanStatus.md)

Defined in: [types/span.ts:202](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L202)

Span status

---

### statusMessage?

> `optional` **statusMessage?**: `string`

Defined in: [types/span.ts:204](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L204)

Status message (for errors)

---

### attributes

> **attributes**: [`SpanAttributes`](SpanAttributes.md)

Defined in: [types/span.ts:206](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L206)

Span attributes/tags

---

### events

> **events**: [`SpanEvent`](SpanEvent.md)[]

Defined in: [types/span.ts:208](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L208)

Events within the span

---

### links

> **links**: [`SpanLink`](SpanLink.md)[]

Defined in: [types/span.ts:210](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L210)

Links to related spans
