[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSETelemetry

# Type Alias: SSETelemetry

> **SSETelemetry** = `object`

Defined in: [types/proxy.ts:3069](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3069)

Aggregated telemetry resolved when an SSE stream completes.

## Properties

### messageStopReceived

> **messageStopReceived**: `boolean`

Defined in: [types/proxy.ts:3070](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3070)

---

### firstUsefulOutputAt?

> `optional` **firstUsefulOutputAt?**: `number`

Defined in: [types/proxy.ts:3071](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3071)

---

### firstUsefulOutputEvent?

> `optional` **firstUsefulOutputEvent?**: `string`

Defined in: [types/proxy.ts:3072](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3072)

---

### observationIncomplete?

> `optional` **observationIncomplete?**: `boolean`

Defined in: [types/proxy.ts:3073](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3073)

---

### messageId

> **messageId**: `string`

Defined in: [types/proxy.ts:3074](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3074)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3075](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3075)

---

### usage

> **usage**: `object`

Defined in: [types/proxy.ts:3076](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3076)

#### inputTokens

> **inputTokens**: `number`

#### outputTokens

> **outputTokens**: `number`

#### cacheCreationInputTokens

> **cacheCreationInputTokens**: `number`

#### cacheReadInputTokens

> **cacheReadInputTokens**: `number`

#### totalTokens

> **totalTokens**: `number`

---

### contentBlocks

> **contentBlocks**: [`SSEContentBlock`](SSEContentBlock.md)[]

Defined in: [types/proxy.ts:3083](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3083)

---

### stopReason

> **stopReason**: `string` \| `null`

Defined in: [types/proxy.ts:3084](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3084)

---

### stopSequence

> **stopSequence**: `string` \| `null`

Defined in: [types/proxy.ts:3085](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3085)

---

### eventCount

> **eventCount**: `number`

Defined in: [types/proxy.ts:3086](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3086)

---

### streamDurationMs

> **streamDurationMs**: `number`

Defined in: [types/proxy.ts:3087](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3087)

---

### totalBytesReceived

> **totalBytesReceived**: `number`

Defined in: [types/proxy.ts:3088](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3088)

---

### events

> **events**: `object`[]

Defined in: [types/proxy.ts:3089](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3089)

#### type

> **type**: `string`

#### timestamp

> **timestamp**: `number`

#### data

> **data**: `string`

---

### streamErrorMessage?

> `optional` **streamErrorMessage?**: `string`

Defined in: [types/proxy.ts:3091](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3091)

Error carried as a terminal SSE `event: error`, if one was observed.

---

### rawText?

> `optional` **rawText?**: `string`

Defined in: [types/proxy.ts:3092](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3092)

---

### rawTextTruncated?

> `optional` **rawTextTruncated?**: `boolean`

Defined in: [types/proxy.ts:3093](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3093)
