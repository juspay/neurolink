[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillResourceRef

# Type Alias: SkillResourceRef

> **SkillResourceRef** = `object`

Reference to an auxiliary file bundled with a skill (progressive
disclosure level 3). Resources are read into context on demand via the
read_skill_resource tool — a skill's SKILL.md should stay lean and point
to resources for rarely-needed detail.

## Properties

### path

> **path**: `string`

Path relative to the skill's directory, e.g. "references/edge-cases.md".

---

### size?

> `optional` **size?**: `number`

Size in bytes when known (listing hint only).
