[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HTMLChunkerConfig

# Type Alias: HTMLChunkerConfig

> **HTMLChunkerConfig** = [`BaseChunkerConfig`](BaseChunkerConfig.md) & `object`

Defined in: [types/rag.ts:953](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L953)

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
