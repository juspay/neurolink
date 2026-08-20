[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TelemetryAccumulator

# Type Alias: TelemetryAccumulator

> **TelemetryAccumulator** = `object`

Defined in: [types/proxy.ts:2357](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2357)

Mutable accumulator the SSE interceptor uses internally.

## Properties

### messageId

> **messageId**: `string`

Defined in: [types/proxy.ts:2358](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2358)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2359](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2359)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/proxy.ts:2360](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2360)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/proxy.ts:2361](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2361)

---

### cacheCreationInputTokens

> **cacheCreationInputTokens**: `number`

Defined in: [types/proxy.ts:2362](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2362)

---

### cacheReadInputTokens

> **cacheReadInputTokens**: `number`

Defined in: [types/proxy.ts:2363](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2363)

---

### contentBlocks

> **contentBlocks**: [`SSEContentBlock`](SSEContentBlock.md)[]

Defined in: [types/proxy.ts:2364](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2364)

---

### blockByteCounts

> **blockByteCounts**: `Map`\<`number`, `number`\>

Defined in: [types/proxy.ts:2365](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2365)

---

### stopReason

> **stopReason**: `string` \| `null`

Defined in: [types/proxy.ts:2366](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2366)

---

### stopSequence

> **stopSequence**: `string` \| `null`

Defined in: [types/proxy.ts:2367](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2367)

---

### eventCount

> **eventCount**: `number`

Defined in: [types/proxy.ts:2368](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2368)

---

### startTime

> **startTime**: `number`

Defined in: [types/proxy.ts:2369](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2369)

---

### totalBytesReceived

> **totalBytesReceived**: `number`

Defined in: [types/proxy.ts:2370](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2370)

---

### events

> **events**: `object`[]

Defined in: [types/proxy.ts:2371](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2371)

#### type

> **type**: `string`

#### timestamp

> **timestamp**: `number`

#### data

> **data**: `string`

---

### rawTextChunks?

> `optional` **rawTextChunks?**: `string`[]

Defined in: [types/proxy.ts:2372](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2372)

---

### rawTextBytes

> **rawTextBytes**: `number`

Defined in: [types/proxy.ts:2373](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2373)

---

### rawTextTruncated

> **rawTextTruncated**: `boolean`

Defined in: [types/proxy.ts:2374](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2374)

---

### eventLogTruncated

> **eventLogTruncated**: `boolean`

Defined in: [types/proxy.ts:2375](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2375)

---

### streamErrorMessage?

> `optional` **streamErrorMessage?**: `string`

Defined in: [types/proxy.ts:2376](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2376)
