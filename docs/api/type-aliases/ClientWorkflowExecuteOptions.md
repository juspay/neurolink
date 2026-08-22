[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientWorkflowExecuteOptions

# Type Alias: ClientWorkflowExecuteOptions

> **ClientWorkflowExecuteOptions** = `object`

Defined in: [types/client.ts:374](https://github.com/juspay/neurolink/blob/release/src/lib/types/client.ts#L374)

Workflow execution options

## Properties

### workflowId

> **workflowId**: `string`

Defined in: [types/client.ts:376](https://github.com/juspay/neurolink/blob/release/src/lib/types/client.ts#L376)

Workflow ID

---

### input

> **input**: [`UnknownRecord`](UnknownRecord.md)

Defined in: [types/client.ts:378](https://github.com/juspay/neurolink/blob/release/src/lib/types/client.ts#L378)

Workflow input data

---

### sessionId?

> `optional` **sessionId?**: `string`

Defined in: [types/client.ts:380](https://github.com/juspay/neurolink/blob/release/src/lib/types/client.ts#L380)

Session ID for state persistence

---

### resumeToken?

> `optional` **resumeToken?**: `string`

Defined in: [types/client.ts:382](https://github.com/juspay/neurolink/blob/release/src/lib/types/client.ts#L382)

Resume from a suspended state

---

### callbackUrl?

> `optional` **callbackUrl?**: `string`

Defined in: [types/client.ts:384](https://github.com/juspay/neurolink/blob/release/src/lib/types/client.ts#L384)

Callback URL for async completion
