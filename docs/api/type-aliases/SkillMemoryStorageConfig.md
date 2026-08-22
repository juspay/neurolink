[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillMemoryStorageConfig

# Type Alias: SkillMemoryStorageConfig

> **SkillMemoryStorageConfig** = `object`

Defined in: [types/skills.ts:108](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/skills.ts#L108)

In-process store, optionally seeded. Good for tests and embedded use.

## Properties

### type

> **type**: `"memory"`

Defined in: [types/skills.ts:109](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/skills.ts#L109)

---

### skills?

> `optional` **skills?**: [`SkillDefinition`](SkillDefinition.md)[]

Defined in: [types/skills.ts:111](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/skills.ts#L111)

Initial skills to seed the store with.

---

### resources?

> `optional` **resources?**: `Record`\<`string`, `Record`\<`string`, `string`\>\>

Defined in: [types/skills.ts:116](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/skills.ts#L116)

Resource file contents keyed by skill id → relative path.
E.g. `{ "my-skill": { "references/forms.md": "..." } }`.
