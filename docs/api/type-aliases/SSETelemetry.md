[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSETelemetry

# Type Alias: SSETelemetry

> **SSETelemetry** = `object`

Defined in: [types/proxy.ts:3017](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3017)

Aggregated telemetry resolved when an SSE stream completes.

## Properties

### messageStopReceived

> **messageStopReceived**: `boolean`

Defined in: [types/proxy.ts:3018](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3018)

---

### firstUsefulOutputAt?

> `optional` **firstUsefulOutputAt?**: `number`

Defined in: [types/proxy.ts:3019](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3019)

---

### firstUsefulOutputEvent?

> `optional` **firstUsefulOutputEvent?**: `string`

Defined in: [types/proxy.ts:3020](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3020)

---

### observationIncomplete?

> `optional` **observationIncomplete?**: `boolean`

Defined in: [types/proxy.ts:3021](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3021)

---

### messageId

> **messageId**: `string`

Defined in: [types/proxy.ts:3022](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3022)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3023](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3023)

---

### usage

> **usage**: `object`

Defined in: [types/proxy.ts:3024](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3024)

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

Defined in: [types/proxy.ts:3031](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3031)

---

### stopReason

> **stopReason**: `string` \| `null`

Defined in: [types/proxy.ts:3032](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3032)

---

### stopSequence

> **stopSequence**: `string` \| `null`

Defined in: [types/proxy.ts:3033](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3033)

---

### eventCount

> **eventCount**: `number`

Defined in: [types/proxy.ts:3034](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3034)

---

### streamDurationMs

> **streamDurationMs**: `number`

Defined in: [types/proxy.ts:3035](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3035)

---

### totalBytesReceived

> **totalBytesReceived**: `number`

Defined in: [types/proxy.ts:3036](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3036)

---

### events

> **events**: `object`[]

Defined in: [types/proxy.ts:3037](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3037)

#### type

> **type**: `string`

#### timestamp

> **timestamp**: `number`

#### data

> **data**: `string`

---

### streamErrorMessage?

> `optional` **streamErrorMessage?**: `string`

Defined in: [types/proxy.ts:3039](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3039)

Error carried as a terminal SSE `event: error`, if one was observed.

---

### rawText?

> `optional` **rawText?**: `string`

Defined in: [types/proxy.ts:3040](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3040)

---

### rawTextTruncated?

> `optional` **rawTextTruncated?**: `boolean`

Defined in: [types/proxy.ts:3041](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3041)
