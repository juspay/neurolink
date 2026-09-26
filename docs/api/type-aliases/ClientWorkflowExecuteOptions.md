[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientWorkflowExecuteOptions

# Type Alias: ClientWorkflowExecuteOptions

> **ClientWorkflowExecuteOptions** = `object`

Workflow execution options

## Properties

### workflowId

> **workflowId**: `string`

Workflow ID

---

### input

> **input**: [`UnknownRecord`](UnknownRecord.md)

Workflow input data

---

### sessionId?

> `optional` **sessionId?**: `string`

Session ID for state persistence

---

### resumeToken?

> `optional` **resumeToken?**: `string`

Resume from a suspended state

---

### callbackUrl?

> `optional` **callbackUrl?**: `string`

Callback URL for async completion
