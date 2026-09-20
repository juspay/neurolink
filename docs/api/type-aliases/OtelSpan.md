[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OtelSpan

# Type Alias: OtelSpan

> **OtelSpan** = `object`

Defined in: [types/span.ts:267](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L267)

OpenTelemetry span format

## Properties

### traceId

> **traceId**: `string`

Defined in: [types/span.ts:268](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L268)

---

### spanId

> **spanId**: `string`

Defined in: [types/span.ts:269](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L269)

---

### parentSpanId?

> `optional` **parentSpanId?**: `string`

Defined in: [types/span.ts:270](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L270)

---

### name

> **name**: `string`

Defined in: [types/span.ts:271](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L271)

---

### kind

> **kind**: `number`

Defined in: [types/span.ts:272](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L272)

---

### startTimeUnixNano

> **startTimeUnixNano**: `number`

Defined in: [types/span.ts:273](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L273)

---

### endTimeUnixNano?

> `optional` **endTimeUnixNano?**: `number`

Defined in: [types/span.ts:274](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L274)

---

### attributes

> **attributes**: `object`[]

Defined in: [types/span.ts:275](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L275)

#### key

> **key**: `string`

#### value

> **value**: `object`

##### value.stringValue?

> `optional` **stringValue?**: `string`

##### value.intValue?

> `optional` **intValue?**: `number`

##### value.boolValue?

> `optional` **boolValue?**: `boolean`

---

### status

> **status**: `object`

Defined in: [types/span.ts:279](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L279)

#### code

> **code**: `number`

#### message?

> `optional` **message?**: `string`

---

### events

> **events**: `object`[]

Defined in: [types/span.ts:283](https://github.com/juspay/neurolink/blob/release/src/lib/types/span.ts#L283)

#### name

> **name**: `string`

#### timeUnixNano

> **timeUnixNano**: `number`

#### attributes

> **attributes**: `object`[]
