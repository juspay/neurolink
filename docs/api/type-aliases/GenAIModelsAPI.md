[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GenAIModelsAPI

# Type Alias: GenAIModelsAPI

> **GenAIModelsAPI** = `object`

Defined in: [types/providers.ts:1234](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1234)

Google AI models API interface

## Properties

### generateContentStream

> **generateContentStream**: (`params`) => `Promise`\<`AsyncIterable`\<[`GenAIStreamChunk`](GenAIStreamChunk.md)\>\>

Defined in: [types/providers.ts:1235](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1235)

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

Defined in: [types/providers.ts:1240](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1240)

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

Defined in: [types/providers.ts:1245](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1245)

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
