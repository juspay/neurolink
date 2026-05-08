[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / BM25Index

# Type Alias: BM25Index

> **BM25Index** = `object`

Defined in: [types/rag.ts:441](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L441)

BM25 Index type
Implementations should provide sparse retrieval capabilities

## Methods

### search()

> **search**(`query`, `topK?`): `Promise`\<[`BM25Result`](BM25Result.md)[]\>

Defined in: [types/rag.ts:448](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L448)

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

Defined in: [types/rag.ts:454](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L454)

Add documents to the index

#### Parameters

##### documents

`object`[]

Documents to index

#### Returns

`Promise`\<`void`\>
