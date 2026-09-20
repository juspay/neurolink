[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChunkMetadata

# Type Alias: ChunkMetadata

> **ChunkMetadata** = `object`

Defined in: [types/rag.ts:808](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L808)

Chunk metadata for tracking source and position

## Properties

### documentId

> **documentId**: `string`

Defined in: [types/rag.ts:810](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L810)

Source document identifier

---

### source?

> `optional` **source?**: `string`

Defined in: [types/rag.ts:812](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L812)

Original document filename or URL

---

### chunkIndex

> **chunkIndex**: `number`

Defined in: [types/rag.ts:814](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L814)

Position in the original document (0-indexed)

---

### totalChunks?

> `optional` **totalChunks?**: `number`

Defined in: [types/rag.ts:816](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L816)

Total number of chunks from the document

---

### startPosition?

> `optional` **startPosition?**: `number`

Defined in: [types/rag.ts:818](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L818)

Start character position in original text

---

### endPosition?

> `optional` **endPosition?**: `number`

Defined in: [types/rag.ts:820](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L820)

End character position in original text

---

### documentType?

> `optional` **documentType?**: [`DocumentType`](DocumentType.md)

Defined in: [types/rag.ts:822](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L822)

Document type (markdown, html, json, etc.)

---

### custom?

> `optional` **custom?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:824](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L824)

Custom metadata from extraction

---

### title?

> `optional` **title?**: `string`

Defined in: [types/rag.ts:826](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L826)

Extracted title (from metadata extraction)

---

### summary?

> `optional` **summary?**: `string`

Defined in: [types/rag.ts:828](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L828)

Extracted summary (from metadata extraction)

---

### keywords?

> `optional` **keywords?**: `string`[]

Defined in: [types/rag.ts:830](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L830)

Extracted keywords (from metadata extraction)

---

### headerLevel?

> `optional` **headerLevel?**: `number`

Defined in: [types/rag.ts:832](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L832)

Header level for markdown/html chunks

---

### header?

> `optional` **header?**: `string`

Defined in: [types/rag.ts:834](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L834)

Header text for structured documents

---

### jsonPath?

> `optional` **jsonPath?**: `string`

Defined in: [types/rag.ts:836](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L836)

JSON path for JSON chunks

---

### latexEnvironment?

> `optional` **latexEnvironment?**: `string`

Defined in: [types/rag.ts:838](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L838)

LaTeX environment name
