[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / WorkflowStreamChunk

# Type Alias: WorkflowStreamChunk

> **WorkflowStreamChunk** = `object`

Defined in: [types/workflow.ts:808](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/workflow.ts#L808)

Progressive workflow response chunk streamed by runWorkflow().

## Properties

### type

> **type**: `"preliminary"` \| `"final"`

Defined in: [types/workflow.ts:809](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/workflow.ts#L809)

---

### content

> **content**: `string`

Defined in: [types/workflow.ts:810](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/workflow.ts#L810)

---

### partialResult?

> `optional` **partialResult?**: `Partial`\<[`WorkflowResult`](WorkflowResult.md)\>

Defined in: [types/workflow.ts:811](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/workflow.ts#L811)
