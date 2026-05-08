[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / InMemoryBM25Index

# Class: InMemoryBM25Index

Defined in: [rag/retrieval/hybridSearch.ts:28](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/retrieval/hybridSearch.ts#L28)

In-memory BM25 implementation for testing and development

## Implements

- [`BM25Index`](../type-aliases/BM25Index.md)

## Constructors

### Constructor

> **new InMemoryBM25Index**(): `InMemoryBM25Index`

#### Returns

`InMemoryBM25Index`

## Methods

### search()

> **search**(`query`, `topK?`): `Promise`\<[`BM25Result`](../type-aliases/BM25Result.md)[]\>

Defined in: [rag/retrieval/hybridSearch.ts:37](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/retrieval/hybridSearch.ts#L37)

Search documents using BM25 algorithm

#### Parameters

##### query

`string`

Search query string

##### topK?

`number` = `10`

Number of results to return

#### Returns

`Promise`\<[`BM25Result`](../type-aliases/BM25Result.md)[]\>

Array of BM25 results

#### Implementation of

`BM25Index.search`

---

### addDocuments()

> **addDocuments**(`documents`): `Promise`\<`void`\>

Defined in: [rag/retrieval/hybridSearch.ts:95](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/retrieval/hybridSearch.ts#L95)

Add documents to the index

#### Parameters

##### documents

`object`[]

Documents to index

#### Returns

`Promise`\<`void`\>

#### Implementation of

`BM25Index.addDocuments`
