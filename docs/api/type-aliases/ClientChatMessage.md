[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientChatMessage

# Type Alias: ClientChatMessage

> **ClientChatMessage** = `object`

Defined in: [types/client.ts:536](https://github.com/juspay/neurolink/blob/release/src/lib/types/client.ts#L536)

Chat message for useChat hook

## Properties

### id

> **id**: `string`

Defined in: [types/client.ts:538](https://github.com/juspay/neurolink/blob/release/src/lib/types/client.ts#L538)

Unique message ID

---

### role

> **role**: `"user"` \| `"assistant"` \| `"system"` \| `"tool"`

Defined in: [types/client.ts:540](https://github.com/juspay/neurolink/blob/release/src/lib/types/client.ts#L540)

Message role

---

### content

> **content**: `string`

Defined in: [types/client.ts:542](https://github.com/juspay/neurolink/blob/release/src/lib/types/client.ts#L542)

Message content

---

### toolCalls?

> `optional` **toolCalls?**: [`StreamToolCall`](StreamToolCall.md)[]

Defined in: [types/client.ts:544](https://github.com/juspay/neurolink/blob/release/src/lib/types/client.ts#L544)

Tool calls in this message

---

### toolResults?

> `optional` **toolResults?**: [`StreamToolResult`](StreamToolResult.md)[]

Defined in: [types/client.ts:546](https://github.com/juspay/neurolink/blob/release/src/lib/types/client.ts#L546)

Tool results in this message

---

### createdAt

> **createdAt**: `Date`

Defined in: [types/client.ts:548](https://github.com/juspay/neurolink/blob/release/src/lib/types/client.ts#L548)

Message timestamp

---

### metadata?

> `optional` **metadata?**: [`JsonObject`](JsonObject.md)

Defined in: [types/client.ts:550](https://github.com/juspay/neurolink/blob/release/src/lib/types/client.ts#L550)

Additional metadata
