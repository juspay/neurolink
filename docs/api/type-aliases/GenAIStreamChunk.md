[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GenAIStreamChunk

# Type Alias: GenAIStreamChunk

> **GenAIStreamChunk** = `object`

Defined in: [types/providers.ts:1227](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1227)

Google AI generateContentStream response chunk

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1228](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1228)

---

### functionCalls?

> `optional` **functionCalls?**: `object`[]

Defined in: [types/providers.ts:1229](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1229)

#### name

> **name**: `string`

#### args

> **args**: `Record`\<`string`, `unknown`\>

---

### candidates?

> `optional` **candidates?**: `object`[]

Defined in: [types/providers.ts:1230](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1230)

#### content?

> `optional` **content?**: `object`

##### content.parts?

> `optional` **parts?**: `object`[]
