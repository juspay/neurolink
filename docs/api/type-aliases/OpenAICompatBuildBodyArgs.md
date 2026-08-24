[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompatBuildBodyArgs

# Type Alias: OpenAICompatBuildBodyArgs

> **OpenAICompatBuildBodyArgs** = `object`

Defined in: [types/openaiCompatible.ts:322](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L322)

## Properties

### modelId

> **modelId**: `string`

Defined in: [types/openaiCompatible.ts:323](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L323)

---

### messages

> **messages**: [`OpenAICompatChatMessage`](OpenAICompatChatMessage.md)[]

Defined in: [types/openaiCompatible.ts:324](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L324)

---

### options

> **options**: `object`

Defined in: [types/openaiCompatible.ts:325](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L325)

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

Defined in: [types/openaiCompatible.ts:342](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L342)

---

### toolChoice?

> `optional` **toolChoice?**: [`OpenAICompatToolChoiceWire`](OpenAICompatToolChoiceWire.md)

Defined in: [types/openaiCompatible.ts:343](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L343)

---

### streaming

> **streaming**: `boolean`

Defined in: [types/openaiCompatible.ts:344](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L344)

---

### responseFormat?

> `optional` **responseFormat?**: [`OpenAICompatResponseFormat`](OpenAICompatResponseFormat.md)

Defined in: [types/openaiCompatible.ts:345](https://github.com/juspay/neurolink/blob/release/src/lib/types/openaiCompatible.ts#L345)
