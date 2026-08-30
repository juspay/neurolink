[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSETelemetry

# Type Alias: SSETelemetry

> **SSETelemetry** = `object`

Defined in: [types/proxy.ts:2387](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2387)

Aggregated telemetry resolved when an SSE stream completes.

## Properties

### messageId

> **messageId**: `string`

Defined in: [types/proxy.ts:2388](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2388)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2389](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2389)

---

### usage

> **usage**: `object`

Defined in: [types/proxy.ts:2390](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2390)

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

Defined in: [types/proxy.ts:2397](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2397)

---

### stopReason

> **stopReason**: `string` \| `null`

Defined in: [types/proxy.ts:2398](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2398)

---

### stopSequence

> **stopSequence**: `string` \| `null`

Defined in: [types/proxy.ts:2399](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2399)

---

### eventCount

> **eventCount**: `number`

Defined in: [types/proxy.ts:2400](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2400)

---

### streamDurationMs

> **streamDurationMs**: `number`

Defined in: [types/proxy.ts:2401](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2401)

---

### totalBytesReceived

> **totalBytesReceived**: `number`

Defined in: [types/proxy.ts:2402](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2402)

---

### events

> **events**: `object`[]

Defined in: [types/proxy.ts:2403](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2403)

#### type

> **type**: `string`

#### timestamp

> **timestamp**: `number`

#### data

> **data**: `string`

---

### streamErrorMessage?

> `optional` **streamErrorMessage?**: `string`

Defined in: [types/proxy.ts:2405](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2405)

Error carried as a terminal SSE `event: error`, if one was observed.

---

### rawText?

> `optional` **rawText?**: `string`

Defined in: [types/proxy.ts:2406](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2406)
