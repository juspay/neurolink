[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeEntryInput

# Type Alias: KnowledgeEntryInput

> **KnowledgeEntryInput** = `object`

Defined in: [types/knowledge.ts:81](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L81)

The record a host author writes. `id`, `title`, `summary`, `domain`, and
`integrations` are required; every other field is optional and omitted
optionals fall back to SDK defaults during normalization.

## Properties

### id

> **id**: `string`

Defined in: [types/knowledge.ts:83](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L83)

Stable unique id (e.g. "account.multi-step-flow"). Drives exact-match lookup and citations.

---

### title

> **title**: `string`

Defined in: [types/knowledge.ts:85](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L85)

Human-readable name of the concept/setting. Highest-weighted search field.

---

### summary

> **summary**: `string`

Defined in: [types/knowledge.ts:87](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L87)

One-line searchable description — the short answer when a full body is unnecessary.

---

### domain

> **domain**: `string`

Defined in: [types/knowledge.ts:89](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L89)

Primary grouping and the main retrieval filter (e.g. "account-settings").

---

### integrations

> **integrations**: `string`[]

Defined in: [types/knowledge.ts:91](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L91)

Integration identifiers this entry applies to. Empty array = applies to all integrations.

---

### kind?

> `optional` **kind?**: [`KnowledgeEntryKind`](KnowledgeEntryKind.md)

Defined in: [types/knowledge.ts:93](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L93)

What the entry is (concept, configuration, procedure, …). Default "text". Labels context, not ranking.

---

### status?

> `optional` **status?**: [`KnowledgeStatus`](KnowledgeStatus.md)

Defined in: [types/knowledge.ts:95](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L95)

Lifecycle state. Default "active"; only active entries are retrievable.

---

### body?

> `optional` **body?**: `string`

Defined in: [types/knowledge.ts:97](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L97)

Full explanatory content (Markdown). Use only when the summary is insufficient.

---

### aliases?

> `optional` **aliases?**: `string`[]

Defined in: [types/knowledge.ts:99](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L99)

Reviewed alternate phrasings or raw identifiers that resolve to exact and alias matches.

---

### keywords?

> `optional` **keywords?**: `string`[]

Defined in: [types/knowledge.ts:101](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L101)

Extra search terms that aid recall but are not full aliases.

---

### relatedEntryIds?

> `optional` **relatedEntryIds?**: `string`[]

Defined in: [types/knowledge.ts:103](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L103)

Ids of directly related entries, pulled in by bounded relationship expansion.

---

### parentEntryId?

> `optional` **parentEntryId?**: `string`

Defined in: [types/knowledge.ts:105](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L105)

Id of the parent entry when this is a subtype or child.
