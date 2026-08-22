[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GenAIStreamChunk

# Type Alias: GenAIStreamChunk

> **GenAIStreamChunk** = `object`

Defined in: [types/providers.ts:1133](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1133)

Google AI generateContentStream response chunk

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1134](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1134)

---

### functionCalls?

> `optional` **functionCalls?**: `object`[]

Defined in: [types/providers.ts:1135](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1135)

#### name

> **name**: `string`

#### args

> **args**: `Record`\<`string`, `unknown`\>

---

### candidates?

> `optional` **candidates?**: `object`[]

Defined in: [types/providers.ts:1136](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1136)

#### content?

> `optional` **content?**: `object`

##### content.parts?

> `optional` **parts?**: `object`[]
