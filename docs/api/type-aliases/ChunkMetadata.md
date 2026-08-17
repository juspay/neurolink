[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChunkMetadata

# Type Alias: ChunkMetadata

> **ChunkMetadata** = `object`

Defined in: [types/rag.ts:789](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L789)

Chunk metadata for tracking source and position

## Properties

### documentId

> **documentId**: `string`

Defined in: [types/rag.ts:791](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L791)

Source document identifier

---

### source?

> `optional` **source?**: `string`

Defined in: [types/rag.ts:793](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L793)

Original document filename or URL

---

### chunkIndex

> **chunkIndex**: `number`

Defined in: [types/rag.ts:795](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L795)

Position in the original document (0-indexed)

---

### totalChunks?

> `optional` **totalChunks?**: `number`

Defined in: [types/rag.ts:797](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L797)

Total number of chunks from the document

---

### startPosition?

> `optional` **startPosition?**: `number`

Defined in: [types/rag.ts:799](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L799)

Start character position in original text

---

### endPosition?

> `optional` **endPosition?**: `number`

Defined in: [types/rag.ts:801](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L801)

End character position in original text

---

### documentType?

> `optional` **documentType?**: [`DocumentType`](DocumentType.md)

Defined in: [types/rag.ts:803](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L803)

Document type (markdown, html, json, etc.)

---

### custom?

> `optional` **custom?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:805](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L805)

Custom metadata from extraction

---

### title?

> `optional` **title?**: `string`

Defined in: [types/rag.ts:807](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L807)

Extracted title (from metadata extraction)

---

### summary?

> `optional` **summary?**: `string`

Defined in: [types/rag.ts:809](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L809)

Extracted summary (from metadata extraction)

---

### keywords?

> `optional` **keywords?**: `string`[]

Defined in: [types/rag.ts:811](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L811)

Extracted keywords (from metadata extraction)

---

### headerLevel?

> `optional` **headerLevel?**: `number`

Defined in: [types/rag.ts:813](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L813)

Header level for markdown/html chunks

---

### header?

> `optional` **header?**: `string`

Defined in: [types/rag.ts:815](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L815)

Header text for structured documents

---

### jsonPath?

> `optional` **jsonPath?**: `string`

Defined in: [types/rag.ts:817](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L817)

JSON path for JSON chunks

---

### latexEnvironment?

> `optional` **latexEnvironment?**: `string`

Defined in: [types/rag.ts:819](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L819)

LaTeX environment name
