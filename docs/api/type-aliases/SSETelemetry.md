[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SSETelemetry

# Type Alias: SSETelemetry

> **SSETelemetry** = `object`

Defined in: [types/proxy.ts:2748](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2748)

Aggregated telemetry resolved when an SSE stream completes.

## Properties

### messageStopReceived

> **messageStopReceived**: `boolean`

Defined in: [types/proxy.ts:2749](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2749)

---

### firstUsefulOutputAt?

> `optional` **firstUsefulOutputAt?**: `number`

Defined in: [types/proxy.ts:2750](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2750)

---

### firstUsefulOutputEvent?

> `optional` **firstUsefulOutputEvent?**: `string`

Defined in: [types/proxy.ts:2751](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2751)

---

### observationIncomplete?

> `optional` **observationIncomplete?**: `boolean`

Defined in: [types/proxy.ts:2752](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2752)

---

### messageId

> **messageId**: `string`

Defined in: [types/proxy.ts:2753](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2753)

---

### model

> **model**: `string`

Defined in: [types/proxy.ts:2754](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2754)

---

### usage

> **usage**: `object`

Defined in: [types/proxy.ts:2755](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2755)

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

Defined in: [types/proxy.ts:2762](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2762)

---

### stopReason

> **stopReason**: `string` \| `null`

Defined in: [types/proxy.ts:2763](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2763)

---

### stopSequence

> **stopSequence**: `string` \| `null`

Defined in: [types/proxy.ts:2764](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2764)

---

### eventCount

> **eventCount**: `number`

Defined in: [types/proxy.ts:2765](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2765)

---

### streamDurationMs

> **streamDurationMs**: `number`

Defined in: [types/proxy.ts:2766](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2766)

---

### totalBytesReceived

> **totalBytesReceived**: `number`

Defined in: [types/proxy.ts:2767](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2767)

---

### events

> **events**: `object`[]

Defined in: [types/proxy.ts:2768](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2768)

#### type

> **type**: `string`

#### timestamp

> **timestamp**: `number`

#### data

> **data**: `string`

---

### streamErrorMessage?

> `optional` **streamErrorMessage?**: `string`

Defined in: [types/proxy.ts:2770](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2770)

Error carried as a terminal SSE `event: error`, if one was observed.

---

### rawText?

> `optional` **rawText?**: `string`

Defined in: [types/proxy.ts:2771](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2771)

---

### rawTextTruncated?

> `optional` **rawTextTruncated?**: `boolean`

Defined in: [types/proxy.ts:2772](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2772)
