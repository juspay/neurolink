[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / InMemoryBM25Index

# Class: InMemoryBM25Index

Defined in: [rag/retrieval/hybridSearch.ts:28](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/rag/retrieval/hybridSearch.ts#L28)

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

Defined in: [rag/retrieval/hybridSearch.ts:37](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/rag/retrieval/hybridSearch.ts#L37)

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

Defined in: [rag/retrieval/hybridSearch.ts:95](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/rag/retrieval/hybridSearch.ts#L95)

Add documents to the index

#### Parameters

##### documents

`object`[]

Documents to index

#### Returns

`Promise`\<`void`\>

#### Implementation of

`BM25Index.addDocuments`
