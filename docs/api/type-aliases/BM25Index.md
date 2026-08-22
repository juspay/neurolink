[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / BM25Index

# Type Alias: BM25Index

> **BM25Index** = `object`

Defined in: [types/rag.ts:443](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L443)

BM25 Index type
Implementations should provide sparse retrieval capabilities

## Methods

### search()

> **search**(`query`, `topK?`): `Promise`\<[`BM25Result`](BM25Result.md)[]\>

Defined in: [types/rag.ts:450](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L450)

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

Defined in: [types/rag.ts:456](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L456)

Add documents to the index

#### Parameters

##### documents

`object`[]

Documents to index

#### Returns

`Promise`\<`void`\>
