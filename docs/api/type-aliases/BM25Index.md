[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BM25Index

# Type Alias: BM25Index

> **BM25Index** = `object`

Defined in: [types/rag.ts:446](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L446)

BM25 Index type
Implementations should provide sparse retrieval capabilities

## Methods

### search()

> **search**(`query`, `topK?`): `Promise`\<[`BM25Result`](BM25Result.md)[]\>

Defined in: [types/rag.ts:453](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L453)

Search documents using BM25 algorithm

#### Parameters

##### query

`string`

Search query string

##### topK?

`number`

Number of results to return

#### Returns

`Promise`\<[`BM25Result`](BM25Result.md)[]\>

Array of BM25 results

---

### addDocuments()

> **addDocuments**(`documents`): `Promise`\<`void`\>

Defined in: [types/rag.ts:459](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L459)

Add documents to the index

#### Parameters

##### documents

`object`[]

Documents to index

#### Returns

`Promise`\<`void`\>
