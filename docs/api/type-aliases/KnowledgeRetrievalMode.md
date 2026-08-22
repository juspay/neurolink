[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeRetrievalMode

# Type Alias: KnowledgeRetrievalMode

> **KnowledgeRetrievalMode** = `"lexical"`

Defined in: [types/knowledge.ts:55](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L55)

Retrieval mode. Only `"lexical"` is supported in the first release; the
literal is a union of one to reserve a clean upgrade path to `"hybrid"` /
`"vector"` without a breaking change.
