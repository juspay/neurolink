[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeRetrievalConfidence

# Type Alias: KnowledgeRetrievalConfidence

> **KnowledgeRetrievalConfidence** = `"high"` \| `"medium"` \| `"low"` \| `"none"`

Defined in: [types/knowledge.ts:62](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L62)

Confidence class returned with every retrieval so the host prompt can
instruct the model to qualify low-confidence answers rather than present
them as authoritative.
