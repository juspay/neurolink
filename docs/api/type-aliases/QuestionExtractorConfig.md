[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / QuestionExtractorConfig

# Type Alias: QuestionExtractorConfig

> **QuestionExtractorConfig** = [`BaseExtractorConfig`](BaseExtractorConfig.md) & `object`

Defined in: [types/rag.ts:1051](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1051)

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
