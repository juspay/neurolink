[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / batchRerank

# Function: batchRerank()

> **batchRerank**(`results`, `query`, `model`, `options?`): `Promise`\<[`RerankResult`](../type-aliases/RerankResult.md)[]\>

Defined in: [rag/reranker/reranker.ts:202](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/reranker/reranker.ts#L202)

Batch rerank with optimized LLM calls
Scores multiple documents in a single prompt for efficiency

## Parameters

### results

[`VectorQueryResult`](../type-aliases/VectorQueryResult.md)[]

Results to rerank

### query

`string`

Search query

### model

[`AIProvider`](../type-aliases/AIProvider.md)

Language model

### options?

[`RerankerOptions`](../type-aliases/RerankerOptions.md)

Reranking options

## Returns

`Promise`\<[`RerankResult`](../type-aliases/RerankResult.md)[]\>

Reranked results
