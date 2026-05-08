[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / UseWorkflowOptions

# Type Alias: UseWorkflowOptions

> **UseWorkflowOptions** = `object`

Defined in: [types/client.ts:672](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L672)

useWorkflow hook options

## Properties

### workflowId

> **workflowId**: `string`

Defined in: [types/client.ts:674](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L674)

Workflow ID

---

### onComplete?

> `optional` **onComplete?**: (`result`) => `void`

Defined in: [types/client.ts:676](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L676)

Called on workflow completion

#### Parameters

##### result

[`ClientWorkflowExecuteResult`](ClientWorkflowExecuteResult.md)

#### Returns

`void`

---

### onError?

> `optional` **onError?**: (`error`) => `void`

Defined in: [types/client.ts:678](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L678)

Called on workflow error

#### Parameters

##### error

[`ClientApiError`](ClientApiError.md)

#### Returns

`void`

---

### onStepComplete?

> `optional` **onStepComplete?**: (`step`) => `void`

Defined in: [types/client.ts:680](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L680)

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

Defined in: [types/client.ts:686](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/client.ts#L686)

Poll interval for status updates (ms)
