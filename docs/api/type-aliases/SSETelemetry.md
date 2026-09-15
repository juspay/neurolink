[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSETelemetry

# Type Alias: SSETelemetry

> **SSETelemetry** = `object`

Defined in: [types/proxy.ts:2723](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2723)

Aggregated telemetry resolved when an SSE stream completes.

## Properties

### messageStopReceived

> **messageStopReceived**: `boolean`

Defined in: [types/proxy.ts:2724](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2724)

---

### firstUsefulOutputAt?

> `optional` **firstUsefulOutputAt?**: `number`

Defined in: [types/proxy.ts:2725](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2725)

---

### firstUsefulOutputEvent?

> `optional` **firstUsefulOutputEvent?**: `string`

Defined in: [types/proxy.ts:2726](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2726)

---

### observationIncomplete?

> `optional` **observationIncomplete?**: `boolean`

Defined in: [types/proxy.ts:2727](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2727)

---

### messageId

> **messageId**: `string`

Defined in: [types/proxy.ts:2728](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2728)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2729](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2729)

---

### usage

> **usage**: `object`

Defined in: [types/proxy.ts:2730](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2730)

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

Defined in: [types/proxy.ts:2737](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2737)

---

### stopReason

> **stopReason**: `string` \| `null`

Defined in: [types/proxy.ts:2738](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2738)

---

### stopSequence

> **stopSequence**: `string` \| `null`

Defined in: [types/proxy.ts:2739](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2739)

---

### eventCount

> **eventCount**: `number`

Defined in: [types/proxy.ts:2740](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2740)

---

### streamDurationMs

> **streamDurationMs**: `number`

Defined in: [types/proxy.ts:2741](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2741)

---

### totalBytesReceived

> **totalBytesReceived**: `number`

Defined in: [types/proxy.ts:2742](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2742)

---

### events

> **events**: `object`[]

Defined in: [types/proxy.ts:2743](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2743)

#### type

> **type**: `string`

#### timestamp

> **timestamp**: `number`

#### data

> **data**: `string`

---

### streamErrorMessage?

> `optional` **streamErrorMessage?**: `string`

Defined in: [types/proxy.ts:2745](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2745)

Error carried as a terminal SSE `event: error`, if one was observed.

---

### rawText?

> `optional` **rawText?**: `string`

Defined in: [types/proxy.ts:2746](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2746)

---

### rawTextTruncated?

> `optional` **rawTextTruncated?**: `boolean`

Defined in: [types/proxy.ts:2747](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2747)
