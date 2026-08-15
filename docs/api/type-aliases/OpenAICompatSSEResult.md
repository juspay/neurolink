[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompatSSEResult

# Type Alias: OpenAICompatSSEResult

> **OpenAICompatSSEResult** = `object`

Defined in: [types/openaiCompatible.ts:255](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/openaiCompatible.ts#L255)

## Properties

### text

> **text**: `string`

Defined in: [types/openaiCompatible.ts:256](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/openaiCompatible.ts#L256)

---

### reasoning

> **reasoning**: `string`

Defined in: [types/openaiCompatible.ts:258](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/openaiCompatible.ts#L258)

Accumulated reasoner-model output (`reasoning_content` / `reasoning` deltas).

---

### toolCalls

> **toolCalls**: `Map`\<`number`, \{ `id`: `string`; `name`: `string`; `argsBuffered`: `string`; \}\>

Defined in: [types/openaiCompatible.ts:259](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/openaiCompatible.ts#L259)

---

### finishReason

> **finishReason**: `"stop"` \| `"length"` \| `"tool_calls"` \| `"function_call"` \| `"content_filter"` \| `null`

Defined in: [types/openaiCompatible.ts:260](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/openaiCompatible.ts#L260)

---

### usage?

> `optional` **usage?**: [`OpenAICompatUsage`](OpenAICompatUsage.md)

Defined in: [types/openaiCompatible.ts:267](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/openaiCompatible.ts#L267)
