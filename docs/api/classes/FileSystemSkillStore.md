[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FileSystemSkillStore

# Class: FileSystemSkillStore

Directory-backed store. Read layouts:

- `<dir>/<id>.json` — JSON SkillDefinition (mutable)
- `<dir>/<name>.md` — frontmatter markdown (read-only source)
- `<dir>/<name>/SKILL.md` — Claude-skills directory layout (read-only source);
  sibling files become on-demand resources (read_skill_resource)
  Mutations always write `<id>.json`; a JSON file shadows a markdown skill
  with the same id, so updating a markdown-sourced skill "copies up" to JSON.

## Implements

- [`SkillStore`](../type-aliases/SkillStore.md)

## Constructors

### Constructor

> **new FileSystemSkillStore**(`baseDir`): `FileSystemSkillStore`

#### Parameters

##### baseDir

`string`

#### Returns

`FileSystemSkillStore`

## Methods

### invalidate()

> **invalidate**(): `void`

Optional: drop any internal caches (called after mutations).

#### Returns

`void`

#### Implementation of

`SkillStore.invalidate`

---

### get()

> **get**(`id`): `Promise`\<[`SkillDefinition`](../type-aliases/SkillDefinition.md) \| `null`\>

Fetch one skill (with instructions) by id. Null when absent.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`SkillDefinition`](../type-aliases/SkillDefinition.md) \| `null`\>

#### Implementation of

`SkillStore.get`

---

### getResource()

> **getResource**(`id`, `resourcePath`): `Promise`\<`string` \| `null`\>

Resources exist only for directory-layout skills (`<name>/SKILL.md`) —
every sibling file of SKILL.md is addressable by its relative path.
The REAL path must stay inside the skill directory: lexical
containment alone would follow a symlink planted inside the skill dir
to anywhere on the host.

#### Parameters

##### id

`string`

##### resourcePath

`string`

#### Returns

`Promise`\<`string` \| `null`\>

#### Implementation of

`SkillStore.getResource`

---

### put()

> **put**(`skill`): `Promise`\<`void`\>

Create or replace a skill.

#### Parameters

##### skill

[`SkillDefinition`](../type-aliases/SkillDefinition.md)

#### Returns

`Promise`\<`void`\>

#### Implementation of

`SkillStore.put`

---

### delete()

> **delete**(`id`): `Promise`\<`void`\>

Hard-remove a skill from storage. (Soft deletes go through put().)

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

`SkillStore.delete`

---

### index()

> **index**(): `Promise`\<[`SkillIndexItem`](../type-aliases/SkillIndexItem.md)[]\>

List index entries (no instructions) for all stored skills.

#### Returns

`Promise`\<[`SkillIndexItem`](../type-aliases/SkillIndexItem.md)[]\>

#### Implementation of

`SkillStore.index`
