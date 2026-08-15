[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / Reranker

# Type Alias: Reranker

> **Reranker** = `object`

Defined in: [types/rag.ts:375](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L375)

Reranker type - all rerankers implement this

## Properties

### type

> `readonly` **type**: [`RerankerType`](RerankerType.md)

Defined in: [types/rag.ts:377](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L377)

Reranker type identifier

## Methods

### rerank()

> **rerank**(`results`, `query`, `options?`): `Promise`\<[`RerankResult`](RerankResult.md)[]\>

Defined in: [types/rag.ts:386](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L386)

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
