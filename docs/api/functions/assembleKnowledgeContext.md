[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / assembleKnowledgeContext

# Function: assembleKnowledgeContext()

> **assembleKnowledgeContext**(`selection`, `config`): `KnowledgeAssembledContext`

Defined in: [knowledge/context.ts:77](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/knowledge/context.ts#L77)

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
