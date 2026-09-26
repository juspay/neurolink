[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeGroundingMetadata

# Type Alias: KnowledgeGroundingMetadata

> **KnowledgeGroundingMetadata** = `object`

Aggregate, content-free diagnostics attached to a generation/stream result
so the host can evaluate retrieval without the SDK exposing entry bodies.

## Properties

### retrievalMode

> **retrievalMode**: [`KnowledgeRetrievalMode`](KnowledgeRetrievalMode.md)

---

### selectedIds

> **selectedIds**: `string`[]

---

### expandedIds

> **expandedIds**: `string`[]

---

### candidateCount

> **candidateCount**: `number`

---

### contextTokens

> **contextTokens**: `number`

---

### truncated

> **truncated**: `boolean`

---

### durationMs

> **durationMs**: `number`

---

### confidence?

> `optional` **confidence?**: [`KnowledgeRetrievalConfidence`](KnowledgeRetrievalConfidence.md)

---

### failureReason?

> `optional` **failureReason?**: `string`

Present when grounding failed open; names the failure class.
