[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientLanguageModel

# Type Alias: ClientLanguageModel

> **ClientLanguageModel** = `object`

AI SDK Language Model interface (Vercel AI SDK compatible)

## Properties

### modelId

> **modelId**: `string`

Model specification string

---

### provider

> **provider**: `string`

Provider name

---

### doGenerate

> **doGenerate**: (`options`) => `Promise`\<[`ClientLanguageModelResponse`](ClientLanguageModelResponse.md)\>

Generate non-streaming response

#### Parameters

##### options

[`ClientLanguageModelCallOptions`](ClientLanguageModelCallOptions.md)

#### Returns

`Promise`\<[`ClientLanguageModelResponse`](ClientLanguageModelResponse.md)\>

---

### doStream

> **doStream**: (`options`) => `Promise`\<[`ClientLanguageModelStreamResponse`](ClientLanguageModelStreamResponse.md)\>

Generate streaming response

#### Parameters

##### options

[`ClientLanguageModelCallOptions`](ClientLanguageModelCallOptions.md)

#### Returns

`Promise`\<[`ClientLanguageModelStreamResponse`](ClientLanguageModelStreamResponse.md)\>
