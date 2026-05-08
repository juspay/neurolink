[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SummaryExtractorConfig

# Type Alias: SummaryExtractorConfig

> **SummaryExtractorConfig** = [`BaseExtractorConfig`](BaseExtractorConfig.md) & `object`

Defined in: [types/rag.ts:1031](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1031)

Summary extractor configuration

## Type Declaration

### summaryTypes?

> `optional` **summaryTypes?**: (`"current"` \| `"previous"` \| `"next"`)[]

Summary types to generate

### maxWords?

> `optional` **maxWords?**: `number`

Maximum summary length in words
