[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolExecutionEvent

# Type Alias: ToolExecutionEvent

> **ToolExecutionEvent** = `object`

Defined in: [types/tools.ts:378](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L378)

Tool execution event for real-time streaming

## Properties

### type

> **type**: `"tool:start"` \| `"tool:end"`

Defined in: [types/tools.ts:379](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L379)

---

### tool

> **tool**: `string`

Defined in: [types/tools.ts:380](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L380)

---

### toolName?

> `optional` **toolName?**: `string`

Defined in: [types/tools.ts:382](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L382)

Compatibility alias for older consumers that expect `toolName`.

---

### input?

> `optional` **input?**: `unknown`

Defined in: [types/tools.ts:383](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L383)

---

### result?

> `optional` **result?**: `unknown`

Defined in: [types/tools.ts:384](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L384)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/tools.ts:385](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L385)

---

### timestamp

> **timestamp**: `number`

Defined in: [types/tools.ts:386](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L386)

---

### duration?

> `optional` **duration?**: `number`

Defined in: [types/tools.ts:387](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L387)

---

### executionId

> **executionId**: `string`

Defined in: [types/tools.ts:388](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L388)
