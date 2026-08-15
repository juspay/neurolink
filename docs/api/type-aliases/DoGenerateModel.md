[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / DoGenerateModel

# Type Alias: DoGenerateModel

> **DoGenerateModel** = `object`

Defined in: [types/cli.ts:1335](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/cli.ts#L1335)

Type for language models that expose the low-level doGenerate method.
Used by SageMaker CLI commands for direct endpoint testing and benchmarking.

## Methods

### doGenerate()

> **doGenerate**(`options`): `Promise`\<\{ `text?`: `string`; `finishReason?`: `string`; `usage`: \{ `promptTokens?`: `number`; `completionTokens?`: `number`; `inputTokens?`: `number`; `outputTokens?`: `number`; `totalTokens?`: `number`; \}; \}\>

Defined in: [types/cli.ts:1336](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/cli.ts#L1336)

#### Parameters

##### options

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<\{ `text?`: `string`; `finishReason?`: `string`; `usage`: \{ `promptTokens?`: `number`; `completionTokens?`: `number`; `inputTokens?`: `number`; `outputTokens?`: `number`; `totalTokens?`: `number`; \}; \}\>
