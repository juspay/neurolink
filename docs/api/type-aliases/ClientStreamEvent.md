[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientStreamEvent

# Type Alias: ClientStreamEvent

> **ClientStreamEvent** = `object`

Stream event from SSE/WebSocket

## Properties

### type

> **type**: [`ClientStreamEventType`](ClientStreamEventType.md)

Event type

---

### content?

> `optional` **content?**: `string`

Text content (for text events)

---

### toolCall?

> `optional` **toolCall?**: [`StreamToolCall`](StreamToolCall.md)

Tool call data (for tool-call events)

---

### toolResult?

> `optional` **toolResult?**: [`StreamToolResult`](StreamToolResult.md)

Tool result data (for tool-result events)

---

### error?

> `optional` **error?**: [`ClientApiError`](ClientApiError.md)

Error data (for error events)

---

### metadata?

> `optional` **metadata?**: [`JsonObject`](JsonObject.md)

Metadata (for metadata events)

---

### audio?

> `optional` **audio?**: `object`

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

Thinking/reasoning content (for thinking events)

---

### timestamp

> **timestamp**: `number`

Event timestamp
