[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TelemetryAccumulator

# Type Alias: TelemetryAccumulator

> **TelemetryAccumulator** = `object`

Defined in: [types/proxy.ts:3061](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3061)

Mutable accumulator the SSE interceptor uses internally.

## Properties

### messageStopReceived

> **messageStopReceived**: `boolean`

Defined in: [types/proxy.ts:3062](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3062)

---

### firstUsefulOutputAt?

> `optional` **firstUsefulOutputAt?**: `number`

Defined in: [types/proxy.ts:3063](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3063)

---

### firstUsefulOutputEvent?

> `optional` **firstUsefulOutputEvent?**: `string`

Defined in: [types/proxy.ts:3064](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3064)

---

### observationIncomplete?

> `optional` **observationIncomplete?**: `boolean`

Defined in: [types/proxy.ts:3065](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3065)

---

### messageId

> **messageId**: `string`

Defined in: [types/proxy.ts:3066](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3066)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:3067](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3067)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/proxy.ts:3068](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3068)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/proxy.ts:3069](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3069)

---

### cacheCreationInputTokens

> **cacheCreationInputTokens**: `number`

Defined in: [types/proxy.ts:3070](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3070)

---

### cacheReadInputTokens

> **cacheReadInputTokens**: `number`

Defined in: [types/proxy.ts:3071](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3071)

---

### contentBlocks

> **contentBlocks**: [`SSEContentBlock`](SSEContentBlock.md)[]

Defined in: [types/proxy.ts:3072](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3072)

---

### blockByteCounts

> **blockByteCounts**: `Map`\<`number`, `number`\>

Defined in: [types/proxy.ts:3073](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3073)

---

### stopReason

> **stopReason**: `string` \| `null`

Defined in: [types/proxy.ts:3074](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3074)

---

### stopSequence

> **stopSequence**: `string` \| `null`

Defined in: [types/proxy.ts:3075](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3075)

---

### eventCount

> **eventCount**: `number`

Defined in: [types/proxy.ts:3076](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3076)

---

### startTime

> **startTime**: `number`

Defined in: [types/proxy.ts:3077](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3077)

---

### totalBytesReceived

> **totalBytesReceived**: `number`

Defined in: [types/proxy.ts:3078](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3078)

---

### events

> **events**: `object`[]

Defined in: [types/proxy.ts:3079](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3079)

#### type

> **type**: `string`

#### timestamp

> **timestamp**: `number`

#### data

> **data**: `string`

---

### rawTextChunks?

> `optional` **rawTextChunks?**: `string`[]

Defined in: [types/proxy.ts:3080](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3080)

---

### rawTextBytes

> **rawTextBytes**: `number`

Defined in: [types/proxy.ts:3081](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3081)

---

### rawTextTruncated

> **rawTextTruncated**: `boolean`

Defined in: [types/proxy.ts:3082](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3082)

---

### eventLogTruncated

> **eventLogTruncated**: `boolean`

Defined in: [types/proxy.ts:3083](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3083)

---

### streamErrorMessage?

> `optional` **streamErrorMessage?**: `string`

Defined in: [types/proxy.ts:3084](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3084)
