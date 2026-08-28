[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GenAIModelsAPI

# Type Alias: GenAIModelsAPI

> **GenAIModelsAPI** = `object`

Defined in: [types/providers.ts:1173](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1173)

Google AI models API interface

## Properties

### generateContentStream

> **generateContentStream**: (`params`) => `Promise`\<`AsyncIterable`\<[`GenAIStreamChunk`](GenAIStreamChunk.md)\>\>

Defined in: [types/providers.ts:1174](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1174)

#### Parameters

##### params

###### model

`string`

###### contents

`object`[]

###### config?

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`AsyncIterable`\<[`GenAIStreamChunk`](GenAIStreamChunk.md)\>\>

---

### generateContent

> **generateContent**: (`params`) => `Promise`\<[`GenAIGenerateContentResponse`](GenAIGenerateContentResponse.md)\>

Defined in: [types/providers.ts:1179](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1179)

#### Parameters

##### params

###### model

`string`

###### contents

`object`[]

###### config?

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<[`GenAIGenerateContentResponse`](GenAIGenerateContentResponse.md)\>

---

### embedContent

> **embedContent**: (`params`) => `Promise`\<\{ `embeddings?`: `object`[]; \}\>

Defined in: [types/providers.ts:1184](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1184)

#### Parameters

##### params

###### model

`string`

###### contents

`string` \| `string`[]

###### config?

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<\{ `embeddings?`: `object`[]; \}\>
