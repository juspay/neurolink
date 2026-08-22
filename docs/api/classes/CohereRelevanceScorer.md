[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / CohereRelevanceScorer

# Class: CohereRelevanceScorer

Defined in: [rag/reranker/reranker.ts:370](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/rag/reranker/reranker.ts#L370)

Cohere-style relevance scorer interface
Placeholder for integration with Cohere's rerank API

## Constructors

### Constructor

> **new CohereRelevanceScorer**(`modelName?`): `CohereRelevanceScorer`

Defined in: [rag/reranker/reranker.ts:373](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/rag/reranker/reranker.ts#L373)

#### Parameters

##### modelName?

`string` = `"rerank-v3.5"`

#### Returns

`CohereRelevanceScorer`

## Methods

### score()

> **score**(`_query`, `_documents`): `Promise`\<`object`[]\>

Defined in: [rag/reranker/reranker.ts:377](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/rag/reranker/reranker.ts#L377)

#### Parameters

##### \_query

`string`

##### \_documents

`string`[]

#### Returns

`Promise`\<`object`[]\>
