[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LaTeXChunkerConfig

# Type Alias: LaTeXChunkerConfig

> **LaTeXChunkerConfig** = [`BaseChunkerConfig`](BaseChunkerConfig.md) & `object`

LaTeX chunker configuration
LaTeX structure-aware splitting

## Type Declaration

### splitEnvironments?

> `optional` **splitEnvironments?**: `string`[]

Environments to split on (default: ["section", "subsection", "chapter"])

### preserveMath?

> `optional` **preserveMath?**: `boolean`

Preserve math environments as single chunks

### includePreamble?

> `optional` **includePreamble?**: `boolean`

Include preamble as separate chunk
