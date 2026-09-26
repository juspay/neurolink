[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompatSSEResult

# Type Alias: OpenAICompatSSEResult

> **OpenAICompatSSEResult** = `object`

## Properties

### text

> **text**: `string`

---

### reasoning

> **reasoning**: `string`

Accumulated reasoner-model output (`reasoning_content` / `reasoning` deltas).

---

### toolCalls

> **toolCalls**: `Map`\<`number`, \{ `id`: `string`; `name`: `string`; `argsBuffered`: `string`; \}\>

---

### finishReason

> **finishReason**: `"stop"` \| `"length"` \| `"tool_calls"` \| `"function_call"` \| `"content_filter"` \| `null`

---

### usage?

> `optional` **usage?**: [`OpenAICompatUsage`](OpenAICompatUsage.md)

---

### id?

> `optional` **id?**: `string`

Response id from the first stream chunk that carried one.

---

### model?

> `optional` **model?**: `string`

Served model from the first stream chunk that carried one.
