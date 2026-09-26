[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompatBuildBodyArgs

# Type Alias: OpenAICompatBuildBodyArgs

> **OpenAICompatBuildBodyArgs** = `object`

## Properties

### modelId

> **modelId**: `string`

---

### messages

> **messages**: [`OpenAICompatChatMessage`](OpenAICompatChatMessage.md)[]

---

### options

> **options**: `object`

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

---

### toolChoice?

> `optional` **toolChoice?**: [`OpenAICompatToolChoiceWire`](OpenAICompatToolChoiceWire.md)

---

### streaming

> **streaming**: `boolean`

---

### responseFormat?

> `optional` **responseFormat?**: [`OpenAICompatResponseFormat`](OpenAICompatResponseFormat.md)
