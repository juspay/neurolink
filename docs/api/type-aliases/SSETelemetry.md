[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSETelemetry

# Type Alias: SSETelemetry

> **SSETelemetry** = `object`

Defined in: [types/proxy.ts:3079](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3079)

Aggregated telemetry resolved when an SSE stream completes.

## Properties

### messageStopReceived

> **messageStopReceived**: `boolean`

Defined in: [types/proxy.ts:3080](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3080)

---

### firstUsefulOutputAt?

> `optional` **firstUsefulOutputAt?**: `number`

Defined in: [types/proxy.ts:3081](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3081)

---

### firstUsefulOutputEvent?

> `optional` **firstUsefulOutputEvent?**: `string`

Defined in: [types/proxy.ts:3082](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3082)

---

### observationIncomplete?

> `optional` **observationIncomplete?**: `boolean`

Defined in: [types/proxy.ts:3083](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3083)

---

### messageId

> **messageId**: `string`

Defined in: [types/proxy.ts:3084](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3084)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3085](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3085)

---

### usage

> **usage**: `object`

Defined in: [types/proxy.ts:3086](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3086)

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

Defined in: [types/proxy.ts:3093](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3093)

---

### stopReason

> **stopReason**: `string` \| `null`

Defined in: [types/proxy.ts:3094](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3094)

---

### stopSequence

> **stopSequence**: `string` \| `null`

Defined in: [types/proxy.ts:3095](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3095)

---

### eventCount

> **eventCount**: `number`

Defined in: [types/proxy.ts:3096](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3096)

---

### streamDurationMs

> **streamDurationMs**: `number`

Defined in: [types/proxy.ts:3097](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3097)

---

### totalBytesReceived

> **totalBytesReceived**: `number`

Defined in: [types/proxy.ts:3098](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3098)

---

### events

> **events**: `object`[]

Defined in: [types/proxy.ts:3099](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3099)

#### type

> **type**: `string`

#### timestamp

> **timestamp**: `number`

#### data

> **data**: `string`

---

### streamErrorMessage?

> `optional` **streamErrorMessage?**: `string`

Defined in: [types/proxy.ts:3101](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3101)

Error carried as a terminal SSE `event: error`, if one was observed.

---

### rawText?

> `optional` **rawText?**: `string`

Defined in: [types/proxy.ts:3102](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3102)

---

### rawTextTruncated?

> `optional` **rawTextTruncated?**: `boolean`

Defined in: [types/proxy.ts:3103](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3103)
