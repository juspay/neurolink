[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillSearchQuery

# Type Alias: SkillSearchQuery

> **SkillSearchQuery** = `object`

Defined in: [types/skills.ts:244](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L244)

Query accepted by SkillsManager.search() (programmatic + CLI search).

## Properties

### query?

> `optional` **query?**: `string`

Defined in: [types/skills.ts:246](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L246)

Keyword matched (case-insensitive substring) against name, displayName, and description.

---

### tag?

> `optional` **tag?**: `string`

Defined in: [types/skills.ts:248](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L248)

Tag filter, applied on top of the keyword match.

---

### scopeId?

> `optional` **scopeId?**: `string`

Defined in: [types/skills.ts:250](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L250)

Scope filter: include global skills plus skills scoped to this id.

---

### limit?

> `optional` **limit?**: `number`

Defined in: [types/skills.ts:252](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L252)

Maximum matches to hydrate. Defaults to SkillsConfig.maxMatches.
