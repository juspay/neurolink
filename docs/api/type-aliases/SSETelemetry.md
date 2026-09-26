[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSETelemetry

# Type Alias: SSETelemetry

> **SSETelemetry** = `object`

Aggregated telemetry resolved when an SSE stream completes.

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

### usage

> **usage**: `object`

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

### streamDurationMs

> **streamDurationMs**: `number`

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

### streamErrorMessage?

> `optional` **streamErrorMessage?**: `string`

Error carried as a terminal SSE `event: error`, if one was observed.

---

### rawText?

> `optional` **rawText?**: `string`

---

### rawTextTruncated?

> `optional` **rawTextTruncated?**: `boolean`
