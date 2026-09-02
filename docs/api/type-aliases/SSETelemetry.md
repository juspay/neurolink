[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSETelemetry

# Type Alias: SSETelemetry

> **SSETelemetry** = `object`

Defined in: [types/proxy.ts:2418](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2418)

Aggregated telemetry resolved when an SSE stream completes.

## Properties

### messageId

> **messageId**: `string`

Defined in: [types/proxy.ts:2419](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2419)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2420](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2420)

---

### usage

> **usage**: `object`

Defined in: [types/proxy.ts:2421](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2421)

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

Defined in: [types/proxy.ts:2428](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2428)

---

### stopReason

> **stopReason**: `string` \| `null`

Defined in: [types/proxy.ts:2429](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2429)

---

### stopSequence

> **stopSequence**: `string` \| `null`

Defined in: [types/proxy.ts:2430](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2430)

---

### eventCount

> **eventCount**: `number`

Defined in: [types/proxy.ts:2431](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2431)

---

### streamDurationMs

> **streamDurationMs**: `number`

Defined in: [types/proxy.ts:2432](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2432)

---

### totalBytesReceived

> **totalBytesReceived**: `number`

Defined in: [types/proxy.ts:2433](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2433)

---

### events

> **events**: `object`[]

Defined in: [types/proxy.ts:2434](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2434)

#### type

> **type**: `string`

#### timestamp

> **timestamp**: `number`

#### data

> **data**: `string`

---

### streamErrorMessage?

> `optional` **streamErrorMessage?**: `string`

Defined in: [types/proxy.ts:2436](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2436)

Error carried as a terminal SSE `event: error`, if one was observed.

---

### rawText?

> `optional` **rawText?**: `string`

Defined in: [types/proxy.ts:2437](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2437)
