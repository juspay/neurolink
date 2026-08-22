[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillDefinition

# Type Alias: SkillDefinition

> **SkillDefinition** = `object`

Defined in: [types/skills.ts:43](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L43)

A complete skill: index metadata plus the full `instructions` body.
`instructions` is the expensive part — it is only hydrated for matched
skills, never included in index listings or the prompt index.

## Properties

### id

> **id**: `string`

Defined in: [types/skills.ts:45](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L45)

Stable unique identifier (UUID for created skills, or derived from filename).

---

### name

> **name**: `string`

Defined in: [types/skills.ts:47](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L47)

Machine-friendly unique name (snake_case recommended), used for matching.

---

### displayName?

> `optional` **displayName?**: `string`

Defined in: [types/skills.ts:49](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L49)

Human-readable display name shown in listings.

---

### description

> **description**: `string`

Defined in: [types/skills.ts:51](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L51)

One or two sentences describing when the skill applies — the matching signal.

---

### instructions

> **instructions**: `string`

Defined in: [types/skills.ts:53](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L53)

Full step-by-step instructions the model follows when the skill matches.

---

### tags?

> `optional` **tags?**: `string`[]

Defined in: [types/skills.ts:55](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L55)

Domain tags for filtering (e.g. ["payments", "escalation"]).

---

### scope?

> `optional` **scope?**: [`SkillScopeKind`](SkillScopeKind.md)

Defined in: [types/skills.ts:57](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L57)

Visibility. Default: "global".

---

### scopeIds?

> `optional` **scopeIds?**: `string`[]

Defined in: [types/skills.ts:59](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L59)

Scope identifiers this skill is limited to when scope === "scoped" (e.g. channel/team/tenant ids).

---

### version?

> `optional` **version?**: `number`

Defined in: [types/skills.ts:61](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L61)

Monotonic version, bumped on every approved update. Default: 1.

---

### status?

> `optional` **status?**: [`SkillLifecycleStatus`](SkillLifecycleStatus.md)

Defined in: [types/skills.ts:63](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L63)

Lifecycle status. Default: "active".

---

### createdAt?

> `optional` **createdAt?**: `string`

Defined in: [types/skills.ts:65](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L65)

ISO timestamp of creation.

---

### updatedAt?

> `optional` **updatedAt?**: `string`

Defined in: [types/skills.ts:67](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L67)

ISO timestamp of last update.

---

### resources?

> `optional` **resources?**: [`SkillResourceRef`](SkillResourceRef.md)[]

Defined in: [types/skills.ts:73](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L73)

Auxiliary files bundled with the skill, readable on demand through
read_skill_resource. Populated by stores that support resources
(directory-layout filesystem skills, S3, Redis).

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/skills.ts:75](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L75)

Free-form host metadata (audit fields, approval references, …).
