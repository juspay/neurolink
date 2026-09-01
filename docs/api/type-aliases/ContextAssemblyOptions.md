[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ContextAssemblyOptions

# Type Alias: ContextAssemblyOptions

> **ContextAssemblyOptions** = `object`

Defined in: [types/rag.ts:43](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L43)

Context assembly options

## Properties

### maxChars?

> `optional` **maxChars?**: `number`

Defined in: [types/rag.ts:45](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L45)

Maximum characters in assembled context

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/rag.ts:47](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L47)

Maximum tokens (approximate, 4 chars/token)

---

### citationFormat?

> `optional` **citationFormat?**: [`CitationFormat`](CitationFormat.md)

Defined in: [types/rag.ts:49](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L49)

Citation format to use

---

### separator?

> `optional` **separator?**: `string`

Defined in: [types/rag.ts:51](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L51)

Separator between chunks

---

### includeMetadata?

> `optional` **includeMetadata?**: `boolean`

Defined in: [types/rag.ts:53](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L53)

Include chunk metadata in context

---

### deduplicate?

> `optional` **deduplicate?**: `boolean`

Defined in: [types/rag.ts:55](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L55)

Deduplicate overlapping content

---

### dedupeThreshold?

> `optional` **dedupeThreshold?**: `number`

Defined in: [types/rag.ts:57](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L57)

Similarity threshold for deduplication (0-1)

---

### orderByRelevance?

> `optional` **orderByRelevance?**: `boolean`

Defined in: [types/rag.ts:59](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L59)

Order by relevance score

---

### includeSectionHeaders?

> `optional` **includeSectionHeaders?**: `boolean`

Defined in: [types/rag.ts:61](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L61)

Include section headers

---

### headerTemplate?

> `optional` **headerTemplate?**: `string`

Defined in: [types/rag.ts:63](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L63)

Header template (use {index}, {source}, {score} placeholders)
