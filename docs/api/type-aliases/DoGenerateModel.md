[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DoGenerateModel

# Type Alias: DoGenerateModel

> **DoGenerateModel** = `object`

Defined in: [types/cli.ts:1339](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1339)

Type for language models that expose the low-level doGenerate method.
Used by SageMaker CLI commands for direct endpoint testing and benchmarking.

## Methods

### doGenerate()

> **doGenerate**(`options`): `Promise`\<\{ `text?`: `string`; `finishReason?`: `string`; `usage`: \{ `promptTokens?`: `number`; `completionTokens?`: `number`; `inputTokens?`: `number`; `outputTokens?`: `number`; `totalTokens?`: `number`; \}; \}\>

Defined in: [types/cli.ts:1340](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1340)

#### Parameters

##### options

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<\{ `text?`: `string`; `finishReason?`: `string`; `usage`: \{ `promptTokens?`: `number`; `completionTokens?`: `number`; `inputTokens?`: `number`; `outputTokens?`: `number`; `totalTokens?`: `number`; \}; \}\>
