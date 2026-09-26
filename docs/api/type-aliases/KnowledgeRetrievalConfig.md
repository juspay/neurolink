[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeRetrievalConfig

# Type Alias: KnowledgeRetrievalConfig

> **KnowledgeRetrievalConfig** = `object`

Lexical retrieval tuning. All fields optional; the engine supplies defaults.

## Properties

### mode?

> `optional` **mode?**: [`KnowledgeRetrievalMode`](KnowledgeRetrievalMode.md)

Retrieval mode. Default: "lexical".

---

### candidateLimit?

> `optional` **candidateLimit?**: `number`

How many scored candidates enter relationship expansion. Default: 24.

---

### resultLimit?

> `optional` **resultLimit?**: `number`

How many primary entries survive into the assembled context. Default: 8.

---

### relationLimit?

> `optional` **relationLimit?**: `number`

Cap on relationship-expanded entries added after primary retrieval. Default: 4.

---

### fieldWeights?

> `optional` **fieldWeights?**: [`KnowledgeFieldWeights`](KnowledgeFieldWeights.md)

Per-field BM25 weights.

---

### exactBoost?

> `optional` **exactBoost?**: `number`

Additive boost for an exact entry-id / configuration-key match. Dominant. Default: 100.

---

### aliasBoost?

> `optional` **aliasBoost?**: `number`

Additive boost for an exact reviewed-alias phrase match. Default: 60.
