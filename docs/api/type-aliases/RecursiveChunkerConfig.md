[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RecursiveChunkerConfig

# Type Alias: RecursiveChunkerConfig

> **RecursiveChunkerConfig** = [`BaseChunkerConfig`](BaseChunkerConfig.md) & `object`

Defined in: [types/rag.ts:878](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L878)

Recursive chunker configuration
Smart splitting based on content structure

## Type Declaration

### separators?

> `optional` **separators?**: `string`[]

Ordered list of separators to try (default: ["\n\n", "\n", " ", ""])

### isSeparatorRegex?

> `optional` **isSeparatorRegex?**: `boolean`

Whether separators are regex patterns

### keepSeparators?

> `optional` **keepSeparators?**: `boolean`

Whether to keep separators in the output chunks
