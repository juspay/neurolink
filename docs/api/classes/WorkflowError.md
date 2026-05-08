[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / WorkflowError

# Class: WorkflowError

Defined in: [types/workflow.ts:510](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L510)

Workflow execution error class

## Extends

- `Error`

## Constructors

### Constructor

> **new WorkflowError**(`message`, `details`): `WorkflowError`

Defined in: [types/workflow.ts:513](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L513)

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

Defined in: [types/workflow.ts:511](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L511)
