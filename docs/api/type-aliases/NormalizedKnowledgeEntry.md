[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NormalizedKnowledgeEntry

# Type Alias: NormalizedKnowledgeEntry

> **NormalizedKnowledgeEntry** = `object`

The complete, defaults-resolved record NeuroLink indexes and injects. Omitted
optionals are materialized (arrays to `[]`, `body` to `""`, `kind` to "text",
`status` to "active") so downstream code never re-checks the resolution chain.
Field meanings mirror `KnowledgeEntryInput`.

## Properties

### id

> **id**: `string`

---

### title

> **title**: `string`

---

### summary

> **summary**: `string`

---

### domain

> **domain**: `string`

---

### integrations

> **integrations**: `string`[]

---

### kind

> **kind**: [`KnowledgeEntryKind`](KnowledgeEntryKind.md)

---

### status

> **status**: [`KnowledgeStatus`](KnowledgeStatus.md)

---

### body

> **body**: `string`

---

### aliases

> **aliases**: `string`[]

---

### keywords

> **keywords**: `string`[]

---

### relatedEntryIds

> **relatedEntryIds**: `string`[]

---

### parentEntryId?

> `optional` **parentEntryId?**: `string`

---

### version

> **version**: `string`

Content version from the source/manifest; appears in citations as [KB:id@version].
