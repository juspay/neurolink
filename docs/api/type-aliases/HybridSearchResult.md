[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HybridSearchResult

# Type Alias: HybridSearchResult

> **HybridSearchResult** = `object`

Defined in: [types/rag.ts:1358](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1358)

Hybrid search result

## Properties

### id

> **id**: `string`

Defined in: [types/rag.ts:1360](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1360)

Document ID

---

### score

> **score**: `number`

Defined in: [types/rag.ts:1362](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1362)

Combined score

---

### text

> **text**: `string`

Defined in: [types/rag.ts:1364](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1364)

Document text

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:1366](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1366)

Associated metadata

---

### scores?

> `optional` **scores?**: `object`

Defined in: [types/rag.ts:1368](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1368)

Score breakdown

#### vector?

> `optional` **vector?**: `number`

#### bm25?

> `optional` **bm25?**: `number`

#### combined?

> `optional` **combined?**: `number`

#### reranked?

> `optional` **reranked?**: `number`
