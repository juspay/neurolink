[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TelemetryAccumulator

# Type Alias: TelemetryAccumulator

> **TelemetryAccumulator** = `object`

Defined in: [types/proxy.ts:2991](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2991)

Mutable accumulator the SSE interceptor uses internally.

## Properties

### messageStopReceived

> **messageStopReceived**: `boolean`

Defined in: [types/proxy.ts:2992](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2992)

---

### firstUsefulOutputAt?

> `optional` **firstUsefulOutputAt?**: `number`

Defined in: [types/proxy.ts:2993](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2993)

---

### firstUsefulOutputEvent?

> `optional` **firstUsefulOutputEvent?**: `string`

Defined in: [types/proxy.ts:2994](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2994)

---

### observationIncomplete?

> `optional` **observationIncomplete?**: `boolean`

Defined in: [types/proxy.ts:2995](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2995)

---

### messageId

> **messageId**: `string`

Defined in: [types/proxy.ts:2996](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2996)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2997](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2997)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/proxy.ts:2998](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2998)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/proxy.ts:2999](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2999)

---

### cacheCreationInputTokens

> **cacheCreationInputTokens**: `number`

Defined in: [types/proxy.ts:3000](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3000)

---

### cacheReadInputTokens

> **cacheReadInputTokens**: `number`

Defined in: [types/proxy.ts:3001](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3001)

---

### contentBlocks

> **contentBlocks**: [`SSEContentBlock`](SSEContentBlock.md)[]

Defined in: [types/proxy.ts:3002](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3002)

---

### blockByteCounts

> **blockByteCounts**: `Map`\<`number`, `number`\>

Defined in: [types/proxy.ts:3003](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3003)

---

### stopReason

> **stopReason**: `string` \| `null`

Defined in: [types/proxy.ts:3004](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3004)

---

### stopSequence

> **stopSequence**: `string` \| `null`

Defined in: [types/proxy.ts:3005](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3005)

---

### eventCount

> **eventCount**: `number`

Defined in: [types/proxy.ts:3006](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3006)

---

### startTime

> **startTime**: `number`

Defined in: [types/proxy.ts:3007](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3007)

---

### totalBytesReceived

> **totalBytesReceived**: `number`

Defined in: [types/proxy.ts:3008](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3008)

---

### events

> **events**: `object`[]

Defined in: [types/proxy.ts:3009](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3009)

#### type

> **type**: `string`

#### timestamp

> **timestamp**: `number`

#### data

> **data**: `string`

---

### rawTextChunks?

> `optional` **rawTextChunks?**: `string`[]

Defined in: [types/proxy.ts:3010](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3010)

---

### rawTextBytes

> **rawTextBytes**: `number`

Defined in: [types/proxy.ts:3011](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3011)

---

### rawTextTruncated

> **rawTextTruncated**: `boolean`

Defined in: [types/proxy.ts:3012](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3012)

---

### eventLogTruncated

> **eventLogTruncated**: `boolean`

Defined in: [types/proxy.ts:3013](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3013)

---

### streamErrorMessage?

> `optional` **streamErrorMessage?**: `string`

Defined in: [types/proxy.ts:3014](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3014)
