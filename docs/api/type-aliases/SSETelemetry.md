[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSETelemetry

# Type Alias: SSETelemetry

> **SSETelemetry** = `object`

Defined in: [types/proxy.ts:3019](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3019)

Aggregated telemetry resolved when an SSE stream completes.

## Properties

### messageStopReceived

> **messageStopReceived**: `boolean`

Defined in: [types/proxy.ts:3020](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3020)

---

### firstUsefulOutputAt?

> `optional` **firstUsefulOutputAt?**: `number`

Defined in: [types/proxy.ts:3021](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3021)

---

### firstUsefulOutputEvent?

> `optional` **firstUsefulOutputEvent?**: `string`

Defined in: [types/proxy.ts:3022](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3022)

---

### observationIncomplete?

> `optional` **observationIncomplete?**: `boolean`

Defined in: [types/proxy.ts:3023](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3023)

---

### messageId

> **messageId**: `string`

Defined in: [types/proxy.ts:3024](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3024)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3025](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3025)

---

### usage

> **usage**: `object`

Defined in: [types/proxy.ts:3026](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3026)

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

Defined in: [types/proxy.ts:3033](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3033)

---

### stopReason

> **stopReason**: `string` \| `null`

Defined in: [types/proxy.ts:3034](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3034)

---

### stopSequence

> **stopSequence**: `string` \| `null`

Defined in: [types/proxy.ts:3035](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3035)

---

### eventCount

> **eventCount**: `number`

Defined in: [types/proxy.ts:3036](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3036)

---

### streamDurationMs

> **streamDurationMs**: `number`

Defined in: [types/proxy.ts:3037](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3037)

---

### totalBytesReceived

> **totalBytesReceived**: `number`

Defined in: [types/proxy.ts:3038](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3038)

---

### events

> **events**: `object`[]

Defined in: [types/proxy.ts:3039](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3039)

#### type

> **type**: `string`

#### timestamp

> **timestamp**: `number`

#### data

> **data**: `string`

---

### streamErrorMessage?

> `optional` **streamErrorMessage?**: `string`

Defined in: [types/proxy.ts:3041](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3041)

Error carried as a terminal SSE `event: error`, if one was observed.

---

### rawText?

> `optional` **rawText?**: `string`

Defined in: [types/proxy.ts:3042](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3042)

---

### rawTextTruncated?

> `optional` **rawTextTruncated?**: `boolean`

Defined in: [types/proxy.ts:3043](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3043)
