[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TitleExtractorConfig

# Type Alias: TitleExtractorConfig

> **TitleExtractorConfig** = [`BaseExtractorConfig`](BaseExtractorConfig.md) & `object`

Defined in: [types/rag.ts:1019](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1019)

Title extractor configuration

## Type Declaration

### nodes?

> `optional` **nodes?**: `number`

Number of nodes to use for title extraction

### nodeTemplate?

> `optional` **nodeTemplate?**: `string`

Template for processing individual nodes

### combineTemplate?

> `optional` **combineTemplate?**: `string`

Template for combining node results
