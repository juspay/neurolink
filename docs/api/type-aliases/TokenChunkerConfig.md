[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenChunkerConfig

# Type Alias: TokenChunkerConfig

> **TokenChunkerConfig** = [`BaseChunkerConfig`](BaseChunkerConfig.md) & `object`

Defined in: [types/rag.ts:904](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L904)

Token chunker configuration
Token-aware splitting using tokenizer

## Type Declaration

### tokenizer?

> `optional` **tokenizer?**: `string`

Tokenizer to use (default: "cl100k_base" for GPT models)

### modelName?

> `optional` **modelName?**: `string`

Model name for token counting (alternative to tokenizer)

### maxTokens?

> `optional` **maxTokens?**: `number`

Maximum tokens per chunk

### tokenOverlap?

> `optional` **tokenOverlap?**: `number`

Token overlap between chunks
