[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / simpleRerank

# Function: simpleRerank()

> **simpleRerank**(`results`, `options?`): [`RerankResult`](../type-aliases/RerankResult.md)[]

Defined in: [rag/reranker/reranker.ts:333](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/rag/reranker/reranker.ts#L333)

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
