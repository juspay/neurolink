[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SummaryExtractorConfig

# Type Alias: SummaryExtractorConfig

> **SummaryExtractorConfig** = [`BaseExtractorConfig`](BaseExtractorConfig.md) & `object`

Defined in: [types/rag.ts:1075](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L1075)

Summary extractor configuration

## Type Declaration

### summaryTypes?

> `optional` **summaryTypes?**: (`"current"` \| `"previous"` \| `"next"`)[]

Summary types to generate

### maxWords?

> `optional` **maxWords?**: `number`

Maximum summary length in words
