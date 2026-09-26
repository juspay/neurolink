[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RerankerConfig

# Type Alias: RerankerConfig

> **RerankerConfig** = `object`

Reranker configuration

## Properties

### type

> **type**: [`RerankerType`](RerankerType.md)

Reranker type

---

### model?

> `optional` **model?**: `string` \| \{ `provider`: `string`; `modelName`: `string`; \}

Model name for LLM-based rerankers

---

### provider?

> `optional` **provider?**: `string`

Provider for the model

---

### topK?

> `optional` **topK?**: `number`

Number of results to return after reranking

---

### weights?

> `optional` **weights?**: `object`

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

API key for external services (e.g., Cohere)
