[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WorkflowErrorDetails

# Type Alias: WorkflowErrorDetails

> **WorkflowErrorDetails** = `object`

Workflow execution error details

## Properties

### code

> **code**: `string`

---

### workflowId

> **workflowId**: `string`

---

### phase

> **phase**: `"ensemble"` \| `"judge"` \| `"conditioning"` \| `"validation"`

---

### details?

> `optional` **details?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

---

### retryable

> **retryable**: `boolean`

---

### originalError?

> `optional` **originalError?**: `Error`
