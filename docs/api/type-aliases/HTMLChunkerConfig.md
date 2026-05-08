[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / HTMLChunkerConfig

# Type Alias: HTMLChunkerConfig

> **HTMLChunkerConfig** = [`BaseChunkerConfig`](BaseChunkerConfig.md) & `object`

Defined in: [types/rag.ts:890](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L890)

HTML chunker configuration
HTML structure-aware splitting

## Type Declaration

### splitTags?

> `optional` **splitTags?**: `string`[]

Tags to split on (default: ["div", "p", "section", "article"])

### preserveTags?

> `optional` **preserveTags?**: `string`[]

Tags to preserve as single chunks

### extractTextOnly?

> `optional` **extractTextOnly?**: `boolean`

Extract text only (strip HTML tags)

### includeTagMetadata?

> `optional` **includeTagMetadata?**: `boolean`

Include tag metadata in chunks
