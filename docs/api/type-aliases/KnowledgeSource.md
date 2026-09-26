[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeSource

# Type Alias: KnowledgeSource

> **KnowledgeSource** = `object`

A configured knowledge source: inline structured entries passed to the
engine. Markdown/provider source kinds were intentionally dropped for now;
re-introduce this as a discriminated union (with a `type` tag) if another
source kind is needed later.

## Properties

### id

> **id**: `string`

---

### version?

> `optional` **version?**: `string`

---

### entries

> **entries**: [`KnowledgeEntryInput`](KnowledgeEntryInput.md)[]
