[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeIndexSnapshot

# Type Alias: KnowledgeIndexSnapshot

> **KnowledgeIndexSnapshot** = `object`

Immutable, ready-to-query index built once at client construction. Sessions
and turns search this snapshot; it is never mutated in place.

## Properties

### entriesById

> **entriesById**: `Map`\<`string`, [`NormalizedKnowledgeEntry`](NormalizedKnowledgeEntry.md)\>

---

### exactIndex

> **exactIndex**: `Map`\<`string`, `Set`\<`string`\>\>

Normalized entry id or title phrase -> entry ids.

---

### aliasIndex

> **aliasIndex**: `Map`\<`string`, `Set`\<`string`\>\>

Normalized reviewed alias phrase -> entry ids.

---

### relationIndex

> **relationIndex**: `Map`\<`string`, `string`[]\>

Entry id -> directly related entry ids, for bounded expansion.

---

### lexical

> **lexical**: [`KnowledgeLexicalSearcher`](KnowledgeLexicalSearcher.md)

Field-aware BM25 over all documents.

---

### entryCount

> **entryCount**: `number`
