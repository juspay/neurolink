[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSETelemetry

# Type Alias: SSETelemetry

> **SSETelemetry** = `object`

Defined in: [types/proxy.ts:2949](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2949)

Aggregated telemetry resolved when an SSE stream completes.

## Properties

### messageStopReceived

> **messageStopReceived**: `boolean`

Defined in: [types/proxy.ts:2950](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2950)

---

### firstUsefulOutputAt?

> `optional` **firstUsefulOutputAt?**: `number`

Defined in: [types/proxy.ts:2951](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2951)

---

### firstUsefulOutputEvent?

> `optional` **firstUsefulOutputEvent?**: `string`

Defined in: [types/proxy.ts:2952](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2952)

---

### observationIncomplete?

> `optional` **observationIncomplete?**: `boolean`

Defined in: [types/proxy.ts:2953](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2953)

---

### messageId

> **messageId**: `string`

Defined in: [types/proxy.ts:2954](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2954)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2955](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2955)

---

### usage

> **usage**: `object`

Defined in: [types/proxy.ts:2956](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2956)

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

Defined in: [types/proxy.ts:2963](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2963)

---

### stopReason

> **stopReason**: `string` \| `null`

Defined in: [types/proxy.ts:2964](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2964)

---

### stopSequence

> **stopSequence**: `string` \| `null`

Defined in: [types/proxy.ts:2965](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2965)

---

### eventCount

> **eventCount**: `number`

Defined in: [types/proxy.ts:2966](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2966)

---

### streamDurationMs

> **streamDurationMs**: `number`

Defined in: [types/proxy.ts:2967](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2967)

---

### totalBytesReceived

> **totalBytesReceived**: `number`

Defined in: [types/proxy.ts:2968](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2968)

---

### events

> **events**: `object`[]

Defined in: [types/proxy.ts:2969](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2969)

#### type

> **type**: `string`

#### timestamp

> **timestamp**: `number`

#### data

> **data**: `string`

---

### streamErrorMessage?

> `optional` **streamErrorMessage?**: `string`

Defined in: [types/proxy.ts:2971](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2971)

Error carried as a terminal SSE `event: error`, if one was observed.

---

### rawText?

> `optional` **rawText?**: `string`

Defined in: [types/proxy.ts:2972](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2972)

---

### rawTextTruncated?

> `optional` **rawTextTruncated?**: `boolean`

Defined in: [types/proxy.ts:2973](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2973)
