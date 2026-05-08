[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / OtelSpan

# Type Alias: OtelSpan

> **OtelSpan** = `object`

Defined in: [types/span.ts:256](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L256)

OpenTelemetry span format

## Properties

### traceId

> **traceId**: `string`

Defined in: [types/span.ts:257](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L257)

---

### spanId

> **spanId**: `string`

Defined in: [types/span.ts:258](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L258)

---

### parentSpanId?

> `optional` **parentSpanId?**: `string`

Defined in: [types/span.ts:259](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L259)

---

### name

> **name**: `string`

Defined in: [types/span.ts:260](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L260)

---

### kind

> **kind**: `number`

Defined in: [types/span.ts:261](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L261)

---

### startTimeUnixNano

> **startTimeUnixNano**: `number`

Defined in: [types/span.ts:262](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L262)

---

### endTimeUnixNano?

> `optional` **endTimeUnixNano?**: `number`

Defined in: [types/span.ts:263](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L263)

---

### attributes

> **attributes**: `object`[]

Defined in: [types/span.ts:264](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L264)

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

Defined in: [types/span.ts:268](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L268)

#### code

> **code**: `number`

#### message?

> `optional` **message?**: `string`

---

### events

> **events**: `object`[]

Defined in: [types/span.ts:272](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/span.ts#L272)

#### name

> **name**: `string`

#### timeUnixNano

> **timeUnixNano**: `number`

#### attributes

> **attributes**: `object`[]
