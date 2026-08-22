[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAICompatBuildBodyArgs

# Type Alias: OpenAICompatBuildBodyArgs

> **OpenAICompatBuildBodyArgs** = `object`

Defined in: [types/openaiCompatible.ts:318](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/openaiCompatible.ts#L318)

## Properties

### modelId

> **modelId**: `string`

Defined in: [types/openaiCompatible.ts:319](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/openaiCompatible.ts#L319)

---

### messages

> **messages**: [`OpenAICompatChatMessage`](OpenAICompatChatMessage.md)[]

Defined in: [types/openaiCompatible.ts:320](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/openaiCompatible.ts#L320)

---

### options

> **options**: `object`

Defined in: [types/openaiCompatible.ts:321](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/openaiCompatible.ts#L321)

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

Defined in: [types/openaiCompatible.ts:338](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/openaiCompatible.ts#L338)

---

### toolChoice?

> `optional` **toolChoice?**: [`OpenAICompatToolChoiceWire`](OpenAICompatToolChoiceWire.md)

Defined in: [types/openaiCompatible.ts:339](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/openaiCompatible.ts#L339)

---

### streaming

> **streaming**: `boolean`

Defined in: [types/openaiCompatible.ts:340](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/openaiCompatible.ts#L340)

---

### responseFormat?

> `optional` **responseFormat?**: [`OpenAICompatResponseFormat`](OpenAICompatResponseFormat.md)

Defined in: [types/openaiCompatible.ts:341](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/openaiCompatible.ts#L341)
