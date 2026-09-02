[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSETelemetry

# Type Alias: SSETelemetry

> **SSETelemetry** = `object`

Defined in: [types/proxy.ts:2409](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2409)

Aggregated telemetry resolved when an SSE stream completes.

## Properties

### messageId

> **messageId**: `string`

Defined in: [types/proxy.ts:2410](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2410)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2411](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2411)

---

### usage

> **usage**: `object`

Defined in: [types/proxy.ts:2412](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2412)

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

Defined in: [types/proxy.ts:2419](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2419)

---

### stopReason

> **stopReason**: `string` \| `null`

Defined in: [types/proxy.ts:2420](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2420)

---

### stopSequence

> **stopSequence**: `string` \| `null`

Defined in: [types/proxy.ts:2421](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2421)

---

### eventCount

> **eventCount**: `number`

Defined in: [types/proxy.ts:2422](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2422)

---

### streamDurationMs

> **streamDurationMs**: `number`

Defined in: [types/proxy.ts:2423](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2423)

---

### totalBytesReceived

> **totalBytesReceived**: `number`

Defined in: [types/proxy.ts:2424](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2424)

---

### events

> **events**: `object`[]

Defined in: [types/proxy.ts:2425](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2425)

#### type

> **type**: `string`

#### timestamp

> **timestamp**: `number`

#### data

> **data**: `string`

---

### streamErrorMessage?

> `optional` **streamErrorMessage?**: `string`

Defined in: [types/proxy.ts:2427](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2427)

Error carried as a terminal SSE `event: error`, if one was observed.

---

### rawText?

> `optional` **rawText?**: `string`

Defined in: [types/proxy.ts:2428](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2428)
