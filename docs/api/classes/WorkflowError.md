[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / WorkflowError

# Class: WorkflowError

Defined in: [types/workflow.ts:510](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L510)

Workflow execution error class

## Extends

- `Error`

## Constructors

### Constructor

> **new WorkflowError**(`message`, `details`): `WorkflowError`

Defined in: [types/workflow.ts:513](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L513)

#### Parameters

##### message

`string`

##### details

[`WorkflowErrorDetails`](../type-aliases/WorkflowErrorDetails.md)

#### Returns

`WorkflowError`

#### Overrides

`Error.constructor`

## Properties

### details

> `readonly` **details**: [`WorkflowErrorDetails`](../type-aliases/WorkflowErrorDetails.md)

Defined in: [types/workflow.ts:511](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/workflow.ts#L511)
