[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RerankerConfig

# Type Alias: RerankerConfig

> **RerankerConfig** = `object`

Defined in: [types/rag.ts:394](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L394)

Reranker configuration

## Properties

### type

> **type**: [`RerankerType`](RerankerType.md)

Defined in: [types/rag.ts:396](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L396)

Reranker type

---

### model?

> `optional` **model?**: `string` \| \{ `provider`: `string`; `modelName`: `string`; \}

Defined in: [types/rag.ts:398](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L398)

Model name for LLM-based rerankers

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/rag.ts:400](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L400)

Provider for the model

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/rag.ts:402](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L402)

Number of results to return after reranking

---

### weights?

> `optional` **weights?**: `object`

Defined in: [types/rag.ts:404](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L404)

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

Defined in: [types/rag.ts:410](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L410)

API key for external services (e.g., Cohere)
