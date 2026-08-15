[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / CohereRelevanceScorer

# Class: CohereRelevanceScorer

Defined in: [rag/reranker/reranker.ts:370](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/rag/reranker/reranker.ts#L370)

Cohere-style relevance scorer interface
Placeholder for integration with Cohere's rerank API

## Constructors

### Constructor

> **new CohereRelevanceScorer**(`modelName?`): `CohereRelevanceScorer`

Defined in: [rag/reranker/reranker.ts:373](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/rag/reranker/reranker.ts#L373)

#### Parameters

##### modelName?

`string` = `"rerank-v3.5"`

#### Returns

`CohereRelevanceScorer`

## Methods

### score()

> **score**(`_query`, `_documents`): `Promise`\<`object`[]\>

Defined in: [rag/reranker/reranker.ts:377](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/rag/reranker/reranker.ts#L377)

#### Parameters

##### \_query

`string`

##### \_documents

`string`[]

#### Returns

`Promise`\<`object`[]\>
