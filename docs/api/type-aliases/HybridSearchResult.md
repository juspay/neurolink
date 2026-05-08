[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / HybridSearchResult

# Type Alias: HybridSearchResult

> **HybridSearchResult** = `object`

Defined in: [types/rag.ts:1276](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1276)

Hybrid search result

## Properties

### id

> **id**: `string`

Defined in: [types/rag.ts:1278](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1278)

Document ID

---

### score

> **score**: `number`

Defined in: [types/rag.ts:1280](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1280)

Combined score

---

### text

> **text**: `string`

Defined in: [types/rag.ts:1282](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1282)

Document text

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:1284](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1284)

Associated metadata

---

### scores?

> `optional` **scores?**: `object`

Defined in: [types/rag.ts:1286](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1286)

Score breakdown

#### vector?

> `optional` **vector?**: `number`

#### bm25?

> `optional` **bm25?**: `number`

#### combined?

> `optional` **combined?**: `number`

#### reranked?

> `optional` **reranked?**: `number`
