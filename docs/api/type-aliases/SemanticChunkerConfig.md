[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SemanticChunkerConfig

# Type Alias: SemanticChunkerConfig

> **SemanticChunkerConfig** = [`BaseChunkerConfig`](BaseChunkerConfig.md) & `object`

Defined in: [types/rag.ts:977](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L977)

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
