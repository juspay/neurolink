[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkExecutable

# Type Alias: NeuroLinkExecutable

> **NeuroLinkExecutable** = `object`

Defined in: [types/task.ts:295](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L295)

Minimal interface for the NeuroLink SDK methods needed by TaskExecutor

## Methods

### generate()

> **generate**(`optionsOrPrompt`): `Promise`\<\{ `content`: `string`; `toolExecutions?`: `object`[]; `usage?`: \{ `input?`: `number`; `output?`: `number`; \}; \}\>

Defined in: [types/task.ts:296](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/task.ts#L296)

#### Parameters

##### optionsOrPrompt

`unknown`

#### Returns

`Promise`\<\{ `content`: `string`; `toolExecutions?`: `object`[]; `usage?`: \{ `input?`: `number`; `output?`: `number`; \}; \}\>
