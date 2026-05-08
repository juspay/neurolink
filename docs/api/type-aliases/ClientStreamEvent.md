[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientStreamEvent

# Type Alias: ClientStreamEvent

> **ClientStreamEvent** = `object`

Defined in: [types/client.ts:154](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L154)

Stream event from SSE/WebSocket

## Properties

### type

> **type**: [`ClientStreamEventType`](ClientStreamEventType.md)

Defined in: [types/client.ts:156](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L156)

Event type

---

### content?

> `optional` **content?**: `string`

Defined in: [types/client.ts:158](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L158)

Text content (for text events)

---

### toolCall?

> `optional` **toolCall?**: [`StreamToolCall`](StreamToolCall.md)

Defined in: [types/client.ts:160](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L160)

Tool call data (for tool-call events)

---

### toolResult?

> `optional` **toolResult?**: [`StreamToolResult`](StreamToolResult.md)

Defined in: [types/client.ts:162](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L162)

Tool result data (for tool-result events)

---

### error?

> `optional` **error?**: [`ClientApiError`](ClientApiError.md)

Defined in: [types/client.ts:164](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L164)

Error data (for error events)

---

### metadata?

> `optional` **metadata?**: [`JsonObject`](JsonObject.md)

Defined in: [types/client.ts:166](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L166)

Metadata (for metadata events)

---

### audio?

> `optional` **audio?**: `object`

Defined in: [types/client.ts:168](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L168)

Audio data (for audio events)

#### data

> **data**: `string`

#### format

> **format**: `string`

#### sampleRate?

> `optional` **sampleRate?**: `number`

---

### thinking?

> `optional` **thinking?**: `string`

Defined in: [types/client.ts:174](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L174)

Thinking/reasoning content (for thinking events)

---

### timestamp

> **timestamp**: `number`

Defined in: [types/client.ts:176](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L176)

Event timestamp
