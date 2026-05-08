[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / simpleRerank

# Function: simpleRerank()

> **simpleRerank**(`results`, `options?`): [`RerankResult`](../type-aliases/RerankResult.md)[]

Defined in: [rag/reranker/reranker.ts:333](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/reranker/reranker.ts#L333)

Simple position-based reranker (no LLM required)
Uses only vector score and position

## Parameters

### results

[`VectorQueryResult`](../type-aliases/VectorQueryResult.md)[]

Results to rerank

### options?

Reranking options

#### topK?

`number`

#### vectorWeight?

`number`

#### positionWeight?

`number`

## Returns

[`RerankResult`](../type-aliases/RerankResult.md)[]

Reranked results
