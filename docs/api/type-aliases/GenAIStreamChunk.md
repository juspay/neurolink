[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GenAIStreamChunk

# Type Alias: GenAIStreamChunk

> **GenAIStreamChunk** = `object`

Defined in: [types/providers.ts:1218](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1218)

Google AI generateContentStream response chunk

## Properties

### text?

> `optional` **text?**: `string`

Defined in: [types/providers.ts:1219](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1219)

---

### functionCalls?

> `optional` **functionCalls?**: `object`[]

Defined in: [types/providers.ts:1220](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1220)

#### name

> **name**: `string`

#### args

> **args**: `Record`\<`string`, `unknown`\>

---

### candidates?

> `optional` **candidates?**: `object`[]

Defined in: [types/providers.ts:1221](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1221)

#### content?

> `optional` **content?**: `object`

##### content.parts?

> `optional` **parts?**: `object`[]
