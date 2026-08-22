[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolExecutionEvent

# Type Alias: ToolExecutionEvent

> **ToolExecutionEvent** = `object`

Defined in: [types/tools.ts:367](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L367)

Tool execution event for real-time streaming

## Properties

### type

> **type**: `"tool:start"` \| `"tool:end"`

Defined in: [types/tools.ts:368](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L368)

---

### tool

> **tool**: `string`

Defined in: [types/tools.ts:369](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L369)

---

### toolName?

> `optional` **toolName?**: `string`

Defined in: [types/tools.ts:371](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L371)

Compatibility alias for older consumers that expect `toolName`.

---

### input?

> `optional` **input?**: `unknown`

Defined in: [types/tools.ts:372](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L372)

---

### result?

> `optional` **result?**: `unknown`

Defined in: [types/tools.ts:373](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L373)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/tools.ts:374](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L374)

---

### timestamp

> **timestamp**: `number`

Defined in: [types/tools.ts:375](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L375)

---

### duration?

> `optional` **duration?**: `number`

Defined in: [types/tools.ts:376](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L376)

---

### executionId

> **executionId**: `string`

Defined in: [types/tools.ts:377](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L377)
