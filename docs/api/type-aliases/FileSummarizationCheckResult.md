[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileSummarizationCheckResult

# Type Alias: FileSummarizationCheckResult

> **FileSummarizationCheckResult** = `object`

Defined in: [types/context.ts:721](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L721)

Result of `shouldSummarizeFiles()`.

## Properties

### needsSummarization

> **needsSummarization**: `boolean`

Defined in: [types/context.ts:723](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L723)

Whether summarization is needed

---

### totalEstimatedTokens

> **totalEstimatedTokens**: `number`

Defined in: [types/context.ts:725](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L725)

Total estimated input tokens (all categories)

---

### availableInputTokens

> **availableInputTokens**: `number`

Defined in: [types/context.ts:727](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L727)

Available input tokens for the model

---

### availableBudgetForFiles

> **availableBudgetForFiles**: `number`

Defined in: [types/context.ts:729](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L729)

Budget remaining for files after non-file content

---

### perFileBudget?

> `optional` **perFileBudget?**: `number`

Defined in: [types/context.ts:731](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L731)

If summarizing, the per-file token budget (undefined when not needed)
