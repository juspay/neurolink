[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / assembleKnowledgeContext

# Function: assembleKnowledgeContext()

> **assembleKnowledgeContext**(`selection`, `config`): [`KnowledgeAssembledContext`](../type-aliases/KnowledgeAssembledContext.md)

Defined in: [knowledge/context.ts:77](https://github.com/juspay/neurolink/blob/release/src/lib/knowledge/context.ts#L77)

Assemble the selected entries into a bounded grounding block. Primary entries
come first, then relationship-expanded ones. Returns the string, the
citations for included entries, an estimated token count, and whether any
entry was degraded or dropped for budget.

## Parameters

### selection

[`KnowledgeSelection`](../type-aliases/KnowledgeSelection.md)

### config

[`KnowledgeContextConfig`](../type-aliases/KnowledgeContextConfig.md) \| `undefined`

## Returns

[`KnowledgeAssembledContext`](../type-aliases/KnowledgeAssembledContext.md)
