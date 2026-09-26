[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillFilesystemStorageConfig

# Type Alias: SkillFilesystemStorageConfig

> **SkillFilesystemStorageConfig** = `object`

Directory-backed store. Reads three layouts:

- `<dir>/<id>.json` — one JSON-serialized SkillDefinition per file
- `<dir>/<name>.md` — markdown with YAML frontmatter; body = instructions
- `<dir>/<name>/SKILL.md` — Claude-skills-style directory layout
  Mutations always write `<id>.json`; markdown sources are read-only.

## Properties

### type

> **type**: `"filesystem"`

---

### path

> **path**: `string`

Directory containing skill files. Created on first write if absent.
