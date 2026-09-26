[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerStreamingToolResult

# Type Alias: SageMakerStreamingToolResult

> **SageMakerStreamingToolResult** = `object`

Streaming tool result information (Phase 2.3)

## Properties

### toolCallId

> **toolCallId**: `string`

Tool call identifier

---

### toolName

> **toolName**: `string`

Tool name

---

### result?

> `optional` **result?**: `unknown`

Partial or complete result data

---

### resultDelta?

> `optional` **resultDelta?**: `string`

Result delta for incremental responses

---

### status

> **status**: `"pending"` \| `"running"` \| `"success"` \| `"error"`

Execution status

---

### error?

> `optional` **error?**: `string`

Error message if status is error

---

### complete?

> `optional` **complete?**: `boolean`

Indicates if this result is complete
