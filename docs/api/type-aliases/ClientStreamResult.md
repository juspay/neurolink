[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientStreamResult

# Type Alias: ClientStreamResult

> **ClientStreamResult** = `object`

Stream result with full response data

## Properties

### content

> **content**: `string`

Full accumulated text content

---

### toolCalls?

> `optional` **toolCalls?**: [`StreamToolCall`](StreamToolCall.md)[]

All tool calls made

---

### toolResults?

> `optional` **toolResults?**: [`StreamToolResult`](StreamToolResult.md)[]

All tool results

---

### usage?

> `optional` **usage?**: `object`

Token usage information

#### promptTokens

> **promptTokens**: `number`

#### completionTokens

> **completionTokens**: `number`

#### totalTokens

> **totalTokens**: `number`

---

### finishReason?

> `optional` **finishReason?**: `string`

Finish reason

---

### metadata?

> `optional` **metadata?**: [`JsonObject`](JsonObject.md)

Response metadata
