[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / Reranker

# Type Alias: Reranker

> **Reranker** = `object`

Reranker type - all rerankers implement this

## Properties

### type

> `readonly` **type**: [`RerankerType`](RerankerType.md)

Reranker type identifier

## Methods

### rerank()

> **rerank**(`results`, `query`, `options?`): `Promise`\<[`RerankResult`](RerankResult.md)[]\>

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
