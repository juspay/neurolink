[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileSummarizationCheckResult

# Type Alias: FileSummarizationCheckResult

> **FileSummarizationCheckResult** = `object`

Result of `shouldSummarizeFiles()`.

## Properties

### needsSummarization

> **needsSummarization**: `boolean`

Whether summarization is needed

---

### totalEstimatedTokens

> **totalEstimatedTokens**: `number`

Total estimated input tokens (all categories)

---

### availableInputTokens

> **availableInputTokens**: `number`

Available input tokens for the model

---

### availableBudgetForFiles

> **availableBudgetForFiles**: `number`

Budget remaining for files after non-file content

---

### perFileBudget?

> `optional` **perFileBudget?**: `number`

If summarizing, the per-file token budget (undefined when not needed)
