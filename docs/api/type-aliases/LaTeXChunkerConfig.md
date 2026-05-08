[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / LaTeXChunkerConfig

# Type Alias: LaTeXChunkerConfig

> **LaTeXChunkerConfig** = [`BaseChunkerConfig`](BaseChunkerConfig.md) & `object`

Defined in: [types/rag.ts:920](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L920)

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
