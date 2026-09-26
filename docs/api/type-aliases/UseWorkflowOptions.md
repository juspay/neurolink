[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UseWorkflowOptions

# Type Alias: UseWorkflowOptions

> **UseWorkflowOptions** = `object`

useWorkflow hook options

## Properties

### workflowId

> **workflowId**: `string`

Workflow ID

---

### onComplete?

> `optional` **onComplete?**: (`result`) => `void`

Called on workflow completion

#### Parameters

##### result

[`ClientWorkflowExecuteResult`](ClientWorkflowExecuteResult.md)

#### Returns

`void`

---

### onError?

> `optional` **onError?**: (`error`) => `void`

Called on workflow error

#### Parameters

##### error

[`ClientApiError`](ClientApiError.md)

#### Returns

`void`

---

### onStepComplete?

> `optional` **onStepComplete?**: (`step`) => `void`

Called on step completion

#### Parameters

##### step

###### stepId

`string`

###### status

`string`

###### output?

`unknown`

#### Returns

`void`

---

### pollInterval?

> `optional` **pollInterval?**: `number`

Poll interval for status updates (ms)
