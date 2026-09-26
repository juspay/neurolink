[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TelemetryAccumulator

# Type Alias: TelemetryAccumulator

> **TelemetryAccumulator** = `object`

Mutable accumulator the SSE interceptor uses internally.

## Properties

### messageStopReceived

> **messageStopReceived**: `boolean`

---

### firstUsefulOutputAt?

> `optional` **firstUsefulOutputAt?**: `number`

---

### firstUsefulOutputEvent?

> `optional` **firstUsefulOutputEvent?**: `string`

---

### observationIncomplete?

> `optional` **observationIncomplete?**: `boolean`

---

### messageId

> **messageId**: `string`

---

### model

> **model**: `string`

---

### inputTokens

> **inputTokens**: `number`

---

### outputTokens

> **outputTokens**: `number`

---

### cacheCreationInputTokens

> **cacheCreationInputTokens**: `number`

---

### cacheReadInputTokens

> **cacheReadInputTokens**: `number`

---

### contentBlocks

> **contentBlocks**: [`SSEContentBlock`](SSEContentBlock.md)[]

---

### blockByteCounts

> **blockByteCounts**: `Map`\<`number`, `number`\>

---

### stopReason

> **stopReason**: `string` \| `null`

---

### stopSequence

> **stopSequence**: `string` \| `null`

---

### eventCount

> **eventCount**: `number`

---

### startTime

> **startTime**: `number`

---

### totalBytesReceived

> **totalBytesReceived**: `number`

---

### events

> **events**: `object`[]

#### type

> **type**: `string`

#### timestamp

> **timestamp**: `number`

#### data

> **data**: `string`

---

### rawTextChunks?

> `optional` **rawTextChunks?**: `string`[]

---

### rawTextBytes

> **rawTextBytes**: `number`

---

### rawTextTruncated

> **rawTextTruncated**: `boolean`

---

### eventLogTruncated

> **eventLogTruncated**: `boolean`

---

### streamErrorMessage?

> `optional` **streamErrorMessage?**: `string`
