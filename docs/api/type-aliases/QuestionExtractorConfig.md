[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / QuestionExtractorConfig

# Type Alias: QuestionExtractorConfig

> **QuestionExtractorConfig** = [`BaseExtractorConfig`](BaseExtractorConfig.md) & `object`

Defined in: [types/rag.ts:1095](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1095)

Question-Answer extractor configuration

## Type Declaration

### numQuestions?

> `optional` **numQuestions?**: `number`

Number of Q&A pairs to generate

### includeAnswers?

> `optional` **includeAnswers?**: `boolean`

Include answers in output

### embeddingOnly?

> `optional` **embeddingOnly?**: `boolean`

Generate embedding-only questions (shorter, more focused)
