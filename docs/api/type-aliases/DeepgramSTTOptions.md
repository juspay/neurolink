[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / DeepgramSTTOptions

# Type Alias: DeepgramSTTOptions

> **DeepgramSTTOptions** = [`STTOptions`](STTOptions.md) & `object`

Defined in: [types/stt.ts:315](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/stt.ts#L315)

## Type Declaration

### model?

> `optional` **model?**: [`DeepgramModel`](DeepgramModel.md) \| `"nova-3"`

### smartFormat?

> `optional` **smartFormat?**: `boolean`

### search?

> `optional` **search?**: `string`[]

### replace?

> `optional` **replace?**: `object`[]

### utterances?

> `optional` **utterances?**: `boolean`

### utterSplit?

> `optional` **utterSplit?**: `number`

### uttSplit?

> `optional` **uttSplit?**: `number`

Alias for utterSplit (legacy field name)

### paragraphs?

> `optional` **paragraphs?**: `boolean`

### keywords?

> `optional` **keywords?**: `string`[]

### keywordBoost?

> `optional` **keywordBoost?**: `"legacy"` \| `"medium"` \| `"high"`

### fillerWords?

> `optional` **fillerWords?**: `boolean`

### detectTopics?

> `optional` **detectTopics?**: `boolean`

### detectEntities?

> `optional` **detectEntities?**: `boolean`

### summarize?

> `optional` **summarize?**: `boolean`

### redact?

> `optional` **redact?**: (`"pci"` \| `"numbers"` \| `"ssn"`)[]
