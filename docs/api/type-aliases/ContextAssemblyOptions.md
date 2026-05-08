[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ContextAssemblyOptions

# Type Alias: ContextAssemblyOptions

> **ContextAssemblyOptions** = `object`

Defined in: [types/rag.ts:40](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L40)

Context assembly options

## Properties

### maxChars?

> `optional` **maxChars?**: `number`

Defined in: [types/rag.ts:42](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L42)

Maximum characters in assembled context

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/rag.ts:44](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L44)

Maximum tokens (approximate, 4 chars/token)

---

### citationFormat?

> `optional` **citationFormat?**: [`CitationFormat`](CitationFormat.md)

Defined in: [types/rag.ts:46](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L46)

Citation format to use

---

### separator?

> `optional` **separator?**: `string`

Defined in: [types/rag.ts:48](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L48)

Separator between chunks

---

### includeMetadata?

> `optional` **includeMetadata?**: `boolean`

Defined in: [types/rag.ts:50](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L50)

Include chunk metadata in context

---

### deduplicate?

> `optional` **deduplicate?**: `boolean`

Defined in: [types/rag.ts:52](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L52)

Deduplicate overlapping content

---

### dedupeThreshold?

> `optional` **dedupeThreshold?**: `number`

Defined in: [types/rag.ts:54](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L54)

Similarity threshold for deduplication (0-1)

---

### orderByRelevance?

> `optional` **orderByRelevance?**: `boolean`

Defined in: [types/rag.ts:56](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L56)

Order by relevance score

---

### includeSectionHeaders?

> `optional` **includeSectionHeaders?**: `boolean`

Defined in: [types/rag.ts:58](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L58)

Include section headers

---

### headerTemplate?

> `optional` **headerTemplate?**: `string`

Defined in: [types/rag.ts:60](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L60)

Header template (use {index}, {source}, {score} placeholders)
