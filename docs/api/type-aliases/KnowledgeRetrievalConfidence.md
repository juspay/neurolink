[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeRetrievalConfidence

# Type Alias: KnowledgeRetrievalConfidence

> **KnowledgeRetrievalConfidence** = `"high"` \| `"medium"` \| `"low"` \| `"none"`

Defined in: [types/knowledge.ts:62](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L62)

Confidence class returned with every retrieval so the host prompt can
instruct the model to qualify low-confidence answers rather than present
them as authoritative.
