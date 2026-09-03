[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompatBuildBodyArgs

# Type Alias: OpenAICompatBuildBodyArgs

> **OpenAICompatBuildBodyArgs** = `object`

Defined in: [types/openaiCompatible.ts:325](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L325)

## Properties

### modelId

> **modelId**: `string`

Defined in: [types/openaiCompatible.ts:326](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L326)

---

### messages

> **messages**: [`OpenAICompatChatMessage`](OpenAICompatChatMessage.md)[]

Defined in: [types/openaiCompatible.ts:327](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L327)

---

### options

> **options**: `object`

Defined in: [types/openaiCompatible.ts:328](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L328)

#### maxTokens?

> `optional` **maxTokens?**: `number` \| `null`

#### temperature?

> `optional` **temperature?**: `number` \| `null`

#### topP?

> `optional` **topP?**: `number` \| `null`

#### presencePenalty?

> `optional` **presencePenalty?**: `number` \| `null`

#### frequencyPenalty?

> `optional` **frequencyPenalty?**: `number` \| `null`

#### seed?

> `optional` **seed?**: `number` \| `null`

#### stopSequences?

> `optional` **stopSequences?**: `string`[]

#### extraBody?

> `optional` **extraBody?**: `Record`\<`string`, `unknown`\>

Provider-specific extra wire fields, spread verbatim onto the final
request body by `buildBody` (after the standard fields). This is the
explicit channel for non-OpenAI knobs (e.g. NVIDIA NIM's `top_k` /
`chat_template_kwargs`) — loose unknown keys returned from
`adjustBuildBodyOptions` are intentionally NOT forwarded.

---

### tools?

> `optional` **tools?**: [`OpenAICompatChatTool`](OpenAICompatChatTool.md)[]

Defined in: [types/openaiCompatible.ts:345](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L345)

---

### toolChoice?

> `optional` **toolChoice?**: [`OpenAICompatToolChoiceWire`](OpenAICompatToolChoiceWire.md)

Defined in: [types/openaiCompatible.ts:346](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L346)

---

### streaming

> **streaming**: `boolean`

Defined in: [types/openaiCompatible.ts:347](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L347)

---

### responseFormat?

> `optional` **responseFormat?**: [`OpenAICompatResponseFormat`](OpenAICompatResponseFormat.md)

Defined in: [types/openaiCompatible.ts:348](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L348)
