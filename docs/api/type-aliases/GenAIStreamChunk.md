[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GenAIStreamChunk

# Type Alias: GenAIStreamChunk

> **GenAIStreamChunk** = `object`

Defined in: [types/providers.ts:1167](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1167)

Google AI generateContentStream response chunk

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1168](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1168)

---

### functionCalls?

> `optional` **functionCalls?**: `object`[]

Defined in: [types/providers.ts:1169](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1169)

#### name

> **name**: `string`

#### args

> **args**: `Record`\<`string`, `unknown`\>

---

### candidates?

> `optional` **candidates?**: `object`[]

Defined in: [types/providers.ts:1170](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1170)

#### content?

> `optional` **content?**: `object`

##### content.parts?

> `optional` **parts?**: `object`[]
