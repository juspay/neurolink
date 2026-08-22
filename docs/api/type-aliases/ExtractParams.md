[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExtractParams

# Type Alias: ExtractParams

> **ExtractParams** = `object`

Defined in: [types/rag.ts:1117](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1117)

Combined extraction parameters

## Properties

### title?

> `optional` **title?**: `boolean` \| [`TitleExtractorConfig`](TitleExtractorConfig.md)

Defined in: [types/rag.ts:1119](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1119)

Extract document title

---

### summary?

> `optional` **summary?**: `boolean` \| [`SummaryExtractorConfig`](SummaryExtractorConfig.md)

Defined in: [types/rag.ts:1121](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1121)

Extract document summary

---

### keywords?

> `optional` **keywords?**: `boolean` \| [`KeywordExtractorConfig`](KeywordExtractorConfig.md)

Defined in: [types/rag.ts:1123](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1123)

Extract keywords

---

### questions?

> `optional` **questions?**: `boolean` \| [`QuestionExtractorConfig`](QuestionExtractorConfig.md)

Defined in: [types/rag.ts:1125](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1125)

Generate Q&A pairs

---

### custom?

> `optional` **custom?**: [`CustomSchemaExtractorConfig`](CustomSchemaExtractorConfig.md)

Defined in: [types/rag.ts:1127](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1127)

Custom schema extraction
