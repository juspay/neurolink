[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / QuestionExtractorConfig

# Type Alias: QuestionExtractorConfig

> **QuestionExtractorConfig** = [`BaseExtractorConfig`](BaseExtractorConfig.md) & `object`

Defined in: [types/rag.ts:1095](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L1095)

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
