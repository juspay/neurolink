[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillMemoryStorageConfig

# Type Alias: SkillMemoryStorageConfig

> **SkillMemoryStorageConfig** = `object`

In-process store, optionally seeded. Good for tests and embedded use.

## Properties

### type

> **type**: `"memory"`

---

### skills?

> `optional` **skills?**: [`SkillDefinition`](SkillDefinition.md)[]

Initial skills to seed the store with.

---

### resources?

> `optional` **resources?**: `Record`\<`string`, `Record`\<`string`, `string`\>\>

Resource file contents keyed by skill id → relative path.
E.g. `{ "my-skill": { "references/forms.md": "..." } }`.
