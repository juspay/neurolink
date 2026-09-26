[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HybridSearchResult

# Type Alias: HybridSearchResult

> **HybridSearchResult** = `object`

Hybrid search result

## Properties

### id

> **id**: `string`

Document ID

---

### score

> **score**: `number`

Combined score

---

### text

> **text**: `string`

Document text

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Associated metadata

---

### scores?

> `optional` **scores?**: `object`

Score breakdown

#### vector?

> `optional` **vector?**: `number`

#### bm25?

> `optional` **bm25?**: `number`

#### combined?

> `optional` **combined?**: `number`

#### reranked?

> `optional` **reranked?**: `number`
