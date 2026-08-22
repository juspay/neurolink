[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillResourceRef

# Type Alias: SkillResourceRef

> **SkillResourceRef** = `object`

Defined in: [types/skills.ts:28](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/skills.ts#L28)

Reference to an auxiliary file bundled with a skill (progressive
disclosure level 3). Resources are read into context on demand via the
read_skill_resource tool — a skill's SKILL.md should stay lean and point
to resources for rarely-needed detail.

## Properties

### path

> **path**: `string`

Defined in: [types/skills.ts:30](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/skills.ts#L30)

Path relative to the skill's directory, e.g. "references/edge-cases.md".

---

### size?

> `optional` **size?**: `number`

Defined in: [types/skills.ts:32](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/skills.ts#L32)

Size in bytes when known (listing hint only).
