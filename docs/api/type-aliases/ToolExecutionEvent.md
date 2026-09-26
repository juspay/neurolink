[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolExecutionEvent

# Type Alias: ToolExecutionEvent

> **ToolExecutionEvent** = `object`

Tool execution event for real-time streaming

## Properties

### type

> **type**: `"tool:start"` \| `"tool:end"`

---

### tool

> **tool**: `string`

---

### toolName?

> `optional` **toolName?**: `string`

Compatibility alias for older consumers that expect `toolName`.

---

### input?

> `optional` **input?**: `unknown`

---

### result?

> `optional` **result?**: `unknown`

---

### error?

> `optional` **error?**: `string`

---

### timestamp

> **timestamp**: `number`

---

### duration?

> `optional` **duration?**: `number`

---

### executionId

> **executionId**: `string`
