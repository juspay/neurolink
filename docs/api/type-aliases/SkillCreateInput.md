[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillCreateInput

# Type Alias: SkillCreateInput

> **SkillCreateInput** = `object`

Defined in: [types/skills.ts:256](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L256)

Input for creating a skill (id/version/status/timestamps are assigned by the manager).

## Properties

### name

> **name**: `string`

Defined in: [types/skills.ts:257](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L257)

---

### displayName?

> `optional` **displayName?**: `string`

Defined in: [types/skills.ts:258](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L258)

---

### description

> **description**: `string`

Defined in: [types/skills.ts:259](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L259)

---

### instructions

> **instructions**: `string`

Defined in: [types/skills.ts:260](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L260)

---

### tags?

> `optional` **tags?**: `string`[]

Defined in: [types/skills.ts:261](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L261)

---

### scope?

> `optional` **scope?**: [`SkillScopeKind`](SkillScopeKind.md)

Defined in: [types/skills.ts:262](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L262)

---

### scopeIds?

> `optional` **scopeIds?**: `string`[]

Defined in: [types/skills.ts:263](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L263)

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/skills.ts:264](https://github.com/juspay/neurolink/blob/release/src/lib/types/skills.ts#L264)
