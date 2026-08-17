[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExtractParams

# Type Alias: ExtractParams

> **ExtractParams** = `object`

Defined in: [types/rag.ts:1136](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1136)

Combined extraction parameters

## Properties

### title?

> `optional` **title?**: `boolean` \| [`TitleExtractorConfig`](TitleExtractorConfig.md)

Defined in: [types/rag.ts:1138](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1138)

Extract document title

---

### summary?

> `optional` **summary?**: `boolean` \| [`SummaryExtractorConfig`](SummaryExtractorConfig.md)

Defined in: [types/rag.ts:1140](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1140)

Extract document summary

---

### keywords?

> `optional` **keywords?**: `boolean` \| [`KeywordExtractorConfig`](KeywordExtractorConfig.md)

Defined in: [types/rag.ts:1142](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1142)

Extract keywords

---

### questions?

> `optional` **questions?**: `boolean` \| [`QuestionExtractorConfig`](QuestionExtractorConfig.md)

Defined in: [types/rag.ts:1144](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1144)

Generate Q&A pairs

---

### custom?

> `optional` **custom?**: [`CustomSchemaExtractorConfig`](CustomSchemaExtractorConfig.md)

Defined in: [types/rag.ts:1146](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1146)

Custom schema extraction
