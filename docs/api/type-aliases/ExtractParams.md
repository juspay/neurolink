[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExtractParams

# Type Alias: ExtractParams

> **ExtractParams** = `object`

Combined extraction parameters

## Properties

### title?

> `optional` **title?**: `boolean` \| [`TitleExtractorConfig`](TitleExtractorConfig.md)

Extract document title

---

### summary?

> `optional` **summary?**: `boolean` \| [`SummaryExtractorConfig`](SummaryExtractorConfig.md)

Extract document summary

---

### keywords?

> `optional` **keywords?**: `boolean` \| [`KeywordExtractorConfig`](KeywordExtractorConfig.md)

Extract keywords

---

### questions?

> `optional` **questions?**: `boolean` \| [`QuestionExtractorConfig`](QuestionExtractorConfig.md)

Generate Q&A pairs

---

### custom?

> `optional` **custom?**: [`CustomSchemaExtractorConfig`](CustomSchemaExtractorConfig.md)

Custom schema extraction
