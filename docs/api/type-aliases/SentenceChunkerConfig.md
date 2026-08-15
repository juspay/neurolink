[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SentenceChunkerConfig

# Type Alias: SentenceChunkerConfig

> **SentenceChunkerConfig** = [`BaseChunkerConfig`](BaseChunkerConfig.md) & `object`

Defined in: [types/rag.ts:891](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L891)

Sentence chunker configuration
Sentence-aware splitting

## Type Declaration

### sentenceEnders?

> `optional` **sentenceEnders?**: `string`[]

Sentence ending characters (default: [".", "!", "?", "\n"])

### minSentences?

> `optional` **minSentences?**: `number`

Minimum sentences per chunk

### maxSentences?

> `optional` **maxSentences?**: `number`

Maximum sentences per chunk
