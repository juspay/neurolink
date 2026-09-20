[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExtractParams

# Type Alias: ExtractParams

> **ExtractParams** = `object`

Defined in: [types/rag.ts:1155](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1155)

Combined extraction parameters

## Properties

### title?

> `optional` **title?**: `boolean` \| [`TitleExtractorConfig`](TitleExtractorConfig.md)

Defined in: [types/rag.ts:1157](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1157)

Extract document title

---

### summary?

> `optional` **summary?**: `boolean` \| [`SummaryExtractorConfig`](SummaryExtractorConfig.md)

Defined in: [types/rag.ts:1159](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1159)

Extract document summary

---

### keywords?

> `optional` **keywords?**: `boolean` \| [`KeywordExtractorConfig`](KeywordExtractorConfig.md)

Defined in: [types/rag.ts:1161](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1161)

Extract keywords

---

### questions?

> `optional` **questions?**: `boolean` \| [`QuestionExtractorConfig`](QuestionExtractorConfig.md)

Defined in: [types/rag.ts:1163](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1163)

Generate Q&A pairs

---

### custom?

> `optional` **custom?**: [`CustomSchemaExtractorConfig`](CustomSchemaExtractorConfig.md)

Defined in: [types/rag.ts:1165](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1165)

Custom schema extraction
