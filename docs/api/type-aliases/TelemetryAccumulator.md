[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TelemetryAccumulator

# Type Alias: TelemetryAccumulator

> **TelemetryAccumulator** = `object`

Defined in: [types/proxy.ts:3059](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3059)

Mutable accumulator the SSE interceptor uses internally.

## Properties

### messageStopReceived

> **messageStopReceived**: `boolean`

Defined in: [types/proxy.ts:3060](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3060)

---

### firstUsefulOutputAt?

> `optional` **firstUsefulOutputAt?**: `number`

Defined in: [types/proxy.ts:3061](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3061)

---

### firstUsefulOutputEvent?

> `optional` **firstUsefulOutputEvent?**: `string`

Defined in: [types/proxy.ts:3062](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3062)

---

### observationIncomplete?

> `optional` **observationIncomplete?**: `boolean`

Defined in: [types/proxy.ts:3063](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3063)

---

### messageId

> **messageId**: `string`

Defined in: [types/proxy.ts:3064](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3064)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3065](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3065)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/proxy.ts:3066](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3066)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/proxy.ts:3067](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3067)

---

### cacheCreationInputTokens

> **cacheCreationInputTokens**: `number`

Defined in: [types/proxy.ts:3068](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3068)

---

### cacheReadInputTokens

> **cacheReadInputTokens**: `number`

Defined in: [types/proxy.ts:3069](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3069)

---

### contentBlocks

> **contentBlocks**: [`SSEContentBlock`](SSEContentBlock.md)[]

Defined in: [types/proxy.ts:3070](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3070)

---

### blockByteCounts

> **blockByteCounts**: `Map`\<`number`, `number`\>

Defined in: [types/proxy.ts:3071](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3071)

---

### stopReason

> **stopReason**: `string` \| `null`

Defined in: [types/proxy.ts:3072](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3072)

---

### stopSequence

> **stopSequence**: `string` \| `null`

Defined in: [types/proxy.ts:3073](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3073)

---

### eventCount

> **eventCount**: `number`

Defined in: [types/proxy.ts:3074](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3074)

---

### startTime

> **startTime**: `number`

Defined in: [types/proxy.ts:3075](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3075)

---

### totalBytesReceived

> **totalBytesReceived**: `number`

Defined in: [types/proxy.ts:3076](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3076)

---

### events

> **events**: `object`[]

Defined in: [types/proxy.ts:3077](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3077)

#### type

> **type**: `string`

#### timestamp

> **timestamp**: `number`

#### data

> **data**: `string`

---

### rawTextChunks?

> `optional` **rawTextChunks?**: `string`[]

Defined in: [types/proxy.ts:3078](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3078)

---

### rawTextBytes

> **rawTextBytes**: `number`

Defined in: [types/proxy.ts:3079](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3079)

---

### rawTextTruncated

> **rawTextTruncated**: `boolean`

Defined in: [types/proxy.ts:3080](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3080)

---

### eventLogTruncated

> **eventLogTruncated**: `boolean`

Defined in: [types/proxy.ts:3081](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3081)

---

### streamErrorMessage?

> `optional` **streamErrorMessage?**: `string`

Defined in: [types/proxy.ts:3082](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3082)
