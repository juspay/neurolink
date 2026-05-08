[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / WorkflowGenerateOptions

# Type Alias: WorkflowGenerateOptions

> **WorkflowGenerateOptions** = `object`

Defined in: [types/workflow.ts:239](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L239)

Options for workflow execution

## Properties

### workflowId

> **workflowId**: `string`

Defined in: [types/workflow.ts:241](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L241)

---

### input

> **input**: [`WorkflowInput`](WorkflowInput.md)

Defined in: [types/workflow.ts:242](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L242)

---

### overrides?

> `optional` **overrides?**: `Partial`\<[`WorkflowConfig`](WorkflowConfig.md)\>

Defined in: [types/workflow.ts:245](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L245)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/workflow.ts:246](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L246)

---

### enableAnalytics?

> `optional` **enableAnalytics?**: `boolean`

Defined in: [types/workflow.ts:249](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L249)

---

### enableEvaluation?

> `optional` **enableEvaluation?**: `boolean`

Defined in: [types/workflow.ts:250](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L250)

---

### context?

> `optional` **context?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/workflow.ts:251](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L251)
