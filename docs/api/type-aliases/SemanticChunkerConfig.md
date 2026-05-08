[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SemanticChunkerConfig

# Type Alias: SemanticChunkerConfig

> **SemanticChunkerConfig** = [`BaseChunkerConfig`](BaseChunkerConfig.md) & `object`

Defined in: [types/rag.ts:933](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L933)

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
