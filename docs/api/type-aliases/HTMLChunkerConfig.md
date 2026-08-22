[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / HTMLChunkerConfig

# Type Alias: HTMLChunkerConfig

> **HTMLChunkerConfig** = [`BaseChunkerConfig`](BaseChunkerConfig.md) & `object`

Defined in: [types/rag.ts:934](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L934)

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
