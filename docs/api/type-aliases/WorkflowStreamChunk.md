[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WorkflowStreamChunk

# Type Alias: WorkflowStreamChunk

> **WorkflowStreamChunk** = `object`

Defined in: [types/workflow.ts:808](https://github.com/juspay/neurolink/blob/release/src/lib/types/workflow.ts#L808)

Progressive workflow response chunk streamed by runWorkflow().

## Properties

### type

> **type**: `"preliminary"` \| `"final"`

Defined in: [types/workflow.ts:809](https://github.com/juspay/neurolink/blob/release/src/lib/types/workflow.ts#L809)

---

### content

> **content**: `string`

Defined in: [types/workflow.ts:810](https://github.com/juspay/neurolink/blob/release/src/lib/types/workflow.ts#L810)

---

### partialResult?

> `optional` **partialResult?**: `Partial`\<[`WorkflowResult`](WorkflowResult.md)\>

Defined in: [types/workflow.ts:811](https://github.com/juspay/neurolink/blob/release/src/lib/types/workflow.ts#L811)
