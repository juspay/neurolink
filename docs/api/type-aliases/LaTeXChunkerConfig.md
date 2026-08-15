[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LaTeXChunkerConfig

# Type Alias: LaTeXChunkerConfig

> **LaTeXChunkerConfig** = [`BaseChunkerConfig`](BaseChunkerConfig.md) & `object`

Defined in: [types/rag.ts:964](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L964)

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
