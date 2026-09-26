[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ContextAssemblyOptions

# Type Alias: ContextAssemblyOptions

> **ContextAssemblyOptions** = `object`

Context assembly options

## Properties

### maxChars?

> `optional` **maxChars?**: `number`

Maximum characters in assembled context

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Maximum tokens (approximate, 4 chars/token)

---

### citationFormat?

> `optional` **citationFormat?**: [`CitationFormat`](CitationFormat.md)

Citation format to use

---

### separator?

> `optional` **separator?**: `string`

Separator between chunks

---

### includeMetadata?

> `optional` **includeMetadata?**: `boolean`

Include chunk metadata in context

---

### deduplicate?

> `optional` **deduplicate?**: `boolean`

Deduplicate overlapping content

---

### dedupeThreshold?

> `optional` **dedupeThreshold?**: `number`

Similarity threshold for deduplication (0-1)

---

### orderByRelevance?

> `optional` **orderByRelevance?**: `boolean`

Order by relevance score

---

### includeSectionHeaders?

> `optional` **includeSectionHeaders?**: `boolean`

Include section headers

---

### headerTemplate?

> `optional` **headerTemplate?**: `string`

Header template (use {index}, {source}, {score} placeholders)
