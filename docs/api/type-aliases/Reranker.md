[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / Reranker

# Type Alias: Reranker

> **Reranker** = `object`

Defined in: [types/rag.ts:378](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L378)

Reranker type - all rerankers implement this

## Properties

### type

> `readonly` **type**: [`RerankerType`](RerankerType.md)

Defined in: [types/rag.ts:380](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L380)

Reranker type identifier

## Methods

### rerank()

> **rerank**(`results`, `query`, `options?`): `Promise`\<[`RerankResult`](RerankResult.md)[]\>

Defined in: [types/rag.ts:389](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L389)

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
