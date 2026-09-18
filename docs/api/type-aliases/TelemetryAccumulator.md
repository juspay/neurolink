[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TelemetryAccumulator

# Type Alias: TelemetryAccumulator

> **TelemetryAccumulator** = `object`

Defined in: [types/proxy.ts:2790](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2790)

Mutable accumulator the SSE interceptor uses internally.

## Properties

### messageStopReceived

> **messageStopReceived**: `boolean`

Defined in: [types/proxy.ts:2791](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2791)

---

### firstUsefulOutputAt?

> `optional` **firstUsefulOutputAt?**: `number`

Defined in: [types/proxy.ts:2792](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2792)

---

### firstUsefulOutputEvent?

> `optional` **firstUsefulOutputEvent?**: `string`

Defined in: [types/proxy.ts:2793](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2793)

---

### observationIncomplete?

> `optional` **observationIncomplete?**: `boolean`

Defined in: [types/proxy.ts:2794](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2794)

---

### messageId

> **messageId**: `string`

Defined in: [types/proxy.ts:2795](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2795)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2796](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2796)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/proxy.ts:2797](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2797)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/proxy.ts:2798](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2798)

---

### cacheCreationInputTokens

> **cacheCreationInputTokens**: `number`

Defined in: [types/proxy.ts:2799](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2799)

---

### cacheReadInputTokens

> **cacheReadInputTokens**: `number`

Defined in: [types/proxy.ts:2800](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2800)

---

### contentBlocks

> **contentBlocks**: [`SSEContentBlock`](SSEContentBlock.md)[]

Defined in: [types/proxy.ts:2801](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2801)

---

### blockByteCounts

> **blockByteCounts**: `Map`\<`number`, `number`\>

Defined in: [types/proxy.ts:2802](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2802)

---

### stopReason

> **stopReason**: `string` \| `null`

Defined in: [types/proxy.ts:2803](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2803)

---

### stopSequence

> **stopSequence**: `string` \| `null`

Defined in: [types/proxy.ts:2804](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2804)

---

### eventCount

> **eventCount**: `number`

Defined in: [types/proxy.ts:2805](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2805)

---

### startTime

> **startTime**: `number`

Defined in: [types/proxy.ts:2806](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2806)

---

### totalBytesReceived

> **totalBytesReceived**: `number`

Defined in: [types/proxy.ts:2807](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2807)

---

### events

> **events**: `object`[]

Defined in: [types/proxy.ts:2808](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2808)

#### type

> **type**: `string`

#### timestamp

> **timestamp**: `number`

#### data

> **data**: `string`

---

### rawTextChunks?

> `optional` **rawTextChunks?**: `string`[]

Defined in: [types/proxy.ts:2809](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2809)

---

### rawTextBytes

> **rawTextBytes**: `number`

Defined in: [types/proxy.ts:2810](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2810)

---

### rawTextTruncated

> **rawTextTruncated**: `boolean`

Defined in: [types/proxy.ts:2811](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2811)

---

### eventLogTruncated

> **eventLogTruncated**: `boolean`

Defined in: [types/proxy.ts:2812](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2812)

---

### streamErrorMessage?

> `optional` **streamErrorMessage?**: `string`

Defined in: [types/proxy.ts:2813](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2813)
