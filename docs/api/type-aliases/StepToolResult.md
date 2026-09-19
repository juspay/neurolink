[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StepToolResult

# Type Alias: StepToolResult

> **StepToolResult** = `object`

Defined in: [types/utilities.ts:324](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L324)

Shape of a completed tool result as returned by the AI SDK in
`onStepFinish`. Both `output` (AI SDK v4) and `result` (older shape)
are supported so the helper works across SDK versions.

## Properties

### toolName

> **toolName**: `string`

Defined in: [types/utilities.ts:325](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L325)

---

### output?

> `optional` **output?**: `unknown`

Defined in: [types/utilities.ts:326](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L326)

---

### result?

> `optional` **result?**: `unknown`

Defined in: [types/utilities.ts:327](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L327)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/utilities.ts:328](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L328)
