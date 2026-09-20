[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRetrievalRankedResult

# Type Alias: ToolRetrievalRankedResult

> **ToolRetrievalRankedResult** = `object`

Defined in: [types/toolRouting.ts:411](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L411)

One ranked result from `ToolEmbeddingIndex.rank()` or
`selectRelevantToolNames()`.

## Properties

### name

> **name**: `string`

Defined in: [types/toolRouting.ts:413](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L413)

Tool name (mirrors `ToolRetrievalItem.name`).

---

### score

> **score**: `number`

Defined in: [types/toolRouting.ts:415](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L415)

Combined hybrid score (higher = more relevant).
