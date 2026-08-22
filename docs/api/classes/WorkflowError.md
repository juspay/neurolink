[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WorkflowError

# Class: WorkflowError

Defined in: [types/workflow.ts:510](https://github.com/juspay/neurolink/blob/release/src/lib/types/workflow.ts#L510)

Workflow execution error class

## Extends

- `Error`

## Constructors

### Constructor

> **new WorkflowError**(`message`, `details`): `WorkflowError`

Defined in: [types/workflow.ts:513](https://github.com/juspay/neurolink/blob/release/src/lib/types/workflow.ts#L513)

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

Defined in: [types/workflow.ts:511](https://github.com/juspay/neurolink/blob/release/src/lib/types/workflow.ts#L511)
