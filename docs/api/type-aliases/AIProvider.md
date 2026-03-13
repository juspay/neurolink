[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AIProvider

# Type Alias: AIProvider

> **AIProvider** = `object`

Defined in: [types/providers.ts:296](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/providers.ts#L296)

AI Provider type with flexible parameter support

## Methods

### stream()

> **stream**(`optionsOrPrompt`, `analysisSchema?`): `Promise`\<`StreamResult`\>

Defined in: [types/providers.ts:298](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/providers.ts#L298)

#### Parameters

##### optionsOrPrompt

`string` | [`StreamOptions`](#)

##### analysisSchema?

`ValidationSchema`

#### Returns

`Promise`\<`StreamResult`\>

---

### generate()

> **generate**(`optionsOrPrompt`, `analysisSchema?`): `Promise`\<`EnhancedGenerateResult` \| `null`\>

Defined in: [types/providers.ts:303](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/providers.ts#L303)

#### Parameters

##### optionsOrPrompt

`string` | [`TextGenerationOptions`](TextGenerationOptions.md)

##### analysisSchema?

`ValidationSchema`

#### Returns

`Promise`\<`EnhancedGenerateResult` \| `null`\>

---

### gen()

> **gen**(`optionsOrPrompt`, `analysisSchema?`): `Promise`\<`EnhancedGenerateResult` \| `null`\>

Defined in: [types/providers.ts:308](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/providers.ts#L308)

#### Parameters

##### optionsOrPrompt

`string` | [`TextGenerationOptions`](TextGenerationOptions.md)

##### analysisSchema?

`ValidationSchema`

#### Returns

`Promise`\<`EnhancedGenerateResult` \| `null`\>

---

### embed()

> **embed**(`text`, `modelName?`): `Promise`\<`number[]`\>

Generate an embedding vector for a single text. Throws if the provider does not support embeddings.

#### Parameters

##### text

`string`

##### modelName?

`string`

#### Returns

`Promise`\<`number[]`\>

---

### embedMany()

> **embedMany**(`texts`, `modelName?`): `Promise`\<`number[][]`\>

Generate embedding vectors for multiple texts in a single batch. The AI SDK automatically handles chunking for models with batch limits.

#### Parameters

##### texts

`string[]`

##### modelName?

`string`

#### Returns

`Promise`\<`number[][]`\>

---

### setupToolExecutor()

> **setupToolExecutor**(`sdk`, `functionTag`): `void`

Defined in: [types/providers.ts:314](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/providers.ts#L314)

#### Parameters

##### sdk

###### customTools

`Map`\<`string`, `unknown`\>

###### executeTool

(`toolName`, `params`) => `Promise`\<`unknown`\>

##### functionTag

`string`

#### Returns

`void`
