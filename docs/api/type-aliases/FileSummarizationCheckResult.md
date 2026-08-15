[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileSummarizationCheckResult

# Type Alias: FileSummarizationCheckResult

> **FileSummarizationCheckResult** = `object`

Defined in: [types/context.ts:742](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L742)

Result of `shouldSummarizeFiles()`.

## Properties

### needsSummarization

> **needsSummarization**: `boolean`

Defined in: [types/context.ts:744](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L744)

Whether summarization is needed

---

### totalEstimatedTokens

> **totalEstimatedTokens**: `number`

Defined in: [types/context.ts:746](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L746)

Total estimated input tokens (all categories)

---

### availableInputTokens

> **availableInputTokens**: `number`

Defined in: [types/context.ts:748](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L748)

Available input tokens for the model

---

### availableBudgetForFiles

> **availableBudgetForFiles**: `number`

Defined in: [types/context.ts:750](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L750)

Budget remaining for files after non-file content

---

### perFileBudget?

> `optional` **perFileBudget?**: `number`

Defined in: [types/context.ts:752](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L752)

If summarizing, the per-file token budget (undefined when not needed)
