[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSETelemetry

# Type Alias: SSETelemetry

> **SSETelemetry** = `object`

Defined in: [types/proxy.ts:2714](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2714)

Aggregated telemetry resolved when an SSE stream completes.

## Properties

### messageStopReceived

> **messageStopReceived**: `boolean`

Defined in: [types/proxy.ts:2715](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2715)

---

### firstUsefulOutputAt?

> `optional` **firstUsefulOutputAt?**: `number`

Defined in: [types/proxy.ts:2716](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2716)

---

### messageId

> **messageId**: `string`

Defined in: [types/proxy.ts:2717](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2717)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2718](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2718)

---

### usage

> **usage**: `object`

Defined in: [types/proxy.ts:2719](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2719)

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

Defined in: [types/proxy.ts:2726](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2726)

---

### stopReason

> **stopReason**: `string` \| `null`

Defined in: [types/proxy.ts:2727](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2727)

---

### stopSequence

> **stopSequence**: `string` \| `null`

Defined in: [types/proxy.ts:2728](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2728)

---

### eventCount

> **eventCount**: `number`

Defined in: [types/proxy.ts:2729](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2729)

---

### streamDurationMs

> **streamDurationMs**: `number`

Defined in: [types/proxy.ts:2730](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2730)

---

### totalBytesReceived

> **totalBytesReceived**: `number`

Defined in: [types/proxy.ts:2731](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2731)

---

### events

> **events**: `object`[]

Defined in: [types/proxy.ts:2732](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2732)

#### type

> **type**: `string`

#### timestamp

> **timestamp**: `number`

#### data

> **data**: `string`

---

### streamErrorMessage?

> `optional` **streamErrorMessage?**: `string`

Defined in: [types/proxy.ts:2734](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2734)

Error carried as a terminal SSE `event: error`, if one was observed.

---

### rawText?

> `optional` **rawText?**: `string`

Defined in: [types/proxy.ts:2735](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2735)
