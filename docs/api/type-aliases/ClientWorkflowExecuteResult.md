[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientWorkflowExecuteResult

# Type Alias: ClientWorkflowExecuteResult

> **ClientWorkflowExecuteResult** = `object`

Workflow execution result

## Properties

### runId

> **runId**: `string`

Workflow run ID

---

### workflowId

> **workflowId**: `string`

Workflow ID

---

### status

> **status**: `"running"` \| `"completed"` \| `"failed"` \| `"suspended"`

Execution status

---

### output?

> `optional` **output?**: [`UnknownRecord`](UnknownRecord.md)

Output data (if completed)

---

### error?

> `optional` **error?**: [`ClientApiError`](ClientApiError.md)

Error information (if failed)

---

### suspendToken?

> `optional` **suspendToken?**: `string`

Suspend token (if suspended)

---

### steps?

> `optional` **steps?**: `object`[]

Step results

#### stepId

> **stepId**: `string`

#### status

> **status**: `"completed"` \| `"failed"` \| `"skipped"`

#### output?

> `optional` **output?**: `unknown`

#### duration

> **duration**: `number`

---

### duration?

> `optional` **duration?**: `number`

Total execution duration
