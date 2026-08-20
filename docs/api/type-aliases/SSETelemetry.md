[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSETelemetry

# Type Alias: SSETelemetry

> **SSETelemetry** = `object`

Defined in: [types/proxy.ts:2320](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2320)

Aggregated telemetry resolved when an SSE stream completes.

## Properties

### messageId

> **messageId**: `string`

Defined in: [types/proxy.ts:2321](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2321)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2322](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2322)

---

### usage

> **usage**: `object`

Defined in: [types/proxy.ts:2323](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2323)

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

Defined in: [types/proxy.ts:2330](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2330)

---

### stopReason

> **stopReason**: `string` \| `null`

Defined in: [types/proxy.ts:2331](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2331)

---

### stopSequence

> **stopSequence**: `string` \| `null`

Defined in: [types/proxy.ts:2332](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2332)

---

### eventCount

> **eventCount**: `number`

Defined in: [types/proxy.ts:2333](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2333)

---

### streamDurationMs

> **streamDurationMs**: `number`

Defined in: [types/proxy.ts:2334](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2334)

---

### totalBytesReceived

> **totalBytesReceived**: `number`

Defined in: [types/proxy.ts:2335](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2335)

---

### events

> **events**: `object`[]

Defined in: [types/proxy.ts:2336](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2336)

#### type

> **type**: `string`

#### timestamp

> **timestamp**: `number`

#### data

> **data**: `string`

---

### streamErrorMessage?

> `optional` **streamErrorMessage?**: `string`

Defined in: [types/proxy.ts:2338](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2338)

Error carried as a terminal SSE `event: error`, if one was observed.

---

### rawText?

> `optional` **rawText?**: `string`

Defined in: [types/proxy.ts:2339](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2339)
