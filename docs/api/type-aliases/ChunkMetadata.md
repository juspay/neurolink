[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChunkMetadata

# Type Alias: ChunkMetadata

> **ChunkMetadata** = `object`

Chunk metadata for tracking source and position

## Properties

### documentId

> **documentId**: `string`

Source document identifier

---

### source?

> `optional` **source?**: `string`

Original document filename or URL

---

### chunkIndex

> **chunkIndex**: `number`

Position in the original document (0-indexed)

---

### totalChunks?

> `optional` **totalChunks?**: `number`

Total number of chunks from the document

---

### startPosition?

> `optional` **startPosition?**: `number`

Start character position in original text

---

### endPosition?

> `optional` **endPosition?**: `number`

End character position in original text

---

### documentType?

> `optional` **documentType?**: [`DocumentType`](DocumentType.md)

Document type (markdown, html, json, etc.)

---

### custom?

> `optional` **custom?**: `Record`\<`string`, `unknown`\>

Custom metadata from extraction

---

### title?

> `optional` **title?**: `string`

Extracted title (from metadata extraction)

---

### summary?

> `optional` **summary?**: `string`

Extracted summary (from metadata extraction)

---

### keywords?

> `optional` **keywords?**: `string`[]

Extracted keywords (from metadata extraction)

---

### headerLevel?

> `optional` **headerLevel?**: `number`

Header level for markdown/html chunks

---

### header?

> `optional` **header?**: `string`

Header text for structured documents

---

### jsonPath?

> `optional` **jsonPath?**: `string`

JSON path for JSON chunks

---

### latexEnvironment?

> `optional` **latexEnvironment?**: `string`

LaTeX environment name
