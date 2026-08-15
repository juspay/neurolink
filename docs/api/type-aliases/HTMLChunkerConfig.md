[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / HTMLChunkerConfig

# Type Alias: HTMLChunkerConfig

> **HTMLChunkerConfig** = [`BaseChunkerConfig`](BaseChunkerConfig.md) & `object`

Defined in: [types/rag.ts:934](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L934)

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
