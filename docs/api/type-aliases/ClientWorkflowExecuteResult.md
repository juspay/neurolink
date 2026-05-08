[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClientWorkflowExecuteResult

# Type Alias: ClientWorkflowExecuteResult

> **ClientWorkflowExecuteResult** = `object`

Defined in: [types/client.ts:390](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L390)

Workflow execution result

## Properties

### runId

> **runId**: `string`

Defined in: [types/client.ts:392](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L392)

Workflow run ID

---

### workflowId

> **workflowId**: `string`

Defined in: [types/client.ts:394](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L394)

Workflow ID

---

### status

> **status**: `"running"` \| `"completed"` \| `"failed"` \| `"suspended"`

Defined in: [types/client.ts:396](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L396)

Execution status

---

### output?

> `optional` **output?**: [`UnknownRecord`](UnknownRecord.md)

Defined in: [types/client.ts:398](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L398)

Output data (if completed)

---

### error?

> `optional` **error?**: [`ClientApiError`](ClientApiError.md)

Defined in: [types/client.ts:400](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L400)

Error information (if failed)

---

### suspendToken?

> `optional` **suspendToken?**: `string`

Defined in: [types/client.ts:402](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L402)

Suspend token (if suspended)

---

### steps?

> `optional` **steps?**: `object`[]

Defined in: [types/client.ts:404](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L404)

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

Defined in: [types/client.ts:411](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L411)

Total execution duration
