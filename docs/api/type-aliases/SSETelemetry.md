[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSETelemetry

# Type Alias: SSETelemetry

> **SSETelemetry** = `object`

Defined in: [types/proxy.ts:2430](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2430)

Aggregated telemetry resolved when an SSE stream completes.

## Properties

### messageId

> **messageId**: `string`

Defined in: [types/proxy.ts:2431](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2431)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2432](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2432)

---

### usage

> **usage**: `object`

Defined in: [types/proxy.ts:2433](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2433)

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

Defined in: [types/proxy.ts:2440](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2440)

---

### stopReason

> **stopReason**: `string` \| `null`

Defined in: [types/proxy.ts:2441](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2441)

---

### stopSequence

> **stopSequence**: `string` \| `null`

Defined in: [types/proxy.ts:2442](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2442)

---

### eventCount

> **eventCount**: `number`

Defined in: [types/proxy.ts:2443](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2443)

---

### streamDurationMs

> **streamDurationMs**: `number`

Defined in: [types/proxy.ts:2444](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2444)

---

### totalBytesReceived

> **totalBytesReceived**: `number`

Defined in: [types/proxy.ts:2445](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2445)

---

### events

> **events**: `object`[]

Defined in: [types/proxy.ts:2446](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2446)

#### type

> **type**: `string`

#### timestamp

> **timestamp**: `number`

#### data

> **data**: `string`

---

### streamErrorMessage?

> `optional` **streamErrorMessage?**: `string`

Defined in: [types/proxy.ts:2448](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2448)

Error carried as a terminal SSE `event: error`, if one was observed.

---

### rawText?

> `optional` **rawText?**: `string`

Defined in: [types/proxy.ts:2449](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2449)
