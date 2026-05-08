[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / DoGenerateModel

# Type Alias: DoGenerateModel

> **DoGenerateModel** = `object`

Defined in: [types/cli.ts:1215](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L1215)

Type for language models that expose the low-level doGenerate method.
Used by SageMaker CLI commands for direct endpoint testing and benchmarking.

## Methods

### doGenerate()

> **doGenerate**(`options`): `Promise`\<\{ `text?`: `string`; `finishReason?`: `string`; `usage`: \{ `promptTokens?`: `number`; `completionTokens?`: `number`; `inputTokens?`: `number`; `outputTokens?`: `number`; `totalTokens?`: `number`; \}; \}\>

Defined in: [types/cli.ts:1216](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L1216)

#### Parameters

##### options

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<\{ `text?`: `string`; `finishReason?`: `string`; `usage`: \{ `promptTokens?`: `number`; `completionTokens?`: `number`; `inputTokens?`: `number`; `outputTokens?`: `number`; `totalTokens?`: `number`; \}; \}\>
