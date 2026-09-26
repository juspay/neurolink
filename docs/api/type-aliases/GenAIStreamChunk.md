[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GenAIStreamChunk

# Type Alias: GenAIStreamChunk

> **GenAIStreamChunk** = `object`

Defined in: [types/providers.ts:1206](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1206)

Google AI generateContentStream response chunk

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1207](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1207)

---

### functionCalls?

> `optional` **functionCalls?**: `object`[]

Defined in: [types/providers.ts:1208](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1208)

#### name

> **name**: `string`

#### args

> **args**: `Record`\<`string`, `unknown`\>

---

### candidates?

> `optional` **candidates?**: `object`[]

Defined in: [types/providers.ts:1209](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1209)

#### content?

> `optional` **content?**: `object`

##### content.parts?

> `optional` **parts?**: `object`[]
