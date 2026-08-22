[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSETelemetry

# Type Alias: SSETelemetry

> **SSETelemetry** = `object`

Defined in: [types/proxy.ts:2310](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2310)

Aggregated telemetry resolved when an SSE stream completes.

## Properties

### messageId

> **messageId**: `string`

Defined in: [types/proxy.ts:2311](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2311)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2312](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2312)

---

### usage

> **usage**: `object`

Defined in: [types/proxy.ts:2313](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2313)

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

Defined in: [types/proxy.ts:2320](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2320)

---

### stopReason

> **stopReason**: `string` \| `null`

Defined in: [types/proxy.ts:2321](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2321)

---

### stopSequence

> **stopSequence**: `string` \| `null`

Defined in: [types/proxy.ts:2322](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2322)

---

### eventCount

> **eventCount**: `number`

Defined in: [types/proxy.ts:2323](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2323)

---

### streamDurationMs

> **streamDurationMs**: `number`

Defined in: [types/proxy.ts:2324](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2324)

---

### totalBytesReceived

> **totalBytesReceived**: `number`

Defined in: [types/proxy.ts:2325](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2325)

---

### events

> **events**: `object`[]

Defined in: [types/proxy.ts:2326](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2326)

#### type

> **type**: `string`

#### timestamp

> **timestamp**: `number`

#### data

> **data**: `string`

---

### streamErrorMessage?

> `optional` **streamErrorMessage?**: `string`

Defined in: [types/proxy.ts:2328](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2328)

Error carried as a terminal SSE `event: error`, if one was observed.

---

### rawText?

> `optional` **rawText?**: `string`

Defined in: [types/proxy.ts:2329](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2329)
