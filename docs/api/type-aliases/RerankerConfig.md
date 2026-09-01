[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RerankerConfig

# Type Alias: RerankerConfig

> **RerankerConfig** = `object`

Defined in: [types/rag.ts:399](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L399)

Reranker configuration

## Properties

### type

> **type**: [`RerankerType`](RerankerType.md)

Defined in: [types/rag.ts:401](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L401)

Reranker type

---

### model?

> `optional` **model?**: `string` \| \{ `provider`: `string`; `modelName`: `string`; \}

Defined in: [types/rag.ts:403](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L403)

Model name for LLM-based rerankers

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/rag.ts:405](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L405)

Provider for the model

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/rag.ts:407](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L407)

Number of results to return after reranking

---

### weights?

> `optional` **weights?**: `object`

Defined in: [types/rag.ts:409](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L409)

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

Defined in: [types/rag.ts:415](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L415)

API key for external services (e.g., Cohere)
