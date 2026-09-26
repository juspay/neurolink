[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRetrievalRankedResult

# Type Alias: ToolRetrievalRankedResult

> **ToolRetrievalRankedResult** = `object`

One ranked result from `ToolEmbeddingIndex.rank()` or
`selectRelevantToolNames()`.

## Properties

### name

> **name**: `string`

Tool name (mirrors `ToolRetrievalItem.name`).

---

### score

> **score**: `number`

Combined hybrid score (higher = more relevant).
