[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillSearchQuery

# Type Alias: SkillSearchQuery

> **SkillSearchQuery** = `object`

Query accepted by SkillsManager.search() (programmatic + CLI search).

## Properties

### query?

> `optional` **query?**: `string`

Keyword matched (case-insensitive substring) against name, displayName, and description.

---

### tag?

> `optional` **tag?**: `string`

Tag filter, applied on top of the keyword match.

---

### scopeId?

> `optional` **scopeId?**: `string`

Scope filter: include global skills plus skills scoped to this id.

---

### limit?

> `optional` **limit?**: `number`

Maximum matches to hydrate. Defaults to SkillsConfig.maxMatches.
