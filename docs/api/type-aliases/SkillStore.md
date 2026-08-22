[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SkillStore

# Type Alias: SkillStore

> **SkillStore** = `object`

Defined in: [types/skills.ts:87](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/skills.ts#L87)

Pluggable persistence backend. NeuroLink ships memory and filesystem
stores; hosts plug their own (S3, database, …) via the "custom" storage
type. `index()` must be cheap relative to `get()` — it backs every
search and prompt-index build.

## Methods

### get()

> **get**(`id`): `Promise`\<[`SkillDefinition`](SkillDefinition.md) \| `null`\>

Defined in: [types/skills.ts:89](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/skills.ts#L89)

Fetch one skill (with instructions) by id. Null when absent.

#### Parameters

##### id

`string`

#### Returns

`Promise`\<[`SkillDefinition`](SkillDefinition.md) \| `null`\>

---

### put()

> **put**(`skill`): `Promise`\<`void`\>

Defined in: [types/skills.ts:91](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/skills.ts#L91)

Create or replace a skill.

#### Parameters

##### skill

[`SkillDefinition`](SkillDefinition.md)

#### Returns

`Promise`\<`void`\>

---

### delete()

> **delete**(`id`): `Promise`\<`void`\>

Defined in: [types/skills.ts:93](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/skills.ts#L93)

Hard-remove a skill from storage. (Soft deletes go through put().)

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`void`\>

---

### index()

> **index**(): `Promise`\<[`SkillIndexItem`](SkillIndexItem.md)[]\>

Defined in: [types/skills.ts:95](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/skills.ts#L95)

List index entries (no instructions) for all stored skills.

#### Returns

`Promise`\<[`SkillIndexItem`](SkillIndexItem.md)[]\>

---

### invalidate()?

> `optional` **invalidate**(): `void`

Defined in: [types/skills.ts:97](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/skills.ts#L97)

Optional: drop any internal caches (called after mutations).

#### Returns

`void`

---

### getResource()?

> `optional` **getResource**(`id`, `resourcePath`): `Promise`\<`string` \| `null`\>

Defined in: [types/skills.ts:104](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/skills.ts#L104)

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
