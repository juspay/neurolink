[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolExecutionEvent

# Type Alias: ToolExecutionEvent

> **ToolExecutionEvent** = `object`

Defined in: [types/tools.ts:401](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L401)

Tool execution event for real-time streaming

## Properties

### type

> **type**: `"tool:start"` \| `"tool:end"`

Defined in: [types/tools.ts:402](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L402)

---

### tool

> **tool**: `string`

Defined in: [types/tools.ts:403](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L403)

---

### toolName?

> `optional` **toolName?**: `string`

Defined in: [types/tools.ts:405](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L405)

Compatibility alias for older consumers that expect `toolName`.

---

### input?

> `optional` **input?**: `unknown`

Defined in: [types/tools.ts:406](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L406)

---

### result?

> `optional` **result?**: `unknown`

Defined in: [types/tools.ts:407](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L407)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/tools.ts:408](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L408)

---

### timestamp

> **timestamp**: `number`

Defined in: [types/tools.ts:409](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L409)

---

### duration?

> `optional` **duration?**: `number`

Defined in: [types/tools.ts:410](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L410)

---

### executionId

> **executionId**: `string`

Defined in: [types/tools.ts:411](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L411)
