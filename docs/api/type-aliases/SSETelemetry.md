[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSETelemetry

# Type Alias: SSETelemetry

> **SSETelemetry** = `object`

Defined in: [types/proxy.ts:2952](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2952)

Aggregated telemetry resolved when an SSE stream completes.

## Properties

### messageStopReceived

> **messageStopReceived**: `boolean`

Defined in: [types/proxy.ts:2953](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2953)

---

### firstUsefulOutputAt?

> `optional` **firstUsefulOutputAt?**: `number`

Defined in: [types/proxy.ts:2954](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2954)

---

### firstUsefulOutputEvent?

> `optional` **firstUsefulOutputEvent?**: `string`

Defined in: [types/proxy.ts:2955](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2955)

---

### observationIncomplete?

> `optional` **observationIncomplete?**: `boolean`

Defined in: [types/proxy.ts:2956](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2956)

---

### messageId

> **messageId**: `string`

Defined in: [types/proxy.ts:2957](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2957)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2958](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2958)

---

### usage

> **usage**: `object`

Defined in: [types/proxy.ts:2959](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2959)

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

Defined in: [types/proxy.ts:2966](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2966)

---

### stopReason

> **stopReason**: `string` \| `null`

Defined in: [types/proxy.ts:2967](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2967)

---

### stopSequence

> **stopSequence**: `string` \| `null`

Defined in: [types/proxy.ts:2968](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2968)

---

### eventCount

> **eventCount**: `number`

Defined in: [types/proxy.ts:2969](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2969)

---

### streamDurationMs

> **streamDurationMs**: `number`

Defined in: [types/proxy.ts:2970](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2970)

---

### totalBytesReceived

> **totalBytesReceived**: `number`

Defined in: [types/proxy.ts:2971](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2971)

---

### events

> **events**: `object`[]

Defined in: [types/proxy.ts:2972](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2972)

#### type

> **type**: `string`

#### timestamp

> **timestamp**: `number`

#### data

> **data**: `string`

---

### streamErrorMessage?

> `optional` **streamErrorMessage?**: `string`

Defined in: [types/proxy.ts:2974](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2974)

Error carried as a terminal SSE `event: error`, if one was observed.

---

### rawText?

> `optional` **rawText?**: `string`

Defined in: [types/proxy.ts:2975](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2975)

---

### rawTextTruncated?

> `optional` **rawTextTruncated?**: `boolean`

Defined in: [types/proxy.ts:2976](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2976)
