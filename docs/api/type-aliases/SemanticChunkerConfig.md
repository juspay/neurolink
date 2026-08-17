[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SemanticChunkerConfig

# Type Alias: SemanticChunkerConfig

> **SemanticChunkerConfig** = [`BaseChunkerConfig`](BaseChunkerConfig.md) & `object`

Defined in: [types/rag.ts:996](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L996)

Semantic chunker configuration
LLM-based semantic splitting

## Type Declaration

### joinThreshold?

> `optional` **joinThreshold?**: `number`

Minimum tokens before considering a split

### modelName?

> `optional` **modelName?**: `string`

Model for semantic analysis

### provider?

> `optional` **provider?**: `string`

Provider for the model

### semanticPrompt?

> `optional` **semanticPrompt?**: `string`

Custom prompt for semantic grouping

### maxHeaderDepth?

> `optional` **maxHeaderDepth?**: `number`

Maximum header depth to consider for grouping

### similarityThreshold?

> `optional` **similarityThreshold?**: `number`

Similarity threshold for grouping (0-1)
