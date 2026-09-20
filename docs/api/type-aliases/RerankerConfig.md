[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RerankerConfig

# Type Alias: RerankerConfig

> **RerankerConfig** = `object`

Defined in: [types/rag.ts:418](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L418)

Reranker configuration

## Properties

### type

> **type**: [`RerankerType`](RerankerType.md)

Defined in: [types/rag.ts:420](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L420)

Reranker type

---

### model?

> `optional` **model?**: `string` \| \{ `provider`: `string`; `modelName`: `string`; \}

Defined in: [types/rag.ts:422](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L422)

Model name for LLM-based rerankers

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/rag.ts:424](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L424)

Provider for the model

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/rag.ts:426](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L426)

Number of results to return after reranking

---

### weights?

> `optional` **weights?**: `object`

Defined in: [types/rag.ts:428](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L428)

Scoring weights

#### semantic?

> `optional` **semantic?**: `number`

#### vector?

> `optional` **vector?**: `number`

#### position?

> `optional` **position?**: `number`

---

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/rag.ts:434](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L434)

API key for external services (e.g., Cohere)
