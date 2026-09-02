[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TelemetryAccumulator

# Type Alias: TelemetryAccumulator

> **TelemetryAccumulator** = `object`

Defined in: [types/proxy.ts:2446](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2446)

Mutable accumulator the SSE interceptor uses internally.

## Properties

### messageId

> **messageId**: `string`

Defined in: [types/proxy.ts:2447](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2447)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2448](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2448)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/proxy.ts:2449](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2449)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/proxy.ts:2450](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2450)

---

### cacheCreationInputTokens

> **cacheCreationInputTokens**: `number`

Defined in: [types/proxy.ts:2451](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2451)

---

### cacheReadInputTokens

> **cacheReadInputTokens**: `number`

Defined in: [types/proxy.ts:2452](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2452)

---

### contentBlocks

> **contentBlocks**: [`SSEContentBlock`](SSEContentBlock.md)[]

Defined in: [types/proxy.ts:2453](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2453)

---

### blockByteCounts

> **blockByteCounts**: `Map`\<`number`, `number`\>

Defined in: [types/proxy.ts:2454](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2454)

---

### stopReason

> **stopReason**: `string` \| `null`

Defined in: [types/proxy.ts:2455](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2455)

---

### stopSequence

> **stopSequence**: `string` \| `null`

Defined in: [types/proxy.ts:2456](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2456)

---

### eventCount

> **eventCount**: `number`

Defined in: [types/proxy.ts:2457](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2457)

---

### startTime

> **startTime**: `number`

Defined in: [types/proxy.ts:2458](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2458)

---

### totalBytesReceived

> **totalBytesReceived**: `number`

Defined in: [types/proxy.ts:2459](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2459)

---

### events

> **events**: `object`[]

Defined in: [types/proxy.ts:2460](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2460)

#### type

> **type**: `string`

#### timestamp

> **timestamp**: `number`

#### data

> **data**: `string`

---

### rawTextChunks?

> `optional` **rawTextChunks?**: `string`[]

Defined in: [types/proxy.ts:2461](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2461)

---

### rawTextBytes

> **rawTextBytes**: `number`

Defined in: [types/proxy.ts:2462](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2462)

---

### rawTextTruncated

> **rawTextTruncated**: `boolean`

Defined in: [types/proxy.ts:2463](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2463)

---

### eventLogTruncated

> **eventLogTruncated**: `boolean`

Defined in: [types/proxy.ts:2464](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2464)

---

### streamErrorMessage?

> `optional` **streamErrorMessage?**: `string`

Defined in: [types/proxy.ts:2465](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2465)
