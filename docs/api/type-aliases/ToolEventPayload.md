[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolEventPayload

# Type Alias: ToolEventPayload

> **ToolEventPayload** = `object`

Payload emitted for tool:start and tool:end events.
Always includes both `tool` and `toolName` for backward compatibility.

## Properties

### tool

> **tool**: `string`

---

### toolName

> **toolName**: `string`

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

### success?

> `optional` **success?**: `boolean`

---

### responseTime?

> `optional` **responseTime?**: `number`

---

### timestamp?

> `optional` **timestamp?**: `number`

---

### duration?

> `optional` **duration?**: `number`

---

### executionId?

> `optional` **executionId?**: `string`
