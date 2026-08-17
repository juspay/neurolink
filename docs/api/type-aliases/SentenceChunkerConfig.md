[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SentenceChunkerConfig

# Type Alias: SentenceChunkerConfig

> **SentenceChunkerConfig** = [`BaseChunkerConfig`](BaseChunkerConfig.md) & `object`

Defined in: [types/rag.ts:910](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L910)

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
