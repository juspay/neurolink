[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GenAIStreamChunk

# Type Alias: GenAIStreamChunk

> **GenAIStreamChunk** = `object`

Defined in: [types/providers.ts:1203](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1203)

Google AI generateContentStream response chunk

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1204](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1204)

---

### functionCalls?

> `optional` **functionCalls?**: `object`[]

Defined in: [types/providers.ts:1205](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1205)

#### name

> **name**: `string`

#### args

> **args**: `Record`\<`string`, `unknown`\>

---

### candidates?

> `optional` **candidates?**: `object`[]

Defined in: [types/providers.ts:1206](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1206)

#### content?

> `optional` **content?**: `object`

##### content.parts?

> `optional` **parts?**: `object`[]
