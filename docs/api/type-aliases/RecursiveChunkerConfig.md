[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RecursiveChunkerConfig

# Type Alias: RecursiveChunkerConfig

> **RecursiveChunkerConfig** = [`BaseChunkerConfig`](BaseChunkerConfig.md) & `object`

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
