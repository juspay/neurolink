[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChunkMetadata

# Type Alias: ChunkMetadata

> **ChunkMetadata** = `object`

Defined in: [types/rag.ts:726](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L726)

Chunk metadata for tracking source and position

## Properties

### documentId

> **documentId**: `string`

Defined in: [types/rag.ts:728](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L728)

Source document identifier

---

### source?

> `optional` **source?**: `string`

Defined in: [types/rag.ts:730](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L730)

Original document filename or URL

---

### chunkIndex

> **chunkIndex**: `number`

Defined in: [types/rag.ts:732](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L732)

Position in the original document (0-indexed)

---

### totalChunks?

> `optional` **totalChunks?**: `number`

Defined in: [types/rag.ts:734](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L734)

Total number of chunks from the document

---

### startPosition?

> `optional` **startPosition?**: `number`

Defined in: [types/rag.ts:736](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L736)

Start character position in original text

---

### endPosition?

> `optional` **endPosition?**: `number`

Defined in: [types/rag.ts:738](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L738)

End character position in original text

---

### documentType?

> `optional` **documentType?**: [`DocumentType`](DocumentType.md)

Defined in: [types/rag.ts:740](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L740)

Document type (markdown, html, json, etc.)

---

### custom?

> `optional` **custom?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:742](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L742)

Custom metadata from extraction

---

### title?

> `optional` **title?**: `string`

Defined in: [types/rag.ts:744](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L744)

Extracted title (from metadata extraction)

---

### summary?

> `optional` **summary?**: `string`

Defined in: [types/rag.ts:746](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L746)

Extracted summary (from metadata extraction)

---

### keywords?

> `optional` **keywords?**: `string`[]

Defined in: [types/rag.ts:748](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L748)

Extracted keywords (from metadata extraction)

---

### headerLevel?

> `optional` **headerLevel?**: `number`

Defined in: [types/rag.ts:750](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L750)

Header level for markdown/html chunks

---

### header?

> `optional` **header?**: `string`

Defined in: [types/rag.ts:752](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L752)

Header text for structured documents

---

### jsonPath?

> `optional` **jsonPath?**: `string`

Defined in: [types/rag.ts:754](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L754)

JSON path for JSON chunks

---

### latexEnvironment?

> `optional` **latexEnvironment?**: `string`

Defined in: [types/rag.ts:756](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L756)

LaTeX environment name
