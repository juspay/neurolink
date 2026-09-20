[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultiModalSearchResult

# Type Alias: MultiModalSearchResult

> **MultiModalSearchResult** = `object`

Defined in: [types/rag.ts:1739](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1739)

Image search result from multi-modal retrieval

## Properties

### chunk

> **chunk**: [`MultiModalChunk`](MultiModalChunk.md)

Defined in: [types/rag.ts:1741](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1741)

The chunk containing the match

---

### score

> **score**: `number`

Defined in: [types/rag.ts:1743](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1743)

Similarity score (0-1)

---

### matchType

> **matchType**: [`MultiModalMatchType`](MultiModalMatchType.md)

Defined in: [types/rag.ts:1745](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1745)

How this match was found
