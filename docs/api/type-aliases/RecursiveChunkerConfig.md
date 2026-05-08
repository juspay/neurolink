[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RecursiveChunkerConfig

# Type Alias: RecursiveChunkerConfig

> **RecursiveChunkerConfig** = [`BaseChunkerConfig`](BaseChunkerConfig.md) & `object`

Defined in: [types/rag.ts:834](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L834)

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
