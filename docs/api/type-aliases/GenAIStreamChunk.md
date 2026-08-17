[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GenAIStreamChunk

# Type Alias: GenAIStreamChunk

> **GenAIStreamChunk** = `object`

Defined in: [types/providers.ts:1164](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1164)

Google AI generateContentStream response chunk

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1165](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1165)

---

### functionCalls?

> `optional` **functionCalls?**: `object`[]

Defined in: [types/providers.ts:1166](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1166)

#### name

> **name**: `string`

#### args

> **args**: `Record`\<`string`, `unknown`\>

---

### candidates?

> `optional` **candidates?**: `object`[]

Defined in: [types/providers.ts:1167](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1167)

#### content?

> `optional` **content?**: `object`

##### content.parts?

> `optional` **parts?**: `object`[]
