[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / DoGenerateModel

# Type Alias: DoGenerateModel

> **DoGenerateModel** = `object`

Defined in: [types/cli.ts:1335](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/cli.ts#L1335)

Type for language models that expose the low-level doGenerate method.
Used by SageMaker CLI commands for direct endpoint testing and benchmarking.

## Methods

### doGenerate()

> **doGenerate**(`options`): `Promise`\<\{ `text?`: `string`; `finishReason?`: `string`; `usage`: \{ `promptTokens?`: `number`; `completionTokens?`: `number`; `inputTokens?`: `number`; `outputTokens?`: `number`; `totalTokens?`: `number`; \}; \}\>

Defined in: [types/cli.ts:1336](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/cli.ts#L1336)

#### Parameters

##### options

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<\{ `text?`: `string`; `finishReason?`: `string`; `usage`: \{ `promptTokens?`: `number`; `completionTokens?`: `number`; `inputTokens?`: `number`; `outputTokens?`: `number`; `totalTokens?`: `number`; \}; \}\>
