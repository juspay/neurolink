[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / StepToolResult

# Type Alias: StepToolResult

> **StepToolResult** = `object`

Defined in: [types/utilities.ts:310](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L310)

Shape of a completed tool result as returned by the AI SDK in
`onStepFinish`. Both `output` (AI SDK v4) and `result` (older shape)
are supported so the helper works across SDK versions.

## Properties

### toolName

> **toolName**: `string`

Defined in: [types/utilities.ts:311](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L311)

---

### output?

> `optional` **output?**: `unknown`

Defined in: [types/utilities.ts:312](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L312)

---

### result?

> `optional` **result?**: `unknown`

Defined in: [types/utilities.ts:313](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L313)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/utilities.ts:314](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L314)
