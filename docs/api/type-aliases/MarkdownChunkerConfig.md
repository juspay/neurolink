[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MarkdownChunkerConfig

# Type Alias: MarkdownChunkerConfig

> **MarkdownChunkerConfig** = [`BaseChunkerConfig`](BaseChunkerConfig.md) & `object`

Defined in: [types/rag.ts:938](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L938)

Markdown chunker configuration
Structure-aware markdown splitting

## Type Declaration

### headerLevels?

> `optional` **headerLevels?**: `number`[]

Header levels to split on (default: [1, 2, 3])

### preserveCodeBlocks?

> `optional` **preserveCodeBlocks?**: `boolean`

Include code blocks as single chunks

### includeHeader?

> `optional` **includeHeader?**: `boolean`

Include the header in the chunk content

### stripFormatting?

> `optional` **stripFormatting?**: `boolean`

Strip markdown formatting from output
