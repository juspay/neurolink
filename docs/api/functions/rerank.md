[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / rerank

# Function: rerank()

> **rerank**(`results`, `query`, `model`, `options?`): `Promise`\<[`RerankResult`](../type-aliases/RerankResult.md)[]\>

Defined in: [rag/reranker/reranker.ts:41](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/reranker/reranker.ts#L41)

Rerank vector search results using multi-factor scoring

Combines three scoring factors:

1. Semantic score: LLM-based relevance assessment
2. Vector score: Original similarity score from vector search
3. Position score: Inverse of original ranking position

## Parameters

### results

[`VectorQueryResult`](../type-aliases/VectorQueryResult.md)[]

Vector search results to rerank

### query

`string`

Original search query

### model

[`AIProvider`](../type-aliases/AIProvider.md)

Language model for semantic scoring

### options?

[`RerankerOptions`](../type-aliases/RerankerOptions.md)

Reranking options

## Returns

`Promise`\<[`RerankResult`](../type-aliases/RerankResult.md)[]\>

Reranked results with detailed scores
