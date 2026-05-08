[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / WorkflowStreamChunk

# Type Alias: WorkflowStreamChunk

> **WorkflowStreamChunk** = `object`

Defined in: [types/workflow.ts:808](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L808)

Progressive workflow response chunk streamed by runWorkflow().

## Properties

### type

> **type**: `"preliminary"` \| `"final"`

Defined in: [types/workflow.ts:809](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L809)

---

### content

> **content**: `string`

Defined in: [types/workflow.ts:810](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L810)

---

### partialResult?

> `optional` **partialResult?**: `Partial`\<[`WorkflowResult`](WorkflowResult.md)\>

Defined in: [types/workflow.ts:811](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/workflow.ts#L811)
