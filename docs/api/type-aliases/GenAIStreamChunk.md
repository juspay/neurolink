[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GenAIStreamChunk

# Type Alias: GenAIStreamChunk

> **GenAIStreamChunk** = `object`

Defined in: [types/providers.ts:1145](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1145)

Google AI generateContentStream response chunk

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1146](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1146)

---

### functionCalls?

> `optional` **functionCalls?**: `object`[]

Defined in: [types/providers.ts:1147](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1147)

#### name

> **name**: `string`

#### args

> **args**: `Record`\<`string`, `unknown`\>

---

### candidates?

> `optional` **candidates?**: `object`[]

Defined in: [types/providers.ts:1148](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1148)

#### content?

> `optional` **content?**: `object`

##### content.parts?

> `optional` **parts?**: `object`[]
