[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SentenceChunkerConfig

# Type Alias: SentenceChunkerConfig

> **SentenceChunkerConfig** = [`BaseChunkerConfig`](BaseChunkerConfig.md) & `object`

Defined in: [types/rag.ts:891](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L891)

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
