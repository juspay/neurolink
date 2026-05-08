[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / WorkflowErrorDetails

# Type Alias: WorkflowErrorDetails

> **WorkflowErrorDetails** = `object`

Defined in: [types/workflow.ts:498](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L498)

Workflow execution error details

## Properties

### code

> **code**: `string`

Defined in: [types/workflow.ts:499](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L499)

---

### workflowId

> **workflowId**: `string`

Defined in: [types/workflow.ts:500](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L500)

---

### phase

> **phase**: `"ensemble"` \| `"judge"` \| `"conditioning"` \| `"validation"`

Defined in: [types/workflow.ts:501](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L501)

---

### details?

> `optional` **details?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/workflow.ts:502](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L502)

---

### retryable

> **retryable**: `boolean`

Defined in: [types/workflow.ts:503](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L503)

---

### originalError?

> `optional` **originalError?**: `Error`

Defined in: [types/workflow.ts:504](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L504)
