[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SentenceChunkerConfig

# Type Alias: SentenceChunkerConfig

> **SentenceChunkerConfig** = [`BaseChunkerConfig`](BaseChunkerConfig.md) & `object`

Defined in: [types/rag.ts:847](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L847)

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
