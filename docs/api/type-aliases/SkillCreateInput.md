[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillCreateInput

# Type Alias: SkillCreateInput

> **SkillCreateInput** = `object`

Input for creating a skill (id/version/status/timestamps are assigned by the manager).

## Properties

### name

> **name**: `string`

---

### displayName?

> `optional` **displayName?**: `string`

---

### description

> **description**: `string`

---

### instructions

> **instructions**: `string`

---

### tags?

> `optional` **tags?**: `string`[]

---

### scope?

> `optional` **scope?**: [`SkillScopeKind`](SkillScopeKind.md)

---

### scopeIds?

> `optional` **scopeIds?**: `string`[]

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>
