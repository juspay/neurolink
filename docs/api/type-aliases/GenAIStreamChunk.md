[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GenAIStreamChunk

# Type Alias: GenAIStreamChunk

> **GenAIStreamChunk** = `object`

Defined in: [types/providers.ts:1199](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1199)

Google AI generateContentStream response chunk

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1200](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1200)

---

### functionCalls?

> `optional` **functionCalls?**: `object`[]

Defined in: [types/providers.ts:1201](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1201)

#### name

> **name**: `string`

#### args

> **args**: `Record`\<`string`, `unknown`\>

---

### candidates?

> `optional` **candidates?**: `object`[]

Defined in: [types/providers.ts:1202](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1202)

#### content?

> `optional` **content?**: `object`

##### content.parts?

> `optional` **parts?**: `object`[]
