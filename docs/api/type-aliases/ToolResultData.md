[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolResultData

# Type Alias: ToolResultData

> **ToolResultData** = `object`

Structured metadata for tool_result messages.

## Properties

### success?

> `optional` **success?**: `boolean`

Whether the tool execution succeeded

---

### expression?

> `optional` **expression?**: `string`

Expression that was evaluated (for calculation tools)

---

### ~~result?~~

> `optional` **result?**: `unknown`

The tool execution result.

#### Deprecated

Read from ChatMessage.content instead. This field is dynamically
populated from content for backward compatibility and will be removed in a future version.

---

### type?

> `optional` **type?**: `string`

Result type hint

---

### error?

> `optional` **error?**: `string`

Error message if execution failed
