[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeIndexSnapshot

# Type Alias: KnowledgeIndexSnapshot

> **KnowledgeIndexSnapshot** = `object`

Defined in: [types/knowledge.ts:317](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L317)

Immutable, ready-to-query index built once at client construction. Sessions
and turns search this snapshot; it is never mutated in place.

## Properties

### entriesById

> **entriesById**: `Map`\<`string`, [`NormalizedKnowledgeEntry`](NormalizedKnowledgeEntry.md)\>

Defined in: [types/knowledge.ts:318](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L318)

---

### exactIndex

> **exactIndex**: `Map`\<`string`, `Set`\<`string`\>\>

Defined in: [types/knowledge.ts:320](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L320)

Normalized entry id or title phrase -> entry ids.

---

### aliasIndex

> **aliasIndex**: `Map`\<`string`, `Set`\<`string`\>\>

Defined in: [types/knowledge.ts:322](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L322)

Normalized reviewed alias phrase -> entry ids.

---

### relationIndex

> **relationIndex**: `Map`\<`string`, `string`[]\>

Defined in: [types/knowledge.ts:324](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L324)

Entry id -> directly related entry ids, for bounded expansion.

---

### lexical

> **lexical**: [`KnowledgeLexicalSearcher`](KnowledgeLexicalSearcher.md)

Defined in: [types/knowledge.ts:326](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L326)

Field-aware BM25 over all documents.

---

### entryCount

> **entryCount**: `number`

Defined in: [types/knowledge.ts:327](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L327)
