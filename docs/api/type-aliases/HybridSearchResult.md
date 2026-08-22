[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HybridSearchResult

# Type Alias: HybridSearchResult

> **HybridSearchResult** = `object`

Defined in: [types/rag.ts:1320](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1320)

Hybrid search result

## Properties

### id

> **id**: `string`

Defined in: [types/rag.ts:1322](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1322)

Document ID

---

### score

> **score**: `number`

Defined in: [types/rag.ts:1324](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1324)

Combined score

---

### text

> **text**: `string`

Defined in: [types/rag.ts:1326](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1326)

Document text

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:1328](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1328)

Associated metadata

---

### scores?

> `optional` **scores?**: `object`

Defined in: [types/rag.ts:1330](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1330)

Score breakdown

#### vector?

> `optional` **vector?**: `number`

#### bm25?

> `optional` **bm25?**: `number`

#### combined?

> `optional` **combined?**: `number`

#### reranked?

> `optional` **reranked?**: `number`
