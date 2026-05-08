[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExtractParams

# Type Alias: ExtractParams

> **ExtractParams** = `object`

Defined in: [types/rag.ts:1073](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1073)

Combined extraction parameters

## Properties

### title?

> `optional` **title?**: `boolean` \| [`TitleExtractorConfig`](TitleExtractorConfig.md)

Defined in: [types/rag.ts:1075](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1075)

Extract document title

---

### summary?

> `optional` **summary?**: `boolean` \| [`SummaryExtractorConfig`](SummaryExtractorConfig.md)

Defined in: [types/rag.ts:1077](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1077)

Extract document summary

---

### keywords?

> `optional` **keywords?**: `boolean` \| [`KeywordExtractorConfig`](KeywordExtractorConfig.md)

Defined in: [types/rag.ts:1079](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1079)

Extract keywords

---

### questions?

> `optional` **questions?**: `boolean` \| [`QuestionExtractorConfig`](QuestionExtractorConfig.md)

Defined in: [types/rag.ts:1081](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1081)

Generate Q&A pairs

---

### custom?

> `optional` **custom?**: [`CustomSchemaExtractorConfig`](CustomSchemaExtractorConfig.md)

Defined in: [types/rag.ts:1083](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1083)

Custom schema extraction
