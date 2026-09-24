[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TelemetryAccumulator

# Type Alias: TelemetryAccumulator

> **TelemetryAccumulator** = `object`

Defined in: [types/proxy.ts:3111](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3111)

Mutable accumulator the SSE interceptor uses internally.

## Properties

### messageStopReceived

> **messageStopReceived**: `boolean`

Defined in: [types/proxy.ts:3112](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3112)

---

### firstUsefulOutputAt?

> `optional` **firstUsefulOutputAt?**: `number`

Defined in: [types/proxy.ts:3113](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3113)

---

### firstUsefulOutputEvent?

> `optional` **firstUsefulOutputEvent?**: `string`

Defined in: [types/proxy.ts:3114](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3114)

---

### observationIncomplete?

> `optional` **observationIncomplete?**: `boolean`

Defined in: [types/proxy.ts:3115](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3115)

---

### messageId

> **messageId**: `string`

Defined in: [types/proxy.ts:3116](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3116)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3117](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3117)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/proxy.ts:3118](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3118)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/proxy.ts:3119](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3119)

---

### cacheCreationInputTokens

> **cacheCreationInputTokens**: `number`

Defined in: [types/proxy.ts:3120](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3120)

---

### cacheReadInputTokens

> **cacheReadInputTokens**: `number`

Defined in: [types/proxy.ts:3121](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3121)

---

### contentBlocks

> **contentBlocks**: [`SSEContentBlock`](SSEContentBlock.md)[]

Defined in: [types/proxy.ts:3122](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3122)

---

### blockByteCounts

> **blockByteCounts**: `Map`\<`number`, `number`\>

Defined in: [types/proxy.ts:3123](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3123)

---

### stopReason

> **stopReason**: `string` \| `null`

Defined in: [types/proxy.ts:3124](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3124)

---

### stopSequence

> **stopSequence**: `string` \| `null`

Defined in: [types/proxy.ts:3125](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3125)

---

### eventCount

> **eventCount**: `number`

Defined in: [types/proxy.ts:3126](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3126)

---

### startTime

> **startTime**: `number`

Defined in: [types/proxy.ts:3127](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3127)

---

### totalBytesReceived

> **totalBytesReceived**: `number`

Defined in: [types/proxy.ts:3128](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3128)

---

### events

> **events**: `object`[]

Defined in: [types/proxy.ts:3129](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3129)

#### type

> **type**: `string`

#### timestamp

> **timestamp**: `number`

#### data

> **data**: `string`

---

### rawTextChunks?

> `optional` **rawTextChunks?**: `string`[]

Defined in: [types/proxy.ts:3130](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3130)

---

### rawTextBytes

> **rawTextBytes**: `number`

Defined in: [types/proxy.ts:3131](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3131)

---

### rawTextTruncated

> **rawTextTruncated**: `boolean`

Defined in: [types/proxy.ts:3132](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3132)

---

### eventLogTruncated

> **eventLogTruncated**: `boolean`

Defined in: [types/proxy.ts:3133](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3133)

---

### streamErrorMessage?

> `optional` **streamErrorMessage?**: `string`

Defined in: [types/proxy.ts:3134](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3134)
