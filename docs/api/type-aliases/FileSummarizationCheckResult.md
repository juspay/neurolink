[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileSummarizationCheckResult

# Type Alias: FileSummarizationCheckResult

> **FileSummarizationCheckResult** = `object`

Defined in: [types/context.ts:719](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L719)

Result of `shouldSummarizeFiles()`.

## Properties

### needsSummarization

> **needsSummarization**: `boolean`

Defined in: [types/context.ts:721](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L721)

Whether summarization is needed

---

### totalEstimatedTokens

> **totalEstimatedTokens**: `number`

Defined in: [types/context.ts:723](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L723)

Total estimated input tokens (all categories)

---

### availableInputTokens

> **availableInputTokens**: `number`

Defined in: [types/context.ts:725](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L725)

Available input tokens for the model

---

### availableBudgetForFiles

> **availableBudgetForFiles**: `number`

Defined in: [types/context.ts:727](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L727)

Budget remaining for files after non-file content

---

### perFileBudget?

> `optional` **perFileBudget?**: `number`

Defined in: [types/context.ts:729](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/context.ts#L729)

If summarizing, the per-file token budget (undefined when not needed)
