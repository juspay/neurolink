[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TelemetryAccumulator

# Type Alias: TelemetryAccumulator

> **TelemetryAccumulator** = `object`

Defined in: [types/proxy.ts:2347](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2347)

Mutable accumulator the SSE interceptor uses internally.

## Properties

### messageId

> **messageId**: `string`

Defined in: [types/proxy.ts:2348](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2348)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2349](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2349)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/proxy.ts:2350](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2350)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/proxy.ts:2351](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2351)

---

### cacheCreationInputTokens

> **cacheCreationInputTokens**: `number`

Defined in: [types/proxy.ts:2352](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2352)

---

### cacheReadInputTokens

> **cacheReadInputTokens**: `number`

Defined in: [types/proxy.ts:2353](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2353)

---

### contentBlocks

> **contentBlocks**: [`SSEContentBlock`](SSEContentBlock.md)[]

Defined in: [types/proxy.ts:2354](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2354)

---

### blockByteCounts

> **blockByteCounts**: `Map`\<`number`, `number`\>

Defined in: [types/proxy.ts:2355](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2355)

---

### stopReason

> **stopReason**: `string` \| `null`

Defined in: [types/proxy.ts:2356](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2356)

---

### stopSequence

> **stopSequence**: `string` \| `null`

Defined in: [types/proxy.ts:2357](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2357)

---

### eventCount

> **eventCount**: `number`

Defined in: [types/proxy.ts:2358](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2358)

---

### startTime

> **startTime**: `number`

Defined in: [types/proxy.ts:2359](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2359)

---

### totalBytesReceived

> **totalBytesReceived**: `number`

Defined in: [types/proxy.ts:2360](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2360)

---

### events

> **events**: `object`[]

Defined in: [types/proxy.ts:2361](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2361)

#### type

> **type**: `string`

#### timestamp

> **timestamp**: `number`

#### data

> **data**: `string`

---

### rawTextChunks?

> `optional` **rawTextChunks?**: `string`[]

Defined in: [types/proxy.ts:2362](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2362)

---

### rawTextBytes

> **rawTextBytes**: `number`

Defined in: [types/proxy.ts:2363](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2363)

---

### rawTextTruncated

> **rawTextTruncated**: `boolean`

Defined in: [types/proxy.ts:2364](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2364)

---

### eventLogTruncated

> **eventLogTruncated**: `boolean`

Defined in: [types/proxy.ts:2365](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2365)

---

### streamErrorMessage?

> `optional` **streamErrorMessage?**: `string`

Defined in: [types/proxy.ts:2366](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2366)
