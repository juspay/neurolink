[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TelemetryAccumulator

# Type Alias: TelemetryAccumulator

> **TelemetryAccumulator** = `object`

Defined in: [types/proxy.ts:2920](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2920)

Mutable accumulator the SSE interceptor uses internally.

## Properties

### messageStopReceived

> **messageStopReceived**: `boolean`

Defined in: [types/proxy.ts:2921](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2921)

---

### firstUsefulOutputAt?

> `optional` **firstUsefulOutputAt?**: `number`

Defined in: [types/proxy.ts:2922](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2922)

---

### firstUsefulOutputEvent?

> `optional` **firstUsefulOutputEvent?**: `string`

Defined in: [types/proxy.ts:2923](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2923)

---

### observationIncomplete?

> `optional` **observationIncomplete?**: `boolean`

Defined in: [types/proxy.ts:2924](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2924)

---

### messageId

> **messageId**: `string`

Defined in: [types/proxy.ts:2925](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2925)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2926](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2926)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/proxy.ts:2927](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2927)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/proxy.ts:2928](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2928)

---

### cacheCreationInputTokens

> **cacheCreationInputTokens**: `number`

Defined in: [types/proxy.ts:2929](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2929)

---

### cacheReadInputTokens

> **cacheReadInputTokens**: `number`

Defined in: [types/proxy.ts:2930](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2930)

---

### contentBlocks

> **contentBlocks**: [`SSEContentBlock`](SSEContentBlock.md)[]

Defined in: [types/proxy.ts:2931](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2931)

---

### blockByteCounts

> **blockByteCounts**: `Map`\<`number`, `number`\>

Defined in: [types/proxy.ts:2932](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2932)

---

### stopReason

> **stopReason**: `string` \| `null`

Defined in: [types/proxy.ts:2933](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2933)

---

### stopSequence

> **stopSequence**: `string` \| `null`

Defined in: [types/proxy.ts:2934](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2934)

---

### eventCount

> **eventCount**: `number`

Defined in: [types/proxy.ts:2935](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2935)

---

### startTime

> **startTime**: `number`

Defined in: [types/proxy.ts:2936](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2936)

---

### totalBytesReceived

> **totalBytesReceived**: `number`

Defined in: [types/proxy.ts:2937](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2937)

---

### events

> **events**: `object`[]

Defined in: [types/proxy.ts:2938](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2938)

#### type

> **type**: `string`

#### timestamp

> **timestamp**: `number`

#### data

> **data**: `string`

---

### rawTextChunks?

> `optional` **rawTextChunks?**: `string`[]

Defined in: [types/proxy.ts:2939](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2939)

---

### rawTextBytes

> **rawTextBytes**: `number`

Defined in: [types/proxy.ts:2940](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2940)

---

### rawTextTruncated

> **rawTextTruncated**: `boolean`

Defined in: [types/proxy.ts:2941](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2941)

---

### eventLogTruncated

> **eventLogTruncated**: `boolean`

Defined in: [types/proxy.ts:2942](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2942)

---

### streamErrorMessage?

> `optional` **streamErrorMessage?**: `string`

Defined in: [types/proxy.ts:2943](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2943)
