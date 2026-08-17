[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HybridSearchResult

# Type Alias: HybridSearchResult

> **HybridSearchResult** = `object`

Defined in: [types/rag.ts:1339](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1339)

Hybrid search result

## Properties

### id

> **id**: `string`

Defined in: [types/rag.ts:1341](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1341)

Document ID

---

### score

> **score**: `number`

Defined in: [types/rag.ts:1343](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1343)

Combined score

---

### text

> **text**: `string`

Defined in: [types/rag.ts:1345](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1345)

Document text

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:1347](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1347)

Associated metadata

---

### scores?

> `optional` **scores?**: `object`

Defined in: [types/rag.ts:1349](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1349)

Score breakdown

#### vector?

> `optional` **vector?**: `number`

#### bm25?

> `optional` **bm25?**: `number`

#### combined?

> `optional` **combined?**: `number`

#### reranked?

> `optional` **reranked?**: `number`
