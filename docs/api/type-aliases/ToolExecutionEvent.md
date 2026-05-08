[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolExecutionEvent

# Type Alias: ToolExecutionEvent

> **ToolExecutionEvent** = `object`

Defined in: [types/tools.ts:350](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L350)

Tool execution event for real-time streaming

## Properties

### type

> **type**: `"tool:start"` \| `"tool:end"`

Defined in: [types/tools.ts:351](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L351)

---

### tool

> **tool**: `string`

Defined in: [types/tools.ts:352](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L352)

---

### toolName?

> `optional` **toolName?**: `string`

Defined in: [types/tools.ts:354](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L354)

Compatibility alias for older consumers that expect `toolName`.

---

### input?

> `optional` **input?**: `unknown`

Defined in: [types/tools.ts:355](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L355)

---

### result?

> `optional` **result?**: `unknown`

Defined in: [types/tools.ts:356](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L356)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/tools.ts:357](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L357)

---

### timestamp

> **timestamp**: `number`

Defined in: [types/tools.ts:358](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L358)

---

### duration?

> `optional` **duration?**: `number`

Defined in: [types/tools.ts:359](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L359)

---

### executionId

> **executionId**: `string`

Defined in: [types/tools.ts:360](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tools.ts#L360)
