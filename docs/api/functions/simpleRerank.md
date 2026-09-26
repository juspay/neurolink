[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / simpleRerank

# Function: simpleRerank()

> **simpleRerank**(`results`, `options?`): [`RerankResult`](../type-aliases/RerankResult.md)[]

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
