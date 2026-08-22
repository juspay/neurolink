[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / StepToolResult

# Type Alias: StepToolResult

> **StepToolResult** = `object`

Defined in: [types/utilities.ts:310](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/utilities.ts#L310)

Shape of a completed tool result as returned by the AI SDK in
`onStepFinish`. Both `output` (AI SDK v4) and `result` (older shape)
are supported so the helper works across SDK versions.

## Properties

### toolName

> **toolName**: `string`

Defined in: [types/utilities.ts:311](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/utilities.ts#L311)

---

### output?

> `optional` **output?**: `unknown`

Defined in: [types/utilities.ts:312](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/utilities.ts#L312)

---

### result?

> `optional` **result?**: `unknown`

Defined in: [types/utilities.ts:313](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/utilities.ts#L313)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/utilities.ts:314](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/utilities.ts#L314)
