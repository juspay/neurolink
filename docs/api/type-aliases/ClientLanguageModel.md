[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientLanguageModel

# Type Alias: ClientLanguageModel

> **ClientLanguageModel** = `object`

Defined in: [types/client.ts:836](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L836)

AI SDK Language Model interface (Vercel AI SDK compatible)

## Properties

### modelId

> **modelId**: `string`

Defined in: [types/client.ts:838](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L838)

Model specification string

---

### provider

> **provider**: `string`

Defined in: [types/client.ts:840](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L840)

Provider name

---

### doGenerate

> **doGenerate**: (`options`) => `Promise`\<[`ClientLanguageModelResponse`](ClientLanguageModelResponse.md)\>

Defined in: [types/client.ts:842](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L842)

Generate non-streaming response

#### Parameters

##### options

[`ClientLanguageModelCallOptions`](ClientLanguageModelCallOptions.md)

#### Returns

`Promise`\<[`ClientLanguageModelResponse`](ClientLanguageModelResponse.md)\>

---

### doStream

> **doStream**: (`options`) => `Promise`\<[`ClientLanguageModelStreamResponse`](ClientLanguageModelStreamResponse.md)\>

Defined in: [types/client.ts:846](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L846)

Generate streaming response

#### Parameters

##### options

[`ClientLanguageModelCallOptions`](ClientLanguageModelCallOptions.md)

#### Returns

`Promise`\<[`ClientLanguageModelStreamResponse`](ClientLanguageModelStreamResponse.md)\>
