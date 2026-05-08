[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / CohereRelevanceScorer

# Class: CohereRelevanceScorer

Defined in: [rag/reranker/reranker.ts:370](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/reranker/reranker.ts#L370)

Cohere-style relevance scorer interface
Placeholder for integration with Cohere's rerank API

## Constructors

### Constructor

> **new CohereRelevanceScorer**(`modelName?`): `CohereRelevanceScorer`

Defined in: [rag/reranker/reranker.ts:373](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/reranker/reranker.ts#L373)

#### Parameters

##### modelName?

`string` = `"rerank-v3.5"`

#### Returns

`CohereRelevanceScorer`

## Methods

### score()

> **score**(`_query`, `_documents`): `Promise`\<`object`[]\>

Defined in: [rag/reranker/reranker.ts:377](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/reranker/reranker.ts#L377)

#### Parameters

##### \_query

`string`

##### \_documents

`string`[]

#### Returns

`Promise`\<`object`[]\>
