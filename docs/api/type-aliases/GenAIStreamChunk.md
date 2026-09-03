[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GenAIStreamChunk

# Type Alias: GenAIStreamChunk

> **GenAIStreamChunk** = `object`

Defined in: [types/providers.ts:1155](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1155)

Google AI generateContentStream response chunk

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1156](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1156)

---

### functionCalls?

> `optional` **functionCalls?**: `object`[]

Defined in: [types/providers.ts:1157](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1157)

#### name

> **name**: `string`

#### args

> **args**: `Record`\<`string`, `unknown`\>

---

### candidates?

> `optional` **candidates?**: `object`[]

Defined in: [types/providers.ts:1158](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1158)

#### content?

> `optional` **content?**: `object`

##### content.parts?

> `optional` **parts?**: `object`[]
