[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OtlpSpan

# Type Alias: OtlpSpan

> **OtlpSpan** = `object`

## Description

An OTLP/JSON span as Langfuse's ingestion endpoint reads it.

## Properties

### traceId

> **traceId**: `string`

---

### spanId

> **spanId**: `string`

---

### parentSpanId?

> `optional` **parentSpanId?**: `string`

---

### name

> **name**: `string`

---

### kind

> **kind**: `number`

---

### startTimeUnixNano

> **startTimeUnixNano**: `string`

---

### endTimeUnixNano

> **endTimeUnixNano**: `string`

---

### attributes

> **attributes**: [`OtlpKeyValue`](OtlpKeyValue.md)[]

---

### events

> **events**: `object`[]

#### name

> **name**: `string`

#### timeUnixNano

> **timeUnixNano**: `string`

#### attributes

> **attributes**: [`OtlpKeyValue`](OtlpKeyValue.md)[]

---

### links?

> `optional` **links?**: [`OtlpLink`](OtlpLink.md)[]

---

### status

> **status**: `object`

#### code

> **code**: `number`

#### message?

> `optional` **message?**: `string`
