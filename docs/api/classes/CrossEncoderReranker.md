[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / CrossEncoderReranker

# Class: CrossEncoderReranker

Defined in: [rag/reranker/reranker.ts:393](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/reranker/reranker.ts#L393)

Cross-encoder style reranker interface
Placeholder for integration with cross-encoder models

## Constructors

### Constructor

> **new CrossEncoderReranker**(`modelName?`): `CrossEncoderReranker`

Defined in: [rag/reranker/reranker.ts:396](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/reranker/reranker.ts#L396)

#### Parameters

##### modelName?

`string` = `"ms-marco-MiniLM-L-6-v2"`

#### Returns

`CrossEncoderReranker`

## Methods

### rerank()

> **rerank**(`_query`, `_documents`): `Promise`\<`object`[]\>

Defined in: [rag/reranker/reranker.ts:400](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/reranker/reranker.ts#L400)

#### Parameters

##### \_query

`string`

##### \_documents

`string`[]

#### Returns

`Promise`\<`object`[]\>
