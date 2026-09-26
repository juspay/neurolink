[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillStore

# Type Alias: SkillStore

> **SkillStore** = `object`

Pluggable persistence backend. NeuroLink ships memory and filesystem
stores; hosts plug their own (S3, database, …) via the "custom" storage
type. `index()` must be cheap relative to `get()` — it backs every
search and prompt-index build.

## Methods

### get()

> **get**(`id`): `Promise`\<[`SkillDefinition`](SkillDefinition.md) \| `null`\>

Fetch one skill (with instructions) by id. Null when absent.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`SkillDefinition`](SkillDefinition.md) \| `null`\>

---

### put()

> **put**(`skill`): `Promise`\<`void`\>

Create or replace a skill.

#### Parameters

##### skill

[`SkillDefinition`](SkillDefinition.md)

#### Returns

`Promise`\<`void`\>

---

### delete()

> **delete**(`id`): `Promise`\<`void`\>

Hard-remove a skill from storage. (Soft deletes go through put().)

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`void`\>

---

### index()

> **index**(): `Promise`\<[`SkillIndexItem`](SkillIndexItem.md)[]\>

List index entries (no instructions) for all stored skills.

#### Returns

`Promise`\<[`SkillIndexItem`](SkillIndexItem.md)[]\>

---

### invalidate()?

> `optional` **invalidate**(): `void`

Optional: drop any internal caches (called after mutations).

#### Returns

`void`

---

### getResource()?

> `optional` **getResource**(`id`, `resourcePath`): `Promise`\<`string` \| `null`\>

Optional: fetch an auxiliary resource file bundled with a skill.
`resourcePath` is relative to the skill (e.g. "references/forms.md").
Null when the skill or resource is absent. Stores without resource
support simply omit this method.

#### Parameters

##### id

`string`

##### resourcePath

`string`

#### Returns

`Promise`\<`string` \| `null`\>
