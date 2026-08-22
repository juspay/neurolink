[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / assembleKnowledgeContext

# Function: assembleKnowledgeContext()

> **assembleKnowledgeContext**(`selection`, `config`): `KnowledgeAssembledContext`

Defined in: [knowledge/context.ts:77](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/knowledge/context.ts#L77)

Assemble the selected entries into a bounded grounding block. Primary entries
come first, then relationship-expanded ones. Returns the string, the
citations for included entries, an estimated token count, and whether any
entry was degraded or dropped for budget.

## Parameters

### selection

`KnowledgeSelection`

### config

[`KnowledgeContextConfig`](../type-aliases/KnowledgeContextConfig.md) \| `undefined`

## Returns

`KnowledgeAssembledContext`
