[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolExecuteResponse

# Type Alias: ToolExecuteResponse

> **ToolExecuteResponse** = `object`

Tool execution response

## Properties

### success

> **success**: `boolean`

Whether execution was successful

---

### data?

> `optional` **data?**: `unknown`

Result data

---

### error?

> `optional` **error?**: `string`

Error message if failed

---

### duration

> **duration**: `number`

Execution duration in ms

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Tool metadata
