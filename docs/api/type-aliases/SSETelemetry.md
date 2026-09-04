[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSETelemetry

# Type Alias: SSETelemetry

> **SSETelemetry** = `object`

Defined in: [types/proxy.ts:2424](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2424)

Aggregated telemetry resolved when an SSE stream completes.

## Properties

### messageId

> **messageId**: `string`

Defined in: [types/proxy.ts:2425](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2425)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2426](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2426)

---

### usage

> **usage**: `object`

Defined in: [types/proxy.ts:2427](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2427)

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

Defined in: [types/proxy.ts:2434](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2434)

---

### stopReason

> **stopReason**: `string` \| `null`

Defined in: [types/proxy.ts:2435](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2435)

---

### stopSequence

> **stopSequence**: `string` \| `null`

Defined in: [types/proxy.ts:2436](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2436)

---

### eventCount

> **eventCount**: `number`

Defined in: [types/proxy.ts:2437](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2437)

---

### streamDurationMs

> **streamDurationMs**: `number`

Defined in: [types/proxy.ts:2438](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2438)

---

### totalBytesReceived

> **totalBytesReceived**: `number`

Defined in: [types/proxy.ts:2439](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2439)

---

### events

> **events**: `object`[]

Defined in: [types/proxy.ts:2440](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2440)

#### type

> **type**: `string`

#### timestamp

> **timestamp**: `number`

#### data

> **data**: `string`

---

### streamErrorMessage?

> `optional` **streamErrorMessage?**: `string`

Defined in: [types/proxy.ts:2442](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2442)

Error carried as a terminal SSE `event: error`, if one was observed.

---

### rawText?

> `optional` **rawText?**: `string`

Defined in: [types/proxy.ts:2443](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2443)
