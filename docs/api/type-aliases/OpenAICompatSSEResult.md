[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompatSSEResult

# Type Alias: OpenAICompatSSEResult

> **OpenAICompatSSEResult** = `object`

Defined in: [types/openaiCompatible.ts:255](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L255)

## Properties

### text

> **text**: `string`

Defined in: [types/openaiCompatible.ts:256](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L256)

---

### reasoning

> **reasoning**: `string`

Defined in: [types/openaiCompatible.ts:258](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L258)

Accumulated reasoner-model output (`reasoning_content` / `reasoning` deltas).

---

### toolCalls

> **toolCalls**: `Map`\<`number`, \{ `id`: `string`; `name`: `string`; `argsBuffered`: `string`; \}\>

Defined in: [types/openaiCompatible.ts:259](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L259)

---

### finishReason

> **finishReason**: `"stop"` \| `"length"` \| `"tool_calls"` \| `"function_call"` \| `"content_filter"` \| `null`

Defined in: [types/openaiCompatible.ts:260](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L260)

---

### usage?

> `optional` **usage?**: [`OpenAICompatUsage`](OpenAICompatUsage.md)

Defined in: [types/openaiCompatible.ts:267](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L267)

---

### id?

> `optional` **id?**: `string`

Defined in: [types/openaiCompatible.ts:269](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L269)

Response id from the first stream chunk that carried one.

---

### model?

> `optional` **model?**: `string`

Defined in: [types/openaiCompatible.ts:271](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L271)

Served model from the first stream chunk that carried one.
