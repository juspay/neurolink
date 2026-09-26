[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompatSSEResult

# Type Alias: OpenAICompatSSEResult

> **OpenAICompatSSEResult** = `object`

Defined in: [types/openaiCompatible.ts:261](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L261)

## Properties

### text

> **text**: `string`

Defined in: [types/openaiCompatible.ts:262](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L262)

---

### reasoning

> **reasoning**: `string`

Defined in: [types/openaiCompatible.ts:264](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L264)

Accumulated reasoner-model output (`reasoning_content` / `reasoning` deltas).

---

### toolCalls

> **toolCalls**: `Map`\<`number`, \{ `id`: `string`; `name`: `string`; `argsBuffered`: `string`; \}\>

Defined in: [types/openaiCompatible.ts:265](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L265)

---

### finishReason

> **finishReason**: `"stop"` \| `"length"` \| `"tool_calls"` \| `"function_call"` \| `"content_filter"` \| `null`

Defined in: [types/openaiCompatible.ts:266](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L266)

---

### usage?

> `optional` **usage?**: [`OpenAICompatUsage`](OpenAICompatUsage.md)

Defined in: [types/openaiCompatible.ts:273](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L273)

---

### id?

> `optional` **id?**: `string`

Defined in: [types/openaiCompatible.ts:275](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L275)

Response id from the first stream chunk that carried one.

---

### model?

> `optional` **model?**: `string`

Defined in: [types/openaiCompatible.ts:277](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L277)

Served model from the first stream chunk that carried one.
