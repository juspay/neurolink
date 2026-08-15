[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeRetrievalConfig

# Type Alias: KnowledgeRetrievalConfig

> **KnowledgeRetrievalConfig** = `object`

Defined in: [types/knowledge.ts:182](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L182)

Lexical retrieval tuning. All fields optional; the engine supplies defaults.

## Properties

### mode?

> `optional` **mode?**: [`KnowledgeRetrievalMode`](KnowledgeRetrievalMode.md)

Defined in: [types/knowledge.ts:184](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L184)

Retrieval mode. Default: "lexical".

---

### candidateLimit?

> `optional` **candidateLimit?**: `number`

Defined in: [types/knowledge.ts:186](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L186)

How many scored candidates enter relationship expansion. Default: 24.

---

### resultLimit?

> `optional` **resultLimit?**: `number`

Defined in: [types/knowledge.ts:188](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L188)

How many primary entries survive into the assembled context. Default: 8.

---

### relationLimit?

> `optional` **relationLimit?**: `number`

Defined in: [types/knowledge.ts:190](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L190)

Cap on relationship-expanded entries added after primary retrieval. Default: 4.

---

### fieldWeights?

> `optional` **fieldWeights?**: [`KnowledgeFieldWeights`](KnowledgeFieldWeights.md)

Defined in: [types/knowledge.ts:192](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L192)

Per-field BM25 weights.

---

### exactBoost?

> `optional` **exactBoost?**: `number`

Defined in: [types/knowledge.ts:194](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L194)

Additive boost for an exact entry-id / configuration-key match. Dominant. Default: 100.

---

### aliasBoost?

> `optional` **aliasBoost?**: `number`

Defined in: [types/knowledge.ts:196](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L196)

Additive boost for an exact reviewed-alias phrase match. Default: 60.
