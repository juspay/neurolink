[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkExecutable

# Type Alias: NeuroLinkExecutable

> **NeuroLinkExecutable** = `object`

Defined in: [types/task.ts:295](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/task.ts#L295)

Minimal interface for the NeuroLink SDK methods needed by TaskExecutor

## Methods

### generate()

> **generate**(`optionsOrPrompt`): `Promise`\<\{ `content`: `string`; `toolExecutions?`: `object`[]; `usage?`: \{ `input?`: `number`; `output?`: `number`; \}; \}\>

Defined in: [types/task.ts:296](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/task.ts#L296)

#### Parameters

##### optionsOrPrompt

`unknown`

#### Returns

`Promise`\<\{ `content`: `string`; `toolExecutions?`: `object`[]; `usage?`: \{ `input?`: `number`; `output?`: `number`; \}; \}\>
