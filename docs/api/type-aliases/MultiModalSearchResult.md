[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultiModalSearchResult

# Type Alias: MultiModalSearchResult

> **MultiModalSearchResult** = `object`

Defined in: [types/rag.ts:1720](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1720)

Image search result from multi-modal retrieval

## Properties

### chunk

> **chunk**: [`MultiModalChunk`](MultiModalChunk.md)

Defined in: [types/rag.ts:1722](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1722)

The chunk containing the match

---

### score

> **score**: `number`

Defined in: [types/rag.ts:1724](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1724)

Similarity score (0-1)

---

### matchType

> **matchType**: [`MultiModalMatchType`](MultiModalMatchType.md)

Defined in: [types/rag.ts:1726](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1726)

How this match was found
