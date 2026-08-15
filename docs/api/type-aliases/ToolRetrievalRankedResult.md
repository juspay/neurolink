[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRetrievalRankedResult

# Type Alias: ToolRetrievalRankedResult

> **ToolRetrievalRankedResult** = `object`

Defined in: [types/toolRouting.ts:374](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L374)

One ranked result from `ToolEmbeddingIndex.rank()` or
`selectRelevantToolNames()`.

## Properties

### name

> **name**: `string`

Defined in: [types/toolRouting.ts:376](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L376)

Tool name (mirrors `ToolRetrievalItem.name`).

---

### score

> **score**: `number`

Defined in: [types/toolRouting.ts:378](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L378)

Combined hybrid score (higher = more relevant).
