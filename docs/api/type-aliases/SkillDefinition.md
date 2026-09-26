[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillDefinition

# Type Alias: SkillDefinition

> **SkillDefinition** = `object`

A complete skill: index metadata plus the full `instructions` body.
`instructions` is the expensive part — it is only hydrated for matched
skills, never included in index listings or the prompt index.

## Properties

### id

> **id**: `string`

Stable unique identifier (UUID for created skills, or derived from filename).

---

### name

> **name**: `string`

Machine-friendly unique name (snake_case recommended), used for matching.

---

### displayName?

> `optional` **displayName?**: `string`

Human-readable display name shown in listings.

---

### description

> **description**: `string`

One or two sentences describing when the skill applies — the matching signal.

---

### instructions

> **instructions**: `string`

Full step-by-step instructions the model follows when the skill matches.

---

### tags?

> `optional` **tags?**: `string`[]

Domain tags for filtering (e.g. ["payments", "escalation"]).

---

### scope?

> `optional` **scope?**: [`SkillScopeKind`](SkillScopeKind.md)

Visibility. Default: "global".

---

### scopeIds?

> `optional` **scopeIds?**: `string`[]

Scope identifiers this skill is limited to when scope === "scoped" (e.g. channel/team/tenant ids).

---

### version?

> `optional` **version?**: `number`

Monotonic version, bumped on every approved update. Default: 1.

---

### status?

> `optional` **status?**: [`SkillLifecycleStatus`](SkillLifecycleStatus.md)

Lifecycle status. Default: "active".

---

### createdAt?

> `optional` **createdAt?**: `string`

ISO timestamp of creation.

---

### updatedAt?

> `optional` **updatedAt?**: `string`

ISO timestamp of last update.

---

### resources?

> `optional` **resources?**: [`SkillResourceRef`](SkillResourceRef.md)[]

Auxiliary files bundled with the skill, readable on demand through
read_skill_resource. Populated by stores that support resources
(directory-layout filesystem skills, S3, Redis).

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Free-form host metadata (audit fields, approval references, …).
