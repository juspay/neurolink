[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TelemetryAccumulator

# Type Alias: TelemetryAccumulator

> **TelemetryAccumulator** = `object`

Defined in: [types/proxy.ts:2462](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2462)

Mutable accumulator the SSE interceptor uses internally.

## Properties

### messageId

> **messageId**: `string`

Defined in: [types/proxy.ts:2463](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2463)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2464](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2464)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/proxy.ts:2465](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2465)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/proxy.ts:2466](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2466)

---

### cacheCreationInputTokens

> **cacheCreationInputTokens**: `number`

Defined in: [types/proxy.ts:2467](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2467)

---

### cacheReadInputTokens

> **cacheReadInputTokens**: `number`

Defined in: [types/proxy.ts:2468](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2468)

---

### contentBlocks

> **contentBlocks**: [`SSEContentBlock`](SSEContentBlock.md)[]

Defined in: [types/proxy.ts:2469](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2469)

---

### blockByteCounts

> **blockByteCounts**: `Map`\<`number`, `number`\>

Defined in: [types/proxy.ts:2470](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2470)

---

### stopReason

> **stopReason**: `string` \| `null`

Defined in: [types/proxy.ts:2471](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2471)

---

### stopSequence

> **stopSequence**: `string` \| `null`

Defined in: [types/proxy.ts:2472](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2472)

---

### eventCount

> **eventCount**: `number`

Defined in: [types/proxy.ts:2473](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2473)

---

### startTime

> **startTime**: `number`

Defined in: [types/proxy.ts:2474](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2474)

---

### totalBytesReceived

> **totalBytesReceived**: `number`

Defined in: [types/proxy.ts:2475](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2475)

---

### events

> **events**: `object`[]

Defined in: [types/proxy.ts:2476](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2476)

#### type

> **type**: `string`

#### timestamp

> **timestamp**: `number`

#### data

> **data**: `string`

---

### rawTextChunks?

> `optional` **rawTextChunks?**: `string`[]

Defined in: [types/proxy.ts:2477](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2477)

---

### rawTextBytes

> **rawTextBytes**: `number`

Defined in: [types/proxy.ts:2478](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2478)

---

### rawTextTruncated

> **rawTextTruncated**: `boolean`

Defined in: [types/proxy.ts:2479](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2479)

---

### eventLogTruncated

> **eventLogTruncated**: `boolean`

Defined in: [types/proxy.ts:2480](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2480)

---

### streamErrorMessage?

> `optional` **streamErrorMessage?**: `string`

Defined in: [types/proxy.ts:2481](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2481)
