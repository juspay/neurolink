[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GenAIStreamChunk

# Type Alias: GenAIStreamChunk

> **GenAIStreamChunk** = `object`

Defined in: [types/providers.ts:1140](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1140)

Google AI generateContentStream response chunk

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1141](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1141)

---

### functionCalls?

> `optional` **functionCalls?**: `object`[]

Defined in: [types/providers.ts:1142](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1142)

#### name

> **name**: `string`

#### args

> **args**: `Record`\<`string`, `unknown`\>

---

### candidates?

> `optional` **candidates?**: `object`[]

Defined in: [types/providers.ts:1143](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1143)

#### content?

> `optional` **content?**: `object`

##### content.parts?

> `optional` **parts?**: `object`[]
