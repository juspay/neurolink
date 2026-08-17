[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GenAIStreamChunk

# Type Alias: GenAIStreamChunk

> **GenAIStreamChunk** = `object`

Defined in: [types/providers.ts:1162](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1162)

Google AI generateContentStream response chunk

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1163](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1163)

---

### functionCalls?

> `optional` **functionCalls?**: `object`[]

Defined in: [types/providers.ts:1164](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1164)

#### name

> **name**: `string`

#### args

> **args**: `Record`\<`string`, `unknown`\>

---

### candidates?

> `optional` **candidates?**: `object`[]

Defined in: [types/providers.ts:1165](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1165)

#### content?

> `optional` **content?**: `object`

##### content.parts?

> `optional` **parts?**: `object`[]
