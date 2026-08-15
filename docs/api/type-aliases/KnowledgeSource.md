[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeSource

# Type Alias: KnowledgeSource

> **KnowledgeSource** = `object`

Defined in: [types/knowledge.ts:159](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L159)

A configured knowledge source: inline structured entries passed to the
engine. Markdown/provider source kinds were intentionally dropped for now;
re-introduce this as a discriminated union (with a `type` tag) if another
source kind is needed later.

## Properties

### id

> **id**: `string`

Defined in: [types/knowledge.ts:160](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L160)

---

### version?

> `optional` **version?**: `string`

Defined in: [types/knowledge.ts:161](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L161)

---

### entries

> **entries**: [`KnowledgeEntryInput`](KnowledgeEntryInput.md)[]

Defined in: [types/knowledge.ts:162](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L162)
