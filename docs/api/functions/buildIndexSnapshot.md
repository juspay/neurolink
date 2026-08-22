[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / buildIndexSnapshot

# Function: buildIndexSnapshot()

> **buildIndexSnapshot**(`entries`, `weights`): [`KnowledgeIndexSnapshot`](../type-aliases/KnowledgeIndexSnapshot.md)

Defined in: [knowledge/knowledgeIndex.ts:220](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/knowledge/knowledgeIndex.ts#L220)

Build the complete immutable snapshot: entry map, exact/alias/relation
indexes, and the field-aware lexical index.

## Parameters

### entries

[`NormalizedKnowledgeEntry`](../type-aliases/NormalizedKnowledgeEntry.md)[]

### weights

[`KnowledgeFieldWeights`](../type-aliases/KnowledgeFieldWeights.md)

## Returns

[`KnowledgeIndexSnapshot`](../type-aliases/KnowledgeIndexSnapshot.md)
