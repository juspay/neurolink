[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientGenerateResponse

# Type Alias: ClientGenerateResponse

> **ClientGenerateResponse** = `object`

Generate response (client-side version)

## Properties

### content

> **content**: `string`

Generated content

---

### provider?

> `optional` **provider?**: `string`

Provider used

---

### model?

> `optional` **model?**: `string`

Model used

---

### usage?

> `optional` **usage?**: `object`

Token usage

#### promptTokens

> **promptTokens**: `number`

#### completionTokens

> **completionTokens**: `number`

#### totalTokens

> **totalTokens**: `number`

---

### toolCalls?

> `optional` **toolCalls?**: [`StreamToolCall`](StreamToolCall.md)[]

Tool calls made

---

### toolResults?

> `optional` **toolResults?**: [`StreamToolResult`](StreamToolResult.md)[]

Tool results

---

### finishReason?

> `optional` **finishReason?**: `string`

Finish reason

---

### metadata?

> `optional` **metadata?**: [`JsonObject`](JsonObject.md)

Response metadata
