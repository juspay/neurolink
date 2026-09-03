[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompatSSEResult

# Type Alias: OpenAICompatSSEResult

> **OpenAICompatSSEResult** = `object`

Defined in: [types/openaiCompatible.ts:258](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L258)

## Properties

### text

> **text**: `string`

Defined in: [types/openaiCompatible.ts:259](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L259)

---

### reasoning

> **reasoning**: `string`

Defined in: [types/openaiCompatible.ts:261](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L261)

Accumulated reasoner-model output (`reasoning_content` / `reasoning` deltas).

---

### toolCalls

> **toolCalls**: `Map`\<`number`, \{ `id`: `string`; `name`: `string`; `argsBuffered`: `string`; \}\>

Defined in: [types/openaiCompatible.ts:262](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L262)

---

### finishReason

> **finishReason**: `"stop"` \| `"length"` \| `"tool_calls"` \| `"function_call"` \| `"content_filter"` \| `null`

Defined in: [types/openaiCompatible.ts:263](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L263)

---

### usage?

> `optional` **usage?**: [`OpenAICompatUsage`](OpenAICompatUsage.md)

Defined in: [types/openaiCompatible.ts:270](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L270)

---

### id?

> `optional` **id?**: `string`

Defined in: [types/openaiCompatible.ts:272](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L272)

Response id from the first stream chunk that carried one.

---

### model?

> `optional` **model?**: `string`

Defined in: [types/openaiCompatible.ts:274](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L274)

Served model from the first stream chunk that carried one.
