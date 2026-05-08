[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / Reranker

# Type Alias: Reranker

> **Reranker** = `object`

Defined in: [types/rag.ts:373](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L373)

Reranker type - all rerankers implement this

## Properties

### type

> `readonly` **type**: [`RerankerType`](RerankerType.md)

Defined in: [types/rag.ts:375](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L375)

Reranker type identifier

## Methods

### rerank()

> **rerank**(`results`, `query`, `options?`): `Promise`\<[`RerankResult`](RerankResult.md)[]\>

Defined in: [types/rag.ts:384](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L384)

Rerank results based on query relevance

#### Parameters

##### results

[`VectorQueryResult`](VectorQueryResult.md)[]

Vector search results to rerank

##### query

`string`

Original search query

##### options?

[`RerankerOptions`](RerankerOptions.md)

Reranking options

#### Returns

`Promise`\<[`RerankResult`](RerankResult.md)[]\>

Reranked results with scores
