[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / VectorQueryToolConfig

# Type Alias: VectorQueryToolConfig

> **VectorQueryToolConfig** = `object`

Defined in: [types/rag.ts:1191](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1191)

Vector query tool configuration

## Properties

### id?

> `optional` **id?**: `string`

Defined in: [types/rag.ts:1193](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1193)

Tool identifier

---

### description?

> `optional` **description?**: `string`

Defined in: [types/rag.ts:1195](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1195)

Tool description for AI agents

---

### indexName

> **indexName**: `string`

Defined in: [types/rag.ts:1197](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1197)

Index name within the vector store

---

### embeddingModel

> **embeddingModel**: `object`

Defined in: [types/rag.ts:1199](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1199)

Embedding model specification

#### provider

> **provider**: `string`

#### modelName

> **modelName**: `string`

---

### enableFilter?

> `optional` **enableFilter?**: `boolean`

Defined in: [types/rag.ts:1204](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1204)

Enable metadata filtering

---

### includeVectors?

> `optional` **includeVectors?**: `boolean`

Defined in: [types/rag.ts:1206](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1206)

Include embedding vectors in results

---

### includeSources?

> `optional` **includeSources?**: `boolean`

Defined in: [types/rag.ts:1208](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1208)

Include full source objects in results

---

### topK?

> `optional` **topK?**: `number`

Defined in: [types/rag.ts:1210](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1210)

Number of results to return

---

### reranker?

> `optional` **reranker?**: [`RerankerConfig`](RerankerConfig.md)

Defined in: [types/rag.ts:1212](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1212)

Reranker configuration

---

### providerOptions?

> `optional` **providerOptions?**: [`VectorProviderOptions`](VectorProviderOptions.md)

Defined in: [types/rag.ts:1214](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1214)

Provider-specific options
