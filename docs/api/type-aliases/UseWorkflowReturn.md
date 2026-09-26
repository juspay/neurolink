[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / UseWorkflowReturn

# Type Alias: UseWorkflowReturn

> **UseWorkflowReturn** = `object`

useWorkflow hook return type

## Properties

### execute

> **execute**: (`input`, `options?`) => `Promise`\<[`ClientWorkflowExecuteResult`](ClientWorkflowExecuteResult.md)\>

Execute the workflow

#### Parameters

##### input

[`UnknownRecord`](UnknownRecord.md)

##### options?

`Partial`\<[`ClientWorkflowExecuteOptions`](ClientWorkflowExecuteOptions.md)\>

#### Returns

`Promise`\<[`ClientWorkflowExecuteResult`](ClientWorkflowExecuteResult.md)\>

---

### resume

> **resume**: (`resumeToken`, `resumeData?`) => `Promise`\<[`ClientWorkflowExecuteResult`](ClientWorkflowExecuteResult.md)\>

Resume a suspended workflow

#### Parameters

##### resumeToken

`string`

##### resumeData?

[`UnknownRecord`](UnknownRecord.md)

#### Returns

`Promise`\<[`ClientWorkflowExecuteResult`](ClientWorkflowExecuteResult.md)\>

---

### getStatus

> **getStatus**: (`runId`) => `Promise`\<[`ClientWorkflowExecuteResult`](ClientWorkflowExecuteResult.md)\>

Get workflow status

#### Parameters

##### runId

`string`

#### Returns

`Promise`\<[`ClientWorkflowExecuteResult`](ClientWorkflowExecuteResult.md)\>

---

### cancel

> **cancel**: (`runId`) => `Promise`\<`void`\>

Cancel workflow execution

#### Parameters

##### runId

`string`

#### Returns

`Promise`\<`void`\>

---

### runId

> **runId**: `string` \| `null`

Current run ID

---

### status

> **status**: [`ClientWorkflowExecuteResult`](ClientWorkflowExecuteResult.md)\[`"status"`\] \| `null`

Execution status

---

### isLoading

> **isLoading**: `boolean`

Loading state

---

### result

> **result**: [`ClientWorkflowExecuteResult`](ClientWorkflowExecuteResult.md) \| `null`

Last result

---

### error

> **error**: [`ClientApiError`](ClientApiError.md) \| `null`

Error state

---

### clearError

> **clearError**: () => `void`

Clear error

#### Returns

`void`
