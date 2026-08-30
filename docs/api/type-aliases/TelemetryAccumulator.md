[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TelemetryAccumulator

# Type Alias: TelemetryAccumulator

> **TelemetryAccumulator** = `object`

Defined in: [types/proxy.ts:2424](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2424)

Mutable accumulator the SSE interceptor uses internally.

## Properties

### messageId

> **messageId**: `string`

Defined in: [types/proxy.ts:2425](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2425)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2426](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2426)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/proxy.ts:2427](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2427)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/proxy.ts:2428](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2428)

---

### cacheCreationInputTokens

> **cacheCreationInputTokens**: `number`

Defined in: [types/proxy.ts:2429](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2429)

---

### cacheReadInputTokens

> **cacheReadInputTokens**: `number`

Defined in: [types/proxy.ts:2430](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2430)

---

### contentBlocks

> **contentBlocks**: [`SSEContentBlock`](SSEContentBlock.md)[]

Defined in: [types/proxy.ts:2431](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2431)

---

### blockByteCounts

> **blockByteCounts**: `Map`\<`number`, `number`\>

Defined in: [types/proxy.ts:2432](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2432)

---

### stopReason

> **stopReason**: `string` \| `null`

Defined in: [types/proxy.ts:2433](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2433)

---

### stopSequence

> **stopSequence**: `string` \| `null`

Defined in: [types/proxy.ts:2434](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2434)

---

### eventCount

> **eventCount**: `number`

Defined in: [types/proxy.ts:2435](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2435)

---

### startTime

> **startTime**: `number`

Defined in: [types/proxy.ts:2436](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2436)

---

### totalBytesReceived

> **totalBytesReceived**: `number`

Defined in: [types/proxy.ts:2437](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2437)

---

### events

> **events**: `object`[]

Defined in: [types/proxy.ts:2438](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2438)

#### type

> **type**: `string`

#### timestamp

> **timestamp**: `number`

#### data

> **data**: `string`

---

### rawTextChunks?

> `optional` **rawTextChunks?**: `string`[]

Defined in: [types/proxy.ts:2439](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2439)

---

### rawTextBytes

> **rawTextBytes**: `number`

Defined in: [types/proxy.ts:2440](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2440)

---

### rawTextTruncated

> **rawTextTruncated**: `boolean`

Defined in: [types/proxy.ts:2441](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2441)

---

### eventLogTruncated

> **eventLogTruncated**: `boolean`

Defined in: [types/proxy.ts:2442](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2442)

---

### streamErrorMessage?

> `optional` **streamErrorMessage?**: `string`

Defined in: [types/proxy.ts:2443](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2443)
