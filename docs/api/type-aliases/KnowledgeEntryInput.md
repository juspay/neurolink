[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeEntryInput

# Type Alias: KnowledgeEntryInput

> **KnowledgeEntryInput** = `object`

The record a host author writes. `id`, `title`, `summary`, `domain`, and
`integrations` are required; every other field is optional and omitted
optionals fall back to SDK defaults during normalization.

## Properties

### id

> **id**: `string`

Stable unique id (e.g. "account.multi-step-flow"). Drives exact-match lookup and citations.

---

### title

> **title**: `string`

Human-readable name of the concept/setting. Highest-weighted search field.

---

### summary

> **summary**: `string`

One-line searchable description — the short answer when a full body is unnecessary.

---

### domain

> **domain**: `string`

Primary grouping and the main retrieval filter (e.g. "account-settings").

---

### integrations

> **integrations**: `string`[]

Integration identifiers this entry applies to. Empty array = applies to all integrations.

---

### kind?

> `optional` **kind?**: [`KnowledgeEntryKind`](KnowledgeEntryKind.md)

What the entry is (concept, configuration, procedure, …). Default "text". Labels context, not ranking.

---

### status?

> `optional` **status?**: [`KnowledgeStatus`](KnowledgeStatus.md)

Lifecycle state. Default "active"; only active entries are retrievable.

---

### body?

> `optional` **body?**: `string`

Full explanatory content (Markdown). Use only when the summary is insufficient.

---

### aliases?

> `optional` **aliases?**: `string`[]

Reviewed alternate phrasings or raw identifiers that resolve to exact and alias matches.

---

### keywords?

> `optional` **keywords?**: `string`[]

Extra search terms that aid recall but are not full aliases.

---

### relatedEntryIds?

> `optional` **relatedEntryIds?**: `string`[]

Ids of directly related entries, pulled in by bounded relationship expansion.

---

### parentEntryId?

> `optional` **parentEntryId?**: `string`

Id of the parent entry when this is a subtype or child.
