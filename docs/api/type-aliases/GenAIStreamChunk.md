[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GenAIStreamChunk

# Type Alias: GenAIStreamChunk

> **GenAIStreamChunk** = `object`

Defined in: [types/providers.ts:1225](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1225)

Google AI generateContentStream response chunk

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1226](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1226)

---

### functionCalls?

> `optional` **functionCalls?**: `object`[]

Defined in: [types/providers.ts:1227](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1227)

#### name

> **name**: `string`

#### args

> **args**: `Record`\<`string`, `unknown`\>

---

### candidates?

> `optional` **candidates?**: `object`[]

Defined in: [types/providers.ts:1228](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1228)

#### content?

> `optional` **content?**: `object`

##### content.parts?

> `optional` **parts?**: `object`[]
