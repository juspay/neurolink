[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillFilesystemStorageConfig

# Type Alias: SkillFilesystemStorageConfig

> **SkillFilesystemStorageConfig** = `object`

Defined in: [types/skills.ts:126](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/skills.ts#L126)

Directory-backed store. Reads three layouts:

- `<dir>/<id>.json` — one JSON-serialized SkillDefinition per file
- `<dir>/<name>.md` — markdown with YAML frontmatter; body = instructions
- `<dir>/<name>/SKILL.md` — Claude-skills-style directory layout
  Mutations always write `<id>.json`; markdown sources are read-only.

## Properties

### type

> **type**: `"filesystem"`

Defined in: [types/skills.ts:127](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/skills.ts#L127)

---

### path

> **path**: `string`

Defined in: [types/skills.ts:129](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/skills.ts#L129)

Directory containing skill files. Created on first write if absent.
