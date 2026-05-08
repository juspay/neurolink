[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MarkdownChunkerConfig

# Type Alias: MarkdownChunkerConfig

> **MarkdownChunkerConfig** = [`BaseChunkerConfig`](BaseChunkerConfig.md) & `object`

Defined in: [types/rag.ts:875](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L875)

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
