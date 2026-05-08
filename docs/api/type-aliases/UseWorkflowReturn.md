[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / UseWorkflowReturn

# Type Alias: UseWorkflowReturn

> **UseWorkflowReturn** = `object`

Defined in: [types/client.ts:692](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L692)

useWorkflow hook return type

## Properties

### execute

> **execute**: (`input`, `options?`) => `Promise`\<[`ClientWorkflowExecuteResult`](ClientWorkflowExecuteResult.md)\>

Defined in: [types/client.ts:694](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L694)

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

Defined in: [types/client.ts:699](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L699)

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

Defined in: [types/client.ts:704](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L704)

Get workflow status

#### Parameters

##### runId

`string`

#### Returns

`Promise`\<[`ClientWorkflowExecuteResult`](ClientWorkflowExecuteResult.md)\>

---

### cancel

> **cancel**: (`runId`) => `Promise`\<`void`\>

Defined in: [types/client.ts:706](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L706)

Cancel workflow execution

#### Parameters

##### runId

`string`

#### Returns

`Promise`\<`void`\>

---

### runId

> **runId**: `string` \| `null`

Defined in: [types/client.ts:708](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L708)

Current run ID

---

### status

> **status**: [`ClientWorkflowExecuteResult`](ClientWorkflowExecuteResult.md)\[`"status"`\] \| `null`

Defined in: [types/client.ts:710](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L710)

Execution status

---

### isLoading

> **isLoading**: `boolean`

Defined in: [types/client.ts:712](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L712)

Loading state

---

### result

> **result**: [`ClientWorkflowExecuteResult`](ClientWorkflowExecuteResult.md) \| `null`

Defined in: [types/client.ts:714](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L714)

Last result

---

### error

> **error**: [`ClientApiError`](ClientApiError.md) \| `null`

Defined in: [types/client.ts:716](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L716)

Error state

---

### clearError

> **clearError**: () => `void`

Defined in: [types/client.ts:718](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L718)

Clear error

#### Returns

`void`
