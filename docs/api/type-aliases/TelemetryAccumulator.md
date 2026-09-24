[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TelemetryAccumulator

# Type Alias: TelemetryAccumulator

> **TelemetryAccumulator** = `object`

Defined in: [types/proxy.ts:2994](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2994)

Mutable accumulator the SSE interceptor uses internally.

## Properties

### messageStopReceived

> **messageStopReceived**: `boolean`

Defined in: [types/proxy.ts:2995](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2995)

---

### firstUsefulOutputAt?

> `optional` **firstUsefulOutputAt?**: `number`

Defined in: [types/proxy.ts:2996](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2996)

---

### firstUsefulOutputEvent?

> `optional` **firstUsefulOutputEvent?**: `string`

Defined in: [types/proxy.ts:2997](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2997)

---

### observationIncomplete?

> `optional` **observationIncomplete?**: `boolean`

Defined in: [types/proxy.ts:2998](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2998)

---

### messageId

> **messageId**: `string`

Defined in: [types/proxy.ts:2999](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2999)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3000](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3000)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/proxy.ts:3001](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3001)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/proxy.ts:3002](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3002)

---

### cacheCreationInputTokens

> **cacheCreationInputTokens**: `number`

Defined in: [types/proxy.ts:3003](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3003)

---

### cacheReadInputTokens

> **cacheReadInputTokens**: `number`

Defined in: [types/proxy.ts:3004](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3004)

---

### contentBlocks

> **contentBlocks**: [`SSEContentBlock`](SSEContentBlock.md)[]

Defined in: [types/proxy.ts:3005](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3005)

---

### blockByteCounts

> **blockByteCounts**: `Map`\<`number`, `number`\>

Defined in: [types/proxy.ts:3006](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3006)

---

### stopReason

> **stopReason**: `string` \| `null`

Defined in: [types/proxy.ts:3007](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3007)

---

### stopSequence

> **stopSequence**: `string` \| `null`

Defined in: [types/proxy.ts:3008](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3008)

---

### eventCount

> **eventCount**: `number`

Defined in: [types/proxy.ts:3009](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3009)

---

### startTime

> **startTime**: `number`

Defined in: [types/proxy.ts:3010](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3010)

---

### totalBytesReceived

> **totalBytesReceived**: `number`

Defined in: [types/proxy.ts:3011](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3011)

---

### events

> **events**: `object`[]

Defined in: [types/proxy.ts:3012](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3012)

#### type

> **type**: `string`

#### timestamp

> **timestamp**: `number`

#### data

> **data**: `string`

---

### rawTextChunks?

> `optional` **rawTextChunks?**: `string`[]

Defined in: [types/proxy.ts:3013](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3013)

---

### rawTextBytes

> **rawTextBytes**: `number`

Defined in: [types/proxy.ts:3014](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3014)

---

### rawTextTruncated

> **rawTextTruncated**: `boolean`

Defined in: [types/proxy.ts:3015](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3015)

---

### eventLogTruncated

> **eventLogTruncated**: `boolean`

Defined in: [types/proxy.ts:3016](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3016)

---

### streamErrorMessage?

> `optional` **streamErrorMessage?**: `string`

Defined in: [types/proxy.ts:3017](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3017)
