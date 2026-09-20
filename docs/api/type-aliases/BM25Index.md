[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BM25Index

# Type Alias: BM25Index

> **BM25Index** = `object`

Defined in: [types/rag.ts:465](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L465)

BM25 Index type
Implementations should provide sparse retrieval capabilities

## Methods

### search()

> **search**(`query`, `topK?`): `Promise`\<[`BM25Result`](BM25Result.md)[]\>

Defined in: [types/rag.ts:472](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L472)

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

Defined in: [types/rag.ts:478](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L478)

Add documents to the index

#### Parameters

##### documents

`object`[]

Documents to index

#### Returns

`Promise`\<`void`\>
