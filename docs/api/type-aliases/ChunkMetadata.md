[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChunkMetadata

# Type Alias: ChunkMetadata

> **ChunkMetadata** = `object`

Defined in: [types/rag.ts:770](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L770)

Chunk metadata for tracking source and position

## Properties

### documentId

> **documentId**: `string`

Defined in: [types/rag.ts:772](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L772)

Source document identifier

---

### source?

> `optional` **source?**: `string`

Defined in: [types/rag.ts:774](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L774)

Original document filename or URL

---

### chunkIndex

> **chunkIndex**: `number`

Defined in: [types/rag.ts:776](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L776)

Position in the original document (0-indexed)

---

### totalChunks?

> `optional` **totalChunks?**: `number`

Defined in: [types/rag.ts:778](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L778)

Total number of chunks from the document

---

### startPosition?

> `optional` **startPosition?**: `number`

Defined in: [types/rag.ts:780](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L780)

Start character position in original text

---

### endPosition?

> `optional` **endPosition?**: `number`

Defined in: [types/rag.ts:782](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L782)

End character position in original text

---

### documentType?

> `optional` **documentType?**: [`DocumentType`](DocumentType.md)

Defined in: [types/rag.ts:784](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L784)

Document type (markdown, html, json, etc.)

---

### custom?

> `optional` **custom?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:786](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L786)

Custom metadata from extraction

---

### title?

> `optional` **title?**: `string`

Defined in: [types/rag.ts:788](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L788)

Extracted title (from metadata extraction)

---

### summary?

> `optional` **summary?**: `string`

Defined in: [types/rag.ts:790](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L790)

Extracted summary (from metadata extraction)

---

### keywords?

> `optional` **keywords?**: `string`[]

Defined in: [types/rag.ts:792](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L792)

Extracted keywords (from metadata extraction)

---

### headerLevel?

> `optional` **headerLevel?**: `number`

Defined in: [types/rag.ts:794](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L794)

Header level for markdown/html chunks

---

### header?

> `optional` **header?**: `string`

Defined in: [types/rag.ts:796](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L796)

Header text for structured documents

---

### jsonPath?

> `optional` **jsonPath?**: `string`

Defined in: [types/rag.ts:798](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L798)

JSON path for JSON chunks

---

### latexEnvironment?

> `optional` **latexEnvironment?**: `string`

Defined in: [types/rag.ts:800](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L800)

LaTeX environment name
