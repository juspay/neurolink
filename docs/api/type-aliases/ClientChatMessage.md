[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientChatMessage

# Type Alias: ClientChatMessage

> **ClientChatMessage** = `object`

Chat message for useChat hook

## Properties

### id

> **id**: `string`

Unique message ID

---

### role

> **role**: `"user"` \| `"assistant"` \| `"system"` \| `"tool"`

Message role

---

### content

> **content**: `string`

Message content

---

### toolCalls?

> `optional` **toolCalls?**: [`StreamToolCall`](StreamToolCall.md)[]

Tool calls in this message

---

### toolResults?

> `optional` **toolResults?**: [`StreamToolResult`](StreamToolResult.md)[]

Tool results in this message

---

### createdAt

> **createdAt**: `Date`

Message timestamp

---

### metadata?

> `optional` **metadata?**: [`JsonObject`](JsonObject.md)

Additional metadata
