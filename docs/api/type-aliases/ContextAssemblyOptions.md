[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ContextAssemblyOptions

# Type Alias: ContextAssemblyOptions

> **ContextAssemblyOptions** = `object`

Defined in: [types/rag.ts:42](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L42)

Context assembly options

## Properties

### maxChars?

> `optional` **maxChars?**: `number`

Defined in: [types/rag.ts:44](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L44)

Maximum characters in assembled context

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/rag.ts:46](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L46)

Maximum tokens (approximate, 4 chars/token)

---

### citationFormat?

> `optional` **citationFormat?**: [`CitationFormat`](CitationFormat.md)

Defined in: [types/rag.ts:48](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L48)

Citation format to use

---

### separator?

> `optional` **separator?**: `string`

Defined in: [types/rag.ts:50](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L50)

Separator between chunks

---

### includeMetadata?

> `optional` **includeMetadata?**: `boolean`

Defined in: [types/rag.ts:52](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L52)

Include chunk metadata in context

---

### deduplicate?

> `optional` **deduplicate?**: `boolean`

Defined in: [types/rag.ts:54](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L54)

Deduplicate overlapping content

---

### dedupeThreshold?

> `optional` **dedupeThreshold?**: `number`

Defined in: [types/rag.ts:56](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L56)

Similarity threshold for deduplication (0-1)

---

### orderByRelevance?

> `optional` **orderByRelevance?**: `boolean`

Defined in: [types/rag.ts:58](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L58)

Order by relevance score

---

### includeSectionHeaders?

> `optional` **includeSectionHeaders?**: `boolean`

Defined in: [types/rag.ts:60](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L60)

Include section headers

---

### headerTemplate?

> `optional` **headerTemplate?**: `string`

Defined in: [types/rag.ts:62](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L62)

Header template (use {index}, {source}, {score} placeholders)
