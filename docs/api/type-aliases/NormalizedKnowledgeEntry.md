[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / NormalizedKnowledgeEntry

# Type Alias: NormalizedKnowledgeEntry

> **NormalizedKnowledgeEntry** = `object`

Defined in: [types/knowledge.ts:114](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L114)

The complete, defaults-resolved record NeuroLink indexes and injects. Omitted
optionals are materialized (arrays to `[]`, `body` to `""`, `kind` to "text",
`status` to "active") so downstream code never re-checks the resolution chain.
Field meanings mirror `KnowledgeEntryInput`.

## Properties

### id

> **id**: `string`

Defined in: [types/knowledge.ts:115](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L115)

---

### title

> **title**: `string`

Defined in: [types/knowledge.ts:116](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L116)

---

### summary

> **summary**: `string`

Defined in: [types/knowledge.ts:117](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L117)

---

### domain

> **domain**: `string`

Defined in: [types/knowledge.ts:118](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L118)

---

### integrations

> **integrations**: `string`[]

Defined in: [types/knowledge.ts:119](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L119)

---

### kind

> **kind**: [`KnowledgeEntryKind`](KnowledgeEntryKind.md)

Defined in: [types/knowledge.ts:120](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L120)

---

### status

> **status**: [`KnowledgeStatus`](KnowledgeStatus.md)

Defined in: [types/knowledge.ts:121](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L121)

---

### body

> **body**: `string`

Defined in: [types/knowledge.ts:122](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L122)

---

### aliases

> **aliases**: `string`[]

Defined in: [types/knowledge.ts:123](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L123)

---

### keywords

> **keywords**: `string`[]

Defined in: [types/knowledge.ts:124](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L124)

---

### relatedEntryIds

> **relatedEntryIds**: `string`[]

Defined in: [types/knowledge.ts:125](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L125)

---

### parentEntryId?

> `optional` **parentEntryId?**: `string`

Defined in: [types/knowledge.ts:126](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L126)

---

### version

> **version**: `string`

Defined in: [types/knowledge.ts:128](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/knowledge.ts#L128)

Content version from the source/manifest; appears in citations as [KB:id@version].
