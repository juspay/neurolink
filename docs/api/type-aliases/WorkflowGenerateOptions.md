[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / WorkflowGenerateOptions

# Type Alias: WorkflowGenerateOptions

> **WorkflowGenerateOptions** = `object`

Defined in: [types/workflow.ts:239](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L239)

Options for workflow execution

## Properties

### workflowId

> **workflowId**: `string`

Defined in: [types/workflow.ts:241](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L241)

---

### input

> **input**: [`WorkflowInput`](WorkflowInput.md)

Defined in: [types/workflow.ts:242](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L242)

---

### overrides?

> `optional` **overrides?**: `Partial`\<[`WorkflowConfig`](WorkflowConfig.md)\>

Defined in: [types/workflow.ts:245](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L245)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/workflow.ts:246](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L246)

---

### enableAnalytics?

> `optional` **enableAnalytics?**: `boolean`

Defined in: [types/workflow.ts:249](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L249)

---

### enableEvaluation?

> `optional` **enableEvaluation?**: `boolean`

Defined in: [types/workflow.ts:250](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L250)

---

### context?

> `optional` **context?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/workflow.ts:251](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L251)
